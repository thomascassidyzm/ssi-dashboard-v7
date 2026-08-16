# Audio Pipeline Architecture

> SSI Dashboard v7 - Comprehensive Audio Generation & QA System

## Overview

The audio pipeline transforms course content into production-ready audio samples through TTS generation, human recording, and quality assurance workflows.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                          AUDIO PIPELINE OVERVIEW                                │
│                                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│   │  PHASE   │    │  PHASE   │    │  PHASE   │    │    QA    │    │  PHASE   │ │
│   │    3     │───▶│    8     │───▶│  REVIEW  │───▶│ WORKFLOW │───▶│    9     │ │
│   │ Baskets  │    │  Audio   │    │          │    │          │    │ Manifest │ │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                                 │
│   lego_baskets     TTS Gen +        Supabase       Flag/Regen    course_manifest│
│      .json         S3 Upload      audio_samples    Human Rec         .json     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Deterministic UUID System

Every audio sample has a unique, reproducible identifier based on its content:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UUID GENERATION (v11)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ALGORITHM: UUID v5 (RFC 4122 compliant)                                   │
│   NAMESPACE: 6e2d1e3a-2c4a-4b5d-8e6f-1a2b3c4d5e6f (SSi Audio)               │
│   SOURCE: services/uuid-v11.cjs (Single Source of Truth)                    │
│                                                                             │
│   INPUT ORDER (optimized for readability - most variable component last):   │
│                                                                             │
│     voiceId : lang : role : cadence : text                                  │
│        │        │      │       │        │                                   │
│        ▼        ▼      ▼       ▼        ▼                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  "azure_es-ES-ElviraNeural:spa:target1:slow:quiero"                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│                           ┌─────────────────┐                               │
│                           │  UUID v5 (SHA1) │                               │
│                           │  RFC 4122       │                               │
│                           └─────────────────┘                               │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      UUID FORMAT: 8-4-4-4-12                         │   │
│   │                                                                     │   │
│   │          B9D6E203-BA26-530F-9FC5-EBE50D6F5779                        │   │
│   │          ────────  ────  ────  ────  ────────────                    │   │
│   │             8       4     4     4        12                          │   │
│   │                      │                                              │   │
│   │                      └── "5" = UUID version 5                       │   │
│   │                                                                     │   │
│   │          (RFC 4122 UUID v5 format - uppercase, deterministic)       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   COMPONENT ORDER RATIONALE:                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  voiceId  │ Least variable  │ Same voice used for many samples      │   │
│   │  lang     │ Low variability │ Usually one target language           │   │
│   │  role     │ Low variability │ Only 4 roles: source/target1/2/pres   │   │
│   │  cadence  │ Low variability │ Only 2: natural, slow                 │   │
│   │  text     │ MOST variable   │ Thousands of unique phrases           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   This order gives the most "space" to the most variable component (text)   │
│                                                                             │
│   CODE REFERENCE:                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  // services/uuid-v11.cjs - generateSampleId()                      │   │
│   │  const key = `${voiceId}:${lang}:${role}:${cadence}:${text}`;       │   │
│   │  return uuidv5(key, SSI_AUDIO_NAMESPACE);                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Same phrase + voice = Same UUID across ALL courses
- Automatic deduplication (no regenerating existing audio)
- Verifiable integrity (hash can be recalculated)
- **RFC 4122 compliant** - proper UUID v5 format
- **8-4-4-4-12 format** matches standard UUID convention for readability

---

## 2. Audio Roles

Each phrase may have multiple audio variants:

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUDIO ROLES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PHRASE: "quiero" (I want)                                     │
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │   SOURCE    │  │   TARGET1   │  │   TARGET2   │             │
│   │  (English)  │  │   (Female)  │  │   (Male)    │             │
│   ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│   │ "I want"    │  │  "quiero"   │  │  "quiero"   │             │
│   │ natural     │  │    slow     │  │    slow     │             │
│   │ cadence     │  │   cadence   │  │   cadence   │             │
│   └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│   ┌─────────────────────────────────────────────────┐           │
│   │              PRESENTATION                        │           │
│   ├─────────────────────────────────────────────────┤           │
│   │  "The Spanish for 'I want', is: ... 'quiero'    │           │
│   │   ... 'quiero'"                                 │           │
│   │                                                 │           │
│   │  = source TTS + 1s pause + target1 + 1s +       │           │
│   │    target2 (concatenated)                       │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2b. TTS Exclusions — courses that must never be synthesised

