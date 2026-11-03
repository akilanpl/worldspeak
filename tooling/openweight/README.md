# Offline open-weight experiment scaffold

Python3.9+ stdlib only; no dependency installation, downloads, inference, GPU allocation or training. This prepares an experiment but does not execute a model. It is outside the production communication path and cannot speak.

```sh
python3 -m unittest discover -s tooling/openweight -p 'test_*.py' -v
python3 tooling/openweight/experiment.py prepare --out /private/tmp/worldspeak-experiment-001
```

The destination must not already exist. `manifest.json` hashes the repository MIT catalog source and each deterministic JSONL split, including seed, object/meaning group IDs and Tamil review-pending status. The52 examples are the26 existing catalog tile meanings ×2locales:30train,10dev,12test. Both languages, positive/negative forms and related requests for each object stay within one group/split. These are synthetic catalog labels, not clinical/user data, paraphrases, scene examples or native-reviewed Tamil.

Research task: map an explicitly approved catalog label and explicit locale to the exact known structured intent. This does not infer intentions from images or replace user confirmation. The dataset is intentionally small and template-derived; held-out object groups reduce direct leakage but do not establish independent real-world generalization.

After a separately reviewed/authorized local experiment, provide three JSONL files with exactly `{ "id": "rest-want:en", "intent": { ... }, "locale": "en" }` for every test ID, one each for baseline, prompted baseline and adapted model:

```sh
python3 tooling/openweight/experiment.py evaluate \
  --dataset /private/tmp/worldspeak-experiment-001 \
  --baseline /path/to/baseline.jsonl \
  --prompted /path/to/prompted.jsonl \
  --adapter /path/to/adapter.jsonl > /private/tmp/worldspeak-comparison.json
```

Unknown/duplicate/missing IDs, extra prediction fields, artifacts over1MiB and modified test hashes reject. Counts/rates cover exact structured intent, exact locale, joint preservation and request-object polarity (negation). Failure IDs remain inspectable. Arm names are labels, not evidence that a model or adapter exists: every report sets `model_execution_verified:false`. Files copied from expected answers are evaluator fixtures only; never label their score model accuracy.

Before any real run: owner must designate a locally available checkpoint and approve its model license and dataset use; verify that checkpoint's official model card, Transformers/PEFT support, device/backend and actual memory requirements. No approved checkpoint, adapter, license acknowledgment or compute target has been supplied to this task. A future training runner must require those explicit inputs, prohibit automatic downloads/network and retain baseline/prompted/adapted provenance plus actual command/checkpoint hash, hardware, latency, memory and measured failures. No training runner or trained checkpoint is claimed here.
