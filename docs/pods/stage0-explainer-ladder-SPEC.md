# Stage-0 Explainer Ladder — build spec & handoff

> **Status:** Design validated end-to-end by ear (Tom, 2026-06-13): *"amazing, exactly
> perfect, we've nailed it."* This document is the AUTHORITATIVE current spec for the
> pod-sentence introduction. It supersedes the ladder shape in
> `docs/architecture/atom-fusion-introduction.md` (orientation/meet/fuse/arrive,
> target-only fusion, silence-insertion) and the offset/recipe conclusions in
> `docs/pods/offsets-without-azure-recommendation.md` and
> `docs/pods/chunked-take-recipe.md` — read those for history, but where they conflict
> with this doc, THIS wins.
>
> **Handoff:** the audio strategy and tier model are settled and ear-validated on BOTH
> voice providers (Azure + xAI). What remains is *building* the production pipeline, not
> deciding it. Prototypes that produced the validated audio live in
> `docs/pods/stage0-prototypes/` (gitignored originals were under
> `scripts/experiments/{xai-twofile,stage0-tuner,stage0-arc,chunked-take,atom-fusion-spike}`).

---

## 1. What Stage 0 is

When a learner first meets a pod sentence, they get a gentle, multi-exposure introduction
**before** the existing speed/spaced-rep stages (Stages 2–9, unchanged). Stage 0 spreads
across the learner's first several encounters with that sentence — **one tier per
exposure** — so the first meetings are deliberately gentle. The scheduler already returns
`{stage, iter}` (`podStageFor` in the learning app's `usePodLapScheduler.ts`); the Stage-0
sub-tiers ARE that `iter`.

## 2. The unit is the INTENTION, not the row

A pod "sentence" row may contain **multiple intentions** — distinct learnt chunk-units, each
something a speaker would say as one move. Example row `gle_for_eng:pod-0` g3
"Táim go maith, go raibh maith agat. An bhfuil tú ag dul chun oibre?" is **two** intentions:
- "I'm very well, thank you." (Táim go maith / go raibh maith agat)
- "Are you going to work?" (An bhfuil tú ag dul / chun oibre)

Rules:
- Intentions = sentence boundaries (`. ? !`) within the row. Atoms map to an intention by
  position.
- **Atoms fuse ONLY within their own intention. Intentions never merge. There is NO
  whole-row tier.** Chunking-theory goal = automatic surfacing of *useful* chunk units, and
  the useful unit is the intention.
- Each intention runs its own ladder. Longer intentions appear later in the course.

## 3. The tier model

Every tier is **chunk-by-chunk**; each chunk-unit plays the pattern
**`target · meaning · target · target`** (NO meaning-doubling — hearing target then meaning
once "locks" the piece; two more targets reinforce the sound). Tiers differ only by (a) what
"meaning" is and (b) chunk granularity, which **fuses upward**:

| Tier | Per chunk-unit | Meaning is | Granularity |
|---|---|---|---|
| 0:1 | target · meaning · target · target, with a one-time spoken cue "Breaking it down..." at the head, + a construction NOTE where the atom has one | the atom's gloss/explanation | atoms |
| 0:2 | target · translation · target · target — no cue, no notes | plain translation | atoms |
| 0:3 | same | the unit's translation | atoms fused into pairs (FIRST fusion) |
| 0:4 | same | translation | fused further (toward the intention) |
| 0:5 | same | translation | the whole INTENTION (natural take) |

- **Self-scaling:** the tier list derives from atoms-per-intention. A 2-atom intention goes
  atoms→intention in one fusion step; a 4-atom intention inserts intermediate "groups of N"
  tiers (atoms→pairs→…→intention).
- **Visits-per-granularity is a parameter.** Default: the FIRST fusion ("first sticking
  together") gets **2 visits** because it's the hard step; others get 1. So exposures ≠ tiers
  1:1.
- **Speed ramp within Stage 0:** tiers ease from ~**0.7×** (first) to ~**0.9×** (last). Full
  1.0× is reserved for the later stages. Pitch must be preserved (the learning app plays via
  media elements with `preservesPitch`; the tuner panel's Web-Audio pitch-shift is a panel
  artifact only). ~0.8× is likely the practical floor.

## 4. Atom granularity rules (the decomposition)

Encoded in `services/pod-explainer-generator.cjs` (committed to main this session). Atom =
the smallest piece with an **honest, natural known-language gloss** — governed by
GLOSSABILITY + COGNITIVE LOAD, never minimal size:
- **No single syllables.** "good morning" (3 syllables) is fine as a unit; these exercises
  repeat many times, so err toward slightly larger, cleanly-glossable chunks.
- **Thin grammar-words merge UP** into the neighbour that glosses cleanly ("An bhfuil tú ag
  dul" = "are you going", not a stranded "are"+"you"+"going").
- **Still bounded above:** a whole clause is too big; split at the next clean gloss seam.
- **Word-order divergence is the LESSON, not a residue.** When the target reorders (object
  stranded after an adverb, verb-final, "have" = "be + at-me"), KEEP the construction
  together, gloss the MEANING, and put the literal order in the chunk's `literal` field →
  becomes a per-atom note. e.g. Irish "ar ball thú" → gloss "you later", literal "later you";
  "tá lá gnóthach agam" → "I've got a busy day", literal "there's a busy day at me". NEVER
  strand the prepositional pronoun.
- **Channel separation:** every diverging chunk's literal goes in its own `chunk.literal`
  (structured, multiple per row OK → per-atom notes downstream). The spoken `explainer_text`
  stays a clean single pass with AT MOST ONE tail.
- The explainer's PURPOSE is to reveal what the target language is DOING with its grammar —
  in plain words, never terminology.

## 5. THE AUDIO STRATEGY (the big result) — two files per intention

**Do NOT slice atoms from a continuous natural take** — they were coarticulated together, so
the seams run on and sound messy (proven). Instead, per intention record/generate **two
files**:

1. **File 1 — natural speed.** A bona-fide-conversation take of the whole intention.
2. **File 2 — slower, with gaps** at the atom seams — but still a coherent reading of the
   intention, NEVER chopped to single words/syllables. The gaps are *generated* at real
   phrase-boundary pauses (the voice closes each sub-unit with phrase-final prosody), so the
   seams are CLEAN.

**Every chunked tier is derived from File 2** by trimming its recorded gaps (trimming silence
is safe; the segments were prosodically separated). Fusion = shrink the gaps. The final tier
is File 1. The atoms in the explainer are sliced from File 2's clean seams (NOT synthesized
in isolation — that also fixes the xAI thin-fragment problem; an atom spoken inside the slow
intention keeps natural body).

### Provider recipes (provider-aware generation, provider-agnostic everything-after)

**Azure** (Tier-3 languages — Irish, Croatian, etc.; no xAI voice exists for these):
- One SSML call gives slow + gaps + word timestamps together: `<prosody rate="...">` +
  `<break time>` at seams. Word boundaries come free (use for seam locations).

**xAI** (the Big-10 / Tier-1 production languages):
- xAI does NOT honor a rate/speed param (`rate` is a no-op, `speed` adds junk silence) and
  returns NO word timings.
- **File 2 mechanism = PUNCTUATION AT THE SEAM.** xAI interprets punctuation as pacing (never
  speaks it): a period (or making each atom its own sentence/question) forces a recorded
  phrase-boundary pause + phrase-final close. **Commas are often too weak** — tightly-bound
  phrases ("a la fiesta mañana") stay run-on with a comma, so use a sentence/question break
  per atom. (Telling datum: if the voice REFUSES to cleanly separate two atoms, that's
  evidence they want to be ONE chunk — the audio "votes" on granularity.)
- **Slow is done OFFLINE** after synthesis: `ffmpeg atempo≈0.78` (pitch-preserving).
- **Seam locations recovered post-hoc** with `silencedetect` (reliable — the recorded gaps
  are wide and clean). This replaces xAI's missing word timings; forced alignment (MMS,
  validated at 39 ms in the offsets spike) is the heavier fallback if ever needed.

### The end-chop fix (slicer)

The trailing edge-trim was cutting words' natural decay (wrong, especially the FINAL atom,
which has nothing after it). Correct slicing (see `xai-twofile/slice-atom.sh`):
- Trim the LEADING gap/silence (good), keeping a ~40 ms lead pad to protect the attack.
- For the trailing edge, scan FORWARD from the word body (capped at the next seam) until the
  signal genuinely decays to the floor (~−55 dB), then keep a generous natural tail (~150 ms
  normal, ~230 ms for the final atom). NEVER cut while the word is still sounding.
