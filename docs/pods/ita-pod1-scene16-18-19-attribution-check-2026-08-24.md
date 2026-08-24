# Scenes 16, 18, 19 — is the all-Learner run a defect? No. It is Aran's design.

*2026-08-24. Read-only investigation. Nothing was edited: no `content_audit_log` write, no
speaker change, no `listening_pods.speakers` touch, no audio generated.*

## Verdict

**Faithful. Not flattening. The stretches of consecutive Learner lines in scenes 16, 18 and
19 are exactly what the canonical script says they should be.** These scenes are not
conversations at all — they are the *Extra phrases* drill chunks, and the author attributed
every line in them to `Learner` on purpose.

The one and only line in those three scenes where the live DB disagrees with the canonical
is **scene 16, line 9 — and the DB is the one that deviates**, not the canon. That line was
moved `Learner → Staff` by job 60d19bc1 this week.

## What I used as the reference standard, and why

Three layers, checked in order:

1. **`docs/pods/pod0-aran-original-2026-08-06.txt`** — Aran's own file, archived verbatim
   (UTF-8 BOM + CRLF, untouched). This is the true pre-DB source. **It carries no speaker
   column at all** — just numbered lines under `SCENE 15: Extra phrases`, etc. So no speaker
   attribution in the estate can claim to be "restored from Aran's file"; every label was
   assigned downstream.
2. **`docs/pods/pod0-english-canonical.md`** — the committed master markdown built from that
   file (commit `8dd662493`, 2026-08-06). This is where speakers live, and it carries Aran's
   **voicing ruling verbatim** in the STATUS header. It is the authority for the `speaker`
   column, and it says so explicitly.
3. **`canonical_pod_scenarios` (`pod_slug='pod-0'`)** — the seeded DB copy of (2), which is
   what the live pod was generated from (`listening_pods.metadata.generated_from =
   'canonical_pod_scenarios'`, `canonical_aligned_at: 2026-08-06`).

I verified (2) and (3) agree, and that the live `ita_for_eng:pod-1` rows for scenes 16/18/19
match the canonical **text** 33/33 with zero mismatches — so the scene numbering lines up and
the comparison is sound.

