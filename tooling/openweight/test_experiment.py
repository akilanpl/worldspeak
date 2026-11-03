import copy
import json
from pathlib import Path
import tempfile
import unittest

from experiment import ARMS, compare, dataset, encoded, evaluate, prepare


class ExperimentTests(unittest.TestCase):
    def test_groups_and_languages_never_cross_splits(self):
        splits, _ = dataset()
        groups = [set(row["group"] for row in rows) for rows in splits.values()]
        self.assertTrue(all(groups))
        for i in range(3):
            for j in range(i):
                self.assertFalse(groups[i] & groups[j])
        rows = [r for values in splits.values() for r in values]
        self.assertEqual(len(rows), 52)
        self.assertEqual(len({r["id"] for r in rows}), 52)
        for r in rows:
            peer = next(x for x in rows if x["id"] == r["id"].rsplit(":", 1)[0] + (":ta" if r["id"].endswith(":en") else ":en"))
            self.assertEqual(r["group"], peer["group"])

    def test_seed_reproducibility_and_review_status(self):
        self.assertEqual(dataset(), dataset())
        self.assertNotEqual(dataset()[0], dataset(seed="different-seed")[0])
        self.assertEqual(dataset()[1]["review_status"], "review-pending")

    def predictions(self, rows):
        return [{"id": row["id"], **copy.deepcopy(row["expected"])} for row in rows]

    def test_fixture_identity_and_intent_locale_negation_failures(self):
        rows = [r for split in dataset()[0].values() for r in split]
        predictions = self.predictions(rows)
        self.assertEqual(evaluate(rows, predictions)["joint_exact_rate"], 1)
        row = next(p for p in predictions if p["intent"]["kind"] == "request-object")
        row["intent"]["polarity"] = "do-not-want" if row["intent"]["polarity"] == "want" else "want"
        row["locale"] = "fr"
        result = evaluate(rows, predictions)
        self.assertEqual(result["counts"]["negation_eligible"] - result["counts"]["negation_exact"], 1)
        self.assertEqual(result["counts"]["locale_exact"], len(rows) - 1)
        self.assertEqual(len(result["failures"]), 1)

    def test_duplicate_missing_unknown_and_extra_fields_reject(self):
        rows = dataset()[0]["test"]
        predictions = self.predictions(rows)
        variants = [predictions[:-1], predictions + [predictions[0]], [{**predictions[0], "id": "unknown"}] + predictions[1:], [{**predictions[0], "confidence": .99}] + predictions[1:]]
        for variant in variants:
            with self.assertRaises(ValueError):
                evaluate(rows, variant)

    def test_artifacts_hashes_and_comparison_are_reproducible(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root) / "dataset"
            manifest = prepare(directory)
            self.assertEqual(sum(x["rows"] for x in manifest["splits"].values()), 52)
            rows = [json.loads(line) for line in (directory / "test.jsonl").read_bytes().splitlines()]
            paths = []
            for arm in ARMS:
                p = Path(root) / (arm + ".jsonl")
                p.write_bytes(b"".join(encoded(r) for r in self.predictions(rows)))
                paths.append(p)
            result = compare(directory, paths)
            self.assertFalse(result["model_execution_verified"])
            self.assertEqual(len(result["arms"]), 3)
            with self.assertRaises(ValueError):
                prepare(directory)
            (directory / "test.jsonl").write_bytes(b"tampered")
            with self.assertRaises((ValueError, json.JSONDecodeError)):
                compare(directory, paths)

    def test_prediction_artifact_size_bound(self):
        from experiment import load_rows
        with tempfile.TemporaryDirectory() as root:
            p = Path(root) / "huge.jsonl"
            p.write_bytes(b" " * (1024 * 1024 + 1))
            with self.assertRaises(ValueError):
                load_rows(p)


if __name__ == "__main__":
    unittest.main()
