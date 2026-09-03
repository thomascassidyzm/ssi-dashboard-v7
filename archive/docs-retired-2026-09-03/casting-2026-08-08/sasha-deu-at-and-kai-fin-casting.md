# Casting: Sasha on deu_at_for_eng, Kai on fin_for_eng — and the bug underneath

**2026-08-08** · all findings read from live Supabase, not from documents.

---

## Headline

**Kai was right — Sasha was already cast, and the casting stuck.** `deu_at_for_eng.voice_config.voices.target2`
has held `provider: human`, `voiceId: human_sasha_wanasky_deu_at`, `assignedEmail: sasha.wanasky@gmail.com`
since **2026-08-04 21:00**, three days *before* the takes in question. I changed nothing about it.

The premise in the earlier brief — "deu_at_for_eng has no human voice assigned on its recording slot" — is **false**.
So the real defect is the one Kai anticipated: **a correct casting that the recording path is not honouring.**
That outranks the casting task, and it is reported below rather than papered over.

---

## 1. Sasha's account (verbatim)

```json
{
  "email": "sasha.wanasky@gmail.com",
  "name": "Sasha",
  "role": "editor",
  "courses": ["deu_at_for_eng"],
  "voice_id": "human_sasha_wanasky_deu_at",
  "invited_by": "kai@saysomethingin.com",
  "invited_at": "2026-07-27T11:02:12.741+00:00",
  "updated_by": "kai@saysomethingin.com",
  "updated_at": "2026-08-04T21:00:02.236+00:00"
}
```

They have a row, they hold the course, and they already carry a minted voice id. No invite needed.

### Every deu_at-family course code

Of 143 courses, five carry `deu_at` in the code. **Only one has a voice_config at all:**

| Course | voice_config |
|---|---|
| `deu_at_for_eng` | populated — see below |
| `deu_at_for_jpn` | **absent** (no voices object) |
| `deu_at_for_zho` | **absent** |
| `deu_ch_for_eng` | **absent** |
| `deu_for_cym` | **absent** |

So there is no second, competing casting hiding on a variant course code. `deu_at_for_eng` is the whole story,
and it is the only course in the entire table with a human voice slot.

### `deu_at_for_eng` slots as they stand (unchanged by me)

| Slot | Provider | Voice id | Note |
|---|---|---|---|
| known | xai | `eve` | |
| target1 | azure | `de-AT-IngridNeural` | Ingrid — **female** de-AT |
| **target2** | **human** | **`human_sasha_wanasky_deu_at`** | assignedEmail Sasha; `previousVoice` = `de-AT-JonasNeural` (**male**) |
| presentation | xai | `eve` | |

**No `previousVoice` stash anywhere suggests an assignment that was later overwritten.** The one stash present
(`de-AT-JonasNeural` under target2) is exactly what the machinery writes when a human first displaces a TTS
voice — it is evidence the casting was made *once* and has stood since, not evidence of churn.

### Voice gender: recorded as **`Neutral`**, at Kai's direction

Kai's ruling (2026-08-08) supersedes any male/female framing: **neutral is what best describes Sasha's actual
voice.** It is recorded as a deliberate value, not a placeholder, and Sasha's slot was not chosen on gender grounds.

**The exact literal used: `"Neutral"`** — capital N, the string as it exists in the codebase's only
voice-gender vocabulary:

- `services/voice-discovery-service.cjs:191` — `{ id: 'sal', name: 'Sal', gender: 'Neutral', notes: 'Gender-neutral option' }`
- surfaced as a pickable option at `src/components/VoiceConfiguration.vue:239` — `['all', 'Female', 'Male', 'Neutral']`

Written surgically onto `deu_at_for_eng.voice_config.voices.target2` as the single added key `gender`.
All other slots and all non-`voices` keys verified **byte-identical**; course version bumped `0.1089.8 → 0.1089.9`.

