# SSi Course Generation Architecture

## Overview

The SSi Dashboard orchestrates course generation through microservices. Everything flows from **3 input parameters** and **canonical content**.

## Input Parameters

When the dashboard triggers course generation:

```javascript
{
  known: "eng",        // Known language (ISO 639-3)
  target: "spa",       // Target language (ISO 639-3)
  seedRange: "1-668"   // Seed range: "1-668" (full) or "1-30" (test)
}
```

## Canonical Inputs (Language-Agnostic)

All course content is generated from these canonical sources:

```
public/vfs/canonical/
├── canonical_seeds.json           ✅ 668 seeds in English
│   └── Format: [{ seed_id: "S0001", canonical_id: "C0001", source: "I want to speak {target}..." }]
│
├── eng_encouragements.json        ✅ English motivational content
│   └── Format: { pooledEncouragements: [...], orderedEncouragements: [...] }
│
├── spa_encouragements.json        📝 TODO: Translate from English
├── fra_encouragements.json        📝 TODO: Translate from English
│
└── welcomes.json                  ⚠️  Template only (needs population per course)
    └── Format: { welcomes: { "spa_for_eng": { text, id, duration } } }
```

### Canonical Seeds Structure

```json
[
  {
    "seed_id": "S0001",
    "canonical_id": "C0001",
    "source": "I want to speak {target} with you now."
  }
]
```

- **668 seeds total** (indexed S0001 - S0668)
- **Language:** English with `{target}` placeholders
- **Purpose:** Single source of truth for all language pairs

### Encouragements Structure

```json
{
  "language": "eng",
  "version": "1.0.0",
  "pooledEncouragements": [
    {
      "text": "And remember that your brain...",
      "id": "EB874772-22D4-4F3E-814D-0632323CAC33"
    }
  ],
  "orderedEncouragements": []
}
```

- **Pooled:** Random selection during course (26 for English)
- **Ordered:** Sequential delivery at specific points (48 for English)
- **Spoken in:** Known language (source language)
- **One file per language:** `{lang}_encouragements.json`

### Welcome Structure

```json
{
  "welcomes": {
    "spa_for_eng": {
      "text": "Welcome to the Spanish for English speakers course...",
      "id": "UUID",
      "generated_date": "2025-11-19T...",
      "voice": "elevenlabs_aran",
      "duration": 45.2
    }
  }
}
```

- **Course-specific:** One welcome per language pair
- **Template:** `Welcome to the {target_name} for {known_name} speakers course...`
- **Spoken in:** Known language (source language)

## Phase Pipeline

### Architecture Pattern

Each phase is a **microservice** with standard REST API:

```
services/phases/
├── phase1-translation-server.cjs        (Port 3457) [includes Phase 2 LUT check]
├── phase3-lego-extraction-server.cjs    (Port 3458) [includes Phase 6 introductions]
├── phase5-basket-server.cjs             (Port 3459)
├── phase5.5-grammar-validation-server.cjs (Port 3460)
├── phase7-manifest-server.cjs           (Port 3462)
└── phase8-audio-server.cjs              (Port 3463)
```

**Note:**
- Phase 2 (LUT collision check) is built into Phase 1 server - no separate service needed
- Phase 6 (introduction generation) is built into Phase 3 server - runs in <1s after LEGO extraction

### Standard API Endpoints

```http
POST   /start              # Start processing for a course
GET    /status/:courseCode # Check processing status
DELETE /job/:courseCode    # Clear job from memory
GET    /health             # Health check
```

## Phase Flow

### Phase 1: Translation (includes Phase 2)
**Input:** Canonical seeds + language pair
**Output:** `seed_pairs.json` + `seed_pairs_phase2_report.json`

```javascript
POST http://localhost:3457/start
{
  "courseCode": "spa_for_eng",
  "known": "eng",
  "target": "spa",
  "seedRange": "1-668"
}
```

Translates canonical English seeds into target language:
```json
{
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": {
        "known": "I want to speak Spanish with you now.",
        "target": "Quiero hablar español contigo ahora."
      }
    }
  ]
}
```

**Phase 2 (LUT - Learner Uncertainty Test):**
Automatically runs after translation completes. Checks for **FD violations** - when the same KNOWN phrase maps to multiple different TARGET translations. This ensures consistency across the course.

Report saved as: `seed_pairs_phase2_report.json`

### Phase 3: LEGO Extraction + Introductions
**Input:** `seed_pairs.json`
**Output:** `lego_pairs.json` + `introductions.json`

```http
POST http://localhost:3458/start
```

