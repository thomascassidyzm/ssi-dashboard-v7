import { createRouter, createWebHistory } from 'vue-router'
import MissionControlHub from '../views/MissionControl.vue'
import ProcessOverview from '../views/ProcessOverview.vue'
import CanonicalSeeds from '../views/CanonicalSeeds.vue'
import CanonicalContent from '../views/CanonicalContent.vue'
import APMLSpec from '../views/APMLSpec.vue'
import CourseGeneration from '../views/CourseGeneration.vue'
import CourseBrowser from '../views/CourseBrowser.vue'
import CourseEditor from '../views/CourseEditor.vue'
import CourseCompilation from '../views/CourseCompilation.vue'
// DEPRECATED: AudioGeneration - use /production/:courseCode/pipeline (AudioPipeline) instead
// import AudioGeneration from '../views/AudioGeneration.vue'
// DEPRECATED: AudioPipelineView - use /production/:courseCode/pipeline instead
// import AudioPipelineView from '../views/AudioPipelineView.vue'
import TerminologyGlossary from '../views/TerminologyGlossary.vue'
import Pedagogy from '../views/Pedagogy.vue'
import RecursiveUpregulation from '../views/RecursiveUpregulation.vue'
import PhaseIntelligence from '../views/PhaseIntelligence.vue'

// Documentation Layout (v14 nested navigation)
import DocsLayout from '../views/docs/DocsLayout.vue'
import CourseValidator from '../views/CourseValidator.vue'
import CourseProgress from '../views/CourseProgress.vue'
// DEPRECATED: RecordingStudio - use /autocue (AutocueStudio) instead
// import RecordingStudio from '../views/RecordingStudio.vue'
import UserManagement from '../views/UserManagement.vue'
// DEPRECATED: CourseScriptView - use /production/:courseCode/script (ScriptViewer) instead
// import CourseScriptView from '../views/CourseScriptView.vue'

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
const MissionControl = () => import('../views/production/MissionControl.vue')
const ScriptViewer = () => import('../views/production/ScriptViewer.vue')
const AudioPipeline = () => import('../views/production/AudioPipeline.vue')
const RecordingStudioV2 = () => import('../views/production/RecordingStudio.vue')
const UserFeedback = () => import('../views/production/UserFeedback.vue')

// Note: SamplesBrowser removed - QA now uses ScriptViewer with filter=flagged


const routes = [
  // ============================================
  // Mission Control Hub - Main Entry Point
  // ============================================
  {
    path: '/',
    name: 'MissionControl',
    component: MissionControlHub,
    meta: { title: 'Mission Control' }
  },
  // ============================================
  // Documentation Section (nested routes with shared layout)
  // ============================================
  {
    path: '/docs',
    component: DocsLayout,
    children: [
      {
        path: '',
        name: 'DocsIndex',
        component: () => import('../views/DocsIndex.vue'),
        meta: { title: 'Documentation' }
      },
      {
        path: 'apml',
        name: 'APMLSpec',
        component: APMLSpec,
        meta: { title: 'APML Specification' }
      },
      {
        path: 'pedagogy',
        name: 'Pedagogy',
        component: Pedagogy,
        meta: { title: 'Pedagogical Model' }
      },
      {
        path: 'terminology',
        name: 'TerminologyGlossary',
        component: TerminologyGlossary,
        meta: { title: 'Terminology Glossary' }
      },
      {
        path: 'seeds',
        name: 'CanonicalSeeds',
        component: CanonicalSeeds,
        meta: { title: 'Canonical Seeds' }
      },
      {
        path: 'canonical',
        name: 'CanonicalContent',
        component: CanonicalContent,
        meta: { title: 'Canonical Content' }
      },
      {
        path: 'pipeline',
        name: 'ProcessOverview',
        component: ProcessOverview,
        meta: { title: 'Pipeline Overview' }
      },
      {
        path: 'intelligence',
        name: 'PhaseIntelligence',
        component: PhaseIntelligence,
        meta: { title: 'Phase Intelligence' }
      }
    ]
  },

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
    // DEPRECATED: Redirect to Autocue Studio
    path: '/record',
    name: 'RecordingStudio',
    redirect: '/autocue'
  },

  // Autocue Recording System (standalone entry point - course-specific handled by nested routes)
  {
    path: '/autocue',
    name: 'AutocueStudio',
    component: () => import('../components/production/autocue/AutocueStudio.vue'),
    meta: { title: 'Autocue Studio', requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { title: 'User Management', requiresAuth: true, requiresAdmin: true }
  },
  // Legacy redirects for /reference/* routes → /docs/*
  { path: '/reference/overview', redirect: '/docs/pipeline' },
  { path: '/reference/seeds', redirect: '/docs/seeds' },
  { path: '/reference/canonical', redirect: '/docs/canonical' },
  { path: '/reference/apml', redirect: '/docs/apml' },
  { path: '/reference/terminology', redirect: '/docs/terminology' },
  { path: '/reference/pedagogy', redirect: '/docs/pedagogy' },
  { path: '/intelligence', redirect: '/docs/intelligence' },
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
        path: 'recording-studio',
        name: 'RecordingStudioProduction',
        component: RecordingStudioV2,
        props: true,
        meta: { title: 'Recording Studio - Production Suite' }
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

// Page title only - auth disabled for now
router.beforeEach((to, from, next) => {
  document.title = to.meta.title
    ? `${to.meta.title} - Popty`
    : 'Popty v14.0.0 - SSi Course Production Dashboard'
  next()
})

export default router
