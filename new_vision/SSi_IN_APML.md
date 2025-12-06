# Expressing SSi in APML: Analysis & Proposal

**Should we express the entire SSi project in APML?**

Version: 1.0.0
Date: 2025-12-05

---

## Executive Summary

**Yes, expressing SSi in APML makes strong sense**, but APML needs extensions to handle SSi's unique requirements. APML was designed for web applications with UI/business logic/data flows. SSi is a **content production pipeline with pedagogical methodology** - this requires new APML constructs.

---

## What APML Already Provides (Alignment)

### 1. Variable Registry Standard ✅
APML's Variable Registry Standard aligns perfectly with our TERMINOLOGY.md:

```apml
variable_registry SSi_Concepts:
  CONT-001:
    name: Seed
    type: ContentUnit
    definition: "Source sentence in known and target languages"

  PROD-001:
    name: Cycle
    type: ProductionUnit
    definition: "Atomic unit of production - one prompt/response"

  PROD-002:
    name: Set
    type: ProductionUnit
    definition: "Molecular unit - intro to next intro"
```

**Benefit**: Single source of truth for all terminology, enforced across all code generation.

### 2. Project Structure Standard (PSS) ✅
Our existing structure maps to PSS:

```
ssi-project/
├── interface-section-1/    → Production Suite (Dashboard + QA tools)
├── interface-section-2/    → Learning App (mobile delivery)
├── interface-section-3/    → API Services (pipeline, audio, manifest)
├── interface-section-4/    → Orchestration (multi-agent coordination)
├── data-structures/        → Supabase schema, JSON structures
├── infrastructure/         → S3, TTS integration, deployment
├── vfs/courses/            → Course content (seeds, LEGOs, baskets)
└── .apml-registry.json     → Project metadata
```

### 3. Intent Capture Methodology ✅
We've been doing this organically. Formalizing into APML's 7 phases would ensure completeness:
- Domain Exploration: Language learning pedagogy, LEGO methodology
- Stakeholder Analysis: Learners, course creators, voice talent, QA reviewers
- Workflow Mapping: Pipeline phases, audio generation, QA workflow
- Data Architecture: Content hierarchy (Course→Seed→LEGO→Phrase)
- User Experience: Dashboard UI, Learning App UI, Recording Studio
- Technical Constraints: Offline-first, deterministic audio UUIDs, S3/Supabase
- Trinity Validation: System↔User↔System flows all specified

### 4. Deterministic Compilation ✅
This is where it gets interesting. APML promises:

```
Identical APML input → Identical code output
```

For SSi, this means:
- Same content spec → Same course manifest
- Same methodology spec → Same learning sequence
- Same voice config → Same audio generation commands

---

## What SSi Needs That APML Doesn't Have (Extensions Required)

### Extension 1: Content Hierarchy Definitions

APML has `data` for database schemas. SSi needs `content` for pedagogical content:

```apml
# NEW: Content hierarchy definition
content Course:
  id: course_code
  structure:
    contains: Seed[668]

content Seed:
  id: seed_id (format: S0001)
  fields:
    known: {lang: iso3, text: string}
    target: {lang: iso3, text: string}
  extracts: LEGO[]

content LEGO:
  id: lego_id (format: S0001L01)
  type: A-type | M-type
  fields:
    known: string
    target: string
  when M-type:
    has_components: LEGO[]
  has_basket: Basket

content Basket:
  belongs_to: LEGO
  contains:
    components: Phrase[] (when parent is M-type)
    debut_phrases: Phrase[]
    eternal_phrases: Phrase[]
```

### Extension 2: Methodology Definitions

APML has `logic` for business rules. SSi needs `methodology` for pedagogical rules:

