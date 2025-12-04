# Course Production Suite - System Diagrams

**Mermaid Diagrams for Architecture Visualization**

Version: 1.0.0
Date: 2025-12-04

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Course Production Suite"
        MC[Mission Control Dashboard]
        SV[Script Viewer]
        AP[Audio Pipeline]
        RS[Recording Studio]
        SB[Samples Browser]
    end

    subgraph "Single Source of Truth"
        S3[(S3 Storage)]
        CM[course_manifest.json]
        SF[sample_flags.json]
        AM[audio_metadata.json]
        AF[Audio Files .mp3]
    end

    MC --> SV
    MC --> AP
    MC --> RS
    MC --> SB

    SV --> S3
    AP --> S3
    RS --> S3
    SB --> S3

    S3 --> CM
    S3 --> SF
    S3 --> AM
    S3 --> AF

    style MC fill:#10b981,stroke:#059669,color:#fff
    style S3 fill:#1e293b,stroke:#10b981,color:#10b981
    style SF fill:#0f172a,stroke:#f59e0b,color:#f59e0b
```

---

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant QA as QA Reviewer
    participant SV as Script Viewer
    participant API as API Server
    participant S3 as S3 Storage
    participant WS as WebSocket
    participant AP as Audio Pipeline

    QA->>SV: Flag sample for regeneration
    SV->>API: POST /flags/update
    API->>S3: Update sample_flags.json
    S3-->>API: Confirm update
    API->>WS: Broadcast sample_updated
    WS-->>SV: Update UI (optimistic)
    WS-->>AP: Show in pipeline queue

    Note over AP: Audio Pipeline picks up flagged sample
    AP->>API: POST /queue/add
    API->>S3: Update status: in_pipeline
    AP->>AP: Generate TTS audio
    AP->>S3: Upload audio file
    AP->>API: POST /audio-metadata/update
    API->>WS: Broadcast generation_complete
    WS-->>SV: Update status: needs_review
```

---

## Sample Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: Initial state

    pending --> flagged_text_edit: Text correction needed
    pending --> flagged_regen_tts: Audio regeneration needed
    pending --> flagged_human_needed: Human recording needed
    pending --> approved: Direct approval

    flagged_regen_tts --> in_pipeline: Added to TTS queue
    in_pipeline --> tts_complete: Generation successful
    in_pipeline --> tts_failed: Generation failed
    tts_failed --> in_pipeline: Retry
    tts_failed --> flagged_human_needed: Give up on TTS

    flagged_human_needed --> in_recording: Recording session started
    in_recording --> recorded: Recording uploaded

    tts_complete --> needs_review: QA review required
    recorded --> needs_review: QA review required

    needs_review --> approved: Sample approved
    needs_review --> rejected: Sample rejected

    rejected --> flagged_regen_tts: Re-flag for TTS
    rejected --> flagged_human_needed: Re-flag for human

    approved --> complete: Final state

    complete --> [*]

    style pending fill:#64748b
    style flagged_regen_tts fill:#f59e0b
    style flagged_human_needed fill:#f59e0b
    style in_pipeline fill:#06b6d4
    style tts_complete fill:#10b981
    style tts_failed fill:#ef4444
    style approved fill:#10b981
    style complete fill:#059669
```

---

## Component Interaction Flow

```mermaid
graph LR
    subgraph "Script Viewer (QA Tool)"
        SV1[Load Course Manifest]
        SV2[Display Seeds & Cycles]
        SV3[Flag Items]
        SV4[Filter View]
    end

    subgraph "Audio Pipeline"
        AP1[Monitor Flagged Items]
        AP2[Queue Management]
        AP3[TTS Generation]
        AP4[Status Updates]
    end

    subgraph "Recording Studio"
        RS1[Load Recording Queue]
        RS2[Autocue Display]
        RS3[Record Audio]
        RS4[Upload to S3]
    end

    subgraph "Samples Browser"
        SB1[List All Samples]
        SB2[Play Audio]
        SB3[Compare TTS vs Human]
        SB4[Approve/Reject]
    end

    SV3 --> AP1
    SV3 --> RS1
    AP3 --> SB1
    RS4 --> SB1
    SB4 --> SV4

    style SV3 fill:#f59e0b
    style AP3 fill:#06b6d4
    style RS4 fill:#10b981
    style SB4 fill:#10b981
