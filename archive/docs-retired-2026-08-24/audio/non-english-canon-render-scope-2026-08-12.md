# Non-English pod-0: what can actually be rendered, per language — 2026-08-12

**Analysis only.** No audio rendered, nothing written to the database, nothing triggered on
popty.app. Every number below is followed by the query that produced it.

Scope: Tom's ruling of 2026-08-12 — French and German are believed already done on the new
mastering engine (confirm or refute); every other non-English language gets its existing pod-0
clips quality-checked first, and only Aran's new canon lines get rendered, only where the base pod
passes the gate.

**The three headlines, up front.**

1. **The true count of new canon lines is 89.** "91" is a real number too — it is the size of the
   appendix Aran added to his file (scenes 15-22 = 91 numbered lines), of which 11 are text the old
   canon already had. §1.
2. **Only 4 pods in the entire fleet can be rendered today: 330 clips.** cym_n 83, cym_s 89,
   deu_at 79, spa 79. Every other language's new canon lines have **no target text at all** — that
   is a translation debt of **3,471 lines across 39 courses**, not a render job. §3.
3. **fra and deu are NOT done. Verdict: PARTIALLY DONE, and pod-0 specifically is NOT DONE at
   all.** All 142 target clips on `fra_for_eng:pod-0` and all 142 on `deu_for_eng:pod-0` predate the
   2026-08-05 mastering fix. Course-side, fra still holds 6,030 pre-fix clips and deu 4,426. §4.

And the number that frames the whole quality gate: **10,850 of 11,027 non-English pod-0 target
clips (98.4%) were rendered before the destructive tail-repair path was deleted on 2026-08-05.**
§5.

---

## 1. The canon line count — 89, and where 91 comes from

Aran's canonical pod-0 is **231 lines across 22 scenes**, in `canonical_pod_scenarios`
(`pod_slug='pod-0'`), seeded from `docs/pods/pod0-english-canonical.md`.

```sql
select pod_slug, count(*), min(global_order), max(global_order)
from canonical_pod_scenarios group by 1 order by 1;
-- pod-0 | 231 | 1 | 231     pod-0.5 | 27 | 1 | 27     pod-1 | 236 | 1 | 236
```

Reconciled against the pre-rebuild canon snapshot committed with the rebuild
(`docs/pods/pod0-live-snapshot-2026-08-06.json`, 142 rows), by exact normalised text match
(NFKC, case-folded, punctuation stripped):

| measure | count |
|---|---|
| canon lines total | 231 |
| old canon lines consumed by the new canon, exactly once each | 142 |
| **genuinely new TEXT** | **89** |
| new by ROW POSITION — `(scene, sentence)` pairs that did not exist before | 90 |
| lines in Aran's appendix block, scenes 15-22 of his own file | **91** |
| lines in the "Extra phrases" scenes 15-21 only | 80 |

New lines by scene: scene 2 +3, scene 3 +7, scene 15 +10, scenes 16-20 +11 each, scene 21 +14.
Zero old lines left unconsumed.

**The 89 / 90 / 91 divergence, resolved:**

- **89** is the count Tom's plan needs: lines whose English text does not appear anywhere in the
  old canon, so no existing translation or clip can be carried forward for them.
- **91** is the size of the block Aran appended to his own text file. `grep -E "^SCENE"
  docs/pods/pod0-aran-original-2026-08-06.txt` shows scenes 15-21 as "Extra phrases" and scene 22 as
  "First conversation"; `awk 'NR>=205' … | grep -cE "^[0-9]+\."` counts **91** numbered lines from
  scene 15 onward. Scene 22's 11 lines are the old canon's scene 15 ("First conversation") carried
  over verbatim — so 91 − 11 = 80 new appendix lines, plus the 9 new lines Aran added inside scenes
  2 and 3, = 89. **Tom's 91 counts the appendix; the docs' 89 counts new text. Both are right about
  different units, and 89 is the render-relevant one.**
- **90** is the third answer nobody has quoted, and it is a trap worth naming: matching by
  `(scene, sentence)` position instead of by text says 90, because canon scene 15 sentence 11
  ("100,000. 60. 70. 1 o'clock. 11 o'clock.") is carried text sitting at a new position. The same
  trap corrupts the per-pod counts — see the warning in §2.

