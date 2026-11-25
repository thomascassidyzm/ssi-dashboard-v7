# cs #380 — sv2 booth lines for na ddylen i (nothing applied, plan only)

Checked from code (no live queue read succeeded: GET /api/recording/voice/<id>/summary on :3470 for human_dan_cym_s and human_eleri_cym_s did not answer within 100 s under the night load; no line ids seen).

- Readers: ACTOR_QUEUES (services/voice-engine/booth-actor-queue.cjs) gives both human_dan_cym_s and human_eleri_cym_s sv2-seeds, sv2-legos, sv2-phrases steps. Slot split by castOn (recordist-queue.cjs seedCastEntry): castOn is FILL-ONLY, so empty slots of the new LEGO S0117L03 are queued by the ordinary sv2-legos step with no code change. Which of Dan/Eleri holds target1 vs target2 not confirmed live (comments say Dan target1, Eleri target2).
- Seed 117 wneud: b702fdc27's re-queue grant (rerecord_wanted.requeue_for on clip 10f25262) would put seed 117 back on the named reader's list but shows the CURRENT text (gwneud), and the take links by same-words; so the take would land on the old text. Not shape (a).
- Shape (b) needs a new line kind + take-route branch (text edit + link-clip replace/expectCurrent 10f25262 in one /api/production/<course>/edit-batch). That is more than the price. Not built. Text NOT edited.

## 25 Nov 14:47Z additions (Kai)
- (b) cut candidates: NOT done. The only cut door is POST /api/production/:course/ingest-cut (services/shared/ingest-cut.cjs). Its default dry run stores and returns NO audio (provenance only), so nothing to review by ear; its real run stores the cut AND links it into the named slot (S0117L03 target slots are empty, so fill-only would link at once) and files a cut of a human take as origin 'tts'. That breaks "link nothing yet" and the human-voice-only rule. Cut points (seconds) would also need word timings of Dan's human takes, which this job may not get by transcription. A review page needs a no-link, store-only (or returned-bytes) mode: a gap for a new tool/route, not built.
- (c) seed 117 stays held; nothing edited.
- nv2/Eleri: no nv2 seed uses S0117L03 (per Kai), so nothing for the North reader.

## Decision (2026-11-25)

A for S0117L03 (cym_sv2 "na ddylen i"): Dan records it in the booth via the ordinary sv2-legos list. Seed 117 stays held.
