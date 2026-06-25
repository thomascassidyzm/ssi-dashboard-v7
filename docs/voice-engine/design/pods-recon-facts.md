# Pods recording — recon facts (live-verified 2026-06-11)

Read-only recon of `ssi-dashboard-v7-clean` + live DB, pinning the facts
`pods-recording-model.md` deferred. All paths relative to the dashboard repo
unless absolute. Live queries ran via `.env.psql` DATABASE_URL, SELECT-only.

## 1. course_audio role strings for pod rows

`services/phases/phase8-audio-v13.cjs` `/generate-pods` work queue:
- target track → `role: 'target1'` (phase8-audio-v13.cjs:5280)
- known track → `role: 'known'` (phase8-audio-v13.cjs:5295)
- explainer → `role: 'pod_explainer'` — constant `EXPLAINER_ROLE` in
  `services/production-api.cjs:3823` and `services/run-pod-explainer-batch.cjs:56`.
  run-pod-explainer-batch.cjs:47-55 warns: it MUST be `pod_explainer`, not
  `presentation` (the `/regenerate-presentations` orphan-cleanup wiped the first
  ita+zho batch). Allow-listed by migration `20260519_course_audio_pod_explainer_role.sql`
  (referenced there; not in local migrations dir).

Live verification (course_audio joined from listening_pod_sentences ids,
fra/zho/spa/jpn/hrv/ita `_for_eng`): every linked target clip = `target1`,
every known clip = `known`, every explainer clip = `pod_explainer`; all
`origin='tts'`. No other role string appears on pod-linked rows.

So human pod rows must use: target line → `target1`, known line → `known`,
explainer line → `pod_explainer`. Do not invent roles.

## 2. audio_autolink trigger — pod ids are set EXPLICITLY, not by trigger

Live: `CREATE TRIGGER audio_autolink AFTER INSERT ON public.course_audio FOR
EACH ROW EXECUTE FUNCTION link_audio_to_content()`.

`pg_get_functiondef(link_audio_to_content)`: branches on NEW.role
(`known` / `target1` / `target2` / `presentation`) and UPDATEs only
`course_legos` + `course_practice_phrases` (presentation: legos only), matching
`course_code` + `lower(trim(text)) = NEW.text_normalized` + audio col IS NULL.
**It never touches `listening_pod_sentences`.** `pod_explainer` falls through
all branches (no-op).

Generator confirms: phase8 links each clip itself —
`update({ [item.link_column]: result.id })` on listening_pod_sentences
(phase8-audio-v13.cjs:5324-5329; link_column = `target_audio_id` /
`known_audio_id` set at :5282/:5297). Explainer link likewise explicit
(production-api.cjs:3889-3894 `update({ explainer_audio_id })`;
run-pod-explainer-batch.cjs audio pass same).

⇒ The registration builder MUST set `{target|known|explainer}_audio_id` itself.
SIDE-EFFECT WARNING: inserting a human pod row with role `target1`/`known`
WILL fire audio_autolink and may opportunistically claim any NULL-audio
lego/phrase in the same course whose normalized text matches the pod line.
Pod dialogue lines rarely tile exactly onto lego/phrase text, but it is not
impossible — note it in the design (it is the same behaviour TTS pod inserts
have today, so it is at least not a new hazard).

No triggers on listening_pod_sentences except audit + touch_updated_at.

## 3. tools/pod-voice-colour.cjs — solver shape

Exports (pod-voice-colour.cjs:256):
`{ buildAdjacency, buildTurnWeights, countAdjacentCollisions, colourTrack, assignVoicesColoured }`

Main entry `assignVoicesColoured({ scenes, speakers, targetPool, knownPool, genderOf, meta })`
(:204-241):
- `scenes`: Array<Array<canonicalSpeaker>> IN TURN ORDER (dupes = consecutive
  turns); built by callers from listening_pod_sentences grouped by scene_number,
  ordered by global_order.
- `targetPool`/`knownPool`: `{ f: [voice], m: [voice] }`, voice =
  `{provider, voice_id, name, gender, locale}`.
- `genderOf(canon)` → 'f'|'m'|'n'; `meta(canon)` → extra keys (variants).
- Returns `{ assignments: { [canon]: { gender, variants, target:{provider,voice_id,name,locale}|null, known:{...}|null } },
  report: { targetForced, knownForced, targetColours, knownColours, targetEmpty, knownEmpty } }`.

It is NOT 2-voice-only: `colourTrack` (:141) is greedy most-constrained-first
for ANY pool size (distinctness hard, gender soft, forced-reuse minimises
adjacent-turn weight); `exactColourTwoVoices` (:75) is a brute-force optimum
used only when the pool is exactly 2. A 4-5-human pool drops straight into the
existing machinery.

