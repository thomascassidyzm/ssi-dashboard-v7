# Deborah's Basque audio "reversions" — nothing is lost, and the pointer is right

*2026-08-14. Read-only investigation. No audio written, no rows changed.*

**Tom's read was right and is now confirmed on served bytes: no audio was destroyed.** It is a
serving problem, not a storage problem. It is also *smaller* than the 2026-08-12 forensics
suggested, and the specific mechanism he asked me to check — the canonical `audio_clips`
migration re-surfacing old pointers — is **refuted for this course**, with a decisive number.

**Deborah needs to redo nothing.**

---

## 1. Nothing was lost — proven on the bytes

Her named example, R95 BUILD 2. The 2026-08-12 forensics recorded this as its biggest gap:
"her named example has no DB trace… not touched since 2026-05-03." **That gap is now closed —
she regenerated it two days later**, on 2026-08-14 at 10:13:31–32 UTC. `content_audit_log` has
it, and S3 confirms it:

| key | role | size | last modified | status |
|---|---|---|---|---|
| `mastered/5407E165-…` | target1 | 33,120 | 2026-05-23 | old take, still in the bucket |
| `mastered/3E1E345E-…` | target1 | 36,576 | **2026-08-14 10:13:32** | **her new take — and the DB points here** |
| `mastered/2AF58CB8-…` | target2 | 33,120 | 2026-05-23 | old take, still in the bucket |
| `mastered/B5C433A4-…` | target2 | 36,576 | **2026-08-14 10:13:33** | **her new take — and the DB points here** |

So the database row points at the **new** bytes. The old bytes were never deleted. Both halves of
"make before break" held by accident here: nothing was overwritten in S3, only the row's key
was swapped.

## 2. The pointer in the database is correct — the stale thing is the browser

This is the one place I'd refine Tom's phrasing. The row does **not** still point at the original
audio; it points at the new one. What serves the old take is the **client-side URL cache**, which
is keyed on the clip's uuid — and the regeneration path *keeps the uuid* and swaps only the
`s3_key`. So the uuid the cache holds outlives the bytes it was resolved against, and the round
player replays a signed URL that still resolves to the pre-regen object.

That is exactly Deborah's sentence: correct when she auditioned it in the edit modal (which uses
the URL the regen returned), old take afterwards in the round player (which uses the cache).

## 3. "We had this before" — Tom is right, and it is *Deborah's own* prior bug report

| commit | date (UTC) | what |
|---|---|---|
| `9a70a894` | 2026-08-12 15:26 | `fix(audio): a caller's stale s3_key could override the DB and serve the pre-regen take for ever` |
| `84d37385` / `94c9395f` | 2026-08-12 15:32 | `fix(script-player): a resolved audio URL was cached for ever against a uuid that outlives its bytes` |
| `3be3b668` | 2026-08-12 15:29 | `merge: land Deborah's two bug fixes — intro-text placeholder and the s3Key override` |

All three are **ancestors of `origin/main` and of the production checkout**
(`ssi-dashboard-v7-clean-prod`, HEAD `143e7146`) — so they are deployed, not just merged.

**The timeline matters:** the regenerations that reverted on her were 09:29–14:30 on 08-12. The
fixes landed at 15:26–15:32 the same afternoon. Everything she reported was from *before* the fix.

## 4. Did it regress? No — it landed fully, and it is deployed

The `?s3Key=` override is properly demoted: the primary URL route now reads `s3_key` from the DB
and 404s if there is none. A client-supplied key survives only as a **fallback** when the DB has
no key (`production-api.cjs` ~line 4755), which is a much weaker hazard.

The cache fix shipped two things, and **both are wired**:

- a 5-minute TTL (`URL_CACHE_TTL_MS = 5 * 60 * 1000`); and
- an invalidator, `forgetAudioUrl(uuid)`, called from **all three** regeneration handlers in
  `src/views/production/ScriptViewer.vue` (lines 1922, 2072, 2225).

Verified on the **served bytes**, not just the source: `https://popty.app/` →
`assets/index-sH8puE86.js` → `assets/ScriptViewer-91WVB9Q-.js` contains `forgetAudioUrl`. So the
fix is deployed to the app Deborah actually uses.

> **Correction.** An earlier version of this document claimed `forgetAudioUrl` had zero callers
> and that the fix "never fully landed". That was wrong: I grepped this shared checkout's working
> tree, whose copy of `ScriptViewer.vue` is stale, and generalised from it. The call sites exist
> on `origin/main` and in the deployed bundle. Job #569 caught this independently.

**So the cache vector is closed, and the timeline is decisive:** her regenerations that reverted
were 09:29–14:30 on 08-12; the fix deployed at 15:32 that afternoon. All of her 08-13 and 08-14
work — 169 of the 182 swaps — was never exposed to it.

## 5. The `audio_clips` hypothesis — refuted for this course

Tom asked whether the canonical migration re-surfaced old pointers. It did not, and the number is
unambiguous:

| | count |
|---|---|
| Basque target clips in `course_audio` (`eus_for_eng`, `azure_eu-ES-*`) | **15,677** |
| The same clips present in `audio_clips` | **0** |

`audio_clips` holds **no opinion at all** about Basque target audio, so it cannot be the source of
a stale key here. Of the 13 clips she regenerated on 08-12, 12 have no `audio_clips` row and the
one that does (the English presentation clip) holds the **current** key.

Two things worth knowing anyway:

