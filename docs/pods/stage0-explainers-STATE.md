# Stage-0 explainers — STATE OF THE NATION (2026-06-14, saved before power loss)

Pick up from here. Everything below survives on disk + in the DB + in this commit.

## ✅ DONE + LIVE
- **Spanish `spa_for_eng` pod-0**: full rules-compliant Stage-0 explainers generated (360 explained atoms, 721 clips, all 192k/48k/−16 LUFS, gate-clean), persisted (`pod_legos` + `course_audio` role `pod_explainer` + `atom_map` on 132 sentences), served live.
- **Croatian `hrv_for_eng` pod-0**: same, **Azure cast** (521 atoms, 1049 clips), persisted, live.
- **Live endpoint** (flat, query-param): `GET https://popty.app/api/pod-content?course=<code>&slug=pod-0` → sentences + decomposition + signed clip URLs (`whole_take_url`, `translation_url`, per-atom `atom_audio_url`+`means_audio_url`).
- **Tuner course-picker** live at `popty.app/admin/stage0-tuner` (+ `/stage0-tuner.html`): course `<select>` + sentence `<select>` → preview the real explainer ladder. Spanish + Croatian selectable.
- **The Stage-0 model** (in the tuner): explainer LEADS WITH the whole-intention natural take → "breaking it down" cue → per atom: target (File-2 slice) + merged "means, <gloss>". NO repeats. Pairs once. Intentions never fused. Popty-dark theme, dark stage.

## ✅ BUILT — READY TO RUN (not executed; power loss)
**Shared English known-store** — built + dry-run-verified (`tools/build-shared-known-store.cjs`). Nothing rendered/written/deployed yet.
- **Pause chosen: ellipsis `means… <gloss>`** — punctuation test on `leo` measured a consistent **~450 ms** gap (comma was 177–493 ms / run-on; period gave a hard falling intonation on "means"; dash inconsistent). Slices clean (no residual "means", correct onset, 192k/48k/−16 LUFS), reads as one natural unit. Test clips: `/tmp/punctest/`.
- **Plan**: 753 unique English glosses (spa 360 + hrv 521 → 847 per-course means collapse to **753 unique** — the reuse win). 753 `leo` `means… X` renders → 753 shared means-X rows (`course_code='pod_known_en'`, lang `en`) + 753 bare-X rows (text `· <gloss>`, **sliced from the same take**) + 881 `pod_legos` repointed → shared. ~8 glosses may have an undetectable pause → the tool FLAGS them (writes means-X, skips bare-X) for hand-fixing rather than mis-slicing.
- **TO RUN (real):** `node tools/build-shared-known-store.cjs --execute` (≈753 xAI TTS + ~2259 S3/DB writes), then redeploy the endpoint: `git push origin HEAD:main && vercel --prod --yes`. Idempotent; `--dry-run` is the default (safe).
- Files DONE (all `node --check` clean): `tools/build-shared-known-store.cjs` (new), `tools/persist-stage0-pod0.cjs` (new languages resolve known from `pod_known_en`; `POD_KNOWN_LOCAL=1` escape hatch), `api/pod-content.js` (serves means via `explainer_audio_id` + `bare_gloss_url` via the `· <gloss>` row).

## ⏭ NEXT
1. Finish shared-known-store: bigger-pause means-X (render once, shared), slice bare-gloss, repoint every course's `pod_legos.explainer_audio_id` → shared, dry-run → **real run** → **deploy**. Then the **translation tier** plays (it needs the bare gloss).
2. Future languages = only the ~132 target slow-gapped takes; known side reused from the shared store.
3. (Deferred) the app-side "live in the app" stream: wire `usePodAtomFusion.ts` to the NEW model + per-course `algorithm_config['stage0']` config + forced-align offsets (atom_map `target_start_ms/end_ms` are NULL — the tuner plays the real slice so doesn't need them; the APP will).

## 📂 KEY FILES
- **Generation pipeline** (gitignored — on disk, regenerable): `scripts/experiments/stage0-tuner/{rules-gate.cjs, decompose-pod0.cjs, render-lib.cjs, render-full-pod.cjs}`. Run: `COURSE=hrv_for_eng node scripts/experiments/stage0-tuner/decompose-pod0.cjs` (gate) then `… render-full-pod.cjs` (render; **resumable**, skip-if-exists; parameterized: spa_for_eng / hrv_for_eng). Add a course to `COURSE_CONFIG` in render-full-pod.cjs + the speakers map.
- **Generated content**: `~/Desktop/stage0-{spa,hrv}-pod0/` (`decomposition.json`, `manifest.json`, per-sentence `sN/*.mp3`).
- **Persist** (committed): `tools/persist-stage0-pod0.cjs` — `COURSE=<code> node -r dotenv/config tools/persist-stage0-pod0.cjs [--dry-run]`.
- **Shared-store builder** (in progress): `tools/build-shared-known-store.cjs`.
- **Endpoint**: `api/pod-content.js` (FLAT; signs from `S3_AUDIO_BUCKET || 'ssi-audio-stage'`).
- **Tuner**: `public/stage0-tuner.html` (built) + `scripts/experiments/stage0-tuner/template.html` (source) → `node scripts/experiments/stage0-tuner/build-html.cjs`. Vue wrapper `src/views/Stage0Tuner.vue`, route `/admin/stage0-tuner`.
- **Tuner default config**: `docs/pods/stage0-default-config.json`. Scope doc: `~/Desktop/SSi-stage0-explainers-SCOPE.md`.

## ⚠️ GOTCHAS (hard-won)
- **Vercel `S3_BUCKET` = the LFS/course-data bucket (`popty-bach-lfs`)**, NOT audio. Audio is in **`ssi-audio-stage`** (`S3_AUDIO_BUCKET`). Sign pod audio against the audio bucket.
- **Nested-dynamic Vercel functions** (`api/x/[a]/[b].js`) are shadowed by the SPA rewrite `/((?!vfs).*)` → use **FLAT** functions (`api/name.js` + query params).
- **Never run two renders on the same output dir** (collision destroys clips); **don't let a render outlive its agent** (it orphans + can't auto-resume). Use a single harness-tracked job; render-full-pod is resumable + re-probes existing clips (silence-repair).
- **Single-encode discipline**: decode→WAV, ALL DSP in PCM, ONE 192k mp3 encode. Never mp3→process→mp3.
- **Rules gate**: no single-syllable atoms (merge up, ~3 syllables), DROP names (Sarah etc.), SKIP already-introduced (first-encounter), trivial-skip, word-order pure-literal notes. `validatePod` must return 0 violations before rendering.
- **popty deploy**: `git push origin HEAD:main` then `vercel --prod --yes` from repo root. Main moves a lot (parallel sessions) — `git fetch` + rebase before push.
- **Agents have been dying on the flaky connection** — keep production writes dry-run-gated + idempotent.