```

---

## Navigation Structure

```mermaid
graph TD
    Root[/production]
    Course[/production/:courseCode]
    Script[/production/:courseCode/script]
    Pipeline[/production/:courseCode/audio-pipeline]
    Recording[/production/:courseCode/recording]
    Samples[/production/:courseCode/samples]

    Root --> Course
    Course --> Script
    Course --> Pipeline
    Course --> Recording
    Course --> Samples

    Script --> ScriptDeep[?seed=S0042]
    Recording --> RecordQueue[?queue=xyz]
    Samples --> SamplesFilter[?status=flagged]

    style Root fill:#10b981,stroke:#059669,color:#fff
    style Course fill:#10b981,stroke:#059669,color:#fff
    style ScriptDeep fill:#0f172a,stroke:#10b981
    style RecordQueue fill:#0f172a,stroke:#10b981
    style SamplesFilter fill:#0f172a,stroke:#10b981
```

---

## API Endpoint Structure

```mermaid
graph TB
    subgraph "Production API"
        Root[/api/production/:courseCode]

        subgraph "Core Endpoints"
            Manifest[GET /manifest]
            Flags[GET /flags]
            FlagsUpdate[POST /flags/update]
            AudioMeta[GET /audio-metadata]
        end

        subgraph "Script Endpoints"
            Seeds[GET /script/seeds]
            Seed[GET /script/seeds/:seedId]
            Samples[GET /script/samples]
        end

        subgraph "Pipeline Endpoints"
            Status[GET /audio-pipeline/status]
            QueueAdd[POST /audio-pipeline/queue/add]
            Retry[POST /audio-pipeline/queue/retry]
        end

        subgraph "Recording Endpoints"
            Queues[GET /recording/queues]
            CreateQueue[POST /recording/queues/create]
            Upload[POST /recording/upload]
        end

        subgraph "Samples Endpoints"
            List[GET /samples/list]
            Detail[GET /samples/:uuid]
            Approve[POST /samples/:uuid/approve]
            Reject[POST /samples/:uuid/reject]
        end

        Root --> Manifest
        Root --> Flags
        Root --> FlagsUpdate
        Root --> AudioMeta

        Root --> Seeds
        Root --> Seed
        Root --> Samples

        Root --> Status
        Root --> QueueAdd
        Root --> Retry

        Root --> Queues
        Root --> CreateQueue
        Root --> Upload

        Root --> List
        Root --> Detail
        Root --> Approve
        Root --> Reject
    end

    WS[WebSocket /api/production/websocket]

    style Root fill:#10b981,stroke:#059669,color:#fff
    style WS fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## Flag Update Process Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Script Viewer
    participant Store as Pinia Store
    participant API
    participant S3
    participant WS as WebSocket

    User->>UI: Click "Flag Sample"
    UI->>UI: Show flag menu
    User->>UI: Select flag type & add note
    UI->>Store: updateSampleFlag(uuid, data)

    Note over Store: Optimistic update
    Store->>Store: Update local state

    Store->>API: POST /flags/update
    API->>S3: Read current flags
    S3-->>API: Return flags JSON
    API->>API: Merge update
    API->>S3: Write updated flags
    S3-->>API: Confirm write

    API->>WS: Broadcast 'sample_updated'
    WS-->>Store: Receive update event
    Store->>Store: Confirm optimistic update

    Note over UI: Other connected clients
    WS-->>UI: Update other user's UI

    API-->>Store: Return success
    Store-->>UI: Refresh UI
    UI-->>User: Show success message
```

---

## Recording Studio Workflow

```mermaid
flowchart TD
    Start([User Opens Recording Studio]) --> LoadQueue[Load Recording Queue]
    LoadQueue --> CheckQueue{Queue Empty?}

    CheckQueue -->|Yes| CreateQueue[Create New Queue]
    CreateQueue --> SelectSamples[Select Samples for Recording]
    SelectSamples --> GroupPhrases[Group Related Phrases]

    CheckQueue -->|No| DisplayAutocue[Display Autocue]

    GroupPhrases --> DisplayAutocue

    DisplayAutocue --> ShowPhrase[Show Current Phrase]
    ShowPhrase --> Record[User Clicks Record]
    Record --> Capture[Capture Audio]
    Capture --> StopRecord[User Clicks Stop]
    StopRecord --> Playback[Play Back Recording]

    Playback --> Approve{User Approves?}

    Approve -->|No| Record
    Approve -->|Yes| Upload[Upload to S3]

    Upload --> UpdateMetadata[Update audio_metadata.json]
    UpdateMetadata --> UpdateStatus[Update sample status]
    UpdateStatus --> NextPhrase{More Phrases?}

    NextPhrase -->|Yes| ShowPhrase
    NextPhrase -->|No| Complete([Queue Complete])

    style Start fill:#10b981
    style Complete fill:#10b981
    style Record fill:#f59e0b
    style Upload fill:#06b6d4
