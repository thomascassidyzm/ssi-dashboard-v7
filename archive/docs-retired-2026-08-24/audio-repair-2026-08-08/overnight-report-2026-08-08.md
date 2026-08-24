# French and German — the overnight run

**Both courses are finished.** French is voiced to round 1,529 and German to round 1,395 — the whole of each course, every round past 200 rebuilt tonight. Verified by re-planning each course end to end after the last band: French returns 36,178 clips satisfied and nothing left to render, German 34,442 and nothing left. Not "the bands reported done" — re-checked against the database afterwards.

**57,434 clips rendered for about $26.** One failure all night, and it is fixed.

---

## 1. The starting boundary — was "around 200" right?

Yes, in both, and measured against the live database rather than the notes.

| Course | Distinct clips in rounds 1-200 | Already voiced | Outstanding |
|---|---|---|---|
| French | 6,413 | 6,411 | 2 |
| German | 5,434 | 5,428 | 6 |

Your memory was exactly right.

**Rounds 1-200 were left alone.** You asked to finish the courses past round 200 and that is the scope that ran. Under your new reuse rule the pre-2026-08-05 clips in rounds 1-200 are suspect too, so there is a follow-up job there if you want it — but expanding scope at 3am was not mine to decide.

---

## 2. What your 02:02Z ruling changed

It changed the job completely, and it was the right call.

Before it, the outstanding work was almost all **English**: French wanted 6,684 known-side and 1,235 presentation renders against just 120 French-voice clips. The target-language audio counted as already done, so the night would have been an English top-up that left every damaged French and German clip in place.

Once the existing French and German clips stopped counting as a source, the job inverted. The work became overwhelmingly **target-side** — the actual French and German voices, re-recorded. That is the material you called bobbins, and it is now gone.

**How many old clips would have been reused under the old policy, and were replaced instead: 57,434.** That is the size of the damage this correction avoided, and it is essentially the whole of both courses past round 200.

It is implemented as a **date**, 2026-08-05 — the day the destructive post-processing was deleted — not as a switch. Two reasons. A clip written after that day ships exactly as rendered and is not suspect. And a blanket "never trust our own" would re-render the run's own fresh output every time a band restarted, re-buying the whole course on each resume. A distrusted clip still stays the swap target, so make-before-break holds throughout: same row id, bumped revision, no holder ever pointed at nothing.

---

## 3. The numbers

| | bands | rendered | free from other courses | relinked within course | failed | spend |
|---|---|---|---|---|---|---|
| French | 7 of 7 | 27,821 | 3,136 | 129 | 1 | ~$12.86 |
| German | 6 of 6 | 29,613 | 2,386 | 205 | 0 | ~$13.47 |
| **Total** | | **57,434** | **5,522** | **334** | **1** | **~$26.32** |

**5,522 clips came free** from other courses in the estate at the same voice — mostly `spa_for_eng`, then `fra_ca_for_eng` and a long tail of `eng_for_*`. Cross-course reuse grew as the run went deeper (French: 27 → 120 → 657 → 651 → 687 → 594 → 400) because later rounds introduce more English known-side lines the estate already owns.

The 334 "relinked within course" are not policy leaks. Each is a lego that was pointing at a pre-fix clip while a *post*-fix clip of the same text already existed — so the link moved off the bobbins version onto the clean one, at zero cost. The policy repairing something rather than spending.

---

## 4. Verification — none, and why

You ruled both whisper legs off: *"I do not think we need EITHER and here is why - the error rate is generally acceptable and always has been UNLESS we are using bad post-processing."*

That was right, and there turned out to be **three** whisper legs in this pipeline, not two:

| leg | switch |
|---|---|
| pre-publish veracity gate | `AUDIO_VERACITY_GATE=off` |
| sampled sweep over finished bands | removed |
| **xAI phonology gate** | `XAI_PHONO_GATE=0` |