## 2. Per-language translation state after tonight's rollout

The 2026-08-11 alignment (commit `23d1bf0d`, report `docs/pods/pod0-canon-align-2026-08-11/`)
changed the picture the earlier surveys (`d8e0a29e`, `a70d7b4f`) described. Those surveys said 4
pods had the new lines and 63-69 had none. **That is now out of date on presence and still correct
on translation:** all 43 `X_for_eng` courses now carry all 89 new canon lines as English rows, and
all but 4 have them with a blank target.

**Methodology warning — the join must be on text, not position.** Joining pod rows to the 89 new
canon `(scene, sentence)` pairs alone reports 11 false "new lines translated, with audio" on every
un-aligned 142-row pod, because the old pods' scene 15 is the old "First conversation":

```sql
select s.scene_number, s.sentence_number, left(s.known_text,40), left(cs.english_text,40)
from listening_pod_sentences s join listening_pods lp on lp.id=s.pod_id
join canonical_pod_scenarios cs on cs.pod_slug='pod-0'
  and cs.scene_number=s.scene_number and cs.sentence_number=s.sentence_number
where lp.course_code='ita_for_eng' and lp.slug='pod-0' and s.scene_number=15;
-- 15|1| "Would you mind if I tried to practise Ital…" | "How much is that?"   ← not the same line
```

Every count below therefore additionally requires the pod row's own English to equal canon's
English at that position. None of the 89 new lines contain the `[target language]` placeholder
(checked), so exact normalised match is safe.

```sql
with newp(sc,sn) as (values (2,3),(2,4),(2,5),(3,3),…,(21,14)),   -- the 89 pairs
canon as (select cs.scene_number sc, cs.sentence_number sn, cs.english_text
          from canonical_pod_scenarios cs join newp n
            on n.sc=cs.scene_number and n.sn=cs.sentence_number where cs.pod_slug='pod-0'),
m as (select c.target_lang, lp.course_code, lp.slug, s.target_text, s.target_audio_id,
             s.target_text_draft,
        regexp_replace(lower(s.known_text),'[^a-z0-9]','','g')
          = regexp_replace(lower(canon.english_text),'[^a-z0-9]','','g') as eng_at_canon
      from listening_pods lp join courses c on c.course_code=lp.course_code
      join listening_pod_sentences s on s.pod_id=lp.id
      join canon on canon.sc=s.scene_number and canon.sn=s.sentence_number
      where lp.slug like 'pod-0%' and c.target_lang <> 'eng')
select target_lang, count(distinct course_code) courses,
  count(*) filter (where eng_at_canon) canon_new_rows,
  count(*) filter (where eng_at_canon and coalesce(btrim(target_text),'')<>'') xlated,
  count(*) filter (where eng_at_canon and coalesce(btrim(target_text),'')='') untranslated,
  count(*) filter (where eng_at_canon and coalesce(btrim(target_text),'')<>''
                     and target_audio_id is null) render_now,
  count(*) filter (where eng_at_canon and target_text_draft) draft
from m group by 1 order by 6 desc, 1;
```

### The per-language table

`render_now` = **the headline number**: new canon lines that have a real translation and no target
clip. `untranslated` = translation debt; these cannot be rendered at all. `draft` =
`target_text_draft = true`, machine-written target text nobody has proofread.

| target lang | courses with a pod-0 | new canon rows | translated | untranslated (debt) | **render now** | draft |
|---|---|---|---|---|---|---|
| cym | 2 | 178 | 178 | 0 | **172** | 89 |
| deu | 3 | 178 | 89 | 89 | **79** | 89 |
| spa | 3 | 178 | 89 | 89 | **79** | 89 |
| ara | 3 | 267 | 0 | 267 | 0 | 0 |
| fra | 3 | 178 | 0 | 178 | 0 | 0 |
| por | 2 | 178 | 0 | 178 | 0 | 0 |
| bul, cat, dan, ell, est, eus, fas, fin, gle, heb, hin, hrv, hye, isl, ita, jpn, kor, lav, lit, nep, nld, nor, pol, ron, swa, swe, tha, tur, ukr, zho | 1-2 each | 89 each | 0 | 89 each | 0 | 0 |
| **fleet total (36 languages)** | | **3,827** | **356** | **3,471** | **330** | **267** |