Deconstructs sentences into reusable LEGO components and generates introduction presentations:
```json
// lego_pairs.json
{
  "seeds": [
    {
      "seed_id": "S0001",
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "new": true,
          "lego": {
            "known": "I want",
            "target": "quiero"
          }
        }
      ]
    }
  ]
}

// introductions.json (generated automatically after LEGO extraction)
{
  "presentations": {
    "S0001L01": "The Spanish for 'I want', as in 'I want to speak Spanish with you now', is: ... 'quiero' ... 'quiero'"
  }
}
```

**Note:** Phase 6 (introduction generation) runs automatically after LEGO extraction completes. Execution time: <1 second.

### Phase 5: Practice Baskets
**Input:** `lego_pairs.json`
**Output:** `lego_baskets.json`

```http
POST http://localhost:3459/start
```

Generates practice phrases with expanding windows:
```json
{
  "baskets": {
    "S0001L01": {
      "lego": {"known": "I want", "target": "quiero"},
      "practice_phrases": [
        {"known": "I want", "target": "Quiero"}
      ],
      "phrase_count": 1,
      "is_final_lego": false
    }
  }
}
```

### Phase 7: Manifest Compilation
**Input:** All phase outputs + canonical encouragements + welcomes
**Output:** `course_manifest.json`

```http
POST http://localhost:3462/start
```

Compiles final APML manifest:
- Assembles seeds with introduction_items
- Generates deterministic UUIDs (SSi legacy format)
- Embeds encouragements (pooled + ordered)
- Adds welcome audio metadata
- Creates sample registry for TTS

**Output format:** Matches Italian course format (snake_case fields)

### Phase 8: Audio Generation
**Input:** `course_manifest.json`
**Output:** MP3 files + S3 upload

```http
POST http://localhost:3463/start
```

Generates TTS audio for all samples using Azure/ElevenLabs.

## Dashboard Integration

### Course Creation Workflow

```javascript
// 1. User selects parameters in dashboard
const params = {
  known: "eng",
  target: "spa",
  seedRange: "1-668"
};

// 2. Dashboard triggers Phase 1
fetch('http://localhost:3457/start', {
  method: 'POST',
  body: JSON.stringify({
    courseCode: `${params.target}_for_${params.known}`,
    ...params
  })
});

// 3. Poll status until complete
const checkStatus = setInterval(() => {
  fetch(`http://localhost:3457/status/${courseCode}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'completed') {
        clearInterval(checkStatus);
        // Trigger Phase 3
        triggerPhase3();
      }
    });
}, 2000);

// 4. Chain through phases 3 (includes 6) → 5 → 7 → 8
```

## Output Structure

```
public/vfs/courses/spa_for_eng/
├── seed_pairs.json              # Phase 1 output
├── lego_pairs.json              # Phase 3 output
├── lego_baskets.json            # Phase 5 output
├── introductions.json           # Phase 6 output
├── course_manifest.json         # Phase 7 output ✅
└── audio/                       # Phase 8 output
    └── [UUID].mp3
```

## Key Design Principles

### 1. Canonical Source of Truth
- All courses derive from same canonical seeds
- Translations are generated, not stored
- Encouragements/welcomes per language, not per course

### 2. Microservice Architecture
- Each phase is independent
- Standard REST API
- Can be run separately or orchestrated

### 3. Idempotent Operations
- Re-running a phase produces same output
- Phases can be re-run to fix issues
- No side effects from failed runs

### 4. Test Course Support
- Small test courses (30 seeds) for development
- Full courses (668 seeds) for production
- Same pipeline, different seed range

## Adding New Languages

### As Known Language (Source)
1. Translate `eng_encouragements.json` → `{lang}_encouragements.json`
2. Create welcome template for courses teaching FROM this language
3. Phase pipeline works automatically

### As Target Language
1. No additional setup needed
2. Phase 1 handles translation from canonical seeds
3. Pipeline generates all content automatically

## Next Steps

### Immediate TODOs
- [ ] Populate `welcomes.json` with actual course welcomes
- [ ] Create `spa_encouragements.json` (Spanish encouragements)
- [ ] Create `fra_encouragements.json` (French encouragements)
- [ ] Build dashboard UI for triggering course generation
- [ ] Add phase orchestration (auto-chain phases)

### Future Enhancements
- [ ] Phase 7 ordered encouragements (currently empty)
- [ ] Multi-voice support per language
- [ ] Quality gates between phases
- [ ] Progress tracking in dashboard
- [ ] Course versioning system

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