Two categories of content are hard-blocked from TTS. Both use the same defence
pattern: a **chokepoint** assertion inside `services/tts-service.cjs` `generate()`
(the single point every provider path passes through) that fails **non-retriably**
(`(403)` → `isRetriableTtsError` treats it as a client error), plus **entry-point
guards** so pipeline drivers skip the work up front with a logged notice.

| Exclusion | Chokepoint | Source of truth |
|-----------|-----------|-----------------|
| **Child voices** — never allowed on any course | `assertNotChildVoice(config)` (keys off `config.voiceName`/`voiceId`) | `CHILD_VOICE_IDS` in `tts-service.cjs` |
| **Human-voice-only courses** — Welsh `cym_*` are human-recorded; TTS is a defect | `assertNotHumanVoiceCourse(config)` (keys off `config.courseCode`) | `services/shared/human-voice-courses.cjs` |

**Human-voice-only courses (Tom's ruling, 2026-07-25; extended 2026-07-27):**
`cym_n_for_eng` and `cym_s_for_eng` — and every `cym_*` course by prefix — are
HUMAN-VOICED ONLY. `bre_for_fra` (Breton) joined the set on 2026-07-27 (Azure
has no Breton voice; same policy). No TTS may ever be generated for these
courses; their pending `audio_pass_requests` were dismissed on the respective
ruling dates. 97 pre-ruling TTS clips exist for `bre_for_fra` (ElevenLabs
origin) — recorded here, not unlinked, per the same generated-asset policy as
the historical `cym_*` clips below. Entry points that skip them up front:
`phase8 /generate` (and `/regenerate-role`, `/regenerate-presentations`,
`/regenerate-single`), `tools/course-optimization/run-approved-audio-passes.cjs`,
`tools/rescue-child-voice-clips.cjs`, `tools/rescue-wrong-language-clips.cjs`,
`tools/rescue-take-g.cjs`, `tools/sweep-wrong-language-crosscourse.cjs`,
`tools/course-optimization/regenerate-stamped-builds.cjs`,
`tools/build-chunk-audio-regen-queue.cjs`. Adding a new Welsh course needs no
code change — the `cym_*` prefix rule covers it.

> Historical note: 110 TTS-origin `cym_*` clips exist from **2026-07-05** (62 in
> `cym_n_for_eng`, 48 in `cym_s_for_eng`, xAI voice `gfzdpspr5fdp`), predating the
> ruling. Per repo policy generated assets are never deleted without a separate
> deletion plan + approval; these are recorded here, not removed. No `cym_*` TTS
> was minted by any sweep on/after 2026-07-20.

## 3. Phase 8: Audio Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 8: AUDIO GENERATION                           │
│                              Port 3465                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INPUT: lego_baskets.json                                                  │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────┐                                                       │
│   │  Extract all    │                                                       │
│   │  unique phrases │                                                       │
│   └────────┬────────┘                                                       │
│            │                                                                │
│            ▼                                                                │
│   ┌─────────────────┐     ┌─────────────────┐                               │
│   │  Check Supabase │────▶│  Skip existing  │                               │
│   │  for existing   │     │  (deduplication)│                               │
│   └────────┬────────┘     └─────────────────┘                               │
│            │                                                                │
│            ▼ (missing only)                                                 │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │                   TTS GENERATION                         │               │
│   │  ┌───────────┐              ┌───────────┐               │               │
│   │  │   Azure   │              │ ElevenLabs│               │               │
│   │  │    TTS    │              │    TTS    │               │               │
│   │  └─────┬─────┘              └─────┬─────┘               │               │
│   │        │                          │                     │               │
│   │        └──────────┬───────────────┘                     │               │
│   │                   ▼                                     │               │
│   │          ┌─────────────────┐                            │               │
│   │          │   Normalize     │                            │               │
│   │          │  -16 LUFS       │                            │               │
│   │          │  (EBU R128)     │                            │               │
│   │          └────────┬────────┘                            │               │
│   │                   │                                     │               │
│   │                   ▼                                     │               │
│   │          ┌─────────────────┐                            │               │
│   │          │ Extract Duration│                            │               │
│   │          │   (sox/ffprobe) │                            │               │
│   │          └────────┬────────┘                            │               │
│   └───────────────────┼─────────────────────────────────────┘               │
│                       │                                                     │
│                       ▼                                                     │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │                   STORAGE                                │               │
│   │                                                         │               │
│   │   ┌─────────────┐              ┌─────────────┐          │               │
│   │   │     S3      │              │  Supabase   │          │               │
│   │   │  mastered/  │              │audio_samples│          │               │
│   │   │  {uuid}.mp3 │              │   table     │          │               │
│   │   └─────────────┘              └─────────────┘          │               │
│   │                                                         │               │
│   └─────────────────────────────────────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 8 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate` | Start audio generation job |
| POST | `/plan` | Dry-run showing what would be generated |
| GET | `/status/:courseCode` | Check job progress |
| DELETE | `/cancel/:courseCode` | Cancel active job |
| GET | `/health` | Health check |

---

## 4. Sample Flag Lifecycle (12 Statuses)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SAMPLE FLAG LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌──────────┐                                      │
│                           │ pending  │ ◄─── Initial TTS generated           │
│                           └────┬─────┘                                      │
│                                │                                            │
│               ┌────────────────┼────────────────┐                           │
│               │                │                │                           │
│               ▼                ▼                ▼                           │
│   ┌───────────────────┐ ┌──────────────┐ ┌─────────────────┐                │
│   │ flagged_text_edit │ │flagged_regen │ │flagged_human    │                │
│   │                   │ │    _tts      │ │   _needed       │                │
│   └─────────┬─────────┘ └──────┬───────┘ └────────┬────────┘                │
│             │                  │                  │                         │
│             │     ┌────────────┘                  │                         │
│             │     │                               │                         │
│             ▼     ▼                               ▼                         │
│       ┌─────────────────┐                 ┌─────────────┐                   │
│       │   in_pipeline   │                 │in_recording │ ◄── Claimed       │
│       │   (TTS regen)   │                 │             │                   │
│       └────────┬────────┘                 └──────┬──────┘                   │
│                │                                 │                          │
│       ┌────────┴────────┐                        │                          │
│       │                 │                        │                          │
│       ▼                 ▼                        ▼                          │
│ ┌────────────┐   ┌────────────┐          ┌────────────┐                     │
│ │tts_complete│   │ tts_failed │          │  recorded  │ ◄── Upload done     │
│ └─────┬──────┘   └────────────┘          └──────┬─────┘                     │
│       │                                         │                           │
│       └──────────────┬──────────────────────────┘                           │
│                      │                                                      │
│                      ▼                                                      │
│               ┌─────────────┐                                               │
│               │needs_review │ ◄── Ready for QA                              │
│               └──────┬──────┘                                               │
│                      │                                                      │
│            ┌─────────┴─────────┐                                            │
│            │                   │                                            │
│            ▼                   ▼                                            │
│     ┌──────────┐        ┌──────────┐                                        │
│     │ approved │        │ rejected │ ───▶ Back to flagged state             │
│     └────┬─────┘        └──────────┘                                        │
│          │                                                                  │
│          ▼                                                                  │
│     ┌──────────┐                                                            │
│     │ complete │ ◄── Production ready                                       │
│     └──────────┘                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Human Recording Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HUMAN RECORDING WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     RECORDING QUEUE                                  │   │
│   │   GET /api/production/:courseCode/recording/queue                   │   │
│   │                                                                     │   │
│   │   ┌─────────┬─────────────────┬────────┬───────────┬──────────┐     │   │
│   │   │  UUID   │      Text       │  Lang  │   Status  │ Flagged  │     │   │
│   │   ├─────────┼─────────────────┼────────┼───────────┼──────────┤     │   │
│   │   │ a7b3c9d │ "quiero agua"   │  spa   │in_recording│ Maria   │     │   │
│   │   │ b8c4d0e │ "necesito"      │  spa   │flagged_   │ -       │     │   │
│   │   │         │                 │        │human_need │         │     │   │
│   │   └─────────┴─────────────────┴────────┴───────────┴──────────┘     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        CLAIM SAMPLE                                  │   │
│   │   POST /api/production/:courseCode/recording/claim                  │   │
│   │   { uuid: "b8c4d0e", claimedBy: "maria@example.com" }               │   │
│   │                                                                     │   │
│   │   Status: flagged_human_needed ──▶ in_recording                     │   │
│   │   WebSocket: 'recording_claimed' event emitted                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      RECORD & UPLOAD                                 │   │
│   │   POST /api/production/:courseCode/recording/upload                 │   │
│   │                                                                     │   │
│   │   {                                                                 │   │
│   │     uuid: "b8c4d0e",                                                │   │
│   │     audioData: "base64...",  // The recording                       │   │
│   │     provenance: {                                                   │   │
│   │       recordedBy: "Maria Garcia",                                   │   │
│   │       speakerProficiency: "native",                                 │   │
│   │       speakerDialect: "Castilian Spanish",                          │   │
│   │       recordingDevice: "Blue Yeti",                                 │   │
│   │       recordingEnvironment: "home",                                 │   │
│   │       speakerConsent: true                                          │   │
│   │     }                                                               │   │
│   │   }                                                                 │   │
│   │                                                                     │   │
│   │   ┌──────────────────────────────────────────────────────────┐      │   │
│   │   │  1. Upload to S3: mastered/{uuid}.mp3                    │      │   │
│   │   │  2. Update Supabase audio_samples                        │      │   │
│   │   │  3. Insert recording_provenance                          │      │   │
│   │   │  4. Update flag: recorded → needs_review                 │      │   │
│   │   │  5. Emit 'recording_completed' WebSocket event           │      │   │
│   │   └──────────────────────────────────────────────────────────┘      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      RELEASE (Optional)                              │   │
│   │   POST /api/production/:courseCode/recording/release                │   │
│   │   { uuid: "b8c4d0e", releasedBy: "maria@example.com" }              │   │
│   │                                                                     │   │
│   │   Status: in_recording ──▶ flagged_human_needed                     │   │
│   │   (Returns sample to queue for someone else)                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. TTS Regeneration Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TTS REGENERATION WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                   REGENERATION QUEUE                                 │   │
│   │   GET /api/production/:courseCode/regeneration/queue                │   │
│   │                                                                     │   │
│   │   Returns samples with status:                                      │   │
│   │   • flagged_regen_tts   (bad pronunciation, wrong voice, etc.)      │   │
│   │   • flagged_text_edit   (text was corrected)                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                          │                                                  │
│         ┌────────────────┴────────────────┐                                 │
│         │                                 │                                 │
│         ▼                                 ▼                                 │
│   ┌─────────────────┐            ┌─────────────────┐                        │
│   │ TRIGGER SPECIFIC│            │  TRIGGER ALL    │                        │
│   │                 │            │                 │                        │
│   │ POST .../trigger│            │POST .../trigger │                        │
│   │ {uuids: [...]}  │            │      -all       │                        │
│   └────────┬────────┘            └────────┬────────┘                        │
│            │                              │                                 │
│            └──────────────┬───────────────┘                                 │
│                           │                                                 │
│                           ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    REGENERATION PROCESS                              │   │
│   │                                                                     │   │
│   │   1. Update status: flagged_* ──▶ in_pipeline                       │   │
│   │   2. Emit 'regeneration_started' WebSocket event                    │   │
│   │   3. Call Phase 8: POST /generate { regenerate: true, uuids: [...] }│   │
│   │                                                                     │   │
│   │   ┌───────────────────────────────────────────────────────────┐     │   │
│   │   │                    PHASE 8                                 │     │   │
│   │   │                                                           │     │   │
│   │   │   • Generate new TTS audio                                │     │   │
│   │   │   • Normalize to -16 LUFS                                 │     │   │
│   │   │   • Extract duration                                      │     │   │
│   │   │   • Upload to S3 (overwrites existing)                    │     │   │
│   │   │   • Update Supabase audio_samples                         │     │   │
│   │   │                                                           │     │   │
│   │   └───────────────────────────────────────────────────────────┘     │   │
│   │                                                                     │   │
│   │   4. On success: status ──▶ tts_complete ──▶ needs_review           │   │
│   │   5. On failure: status ──▶ tts_failed (with error note)            │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6b. Make-Before-Break — the ordering rule for any voice swap or clip replacement

> **Rendering pod audio? Unread drafted target text cannot be rendered.** The policy, the gate
> and the verifier pass are in [`../pods/text-approval-policy-2026-08-16.md`](../pods/text-approval-policy-2026-08-16.md).

> **Repairing damaged audio? The canonical process is
> [`AUDIO_REPAIR_PROCESS.md`](./AUDIO_REPAIR_PROCESS.md).** Detection (the tail-integrity
> predictor and its 30 ms threshold), naked-TTS generation and levelling, verification,
> acceptance, and the LEGO-before-cycles priority all live there. It implements this section.
> Ratified by Tom 2026-08-05; do not invent a new detector or add a trimming step.

**Rule (Tom, 2026-08-05): generate the replacement first, verify it, THEN break the old link —
never the reverse.** "why would we unlink all and then regenerate? that makes no sense — surely
we would generate first and replace once we have the new voices???"

**The incident that forced this into doctrine.** On 2026-08-03T14:18:55Z, 31,310
`fra_for_eng` `course_audio` rows in discontinued Azure voices were bulk-deleted (`changed_by_uid`
NULL — a direct service-role SQL statement, not one of the tools below) *before* replacement
audio existed. The re-render that followed covered most of them but left **4,434 clips never
replaced**, silencing ~2,000 course slots for two days before it was caught. Full forensics:
`docs/fra-audio-1608-forensics-2026-08-05.md`, `docs/fra-missing-audio-unlinked-vs-absent-2026-08-05.md`.
The deleted Azure objects are still in S3 (orphaned, not destroyed) — but the row that pointed a
learner at them was gone on 08-03 and the replacement didn't land until 08-04/05.

**The four steps, in order, every time:**
1. **Generate** the new clip (TTS render, or the human-recorded replacement).
2. **Verify** it — alive (passes the render's silence/truncation checks), correct-voiced, correct
   text. A failed verification costs nothing and touches nothing that existed before.
3. **Swap links atomically** — repoint every referencing row (`course_legos`,
   `course_practice_phrases`, `course_seeds`, `listening_pod_sentences`, `lego_introductions`,
   `course_audio_envelope`, and the unconstrained array columns) to the new clip.
4. **Only then delete the old clip** — and only after step 3 has actually landed. If a table's
   unique key forces the old row to be deleted before the new one can be inserted (see below),
   render and verify *first* so the only irreversible step left is the smallest possible one.

**Two tools already implement this correctly — use them as the reference pattern, not as
precedent to copy blindly (the constraint differs between them):**
- `tools/revoice-clips.cjs` — a voice swap changes `voice_id`, which is part of
  `course_audio`'s unique key, so the new row **never collides** with the old one. It inserts the
  new row first, repoints every link (including the array-column ones) while both rows coexist,
  and deletes the old row last — by which point nothing references it, so
  `lego_introductions.presentation_audio_id`'s `ON DELETE CASCADE` has nothing to cascade to.
- `tools/repair-silent-clips.cjs` — a same-voice re-render keeps `voice_id` unchanged, so the new
  row **would** collide with the old one on that same unique key, forcing the delete before the
  insert can land. It still renders and verifies the replacement first — "Verified good. Only now
  do we touch anything." — and if the insert fails after the delete, it restores the deleted row
  from memory before returning. That restore-on-failure is the minimum viable make-before-break
  when a schema constraint genuinely forces delete-then-insert; it is not a licence to delete
  before rendering.

**When writing or reviewing any script that touches `course_audio`:** if you see a `DELETE`
that isn't immediately preceded by a verified render/insert of its replacement (or isn't guarded
by a restore-on-failure path like `repair-silent-clips.cjs`'s), treat it as a make-before-break
violation and stop before running it.

**S3 versioning now backs this doctrine (A-112, 2026-08-16).** The `ssi-audio-stage` bucket has
object versioning enabled, so an overwrite or delete at the S3 layer is no longer terminal — the
prior bytes survive as a noncurrent version (or behind a delete marker) and are recoverable via
`ListObjectVersions` + a copy of the wanted version over the current key. It's a second line of
defence underneath the four steps above, not a substitute for them. Detail, before/after state,
and the lifecycle rule: `docs/a112-s3-versioning-2026-08-16.md`.

---

## 7. Voice Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VOICE MANAGEMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      VOICE TYPES                                     │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────┐    ┌─────────────────────────┐        │   │
│   │   │      TTS VOICES         │    │     HUMAN VOICES        │        │   │
│   │   ├─────────────────────────┤    ├─────────────────────────┤        │   │
│   │   │ type: "tts"             │    │ type: "human"           │        │   │
│   │   │ tts_engine: "azure"     │    │ human_name: "Maria"     │        │   │
│   │   │ tts_voice_name: "Elvira"│    │ human_email: "..."      │        │   │
│   │   │ tts_locale: "es-ES"     │    │ languages: ["spa","eng"]│        │   │
│   │   │ languages: ["spa"]      │    │                         │        │   │
│   │   └─────────────────────────┘    └─────────────────────────┘        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      VOICE API                                       │   │
│   │                                                                     │   │
│   │   GET  /api/production/voices                                       │   │
│   │        ?type=human&language=spa&active=true                         │   │
│   │                                                                     │   │
│   │   GET  /api/production/voices/:voiceId                              │   │
│   │                                                                     │   │
│   │   POST /api/production/voices/register-human                        │   │
│   │        {                                                            │   │
│   │          voiceId: "human_maria_spa",    // Must start with human_   │   │
│   │          humanName: "Maria Garcia",     // Required                 │   │
│   │          humanEmail: "maria@...",       // Optional                 │   │
│   │          languages: ["spa", "eng"]      // At least one required    │   │
│   │        }                                                            │   │
│   │                                                                     │   │
│   │   PATCH /api/production/voices/:voiceId/status                      │   │
│   │         { isActive: false }  // Deactivate voice                    │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA STORAGE LAYERS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         AWS S3                                       │   │
│   │                   (popty-bach-lfs bucket)                           │   │
│   │                                                                     │   │
│   │   courses/                                                          │   │
│   │   └── spa_for_eng/                                                  │   │
│   │       ├── course_manifest.json                                      │   │
│   │       ├── lego_pairs.json                                           │   │
│   │       └── lego_baskets.json                                         │   │
│   │                                                                     │   │
│   │   mastered/                       ◄── Audio files (flat structure)  │   │
│   │   ├── a7b3c9d2e4f6789012345678901234ab.mp3                          │   │
│   │   ├── b8c4d0e5f6a7890123456789012345bc.mp3                          │   │
│   │   └── ...                                                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       SUPABASE                                       │   │
│   │                                                                     │   │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│   │   │  audio_samples  │  │  sample_flags   │  │     voices      │     │   │
│   │   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤     │   │
│   │   │ uuid (PK)       │  │ audio_uuid (FK) │  │ voice_id (PK)   │     │   │
│   │   │ voice_id        │  │ course_code     │  │ type            │     │   │
│   │   │ text            │  │ status          │  │ tts_engine      │     │   │
│   │   │ lang            │  │ notes           │  │ human_name      │     │   │
│   │   │ role            │  │ flagged_by      │  │ languages[]     │     │   │
│   │   │ cadence         │  │ history[]       │  │ is_active       │     │   │
│   │   │ duration_ms     │  │ context         │  │ sample_count    │     │   │
│   │   │ s3_bucket       │  └─────────────────┘  └─────────────────┘     │   │
│   │   │ s3_key          │                                               │   │
│   │   │ checksum_md5    │  ┌─────────────────┐  ┌─────────────────┐     │   │
│   │   │ source          │  │course_audio_    │  │   recording_    │     │   │
│   │   └─────────────────┘  │    usage        │  │   provenance    │     │   │
│   │                        ├─────────────────┤  ├─────────────────┤     │   │
│   │                        │ course_code     │  │ audio_uuid (PK) │     │   │
│   │                        │ audio_uuid      │  │ recorded_by     │     │   │
│   │                        │ used_in         │  │ speaker_dialect │     │   │
│   │                        │ seed_id         │  │ recording_device│     │   │
│   │                        │ lego_id         │  │ speaker_consent │     │   │
│   │                        └─────────────────┘  └─────────────────┘     │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. WebSocket Real-Time Events

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEBSOCKET EVENTS                                       │
│                   Path: /api/production/websocket                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CLIENT                                           SERVER                   │
│     │                                                │                      │
│     │──── join_course { courseCode } ───────────────▶│                      │
│     │                                                │                      │
│     │◀─── sample_updated ────────────────────────────│  Flag changed        │
│     │     { courseCode, uuid, update }               │                      │
│     │                                                │                      │
│     │◀─── recording_claimed ─────────────────────────│  Sample claimed      │
│     │     { courseCode, uuid, claimedBy }            │                      │
│     │                                                │                      │
│     │◀─── recording_released ────────────────────────│  Sample released     │
│     │     { courseCode, uuid, releasedBy }           │                      │
│     │                                                │                      │
│     │◀─── recording_completed ───────────────────────│  Upload done         │
│     │     { courseCode, uuid, metadata }             │                      │
│     │                                                │                      │
│     │◀─── regeneration_started ──────────────────────│  Regen triggered     │
│     │     { courseCode, uuids, count }               │                      │
│     │                                                │                      │
│     │◀─── bulk_update ───────────────────────────────│  Multiple updated    │
│     │     { courseCode, count }                      │                      │
│     │                                                │                      │
│     │──── leave_course { courseCode } ──────────────▶│                      │
│     │                                                │                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Complete API Reference

### Production API (Port 3470)

#### Recording Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/:courseCode/recording/queue` | Get paginated recording queue |
| POST | `/api/production/:courseCode/recording/claim` | Claim sample for recording |
| POST | `/api/production/:courseCode/recording/release` | Release claimed sample |
| POST | `/api/production/:courseCode/recording/upload` | Upload recording with provenance |

#### Regeneration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/:courseCode/regeneration/queue` | Get samples needing regen |
| POST | `/api/production/:courseCode/regeneration/trigger` | Trigger regen for specific UUIDs |
| POST | `/api/production/:courseCode/regeneration/trigger-all` | Trigger regen for all flagged |

#### Voice Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/voices` | List voices with filters |
| GET | `/api/production/voices/:voiceId` | Get voice details |
| POST | `/api/production/voices/register-human` | Register human voice |
| PATCH | `/api/production/voices/:voiceId/status` | Activate/deactivate voice |

#### Sample Flags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/:courseCode/flags` | Get all sample flags |
| POST | `/api/production/:courseCode/flags/update` | Update single flag |
| POST | `/api/production/:courseCode/flags/bulk-update` | Bulk update flags |

#### Audio Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/production/:courseCode/audio-pipeline/plan` | Get generation plan |
| POST | `/api/production/:courseCode/audio-pipeline/start` | Start generation |
| POST | `/api/production/:courseCode/audio-pipeline/cancel` | Cancel generation |
| POST | `/api/production/:courseCode/audio-pipeline/retry` | Retry generation |

### Phase 8 Audio Generator (Port 3465)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Start audio generation |
| POST | `/plan` | Dry-run plan |
| GET | `/status/:courseCode` | Check job status |
| DELETE | `/cancel/:courseCode` | Cancel job |
| GET | `/health` | Health check |

---

## 11. End-to-End Flow Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              COMPLETE AUDIO LIFECYCLE: "quiero" (I want)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PHASE 3: Basket Generation                                              │
│     └── lego_baskets.json contains: { text: "quiero", role: "target1" }     │
│                                                                             │
│  2. PHASE 8: Audio Generation                                               │
│     ├── Calculate UUID: SHA256("azure_es|quiero|spa|target1|slow")          │
│     ├── Check Supabase: Does UUID exist? NO                                 │
│     ├── Generate TTS: Azure es-ES-ElviraNeural                              │
│     ├── Normalize: -16 LUFS                                                 │
│     ├── Extract duration: 847ms                                             │
│     ├── Upload to S3: mastered/a7b3c9d2...mp3                               │
│     └── Insert to Supabase: audio_samples + course_audio_usage              │
│                                                                             │
│  3. QA REVIEW                                                               │
│     ├── Reviewer listens to sample                                          │
│     ├── Flags as: flagged_regen_tts (pronunciation issue)                   │
│     └── WebSocket: 'sample_updated' event                                   │
│                                                                             │
│  4. REGENERATION                                                            │
│     ├── POST /regeneration/trigger { uuids: ["a7b3c9d2..."] }               │
│     ├── Status: flagged_regen_tts → in_pipeline                             │
│     ├── Phase 8 regenerates with different voice settings                   │
│     ├── Status: in_pipeline → tts_complete → needs_review                   │
│     └── WebSocket: 'regeneration_started' event                             │
│                                                                             │
│  5. SECOND QA REVIEW                                                        │
│     ├── Reviewer listens again                                              │
│     ├── Still not happy → flagged_human_needed                              │
│     └── Appears in recording queue                                          │
│                                                                             │
│  6. HUMAN RECORDING                                                         │
│     ├── Maria claims sample: POST /recording/claim                          │
│     ├── Status: flagged_human_needed → in_recording                         │
│     ├── Records in home studio                                              │
│     ├── Uploads: POST /recording/upload (with provenance)                   │
│     ├── Status: in_recording → recorded → needs_review                      │
│     └── WebSocket: 'recording_completed' event                              │
│                                                                             │
│  7. FINAL QA                                                                │
│     ├── Reviewer approves                                                   │
│     ├── Status: needs_review → approved → complete                          │
│     └── Sample ready for production                                         │
│                                                                             │
│  8. PHASE 9: Manifest Compilation                                           │
│     ├── Query Supabase for all approved audio UUIDs                         │
│     ├── Validate 100% coverage                                              │
│     └── Generate course_manifest.json                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Service Ports Summary

| Port | Service | Purpose |
|------|---------|---------|
| 3456 | Orchestrator | Main coordination |
| 3457 | Phase 1 | Translation + LEGO Extraction |
| 3458 | Phase 2 | Conflict Resolution |
| 3459 | Phase 3 | Basket Generation |
| 3464 | Phase 7 | Manifest (Legacy) |
| 3465 | Phase 8 | Audio Generation |
| 3466 | Phase 9 | Manifest Compilation |
| 3470 | Production API | QA Workflow + WebSocket |
| 5173 | Dashboard UI | Vite dev server |

---

*Document Version: 1.0.0*
*Last Updated: 2025-12-10*
*APML: v11.0 | Pipeline: v2.0 (Supabase + Audio-first)*
