import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TrainingPhase from '../views/TrainingPhase.vue'
import ProcessOverview from '../views/ProcessOverview.vue'
import CanonicalSeeds from '../views/CanonicalSeeds.vue'
import APMLSpec from '../views/APMLSpec.vue'
import CourseGeneration from '../views/CourseGeneration.vue'
import CourseBrowser from '../views/CourseBrowser.vue'
import CourseEditor from '../views/CourseEditor.vue'
import TerminologyGlossary from '../views/TerminologyGlossary.vue'

// Quality Review Components
import QualityDashboard from '../components/quality/QualityDashboard.vue'
import SeedQualityReview from '../components/quality/SeedQualityReview.vue'
import PromptEvolutionView from '../components/quality/PromptEvolutionView.vue'
import CourseHealthReport from '../components/quality/CourseHealthReport.vue'

// Visualization Components
import LegoVisualizerExample from '../components/LegoVisualizerExample.vue'
import SeedVisualizerDemo from '../views/SeedVisualizerDemo.vue'
import BasketVisualizerView from '../views/BasketVisualizerView.vue'

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

  // Visualization Routes
  {
    path: '/visualize/lego',
    name: 'LegoVisualizerDemo',
    component: LegoVisualizerExample,
    meta: { title: 'LEGO Visualizer Demo' }
  },
  {
    path: '/visualize/lego/:courseCode',
    name: 'LegoVisualizer',
    component: LegoVisualizerExample,
    props: true,
    meta: { title: 'LEGO Visualizer' }
  },
  {
    path: '/visualize/seed',
    name: 'SeedVisualizerDemo',
    component: SeedVisualizerDemo,
    meta: { title: 'Seed Visualizer Demo' }
  },
  {
    path: '/visualize/seed/:translationUuid',
    name: 'SeedVisualizer',
    component: SeedVisualizerDemo,
    props: true,
    meta: { title: 'Seed Visualizer' }
  },
  {
    path: '/visualize/basket',
    name: 'BasketVisualizerDemo',
    component: BasketVisualizerView,
    meta: { title: 'Basket Visualizer Demo' }
  },
  {
    path: '/visualize/basket/:courseCode',
    name: 'BasketVisualizer',
    component: BasketVisualizerView,
    props: true,
    meta: { title: 'Basket Visualizer' }
  },
  {
    path: '/visualize/phrases/:courseCode',
    name: 'PhraseVisualizer',
    component: () => import('../components/PhraseVisualizer.vue'),
    props: true,
    meta: { title: 'Phrase Visualizer' }
  },
  {
    path: '/visualize/seed-lego/:courseCode?',
    name: 'SeedLegoVisualizer',
    component: () => import('../components/SeedLegoVisualizer.vue'),
    props: true,
    meta: { title: 'SEED → LEGO Breakdown' }
  },
  {
    path: '/visualize/lego-basket/:courseCode?',
    name: 'LegoBasketVisualizer',
    component: () => import('../components/LegoBasketVisualizer.vue'),
    props: true,
    meta: { title: 'LEGO Basket Practice Phrases' }
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
    : 'SSi Course Production Dashboard v7.0'
  next()
})

export default router
