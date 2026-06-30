# Secrets — central Vault (encrypted) with one bootstrap credential

*2026-06-30. Status: spike validated (Vault round-trips, encrypted at rest); rollout pending.*

## Model

One bootstrap credential ("**secret zero**") per machine — the postgres
connection string `DATABASE_URL` it already holds. **Every other secret** (xAI,
Anthropic, S3, …) lives **encrypted** in **Supabase Vault** (`vault.secrets`,
`supabase_vault` 0.3.1, pgsodium) and is read back through the
`vault.decrypted_secrets` view.

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

## Rollout (pending)

1. Push the real secrets from an existing `.env` into Vault (`set` each).
2. Add `await loadSecrets()` at service startup (or `secrets.cjs load > .env` in
   the boot script).
3. Trim machine `.env`s down to `DATABASE_URL` only.
4. Rotate: change a key in one place (`set`) — all machines pick it up next boot.

Validated on the spike: set → ciphertext at rest → decrypted round-trip → load
(.env + export) → in-process loadSecrets → upsert → rm, all clean.
