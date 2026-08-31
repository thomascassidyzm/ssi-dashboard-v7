<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-accent-2 hover:opacity-80 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-accent-2 mb-2">{{ isAdmin ? 'User Management' : 'Add Editor' }}</h1>
        <p class="text-muted">{{ isAdmin ? 'Add users and manage course access' : 'Add editors to your courses by email' }}</p>
      </div>

      <!-- Add New User -->
      <div class="bg-surface border border-line rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-accent-2 mb-4">{{ isAdmin ? 'Add New User' : 'Add Editor' }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm text-muted mb-2">Email Address *</label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="volunteer@example.com"
              class="w-full bg-canvas border border-line rounded-lg px-4 py-2 text-ink focus:border-accent-2 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm text-muted mb-2">Name</label>
            <input
              v-model="newUser.name"
              type="text"
              placeholder="Maria"
              class="w-full bg-canvas border border-line rounded-lg px-4 py-2 text-ink focus:border-accent-2 focus:outline-none"
            />
          </div>
        </div>

        <div v-if="isAdmin" class="mb-4">
          <label class="block text-sm text-muted mb-2">Role</label>
          <select
            v-model="newUser.role"
            class="w-full bg-canvas border border-line rounded-lg px-4 py-2 text-ink focus:border-accent-2 focus:outline-none"
          >
            <option value="editor">Editor (can edit + record for granted courses)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
        <div v-else class="mb-4">
          <p class="text-sm text-muted">Adding as <span class="text-accent-2 font-medium">Editor</span></p>
        </div>

        <!-- Admins get access to every course automatically — no per-course picking. -->
        <div v-if="newUser.role === 'admin'" class="mb-4">
          <label class="block text-sm text-muted mb-2">Course Access</label>
          <span class="pill-all inline-flex items-center text-xs px-2.5 py-1 rounded">
            All courses
          </span>
          <p class="text-xs text-faint mt-1">Admins have access to every course.</p>
        </div>
        <div v-else class="mb-4">
          <label class="block text-sm text-muted mb-2">Course Access *</label>
          <!-- Selected courses as chips -->
          <div v-if="newUser.courses.length" class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="code in newUser.courses"
              :key="code"
              class="chip-green inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white"
            >
              {{ courseDisplayName(code) }}
              <button @click="toggleCourse(newUser.courses, code)" class="hover:opacity-80 ml-0.5">&times;</button>
            </span>
          </div>
          <!-- Search + dropdown — non-admins can only grant access to courses they themselves can access. -->
          <CourseSearchPicker
            :available="assignableCourses"
            :selected="newUser.courses"
            @toggle="(code) => toggleCourse(newUser.courses, code)"
            @toggleAll="toggleAllCourses(newUser)"
          />
        </div>

        <div class="flex items-center gap-4">
          <button
            @click="inviteUser"
            :disabled="!canInvite || inviting"
            class="btn-green disabled:bg-surface-2 disabled:text-faint text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {{ inviting ? 'Adding...' : 'Add User' }}
          </button>

          <p v-if="inviteError" class="text-danger text-sm">{{ inviteError }}</p>
          <p v-if="inviteSuccess" class="text-accent-2 text-sm">{{ inviteSuccess }}</p>
        </div>
      </div>

      <!-- Existing Users (admin only) -->
      <div v-if="isAdmin" class="bg-surface border border-line rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-accent-2">Existing Users</h2>
          <button
            @click="loadUsers"
            :disabled="loadingUsers"
            class="text-muted hover:text-ink text-sm"
          >
            {{ loadingUsers ? 'Loading...' : '↻ Refresh' }}
          </button>
        </div>

        <div v-if="users.length === 0" class="text-faint text-center py-8">
          No users found
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="user in users"
            :key="user.email"
            class="bg-canvas border border-line rounded-lg p-4"
            :class="{ '!border-accent-2': editingEmail === user.email }"
          >
            <!-- View mode -->
            <div v-if="editingEmail !== user.email" class="flex items-center justify-between">
              <div class="cursor-pointer flex-1" @click="startEdit(user)">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-ink">{{ user.name || user.email }}</span>
                  <span
                    :class="[
                      'text-xs px-2 py-0.5 rounded-full',
                      user.role === 'admin' ? 'bg-purple-600 text-white' :
                      user.role === 'editor' ? 'bg-blue-600 text-white' :
                      'bg-surface-3 text-ink'
                    ]"
                  >
                    {{ user.role }}
                  </span>
                </div>
                <p class="text-sm text-muted">{{ user.email }}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-if="user.courses === '*'"
                    class="pill-all text-xs px-2 py-0.5 rounded"
                  >
                    All courses
                  </span>
                  <span
                    v-else
                    v-for="course in parseCourses(user.courses)"
                    :key="course"
                    class="text-xs bg-surface-2 border border-line text-ink px-2 py-0.5 rounded"
                  >
                    {{ courseDisplayName(course) }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="startEdit(user)"
                  class="text-muted hover:text-ink text-sm px-3 py-1"
                >
                  Edit
                </button>
                <button
                  v-if="user.role !== 'admin' || users.filter(u => u.role === 'admin').length > 1"
                  @click="deleteUser(user.email)"
                  class="text-danger hover:opacity-80 text-sm px-3 py-1"
                  title="Remove user"
                >
                  Remove
                </button>
              </div>
            </div>

            <!-- Edit mode -->
            <div v-else>
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm text-muted">Editing <span class="text-ink">{{ user.email }}</span></p>
                <div class="flex gap-2">
                  <button
                    @click="saveEdit"
                    :disabled="saving"
                    class="btn-green disabled:bg-surface-2 text-white text-sm px-4 py-1 rounded-lg transition-colors"
                  >
                    {{ saving ? 'Saving...' : 'Save' }}
                  </button>
                  <button
                    @click="cancelEdit"
                    class="bg-surface-2 hover:bg-surface-3 text-ink text-sm px-4 py-1 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div class="mb-3">
                <label class="block text-xs text-faint mb-1">Role</label>
                <select
                  v-model="editForm.role"
                  class="w-full bg-canvas border border-line rounded-lg px-3 py-1.5 text-sm text-ink focus:border-accent-2 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div v-if="editForm.role === 'admin'">
                <label class="block text-xs text-faint mb-1">Course Access</label>
                <span class="pill-all inline-flex items-center text-xs px-2 py-0.5 rounded">
                  All courses
                </span>
                <p class="text-xs text-faint mt-1">Admins have access to every course.</p>
              </div>
              <div v-else>
                <label class="block text-xs text-faint mb-1">Course Access</label>
                <!-- Selected courses as chips -->
                <div v-if="editForm.courses.length" class="flex flex-wrap gap-1.5 mb-2">
                  <span
                    v-for="code in editForm.courses"
                    :key="code"
                    class="chip-green inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                  >
                    {{ courseDisplayName(code) }}
                    <button @click="toggleCourse(editForm.courses, code)" class="hover:opacity-80 ml-0.5">&times;</button>
                  </span>
                </div>
                <!-- Search + dropdown -->
                <CourseSearchPicker
                  :available="availableCourses"
                  :selected="editForm.courses"
                  @toggle="(code) => toggleCourse(editForm.courses, code)"
                  @toggleAll="toggleAllCourses(editForm)"
                  size="sm"
                />
              </div>

              <p v-if="editError" class="text-danger text-xs mt-2">{{ editError }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Green pill/button helpers. Dark values match the original emerald-600/-500
   Tailwind classes exactly; light mode is darkened to meet WCAG AA. */
.pill-all {
  background-color: rgba(5, 150, 105, 0.2); /* emerald-600/20 (dark, unchanged) */
  color: var(--accent-2);                            /* emerald-400 (dark, unchanged) */
}
.chip-green,
.btn-green:not(:disabled) {
  background-color: #059669; /* emerald-600 (dark, unchanged) */
}
.btn-green:not(:disabled):hover {
  background-color: #10b981; /* emerald-500 (dark, unchanged) */
}

:root[data-theme="light"] .pill-all {
  background-color: #d1fae5; /* emerald-100 */
  color: #065f46;            /* emerald-800 — 7.5:1 on the fill */
}
:root[data-theme="light"] .chip-green,
:root[data-theme="light"] .btn-green:not(:disabled) {
  background-color: #047857; /* emerald-700 — 5.0:1 vs white text */
}
:root[data-theme="light"] .btn-green:not(:disabled):hover {
  background-color: #065f46; /* emerald-800 */
}
</style>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useCourses } from '../composables/useCourses'
import { getApiUrl, fetchJson } from '../services/api.js'
import { getAllCourses } from '../services/supabase.js'

// Inline CourseSearchPicker component
const CourseSearchPicker = defineComponent({
  name: 'CourseSearchPicker',
  props: {
    available: { type: Array, default: () => [] },
    selected: { type: Array, default: () => [] },
    size: { type: String, default: 'md' }
  },
  emits: ['toggle', 'toggleAll'],
  setup(props, { emit }) {
    const query = ref('')
    const isOpen = ref(false)

    const filtered = computed(() => {
      if (!query.value) return props.available
      const q = query.value.toLowerCase()
      return props.available.filter(c =>
        c.display.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      )
    })

    const allSelected = computed(() =>
      props.available.length > 0 && props.selected.length === props.available.length
    )

    return () => {
      const isSm = props.size === 'sm'
      return h('div', { class: 'relative' }, [
        // Search input
        h('div', { class: 'flex gap-2' }, [
          h('input', {
            value: query.value,
            onInput: (e) => { query.value = e.target.value; isOpen.value = true },
            onFocus: () => { isOpen.value = true },
            placeholder: 'Search courses...',
            class: `flex-1 bg-canvas border border-line rounded-lg px-3 ${isSm ? 'py-1 text-xs' : 'py-2 text-sm'} text-ink placeholder-faint focus:border-accent-2 focus:outline-none`
          }),
          h('button', {
            onClick: () => emit('toggleAll'),
            class: `px-3 ${isSm ? 'py-1 text-xs' : 'py-2 text-sm'} rounded-lg border transition-colors whitespace-nowrap ${
              allSelected.value
                ? 'btn-green text-white border-transparent'
                : 'bg-surface-2 text-ink border-line hover:bg-surface-3'
            }`
          }, allSelected.value ? 'Deselect All' : 'Select All')
        ]),
        // Dropdown
        isOpen.value && filtered.value.length > 0
          ? h('div', {
              class: 'absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-canvas border border-line rounded-lg shadow-xl'
            }, [
              ...filtered.value.map(course =>
                h('button', {
                  key: course.code,
                  onMousedown: (e) => { e.preventDefault(); e.stopPropagation(); emit('toggle', course.code) },
                  class: `w-full text-left px-3 ${isSm ? 'py-1.5 text-xs' : 'py-2 text-sm'} hover:bg-surface-2 flex items-center justify-between ${
                    props.selected.includes(course.code) ? 'text-accent-2 font-medium' : 'text-ink'
                  }`
                }, [
                  h('span', {}, course.display),
                  props.selected.includes(course.code)
                    ? h('span', { class: 'text-accent-2' }, '✓')
                    : null
                ])
              )
            ])
          : null,
        // Click-outside to close
        isOpen.value
          ? h('div', {
              class: 'fixed inset-0 z-40',
              onClick: () => { isOpen.value = false }
            })
          : null
      ])
    }
  }
})

const { getAccessToken, isAdmin, accessibleCourses } = useAuth()
const { getCourseName } = useCourses()

const availableCourses = ref([])
const courseMap = ref({})

async function loadAvailableCourses() {
  try {
    const courses = await getAllCourses()
    availableCourses.value = courses.map(c => ({
      code: c.course_code,
      display: getCourseName(c.course_code)
    })).sort((a, b) => a.display.localeCompare(b.display))
    courseMap.value = Object.fromEntries(
      availableCourses.value.map(c => [c.code, c.display])
    )
  } catch (err) {
    console.error('Failed to load courses:', err)
  }
}

function courseDisplayName(code) {
  return courseMap.value[code] || code
}

function parseCourses(courses) {
  if (Array.isArray(courses)) return courses
  if (typeof courses === 'string') {
    try { return JSON.parse(courses) } catch { return [] }
  }
  return []
}

// New user form
const newUser = ref({
  email: '',
  name: '',
  role: 'editor',
  courses: []
})

const inviting = ref(false)
const inviteError = ref(null)
const inviteSuccess = ref(null)

// Existing users
const users = ref([])
const loadingUsers = ref(false)

// Inline edit
const editingEmail = ref(null)
const editForm = ref({ role: '', courses: [] })
const saving = ref(false)
const editError = ref(null)

const canInvite = computed(() => {
  // Admins get All courses automatically, so they don't need to pick any.
  return !!newUser.value.email && (newUser.value.role === 'admin' || newUser.value.courses.length > 0)
})

function toggleCourse(coursesArray, code) {
  const idx = coursesArray.indexOf(code)
  if (idx >= 0) {
    coursesArray.splice(idx, 1)
  } else {
    coursesArray.push(code)
  }
}

function toggleAllCourses(form) {
  const allCodes = availableCourses.value.map(c => c.code)
  if (form.courses.length === allCodes.length) {
    form.courses = []
  } else {
    form.courses = [...allCodes]
  }
}

async function inviteUser() {
  inviting.value = true
  inviteError.value = null
  inviteSuccess.value = null

  try {
    const token = await getAccessToken()
    const response = await fetch(`${getApiUrl()}/api/auth/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newUser.value)
    })

    if (!response.ok) throw new Error((await response.clone().json().catch(() => ({}))).error || `HTTP ${response.status}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to invite user')
    }

    inviteSuccess.value = `Added ${newUser.value.email} — they can now log in`

    // Reset form
    newUser.value = {
      email: '',
      name: '',
      role: 'editor',
      courses: []
    }

    // Reload users
    await loadUsers()

  } catch (err) {
    inviteError.value = err.message
  } finally {
    inviting.value = false
  }
}

async function loadUsers() {
  loadingUsers.value = true

  try {
    const token = await getAccessToken()
    const data = await fetchJson(`${getApiUrl()}/api/auth/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    users.value = data.users || []

  } catch (err) {
    console.error('Failed to load users:', err)
  } finally {
    loadingUsers.value = false
  }
}

function startEdit(user) {
  editingEmail.value = user.email
  editError.value = null
  editForm.value = {
    role: user.role,
    courses: [...parseCourses(user.courses)]
  }
}

function cancelEdit() {
  editingEmail.value = null
  editError.value = null
}

async function saveEdit() {
  saving.value = true
  editError.value = null

  try {
    const token = await getAccessToken()
    const response = await fetch(`${getApiUrl()}/api/auth/invite`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: editingEmail.value,
        role: editForm.value.role,
        courses: editForm.value.courses
      })
    })

    if (!response.ok) throw new Error((await response.clone().json().catch(() => ({}))).error || `HTTP ${response.status}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to update user')

    editingEmail.value = null
    await loadUsers()
  } catch (err) {
    editError.value = err.message
  } finally {
    saving.value = false
  }
}

async function deleteUser(email) {
  if (!confirm(`Remove ${email}?`)) return

  try {
    const token = await getAccessToken()
    const response = await fetch(`${getApiUrl()}/api/auth/users?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      await loadUsers()
    }
  } catch (err) {
    console.error('Failed to delete user:', err)
  }
}

// Courses the current user can assign to a new user. Admins see all;
// editors are scoped to their own accessible courses so they can only
// grant access to courses they themselves can access.
const assignableCourses = computed(() => {
  if (isAdmin.value || !accessibleCourses.value) return availableCourses.value
  return availableCourses.value.filter(c => accessibleCourses.value.includes(c.code))
})

onMounted(() => {
  loadAvailableCourses()
  loadUsers()
})
</script>
