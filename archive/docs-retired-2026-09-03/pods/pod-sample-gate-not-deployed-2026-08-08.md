# The pod sample gate is not deployed, and a sample request ran as a bulk run

**Date:** 2026-08-08 · **Severity:** the next person who trusts `sample_limit` spends whatever
the whole course costs · **Status:** diagnosed, not fixed

## What happened

A request for a ten-clip sample on `deu_at_for_eng`:

```
POST http://127.0.0.1:3465/generate-pods/deu_at_for_eng   {"sample_limit": 10}
```

queued **455 clips** and rendered **188** before it was stopped by restarting the service.
Nothing was lost — the pod door only enqueues sentences whose audio id is NULL, so the job is
resumable by construction — and the spend was about eleven minutes of TTS, cents rather than
dollars. The gate simply did not exist at the address it was called at.

## Why

**Two facts that are individually fine and together defeat the gate.**

1. The phase-8 service does not run from the checkout the gate was built in. It runs from
   `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, which tracks `main` and updates itself —
   it was current with `origin/main` within minutes of being checked.
2. **The gate is not on `main`.** Commit `83bc07a8`, which added `sample_limit` and the bulk
   approval check, is on `docs/pod-redo-scope-2026-08-07` and nowhere else. `git branch -r
   --contains 83bc07a8` returns that one branch.

So the served code has no `sample_limit` handling at all — the string does not appear in the file
prod is running. `sample_limit` is an unrecognised body field, silently ignored, and the request
falls through to a full run:

```
# the branch — the gate
[Pods] ${sampleLimit === null ? 'BULK' : 'SAMPLE'} ${courseCode}: ${n} clips queued …

# what actually served the request
[Pods] ${courseCode}: ${n} clips queued …
```

The missing `SAMPLE`/`BULK` word in the live log line is the tell, and it is how this was caught.

This is not a stale-checkout problem to be fixed by pulling. Prod is not behind; the work is not
in front of it.

## Which services this affects

| Service | Runs from |
|---|---|
| `popty-phase8-audio` | `-prod` — tracks `main` |
| `popty-production-api` | `-prod` — tracks `main` |
| `popty-course-builder-api` | `-prod` — tracks `main` |
| `popty-orchestrator` | the dev checkout, so it *does* pick up branch work |

Three of the four doors serve `main`. Anything sitting on a feature branch is, for those three,
not deployed however well it is tested.

## Why it matters before the fleet run

The gate was built today precisely so that no pod campaign starts before someone has listened,
and **the failure mode is silent** — an unknown or malformed `sample_limit` does not error, it
bulk-generates. The unit tests in `services/pod-voice-approvals.test.cjs` are strict about exactly
this and they all pass, against code that is not the code serving traffic.

## What to do

1. **Merge the gate to `main`** and let the prod checkout pick it up, then confirm the word
   `SAMPLE` appears in `~/.local/log/popty-phase8-audio.log` for a `sample_limit` request before
   trusting it. Until that is verified in the live log, treat every `/generate-pods` call as bulk.
2. **Do not treat a green test run as deployment evidence** for anything on the pod door. The
   tests and the server are in different trees on different branches.
3. Nothing currently tells you which checkout a Popty service runs from.
   `systemctl --user show <unit> -p WorkingDirectory --value` is the answer, and it is not obvious.
