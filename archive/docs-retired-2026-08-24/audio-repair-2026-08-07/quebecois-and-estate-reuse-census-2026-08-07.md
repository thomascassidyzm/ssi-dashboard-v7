# Quebecois + estate reuse census for fra_for_eng rounds 1-10

Read-only data probe. No audio generated, no rows written, no course content changed. DB via `.env.psql` / `~/.local/pg17/bin/psql`. Text matching uses the generated column `course_audio.text_stripped` (lowercased, punctuation-stripped) throughout — chosen over `audioKeyCandidates()`/`text_normalized` because it is a single column that already resolves both incompatible normalisation conventions described in `services/shared/text-normalize.cjs`, and every query below states it explicitly.

Reuse key (Tom's, verbatim): **SAME voice x SAME text x SAME language.** All six queries below check the voice_id match explicitly — an overlapping text with a different voice is not reuse, it's a voice regression.

**Correction to the brief's "already established" voice_config for `fra_ca_for_eng`**: it is NOT entirely Azure. `presentation` role is split `xai_gfzdpspr5fdp` (1,671 rows) / `azure_en-GB-SoniaNeural` (1,386 rows), and `known` role carries 20 distinct voice_ids across xai, azure, and bare legacy ids (table in §6). Only `target1`/`target2` are Azure-dominant as stated (with legacy bare-id minorities). Reported as data, not asserted as intentional design.

---

## Bottom lines

1. **Presentation reuse: zero.** 762 presentation texts overlap between the two courses, but 0 of 789 overlapping (text, voice) pairs share a voice_id — `fra_for_eng` presentation is 100% `xai_eve`/`eve`, `fra_ca_for_eng` presentation is split `xai_gfzdpspr5fdp`/`azure_en-GB-SoniaNeural`. No voice in common on this role at all.
2. **Known (English) reuse: zero.** 8,054 known texts overlap, 0 of 8,132 overlapping pairs share a voice_id — `fra_for_eng` known is exclusively `xai_eve`/`eve`; `fra_ca_for_eng` known never uses eve under any prefix.
3. **French target1/target2 reuse: zero, and it's not even close.** Both sides mostly store the *same* language value `fra` (not `fr-CA` vs `fr` as the brief hypothesised — `fra_ca_for_eng` uses `fra` for 99.8% of target1/target2 rows), but the voice sets are entirely disjoint: `fra_ca_for_eng` is Sylvie/Antoine/Jean/Thierry (Azure fr-CA); `fra_for_eng` is eve/leo/ara (xai). 0 of 14,466 overlapping (role, text) pairs share a voice_id.
4. **Estate-wide English reuse for `xai_eve` (the live voice)**: 3,625 of `fra_for_eng`'s 17,075 distinct known+presentation English texts (7,049 rows) already exist elsewhere in the estate on `xai_eve` — real same-voice donor candidates, concentrated in `spa_for_eng` (2,687), `kor_for_eng` (1,864), `jpn_for_eng` (1,787), `deu_at_for_eng` (367), `deu_for_eng` (280), `ita_for_eng` (36). Bare `eve` (legacy id, same voice, different prefix convention) adds 2,317 more texts, almost all from `deu_for_eng` (2,311) — worth including if the reuse tool treats `eve`==`xai_eve` as the same voice identity, which needs a taste call, not an assumption (see gap below). `xai_gfzdpspr5fdp`/`gfzdpspr5fdp` and Azure hits are irrelevant to `fra_for_eng` since it doesn't use those voices — reported for completeness only, not as reuse candidates.
5. **French target reuse elsewhere in the estate: negligible.** Only 70 of `fra_for_eng`'s 15,129 distinct target texts appear anywhere else on `xai_eve`/`xai_leo` (spa_for_eng 22, jpn_for_eng 18, kor_for_eng 18, deu_at_for_eng 5, fra_for_jpn 4, deu_for_eng 3) — these are short/common French strings, not a meaningful reuse source.
6. **Voice-ID duality**: both courses carry the bare/prefixed split. `fra_for_eng` known: 14,418 `xai_eve` + 147 `eve`(eng) + 114 `eve`(en-GB) = 14,679 rows across 3 id/lang variants of one voice. `fra_ca_for_eng` known is far more fragmented: 20 distinct (voice_id, language) combinations across xai/azure/bare-legacy ids (full table in §6) — a symptom of multiple TTS-provider migrations on that course, not of `fra_for_eng`.

**Net for the reuse-first regeneration plan: `fra_ca_for_eng` supplies zero usable clips for `fra_for_eng` rounds 1-10 under the SAME-voice rule, on any role.** The only real reuse pool for `fra_for_eng`'s known/presentation English is other `xai_eve` courses already in the estate (bottom line 4), not Quebecois French.

---

## 1. Quebecois presentation overlap

```sql
select course_code, role, voice_id, count(*)
from course_audio where course_code='fra_ca_for_eng' and role='presentation'
group by 1,2,3;
-- xai_gfzdpspr5fdp: 1671 | azure_en-GB-SoniaNeural: 1386

select course_code, role, voice_id, count(*)
from course_audio where course_code='fra_for_eng' and role='presentation'
group by 1,2,3;
-- xai_eve: 2418 | eve: 5

with ca as (select distinct text_stripped, voice_id from course_audio where course_code='fra_ca_for_eng' and role='presentation'),
     en as (select distinct text_stripped, voice_id from course_audio where course_code='fra_for_eng'    and role='presentation')
select count(distinct ca.text_stripped) as overlapping_texts,
       count(*) filter (where ca.voice_id = en.voice_id) as same_voice_rows,
       count(*) as total_pair_rows
from ca join en using (text_stripped);
```

| overlapping_texts | same_voice_rows | total_pair_rows |
|---|---|---|
| 762 | **0** | 789 |

**fra_ca_for_eng presentation voices: `xai_gfzdpspr5fdp` (1,671), `azure_en-GB-SoniaNeural` (1,386). fra_for_eng presentation voices: `xai_eve` (2,418), `eve` (5). No voice appears on both sides.** Zero reusable clips, because the two courses never used the same presentation voice at any point.

---

## 2. Known (English) overlap

```sql
select voice_id, language, count(*) from course_audio where course_code='fra_ca_for_eng' and role='known' group by 1,2 order by 3 desc;
select voice_id, language, count(*) from course_audio where course_code='fra_for_eng'    and role='known' group by 1,2 order by 3 desc;

with ca as (select distinct text_stripped, voice_id from course_audio where course_code='fra_ca_for_eng' and role='known'),
     en as (select distinct text_stripped, voice_id from course_audio where course_code='fra_for_eng'    and role='known')
select count(distinct ca.text_stripped) as overlapping_texts,
       count(*) filter (where ca.voice_id = en.voice_id) as same_voice_rows,
       count(*) as total_pair_rows
from ca join en using (text_stripped);
```

`fra_ca_for_eng` known: 20 distinct (voice_id, language) pairs (full breakdown §6), none of which is `eve` or `xai_eve`. `fra_for_eng` known: `xai_eve` (14,418), `eve`/eng (147), `eve`/en-GB (114).

| overlapping_texts | same_voice_rows | total_pair_rows |
|---|---|---|
| 8,054 | **0** | 8,132 |

Zero — `fra_ca_for_eng` has never recorded English known audio in the eve voice.

---

## 3. French target1/target2 overlap

```sql
select role, voice_id, language, count(*) from course_audio where course_code='fra_ca_for_eng' and role in ('target1','target2') group by 1,2,3 order by 1,4 desc;
select role, voice_id, language, count(*) from course_audio where course_code='fra_for_eng'    and role in ('target1','target2') group by 1,2,3 order by 1,4 desc;

with ca as (select distinct role, text_stripped, voice_id, language from course_audio where course_code='fra_ca_for_eng' and role in ('target1','target2')),
     en as (select distinct role, text_stripped, voice_id, language from course_audio where course_code='fra_for_eng'    and role in ('target1','target2'))
select count(distinct ca.text_stripped) as overlapping_texts,
       count(*) filter (where ca.voice_id = en.voice_id and ca.role = en.role) as same_voice_same_role_rows,
       count(*) as total_pair_rows
from ca join en using (role, text_stripped);
```

`fra_ca_for_eng` target1: `azure_fr-CA-SylvieNeural`(18,002 `fra`) + `fr-CA-SylvieNeural`(515) + `fr-CA-JeanNeural`(237) + `fr-CA-AntoineNeural`(125) + `fr-CA-ThierryNeural`(50) + azure-prefixed minorities + 10 rows on language `fr`. target2: `azure_fr-CA-AntoineNeural`(18,004 `fra`) + `fr-CA-AntoineNeural`(391).

`fra_for_eng` target1: `eve`(12,949 `fra`) + `xai_eve`(1,938) + `eve`/`fr`(122) + `ara`(67+46) + other minor pod voices. target2: `xai_leo`(14,539, exclusively).

**Language values: both sides overwhelmingly store `fra` (not `fr` vs `fr-CA` as hypothesised) — the language column does not distinguish France French from Quebec French; only voice_id does.**

| overlapping_texts | same_voice_same_role_rows | total_pair_rows |
|---|---|---|
| 7,338 | **0** | 14,466 |

Zero — the voice sets (Azure fr-CA Sylvie/Antoine/Jean/Thierry vs xai eve/leo/ara) are completely disjoint; no French target clip is reusable across the boundary.

---

## 4. Estate-wide English reuse for fra_for_eng known+presentation

17,075 distinct English texts (`fra_for_eng`, role in known/presentation).

```sql
create temporary table fra_eng_texts as
select distinct text_stripped from course_audio
where course_code='fra_for_eng' and role in ('known','presentation');

select count(distinct ca.text_stripped), count(*)
from course_audio ca join fra_eng_texts f using (text_stripped)
where ca.course_code <> 'fra_for_eng' and ca.voice_id = '<voice>';
-- repeated per voice bucket; per-course breakdown adds "group by ca.course_code order by texts desc limit 10"
```

| voice bucket | texts found elsewhere | rows |
|---|---|---|
| `xai_eve` | 3,625 | 7,049 |
| `eve` (bare, legacy id) | 2,317 | 2,325 |
| `xai_gfzdpspr5fdp` | 4,836 | 10,787 |
| `gfzdpspr5fdp` (bare) | 4,718 | 45,026 |
| any Azure voice (`ilike '%azure%'` or `~ '^[a-z]{2}-[A-Z]{2}-'`) | 9,570 | 116,733 |

Top-10 source courses, `xai_eve` bucket (the live voice — genuine reuse candidates):

| course_code | texts | rows |
|---|---|---|
| spa_for_eng | 2,687 | 2,703 |
| kor_for_eng | 1,864 | 1,873 |
| jpn_for_eng | 1,787 | 1,788 |
| deu_at_for_eng | 367 | 367 |
| deu_for_eng | 280 | 280 |
| ita_for_eng | 36 | 36 |
| eng_for_spa | 1 | 1 |
| eng_for_ita | 1 | 1 |

Top-10, bare `eve` bucket:

| course_code | texts | rows |
|---|---|---|
| deu_for_eng | 2,311 | 2,315 |
| spa_for_eng | 7 | 7 |
| eng_for_deu / eng_for_fra / eng_for_por | 1 each | 1 each |

`xai_gfzdpspr5fdp`/`gfzdpspr5fdp`/Azure buckets are voices `fra_for_eng` never uses — listed for completeness only; not reuse candidates for this course. Their own top-10 tables are in the raw query log if needed.

---

## 5. French target reuse elsewhere in the estate

15,129 distinct French target texts (`fra_for_eng`, role in target1/target2), checked against `xai_eve`/`xai_leo` anywhere else in the estate (role not restricted — a French string could turn up as e.g. `fra_for_jpn`'s target text too):

```sql
create temporary table fra_target_texts as
select distinct text_stripped from course_audio
where course_code='fra_for_eng' and role in ('target1','target2');

select ca.course_code, ca.voice_id, count(distinct ca.text_stripped) as texts, count(*) as rows
from course_audio ca join fra_target_texts f using (text_stripped)
where ca.course_code <> 'fra_for_eng' and ca.voice_id in ('xai_eve','xai_leo')
group by 1,2 order by texts desc;
```

| course_code | voice_id | texts | rows |
|---|---|---|---|
| spa_for_eng | xai_eve | 22 | 22 |
| jpn_for_eng | xai_eve | 18 | 18 |
| kor_for_eng | xai_eve | 18 | 18 |
| deu_at_for_eng | xai_eve | 5 | 5 |
| fra_for_jpn | xai_eve | 4 | 4 |
| deu_for_eng | xai_eve | 2 | 2 |
| deu_for_eng | xai_leo | 1 | 1 |

70 texts total — short/common strings coincidentally shared across courses, not a meaningful reuse source.

---

## 6. Voice-ID duality — full breakdown

```sql
select course_code, role, voice_id, language, count(*) as rows
from course_audio where course_code in ('fra_for_eng','fra_ca_for_eng')
group by 1,2,3,4 order by 1,2,5 desc;
```

**fra_for_eng** (37 rows total across roles; known+target+presentation shown, full set in query output):

| role | voice_id | language | rows |
|---|---|---|---|
| known | xai_eve | eng | 14,418 |
| known | eve | eng | 147 |
| known | eve | en-GB | 114 |
| presentation | xai_eve | eng | 2,418 |
| presentation | eve | eng | 5 |
| target1 | eve | fra | 12,949 |
| target1 | xai_eve | fra | 1,938 |
| target1 | eve | fr | 122 |
| target1 | ara / 0p0rt7o1 / 69smp8rm / hbxkrnwm / xai_ara | fra/fr | 46+56+16+8+9+5+1 (pod/minor voices) |
| target2 | xai_leo | fra | 14,539 |

**fra_ca_for_eng** (known role alone has 20 distinct voice_id/language combinations — the fragmentation is on this course, not fra_for_eng):

| role | voice_id | language | rows |
|---|---|---|---|
| known | xai_gfzdpspr5fdp | eng | 8,686 |
| known | azure_en-GB-SoniaNeural | eng | 6,880 |
| known | gfzdpspr5fdp | eng | 2,004 |
| known | bedd6226 | eng | 153 |
| known | en-GB-SoniaNeural | eng | 149 |
| known | leo | eng | 130 |
| known | en-GB-LibbyNeural | eng | 49 |
| known | en-GB-HollieNeural | eng | 31 |
| known | en-GB-RyanNeural | eng | 20 |
| known | xai_leo | eng | 18 |
| known | xai_bedd6226 | eng | 15 |
| known | en-GB-AlfieNeural | eng | 14 |
| known | en-GB-ThomasNeural | eng | 13 |
| known | f15c6a6a | eng | 7 |
| known | azure_en-GB-RyanNeural | eng | 5 |
| known | en-GB-MaisieNeural / azure_en-GB-LibbyNeural / azure_en-GB-HollieNeural | eng | 3 each |
| known | azure_en-GB-ThomasNeural | eng | 2 |
| known | azure_en-GB-AlfieNeural | eng | 1 |
| presentation | xai_gfzdpspr5fdp | eng | 1,671 |
| presentation | azure_en-GB-SoniaNeural | eng | 1,386 |
| target1 | azure_fr-CA-SylvieNeural | fra | 18,002 |
| target1 | fr-CA-SylvieNeural | fra | 515 |
| target1 | fr-CA-JeanNeural | fra | 237 |
| target1 | fr-CA-AntoineNeural | fra | 125 |
| target1 | fr-CA-ThierryNeural | fra | 50 |
| target1 | azure_fr-CA-JeanNeural | fra | 28 |
| target1 | azure_fr-CA-AntoineNeural | fra | 12 |
| target1 | azure_fr-CA-ThierryNeural | fra | 6 |
| target1 | fr-CA-ThierryNeural / fr-CA-SylvieNeural / fr-CA-AntoineNeural | fr | 6+3+1 |
| target2 | azure_fr-CA-AntoineNeural | fra | 18,004 |
| target2 | fr-CA-AntoineNeural | fra | 391 |

Full CSV (91 rows, all roles both courses): produced by the query above, not attached — reproduce with the SQL if needed for tooling.

---

## Explicit gaps

- **`eve` vs `xai_eve` identity**: I report bare `eve` and prefixed `xai_eve` as separate counts throughout, per the brief's instruction not to assert they're the same voice. If the reuse tool needs a single "is this the eve voice" predicate, that equivalence is Tom's call, not derivable from this data.
- **Query 5 is not role-scoped** (any role, not just target1/target2, on the donor side) — the 70-text finding could include e.g. a `known`-role English course whose text happens to be a French word (unlikely at these volumes but not excluded). Flagged rather than silently assumed clean.
- **No statement_timeout issues encountered** — every query above ran to completion at `statement_timeout='180s'`; the brief's warned-about timeout did not reproduce for these predicates (all filtered by indexed `course_code` first).
