# SSi Course Production System - User Stories

> Complete specification of functionality for the Popty Dashboard and SSi Learning ecosystem.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Methodology Creator** | SSi team member who defines canonical content, pedagogical rules |
| **Course Author** | Creates/edits course content (translations, LEGOs, baskets) |
| **Voice Artist** | Records human audio for target languages |
| **QA Reviewer** | Reviews and approves content before publication |
| **Community Creator** | External contributor creating minority language courses |
| **Learner** | End user consuming courses via SSi Learning App |
| **App Developer** | Builds/maintains the learning app and integrations |

---

## 1. Canonical Content Management

### US-CC1: Manage Canonical Seeds
> "As a **methodology creator**, I want to review, edit, and create canonical seed phrases that form the foundation of all courses, so that pedagogical quality is maintained across all language pairs."

**Acceptance Criteria:**
- [ ] View all 668 canonical seeds with English text
- [ ] Edit seed text and metadata
- [ ] Add new seeds with validation against pedagogical rules
- [ ] See which courses use each seed
- [ ] Version history for changes

---

### US-CC2: Manage Welcomes & Encouragements
> "As a **methodology creator**, I want to create and edit welcome messages and encouragement scripts that maintain the SSi pedagogical voice, so that learner experience is consistent."

**Acceptance Criteria:**
- [ ] CRUD operations for welcome scripts
- [ ] CRUD operations for encouragement messages
- [ ] Preview how they appear in lesson flow
- [ ] Localization support (same message in multiple languages)

---

### US-CC3: Manage App Strings (APML v2.0)
> "As an **app developer**, I want to create localized versions of all trinity-compliant UI messages using APML v2.0, so that the app speaks to learners in their known language."

**Acceptance Criteria:**
- [ ] Define all app strings in canonical form
- [ ] Generate translations for each supported known language
- [ ] Export in format consumable by learning app
- [ ] Validate completeness (no missing translations)

---

## 2. Course Creation & Setup

### US-CS1: Create New Course
> "As a **course author**, I want to create a new language course by specifying the language pair (e.g., Italian for English speakers), so that I can begin the production process."

**Acceptance Criteria:**
- [ ] Select target language and known language
- [ ] Course code auto-generated (e.g., `ita_for_eng`)
- [ ] Initialize with canonical seeds
- [ ] Set up voice assignments
- [ ] Course appears in dashboard

---

### US-CS2: Import/Edit Seeds
> "As a **course author**, I want to import seed phrases from a spreadsheet or enter them manually, so that I can customize content for this course."

**Acceptance Criteria:**
- [ ] CSV/Excel import with validation
- [ ] Manual entry form
- [ ] Validation against pedagogical rules
- [ ] Duplicate detection
- [ ] Bulk edit capabilities

---

### US-CS3: Configure Voice Assignments
> "As a **course author**, I want to assign voices to each role (source, target1, target2, presentation), so that audio generation uses the correct voices."

**Acceptance Criteria:**
- [ ] Select from available TTS voices per role
- [ ] Preview voice samples
- [ ] Support for human voice assignment (community courses)
- [ ] Per-course override of language-pair defaults

---

## 3. Translation & LEGO Extraction (Phase 1)

### US-P1-1: Generate Translations
> "As a **course author**, I want the system to generate translations of canonical seeds into my target language, so that I have a starting point for review."

**Acceptance Criteria:**
- [ ] LLM-generated translations for all seeds
- [ ] Side-by-side view (known | target)
- [ ] Confidence scores where available
- [ ] Flag low-confidence for human review

---

### US-P1-2: Review Translations
> "As a **course author**, I want to review AI-generated translations, approve them, or edit them, so that translation quality is assured."

**Acceptance Criteria:**
- [ ] Approve/reject/edit each translation
- [ ] Bulk approve high-confidence translations
- [ ] Add notes for future reference
- [ ] Track who approved what

---

### US-P1-3: Extract LEGOs
> "As a **course author**, I want the system to break down phrases into LEGO components (atomic words, molecular phrases), so that recombination is possible."

**Acceptance Criteria:**
- [ ] Automatic LEGO extraction from translations
- [ ] View LEGO breakdown per seed
- [ ] Identify A-type (atomic) vs M-type (molecular)
- [ ] Show recombination potential

---

## 4. Conflict Resolution (Phase 2)

### US-P2-1: Identify LEGO Conflicts
> "As a **course author**, I want to be notified when the same surface form has different meanings in different contexts, so that I can resolve ambiguity."

**Acceptance Criteria:**
- [ ] Automatic conflict detection
- [ ] List all conflicts with context
- [ ] Show which seeds are affected
- [ ] Severity classification