`courses` counts every course whose target is that language and which has a pod-0 pod, including
the seven non-English-known pods that contribute 0 canon rows — so e.g. cat shows 2 courses but
only 89 canon rows, because only `cat_for_eng` was aligned.

### Per-course detail, the only 4 pods with translated new lines

| course | pod slug | status | tier | new rows | translated | blank | draft | **render now** | already has audio |
|---|---|---|---|---|---|---|---|---|---|
| cym_n_for_eng | pod-0 | released | premium | 89 | 89 | 0 | 0 | **83** | 6 |
| cym_s_for_eng | pod-0 | released | premium | 89 | 89 | 0 | 89 | **89** | 0 |
| deu_at_for_eng | pod-0 | draft | premium | 89 | 89 | 0 | 89 | **79** | 10 |
| spa_for_eng | pod-0-unrecorded | released | premium | 89 | 89 | 0 | 89 | **79** | 10 |

The other 39 courses all read `89 new rows / 0 translated / 89 blank / 0 render now` — 6 of them on
`pod-0` in place (ara_sy, fin, fra_ca are draft courses the aligner writes live; deu_at, cym_n,
cym_s were aligned earlier), 37 on a `pod-0-unrecorded` clone.

## 3. The render count, deduped, and the translation debt kept separate

```sql
-- same CTEs as §2, restricted to rows with a translation
select course_code, slug, target_lang, count(*) rows, count(distinct btrim(target_text)) distinct_text,
  count(*) filter (where target_audio_id is null) rows_no_audio,
  count(distinct btrim(target_text)) filter (where target_audio_id is null) distinct_no_audio
from m where eng_at_canon and coalesce(btrim(target_text),'')<>'' group by 1,2,3;
```

| course | rows | distinct text | rows needing a clip | **distinct texts to render** |
|---|---|---|---|---|
| cym_n_for_eng:pod-0 | 89 | 89 | 83 | **83** |
| cym_s_for_eng:pod-0 | 89 | 89 | 89 | **89** |
| deu_at_for_eng:pod-0 | 89 | 89 | 79 | **79** |
| spa_for_eng:pod-0-unrecorded | 89 | 88 | 79 | **79** |
| **total** | 356 | | 330 | **330** |

Deduping by distinct text changes nothing: only spa has a repeated line among the 89, and both of
its copies still need a clip. **330 clips is the entire renderable new-canon job on the estate
today** — and every one of them is gate-conditional (§5).

**Translation debt — cannot be rendered, do not fold into any render count:**

- **3,471 lines**: 39 `X_for_eng` courses × 89 new canon lines, English written, target blank.
- **A further 7 pods have the new canon lines not present at all**: `cat_for_spa`, `eus_for_spa`,
  `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn` are still 142-row pods.
  Canon is English and these courses hold no English column, so canon reaches them only through a
  pivot — 623 further lines, and which pivot to use is an open decision, not a fact.
- The 17 `eng_for_X` courses are out of scope here: their target language *is* English.
- **The blank-target debt is bigger than the new-canon debt**, because alignment also blanked
  carried lines whose English had been reworded. Per clone it runs 101-137 blank rows, fleet total
  4,465 (align report §2). The 89-line scope in this document is a subset of that.

```sql
select lp.course_code, lp.slug, count(*) rows,
  count(*) filter (where coalesce(btrim(s.target_text),'')='') blank_target,
  count(*) filter (where s.target_audio_id is null) no_target_audio
from listening_pods lp join courses c on c.course_code=lp.course_code
join listening_pod_sentences s on s.pod_id=lp.id
where lp.slug like 'pod-0%' and c.target_lang<>'eng' group by 1,2 order by 1,2;
-- e.g. isl_for_eng:pod-0-unrecorded 232 rows, 137 blank; kor_for_eng 232, 102 blank
-- every live 142-row pod-0: 0 blank, 0 missing target audio
```

