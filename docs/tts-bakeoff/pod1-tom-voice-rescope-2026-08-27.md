# Pod 1, your voice — the real number

**2026-08-27.** Rescoped against the new Pod 1 structure only. **No legacy pod clip has been counted or touched**, per your 2026-08-23 ruling that Pod 1 replaces all pods with zero remediation on the old ones.

**Your estimate was right, and comfortably so: 91 lines per pod, not 120.**

| | |
|---|---|
| Pod 1 languages | **22** — 21 live, 1 held (`deu_at_for_eng`) |
| Lines per pod | **231**, exactly, in every one |
| **Your lines per pod** | **91** — 140 in `hrv_for_eng`, see below |
| **Total across all 22** | **2,051 lines** |
| **Characters → credits** | **96,067 ≈ 96K credits** |

**96K credits against 1.25M included per month — under 8% of one month's allowance for the entire estate's Pod 1.** The rejected scope was 2.71M. This is 28× smaller, and it is small enough that the cost is no longer a factor in the decision at all.

Every one of the 2,051 lines already has an existing `known_audio_id`, so there are no gaps to fill — this is a straight replacement of audio that exists.

---

## The 22 languages

`ara_eg` · `ara` · `deu_at` *(held)* · `deu` · `eus` · `fra_ca` · `fra` · `gle` · `hin` · `hrv` · `isl` · `ita` · `jpn` · `kor` · `nld` · `por_br` · `por` · `ron` · `spa` · `spa_mx` · `swe` · `zho` — all `_for_eng`.

---

## One correction worth having before you fire it

**You described the split as male/female, and that is very nearly right — but gender is not what actually selects your lines, the voice assignment is, and the two disagree.**

Each pod's `speakers` map gives every character both a `gender` and a `known` voice. In `spa_for_eng` there are **80 male-gendered lines but 91 carrying your voice**. The mismatch runs both ways:

- `Staff` and `Interlocutor` have **no gender set at all**, and both are voiced by you — 11 lines.
- `Diner 2` and `Bar Customer 2` are **gender `m` but voiced by Olivia** (`bedd6226`).

So the manifest selects on `speakers[<speaker>].known.voice_id`, not on gender. Selecting by gender would have missed 11 of your lines per pod and wrongly grabbed a few of Olivia's.

**And that is what explains `hrv_for_eng` at 140 rather than 91**: in Croatian the cast is inverted — the Learner, who speaks 81 of the 231 lines, is male there and female everywhere else. It is not an anomaly in the data, it is a genuinely differently-cast pod.

---

## Staged, not fired

`tools/tts-bakeoff/pod1-tom-voice-manifest-2026-08-27.json` — every one of the 2,051 lines by `sentence_id`, with its speaker, character count and current `known_audio_id`, grouped by course. That is the work-list.

**Nothing renders until you press it in popty.app.** No queue entry, no schedule, no pre-flight.

**The two rails this still sits under**, unchanged by the smaller size:
- **Make-before-break** — render and verify the new clip before the old one is touched, links swapped atomically, nothing deleted until its replacement is verified alive and correct-voiced.
- **The pod migration protocol** — this replaces audio under unchanged text, which is the benign case, but pod progress is filed by slot and it goes through `docs/pods/pod-migration-protocol.md` rather than around it.

**My recommendation on order:** one language first — `spa_for_eng` — listened to end to end before the second one starts. At 91 lines that is a few minutes of listening, and it is the cheapest possible way to find out that the voice, the locale handling or the relink is wrong. Then the remaining 20 live pods. `deu_at_for_eng` is held, so it waits on its own visibility rather than on this.

---

## What is not in here

No legacy clips, counted or touched. The `pod_explainer` and `pod_fine_known` populations I scoped previously are out of scope entirely and both manifests remain rescinded. Nothing in this document depends on them.
