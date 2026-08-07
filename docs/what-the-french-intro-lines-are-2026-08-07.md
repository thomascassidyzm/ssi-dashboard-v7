# What the French intro lines actually are

**7 August 2026. You said "I don't know what these are, and I don't know why they would exist."
Here is the answer. Short version: you already killed this feature yourself, yesterday-but-one, and
the 918 lines are the leftovers. Nothing needs doing.**

---

## What they are

They are the little spoken lines that introduce **the pieces inside a phrase** — not whole phrases,
but the individual words a longer phrase is built from.

Three real ones, taken straight from the live French course this morning. All three come from the
same French sentence, *"I want to speak French with you now" / "Je veux parler français avec toi
maintenant"*:

> *"The French for: 'I', is:"* — then you hear **je**, twice.

> *"The French for: 'want', is:"* — then you hear **veux**, twice.

> *"The French for: 'with', is:"* — then you hear **avec**, twice.

That's it. About two and a half seconds each. They are not the introductions you know — the ones
that say *"The French for 'thank you very much', as in 'thank you very much, but I've got more to
learn', is:"*. Those are the real ones, they introduce a whole thought, and they are fine. These 918
are the tiny sub-pieces: one for every fragment of every phrase.

## Where they came from

They were made in a single twenty-minute burst on the afternoon of Sunday 3 August — over nine
hundred of them between 4:57pm and 5:17pm, plus five stragglers on the 5th. Not spread across
months of authoring; one machine run, one afternoon. They were made because at that point the
system was building an introduction for every piece of every phrase, on the assumption that each
piece deserved its own little announcement.

## Does a learner ever hear one today?

**No. Not one, not ever again.** For two days — 4 to 6 August — the app did play them, and that is
what you heard and complained about: every long phrase suddenly announcing each of its parts one by
one before it got going. On the evening of 6 August you ruled on it in one sentence: *"Components do
NOT get introduced."* That ruling was built into the app the same night, and the code now refuses
to play one even if it's asked to. So these 918 lines have been completely silent since the day
before yesterday. The real introductions — the whole-thought ones — play exactly as they always did.

## What would change if they all vanished

Nothing a learner could notice, because nothing plays them. The phrases they were attached to would
quietly forget about them on their own — no crash, no error, nothing left dangling. The only real
change is that about 918 small sound files would be sitting unused on the storage account. To be
clear, nobody is proposing to delete anything and nothing has been deleted.

## What I think

**The item you were asked to approve was wrong, and you were right not to recognise it.** It said
918 introductions "point at nothing" and get silently skipped. In fact 913 of the 918 are correctly
attached — they're just attached to a phrase-piece rather than to a whole phrase, which is exactly
how they were designed. The check that raised the alarm looked in the wrong place. And the thing it
wanted to "repair" is a feature you deliberately switched off two days ago, so repairing it would
have been reconnecting the very announcements you asked to be rid of.

**Nothing needs doing.**

---

---

# Appendix — the evidence

*Everything below is for anyone who wants to check the above. Tom can stop reading here.*

### The population, verified live

A-87 was about `course_audio` rows with `role='presentation'` in `fra_for_eng`. Live counts,
2026-08-07:

| | count |
|---|---:|
| `presentation` rows, fra_for_eng | 2,623 |
| …with `lego_id IS NULL` | **918** ✓ exactly the figure quoted |
| …of those, linked from a component phrase row | **913** |
| …genuinely unlinked | **5** (all stamped 2026-08-05 02:56) |

The 38% in the item was computed against a stale total (2,173, the 2026-08-05 count). 918/2,623 is
35%.

### These are component introductions, and a null `lego_id` is by design

All 918 texts parse as `The French for: '<X>', is:` and **all 918** of the `<X>` values match a
`course_practice_phrases` row with `phrase_role='component'`. Zero of them duplicate an existing
linked presentation row.

Components are not LEGOs, so there is no `lego_id` for them to carry. The code says so explicitly:

- `services/phases/phase8-audio-v13.cjs:473` — `.is('lego_id', null)  // component presentations have null lego_id`
- `services/phases/phase8-audio-v13.cjs:844` — *"Component presentations have lego_id=null, so scope them by matching their 'as in — <parent>' context…"*

