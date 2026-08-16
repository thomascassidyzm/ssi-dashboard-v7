# Are the recording fix and the new recording interface actually live?

**Yes. Both. Aran and Catrin can be booked today.**

2026-08-16. A landing-state check, not an investigation — Tom's suspicion was that the pipeline fix
and the improved recording interface "might be still on a branch". They are not. Both are on `main`,
both are in the production checkout, and the process serving them was restarted onto that code at
**12:30:03 UTC today**. Verified on served bytes through popty.app, not inferred from source.

Nothing needs merging. Nothing needs deploying. There is no unblocking step.

---

## The two artefacts

### 1. The pipeline fix — landed and running

| | |
|---|---|
| Trim fix | `7178b34a` *fix(audio): human-recording trim kept 100ms of silence instead of eating 100ms of speech* — 2026-08-14 16:47:42Z |
| Raw retention | `0d76bd5c` *feat(recording): retain every raw take at raw/{UUID}.{ext}, archived BEFORE processing* — 2026-08-14 17:50:49Z |
| On `origin/main`? | Yes, both. |
| In the production checkout? | Yes. `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, on `main` at `688bf843`, clean, **zero commits behind `origin/main`**. `services/audio-processor.cjs:914,916` reads `start_silence=0.05` on both passes. `services/production-api.cjs:5004,5057` archives the untouched original to `raw/{UUID}.{ext}` before processing. |

### 2. The improved recording interface — the ONE RECORDIST SURFACE at `/r/:voiceId`

**What I concluded it is, and why.** Tom did not name it, so: it is the one recordist surface
shipped 2026-08-14 and written up in `docs/one-recordist-surface-2026-08-14.md` — 5 surfaces
collapsed to 1, 4 screens before the first line collapsed to 2, 6 taps plus a login email collapsed
to 2 taps. `src/views/RecordistRoom.vue` behind the public route `/r/:voiceId`
(`src/router/index.js:394`), served by `services/voice-engine/recordist-router.cjs` at
`/api/recording/*`. It is not a second candidate: `feat/recordist-ui-2026-08-14` was merged INTO
`feat/one-recordist-surface-2026-08-14` at `9c9de1ec`, so the two branch names are one piece of work.

**Landing state, by patch-equivalence:**

| Branch | `git cherry origin/main <branch>` | Verdict |
|---|---|---|
| `origin/feat/one-recordist-surface-2026-08-14` | empty | **MERGED RESIDUE** — the work is in `main`; the branch is debris |
| `origin/feat/recordist-ui-2026-08-14` | empty | **MERGED RESIDUE** |
| `origin/feat/promote-accepted-to-mastered-2026-08-14` | empty | **MERGED RESIDUE** |
| `origin/feat/canonical-audio-identity-2026-08-14` | 9 commits, 16 files, +2267/−24 | **genuinely unlanded — and unrelated to this question** |

On the last one: it is phase-8 serving and DB convergence work (`services/phases/phase8-audio-v13.cjs`,
`services/shared/canonical-clip-store.cjs`, seven migrations). Nothing on the recording path
references `canonical-clip-store.cjs`, and that file does not exist in the production checkout at
all. It is not part of the interface Aran and Catrin hit, and it is not blocking their session.

---

## The live path, verified on served bytes

The path they will actually hit is **popty.app** (Vercel frontend, built from `main`) →
same-origin `/api/recording/*` proxy → **`popty-production-api.service`** on watson-1, whose
`WorkingDirectory` is the *production* checkout, not any agent's working copy.

- `GET https://popty.app/r/human_aran_cym_n` → **200**. The served bundle
  `/assets/index-BTl4QprP.js` references `RecordistRoom-Ck0mawyq.js`; that chunk fetches (13,468
  bytes) and carries `includeRecorded` — the "let the recordist hear the takes he already made"
  feature from `eed55413`. **The new interface is the one being served.**
- `GET https://popty.app/api/recording/voice/human_catrinlliar_cym_n` → **200 with a real queue**,
  through the public host end to end.
- Unit start `2026-08-16 12:30:03 UTC` versus main's own head commit `12:21:32Z` and the fixes'
  `2026-08-14` — **the running process was started after all of it.**

**The two live links, which are what actually books the session:**

| | Link | Queue right now |
|---|---|---|
| Aran | `https://popty.app/r/human_aran_cym_n` | 170 total, 71 recorded, **99 left** |
| Catrin | `https://popty.app/r/human_catrinlliar_cym_n` | 276 total, 0 recorded, **276 left** |

(Voice ids come from `language_recording_policy`; `cym`, `bre`, `pdc`, `zzz` are on it, all
`human_only`. The link is the identity — no login, no course picker.)

### One number the T-20 card gets wrong

The card says Catrin's queue is **144** female north-Welsh lines. The live by-language queue says
**276** — because Welsh is four courses, and the new surface is scoped by language rather than by
course, which is the whole point of the rebuild. 144 was the `cym_n` slice. If the commissioning
decision is "one conversation, one session", the number to put in front of her is 276, not 144.

---

## Explicit gaps

- **I did not push a synthetic take through the live upload path.** Doing so writes a junk clip into
  the estate, and the fences on this job forbid that. The trim fix is therefore verified as
  *correct source in the checkout the running unit serves, with a restart after the commit* — strong,
  but not the served-bytes proof the 2026-08-14 diagnosis used for the defect itself.
- **Aran's own device or browser** remains the only unexplored place a pre-processing original of his
  twelve clips could survive. That is a question for a human to ask him, not something code can
  answer. Not chased.

---

## Pointers

- Diagnosis of the defect: `docs/audio-forensics-2026-08-14/t20-clipped-human-recordings-diagnosis.md`
- Originals hunt (answer: none survive): `docs/audio-forensics-2026-08-14/t20-originals-hunt-backups.md`, `…-logs.md`
- Re-record scope: `docs/audio-forensics-2026-08-14/full-rerecord-scope-verified-2026-08-14.md`
- The interface: `docs/one-recordist-surface-2026-08-14.md`, `docs/recordist-api-contract-2026-08-14.md`
