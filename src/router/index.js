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
  // Monthly board reports — admin-gated (default auth, same as every
  // non-public route above). Interim: manual registry until the living
  // auto-generated board report is built.
  {
    path: '/admin/board',
    name: 'BoardReports',
    component: () => import('../views/BoardReports.vue'),
    meta: { title: 'Board Reports - Admin' }
  },
  {
    path: '/admin/board/:slug',
    name: 'BoardReportDetail',
    component: () => import('../views/BoardReportDetail.vue'),
    meta: { title: 'Board Report - Admin' }
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

  // Record Room — minimal recording shell for voice helpers (role 'recorder').
  // A recorder is confined here by the router guard; editors/admins can use it too.
  // courseCode is optional so an unassigned recorder still has somewhere to land.
  {
    path: '/record/:courseCode?',
    name: 'RecordRoom',
    component: () => import('../views/RecordRoom.vue'),
    props: true,
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
  // Global admin — algorithm_config tweaker. Lives outside /production
  // because it's not per-course. Split by domain under /admin/configs:
  // an index hub, then Listening + Speaking surfaces.
  {
    path: '/admin/configs',
    name: 'ConfigsIndex',
    component: () => import('../views/admin/ConfigsIndex.vue'),
    meta: { title: 'Configs - Admin' }
  },
  {
    path: '/admin/configs/listening',
    name: 'ListeningConfig',
    component: () => import('../views/ListeningConfig.vue'),
    meta: { title: 'Listening Config - Admin' }
  },
  {
    path: '/admin/configs/speaking',
    name: 'SpeakingConfig',
    component: () => import('../views/admin/SpeakingConfig.vue'),
    meta: { title: 'Speaking Config - Admin' }
  },
  {
    path: '/admin/configs/pods',
    name: 'PodLab',
    component: () => import('../views/admin/PodLab.vue'),
    meta: { title: 'Pod Lab - Admin' }
  },
  {
    path: '/admin/configs/vad',
    name: 'VadLab',
    component: () => import('../views/admin/VadLab.vue'),
    meta: { title: 'VAD Lab - Admin' }
  },
  // Legacy path — the old single Listening page lived here. Redirect bookmarks.
  { path: '/admin/listening', redirect: '/admin/configs/listening' },
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
    // One course → straight into that room. Several (Catrin records North
    // AND South) → the bare Record Room renders the room picker.
    const homeRoom = courseList.length === 1 ? `/record/${firstCourse}` : { name: 'RecordRoom' }

    if (to.name !== 'RecordRoom') {
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