Component intros are bound through `course_practice_phrases.presentation_audio_id`, **not** through
`course_audio.lego_id` and **not** through `lego_introductions` (whose `lego_id` is `NOT NULL`, so a
component cannot appear there). `linkComponentPresentationAudio`, `phase8-audio-v13.cjs:1605`.

So A-87's premise — "918 pointers are broken" — is the *checking-the-wrong-unit* failure mode
already catalogued on this estate (`docs/course-optimization/zut-violation-sweep-pilot-fra-40.md`).

### Origin: one batch window

`select date_trunc('minute',created_at), count(*) … group by 1 order by 2 desc`

```
2026-08-03 17:16Z  132     2026-08-03 17:15Z   97
2026-08-03 17:11Z  124     2026-08-03 17:13Z   83
2026-08-03 17:10Z  123     2026-08-03 17:17Z   56
2026-08-03 17:09Z  116     2026-08-03 17:14Z   54
2026-08-03 17:12Z  106     2026-08-03 16:57Z    6   (+ small tail 16:57–17:08)
                           2026-08-05 02:56Z    5
```

913 of 918 fall inside 2026-08-03 16:57–17:17Z. Textbook batch-artefact clustering.

### The read path — traced in ssi-learning-app, not assumed

`api/courses/[code]/cycles.ts` is the instant-playback critical path (one RPC,
`get_course_cycles_window`). Its header comment, lines 8–14:

> *"COMPONENTS ARE NEVER INTRODUCED (Tom, 2026-08-06). … This endpoint emitted `component_intro`
> cycles between 2026-08-04 (`9e9a19bf`) and 2026-08-06; it does not any more, and must not again."*

- `cycles.ts:421` — *"Component rows never produce a cycle of any kind."*
- `cycles.ts:473` — the site where `buildComponentIntroCycles` used to insert them, now a comment.
- `cycles.componentsNeverIntroduced.test.ts:110` — *"a component with its own narration clip is
  silent, not played."*
- The player adapter `toPlayerCycle` refuses a `component_intro` as a backstop.
- Fix commit: `07b796ae`, 2026-08-06, ssi-learning-app.

LEGO introductions (the "working" set) **do** play — `cycles.ts` emits `intro → debut → BUILDs →
USEs` per LEGO, verified live in `docs/components-never-introduced-2026-08-06.md` §"Verified live".

### Prior work that already settled this

`docs/components-never-introduced-2026-08-06.md` (commit `ad968b18`) records Tom's ruling of
2026-08-06 18:45Z verbatim, the cross-repo fix, six refusal paths added to phase8, and a database
trigger `components_never_introduced` on `course_practice_phrases` that refuses new component→clip
bindings. Estate-wide scope: 84,626 component rows, 56,671 carrying a narration clip, across 96
courses. The French 918 are that estate's French slice.

That doc also explicitly declined to unlink or delete, for the same reason as here: nothing plays
them, so the mutation buys nothing and the blast radius is large.

### Deletion consequences (thought experiment only — nothing deleted)

`course_practice_phrases_presentation_audio_id_fkey … ON DELETE SET NULL`. Deleting the 918 rows
would null 913 bindings automatically; no cascade, no crash. `lego_introductions` is untouched (22
of the 918 are also referenced there via `presentation_audio_id`, itself `ON DELETE SET NULL`).
S3 objects would be orphaned — no reaper runs. Learner impact: nil, nothing emits them.

### The red herring in the brief

`services/production-api.cjs:7251` — *"Derive lego_id from seed_number + lego_index (lego_id column
may be null)"* — is about `course_practice_phrases.lego_id`, a different table and a different
column, added by `e9274c18` on 2026-02-17 for journey search. Unrelated to this.

### Explicit gaps

- **The five genuinely-unlinked rows** (`you are`, `arrangements`, `they think`, `deal with`, `a
  good idea`, all 2026-08-05 02:56Z) — I did not establish which run produced them or why they alone
  missed the binding. They are silent either way, so it does not change the answer.
- **The `course_practice_phrases.phrase_role='intro'` filter** at
  `tools/extractors/extract-learner-script.cjs:137` is a separate, unrelated thing: zero fra rows
  carry that role (`use` 9,008 / `build` 5,110 / `component` 1,780). It is not what A-87 was about.
- **German** was not examined; the brief scoped this to French. The 2026-08-06 doc indicates the
  same pattern estate-wide.

*Read-only investigation. No database writes, no repairs, no deletions.*