```json
{ "name": "Jonas", "gender": "Neutral", "voiceId": "human_sasha_wanasky_deu_at",
  "language": "de-AT", "provider": "human", "settings": { "speed": 1 },
  "assignedEmail": "sasha.wanasky@gmail.com",
  "previousVoice": { "voiceId": "de-AT-JonasNeural", "provider": "azure" } }
```

#### Gap: there was no existing *field* to put it in — only an existing *value*

I checked the live database directly (`information_schema` + `pg_enum`), not a document:

- **No gender enum exists in the database at all.** Not one of the 50-odd enum types is a gender.
- The only `%gender%` columns anywhere are `courses.needs_gender_prep`, `gender_prep_checked_at`,
  `gender_prep_check_notes` — those are **grammatical** gender-prep for target-language content
  (`gender-prep-coordinator.cjs`), nothing to do with voice.
- **`dashboard_users` has no gender column** (columns: email, name, role, courses, voice_id, invited_by,
  invited_at, updated_by, updated_at) — confirming the comment at `pods-router.cjs:162`,
  *"dashboard_users carries no gender — leader overrides in the UI"*.
- The voice-slot shape had no `gender` key either, and `assignVoiceToSlot` (`voice-slots.cjs`) never writes one.

So the neutral **value** genuinely exists in the system, in two places — but both sit on the wrong object:

| Where | Literal | What it describes |
|---|---|---|
| `voice-discovery-service.cjs:191` | `'Neutral'` | a property of the **xAI TTS preset `sal`** — you can filter for it, but "picking" it means picking Sal, a TTS voice |
| `pods-cast.cjs:266` | `'n'` | a **pod character's** gender. For *people*, `pods-cast.cjs:359` deliberately coerces anything not `'f'`/`'m'` to `null` — there is no `'n'` for a person |

Neither is a settable voice-gender for a human recorder on a reading-script target slot, **because that field
did not exist**. I used the existing literal `'Neutral'` and added the key to the slot rather than inventing a
new vocabulary — but I want to be exact about what that means:

- `validateVoiceConfig` (`voice-config-service.cjs:552`) has **no key whitelist**, so the key is accepted and
  `assignVoiceToSlot`'s `{...existing}` spread will preserve it across any future re-assignment. It is durable.
- **Nothing in the codebase reads `voices[slot].gender` today.** The record is inert — it changes no behaviour,
  no routing, no synthesis. It is a record, and an accurate one, but not yet a setting.

Making it a real setting (surfaced in the roster UI, written by `POST /assign-slot`) is a small code change and
Kai's call. Flagging rather than quietly implying the value is doing work it is not.

*(Unrelated leftover, unchanged: the slot's `name` still reads "Jonas" — the TTS voice it displaced. The
machinery preserves `name` on assignment. Cosmetic only; nothing reads it for routing.)*

---

## 2. THE REAL BUG — why takes were stamped `de-AT-IngridNeural`

The server resolves the voice id here:

**`services/production-api.cjs:4632`**
```js
slotVoiceId = courseRow?.voice_config?.voices?.[slotRole]?.voiceId || null
```
where `slotRole = metadata?.role` — sent by the client. So **the stamp is only ever as correct as the
`role` the recorder client sends.** Every one of the 13 deu_at takes was sent with `role: "target1"`,
so the server faithfully resolved target1's TTS voice, Ingrid. The casting was never consulted, because
nothing asked for target2.

There are **two distinct causes**, and only one is a live code defect:

### Cause A — the recovery script hardcoded the slot (10 of 13 takes)

**`scripts/a93-split/attach.cjs:30`**
```js
metadata: { mode:'script', role:'target1', cadence:t.cadence, ... }
```
A literal. Those 10 rows were always going to be stamped target1 regardless of any casting.
Not a casting bug; a one-off recovery-script bug, in a gitignored workspace script.

### Cause B — the production-console route drops the slot (the live defect)

