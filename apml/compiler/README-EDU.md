# APML-EDU Vue Compiler

**Version**: 0.1.0 (APML v2.1.0 with EDU extensions)
**Base**: APML v2.0 Vue Compiler
**Extensions**: APML-EDU for educational and pedagogical applications

## Quick Start

### Installation
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/compiler
npm install
npm run build
```

### Compile an APML-EDU Specification
```bash
node dist/index.js path/to/spec.apml output/directory
```

## What's New in APML-EDU

### Six New Top-Level Constructs

1. **`content`** - Pedagogical content hierarchies
   - Define Course → Seed → LEGO → Basket → Phrase structures
   - Specify fields, relationships, and audio mappings

2. **`methodology`** - Learning rules and pedagogical sequences
   - DEBU (debut practice)
   - ETER (expanding time-based exponential review)
   - Set structure (atomic learning units)

3. **`production`** - Runtime learner activity units
   - Cycle (atomic interaction)
   - Set (molecular unit)
   - Session (complete learning session)

4. **`audio`** - Audio pipeline configuration
   - Voice definitions (Azure, ElevenLabs, Google, Human)
   - Sample storage (S3, Supabase)
   - Generation pipeline (deterministic UUIDs)

5. **`parameters`** - Scoped configuration management
   - System → Language Pair → Course → Session → Learner
   - Hierarchical inheritance
   - Override capabilities

6. **`adaptation`** - Dynamic learning adjustments
   - Performance-based difficulty changes
   - ETER schedule modifications
   - Recovery mode triggers

## Generated Files

### For Production Suite (Course Creation Tools)

```
output/
├── src/
│   ├── types/
│   │   ├── models.ts          # From data models
│   │   └── education.ts       # Runtime EDU types
│   ├── stores/
│   │   ├── app.ts            # Core app store
│   │   ├── education.ts      # Content/methodology store
│   │   └── audio.ts          # Audio pipeline store
│   ├── components/
│   │   ├── [Interface].vue   # From interface sections
│   │   └── ProgressTracker.vue  # Progress tracking
│   └── services/
│       └── adaptation.ts     # Adaptive logic engine
```

### Education Store Example
```typescript
// src/stores/education.ts
export const useEducationStore = defineStore('education', () => {
  const courses = ref<Course[]>([]);
  const seeds = ref<Seed[]>([]);
  const legos = ref<LEGO[]>([]);
  const phrases = ref<PracticePhrase[]>([]);
  const learnerProgress = ref<LearnerProgress | null>(null);

  const currentSeed = computed(() => {
    if (!learnerProgress.value) return null;
    return seeds.value.find(s =>
      s.sequence_number === learnerProgress.value!.current_seed
    );
  });

  async function loadCourseManifest(courseCode: string) { ... }
  async function initializeSession(learnerId: string, courseCode: string) { ... }

  return { courses, seeds, legos, phrases, loadCourseManifest, ... };
});
```

### Audio Store Example
```typescript
// src/stores/audio.ts
export const useAudioStore = defineStore('audio', () => {
  const audioSamples = ref<AudioSample[]>([]);
  const sampleFlags = ref<SampleFlag[]>([]);
  const currentJob = ref<GenerationJob | null>(null);

  const generationProgress = computed(() => {
    if (!currentJob.value) return 0;
    return (currentJob.value.generated_count / currentJob.value.total_phrases) * 100;
  });

  async function startGeneration(courseCode: string) { ... }
  async function flagSample(uuid: string, type: string, notes?: string) { ... }

  return { audioSamples, generationProgress, startGeneration, ... };
});
```

## Example APML-EDU Spec

```apml
app SSiProductionSuite:
  title: "SSI Course Production Suite"
  apml_version: "2.1.0"
  extensions: [APML-EDU]

# Data models
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

# Content hierarchy
content Seed:
  type: seed
  id: seed_id
  fields:
    known_text: text required
    target_text: text required
  structure:
    extracts: LEGO[]

content LEGO:
  type: lego
  id: lego_id
  fields:
    known_text: text required
    target_text: text required
    type: enum [A, M]
    is_new: boolean default: true
  structure:
    when type == M:
      has_components: LEGO[]
    has_basket: Basket
  audio:
    known_audio: AudioSample
    target_audio: AudioSample
    presentation_audio: AudioSample

# Methodology
methodology DEBU:
  description: "Initial practice of newly introduced LEGO"
  triggers_when: LEGO.is_new == true
  sequence:
    1: present LEGO.introduction
    2: practice LEGO.debut_phrase
    3: repeat debu_phrases for debu_count cycles
  parameters:
    debu_count: number default: 7
    selection_strategy: enum [sequential, difficulty_curve] default: sequential
  timing:
    cycle_pause: duration default: 1000ms
    response_pause: duration default: 2000ms

