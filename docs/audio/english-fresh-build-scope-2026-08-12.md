# English fresh build — the render count, the scope, and the clone constraint

**12 Aug 2026. ANALYSIS ONLY.** No audio rendered, no DB writes, nothing triggered on popty.app.
Every number below is read from the live DB with the query shown next to it, so it can be re-run.

**The ruling being costed** (Tom, 2026-08-12): all English across the estate is rebuilt fresh on the
new mastering engine — not reused, not just pod-0. Voices: **Eve** (female) + **Tom's clone** (male),
both xAI. The same pair serves whichever side English is on. This replaces the 2026-08-11 shared-cast
plan, which used **Olivia** — same male, different female.

---

## The headline

| | renders | chars | cost @ $15/1M |
|---|---:|---:|---:|
| **Pod-0 English (firm)** | **1,128** | 78,073 | **$1.17** |
| **Course content English (separate figure)** | **784,266** | 23,364,880 | **$350.47** |
| **Together** | **785,394** | 23,442,953 | **$351.64** |

Those are the *cross-course-deduped* numbers — one render per distinct English sentence per voice,
shared by every course that uses it. **The tooling as it stands today cannot do that.** Course-scoped,
which is what would actually be charged if nothing changes:

| | renders | cost | multiplier |
|---|---:|---:|---:|
| Pod-0 English, course-scoped | 13,472 | $9.94 | **11.9×** |
| Course content English, course-scoped | 1,388,244 | $559.48 | **1.77×** |
| Together | 1,401,716 | $569.42 | 1.78× |

The pod-0 multiplier is the finding commit `2e970c7b` already flagged and this run confirms
independently: `course_audio`'s unique key is `(course_code, text_normalized, language, role,
voice_id)`, so "Good morning" on 106 pod-0 pods is 106 separate purchases, not one. **Fixing that one
filter is worth ~$8.77 on pod-0 and ~$209 on course content, and more importantly turns 1.4M renders
into 785k — roughly halving the wall clock.**

Cost basis: **$15.00 / 1M characters**, xAI's published TTS rate, `services/phases/phase8-audio-v13.cjs`
(`POD_CHARS_TO_COST = 15.00 / 1_000_000`), citing `docs.x.ai/docs/pricing` checked 2026-07-28. The
comment on that constant records that the older $4.20/1M figure in this repo was launch press
coverage, never a billed rate, and under-estimated by 3.6×.

---

## 1. Pod-0 English — the firm number

### 1.1 Scope verified against the coordinator

The coordinator's figures reproduce exactly. Pod count has since grown 104 → **106** (the alignment
worker is still cloning `pod-0-unrecorded` pods; the same thing happened during the 2026-08-11 run,
60 → 96).

```sql
WITH pod AS (
  SELECT p.id, p.course_code, p.speakers, c.known_lang, c.target_lang
  FROM listening_pods p JOIN courses c ON c.course_code=p.course_code
  WHERE p.slug LIKE 'pod-0%'
), slot AS (
  SELECT pod.*, s.speaker, 'known'::text AS side, s.known_text AS txt, s.known_audio_id AS aid
  FROM pod JOIN listening_pod_sentences s ON s.pod_id=pod.id WHERE pod.known_lang='eng'
  UNION ALL
  SELECT pod.*, s.speaker, 'target', s.target_text, s.target_audio_id
  FROM pod JOIN listening_pod_sentences s ON s.pod_id=pod.id WHERE pod.target_lang='eng'
)
SELECT count(*) AS english_slots, count(DISTINCT lower(btrim(txt))) AS distinct_texts FROM slot;
```

| | |
|---|---:|
| pod-0 family pods (`slug LIKE 'pod-0%'`) | 106 |
| English slots (known where `known_lang='eng'` + target where `target_lang='eng'`) | **17,510** |
| Distinct lowercased/trimmed English texts | **988** |

One pod contributes its English on the *target* side: `zho_for_eng` (`known_lang=zho`,
`target_lang=eng`). It is included.

### 1.2 A render is text × voice, so: 1,128

Each slot's voice comes from `listening_pods.speakers -> <speaker>`, which carries a `gender` plus a
`known` and a `target` voice object. Under the new cast, `gender='f'` → Eve, `gender IN ('m','n')` →
clone. (`n` already resolves to the male voice in the live data — 6,018 `n` slots and 11,499 slots on
the clone confirm it.) Speaker keys that don't match directly are resolved through the `variants`
array, which recovers 372 of the 435 unmatched slots.

```sql
-- (same CTEs as above, plus:)
resolved AS (
  SELECT slot.*, COALESCE(slot.speakers -> slot.speaker,
    (SELECT v.val FROM jsonb_each(slot.speakers) v(k,val) WHERE v.val ? 'variants'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(v.val->'variants') x
                  WHERE lower(btrim(x))=lower(btrim(slot.speaker))) LIMIT 1),
    (SELECT v.val FROM jsonb_each(slot.speakers) v(k,val)
      WHERE lower(btrim(v.k))=lower(btrim(slot.speaker)) LIMIT 1)) AS spk FROM slot
), voiced AS (
  SELECT lower(btrim(txt)) AS t,
    CASE WHEN spk->>'gender'='f' THEN 'eve'
         WHEN spk->>'gender' IN ('m','n') THEN 'clone' END AS new_voice
  FROM resolved
), per_text AS (
  SELECT t, bool_or(new_voice='eve') AS needs_eve, bool_or(new_voice='clone') AS needs_clone
  FROM voiced GROUP BY t
)
SELECT count(*) AS distinct_texts,
       count(*) FILTER (WHERE needs_eve)  AS eve,
       count(*) FILTER (WHERE needs_clone) AS clone,
       count(*) FILTER (WHERE needs_eve AND needs_clone) AS both,
       (count(*) FILTER (WHERE needs_eve)) + (count(*) FILTER (WHERE needs_clone)) AS renders
