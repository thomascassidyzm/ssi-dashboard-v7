# spa_for_eng meaning family apply (#446)

Working record for one content pass. Not documentation of how the system works.

- `decisions.json` — every row touched: before/after text, kind (fixed/rewritten/deleted), why. 156 family rows from #668 plus knock-on rows.
- `decisions_src.py` — the same decisions as authored (source of the edit-batch).
- `idx.py`, `validate.py` — checks run before applying (taught tokens by seed/LEGO, LEGO containment, ZUT, basket floor). They read per-seed basket JSON fetched from Popty's read routes (`GET /api/production/spa_for_eng/seed/:n/baskets`, `/lego/:id/basket`) into the job scratch; that data is not committed and regenerates from those routes.
- `undo.json` — the undo returned by the applied edit-batch; post it back to `POST /api/production/spa_for_eng/edit-batch` with `"apply": true` to revert.