# Production
production Cycle:
  type: cycle
  atomic: true
  structure:
    1: prompt
       audio: phrase.known_audio
       display: phrase.known_text (if show_text enabled)
    2: pause
       duration: parameters.response_pause
       purpose: learner_thinks
    3: cue
       audio: phrase.target1_audio
       cadence: parameters.target_cadence
    4: echo
       audio: phrase.target2_audio
       cadence: natural

# Audio
audio:
  voices:
    source:
      id: azure_en_GB_BellaNeural
      provider: azure
      language: eng
      role: instructor
    target1:
      id: azure_es_ES_TrianaNeural
      provider: azure
      language: spa
      role: target_primary
  samples:
    storage:
      provider: S3
      bucket: ssi-audio-stage
      region: eu-west-1
      path_template: mastered/{uuid}.mp3
    registry:
      provider: Supabase
      table: audio_samples
    uuid_generation:
      method: deterministic
      hash: SHA256(voice_id | text_normalized | language | role | cadence)

# Parameters
parameters:
  scope system:
    debu_count: 7
    eter_schedule: [{offset: 1, cycles: 3}, {offset: 2, cycles: 1}]
    response_pause: 2000ms
    cycle_pause: 1000ms
  scope course:
    voices: {...}
    timing: {...}
  inheritance: learner <- session <- course <- language_pair <- system

# Adaptation
adaptation Performance_Adjustment:
  observe: learner.session_accuracy
  thresholds:
    high_performance: 0.85
    low_performance: 0.65
  when accuracy > high_performance for 3 consecutive sessions:
    increase difficulty by 1 level
    reduce debu_count by 1 (min: 5)
  when accuracy < low_performance for 3 consecutive sessions:
    decrease difficulty by 1 level
    increase debu_count by 2 (max: 12)
    enable: recovery_mode
```

## Runtime Types

All educational domain types are available in `src/types/education.ts`:

### Content Types
- `Course`, `Seed`, `LEGO`, `Basket`, `PracticePhrase`

### Audio Types
- `AudioSample`, `Voice`, `GenerationJob`, `SampleFlag`

### Production Types
- `LearnerSession`, `Cycle`, `Set`

### Progress Types
- `LearnerProgress`, `LEGOProgress`

### Methodology Types
- `MethodologyParameters`, `ETERScheduleItem`

### Adaptation Types
- `AdaptationEvent`, `DifficultySettings`

### Manifest Types
- `CourseManifest`, `SeedManifest`, `LEGOManifest`, `BasketManifest`

## Integration with SSi Pipeline

The generated code integrates with:

### Phase 8: Audio Generation (Port 3465)
```typescript
// In generated audio store
async function startGeneration(courseCode: string) {
  const response = await fetch('http://localhost:3465/generate', {
    method: 'POST',
    body: JSON.stringify({ courseCode })
  });
  // Handle WebSocket updates...
}
```

### Phase 9: Manifest Compilation (Port 3466)
```typescript
// In generated education store
async function loadCourseManifest(courseCode: string) {
  const response = await fetch(`http://localhost:3466/validate/${courseCode}`);
  const manifest = await response.json();
  // Load into store...
}
```

### Production API (Port 3470)
```typescript
// WebSocket for real-time updates
const socket = io('http://localhost:3470/api/production/websocket');
socket.on('audio_progress', (update) => {
  // Update generation progress...
});
```

### Supabase
```typescript
// Query audio samples
const { data } = await supabase
  .from('audio_samples')
  .select('*')
  .eq('course_code', courseCode);
```

## Implementation Status

### ✅ Completed
- AST type definitions for all APML-EDU constructs
- Runtime TypeScript types (education.ts)
- Basic parsing for all APML-EDU sections
- Scaffolding generation (stores, components, services)
- TypeScript compilation (no errors)

### 🚧 TODO
- Deep parsing of nested structures
- Advanced generation (manifest loading, state machines)
- Learner app generation
- Trinity validation
- Audio coverage validation

## Focus: Production Suite First

Current implementation targets the **Production Suite**:

1. **Script Viewer** - Hierarchical content display
2. **Audio Pipeline** - TTS generation management
3. **Recording Studio** - Human voice recording
4. **Mission Control** - Overall progress dashboard

The **Learner App** will be added later with additional templates.

## Documentation

- **APML-EDU-EXTENSIONS.md** - Detailed explanation of extensions
- **IMPLEMENTATION-SUMMARY.md** - Implementation details and statistics
- **APML v2.1.0 SPECIFICATION** - `/apml/APML-v2.1.0-SPECIFICATION.md`

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Compile an APML file
npm run compile path/to/file.apml output/dir
```

## License

MIT (same as base APML compiler)
