# Kai's language display names — merged, deployed, live

*2026-08-14*

Popty showed raw language codes. Kai's fix routes every display site through one
source of language names, and pins the learner app to the same words. It sat on a
branch in both repos and reached nobody. It is now on `main` in both, and both are
serving it.

## What landed

**Popty (ssi-dashboard-v7-clean)** — merge commit `f25dc301` on `main`, seven
commits from `feat/language-display-names-2026-08-14`. One source of truth
(`src/utils/languageNames.js`), 96 display sites across 33 screens reading it,
three per-screen hardcoded name lists deleted, six missing rows added to the
language reference CSV.

**Learning app (ssi-learning-app)** — commit `194b98b1` on `main`, plus the same
commit cherry-picked to `dev` as `dc4ce0b5`. Seventeen languages that the player
was handing to `Intl.DisplayNames` are now curated in `eng.json`, so the two
products can't drift apart on a name again.

## Verification before merging

**Popty.** Clean merge, no conflicts. Test suite run three ways in isolated
worktrees:

| Tree | Test files | Tests |
|---|---|---|
| `main` (3accd059), untouched | 14 failed / 111 passed | 4 failed / 1717 passed |
| Kai's branch alone | 14 failed / 110 passed | 4 failed / 1669 passed |
| The merge result | 14 failed / 112 passed | 4 failed / 1726 passed |

The failing set is byte-identical across all three: eight Playwright `e2e/` specs
that vitest collects and cannot run, two `tools/` suites, and four assertions in
`LearningJourneyAudioFlags.test.js`. Kai's "fails identically on untouched code"
claim is confirmed — not taken on trust.

One extra file failed on the merged tree's *first* run,
`src/views/admin/PodLab.casting.test.js`. It is a flake, not a regression: the
merge touches no PodLab file, the test passes 3/3 in isolation, and a second full
run of the same merged tree returned exactly main's failing set. Worth knowing it
flakes; it is not this change's doing.

Production build compiles (`npm run build`, exit 0).

**Learning app.** Fast-forward, no merge needed. `player-vue` suite on `main`
before: 3 failed (all in `usePodLapScheduler.test.ts`) / 2075 passed. With the
commit: the same 3 failed / 2076 passed — exactly one new passing test, which is
the one the commit adds. Build compiles.

GitHub Actions on the learning app reports a failure on this push. It is not the
code: the job never started — *"recent account payments have failed or your
spending limit needs to be increased."* The two previous pushes to `main` failed
the same way for the same reason. The suites were run locally instead, above.
Popty's CI is green.

## The audio guard is untouched — checked, not assumed

The clip-identity guard rejects `pdc` and eight other languages, and was
explicitly out of scope. Kai added those languages to `language_codes.csv` with
names only, leaving the `database_code` column — the column the guard reads —
empty. Run against the deployed production checkout after the merge:

```
pdc -> REJECTED: not in tools/sync/reference/language_codes.csv
hak, nan, lmo, rgn, vec, sme, rm, yi -> REJECTED (identical)
cym -> OK -> cym
fra -> OK -> fra
```

Behaviour is exactly what it was. That gap is still open and still wants a
separate look before any of those courses reach audio.

## Live

- **popty.app** — the served bundle carries `pdc:"Pennsylvania Dutch"`.
  Vercel rebuilt from `main` within two minutes of the push.
- **saysomethingin.app** — production deployment of `194b98b1` succeeded; the
  served chunk carries `pdc:"Pennsylvania Dutch"`, `hak:"Hakka"`,
  `nan:"Taiwanese Hokkien"`, `fur:"Friulian"`, `lmo:"Lombard"`.
- **ssi-learning-app-git-dev-zenjin.vercel.app** — the same, from the `dev`
  cherry-pick.

The watson-1 production checkout was pulled to `f25dc301`. No service restart was
needed: the change is frontend plus additive CSV rows, and the running services
re-read the CSV at start.

## One thing done differently, and why

The learning app's own `CLAUDE.md` says all work goes to `dev` and nothing is
pushed to `main` directly — promotion is `dev → staging → main`, Tom's call. This
went straight to `main` because that was the instruction and `main` is what
reaches people. Following that repo's own hotfix rule, the commit was
back-merged to `dev` so the next promotion can't drop it.

**`staging` does not have it.** It will pick it up on the next `dev → staging`
promotion. Nothing to do unless someone wants it on the soak build sooner.

## Rendered-page evidence

Screenshots of `popty.app` driven in a real browser after the deploy, logged in
against the live database:
**https://watson-1.tail4968cb.ts.net/evidence/pdc-live-2026-08-14/index.html**

The course library reads **Pennsylvania Dutch** in the TARGET column with
`pdc_for_eng` still in the CODE column, the production overview breadcrumb reads
"Pennsylvania Dutch for English Speakers", and North Welsh still reads
"Welsh (North)" as a control.