## 4. French and German — the honest verdict

### There is no "engine" column. The discriminator is a date.

Nothing in `course_audio` names a mastering engine. What actually separates good from suspect is
the deletion of the destructive tail-repair path:

- `services/audio-processor.cjs:491-520` — "THE TAIL-REPAIR MUTATION PATH IS DELETED. DO NOT
  REINTRODUCE IT." Tom's ruling 2026-08-05, commit `8415f2d9`. `repairTailDefect` trimmed at
  `detectTailClick`'s timestamp; the detector cannot tell a tail click from a natural mid-sentence
  pause, so it deleted every word after the pause and then left a textbook-clean decay, invisible to
  every physical probe. Measured precision by ear was 7/76 = 9%.
- `services/audio-reuse-planner.cjs:729-753` — the reuse planner's `distrustOwnBefore` implements
  exactly this as a **date**, and states why a date and not a boolean: "A row written after that
  path was deleted ships exactly as rendered and is not suspect." It also states why `created_at`
  alone is insufficient: an in-place swap bumps `audio_revision` and writes a
  `course_audio_revisions` row but deliberately leaves `created_at` alone.

**So the marker used throughout this document is: trusted ⇔ `created_at >= 2026-08-05` OR
`audio_revision > 1`.** That is the pipeline's own definition of trust, not one I invented. If a
clip was created before 2026-08-05 and never revised, it could have been through the mutation path
and nothing in the row can prove it wasn't.

### Course-wide

```sql
select course_code, count(*) rows,
 count(*) filter (where created_at>='2026-08-05') created_since_fix,
 count(*) filter (where created_at<'2026-08-05' and audio_revision>1) before_but_revised,
 count(*) filter (where created_at<'2026-08-05' and coalesce(audio_revision,1)=1) suspect
from course_audio where course_code in
 ('fra_for_eng','deu_for_eng','fra_ca_for_eng','deu_at_for_eng') group by 1;
```

| course | rows | created since fix | pre-fix but revised | **suspect** |
|---|---|---|---|---|
| fra_for_eng | 66,626 | 18,499 | 25,455 | **22,672** |
| deu_for_eng | 61,448 | 14,401 | 25,599 | **21,448** |
| fra_ca_for_eng | 61,030 | 0 | 0 | **61,030** |
| deu_at_for_eng | 27,469 | 490 | 0 | **26,979** |

Row counts include orphans, so the number that matters is what the course actually points at:

```sql
with held as (
  select course_code,'lego.target1' slot, target1_audio_id::text id from course_legos
    where course_code in ('fra_for_eng','deu_for_eng') and target1_audio_id is not null
  union all … -- all 4 audio slots on course_legos and course_practice_phrases
)
select h.course_code, h.slot, count(*) held,
  count(*) filter (where ca.created_at>='2026-08-05' or coalesce(ca.audio_revision,1)>1) trusted,
  count(*) filter (where ca.created_at<'2026-08-05' and coalesce(ca.audio_revision,1)=1) suspect,
  count(*) filter (where ca.id is null) dangling
from held h left join course_audio ca on ca.id=h.id::uuid group by 1,2;
```

| slot | fra held | fra suspect | deu held | deu suspect |
|---|---|---|---|---|
| lego.target1 | 1,653 | 11 | 1,570 | 23 |
| lego.target2 | 1,653 | 6 | 1,570 | 23 |
| lego.known | 1,653 | 122 | 1,570 | 125 |
| lego.presentation | 1,529 | 24 | 1,400 | 6 |
| phrase.target1 | 15,893 | 1,274 | 13,926 | 778 |
| phrase.target2 | 15,874 | 1,173 | 13,926 | 779 |
| phrase.known | 15,893 | 1,799 | 13,926 | 1,760 |
| phrase.presentation | 1,621 | **1,621 (100%)** | 972 | **932 (96%)** |
| **total held on a pre-fix clip** | | **6,030** | | **4,426** |
| of which target-language | | **2,464** | | **1,603** |

