cs #755 planning-shard helpers (kept here so a successor session can continue; they regenerate nothing by themselves).
Run from ops/paid-cleanup-item20/tools. Paths inside the scripts point at the original worktree and $CS_SCRATCH: fix them first.
 ctx.cjs <course> <from> <to>   print sheet lines (index, LEGO, en, hi) with taught-LEGO known wording hints
 apply.cjs <course> <fill.cjs>  fill file = array of [idx, lego, known|null, gender, {en,known_ok,hold}] ; edits sheet.json
 has.cjs <course> <LEGO> "en".. taught-English check + LEGO contained + does this English already exist in the course
 kok.cjs <course> pan-dict.json sets known_ok on update rows whose untaught known words are all in the dict (forms of taught words)
 audit.py <course> [hand seeds] counts + empties + false substring LEGO matches (e.g. "car" inside "care")
STATE: both sheets complete (eng_for_urd 335 filled, 69 left to hand plans; eng_for_pan 555 filled, 10 held); build.cjs 0 errors on both.
Conventions used: natural SOV Punjabi with the course's own LEGO wording; gender from the LEGO's own form, else from the Hindi row;
"I think that" = ਮੈਨੂੰ ਲੱਗਦਾ ਹੈ ਕਿ from seed ~210 (ਮੈਂ ਸੋਚਦਾ ਹਾਂ ਕਿ before); "you know" = ਤੁਸੀਂ ਸਮਝਦੇ ਹੋ ਕਿ; "I enjoy" = ਮੈਂ ... ਪਸੰਦ ਕਰਦਾ ਹਾਂ;
"I'd like" = ਮੈਂ ... ਚਾਹੁੰਦਾ (no ਹਾਂ); as if = ਜਿਵੇਂ ਕਿ. A basket that already holds a duplicate pair cannot be edited from the sheet: hold it.
