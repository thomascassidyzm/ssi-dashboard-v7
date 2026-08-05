# Gate bypass audit — 2026-08-05

**Headline: of the 1,413 clips the dashboard labelled "rendered under the gate", zero went through
`veracity.renderChecked`. The label was false for 100% of the rows it selected.**

Commissioned after Tom reported: *"Rendered under the gate in the French course is basically
excellent… but when I played recently rendered I got a whole load of bad ones."* The second half
had a separate cause (the `recent` filter applied no predicate at all — see
`docs/DECISIONS.md`, 2026-08-05). This document is the first half: what the *gated* label was
actually claiming.

---

## 1. What the gate is, and where it runs

`services/audio-veracity.cjs` — an unprimed whisper round-trip on a rendered clip, CER-thresholded,
re-rendering on failure and withholding to a quarantine ledger if it cannot pass. Entry point
`renderChecked`.

It has **three** production call sites in the whole repo, all in `services/phases/phase8-audio-v13.cjs`:

| Path | Line | Verdict |
|---|---|---|
| `POST /generate` (bulk) | `:2089` | **GATED** |
| `POST regenerate-role` | `:2587` | **GATED** |
| `POST generate-components` | `:4868` | **GATED** |

Every other TTS publish path bypasses it — including four inside phase8's own file:

| Path | Evidence | Verdict |
|---|---|---|
| `POST regenerate-single` | TTS `:3931-3945`, upload `:3961`, no gate between | **BYPASS** |
| `POST regenerate-presentation` | TTS `:4140-4153`, upload `:4168` | **BYPASS** |
| `POST regenerate-phrase` | TTS `:4441-4454`, upload `:4469` | **BYPASS** |
| `generatePodAudio()` | TTS `:5709/5729`, upload + insert | **BYPASS** |
| `services/pod-explainer-composite.cjs` | upsert `:310` | **BYPASS** |
| `tools/repair-silent-clips.cjs` | `renderVerified` `:214-259` calls the bare detector `checkAudioVeracity` `:244`, 3 re-rolls, throws rather than publishing | **BYPASS — equivalent-strength self-check, no ledger** |
| `tools/revoice-clips.cjs` | checks `:247-251` are level/duration only; zero `audio-veracity` reference in the file | **BYPASS — materially weaker, no word-content check** |
| `tools/declick-tail.cjs` | re-encode of existing bytes, `delete copy.created_at` `:129` → new row lands inside the window | **DERIVED, ungated** |
| `tools/build-shared-known-store.cjs`, `persist-stage0-pod0.cjs`, `render-fine-knowns.cjs`, `render-residue-atoms.cjs`, `render-take-g.cjs`, `breakdown-flat.cjs`, `course-optimization/clone-copy-pass.cjs` | render and/or upsert | **BYPASS** |
| `scripts/**` (~45 files) | grep for insert/upsert/update/delete on `course_audio` returns nothing | **read-only — clean** |

Commit `85bd2a34`'s message — *"pre-publish veracity gate on every TTS publish path"* — is wrong.
It covers three of eight paths in its own file.

## 2. Where the 1,413 gate-era rows came from

Arithmetic closes exactly: 1,222 fra_for_eng + 191 deu_for_eng.

| Window (UTC) | Rows | Written by | Checked? |
|---|---:|---|---|
| 08-04 23:02–23:46 | **251** | phase8 `/generate` — the fra "pilot 250" | **No — the gate code did not exist yet** |
| 08-05 02:17–02:23 | 14 | `repair-silent-clips` (deu batch 1) | whisper self-check, no ledger |
| 08-05 02:23–02:34 | 26 | `repair-silent-clips` (fra suspects + controls) | whisper self-check, no ledger |
| 08-05 02:54–03:02 | **142** | `revoice-clips.cjs` — wrong-known-voice pass | **level/duration only — no word-content check** |
| 08-05 04:19–05:50 | 803 | `repair-silent-clips` (`ms/char < 40` stratum) | whisper self-check, no ledger |
| 08-05 10:48–11:28 | 177 | `repair-silent-clips` (deu batch 2) | whisper self-check, no ledger |

**The 251 pilot clips are the serious one.** `audio-veracity.cjs` was committed at **23:55:59**
(`04955fed`) and wired into phase8 at **23:59:33** (`85bd2a34`) — *after* every one of those renders.
The "independent corroboration" the pilot doc cites is phase8's old level/duration report, not
`renderChecked`; the same doc's §5 records one truncated clip live in production out of that batch,
which is precisely what the gate would have withheld.

