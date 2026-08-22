# Evidence — pod-0 recast halt, 13 Aug 2026

Read-only probes. None of these write to the database or generate audio.

Written for `scripts/pod0-recast-2026-08-13/` (gitignored workspace) and copied here so the
findings are reproducible. To re-run, copy back into `scripts/<dir>/` at the repo root so the
`require('../../services/pod-voice-approvals.cjs')` path and `node_modules` resolve, and so
`dotenv` finds `.env.psql`.

| File | What it answers |
|---|---|
| `cast-census.cjs` | Which voices are cast on the ENGLISH track of every `pod-0*` pod, by speaker entry |
| `resolve-census.cjs` | The same, but through the generator's own `resolvePodSpeakerVoice()` per sentence-slot, including the `ctx.knownVoice` fallback — split English vs non-English track |
| `unresolved.cjs` | Slots with no cast entry at all, attributed to track and language |
| `scope-reconcile.cjs` | Scope counts against the prior audit's 57 courses / 680 empty slots / 251 distinct texts |
| `cast-vs-clips.cjs` | The real defect: cast voice vs the actual voice of the clip linked into each English slot |
| `cast-vs-clips.json` | Per-course output of the above (match / off-cast / empty) |

Conclusion is in `../pod0-recast-halted-2026-08-13.md`.
