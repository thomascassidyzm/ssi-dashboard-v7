<!--
  Forward-compiled from APML interface Dashboard
  Generated: 2025-12-05

  APML Source:
  interface Dashboard:
    route: "/"
    layout: full_screen
    ...
-->

<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-emerald-400">
              Popty v10.0.0
            </h1>
            <p class="mt-2 text-slate-400">
              SSi Course Production Dashboard
            </p>
          </div>
          <div class="flex items-center gap-6">
            <EnvironmentSwitcher />
            <div class="flex items-center gap-4">
              <span class="text-slate-400 text-sm">{{ user?.name || user?.email }}</span>
              <button @click="handleLogout" class="text-slate-500 hover:text-slate-300 text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- User Workflow Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">User Workflow</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Generate New Course -->
          <router-link
            to="/generate"
            class="block bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg border border-emerald-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/20"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-white mb-2">Generate New Course</h3>
                <p class="text-emerald-100 text-sm">
                  Start the linear pipeline to generate a new language course
                </p>
              </div>
            </div>
          </router-link>

          <!-- Browse Courses -->
          <router-link
            to="/courses"
            class="block bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-500/30 rounded-lg p-8 transition hover:-translate-y-1 shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-emerald-400 mb-2">Browse & Compile Courses</h3>
                <p class="text-slate-300 text-sm">
                  View, edit, compile courses and generate audio
                </p>
              </div>
            </div>
          </router-link>

          <!-- Recording Studio -->
          <router-link
            to="/record"
            class="block bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-lg border border-red-400/20 p-8 transition hover:-translate-y-1 shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-white mb-2">Recording Studio</h3>
                <p class="text-red-100 text-sm">
                  Record human voice samples for phrases
                </p>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Pipeline Architecture Section -->
      <section class="mt-12">
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Pipeline Architecture</h2>
          <div class="flex items-center justify-center gap-2 overflow-x-auto pb-4">
            <PhaseBox phase="1" title="Translation + LEGO Extraction" color="blue" />
            <PhaseArrow />
            <PhaseBox phase="2" title="Conflict Resolution" color="purple" />
            <PhaseArrow />
            <PhaseBox phase="3" title="Basket Generation" color="pink" />
            <PhaseArrow />
            <PhaseBox phase="Manifest" title="Course Compilation" color="teal" />
            <PhaseArrow />
            <PhaseBox phase="Audio" title="TTS Generation" color="emerald" />
          </div>
        </div>
      </section>

      <!-- Reference Materials Section -->
      <section>
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-2">Reference Materials</h2>
          <div class="space-y-4">
            <ReferenceLink
              v-for="link in referenceLinks"
              :key="link.route"
              :to="link.route"
              :icon="link.icon"
              :title="link.title"
              :description="link.description"
            />
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'
import PhaseBox from '../components/PhaseBox.vue'
import PhaseArrow from '../components/PhaseArrow.vue'
import ReferenceLink from '../components/ReferenceLink.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, logout } = useAuth()

const referenceLinks = [
  { route: '/reference/overview', icon: 'book', title: 'Complete Process Overview', description: 'Comprehensive documentation' },
  { route: '/intelligence', icon: 'brain', title: 'Phase Intelligence Modules', description: 'Live methodology' },
  { route: '/reference/canonical', icon: 'seed', title: 'Canonical Content', description: '668 canonical seeds' },
  { route: '/reference/apml', icon: 'spec', title: 'APML Specification', description: 'Complete architecture' },
  { route: '/reference/terminology', icon: 'glossary', title: 'Terminology Glossary', description: 'Single source of truth' },
  { route: '/reference/pedagogy', icon: 'graduate', title: 'Pedagogical Model', description: 'The why behind SSi' },
]

function handleLogout() {
  logout()
  router.push('/login')
}
</script>
