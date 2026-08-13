# English, recounted by distinct text — 670 renders, not 11,659

**13 Aug 2026. READ ONLY. No audio was generated, no DB row was written, nothing was triggered.**
Every number below is read live from the DB with the query printed beside it, so it can be re-run.

**The reframe being costed** (Tom, 2026-08-13): *"English only needs one set of samples — for all
courses that include English either as a target or a known language."* One render per distinct
English line per cast voice, shared by every course that uses that line — instead of one render per
course per slot.

---

## The headline

| | |
|---|---:|
| Pod-0 English slots across the estate | **17,510** in **60 courses** |
| Distinct English lines in those slots | **970** (964 with a resolvable speaker) |
| Render units needed (line × cast voice) | **1,110** |
| Already exist on-cast somewhere in the estate — reusable | **440** |
| **Actually need rendering** | **670** |
| Characters | 53,987 |
| **Cost** | **$0.81** |

**The old scoping was ~11,659 clips. It is 670 renders. A 17× cut, and the money goes from ~$9.94
to under a pound.** Nothing about the audio changes — the same 60 courses end up with the same
lines in the same two voices. The only thing that changes is that "Good morning" is bought once
instead of 106 times.

The 17,510 slots have not gone away. They are the **relink** step, not the render step: after the
670 renders exist, 17,424 slots get repointed at 1,110 shared clips. Relinking is a metadata write
and costs nothing.

### Per voice

| cast voice | render units | already on-cast | to render | chars |
|---|---:|---:|---:|---:|
| Tom's clone `gfzdpspr5fdp` | 757 | 252 | **505** | 38,336 |
| Olivia `bedd6226` | 353 | 188 | **165** | 15,651 |
| **total** | **1,110** | **440** | **670** | **53,987** |

353 + 757 > 964 because **146 lines are spoken by a man in one pod and a woman in another** — the
same sentence genuinely needs both voices.

---

## 1. How the count is made

### 1.1 Scope

Pod-0 family pods (`slug LIKE 'pod-0%'`), English on whichever side the course puts it —
`known_text` where `courses.known_lang='eng'`, `target_text` where `target_lang='eng'`. That is
106 pods over **60 distinct courses**. One course contributes its English on the target side
(`zho_for_eng`); it is included.

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
SELECT count(*) AS slots, count(DISTINCT course_code) AS courses FROM slot;
-- 17,510 | 60
```

### 1.2 The identity key

Two English lines are the same render if they match on:

```sql
lower(btrim(regexp_replace(txt,'[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+','','g')))
```

That is **exactly the expression behind `course_audio.text_stripped`**, the generated column the
audio layer already uses as its identity key. A dedupe computed this way is one the existing
pipeline can honour — it is not a new abstraction that would need building.

Raw-lowercase gives 988 distinct; punctuation-stripped gives **970**. The 18 difference is the
same line with and without a full stop or question mark.

### 1.3 Which voice a line needs

Each slot's speaker resolves through `listening_pods.speakers -> <speaker>` (falling back through
the `variants` array and a case-insensitive key match). `gender='f'` → Olivia, `gender IN ('m','n')`
→ clone. 63 of 17,510 slots have a speaker key that resolves to nothing at all — they are excluded
from the render count and **listed as a gap in §5**.

### 1.4 The reuse credit — and it is real, not paper

A render unit is "already covered" if a clip with the same `text_stripped`, `language='eng'` and
that cast voice exists **anywhere in `course_audio`**, in any course. That is the whole point of
sharing: a clone recording of "I don't know" made for `fra_for_eng` serves all 60 pods.

```sql
WITH need AS (SELECT DISTINCT norm, want FROM pod0need WHERE want IS NOT NULL AND norm<>'')
SELECT count(*) AS render_units,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM oncast o WHERE o.norm=need.norm AND o.vb=need.want)) AS covered,
  count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM oncast o WHERE o.norm=need.norm AND o.vb=need.want)) AS to_render
