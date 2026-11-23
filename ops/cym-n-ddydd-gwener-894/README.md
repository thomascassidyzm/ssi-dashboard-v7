cs #894·AK — cym_n S0105L02 "ddydd Gwener": Catrin's take says "dydd" with a hard D (Kai, by ear, 23 Nov; learner report 879f9c3f).

- queue-s0105l02.*: the one Popty write (POST /api/production/cym_n_for_eng/edit-batch, event b76702a0) putting a named re-queue grant
  (requeue_for human_catrinlliar_cym_n) on clip 15a6713c. The clip stays linked until her new take lands (make-before-break).
  Undo: post the undo_ops in queue-s0105l02.applied.json back to the same route with "apply": true.
- census-review-page.json: the items of the tap-to-mark page (d/f893481e). Only lines Kai ticks "drops it" get queued, the same way.
Nothing here regenerates; these are records of what was sent.
