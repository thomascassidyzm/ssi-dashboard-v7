# deu_for_eng + fra_for_eng generation state

**Goal (Kai 2026-08-03/04):** get `deu_for_eng` + `fra_for_eng` **fully on xAI** and verify the
clips already generated on kai-stage are good (they were made *before* main's audio gates existed).
"Check everything, run overnight."

**One-line status:** audits ran and came back **effectively clean**; the remaining work is
**converting non-xAI stragglers to xAI**, which is **blocked on the eve gate** (issue #18,
`projects/01-…`). All actual TTS = **Kai's click** — never auto-fired.

## What's done

### Merge that unblocked gated generation (`d0d1910e`)
kai-stage was 58 behind main and lacked main's audio gates (child-voice block, retry hardening,
presentation-staleness guard, qmark-aware linking, inline-SSML, ffmpeg-PATH pin, AbortSignal
timeouts). Merged origin/main → kai-stage **keeping de-hiss** (`df61179a`). build.cjs conflict →
took main's ANTHROPIC_API_KEY-unset line. Restarted pm2 `phase8-audio` / `production-api` /
`course-builder --update-env`. So **kai-stage now has both** the gates and de-hiss. (The old
"never fire TTS from kai-stage" rule is resolved *for this checkout* — but still true for any
checkout that predates this merge.)

### Overnight audits (detection only — no writes; scripts copied into `local-tooling/`)
Kai's key idea: the gates are **separable detectors**, so you can audit existing clips and regen
only the true rejects, rather than blanket-regenerating.

| detector | mechanism | deu/fra result |
|---|---|---|
| **child-voice** | voice_id blocklist (6 Azure IDs, `CHILD_VOICE_IDS`) | **0 hits** (eve/ara/leo clean) |
| **phonology** | whisper lang-detect on xAI target clips (whisper-cpp 1.9.1 + ggml-small, installed at `/tmp/whisper-models/`) | **effectively CLEAN** — 2,296 raw "leaks" but 73% are 1–2-word clips whisper can't lang-detect; only 44 are 5+-word-detected-en and those read as plain German → **no real leaks** (whisper noise) |
| **tail-click** | `detectTailClick` → `{click, kind}` | 9,158 flags but **one voice**: eve 22% / xai_eve 15% vs ara/leo ~0.5–1%, xai_leo/xai_ara 0%. Kai listened → **no audible clicks** → detector over-flagging eve's breathy tail. This is issue #18. |

- Audit scripts: `local-tooling/tail-audit.cjs`, `phono-audit.cjs`, `audit-report.cjs`,
  `tail-by-voice.cjs`. Raw outputs (large, local): `scripts/deepening/tail-audit-results.jsonl`
  (~13 MB, 87,131 clips), `phono-audit-results.jsonl` (~5 MB, 55,769 clips), plus derived
  `tail-defect-ids-*.json` / `phono-leak-ids-*.json`.
- ⚠️ **Known bug in the audit output:** `tail-audit` rows lack a course tag (`r.course` is
  `undefined`, hence the file `tail-defect-ids-undefined.json`) — infer course via voice/DB.

## In progress — straggler conversion to xAI

Both courses still have **non-xAI core clips** that need converting to xAI:
- **deu:** 1,887 non-xAI (411 are DUPLICATES of an existing xAI render = **relink + drop, NO TTS**;
  1,476 genuine regen).
- **fra:** 395 non-xAI (43 dup, 352 regen).

Flow (partly run): flag all via `audio_flags` → then per role `regenerate-role flaggedOnly`
(in-place, gated). **BUT dupes cause `unique_course_audio_per_voice` errors** → you must
**relink + unflag the dupes FIRST**, then regenerate-role the genuine ones.

- Pilot: deu known limit50 → **13 converted, 35 failed** (28 dup + 7 tail-defect-gate). The
  tail-defect-gate failures are exactly the eve over-rejection → **blocked until #18 lands**.
- Tools (in `local-tooling/`): `straggler-triage.cjs`, `dupe-relink.cjs`, `regen-driver.sh`
  (drives all roles both courses). Dupe-relink backups (local):
  `scripts/deepening/dupe-relink-backup-deu_for_eng.json` / `…fra_for_eng.json`;
  flag backups `flag-backup-*.json`.
- Presentations already fixed separately — see the `deu-presentation-underlink-fix` memory
  (intros 672→1390; link is_new legos via FK **and** `lego_introductions`; 14 no-clip need TTS).

## Exact next step

1. **Land the eve gate fix decision** (issue #18) so eve renders stop being refused.
2. Relink + unflag the deu/fra **dupes** first (`dupe-relink.cjs`), then run
   `regenerate-role flaggedOnly` per role for the genuine regens — **Kai fires the TTS**.
3. tail-defect repairs on *real* (non-eve) defects → `tools/declick-tail.cjs <course> --ids
   tail-defect-ids-X.json --apply` (DSP, no TTS; needs S3 write creds — verify).
4. phono: no real leaks found → nothing to regen unless a fresh audit says otherwise.

## Gotchas

- **de-hiss vs clean-master mastering choice still needs Tom** (issue #17). kai-stage keeps de-hiss
  (matches the 138k live clips); main took clean-master. Generate from **kai-stage phase8** so
  renders aren't hissy.
- All TTS in this project is **Kai's click** — the audits and triage are detection/DSP only.
- pm2 processes to keep current after any service-file change: `phase8-audio`, `production-api`,
  `course-builder` — restart `--update-env`.
