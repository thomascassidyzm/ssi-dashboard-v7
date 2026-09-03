# Pod-0 recast: stopped at the verification step, because the cast is already right

**13 Aug 2026.** You ruled this morning: recast pod-0 to Eve + the clone first, verify the cast,
then render. I did the verification first, before touching anything. **It does not hold up.**

**Nothing was recast. Nothing was rendered. No audio generated, no spend, no rows written.**

The audit that produced the recast decision made a **track-attribution error**. The
"wrong-language Azure voices in pod-0's English cast" are not in the English cast. They are each
the correct voice of the *learner's own language*, on the other track of the same pod.

Recasting on that basis would have replaced a correct cast with a different one, moved the
approval fingerprint on all 60 courses, and fixed nothing.

---

## The one-line refutation

Course codes are `<target>_for_<known>`. So for `eng_for_pan`, **English is the target track and
Punjabi is the known track**. The audit read the known track and called it English.

Every voice it named is the **male voice of that language's own pool** in
`app_config.pod_voice_pools` — I checked all nine:

| Voice the audit called "wrong-language, in the English cast" | What it actually is | Where it sits |
|---|---|---|
| `pa-IN-OjasNeural` | the **Punjabi** pool's male voice | `eng_for_pan`, **known** track |
| `si-LK-SameeraNeural` | the **Sinhala** pool's male voice | `eng_for_sin`, known track |
| `ur-PK-AsadNeural` | the **Urdu** pool's male voice | `eng_for_urd`, known track |
| `ja-JP-NaokiNeural` | the **Japanese** pool's male voice | `eng_for_jpn`, known track |
| `bn-IN-BashkarNeural` | the **Bengali** pool's male voice | `eng_for_ben`, known track |
| `gu-IN-NiranjanNeural` | the **Gujarati** pool's male voice | `eng_for_guj`, known track |
| `ta-LK-KumarNeural` | the **Tamil** pool's male voice | `eng_for_tam`, known track |
| `pt-PT-DuarteNeural` | the **Portuguese** pool's male voice | `eng_for_por`, known track |
| `fr-FR-HenriNeural` | the **French** pool's male voice | `eng_for_fra`, known track |

Not one of them speaks a line of English. Each is speaking to the learner in the learner's own
language, which is what it is for. The "~106 lines each" the audit reported is simply the
male-speaker share of a 142-line pod's known track.

## What the English cast actually is

Resolved through the generator's own `resolvePodSpeakerVoice()`, for the English track
specifically, across all 106 pod-0-family pods:

| Voice | English slots |
|---|---|
| `xai:gfzdpspr5fdp` — **Tom's clone** | 11,546 |
| `xai:bedd6226` — **Olivia** | 5,490 |
| `human:*_cym_n` / `*_cym_s` — Aran & Catrin Lliar (real Welsh recordings) | 462 |
| `azure:en-GB-SoniaNeural` | 6 — and only in `zzz_test_for_eng`, a test course |

**Zero Azure voices in a non-English language. Zero uncast English slots on any real course.**

And clone + Olivia are not an accident: they are the **top male and top female pick of the `eng`
pool** in `pod_voice_pools`. The cast is what the pool says it should be.

### The "224 lines with no cast at all"

There are **244** slots with no cast entry: **232 are `fin_for_eng`'s Finnish *target* track** —
a real gap, but Finnish, and outside pod-0-English scope — and **12 are the `zzz_test_for_eng`
test course** (6 target, 6 known). Only those 6 test-course slots touch the English track, and
they fall through to `en-GB-SoniaNeural`, itself an English voice. **None are on a real course's
English track.**

*(Flagging the Finnish one separately: `fin_for_eng` pod-0 has no target casting at all. Not mine
today, not touched.)*

### "Eve is missing entirely"

Eve is present — 1,325 slots — but as a **multilingual target-language voice**, cast across 19
locales (`de nl fr tr hi ar th ja pl ko zh es-ES es-MX sv pt-PT pt-BR it da ar-EG`).

**Eve is never cast with an English locale, and Eve is not in the `eng` voice pool at all** —
neither the female nor the male list. So "Eve is missing from the English cast" is literally true,
but it is not a defect: Eve has never been an English voice on this estate. The English female
voice is Olivia.

That makes "recast to Eve + clone" a **replacement of Olivia by Eve**, not a repair. It may be
something you want — Eve is multilingual and could carry English — but it is a taste decision
about who the English female voice is, not a fix to a broken cast. **That one is yours, and it is
the only thing here I've held.**

---

## The numbers do not reconcile either

| Figure | Audit said | Live today |
|---|---|---|
| Courses in scope | 57 | **67** have a pod-0 pod; **60** have an English track |
| Pods | 109 | 109 total, of which **106** are pod-0-family |
| Empty pod-0 English slots | 680 | **5,687** |
| Distinct texts to render | 251 | **290** distinct English texts with ≥1 empty slot |

