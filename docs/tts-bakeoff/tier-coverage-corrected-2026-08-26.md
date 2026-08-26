# Tier coverage, corrected — all seven providers, 2026-08-26

Computed by Watson from the seven `docs/tts-bakeoff/coverage-*.json` dossiers on `main`, against the
corrected tier model in `PHASE1-SHARED-DIGEST.md`. Regenerate with the one-liner in that digest;
the inputs are the `ssi_coverage` blocks the two gate-zero slices researched from vendor docs.

**Tiers exclude `cym`, `bre` and `pdc`** — the three languages `services/shared/human-voice-courses.cjs`
already hard-blocks from TTS on Tom's standing rulings. Counting them against a vendor scored a miss
that could never be a miss.

- **Tier A (10)** — live courses on synthetic audio: `eng spa kor zho por ita jpn hrv ben glg`
- **Tier B (10)** — the xAI migration scope: `eng deu fra ita jpn kor spa por zho fin`
- **Tier A+B+C (43)** — everything above plus the beta estate on synthetic audio

| Provider | Tier A (live) | Tier B (migration scope) | Tier A+B+C |
|---|---|---|---|
| **Azure** *(control)* | **10/10** | **10/10** | **43/43** |
| **ElevenLabs** *(control)* | **10/10** | **10/10** | 42/43 |
| **OpenAI** | 9/10 — no `ben` | **10/10** | 40/43 |
| **Cartesia** | 9/10 — no `glg` | **10/10** | 29/43 |
| **MiniMax** | 8/10 — no `ben`, `glg` | **10/10** | 31/43 |
| **Chatterbox** | 7/10 — no `hrv`, `ben`, `glg` | **10/10** | 22/43 |
| **xAI** *(incumbent)* | 8/10 — no `hrv`, `glg` | **10/10** | 20/43 |

## What this says

**1. Language coverage is not the discriminator.** Every provider — all four candidates and all
three controls — covers the xAI migration scope completely. The decision falls entirely to version
pinning, exit cost and quality. Any framing that ranks these vendors by breadth is answering a
question the estate does not have.

**2. The incumbent is the narrowest option on the table.** xAI covers 20 of 43. Leaving it costs
nothing in breadth; on this axis every alternative is an upgrade.

**3. Two real languages are covered by no candidate: Basque (`eus`) and Irish (`gle`).** Both are
beta on Azure today — `eus_for_eng` and `eus_for_spa` hold ~49,000 clips between them, `gle_for_eng`
~25,700. Neither is in the migration scope, so neither blocks the xAI exit, but both are reasons the
answer may be *two* providers rather than one. Azure covers both today and is not going anywhere as
a fallback.

**4. Azure and ElevenLabs win on breadth and lose on the thing that matters.** Azure covers 43/43
and has **no version pinning** for the neural voices we use; ElevenLabs covers 42/43 and is the
known-variable benchmark. Breadth without repeatability is exactly the bridge that drifts
mid-crossing.

## Gaps

- Coverage here is **documentary, not measured** — it reflects vendor-published language lists.
  Nothing has been heard. A language a vendor lists is not thereby a language a vendor does *well*,
  and that gap can only close in phase 2 with a listening pass.
- No Cartesia, MiniMax or OpenAI credentials exist, so none of those three has produced a single
  second of audio.
- `ben` (Bengali) and `glg` (Galician) are the two Tier A misses that recur across candidates. Both
  are live courses — `ben_for_eng` at 20,315 clips and `glg_for_eng` at 15,931 — so a candidate that
  misses them cannot serve a shipped course without an Azure fallback for that language.
