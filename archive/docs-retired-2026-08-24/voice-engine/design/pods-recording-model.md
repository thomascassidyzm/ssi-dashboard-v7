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
  **SUPERSEDED 2026-08-06** — the design centre is now TWO voices; see the
  ruling below. Five survives only as the ceiling of an opt-in.

**SOFTENED 2026-06-11 (people-first casting, Tom's decision):** the
consume-verbatim rule above yields to the leader's declared PEOPLE. When a
leader lists who can actually record (the `/cast/propose` flow), the solver
runs over exactly those people — the number of actual voice actors drives the
colouring — even when `listening_pods.speakers` carries generation-side slot
colouring. Generation colouring is demoted to a default suggestion for the
5-person case; it never blocks or overrides a people-first solve.

## RULING 2026-08-06 — two voices is the DEFAULT (supersedes the 5-slot centre)

Tom, voice note after looking at the Welsh pods in Popty. His words:

> "the whole point of doing this in this way was that we could get by with just
> two different voices, a male voice and a female voice […] probably do it for
> two voices as the default. And then if you want to try it with three or four
> voices because you do have additional human voice recorders, then fantastic,
> we can do that. But think about that. If we are making it a lot more
> complicated to even get the recordings done, it's going to be harder for
> people to do community courses, isn't it? And Welsh is a great example of
> that. Every single audio that's in the Welsh course was recorded by Aran and
> Katchin themselves. Those are for the seeds, for the LEGOs and for the
> phrases. So we don't want to make it unnecessarily complicated by having 56
> different cast members."

("Katchin" is the transcription of Catrin.)

**The governing principle, which outranks any local design preference here:**
anything that makes recording more complicated makes community courses harder.
A cast structure demanding 56 cast members is a barrier to community courses,
not a feature of them. Given two implementations, take the one that asks a
community leader to do less.

What this changes:
- **"5 slots confirmed as the design centre" (addendum above) is superseded.**
  The design centre is TWO — one male voice, one female voice. Five is now only
  the ceiling of the opt-in, not a target.
- Two voices is what a course gets with **nobody configuring anything**
  (`castDefaults` on `GET /cast`, `defaultCastPeople()`). A leader who does
  nothing never meets an N-voice concept.
- Three or four voices is an **opt-in upgrade** for courses that genuinely have
  extra recorders — never a requirement, never a prerequisite for recording.
  `POST /cast/propose` accepts 2–5 (`validateCastPeople`); it used to hard-reject
  anything but exactly two.
- Every size still needs one male and one female voice. Not ceremony: with only
  these voices covering every character, a cast missing a gender leaves
  characters with nobody to read them.
- `PUT /cast` records `voice_config.podCastVoices`, so a deliberate three- or
  four-voice cast survives the legacy two-voice collapse on the next load.
  Casts without that key still collapse exactly as they always did.

**CHARACTERS vs VOICES — the distinction the UI kept losing.** The number of
characters in a pod script is a *writing* fact, and a scene may have as many as
it likes. The number of humans recording them is a *casting* fact, and that is
two. Tom's "56 different cast members" was a complaint about the second, not the
first. Characters sharing a voice is the intended outcome, not a shortfall.

Where the overkill actually came from (live DB, 2026-08-06): **not** the cast
data. Both Welsh courses already held exactly two human voices. It was
generation-side colouring being *rendered* as a cast — `PodDetailView`'s
always-open "Speaker voice mapping" grid of 22 characters against raw generation
ids (`HUMAN_F1/F2/F3/M1/M2`), and `PodsView`'s "22 speakers" on the pod card.
Both now speak in characters, and lead with the two people who record.

The human recording path has always read `voice_config.podCast` alone
(`pods-plan.cjs#buildRecordingPlan`) — generation colouring never reached the
recorder's queue. Generation data is not rewritten by this ruling; the human
cast simply wins on the recording path, and the addendum above is read in that
light.

## Welsh run-steps (after the tool lands — with Tom/Aran, not auto-run)
1. Generate cym pod scripts from canon (existing pod-dialogue-generator; Welsh
   text QA'd by Aran in PodDetailView). 2. Cast: Aran (male) and Catrin (female)
   — two voices, which is what Welsh has always had.
3. Record via dialogue autocue. 4. Listen in the learning app.

## Territory rules
`services/pod-*.cjs`, `tools/pod-recolour.cjs`, `tools/pod-voice-colour.cjs` are
Aran's stream's active files — additive changes only (new functions/exports, new
files preferred). All new server surface in `services/voice-engine/pods-*` modules,
mounted under the gated `/api/production/:courseCode/...` prefix.
