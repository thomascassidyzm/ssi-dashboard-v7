# The Pod-0 casting rule — two voices, cast by speaker

**Ruled by Tom, 2026-08-08. Settled. Do not re-open this argument.**

---

## The rule

* Pod 0 uses **exactly two voices** — one male and one female, per the standing two-voice default.
* Casting is **by speaker**, never by line position.
* Each character in a scene is assigned a voice and **keeps it for every line they speak, including consecutive lines**.
* A **third or subsequent character** in the same scene **recycles voice 1**.
* **Strict line-by-line alternation is explicitly rejected**, because it splits a single speaker across two voices when they have consecutive lines.

## What Tom said

Setting the requirement:

> "the conversation has to be between 2 different voices - so Aran's sentences have to be cast as v1 v2 all the way through as much as possible
>
> this is a hard restriction and it MIGHT cause problems to the learner in a small way - who's saying what
>
> but Aran is confident that - as in Stephen Fry's reading of the Harry Potter books - one voice can actually work well enough for all the different characters
>
> he says that by the time you're not focusing on the language so hard that you can even listen to which voice is saying what, you're already going to be on POD1 which will have more voices - probably"

Asked directly whether he wanted strict line-by-line alternation (line 1 v1, line 2 v2, regardless of who is speaking, so a character with two consecutive lines changes voice mid-thought) or casting by speaker (each character in a scene gets a voice; with only two voices a third character reuses v1), his answer was complete:

> "of course cast by speaker"

## Why by speaker, and not alternation

Aran's Stephen Fry point is precisely that **one voice covering several characters works fine**. That argument supports recycling a voice across characters. It says nothing in favour of flipping a voice mid-speaker — which is the one thing alternation guarantees the moment anyone says two things in a row.

In Aran's canon that is not an edge case. In the coffee-shop scene alone, Sarah asks three questions in a row before the barista answers, and the barista then answers twice. Under alternation her three lines would come out v1 / v2 / v1: one person, speaking in two voices, inside one thought.

## Two voices is a deliberate simplification, not a limitation

Nobody should apologise for it in a brief, a doc or a report. Aran's further point stands: **by the time a learner has enough spare attention to track who is saying what, they are on Pod 1**, which will likely carry more voices. Pod 0's job is the language, not the cast list.

Pool depth is **parked, not deleted**. `--voices-per-gender` (pod-recolour), `POD_VOICES_PER_GENDER` (pod-sync) and `DEFAULT_POD_VOICES` (pods-cast) all default to the two-voice cast and all take a bigger number when pod 1/2 wants one.

## Where the rule lives in the code

The rule was mostly already real before this ruling — casting has been keyed by speaker throughout, and **nothing in the estate casts by line position**:

| Place | What it does | Status |
|---|---|---|
| `services/voice-engine/pods-cast.cjs` | `voice_config.podCast` keyed by speaker name; `castVoiceFor`, `speakerInventory`, `collapseTwoVoiceCast` | already by speaker |
| `services/phases/phase8-audio-v13.cjs` | `resolvePodSpeakerVoice(pod.speakers, s.speaker, track)` — per-clip voice from the speaker | already by speaker |
| `tools/pod-sync.cjs` | `POD_VOICES_PER_GENDER = 1`; one voice per canonical speaker | already two-voice, by speaker |
| `tools/pod-voice-colour.cjs` | `exactColourTwoVoices` — optimal max-cut keeping conversants apart on a two-voice pool | already existed, was unreachable for most courses |
| `tools/pod-voice-colour.cjs` | `trimPoolPerGender(pool, n)` — **the rule stated once, voice pair as a parameter** | added 2026-08-08 |
| `tools/pod-recolour.cjs` | `--voices-per-gender`, `--pool-from=pod`, `--keep-audio` | added 2026-08-08 |

Tests: `services/voice-engine/__tests__/pod0-cast-by-speaker.test.cjs` covers a two-hander, a speaker with consecutive lines (the regression the ruling exists to prevent), a four-character scene recycling a voice, cross-scene stability and determinism.

## The gap the ruling exposed

Casting by speaker is necessary but not sufficient. Speakers were being assigned to the two voices by a **name/role gender guess**, not by the conversation. On the Spanish pod-0 that put Tourist *and* Local, Customer *and* Assistant, Customer *and* Pharmacist, Passenger *and* Driver all on the male voice — **six dialogue scenes in which one voice talked to itself**, while still technically obeying "cast by speaker".

The fix is to deal the two voices across the **conversation graph** (`exactColourTwoVoices`, an exact max-cut on adjacent-turn weight), with gender realism demoted to a third-place tie-break that can only choose between cuts that are already optimal on the ear metric. Measured on `spa_for_eng:pod-0-unrecorded`: adjacent-turn collisions **71 → 11** on both tracks (17 → 4 pairs).

Gender realism is what gives way, and the ruling says so explicitly: "one voice can actually work well enough for all the different characters". On the Spanish pod four characters end up voiced against their apparent gender. That is the accepted cost of the hard restriction, not a defect to file.

## What still recycles a voice, and why that is the rule working

Four pairs still share a voice on the Spanish pod: Customer 1↔Customer 2 (8 adjacent turns), Customer 2↔Customer 3, Customer 1↔Customer 3, Barista↔Narrator. The pub, coffee-shop and restaurant scenes each put **four characters** on stage. With two voices, somebody must double. The solver puts the doubling where the fewest consecutive turns are lost — which is exactly "a third or subsequent character recycles voice 1".

## Related

* Canonical Pod-0 script: `scripts/pod0-canonical-source-2026-08-06.txt` — 22 scenes, ~231 sentences. It carries **no speaker labels at all**; every speaker in the database is inferred. See the speaker-inference audit alongside this doc.
* Make-before-break for any voice swap: `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md` §6b. `pod-recolour --keep-audio` exists so a recast never unlinks a clip before its replacement is generated.
