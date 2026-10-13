# welsh-human-links-621 (job #621, Aran's Welsh relaunch asks 3 and 4)

`tools/audio/welsh-human-links-621.cjs` links existing human takes into EMPTY slots of live `cym_n_for_eng`, same text only.

- `catrin-ledger.csv`: target1 ← Catrin (`human_catrinlliar_cym_n` + `legacy_import` target1). Planned 0 on 2026-10-13: no empty North target1 slot has a Catrin take of the same text (the 647 empty slots are seed sentences she has not recorded yet).
- `aran-ledger.csv`: known ← Aran's English (`human_aran_cym_n` + `legacy_import` known/eng in cym_n, then cym_s). The ledger is the backup: every row's before-state is NULL, `to` is the linked clip.

Undo: `node tools/audio/welsh-human-links-621.cjs --item aran undo --apply` (sets a slot back to NULL only while it still holds the linked clip).
Regenerate a ledger with `plan` (it re-reads live state; do not regenerate after an apply, or the applied rows drop out of the undo list).
