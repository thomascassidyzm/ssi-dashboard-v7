# Camberley 401s: the backend cannot talk to the auth store, and Deploy cannot fix it

**2026-08-13 · ssi-machine.ngrok.app · diagnosed against the live box**

## Answer in one line

Camberley's `SUPABASE_SERVICE_KEY` **is not registered for the Supabase project**. Every
authenticated request 401s for every user, no matter how valid their token, because the backend
cannot reach the auth store to validate it. It is a secret in `.env`, which git does not carry — so
**pressing Deploy cannot fix this**, and Deploy is failing anyway.

Your framing was right and my earlier report was wrong on the premise: this is not stale sessions,
not client-side, and not primarily a code-version problem. It is config divergence.

## The evidence, from Camberley's own logs

`GET /api/services/production-api/logs` on the live box, verbatim:

```
[ProductionAPI] Failed to get courses: {
  message: 'Unregistered API key',
  hint: 'Double check the provided API key as it is not registered for this project.'
}
```

That is Supabase talking, and "**not registered for this project**" is the whole diagnosis.

## Why that produces a 401 on every endpoint

There is exactly one Supabase client (`services/supabase-client.cjs`), and it is built from
`SUPABASE_SERVICE_KEY`:

```js
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
... createClient(supabaseUrl, supabaseKey, ...)
```

`verifySupabaseJWT` calls `supabaseClient.getClient().auth.getUser(token)` — which sends that
unregistered key as the `apikey` header. Supabase rejects the call, so `getUser` returns no user and
the function returns `null`. Auth then falls through to the legacy `authValidateSession` path, which
reads `dashboard_sessions` **through the same broken client** and also returns `null`.

Both paths dead-end on one bad key, so the request 401s. The user's token is never actually
evaluated — which is exactly why a per-user explanation could never fit the symptom.

## The three comparisons you asked for

**1. JWT / signing secret.** No divergence, and none is possible. Popty does not verify JWT
signatures itself and holds no signing secret — it delegates to Supabase's `auth.getUser()`. So
there is no signing-secret mismatch to find; the only auth-relevant secret is the API key, and that
is the one that is broken.

**2. Ability to reach the auth store.** *This is the divergence.* Same project URL on both
(`swfvymspfxmnfhevgdkg` — Camberley's error is that project rejecting the key, which means it is
pointed at the right project with the wrong credential). watson-1 holds a **new-format**
`sb_secret_…` service key and works. Camberley holds a key that project no longer recognises —
consistent with the service key having been rotated to the new format and Camberley's `.env` never
being updated. I verified the legacy `anon` JWT still works on this project (valid to 2035), so
legacy keys were not disabled wholesale; it is specifically the service key that moved.

*Honest limit:* I cannot read Camberley's `.env`, so I cannot say whether its key is a revoked
legacy `service_role` JWT or one from another project. **The fix is identical either way.**

**3. Code version.** Camberley *is* also older, but this is a second, independent fault, not the
cause of the 401s:

| | watson-1 | Camberley |
|---|---|---|
| `/health` `build` block | present, `8b6931ae` on `main` | **absent** |
| `/api/qa-gate/…/rounds` | 200 | **404** `Cannot GET` — route does not exist |
| `/api/courses` | 200 | **500 Unregistered API key** |

The `build` block landed at `c051a509` on 2026-08-05 12:46Z, so Camberley is running code from
before that. Note the 401 and the 404 are different faults: a missing route 404s, and audio-stats
401s — so "401 on everything" and "the QA gate page is missing entirely" are two problems, not one.

## Deploy is failing — right now, while you press it

From Camberley's orchestrator log this minute:

```
[Deploy] Checking git status...
[Deploy] WARNING: 16 uncommitted changes detected
[Deploy] Running git pull...
[Deploy] Deploy FAILED: Command failed: git pull --ff-only 2>&1
```

No stash line, so `force` was not set and the 16 dirty files are enough on their own to make
`--ff-only` refuse. This is the same failure recorded on 2026-08-05 (then 4 dirty files, and it
failed *even after* a successful stash — which pointed at branch divergence or a non-interactive
credential prompt as well). Camberley still lacks `fb996ae9`, the commit that makes a failed deploy
report git's actual stderr — so it cannot tell us which, because it cannot pull the fix that would
tell us. That is a genuine catch-22 and it needs a shell.

**So: even a successful deploy would not clear the 401s.** `.env` is gitignored
(`.gitignore:47`); no tracked file carries the service key. Code and secrets travel by different
roads, and only the code road goes through git.

## The fix path

Two independent things are broken and both need doing. Neither can be done from watson-1 — the
remote-control surface exposes health, logs and restart, but nothing that writes `.env`, and SSH to
Camberley is blocked.

1. **The 401s (the real one).** Put watson-1's current `SUPABASE_SERVICE_KEY` into Camberley's
   `~/SSi/ssi-dashboard-v7-clean/.env`, then `pm2 restart production-api`. I have not printed the key
   here; it is in watson-1's `.env` and I can hand it over on whatever channel you want. Provisioning
   is by scp per machine, exactly as `.env.psql` is — never by git.
2. **The staleness.** At a shell on Camberley: `git status`, deal with the 16 dirty files and any
   divergence, then `git pull --ff-only`. That is what brings the QA gate routes over.

Verify afterwards with one call — `GET http://100.66.204.84:3470/api/courses` should return course
data, not `Unregistered API key`. If that line is gone, the 401s are gone with it.