---

### US-P2-2: Resolve Conflicts
> "As a **course author**, I want to resolve LEGO conflicts by specifying context, choosing alternatives, or merging, so that the LEGO library is unambiguous."

**Acceptance Criteria:**
- [ ] Resolution options: merge, split, contextualize
- [ ] Preview impact of resolution
- [ ] Audit trail of decisions
- [ ] Validation that all conflicts resolved before proceeding

---

### US-P2-3: Validate LEGO Coverage
> "As a **course author**, I want to verify that all seeds are fully covered by LEGOs with no orphaned components, so that the course is complete."

**Acceptance Criteria:**
- [ ] Coverage report per seed
- [ ] Identify orphaned LEGOs
- [ ] Identify seeds with missing LEGOs
- [ ] Block progression if coverage incomplete

---

## 5. Basket Generation (Phase 3)

### US-P3-1: Generate Practice Baskets
> "As a **course author**, I want the system to generate practice baskets that introduce LEGOs in the optimal pedagogical sequence, so that learners build knowledge progressively."

**Acceptance Criteria:**
- [ ] Automatic basket generation from lego_pairs.json
- [ ] Follows debut cycle: components → debut → practice
- [ ] Gender pairing for applicable languages
- [ ] Configurable basket size

---

### US-P3-2: Preview Lesson Flow
> "As a **course author**, I want to preview how a lesson will flow, seeing the sequence of phrases a learner will encounter, so that I can verify pedagogical quality."

**Acceptance Criteria:**
- [ ] Visual lesson flow diagram
- [ ] Show phrase sequence with timing
- [ ] Identify where LEGOs are introduced
- [ ] Highlight potential issues (too many new items, etc.)

---

### US-P3-3: Validate Basket Quality
> "As a **course author**, I want validation that baskets meet quality standards, so that learner experience is optimal."

**Acceptance Criteria:**
- [ ] No orphaned LEGOs
- [ ] Proper sequencing (intro before practice)
- [ ] Gender pairs complete
- [ ] Reasonable basket sizes
- [ ] Report with pass/fail per criterion

---

## 6. Audio Generation (Phase 8)

### US-P8-1: Plan Audio Generation
> "As a **course author**, I want to see a cost estimate and time estimate before committing to TTS generation, so that I can budget appropriately."

**Acceptance Criteria:**
- [x] Show total samples needed
- [x] Show samples already existing (reuse)
- [x] Show samples to generate
- [x] Cost estimate (TTS API costs)
- [x] Time estimate
- [x] Breakdown by role (source, target1, target2)

---

### US-P8-2: Generate TTS Audio
> "As a **course author**, I want to start audio generation and see progress, with the ability to pause or cancel, so that I have control over the process."

**Acceptance Criteria:**
- [x] Start generation button
- [ ] Real-time progress indicator
- [ ] Pause/resume capability
- [ ] Cancel with cleanup
- [ ] Error handling with retry option

---

### US-P8-3: Review Generated Audio
> "As a **course author**, I want to review generated audio samples and flag problematic ones, so that quality issues are caught before publication."

**Acceptance Criteria:**
- [ ] Browse all samples with playback
- [ ] Filter by status (pending, approved, flagged)
- [ ] Flag with reason (pronunciation, pacing, wrong text)
- [ ] Bulk approve good samples

---

### US-P8-4: Reuse Existing Audio
> "As a **course author**, I want the system to automatically detect and reuse audio that already exists (same text + voice), so that I don't pay for duplicate generation."

**Acceptance Criteria:**
- [x] Content-addressed UUIDs (voice + text + cadence = UUID)
- [x] Check Supabase before generating
- [x] Report reuse statistics in plan
- [ ] Cross-course audio sharing

---

## 7. Human Recording (for minority languages)

### US-HR1: Generate Recording Script
> "As a **voice artist**, I want a optimized list of phrases to record that maximizes LEGO coverage with minimum recordings, so that my time is used efficiently."

**Acceptance Criteria:**
- [ ] Algorithm selects minimal phrase set
- [ ] 100% LEGO coverage guaranteed
- [ ] Phrases ordered for natural flow
- [ ] Estimated recording time shown
- [ ] Export as printable script

---

### US-HR2: Continuous Recording Session
> "As a **voice artist**, I want to record phrases continuously without stopping between each one, so that recording is fast and natural."

**Acceptance Criteria:**
- [ ] Teleprompter UI with auto-advance
- [ ] Single continuous audio capture
- [ ] Visual cue for next phrase
- [ ] Configurable pause between phrases
- [ ] Natural pass + slow-gapped pass modes

