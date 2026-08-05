# Supabase Key Rotation Checklist — 2026-08-05

Read-only sweep of Tom Cassidy's SSi estate, run 2026-08-05, to give Kai a concrete checklist of
every place a Supabase key (or the DB password / `DATABASE_URL`) is referenced after the key
rotation. **Never-print-values rule followed throughout**: this document names files, line numbers,
and env-var *names* only — no key value, prefix, or fragment appears anywhere below. Everywhere a
grep needed to touch actual file content, output was piped through `cut -d= -f1` (env files) or
searched by variable name (code), never by matching/echoing the value.

**Which keys were rotated was not stated in the source conversation.** This checklist defaults to
assuming **both** anon and service-role/service keys were rotated, and treats `DATABASE_URL` /
`SUPABASE_DB_PASSWORD` as a **separate open question** — tick only the rows for keys actually
rotated; if the DB password did not change, skip the `.env.psql` / `SUPABASE_DB_PASSWORD` rows.

Tom's absolute paths (for orientation only — the checklist below uses repo + relative path so it
transfers unchanged to Kai's machine):
- `/home/tomcassidy/SSi/ssi-dashboard-v7-clean` — Popty, primary checkout (dev)
- `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod` — Popty, **the checkout two live systemd
  services actually run against** (see Findings)
- `/home/tomcassidy/ssi-dashboard-v7-clean` — a third Popty checkout (feature branch, own `.env`)
- `/home/tomcassidy/SSi/ssi-learning-app` and `/home/tomcassidy/ssi-learning-app` — **two genuinely
  separate checkouts** of the same repo (different commits); the latter also has two linked git
  worktrees inside it, `origin/dev` and (under `~/ssi-worktrees/`) `pull-consistency`
- `/home/tomcassidy/SSi/SSi_Course_Production` — empty directory, no repo, no Supabase references
- `/home/tomcassidy/SSi/wt-walkthrough` and `~/ssi-worktrees/audio-followup-2026-08-04` — worktrees
  of the Popty repo (own branch each), no live `.env` of their own, only `.env.example`

`course-builder` is **not a separate repo** — it is `services/course-builder-api.cjs` +
`services/course-builder/` inside the Popty checkout (confirmed identical in all three Popty
checkouts above).

---

## 1. THE CHECKLIST — places that must be physically UPDATED

Only env/config files that **set** a value, or hardcoded literals, are update work. Grouped by
repo/checkout.

### Popty — `ssi-dashboard-v7-clean` (primary, `/home/tomcassidy/SSi/...`)
- [ ] `.env` — sets `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`,
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] `.env.psql` — sets `DATABASE_URL` (secret-zero; separate rotation question, see preamble)

### Popty — `ssi-dashboard-v7-clean-prod` (**live systemd runtime**, see §2)
- [ ] `.env` — sets `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`,
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] No `.env.psql` present in this checkout — nothing to update here for `DATABASE_URL`

### Popty — third checkout, `/home/tomcassidy/ssi-dashboard-v7-clean` (feature branch)
- [ ] Only `.env.example` present (template, placeholder values) — **no live `.env` here**, nothing
      to rotate unless someone has been running services out of this checkout

### ssi-learning-app — `/home/tomcassidy/ssi-learning-app` (the checkout with a live `.env`)
- [ ] `.env` — sets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
      `SUPABASE_DB_PASSWORD`, `DATABASE_URL`
- ⚠️ Note the naming difference from Popty: this repo's server code reads
  **`SUPABASE_SERVICE_ROLE_KEY`**, not `SUPABASE_SERVICE_KEY`. Don't paste the new key under the
  wrong name.
- Its two linked worktrees (`origin/dev`, and `~/ssi-worktrees/pull-consistency`) share this same
  `.git` and do **not** have their own `.env` — nothing separate to update there.

### ssi-learning-app — `/home/tomcassidy/SSi/ssi-learning-app` (second checkout, different commit)
- [ ] No `.env*` file found in this checkout at all. If nothing runs out of it, there's nothing to
      rotate; if Kai (or anyone) *does* run dev/build here, a `.env` will need to be created fresh
      with the same var names as above.

### wt-walkthrough / audio-followup worktree (Popty worktrees)
- [ ] Only `.env.example` present in each — no live `.env`, nothing to rotate unless one exists
      that this sweep didn't find (see Gaps).

### Deletion candidate (flagged, not deleted — see §4)
- [ ] `ssi-dashboard-v7-clean/.env.bak-before-service-key-2026-07-31` — stale backup, holds a
      **superseded** key under `SUPABASE_SERVICE_KEY`. Not read by any running code (nothing in the
      repo references the `.bak` filename), but it is a stale credential sitting on disk. Kai's/
      Tom's call to delete.

---

## 2. WHAT BREAKS IF YOU MISS ONE

- **Popty `services/supabase-client.cjs`** reads `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`. This is
  the shared client used by the bulk of `services/*.cjs` and `tools/*.cjs` (course-builder-api,
  course-data-service, manifest-generator, voice-config-service, phase0-3 pipeline servers, phase8
  audio pipeline, ~50+ `tools/` scripts). Miss this and essentially all Popty content-pipeline and
  audio tooling breaks or silently reads stale data.