- This also applies to the production composite's `EDGE_TRIM_FILTER` when that path is
  touched.

### Per-provider pacing note

xAI clips carry ~3–8× LESS edge padding than Azure (~70/120 ms lead/tail vs ~240/950 ms). The
gap constants were ear-tuned on Azure, so they play TIGHTER on xAI — **re-tune gaps per
provider by ear.**

## 6. What was validated (ear + measurement)

- **Provider independence:** the whole approach renders cleanly on xAI with zero code change
  (the splicer is concat-demuxer / PCM / provider-blind). Confirmed on Spanish `yis75yfp`.
- **Intention-level takes sound perfectly natural** on both providers (full utterances are
  the voice's comfort zone).
- **Fragment risk mooted:** isolated short atoms (xAI "gracias") are thin/wobbly; the same
  atom sliced from File 2 has natural in-context body. Don't synthesize atoms alone.
- **Multi-part fusion (3–4 atoms)** works: 4 atoms → 2 pairs → whole, gaps shrinking.
- **Open ear-item:** the per-atom sentence-break method can tip a slow take toward sounding
  like a *list of separate questions* rather than one intention being laid out. Watch for it;
  the fix is to only force breaks at genuine chunk seams and let tightly-bound atoms stay
  fused (the granularity "vote").

## 7. The tuner / config shape

`docs/pods/stage0-prototypes/stage0-tuner/` builds a self-contained HTML panel (live Web-Audio
playback of every tier with sliders for all gaps + a speed ramp, an editable `T·M·T·T`
pattern, per-tier visits + enable, and **Export config**). The exported JSON is the target
config shape — an `algorithm_config.pods.stage0` block: per-tier `{granularity,
meaningSource, visits, enabled, speed}`, a `timings` map (the gaps), `speedRamp`
`{start:0.7, end:0.9}`, `pattern: [T,M,T,T]`, `intentions[]` (with atoms), and a
`granularity` block (`topsOutAt: intention`, `wholeRowFusion: false`). Re-run
`render-clips.cjs` then `build-html.cjs` to regenerate it (needs Azure + DB creds).

## 8. What's committed where (this session, on `main`)

- `services/pod-explainer-generator.cjs` — atom granularity + glossability + word-order /
  have-construction handling + channel separation + the cue.
- `services/pod-explainer-composite.cjs` — cue once + `target·meaning·target·target` (no
  doubling), edge-trim, `--orders=N,N` targeted re-voice.
- `services/voice-engine/splicer.cjs` — ffmpeg-7 acrossfade retired (concat demuxer only) +
  duration guard calibrated for edge-trimmed multi-piece splices.
- Docs: `atom-fusion-introduction.md` (cloud agents — partially superseded, see top),
  `offsets-without-azure-recommendation.md`, `chunked-take-recipe.md`,
  `inventory-triage-{hrv,gle}.md` + `inventory-triage-resolutions.json`,
  `pod-lego-extractor.cjs` (corpus-first inventory, dry-run; 533 hrv / 531 gle units).
- App repo (`ssi-learning-app`, branch `dev`, commit `4cccc6f1`):
  `usePodAtomFusion.ts` — a ladder computation module built against the EARLIER shape; **needs
  rework to match this spec** (per-chunk T·M·T·T, intention-topped, speed ramp, visits).

## 9. NEXT — the build (for CC on web)

In rough dependency order:

1. **Two-file generator service.** Per intention, produce File 1 (natural) + File 2
   (slow-gapped). Provider-aware: Azure = SSML (rate+break+timings); xAI = seam-punctuation +
   offline atempo + `silencedetect` for seams. Reuse `xai-twofile/{xai-call,slice-atom,
   concat-wav}` logic. Persist the two files + the seam/atom offset map per intention.
2. **Tier derivation from File 2.** silencedetect → seam positions → end-chop-fixed atom
   slices → the gap-trim fusion ladder + the `target·meaning·target·target` assembly with the
   cue/notes at 0:1. Honor visits-per-granularity + the speed ramp.
3. **Intention-splitting of pod rows.** Split each row at sentence boundaries; group atoms by
   intention; emit per-intention units. Decomposition data gains intention grouping.
4. **Coordinated decomposition regen.** Re-atomize gle + hrv (and onward) under the current
   generator rules, APPLY the triage resolutions (minus the agam/agat one — Tom chose
   keep-together + literal note over the at-paradigm unit), and land the extractor hardening
   (gloss-normaliser kills ~40% of flags; decorated-gloss stripping; homograph sense-split;
   particle-glue; cross-occurrence re-tile). Do these together — they share the
   decomposition/inventory data.
5. **Wire to config.** Lift all parameters (pattern, gaps, visits, speed ramp, granularity)
   into `algorithm_config.pods.stage0`, tunable like the rest of `algorithm_config.pods`.
6. **Rework the app ladder module** (`usePodAtomFusion.ts`) to this spec and integrate into
   the listening overlay (coordinate — other agents touch `ListeningOverlay.vue`).
7. **Per-provider gap re-tuning** by ear once real content flows.

## 10. Operating notes / gotchas

- **ffmpeg 7.1.1 hazard:** chained `acrossfade` filtergraphs NONDETERMINISTICALLY drop whole
  segments (always exit 0). Use the concat demuxer only; ffprobe-verify every output duration
  against summed inputs. (Splicer already fixed; any new audio code must follow this.)
- **Tier-3 voice wall:** 22 of 46 built pod courses are Azure-only because xAI has no clone
  for those languages (Irish, Croatian included). Not a config gap — a vendor capability wall.
  Stage-0 audio for them stays Azure (or human-recorded) until that changes.
- **TTS costs money** — gate bulk generation on approval; sample-first, listen, then fan out.
- **No `acrossfade`, no committing the gitignored `scripts/experiments/` audio/model caches.**
- Pod target audio for Tier-1 langs is xAI; the English known/gloss track is mostly Sonia
  (Azure) — a deliberate British-pool blend.