- `audio_clips` is large and live — 746,535 rows, still being written.
- **Every row's `updated_at` is the same instant: 2026-08-14 17:17:51.** A bulk backfill swept the
  whole table this afternoon. It did not harm eus, because eus target audio is not in it — but
  that is a big undirected write, and whoever ran it should confirm what it used as its source of
  truth before eus is migrated in.
- `audio_clips.id` is a **different id space** from `course_audio.id`. Joining the two on `id`
  returns nothing and makes a clean absence look like a proven one. Join on `source_audio_id` or
  the s3-key uuid.

## 6. The staleness figures were badly overstated

The 08-12 doc reported `eus_for_eng` desync as known 228 / target1 187 / target2 186, flagged as
an upper bound on a crude comparison. With a proper normaliser (strip all non-alphanumerics) the
true figures are:

| role | stale pointers | of |
|---|---|---|
| known | **32** | 6,450 |
| target1 | **1** | 6,450 |
| target2 | **1** | 6,450 |

**And 30 of the 32 are not an audio problem at all.** They are `B01` rows whose *known text*
carries a parenthetical annotation while the clip says the clean version:

| phrase says | clip says |
|---|---|
| `he doesn't like (neg)` | "he doesn't like" |
| `that you help me (subjunctive)` | "that you help me" |
| `watching television (gerund)` | "watching television" |
| `to meet (as in gathering)` | "to meet up" |
| `his/her` | "their" |

The audio is right; the **text** is the defect. These date to 2026-06-02 and are a
no-parentheses / A-108 annotation population — the same class as the `"that I am (subjunctive)"`
row I flagged on the content side. They should be fixed as text, and they need **no** new audio.

Only two are recent, and only one is genuinely re-pointable: `S0020L01B01` ("his/her" vs clip
"their") already has a correct clip sitting in `course_audio`. The other, `S0027L01B01`, is the
pre-existing shared-clip defect — `B01` and `B02` share all three clips, so regenerating either
overwrites both. That hazard is still live.

## 7. So what is the repair?

**Not regeneration. Barely even re-pointing.** One row (`S0020L01B01`) is worth re-pointing; the
rest of the "staleness" is text to clean up. The thing actually worth fixing is the client cache.

---

## Decision — make regeneration self-evidently correct

*(D1 as originally written — "wire `forgetAudioUrl`" — is withdrawn: it is already wired and
deployed. See the correction in §4. The two live risks below are the real ones, and job #569
proved both.)*

**D0 (recommended, most urgent): hold the `audio_clips` convergence pass.** Job #569 found the
follow-up `…_converge_s3.sql` would point `course_audio.s3_key` at the canonical object — and for
two eus lines ("I like learning quickly", "I like meeting people") the canon is **the very take
Deborah replaced**, inherited from `fra_ca_for_eng` and `lav_for_eng`. Estate-wide **262,097**
rows diverge from their canon. Running that pass as written would produce a real,
database-level reversion — the thing that has *not* happened so far. It must not run until the
canon is reconciled against later regenerations.

**D0b (recommended): stop regeneration overwriting a shared clip.** #569 proved this fired **8
times in three days** on Deborah's work, silently changing audio on rows she was not editing —
including three genuine Basque grammar distinctions (*duen*/*duten*, *ez dut*/*ez naiz*). 670
hazardous shared clips are live in eus alone. Same fix as D3 below; it has now moved from
theoretical to demonstrated.

**D2: make the collision path versioned.** `eus_for_eng` has **zero** rows in
`course_audio_revisions` — not "none recently", none ever — and every clip is still at
`audio_revision = 1` despite ~170 regenerations since 08-12. `services/audio-repair-core.cjs`
already does this correctly; `/regenerate-phrase` does not. Versioning makes every replacement
reversible and detectable, and it lets the cache key on `uuid + audio_revision`, which fixes the
whole class rather than one caller. Recommend doing it, after D1.

**D3: refuse to overwrite a shared clip.** Before an in-place swap, count other rows pointing at
that clip whose text differs; mint a new clip instead of overwriting. This is make-before-break
applied to clip identity, and `S0027L01B01`/`B02` is the live example. Recommend.

**D4: policy — should regeneration ever be unversioned?** My position: no. But that is a real
call, because versioning every regen has a storage and complexity cost, and D1 alone fixes what
Deborah actually experienced. **If you only want one thing, take D1.**

---

## Explicit gaps

- **No HTTP request log exists on watson-1**, so the cache vector is proven from the code and from
  the DB/S3 state, not from a captured browser request. I have not reproduced it live in a browser.
- **I did not test the English/known side of `audio_clips`.** English clips share voices across the
  estate, so they cannot be isolated to eus by voice alone; the 0-of-15,677 result is the
  Basque-specific target side only. A shared English clip could still behave differently.
- **The 9-times-in-29-seconds regeneration burst on lego `S0006L03`** (2026-08-14 18:35:22–18:35:51,
  text unchanged, `courses` stamped each time) is **unexplained**. It is consistent with someone
  hammering a regen button after not hearing a change — which is exactly the symptom the cache
  defect produces — but I have not proved that. Job #569 is on it.
- I have **not** verified that the deployed frontend bundle contains the cache fix; I verified the
  prod *checkout* contains the commits. Popty's frontend is rebuilt from main by Vercel, so the
  served chunk should be checked before declaring the 5-minute TTL live for Deborah.
