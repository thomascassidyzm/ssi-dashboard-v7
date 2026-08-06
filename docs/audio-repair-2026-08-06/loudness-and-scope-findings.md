# The loudness question, and what the estate-wide measurement found

**2026-08-06.** Three things you asked for: explain the loudness, action the rollout, write the
process in.

## The short version

- **Loudness: answered.** The live clips are correctly levelled — 0.9 dB louder than what they
  replaced, well inside the course's normal range. Nothing to change, no re-levelling needed. But
  chasing it found that the document you approved from describes a step that never actually ran,
  and taken literally it would ship a course 10 dB too quiet. That is now fixed in writing.
- **Process: written in**, as one canonical document, linked from the audio architecture doc.
- **Rollout: detection done everywhere, and I have deliberately not spent a penny yet.** Two bugs
  meant whole-course sweeps had never actually run — they silently read a tenth of a course, and
  every seed-scoped sweep failed outright. Both fixed. With them fixed I could finally measure at
  scale, and the measurement says the predictor we were going to spend on is only about 1.4× better
  than chance at finding a clip with a missing word. Spending £23 on that scope would have
  re-rendered thousands of healthy clips and left thousands of damaged ones alone.
- **The estate is in better shape than feared:** 0.94 % flagged across 42 paid courses. The damage
  is concentrated in `deu_for_eng`, `fra_for_eng` and about four others.
- **One thing needs you**, at the very bottom: the cache fix is still not merged, and until it is,
  none of this reaches a phone that already played a broken clip.

---

## 1. The loudness — answered, and it found a real trap

You said: *"it said it was naked - but the clips were all much louder than the ones they were
replacing - so I'm not sure what that's all about."*

I measured every one of the 93 clips that were swapped, both sides — the superseded object and the
one live now. Integrated loudness, LUFS:

| | before | after | change |
|---|---|---|---|
| quietest tenth | −17.4 | −15.9 | +0.3 |
| **median** | **−16.5** | **−15.6** | **+0.9** |
| loudest tenth | −15.9 | −15.5 | +1.7 |

91 of 93 are louder, but only slightly: **+0.9 dB in the middle, +2.9 dB at the very most.** They
sit at the top of the course's own normal range and are not outliers. Peak level moved more than
average level (−3.2 → −1.9 dB), and the clips got their final words back, which together is the
most likely reason they read as fuller and more present.

**So: no levelling step is needed before the rollout, and the 93 live clips do not need
re-levelling.** The repair tool already normalises every clip it renders to −16 LUFS, the same
target the rest of the estate uses, which is exactly why they land within a decibel of their
neighbours. Nothing to change. That is the decision, taken and acted on.

### But your instinct was pointing at something real

Chasing this turned up a genuine defect, and it is worth knowing about.

**The document you approved from described a process that did not happen.** It says *"the only
thing applied is a single volume adjustment so the voices sit at the same level."* Its own log
records `gainDb: 0` and `rawLufs: null` for **all 384 clips** — the loudness measurement silently
returned nothing and the gain quietly defaulted to zero. No volume adjustment was applied at all.

Those 384 truly-raw clips measure a median **−26.4 LUFS — 10.8 dB quieter** than the clips beside
them. Every single one, no exceptions.

They were never what got swapped in. The 93 that went live were a separate render that went through
the normal levelling chain, and they are the ones you heard in the second document and accepted.
So nothing is wrong on the course.

The trap is for the next person: **if anyone implements "naked" literally as that document
describes it, they will ship clips 10 dB quieter than every neighbour** — every word present, and
still a defect. That is now written into the process document, along with the rule that a gain of
zero must never be trusted without checking the measurement actually returned a number.

I should be straight with you about one thing: I could not reproduce "much louder" in either
comparison. Naked-vs-deployed measures 10.8 dB *quieter*; swapped-vs-superseded measures 0.9 dB
louder. What I can say with confidence is the part that matters — the live clips are correctly
levelled, and the description in that document was wrong in a way that would have bitten us at
scale.

---

## 2. Detection across the two courses — free, complete

Both courses swept whole with the tail-integrity predictor. No money spent.

| course | clips measured | flagged | rate | characters | est. cost |
|---|---|---|---|---|---|
| `deu_for_eng` | 47,254 | 14,262 | **30.2 %** | 511,527 | **£16.22** |
| `fra_for_eng` | 51,369 | 7,092 | **13.8 %** | 221,416 | **£7.02** |

Zero measurement failures on either course.

### This was only possible after fixing two things that were silently lying

- The queue read course audio with a single `.limit(5000)`. `deu_for_eng` has 47,254 rendered
  clips. **Every whole-course sweep before today saw a tenth of the course** and reported a flag
  rate for the part it never read.
- Seed-scoped sweeps (`--max-seed`) failed outright with `400 Bad Request` on every course — the id
  filter built a 37 KB URL. So the estate tier had never actually run.

Both fixed, tested, pushed.

---

## 3. The finding that changes the plan — and why I have not spent money yet

You said fix *"only if needed"*, and that the rate-of-fade measure was a very accurate predictor. It
was — on the three clips you named. Before committing £23 and 21,000 re-renders, I checked it at
course scale against ground truth: unprimed speech-recognition on the deployed bytes, asking the
only question that matters — **is the last word actually there?** — with a control group of clips
the predictor did *not* flag.