FROM need;
-- 1,110 | 440 | 670
```

Two checks that the 440 is not a paper credit:

- **No placeholders.** Of 423,797 English clips on the two cast voices, **0** have a null, empty or
  `pending/` `s3_key`. (`pending/` is the marker `services/shared/clone-copy-index.cjs` uses for a
  row without a real object behind it.)
- **The objects are actually there.** A random 40-clip sample, HEADed against
  `ssi-audio-stage.s3.eu-west-1.amazonaws.com`: **40 alive, 0 dead.** Sampled by `md5(s3_key)` so
  the draw is not clustered by course or date.

This differs deliberately from the 2026-08-12 doctrine ("`existing_clips` is legacy-engine debris,
not a rebuild credit"). That doctrine was written for a **voice swap** — clips on a retired voice
can never be credited. Here the credit is only ever taken for clips *already on the voice we want*,
which is a different thing. If Tom wants everything re-rendered fresh regardless, the number goes
back to **1,110 renders / $1.32** — still nothing like 11,659.

---

## 2. The relink step — where the 17,510 slots actually go

This is the work the slot count is for. It is metadata only.

| current state of the slot | slots |
|---|---:|
| no clip linked at all | 5,032 |
| Leo (retired) | 3,824 |
| Sonia, `en-GB-SoniaNeural` (retired) | 3,579 |
| **already on the right cast voice — no work** | **1,790** |
| Libby (retired) | 1,042 |
| a cast voice, but the wrong gender for that speaker | 711 |
| Ryan (retired) | 522 |
| Hollie (retired) | 521 |
| Eve — see §3 | 369 |
| Thomas (retired) | 29 |
| **human recording (Welsh — Aran) — refused, not touched** | **23** |
| Alfie (retired) | 5 |
| speaker unresolvable — see §5 | 63 |

So **17,424 slots** relink (17,510 less the 63 unresolvable and the 23 human recordings), and
**1,790 of those are already correct** and can be left alone.

The 23 human recordings are the same rail the 2026-08-11 shared-cast pass applied: a metadata sweep
does not get to reassign the cast of audio a person actually recorded. `cym_n_for_eng` and
`cym_s_for_eng` stay on Aran and Catrin unless Tom overrules it.

---

## 3. The female voice is still open — and it is not a cost question

Tom has not settled Olivia vs an Eve swap. **369 pod-0 slots are already on Eve today**, and Eve has
72,053 distinct English lines recorded estate-wide, against Olivia's 93,208. So the swap is not
starting from zero either way.

| female voice | render units | already on-cast | to render | pod-0 total renders | pod-0 cost |
|---|---:|---:|---:|---:|---:|
| **Olivia** `bedd6226` | 353 | 188 | 165 | **670** | **$0.81** |
| **Eve** `eve` | 353 | 87 | 266 | **771** | **$0.87** |

**Choosing Eve costs six pence more.** Cost has no vote here. This is purely Tom's ear, which is
what the sample pack is for.

---

## 4. The bigger figure — all English in course content

Pod-0 is conversational audio. Tom's framing ("all courses that include English either as a target
or a known language") also covers **course content** — seeds, LEGOs, practice phrases. Reported
separately and never folded into the pod-0 headline.

**These two scopes barely overlap: only 14 of the 970 pod-0 lines also appear in course content.**
They are additive, not double-counted.

| | |
|---|---:|
| English course-content slots | **841,979** across **96 courses** |
| Distinct English lines | **392,148** |

Crediting existing on-cast clips the same way:

| voice | already on-cast | to render | chars | cost |
|---|---:|---:|---:|---:|
| clone `gfzdpspr5fdp` | 148,565 | 243,583 | 7,119,511 | $106.79 |
| Olivia `bedd6226` | 88,254 | 303,894 | 9,026,449 | $135.40 |
| Eve `eve` | 58,178 | 333,970 | 9,893,448 | $148.40 |

| build shape | renders | cost |
|---|---:|---:|
| clone + Olivia | **547,477** | **$242.19** |
| clone + Eve | 577,553 | $255.19 |
| clone only, one English voice per line | 243,583 | $106.79 |

For contrast, the 2026-08-12 fresh-rebuild costing of the same estate was **784,266 renders /
$350.47** with no reuse credit, and **1,388,244 renders / $559.48** course-scoped. Sharing by
distinct text and crediting on-cast clips takes it to $242.

**Whether course content wants one English voice or two is not settled by anything in the record.**
Pods have speakers, so a pod line's voice is determined. Course content has no speaker — today
`voice_config` assigns one English voice per course. Both figures are given; the choice is Tom's.

Cost basis throughout: **$15.00 / 1M characters**, xAI's published TTS rate, the
`POD_CHARS_TO_COST` constant in `services/phases/phase8-audio-v13.cjs:5960`.

---

## 5. Gaps, stated rather than papered over

1. **63 pod-0 slots have an unresolvable speaker.** Their `speaker` string matches no key and no
   `variants` entry in their pod's `speakers` object, so no gender and no voice can be derived.
   They are excluded from all render counts above. Somebody has to look at those 63 rows; a render
   run must not silently skip them.
2. **The reuse credit is a floor, not an exact figure.** `text_stripped` derives from
   `text_normalized`, written by the `audio_normalize_text` trigger; I compare it against pod text
   normalised by the same expression applied to the raw string. Where the trigger's normalisation
   differs from the raw text, a real match can be missed. That direction of error makes 670 slightly
   **too high**, never too low.
3. **Liveness is sampled, not exhaustive.** 40 of 440 covered units were HEADed and all 40 were
   alive. A full sweep of the 440 before relinking is cheap and should be a precondition of the
   relink run, not an assumption.
4. **"Covered" means the clip exists on the right voice. It does not mean the clip is good.** None
   of these 440 has been through the truncation or veracity checks. The sample pack is drawn from
   this same pool, so Tom's listen is a partial quality check on it — but only partial.
5. **`voice_id` has two spellings** in `course_audio` — `eve`/`xai_eve`,
   `gfzdpspr5fdp`/`xai_gfzdpspr5fdp`, `bedd6226`/`xai_bedd6226`. Every count above strips the
   prefix. Any tool built on this must do the same or it will under-count coverage badly.
6. **The pod count moves while you work.** 106 pods today, 104 on 12 Aug, 96 on 11 Aug — the
   alignment worker keeps cloning `pod-0-unrecorded` pods. Course count (60) has been stable. Any
   render run should take its scope from the query, not from a frozen list.

---

## 6. THE GATE — nothing renders yet

**No audio is generated until Tom has (a) heard the sample pack and (b) named the female voice.**

Both are open, and the second one has no cost consequence at pod-0 scale — six pence — so it should
be decided entirely by ear.

What is waiting on that single decision:

- the 670 pod-0 renders ($0.81)
- the 17,424-slot relink
- and, if Tom extends the ruling to course content, the 547,477-render estate build ($242)

The sample pack is built from **clips that already exist** on the two cast voices — nothing was
rendered to make it.

### 👉 The sample pack: https://watson-1.tail4968cb.ts.net/d/b44f9a8d

36 tappable players, clone first and Olivia second every time. **15 of them are true A/B pairs** —
the identical English sentence in both voices — so the comparison is on the same words, not on
vibes. 0 dead clips; every one verified alive on both URL forms before inclusion.

The pool it was drawn from, characterised honestly:

| voice | distinct texts | 1–4w | 5–8w | 9–11w | 12+w | statements | questions | exclamations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Tom's clone | 277 | 18 | 105 | 71 | 83 | 148 | 120 | 9 |
| Olivia | 230 | 16 | 102 | 41 | 71 | 129 | 98 | 3 |

Both voices carry every length band, and 141 of the 507 distinct texts exist in both — so the pool
**is** enough to judge these two voices. Two limits stated rather than papered over: it is pod-0
**conversational** English only (greetings, class talk, restaurant and ticket lines, numbers-and-
colours drills — no narration, no course prompts, no read-aloud register), and exclamations are
thin (9 clone / 3 Olivia). Nothing was rendered to fill either gap.
