<template>
  <header v-if="!isHidden" ref="navbarRef" class="app-navbar">
    <div class="navbar-inner">
      <!-- Left: Popty brand (→ Home) + course breadcrumb -->
      <div class="navbar-left">
        <router-link to="/" class="navbar-brand">Popty</router-link>
        <span v-if="courseCrumb" class="navbar-crumb">
          <span class="crumb-sep">/</span>
          <span class="crumb-current">{{ courseCrumb }}</span>
        </span>
      </div>

      <!-- Center: persistent primary nav -->
      <nav class="navbar-tabs">
        <router-link
          v-for="tab in primaryTabs"
          :key="tab.label"
          :to="tab.to"
          class="tab-item"
          :class="{ active: tab.active }"
        >
          {{ tab.label }}
        </router-link>
      </nav>

      <!-- Right: Summary + Env + Course Switcher + User -->
      <div class="navbar-right">
        <span v-if="showSummary && !loading" class="course-summary">
          <span class="summary-value">{{ courseCount }}</span> courses
          <span class="summary-sep">&middot;</span>
          <span class="summary-value">{{ inProductionCount }}</span> in production
        </span>
        <div class="navbar-env-deploy">
          <EnvironmentSwitcher />
          <RemoteControl />
        </div>
        <CourseSwitcherDropdown />
        <div v-if="isAuthenticated" class="user-menu" ref="userMenuRef">
          <button @click="showUserMenu = !showUserMenu" class="avatar-btn">
            {{ userInitial }}
          </button>
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-dropdown-name">{{ learner?.name || user?.email }}</div>
            <router-link v-if="isAdmin" to="/admin" class="user-dropdown-item" @click="showUserMenu = false">
              Admin
            </router-link>
            <router-link v-if="isAdmin" to="/users" class="user-dropdown-item" @click="showUserMenu = false">
              Users
            </router-link>
            <router-link v-else-if="hasDashboardAccess" to="/users" class="user-dropdown-item" @click="showUserMenu = false">
              Invite Recorder
            </router-link>
            <button @click="showPasswordModal = true; showUserMenu = false" class="user-dropdown-item">
              {{ hasPassword ? 'Change password' : 'Set password' }}
            </button>
            <button @click="toggleTheme" class="user-dropdown-item">
              {{ theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode' }}
            </button>
            <button @click="handleLogout" class="user-dropdown-logout">Sign out</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Contextual second row: per-section sub-navigation -->
    <div v-if="sectionTabs.length" class="navbar-subbar">
      <nav class="navbar-subtabs">
        <router-link
          v-for="tab in sectionTabs"
          :key="tab.label"
          :to="tab.to"
          class="tab-item"
          :class="{ active: tab.active }"
        >
          {{ tab.label }}
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </router-link>
      </nav>
    </div>

    <!-- Password Modal -->
    <div v-if="showPasswordModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="closePasswordModal">
      <div class="bg-surface border border-line rounded-lg p-6 w-full max-w-sm">
        <h3 class="text-lg font-semibold text-ink mb-4">{{ hasPassword ? 'Change Password' : 'Set Password' }}</h3>

        <div v-if="passwordSuccess" class="text-accent-2 text-center py-4">
          Password updated!
        </div>

        <div v-else class="space-y-3">
          <input
            v-model="newPassword"
            type="password"
            placeholder="New password (min 8 chars)"
            class="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-ink placeholder-faint focus:border-emerald-500 focus:outline-none text-sm"
            @keyup.enter="$refs.confirmPw?.focus()"
          />
          <input
            ref="confirmPw"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm password"
            class="w-full bg-canvas border border-line rounded-lg px-4 py-2.5 text-ink placeholder-faint focus:border-emerald-500 focus:outline-none text-sm"
            @keyup.enter="handleSetPassword"
          />
          <p v-if="passwordError" class="text-danger text-xs">{{ passwordError }}</p>
          <div class="flex gap-2 pt-1">
            <button
              @click="closePasswordModal"
              class="flex-1 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm font-medium rounded-lg transition-colors"
            >Cancel</button>
            <button
              @click="handleSetPassword"
              :disabled="passwordSaving"
              class="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 text-white text-sm font-medium rounded-lg transition-colors"
            >{{ passwordSaving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCourses } from '../composables/useCourses'
import { useAuth } from '../composables/useAuth'
import EnvironmentSwitcher from './EnvironmentSwitcher.vue'
import RemoteControl from './RemoteControl.vue'
import CourseSwitcherDropdown from './CourseSwitcherDropdown.vue'
import { primaryTabs as declaredPrimaryTabs, sectionTabs as declaredSectionTabs } from '../nav/navigation'

const route = useRoute()
const router = useRouter()
const { courses, loading, loadCourses, courseCount, inProductionCount, getCourseName } = useCourses()
const { isAuthenticated, isAdmin, isRecorder, hasDashboardAccess, user, learner, hasPassword, updatePassword, logout, getAccessToken } = useAuth()

// Theme: 'dark' (default) | 'light'. Persisted; applied on <html data-theme>.
// Initial state set by main.js before mount; the menu item flips it here.
const theme = ref(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  if (theme.value === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
  try { localStorage.setItem('popty-theme', theme.value) } catch { /* private mode */ }
}

// Audit-log stale check — surfaces a numeric badge on the Maintenance tab
// when the oldest audit row is older than 30 days, prompting a cleanup.
// Admin-only and best-effort (silent on error).
const auditStaleDays = ref(null)
async function checkAuditStaleness() {
  if (!isAdmin.value) return
  try {
    const token = await getAccessToken()
    const base = localStorage.getItem('api_base_url') || 'http://localhost:3470'
    const r = await fetch(`${base}/api/admin/audit-stats`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    if (!r.ok) return
    const stats = await r.json()
    auditStaleDays.value = stats.days_since_oldest > 30 ? stats.days_since_oldest : null
  } catch { /* silent */ }
}

const showUserMenu = ref(false)
const userMenuRef = ref(null)
const showPasswordModal = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref(null)
const passwordSuccess = ref(false)
const passwordSaving = ref(false)

async function handleSetPassword() {
  passwordError.value = null
  if (newPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match'
    return
  }
  passwordSaving.value = true
  const result = await updatePassword(newPassword.value)
  passwordSaving.value = false
  if (result.error) {
    passwordError.value = result.error
  } else {
    passwordSuccess.value = true
    setTimeout(() => {
      showPasswordModal.value = false
      passwordSuccess.value = false
      newPassword.value = ''
      confirmPassword.value = ''
    }, 1500)
  }
}

function closePasswordModal() {
  showPasswordModal.value = false
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = null
  passwordSuccess.value = false
}

const userInitial = computed(() => {
  const name = learner.value?.name || user.value?.email || ''
  return name.charAt(0).toUpperCase() || '?'
})

async function handleLogout() {
  showUserMenu.value = false
  await logout()
  router.push({ name: 'Login' })
}

function handleClickOutside(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  checkAuditStaleness()
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const activeCourseCount = ref(0)

// Context, breadcrumb and visibility. EVERY nav surface below is derived from
// src/nav/navigation.js — the one declaration of sections, their routes and
// their destinations. Nothing here decides which tab is active on its own: a
// route the declaration owns lights its section's primary tab automatically,
// which is what stopped /builds emptying the row underneath you.
const courseCode = computed(() => route.params.courseCode || null)
const isCreateMode = computed(() => courseCode.value === 'new')
const isCoursesBoard = computed(() => route.path === '/courses')

// Hide on auth routes — and for recorders, who live in the Record Room shell
// and never see the admin console chrome.
const isHidden = computed(() => route.meta.public === true || isRecorder.value)

// Show the course-count chip only on the Courses library.
const showSummary = computed(() => isCoursesBoard.value)

// Breadcrumb — on course-scoped routes, show the course name after the brand.
const courseCrumb = computed(() => {
  if (isCreateMode.value) return 'New Course'
  if (courseCode.value) return getCourseName(courseCode.value)
  return null
})

// PRIMARY tabs — always visible everywhere; active state comes from which
// declared section owns the current route.
const primaryTabs = computed(() => declaredPrimaryTabs(route))

// SECTION sub-tabs — the owning section's own destinations, second row.
// Badges are supplied here because they are live counts, not declarations.
const sectionTabs = computed(() =>
  declaredSectionTabs(route, {
    activeCourses: activeCourseCount.value > 0 ? activeCourseCount.value : null,
    auditStale: auditStaleDays.value ? `${auditStaleDays.value}d` : null
  })
)

onMounted(() => {
  loadCourses()
})

// Publish the navbar's real height as --app-navbar-height so full-screen
// takeover pages (e.g. Stage0Tuner, position:fixed inset:0) can offset below
// it — robust to the one-row vs two-row (sub-tabs) height change.
const navbarRef = ref(null)
let navbarRO = null
function syncNavbarHeight() {
  const h = navbarRef.value ? navbarRef.value.offsetHeight : 0
  document.documentElement.style.setProperty('--app-navbar-height', `${h}px`)
}
onMounted(() => {
  navbarRO = new ResizeObserver(syncNavbarHeight)
  watchEffect(() => {
    if (navbarRef.value) { navbarRO.observe(navbarRef.value); syncNavbarHeight() }
    else { navbarRO.disconnect(); syncNavbarHeight() }
  })
})
onUnmounted(() => {
  navbarRO?.disconnect()
  document.documentElement.style.removeProperty('--app-navbar-height')
})
</script>

<style scoped>
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-shadow, var(--surface));
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
  padding: 0 1.5rem;
}

.navbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

/* Left section */
.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.navbar-brand {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.navbar-brand:hover {
  opacity: 0.8;
}

.navbar-crumb {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  white-space: nowrap;
}

.crumb-sep {
  color: var(--color-tungsten, var(--muted));
}

.crumb-current {
  color: var(--color-paper-dim, var(--muted));
}

/* Contextual second row */
.navbar-subbar {
  max-width: 1400px;
  margin: 0 auto;
  height: 44px;
  display: flex;
  align-items: center;
  border-top: 1px solid var(--color-graphite, var(--surface-3));
}

.navbar-subtabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.navbar-subtabs::-webkit-scrollbar {
  display: none;
}

.navbar-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0;
  white-space: nowrap;
}

/* Tabs */
.navbar-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.navbar-tabs::-webkit-scrollbar {
  display: none;
}

.tab-item {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.875rem;
  padding: 0.5rem 0.875rem;
  color: var(--color-paper-dim, var(--muted));
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.tab-item:hover {
  color: var(--color-paper, var(--ink));
  background: var(--color-slate, var(--surface-2));
}

/* THE ACTIVE TAB IS A STATE, NOT A MEASUREMENT (Tom, 2026-09-02). It was amber,
   which on the Script Lab also meant Select, "declared, unresolved", "attested
   nowhere" and the chunk-mapping chip. The fill and the weight already say
   which tab you are on; the hue was the fifth job amber was doing. */
.tab-item.active {
  color: var(--color-paper, var(--ink));
  font-weight: 600;
  background: var(--color-slate, var(--surface-2));
  box-shadow: inset 0 -2px 0 var(--color-paper, var(--ink));
}

.tab-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-shadow, var(--surface));
  background: #8b5cf6;
  border-radius: 9px;
  padding: 0 0.375rem;
  min-width: 18px;
  text-align: center;
  line-height: 18px;
}

/* Light mode: deepen the badge purple so white text clears AA on small bold
   text (white on #8b5cf6 = 4.23:1 fail). #6d28d9 = 7.1:1, same violet hue. */
:root[data-theme="light"] .tab-badge {
  background: #6d28d9;
}

/* Right section */
.navbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.navbar-env-deploy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.course-summary {
  font-size: 0.75rem;
  color: var(--color-paper-muted, var(--faint));
  white-space: nowrap;
}

.summary-value {
  font-weight: 700;
  color: var(--color-paper-dim, var(--muted));
  font-variant-numeric: tabular-nums;
}

.summary-sep {
  margin: 0 0.25rem;
  opacity: 0.5;
}

.user-menu {
  position: relative;
  flex-shrink: 0;
}

.avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper-dim, var(--muted));
  font-weight: 700;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-btn:hover {
  border-color: var(--color-paper-dim, var(--muted));
  color: var(--color-paper, var(--ink));
}

.user-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 180px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.user-dropdown-name {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--color-paper-dim, var(--muted));
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
}

.user-dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--muted);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
  text-decoration: none;
  box-sizing: border-box;
}