`RecordRoom.vue` resolves the slot correctly and safely:
- `RecordRoom.vue:255-261` matches `voices[slot].assignedEmail` against the signed-in email — for Sasha this
  returns `target2` and `myVoiceId` = `human_sasha_wanasky_deu_at`.
- `RecordRoom.vue:150` mounts the studio behind `v-if="assignedSlot"`, so there is **no mount-time race** —
  the studio cannot start with a null slot.

But the *other* mount point does not pass a slot at all:

- `src/router/index.js:595` route `AutocueStudioCourse` (`/production/:courseCode/recording`) uses `props: true`,
  which passes **route params only** — and the only param is `courseCode`. `recordSlot` is therefore never supplied.
- `AutocueStudio.vue:257` — `recordSlot: { type: String, default: null }`
- `AutocueStudio.vue:474` — `setRecordingIdentity({ role: props.recordSlot, ... })` → `recordingSlot = null`
- `useAutocueState.js:155` — `state.selectedRole = state.recordingSlot || 'target1'` ← **silent default**
- `useAutocueState.js:728` — that role is what goes into the upload metadata

So **anything recorded from `/production/:courseCode/recording` is stamped target1**, whoever is signed in and
whatever they are cast as. There are two further `|| 'target1'` fallbacks at `useAutocueState.js:155, 728, 790`.

`RecordRoom.vue` even *links editors into that route* as an escape hatch when their slot looks unassigned
(the `v-if="!isRecorder"` router-link to `/production/${courseCode}/recording`).

**Smallest correct fix (NOT applied — code change, outside the "no pushes to main" scope of this job):**
make the silent `|| 'target1'` default impossible in script mode. Either pass the resolved slot into the
console route, or refuse to upload when `recordingSlot` is null rather than guessing. A guessed slot writes a
false voice attribution, which is exactly the failure being cleaned up here.

---

## 3. Is the bug closed?

**For the Record Room path: yes.** Dry read of the live config through the exact expression at
`production-api.cjs:4632`, no audio generated:

