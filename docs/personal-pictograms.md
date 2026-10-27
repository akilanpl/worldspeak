# Personal pictograms

Open **Pictograms** in the primary navigation (`/pictograms`). Choose a local PNG,
JPEG or WebP image, assign exact words and an accessible image description, then
create it. The board previews the image and meaning. Use a pictogram to explicitly
choose an intent/language, approve the deterministic preview, and open the composer.
The composer always requires a separate fresh **Speak** gesture.

Optional catalog mapping enables existing reviewed sentence templates; custom text
is not translated, including when Tamil is selected. Tamil catalog wording remains
review-pending. The handoff identifies the source as a personal pictogram and the
meaning as manually assigned. No model detection, tracking or confidence is claimed.

## Privacy and limits

Images exist only in page memory behind local blob URLs. Leaving this page,
reloading, or deleting the image releases them. They are not stored in localStorage,
Supabase, a model service, URLs, or the handoff. Only the approved intent and display
meaning use the existing bounded tab-local draft transport (10-minute expiry). The
image is not carried into the composer. Creation/use/deletion operate without a
network connection while the page is already loaded; installation or cold offline
navigation to this route is not promised.

Accepted formats: PNG/JPEG/WebP with matching signatures, bounded container-header scans and successful browser
image loading. At most 2 MiB and 4 million decoded pixels per image, 8 images and
8 MiB compressed bytes total. GIF/SVG and animated PNG/WebP are rejected. PNG/JPEG/WebP header dimensions are
checked before browser loading and checked again when the browser reports dimensions.
Compressed-byte limits apply before FileReader reads the image. A 10-second decode
deadline bounds loading; AbortSignal immediately cancels FileReader/Image on cancel
or navigation, and a generation token discards any late results.
Successful URLs are revoked on deletion/navigation; failed/late results are revoked.

## Verification

Unit/component tests cover format/size/signature/dimension checks, corrupted decode,
exact words, catalog mapping, no speech or fetch, retry, deletion and late URL cleanup.
Component tests mock browser image loading and are not real image evidence.

Playwright tests use a synthetic public-domain 1-pixel PNG and real browser loading,
keyboard use, axe, corrupt-file retry, offline creation/deletion, no uploads and a
fresh composer Speak gesture. Local macOS launches failed before assertions with
`MachPortRendezvousServer: Permission denied (1100)`; use GitHub CI results for
real-browser evidence. Device audio and independent Tamil review remain outside
this feature's automated validation.

## Integration

The minimal shared integration adds manual handoff provenance/pictogram source,
an IntentPanel label-only input type, and one navigation link. These changes are
backward compatible; merge alongside the video manual-provenance work. No provider,
SAM, authorization, migrations or submission documentation is changed.
