# hrv_for_eng pod-0 — gloss fidelity audit (2026-07-14)

Tom reported the Croatian pod-0 English gloss sometimes asserts a meaning the
Croatian doesn't contain (e.g. "Dobar dan. Što mogu donijeti?" glossed "Good
afternoon. What can I get you?" — dobar dan is time-neutral "good day", and
donijeti is "bring", not "get"). Rule: `docs/pods/pod-ladder-proposal.md` §9 —
the known-language line must faithfully reflect what the target sentence
actually says; a learner must never see a gloss asserting a meaning the
target does not contain.

## Where the data lives

`listening_pod_sentences.known_text` (Supabase), one row per pod turn,
`pod_id = 'hrv_for_eng:pod-0'`. Read live by:
- `api/pod-content.js` (Vercel API, learner-facing)
- `ssi-learning-app/packages/player-vue/src/composables/useListeningPods.ts`
  (queries `listening_pod_sentences` directly from the client)

No manifest, no build step, no re-seed — the player reads this table live, so
edits are visible immediately on staging/production. The only cache is a
per-user IndexedDB offline-download cache (`listeningMetaCache.ts`) for
learners who've done a deliberate offline download; that's a client-side
concern, not a staging propagation step.

## Audit method

Read all 142 `hrv_for_eng:pod-0` rows (`target_text` / `known_text`),
translated each Croatian sentence independently, and compared against the
existing gloss. Cross-checked repeated constructions (`donijeti`, `dobar
dan` family, `malu/veliku`, `želim/želiš li/želite li` vs `bih` conditionals)
across all their occurrences for internal consistency, not just isolated
readings.

## Changes applied (10 rows, `known_text` only)

| id | target_text | old gloss | new gloss |
|---|---|---|---|
| SC03-S001 | Dobar dan. Što mogu donijeti? | Good afternoon. What can I get you? | Good day. What can I bring you? |
| SC03-S002 | Dobar dan. Želim kavu, molim. S mlijekom ali bez šećera. Za ponijeti. | Good afternoon. I'd like a coffee, please. ... | Good day. I'd like a coffee, please. ... |
| SC07-S001 | Dobro jutro. Što mogu donijeti? | Good morning. What can I get you? | Good morning. What can I bring you? |
| SC07-S003 | Želiš li malu ili veliku? | Do you want regular or large? | Do you want small or large? |
| SC07-S005 | Naravno. Želiš li ostati ili ponijeti? | Of course. Would you like to sit-in or takeaway? | Of course. Do you want to sit-in or takeaway? |
| SC07-S008 | Odmah. Želite li još nešto? | Right away. Would you like anything else? | Right away. Do you want anything else? |
| SC07-S014 | Želite li sjesti? Stol kraj prozora je slobodan. | Would you like to sit-in? ... | Do you want to sit-in? ... |
| SC08-S001 | Dobra večer. Što mogu donijeti? | Good evening. What can I get you? | Good evening. What can I bring you? |
| SC08-S003 | Imamo gorko pivo i tamno pivo, i oba su domaća. | We've got a bitter and a stout, and they're both local. | We've got a bitter and a dark beer, and they're both local. |
| SC09-S003 | Želite li negaziranu ili gaziranu vodu za početak? | Would you like still or sparkling water to start? | Do you want still or sparkling water to start? |

**Rationale by class:**
- **"Dobar dan"** (3 rows) — time-neutral "good day", not "good afternoon";
  the course already has the genuine "good afternoon" greeting ("Dobro
  podne", SC11-S001, left untouched) — collapsing both to "Good afternoon"
  would have hidden a real Croatian distinction.
- **"donijeti"** (3 rows) — means "bring"; the same course correctly glosses
  it "bring" elsewhere (SC09-S014 "Odmah ću donijeti" → "I'll bring it right
  over", untouched) confirming "get" was the drift, not house style.
- **"malu"** (1 row) — means "small"; every other occurrence of malu/veliku
  in the course (SC07-S004, SC08-S004/009, SC09-S010) is correctly
  small/large — SC07-S003 was the outlier.
- **"tamno pivo"** (1 row) — "dark beer" (generic), not "stout" (a specific
  style not asserted by the Croatian).
- **"Želiš/Želite li"** present-tense "do you want" (4 rows) — glossed as
  conditional "would you like", which collides with the course's genuine
  `bih`-conditional forms (Željela bih, Željeli bismo, biste željeli —
  correctly "would/'d like", left untouched). Collapsing both to "would
  like" erases a real grammatical distinction Croatian marks and English
  can too, without any loss of naturalness ("Do you want anything else?" is
  standard café English).

Everything else in the 142 rows checked faithful under this reading —
including several close calls I did **not** change because they don't assert
a false meaning, only a synonym-level register choice (e.g. "Odlično" varying
between "very well/lovely/wonderful", "moram" as "need to", "kupiti" as
"get"): normal translation latitude, not a target/gloss mismatch.

## Known side-effect — audio now stale for these 10 rows

Each row's spoken English translation (`known_audio_id`) was recorded
reading the OLD gloss text. Per the existing edit convention
(`services/production-api.cjs`'s `PATCH /api/admin/pod-sentences/:id`: "Editing
target/known text nulls its audio... Phase 8 regenerates"), `known_audio_id`
was nulled on all 10 rows so the pipeline doesn't play stale audio against
the corrected on-screen text. **No audio was generated or deleted — this is
a DB link-field null only.**

Additionally, 7 of the 10 rows have a populated `sentence_known_audio_ids`
(the per-sub-sentence "fine ladder" English clips, from
`render-sentence-takes.cjs`) that is now equally stale, but that script skips
any row whose `sentence_audio_ids` (target side) is already fully linked —
it doesn't currently detect a known-text-only change, so re-running it as-is
won't pick these up. Regenerating those 7 rows' fine-known clips needs either
a small script fix (detect known-text drift, not just missing links) or a
manual clear + targeted re-run — flagged here rather than guessed at, since
it's TTS-approval-gated territory.

An audio-pass request has been queued (`audio_pass_requests`, course
`hrv_for_eng`, reason "pod-0 gloss fidelity fix") per the standing
CLAUDE.md protocol — **no TTS has been run.** Approval + a run of
`render-sentence-takes.cjs hrv_for_eng` (whole-turn known clips will
regenerate automatically via the nulled `known_audio_id`; the 7-row fine-ladder
gap needs the script fix above first) is the next step, Tom's call.

## Script

`scripts/fix-hrv-pod0-gloss-fidelity.cjs` (gitignored workspace script) —
DRY_RUN by default, asserts each row's current `target_text` + `known_text`
against expected before-state before writing, aborts on drift, logs to
`scripts/hrv-pod0-gloss-fidelity-{dryrun,applied}-log.json`. Both dry-run and
apply passes completed clean, 10/10 rows verified and updated.