FROM per_text;
```

| | count |
|---|---:|
| Distinct English texts | 988 |
| Need **Eve** | **359** |
| Need **clone** | **769** |
| Need **both** (same line, different speakers in different pods) | **146** |
| Eve only | 213 |
| Clone only | 623 |
| **Total renders** | **1,128** |

78,073 characters → **$1.17**.

### 1.3 What is already on the right voice, and what is not

```sql
SELECT 'already on planned voice', count(*) FROM voiced WHERE cur_voice = new_voice
UNION ALL SELECT 'on Olivia, must move to Eve', count(*) FROM voiced WHERE cur_voice='bedd6226'
UNION ALL SELECT 'on a human/other voice',      count(*) FROM voiced
  WHERE cur_voice NOT IN ('bedd6226','gfzdpspr5fdp','eve')
UNION ALL SELECT 'no audio pointer at all',     count(*) FROM voiced WHERE aid IS NULL;
```

| slots | state |
|---:|---|
| **11,499** | already cast on the clone — the planned male voice, unchanged by the Eve swap |
| **5,486** | on **Olivia** (`bedd6226`) — every one of these must be re-rendered on Eve |
| **462** | Welsh human recordings (Aran, Catrin) — see the flag below |
| **63** | speaker unresolvable — see the gap below |
| 5,771 | have **no audio pointer at all** today |
| 11,739 | have a pointer, behind 5,851 distinct clips |

The Olivia→Eve swap is the *only* voice change the new ruling makes to pod-0 versus the 2026-08-11
plan. It touches **5,486 slots / 359 distinct texts**. But since the ruling is *rebuild fresh, not
reuse*, all 1,128 renders happen regardless — the 11,499 clone slots get new clips off the new
mastering engine too. That is why the render count is 1,128, not 359.

---

## 2. The scope question — answered from the record, not guessed

**Does "all English across the estate" include course content?** Yes, and the estate's own documents
say so. This is documentary evidence, not my inference:

- `docs/audio/premium-first-rebuild-queue-2026-08-12.md` §2 — the non-English rebuild queue written
  tonight — states: *"144 courses cover 66 distinct non-English target languages (`target_lang='eng'`
  — the 21 reverse `eng_for_X` courses — is excluded per your ruling; **that's a separate fresh
  build**)."* English is explicitly carved out of the non-English queue *as its own build*, and that
  queue is course-content-scoped (seeds, legos, practice phrases), not pod-scoped.
- `docs/audio/non-english-canon-render-scope-2026-08-12.md` line 183 — *"The 17 `eng_for_X` courses
  are out of scope here: their target language is English."*
- The same premium-first doc establishes the rebuild doctrine that governs the English number too:
  *"`existing_clips` is legacy-engine debris, not a rebuild credit — a genuine voice-swap rebuild
  regenerates every needed clip on the new voice regardless of what already exists on the old one."*

So: **pod-0 English (§1) is the firm, immediately-actionable number. Course content English (§3) is
the separate, much larger figure.** They are reported separately below and never added into a single
headline without being labelled.

What the record does **not** settle, and I am not guessing at (§5, Gap 3): whether course content
needs **one** English voice per text or **two**. Pods have speakers, so a line's voice is determined.
Course content has no speaker — `voice_config` assigns one known voice per course. Both figures are
given.

---

## 3. Broader estate English — course content (separate figure)

### 3.1 Normalisation rule, stated

Every English text is normalised as:

```sql
lower(btrim(regexp_replace(txt, '[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+', '', 'g')))
```

This is **exactly the expression behind `course_audio.text_stripped`**, the generated column the
audio layer already uses as its identity key — so a dedupe computed this way is one the pipeline can
actually honour. Caveat recorded honestly: `text_stripped` derives from `text_normalized` (written by
the `audio_normalize_text` trigger), whereas I apply it to the raw content text. Where a trigger
normalisation differs from the raw text, a match can be missed — this makes my "already exists"
figures a **floor**, not an exact count.

English slots = `known_text` where `courses.known_lang='eng'`, plus `target_text` where
`courses.target_lang='eng'`, across `course_seeds`, `course_legos`, `course_practice_phrases`.

### 3.2 Slots and distinct texts

```sql
SELECT tbl, side, count(*) AS slots, count(DISTINCT norm) AS distinct_norm
FROM eng_slots GROUP BY ROLLUP(tbl, side);
```

| table | side | slots | distinct (within group) |
|---|---|---:|---:|
| course_seeds | known | 50,111 | 2,194 |
| course_seeds | target | 12,993 | 678 |
| course_legos | known | 59,106 | 18,505 |
| course_legos | target | 19,823 | 5,224 |
| course_practice_phrases | known | 510,634 | 308,840 |
| course_practice_phrases | target | 189,290 | 106,170 |
| **TOTAL** | | **841,957** | **392,133** |

(3 rows dropped as empty after normalisation, from 841,960.)

### 3.3 The dedupe is the whole argument

```sql
SELECT count(*) AS total_slots, count(DISTINCT norm) AS distinct_cross_course,
  (SELECT sum(d) FROM (SELECT count(DISTINCT norm) d FROM eng_slots GROUP BY course_code) z)
  AS sum_of_per_course_distinct FROM eng_slots;
