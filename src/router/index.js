import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TrainingPhase from '../views/TrainingPhase.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/phase/:id',
    name: 'TrainingPhase',
    component: TrainingPhase,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
