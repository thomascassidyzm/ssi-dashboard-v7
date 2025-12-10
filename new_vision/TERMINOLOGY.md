# SSi Terminology & Concept Glossary

**Canonical definitions for the SSi Course Creation System**

Version: 1.0.0
Date: 2025-12-05
Status: Living Document

---

## Purpose

This document defines the canonical terminology for all SSi systems. Each concept has a stable ID that remains constant even if the display name changes. This enables:

1. Consistent communication across teams
2. Unambiguous references in code and documentation
3. Flexibility to rename concepts without breaking references
4. Clear onboarding for new team members and agents

---

## Concept Registry

### Content Layer

These are static content elements - what exists in the database/files.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `CONT-001` | **Seed** | A source sentence in both known and target languages from which LEGOs are extracted. The foundational content unit. | seed_pair, seed_sentence |
| `CONT-002` | **LEGO** | A learnable language unit extracted from seeds. Can be A-type (atomic/single word) or M-type (molecular/multi-word phrase). | lego_pair |
| `CONT-003` | **A-type LEGO** | Atomic LEGO - a single word unit that cannot be broken down further. | atomic, A-LEGO |
| `CONT-004` | **M-type LEGO** | Molecular LEGO - a multi-word phrase that has components (smaller LEGOs within it). | molecular, M-LEGO |
| `CONT-005` | **Component** | A building block LEGO within an M-type LEGO. Marked `is_component: true` in baskets. | |
| `CONT-006` | **Phrase** | A practice sentence stored in the basket. Becomes a cycle when delivered to learner. | practice_phrase |
| `CONT-007` | **Basket** | The collection of all phrases for a LEGO - components, debut phrases, eternal phrases. | lego_basket |
| `CONT-008` | **Debut Phrase** | A phrase used when first practising a newly introduced LEGO. Part of initial learning. | DEBU phrase |
| `CONT-009` | **Eternal Phrase** | A phrase used for spaced review of previously learned LEGOs. Part of ETER system. | ETER phrase, review phrase |
| `CONT-010` | **Introduction** | The presentation text/audio that introduces a new LEGO to the learner. | intro, presentation |
| `CONT-011` | **Encouragement** | Motivational content inserted at natural boundaries (between sets). | |
| `CONT-012` | **Welcome** | Opening content for a session. | |
| `CONT-013` | **Course** | A complete language learning course for a language pair (e.g., cmn_for_eng). | |
| `CONT-014` | **Language Pair** | The combination of known language and target language. | e.g., spa_for_eng |

---

### Production Layer

These are units of learner activity - what happens during delivery.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `PROD-001` | **Cycle** | The atomic unit of production. One prompt/response interaction where the learner produces language. | prompt/response cycle |
| `PROD-002` | **Set** | The molecular unit of production. All cycles from one LEGO introduction to the next. Contains intro, practice cycles, and review cycles. | formerly "LEGO Session" |
| `PROD-003` | **Session** | The learner's complete time in the app from open to close. Contains multiple sets. | learning session, app session |
| `PROD-004` | **Prompt** | The known-language cue that triggers learner production. | |
| `PROD-005` | **Response** | The target-language production from the learner. | |
| `PROD-006` | **Echo** | Repeated target-language audio for reinforcement (target1 → pause → target2). | |

---

### Methodology Layer

These define how learning is structured and sequenced.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `METH-001` | **DEBU** | Debut phase - initial practice cycles for a newly introduced LEGO. Default 7 cycles. | debut sequence |
| `METH-002` | **ETER** | Eternal review phase - spaced repetition cycles for previously learned LEGOs. | eternal sequence, spaced review |
| `METH-003` | **ETER Schedule** | The pattern of review cycles: N-1 (3x), N-2 (1x), N-3 (1x), N-5 (1x), etc. Configurable. | decay schedule |
| `METH-004` | **Spaced Repetition** | The methodology of reviewing content at increasing intervals for long-term retention. | |
| `METH-005` | **new: true** | Flag indicating a LEGO's first appearance - needs introduction and debut practice. | |
| `METH-006` | **new: false** | Flag indicating a LEGO has been introduced before - no intro needed, goes to ETER. | |

---

### Audio Layer

These relate to audio production and delivery.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `AUD-001` | **Sample** | A single audio file for a piece of text. Identified by UUID. | audio_sample |
| `AUD-002` | **Voice** | A TTS voice or human voice talent used for recording. | |
| `AUD-003` | **Role** | The function of a voice: instructor, target_primary, target_echo, encouragement. | voice_role |
| `AUD-004` | **Cadence** | The speed/style of audio: natural, slow, fast. | |
| `AUD-005` | **UUID** | Deterministic UUID v5 (RFC 4122): voiceId:lang:role:cadence:text → 8-4-4-4-12 format. SSoT: services/uuid-v11.cjs | |
| `AUD-006` | **MAR** | Master Audio Registry - Supabase table storing all audio metadata. | audio_samples table |

---

### Pipeline Layer