```

| | |
|---|---:|
| Total English slots | 841,957 |
| Distinct **across all courses** | **392,133** |
| Sum of per-course distinct (what course-scoped rendering buys) | **694,122** |
| **Units saved by cross-course dedupe** | **302,001 (43.5%)** |

The seed layer shows why: 50,111 English seed slots collapse to **2,194** distinct sentences. The
same English seed set is taught by dozens of `X_for_eng` courses. Course-scoped rendering buys each
of those 23 times over.

### 3.4 Render count

At **2 voices** per text (Eve + clone, the literal reading of the ruling):

| basis | renders | chars | cost |
|---|---:|---:|---:|
| **Cross-course deduped** | **784,266** | 23,364,880 | **$350.47** |
| Course-scoped (today's tooling) | 1,388,244 | 37,298,440 | $559.48 |

At **1 voice** per text (if course content keeps one English voice per course, as `voice_config`
implies today):

| basis | renders | chars | cost |
|---|---:|---:|---:|
| Cross-course deduped | 392,133 | 11,682,440 | $175.24 |
| Course-scoped | 694,122 | 18,649,220 | $279.74 |

### 3.5 What already exists — informational, not a credit

Per the rebuild doctrine quoted in §2, none of this reduces the render count. It is here so the
number is auditable.

```sql
WITH t AS (SELECT DISTINCT norm FROM eng_slots)
SELECT count(*) AS distinct_texts,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM eng_clips k WHERE k.norm=t.norm AND k.vb='eve'))   AS has_eve,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM eng_clips k WHERE k.norm=t.norm AND k.vb='clone')) AS has_clone,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM eng_clips k WHERE k.norm=t.norm AND k.vb IN ('eve','clone'))) AS neither
FROM t;
```

| | distinct texts |
|---|---:|
| Have an **Eve** clip somewhere in the estate | 58,178 |
| Have a **clone** clip somewhere | 148,826 |
| Have **both** | 55,811 |
| Have **neither** | **240,940** (61.4%) |

Course-scoped — i.e. the clip exists *in the course that needs it*:

| | course×text units |
|---|---:|
| Eve present in own course | 69,016 |
| Clone present in own course | 236,210 |
| **Neither present in own course** | **453,110** of 694,122 (65.3%) |

**`voice_id` has two spellings in `course_audio`** and any tool touching this must strip the prefix:
`eve`/`xai_eve`, `gfzdpspr5fdp`/`xai_gfzdpspr5fdp`, `bedd6226`/`xai_bedd6226`,
`en-GB-SoniaNeural`/`azure_en-GB-SoniaNeural`. All counts above normalise it.

### 3.6 Per-course breakdown (top 23 by English volume; full table in the query)

```sql
WITH ct AS (SELECT DISTINCT course_code, norm FROM eng_slots)
SELECT ct.course_code,
  (SELECT count(*) FROM eng_slots s WHERE s.course_code=ct.course_code) AS slots,
  count(*) AS distinct_texts,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM eng_clips k
    WHERE k.course_code=ct.course_code AND k.norm=ct.norm AND k.vb='eve')) AS eve,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM eng_clips k
    WHERE k.course_code=ct.course_code AND k.norm=ct.norm AND k.vb='clone')) AS clone,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM eng_clips k
    WHERE k.course_code=ct.course_code AND k.norm=ct.norm AND k.vb IN ('eve','clone'))) AS neither
