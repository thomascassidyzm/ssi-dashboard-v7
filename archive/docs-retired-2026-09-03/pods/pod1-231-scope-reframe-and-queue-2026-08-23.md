# Pod 1 regen queue, re-scoped to your ruling — 2026-08-23

**Your ruling, verbatim, that reframed this job at 20:26Z:** "ALL PODS ARE NOW 231 lines. All PODS are being replaced with the new 231 line POD 1." Everything below drops the old estate-wide 4,744 model and works only in the pods that are actually the new 231(ish)-line Pod 1, live today.

## Three-line summary

1. **The true regen number is 1,054 distinct clips**, not 4,744 — a 78% cut. It comes entirely from the 21 pods that are already the new 231/232-line format; every clip on an old 142-line pod is dropped, because those pods are being replaced wholesale, not recast.
2. **21 of 66 pods are already live on the new format** (17 came through a cutover + 4 were built fresh at the new size); **21 more have the replacement drafted and staged but not yet recorded/flipped**; the remaining 24 (16 `eng_for_*` + 7 known-language variants + Northern Welsh, held with no live pod at all) are outside this migration wave entirely.
3. The **1,898-clip "untouched divergence" pile is a non-issue under the reframe**: I re-ran the check scoped to only the 21 new-format pods and it comes back **zero** divergence clips — the whole pile sat on `eng_for_ben/guj/pan/tam/urd/sin` and other legacy 142-line pods, which leave the queue on the reframe alone. No audio download or F0 check was needed to resolve it.

Published doc: (link below, added after publish step)

---

## (a) Migration state — the map you don't currently have

Read live off `listening_pods` / `listening_pod_sentences`, reconciled against `docs/pods/*-pod-1-cutover-record-2026-08-22.md` and the isl hold record. No disagreement found between the DB and the cutover docs.

**Group 1 — LIVE on the new 231/232-line pod today (21 courses):**

| Course | Slug | Lines | How it got there |
|---|---|---|---|
| ara_for_eng, ara_eg_for_eng, deu_for_eng, eus_for_eng, fra_for_eng, hrv_for_eng, ita_for_eng, jpn_for_eng, kor_for_eng, por_for_eng, por_br_for_eng, ron_for_eng, spa_for_eng, spa_mx_for_eng, swe_for_eng, zho_for_eng | `pod-1` | 231 | Cutover 2026-08-22, old pod-0 archived as `-retired-2026-08-22` |
| cym_s_for_eng | `pod-0` | 231 | The 2026-08-22 pilot course (no retired predecessor — built straight at new size) |
| ara_sy_for_eng | `pod-0` | 232 | Built fresh at new size, no migration needed |
| deu_at_for_eng | `pod-0` | 231 | Built fresh at new size, no migration needed |
| fin_for_eng | `pod-0` | 232 | Built fresh at new size — **but the course is genuinely uncastable** (one ungendered human voice), deferred per standing ruling |
| fra_ca_for_eng | `pod-0` | 232 | Built fresh at new size, no migration needed |

That's 16 (cutover) + 5 (built-fresh) = 21. This matches your "17-course class… went through the 2026-08-22 cutover" almost exactly (16 cutover + cym_s pilot = 17); the other 4 (ara_sy, deu_at, fin, fra_ca) never needed a cutover because they launched directly at the new size.

**Group 2 — still on the OLD 142-line pod, live, with the 231/232-line replacement already drafted and staged but HELD (not recorded, not flipped) — 21 courses:**

bul, cat_for_eng, dan, ell, est, fas, gle, heb, hin, hye, **isl**, lav, lit, nep, nld, nor, pol, swa, tha, tur, ukr (all `_for_eng`).

Every one of these has a `pod-0-unrecorded` (or, for isl, a differently-shaped held companion) at 231/232 lines sitting ready. **isl is the one exception with a documented reason**: `docs/pods/isl-pod1-hold-decision-2026-08-22.md` — 10 of 231 target clips still fail the audio veracity gate after a real checker bug fix, so it was deliberately held rather than flipped on unverified audio. The other 20 have no documented blocker in `docs/pods/` — the map doesn't tell you WHY they haven't flipped yet, only that they haven't; that's a gap worth a one-line question to whoever owns the recording pipeline.

**Group 3 — still on the OLD 142-line pod, live, with NO replacement staged at all — 24 courses, outside this migration wave:**

- All 16 `eng_for_*` courses (English as the target language) — no 231-line successor exists for any of them.
- 7 known-language variant pods that are structurally separate from the migrated target pods: `cat_for_spa`, `eus_for_spa`, `deu_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn`.
- `cym_n_for_eng` — **has no live pod at all right now** (both `pod-0` and the archived `pod-0-gated` variant are `held`). Out of scope for this job by name (human-voiced Welsh, excluded per standing instruction) but flagged because it's a genuine anomaly worth Tom's attention independent of this queue.

## (b) The corrected regen number, in your units

Scope = the 21 live pods in Group 1 above (fin_for_eng included in the scope query for completeness but excluded from any cast recommendation — deferred, uncastable). Re-ran the collision/cast check restricted to exactly these 21 pod IDs.

