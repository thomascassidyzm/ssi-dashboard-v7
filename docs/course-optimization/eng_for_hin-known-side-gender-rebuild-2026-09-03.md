# eng_for_hin — known-side (Hindi speaker-gender) expansion set, rebuilt

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known side = Hindi, target side = English)
**Table:** `course_gender_expansions`, `text_side='known'`, `language='hin'`

---

## The headline number

**2,564 Hindi cues carry the speaker's gender.** That is the size of the female-voice
recording pass on the known side.

They sit inside **12,511 distinct live Hindi cues** (seeds + legos + practice phrases), so
**20.5%** of everything the learner hears as a prompt needs a second, female-speaker take.
The other 9,947 cues are gender-neutral and need one clip only.

## Step 1 — freshness of the 30 July rows: they were dead

| | |
|---|---|
| Rows in the table from 2026-07-30 | 2,464 |
| Whose `original_text` is still a live Hindi cue today (exact) | **261 — 10.6%** |
| …allowing for trailing punctuation differences | **324 — 13.1%** |

The teaching layer was rebuilt end to end on 2026-09-02; the July rows were computed against
a corpus that no longer exists. **87% of them point at text nothing in the course says any
more**, so they were not repairable by patching — they were discarded and rebuilt.

They were also wrong in kind, not just stale. Sampled at random: `अच्छा रहा → अच्छी रही`.
`अच्छा रहा` is impersonal ("it was nice"); there is no speaker in it to have a gender.

## Step 2 — what was actually done: one sequential read

Method, in order:

1. Pulled all 12,511 distinct Hindi cues from the live DB in seed order (seed 1 ascending).
2. Built the course's **complete Hindi word-type inventory — 986 types — and read all of it.**
   This is the closure argument: any difference between a man's and a woman's wording of the
   same sentence must show up as at least one differing word form, so a carrier that is not in
   the inventory cannot exist. Nothing is decided by a verb-ending pattern.
3. Read the whole first-person cue space grouped into **406 agreement signatures**, plus every
   subject-less fragment lego, and ruled on each construction: *does this gender-marked form
   agree with the speaker, or with something else?*
4. Applied the ruling mechanically (the m↔f orthographic swap is regular), then **read back
   every distinct change context — 57 of them do not have `मैं` immediately before the changed
   word — and every residual unresolved cue**, and corrected the four cases the first pass got
   wrong (see below).

### What counts as speaker gender here

Carried (→ needs a female wording):

- `मैं` + agreeing verb: `चाहता/सकता/रहा/था/जानता/करता/बोलता/रहता/लेता/होता/कहता/पाता/रखता`
- `मैं` + perfective/resultative: `गया, मिला, चुका, सका, लगा, पाया, बचा, खड़ा, बैठा, थका`
- 1sg futures: `जाऊँगा, चाहूँगा, करूँगा, पाऊँगा, दौड़ूँगा, पूछूँगा, होऊँगा`
- `…वाला हूँ` (immediate future) → `…वाली हूँ`
- `मैं बड़ा होना/होकर` → `बड़ी होना/होकर`
- `मुझे अकेला छोड़ना` → `मुझे अकेली छोड़ना` (the one left alone is the speaker)

Not carried (deliberately left alone):

- **`मुझे लगता है`** — `लगता` agrees with the clause, not the speaker. 1,484 occurrences of
  `लगता` in the corpus; none of them is a carrier.
- **Ergative `मैंने` + perfective** — `मैंने कहा / किया / देखी / बनाई` agree with the *object*.
  A woman says `मैंने कहा`, not `मैंने कही`. Every `मैंने` clause was excluded.
- Third/second-person subjects: `आप चाहते हैं`, `वह चाहती है`, `जो वहाँ बैठा है`, `कुत्ता भीगा हुआ है`.
- Attributive adjectives on objects: `अच्छी अंग्रेज़ी`, `बड़ा गिलास`, `छोटा चर्च`, `जंगल से गुज़रने वाला रास्ता`.
- Impersonals: `बोलना उपयोगी रहता है`, `कैसा लगता है`, `क्या होने वाला है`, `अच्छा रहा`.

### The four false positives caught in the read-back

| Cue | First pass produced | Correct |
|---|---|---|
| `मैं जंगल से गुज़रने वाला रास्ता चाहता हूँ।` | `…गुज़रने **वाली** रास्ता…` | `वाला` — it modifies `रास्ता` |
| `…मैं अपना सिर ऊपर-नीचे करता हूँ तो सबसे ज़्यादा दर्द होता है।` | `दर्द **होती** है` | `होता` — `दर्द` is the subject |
| `यहाँ बड़ा होना कैसा लगता है?` | `बड़ी होना` | `बड़ा` — generic, no speaker |
| `मैं थोड़ा थका हुआ हूँ।` | `थोड़ा थकी **हुआ**` | `थोड़ी थकी हुई` — the whole phrase agrees |

### Judgement calls, stated

- **`थोड़ा थका हुआ` → `थोड़ी थकी हुई`.** The intensifier is inflected with the adjective.
  Some speakers leave `थोड़ा` invariant; the agreeing form is what a careful recordist reads.
- **`मुझे अकेला छोड़ना` → `मुझे अकेली छोड़ना` (10 cues).** The frozen idiom is widely said with
  `अकेला` by everyone; the agreeing form is `अकेली`. Flagged for a native check before recording.
- **`हम` (we) cues were left alone.** `हम चाहते हैं` is masculine-plural by default for any
  mixed group, so it is not the *speaker's* gender being marked and a female take would assert
  something the sentence does not say. No `हम` cue is in the set.
- **Nine cues already ship a feminine 1sg future** (`मैं उससे पूछूँगी…`) alongside masculine
  siblings (`मैं उससे पूछूँगा…`). Both are in the set as separate cues with correct pairs; worth
  a content look at why that one frame is inconsistent, but it is not an audio problem.

## Step 3 — the write

**This was a REBUILD, and it was destructive to the July rows — deliberately.**

- Deleted: 2,464 rows (`course_code='eng_for_hin' AND text_side='known'`).
- Inserted: 2,564 rows, in one transaction, same shape and convention as before
  (`original_text == expanded_m`, `expanded_f` = the female-speaker wording).
- Verification after the write: 2,564 rows, 2,564 distinct originals, **2,564 of 2,564 match a
  live Hindi cue in the course today (100%)**, 0 rows where `expanded_f == expanded_m`.

`gender-prep-coordinator.cjs` was **not** run. As it stands today it only ever writes
`text_side: 'target'` (line 455) and it deletes every row for the course first — running it
would have wiped the known side and replaced it with English target-side rows. The rebuild was
written directly to the same table with the same unique constraint
`(course_code, original_text, text_side)`.

The full 2,464-row prior state is preserved at
`docs/course-optimization/eng_for_hin-gender-expansions-backup-2026-07-30.json` — nothing was
lost.

## Deliberately not touched

- **No audio generated.** Which cue gets a male take and which a female take is an
  audio-generation decision; this job only supplies the two wordings.
- **No seed, lego or phrase text changed.** The Hindi in the course is exactly as it was.
- **No English touched**, and no contact with the target-side his/her work or the 22-seed
  male-reading ruling.
- **No playback code.** No new mechanism.

## Artefacts

- Pairs, human-readable: `docs/course-optimization/eng_for_hin-known-side-gender-pairs-2026-09-03.json`
- Prior state: `docs/course-optimization/eng_for_hin-gender-expansions-backup-2026-07-30.json`
- Reproducible generator: `tools/course-optimization/hin-known-side-gender-rebuild.cjs`
