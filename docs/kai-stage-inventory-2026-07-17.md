# kai-stage → main inventory (2026-07-17)

Decision: move to a **main-based workflow** (features → Slack Tom → Tom lands on
main → we pull main). This note captures everything on `kai-stage` that isn't on
`main`, so nothing is lost and we can decide what to tell Tom to promote.

**Non-destructive:** `kai-stage` is pushed to the remote — it is the permanent
archive of all 55 commits. Moving to a fresh main checkout loses nothing; this is
about deciding what to *promote*, not what to rescue.

- Diverged from main at `b9cfae7e` (2026-07-05). 55 commits ahead; 76 code files,
  ~10.8k insertions. (main has also moved ahead — 91 files — see the pod-file note.)

---

## 1. Already in an OPEN PR — Tom just needs to merge/close these
| PR | Branch | What |
|----|--------|------|
| **#9** | feature/course-editor-guardian | Safe content-editing library + Edit Guardian (~25 files, `services/course-editor`) — biggest chunk |
| **#2** | feature/unify-audio-needs | Export workflow Step 1→2 auto-advance, apidev stage-deploy panel, phrase-edit audio sync (+ many stage-deploy hardening commits) |
| **#4** | feature/build-team-full-size-fix | build-team: respect MVP/Full selection through to orchestrator brief |
| **#11** | feat/script-viewer-jump-to-round | Script viewer jump-to-round + stop view jumping on save |

## 2. Already MERGED to main (no action — listed so we don't double-tell)
- #5 MP3 iOS encoding fix (ffmpeg→lame) · #6 archive-audit-log hardening ·
  #8/#7 docs · #12 preview-real-seeds · #13 xAI first-class provider.
  (Some kai-stage commits are the source of these — treat mp3/xai as landed.)

## 3. NOT in any PR — the orphans that need a decision (tell Tom about these)
Grouped, newest-relevant first:

- **Pod voice/gender sweep** — commit `e024b645`. ✅ ALREADY told Tom via Slack
  (2026-07-17). Code-only; DB/audio already live.
- **Gender-prep coordinator suite** — subject-aware brief with `[means:]` gloss +
  Thai rules + `--text-only`; wire flagged-audio regen into the dashboard;
  per-batch timeout/retry/incremental persistence; chunked flag-clear (Cloudflare
  520 fix); "Rerun Gender Prep" dashboard button. *(e7293ef6, ee7eb270, 82f21343,
  ce1b7551, e3d49d0d)* — real feature, worth landing.
- **⚠️ phase8 orphan-cleanup SAFETY** — make `cleanupOrphanAudio` pod-aware so it
  stops wiping listening pods + a mass-delete circuit-breaker. *(43018f9c,
  d6ae5a05, 86d225d5, ae8c2ce1)* — **safety fix; high priority to land** if not
  already on main.
- **New variant/dialect courses** — Swiss German (deu_ch), Cantonese/Hakka/Hokkien;
  `yue/nan/hak` added to `LOGOGRAPHIC_LANGS` length-ratio allowlist. *(0cf49e01,
  9f0de2a1)* — mostly Supabase content; the code bit is the LOGOGRAPHIC_LANGS fix.
- **Backfill / translation briefs** — direction-explicit backfill brief + variety
  rules + model/min_use params, encouragements 48→50; translation reference
  examples; Korean/Lebanese-Arabic misc. *(41b1e97a, a92b1b5a, 2bdca89e)*
- **Voices** — default to xAI first for supported languages *(f40cc457)*; phase8
  voice_id prefix-mismatch fix *(d934f613)*. (May overlap merged #13 — Tom to dedupe.)
- **Misc** — strip `ANTHROPIC_API_KEY` from spawned agent env *(01f38cd9,
  security-relevant)*; scan-course Check 1 detects fullwidth parens *(aa7f647c)*;
  scan-course working notes/docs.

## 4. Uncommitted WIP in the working tree (NOT this session — do NOT lose on switch)
Present as modified-but-uncommitted; owner unknown (possibly a concurrent session):
- `services/briefs/translate.cjs`
- `services/course-builder/lib/language-config.cjs`
- `services/course-builder/routes/build.cjs`
- (+ many untracked `docs/course-optimization/*.md` scratch/plan files)

These must be committed/stashed by their owner before any `git checkout main` on
this same working tree, or they'll block/conflict. Cleanest: leave this checkout
alone and open a **separate fresh worktree/clone off main** for the new workflow.

---

## Recommended message to Tom (features to promote)
1. Merge the 4 open PRs (#9, #2, #4, #11) when ready — that clears the bulk.
2. Land the **phase8 pod-safe orphan cleanup + circuit-breaker** (safety) if not
   already on main.
3. Land the **gender-prep coordinator** improvements.
4. Consider the smaller ones: LOGOGRAPHIC_LANGS fix, backfill/brief improvements,
   xAI-first default, ANTHROPIC_API_KEY strip, scan-course fullwidth parens.
