# ops/nightly-course-scan — Kai's nightly read-only scan of his live courses (cs #237·AL, approved 24 Nov 2026)

Three courses a night from Wed 25 Nov, on the nightly QA copy, never live; nothing here writes to a course or renders audio.
Each morning Kai gets one hand-checked table per course in his room and rules Y/N; approved fixes are commissioned separately.

| file | what | regenerates? |
|---|---|---|
| `queue.json` | the ORDER (82 queued + 3 kor targets and jpn_for_eng under `parked`, which scan.cjs ignores; reordered 25 Nov cs #381·AL: big targets ita, spa, fra, deu, ara, zho first, then remaining paid, then Welsh, then non-paid; kor/jpn targets parked until fully built) + the 16 Nov fold-in items | by hand only |
| `night-run.sh` | the runner the timer fires: gates (night writers done, <=2 other DB jobs, load gate, box load, copy fresh), `scan.cjs` on the next 3, dispatches the hand-check worker | — |
| `dispatch.cjs` | the runner's door to the surface: the night worker (parent Kai's room) and skip/failure notices; token from a 0600 file | — |
| `worker-brief.md` | the night worker's brief (template) | — |
| `systemd/` | the three units, installed as links in ~/.config/systemd/user | — |

The scanner itself is `tools/nightly-course-scan/` (scan.cjs = the one DB step, a dump through the #447 kit's copy-read.cjs;
analyse.cjs + detectors.cjs = no database; calibration.json = each detector's known positive; `scan.cjs --calibrate`).

State that is NOT in git (durable dir `~/.cs-long/nightly-course-scan/`): `popty/` (detached checkout of main the unit runs
from), `scanned.txt` (courses with a published table — the queue pointer), `published.tsv` (date, course, url), `night-*.log`,
`.tok` (0600). Candidate output per course: `~/ssi-evidence/ssi-dashboard-v7/ops/nightly-course-scan/<copy-db>/`.

Stop it: `systemctl --user disable --now cs-long-keep-nightly-course-scan.timer`. Re-scan a course: delete its line from scanned.txt.
