<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">User Management</h1>
        <p class="text-slate-400">Invite volunteers and manage course access</p>
      </div>

      <!-- Invite New User -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-emerald-400 mb-4">Invite New User</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm text-slate-400 mb-2">Email Address *</label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="volunteer@example.com"
              class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-2">Name</label>
            <input
              v-model="newUser.name"
              type="text"
              placeholder="Maria"
              class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm text-slate-400 mb-2">Role</label>
          <select
            v-model="newUser.role"
            class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="recorder">Recorder (can record audio)</option>
            <option value="editor">Editor (can edit course content)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm text-slate-400 mb-2">Course Access *</label>
          <div class="flex flex-wrap gap-2 mb-2">
            <button
              v-for="course in availableCourses"
              :key="course"
              @click="toggleCourse(course)"
              :class="[
                'px-3 py-1 rounded-full text-sm transition-colors',
                newUser.courses.includes(course)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              ]"
            >
              {{ course }}
            </button>
          </div>
          <p class="text-xs text-slate-500">Click to select courses this user can access</p>
        </div>

        <div class="flex items-center gap-4">
          <button
            @click="inviteUser"
            :disabled="!canInvite || inviting"
            class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {{ inviting ? 'Inviting...' : 'Send Invite' }}
          </button>

          <p v-if="inviteError" class="text-red-400 text-sm">{{ inviteError }}</p>
        </div>

        <!-- Invite Success -->
        <div v-if="inviteLink" class="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-lg">
          <p class="text-emerald-400 font-semibold mb-2">User invited!</p>
          <p class="text-sm text-slate-300 mb-2">Send them this link:</p>
          <div class="flex items-center gap-2">
            <input
              :value="inviteLink"
              readonly
              class="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-300"
            />
            <button
              @click="copyLink"
              class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm"
            >
              {{ copied ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Existing Users -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold text-emerald-400">Existing Users</h2>
          <button
            @click="loadUsers"
            :disabled="loadingUsers"
            class="text-slate-400 hover:text-slate-300 text-sm"
          >
            {{ loadingUsers ? 'Loading...' : '↻ Refresh' }}
          </button>
        </div>

        <div v-if="users.length === 0" class="text-slate-500 text-center py-8">
          No users found
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="user in users"
            :key="user.email"
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-slate-200">{{ user.name || user.email }}</span>
                <span
                  :class="[
                    'text-xs px-2 py-0.5 rounded-full',
                    user.role === 'admin' ? 'bg-purple-600 text-white' :
                    user.role === 'editor' ? 'bg-blue-600 text-white' :
                    'bg-slate-600 text-slate-300'
                  ]"
                >
                  {{ user.role }}
                </span>
              </div>
              <p class="text-sm text-slate-400">{{ user.email }}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-if="user.courses === '*'"
                  class="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded"
                >
                  All courses
                </span>
                <span
                  v-else
                  v-for="course in user.courses"
                  :key="course"
                  class="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                >
                  {{ course }}
                </span>
              </div>
            </div>

            <button
              v-if="user.role !== 'admin' || users.filter(u => u.role === 'admin').length > 1"
              @click="deleteUser(user.email)"
              class="text-red-400 hover:text-red-300 text-sm px-3 py-1"
              title="Remove user"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { session } = useAuth()

// Available courses (in production, fetch from API)
const availableCourses = ref([
  'spa_for_eng', 'fra_for_eng', 'ita_for_eng', 'cmn_for_eng',
  'mkd_for_cat', 'wel_for_eng', 'gle_for_eng'
])

// New user form
const newUser = ref({
  email: '',
  name: '',
  role: 'recorder',
  courses: []
})

const inviting = ref(false)
const inviteError = ref(null)
const inviteLink = ref(null)
const copied = ref(false)

// Existing users
const users = ref([])
const loadingUsers = ref(false)

const canInvite = computed(() => {
  return newUser.value.email && newUser.value.courses.length > 0
})

function toggleCourse(course) {
  const idx = newUser.value.courses.indexOf(course)
  if (idx >= 0) {
    newUser.value.courses.splice(idx, 1)
  } else {
    newUser.value.courses.push(course)
  }
}

async function inviteUser() {
  inviting.value = true
  inviteError.value = null
  inviteLink.value = null

  try {
    const response = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.value}`
      },
      body: JSON.stringify(newUser.value)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to invite user')
    }

    inviteLink.value = data.inviteLink

    // Reset form
    newUser.value = {
      email: '',
      name: '',
      role: 'recorder',
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

async function copyLink() {
  await navigator.clipboard.writeText(inviteLink.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

async function loadUsers() {
  loadingUsers.value = true

  try {
    const response = await fetch('/api/auth/users', {
      headers: {
        'Authorization': `Bearer ${session.value}`
      }
    })

    const data = await response.json()
    users.value = data.users || []

  } catch (err) {
    console.error('Failed to load users:', err)
  } finally {
    loadingUsers.value = false
  }
}

async function deleteUser(email) {
  if (!confirm(`Remove ${email}?`)) return

  try {
    const response = await fetch(`/api/auth/users?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.value}`
      }
    })

    if (response.ok) {
      await loadUsers()
    }
  } catch (err) {
    console.error('Failed to delete user:', err)
  }
}

onMounted(() => {
  loadUsers()
})
</script>