- **Popty `api/lib/supabase.js`** (Vercel-style API routes under `api/`) reads `SUPABASE_URL` and
  falls back `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY` — so it tolerates either name, but
  only `SUPABASE_SERVICE_KEY` is actually set in Popty's `.env`.
- **Popty `tools/secrets.cjs`** reads `DATABASE_URL || SUPABASE_DB_URL` for direct-SQL tooling
  (`psql`, migrations). Miss the `.env.psql` update and SQL tooling fails with "no DATABASE_URL",
  per the symptom already documented in `docs/secrets-vault.md`.
- **Two live systemd user services run against `ssi-dashboard-v7-clean-prod`, not the primary
  checkout**: `popty-production-api.service` and `popty-phase8-audio.service` (`WorkingDirectory=
  /home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, no `EnvironmentFile=`/`Environment=SUPABASE_*`
  set in the unit — they pick up `SUPABASE_*` from that checkout's `.env` at process start via the
  app's own env loading). **This is the single easiest miss**: updating the primary checkout's
  `.env` and forgetting `-prod`'s `.env` leaves these two live services running on the old key until
  restarted, and they will fail quietly (401/403 from Supabase) rather than loudly. A third service,
  `popty-course-builder-api.service`, runs against the primary checkout (`/SSi/ssi-dashboard-v7-clean`).
- **ssi-learning-app's Vercel API surface** (`api/**/*.ts`, ~250 route files under `api/`) each read
  `process.env.SUPABASE_URL` (or `VITE_SUPABASE_URL`) and `process.env.SUPABASE_SERVICE_ROLE_KEY`
  directly — Vercel serverless functions don't share a warm module, so every route file duplicates
  the read rather than importing a shared client. There is no single choke point to check; the env
  var, not the file, is the unit that matters. Miss `SUPABASE_SERVICE_ROLE_KEY` here and the entire
  learning-app API surface (entitlements, school admin, groups, teacher portal, onboarding, courses)
  breaks at once.
- **ssi-learning-app frontend** (`player-vue`, Vite build) reads `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` via `import.meta.env` — this is the anon key baked into the client build;
  miss it and the deployed learner app itself can't reach Supabase (not just server routes).

---

## 3. DEPLOY TARGETS

Repo files were read for **documented/configured var names only** — no remote dashboard was
contacted, and none of this confirms what's actually set on the live deploy target. That
confirmation is Kai's/Tom's step.

- **Vercel** — `vercel.json` exists in all three of Popty (both checkouts) and ssi-learning-app
  (both checkouts), but none of them declare `env`/`build.env` blocks — env vars for these deploys
  are Vercel-dashboard-configured, not repo-committed. No local `.vercel/project.json` link was
  found on this machine for any of them, so the linked Vercel project name/ID isn't confirmable from
  here either. **Gap**: which Vercel project(s) ssi-learning-app deploys to, and whether
  `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are
  current there, needs a human check in the Vercel dashboard.
- **GitHub Actions** — no `.github/workflows/*.yml` in any of the three repos references
  `SUPABASE` or `DATABASE_URL` by name. Nothing found to update here; if CI secrets exist for
  Supabase under different names, they weren't discoverable from repo files (see Gaps).
- **systemd (this machine, `~/.config/systemd/user/`)** — three Popty services
  (`popty-production-api`, `popty-phase8-audio`, `popty-course-builder-api`) exist; none set
  `Environment=SUPABASE_*` or `EnvironmentFile=` directly (drop-ins only override `PATH` and one
  `TAIL_REPAIR_MODE` flag) — they inherit from their `WorkingDirectory`'s `.env` at process start
  (see §2). **After rotating the `.env` files above, these three services need a restart** to pick
  up the new key — that's a live-service action outside this sweep's read-only scope, flagged for
  Kai/Tom to actually do.
- **Render / Railway / Fly** — no config files (`render.yaml`, `railway.json`/`railway.toml`,
  `fly.toml`) found anywhere in the swept repos. Either none of these are in use, or they're
  configured entirely outside the repo. Nothing to update on the repo side; nothing to confirm on
  the remote side from here.
- **Docker/PM2** — no `Dockerfile`, `docker-compose*`, or `ecosystem*.config.js` found in any of the
  three repos.

---

## 4. FINDINGS NEEDING ATTENTION

1. **No hardcoded key found.** The estate-wide scan for inline `eyJ...`-prefixed JWT literals in
   tracked source produced 6 hits, all confirmed false positives on inspection (variable names only
   were checked against context, no values were read as keys): 5 are base64-encoded audio blobs
   embedded in `docs/*-listening-test.html` files where `eyJ` appears mid-stream inside binary audio
   data, not at the start of a token; 1 is an npm package integrity hash in `pnpm-lock.yaml`
   (sha512 base64, not a JWT). **No headline finding here** — nothing to un-commit.
2. **Stale backup key file**: `ssi-dashboard-v7-clean/.env.bak-before-service-key-2026-07-31` — its
   own header comment identifies it as holding the anon key mistakenly used as the service key
   *before* the 2026-07-31 fix, i.e. already-superseded even before this rotation. Not read by any
   code path found in this sweep. Flagged as a deletion candidate — not deleted (read-only scope).
3. **Duplicate/stray checkouts holding their own copies**:
   - `ssi-dashboard-v7-clean-prod` has a live `.env` that is a **real runtime dependency** (two
     systemd services), not just a stray copy — see §2. Easy to forget precisely because it looks
     like a stray duplicate.
   - `/home/tomcassidy/ssi-dashboard-v7-clean` (third Popty checkout, no leading `SSi/`) has no live
     `.env`, only `.env.example` — low risk, but exists and should be on Kai's radar so he doesn't
     wonder later why there are three Popty directories.
   - `/home/tomcassidy/SSi/ssi-learning-app` (second learning-app checkout) has **no `.env` at all**
     — if it's actively used for dev, it currently has no way to reach Supabase, rotated or not;
     worth Kai confirming whether this checkout is live or abandoned.
4. **Env var naming split between the two repos**: Popty uses `SUPABASE_SERVICE_KEY`; ssi-learning-
   app uses `SUPABASE_SERVICE_ROLE_KEY` (with Popty's `api/lib/supabase.js` alone tolerating either
   name via fallback). Not a rotation bug, but worth Kai knowing before he assumes one name works
   everywhere.
5. **Documentation** — `docs/secrets-vault.md`, `docs/kai-machine-db-setup.md`,
   `docs/setup/KAI_ONBOARDING.md`, `docs/setup/SERVICE_STARTUP_GUIDE.md`, and
   `docs/popty-vm-migration-runbook.md` were all checked against the current `.env` variable names.
   **None are stale** with respect to this rotation — they name `SUPABASE_URL`, `SUPABASE_SERVICE_
   KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DATABASE_URL`,
   `SUPABASE_DB_PASSWORD` consistently with what the live `.env` files actually contain today. No
   doc names a variable that no longer exists or documents a superseded provisioning path.
6. **Other secret classes exist in these same `.env` files** (S3/AWS keys, Anthropic-adjacent config,
   ElevenLabs/Azure TTS keys per `docs/secrets-vault.md`) — out of scope for this Supabase rotation,
   noted once and not expanded on.

---

## 5. GAPS — what this sweep could not reach

- **No remote dashboard values were read** for Vercel, Render, Railway, Fly, or GitHub Actions
  secrets — by design (read-only, no credentials for those dashboards in this sweep). Confirming
  those is Kai's/Tom's step; §3 above lists what each repo's own files say each target *should*
  need, not what's actually configured there.
- **GitHub Actions secrets that don't appear in any workflow YAML by name** (e.g. referenced only via
  an org-level secret with a generic name) would not have been found by this sweep — it only found
  what's written into `.yml` files, and found none referencing Supabase at all.