| Course | role sent | resolves to |
|---|---|---|
| deu_at_for_eng | `target2` (what Record Room now sends for Sasha) | **`human_sasha_wanasky_deu_at`** ✅ |
| deu_at_for_eng | `target1` | `de-AT-IngridNeural` (correct — that slot *is* Ingrid) |
| fin_for_eng | `target1` (Kai's new slot) | **`human_kai_fin`** ✅ |

**For the production-console path: no.** It still sends `target1` unconditionally. That is Cause B above and
it remains open.

---

## 4. Kai's test takes — made unpublishable

### The count is 13, not 11 — and there are 43 more in Finnish

The brief said 11 (10 recovered + one earlier take). The live table says otherwise. `scripts/a93-split/takes.json`
holds **20** recovered segments from **two** source blobs across **two** courses:

- `E79EFD14…` → 10 segments → `deu_at_for_eng`
- `5014B196…` → 10 segments → `fin_for_eng`

Full picture in `recording_provenance` (199 rows total, paginated, complete):

| Course | takes | recorded_by | role | stamped voice |
|---|---|---|---|---|
| `deu_at_for_eng` | **13** | 3 × sasha.wanasky@gmail.com + 10 × autocue-studio | all target1 | all `de-AT-IngridNeural` |
| `fin_for_eng` | **43** | kai@saysomethingin.com + autocue-studio | all target1 | all `ara` |

The 13 deu_at rows are one episode: **three** source blobs recorded 15:41–15:45 on 2026-08-07 (not one), plus
the ten segments split out of `E79EFD14`. Same three phrases repeated, natural+slow cadence pairs, one
four-minute window. The brief's "11" undercounted the source blobs by two.

**I marked all 13**, because they are provably a single test episode and splitting the difference would have left
two known-test takes live in the splice pool. Flagging the discrepancy loudly rather than silently obeying "11".

### The mechanism — existing, not invented

There is no status column on `recording_provenance` (columns are: audio_uuid, recorded_by, speaker_*, recorded_at,
recording_*, speaker_consent, consent_form_ref, usage_rights, quality_notes, retake_count, created_at, updated_at).
Take identity rides as JSON in `quality_notes`.

The codebase's existing exclusion marker is **`method`** inside that JSON. Absent or `'take'` = a real take;
**any other value takes it out of circulation**, and all three consumers already honour it:

- `services/voice-engine/provenance-adapter.cjs:108` — `if (take.method && take.method !== 'take') continue` (splice grouping)
- `services/voice-engine/synthesis-job.cjs:203` — same guard on the winner set
- `services/voice-engine/coverage.cjs:99` — `if (t.method === 'take' …)` counts coverage

`recordSplicedProvenance` already uses this field with value `'spliced'`. **I added no new field** — I set the
existing `method` to `'discarded'`, plus two inert sibling keys inside the same JSON blob for documentation
(`discarded_reason`, `discarded_at`). No DDL, no schema change.

Side effect, and it is the desired one: `coverage.cjs` now counts these phrases as **not covered**, so they go
back on the recording script for Sasha instead of appearing already-done.

### Exactly what it covers — 13 rows, no blobs touched

Course `deu_at_for_eng`, all `method: (absent) → "discarded"`:

```
2A1472AC-5C35-423C-85E3-2C1C2D8FBCF1   sasha.wanasky@gmail.com   (source blob)
76AD1FE6-1B41-48F2-B128-006902AEAEF7   sasha.wanasky@gmail.com   (source blob)
E79EFD14-8BA7-4EB7-B2A0-96481F09F508   sasha.wanasky@gmail.com   (source blob — the one named in the brief)
AFA5FC9C-AE3C-4F1D-83C5-627E21C7CBDB   autocue-studio            (recovered segment)
04F87FD7-20A0-4ECC-A474-DDF8C0C15F5A   autocue-studio
3BCA060F-1569-459B-9FF3-F0E145AE8BA2   autocue-studio
8F530C1D-0882-47FB-AC00-DF0EA14ADB78   autocue-studio
9E750829-D272-4222-99A3-45FDFE854E83   autocue-studio
8BE21044-F13E-49B7-9551-CED189D9FBDD   autocue-studio
69DFF6D8-3F30-42CD-9210-86D0BE2489BC   autocue-studio
3ABF3756-DD0E-4940-9D38-65CADF15A345   autocue-studio
65DADEBB-CFFC-44FB-A72D-0F678018FD79   autocue-studio
52A82012-759B-4AA1-B622-63182A9E2DA5   autocue-studio
```

**Nothing was re-stamped** — every `voice_id` still reads `de-AT-IngridNeural`, the true record of what the
server resolved. **Nothing was deleted** — all 13 `mastered/{uuid}.mp3` objects are untouched in S3, and none
of these takes was ever linked into `course_audio` (`course_audio_id` is null on all 13; a direct lookup by
s3_key returns no rows). They existed only as provenance rows + blobs.

**Verified through the real engine readers** against live data:

```
deu_at_for_eng voice=de-AT-IngridNeural      -> 13 rows (13 non-take) -> 0 spliceable phrase groups
deu_at_for_eng voice=human_sasha_wanasky_deu_at ->  0 rows            -> 0 spliceable phrase groups
```

### Reversal, in one step

Full prior `quality_notes` for all 13 rows is saved at `scripts/_deuat-provenance.before.json`
(exact bytes, keyed by audio_uuid). To undo: write each row's saved `quality_notes` back. Or, since the marking
is purely additive, delete the three keys `method`/`discarded_reason`/`discarded_at` from each row's JSON.

---

## 5. Kai on fin_for_eng — DONE, with a consequence you need to rule on

Assigned via the exact machinery `POST /assign-slot` uses (`voice-slots.cjs` `mintVoiceId` +
`assignVoiceToSlot`, then the same two writes and `bumpCourseVersion`).

**Took `target1`**, as instructed. What it displaced:

```
before:  { name: "Ara", voiceId: "ara",           language: "fin", provider: "xai" }
after:   { name: "Ara", voiceId: "human_kai_fin", language: "fin", provider: "human",
           assignedEmail: "kai@saysomethingin.com",
           previousVoice: { voiceId: "ara", provider: "xai" } }
```

`previousVoice` stashed by the existing machinery, as expected. `known`, `target2` and `presentation` verified
**byte-identical** before and after. `fin_for_eng` version bumped `0.687.5 → 0.687.6`.
Kai's `dashboard_users.voice_id` set `null → human_kai_fin`; **`courses` left as the string `"*"`** — untouched,
so no cross-course access was stripped.

**On the slot's gender semantics — no invention, here are the facts.** Per the registry at
`services/voice-discovery-service.cjs:188-191`: `ara` = **Female**, `leo` = Male, `sal` = **Gender-Neutral**.
So the Finnish slots were target1 = female voice, target2 = neutral voice. I had no basis to match Kai's voice
to either without guessing, so I followed the instruction and took target1 rather than inventing a reason.
Moving it to target2 is one call. No `gender` key was written on the Finnish slot — Kai's ruling was about
Sasha's voice, and I did not extend it to Kai's without being asked.

### ⚠️ Consequence you should rule on

`fin_for_eng` already holds **43 takes recorded by Kai**, every one stamped with the *old* TTS voice id `ara`
(role target1) — recorded before this casting existed. `fetchProvenanceRows` matches on voice id
(`if (t.voiceId) return t.voiceId === voiceId`), so after this cast:

```
fin_for_eng voice=human_kai_fin -> 0 rows  -> 0 spliceable phrase groups
fin_for_eng voice=ara           -> 43 rows -> 5 spliceable phrase groups
```

**Kai's 43 existing Finnish takes are now unreachable from Kai's own new voice id.** They are orphaned under `ara`.

I did **not** re-stamp them. Two reasons: re-stamping is exactly what was forbidden for the deu_at takes, and
more importantly **I cannot tell whether these 43 are real content or more recorder-testing** — they repeat the
same five phrases many times over, and one of them (`5014B196`) is the VAD-stuck blob that needed recovery-splitting,
which is the same failure mode as the deu_at test episode. That looks like testing, but it is Kai's call, not mine.

**This is an explicit gap.** Kai should rule on one of:
1. They are test takes → mark all 43 `method: 'discarded'` (same one-step mechanism, same reversibility).
2. They are real content → re-stamp `voice_id` `ara → human_kai_fin` (a *true* attribution — Kai recorded them and
   Kai is now the cast Finnish voice), which reconnects them to the splice pool.
3. Revert the Finnish casting entirely — `scripts/_fin-voice-config.before.json` holds the exact prior config.

---

## Gaps, stated plainly

0. **There was no existing *field* for a human voice's gender** — no enum, no column, no slot key (§1).
   I used the existing literal `'Neutral'` and added the key; nothing reads it yet, so it is an accurate record
   but not yet a setting. Making it real is a code change and Kai's call.
1. **The 43 Finnish takes are orphaned by my casting** (§5). Needs Kai's ruling. Fully reversible either way.
2. **Cause B is still open** (§2) — the production-console route still stamps `target1` unconditionally.
   Not fixed here: it is a code change and this job was scoped to no pushes to main.
3. **The brief's "11 takes" was 13**, and the same test episode has 43 more rows in Finnish (§4).
4. **I could not prove *which route* produced the 3 live deu_at takes.** The DB records role, not route. That
   they were stamped `target1` while a correct `target2` casting had stood for three days, and that Record Room
   is mount-gated on a resolved slot, points hard at the console route — but it is an inference, not a log line.
