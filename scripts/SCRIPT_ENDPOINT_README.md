# Course Script Generation Endpoint

## Overview

This document describes the `/api/courses/:courseCode/script` endpoint added to the automation server for Phase 1 of the Course Script Visualizer.

## Endpoint Details

**URL**: `GET /api/courses/:courseCode/script`

**Query Parameters**:
- `startSeed` (optional): Starting seed number (default: 1)
- `endSeed` (optional): Ending seed number (default: 20)

**Example Request**:
```
GET http://localhost:3456/api/courses/spa_for_eng/script?startSeed=1&endSeed=20
```

## Response Format

```json
{
  "success": true,
  "courseCode": "spa_for_eng",
  "seedRange": {
    "start": 1,
    "end": 20
  },
  "generatedAt": "2025-12-03T13:03:55.833Z",
  "totalItems": 150,
  "items": [
    {
      "id": "S0001L01-intro",
      "type": "introduction",
      "seedId": "S0001",
      "legoId": "S0001L01",
      "sequence": 1,
      "known": "I want",
      "target": "quiero",
      "legoType": "A",
      "presentation": "The Spanish for 'I want', is: ... 'quiero' ... 'quiero'",
      "audio": {
        "presentation": "uuid-here",
        "source": null,
        "target1": null,
        "target2": null
      }
    }
  ]
}
```

## Item Types

Each item in the `items` array represents one teaching moment in the delivery order:

1. **introduction** - LEGO presentation/introduction text (if available)
   - Has `presentation` field with intro text
   - Audio UUID in `audio.presentation`

2. **component** - Component of an M-type (molecular) LEGO
   - Only for M-type LEGOs
   - Marked with `is_component: true`
   - Audio UUIDs in `audio.source`, `audio.target1`, `audio.target2`

3. **debut** - The full LEGO being introduced
   - Marked with `is_debut: true`
   - Audio UUIDs in `audio.source`, `audio.target1`, `audio.target2`

4. **practice_phrase** - Practice phrase using the LEGO
   - Audio UUIDs in `audio.source`, `audio.target1`, `audio.target2`

## Delivery Order

For each LEGO, items are delivered in this order:

1. **Introduction** (if exists)
2. **Components** (for M-type LEGOs only)
3. **LEGO Debut** (the full LEGO)
4. **Practice Phrases**

### Example: A-type (Atomic) LEGO

```
S0001L01: "I want" / "quiero"
  1. Introduction: "The Spanish for 'I want', is: ... 'quiero' ... 'quiero'"
  2. Debut: "I want" / "quiero"
  3. Practice: "I want" / "Quiero"
```

### Example: M-type (Molecular) LEGO

```
S0002L01: "I'm trying" / "estoy intentando"
  1. Introduction: "The Spanish for 'I'm trying'..."
  2. Component 1: "I'm" / "estoy"
  3. Component 2: "trying" / "intentando"
  4. Debut: "I'm trying" / "estoy intentando"
  5. Practice 1: "I'm trying" / "Estoy intentando"
  6. Practice 2: "I'm trying to speak" / "Estoy intentando hablar"
  ... (more practice phrases)
```

## Data Sources

The endpoint loads and compiles data from:

1. **lego_baskets.json** - Practice baskets with LEGO debuts and practice phrases
2. **lego_pairs.json** - LEGO types (A/M) and component definitions
3. **{courseCode}_668seedsV4.json** - Audio UUID manifest with samples lookup
4. **introductions.json** - LEGO introduction/presentation texts

## Audio UUID Lookup

Audio UUIDs are looked up from the manifest's `samples` dictionary:

```javascript
samples: {
  "quiero": [
    { id: "uuid1", role: "target1", cadence: "natural" },
    { id: "uuid2", role: "target2", cadence: "natural" }
  ]
}
```

The endpoint provides UUIDs for:
- `source` - English audio
- `target1` - Spanish audio (first cadence)
- `target2` - Spanish audio (second cadence)
- `presentation` - Introduction audio

## Testing

A test script is available:

```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
node scripts/test-script-endpoint.cjs
```

This generates a sample output for seeds 1-3 and saves it to `scripts/test-script-output.json`.

## Implementation Location

**File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/tools/orchestrators/automation_server.cjs`

**Lines**: ~4698-4917

The endpoint is added after the DELETE `/api/courses/:code/seeds/:seedId` endpoint and before the GET `/api/courses/:code/prompt-evolution` endpoint.

## Error Responses

- **404**: Course not found or required files missing
- **500**: Server error during script generation

```json
{
  "success": false,
  "error": "Course not found",
  "courseCode": "invalid_course"
}
```