---

### US-HR3: Automatic Segmentation
> "As a **voice artist**, I want the system to automatically detect phrase and word boundaries in my recording, so that I don't have to manually chop audio."

**Acceptance Criteria:**
- [ ] Server-side audio processing
- [ ] Phrase boundary detection (longer silences)
- [ ] Word boundary detection (shorter silences)
- [ ] Match segments to expected phrases
- [ ] Quality scoring per segment

---

### US-HR4: Review & Re-record
> "As a **voice artist**, I want to see which segments need re-recording due to quality issues, so that I can fix problems without re-recording everything."

**Acceptance Criteria:**
- [ ] List segments below quality threshold
- [ ] Playback with waveform visualization
- [ ] Re-record individual phrases
- [ ] Manual boundary adjustment if needed
- [ ] Approve/reject controls

---

### US-HR5: LEGO Library Generation
> "As a **course author**, I want the system to extract all LEGO audio segments from approved recordings, so that practice phrases can be generated."

**Acceptance Criteria:**
- [ ] Extract A-type and M-type LEGOs
- [ ] Store with content-addressed UUIDs
- [ ] Quality scores per segment
- [ ] Coverage report (which LEGOs do we have?)

---

### US-HR6: Phrase Generation from LEGOs
> "As a **course author**, I want the system to automatically generate all practice phrase audio by concatenating LEGO segments, so that maximum content is created from minimum recording."