**Note on naming, because it misleads:** the live pod called `pod-1` carries the **pod-0**
canonical content (22 scenes, 231 lines, café/hotel/directions/*Extra phrases*). The separate
`docs/pods/pod-1-english-canonical.md` — 16 scenes, Grace/Paul/Amy/Joe social conversation —
is **not** what is live here. Comparing against that file would have produced a false
"everything is mis-attributed" answer.

## The ruling itself, quoted

From the canonical STATUS header, `docs/pods/pod0-english-canonical.md`:

> **Scenes 15-21, the Extra phrases, are CHUNKS.** They are a run of useful phrases, not a
> conversation, and no to-and-fro is needed. Every line is attributed to `Learner`. Some read
> as a second party's reply ("No, we only take cash.", "It's down there on the left.") — those
> are phrases in the chunk, and no alternating speaker has been forced onto them. If a future
> pass does want a second voice here, that is a free choice, not something the data dictates.

Aran's own words, same header: *"then beyond that it seemed faster to do them as chunks,
without scene-based to and fro for everything, they'll work fine like that."*

The commit that applied it (`8dd662493`) is unambiguous: *"11 lines in scenes 16/17/21 that I
had inferred as an alternating 'Friend' are now 'Learner'. Scenes 15-21 are Learner throughout
bar the drill tails."*

So the canonical **names the two exact lines** that job 60d19bc1 later reassigned, and rules
them chunk phrases.

## Evidence — scenes 16, 18, 19, line by line

Canonical speaker for **every** line below is `Learner`, except line 11 of each scene, which is
`Narrator` (the deliberate numbers/months drill tail). Live DB matches, one exception marked.

### Scene 16 (canonical label "10 · Extra phrases")

| # | DB speaker | Canon speaker | Text |
|---|---|---|---|
| 1 | Learner | Learner | But if you can speak slowly I think we'll be able to manage. |
| 2 | Learner | Learner | You spoke a little too quickly, so I'm not sure if I understood. |
| 3 | Learner | Learner | Can we try again? |
| 4 | Learner | Learner | Can we see the menu? |
| 5 | Learner | Learner | Can we see the dessert menu also? |
| 6 | Learner | Learner | Do you have anything to eat? |
| 7 | Learner | Learner | Can we pay? |
| 8 | Learner | Learner | Can we pay by card? |
| **9** | **Staff** | **Learner** | **No, we only take cash.** ← the only deviation, and it is the DB that deviates |
| 10 | Learner | Learner | I'm sorry, I don't have any cash. |
| 11 | Narrator | Narrator | A million. 80. 90. 2 o'clock. 10 o'clock. |

### Scene 18 (canonical label "12 · Extra phrases") — 11/11 identical to canon

That's a bad idea · Do you have any orange juice? · …apple juice? · Does the boat leave from
here? · Does the bus leave from here? · Where does the bus leave from? · Is that correct? Am I
correct? · Am I wrong about that? · I'm sorry, my son lost his ticket. · We have paid, but my
daughter has lost her ticket. — all `Learner` in both. Line 11 (`4 o'clock. 8 o'clock. March.
April.`) `Narrator` in both.

### Scene 19 (canonical label "13 · Extra phrases") — 11/11 identical to canon

That makes me happy · …a little worried · When you talk quickly, it makes me feel stupid · Is
it okay if I sit here? · …if we put this here? · I don't want to be late · Are we going to be
late? · I promise I won't be late · I promise we won't be late · I'd like two scoops of
ice-cream, please — all `Learner` in both. Line 11 `Narrator` in both.

**Scenes 18 and 19 have zero DB-vs-canon differences of any kind. Scene 16 has one, and it is
the 60d19bc1 change.**

## Fleet check — all 22 courses, not a sample

I ran the full comparison (live `pod-1` rows vs `canonical_pod_scenarios` pod-0) across every
course rather than 3–4, since it was one query loop. 231 rows each, 22/22 courses.

In scenes 15–21, the differences are **exactly these 11 lines, on exactly 22 courses, and
nothing else** — 242 rows, matching the 60d19bc1 audit trail precisely:

| Scene.line | DB now | Canon | Text |
|---|---|---|---|
| 16.9 | Staff | Learner | No, we only take cash. |
| 17.2 | Staff | Learner | Do you want to pay by cash or card or put it on the room? |
| 17.4 | Staff | Learner | Would you like to pay by cash or card or on the room? |
| 17.5 | Staff | Learner | Did you want to pay by cash or card? |
| 17.9 | Interlocutor | Learner | No, it's a little cold today. |
| 21.5 | Interlocutor | Learner | It's down there on the left. |
| 21.6 | Interlocutor | Learner | It's down there on the right. |
| 21.8 | Interlocutor | Learner | Yes, I said it's over there. |
| 21.11 | Interlocutor | Learner | Would you like to order some drinks? |
| 21.12 | Interlocutor | Learner | Do you want to order some drinks first? |
| 21.13 | Interlocutor | Learner | Did you want something to drink first? |

**There is no second flattening defect.** Nothing anywhere in scenes 15–21 is flattened onto
Learner that the canon assigns elsewhere. The drill runs Tom is seeing in the viewer are the
canon.

Two other diff classes appeared, neither of them flattening:

- **Cosmetic character renames in scenes 7–9**, identical on 21 courses: `Barista → Cafe
  Barista`, `Customer 1 → Cafe Customer 1`, `Customer 1 → Bar Customer 1`, `Customer 1 → Diner
  1`. Same speaker, disambiguated name — this is what lets the cast key a distinct voice per
  venue. Not a defect.
- **`hrv_for_eng` has 15 extra diffs in scenes 1–5**: `Sarah → Learner` (13 lines) and
  `Passenger → Fellow passenger` (2). Croatian alone; those are the genuinely interleaved
  scenes 1–14, so this one *is* flattening-shaped and is worth a separate look — but it is
  outside Italian and outside the paused render. Flagging, not fixing.

## The thing that actually needs your decision

The paused Italian re-render (job b8ea5db0 / #360, dryrun log
`docs/pods/ita_for_eng-pod-1-off-role-rerender-2026-08-24-dryrun-log.json`) targets **22 clips
across 11 rows in scenes 16, 17 and 21** — and those 11 rows are *precisely* the 11 lines
above. It re-voices them from Ara/Olivia to Enzo/Tom, i.e. it makes the 60d19bc1 attribution
audible.

So the render does not touch scenes 18 or 19 at all, and it touches exactly one line in scene
16 — the one you'd have to overrule the canon to keep as Staff.

The fork:

- **A. Proceed.** Accept 60d19bc1 as a deliberate improvement on the canon: these 11 lines
  genuinely read as another party, a second voice makes the chunks less monotonous, and the
  canon itself says a second voice here *"is a free choice"*. £-cost is 22 clips.
- **B. Cancel the render and revert 60d19bc1.** Hold the canon literally: these are the
  learner rehearsing both halves of an exchange, one voice, as Aran shipped it.

My read: **A**, and the canon's own sentence licenses it — Aran ruled the data doesn't
*dictate* a second voice, not that a second voice is wrong. But it is a taste call about how
the drill sounds, and it's yours. Either way nothing is blocking on a defect, because there
isn't one.

## Method

- Live rows: `listening_pod_sentences` where `pod_id = '<course>:pod-1'`, service-key read.
- Reference: `canonical_pod_scenarios` (`pod_slug='pod-0'`), cross-checked against
  `docs/pods/pod0-english-canonical.md` and `docs/pods/pod0-aran-original-2026-08-06.txt`.
- Text normalisation for the match: lowercase, strip non-alphanumerics, collapse whitespace.
- Scope confirmation of the paused render: its own dryrun log, 22 clips / 11 rows / scenes
  16,17,21.

### Explicit gaps

- Aran's original file has **no speaker data**, so no comparison can settle attribution
  against him directly. The `pod0-english-canonical.md` header is the highest authority that
  exists, and it is an agent's write-up of his verbal ruling with his words quoted inside it.
- `content_audit_log` was not read or written — the 242-row figure is from the committed
  reattribution dryrun/applied logs, not re-verified against the table.
- The `hrv_for_eng` scenes 1–5 anomaly is reported, not investigated.
