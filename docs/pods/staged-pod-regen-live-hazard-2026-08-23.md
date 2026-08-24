# Can a phase-8 regen aimed at a staged pod change what live learners hear right now?

**YES — via the redo/fix path any real repair on a staged pod would actually need, not
via the "fill missing" path most people mean by "phase-8 regen."**

Read-only investigation. Nothing was generated, written, queued, or run. All evidence
is file:line or a `SELECT`-only query against production.

---

## 1. Does regen update in place (same row/uuid) or insert-new-and-relink?

**Both exist, and which one you get depends entirely on which endpoint you call —
there is no single "the phase-8 regen path."**

- **`POST /regenerate-single/:courseCode/:audioUuid`** — `services/phases/phase8-audio-v13.cjs:4307-4318`.
  Looks the row up by `id` alone, renders new audio, then:
  ```js
  await supabase.from('course_audio').update({ voice_id, origin:'tts', s3_key: newS3Key, ... }).eq('id', audioUuid)
  ```
  **In-place UPDATE. Same row, same uuid, new S3 object.** Every pointer to that id —
  in any course, any pod — now serves the new take, with zero notice.

- **`generatePodAudio()`** (the function backing all pod audio rendering) —
  `services/phases/phase8-audio-v13.cjs:6450-6467` — content-addressed dedup:
  ```js
  .upsert({ course_code, text, text_normalized, language, role, voice_id, ... },
    { onConflict: 'course_code,text_normalized,language,role,voice_id' })
  ```
  Called *without* `force` (the normal `/generate-pods` path — see §2), a hit on this
  key returns the **existing** row untouched (`findExistingAudio`, line 6383-6384: `if
  (existing && !force) return { id: existing, reused: true }`). Called *with*
  `force:true`, the upsert **re-hits the same conflict key → same row id → in-place
  overwrite**, exactly like `/regenerate-single`. `tools/rescue-take-g.cjs:8-11` documents
  this mechanic explicitly in its own header comment: *"force re-render the SAME cued
  text. The upsert hits the same conflict key, so the row id... is unchanged."*

- **`/regenerate-phrase/:courseCode/:phraseId`** (`phase8-audio-v13.cjs:4627`, the one the
  main ScriptViewer UI text-edit flow actually calls) mints a genuinely **new** row when the
  text changes (new conflict key) and rebinds the phrase pointer — safe, by construction,
  for a text edit. But a same-text "bad take, redo it" request has an unchanged conflict
  key, so it lands on the **same** row too (line 4658 area, same `upsert`/`onConflict`
  pattern as `generatePodAudio`).

**Answer to Q1: it depends on the endpoint. The endpoints that redo an *existing,
unedited* clip (`/regenerate-single`, and `generatePodAudio` with `force:true`) update
in place, keeping the uuid — exactly the estate's known "same-text regen keeps the uuid"
behaviour, confirmed on the actual code, not inferred from the doc.**

## 2. Does the regen path scope by pod, or by course/clip?

**No general pod scoping exists.** `/regenerate-single`, `/regenerate-lego`,
`/regenerate-phrase` key on `(course_code, id|legoId|phraseId)` only — none of them
consult `listening_pod_sentences` at all, so none of them know or care whether the
`course_audio` row they're about to overwrite is also the row a live pod's
`target_audio_id`/`known_audio_id` points at.

