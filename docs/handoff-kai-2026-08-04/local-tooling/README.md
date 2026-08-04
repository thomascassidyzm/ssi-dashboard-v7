# Copied local-only scripts

These were in the **gitignored** `scripts/` workspace on Kai's machine and would be lost on a fresh
clone. Copied here verbatim so the *method* survives. They reference a local course-builder API
(`http://localhost:3471`) and DB creds from a local `.env.psql` — **repoint to watson-1's service +
secrets before running.** They are reference implementations, not turnkey.

Full descriptions + which large raw outputs they produced: see `../local-tooling-and-logs.md`.

| Script | Purpose | Project |
|---|---|---|
| `hiss-chain-probe.cjs` | Prove where the xAI hiss originates (raw vs mastering chain) | 02 (#17) |
| `reprocess-xai-hiss.cjs` | Fleet de-hiss reprocessor; `--rollback <log>` | 02 (#17) |
| `tmp-dehiss-reprocess.cjs` | Floor-gated idempotent de-hiss (measures before acting) | 02 (#17) |
| `tail-audit.cjs` | Run `detectTailClick` over a course's clips | 04 (#18) |
| `tail-by-voice.cjs` | Break tail flags down by voice (found the eve signal) | 04 (#18) |
| `phono-audit.cjs` | whisper lang-detect over xAI target clips | 04 |
| `audit-report.cjs` | Summarise both audits + emit defect-id JSON | 04 |
| `straggler-triage.cjs` | Classify non-xAI stragglers: dup vs genuine regen | 04 |
| `dupe-relink.cjs` | Relink dupes to existing xAI clip (backs up first) | 04 |
| `regen-driver.sh` | Drive `regenerate-role flaggedOnly` across roles | 04 |
| `sample.cjs` | Read seeds to find broken/HELD regions before deepening | 05 |
| `fleet-scan.cjs` | Fleet orphan-ranking scan | 05 |
