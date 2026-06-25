# Pods human recording — keystone (the "teeny pivot")

*2026-06-11, Tom's go: record listening PODS with human voices for community courses;
Welsh first (full speaking practice, zero listening exercises; Aran/Catrin + a few
Welsh speakers ready). Build around 4–5 distinct voices. The reader must see cue
lines — context before their line.*

## What this is NOT
No splicing, ever. Pod lines are whole-utterance per-speaker takes (voice-engine
keystone decision 2). The LEGO engine is untouched. No DDL; no TTS spend.

## The model

1. **CAST, per course**: map pod SPEAKER names (characters from `listening_pods.speakers`
   / `listening_pod_sentences.speaker`) → human voices. Stored additively in
   `courses.voice_config.podCast`:
   ```json
   { "podCast": { "<speakerName>": { "voiceId": "human_catrin_cym", "name": "Catrin", "email": "..." } } }
   ```
   (additive key — same safety contract as the roster's `previousVoice`; serving
   reads only voices.*.) 4–5 voices is the design centre: the N-voice colouring
   solver (extend `tools/pod-voice-colour.cjs` ADDITIVELY — new exported function;
   never modify Aran's live 2-voice TTS path) proposes a cast honouring
   turn-alternation (adjacent speakers ≠ same voice) and gender constraints;
   the leader can override per character in the casting UI.
   The EXPLAINER voice (known-language lines + explainer_text) is its own cast
   entry: `podCast["__explainer__"]`.

2. **PER-VOICE QUEUES** ("same voice calculations"): one human records ALL their
   lines in one autocue sitting.
   `GET /api/production/:courseCode/pods/recording-plan?voiceId=` →
   ordered queue (pod → scene → global_order) of every sentence whose cast
   voice matches, each item carrying:
   - `cues`: the preceding N (default 2) dialogue lines — speaker label + target_text
     (and known_text gloss) — plus scene_title on scene boundaries; `glue_to_next`
     respected (glued lines are ONE recording item).
   - `line`: their target_text (or known/explainer text for the explainer queue).
   - identity: `podId, sentenceId, kind: 'target'|'known'|'explainer'`.

3. **DIALOGUE AUTOCUE**: Record Room gains a dialogue mode (cue lines rendered
   greyed above the highlighted line, speaker-coloured chips). Reuses
   useContinuousRecorder (VAD, wake lock, phone-safe containers) + the upload
   queue. Natural cadence only, single pass — no slow takes, nothing to align.

4. **REGISTRATION**: upload metadata `{ mode: 'pod', podId, sentenceId, kind, role,
   voiceId }` → existing upload seam masters the take, writes `course_audio`
   (origin='human', voice_id from cast — server resolves from podCast, client
   advisory) and then sets the sentence's `{target|known|explainer}_audio_id` to
   the new row. role: match whatever phase8's generatePodAudio writes for TTS pod
   rows (recon confirms; do NOT invent a new role string). Re-record = new row +
   re-point, old take kept (provenance records replaced id). Origin guard already
   protects every human row.

5. **COVERAGE**: per-voice recorded/remaining counts for the casting UI and
   PodDetailView (which already has the edit→regen→preview pattern for sentence
   text edits — text editing is NOT this build's job).

## ADDENDUM 2026-06-11 — generation-side colouring is upstream of the cast

Parallel workstreams (Tom's side) are generating welsh-north + welsh-south pod sets
with **colouring already written to `listening_pods.speakers` in the standard
shape** and **5-slot cast sheets** (markdown packs landing in
`docs/voice-engine/welsh-pods/`). Therefore:
- The N-voice solver is a FALLBACK for courses without generation-side colouring —
  when `listening_pods.speakers` carries slot colouring, the recording-plan and
  casting UI CONSUME it verbatim (never re-solve over it).
- `voice_config.podCast` maps **slots/characters → humans** (who records), not
  line-level colouring. Cast sheets in the packs are the human-readable mirror;
  the DB is the machine interface.
- 5 slots confirmed as the design centre.

**SOFTENED 2026-06-11 (people-first casting, Tom's decision):** the
consume-verbatim rule above yields to the leader's declared PEOPLE. When a
leader lists who can actually record (the `/cast/propose` flow), the solver
runs over exactly those people — the number of actual voice actors drives the
colouring — even when `listening_pods.speakers` carries generation-side slot
colouring. Generation colouring is demoted to a default suggestion for the
5-person case; it never blocks or overrides a people-first solve.

## Welsh run-steps (after the tool lands — with Tom/Aran, not auto-run)
1. Generate cym pod scripts from canon (existing pod-dialogue-generator; Welsh
   text QA'd by Aran in PodDetailView). 2. Cast: Aran, Catrin + 2–3 more.
3. Record via dialogue autocue. 4. Listen in the learning app.

## Territory rules
`services/pod-*.cjs`, `tools/pod-recolour.cjs`, `tools/pod-voice-colour.cjs` are
Aran's stream's active files — additive changes only (new functions/exports, new
files preferred). All new server surface in `services/voice-engine/pods-*` modules,
mounted under the gated `/api/production/:courseCode/...` prefix.