Zero dangling pointers in either course.

### Pod-0 specifically — not touched by the rebuild at all

```sql
select lp.course_code, lp.slug, count(*) rows,
 count(*) filter (where s.target_audio_id is not null) tgt_clips,
 count(*) filter (where ca.created_at>='2026-08-05' or coalesce(ca.audio_revision,1)>1) trusted,
 count(*) filter (where ca.created_at<'2026-08-05' and coalesce(ca.audio_revision,1)=1) suspect
from listening_pods lp join listening_pod_sentences s on s.pod_id=lp.id
left join course_audio ca on ca.id=s.target_audio_id
where lp.course_code in ('fra_for_eng','deu_for_eng','fra_ca_for_eng','deu_at_for_eng')
  and lp.slug like 'pod-0%' group by 1,2;
```

| pod | rows | target clips | trusted | suspect |
|---|---|---|---|---|
| fra_for_eng:pod-0 | 142 | 142 | 0 | **142** |
| fra_for_eng:pod-0-unrecorded | 232 | 120 | 0 | **120** |
| deu_for_eng:pod-0 | 142 | 142 | 0 | **142** |
| deu_for_eng:pod-0-unrecorded | 232 | 119 | 0 | **119** |
| fra_ca_for_eng:pod-0 | 232 | 119 | 0 | **119** |
| deu_at_for_eng:pod-0 | 231 | 100 | **100** | 0 |

The cohort dates say the same thing plainly: every `fra_for_eng:pod-0` and `deu_for_eng:pod-0`
target clip was rendered 2026-06-07 → 2026-06-19, on the June pod cast (`ara`, `eve`, `0p0rt7o1`,
`hbxkrnwm`, `69smp8rm` for fra; `41321eb41295`, `3a7889066fa2`, `458705c07139`, `ara`, `eve` for
deu). The only German pod on new-engine clips is **deu_at_for_eng**, rendered 2026-08-07/08 on
`xai_44c91d64` and `xai_e1fc5a89`.

### The 1,594 bare-lego rows pointing at Eve

Largely fixed, with a stated residue and a further one this survey found:

- `docs/audio-repair-2026-08-09/fra-known-repoint-report.md`: 1,594 stale rows found, **1,528
  repointed** onto the existing clone-voiced clip, **66 blocked** — no clone-voiced clip of that text
  exists in the course, "a render gap, not a pointer gap", left for a human-triggered Popty job.
- Current state, however, still shows Eve holding a lot of the known side:

```sql
select cpp.course_code, ca.voice_id, count(*) held_known
from course_practice_phrases cpp join course_audio ca on ca.id=cpp.known_audio_id
where cpp.course_code in ('fra_for_eng','deu_for_eng') group by 1,2 having count(*)>20;
-- fra_for_eng | xai_gfzdpspr5fdp | 14,044      fra_for_eng | xai_eve      | 1,827
-- deu_for_eng | xai_gfzdpspr5fdp | 11,748      deu_for_eng | eve          | 1,921
--                                              deu_for_eng | xai_eve      |   256
```

**Gap, stated as a gap:** whether all 1,827 fra / 2,177 deu Eve-held known rows are legitimate
(texts that genuinely have no clone-voiced clip, i.e. the 66-class render gap grown by the newer
phrase rows) or whether some are further un-repointed holders, is not resolved by row state alone —
it needs the repoint tool's own matcher run in dry-run. This is known-side English audio, so it does
not change the non-English render counts, but it does mean "the fra known-voice recast is complete"
is not a claim this document can support.

### Verdict

- **fra — PARTIALLY DONE.** The rounds rebuild landed a lot: 18,499 clips created since the fix
  plus 25,455 revised in place. Residue: **6,030 held slots still on pre-fix clips, 2,464 of them
  target-language**; **100% of the 1,621 phrase-presentation holders**; and **pod-0 is entirely
  pre-fix, 142/142**.
