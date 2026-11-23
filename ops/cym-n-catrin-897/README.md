cs #897 — Catrin target1 clips S0232L01 (ddydd Mawrth, 5bc01d68) and S0252L02 (ddydd Iau, 4bdfd81d): Kai heard the unmutated form (tick "drops it", page d/f893481e, 23 Nov).
Same method as ops/cym-n-ddydd-gwener-894. queue.request.json was posted to POST /api/production/cym_n_for_eng/edit-batch (event d2a12f0b); queue.applied.json is the answer.
Undo: post its undo_ops back to the same route with "apply": true. Old clips stay linked. Nothing regenerates.