Persistence: the module is PURE (no DB). `tools/pod-recolour.cjs` applies it:
loads sentences (:54-57), builds scenes/adjacency/weights (:62-76), resolves
pools from `tools/pod-voice-coverage.cjs` (:189-190), calls assignVoicesColoured
(:103-105), adds an `_default` entry (:107-115), then with `--apply` writes the
assignments object verbatim to `listening_pods.speakers` (:225-227) and NULLs
the audio ids of only voice-changed sentences (:228-239) for `/generate-pods`
to regenerate. No voice-map file; DB jsonb is the store.

ADDITIVE N-voice fit: a new exported function (e.g.
`proposeHumanCast({ sentences, voices })` → `{ castBySpeaker, report }`) can
internally reuse buildAdjacency/buildTurnWeights/colourTrack with one pool
`{ f: humanF, m: humanM }` where each human voice is
`{ provider:'human', voice_id:'human_catrin_cym', name, gender }`, and return
canon-speaker → voice for `courses.voice_config.podCast` — never touching
assignVoicesColoured's TTS callers. (Keystone: result is persisted to
voice_config.podCast, NOT listening_pods.speakers — the TTS map stays Aran's.)

## 4. listening_pods.speakers + metadata live shapes

Sampled fra_for_eng:pod-0, hrv_for_eng:pod-0 (+ zho structure identical).

`speakers` (jsonb, written by pod-sync/pod-recolour, read by phase8
resolvePodSpeakerVoice phase8-audio-v13.cjs:4965):
```json
{ "Anna": { "gender": "f", "variants": ["Anna"],
            "target": { "provider": "xai", "voice_id": "ara", "name": "Ara", "locale": "fr" },
            "known":  { "provider": "azure", "voice_id": "en-GB-SoniaNeural", "name": "Sonia", "locale": "en-GB" } },
  "Neighbour": { "variants": ["Neighbour (8 am)", "Neighbour", "Neighbour (10:30 pm)"], ... },
  "_default": { "gender": "n", "target": {...}, "known": {...} } }
```
Keys are CANONICAL names (parens stripped — canonicalSpeakerName,
phase8-audio-v13.cjs:4956); `variants` lists raw `sentence.speaker` strings.
hrv target pool is Azure (hr-HR-GabrijelaNeural/SreckoNeural) — 2-voice class.

`metadata` (jsonb): `{ status:'draft', name_map:null,
sections:[{label,title,number,subtitle,sentence_count}×15],
scene_hashes:{ "1":"6096a4e4703246dd", ... }, generated_from:'canonical_pod_scenarios',
consistency_ledger:"# BINDING CONSISTENCY LEDGER — ... (markdown)" }`.
`parseNameMap(pod.metadata.consistency_ledger)` recovers localised speaker
names (pod-recolour.cjs:81).

Sentence columns (live information_schema): `id text` (e.g.
`fra_for_eng:pod-0:SC01-S001`), `pod_id, scene_number, sentence_number,
global_order, speaker, target_text, known_text, target_audio_id uuid,
known_audio_id uuid, beat_label, glue_to_next bool, explainer_decomposition
jsonb, explainer_text, explainer_audio_id uuid, created_at, updated_at`.
Pod columns: `id, course_code, pod_type, slug, pod_order, title, scene,
difficulty, speakers jsonb, source_file, metadata jsonb, timestamps`.

## 5. Explainers post canon-v2

- WHICH: Stage-1 (pod-0) sentences. Live: `_for_eng` courses have
  explainer_text on ALL 142 pod-0 sentences (Narrator vocab-coda rows are
  stamped `explainer_text=''` = deliberately none,
  run-pod-explainer-batch.cjs:237-247). cym_n/cym_s: 0 explainer_text (none
  generated — Welsh is the human-recording course). eng_for_* (118-sentence
  pods): 0 explainer_text.
- VOICE: Tom's branded xAI clone `gfzdpspr5fdp`, provider xai, role
  `pod_explainer` (production-api.cjs:3820-3824; batch runner default
  run-pod-explainer-batch.cjs:42). Live rows confirm voice_id=gfzdpspr5fdp,
  origin=tts; course_audio.language carries the resolved cue (e.g. `ar-EG`).
  Language per course via `resolveExplainerLanguage`
  (tools/pod-voice-coverage.cjs:213-219; whitelist XAI_EXPLAINER_LANGS :207-210,
  fallback 'auto'); the admin endpoint still hard-codes 'auto'
  (production-api.cjs:3822). "Sack for languages the voice can't speak" shows
  live as with_explainer_audio=0 on the Azure-tail courses (ara_sy, bul, cat,
  dan, ell, est, eus, …) while xAI-speakable courses sit at ~125-131/142.