- **deu — PARTIALLY DONE.** 14,401 created since the fix, 25,599 revised. Residue: **4,426 held
  slots on pre-fix clips, 1,603 target-language**; 932/972 phrase-presentation holders; **pod-0
  entirely pre-fix, 142/142**. `deu_at_for_eng` is the one German pod on new-engine clips, but its
  course body is 26,979 suspect rows — the pod is done, the course is not.
- **fra_ca — NOT DONE.** 61,030 rows, zero created since the fix, zero revised.
- So Tom's belief is right in direction and wrong in extent. **The two courses were substantially
  rebuilt; neither is complete, and pod-0 — the thing this render plan is about — was not part of
  either rebuild.** Treating fra/deu pod-0 as exempt from the quality gate would exempt exactly the
  clips that are not exempt.

## 5. The quality gate: what my numbers depend on, and the join key

Worker #332 owns the canonical quality check and cohort definition. This document does not judge
audio quality and produces no verdict. What it produces is the **join key**: a factual per-pod clip
cohort inventory a gate result can be attached to.

**Full cohort map:** `docs/audio/non-english-pod0-clip-cohorts-2026-08-12.tsv` — 490 rows, one per
`(course, pod slug, voice_id, origin)`, with clip count, min/max `created_at`, veracity split and a
dangling-pointer count.

```sql
with pp as (select lp.id pod_id, lp.course_code, lp.slug, c.target_lang, c.pricing_tier
            from listening_pods lp join courses c on c.course_code=lp.course_code
            where lp.slug like 'pod-0%' and c.target_lang<>'eng'),
cl as (select pp.*, ca.id ca_id, ca.voice_id, ca.origin, ca.created_at, ca.veracity_pass
       from pp join listening_pod_sentences s on s.pod_id=pp.pod_id
       left join course_audio ca on ca.id=s.target_audio_id where s.target_audio_id is not null)
select course_code, slug, target_lang, pricing_tier, coalesce(voice_id,'(DANGLING)'),
  coalesce(origin,'-'), count(*), min(created_at)::date, max(created_at)::date,
  count(*) filter (where veracity_pass), count(*) filter (where veracity_pass is false),
  count(*) filter (where veracity_pass is null), count(*) filter (where ca_id is null)
from cl group by 1,2,3,4,5,6;
```

### The fleet-level fact the gate has to reckon with

```sql
select c.target_lang, count(*) tgt_clips,
 count(*) filter (where ca.created_at<'2026-08-05' and coalesce(ca.audio_revision,1)=1) pre_fix
from listening_pods lp join courses c on c.course_code=lp.course_code
join listening_pod_sentences s on s.pod_id=lp.id join course_audio ca on ca.id=s.target_audio_id
where lp.slug like 'pod-0%' and c.target_lang<>'eng' group by 1;
-- fleet: 11,027 target clips, 10,850 pre-fix
```

