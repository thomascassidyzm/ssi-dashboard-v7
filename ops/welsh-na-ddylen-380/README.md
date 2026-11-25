# cs #380 — sv2 booth lines for na ddylen i (nothing applied, plan only)

Checked from code (no live queue read succeeded: GET /api/recording/voice/<id>/summary on :3470 for human_dan_cym_s and human_eleri_cym_s did not answer within 100 s under the night load; no line ids seen).

- Readers: ACTOR_QUEUES (services/voice-engine/booth-actor-queue.cjs) gives both human_dan_cym_s and human_eleri_cym_s sv2-seeds, sv2-legos, sv2-phrases steps. Slot split by castOn (recordist-queue.cjs seedCastEntry): castOn is FILL-ONLY, so empty slots of the new LEGO S0117L03 are queued by the ordinary sv2-legos step with no code change. Which of Dan/Eleri holds target1 vs target2 not confirmed live (comments say Dan target1, Eleri target2).
- Seed 117 wneud: b702fdc27's re-queue grant (rerecord_wanted.requeue_for on clip 10f25262) would put seed 117 back on the named reader's list but shows the CURRENT text (gwneud), and the take links by same-words; so the take would land on the old text. Not shape (a).
- Shape (b) needs a new line kind + take-route branch (text edit + link-clip replace/expectCurrent 10f25262 in one /api/production/<course>/edit-batch). That is more than the price. Not built. Text NOT edited.
