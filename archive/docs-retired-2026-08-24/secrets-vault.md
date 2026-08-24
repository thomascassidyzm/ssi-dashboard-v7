# Secrets — central Vault (encrypted) with one bootstrap credential

*2026-06-30. Status: **LIVE** — Vault holds the shared secrets (encrypted, verified). Services still read from `.env`; the cutover to Vault is the remaining (optional) step.*

## Current state (read this first)

- **9 shared secrets are now in Vault**, encrypted at rest, verified 9/9 round-trip:
  `XAI_API_KEY`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`,
  `VITE_SUPABASE_ANON_KEY`, `ADMIN_SECRET`.
- **`.env` is unchanged** — services still read from it exactly as before, so
  nothing has changed at runtime. Vault is a **parallel source of truth**, ready
  to switch to.
- **Not in Vault (deliberately):** `DATABASE_URL` (secret-zero, stays in
  `.env.psql`); machine-specific paths (`VFS_ROOT`, `LEARNING_APP_REPO`);
  non-secret config (regions, buckets, URLs, ports, flags); and `.env`
  placeholders (`your-…`). Machine-specific values should stay local.
- To inspect what's there: `node tools/secrets.cjs list` (names + descriptions,
  no values; needs `DATABASE_URL` in env).

## Model

One bootstrap credential ("**secret zero**") per machine — the postgres
connection string `DATABASE_URL` it already holds. **Every other secret** (xAI,
Anthropic, S3, …) lives **encrypted** in **Supabase Vault** (`vault.secrets`,
`supabase_vault` 0.3.1, pgsodium) and is read back through the
`vault.decrypted_secrets` view.

## Provisioning a machine (secret zero)

Secret zero lives in **`.env.psql` at the repo root** of each machine's
dashboard checkout (one line: `DATABASE_URL=…`, the pooler connection string —
see the psql note in `.env.example`). It is **gitignored (`.env.*`), so it
never arrives via `git pull`** — every fresh checkout needs it copied over by
scp, then `chmod 600`. Without it a machine cannot run direct SQL, migrations,
canaries, or `tools/secrets.cjs`. Symptom: SQL tooling dead ("no DATABASE_URL")
on an otherwise-working checkout.

Machine map (checkout paths differ per machine):
- **Tom's local box** (`MacBook-Air-3`): `~/SSi/ssi-dashboard-v7-clean/.env.psql` ✓
- **SSi Machine, Camberley** (Tailscale `toms-air`; runs the pm2 stack +
  `ssi-machine.ngrok.app`): `~/ssi-dashboard-v7-clean/.env.psql` — note the
  repo sits at the home-dir **root** there, not under `~/SSi/`. Was missing
  until 2026-07-04; copied from Tom's box and verified with a live query.

Why this is safe:
- The raw `vault.secrets.secret` column is **ciphertext at rest** (verified) — a
  DB dump does not leak plaintext keys.
- Vault is **not exposed via PostgREST**, so the anon/REST API can never read it.
  Decryption is **direct-DB / service-role only**.
- N scattered `.env` files collapse to **one** credential to distribute + rotate.
  The service key was already maximally powerful (bypasses RLS), so this widens
  no blast radius — it just consolidates behind the credential you already guard.

## Tool — `tools/secrets.cjs`

Needs `DATABASE_URL` in env (secret zero).

```bash
node tools/secrets.cjs list                  # names + descriptions (NO values)
node tools/secrets.cjs get  NAME             # one decrypted value
node tools/secrets.cjs set  NAME value [desc] # create or update (upsert by name)
node tools/secrets.cjs rm   NAME             # delete
node tools/secrets.cjs load [--export]       # emit all as KEY=value (.env) / export KEY=...
```

**Bootstrap a machine** (reduce its `.env` to just `DATABASE_URL`):
```bash
node tools/secrets.cjs load > .env     # then the app loads .env as usual
```

**In-process** (a service fills its own `process.env` at startup; local env wins):
```js
await require('./tools/secrets').loadSecrets()  // returns count applied
```

## Rollout

1. ✅ **DONE** — the shared secrets are pushed into Vault (additive; `.env`
   untouched; verified). Re-runnable via `scripts/migrate-secrets-to-vault.cjs`
   (gitignored — handles values; explicit allowlist).
2. ⬜ **Wire services to Vault** — add `await loadSecrets()` at startup, or
   `node tools/secrets.cjs load > .env` in the boot script. Do this **one path
   at a time** and test each — it changes how a running service gets its keys.
3. ⬜ **Trim machine `.env`s** down to `DATABASE_URL` + machine-specific config.
4. **Rotate** any key in one place (`set NAME newvalue`) — machines pick it up
   next boot / next `load`.

Validated end-to-end: set → ciphertext at rest → decrypted round-trip → load
(.env + export) → in-process `loadSecrets` → upsert → rm → live migration of 9
secrets (9/9 verified).