```apml
# NEW: Methodology specification
methodology DEBU:
  description: "Debut phase for newly introduced LEGOs"
  triggers_when: LEGO.new == true
  cycle_count: 7 (configurable)
  phrase_source: Basket.debut_phrases

methodology ETER:
  description: "Eternal review phase for learned LEGOs"
  triggers_when: Set.debu_complete == true
  schedule:
    N-1: 3 cycles  # Previous LEGO
    N-2: 1 cycle   # Two LEGOs back
    N-3: 1 cycle
    N-5: 1 cycle
    # Configurable decay pattern
  phrase_source: Basket.eternal_phrases

methodology Set_Structure:
  sequence:
    1. Introduction (when LEGO.new == true)
    2. DEBU cycles
    3. ETER cycles (interleaved by schedule)
    4. Encouragement (optional, at boundaries)
```

### Extension 3: Production Definitions

APML has no concept of "production" - runtime learner activity:

```apml
# NEW: Production specification
production Cycle:
  atomic: true
  structure:
    prompt: {lang: known, source: Phrase.known}
    pause: timing.production_pause
    response: {expected: Phrase.target, from: learner}
    echo: {target1, pause, target2}

production Set:
  molecular: true
  contains: Cycle[]
  bounded_by: Introduction → next Introduction

production Session:
  contains: Set[]
  bounded_by: app_open → app_close
  tracks:
    cycles_completed: int
    sets_completed: int
    duration: milliseconds
```

### Extension 4: Audio Pipeline Definitions

APML compiles to code. SSi also needs to compile to **audio generation commands**:

```apml
# NEW: Audio compilation target
audio Voice:
  id: voice_id
  provider: azure | elevenlabs | human
  roles: instructor | target_primary | target_echo | encouragement

audio Sample:
  uuid: deterministic_hash(voice_id|text|lang|role|cadence)
  storage: S3.mastered/{uuid}.mp3
  registry: Supabase.audio_samples

audio_compilation:
  input: lego_baskets.json
  for_each Phrase:
    generate Sample:
      text: Phrase.known (role: instructor, cadence: natural)
      text: Phrase.target (role: target_primary, cadence: slow)
      text: Phrase.target (role: target_echo, cadence: natural)
```

### Extension 5: Parameter System

APML's config is static. SSi needs **dynamic, scoped parameters**:

```apml
# NEW: Parameter hierarchy
parameters:
  scope course:
    eter_schedule: [N-1:3, N-2:1, N-3:1, N-5:1]
    debu_count: 7
    voice_assignments:
      instructor: voice_abc
      target_primary: voice_def

  scope session:
    difficulty: easy | normal | challenging
    timing_multiplier: 0.8 - 1.5

  scope set:
    # Can override session-level per set

  inheritance: set ← session ← course ← global
```

### Extension 6: Adaptation Rules

APML is deterministic. SSi needs **conditional adaptation**:

```apml
# NEW: Adaptation rules
adaptation Performance_Adjustment:
  observe: learner.cycle_accuracy
  when accuracy < 60%:
    increase debu_count by 2
    slow timing_multiplier by 0.1
  when accuracy > 90%:
    decrease debu_count by 1
    speed timing_multiplier by 0.1

adaptation ETER_Extension:
  observe: learner.retention
  when LEGO.recall_rate < 70%:
    add_to_eter_schedule: N+1
    increase eter_frequency
```

---

## Proposed APML SSi Extension: APML-EDU

Create an educational/pedagogical extension to APML:

```
APML v1.1.0
├── Core APML (existing)
│   ├── data
│   ├── interface
│   ├── logic
│   └── validate
│
└── APML-EDU Extension (new)
    ├── content      # Pedagogical content hierarchies
    ├── methodology  # Learning methodology rules
    ├── production   # Runtime learner activity
    ├── audio        # Audio compilation target
    ├── parameters   # Scoped, inheritable parameters
    └── adaptation   # Dynamic learning adjustments
```

---

## Complete SSi APML Specification Structure

