# Local-only tooling & logs

Things that lived **only on this machine** and informed decisions. The `scripts/` tree is the
gitignored agent workspace (461 files) — **not** swept into the repo wholesale. Instead:

- The **durable, decision-relevant scripts** are copied into `local-tooling/` (this folder) so they
  survive the move.
- **Large raw outputs** (multi-MB JSONL, per-course backup JSON) are **summarised with their key
  numbers + pointers** rather than committed — they're data, and the findings are what matter.

## Scripts copied into `local-tooling/`

### Audio de-hiss (issue #17)
- **`hiss-chain-probe.cjs`** — generates one raw xAI eve render + an Azure control, measures the noise
  floor raw and cumulatively through each real mastering stage. This is the probe that **proved the
  hiss is in xAI's raw render, not our chain** (the −79 dB → −67 dB table). Writeup:
  `docs/xai-hiss-chain-analysis-2026-07-29.md` (committed).
- **`reprocess-xai-hiss.cjs`** — the original fleet reprocessor. Denoise-only (not a re-master),
  uploads to a new s3 key, PATCHes `course_audio.s3_key`, resumable, `--rollback <done-log.jsonl>`.
- **`tmp-dehiss-reprocess.cjs`** — the **floor-gated** idempotent version: measures each row's RMS
  trough and only de-hisses if > −75 dB, so it never double-denoises and skips clean/ElevenLabs rows.
  Use this one for any top-up — "old" does not mean "already reprocessed."

### deu/fra audit + straggler conversion (issue #18 / project 04)
- **`tail-audit.cjs`** — runs `detectTailClick` over a course's clips → `tail-audit-results.jsonl`.
  ⚠️ records lack a course tag (`r.course` undefined) — infer via voice/DB.
- **`tail-by-voice.cjs`** — breaks the tail flags down by voice (this is what showed eve = 22% vs
  ara/leo ~0.5–1%).
- **`phono-audit.cjs`** — whisper lang-detect over xAI target clips → `phono-audit-results.jsonl`.
  Needs whisper-cpp + a ggml model (installed here at `/tmp/whisper-models/`).
- **`audit-report.cjs`** — summarises the two audits and writes `tail-defect-ids-<course>.json` +
  `phono-leak-ids-<course>.json`.
- **`straggler-triage.cjs`** — classifies non-xAI stragglers into dup (relink, no TTS) vs genuine regen.
- **`dupe-relink.cjs`** — relinks duplicate renders to an existing xAI clip and drops the dup
  (avoids the `unique_course_audio_per_voice` error); writes a per-course backup JSON first.
- **`regen-driver.sh`** — drives `regenerate-role flaggedOnly` across all roles for both courses.

### Deepening / fleet scan (project 05)
- **`sample.cjs`** — reads a course's seeds to find broken/HELD regions + the degradation boundary
  before deepening. The "read quality FIRST" step.
- **`fleet-scan.cjs`** — the fleet orphan-ranking scan (produced the worst→best ranking in project 05).

> These reference a local course-builder API at `http://localhost:3471` and DB creds from a local
> `.env.psql`. On watson-1 they'll need repointing to that host's service + secrets. They're included
> as **reference implementations of the method**, not turnkey — the durable value is the approach.

## Large raw outputs — summarised (NOT committed)

| Artifact (local path) | Size | Summary of what it says |
|---|---|---|
| `scripts/deepening/tail-audit-results.jsonl` | ~13 MB, 87,131 clips | tail-click flags; the signal is **one voice** — eve 22% / xai_eve 15% vs ara/leo ~0.5–1%, xai_leo/xai_ara 0%. Kai listened → no audible clicks → detector over-flagging eve's breathy tail (issue #18). |
| `scripts/deepening/phono-audit-results.jsonl` | ~5 MB, 55,769 clips | 2,296 raw "leaks" but 73% are 1–2-word clips whisper can't lang-detect; only 44 are 5+-word-detected-en and read as plain German → **effectively clean, no real leaks** (whisper noise). |
| `scripts/deepening/tail-defect-ids-undefined.json` | 357 KB | derived tail-defect ids (filename `undefined` = the missing-course-tag bug; re-derive per course). |
| `scripts/deepening/phono-leak-ids-{deu,fra}_for_eng.json` | 87 KB / 2 KB | derived phono ids — mostly whisper noise per above. |
| `scripts/deepening/dupe-relink-backup-{deu,fra}_for_eng.json` | 148 KB / 11 KB | rollback backups for the dupe-relink step. |
| `scripts/deepening/flag-backup-{deu,fra}_for_eng.json` | 490 KB / 92 KB | rollback backups for the straggler flagging. |
| `temp/hiss-reprocess/*-done-*.jsonl` | — | old→new s3 key mapping for the 142,973-file reprocess; also backed up to `s3://<bucket>/backups/hiss-reprocess-logs-2026-07-29/` (19 files). Rollback source. |
| `temp/hiss-ab-2026-07-29/`, `temp/hiss-chain-probe/` | — | A/B listening samples (spa_* + deu_at) and the per-stage probe renders. |
| `regen-driver.log`, `tail-audit.log`, `phono-audit.log` | — | run logs; content already distilled into projects 02/04. |

## Environment / infra notes that are local

- **`.env.psql`** (repo root, gitignored) holds `DATABASE_URL` for direct SQL / migrations —
  **provisioned per machine, never by git**. watson-1 needs its own. Several round-index refreshes are
  pending and need it (see `open-questions.md`).
- **whisper-cpp 1.9.1 + ggml-small** installed at `/tmp/whisper-models/` (for the phono audit) —
  ephemeral, will need reinstalling wherever the phono audit runs next.
- **pm2 services** used here: `phase8-audio`, `production-api`, `course-builder` (localhost:3471),
  plus the dashboard. On watson-1 these run under that host — check the running set; restart
  `--update-env` after any service-file change (needs the ssh-agent socket).
- **Secrets** (`.env`, `.env.psql`, `.basecamp/config.json`, S3/xAI/ElevenLabs keys) are **not**
  included anywhere in this bundle — only their existence and location are noted. `.env`'s
  `ANTHROPIC_API_KEY` is for the dashboard env-switcher, **not** service code.
