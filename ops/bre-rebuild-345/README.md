# ops/bre-rebuild-345 — bre_for_fra rebuild plan, seeds 1-300 (cs #345·AL, plan only)

Work product for the rebuild-apply job, if Kai says yes. Nothing here was written to the live database and no audio was made.

| file | what | regenerates? |
|---|---|---|
| `proposals-1.txt`, `-2`, `-3` | the 300 proposed seed pairs, hand-written: `seed§Breton§French (= unchanged)§tags§source keys§note` | NO: authored |
| `sources.json` | source key → URL | NO: authored |
| `build-pairs.py` | joins the proposals to the current course (nightly QA-copy dump files) | — |
| `pairs-1-300.json`, `.csv` | the seed-pair table: current vs proposed, fault tags, source URLs | yes: `python3 -I build-pairs.py <fra.snap.json> <eng.snap.json> <fra.dump.json>` |
| `detector-rerun.json` | nightly-scan detectors over current and proposed pairs | yes |
| `pilot-1-30.json` | pilot LEGO splits and baskets, seeds 1-30 | NO: authored |
| `pilot-check.json` | checker result for the pilot | yes |
| `sharing.json` | projected Breton sharing per known language | yes |
