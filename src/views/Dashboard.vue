<template>
  <div class="min-h-screen bg-canvas">
    <!-- Header -->
    <header class="bg-surface/50 border-b border-line/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-accent-2">
              Popty v14
            </h1>
            <p class="mt-2 text-muted">
              SSi Course Production Dashboard
            </p>
            <p class="mt-1 text-xs text-faint">
              APML v14 | Course Builder → Phase 8 (Audio) → Phase 9 (Manifest)
            </p>
          </div>
          <div class="flex items-center gap-6">
            <SchemaHealth />
            <EnvironmentSwitcher />
            <div class="flex items-center gap-4">
              <span class="text-muted text-sm">{{ user?.name || user?.email }}</span>
              <button @click="handleLogout" class="text-faint hover:text-ink text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- User Workflow -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-accent-2 mb-6">User Workflow</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Create/Manage Course -->
          <router-link to="/course" class="color-card block bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg border border-emerald-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-ink mb-2">Course Manager</h3>
                <p class="text-emerald-100 text-sm">
                  Create new courses or manage existing ones through the Course Builder pipeline
                </p>
              </div>
              <div class="text-ink">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Browse Existing Courses -->
          <router-link to="/courses" class="block bg-gradient-to-r from-surface-2 to-surface hover:from-surface-3 hover:to-surface-2 border border-line rounded-lg p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-slate-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-accent-2 mb-2">📚 Browse & Compile Courses</h3>
                <p class="text-ink text-sm">
                  View, edit, compile courses and generate audio for app deployment
                </p>
              </div>
              <div class="text-accent-2">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Recording Studio -->
          <router-link to="/record" class="color-card block bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-lg border border-red-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-red-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-ink mb-2">🎙️ Recording Studio</h3>
                <p class="text-red-100 text-sm">
                  Record human voice samples for phrases that need authentic pronunciation
                </p>
              </div>
              <div class="text-ink">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Production Suite -->
          <router-link to="/production/courses" class="color-card block bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg border border-purple-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-purple-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-ink mb-2">🎛️ Production Suite</h3>
                <p class="text-purple-100 text-sm">
                  Mission Control, Script Viewer, Audio Pipeline & Recording Studio (v2.1)
                </p>
              </div>
              <div class="text-ink">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Agent Monitor -->
          <router-link to="/monitor" class="color-card block bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg border border-cyan-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-cyan-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-ink mb-2">📡 Agent Monitor</h3>
                <p class="text-cyan-100 text-sm">
                  Real-time pipeline agent swimlane - track Masters & Workers
                </p>
              </div>
              <div class="text-ink">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0-6v6m18-6v6"></path>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Pipeline Architecture -->
      <section class="mt-12">
        <div class="bg-surface/50 rounded-lg border border-line/20 p-8">
          <h2 class="text-2xl font-semibold text-ink mb-6">Pipeline Architecture</h2>

          <div class="space-y-6">
            <!-- Architecture Description -->
            <div class="bg-canvas/50 rounded-lg p-6">
              <p class="text-ink mb-4">
                Linear microservice architecture with sequential phase progression and integrated post-processing.
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-surface-3 rounded-full"></div>
                    <span class="text-ink">Linear phase progression (1 → 2 → 3 → Manifest → Audio)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-surface-3 rounded-full"></div>
                    <span class="text-ink">A phase triggers agents. Scripts run instantly.</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-surface-3 rounded-full"></div>
                    <span class="text-ink">VFS-based atomic file operations</span>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-surface-3 rounded-full"></div>
                    <span class="text-ink">Orchestrator coordinates microservices</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-surface-3 rounded-full"></div>
                    <span class="text-ink">Sequential validation gates</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-surface-3 rounded-full"></div>
                    <span class="text-ink">Real-time dashboard monitoring</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- v14 Pipeline Flow -->
            <div class="flex items-center justify-center gap-2 overflow-x-auto pb-4">
              <!-- Course Builder -->
              <div class="flex items-center flex-shrink-0">
                <div class="flow-chip flow-emerald w-40 h-28 rounded-lg border-2 border-emerald-500 bg-emerald-500/10 flex flex-col items-center justify-center">
                  <div class="text-emerald-400 font-bold text-lg">Course Builder</div>
                  <div class="text-emerald-300 text-xs mt-1 px-2 text-center">Seeds + LEGOs + Phrases</div>
                  <div class="text-emerald-400/60 text-xs mt-1">Port 3471</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 8 Audio -->
              <div class="flex items-center flex-shrink-0">
                <div class="flow-chip flow-purple w-32 h-28 rounded-lg border-2 border-purple-500 bg-purple-500/10 flex flex-col items-center justify-center">
                  <div class="text-purple-400 font-bold text-lg">Phase 8</div>
                  <div class="text-purple-300 text-xs mt-1 px-2 text-center">Audio Generation</div>
                  <div class="text-purple-400/60 text-xs mt-1">Port 3465</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 9 Manifest -->
              <div class="flex items-center flex-shrink-0">
                <div class="flow-chip flow-amber w-32 h-28 rounded-lg border-2 border-amber-500 bg-amber-500/10 flex flex-col items-center justify-center">
                  <div class="text-amber-400 font-bold text-lg">Phase 9</div>
                  <div class="text-amber-300 text-xs mt-1 px-2 text-center">Manifest Compilation</div>
                  <div class="text-amber-400/60 text-xs mt-1">Port 3466</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Reference Materials -->
      <section>
        <div class="bg-surface/50 rounded-lg border border-line/20 p-8">
          <h2 class="text-2xl font-semibold text-ink mb-2">Reference Materials</h2>
          <p class="text-muted mb-6">Supporting documentation and data sources:</p>

          <div class="space-y-4">
            <!-- Complete Process Overview -->
            <router-link to="/reference/overview" class="flex items-center gap-4 p-4 bg-canvas/80 border border-line/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📚</div>
              <div>
                <h3 class="font-semibold text-ink">Complete Process Overview</h3>
                <p class="text-sm text-muted">Comprehensive documentation of the entire SSI Course Production pipeline - all phases in detail</p>
              </div>
            </router-link>

            <!-- Phase Intelligence -->
            <router-link to="/intelligence" class="flex items-center gap-4 p-4 bg-canvas/80 border border-emerald-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">🧠</div>
              <div>
                <h3 class="font-semibold text-accent-2">Phase Intelligence Modules</h3>
                <p class="text-sm text-muted">Live methodology for each phase - the single source of truth with embedded inline prompts</p>
              </div>
            </router-link>

            <!-- Canonical Content -->
            <router-link to="/reference/canonical" class="flex items-center gap-4 p-4 bg-canvas/80 border border-line/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">🌱</div>
              <div>
                <h3 class="font-semibold text-ink">Canonical Content</h3>
                <p class="text-sm text-muted">All 668 canonical seeds (16 years empirical optimization) + welcomes + encouragements</p>
              </div>
            </router-link>

            <!-- APML v14.0 Specification -->
            <router-link to="/reference/apml" class="flex items-center gap-4 p-4 bg-canvas/80 border border-line/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📋</div>
              <div>
                <h3 class="font-semibold text-ink">APML v14.0 Specification</h3>
                <p class="text-sm text-muted">Course Builder consolidation - simplified pipeline (Course Builder → Audio → Manifest)</p>
              </div>
            </router-link>

            <!-- Terminology Glossary -->
            <router-link to="/reference/terminology" class="flex items-center gap-4 p-4 bg-canvas/80 border border-line/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📖</div>
              <div>
                <h3 class="font-semibold text-ink">Terminology Glossary</h3>
                <p class="text-sm text-muted">SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS - single source of truth for all terminology</p>
              </div>
            </router-link>

            <!-- Pedagogical Model -->
            <router-link to="/reference/pedagogy" class="flex items-center gap-4 p-4 bg-canvas/80 border border-line/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">🎓</div>
              <div>
                <h3 class="font-semibold text-ink">Pedagogical Model</h3>
                <p class="text-sm text-muted">LEGOs, Baskets, Eternal vs Debut - the "why" behind the SSi teaching system</p>
              </div>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Footer Note -->
      <div class="mt-12 text-center text-muted text-sm">
        <p>SSi Course Production Dashboard v14.0.0 • Supabase is the SINGLE SOURCE OF TRUTH</p>
        <p class="mt-1">Course Builder → Phase 8 (Audio) → Phase 9 (Manifest)</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'
import SchemaHealth from '../components/SchemaHealth.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { user, logout } = useAuth()

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
/* These cards always have a saturated colored background (identical in both
   themes), so their title/icon must stay light. In dark mode text-ink is
   already light; only light mode needs the override, scoped so dark is untouched. */
:global([data-theme="light"]) .color-card .text-ink {
  color: #ffffff;
}

/* Pipeline flow chips: hardcoded *-400/300 text sits on a pale 10% color tint
   in light mode (~1.6:1, illegible). Darken to the 700/800 shade of the SAME
   hue so they pass AA while staying recognizably emerald/purple/amber.
   Scoped to light mode only; dark mode keeps its bright-on-dark chips. */
:global([data-theme="light"]) .flow-emerald [class*="text-emerald"] { color: #047857; }
:global([data-theme="light"]) .flow-purple [class*="text-purple"] { color: #6b21a8; }
:global([data-theme="light"]) .flow-amber [class*="text-amber"] { color: #b45309; }
</style>
