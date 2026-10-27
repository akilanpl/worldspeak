# Live-demonstration failure recovery

 rehearse each recovery once; the fallback is always a working fixture path.

| Failure | On-stage recovery (≤15s) | Prevention |
| --- | --- | --- |
| No network / venue Wi-Fi drops | Continue on `/offline` — the board is fully local after one online load. | Preload `/` and `/offline` before stage time. |
| Camera permission denied | Switch to **Upload image**, or drop to fixture scenes and say so. | Keep a photo file on the desktop. |
| Microphone/speaker silent | Point at the exact preview sentence: "the words are the product; audio is a stub today." | Show the stub call log if asked. |
| Fixture scene looks wrong | Use the accessible object list — same options, numbered, always available. | Know the list exists on every objects step. |
| Backend 503 (inference disabled) | Expected: show the honest "currently disabled" notice as the privacy story. | Never promise a live model on stage. |
| Tampered-link demo mistyped | The invalid-link notice IS the demo — read it aloud and move on. | Bookmark one valid and one broken link. |
| Build won't start | Serve the last green production build directory; do not debug live. | Keep a tagged build artifact on disk. |

Rule: narrate what is happening ("this notice means…") instead of
apologizing; every failure path in this product explains itself.