FROM ct GROUP BY ct.course_code ORDER BY 2 DESC;
```

| course | slots | distinct | has Eve | has clone | has neither |
|---|---:|---:|---:|---:|---:|
| hak_for_eng | 27,866 | 20,906 | 0 | 0 | **20,906** |
| spa_for_eng | 18,471 | 15,765 | 15,452 | 14,922 | 313 |
| fra_for_eng | 18,219 | 14,470 | 14,440 | 13,577 | 5 |
| mar_for_eng | 16,619 | 13,625 | 0 | 1,327 | 12,298 |
| eng_for_kan | 16,452 | 12,857 | 0 | 12,857 | 0 |
| por_br_for_eng | 16,417 | 12,912 | 0 | 6,613 | 6,299 |
| por_for_eng | 16,240 | 12,865 | 0 | 741 | 12,124 |
| deu_for_eng | 16,164 | 13,586 | 13,576 | 12,682 | 0 |
| fin_for_eng | 16,125 | 13,283 | 0 | 0 | 13,283 |
| eng_for_guj | 16,061 | 12,609 | 0 | 12,609 | 0 |
| kor_for_eng | 16,037 | 12,179 | 12,127 | 12,127 | 52 |
| ita_for_eng | 15,632 | 12,778 | 877 | 294 | 11,608 |
| deu_ch_for_eng | 15,527 | 12,179 | 0 | 0 | 12,179 |
| eng_for_mar | 14,923 | 12,258 | 0 | 12,224 | 34 |
| fra_ca_for_eng | 14,921 | 11,990 | 0 | 10,640 | 1,350 |
| tel_for_eng | 14,887 | 13,220 | 0 | 1,412 | 11,808 |
| spa_mx_for_eng | 14,728 | 12,535 | 0 | 5,026 | 7,509 |
| ara_for_eng | 14,707 | 12,269 | 0 | 282 | 11,987 |
| eng_for_tam | 14,666 | 11,685 | 0 | 11,685 | 0 |
| eng_for_pan | 14,578 | 11,898 | 0 | 11,898 | 0 |
| ara_lb_for_eng | 14,547 | 11,813 | 0 | 0 | 11,813 |
| deu_at_for_eng | 14,478 | 12,267 | 1,604 | 436 | 10,227 |
| eng_for_ben | 14,467 | 11,530 | 0 | 11,530 | 0 |

`fra_for_eng` and `deu_for_eng` are the two courses already through the new engine — 5 and 0 texts
uncovered respectively. Everything else is largely a cold start.

---

## 4. Clone constraint audit — where Tom's voice speaks non-English

Resolved from `voices` (`provider_id` is empty on every row; the real key is `voice_id`):

```sql
SELECT voice_id, tts_engine, display_name, gender, languages FROM voices
WHERE voice_id IN ('eve','gfzdpspr5fdp','bedd6226');
```

| voice_id | engine | name | gender | languages |
|---|---|---|---|---|
| `eve` | xai | Eve | f | `{mul}` |
| `gfzdpspr5fdp` | xai | Tom | m | **`{eng}`** |
| `bedd6226` | xai | Olivia | f | `{en}` |

The clone's own row already declares `languages = {eng}`. The constraint is data, not just policy.

### 4.1 CLEAN — no pod casts the clone onto a non-English target

```sql
SELECT count(DISTINCT p.id) FROM listening_pods p JOIN courses c ON c.course_code=p.course_code,
  jsonb_each(p.speakers) e(k,v)
