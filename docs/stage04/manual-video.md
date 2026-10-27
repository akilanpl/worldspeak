# Local video frame communication

The `/video` route retains synthetic demo timelines and adds a separate local
MP4/WebM path. Choose “Use local video”, upload a clip (50 MiB,
30 seconds maximum) or record up to 10 seconds with camera video only. The
capture panel transfers a valid object URL to VideoFlow; the parent revokes it
on retake, approval, replacement or route exit. Metadata probes have a 10-second
timeout, cancellation and decoder detachment. Late camera grants are stopped.
Recordings with unfinalized WebM duration use locally measured recording time;
this is not a model timestamp or a codec frame index.

Native playback controls and an explicit seconds seek allow selection of the
currently decoded frame. The bounded JPEG snapshot has at most 960 pixels on
its longest edge. Its timestamp is the media element's currentTime (seconds),
not a claimed codec frame number. Choose two opposite corners or use keyboard
percentage inputs, confirm the region, then confirm a reviewed catalog noun
or exact own words. The normalized region refers to the frozen image without
letterbox offsets; it remains attached to that timestamp during later seeks.
A new frame invalidates region approval. One annotation/snapshot is retained,
not a manufactured temporal track. Back from intent preserves the snapshot.

The existing deterministic IntentPanel produces an explicit preview and fresh
approval. A tab-local opaque handoff opens a new composer draft. Only the
composer's later Speak gesture can speak. Custom words are never translated.
Manual annotations carry `manual` provenance. Synthetic demo tracks carry
`fixture`; future genuine model tracks retain `model`. No model call, upload,
cloud persistence or microphone capture is introduced.

## Shared interface coordination

Minimal backward-compatible handoff additions: `manual` provenance and
`pictogram` source, with a truthful composer notice. IntentPanel takes only
labelEn/labelTa/catalogId rather than requiring artificial PerceivedObject
geometry/provenance. This shared commit is also included in the pictogram PR;
integrators should preserve one copy when merging. No inference contract,
authorization mechanism, spending control or SAM component was changed.

## Validation boundaries

Vitest component/media tests mock HTML video metadata, canvas decoding and
camera permission responses. They verify geometry, validation, timing,
approval gating and ownership; they do not prove browser decoding.
`apps/web/e2e/video.spec.ts` separately uploads the original synthetic 2-second
VP9 WebM fixture to a real browser, seeks, freezes, marks a region, preserves
selection across intent Back, approves exact text and checks speech occurs
only after Speak. Invalid-media retry is a separate browser case. A third real-browser case uses
Chromium’s synthetic camera device and actual MediaRecorder bytes, checks zero
audio tracks and stopped camera tracks, then decodes/selects a recorded frame.
This is synthetic-device browser validation, not physical-camera acceptance. Existing
synthetic timeline tests remain distinct. See PR CI for executed browser
results; local macOS Chromium launch is blocked by MachPort permissions.

Remaining: genuine model video tracking and physical-device codec/camera
acceptance are separate work. No tracking accuracy, fine-tuning or native Tamil
review is claimed. Refresh/route exit discards video media and annotations;
only an explicitly approved text draft can remain in tab-local handoff storage.
