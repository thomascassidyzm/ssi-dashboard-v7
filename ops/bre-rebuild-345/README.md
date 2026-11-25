# ops/bre-rebuild-345 — bre_for_fra rebuild plan, seeds 1-300 (cs #345·AL, plan only)

Work product for the rebuild-apply job, if Kai says yes. Nothing here was written to the live database and no audio was made.

| file | what | regenerates? |
|---|---|---|
| `proposals-1.txt`, `-2`, `-3` | the 300 proposed seed pairs, hand-written: `seed§Breton§French (= unchanged)§tags§source keys§note` | NO: authored |
| `sources.json` | source key → URL | NO: authored |
| `build-pairs.py` | joins the proposals to the current course (nightly QA-copy dump files) | — |
| `pairs-1-300.json`, `.csv` | the seed-pair table: current vs proposed, fault tags, source URLs | yes: `python3 -I build-pairs.py <fra.snap.json> <eng.snap.json> <fra.dump.json>` |
| `detector-rerun.json` | nightly-scan detectors over current and proposed pairs | yes |
| `pilot-1-30.json` | pilot LEGO splits and baskets, seeds 1-30, built from the pilot txt files | yes |
| `pilot-check.json` | checker result for the pilot | yes |
| `sharing.py`, `sharing.json` | projected Breton sharing per known language (two judgement tables inside the script) | yes: `python3 -I sharing.py` |
| `check-pilot.cjs`, `pilot-1.txt`, `-2`, `-3` | the pilot as authored, and the offline checker (`node ops/bre-rebuild-345/check-pilot.cjs`) | txt: NO, authored |
| `side-check.json` | what the 97 / 315 clips and the 15,076 figure are | NO: read live 25 Nov |