WHERE c.target_lang<>'eng' AND v->'target'->>'voice_id' IN ('gfzdpspr5fdp','xai_gfzdpspr5fdp');
-- 0
```

**Zero.** The 2026-08-11 shared-cast pass wrote only the English track and left every target voice
alone. Nothing in `listening_pods.speakers` violates the constraint.

### 4.2 VIOLATION — 9,847 explainer clips where the clone voices target-language script

```sql
SELECT count(*) FROM course_audio
WHERE voice_id IN ('gfzdpspr5fdp','xai_gfzdpspr5fdp') AND role='pod_explainer'
  AND text !~ '^[[:ascii:]]*$';
-- 9,847   (of 13,099 total clone pod_explainer clips)
```

Pod explainers are English narration with target-language quotations spliced inline, and the whole
line renders on one voice. Samples straight from the DB:

- `ara_eg_for_eng` — `"صباح الخير". means good morning. "حضرتك عايز إيه". means what would y…`
- `nep_for_eng` — `"थप". means more. "दुई गिलास". means two glasses. "बियर". means beer.`
- `swa_for_eng` — `"Ufaransa". means France. "Nimekuwa hapa". means I have been here.`
- `zho_for_eng` — `<voice xml:lang="zh">喝点什么</voice> means anything to drink, …`

**This is the clone speaking Arabic, Nepali, Swahili and Mandarin today, at scale.** The `zho` sample
shows the pipeline already knows how to mark a language span (`<voice xml:lang>`) — but xAI is not
Azure SSML, and a single-voice render puts the whole line in Tom's mouth regardless. This is the
largest existing breach of the constraint and it is *not* created by the new plan — the new plan
inherits it, and re-rendering explainers fresh would re-commit it 9,847 times.

### 4.3 VIOLATION — 1,631 explainer clips where the clone narrates in a non-English *known* language

```sql
SELECT a.course_code, c.known_lang, count(*) FROM course_audio a JOIN courses c ON c.course_code=a.course_code
WHERE a.voice_id IN ('gfzdpspr5fdp','xai_gfzdpspr5fdp') AND a.role='pod_explainer' AND c.known_lang<>'eng'
GROUP BY 1,2 ORDER BY 3 DESC;
```

| course | known_lang | clips |
|---|---|---:|
| eus_for_spa | spa | 243 |
| fra_for_jpn | jpn | 240 |
| cat_for_spa | spa | 239 |
| zho_for_jpn | jpn | 238 |
| ita_for_jpn | jpn | 236 |
| deu_for_jpn | jpn | 232 |
| spa_for_jpn | jpn | 203 |
| **total** | | **1,631** |

These are the sharpest violations — not a spliced quotation but the whole narration in another
language. Evidence, verbatim from `course_audio.text`:

- `fra_for_jpn` — `"Je parle assez lentement". は ... という意味です I speak slowly enough.`
- `eus_for_spa` — `"Bai, noski". significa yes, of course. "databuluea". significa the card reader.`

**Tom's clone is currently reading Japanese and Spanish sentences.** 1,631 clips, 7 courses.

### 4.4 PLANNED violation risk — the 19 `eng_for_X` courses, and how the ruling is read

19 courses have English as the **target** side and a non-English **known** side:

```sql
SELECT course_code, known_lang FROM courses WHERE target_lang='eng' ORDER BY 1;
```

`eng_for_ara`(ara), `eng_for_ben`(ben), `eng_for_deu`(deu), `eng_for_fra`(fra), `eng_for_guj`(guj),
`eng_for_hin`(hin), `eng_for_ita`(ita), `eng_for_jpn`(jpn), `eng_for_kan`(kan), `eng_for_kor`(kor),
`eng_for_mar`(mar), `eng_for_pan`(pan), `eng_for_por`(por), `eng_for_sin`(sin), `eng_for_spa`(spa),
`eng_for_tam`(tam), `eng_for_tel`(tel), `eng_for_urd`(urd), `eng_for_zho`(zho).

The ruling says *"the SAME pair is used on BOTH the known side and the target side."* Two readings:

- **Reading A (mine, and what I costed):** the pair follows the *English*, whichever side it sits on.
  In `eng_for_kan`, English is target1/target2 → Eve + clone; the Kannada known side keeps
  `kn-IN-SapnaNeural`. **No violation.** This matches what `voice_config` already does — those 19
  courses today have `target1: Olivia / target2: Tom` and a native known voice.
- **Reading B (literal):** Eve + clone on both sides of every course. In `eng_for_kan` that puts the
  clone on **Kannada**; across the 19 courses it puts him on Arabic, Bengali, Gujarati, Hindi,
  Japanese, Kannada, Korean, Marathi, Punjabi, Sinhala, Tamil, Telugu, Urdu, Chinese and five
  European languages. **19 courses, ~130,000 known-side slots, categorical breach.**

Reading A is almost certainly what was meant — the parenthetical *"pods use the same voices on known
and target"* is describing pods, where both sides are cast from one speaker map. **Flagging it rather
than assuming, because Reading B is the single largest clone-constraint exposure in this plan and it
turns on one sentence.**

### 4.5 Stranding — 62,811 rows, the `753bd4e3` pattern, live right now

Commit `753bd4e3`: *"the recast rendered the clone clips but left 1,594 bare-lego rows pointing at
Eve."* The mechanism: a voice swap moves the LEGO holders (`course_legos.known_audio_id`) but
`course_practice_phrases.known_audio_id` is a **separate FK to the same `course_audio` table**. Rows
whose `known_text` duplicates a LEGO's text keep their old pointer, so the LEGO says a phrase in one
voice and the BUILD phrase one beat later says it in another. Nothing errors; the learner just hears
two people.

Current estate-wide count of the same pattern — practice-phrase known rows whose linked clip's voice
disagrees with the course's own `voice_config` known voice, prefix-normalised:

```sql
WITH norm AS (SELECT course_code,
  regexp_replace(voice_config->'voices'->'known'->>'voiceId','^(xai_|azure_)','') AS kv
  FROM courses WHERE known_lang='eng')
