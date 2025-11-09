import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TrainingPhase from '../views/TrainingPhase.vue'
import ProcessOverview from '../views/ProcessOverview.vue'
import CanonicalSeeds from '../views/CanonicalSeeds.vue'
import APMLSpec from '../views/APMLSpec.vue'
import CourseGeneration from '../views/CourseGeneration.vue'
import CourseBrowser from '../views/CourseBrowser.vue'
import CourseEditor from '../views/CourseEditor.vue'
import CourseCompilation from '../views/CourseCompilation.vue'
import TerminologyGlossary from '../views/TerminologyGlossary.vue'
import Pedagogy from '../views/Pedagogy.vue'
import RecursiveUpregulation from '../views/RecursiveUpregulation.vue'
import PhaseIntelligence from '../views/PhaseIntelligence.vue'
import Skills from '../views/Skills.vue'

// Quality Review Components
import QualityDashboard from '../components/quality/QualityDashboard.vue'
import SeedQualityReview from '../components/quality/SeedQualityReview.vue'
import PromptEvolutionView from '../components/quality/PromptEvolutionView.vue'
import CourseHealthReport from '../components/quality/CourseHealthReport.vue'


const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/generate',
    name: 'CourseGeneration',
    component: CourseGeneration
  },
  {
    path: '/courses',
    name: 'CourseBrowser',
    component: CourseBrowser
  },
  {
    path: '/courses/:courseCode',
    name: 'CourseEditor',
    component: CourseEditor,
    props: true
  },
  {
    path: '/courses/:courseCode/compile',
    name: 'CourseCompilation',
    component: CourseCompilation,
    props: true,
    meta: { title: 'Course Compilation' }
  },
  {
    path: '/phase/:id',
    name: 'TrainingPhase',
    component: TrainingPhase,
    props: true
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
  {
    path: '/skills',
    name: 'Skills',
    component: Skills,
    meta: { title: 'Skills Library' }
  },

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

  {
    path: '/edit/:courseCode',
    name: 'CourseEditorAlt',
    redirect: to => ({ name: 'CourseEditor', params: { courseCode: to.params.courseCode } })
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

// Set page title based on route meta
router.beforeEach((to, from, next) => {
  document.title = to.meta.title
    ? `${to.meta.title} - SSi Dashboard`
    : 'SSi Course Production Dashboard v8.0.0'
  next()
})

export default router
