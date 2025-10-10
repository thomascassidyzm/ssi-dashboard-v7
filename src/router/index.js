import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TrainingPhase from '../views/TrainingPhase.vue'
import ProcessOverview from '../views/ProcessOverview.vue'
import CanonicalSeeds from '../views/CanonicalSeeds.vue'
import APMLSpec from '../views/APMLSpec.vue'
import CourseGeneration from '../views/CourseGeneration.vue'
import CourseBrowser from '../views/CourseBrowser.vue'
import CourseEditor from '../views/CourseEditor.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
