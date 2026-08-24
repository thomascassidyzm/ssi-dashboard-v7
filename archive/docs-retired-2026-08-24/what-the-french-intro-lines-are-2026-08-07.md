# What the French intro lines actually are

**7 August 2026. You said "I don't know what these are, and I don't know why they would exist."
Here is the answer. Short version: you already killed this feature yourself on 6 August — but the
switch-off never reached the real app, so learners are still hearing them right now. That is worth
your attention. The repair you were asked to approve is still the wrong thing.**

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

**Yes — on the real app, right now.** This is the one thing in this document that surprised me, and
I checked it against the live site rather than the code.

From 4 August the app started playing them, and that is what you heard and complained about: every
long phrase suddenly announcing each of its parts one by one before it got going. On the evening of
6 August you ruled on it in one sentence: *"Components do NOT get introduced."* That switch-off was
built and it works — **but it was only ever put onto the test versions of the app. It was never
promoted to the live one.** I asked the real site for the opening of the French course this morning
and it still hands back *"The French for: 'I', is:"* and *"The French for: 'want', is:"* as
separate spoken announcements before the first phrase, with real audio attached — the exact clips
from that 3 August batch.

So: on the test versions, silent since 6 August. On the app real learners use, still playing.

## What would change if they all vanished

Once the switch-off reaches the live app, nothing a learner could notice — nothing would play them.
The phrases they were attached to would quietly forget about them on their own: no crash, no error,
nothing left dangling. About 918 small sound files would sit unused on the storage account. Twenty-two
of them are also doing a second job as ordinary whole-word introductions, and those would leave real
gaps — so "delete them all" is not as clean as it sounds. Nobody is proposing to delete anything and
nothing has been deleted.

## What I think

**The item you were asked to approve was wrong, and you were right not to recognise it.** It said
918 introductions "point at nothing" and get silently skipped. In fact 913 of the 918 are correctly
attached — they're just attached to a phrase-piece rather than to a whole phrase, which is exactly
how they were designed. The check that raised the alarm looked in the wrong place. And the thing it
wanted to "repair" is the feature you deliberately switched off on 6 August, so repairing it would
have meant *reconnecting* the very announcements you asked to be rid of. That item should be closed.

**But there is one real thing here, and it isn't the repair.** The switch-off you ordered on 6 August
is sitting on the test versions and has never gone live. Learners on the real app are still hearing
the piece-by-piece announcements today, three days after you said stop. Nothing needs building — the
fix exists and is proven; it just needs promoting to the live app. That is a release decision, and
it's yours.

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
`course_audio.lego_id`. `linkComponentPresentationAudio`, `phase8-audio-v13.cjs:1605`.

**Caveat — 22 of the 918 do double duty as LEGO introductions.** They are referenced by
`course_legos.presentation_audio_id` (and by `lego_introductions.presentation_audio_id`), because
their bare text (`The French for: 'X', is:`) is also a valid **Frame A** LEGO intro — the
seed-clause-stripped form rendered by `services/phases/presentation-author.cjs:107-118`. Those 22
play as normal whole-word introductions on every path, today, correctly. They are the reason a
blanket delete of "the 918" would not be lossless.

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

**…but that fix is NOT on `main`, and `main` is production** (`saysomethingin.app`, per
ssi-learning-app `CLAUDE.md:18`). `git merge-base --is-ancestor 07b796ae origin/main` → false;
→ true for `origin/staging`. `origin/main:api/courses/[code]/cycles.ts` still contains 3 references
to `buildComponentIntroCycles`, and `origin/main`'s `backendCyclesToRounds.ts` still contains 4
references to `component_intro` — so the client backstop is absent too.

**Verified live against production, 2026-08-07:**

```
GET https://saysomethingin.app/api/courses/fra_for_eng/cycles?from=S0001L01&limit=8
  intro           S0001L01_intro
  component_intro S0001L01_component_intro_1     <-- known "I" / target "je"
  component_intro S0001L01_component_intro_2
  debut           S0001L01_debut
  build           S0001L01_build_1
  intro           S0001L02_intro
  debut           S0001L02_debut
```

The first `component_intro` carries `audio.presentation_id =
0dde4943-9260-4214-aa13-32a1d34d4742`, which is `text = "The French for: 'I', is:"`,
`role = presentation`, `lego_id = NULL`, `created_at = 2026-08-03 17:09:15Z` — i.e. **one of the
918, served to production learners today, with audio attached.**

The 2026-08-06 doc's "Verified live" section was checked on **dev**, which was correct at the time
and remains correct. Promotion to `main` simply never happened. Also worth noting: the two
`component_intro` rows for French seed 1 exist because of the four component rows added at 18:01Z on
2026-08-06 — the ones that doc recommended keeping as visual tiles. Keeping them is still right;
they are only audible because the emitter is still live in production.

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
would null 913 bindings automatically; no cascade, no crash.
`lego_introductions_presentation_audio_id_fkey` is also `ON DELETE SET NULL`. S3 objects would be
orphaned — no reaper runs.

Learner impact is **not** nil, on two counts: (a) production still emits `component_intro`, so today
a delete would turn 896 announcements into silent skips rather than removing them; (b) the 22
double-duty rows are live LEGO introductions on every path and would leave real gaps. A delete is
only clean *after* the emitter fix reaches `main`, and even then it must exclude those 22. Nothing
is being proposed — this is the thought experiment the brief asked for.

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
  same pattern estate-wide — and since the production gap is in shared code, **every one of the 96
  courses is still emitting component intros to live learners**, not just French. Unverified per
  course; French is proven above.
- **Why `07b796ae` never reached `main`** is not established. `origin/main` is at `283e81ab`
  (2026-08-07, a cherry-picked hotfix), and `origin/main..origin/staging` is ~20 commits of unrelated
  work, so this looks like an ordinary un-run promotion train rather than a deliberate hold. I did
  not confirm that, and I did not check the Vercel deployment SHA — the live API response above is
  the stronger evidence and it is unambiguous.
- **`intro_audio_missing` telemetry** (`player_events`, emitting since 2026-08-04) would give the
  real per-learner rate. Not queried.

*Read-only investigation. No database writes, no repairs, no deletions.*