**Total: 1,054 distinct `course_audio` clips** (969 caused by the recast + 85 pre-existing drift + **0** untouched divergence), replacing 4,744.

As a fraction of the pods actually in scope: 1,054 clips against ~4,850 total lines across 21 pods (231-232 lines each) ≈ **22%** in aggregate — squarely inside your 10-30% band.

Per pod (target-language track only; sorted descending; your band is 10-30%, flag >25%):

| Language/course | Pod lines | Clips queued | % of pod |
|---|---|---|---|
| **spa** (spa_for_eng) | 231 | 105 | **45.5%** ⚠️ |
| **fra_ca** (fra_ca_for_eng) | 232 | 80 | **34.5%** ⚠️ |
| hrv | 231 | 47 | 20.3% |
| ara, jpn, kor, spa_mx, swe | 231 | 44 each | 19.0% |
| por_br, por | 231 | 36 each | 15.6% |
| ara_sy | 232 | 34 | 14.7% |
| deu | 231 | 34 | 14.7% |
| ara_eg | 231 | 30 | 13.0% |
| deu_at, ita | 231 | 29 each | 12.6% |
| zho | 231 | 26 | 11.3% |
| fra, ron | 231 | 25 each | 10.8% |
| eus | 231 | 14 | 6.1% |

Plus a separate, non-pod-scoped row: the **English known-side track** (the narrator voice shared across all 19 castable pods' known-language track) queues **284 clips**, not attributable to any single pod's line count.

### The two languages over 25% — evidence, not narrative

**spa (45.5%)**: 98 of its 105 clips are one single voice move — `yis75yfp → es-ES-ElviraNeural` (a male xai voice to the cast's female Azure voice). Reading the applied cast (`listening_pods.speakers` for `spa_for_eng:pod-1`): the character **Anna** is cast female → Elvira, but 98 of her lines were delivered under `yis75yfp`, the voice cast for the male characters (Guest/James → Manuel). That is a genuine, single-character historical mis-cast being corrected, not adjacent-conversation noise — and the tool's own applied-log provenance already attributes it to `recast` (the verified zero-collision pass), not to `divergence`. The English-known-side spike (284, mostly `gfzdpspr5fdp → bedd6226`, i.e. Tom's clone → Olivia) is the **same character's** known-track lines, and shows up identically-shaped across every one of the 21 pods — one systemic historical mis-cast for "Anna" baked into the pod template before it was translated into every language, now corrected consistently everywhere. That is the "one bug, not sixteen histories" pattern you'd expect to see, just a different bug than Croatian's — this one is a genuine correction, already verified, not a solver artifact.

**fra_ca (34.5%)**: spread across four distinct voice-pairs (Antoine→Sylvie ×26, Antoine→Jean ×16, Jean→Sylvie ×16, Thierry→Jean ×11, Sylvie→Jean ×8, Thierry→Sylvie ×3) — consistent with `fra_ca_for_eng` being a course that launched straight at the new 232-line size and is getting its **first** cast pass now, not a recast of previously-good audio. A first cast pass touching a third of the pod is a different (and much less alarming) thing than a "recast" flipping a third of an already-good pod.

**My read: both are legitimate, evidenced corrections, not defects** — but they exceed your stated band and the evidence is a voice-move readout, not a listened-to clip, so I'm flagging rather than quietly waving them through.

**One word from you: trust these two, or do you want the `ara/jpn/kor/spa_mx/swe` 40-clip "Anna"-shaped moves (identical count, same voice-pair shape, across five otherwise-unrelated languages) spot-checked on audio before the regen runs?** My recommendation is trust — they're independently attributed to the already-verified recast pass, and the identical shape across languages is exactly what you'd expect from ONE character's historical mis-cast being fixed consistently in a shared pod template, not five coincidences.

## (c) Casting baked into the replacement path

Checked `tools/pods/pod-switchover.cjs`: it explicitly carries audio ids and cast **untouched** across a promotion — casting is a bolt-on step run separately (`tools/pods/pod1-percall-recast.cjs`) after a pod goes live, which is exactly why this queue exists at all: every future course that flips from its staged 231-line pod to live will need its own after-the-fact recast sweep, forever, unless the two are wired together.

**This is a real build, not a same-day fix** — it means adding a cast-solve step (the same `orientComponent()` logic already fixed today in `pod1-percall-recast.cjs`) into the switchover path, before the pod is written live, with its own tests. I have not attempted it in this job.

**One word from you: land this as its own job before the next 21 replacements flip?** My recommendation is yes — 21 courses are queued to go through exactly this switchover in the near future, and doing it once in the path beats running an estate-wide recast-then-requeue sweep 21 more times.

---

## Landing line

Commits on `feat/pod1-estate-recast-2026-08-23`: one commit adding this report and the scoped queue JSON (`docs/pods/pod1-recast-regen-queue-231-scope-2026-08-23.json`, `docs/pods/pod1-231-scope-reframe-and-queue-2026-08-23.md`). Pushed to `origin/feat/pod1-estate-recast-2026-08-23`. **Not merged** to `main`. **Not deployed** — this is a read-only audit; nothing it describes has been applied, no audio generated, no queue file consumed by phase-8.
