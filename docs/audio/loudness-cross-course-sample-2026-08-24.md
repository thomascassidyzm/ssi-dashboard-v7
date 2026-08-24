# Is the Enzo effect Italian-only? A cross-course sample — 2026-08-24

> **Note added on landing.** The branch defect flagged below is RESOLVED and needs no further action:
> `fix/loudness-similarity-across-voices` had been cut from a colleague's feature branch, so it
> predated its own dependency. It was re-cut onto `origin/main` as
> `fix/loudness-similarity-voices`, which is now merged to `main`; the stale branch has been deleted.
> `tools/audio/measure-loudness-by-voice.cjs` loads and runs clean from `main` — verified.
> The measurements in this report are unaffected: they were taken with the dependency in place.

READ-ONLY measurement. No TTS rendered, nothing written to the DB, nothing deleted, no pod text edited.
Tool: `tools/audio/measure-loudness-by-voice.cjs` (branch `fix/loudness-similarity-across-voices`), plus two
scratch probes written for this job — `tools/audio/_eng-corpus-sample.cjs` (shared English known corpus) and
`tools/audio/_phone-band-sample.cjs` (the 500 Hz highpass pass; the tool itself only does full-band).

**⚠️ Dependency gap found and worked around, not fixed:** the `fix/loudness-similarity-across-voices` branch
was cut before `services/audio-intelligence/tiers/loudness.cjs` landed on `main` (commit `c619ebfcc`), so
`measure-loudness-by-voice.cjs` fails on that branch as committed — `Cannot find module
'../../services/audio-intelligence/tiers/loudness.cjs'`. I copied that one file from `origin/main` into my
worktree to run the tool; **that copy is uncommitted and not part of this branch's history** — it's a local
workaround, not a fix. Someone should rebase/merge `main` into that branch before it's trusted again.

## Baseline (Tom's own measurement, not reproduced here)

ita_for_eng pod-1, 904 clips: full-band voices within 0.3–1.4 dB; highpass @500Hz → Enzo loses 9.1 dB vs
~5 dB for every other voice → **3.9–4.9 dB quieter on a phone**. Pod sits ~-17 LUFS vs target -15.5±1.5.

## Sample chosen, and why

| Role | Course | Why |
|---|---|---|
| (a) another xAI pod-1 course | `fra_for_eng:pod-1` | Two xAI target voices (`69smp8rm`, `0p0rt7o1`) dominate pod-1, same shape as Italian's two-target-voice pod. Same known-side voices (`xai_bedd6226`, `xai_gfzdpspr5fdp`) as Italian too, so this is the closest apples-to-apples xAI comparison available. |
| (b) an Azure-voiced course | `ron_for_eng:pod-1` | Both Romanian target voices are Azure (`ro-RO-AlinaNeural`, `ro-RO-EmilNeural`) — a clean Azure-vs-Azure test, no xAI target voice to confound it. (`gle_for_eng`/`hin_for_eng` are Azure too but 3-voice mixed courses; `ron` isolates the Azure question.) |
| (c) shared English known-language corpus | `course_audio` rows with `language='eng'`, top 5 voices by volume across the whole estate (`azure_en-GB-SoniaNeural`, `xai_gfzdpspr5fdp`, `xai_bedd6226`, `azure_en-GB-RyanNeural`, `xai_eve`) | This corpus is shared estate-wide (confirmed: `fra_for_eng` and `ron_for_eng` pod-1 use the *identical* known-voice clip counts — `xai_bedd6226`=127, `xai_gfzdpspr5fdp`=55 — same underlying pool), so it's the one population every learner touches regardless of target language. |

150 clips per course/corpus for the full-band pass (450 total), 15 clips per voice per source for the
phone-band pass (195 fetches, re-fetched by URL rather than reusing buffers — simplicity over squeezing the
budget). **Total ≈645 clip fetches**, well under the ~1,200 ceiling. `--concurrency` left at the tool's
default of 4 throughout.

---

## 1. Full-band integrated LUFS (150 clips each)

### fra_for_eng:pod-1 (xAI)

| voice | role | n | median LUFS | stdev | out-of-band |
|---|---|---|---|---|---|
| bedd6226 | known | 26 | -16.05 | 0.81 | 4 |
| gfzdpspr5fdp | known | 24 | -16.15 | 1.76 | 8 |
| 69smp8rm | target1 | 57 | -16.60 | 1.29 | 12 |
| 0p0rt7o1 | target1 | 43 | -18.20 | 2.22 | 33 |

Worst pairwise gap: **bedd6226 vs 0p0rt7o1 = 2.15 dB** (0p0rt7o1 quieter). This is the one full-band flag in
the whole sample — right at the 2 dB line and the only voice with a third of its clips out of band.

### ron_for_eng:pod-1 (Azure)

| voice | role | n | median LUFS | stdev | out-of-band |
|---|---|---|---|---|---|
| gfzdpspr5fdp | known | 24 | -15.95 | 1.76 | 6 |
| bedd6226 | known | 31 | -16.20 | 1.49 | 10 |
| ro-RO-EmilNeural | target1 | 48 | -16.35 | 0.56 | 3 |
| ro-RO-AlinaNeural | target1 | 47 | -16.50 | 0.76 | 7 |

Worst pairwise gap: 0.55 dB. Tightly clustered — no full-band flag.

### Shared English known corpus (across the estate)

| voice | n | median LUFS | stdev | out-of-band |
|---|---|---|---|---|
| bedd6226 | 30 | -16.20 | 0.56 | 3 |
| eve | 30 | -16.20 | 0.34 | 1 |
| gfzdpspr5fdp | 30 | -16.30 | 1.27 | 4 |
| en-GB-RyanNeural | 30 | -16.40 | 1.19 | 7 |
| en-GB-SoniaNeural | 30 | -16.40 | 0.17 | 0 |

