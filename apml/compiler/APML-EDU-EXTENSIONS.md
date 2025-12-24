# APML-EDU Compiler Extensions

This compiler extends the base APML v2.0 Vue compiler to support **APML-EDU v2.1.0** constructs for educational and pedagogical applications.

## Overview

The compiler has been extended to parse and generate code from APML-EDU specifications, which add six new top-level constructs specifically designed for language learning systems:

1. **content** - Pedagogical content hierarchies
2. **methodology** - Learning rules and pedagogical sequences
3. **production** - Runtime learner activity units
4. **audio** - Audio pipeline configuration
5. **parameters** - Scoped configuration management
6. **adaptation** - Dynamic learning adjustments

## Architecture

### Extended Files

#### 1. `/src/types/ast.ts`
Extended AST interfaces for APML-EDU constructs:
- `ContentDefinition` - Content hierarchy types (Course, Seed, LEGO, Basket, Phrase)
- `MethodologyDefinition` - Learning rules (DEBU, ETER, etc.)
- `ProductionDefinition` - Runtime units (Cycle, Set, Session)
- `AudioConfiguration` - Audio pipeline and voice definitions
- `ParameterScope` - Hierarchical parameter management
- `AdaptationRule` - Performance-based adjustments

#### 2. `/src/types/education.ts` (NEW)
Runtime TypeScript interfaces for generated applications:
- Course content types (Course, Seed, LEGO, Basket, PracticePhrase)
- Audio types (AudioSample, Voice)
- Production/Runtime types (LearnerSession, Cycle, Set)
- Learner progress types (LearnerProgress, LEGOProgress)
- Methodology parameters (MethodologyParameters, ETERScheduleItem)
- Adaptation types (AdaptationEvent, DifficultySettings)
- Production tools types (SampleFlag, GenerationJob, PipelineStage)
- Manifest types (CourseManifest, SeedManifest, LEGOManifest)

#### 3. `/src/parser/parser.ts`
Extended parsing methods:
- `parseContent()` - Parse content hierarchy definitions
- `parseMethodology()` - Parse methodology rules
- `parseProduction()` - Parse production unit definitions
- `parseAudio()` - Parse audio configuration
- `parseParameters()` - Parse parameter scopes
- `parseAdaptation()` - Parse adaptation rules

#### 4. `/src/generator/vue-generator.ts`
Extended generation methods:
- `generateEducationStore()` - Pinia store for content/methodology
- `generateAudioStore()` - Pinia store for audio pipeline
- `generateProgressTracking()` - Learner progress components
- `generateAdaptiveLogic()` - Adaptation rule handlers

## Generated Output

### For Production Suite Applications

When compiling an APML-EDU spec for a production suite (course creation tools), the compiler generates:

**1. Education Store** (`src/stores/education.ts`)
```typescript
- courses, seeds, legos, phrases state
- learnerProgress state
- methodology parameters (debuCount, eterSchedule)
- loadCourseManifest() action
- initializeSession() action
```

**2. Audio Store** (`src/stores/audio.ts`)
```typescript
- audioSamples registry
- sampleFlags state
- currentJob state
- generationProgress computed
- flaggedSamples computed
- startGeneration() action
- flagSample() action
- getAudioUrl() action
```

**3. Progress Tracker Component** (`src/components/ProgressTracker.vue`)
```vue
- Seeds completed display
- Accuracy rate display
- Difficulty level display
```

**4. Adaptation Engine** (`src/services/adaptation.ts`)
```typescript
- evaluateAdaptation() method
- getHistory() method
- Rule-specific logic stubs
```

### For Learner Applications

The same compiler can generate learner-facing apps by:
1. Loading course manifests from Supabase
2. Implementing cycle/set/session state machines
3. Managing learner progress and adaptation
4. Prefetching audio from S3

## Usage

### Compile an APML-EDU specification

```bash
npm run build
node dist/index.js path/to/spec.apml output/directory
```

### Example APML-EDU Specification