```apml
app SSi_Language_Learning:
  title: "SSi Course Creation & Delivery System"
  apml_version: "1.1.0"
  extensions: [APML-EDU]

  pss_compliance:
    structure_standard: "APML-PSS v1.0.0"
    self_documentation: enabled

# ===========================================
# VARIABLE REGISTRY (from TERMINOLOGY.md)
# ===========================================

variable_registry:
  # Content Layer
  CONT-001: {name: Seed, type: ContentUnit, ...}
  CONT-002: {name: LEGO, type: ContentUnit, ...}
  # ... all 50+ concepts

# ===========================================
# CONTENT DEFINITIONS
# ===========================================

content Course:
  # Complete content hierarchy

content Seed:
  # Seed structure

content LEGO:
  # LEGO structure with A-type/M-type

content Basket:
  # Phrase collections

# ===========================================
# METHODOLOGY DEFINITIONS
# ===========================================

methodology DEBU:
  # Debut learning rules

methodology ETER:
  # Eternal review rules

methodology Set_Structure:
  # How sets are composed

# ===========================================
# PRODUCTION DEFINITIONS
# ===========================================

production Cycle:
  # Atomic production unit

production Set:
  # Molecular production unit

production Session:
  # Complete learner session

# ===========================================
# AUDIO PIPELINE
# ===========================================

audio:
  voices: [...]
  samples: [...]
  compilation_rules: [...]

# ===========================================
# PARAMETERS
# ===========================================

parameters:
  course_level: [...]
  session_level: [...]
  set_level: [...]

# ===========================================
# ADAPTATIONS
# ===========================================

adaptation:
  performance_based: [...]
  retention_based: [...]

# ===========================================
# INTERFACES (existing APML)
# ===========================================

interface production_suite:
  # Dashboard, QA tools

interface learning_app:
  # Mobile delivery

interface api_services:
  # Pipeline, audio, manifest

interface orchestration:
  # Multi-agent coordination

# ===========================================
# DATA (existing APML)
# ===========================================

data:
  # Supabase schema
  # JSON structures

# ===========================================
# VALIDATION
# ===========================================

validate trinity_completeness:
  # System-to-User flows
  # User-to-System flows
  # System-to-System flows

validate pedagogy_completeness:
  # Every LEGO has basket
  # Every phrase has audio
  # ETER schedule covers all learned LEGOs
```

---

## Benefits of SSi in APML

### 1. Single Source of Truth
One APML file defines everything - terminology, content structure, methodology, UI, data, audio pipeline. No more scattered documentation.

### 2. Deterministic Compilation
```
SSi.apml → compile → {
  course_manifest.json,
  supabase_schema.sql,
  dashboard_ui/,
  learning_app/,
  audio_generation_commands/,
  validation_tests/
}
```

### 3. Methodology as Code
The pedagogy becomes executable. Change ETER schedule in APML → recompile → new course behavior.

### 4. Agent Onboarding
Any agent reads SSi.apml and instantly understands:
- What concepts exist (variable registry)
- How content is structured (content definitions)
- How learning works (methodology)
- What the user experiences (production)
- How systems connect (interfaces)

### 5. Trinity Principle for Learning
Extend Trinity to include learner flows:
- System → Learner (prompts, audio, feedback)
- Learner → System (responses, performance data)
- System → System (audio generation, manifest compilation)

---

## Implementation Roadmap

### Phase 1: Express Terminology in APML Variable Registry
Convert TERMINOLOGY.md to APML variable_registry format.

### Phase 2: Define APML-EDU Extension Spec
Formalize the new constructs: content, methodology, production, audio, parameters, adaptation.

### Phase 3: Write Complete SSi.apml
Express entire project in single APML specification.

### Phase 4: Build APML-EDU Compiler
Extend APML compiler to handle EDU constructs and generate:
- Course manifests
- Audio generation commands
- Learning app logic

### Phase 5: Validate Through Compilation
Compile SSi.apml and verify outputs match existing system behavior.

---

## Conclusion

**APML is the right foundation**, but needs the APML-EDU extension to handle:
- Pedagogical content hierarchies
- Learning methodology rules
- Production-time learner activity
- Audio compilation targets
- Scoped parameter systems
- Adaptive learning rules

This isn't just documentation - it's **executable pedagogy**. The methodology becomes code, the content structure becomes schema, the learning experience becomes deterministic specification.

The question isn't "should we?" but "when do we start?"

---

**Next Step**: Draft the APML-EDU Extension Specification.