**10,850 of 11,027 (98.4%) non-English pod-0 target clips predate the mastering fix.** Only two
pods hold post-fix target clips: `deu_at_for_eng:pod-0` (100/100) and `cym_n_for_eng:pod-0`
(61 of 87, Aran's human takes). Every other language's base pod — all 33 of them — is 100% pre-fix.
That is not a prediction of failure; the mutation path's measured precision was 9%, so most clips
are probably fine. It does mean the gate cannot be skipped anywhere on the grounds of recency.

### Cohort shape, per live pod-0

Compact view (full data in the TSV). Clip counts are target-side only.

| lang | course | target clips | render window | voices | origin |
|---|---|---|---|---|---|
| cym | cym_n_for_eng | 87 | 2026-06-15 → 2026-08-10 | human_aran_cym_n, human_aran_cym_n_2 | human |
| deu | deu_at_for_eng | 100 | 2026-08-07 → 2026-08-08 | xai_44c91d64, xai_e1fc5a89 | tts |
| fra | fra_for_eng | 142 | 2026-06-07 → 2026-06-10 | ara, eve, 0p0rt7o1, hbxkrnwm, 69smp8rm, xai_ara | tts |
| deu | deu_for_eng | 142 | 2026-06-08 → 2026-06-19 | 41321eb41295, 3a7889066fa2, 458705c07139, ara, eve, 40f31906b23d, xai_ara, xai_eve | tts |
| spa | spa_for_eng | 142 | 2026-06-08 → 2026-06-19 | eve, yis75yfp, ekhwx401, ara, jupvcf34, xai_ara, xai_eve | tts |
| … | 43 further pods | | mostly 2026-05-05 → 2026-07-16 | Azure neural / xAI ids | tts |

Two structural facts the gate will need to know, both visible in the TSV:

- **The same voice is spelled two ways** across cohorts — `eve` / `xai_eve`, `ca-ES-EnricNeural` /
  `azure_ca-ES-EnricNeural`. They are one voice; the fra known-repoint tool already matches on the
  bare id for exactly this reason. Cohort counts split unless you fold the prefix.
- **`veracity_pass` is NULL on all 11,027 pod-0 target clips.** No pod clip has ever been through
  veracity checking, so there is no existing signal to reuse and no `false` to triage. The gate is
  starting from zero here.
- **Zero dangling `target_audio_id` pointers** across all non-English pod-0 pods.

### Which of my numbers are gate-conditional

| number | gate-conditional? |
|---|---|
| 89 new canon lines; 91 = Aran's appendix | No — text, not audio |
| translation debt: 3,471 lines / 39 courses, + 623 lines on 7 non-English-known pods | No |
| **330 clips renderable now (cym_n 83, cym_s 89, deu_at 79, spa 79)** | **YES — every one.** Tom's ruling renders new lines only where the base pod passes. Each of the 4 pods passes or fails as a whole, so the realisable total is one of 330 / 251 / 247 / 241 / … down to 0 depending on which pods pass |
| fra/deu partial verdicts and the pre-fix residues | No — dates and pointers, independently checkable |
| 10,850 / 11,027 pre-fix pod-0 clips | No — but it is the input the gate most needs |

The most interesting gate case is **deu_at_for_eng**: its pod-0 target clips are the only ones on
the estate rendered entirely post-fix, so it is the natural first pod to run the gate against — if
new-engine clips fail the gate, the gate is measuring something other than the mastering damage.

## 6. Gaps — stated, not filled

1. **Whether fra/deu's remaining Eve-held known rows are render gaps or un-repointed holders** is
   unresolved (§4). Needs the repoint tool's matcher in dry-run.
2. **The pivot for the 7 non-English-known pods** (canon is English; those courses hold no English
   column) is an open decision, not a fact. 623 lines.
3. **`deu_at_for_eng:pod-0`, `cym_s_for_eng:pod-0` and `spa_for_eng:pod-0-unrecorded` carry 89 draft
   rows each** — machine target text nobody has proofread. Rendering unproofread text buys audio for
   text that may change. Whether proofreading gates the render is Tom's call; it is not folded into
   the 330.
4. **The 231st/232nd parked row** (`SC15-S012`, blank both sides) exists on the aligned pods by
   design (align report §5). It is excluded from every count here and is not renderable.
5. **`veracity_pass` is null estate-wide on pod clips** — no historical quality signal exists to
   join against; #332's gate is the first.
6. **I could not fan out.** The dispatch surface refused both workers with a depth-ceiling 400
   (this conversation already sits at the maximum worker depth), so the fra/deu forensics and the
   cohort map were done in this session rather than by dedicated workers. Nothing was omitted as a
   result, but the fra/deu work is one pass rather than an independent second opinion.

---

*Sources: `canonical_pod_scenarios`, `listening_pods`, `listening_pod_sentences`, `course_audio`,
`course_legos`, `course_practice_phrases`, `courses`; commits `8415f2d9` (tail-repair deletion),
`23d1bf0d` / `a404a2a7` (canon alignment), `81765d02` (distrustOwnBefore), `753bd4e3` +
`docs/audio-repair-2026-08-09/fra-known-repoint-report.md` (the 1,594 Eve rows), `a70d7b4f` /
`d8e0a29e` (the earlier surveys this one supersedes on presence);
`docs/pods/pod0-aran-original-2026-08-06.txt`, `docs/pods/pod0-live-snapshot-2026-08-06.json`,
`services/audio-processor.cjs`, `services/audio-reuse-planner.cjs`.*