```apml
app SSiProductionSuite:
  title: "SSI Course Production Suite"
  apml_version: "2.1.0"
  extensions: [APML-EDU]

# Core data models
data AudioSample:
  uuid: unique_id auto
  text_normalized: text required
  language: text required
  voice_id: text required
  role: text required
  cadence: text required
  s3_key: text required
  duration_ms: number required
  approved: boolean default: false

# APML-EDU: Content hierarchy
content Seed:
  type: seed
  id: seed_id
  fields:
    known_text: text required
    target_text: text required
  structure:
    extracts: LEGO[]

# APML-EDU: Methodology
methodology DEBU:
  description: "Debut practice for new LEGOs"
  triggers_when: LEGO.is_new == true
  parameters:
    debu_count: 7

# APML-EDU: Production runtime
production Cycle:
  type: cycle
  atomic: true
  structure:
    1: prompt
    2: pause
    3: cue
    4: echo

# APML-EDU: Audio pipeline
audio:
  voices:
    source:
      id: azure_en_GB_BellaNeural
      provider: azure
      language: eng

# APML-EDU: Parameters
parameters:
  scope course:
    debu_count: 7
    eter_schedule: [{offset: 1, cycles: 3}]

# APML-EDU: Adaptation
adaptation Performance_Adjustment:
  observe: learner.session_accuracy
  thresholds:
    high_performance: 0.85
    low_performance: 0.65
```

## Compilation Flow

```
APML-EDU Text → Parser → AST → Generator → Vue 3 Files
                  ↓         ↓         ↓
              parseContent  ContentDefinition  generateEducationStore()
              parseMethodology  MethodologyDefinition  generateAdaptiveLogic()
              parseAudio  AudioConfiguration  generateAudioStore()
```

## Integration with Production Pipeline

The generated Vue applications integrate with:

1. **Phase 8 Audio Generator** (Port 3465)
   - POST /generate - Start audio generation
   - GET /status/:courseCode - Check job status

2. **Phase 9 Manifest Compiler** (Port 3466)
   - POST /compile - Compile manifest from Supabase
   - GET /validate/:courseCode - Validate audio coverage

3. **Production API** (Port 3470)
   - QA workflow endpoints
   - WebSocket for real-time updates

4. **Supabase**
   - Master Audio Registry (audio_samples table)
   - Course metadata
   - Learner progress

5. **S3 Storage**
   - Audio files (ssi-audio-stage bucket)
   - Path: `mastered/{uuid}.mp3`

## Focus: Production Suite First

This compiler currently focuses on generating the **Production Suite** dashboard:

- Script Viewer (hierarchical content display)
- Audio Pipeline (TTS generation management)
- Recording Studio (human voice recording)
- Mission Control (overall progress dashboard)

The **Learner App** will be developed later, but the same compiler can generate it with additional templates.

## TODOs for Full Implementation

Current implementation provides **basic parsing** and **scaffolding generation**. Full implementation requires:

1. **Parser Enhancements**
   - Complete parsing of nested structures (sequence, schedule, etc.)
   - Parse conditional logic in content structures
   - Parse audio voice configurations

2. **Generator Enhancements**
   - Generate manifest loading logic
   - Generate audio playback components
   - Generate state machine implementations for Production units
   - Generate API integration for Phase 8/9 services

3. **Learner App Generation**
   - Cycle/Set/Session state machines
   - Audio playback with pause control
   - Progress tracking and persistence
   - Adaptive difficulty adjustments

4. **Validation**
   - Trinity completeness validation
   - Audio coverage validation
   - Content hierarchy validation

## Example: Generated Education Store

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Course, Seed, LEGO, PracticePhrase, LearnerProgress } from '../types/education';

export const useEducationStore = defineStore('education', () => {
  // Content hierarchies
  const courses = ref<Course[]>([]);
  const seeds = ref<Seed[]>([]);
  const legos = ref<LEGO[]>([]);
  const phrases = ref<PracticePhrase[]>([]);

  // Learner progress
  const learnerProgress = ref<LearnerProgress | null>(null);

  // Methodology parameters
  const debuCount = ref<number>(7);
  const eterSchedule = ref<any[]>([]);

  // Computed: Current seed
  const currentSeed = computed(() => {
    if (!learnerProgress.value) return null;
    return seeds.value.find(s => s.sequence_number === learnerProgress.value!.current_seed);
  });

  // Actions: Load course manifest
  async function loadCourseManifest(courseCode: string) {
    // TODO: Implement manifest loading
    console.log('Loading manifest for', courseCode);
  }

  // Actions: Initialize learner session
  async function initializeSession(learnerId: string, courseCode: string) {
    // TODO: Implement session initialization
    console.log('Initializing session for', learnerId, courseCode);
  }

  return {
    courses,
    seeds,
    legos,
    phrases,
    learnerProgress,
    debuCount,
    eterSchedule,
    currentSeed,
    loadCourseManifest,
    initializeSession,
  };
});
```

## References

- **APML v2.1.0 Specification**: `/apml/APML-v2.1.0-SPECIFICATION.md`
- **Base Compiler**: `/Users/tomcassidy/APML/apml-v2-battles/compiler/vue/`
- **SSi Dashboard**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/`

## License

Same as base APML compiler (MIT).