The **one** place pod-awareness exists is the bulk role sweep, `/regenerate-role`
(`phase8-audio-v13.cjs:2745-2762`), which explicitly filters pod-linked clips out —
with a comment naming the exact incident this guards against ("2026-06-07 — 110 pod
clips steamrolled to eve"). **That awareness was never extended to `/regenerate-single`
or to `generatePodAudio`'s `force` path.** The team has already been burned by
"pod audio isn't isolated" once, patched the one endpoint that caused it, and the
underlying architectural fact — `course_audio` identity is content-addressed
per-course, not per-pod or per-consumer — is still true everywhere else.

**The pod-specific admin surface (3 endpoints total: `/api/admin/pods/:courseCode/generate-audio`,
`/generate-explainer-audio`, `/generate` for dialogue text) is safe by construction** —
every one of them only fills a **null** `*_audio_id` (`services/production-api.cjs:4009-4012`:
*"Phase 8 only generates clips whose audio_id is null, so this never deletes or overwrites
existing audio"*). None of the 4,639 shared clips found in §4 are null in the staged pods —
they're already linked — so a plain `/generate-pods` run against a staged pod today
**cannot** touch them. This is the good news, and it's why the hazard isn't visible from
the pod-specific endpoints alone.

**The hazard is that "fixing" a staged pod's bad clips is not a fill-missing operation —
it's a redo-existing operation, and no pod-scoped redo tool exists.** The only tools that
redo an *existing* clip are the generic, pod-blind ones from Q1.

## 3. Does a force-new-row mechanism exist?

**Partially, inconsistently, and not on the paths that matter.**

- `::superseded-regen` is a **manual text tombstone**, hand-applied by one-off repair
  scripts (`tools/repair-presentation-clips.cjs` and direct SQL — see
  `docs/audio-repair-2026-08-08/why-the-ich-will-fix-did-not-stick.md`). It is not a flag,
  not an argument, not wired into any phase-8 regen endpoint's request body. It's the
  scar tissue from the team hitting this exact class of bug on `deu_for_eng`/`fra_for_eng`
  in August and hand-patching it — evidence the failure mode is real and recurring, not a
  systemic fix.
- `generatePodAudio`'s `force` argument does the **opposite** of forcing a new row — it
  forces a re-render **onto the existing row** (§1).
- `/regenerate-phrase` only gets a new row as a *side effect* of the text actually
  changing; a same-text redo does not get one.
- **No endpoint anywhere accepts "always mint a new uuid regardless of content match."**

**Answer: the machinery to force a genuinely new, pod-private row does not exist today
and would have to be built.**

## 4. Exposure — Group 2, 21 courses, `pod-0-unrecorded` vs `pod-0`

Read-only `SELECT`, DISTINCT clip ids (not line-links), voice-id normalisation not
needed for this count — a "shared clip" here means the *same `course_audio.id`* is
linked from both pods, so it's an exact row-identity check, immune to the bare/prefixed
voice-id duality. `nld_for_eng` reproduced Tom's already-measured 223/347/284 exactly,
validating the method.

| course | shared clips | staged total | live total |
|---|---:|---:|---:|
| bul_for_eng | 235 | 460 | 283 |
| cat_for_eng | 221 | 346 | 284 |
| dan_for_eng | 196 | 333 | 284 |
| ell_for_eng | 227 | 348 | 284 |
| est_for_eng | 235 | 458 | 284 |
| fas_for_eng | 214 | 340 | 284 |
| gle_for_eng | 219 | 345 | 284 |
| heb_for_eng | 203 | 336 | 284 |
| hin_for_eng | 189 | 328 | 282 |
| hye_for_eng | 201 | 460 | 284 |
| isl_for_eng | 185 | 451 | 283 |
| lav_for_eng | 252 | 361 | 284 |
| lit_for_eng | 235 | 353 | 284 |
| nep_for_eng | 257 | 361 | 283 |
| nld_for_eng | 223 | 347 | 284 |
| nor_for_eng | 231 | 349 | 284 |
| pol_for_eng | 205 | 338 | 283 |
| swa_for_eng | 230 | 349 | 284 |
| tha_for_eng | 226 | 356 | 284 |
| tur_for_eng | 218 | 344 | 284 |
| ukr_for_eng | 237 | 353 | 284 |
| **TOTAL** | **4,639** | — | — |

Every one of the 21 courses shares 185-257 distinct clips between its staged and live
pod-0 — the hazard from `nld_for_eng` is not an outlier, it's the estate norm.

---

## Recommended resolution

**One word Tom can approve: FORK.**

Before any redo/fix work touches a single staged-pod clip, run a bounded script that,
for each of the 4,639 shared clip ids: copies the `course_audio` row to a **new** uuid
(new S3 object, byte-identical copy — no re-render, no cost), then repoints the staged
pod's sentence link to the fork, leaving the live pod's link and the original row
untouched. This is make-before-break in its simplest form (`tools/revoice-clips.cjs` is
the existing reference pattern for "insert new row → repoint → old row survives, nothing
deleted"). After that pass, the staged pods own 100% private rows and **any** redo tool —
including the currently pod-blind `/regenerate-single` — becomes safe to point at them,
because there is no longer a shared row underneath for it to hit.

**Does the machinery already exist?** No — `tools/pods/clone-pod.cjs`, the nearest
existing tool, does the opposite (copies audio *ids* across, which is *how* Group 1's
staged/live sharing gets created in the first place, per the brief). The fork script
would be new, but small and mechanical: it's a copy-row + repoint-one-column loop over a
known list of 4,639 ids, using the same S3-copy + relink pattern `revoice-clips.cjs`
already proves out for a different trigger (voice swap instead of dedup collision).

**Until that fork pass runs, the only safe operation on a staged pod is `/generate-pods`
without `force`** (fills nulls only, §2) — any redo of an existing clip, by any tool that
exists today, risks silently rewriting what a live learner hears next.

---

## Gaps — explicit

- I did not check whether `/regenerate-single` or `generatePodAudio{force:true}` has
  ever actually been fired against one of these 4,639 specific ids historically (i.e.
  whether the hazard has already materialised, vs. is only live-and-armed). That would
  need `content_audit_log`/S3-version-history forensics per id and was out of the
  one-hour budget.
- I confirmed the 3 pod-specific admin endpoints are null-only-safe by reading their code
  and the route comments, not by exercising them (read-only mandate).
- I did not audit Group 1 (`clone-pod.cjs`-based courses) for the same exposure — the
  brief states the mechanism is analogous but I did not run the equivalent query there.
