# Pattern transfer fin/ita -> nine paid courses (job #420, read-only)

Candidate lists for the cross-course pattern transfer Kai asked for on 2026-10-22. Nothing here
writes to any course. Every file is a CANDIDATE list produced by `detect.py` (regex finds
candidates; a reader decides) from a live Popty read of `GET /api/production/<course>/seeds`
taken 2026-10-22 ~17:30Z. `coverage.json` per course says how many seeds / LEGOs / phrases
each detector scanned; `D3_summary.json` is the say-it/that/this tabulation.

Regenerates: yes — `LIVE=<dir with <course>.seeds.json> OUT=<dir> python3 detect.py <course>`
then `python3 d3tab.py <course>` (cwd must hold `cand/`). Presentation checks (D10 presentation
rows, D11*) need `<course>.pres.json` from `GET /api/production/<course>/presentation/<legoId>`
per new LEGO; they are present only for courses where that fetch had finished.

Calibration (known positives found before any other course was counted):
- D1 finds every want-you-to seed of fin (15,169,170,171,204,237,238,246,249,346,419,427,432) and ita.
- D2 shows fin's applied 21 Oct että rule (head+että / että alone not-new) and ita's open Q1 split (17 head+che vs 51 che+clause).
- D4 finds ita Q5 `anything | niente`, `to anyone | a nessuno` and fin F6 `anything | mitään`.
- D6a finds fin F2 `S0345L01` = `S0026L04`; D6b finds ita Q6 `S0246L02` (not-new, no earlier pair).
- D9 finds ita K41 `say it | dirlo` (S0061L02), `stop | smettere`, `understand | capire`.
- D10 finds fin's live `(formal)` tags on S0639–S0660 (K11).
- D11b finds ita S0214L01's presentation with `amico` in the narration.
- D12 shows ita's applied conditional-perfect rows (S0544, S0589).
