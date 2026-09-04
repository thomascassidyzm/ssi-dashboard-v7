import { createRouter, createWebHistory } from 'vue-router'
import MissionControlHub from '../views/MissionControl.vue'
import CanonicalSeeds from '../views/CanonicalSeeds.vue'
import CanonicalContent from '../views/CanonicalContent.vue'
import CourseBrowser from '../views/CourseBrowser.vue'
import CourseEditor from '../views/CourseEditor.vue'
import CourseCompilation from '../views/CourseCompilation.vue'
import Pedagogy from '../views/Pedagogy.vue'
import RecursiveUpregulation from '../views/RecursiveUpregulation.vue'
// Compiled Docs renders — served from the explanation pack (tools/explainer),
// replacing the old hand-written APMLSpec/TerminologyGlossary/ProcessOverview/
// PhaseIntelligence estate (deleted 2026-07-27; prose lives on in git).
import DocsApml from '../views/docs/DocsApml.vue'
import DocsGlossary from '../views/docs/DocsGlossary.vue'
import DocsPipeline from '../views/docs/DocsPipeline.vue'

// Documentation Layout (v14 nested navigation)
import DocsLayout from '../views/docs/DocsLayout.vue'
import CourseValidator from '../views/CourseValidator.vue'
import CourseProgress from '../views/CourseProgress.vue'
import UserManagement from '../views/UserManagement.vue'

// Quality Review Components
import QualityDashboard from '../components/quality/QualityDashboard.vue'
import SeedQualityReview from '../components/quality/SeedQualityReview.vue'
import PromptEvolutionView from '../components/quality/PromptEvolutionView.vue'
import CourseHealthReport from '../components/quality/CourseHealthReport.vue'

// Editing Components
import IntroductionsViewer from '../components/IntroductionsViewer.vue'

// Auth Components
import Login from '../views/Login.vue'
import AuthVerify from '../views/AuthVerify.vue'
import { useAuth } from '../composables/useAuth'
import { LEGACY_LAB_REDIRECTS } from './legacyLabRedirects'

// Production Suite v2.1 Components (APML-generated) - Now the default
const ScriptViewer = () => import('../views/production/ScriptViewer.vue')
const AudioPipeline = () => import('../views/production/AudioPipeline.vue')
// RecordingStudio.vue (V2) is deprecated — its upload body shape always 400s.
// The route below redirects to the Autocue recorder; the component file is kept.
const UserFeedback = () => import('../views/production/UserFeedback.vue')

// Note: SamplesBrowser removed - QA now uses ScriptViewer with filter=flagged


