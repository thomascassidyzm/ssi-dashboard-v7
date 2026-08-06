# Welsh pod-0 — drafted, awaiting Aran

2026-08-06. Aran's new pod-0 canonical left 109 Northern and 104 Southern lines with no
Welsh at all, which blocked the recording job. All 213 now have Welsh, hand-written line
by line and entered as **DRAFT — AWAITING ARAN**. Nothing that already existed was
touched.

## What landed

| | Northern | Southern |
|---|---|---|
| Lines drafted | **109** | **104** |
| — new, written from scratch | 90 | 89 |
| — reworded, adapted from existing Welsh | 19 | 15 |
| — of those, needed no change at all | 11 | 8 |
| Human-written lines, untouched | 122 | 127 |
| Lines with no Welsh | **0** | **0** |

The 11 and 8 "no change at all" lines are ones where the English moved to numerals, or
swapped a word the Welsh already covered — "I'll see you tomorrow" → "See you tomorrow"
is *Wela i chdi fory* either way. They are still marked draft, because "it still fits" is
a machine's assertion, not Aran's.

## How they were written

Each course was drafted from **its own** corpus — never translated once and dialect-
swapped, which is the failure the methodology rails warn about. The style authority was
the 114 Northern / 118 Southern surviving human-written pod-0 lines, plus each course's
own ~5,000 authored practice phrases for grammar the pod corpus does not cover ("it
sounds as though", "makes me", "stupid", "I said", "would you like to", "I prefer").

The dialect spine held throughout, all of it attested in the corpus:

| | Northern | Southern |
|---|---|---|
| possession | *mae gen i / gynnon ni / oes gynnoch chi* | *ma 'da fi / 'da ni / oes … 'da chi* |
| want, need | *isio*, *angen* | *moyn*, *ishe* |
| can | *fedra i, fedrwch chi, ga i* | *alla i, allwch chi* |
| would like | *liciwn i, fasech chi'n licio* | *licen i, licech chi* |
| with, now | *efo*, *rŵan* | *gyda*, *nawr* |
| say, understand | *deud*, *dallt* | *gweud*, *deall* |
| what, that | *be*, *hynna* | *beth*, *hynny* |
| again, hot | *eto*, *poeth* | *'to*, *twym* |

Conventions carried over from the corpus: `…` marks a recorder's breath, at the same
phrase boundaries and the same density — length for length the drafts sit on the corpus
mean (0.71 breaks per line at 6-10 words against the corpus's 0.71; 2.60 at 16-25 words
against 2.63). Numbers, days and times are always words, even where the new canonical
writes numerals, because the Welsh is spoken aloud. `[target language]` is *Cymraeg*.

Consistency was checked mechanically across all 231 lines of each course: **zero cases**
of one English line getting two different Welsh renderings, and zero cases of one Welsh
line covering two different English intentions.

## Judgement calls worth Aran's eye first

1. **Scenes 15-21 are `chi` throughout.** They are the learner out in the world — shops,
   stations, restaurants — and every comparable scene in the corpus is `chi`. But a few
   lines could go either way, especially *When you talk quickly, it makes me feel stupid*
   (19.3), which sounds like something said to a friend. One word from Aran flips the
   whole block.
2. **"That's very kind of you" now has two renderings across the course.** The existing
   human line at 10.9 renders it idiomatically as *Dych chi'n garedig iawn!*. In scene 20
   it sits directly next to *You're very kind*, so the draft splits them — *Mae hynna'n
   garedig iawn* (20.8) against *Dach chi'n garedig iawn* (20.9). That reads right as a
   drill pair, but it is a genuine fork against the earlier line.
3. **"scoop" is *sgŵp*** (*dau sgŵp o hufen iâ*, 19.10 and 20.1-2). The corpus borrows
   happily — *contactless*, *check-out*, *bwcin*, *plasters*, *wifi* — so a borrowing
   fits, but *pelen* is the alternative and this is Aran's ear, not mine.
4. **"single / return ticket" is *tocyn unffordd / tocyn dwyffordd*** (15.7-8). Chosen as
   a matched pair so the two teach against each other; *tocyn dychwel* is the other option
   for the return.
5. **Northern 9.1 and 11.1** dropped *bwrdd wedi'i archebu* / *stafell wedi'i bwcio* to
   plain *bwcin*, because the English dropped the table and the room. That matches what
   the Southern course already says at the same lines.

## How a draft is marked, and how it stops being one

New column `listening_pod_sentences.target_text_draft` — additive, defaults false, so
nothing that existed before reads it or breaks. It rides the recording plan through to
the record room, which badges the line **DRAFT — AWAITING ARAN** in tungsten with a ringed
box. The recording sheets mark the same lines 📝 DRAFT, per scene and per line, and tell
the recorder not to record one as it stands.

**Editing the line in the record room is the proofread**: `PATCH /sentence/:id` writes the
new Welsh and clears the marker in the same update. Nothing has to come back through
anyone else.

## What was checked

- Every one of the 231 canonical lines on each course has Welsh. Zero blanks.
- Exactly 109 Northern and 104 Southern carry the marker, reconciled line by line against
  the alignment archive's needing-translation lists plus the brand-new slots.
- The 122 Northern and 127 Southern surviving human lines are **byte-identical** before and
  after, and none is marked draft — asserted inside the write transaction.
- No `course_audio` row deleted; no `target_audio_id` set or cleared by this job.
- The acceptance probe passes on all four Welsh queues with zero violations, and now
  carries the new guarantee both ways: a served Welsh line must be either archive Welsh or
  marked draft, and every drafted row must reach the recorder marked. 213 drafted items
  served, all marked. A negative control confirms both new checks fire when broken.
- 210 of 213 voice-engine unit tests green. The 3 failures are in `pods-origin-guard`
  and pre-date this work — confirmed by stashing the changes and re-running.

## The gap

The Welsh is a machine's draft. It is consistent, dialect-correct and written against the
right corpus, but it has not been read by a Welsh speaker. Until Aran reads it, the 213
lines should be treated as unrecordable, which is exactly what every surface now says.