.user-dropdown-item:hover {
  background: rgba(148, 163, 184, 0.1);
  color: var(--ink);
}

.user-dropdown-logout {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  color: var(--danger);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.user-dropdown-logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Responsive — tabs MUST always be visible */
@media (max-width: 900px) {
  .app-navbar {
    height: auto;
  }

  .navbar-inner {
    height: auto;
    flex-wrap: wrap;
    padding: 0.5rem 0;
    gap: 0;
  }

  .navbar-left {
    order: 1;
    min-width: 0;
    flex: 1;
  }

  .navbar-title {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9375rem;
  }

  .navbar-right {
    order: 2;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .navbar-tabs {
    order: 3;
    width: 100%;
    justify-content: center;
    padding: 0.25rem 0;
    border-top: 1px solid var(--color-graphite, var(--surface-3));
    margin-top: 0.375rem;
  }

  .course-summary {
    display: none;
  }

  /* Title is visible — hide the duplicate name in course switcher, keep just the code */
  .navbar-right :deep(.course-name) {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-navbar {
    padding: 0 0.75rem;
  }

  .navbar-title {
    font-size: 0.8125rem;
  }

  .tab-item {
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
  }

  /* .navbar-right's contents (env select + remote control + course switcher +
     avatar) measure 458px. With flex-shrink:0 that widened the whole DOCUMENT
     to 470px on a 390px phone, so every page under this navbar — including
     /record, the page a recordist stands in front of — scrolled sideways.
     Let the row shrink and scroll its own controls instead of the page. */
  .navbar-right {
    flex-shrink: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .navbar-right::-webkit-scrollbar {
    display: none;
  }

  /* ...but overflow-x:auto computes overflow-y to auto too, which CLIPPED the
     absolutely-positioned user dropdown hanging below the row: on a phone,
     tapping the avatar opened a menu that was invisible and untappable, so
     Admin, Users, Test builds, Change password and Sign out were all
     unreachable from a phone. A fixed-position dropdown escapes an ancestor's
     overflow clip (no transformed ancestor in this tree), so it is anchored to
     the viewport instead, just below the navbar's first row. */
  .user-dropdown {
    position: fixed;
    top: 3rem;
    right: 0.75rem;
    left: auto;
  }
}
</style>
