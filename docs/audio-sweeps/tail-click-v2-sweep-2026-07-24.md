# Tail-click detector v2 + resweep — 2026-07-24

Owner report (ita_for_eng): audible end-clicks on clips that PASSED the original
`detectTailClick` gate (built `9f8a7ba0` for one signature: short isolated burst
~70ms pre-EOF). Two named specimens, both xAI-clone voice `gfzdpspr5fdp`:
- `87c18e40` "Could I see the wine list?" (regenerated *through the gate* 07-24)
- `1bc798f1` "I'm not sure if I'm hungry." (pod_fine_known, 07-04)

## Why each specimen passed the old gate (measured)

Burst-rule-only (the old gate) returns `click:false` on both files; the v2 rules fire:
- **wine-list**: speech decays to −46dBFS, then a ~110ms broadband exhale at
  −15dBFS rides the last 170ms. The burst rule's "last run above −20dB-rel-peak"
  is a ragged 6ms blip with only a 4ms gap (< minGapMs 20) → contiguous → pass.
  v2: **resurgence −12.6dB**, trim 1.366s.
- **hungry**: speech ends −8dBFS, envelope dips only to −23dBFS (never below the
  −20dB threshold long enough), then a ~250ms exhale rises to −13dBFS. No
  isolated short run at all → pass. v2: **rise −11.3dB**, trim 1.300s.

## Taxonomy of end-defect classes observed

1. **burst** — short isolated click/thump after decay (the original class).
2. **resurgence** — quiet ≥20ms below −34dB-rel-peak, then content back above
   −26dB-rel-peak: exhale/grunt bursts, the dominant clone-voice class.
3. **rise** — ≥8dB climb off the running envelope minimum after last strong
   speech, staying below −6dB-rel-peak: the louder exhale that never lets the
   envelope reach the resurgence arm level.
4. **NOT a class: mp3 re-encode.** Tested directly — ffmpeg→lame re-encode of a
   cleanly-faded clip introduces no detectable end artefact (also the prior
   worker's `_reenc` tests). The defects are baked into the TTS render.
5. **False-positive class: pausey renders.** Rise/resurgence cannot distinguish
   a breath burst from real speech resuming after a long intra-phrase pause
   ("Come stai?" with 400ms before "stai"; "…here, good" with a detached
   closing word). DSP-level fix impossible → whisper transcription adjudicates
   (`verifyTrimKeepsText`): unsafe iff the kept region misses a text word AND
   the cut region transcribes speech. Measured on all 154 flagged clips: 151
   safe, 3 true FPs, all 3 caught, 0 missed (manual triage matched exactly).

## Calibration

- Both specimens FAIL v2 (above). All child-voice `[pause]` pod takes and
  longform (ellipsis) texts PASS via mode `longform` (burst rule only) — the
  eve `[pause]`-era false-positive problem (61/139) is resolved by mode, wired
  through `masterAudio(buffer, ttsText)` at all 7 phase8 call sites.
- Known-clean era (ita 07-05→07-12, 500-clip sample): professional voices
  eve/ara = 1 hit each of ~250 (both burst-rule-adjacent, plausible real
  clicks). Clone voice `gfzdpspr5fdp` = 251/499 hits — that is genuine
  contamination of the clone back-catalogue, not detector noise (tail regions
  are 200–400ms of −2…−14dBFS aperiodic content; whisper transcribes them as
  silence/noise).

## Resweep + repairs (population: all course_audio created ≥ 2026-07-22, 38 courses, 565 clips)

154 hits → **151 repaired, 3 held** (the whisper-caught pausey FPs — left
untouched by design: `333929bc` ita "Come stai?", spa `16f1bd73` "…here, good",
spa `7955eb8d` "…over there"). Plus the two 07-04 specimens repaired = **153
repaired total**. Per-course: spa 72 (+2 held), ita 6 (incl. both specimens;
+1 held), est/nor/ron 4, ara_eg/ara_sy/cat/dan/fas/hin/nld/tur/fra_ca 3,
ara/bul/deu/ell/gle/heb/hye/isl/lav/lit/nep/pol/spa_mx/swa/zho/fra 2,
eus/por/tha/ukr 1. jpn/kor/por_br/swe: 0 hits.
Repair = same new-id + relink doctrine as the child-voice rescue (device caches
key bytes by id); relink now covers known-side, take-slot arrays and core-table
FK columns; `atom_map_fine` keys by lego_key+ms, no audio ids — verified no
lingering references post-repair.

Verification resweep residue = exactly the 3 held FPs + repaired copies
re-flagging their soft detached trailing words ("please"/"yes") — which the
bare scanner flags but the whisper guard correctly retains. Logs:
`scripts/tail-scan-logs/` (gitignored workspace; summary here is the record).

## Gate changes (live at the mastering chokepoint)

`audioProcessor.repairTailDefect` is the single shared implementation
(phase8 `masterAudio` + `tools/declick-tail.cjs`): detect (3 rules, mode-aware)
→ whisper amputation guard → iterative trim (≤3 passes, re-guarded each pass;
stacked defects observed: `e415d79a`) → pausey renders ship untouched ('held')
→ still dirty after 3 passes = hard error. Whisper best-effort: `whisper-cli` +
`WHISPER_MODEL` (default `~/SSi/whisper-models/ggml-small.bin`); absent →
repair proceeds unverified (measured ~2% FP among flagged).

## Open — needs Tom

- **Clone back-catalogue contamination**: ita_for_eng `gfzdpspr5fdp` ≈ 50% of
  2,475 clips carry tail exhale/grunt defects (pod_fine era 07-04/07-07);
  other courses' clone clips unswept. Repair is the same free gated DSP sweep,
  ~2–3h runtime. Recommendation: run it course-by-course, pods first.
- The 3 held pausey renders: fine to leave (speech intact); re-roll only if
  the pause itself is objectionable.
- spa_for_eng eve 07-22/23 batch: 73/314 hit rate — eve is breathier than her
  clean-era record suggested; same recommendation as the clone if audible in QA.