- FIRST-ENCOUNTER DISCIPLINE: `buildExplainerNarration`
  (run-pod-explainer-batch.cjs:~113-140) drops decomposition chunks flagged
  `first_encounter:false` (runOncePass) and identity chunks; if nothing
  remains → no explainer audio. TTS form is rebuilt P5-quoted from
  explainer_decomposition, NOT the stored prose.
- GLUE: `glue_to_next` = this row + next global_order row are chunks of ONE
  natural utterance (player gap 300ms vs 1000ms; migration
  database/migrations/20260505_listening_pod_sentences_glue_to_next.sql).
  LIVE: **zero rows true anywhere** post canon-v2 — every sentence is a whole
  utterance today. The recording-plan "glued lines = one item" rule must still
  be implemented (column is live and default false) but currently no-ops.

## 6. PodDetailView.vue + PodsView.vue

Routes (src/router/index.js): `/production/:courseCode/pods` → PodsView
(:517-521), `/production/:courseCode/pods/:slug` → PodDetailView (:524-528);
legacy `/courses/:courseCode/pods*` redirects (:218-224).

PodsView fetches `GET /api/pods/:courseCode` (PodsView.vue:238; server
production-api.cjs:3645-3691) → pods + `audio_coverage:{target,known,total_sentences}`;
coverage chips rendered at PodsView.vue:35 and :110-117 — natural mount for
per-VOICE recorded/remaining (extend the endpoint's coverage object or add a
voice-engine endpoint; chips already have coverageClass() :227).

PodDetailView fetches `GET /api/pods/:courseCode/:slug`
(PodDetailView.vue:406; server production-api.cjs:3694) → pod + sentences;
plays clips via `GET /api/production/:courseCode/audio/:uuid/url` (:362);
admin actions: sentence edit `PUT /api/admin/pod-sentences/:id` (:451),
explainer text gen (:490), `POST /api/admin/pods/:courseCode/generate-audio`
(:530 → proxies phase8 /generate-pods, production-api.cjs:3796), explainer
audio (:572 → :3826). Casting panel mounts naturally in/next to the existing
"Speaker → voice mapping" `<details>` panel (PodDetailView.vue:59-70).
NOTE: that template reads legacy `v.voice_id` top-level — renders blank for
the per-track shape; a podCast panel should read its own structure.

## 7. Upload identity — where mode:'pod' slots in

`POST /api/production/:courseCode/recording/upload`
(services/production-api.cjs:4132-4367). Mode detection
`isScriptModeUpload(uuid, metadata)` (services/recording-upload-helpers.cjs:19-23:
`metadata.mode==='script'` or legacy `script-N` uuid).

Flow: decode base64 → `audioProcessor.processRecordingBuffer` (trim/normalize
-16 LUFS, :4197-4205) → S3 PUT `mastered/{fresh-uuid}.mp3` (:4219-4224, fresh
key ALWAYS) → mode branch:
- regeneration (uuid = existing course_audio id): row looked up FIRST
  (:4164-4182), then repointed `{ s3_key, origin:'human', duration_ms }`
  (:4229-4242). **No new row inserted.**
- script: server-minted id; **no course_audio write at all** — identity rides
  in recording_provenance.quality_notes JSON via `buildProvenanceContext`
  (helpers :88-107: role, voice_id, text, seed/lego/phrase ids, chunks_string,
  replaced_s3_key).

voice_id is resolved SERVER-side from `voice_config.voices[metadata.role].voiceId`,
client advisory (:4287-4301) — a pod branch resolves
`voice_config.podCast[speakerName]` instead. sample_flags update is skipped for
script mode (:4264-4277) — pod mode must also skip (pod sentences have no
sample_flags row).

mode:'pod' branch placement: a third branch alongside the `existingRow` block
(:4229-4242), after the S3 PUT — (a) INSERT a NEW course_audio row
`{ course_code, text, text_normalized (trigger trg_course_audio_normalize also
normalizes on insert), language, role per §1, voice_id from podCast,
origin:'human', s3_key, duration_ms }`; (b) UPDATE
`listening_pod_sentences.{target|known|explainer}_audio_id = newRow.id` by
sentenceId (mirror phase8:5324-5329 — §2: the trigger will NOT do this); (c)
extend buildProvenanceContext with `{ pod_id, sentence_id, kind, replaced
audio id }` for re-record provenance. Re-record = repeat (a)+(b): new row,
re-point, old row/object untouched (matches the existing fresh-key contract).
Keystone territory rule: implement as a new `services/voice-engine/pods-*`
module called from a thin branch, not inline edits to Aran's pod files.