const routes = [
  // ============================================
  // Mission Control Hub - Main Entry Point
  // ============================================
  // Nav unification (Option A): '/' is the Home hub; the persistent Courses
  // tab covers the "courses one click away" need that previously kept the
  // pipeline board at root.
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: 'Home' }
  },
  // Legacy path kept working — redirects to the new root.
  {
    path: '/home',
    redirect: '/'
  },
  // The pipeline board (formerly at '/') retained as a reachable surface.
  // Its courses-list role is covered by the Courses library at '/courses';
  // this preserves the board's import/pipeline widgets while the nav settles.
  {
    path: '/pipeline',
    name: 'MissionControl',
    component: MissionControlHub,
    meta: { title: 'Pipeline Board' }
  },
  // Admin hub — platform-wide tooling (Configs, Insights, Activity,
  // Maintenance, Users). Not per-course; gating is RLS/component-level.
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/Admin.vue'),
    meta: { title: 'Admin' }
  },
  // Human recording, Tom's side: the per-language flag, the coverage bar, and
  // the link to send each recordist. Normal auth — only the /r/ surface is open.
  {
    path: '/admin/recording',
    name: 'AdminRecording',
    component: () => import('../views/AdminRecording.vue'),
    meta: { title: 'Human Recording - Admin' }
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: () => import('../views/Maintenance.vue'),
    meta: { title: 'Maintenance' }
  },
  {
    path: '/insights',
    name: 'Insights',
    component: () => import('../views/Insights.vue'),
    meta: { title: 'Insights' }
  },
  // ============================================
  // How & Why — the founder's "Rulings + How-to" surface (ruling 2026-07-28).
  // The app teaches itself: ONE surface holding the persona-scoped how-to
  // (compiled pack explanations) and the founder-authored rulings prose
  // (Pedagogy, Pod Thinking, the why-of-APML). This replaced the Docs hub.
  // ============================================
  {
    path: '/how',
    component: DocsLayout,
    children: [
      {
        path: '',
        name: 'HowAndWhy',
        component: () => import('../views/HowAndWhy.vue'),
        meta: { title: 'How & Why' }
      },
      {
        path: 'pedagogy',
        name: 'Pedagogy',
        component: Pedagogy,
        meta: { title: 'Pedagogical Model' }
      },
      {
        path: 'pod-thinking',
        name: 'PodThinkingIndex',
        component: () => import('../views/PodThinkingIndex.vue'),
        meta: { title: 'Pod Thinking', public: true }
      },
      {
        path: 'pod-thinking/:slug',
        name: 'PodThinkingDoc',
        component: () => import('../views/PodThinkingDoc.vue'),
        props: true,
        meta: { title: 'Pod Thinking', public: true }
      }
    ]
  },

  // ============================================
  // Stock-take — the compiled reference, demoted to admin-on-demand
  // (ruling 2026-07-28). Pipeline / Glossary / APML current-state + the
  // "Update docs" button. All the compiler/drift-gate/refresh machinery
  // lives on underneath; only the navigation prominence changed.
  // ============================================
  {
    path: '/stocktake',
    component: DocsLayout,
    children: [
      {
        path: '',
        name: 'StocktakeIndex',
        component: () => import('../views/docs/StocktakeIndex.vue'),
        meta: { title: 'Stock-take' }
      },
      {
        path: 'pipeline',
        name: 'DocsPipeline',
        component: DocsPipeline,
        meta: { title: 'Pipeline - Stock-take' }
      },
      {
        path: 'glossary',
        name: 'DocsGlossary',
        component: DocsGlossary,
        meta: { title: 'Terminology Glossary - Stock-take' }
      },
      {
        path: 'apml',
        name: 'DocsApml',
        component: DocsApml,
        meta: { title: 'APML Specification - Stock-take' }
      }
    ]
  },

  // ============================================
  // Canonical data browsers — tools, not docs (ruling 2026-07-28). They live
  // with the course estate under the Courses section. NOT under /courses/*
  // because /courses/:courseCode would swallow the paths as a course code.
  // ============================================
  {
    path: '/canonical/seeds',
    name: 'CanonicalSeeds',
    component: CanonicalSeeds,
    meta: { title: 'Canonical Seeds' }
  },
  {
    path: '/canonical/content',
    name: 'CanonicalContent',
    component: CanonicalContent,
    meta: { title: 'Canonical Content' }
  },
  {
    path: '/canonical/pods',
    name: 'PodsDoc',
    component: () => import('../views/PodsDoc.vue'),
    meta: { title: 'Listening Pods' }
  },
  // Script Lab (2026-08-30) — the canonical pod SCRIPTS with NO course loaded,
  // sitting on the shape metagraph. Tom: "I want a single place I can edit the
  // canonical scripts for the pods … then I can see how this script is actually
  // doing all the shapes it should as a walk through the graph." The
  // course-nested /production/:courseCode/pods/canonical/:slug route stays: this
  // is an extra door, not a replacement.
  {
    path: '/canonical/scripts',
    name: 'ScriptLab',
    component: () => import('../views/ScriptLabView.vue'),
    meta: { title: 'Script Lab' }
  },
  {
    path: '/canonical/scripts/:slug',
    name: 'ScriptLabScript',
    component: () => import('../views/ScriptLabScriptView.vue'),
    props: true,
    meta: { title: 'Script Lab' }
  },
  // The metagraph itself, with the pods as overlays through it (2026-08-31).
  // Tom: "what about popty.app being able to see the metagraph and the PODS as
  // overlays through it?" The Script Lab shows a script and reports coverage as
  // a number; this shows the GRAPH and lays a pod's walk over it, so the deficit
  // is a picture rather than a list. Read-only, no course, no new API.
  {
    path: '/canonical/metagraph',
    name: 'Metagraph',
    component: () => import('../views/MetagraphView.vue'),
    meta: { title: 'Metagraph' }
  },
  // Pod script viewer (2026-08-24) — fleet-wide, read-only. Tom: "I think I need
  // to be able to see them all." Deep-linkable per course so a URL can be sent.
  {
    path: '/pods/scripts',
    name: 'PodScripts',
    component: () => import('../views/PodScriptsView.vue'),
    meta: { title: 'Pod Scripts' }
  },
  {
    path: '/pods/scripts/:courseCode',
    name: 'PodScriptsCourse',
    component: () => import('../views/PodScriptsView.vue'),
    props: true,
    meta: { title: 'Pod Scripts' }
  },

  // The old /docs/* estate — every route redirects so nothing 404s.
  { path: '/docs', redirect: '/how' },
  { path: '/docs/pedagogy', redirect: '/how/pedagogy' },
  { path: '/docs/pod-thinking', redirect: '/how/pod-thinking' },
  { path: '/docs/pod-thinking/:slug', redirect: to => `/how/pod-thinking/${to.params.slug}` },
  { path: '/docs/apml', redirect: '/stocktake/apml' },
  { path: '/docs/terminology', redirect: '/stocktake/glossary' },
  { path: '/docs/pipeline', redirect: '/stocktake/pipeline' },
  { path: '/docs/intelligence', redirect: '/stocktake/pipeline' },
  { path: '/docs/seeds', redirect: '/canonical/seeds' },
  { path: '/docs/canonical', redirect: '/canonical/content' },
  { path: '/docs/pods', redirect: '/canonical/pods' },

  // ============================================
  // Course Management
  // ============================================
  {
    path: '/courses',
    name: 'CourseBrowser',
    component: CourseBrowser,
    meta: { title: 'Course Library' }
  },
  // ============================================
  // Course Manager (requires courseCode - new course creation is in Production Suite)
  // ============================================
  {
    path: '/course/:courseCode',
    name: 'CourseManager',
    component: () => import('../views/CourseManager.vue'),
    props: true,
    meta: { title: 'Course Manager' }
  },
  // Redirect legacy new course routes to streamlined Production Suite flow
  {
    path: '/course',
    redirect: '/production/new/text'
  },
  {
    path: '/courses/new',
    redirect: '/production/new/text'
  },
  {
    path: '/generate',
    redirect: to => {
      const query = to.query
      if (query.target && query.known) {
        return `/production/${query.target}_for_${query.known}/text`
      }
      return '/library'
    }
  },
  {
    // Legacy route - redirect to Production Suite text view
    path: '/generate/:courseCode/monitor',
    redirect: to => `/production/${to.params.courseCode}/text`
  },
  // Jobs Monitor - Mission Control for all active jobs across services
  {
    path: '/jobs',
    name: 'JobsMonitor',
    component: () => import('../views/JobsMonitor.vue'),
    meta: { title: 'Active Jobs - Mission Control' }
  },
  // Agent Swimlane Monitor - Mission Control style real-time agent tracking
  {
    path: '/monitor',
    name: 'AgentMonitor',
    component: () => import('../views/AgentMonitor.vue'),
    meta: { title: 'Agent Monitor' }
  },
  {
    path: '/monitor/:courseCode',
    name: 'AgentMonitorCourse',
    component: () => import('../views/AgentMonitor.vue'),
    props: true,
    meta: { title: 'Agent Monitor' }
  },
  // Network Builder - Real-time LEGO network construction
  {
    path: '/network-builder',
    name: 'NetworkBuilder',
    component: () => import('../views/NetworkBuilder.vue'),
    meta: { title: 'Network Builder' }
  },
  {
    path: '/validate',
    name: 'CourseValidator',
    component: CourseValidator,
    meta: { title: 'Course Validator' }
  },
  {
    path: '/validate/:courseCode',
    name: 'CourseValidatorDetail',
    component: CourseValidator,
    props: true,
    meta: { title: 'Course Validator' }
  },
  {
    path: '/courses/:courseCode',
    name: 'CourseEditor',
    component: CourseEditor,
    props: true
  },
  {
    // DEPRECATED: Old /courses/:code/pods path — redirect to /production
    path: '/courses/:courseCode/pods',
    redirect: to => `/production/${to.params.courseCode}/pods`
  },
  {
    path: '/courses/:courseCode/pods/:slug',
    redirect: to => `/production/${to.params.courseCode}/pods/${to.params.slug}`
  },
  {
    // DEPRECATED: Redirect to Production Suite script viewer
    path: '/courses/:courseCode/script',
    name: 'CourseScriptView',
    redirect: to => `/production/${to.params.courseCode}/script`
  },
  {
    path: '/courses/:code/progress',
    name: 'CourseProgress',
    component: CourseProgress,
    props: true,
    meta: { title: 'Course Progress' }
  },
  // The Copy area — every learner-facing copy surface, editable in place. Behind
  // the normal OTP gate: any Popty user can edit; every save is versioned in
  // htw_copy_versions and diffable against the frozen original.
  {
    path: '/copy',
    name: 'CopyIndex',
    component: () => import('../views/CopyIndex.vue'),
    meta: { title: 'Copy' }
  },
  {
    path: '/copy/:docId',
    name: 'CopyEditor',
    component: () => import('../views/CopyEditor.vue'),
    meta: { title: 'Copy' }
  },
  // Permanent alias: this link is already in an editor's inbox. Never remove it.
  {
    path: '/htw-copy',
    name: 'HtwCopyEditor',
    component: () => import('../views/CopyEditor.vue'),
    props: { doc: 'htw' },
    meta: { title: 'How This Works copy' }
  },
  {
    path: '/edit/introductions',
    name: 'IntroductionsEditor',
    component: IntroductionsViewer,
    meta: { title: 'Edit Introductions' }
  },
  {
    path: '/courses/:courseCode/compile',
    name: 'CourseCompilation',
    component: CourseCompilation,
    props: true,
    meta: { title: 'Course Compilation' }
  },
  {
    // DEPRECATED: Redirect to home (need to select course first)
    path: '/audio',
    name: 'AudioGeneration',
    redirect: '/'
  },
  {
    // DEPRECATED: Redirect to Production Suite audio pipeline
    path: '/courses/:courseCode/audio-pipeline',
    name: 'AudioPipelineView',
    redirect: to => `/production/${to.params.courseCode}/pipeline`
  },
  {
    // DEPRECATED name kept for legacy named pushes (MissionControl) — lands in
    // the Record Room now, carrying the course when one was passed. The bare
    // /record path itself is owned by RecordRoom below.
    path: '/record-studio/:courseCode?',
    name: 'RecordingStudio',
    redirect: to => `/record/${to.params.courseCode || ''}`
  },

  // DEPRECATED: standalone autocue had no courseCode, so it fetched
  // /api/production/null/recording-script and failed. Recording lives at
  // /production/:courseCode/recording — pick a course from Mission Control.
  {
    path: '/autocue',
    name: 'AutocueStudio',
    redirect: '/'
  },

  // Test packages for human testers (Tom, 2026-09-04): Popty is the surface for
  // delivering Android builds; iOS goes via TestFlight. The Popty login is the
  // whole gate — no roles, no allowlist, no download tokens. The APK itself
  // lives on public object storage, so nothing here carries a 22 MB payload.
  {
    path: '/builds',
    name: 'AppBuilds',
    component: () => import('../views/AppBuilds.vue'),
    meta: { title: 'Test builds', requiresAuth: true }
  },

  // ============================================
  // THE ONE RECORDIST SURFACE (Tom, 2026-08-14)
  // ============================================
  // Link-is-identity: whoever holds /r/:voiceId IS that voice. `public: true`
  // is doing two jobs deliberately — it exempts the route from the auth guard
  // (no login) AND from the recorder-confinement block below (which would
  // otherwise force-redirect role 'recorder' straight back to /record/:course),
  // and it also hides the app navbar (AppNavbar.isHidden), so the recordist
  // sees the line and nothing else. The queue is by LANGUAGE, never by course.
  {
    path: '/r/:voiceId',
    name: 'RecordistRoom',
    component: () => import('../views/RecordistRoom.vue'),
    props: true,
    meta: { title: 'Recording', public: true }
  },

  // ============================================
  // THE LOGIN DOOR ONTO THE BOOTH (Tom's ruling, 2026-09-02)
  // ============================================
  // This WAS a second recording page — a tap-a-row list of the signed-in
  // recordist's outstanding lines. Tom tested it against the booth and ruled the
  // booth is the recording experience ("the link to the second tool is way
  // better - so we will persist with that one"), so this path is no longer a
  // page at all: it is a RESOLVER. It asks GET /api/recording/mine which voice
  // this login is and redirects into /r/:voiceId. One destination, two ways in —
  // a link, or a login — instead of two competing surfaces.
  //
  // The path itself is kept so every bookmark, every Home hub card and the
  // recorder-confinement block below keep working. Not public: the whole point
  // is that the session says who you are (dashboard_users.voice_id ∪
  // language_recording_policy voices by email).
  {
    path: '/my-recording',
    name: 'MyRecording',
    component: () => import('../views/MyRecordingEntry.vue'),
    meta: { title: 'My lines to record', requiresAuth: true }
  },

  // Record Room — the OLD recording shell. Kept alive so nothing Aran already
  // holds 404s, but a link carrying ?podVoice= (every link the cast panel ever
  // produced) now lands on the one surface instead.
  {
    path: '/record/:courseCode?',
    name: 'RecordRoom',
    component: () => import('../views/RecordRoom.vue'),
    props: true,
    // The ?podVoice= redirect lives in the global guard below, NOT here: a
    // route-level beforeEnter runs AFTER beforeEach, so an anonymous Aran
    // opening the link he already holds would be sent to Login and never reach
    // the redirect at all.
    meta: { title: 'Record Room', requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { title: 'User Management', requiresAuth: true }
  },
  // Legacy redirects for /reference/* routes — retargeted at the new homes
  { path: '/reference/overview', redirect: '/stocktake/pipeline' },
  { path: '/reference/seeds', redirect: '/canonical/seeds' },
  { path: '/reference/canonical', redirect: '/canonical/content' },
  { path: '/reference/apml', redirect: '/stocktake/apml' },
  { path: '/reference/terminology', redirect: '/stocktake/glossary' },
  { path: '/reference/pedagogy', redirect: '/how/pedagogy' },
  { path: '/intelligence', redirect: '/stocktake/pipeline' },
  // DEPRECATED: Skills route - feature not in use
  // {
  //   path: '/skills',
  //   name: 'Skills',
  //   component: Skills,
  //   meta: { title: 'Skills Library' }
  // },

  // Quality Review Routes
  {
    path: '/quality/:courseCode',
    name: 'QualityDashboard',
    component: QualityDashboard,
    props: true,
    meta: { title: 'Quality Review Dashboard' }
  },
  {
    path: '/quality/:courseCode/seeds/:seedId',
    name: 'SeedQualityReview',
    component: SeedQualityReview,
    props: true,
    meta: { title: 'Seed Quality Review' }
  },
  {
    path: '/quality/:courseCode/evolution',
    name: 'PromptEvolutionView',
    component: PromptEvolutionView,
    props: true,
    meta: { title: 'Prompt Evolution' }
  },
  {
    path: '/quality/:courseCode/health',
    name: 'CourseHealthReport',
    component: CourseHealthReport,
    props: true,
    meta: { title: 'Course Health Report' }
  },
  {
    path: '/quality/:courseCode/learned-rules',
    name: 'LearnedRulesView',
    component: () => import('../components/quality/LearnedRulesView.vue'),
    props: true,
    meta: { title: 'Self-Learning Rules' }
  },

  // Recursive Up-Regulation
  {
    path: '/recursive-upregulation',
    name: 'RecursiveUpregulation',
    component: RecursiveUpregulation,
    meta: { title: 'Recursive Up-Regulation' }
  },

  // Production QA Tools - handled by nested routes under /production/:courseCode

  {
    path: '/edit/:courseCode',
    name: 'CourseEditorAlt',
    redirect: to => ({ name: 'CourseEditor', params: { courseCode: to.params.courseCode } })
  },

  // Auth Routes
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
  {
    path: '/auth/verify',
    name: 'AuthVerify',
    component: AuthVerify,
    meta: { public: true }
  },

  // ===========================================
  // THE LABS — /admin/labs, an index and the seven-plus surfaces under it.
  //
  // These used to live under /admin/configs, which made a category claim that
  // was wrong in both directions: Basket Lab is mounted readOnly and writes
  // nothing, and Capture A/B stores nothing and had no link anywhere in src/.
  // A lab is not a kind of config (Tom, 2026-09-01: "maybe we should just have
  // it as admin/labs? we have 7 labs now"), so the tree stops saying it is.
  // The index groups them by BLAST RADIUS — see views/admin/LabsIndex.vue.
  //
  // Route NAMES are unchanged on purpose: sectionTabs, tests and any
  // `router.push({ name })` keep working across the move, and only the paths
  // are new. Every old /admin/configs* path redirects below, so no bookmark
  // breaks.
  {
    path: '/admin/labs',
    name: 'LabsIndex',
    component: () => import('../views/admin/LabsIndex.vue'),
    meta: { title: 'Labs - Admin' }
  },
  {
    path: '/admin/labs/listening',
    name: 'ListeningConfig',
    component: () => import('../views/ListeningConfig.vue'),
    meta: { title: 'Listening Lab - Admin' }
  },
  {
    path: '/admin/labs/speaking',
    name: 'SpeakingConfig',
    component: () => import('../views/admin/SpeakingConfig.vue'),
    meta: { title: 'Speaking Lab - Admin' }
  },
  {
    path: '/admin/labs/pods',
    name: 'PodLab',
    component: () => import('../views/admin/PodLab.vue'),
    meta: { title: 'Pod Lab - Admin' }
  },
  {
    path: '/admin/labs/voice',
    name: 'VoiceLab',
    component: () => import('../views/admin/VoiceLab.vue'),
    meta: { title: 'Voice Lab - Admin' }
  },
  {
    path: '/admin/labs/vad',
    name: 'VadLab',
    component: () => import('../views/admin/VadLab.vue'),
    meta: { title: 'VAD Lab - Admin' }
  },
  {
    path: '/admin/labs/basket',
    name: 'BasketLab',
    component: () => import('../views/admin/BasketLab.vue'),
    meta: { title: 'Basket Lab - Admin' }
  },
  {
    // Capture A/B — record the same line under each mic profile and measure
    // both, on the phone that actually does the recording. It joins the labs
    // here because it IS one; before this it was linked from nowhere in src/.
    path: '/admin/labs/capture-ab',
    name: 'CaptureAB',
    component: () => import('../views/admin/CaptureAB.vue'),
    meta: { title: 'Capture A/B - Admin' }
  },
  // Legacy paths. Bookmarks, the six months of links in reports and chats, and
  // the e2e specs all keep working — a redirect costs one line and breaking a
  // path someone saved costs their afternoon. Table + rationale:
  // ./legacyLabRedirects.js, which a test asserts against the live lab list.
  ...LEGACY_LAB_REDIRECTS,
  // (Stage 0 Tuner retired 2026-06-24 — absorbed into the Listening config,
  // which now sets Stage 0 structurally AND previews the full arc. The
  // standalone public/stage0-tuner.html iframe tool is gone.)
  // Production Suite v2.1 Routes (Default)
  // ===========================================
  {
    path: '/production',
    redirect: '/'
  },
  {
    path: '/production/courses',
    redirect: '/'
  },
  {
    // Courseless entry to the listening pass: "a sample of ANY course's audio"
    // shouldn't require already being inside a course. Renders the course
    // picker, or jumps straight to the remembered course.
    path: '/audio-preview',
    name: 'AudioPreviewEntry',
    component: () => import('../views/production/AudioPreview.vue'),
    meta: { title: 'Audio Preview' }
  },
  {
    // The approval gate across the whole estate (Part 4). Not per-course, so
    // it sits outside ProductionLayout: this is the view the retrofit of the
    // already-published courses is prioritised from.
    path: '/qa-gate',
    name: 'QAGateEstate',
    component: () => import('../views/production/QAGateEstate.vue'),
    meta: { title: 'Approval Gate - Estate' }
  },
  {
    // Diagnostic listening artefact (2026-08-06): German seed-1 clips played at
    // the original speed, the belt ramp alone, and the ramp × course global —
    // so the beginner speed can be ruled on by ear. Read-only, public S3 clips,
    // no login so it opens straight on a phone.
    path: '/german-speed-check',
    name: 'GermanSpeedCheck',
    component: () => import('../views/production/GermanSpeedCheck.vue'),
    meta: { title: 'German seed-1 speed A/B', public: true }

  },
  // Nested routes under ProductionLayout - keeps layout mounted while switching tabs
  {
    path: '/production/:courseCode',
    component: () => import('../views/production/ProductionLayout.vue'),
    props: true,
    children: [
      {
        path: '',
        name: 'ProductionDashboard',
        component: () => import('../views/production/ProductionOverview.vue'),
        props: true,
        meta: { title: 'Overview - Production Suite' }
      },
      {
        // Guided leader's journey — plain-language step-by-step shell over the
        // existing flows (translate → decompose → verify → record → synthesize → QA → publish)
        path: 'journey',
        name: 'LeaderJourney',
        component: () => import('../views/production/LeaderJourney.vue'),
        props: true,
        meta: { title: 'Course Journey - Production Suite' }
      },
      {
        // Synthesis Studio — drives the voice-engine's synthesize/status/
        // cancel/coverage endpoints; sibling of journey/team/recording-optimizer.
        path: 'synthesis',
        name: 'SynthesisStudio',
        component: () => import('../views/production/SynthesisStudio.vue'),
        props: true,
        meta: { title: 'Build the Audio - Production Suite' }
      },
      {
        path: 'seeds',
        name: 'SeedEditor',
        component: () => import('../views/production/SeedEditor.vue'),
        props: true,
        meta: { title: 'Seed Editor - Production Suite' }
      },
      {
        path: 'text',
        name: 'TextGeneration',
        component: () => import('../views/production/TextGeneration.vue'),
        props: true,
        meta: { title: 'Text Generation - Production Suite' }
      },
      {
        // The manual approval gate for this course: the round-by-round
        // play-through worklist, sign-off, and who is listening to what.
        path: 'qa-gate',
        name: 'CourseQAGate',
        component: () => import('../views/production/CourseQAGate.vue'),
        props: true,
        meta: { title: 'Approval Gate - Production Suite' }
      },
      {
        path: 'phrase-qa',
        name: 'PhraseQA',
        component: () => import('../views/production/PhraseQA.vue'),
        props: true,
        meta: { title: 'Phrase QA - Production Suite' }
      },
      {
        path: 'pipeline',
        name: 'AudioPipelineProduction',
        component: AudioPipeline,
        props: true,
        meta: { title: 'Audio Pipeline - Production Suite' }
      },
      {
        path: 'recording',
        name: 'AutocueStudioCourse',
        component: () => import('../components/production/autocue/AutocueStudio.vue'),
        props: true,
        meta: { title: 'Recording - Production Suite' }
      },
      {
        path: 'qa',
        name: 'SamplesBrowser', // Legacy name - redirects to ScriptViewer
        redirect: to => ({
          name: 'ScriptViewer',
          params: { courseCode: to.params.courseCode },
          query: { filter: 'flagged' }
        })
      },
      {
        path: 'script',
        name: 'ScriptViewer',
        component: ScriptViewer,
        props: true,
        meta: { title: 'Script Viewer - Production Suite' }
      },
      {
        // DEPRECATED: RecordingStudio V2's uploads always 400 (wrong body shape).
        // Name kept so existing router.push({ name: 'RecordingStudioProduction' })
        // calls resolve, then land on the working Autocue recorder.
        path: 'recording-studio',
        name: 'RecordingStudioProduction',
        redirect: to => `/production/${to.params.courseCode}/recording`
      },
      {
        path: 'feedback',
        name: 'UserFeedback',
        component: UserFeedback,
        props: true,
        meta: { title: 'User Feedback - Production Suite' }
      },
      {
        path: 'recording-optimizer',
        name: 'RecordingOptimizer',
        component: () => import('../views/RecordingOptimizer.vue'),
        props: true,
        meta: { title: 'Recording Optimizer - Production Suite' }
      },
      {
        path: 'team',
        name: 'TeamRoster',
        component: () => import('../views/production/TeamRoster.vue'),
        props: true,
        meta: { title: 'Team - Production Suite' }
      },
      {
        path: 'calibration-review',
        name: 'CalibrationReview',
        component: () => import('../views/production/CalibrationReview.vue'),
        props: true,
        meta: { title: 'Calibration Review - Production Suite' }
      },
      {
        path: 'qa-review',
        name: 'QAReview',
        component: () => import('../views/production/QAReview.vue'),
        props: true,
        meta: { title: 'QA Review - Production Suite' }
      },
      {
        // The human listening pass over rendered clips. Read-only; the
        // courseless entry point is /audio-preview (below), which remembers
        // the last course and routes on here.
        path: 'audio-preview',
        name: 'AudioPreview',
        component: () => import('../views/production/AudioPreview.vue'),
        props: true,
        meta: { title: 'Audio Preview - Production Suite' }
      },
      {
        path: 'pods',
        name: 'Pods',
        component: () => import('../views/PodsView.vue'),
        props: true,
        meta: { title: 'Listening Pods - Production Suite' }
      },
      {
        path: 'pods/:slug',
        name: 'PodDetail',
        component: () => import('../views/PodDetailView.vue'),
        props: true,
        meta: { title: 'Pod Detail - Production Suite' }
      },
      {
        path: 'canonical/:slug',
        name: 'CanonicalPod',
        component: () => import('../views/CanonicalPodView.vue'),
        props: true,
        meta: { title: 'Canonical Scenarios - Production Suite' }
      }
    ]
  },
  // Legacy route redirect
  {
    path: '/recording-optimizer/:courseCode',
    redirect: to => `/production/${to.params.courseCode}/recording-optimizer`
  },

  // Catch-all route
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Auth guard + page title
router.beforeEach(async (to, from, next) => {
  document.title = to.meta.title
    ? `${to.meta.title} - Popty`
    : 'Popty v14.0.0 - SSi Course Production Dashboard'

  // Every record link ever sent carried ?podVoice= — those are Aran's and
  // Catrin's bookmarks, and they now land on the one recordist surface. This
  // runs BEFORE the auth check on purpose: the whole point of the new surface
  // is that holding the link is enough, so sending its old shape to Login
  // first would break exactly the people it exists for.
  if (to.name === 'RecordRoom' && to.query.podVoice) {
    const v = to.query.podVoice
    const voiceId = Array.isArray(v) ? v[0] : v
    if (voiceId) return next({ name: 'RecordistRoom', params: { voiceId }, replace: true })
  }

  // Public routes (login, auth verify) don't need auth
  if (to.meta.public) return next()

  const { isAuthenticated, initAuth, isRecorder, isAdmin, learner, canAccessCourse } = useAuth()

  // Initialize auth if not already done (first page load)
  await initAuth()

  // OTP is the gate. If you have a session, you're in.
  if (!isAuthenticated.value) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  // Recorders are confined to their Record Room — never the admin console.
  // This block runs BEFORE the generic course-scope check and returns early:
  // a recorder must bounce to /record/..., never to the course list.
  if (isRecorder.value) {
    const courses = learner.value?.courses
    const courseList = Array.isArray(courses) ? courses : []
    const firstCourse = courseList[0] || null
    // A recordist who signs in wants ONE thing: the lines they still owe. They
    // land on /my-recording, which is now a resolver, not a page — it looks the
    // login up and sends them straight into the booth at /r/:voiceId. The booth
    // is `public: true` and this whole block is skipped for it, so a confined
    // recorder reaches it and stays there. The old per-course Record Room is
    // still reachable and still theirs — it is simply no longer the answer to
    // "what do I record next?".
    const homeRoom = { name: 'MyRecording' }

    if (to.name === 'MyRecording') return next()

    // …with one exception: the test-build page is for everyone with a Popty
    // login, and the recordists are exactly the people we hand test APKs to.
    if (to.name !== 'RecordRoom' && to.name !== 'AppBuilds') {
      return next(homeRoom)
    }

    // Inside the room: only their own assigned course(s)
    const recorderCourse = to.params.courseCode
    if (recorderCourse && !canAccessCourse(recorderCourse)) {
      return next(homeRoom)
    }

    // Landed at /record with no course but exactly one assigned — take them straight in
    if (!recorderCourse && courseList.length === 1) {
      return next(`/record/${firstCourse}`)
    }

    return next()
  }

  // Single-course editors land straight in that course's guided journey
  // instead of the Home hub — the console (ProductionOverview et al.) stays
  // one tap away, this only changes the post-login default destination.
  // Multi-course editors and admins keep the Home hub (they need the picker).
  if (!isAdmin.value && to.name === 'Home') {
    const courses = learner.value?.courses
    const courseList = Array.isArray(courses) ? courses : []
    if (courseList.length === 1) {
      return next(`/production/${courseList[0]}/journey`)
    }
  }

  // Course scoping: a course-scoped route needs membership of THAT course
  // (admin → all; others → '*' or list membership — canAccessCourse handles
  // both). URL-hopping into an unassigned course bounces to the course list.
  const courseCode = to.params.courseCode || to.params.code
  if (courseCode && !canAccessCourse(courseCode)) {
    console.warn(`[Router] No access to course ${courseCode} — redirecting to course list`)
    return next({ name: 'CourseBrowser' })
  }

  next()
})

export default router