```

---

## Audio Pipeline Processing Flow

```mermaid
flowchart TD
    Start([Pipeline Starts]) --> CheckQueue{Items in Queue?}

    CheckQueue -->|No| Wait[Wait for Items]
    Wait --> CheckQueue

    CheckQueue -->|Yes| PopItem[Get Next Item]
    PopItem --> UpdateStatus1[Status: in_pipeline]
    UpdateStatus1 --> LoadVoice[Load Voice Config]

    LoadVoice --> TTSGenerate[Generate TTS Audio]

    TTSGenerate --> CheckSuccess{Success?}

    CheckSuccess -->|No| IncrementRetry[Increment Retry Count]
    IncrementRetry --> CheckRetries{Max Retries?}

    CheckRetries -->|No| Wait2[Wait 5s]
    Wait2 --> TTSGenerate

    CheckRetries -->|Yes| UpdateFailed[Status: tts_failed]
    UpdateFailed --> FlagHuman[Flag for human recording]
    FlagHuman --> CheckQueue

    CheckSuccess -->|Yes| UploadS3[Upload to S3]
    UploadS3 --> UpdateMetadata[Update audio_metadata.json]
    UpdateMetadata --> UpdateStatus2[Status: tts_complete]
    UpdateStatus2 --> Broadcast[Broadcast completion]
    Broadcast --> CheckQueue

    style Start fill:#10b981
    style TTSGenerate fill:#06b6d4
    style UploadS3 fill:#10b981
    style UpdateFailed fill:#ef4444
    style FlagHuman fill:#f59e0b
```

---

## Mission Control Dashboard Data Flow

```mermaid
graph TB
    subgraph "Data Sources"
        S3_Manifest[course_manifest.json]
        S3_Flags[sample_flags.json]
        S3_Audio[audio_metadata.json]
        WS[WebSocket Events]
    end

    subgraph "Dashboard Store"
        LoadData[Load Initial Data]
        Calculate[Calculate Statistics]
        DetectBlockers[Detect Blockers]
        UpdateRealtime[Real-time Updates]
    end

    subgraph "Dashboard UI"
        Progress[Overall Progress Bar]
        Blockers[Blocker Cards]
        PipelineStatus[Pipeline Stage Cards]
        QuickActions[Quick Action Buttons]
    end

    S3_Manifest --> LoadData
    S3_Flags --> LoadData
    S3_Audio --> LoadData

    LoadData --> Calculate
    Calculate --> DetectBlockers

    DetectBlockers --> Blockers
    Calculate --> Progress
    Calculate --> PipelineStatus

    WS --> UpdateRealtime
    UpdateRealtime --> Calculate

    Blockers --> QuickActions

    QuickActions -.->|Send to Pipeline| Pipeline[Audio Pipeline]
    QuickActions -.->|Create Queue| Recording[Recording Studio]

    style S3_Flags fill:#f59e0b
    style UpdateRealtime fill:#06b6d4
    style Blockers fill:#ef4444
    style QuickActions fill:#10b981
```

---

## Multi-User Collaboration Flow

```mermaid
sequenceDiagram
    participant User1 as QA Reviewer (User 1)
    participant User2 as Audio Engineer (User 2)
    participant API as API Server
    participant S3 as S3 Storage
    participant WS as WebSocket

    Note over User1,User2: Both users viewing same course

    User1->>API: Flag sample for regeneration
    API->>S3: Update sample_flags.json
    S3-->>API: Confirm
    API->>WS: Broadcast 'sample_flagged'

    WS-->>User1: Update User 1's UI
    WS-->>User2: Update User 2's UI

    Note over User2: Sees flagged sample in pipeline

    User2->>API: Add flagged items to queue
    API->>S3: Update status: in_pipeline
    API->>WS: Broadcast 'pipeline_updated'

    WS-->>User1: Show "in pipeline" status
    WS-->>User2: Show queue progress

    Note over API: TTS generation completes

    API->>S3: Upload audio + update metadata
    API->>WS: Broadcast 'generation_complete'

    WS-->>User1: Show "needs review" status
    WS-->>User2: Show completion

    User1->>API: Review and approve audio
    API->>S3: Update status: approved
    API->>WS: Broadcast 'sample_approved'

    WS-->>User1: Show "approved" status
    WS-->>User2: Show "approved" status
