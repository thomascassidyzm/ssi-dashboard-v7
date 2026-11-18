west shard of C0108 hope -> expect (cs #770·AI). Plans only; nothing here writes to the database.

- `specs.py` + `gen.py` -> `<course>/a.plan.py` (explicit literals; hand-authored content lives in specs.py). `run.sh <course>` = gen, mkops, validate, dry run.
- `newlego.py` + `mkb.py` -> `<course>/b.ops.json`, `b.validate.json`, `b.dry.json`: the add-on new expect LEGO for the ten courses with no hope LEGO in seed 108.
- `summary.py` -> `../plans-west.md` (one line per course) and an audit of English rows still saying hope / bare wake.
- `probe.py`, `detail.py`: validator probes (simulated override, no writes).

Everything regenerates from specs.py / newlego.py and the fetched `<course>/live/108.json`; the live reads themselves do not regenerate offline.
