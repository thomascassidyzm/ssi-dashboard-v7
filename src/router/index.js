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

// Production Suite components
import SamplesBrowser from '../components/production/qa/SamplesBrowser.vue'
// Note: Legacy v1 components have been deprecated and removed


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
  {
    path: '/docs',
    name: 'DocsIndex',
    component: () => import('../views/DocsIndex.vue'),
    meta: { title: 'Documentation' }
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
  // Course Manager (Unified - replaces NewCourse, CourseGeneration, GenerationMonitor)
  // ============================================
  {
    path: '/course/:courseCode?',
    name: 'CourseManager',
    component: () => import('../views/CourseManager.vue'),
    props: true,
    meta: { title: 'Course Manager' }
  },
  // Redirects from deprecated routes
  {
    path: '/courses/new',
    redirect: '/course'
  },
  {
    path: '/generate',
    redirect: to => {
      const query = to.query
      if (query.target && query.known) {
        return `/course/${query.target}_for_${query.known}`
      }
      return '/course'
    }
  },
  {
    // Legacy route - redirect to new unified course page
    path: '/generate/:courseCode/monitor',
    redirect: to => `/course/${to.params.courseCode}`
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
    // DEPRECATED: Redirect to Production Suite (need to select course first)
    path: '/audio',
    name: 'AudioGeneration',
    redirect: '/production/courses'
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

  // Autocue Recording System (Two-Mode Teleprompter)
  {
    path: '/autocue',
    name: 'AutocueStudio',
    component: () => import('../components/production/autocue/AutocueStudio.vue'),
    meta: { title: 'Autocue Studio', requiresAuth: true }
  },
  {
    path: '/production/:courseCode/recording',
    name: 'AutocueStudioCourse',
    component: () => import('../components/production/autocue/AutocueStudio.vue'),
    props: true,
    meta: { title: 'Autocue Studio', requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { title: 'User Management', requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/reference/overview',
    name: 'ProcessOverview',
    component: ProcessOverview
  },
  {
    path: '/reference/seeds',
    name: 'CanonicalSeeds',
    component: CanonicalSeeds
  },
  {
    path: '/reference/canonical',
    name: 'CanonicalContent',
    component: CanonicalContent,
    meta: { title: 'Canonical Content' }
  },
  {
    path: '/reference/apml',
    name: 'APMLSpec',
    component: APMLSpec
  },
  {
    path: '/reference/terminology',
    name: 'TerminologyGlossary',
    component: TerminologyGlossary,
    meta: { title: 'Terminology Glossary' }
  },
  {
    path: '/reference/pedagogy',
    name: 'Pedagogy',
    component: Pedagogy,
    meta: { title: 'Pedagogical Model' }
  },
  {
    path: '/intelligence',
    name: 'PhaseIntelligence',
    component: PhaseIntelligence,
    meta: { title: 'Phase Intelligence' }
  },
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

  // Production QA Tools
  {
    // QA Browser - primary samples review interface
    path: '/production/:courseCode/samples',
    name: 'SamplesBrowser',
    component: SamplesBrowser,
    props: true,
    meta: { title: 'Samples Browser' }
  },
  {
    // DEPRECATED: Redirect /qa to /samples
    path: '/production/:courseCode/qa',
    name: 'ProductionQA',
    redirect: to => `/production/${to.params.courseCode}/samples`
  },

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
    name: 'ProductionHome',
    redirect: '/production/courses'
  },
  {
    path: '/production/courses',
    name: 'ProductionCourses',
    component: () => import('@/components/production/CourseSelector.vue'),
    meta: { title: 'Course Selection - Production Suite' }
  },
  {
    path: '/production/:courseCode',
    name: 'ProductionDashboard',
    component: MissionControl,
    props: true,
    meta: { title: 'Production Suite' }
  },
  {
    path: '/production/:courseCode/script',
    name: 'ScriptViewer',
    component: ScriptViewer,
    props: true,
    meta: { title: 'Script Viewer - Production Suite' }
  },
  {
    path: '/production/:courseCode/pipeline',
    name: 'AudioPipelineProduction',
    component: AudioPipeline,
    props: true,
    meta: { title: 'Audio Pipeline - Production Suite' }
  },
  {
    path: '/production/:courseCode/recording-studio',
    name: 'RecordingStudioProduction',
    component: RecordingStudioV2,
    props: true,
    meta: { title: 'Recording Studio - Production Suite' }
  },
  {
    path: '/production/:courseCode/feedback',
    name: 'UserFeedback',
    component: UserFeedback,
    props: true,
    meta: { title: 'User Feedback - Production Suite' }
  },

  // ===========================================
  // Recording Optimizer (Human Recording for non-TTS languages)
  // ===========================================
  {
    path: '/production/:courseCode/recording-optimizer',
    name: 'RecordingOptimizer',
    component: () => import('../views/RecordingOptimizer.vue'),
    props: true,
    meta: { title: 'Recording Optimizer - Production Suite' }
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
    : 'Popty v8.2.2 - SSi Course Production Dashboard'
  next()
})

export default router