**Where 680 probably came from.** #415 swept every combination of pod slug × course direction ×
track and found **no scoping that reproduces 680 or 251**. The closest match in the whole table is
`track=target, EMPTY → 679 distinct texts` — the count of distinct **non-English target** texts
with an empty slot, across all pod-0 pods. So even the render volume in the plan looks like the
*other* track: the target-language build, counted as if it were English.

Seven courses have **no English track at all** and are wrongly inside any "pod-0 English" scope:
`cat_for_spa`, `eus_for_spa`, `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`,
`zho_for_jpn`.

---

## The real defect, which is a different one

The cast is right. **The clips are stale.** Of the English pod-0 slots that have a clip linked:

| | slots |
|---|---|
| linked, and the clip's voice **matches** the cast | **591** |
| linked, but the clip's voice **differs** from the cast | **5,972** |
| empty | 5,687 |

**Only 4 of 60 courses are fully on-cast.** The off-cast clips are old renders in voices the cast
no longer names:

```
2171 leo            613 en-GB-Libby     228 bedd6226      18 en-GB-Thomas
2162 en-GB-Sonia    303 en-GB-Ryan      159 eve           13 aran_cym_n
                    272 en-GB-Hollie     29 gfzdpspr5fdp   4 en-GB-Alfie
```

This is the same pattern the T-14 rebuild found in Spanish on 11 Aug — "only 16 of the 119 Spanish
target clips were rendered on the two-voice cast at all." It is estate-wide on pod-0 English.

So the job is not *recast then render*. It is **re-render the 5,972 off-cast clips and fill the
5,687 empty slots, against the cast that is already correct** — make-before-break, per
`AUDIO_PIPELINE_ARCHITECTURE.md` §6b, since 5,972 of those are live clips a learner hears today.
That is a materially bigger and more expensive job than the one approved, which is exactly why I
have not started it.

---

## Why I stopped rather than pushed on

Your brief said: if verification turns anything up that doesn't match the prior audit's numbers,
stop and report. Every Group A claim in that audit turned out to be a track-attribution error, and
none of the four scope numbers reconcile. Recasting would have been an irreversible write across
60 courses to fix a defect that isn't there.

The render is also still gated: `app_config.pod_voice_approvals` is `{}` — **no course has ever
been approved**, so the sample-first gate refuses all of them regardless.

**Independently verified.** A second worker (**#415**) was briefed adversarially — told to refute
me and to say plainly if the audit was right and I was wrong. Working from the database on its own,
it reproduced every figure exactly: clone 11,546 / Olivia 5,490 / Welsh humans 462 / 6 test-course
slots on the English track; all nine named Azure voices on the **known** track of their matching
`eng_for_X` course with `isEnglishTrack=false` across 981 slots; 244 uncast slots split 232 Finnish
/ 12 test. It did not find a single point in my favour that the data does not carry.

It died on an API error while writing its prose report, after the analysis was complete — the
findings above are recovered from its transcript, not from a summary it wrote.

**One thing it found that neither the audit nor my brief named:** the two Welsh courses cast the
*same human voice* on both tracks — Catrin (`human_catrinlliar_cym_*`) and Aran speak both the
Welsh target and the English known. That is almost certainly deliberate for human-recorded Welsh,
and it puts `cym_n_for_eng` / `cym_s_for_eng` outside TTS scope altogether (the chokepoint's
`assertNotHumanVoiceCourse` refuses them). Worth knowing before anyone counts them into a render.

---

## What I need from you

**1. Is Eve the English female voice, replacing Olivia?** She isn't today and never has been —
she's a target-language voice across 19 locales, and the `eng` pool says Olivia. If you want Eve
in English that's a real recast of 60 courses and I'll do it; if "Eve + clone" was written from
the same mistaken audit, the cast needs no change at all. *My read: leave it — the cast matches
the pool, and nothing in the estate documents Eve as English.*

**2. The actual job is ~11,659 English pod-0 clips** (5,972 off-cast replacements + 5,687 empty
slots), not the 1,128 approved, and 5,972 of them are make-before-break replacements of live
audio. *My recommendation: approve one course end-to-end through the sample gate first — hear the
clone-and-Olivia two-hander, confirm it's the sound you want — then let the rest follow that
shape. That's the cheap way to find out whether the remaining 11k renders are the right 11k.*

---

*Evidence: `docs/pods/pod0-recast-halted-2026-08-13/` (also in `scripts/pod0-recast-2026-08-13/` in the Popty checkout) — the cast census, the
generator-faithful per-sentence resolution, the uncast-slot breakdown, and the cast-vs-clip
comparison, with the per-course table in `cast-vs-clips.json`.*
