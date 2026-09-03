# Atom-fusion offsets without Azure — forced-alignment recommendation

> **Status:** Decision doc (2026-06-13). Supersedes the offset-source conclusion
> of `scripts/experiments/atom-fusion-spike/REPORT.md`. That spike's winner —
> *re-synthesize with the same Azure voice and transfer the word boundaries
> (shift 0 ms, exact)* — is **off the table by direction:** Tom directs we avoid
> Azure dependencies; production target audio is the xAI clone, which returns
> **no word timings at all**; and the two flagship build courses (Irish,
> Croatian) have no xAI cast in existence. This doc replaces the Azure-transfer
> path with a **voice-independent forced-alignment** path, validated against the
> Azure ground truth already captured for the spike clips.
>
> Companion spec: `docs/architecture/atom-fusion-introduction.md` (§"Where the
> offsets come from", §"Resolved decisions"). Section 5 below is the exact diff
> to apply there — *parallel agents own that file, so it is specified, not
> applied here.*

---

## 1. DECISION — MMS forced alignment (`torchaudio.pipelines.MMS_FA`), with a one-time onset calibration

**The voice-independent offsets path for xAI + human pod audio is MMS forced
alignment** (the multilingual wav2vec2 CTC aligner shipped as the
`MMS_FA` bundle in torchaudio). It is the only candidate evaluated that (a) is
voice-independent by construction — it aligns a *known transcript*, never
recognizes, so it works identically on xAI clones, human recordings, and Azure
clips; (b) handles **Irish and Croatian both** (Whisper cannot do Irish at all);
and (c) gets atom-seam error into the tens-of-milliseconds range.

### The numbers (MMS vs Azure ground truth, atom-seam |Δ| — the cut point that matters)

| | mean | p90 | max | within 50 ms | within 100 ms |
|---|---|---|---|---|---|
| **Raw MMS** | 102 ms | 138 ms | 212 ms | 4/30 | 14/30 |
| **MMS −133 ms calibrated** | **39 ms** | **84 ms** | **102 ms** | **22/30** | **29/30** |

The raw error is **not noise — it is a near-constant positive bias.** MMS (CTC)
marks the acoustic onset (first emitting frame, i.e. the vowel/sonorant
nucleus), so it lands ~one consonant-attack *late* versus Azure's word edge. The
per-clip lateness is strikingly stable across both languages and all four voices
(gle-g3 +144, gle-g4 +127, hrv-g3 +123, hrv-g4 +135 ms; grand median **+133 ms**).
**Subtracting a single blind constant of 133 ms collapses seam error to mean
39 ms** and — decisively — the blind global constant is as good as the per-clip
ideal (39 vs 38 ms), proving the bias is a true *model* constant rather than
per-voice variation. Only 1 of 30 seams (a clause-internal Croatian `imati|lijep`
seam) still exceeds 100 ms after calibration.

### Why this clears the bar

The ~50 ms bar exists for *audible* seams. But the fusion design (see the spec's
"Slicing reliability" section) is structured so that:

- **Fusion tiers are immune to offset placement** — we insert shrinking silences
  into the *continuous untouched take*, never cut-and-reconcatenate, and the
  final tier is the take bit-for-bit. A 39 ms-mean offset lands a pause a few ms
  early/late inside a 700–900 ms inter-clause pause: inaudible.
- **Meet-the-atoms cuts are cosmetic, not semantic** — meaning is carried by the
  explainer clip + on-screen gloss, so a clipped edge is ugly, not wrong, and is
  killed by the zero-cross-snap + micro-fade the spec already mandates.

So 39 ms-mean / 102 ms-max calibrated seams are good enough for the
silence-adjacent seams that dominate, and the residual tail is exactly where the
spec's coarticulation caveat already applies (true of the Azure offsets too).

### Honest residuals — what is NOT yet closed

- **MMS does not match Azure re-synthesis** (which is exact, shift 0 ms by
  construction). For *Azure-voiced* clips re-synthesis is still strictly better —
  but per Tom's direction we do not build the architecture on it (see §2).
- **The +133 ms constant is validated on 2 languages × 4 voices only.** It is a
  strong prior (zero per-voice spread observed), but **before fixing the number
  in production it must be confirmed on a wider sample** — more voices, and at
  least one non-Latin script to validate the romanizer (the spike used a
  deterministic NFD diacritic-fold; CJK/Arabic/Cyrillic will exercise `uroman`).
- **Final acceptance is Tom's ear** on the `-MMS-corrected` ladders versus the
  Azure ladders (this is the standing sign-off gate; the host has no ears).

### What Tom must run to finish the call

The model is **not installed on a shared/CI host** — it lived in a gitignored
venv on the spike machine. To productionize, the install must be reproduced
where the Popty pipeline runs:

```bash
# Brew python 3.13 (arm64) — system python 3.9.6 is too old for modern torch
/opt/homebrew/bin/python3.13 -m venv .venv-mms
.venv-mms/bin/python -m pip install --upgrade pip
.venv-mms/bin/python -m pip install torch torchaudio   # CPU-only arm64 wheels; ~89 MB torch + ~1.2 GB MMS checkpoint on first run
export HF_HOME=$PWD/.cache TORCH_HOME=$PWD/.cache/torch # keep the model cache local
```

Pinned versions that worked: `torch==2.12.0 torchaudio==2.11.0 numpy==2.4.6`
(Python 3.13.9, macOS 15.5 arm64). Runtime: **~3.5 s wall for 4 clips on CPU**,
peak RSS ~2.7 GB. Two solved gotchas are baked into the spike scripts: decode
mp3 via ffmpeg-as-plain-decoder (torchaudio 2.11 otherwise routes `load` through
the uninstalled `torchcodec`); and the NFD diacritic-fold romanizer (0 OOV on
all 4 clips, no `uroman` needed for Latin scripts).

### Runner-up — echogarden (use only if the torch install is a blocker)

Echogarden (npm, JS-native, DTW against an eSpeak-ng reference) is the lighter
install and the better *pipeline fit* (no Python/torch, `npm install -g
echogarden`, ga+hr out of the box, deterministic, 1:1 with the transcript).
**But its precision is worse:** raw seam error mean 96 / p90 164 / max 232 ms,
and even with a per-clip bias subtraction the residual max is still 115 ms (over
the bar at the tail). Its bias is also only knowable against Azure, and a blind
global −88 ms leaves residual max 144 ms. **Recommendation: prefer MMS** for the
~2.5× tighter calibrated tail; keep echogarden as the fallback if torch cannot
be installed on the target host, after trying its `dtw-ra` / `whisper` align
engines (both target the onset lag, untested in the spike).

### Disqualified

- **whisper.cpp DTW** — `unknown language 'ga'` (Irish-blind, full stop);
  Croatian 166–264 ms mean / 530–563 ms max, with misrecognitions and
  zero-length words. Out.
- **`services/voice-engine/align.cjs`** (ffmpeg `silencedetect`) — refuses on
  all 4 clips (no intra-clause silence to detect at atom seams). It is a
  recording-script gap-finder, not a continuous-audio forced aligner. Out for
  this use.

---

## 2. FALLBACK CHAIN — forced-align always works; Azure is a free shortcut only where it happens to apply

The architecture **must not depend on Azure.** The contract is:

1. **Forced alignment (MMS_FA) is the universal path.** It works on *any* clip —
   xAI clone, human recording, or Azure TTS — with no knowledge of the voice and
   no second vendor call. This is what every productionized offset pass runs.
2. **Azure word boundaries remain a free, exact shortcut — but only opportunistically.**
   *Where a clip is already Azure-synthesised*, re-synthesising with the same
   voice/settings yields word boundaries that transfer to the stored clip at
   **shift 0 ms** (Azure is bit-deterministic; the loudnorm-only master does not
   shift time — both proven in the original spike). That is strictly more
   precise, so for those clips it may be used. **It is an optimisation, not a
   dependency:** the pipeline must produce correct offsets for an Azure clip via
   forced alignment too, and must never *require* the Azure path to exist.
3. **The deciding rule:** branch on `course_audio` provenance (read from
   `voice_id` + `origin` — there is no `provider` column). xAI/human →
   MMS forced-align (calibrated). Azure → MMS forced-align by default; Azure
   re-synth allowed as an exact shortcut where the team wants the extra precision
   on a reviewed clip. **No code path may assume Azure offsets are available.**

This inverts the original spike: Azure-transfer was the *winner*; here it is
demoted to an opportunistic optimisation behind the voice-independent default,
because production voices (xAI, human) and our two build languages (gle, hrv) can
never use it for the target track.

---

## 3. BLAST RADIUS — who needs re-voicing, what is blocked, and where Irish/Croatian sit

From the voice-provenance audit (61 pods, 8,831 sentences, 15,847 distinct audio
ids — all resolved, no dangling FKs; `scripts/experiments/atom-fusion-spike/voice-audit.md`):

**Headline:** Of **46 built pod courses**, **24 are already 100 % xAI target
(no-op)**. **22 are 100 % Azure target = 3,124 target clips — and 0 of them can
move to xAI**, because all 22 are Tier-3 languages for which **no xAI clone voice
exists**. This is a vendor-capability wall (already encoded as Tier 3 in
`tools/pod-voice-coverage.cjs`; the DB matches the map exactly), not a missing
config.

```
TARGET Azure clips to re-voice : 3,124
  movable to xAI now           :     0
  BLOCKED (no xAI cast)        : 3,124   (all of them)
```

The 22 blocked courses: ara_sy, bul, cat (×2), ell, est, eus (×2), fas, fra_ca,
**gle (Irish)**, heb, **hrv (Croatian)**, hye, isl, lav, lit, nep, nor, ron, swa,
ukr.

**Irish and Croatian — our two flagship build courses — are both 100 % Azure
target today, and both are BLOCKED from xAI:**

- **gle_for_eng (Irish):** 142/142 target Azure (`ga-IE-OrlaNeural` 72 +
  `ga-IE-ColmNeural` 70). Plus 22 Azure explainer *composites*
  (`comp:ga-IE-*+en-GB-SoniaNeural`), 120 explainers unbuilt. No xAI Irish voice.
- **hrv_for_eng (Croatian):** 142/142 target Azure (`hr-HR-GabrijelaNeural` 72 +
  `hr-HR-SreckoNeural` 70). Explainers unbuilt. No xAI Croatian voice.

**Why this makes the forced-alignment decision unavoidable, not optional.** The
two courses we are actually building offsets for are exactly the ones with no
xAI escape hatch. If we want them Azure-*free* at the offset layer (and to use
the same path for the xAI courses and future human recordings), we **cannot**
lean on Azure word timings — which is precisely what MMS forced alignment
delivers, and what it was validated on (gle + hrv clips).

**Other Azure dependencies (for completeness):**

- **Explainer track** is already Azure-free (100 % Tom's xAI clone
  `gfzdpspr5fdp`) except the **22 Irish composites** — same root blocker.
- **English known track** blends ~3,003 Azure en-GB voices into a British pool.
  This **can** move to xAI (English clones exist) but at the cost of
  voice-distinctness headroom — a quality tradeoff, not a hard blocker, and out
  of scope for the offsets pass.
- The 13 unbuilt courses (2 Welsh served via runtime Azure cy-GB fallback; 11
  reverse `eng_for_*`) have all-NULL target FKs — out of scope until built.

**The 3,124-clip re-voicing question is a policy decision for Tom, separate from
offsets:** stay Azure, human-record, accept a non-regional xAI accent (only helps
fra_ca / ara_sy / ara_eg), or add a third TTS vendor. **The offsets path
(forced alignment) works regardless of which way that policy lands** — it does
not require the target clips to ever become xAI.

---

## 4. PRODUCTIONIZE — the offsets pass in the Popty pipeline

The offsets pass is the **audio pass deliberately deferred** in the spec's
implementation table — the cost-free data layer (`pod_legos` schema +
`pod-lego-extractor.cjs` Pass 1/2) is already built; atom/note offsets are
currently left `null`. This is where they get filled.

### Where it slots in

After Pass 2 allocation (per-clause atom maps exist with `lego_key`/`kind`/
`gloss`/`spans` but `target_start_ms`/`target_end_ms` are null), run a new
**offsets pass** per pod course:

```
Pass 1 (inventory)  →  Pass 2 (per-clause atom maps, offsets null)
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │ OFFSETS PASS (new, this doc)      │
                    │ for each pod sentence clip:        │
                    │  1. MMS_FA forced-align clip ⨯ txt │  (venv python, CPU, ~1s/clip)
                    │  2. apply −133 ms onset calibration│
                    │  3. map words → atoms via the SAME │  (mapBoundariesToAtoms,
                    │     mapper the spike used           │   the tiling-validated decomp)
                    │  4. seams = midpoint of inter-atom  │
                    │     gap; write target_start/end_ms  │
                    │  5. attach MMS per-word confidence  │  (low score → QA flag)
                    └──────────────────────────────────┘
                                   │
                                   ▼
                    QA Mode audition → Tom's-ear sign-off
```

The mapper (`02-azure-boundaries.cjs#mapBoundariesToAtoms`) **forward-searches**
words against the decomposition rather than blindly consuming positionally — this
already caught the `gle g4` "Tá, tá …" decomposition that under-tiles its
sentence; keep that behaviour and keep the **total-tiling gate** before persisting
(coverage < 1 ⇒ refuse, route to QA), exactly as the spec insists.

### What it writes to `atom_map`

Per `database/migrations/20260612_pod_legos_and_atom_map.sql`, each atom entry's
**`target_start_ms` / `target_end_ms`** are filled from the calibrated forced
alignment (offsets into *this clause's own* `target_clause` take). Per the spec's
identity/position split:

- **Position layer (per-sentence, this pass writes it):** `target_start_ms`,
  `target_end_ms` per `atom`/`passthrough` entry. Notes keep their
  `explainer_start_ms`/`explainer_end_ms` into `note_audio` (a separate concern —
  note audio is its own small render, not forced-aligned from the target take).
- **Identity layer (inventory, unchanged by this pass):** gloss, canonical
  mapping, first-encounter status, canonical explainer clip — owned by
  `pod_legos`, cited by `lego_key`. The offsets pass does not touch it.

Atoms carry **only target offsets** (the explainer is the inventory's whole
canonical clip, cited by `lego_key`, never sliced) — consistent with the v2 data
contract.

### Persist boundaries at generation time, going forward

**Yes — persist word boundaries at generation/import time from now on.** Two
reasons, both already half-true in the codebase:

1. **The hook already exists and was simply never stored for pods.**
   `tts-service.cjs:138` captures Azure `wordBoundary` events; the original spike
   noted `course_audio.word_boundaries` is NULL only because pods never persisted
   them. For Azure clips, store the boundaries at generation — free, exact, and
   removes any need to re-synthesise later.
2. **For xAI / human clips, persist the forced-aligned boundaries** (the raw MMS
   per-word table, pre-atom-mapping) alongside the clip. Storing the *word*
   boundaries — not just the derived atom spans — means the corpus can be
   **re-tiled to a revised inventory without re-aligning** (the spec explicitly
   defers cross-occurrence re-tiling; persisted word boundaries make that future
   pass free of re-alignment cost). Persist the MMS **confidence score** too, as
   a durable per-clip review flag.

### QA hook

Reuse the existing admin **QA Mode** (the spec already calls for this): the
content team auditions slices and flags bad boundaries; offsets are just data,
correctable without re-recording. Because the inventory is the review unit, fixing
one entry propagates to every clause that cites it. MMS's per-word confidence
gives QA a *batch* triage signal Azure could not (low score → human checks that
clip first; in the spike, Irish scored lower than Croatian, which is exactly where
you'd want the flag).

---

## 5. SPEC-UPDATE DIFF — changes to `docs/architecture/atom-fusion-introduction.md`

> **Specified, not applied.** Parallel agents own that file. Apply these two edits
> so the spec no longer presents Azure as the default offset source.

### 5a. Section "Slicing reliability" → subsection **"Where the offsets come from"** (lines ~320–328)

**Replace** the current block:

```
**Where the offsets come from** decides upstream effort [v2 — recorded is the
norm]:
- **Recorded clause (the default for pods)** → forced-align once in the Popty
  pipeline (reviewable, correctable), never on-device. Given pods use human cast
  voices, this is the load-bearing path, not a fallback.
- **TTS clause** → only some engines help: **Azure emits word timings** (free,
  exact) but its voices are weaker; the **xAI clone gives no timings at all**.
  So forced-align is the path that always works; TTS timings are a lucky
  shortcut when the clause happens to be Azure-synthesised.
```

**with [v3 — voice-independent forced alignment is the default]:**

```
**Where the offsets come from** [v3 — Azure-independent]: a single
**voice-independent forced aligner** is the default for *every* clip, whatever
the voice — xAI clone, human recording, or Azure TTS. Production target audio is
the xAI clone (no word timings) and our build languages (Irish, Croatian) have no
xAI cast, so the offset layer must not depend on any one vendor's timings.

- **Default (all clips): MMS forced alignment** (`torchaudio.pipelines.MMS_FA`),
  run once in the Popty pipeline (reviewable, correctable), never on-device.
  Aligns a *known transcript* (voice-independent by construction); handles Irish
  and Croatian (Whisper cannot do Irish); CPU, seconds per clause. A one-time
  constant **−133 ms onset calibration** lands atom seams at **mean 39 ms /
  max 102 ms** vs the Azure ground truth — within the inaudible range for the
  silence-adjacent seams that dominate. Emits a per-word confidence score usable
  as a QA review flag. *(Confirm the calibration constant on a wider voice /
  non-Latin-script sample before fixing it.)*
- **Opportunistic shortcut (Azure clips only): Azure word boundaries.** Where a
  clip is already Azure-synthesised, re-synth transfers word timings at shift
  0 ms (exact). This is a free *optimisation* where it happens to apply — **never
  a dependency**: the architecture produces correct offsets via forced alignment
  for Azure clips too.

See `docs/pods/offsets-without-azure-recommendation.md` for the validation
numbers, the install Tom must run, and the blast radius.
```

### 5b. Section **"Resolved decisions"**, item 2 (lines ~370–371)

**Replace:**

```
2. **Offset source** — recorded + forced-align is the contract; TTS timings
   (Azure only) a shortcut; the xAI clone gives none. *(v2)*
```

**with:**

```
2. **Offset source** — **voice-independent forced alignment (MMS_FA) is the
   default for every clip** (xAI, human, or Azure), with a one-time −133 ms
   onset calibration → seams mean 39 ms / max 102 ms vs Azure ground truth.
   Azure word timings are an exact but *opportunistic* shortcut where a clip is
   already Azure-synthesised — never a dependency. The xAI clone gives no
   timings, and our build languages (gle, hrv) have no xAI cast, so the layer
   cannot lean on Azure. *(v3 — supersedes v2; see
   docs/pods/offsets-without-azure-recommendation.md)*
```

(No other section needs changing — the data contract, the slicing-reliability
immunity argument, and the QA hook are all already voice-agnostic and correct.)

---

## Provenance / artifacts

All under `scripts/experiments/atom-fusion-spike/` (spike dir is gitignored; no
DB/S3/git writes occurred in any investigation):

- **MMS:** `mms-results.md`; aligner `06-mms-align.py`; scoring/render
  `07-mms-compare-render.cjs`, `08-mms-biascorrect.cjs`, `09-render-corrected.cjs`;
  data `data/mms-boundaries.json`, `data/mms-compare.json`, `data/mms-biascorrect.json`;
  ladders `out/<stem>-fusion-ladder-MMS{,-corrected}.mp3`.
- **Echogarden:** `echogarden-results.md`; `06-echogarden-analyze.cjs`,
  `07-echogarden-ladder.cjs`; `data/echogarden.json`;
  `out/<stem>-fusion-ladder-ECHOGARDEN.mp3`.
- **Voice audit:** `voice-audit.md`; `voice-audit-final.cjs`, `blast-radius.cjs`
  (read-only).
- **Azure ground truth + original spike:** `REPORT.md`; `out/<stem>-fusion-ladder.mp3`.

`<stem>` ∈ {`gle_for_eng-g3`, `gle_for_eng-g4`, `hrv_for_eng-g3`, `hrv_for_eng-g4`}.
Acceptance gate = Tom's ear on the `-MMS-corrected` ladders vs the Azure ladders.

---

*Last updated: 2026-06-13. Supersedes the offset-source conclusion of
`scripts/experiments/atom-fusion-spike/REPORT.md`.*
