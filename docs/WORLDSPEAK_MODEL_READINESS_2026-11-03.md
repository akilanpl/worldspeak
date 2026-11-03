# Meta model readiness — 3 November 2026

This is non-paid documentation/metadata verification, **not** hosted inference acceptance. No ticket, budget, permit, live marker, worker, media upload, generation or token preflight was enabled.

## Current official catalog and prices

[Official overview](https://dev.meta.ai/docs/overview) and [pricing](https://dev.meta.ai/docs/pricing-rate-limits), accessed 3 November 2026:

| Model ID | Documented endpoint/use | Current published price | WorldSpeak evidence |
|---|---|---|---|
| `muse-spark-1.3` | Standard-mode Responses, scene understanding | Input $1.25, cached input $0.15, output $4.25 per 1M tokens | One historical real chair generation; original persistence failed, later repaired. No new call. |
| `sam-3.1` | Responses still/video segmentation | Still $2.50/1000 = **$0.0025 = 2500 micro-USD**; video $0.20/1000 frames, minimum 50 frames/request | Provider/parser/renderer synthetic tested; real segmentation unverified. |
| `muse-image-1.0` | Images generations/edits; Responses editing | $0.01 per returned generated image | Not integrated/validated as a WorldSpeak provider. Existing pictograms are local human-chosen images. |
| `muse-voice-transcribe-1.0` | File `/v1/asr/transcribe`; realtime `/v1/asr/realtime` | $0.18/hour processed audio, whole-second metering | Not integrated/validated. Browser speech synthesis is separate. |

These are public list prices, not a verified credit balance or authorization to spend. Published Standard-mode rules differ from promotional-credit terms; any future media submission must review the exact applicable account notice and obtain specific consent. Historical 4402 micro-USD ledger is not an account balance.

## Request-schema findings

- Spark: [Responses guide](https://dev.meta.ai/docs/protocols/responses) explicitly requires `text.format` for structured output; Chat Completions uses `response_format` instead. The [structured-output guide](https://dev.meta.ai/docs/structured-output) illustrates JSON Schema. Do not substitute Chat's field into Responses: accepting an ignored compatibility field is not schema enforcement. Existing WorldSpeak Responses construction is preserved; no protocol mutation was made by this task.
- SAM: [segmentation request documentation](https://dev.meta.ai/docs/sam/segmenting) pairs one `input_text` concept with `input_image.image_url` in a user message. Confidence is string metadata `include_confidence:"true"`; compact masks use `mask_encoding:"one_bit"`. Non-streaming is supported. Validate actual wire encoding, dimensions and stable IDs using [segmentation-output documentation](https://dev.meta.ai/docs/sam/reading-segmentation), never fabricated polygons. Empty matches are normal. Documented provider video accepts MP4/MOV with supported codecs, **not WebM/VP9**; manual local WebM support does not establish provider compatibility or automatic tracking.
- Image: [generation guide](https://dev.meta.ai/docs/image-generation) describes JSON `model`, `prompt`, image count and output options on `/v1/images/generations`, returning `data[].b64_json` or signed URLs. Built-in image/web search and shell tools are enabled by default; a privacy-preserving future adapter must review and explicitly constrain those tool controls. No image request was sent.
- Voice: [speech-to-text guide](https://dev.meta.ai/docs/speech-to-text) specifies multipart `request` JSON plus `audio` WAV for files: mono 16-bit PCM 16/24 kHz. Realtime authenticates in the handshake, not an Authorization header. Modes include explicit push-to-talk, endpointing and diarization; transcripts have turn-level timing, not word timing/confidence. Tamil appears in the supported language list; that is not measured Tamil accuracy or consent to record a partner. No microphone, file or stream was sent.

## Exactly one metadata attempt

The [documented model-list endpoint](https://dev.meta.ai/docs/api-reference/models/list-models) is `GET https://api.meta.ai/v1/models`.

One attempt used the existing protected local key without printing it. TLS certificate verification remained enabled; redirects disallowed; timeout 15 seconds; response bound 256 KiB; no retry, query, media or body. It failed with `URLError` after 12 ms before any HTTP status was observed. No response body/account details were printed. Relevant returned model IDs: **unverified**. At that point credentials/catalog access were not newly validated; the superseding 200 receipt below now establishes catalog retrieval. Even a future successful catalog listing would not prove generation entitlement or billing balance.

Sanitized receipt: `/private/tmp/worldspeak-models-metadata-20261103.json`. This task made no second attempt and no billable generation. Account credit balance, paid-generation entitlements and fresh provider billing reconciliation remain BLOCKED even after the superseding catalog 200. Before any new real SAM call: recheck balance/access/pricing, exact fixture hash/consent and promotional terms, then obtain fresh explicit one-shot approval. Do not reset the consumed Spark authorization.

## Superseding successful catalog receipt

A later independently authorized metadata-onlyGETreturned **HTTP 200**. Sanitized portable receipt is `docs/evidence/production-readiness-2026-11-03.json` (original `WorldSpeak-models-metadata-verified.json` SHA recorded there). Relevant IDs include `muse-spark-1.3`, `sam-3.1`, `muse-image-1.0`, `muse-voice-transcribe-1.0` plus documented Spark variants. This supersedes the failed attempt above for catalog/credential retrieval only. No generation, media, token preflight or retry was performed by this reviewer. Catalog presence is not paid generation entitlement; balance and provider billing reconciliation remain unverified.
