# Dialects are languages: the cast is keyed on the dialect, not the parent code

**2026-08-31.** Tom's ruling, stated as a definition rather than a preference:

> dialects are different LANGUAGES in this product — different text and different
> voices. Mexican Spanish is not a variant of `spa`, it is its own language entity
> with its own script text and its own cast voice; same for Austrian and Swiss
> German.

So a cast on `spa` reaching a Mexican course, or a cast on `deu` reaching the
Austrian and Swiss courses, is a **defect**. Not a deferred feature, and not an
inheritance to be documented — a thing that had to be restructured.

---

## What the cast was keyed on before

`services/shared/language-voice-cast.cjs` read `course.target_lang` straight, and
**`target_lang` carries the BASE tag for every regional course on the estate**:

| course | `target_lang` |
|---|---|
| `deu_at_for_eng` | `deu` |
| `spa_mx_for_eng` | `spa` |
| `cym_n_for_eng` | `cym` |
| `ara_eg_for_eng` | `ara` |

One row in `voice_language_roles` keyed `deu` therefore governed German, Austrian
German and Swiss German at once, and the Voice Lab's Languages screen offered a
single `deu` row with a single pair of slots. There was no way to say anything
different about them — including the thing Tom has already ruled for pods, where
German is Moritz + Lena and **Austrian German is Felix + Sonja**.

## What it is keyed on now

`services/shared/cast-language-key.cjs` — one small module, the only answer to
"which entity is this course cast against?", consulted by the render-path
resolver and by the Voice Lab alike, so the screen cannot offer a row nothing
reads.

The target key, in order:

1. **`courses.voice_pool_key`** — the explicit human ruling, added 2026-08-17
   (T-21) for exactly this problem on the pod casting path, where
   `tools/pod-sync.cjs` has read it ever since. `deu_at`, `spa_mx`, `por_br`, …
2. **`courses.dialect`**, when it is not `standard` — "dialect lives on the
   COURSE, not on the casting" (Tom, 2026-08-19). Key is `<base>_<dialect>`:
   `cym_north`, `gle_munster`.
3. otherwise the base language, exactly as before.

The **known side** is unchanged and keyed on `known_lang`: nothing in the data
states a known-side dialect, and inventing a key there would be inventing an
entity.

### The course code is deliberately never read

The estate's standing lesson from `spa_mx_for_eng` is *read the column, never the
course code* (`tools/pod-sync.cjs`). A code segment is not a statement: reading
it would make castable languages out of `cym_anthem_for_jpn` and
`zzz_test2_for_eng`, and would split `cym_nnew_for_eng` from `cym_n_for_eng`
although both **state** the same Northern Welsh. A regional course whose identity
is in neither column keys on its parent and is reported below as a gap — one
column write fixes it, visibly.

---

## Which dialects got their own row — 11 of them

Every one of these is now a row of its own on the Voice Lab Languages screen,
with its own slots, its own cast state, its own candidate list and its own
audition line, named from its own courses:

| entity | name on the screen | stated by | courses |
|---|---|---|---|
| `deu_at` | Austrian German | `voice_pool_key` | `deu_at_for_eng`, `deu_at_for_jpn`, `deu_at_for_zho` |
| `spa_mx` | Mexican Spanish | `voice_pool_key` | `spa_mx_for_eng`, `spa_mx_for_jpn`, `spa_mx_for_zho` |
| `por_br` | Brazilian Portuguese | `voice_pool_key` | `por_br_for_eng`, `por_br_for_jpn`, `por_br_for_zho` |
| `ara_eg` | Egyptian Arabic | `voice_pool_key` | `ara_eg_for_eng`, `ara_eg_for_jpn`, `ara_eg_for_zho` |
| `ara_sy` | Syrian Arabic | `voice_pool_key` | `ara_sy_for_eng`, `ara_sy_for_jpn`, `ara_sy_for_zho` |
| `fra_ca` | Quebec French | `voice_pool_key` | `fra_ca_for_eng` |
| `cym_north` | North Welsh | `dialect` | `cym_n_for_eng`, `cym_nnew_for_eng` |
| `cym_south` | South Welsh | `dialect` | `cym_s_for_eng` |
| `gle_connemara` | Connemara Irish | `dialect` | `gle_cn_for_eng` |
| `gle_munster` | Munster Irish | `dialect` | `gle_mu_for_eng` |
| `gle_ulster` | Ulster Irish | `dialect` | `gle_ul_for_eng` |

86 rows on the screen now, up from 75, of which 11 are dialects.

A dialect row is its own language for **who speaks it** and still the base
language for **what can speak it**: candidate voices, Cartesia coverage, the
human-voiced ruling, the pace reference and the render steer are all asked of the
base, because a provider has no notion of `deu_at`. Asking Cartesia about
`deu_at` would answer "no coverage" about a language with plenty.

## Which do NOT exist as entities yet — the gaps

Two courses are genuinely a dialect and **state it nowhere**, so they still key
on their parent. Nothing was invented for them.