**Acceptance Criteria:**
- [ ] Concatenation with crossfade
- [ ] Natural-sounding output
- [ ] Fallback identification (phrases that can't be spliced)
- [ ] Batch generation to S3
- [ ] 10-20x efficiency vs recording each phrase

---

## 8. QA & Approval (Phase 6)

### US-QA1: Browse All Samples
> "As a **QA reviewer**, I want to browse all audio samples with filtering and search, so that I can efficiently review content."

**Acceptance Criteria:**
- [ ] List view with playback
- [ ] Filter by status, role, seed range
- [ ] Search by text
- [ ] Sort by various criteria
- [ ] Bulk selection

---

### US-QA2: Flag Issues
> "As a **QA reviewer**, I want to flag samples with specific issues and notes, so that authors know what to fix."

**Acceptance Criteria:**
- [ ] Flag categories (pronunciation, pacing, wrong text, audio quality)
- [ ] Free-text notes
- [ ] Assign to specific user
- [ ] Priority levels
- [ ] Track flag history

---

### US-QA3: Preview as Learner
> "As a **QA reviewer**, I want to experience the course exactly as a learner would, so that I can verify the complete learning journey."

**Acceptance Criteria:**
- [ ] Embedded learning engine
- [ ] Uses Popty S3 bucket (not published)
- [ ] Click-to-seek on script text
- [ ] Playback speed controls (1x, 1.5x, 2x)
- [ ] Skip to any lesson/seed
- [ ] Flag issues directly from player

---

### US-QA4: Approve for Production
> "As a **course author**, I want to mark reviewed samples as approved, tracking progress toward publication readiness."

**Acceptance Criteria:**
- [ ] Individual and bulk approve
- [ ] Approval audit trail
- [ ] Progress dashboard (X% approved)
- [ ] Block publish if unapproved samples remain

---

## 9. Manifest Compilation & Publication (Phase 9)

### US-P9-1: Compile Final Manifest
> "As a **course author**, I want to compile the final course manifest only after all audio is generated and approved, so that the published course is complete."

**Acceptance Criteria:**
- [ ] Validate 100% audio coverage
- [ ] Validate all samples approved
- [ ] Generate course_manifest.json
- [ ] Include all metadata
- [ ] Version the manifest

---

### US-P9-2: Validate Completeness
> "As a **course author**, I want validation that the course is complete before publishing, so that learners don't encounter missing content."

**Acceptance Criteria:**
- [ ] All seeds have baskets
- [ ] All baskets have audio
- [ ] All audio approved
- [ ] No broken references
- [ ] Completeness report

---

### US-P9-3: Publish Course
> "As a **course author**, I want to publish the course to learners, making it available in the SSi Learning App."

**Acceptance Criteria:**
- [ ] One-click publish
- [ ] Deploy to production S3/CDN
- [ ] Update course registry
- [ ] Notify relevant parties
- [ ] Rollback capability

---

### US-P9-4: Iterative Publishing
> "As a **community creator**, I want to publish my course iteratively (30/60/90 seeds at a time), so that learners can access content early and provide feedback."

**Acceptance Criteria:**
- [ ] Select seed range to publish
- [ ] Partial manifest generation
- [ ] Version tracking (v0.1, v0.2, etc.)
- [ ] Learner sees "more coming soon"
- [ ] Seamless upgrade when more content added

---

## 10. Community Course Creation

### US-COM1: Community Login & Access
> "As a **community creator**, I want to log into the SSi system with permissions granted by the SSi team, so that I can create courses for approved language pairs."

**Acceptance Criteria:**
- [ ] Supabase authentication
- [ ] SSi team grants access per language pair
- [ ] Role-based permissions
- [ ] Activity logging

---

### US-COM2: LLM-Assisted Translation
> "As a **community creator**, I want to use LLMs to generate initial translations for unusual language combinations, then manually refine them, so that I can work efficiently."

**Acceptance Criteria:**
- [ ] LLM translation with language pair support
- [ ] Manual override/edit
- [ ] Track which are human-verified
- [ ] Quality indicators

---

### US-COM3: Collaborative Editing
> "As a **community co-creator**, I want to see who else is working on the course and avoid overwriting their changes, so that we collaborate effectively."

**Acceptance Criteria:**
- [ ] See active editors
- [ ] Pessimistic locking per section
- [ ] Change history
- [ ] Conflict prevention
- [ ] Notification when lock released

---

### US-COM4: Voice Artist Coordination
> "As a **community creator**, I want to invite voice artists to record for my course, providing them with recording scripts and access to the recording interface."

**Acceptance Criteria:**
- [ ] Invite voice artists by email
- [ ] Generate personalized recording links
- [ ] Track recording progress
- [ ] Review and approve submissions

---

## 11. Learner Feedback Loop

### US-FB1: Flag Content from App
> "As a **learner**, I want to flag problematic phrases or audio while using the app, so that the SSi team can improve the course."

**Acceptance Criteria:**
- [ ] In-app flag button
- [ ] Category selection (audio issue, translation issue, confusing)
- [ ] Optional free-text comment
- [ ] Submitted to Popty for review

---

### US-FB2: Review Learner Flags
> "As a **QA reviewer**, I want to see flags submitted by learners, prioritized by frequency, so that I can address the most impactful issues first."

**Acceptance Criteria:**
- [ ] Aggregate flags across learners
- [ ] Show frequency (how many flagged this?)
- [ ] Link to sample in QA browser
- [ ] Mark as resolved
- [ ] Respond to learner (optional)

---

## 12. System Administration

### US-ADM1: User Management
> "As an **administrator**, I want to manage user accounts and permissions, so that access is controlled appropriately."

**Acceptance Criteria:**
- [ ] CRUD users
- [ ] Assign roles
- [ ] Grant/revoke language pair access
- [ ] View activity logs
- [ ] Disable accounts

---

### US-ADM2: Monitor System Health
> "As an **administrator**, I want to monitor the health of all services (Phase servers, S3, Supabase), so that issues are detected early."

**Acceptance Criteria:**
- [ ] Service status dashboard
- [ ] Health check endpoints
- [ ] Alert on failures
- [ ] Resource usage metrics

---

### US-ADM3: Manage TTS Costs
> "As an **administrator**, I want to track TTS API usage and costs across all courses, so that I can manage the budget."

**Acceptance Criteria:**
- [ ] Usage dashboard by course
- [ ] Cost breakdown by provider
- [ ] Monthly trends
- [ ] Budget alerts

---

## 13. Script Viewer & Navigation

### US-SV1: View Course as Script
> "As a **course author**, I want to see the entire learning journey as a linear script (like a film script), so that I can review flow and content."

**Acceptance Criteria:**
- [ ] Chronological display of all content
- [ ] Show: welcomes, phrases, encouragements, gaps
- [ ] Timestamps/timing
- [ ] Collapsible sections by lesson

---

### US-SV2: Click-to-Play from Script
> "As a **QA reviewer**, I want to click on any phrase in the script and have playback start from there, so that I can quickly verify specific sections."

**Acceptance Criteria:**
- [ ] Every text element clickable
- [ ] Player seeks to that position
- [ ] Visual indicator of current position
- [ ] Keyboard navigation (arrow keys)

---

### US-SV3: Script Search
> "As a **course author**, I want to search within the script for specific text, so that I can quickly find where a word or phrase appears."

**Acceptance Criteria:**
- [ ] Full-text search
- [ ] Highlight matches
- [ ] Navigate between matches
- [ ] Show count of occurrences

---

## 14. Analytics & Insights

### US-AN1: Course Production Metrics
> "As a **course author**, I want to see metrics on my course production progress (seeds completed, audio generated, QA status), so that I can track progress and identify bottlenecks."

**Acceptance Criteria:**
- [ ] Dashboard with key metrics
- [ ] Progress over time charts
- [ ] Comparison across courses
- [ ] Export reports

---

### US-AN2: LEGO Reuse Analytics
> "As a **methodology creator**, I want to see how LEGOs are reused across courses and phrases, so that I can optimize the canonical content for maximum recombination."

**Acceptance Criteria:**
- [ ] LEGO frequency analysis
- [ ] Cross-course reuse statistics
- [ ] Identify high-value LEGOs
- [ ] Identify underutilized LEGOs

---

### US-AN3: Audio Library Statistics
> "As an **administrator**, I want to see statistics on the audio library (total samples, storage used, reuse rate), so that I can manage resources effectively."

**Acceptance Criteria:**
- [ ] Total samples by language
- [ ] Storage usage
- [ ] Reuse rate (same audio used in multiple courses)
- [ ] Cost savings from reuse

---

## 15. Data Import/Export

### US-IE1: Export Course Data
> "As a **course author**, I want to export course data in various formats (JSON, CSV, APML), so that I can backup, share, or analyze offline."

**Acceptance Criteria:**
- [ ] Export lego_pairs.json
- [ ] Export lego_baskets.json
- [ ] Export course_manifest.json
- [ ] Export as CSV for spreadsheet analysis
- [ ] Selective export (specific seed ranges)

---

### US-IE2: Import Course Data
> "As a **course author**, I want to import course data from files, so that I can restore backups or migrate content."

**Acceptance Criteria:**
- [ ] Import with validation
- [ ] Merge vs replace options
- [ ] Conflict detection
- [ ] Dry-run preview

---

### US-IE3: Sync with External Tools
> "As a **course author**, I want to sync translations with external translation management tools, so that professional translators can contribute."

**Acceptance Criteria:**
- [ ] Export in XLIFF format
- [ ] Import translated XLIFF
- [ ] Track sync status
- [ ] Handle conflicts

---

## 16. Offline & Mobile Support

### US-OFF1: Offline Dashboard Access
> "As a **course author**, I want to view course content offline, so that I can review while traveling or without internet."

**Acceptance Criteria:**
- [ ] PWA with service worker
- [ ] Cache course data locally
- [ ] Read-only offline mode
- [ ] Sync when back online

---

### US-OFF2: Mobile Recording
> "As a **voice artist**, I want to record audio from my mobile device, so that I can contribute from anywhere."

**Acceptance Criteria:**
- [ ] Mobile-responsive recording UI
- [ ] Upload when on WiFi
- [ ] Queue recordings for upload
- [ ] Quality check before upload

---

## Summary: Implementation Status

| Category | User Stories | Implemented | In Progress | Not Started |
|----------|--------------|-------------|-------------|-------------|
| Canonical Content | 3 | 0 | 0 | 3 |
| Course Setup | 3 | 1 | 1 | 1 |
| Phase 1 (Translation) | 3 | 2 | 1 | 0 |
| Phase 2 (Conflicts) | 3 | 2 | 1 | 0 |
| Phase 3 (Baskets) | 3 | 2 | 1 | 0 |
| Phase 8 (Audio Gen) | 4 | 2 | 1 | 1 |
| Human Recording | 6 | 0 | 1 | 5 |
| QA & Approval | 4 | 1 | 1 | 2 |
| Phase 9 (Publish) | 4 | 0 | 0 | 4 |
| Community | 4 | 1 | 0 | 3 |
| Feedback | 2 | 0 | 0 | 2 |
| Admin | 3 | 1 | 0 | 2 |
| Script Viewer | 3 | 1 | 0 | 2 |
| Analytics | 3 | 0 | 0 | 3 |
| Import/Export | 3 | 0 | 0 | 3 |
| Offline/Mobile | 2 | 0 | 0 | 2 |
| **TOTAL** | **53** | **13** | **7** | **33** |

---

## Priority Matrix

### P0 - Critical Path (Need for MVP)
- US-P8-2: Generate TTS Audio (in progress)
- US-P9-1: Compile Final Manifest
- US-QA3: Preview as Learner

### P1 - High Value
- US-HR1-6: Human Recording Pipeline (minority languages)
- US-P9-4: Iterative Publishing
- US-SV2: Click-to-Play Script

### P2 - Important
- US-COM1-4: Community Creation
- US-FB1-2: Learner Feedback
- US-CC1-3: Canonical Content

### P3 - Nice to Have
- US-ADM1-3: Administration
- US-SV3: Script Search

---

*Last updated: 2024-12-11*
*Version: 1.0*