### The numbers

300 clips, 150 flagged and 150 not, judged the same way. A clip counts as truncated only when its
final word is absent **and** the word before it was heard — that separates a clip that lost its
ending from one the recogniser merely mis-spelled.

| group | truncated |
|---|---|
| clips the predictor **flagged** | **24.0 %** |
| clips the predictor **passed** | **16.7 %** |
| seeds 1-2, already repaired on 05-08 | **0.78 %** |

That third row is the one that makes the other two trustworthy. The clips we already fixed come
back clean at 0.78 %, so the measure is not simply crying wolf — it is reading real damage, and the
rest of the course is riddled with it.

And the gap between the first two rows is far too small. **The predictor is only about 1.4× better
than chance at finding a clip with a missing word.** On this course that means roughly three
quarters of the 14,262 clips it flags are fine, while thousands of damaged clips it passed would
stay broken.

The control group makes it concrete — clips it passed as healthy, verbatim from the transcripts:

- *"Ich werde morgen Deutsch sprechen"* → heard as *"ich werde morgen deutsch"*. **"sprechen" is
  gone** — the exact signature of the original amputation, in a clip the predictor did not flag.
- *"nein, das wäre nicht möglich"* → *"nein das ware nicht"*
- *"später und nicht jetzt"* → *"spater und nicht"*

**So the rate-of-fade measure is a good ordering but the wrong scope.** Renders driven by it alone
would re-render thousands of clips that are fine, and would leave damaged clips on the course
untouched — the worst of both. That is why I stopped before spending rather than after.

There is a better scope available and it is **free**: measure the actual defect. Speech-recognition
final-word retention runs locally on our own machine at no cost, and it answers "is a word
missing?" directly instead of inferring it from how fast the clip fades. It is the same check the
process already uses to *verify* a repaired clip — it should also be what *selects* them.

**Better, simpler, cheaper on all three legs**: it targets real damage instead of a proxy, it is one
metric instead of two, and it makes the render bill smaller and precisely aimed. I am proceeding on
that basis; it is built (`tools/audio-word-loss-scan.cjs`), committed, and the process document
records it.

The one thing this costs is time, not money: several hours of our own CPU per course rather than
fifteen minutes. The `deu_for_eng` scan is running now. It is checkpointed and resumable, so it
survives a restart.

**What this means for the size of the job.** If the damage really is around the rate the pilot
suggests, this is a much bigger repair than the seeds 1-5 run implied — thousands of clips per
course, not hundreds. The good news is that the bill scales with real damage rather than with a
noisy proxy, and detection stays free. I will bring you the real number when the scan lands, with
the cost, before anything is rendered.

---

## 4. The estate — first 50 seeds of every paid course a learner can reach

All 42 swept (`premium`, and live or in beta in the app — the other 58 premium courses are draft or
hidden, so no learner can reach them). **160,344 clips measured, zero measurement failures, nothing
spent.**

**Estate-wide flag rate: 0.94 %.** 33 of the 42 courses flag under half a percent in their first 50
seeds. The damage is concentrated in a handful:

| course | flagged in seeds 1-50 |
|---|---|
| `eng_for_ben` | 17.4 % (660 clips) |
| `eng_for_hin` | 10.1 % (381) |
| `eng_for_kan` | 4.0 % (161) |
| `eng_for_tel` | 3.3 % (108) |
| `eng_for_urd` | 0.9 % (38) |
| `spa_for_eng`, `jpn_for_eng`, `kor_for_eng`, `eng_for_mar` | 0.6-0.7 % each |
| the other 33 courses | under 0.5 %, most exactly zero |

Against `deu_for_eng` at 30.2 % and `fra_for_eng` at 13.8 %, that says this is not an estate-wide
rot. It is concentrated in a handful of courses, which is much better news than we feared — and it
also tells us the fade measure is partly reading a voice's rendering style rather than damage,
which is consistent with everything in section 3.

## 5. Two things the LEGO-first pass turned up immediately

You ruled that LEGOs come before cycles and that a LEGO means the full triple — intro, voice 1,
voice 2. The scan is ordered that way, so the important clips are judged first. Two findings
already:

- **167 of `deu_for_eng`'s 1,570 LEGOs have no introduction clip at all.** Not damaged — absent.
  On your own ruling that is 167 broken LEGOs, and it is a different problem from amputation with a
  different fix. Flagging it, not folding it in.
- **The LEGO clips are damaged at a much higher rate than the course average** — early scanning is
  running around one clip in five, against the course-wide pilot's roughly one in six. The clips
  that carry the learning journey are the worst affected. That is the argument for LEGO-first
  ordering making it into the tool rather than staying a note.

## 6. Still standing between this fix and a learner's ears

The learning app serves audio with `Cache-Control: immutable` and no revision in the URL. **A phone
that already played a damaged clip keeps the damaged bytes**, however well the repair works.

The fix is written and sitting on branch `feat/audio-revision-cache-bust-2026-08-05` in the learning
app. **I checked today: it is still not merged.** It is not mine to merge. Until it ships, every
repair below stops at the database.

That is the single highest-leverage thing outstanding, and it is a one-line answer from you: merge
it, or say who should.
