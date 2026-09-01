# The 19, named — and it's 6, not 19

**2026-09-01.** You asked for names before you'd rule on A-344. Ran the live gate code
(`voice-personhood.cjs` / `voice-consent-gate.cjs`, as deployed on `main` right now) against
every row in the live `voices` table — 312 rows — myself, this morning. Not the writeup.

## Your hypothesis was right, mostly

The "19" was real when job #538 counted it at 21:47 UTC on 2026-08-31. It has since been fixed
twice over:

1. **All 17 human recordists were un-gated the same evening** — Aran, Catrin, Sasha, Kai, and
   every Welsh/Spanish course-recordist slot. Ruling: "gate anything CLONED from a person's
   voice; do not gate a person's own recording — the recording session IS the consent." That's
   deployed on `main`. None of them show up in a live gate check today.
2. Two more unregistered Cartesia clones (`tom_001`, `aran_english_003`) were found and
   registered afterwards, adding 2 to the clone side.

**Net right now: 6 voices refused, zero of them recordists.** No Welsh, no Spanish, no Kai —
your inversion-worry was correct, that part of the "19" doesn't exist any more.

## The 6, named

| Voice (name) | Vendor | Consent | Cast now / rendering | Old clips still playing |
|---|---|---|---|---|
| **`gfzdpspr5fdp`** — your xAI clone | xAI | not recorded → **REFUSED** | **Yes — cast in 18 courses, 4 of them released** (eng_for_kan, eng_for_mar, fra_for_eng, eng_for_tel) | 183,194 clips already out, still served |
| `cartesia_e7ed10ad…` "Tom_002" | Cartesia clone | not recorded → REFUSED | No — 0 courses, 0 clips ever rendered | — |
| `cartesia_8fef4d59…` "tom_001" | Cartesia clone (made outside the Lab, registered later) | not recorded → REFUSED | No — 0 courses cast now | 91 clips from before registration, still served |
| `cartesia_33890587…` "aran_english_003" | Cartesia clone | not recorded → REFUSED | No — 0 courses, 0 clips | — |
| `elevenlabs_FOIN928…` "English Narrator (Aran Clone – Presentation)" | ElevenLabs clone | not recorded → REFUSED | No — 0 courses, 0 clips | — |
| `elevenlabs_FVdzAUsp…` "English Narrator (Aran Clone – Source)" | ElevenLabs clone | not recorded → REFUSED | No — 0 courses cast now | 2,740 clips from before, still served |

**Not refused:** `cartesia_f56e05e2…` "Tom_003" — you recorded consent for this one yourself on
2026-08-31. Allowed.

**What the gate is actually checking:** is there a `voices` row saying either "this is a clone
this estate made from a named person" (Cartesia clone provenance, or ElevenLabs display-name
text) or "a human named a human on this row"? If yes, it needs a recorded yes; if the row is a
recordist's own files (`human_*`, no vendor voice id, no clone provenance) or a vendor catalogue
voice, it's exempt — nobody to ask, or already answered by turning up and recording.

## What you actually need to act on

**One voice: `gfzdpspr5fdp`, your own xAI clone.** It's the only one of the 6 that is both cast
in live production courses and has real render volume behind it — 4 released courses, 183k
clips. No new audio can be generated in your own voice on any of those courses until you record
a consent for it (same one-minute flow you used for Tom_003).

The other 5 are Cartesia/ElevenLabs clones of you or Aran sitting uncast in the table — some with
old clips still serving fine, none currently assigned to a course. They only matter if you (or
Aran) intend to cast them again; nothing is broken today by leaving them refused.

**Gap:** I didn't chase pod-speaker casting tables beyond `courses.voice_config` (no
`pod_speakers`/`course_pod_speakers` table exists in this schema to check), so "cast" here means
"assigned in a course's voice config" specifically — the same signal the original census used.
