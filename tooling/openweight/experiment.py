"""Offline catalog experiment preparation/evaluation. Never loads or calls a model."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "packages/catalog/data/essentials.json"
SEED = "worldspeak-group-split-v1"
ARMS = ("baseline", "prompted", "adapter")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def dataset(source=SOURCE, seed=SEED):
    raw = source.read_bytes()
    data = json.loads(raw)
    groups = {}
    for tile in data["tiles"]:
        intent = tile["intent"]
        # Keep both languages, all polarities and related meanings of an object
        # together. No expanded/paraphrased copies can cross a split.
        obj = intent.get("object")
        group = "object:" + obj["catalogId"] if obj else intent["kind"] + ":" + intent.get("act", "none")
        for locale in ("en", "ta"):
            groups.setdefault(group, []).append({
                "id": tile["id"] + ":" + locale, "group": group,
                "input": {"approved_label": tile["label"][locale], "locale": locale},
                "expected": {"intent": intent, "locale": locale},
            })
    order = sorted(groups, key=lambda g: digest((seed + ":" + g).encode()))
    if len(order) < 5:
        raise ValueError("Too few independent groups for a three-way split")
    train_end, dev_end = max(1, len(order) * 6 // 10), max(2, len(order) * 8 // 10)
    splits = {"train": [], "dev": [], "test": []}
    for i, group in enumerate(order):
        split = "train" if i < train_end else "dev" if i < dev_end else "test"
        splits[split].extend(sorted(groups[group], key=lambda x: x["id"]))
    return splits, {"seed": seed, "source": str(source.relative_to(ROOT)),
                    "source_sha256": digest(raw), "license": "repository MIT; model license is separate",
                    "review_status": data["reviewStatus"], "dataset_kind": "synthetic-catalog-conformance"}


def prepare(destination):
    if destination.exists():
        raise ValueError("Destination already exists; preserve previous experiment artifacts")
    splits, manifest = dataset()
    destination.mkdir(parents=True)
    manifest["splits"] = {}
    for split, rows in splits.items():
        content = b"".join(encoded(row) for row in rows)
        (destination / (split + ".jsonl")).write_bytes(content)
        manifest["splits"][split] = {"rows": len(rows), "groups": sorted({r["group"] for r in rows}), "sha256": digest(content)}
    (destination / "manifest.json").write_bytes(encoded(manifest))
    return manifest


def load_rows(path):
    with path.open("rb") as stream:
        content = stream.read(1024 * 1024 + 1)
    if len(content) > 1024 * 1024:
        raise ValueError("Artifact exceeds 1 MiB bound")
    rows = [json.loads(line) for line in content.splitlines() if line.strip()]
    if not rows or any(not isinstance(r, dict) for r in rows):
        raise ValueError("Expected nonempty JSONL objects")
    return rows, content


def evaluate(expected, predictions):
    gold = {r["id"]: r for r in expected}
    if len(gold) != len(expected):
        raise ValueError("Duplicate expected IDs")
    received = {}
    for row in predictions:
        if set(row) != {"id", "intent", "locale"} or not isinstance(row["id"], str):
            raise ValueError("Prediction must contain only id, intent, locale")
        if row["id"] in received or row["id"] not in gold:
            raise ValueError("Duplicate or unknown prediction ID")
        received[row["id"]] = row
    if set(received) != set(gold):
        raise ValueError("Missing predictions; partial coverage cannot inflate accuracy")
    counts = {"intent_exact": 0, "locale_exact": 0, "joint_exact": 0, "negation_exact": 0, "negation_eligible": 0}
    failures = []
    for key, row in gold.items():
        want, got = row["expected"], received[key]
        intent_ok = got["intent"] == want["intent"]
        locale_ok = got["locale"] == want["locale"]
        counts["intent_exact"] += intent_ok
        counts["locale_exact"] += locale_ok
        counts["joint_exact"] += intent_ok and locale_ok
        if want["intent"]["kind"] == "request-object":
            counts["negation_eligible"] += 1
            counts["negation_exact"] += isinstance(got["intent"], dict) and got["intent"].get("kind") == "request-object" and got["intent"].get("polarity") == want["intent"]["polarity"]
        if not (intent_ok and locale_ok):
            failures.append({"id": key, "intent_exact": intent_ok, "locale_exact": locale_ok})
    return {"rows": len(gold), "counts": counts, "joint_exact_rate": counts["joint_exact"] / len(gold),
            "intent_exact_rate": counts["intent_exact"] / len(gold),
            "locale_exact_rate": counts["locale_exact"] / len(gold),
            "negation_exact_rate": counts["negation_exact"] / counts["negation_eligible"] if counts["negation_eligible"] else None,
            "failures": failures,
            "limitation": "Catalog conformance only; no scene accuracy, native Tamil acceptance, training or real-model execution proven."}


def compare(directory, paths):
    manifest_bytes = (directory / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    expected, raw = load_rows(directory / "test.jsonl")
    if digest(raw) != manifest["splits"]["test"]["sha256"]:
        raise ValueError("Test dataset integrity mismatch")
    report = {"experiment": "external-supplied-arm-conformance", "model_execution_verified": False,
              "dataset_manifest_sha256": digest(manifest_bytes), "test_sha256": digest(raw),
              "review_status": manifest["review_status"], "arms": {}}
    if len(paths) != len(ARMS):
        raise ValueError("Exactly three arm files are required")
    for arm, path in zip(ARMS, paths):
        predictions, raw = load_rows(path)
        report["arms"][arm] = {"prediction_sha256": digest(raw), **evaluate(expected, predictions)}
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("prepare")
    p.add_argument("--out", required=True, type=Path)
    p = sub.add_parser("evaluate")
    p.add_argument("--dataset", required=True, type=Path)
    for arm in ARMS:
        p.add_argument("--" + arm, required=True, type=Path)
    args = parser.parse_args()
    try:
        result = prepare(args.out) if args.command == "prepare" else compare(args.dataset, [getattr(args, a) for a in ARMS])
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(2, "Experiment rejected: " + str(error) + "\n")
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