The third is the one that matters and the one nobody had listed. It whispers every **non-English** xAI render to check for language drift — so on French and German target clips it fired on *every single one*. It held the run to **8 clips a minute**, landing in pairs every 13 seconds. With it off, the same run did **417 a minute. Fifty times faster.** It is also the gate that transcribes a correct French "je" as Turkish, so it was buying very little.

Zero whisper processes ran after 02:40. The gate **code** is untouched and every other job keeps its own defaults — these were environment settings on tonight's two instances only.

---

## 5. What failed

**One clip, all night:** French `comment tu t'appelles?`.

An interrupted swap writes its revision-history row and *then* updates the audio row, and the two are not atomic. A run killed between them orphans a history row, and every retry afterwards recomputes the same revision number and dies on the unique constraint — permanently. Not a transient: a poison pill, one per interrupted band, surviving every restart. Fixed by upserting the history row; both services were restarted onto the fix at band boundaries and nothing has failed since.

**27 clips are BLOCKED and were never renderable** — these are content gaps, not audio failures. Each is a LEGO with no authored presentation text, so there is nothing to say:

- French (24): S0171L02 S0280L02 S0311L02 S0324L03 S0333L02 S0351L01 S0358L01 S0376L03 S0396L04 S0405L02 S0407L03 S0408L05 S0414L02 S0424L02 S0426L04 S0493L01 S0499L04 S0541L02 S0558L01 S0562L02 S0562L03 S0604L03 S0605L02 S0621L02
- German (3): S0499L05 S0595L01 S0599L01

Phase 8 `/generate` authors intro text; running it for those legos then re-running the band would clear them.

---

## 6. Concurrency, and what actually binds

You said concurrency should go to the xAI limits rather than our own clamp. Two knobs, and only one of them was ours:

- the `/reuse-apply` ceiling of 8 was **our own arbitrary number** — now a configured bound;
- the real constraint is a **process-global semaphore inside `tts-service.cjs`**, default 4. Raising the endpoint number alone would have changed nothing, because every xAI call queues behind it.

Set to 8 per course, so 16 concurrent xAI requests. Measured: **417 clips/min** with French alone at 8 slots, **787 clips/min** combined at 16 — near-linear, so 16 sits at the knee rather than past it.

**xAI did throttle and nothing was lost: several hundred HTTP 429s, zero dropped clips.** That is only true because of a fix made first — 429 was classed as a fatal 4xx client error, so a rate-limited clip was **dropped rather than retried**. Pushing concurrency without that would have turned throughput straight into lost clips. 429 and 408 now retry on their own budget with a 4-second-base jittered backoff.

---

## 7. Open items

**The incumbent-listen follow-up is cancelled, not outstanding.** It was going to be the big open item — thousands of old clips nobody had heard. Under your ruling they were replaced regardless, so measuring their damage would have produced a number nobody would act on.

**Rounds 1-200 in both courses still hold pre-2026-08-05 audio.** Out of tonight's scope. If the same reasoning applies there, it is a further ~12,000 clips and roughly $5.

**27 blocked presentation clips** need intro text authored (list above).

**Three bugs fixed tonight are not in production.** They live on the branch and were verified against the live run, but popty.app on port 3465 still runs unpatched `main`:
- `/reuse-apply` logged *every* rendered clip as FAILED whenever a verdict came back unchecked — which includes any time whisper is missing, and whisper is off PATH on this box;
- 429 dropped clips instead of retrying;
- an interrupted swap poisoned its clip permanently.

The first two are worth merging on their own merits.

---

## 8. Two things I got wrong, since you will see them in the history

**I broke both snapshot trees.** Trying to hand-patch three divergent copies of the same files at 02:40, I spliced code badly and left two of them unparseable. I stopped, restored both to pristine, and moved everything onto one tested worktree. One tree beats three.

**A bug of mine made "is it finished?" unanswerable for twenty minutes.** My revised-since lookup paged the database without a stable sort, so pages overlapped and rows were silently skipped — the same course planned 3,750 clips as distrusted on one run and 0 on the next, with nothing rendered in between. The error direction was safe (it only re-renders clips that did not need it) but it made verification meaningless, which is worse. Fixed, and the final verification above was run on the corrected code.
