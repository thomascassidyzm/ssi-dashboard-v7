# zho variants (zho_for_eng / hin / tam / jpn) — cs #698·AI, 18 Nov 2026

Plans per course in <course>/plan.json (rows re-read live 18 Nov; all still old). Rows the scan itself marked
NOT A DEFECT / KNOWN, and rows dropped by this job, are in <course>/skipped-from-scan.json with the reason:
- 很快 "soon" after the modal (S0149L03U04, S0255L01U04, S0149L01U03/U04, S0562L02U02): left as is — 我应该很快离开 is
  standard Mandarin; 很快 is a manner/time adverb that sits naturally after the modal, unlike 现在/明天.
- S0643L01U01/U04, S0658L01U01/U05 (zho_for_tam): the fix changes what the row means (drink tea → want tea; look → want
  this), so the Tamil known side would need re-authoring. Left.
- *_for_zho 中文 fix and zho_for_eng S0572L02 not touched (sibling jobs own them).
zho_for_eng target rows carry pinyin (target_text_roman): an apply must send hand-read pinyin with each (ROMAN_STALE).
Status of each course is in the parent report and in this directory's dry/apply files.

APPLIED zho_for_jpn (events af813977, e67fa924; readback all ok; chars 164). Skips + reasons: skipped-from-scan.json.

APPLIED zho_for_hin (events 3215a609, 2305d2f0; readback all ok; chars 134). Skips + reasons: skipped-from-scan.json.

APPLIED zho_for_eng (events 033d5188, ca4cca47; readback all ok; chars 114). Skips + reasons: skipped-from-scan.json.

zho_for_tam: TEXT-ONLY DRY RUN (dry.json, 3 clean batches), NOT APPLIED — 29 phrases + seeds 161/316/625 (seed edits:
the main course already says 你想喝点什么吗 for 625). Price ≤ 486 chars; only 162 left in the share.