These relate to course production workflow.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `PIPE-001` | **Phase 1** | Translation + LEGO Extraction → produces draft_lego_pairs.json | |
| `PIPE-002` | **Phase 2** | Conflict Resolution → produces lego_pairs.json (SSoT for LEGOs) | |
| `PIPE-003` | **Phase 3** | Basket Generation → produces lego_baskets.json | |
| `PIPE-004` | **Phase 8** | Audio Generation → TTS/human recording → Supabase + S3 | |
| `PIPE-005` | **Phase 9** | Manifest Compilation → produces course_manifest.json | |
| `PIPE-006` | **QA Workflow** | Flagging, review, and approval of audio samples. | |
| `PIPE-007` | **Autocue** | Teleprompter-style interface for human recording. | teleprompter |

---

### System Layer

These are system components and tools.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `SYS-001` | **Dashboard** | The SSi course production dashboard - SSoT for all content and methodology. | ssi-dashboard |
| `SYS-002` | **Learning App** | The learner-facing application that delivers courses. | ssi-learning-app |
| `SYS-003` | **Production Suite** | Collection of tools for course QA and audio production. | |
| `SYS-004` | **Script Viewer** | QA tool for reviewing course content and flagging issues. | |
| `SYS-005` | **Audio Pipeline** | Tool for managing TTS generation queue. | |
| `SYS-006` | **Recording Studio** | Tool for human voice recording with autocue. | |
| `SYS-007` | **Samples Browser** | Tool for reviewing and approving audio samples. | |
| `SYS-008` | **Mission Control** | Dashboard overview of production status. | |
| `SYS-009` | **Supabase** | Database backend for audio registry, QA workflow, and (future) content. | |
| `SYS-010` | **S3** | Object storage for audio files and course assets. | popty-bach-lfs |

---

### Adaptation Layer

These relate to dynamic learning adjustments.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `ADAP-001` | **Adaptation** | Dynamic adjustment of learning based on performance. | |
| `ADAP-002` | **Performance Metric** | Measurement of learner success (accuracy, speed, etc.). | |
| `ADAP-003` | **Difficulty Level** | Configurable challenge level: easy, normal, challenging. | |
| `ADAP-004` | **Learner Profile** | Stored preferences and learning patterns for a learner. | |

---

### Parameter Layer

These are configurable values that control system behavior.

| ID | Current Name | Definition | Aliases/Notes |
|----|--------------|------------|---------------|
| `PARAM-001` | **Timing Parameter** | Pause durations, cycle gaps, etc. (in milliseconds). | |
| `PARAM-002` | **Voice Parameter** | Voice assignments for each role. | |
| `PARAM-003` | **Schedule Parameter** | ETER schedule configuration, DEBU count, etc. | |
| `PARAM-004` | **Course Parameter** | Course-level default settings. | |
| `PARAM-005` | **Session Parameter** | Settings that can vary per set within a session. | |

---

## Relationships

```
Course (CONT-013)
  └── Seeds (CONT-001) [668 per course]
      └── LEGOs (CONT-002) extracted
          ├── A-type (CONT-003) or M-type (CONT-004)
          └── Basket (CONT-007)
              ├── Components (CONT-005) [if M-type]
              ├── Debut Phrases (CONT-008)
              └── Eternal Phrases (CONT-009)

Phrase (CONT-006) → becomes → Cycle (PROD-001) when delivered

Cycles (PROD-001) → grouped into → Set (PROD-002)

Sets (PROD-002) → fill a → Session (PROD-003)

Set structure:
  1. Introduction (CONT-010) of new LEGO
  2. DEBU (METH-001) - debut practice cycles
  3. ETER (METH-002) - review cycles for previous LEGOs
  4. [Encouragement (CONT-011)] - optional, at boundary
```

---

## Reserved IDs for Future Concepts

| ID Range | Reserved For |
|----------|--------------|
| `CONT-100+` | New content types (conversations, listening exercises) |
| `PROD-100+` | New production types (AI conversation turns) |
| `METH-100+` | New methodology concepts |
| `AUD-100+` | New audio concepts |
| `PIPE-100+` | New pipeline phases |
| `SYS-100+` | New system components |
| `ADAP-100+` | New adaptation concepts |
| `PARAM-100+` | New parameter types |

---

## Naming Conventions

### Code/Database
- Use snake_case: `lego_pairs`, `audio_samples`, `new_true`
- Use IDs in comments for clarity: `// CONT-002: LEGO`

### Documentation
- Use Title Case for concept names: "LEGO", "Set", "Cycle"
- Reference IDs when precision needed: "Set (PROD-002)"

### UI/User-Facing
- Use natural language appropriate for audience
- Learners don't need to know "ETER" - they just experience review

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-05 | Initial terminology registry |

---

## Notes

- IDs are permanent - never reuse or reassign
- Names can change - update "Current Name" column
- Add to "Aliases/Notes" for historical terms
- New concepts get new IDs from reserved ranges

---

**This is the canonical reference. When in doubt, check here.**