**The 142 `revoice-clips` rows are the second real gap** — loudness cannot see the defect class the
gate exists for; the truncated set measures a perfectly normal −16.8 dB.

**The 1,020 `repair-silent-clips` rows** were checked to an equivalent standard but keep no durable
record of it. Mislabelled technically; substantively fine. This is almost certainly why Tom's ear
rates the tab as excellent — those clips *were* whisper-checked, just not by the gate.

## 3. The quarantine ledger agrees

`scripts/audio-veracity-quarantine/quarantine.jsonl` holds 30 entries. Every one is
`tst_for_eng` or `../../etc` — the unit-test fixtures. **Zero production clips.**
The gate has never quarantined anything real, because it has never run on a production render.

## 4. Was the gate switched off?

**No.** `AUDIO_VERACITY_GATE` appears only in the module, its tests and its doc — never in `.env`
or any systemd unit. Whisper, the model and ffmpeg are all present on this box and configured in
both checkouts. The gate was able to run; nothing routed a render through it.

**One live hazard remains even on the gated path:** `renderChecked:576-581` returns
`published: true` when `verdict.checked` is false (missing binary, decode error). A machine without
whisper publishes everything and still counts as gate-era. That is deliberate and documented — but
it means the timestamp can be false even for a clip that did take the gated path.

## 5. What was done about it

1. **Done — the surface stopped asserting the falsehood.** `GATE_LIVE_FROM` moved from
   `2026-08-04T23:00:00Z` (chosen deliberately to sit *before* the gate's own commit, so the pilot
   batch would be auditionable) to the gate's wiring commit `2026-08-04T23:59:33Z`. Tab renamed to
   *"Rendered since the gate shipped"*, badge to *"after the gate shipped"*, and the payload carries
   `verifiedByGate: false` with copy stating plainly that no production render has gone through the
   gate. Regression tests pin the pilot batch on the pre-gate side of the cutoff.
2. **Done — retro-verification run.** `tools/audio-veracity-repair.cjs <course> --since
   2026-08-04T23:00:00Z` (detection only; no `--apply`, no TTS, no writes) over both courses, to
   convert the label from an assumption into a measurement. Results in §6.
3. **DONE 2026-08-05 — the real fix.** See
   [`per-clip-gate-verdicts-2026-08-05.md`](./per-clip-gate-verdicts-2026-08-05.md). The columns
   below now exist and are written at all three `renderChecked` sites and at
   `repair-silent-clips.cjs`; the filter is a verdict lookup and correctly reports the
   missing-whisper case as *unchecked*. One thing this audit could not see, found while building
   it: **the gate had never been merged to `main`** — the deployed service had no
   `audio-veracity.cjs` on disk at all, which is the deeper reason no render had been through it.
   That is merged too. Original wording follows.

   Persist the verdict: `veracity_pass` / `veracity_checked_at` /
   `veracity_reason` on `course_audio`, written at the three `renderChecked` sites **and** at
   `repair-silent-clips.cjs:244`, which already computes the verdict and throws it away. The filter
   then becomes a verdict lookup, true by construction, and correctly reports the missing-whisper
   case as *unchecked* rather than *passed*. Routing the four ungated phase8 endpoints and
   `revoice-clips` through `renderChecked` is the right end-state but is a separate build, and it
   does not fix a single already-mislabelled row.

## 6. Retro-verification results

Run 2026-08-05 from `tools/audio-veracity-repair.cjs`, detection only. See
`scripts/gate-audit/retro-fra.json` and `retro-deu.json` on the running box.

*(Results appended when the run completes — the run is the measurement, and an audit that reports
a number it did not wait for is the failure mode this whole document is about.)*

## Explicit gaps

- **`revoice-clips` presentation count:** the pass doc claims 10 presentation clips re-voiced; the
  DB shows 5 in that window. Unresolved.
- **Cluster attribution** for the 08-05 04:19–05:50 (803 rows) and 02:54–03:02 (142 rows) windows is
  *high confidence*, not certain — matched by role mix, ratio and commit-recorded counts, not by a
  per-row provenance column. `course_audio` records no writer.
- **The tail probe run separately** (gate-escape probe) is a tail-shape test only: it cannot see a
  missing word that happens to end on a decayed boundary, and says nothing about pronunciation.
