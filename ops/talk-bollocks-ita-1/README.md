# Talk Bollocks Part 1 — Italian (job #323)

Working folder for the Italian listening version of Aran & Tom "Talk Bollocks" Part 1. Not course content; no pod or course row reads it.

- `983-original/` — copied verbatim from `~/.tmpbig/983` (job #983·AA, 30 Oct): `manifest.json` (213 clips, turn/speaker/voice/text/trial audio id), `pg/t<N>.txt` (ffmpeg concat lists per turn), `pg/published.json` (per-turn published urls). Does NOT regenerate: the trial clips it names live in Popty's trial store (`/api/audio/trial/<id>`) and expire there. The MP3s themselves are not committed.
- `corrections.json` — the Opus Italian check: manifest index → new text and reason. Hand-written; source of truth for the change log.
- `manifest-checked.json` — `983-original/manifest.json` with the corrections applied and the re-rendered clips' trial ids. Regenerates from the two above plus the render answers (`render-results.json`).
- `build.py` — applies corrections, drives `tools/audio/render.cjs --trial` (dry-run by default), writes the change log and the clip-page spec.

Voices: Tom = Lorenzo (Cartesia ee16f140-…), Aran = Luca (Cartesia e019ed7e-…), as #983 cast them.