- **Kai's own machine** was not swept — this is Tom's machine only. Whether Kai's local checkouts
  mirror this layout, or have their own extra `.env.local`/`.env.production` files, is unknown; the
  checklist above is written by repo + relative path specifically so it transfers.
- **`.env.local` / `.env.production` / `.env.development` variants**: none were found anywhere in
  the swept estate on this machine, but their absence here doesn't guarantee absence on Kai's
  machine.
- **PM2**: `~/.pm2` exists on this machine (with backup dump files) but `pm2 jlist` returned no
  running process list at sweep time, so no live PM2-managed env vars could be enumerated. If PM2 is
  actually managing any of these services, its env is a gap.
- **Whether `ssi-dashboard-v7-clean-prod`'s `.env` is a manually-synced copy or independently
  provisioned** was not established — only that it exists, holds the full var set, and is the
  checkout two live systemd services actually run against.

---

## Report

**Headline: no hardcoded key found anywhere in tracked source** (6 candidate `eyJ` matches, all
confirmed false positives — audio blobs and an npm lock hash, not JWTs). Rotation is not fighting a
committed secret.

**The count that matters**: **6 live `.env`/`.env.psql` files actually need updating** across the
estate (Popty primary `.env` + `.env.psql`, Popty-prod `.env`, ssi-learning-app `.env`), against
~139+ files that merely *read* or *mention* Supabase. The single most important finding is the
**`ssi-dashboard-v7-clean-prod` checkout** — it looks like a stray duplicate but is the actual
`WorkingDirectory` for two live systemd services (`popty-production-api`, `popty-phase8-audio`);
missing its `.env` in the rotation leaves live services quietly running the old key until restarted,
which is exactly the "fails quietly later" scenario Kai asked to avoid. Restarting those three
systemd services after the `.env` updates is a necessary follow-up action, outside this sweep's
read-only scope.

Everything requested was reachable from this machine except remote deploy-target dashboard values
(§5 Gaps) — no blocking gaps, no assumptions substituted for denied access.

No code, config, or secret was modified — this was a pure read sweep, and the only artifact produced
is this document.

**Landing line**: commits are on branch `docs/supabase-key-rotation-checklist-2026-08-05`, pushed to
`origin`; not merged into `main`; not deployed anywhere (it's a docs-only change with no deploy
target, and merge was not requested in this job's brief).