| course | keys on | what it renders today | the fix |
|---|---|---|---|
| `deu_ch_for_eng` | `deu` | `de-CH-LeniNeural` / `de-CH-JanNeural` | `update courses set voice_pool_key='deu_ch' where course_code='deu_ch_for_eng'` |
| `ara_lb_for_eng` | `ara` | Lebanese Arabic course, Arabic cast | `update courses set voice_pool_key='ara_lb' where course_code='ara_lb_for_eng'` |

**Swiss German is the live one.** It is one of the two dialects Tom named, and the
verification below shows a `deu` cast taking `de-CH-LeniNeural` off it. Its
siblings `deu_at`, `ara_eg` and `ara_sy` all carry the column already; these two
were simply never filled in. One column write each and they get their own row
with no code change — but the write is a data decision, so it is Tom's, and
`tools/pod-sync.cjs` will refuse a pool key with no `pod_voice_pools` entry, so
the pod pools want checking in the same move.

Three other course codes look regional and are not, and correctly did not become
languages: `cym_anthem_for_jpn` (a content variant, not a dialect),
`sbx_for_eng` (`[SANDBOX] Guardian Test`), `zzz_test_for_eng` / `zzz_test2_for_eng`
and `eng_template`.

**Known-side dialects do not exist at all.** `courses.dialect` describes a
course's target content; the nine `*_for_cym` courses do not say which Welsh
their learner has. If a guide voice ever needs to differ by known dialect, that
is a new column, not a reading of an existing one.

---

## Verification — cast, then read what the render path picks

`voice_language_roles` held **zero** rows. Three real rows were written, the real
render-path resolver (`voice-config-service.resolveVoiceConfig` — the function
every phase8 handler calls) was asked what each course would render in, and the
rows were removed. Nothing rendered and nothing was spent.

```
-- BASELINE — nothing cast anywhere --
   deu_for_eng      target1 = ara                     (stored config, uncast)
   deu_at_for_eng   target1 = de-AT-IngridNeural      (stored config, uncast)
   deu_ch_for_eng   target1 = de-CH-LeniNeural        (stored config, uncast)
   spa_for_eng      target1 = es-ES-ElviraNeural      (stored config, uncast)
   spa_mx_for_eng   target1 = es-MX-CarlotaNeural     (stored config, uncast)

-- CAST: deu=Lena, deu_at=Sonja, spa=Clara --
   deu_for_eng      target1 = 3a7889066fa2          ← CAST on 'deu' rank0
   deu_at_for_eng   target1 = 44c91d64              ← CAST on 'deu_at' rank0
   deu_ch_for_eng   target1 = 3a7889066fa2          ← CAST on 'deu' rank0     ← THE GAP
   spa_for_eng      target1 = 458705c07139          ← CAST on 'spa' rank0
   spa_mx_for_eng   target1 = es-MX-CarlotaNeural     (stored config, uncast)  ← the fix

-- RESTORED — nothing cast anywhere --   (identical to BASELINE, 0 rows)
```

Read it as three facts:

- **the defect is gone** — a cast on `spa` no longer reaches the Mexican course,
  and a cast on `deu` no longer reaches the Austrian one;
- **the row is not decorative** — a cast on `deu_at` reaches `deu_at_for_eng` and
  only it, through the real resolver;
- **Swiss German still leaks**, exactly as predicted by the gap table, and the
  leak would replace a real `de-CH` voice with a standard German one.

The screen was verified against the live database in the same read-only pass:
11 dialect rows with their own names, statuses and candidate lists, and each one
auditions on a line from **its own** courses — `deu_at` picks
*"i wü's heit so fest versuchen, wia i kann"*, which no standard German course
contains.

Tests: `services/shared/cast-language-key.test.cjs` (14) and six new cases in
`services/shared/language-voice-cast.test.cjs`, including the two entities
holding opposite casts at the same time, and the invariant that a course stating
nothing regional resolves exactly as it did before. 118 pass across the shared
and voicelab suites.

## What did not change

- Courses that state nothing regional — the large majority — key on their base
  language and resolve byte-for-byte as before.
- The empty-table invariant survives: with no cast rows anywhere, resolution is
  the stored config, unchanged.
- The three-leg precedence (course override > language cast > stored config), the
  guide slot, the provider ladder and `clip-identity` canonicalisation are all
  untouched.
- `voice_language_roles` keeps its shape; only its column comment now says what a
  value means.

---

## Addendum — the human-voice guard, landed the same day

`feat(voicelab): a cast cannot speak over a human recording` (`4a112ac4f`) landed
on `main` while this was in flight, and it keyed on `courses.target_lang` too:
`humanRecordedForLanguage` matched `c.target_lang === language`, and
`languageSpokenBy` was a hand-copied twin of the resolver's `languageForRole`.
Left alone, a `deu_at` row would have reached zero courses in the guard and the
screen would have warned about the wrong ones.

Both now defer to `cast-language-key.cjs`, which imports neither module, so the
twin is one line and the two cannot drift. One asymmetry is deliberate and
commented: the guard matches the CAST KEY when deciding which courses a cast
reaches, and the BASE language when asking whether a language is human-recorded.
Welsh is human-recorded whichever Welsh it is — reading that the other way round
would drop the guard off every Welsh dialect course at once. Both directions are
locked by tests, and the live probe shows the two features co-operating: casting
`deu_at` moves target1 and is refused on target2, which is Sasha Wanasky's human
recording.
