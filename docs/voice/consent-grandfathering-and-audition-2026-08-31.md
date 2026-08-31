# tom_001 vs Tom_002 — the answer, and the count

**2026-08-31.** Your screen showed the same person's voice twice: `Tom_002` refused with two badges
and no route forward, `tom_001` directly above it, castable, with no consent badge at all.

## The answer, plainly

**Neither grandfathered nor consented. The exemption was by ROW ABSENCE, and it had nothing to do
with dates.**

The block asks one question — *what is this voice?* — and answers it from the `voices` table. A
Cartesia id with **no row at all** comes back `stock`: "a vendor catalogue voice, nobody behind it
to ask." That is right for the 290 real catalogue voices and wrong for the voices **we own** at
Cartesia, which the Voice Lab merges into the same list and labels *"this estate's Cartesia clone"*.

- A clone made **through the Voice Lab** gets a row → classified `clone` → refused. That is
  `Tom_002`.
- A clone made **in Cartesia's own web UI** has no row → classified `stock` → **allowed to be cast
  and allowed to render.** That is `tom_001`, and `aran_english_003`.

A voice created five minutes ago outside the Voice Lab would have been just as exempt. So the block
was not cosmetic *because it was old* — it was blind to anything it had never been told about.

**Closed.** `tools/voice/register-estate-clones.cjs` registers everything Cartesia flags as ours
that has no row, with clone provenance and no consent. Two voices, both English, registered today.
The gate now refuses **5** clones where it refused **3**.

**Nothing was uncast.** Neither voice was cast anywhere — 0 casting roles, 0 course configs — and
the 91 clips already rendered with them keep playing. What changed is that a *new* cast or render
is refused until somebody records the person's consent, which now takes about a minute on that page.

![the two clones, now refused with a way through](/evidence/voicelab-three-gaps-2026-08-31/4a-clones-now-refused.png)

## Every voice the page offers, across every language row

Checked, not extrapolated: **686** distinct candidates over all 88 language rows.

| | count |
|---|---|
| candidates offered for casting | **686** |
| vendor stock voices — no person to ask | 663 |
| clones of a real person | **6** |
| human recordists | **17** |
| the gate would refuse | **5** |
| **the screen offers Cast but the server would refuse** | **0** |

**Castable today with no authorised consent: 17, and every one of them is a recordist** — Aran,
Catrin, the Welsh and Spanish course slots, Kai. They are ungated **by your own boundary ruling of
this evening**: a voice cloned from a person is gated, a person's own recording is not, because the
recording session is the consent. Not an accident, and not a hole. They still carry an honest
"no consent recorded" label, which is a fact about the record rather than a refusal.

**Clones of a real person — all six, with their real state:**

| voice | what it is | consent | castable |
|---|---|---|---|
| `Tom_003` | Cartesia clone | **authorised**, spoken, 2026-08-31 | yes |
| `Tom_002` | Cartesia clone | no consent recorded | **refused** |
| `tom_001` | Cartesia clone, made outside the Lab | no consent recorded | **refused** (was allowed until today) |
| `aran_english_003` | Cartesia clone, made outside the Lab | no consent recorded | **refused** (was allowed until today) |
| English Narrator (Aran Clone - Source) | ElevenLabs clone | no consent recorded | **refused** |
| English Narrator (Aran Clone - Presentation) | ElevenLabs clone | no consent recorded | **refused** |

Reproduce either number: `node tools/voice/voicelab-castable-consent-census.cjs`.

## The dash on the play button was three different problems

Of the 686 candidates, **553 render on demand** — one tap and you hear them, which is the change
that shipped this afternoon. The other 133 split three ways, and only one of them is honest:

| | count | which is it |
|---|---|---|
| a human recording | 17 | **genuinely cannot be synthesised.** Faking a preview would be a lie about whose voice you are hearing. |
| ElevenLabs | 12 | **path not built** — and deliberately, because ElevenLabs is expensive and explicit-cast-only. |
| a Cartesia voice in a language the lab has no steer for | 104 | **path not built.** Cartesia's API needs a locale; without one there is no honest request to send. Twenty languages: Danish, Swedish, Norwegian, Czech, Hungarian, Greek, Romanian, Ukrainian, Bulgarian, Croatian, Hebrew, Thai, Indonesian and seven Indian languages. |

**All three are now answered the same way, and it costs nothing: the voice is auditioned on its own
clips.** Ten of the twelve ElevenLabs candidates are guide voices talking to learners *today* —
building an ElevenLabs render path to hear them would be paying a vendor for audio we already own.

![the ElevenLabs narrator, heard on its own clips](/evidence/voicelab-three-gaps-2026-08-31/4b-elevenlabs-heard-on-its-own-clips.png)

What is left genuinely unhearable is a voice that can neither be rendered nor is anywhere on
record, and it now says exactly that rather than showing a dash. Several `human_*` candidates turn
out to be **slot placeholders with no audio at all filed under them** — `human_welsh_source`,
`human_cym_n_for_eng_target1`, `human_spa_for_eng_target1` all have 0 clips; the real Welsh
recordings are filed under `human_aran_cym_n` and its siblings. Worth knowing before anyone casts
one expecting a voice.

## Two things I did not do

**I uncast nothing**, as you said. Whether the six clones stay where they are is yours.

**I did not build the ElevenLabs render path.** Ten of those twelve voices can now be heard for
free on their own audio, and the two that cannot are Aran's clones, which are consent-refused
anyway — so the path would buy nothing today and would add a metered vendor to the lab's render
surface. Say the word if you want it regardless.
