# Trying the my-lines recordist surface on a test course

**2026-09-02** · staging branch `staging/recordist-my-lines-zzz-2026-09-02` (built from `feat/recordist-my-lines`) · nothing merged to `main`

Tom wanted to use the new surface himself, on his own test course, before it goes near Catrin.

## The two ways in

- **New — sign in and see your own list:** https://watson-1.tail4968cb.ts.net:10002/my-recording
- **Old — the link that is the identity, no login:** https://watson-1.tail4968cb.ts.net:10002/r/human_tom_zzz

Both surfaces read the SAME queue (`GET /api/recording/voice/human_tom_zzz`). The only difference
is how the surface learns who you are: the login, or the link.

## Which test course, and why not the other one

`zzz_test2_for_eng`. Not a preference — the queue is built **by language**, and `zzz_test_for_eng`
has `target_lang = eng`. English is not a human-recorded language and never enters a recordist
queue, so that course cannot produce a line to record no matter what is in its pod.
`zzz_test2_for_eng` has `target_lang = zzz`, which `language_recording_policy` already names, with
`human_tom_zzz` as its male voice.

## The fixture, and how to take it back out

Three changes, all inside the test course and Tom's own rows:

1. **8 Customer lines added** to `zzz_test2_for_eng:pod-0` (global_order 3–10, ids
   `zzz_test2_for_eng:pod-0-s3` … `-s10`). One Customer line was already there and already
   recorded, so the list reads 9 total / 8 outstanding — which also gives one *done* row to see
   the drawn state against.
2. **`language_recording_policy` for `zzz`**: the male voice's email moved from
   `tom@saysomethingin.com` to `thomas.cassidy+ssi@gmail.com`.
3. **`dashboard_users.voice_id = human_tom_zzz`** on all three `thomas.cassidy+*` rows, so
   whichever address he signs in with resolves, and the Home card appears.

No consent record was created and no clone was cast: consent gates guard TTS *rendering* and policy
casting through the API, neither of which is involved here. `human_tom_zzz` was already in the
policy.

**Undo:** delete the 8 sentence rows by id, put `tom@saysomethingin.com` back on the policy's `m`
voice, and null the three `voice_id` values.

## Why the staging host exists

The Vercel preview cannot be signed into — `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are
Production-scoped, so the preview's Supabase client is null. This staging host is the way round
that without merging to `main`: the branch is built with the real env, served from
`/home/tomcassidy/staging-recordist/dist` by systemd unit `cs-long-recordist-staging`, and
`/api/*` is proxied to the production API on the same origin, exactly as `vercel.json` proxies for
popty.app. Two one-line source changes make `.ts.net` same-origin the same way `.vercel.app` and
`popty.app` already are; they exist for the staging host and are not proposed for `main`.

Verified served, not assumed: the bundle contains `MyRecordingList` and the `/my-recording` route,
the Supabase project ref is present in it, and `/api/recording/mine` through the staging origin
returns `human_tom_zzz` for Tom's login (401 with no token).

## What is fixture, not defect

- The **per-course Record Room**, https://watson-1.tail4968cb.ts.net:10002/record/zzz_test2_for_eng,
  shows *"No LEGOs found for course"*. That surface is driven by course LEGOs and phrases, and the
  test course has none. It is not the pod-recording path and cannot show these lines.
- The lines are plain English sentences, because the "Test Language" content is English.
- The course is `draft` and named `[E2E TEST] Recordist by-language duplicate`.
