# Southern Welsh pulled out of Aran's and Catrin's recording lists

**Applied to the live database 2026-08-19 (~17:15Z), by Kai's ruling after speaking to Aran.**
No audio was generated, deleted or unlinked. No course text was touched. No other language moved.

## What was wrong

The recording list is built **by language**, not by course, so Northern and Southern Welsh share one
Welsh queue. On top of that, `cym_s_for_eng` — the **Southern** course — had Aran and Catrin written
into its own cast (`voice_config.podCast` named `human_aran_cym_s` and `human_catrinlliar_cym_s`).
Between those two facts, **197 Southern pod dialogue lines were sitting in the two Northern speakers'
lists**: 66 in Aran's, 131 in Catrin's. Nothing was flagged and nothing looked broken — the list was
working exactly as built. Had they read them, Southern Welsh would quietly have been re-voiced in
Northern accents.

## What was changed — one field, one course

`courses.voice_config.podCast` for **`cym_s_for_eng` only**, emptied (23 speaker entries removed) via
the reviewed non-destructive merge in `services/voice-engine/pods-cast.cjs` (`mergePodCast`).

That returns the Southern course to the state the system already has a name for — **uncast** — which is
where Breton and Pennsylvania Dutch already sit. Uncast lines are not deleted and not silently dropped:
they are counted and shown as `uncast` on the recording coverage bar, where a human can see them and
cast them. `cym_n_for_eng` was not touched. No other course, language or recordist was touched.

## Verified live, before and after

Both queues were pulled from the live API (`/api/recording/voice/<voice>?includeRecorded=1`) before the
change and again after, and diffed line by line, along with every other recordist on the estate.

| Recordist | Lines before | Lines after | Removed | Added |
|---|---:|---:|---:|---:|
| Aran (`human_aran_cym_n`) | 191 | **125** | 66 — all `cym_s_for_eng` | 0 |
| Catrin (`human_catrinlliar_cym_n`) | 285 | **154** | 131 — all `cym_s_for_eng` | 0 |
| Tom (`human_tom_zzz`, test) | 12 | 12 | 0 | 0 |
| Test Voice F (`human_test_f_zzz`) | 13 | 13 | 0 | 0 |
| Kai (`human_kai_fin`, test) | 231 | 231 | 0 | 0 |

- **66 + 131 = 197.** Zero `cym_s_for_eng` lines remain in either Northern list.
- **The 31 "angry eyes" re-record lines survive untouched** — 21 for Aran, 10 for Catrin, all on
  `cym_n_for_eng`, the exact same line ids before and after (id-set checksums identical), same reasons,
  same flags. Aran's 71 flagged pod lines (the T-20 set) are also identical before and after.
- The only field that moved on any surviving Northern line is `alsoFills` (34 lines: 21 of Aran's,
  13 of Catrin's). Those were the Northern lines whose text is identical in the Southern course; the
  queue used to promise that one Northern take would also be filed into the Southern pods. It no longer
  does — which is the same defect, caught on the way out.
- Coverage bar: Welsh now reads **279 lines with 231 uncast** (was 476 with 0 uncast). Breton, Pennsylvania
  Dutch and the test language are byte-identical before and after.

## What Aran and Catrin see now

Aran opens his link to **125 lines** (was 191), Catrin to **154** (was 285). All Northern. The angry-eyes
re-records are still there, with their reason banner. Nothing they had already recorded changed status.

## What still has to happen before Mali and Richard can record the Southern lines

The 231 Southern lines are intact and now visibly uncast — but **they cannot be handed to Mali and
Richard today, and that needs a code change plus a decision:**

1. **The queue partitions a language's lines by gender alone** (`recordist-queue.cjs`, `buildLanguageLines`).
   A language has exactly one male and one female slot in `language_recording_policy`, so as soon as a
   Southern speaker is cast as "m", their lines land in **Aran's** list again, whoever the cast names.
   Casting Mali and Richard right now would re-create the problem. Expressing "Southern Welsh has its own
   two voices" needs either a dialect-aware partition or a policy that can hold more than one voice per
   gender per language. **That is a code change that must reach production to take effect — not made here,
   and Tom's call, not ours.**
2. Mali and Richard have no voice ids and no policy entry anywhere yet, so no recording link exists for
   them. Nothing in the database names them.
3. Left deliberately alone: the Welsh policy row still lists `human_aran_cym_s` and
   `human_catrinlliar_cym_s` as alias spellings of Aran and Catrin. Those aliases are what make their
   existing legacy takes count as already recorded; removing them would ask Aran to re-record work he has
   already given us.

## How to reverse this, in one paragraph

The whole change is one row's one column. Restore `courses.voice_config` for `cym_s_for_eng` to the
saved snapshot in `docs/cym_s_for_eng.voice_config.before-2026-08-19.json` (the complete pre-change
value — that course's `voice_config` contained nothing but `podCast`), i.e.
`UPDATE courses SET voice_config = '<that file>'::jsonb WHERE course_code = 'cym_s_for_eng';`
or the same update through the Supabase client. The 197 Southern lines reappear in Aran's and Catrin's
lists immediately on their next page load — there is no cache, no build step and no deploy involved,
and nothing else has to be undone because nothing else was changed.