SELECT count(*) AS stranded_rows, count(DISTINCT p.course_code) AS courses
FROM course_practice_phrases p JOIN norm ON norm.course_code=p.course_code
JOIN course_audio a ON a.id=p.known_audio_id
WHERE regexp_replace(a.voice_id,'^(xai_|azure_)','') IS DISTINCT FROM norm.kv;
-- 62,811 rows across 43 courses
```

Worst offenders:

| course | config known voice | clip voice | rows |
|---|---|---|---:|
| ita_for_eng | eve | en-GB-SoniaNeural | 12,471 |
| deu_at_for_eng | eve | en-GB-SoniaNeural | 9,876 |
| spa_mx_for_eng | gfzdpspr5fdp | en-GB-SoniaNeural | 7,633 |
| por_br_for_eng | gfzdpspr5fdp | en-GB-BellaNeural | 7,404 |
| cym_s_for_eng | *(none)* | legacy_import | 5,359 |
| cym_n_for_eng | *(none)* | legacy_import | 4,986 |
| deu_for_eng | gfzdpspr5fdp | eve | 2,177 |
| fra_for_eng | gfzdpspr5fdp | eve | 1,846 |

`deu_for_eng` 2,177 and `fra_for_eng` 1,846 are the *same defect class as `753bd4e3`, still present
after it* — those two courses went through the new engine and still have thousands of rows pointing
at Eve where config says clone.

**Consequence for this plan:** a fresh English build that renders 785k clips and relinks only the
holders it knows about will leave a stranding tail in the tens of thousands. **The relink set must be
enumerated per table — `course_seeds`, `course_legos`, `course_practice_phrases`,
`lego_introductions`, `listening_pod_sentences` — before the first render, not after.**

---

## 5. The engine, throughput, and wall clock

### 5.1 Entry point, concretely

**`tools/course-finish-shepherd.sh <fra|deu>`** — the tool that rebuilt fra and deu overnight on
2026-08-07/08 (merged at `676f28f2`). It bands a course to completion, driving
`services/phases/phase8-audio-v13.cjs` via `applyReusePlan` (`services/audio-reuse-planner.cjs`) on a
**pinned snapshot checkout** serving phase 8 on its own port, so mid-run edits to the live checkout
can't reach it.

Its contract, from the file's own header:

- clip work is durable in the **database** — `applyReusePlan` commits each swap as it lands, so a
  restart is idempotent and finished clips re-plan as SATISFIED;
- **no delete-before-write** anywhere in the path (make-before-break holds);
- band state in `$BANDSTATE`, evidence per band in `docs/audio-repair-2026-08-07/*-reuse-applied-log.json`;
- the shepherd reports to the parent conversation itself, so a 4am band completion isn't lost.

Concurrency, set at launch (`tools/course-finish-shepherd.sh:189-190`):

```
REUSE_MAX_CONCURRENCY=32      # clips in flight in this run
XAI_TTS_CONCURRENCY=8         # process-global semaphore in services/tts-service.cjs — the real bind
```

The header is explicit that `XAI_TTS_CONCURRENCY` is what actually binds throughput: raising the
endpoint number alone changes nothing, because every xAI call queues behind that semaphore.

Two hard-won behaviours the English run inherits and must not lose (`81765d02`):
- **429/408 are retriable** with their own larger budget and 4s-base jittered backoff. Before that
  fix a rate-limited clip was classed fatal-4xx and **dropped** — raising concurrency would have
  converted throughput straight into lost clips.
- **`distrustOwnBefore` is a DATE, not a boolean**, and trust is *created-since OR revised-since*
  (an in-place swap bumps `audio_revision` but deliberately leaves `created_at` alone).

### 5.2 Measured throughput — real timestamps, not a projection

```sql
SELECT date_trunc('hour', created_at) AS hr, course_code, count(*)
FROM course_audio WHERE created_at >= '2026-08-07' AND created_at < '2026-08-09'
  AND course_code IN ('fra_for_eng','deu_for_eng') GROUP BY 1,2 ORDER BY 1,2;
```

| hour (UTC) | fra | deu | total |
|---|---:|---:|---:|
| 2026-08-08 02:00 | 3,151 | 1,890 | 5,041 |
| **2026-08-08 03:00** | **8,474** | **8,140** | **16,614** |
| 2026-08-08 04:00 | 494 | 2,096 | 2,590 |

**Peak: 16,614 clips in one hour**, two courses running in parallel on separate pinned services.
Sustained across the 02:00–05:00Z burst: **~8,000 clips/hour**. Run totals in the window:
`fra_for_eng` 15,255 clips, `deu_for_eng` 14,074 — the ~10k+10k Tom remembers, and slightly more.

### 5.3 Wall clock and cost for the English build

| scenario | renders | chars | cost | at 16,614/hr | at 8,000/hr |
|---|---:|---:|---:|---:|---:|
| **Pod-0 only (firm)** | 1,128 | 78,073 | **$1.17** | 4 min | 8 min |
| Pod-0, course-scoped | 13,472 | 662,862 | $9.94 | 49 min | 1.7 h |
| **Course content, deduped, 2 voices** | 784,266 | 23,364,880 | **$350.47** | **47 h** | **98 h** |
| Course content, course-scoped, 2 voices | 1,388,244 | 37,298,440 | $559.48 | 84 h | 174 h |
| Course content, deduped, 1 voice | 392,133 | 11,682,440 | $175.24 | 24 h | 49 h |
| **Everything, deduped, 2 voices** | **785,394** | 23,442,953 | **$351.64** | **47 h** | **98 h** |

The peak rate was achieved with **two** parallel shepherds. The English build is one logical job over
~90 courses, so it parallelises further — the 16,614/hr column is a floor for a fleet, not a ceiling.

**Cost is not the constraint here. Wall clock is.** $352 buys the entire English estate; 47–98 hours
of rendering is what actually has to be scheduled.

---

## 6. Gaps — reported as gaps

1. **63 pod-0 slots have a speaker that resolves to no cast entry**, so no voice can be assigned:
   `tha_for_eng:pod-0-unrecorded` 47, `zzz_test_for_eng:pod-0` 12, `fin_for_eng:pod-0` 4. They touch
   53 of the 988 distinct texts. Excluded from the 1,128; they need a cast entry before they can be
   rendered at all.
2. **462 pod-0 English slots are human recordings** — Aran and Catrin on `cym_n_for_eng` and
   `cym_s_for_eng`, both tracks. The 2026-08-11 pass refused to touch them and I have not counted them
   into the render. *"Rebuild all English fresh"* would overwrite two people's real recordings.
   **This needs Tom's word, not a tool's default.** Excluded from the 1,128.
3. **One voice or two for course content?** Unresolved by any document (§2). Both figures given; the
   headline uses two.
4. **Cross-course dedupe is not achievable today.** `course_audio`'s unique key and
   `findExistingAudio`'s `course_code` filter make every course buy its own copy. The 785k vs 1.4M
   difference is entirely this. I have not scoped the code change.
5. **"Already exists" counts are a floor.** My normalisation is applied to raw content text;
   `text_stripped` derives from trigger-written `text_normalized` (§3.1). Divergence causes missed
   matches, never false ones. Since the rebuild doctrine says existing clips are not a credit anyway,
   this does not move the render count.
6. **Pod count is moving.** 104 at coordinator time, 106 now — the alignment worker is still cloning
   `pod-0-unrecorded` pods. Re-run §1 immediately before rendering.
7. **`voices.provider_id` is empty on every row.** The usable engine marker is `voices.tts_engine`
   plus `courses.voice_config->voices->*->provider`. Noted in `premium-first-rebuild-queue-2026-08-12.md`
   as a dead end; confirmed here.
8. **Explainer clips are out of the render arithmetic.** §4.2/4.3's 13,099 clone explainer clips are
   a constraint violation, not an English render count — they are mixed-language by construction and
   need a design decision (split the line across two voices, or accept the clone reading target
   fragments) before any of them can be rebuilt.

---

## 7. What needs Tom

1. **Reading A or B on the `eng_for_X` courses** (§4.4). A = the pair follows the English (no
   violation, what I costed). B = the pair on both sides everywhere (19 courses, clone on Kannada,
   Japanese, Arabic…). One sentence settles it.
2. **The 462 Welsh human recordings** (§6.2) — does "all English fresh" overwrite Aran and Catrin, or
   are human recordings exempt as they have been every time so far?
3. **Explainers** (§4.2/4.3) — 9,847 clips have the clone speaking target-language script, 1,631 have
   him narrating in Japanese or Spanish. Rebuild them as-is, split them across voices, or leave them.
4. **One English voice or two for course content** (§6.3) — the difference is 392k renders and $175.

---

*Queries used are reproducible from this document; the working SQL is in the gitignored
`scripts/eng-scope/` on the authoring machine. Read-only throughout: no writes, no renders, nothing
triggered.*