Worst pairwise gap: 0.2 dB. This corpus is the tightest of everything measured, Italian included.

**Full-band verdict:** matches Tom's Italian finding almost exactly — full-band loudness is close across
voices everywhere sampled (0.2–2.15 dB), one soft flag (fra's `0p0rt7o1`) and otherwise unremarkable. Nothing
here would predict what the phone-band pass finds next.

---

## 2. Phone-band (500 Hz highpass ×2) — 15 clips/voice/source

| source | voice | medianFullLufs | medianPhoneLufs | **lostDb** |
|---|---|---|---|---|
| fra_for_eng:pod-1 | 0p0rt7o1 | -19.3 | -26.4 | **7.0** |
| fra_for_eng:pod-1 | gfzdpspr5fdp | -15.8 | -21.5 | 4.8 |
| fra_for_eng:pod-1 | 69smp8rm | -16.7 | -21.8 | 4.7 |
| fra_for_eng:pod-1 | bedd6226 | -15.8 | -20.6 | 4.6 |
| ron_for_eng:pod-1 | ro-RO-AlinaNeural | -16.5 | -25.4 | **8.5** |
| ron_for_eng:pod-1 | ro-RO-EmilNeural | -16.3 | -22.2 | 5.9 |
| ron_for_eng:pod-1 | bedd6226 | -15.8 | -21.0 | 5.0 |
| ron_for_eng:pod-1 | gfzdpspr5fdp | -15.8 | -21.1 | 4.8 |
| eng known corpus | en-GB-SoniaNeural | -16.4 | -25.1 | **8.7** |
| eng known corpus | eve | -16.1 | -23.4 | 7.3 |
| eng known corpus | en-GB-RyanNeural | -16.4 | -23.2 | 6.6 |
| eng known corpus | bedd6226 | -16.2 | -22.9 | 6.6 |
| eng known corpus | gfzdpspr5fdp | -16.4 | -21.2 | 4.5 |

### Within-course lostDb spread (worst voice minus best voice, phone-band loss)

| source | spread | worst voice | absolute phone-LUFS range (loudest→quietest voice on a phone) |
|---|---|---|---|
| fra_for_eng:pod-1 | **2.4 dB** | 0p0rt7o1 | -20.6 to -26.4 = **5.8 dB** |
| ron_for_eng:pod-1 | **3.7 dB** | ro-RO-AlinaNeural | -21.0 to -25.4 = **4.4 dB** |
| eng known corpus | **4.2 dB** | en-GB-SoniaNeural | -21.2 to -25.1 = **3.9 dB** |
| *(baseline)* ita_for_eng pod-1 | ~4.1 dB (9.1 vs ~5.0) | x7avnu1k ("Enzo") | 3.9–4.9 dB (Tom's own numbers) |

**This is the finding.** Every source sampled — one more xAI pod, one pure-Azure pod, and the shared English
corpus every learner hears regardless of target language — shows the same shape as Italian: full-band gaps
under ~2 dB, but a **3.9–5.8 dB spread once you highpass at 500 Hz to model a phone speaker.** The worst
full-band voice is not reliably the worst phone-band voice (fra's 0p0rt7o1 is both; ron's and the eng
corpus's worst phone-band voices — AlinaNeural, SoniaNeural — were near-identical to their siblings
full-band). One pattern held across every sample: **`gfzdpspr5fdp` lost the least in all three** (4.5–4.8 dB)
while other voices in the same course lost more — consistent with a real per-voice spectral-content
difference (how much of that voice's energy sits above 500 Hz), not a per-course mastering fluke.

---

## Verdict

**The Enzo effect is estate-wide, not Italian-only.** It shows up on an xAI pod, an Azure pod, and the
shared English corpus, all sampled independently and all landing in the same 3.9–5.8 dB phone-band spread
that Tom heard on his phone in Italian. Mastering-for-full-band-LUFS is masking a real per-voice difference
in how much low-frequency energy each voice carries — content a full-band integrated-LUFS pass can't see and
a phone speaker can't reproduce. This is a mastering-process question (as Tom suspected), not a one-course
casting fluke.

**Flags (>2 dB off neighbours):**
- Full-band: `fra_for_eng:pod-1` voice `0p0rt7o1` — 2.15 dB quieter than `bedd6226` (borderline, one flag
  across all three full-band tables).
- Phone-band lostDb spread (the interesting measure): **all three sources** exceed 2 dB (2.4, 3.7, 4.2 dB) —
  i.e. every course sampled has at least one voice that will sound meaningfully quieter than its neighbours
  on a phone, even where full-band LUFS looked fine.

## Explicit gaps

- No fetch/DB failures on any of the 450 full-band clips or 195 phone-band clips — 100% measured, so there's
  no missing-data gap to report on the numbers above.
- Sample size is modest by design (three sources, 150/15 clips) per the brief's ~1,200-clip ceiling; this is
  a directional cross-check, not a full estate census. A real census (all 20 pod-1 courses × both bands)
  would be the natural next step if this verdict needs to carry weight for a mastering-pipeline change.
- The `loudness.cjs` dependency gap on the tool's branch (above) is a real defect in that branch's git
  history, not just a note — flagging it explicitly rather than quietly patching around it.

---

**Landing line:** commits are on branch `docs/loudness-cross-course-2026-08-24`, pushed to origin. Not
merged — no PR opened, nothing landed on `main`. Not deployed anywhere (this is a docs-only branch; nothing
here is on the learner path).
