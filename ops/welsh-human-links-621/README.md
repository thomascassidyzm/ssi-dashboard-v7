# welsh-human-links-621 (job #621, Aran's Welsh relaunch asks 3 and 4)

`tools/audio/welsh-human-links-621.cjs` links existing human takes into EMPTY slots of live `cym_n_for_eng`, same text only.

- `catrin-ledger.csv`: target1 ← Catrin (`human_catrinlliar_cym_n` + `legacy_import` target1, commas folded). Applied 2026-10-13: 1 slot (seed 221). The other 646 empty seed slots and 2 empty LEGO slots have no Catrin take of the same text: they are seed sentences she has not recorded yet.
- `aran-ledger.csv`: known ← Aran's English (`human_aran_cym_n` + `legacy_import` known/eng in cym_n, then cym_s). The ledger is the backup: every row's before-state is NULL, `to` is the linked clip. Applied 2026-10-13: 219 slots (211 seeds, 1 LEGO, 7 phrases; 209 clips from the old South course, 10 from North), all verified.

Undo: `node tools/audio/welsh-human-links-621.cjs --item aran undo --apply` (sets a slot back to NULL only while it still holds the linked clip).
Regenerate a ledger with `plan` (it re-reads live state; do not regenerate after an apply, or the applied rows drop out of the undo list).