```

---

## Component Hierarchy

```mermaid
graph TD
    App[App.vue]

    subgraph "Production Suite"
        MC[MissionControlDashboard.vue]

        subgraph "Script Viewer"
            SV[ScriptViewer.vue]
            SeedTree[SeedTree.vue]
            SeedNode[SeedNode.vue]
            CycleNode[CycleNode.vue]
            SampleRow[SampleRow.vue]
            FlagMenu[FlagMenu.vue]
            PlaybackBar[AudioPlaybackBar.vue]
        end

        subgraph "Audio Pipeline"
            AP[AudioPipelineView.vue]
            QueueList[QueueList.vue]
            ProcessingCard[ProcessingCard.vue]
            CompletedList[CompletedList.vue]
        end

        subgraph "Recording Studio"
            RS[RecordingStudio.vue]
            AutocueDisplay[AutocueDisplay.vue]
            RecordingControls[RecordingControls.vue]
            QueuePreview[QueuePreview.vue]
            WaveformDisplay[WaveformDisplay.vue]
        end

        subgraph "Samples Browser"
            SB[SamplesBrowser.vue]
            SampleGrid[SampleGrid.vue]
            SampleCard[SampleCard.vue]
            CompareView[CompareView.vue]
        end
    end

    App --> MC
    MC --> SV
    MC --> AP
    MC --> RS
    MC --> SB

    SV --> SeedTree
    SeedTree --> SeedNode
    SeedNode --> CycleNode
    CycleNode --> SampleRow
    SampleRow --> FlagMenu
    SV --> PlaybackBar

    AP --> QueueList
    AP --> ProcessingCard
    AP --> CompletedList

    RS --> AutocueDisplay
    RS --> RecordingControls
    RS --> QueuePreview
    RecordingControls --> WaveformDisplay

    SB --> SampleGrid
    SampleGrid --> SampleCard
    SB --> CompareView

    style MC fill:#10b981,stroke:#059669,color:#fff
    style SV fill:#06b6d4,stroke:#0284c7,color:#fff
    style AP fill:#f59e0b,stroke:#d97706,color:#fff
    style RS fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style SB fill:#ec4899,stroke:#db2777,color:#fff
```

---

## State Management (Pinia Store)

```mermaid
classDiagram
    class ProductionStore {
        +String currentCourse
        +Object sampleFlags
        +Object audioMetadata
        +Object manifest
        +Array flaggedSamples

        +loadCourse(courseCode)
        +updateSampleFlag(uuid, updates)
        +getSampleStatus(uuid)
        +getFlaggedByType(type)
        +getBlockers()
        +getPipelineStats()
        +connectWebSocket()
    }

    class AudioPipelineStore {
        +Array queue
        +Object processing
        +Array completed
        +Boolean isRunning

        +addToQueue(samples)
        +pauseQueue()
        +resumeQueue()
        +retryFailed(uuid)
        +clearCompleted()
    }

    class RecordingStore {
        +Array queues
        +Object currentQueue
        +Object currentItem
        +Boolean isRecording

        +loadQueues()
        +createQueue(samples)
        +startRecording()
        +stopRecording()
        +uploadRecording(blob)
        +nextItem()
    }

    class SamplesStore {
        +Array samples
        +Object filters
        +String sortBy

        +loadSamples()
        +filterByStatus(status)
        +approveSample(uuid)
        +rejectSample(uuid)
        +compareSamples(uuid1, uuid2)
    }

    ProductionStore --> AudioPipelineStore : uses
    ProductionStore --> RecordingStore : uses
    ProductionStore --> SamplesStore : uses
```

---

## S3 Storage Structure

```mermaid
graph TB
    subgraph "S3 Bucket: popty-bach-lfs"
        subgraph "courses/"
            CourseA[spa_for_eng/]
            CourseB[mkd_for_eng/]
            CourseC[zho_for_eng/]

            subgraph "spa_for_eng/"
                Manifest[course_manifest.json]
                Flags[sample_flags.json]
                AudioMeta[audio_metadata.json]
            end
        end

        subgraph "ssiborg-assets/"
            Mastered[mastered/]

            subgraph "mastered/"
                Audio1[a1b2c3d4-e5f6-7890.mp3]
                Audio2[b2c3d4e5-f6a7-8901.mp3]
                Audio3[c3d4e5f6-a7b8-9012.mp3]
                AudioN[... thousands more]
            end
        end
    end

    Manifest -.->|references| Audio1
    Manifest -.->|references| Audio2
    Manifest -.->|references| Audio3

    Flags -.->|tracks status| Audio1
    Flags -.->|tracks status| Audio2
    Flags -.->|tracks status| Audio3

    AudioMeta -.->|metadata for| Audio1
    AudioMeta -.->|metadata for| Audio2
    AudioMeta -.->|metadata for| Audio3

    style Flags fill:#f59e0b
    style AudioMeta fill:#06b6d4
    style Audio1 fill:#10b981
    style Audio2 fill:#10b981
    style Audio3 fill:#10b981
```

---

*Diagrams created with Mermaid*
*Version: 1.0.0*
*Date: 2025-12-04*

**Note:** These diagrams can be rendered in any Markdown viewer that supports Mermaid syntax (GitHub, GitLab, VS Code with Mermaid extension, etc.)
