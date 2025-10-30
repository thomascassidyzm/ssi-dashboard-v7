<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">Course Storage Management</h1>
        <p class="text-slate-400">Sync courses between local VFS and S3 cloud storage</p>
      </div>

      <!-- S3 Connection Status -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6 mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-slate-100 mb-2">S3 Connection</h2>
            <div class="flex items-center gap-3">
              <div
                class="w-3 h-3 rounded-full"
                :class="s3Connected ? 'bg-green-500' : 'bg-red-500'"
              ></div>
              <span class="text-slate-300">
                {{ s3Connected ? 'Connected to S3' : 'S3 Unavailable' }}
              </span>
              <span v-if="s3Bucket" class="text-slate-400 text-sm">
                ({{ s3Bucket }})
              </span>
            </div>
          </div>
          <div class="flex gap-3">
            <button
              @click="testS3Connection"
              :disabled="testing"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-colors text-sm"
            >
              {{ testing ? 'Testing...' : 'Test Connection' }}
            </button>
            <button
              @click="syncAllCourses"
              :disabled="syncing || !s3Connected"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors text-sm font-medium"
            >
              {{ syncing ? 'Syncing All...' : 'Sync All to S3' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Sync Summary -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-4">
          <div class="text-slate-400 text-sm mb-1">Total Courses</div>
          <div class="text-3xl font-bold text-emerald-400">{{ courses.length }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg border border-emerald-400/20 p-4">
          <div class="text-slate-400 text-sm mb-1">In S3</div>
          <div class="text-3xl font-bold text-emerald-400">{{ coursesInS3 }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg border border-yellow-400/20 p-4">
          <div class="text-slate-400 text-sm mb-1">Needs Sync</div>
          <div class="text-3xl font-bold text-yellow-400">{{ coursesNeedingSync }}</div>
        </div>
        <div class="bg-slate-800/50 rounded-lg border border-blue-400/20 p-4">
          <div class="text-slate-400 text-sm mb-1">Files Uploaded</div>
          <div class="text-3xl font-bold text-blue-400">{{ totalFilesUploaded }}</div>
        </div>
      </div>

      <!-- Course List -->
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">Courses</h2>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8 text-slate-400">
          Loading courses...
        </div>

        <!-- Course Table -->
        <div v-else class="space-y-2">
          <div
            v-for="course in courses"
            :key="course.code"
            class="bg-slate-900/50 rounded-lg border border-slate-700 p-4 hover:border-emerald-500/30 transition-colors"
          >
            <div class="flex items-center justify-between">
              <!-- Course Info -->
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-semibold text-slate-100">{{ course.code }}</h3>
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getSyncStatusClass(course.syncStatus)"
                  >
                    {{ course.syncStatus }}
                  </span>
                  <span v-if="course.fileCount" class="text-slate-400 text-sm">
                    {{ course.fileCount }} files
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-slate-400">
                  <div v-if="course.lastSyncTime">
                    Last sync: {{ formatTime(course.lastSyncTime) }}
                  </div>
                  <div v-if="course.size">
                    Size: {{ formatSize(course.size) }}
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2">
                <button
                  @click="syncCourse(course.code)"
                  :disabled="course.syncing || !course.hasRequiredFiles"
                  class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors text-sm"
                >
                  {{ course.syncing ? 'Syncing...' : 'Upload to S3' }}
                </button>
                <button
                  @click="downloadFromS3(course.code)"
                  :disabled="course.downloading || course.syncStatus !== 'in_s3'"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition-colors text-sm"
                >
                  {{ course.downloading ? 'Downloading...' : 'Download from S3' }}
                </button>
                <button
                  @click="viewCourseDetails(course.code)"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors text-sm"
                >
                  Details
                </button>
              </div>
            </div>

            <!-- Sync Progress -->
            <div v-if="course.syncing && course.syncProgress" class="mt-3">
              <div class="flex items-center justify-between text-sm text-slate-400 mb-1">
                <span>Uploading files...</span>
                <span>{{ course.syncProgress.current }} / {{ course.syncProgress.total }}</span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2">
                <div
                  class="bg-emerald-500 h-2 rounded-full transition-all"
                  :style="{ width: `${(course.syncProgress.current / course.syncProgress.total) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- Warning if missing required files -->
            <div v-if="!course.hasRequiredFiles" class="mt-3 text-yellow-400 text-sm">
              ⚠️ Missing seed_pairs.json or lego_pairs.json - course cannot be synced
            </div>
          </div>
        </div>
      </div>

      <!-- Sync Log -->
      <div v-if="syncLog.length > 0" class="mt-8 bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
        <h2 class="text-xl font-semibold text-slate-100 mb-4">Sync Log</h2>
        <div class="space-y-1 max-h-64 overflow-y-auto font-mono text-sm">
          <div
            v-for="(log, index) in syncLog"
            :key="index"
            class="text-slate-300"
            :class="{
              'text-green-400': log.type === 'success',
              'text-red-400': log.type === 'error',
              'text-yellow-400': log.type === 'warning',
              'text-blue-400': log.type === 'info'
            }"
          >
            [{{ log.time }}] {{ log.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const s3Connected = ref(false)
const s3Bucket = ref('')
const testing = ref(false)
const syncing = ref(false)
const loading = ref(true)

const courses = ref([])
const syncLog = ref([])
const totalFilesUploaded = ref(0)

const coursesInS3 = computed(() => {
  return courses.value.filter(c => c.syncStatus === 'in_s3' || c.syncStatus === 'synced').length
})

const coursesNeedingSync = computed(() => {
  return courses.value.filter(c => c.syncStatus === 'not_synced' && c.hasRequiredFiles).length
})

onMounted(async () => {
  await testS3Connection()
  await loadCourses()
})

async function testS3Connection() {
  testing.value = true
  addLog('info', 'Testing S3 connection...')

  try {
    const response = await fetch('http://localhost:3456/api/storage/test-s3')
    if (response.ok) {
      const data = await response.json()
      s3Connected.value = true
      s3Bucket.value = data.bucket
      addLog('success', `Connected to S3 bucket: ${data.bucket}`)
    } else {
      s3Connected.value = false
      addLog('error', 'Failed to connect to S3 - API server may be offline')
    }
  } catch (error) {
    s3Connected.value = false
    addLog('error', `S3 connection failed: ${error.message}`)
  } finally {
    testing.value = false
  }
}

async function loadCourses() {
  loading.value = true
  addLog('info', 'Loading course list...')

  try {
    const response = await fetch('http://localhost:3456/api/storage/courses')
    if (response.ok) {
      const data = await response.json()
      courses.value = data.courses.map(c => ({
        ...c,
        syncing: false,
        downloading: false,
        syncProgress: null
      }))
      addLog('success', `Loaded ${courses.value.length} courses`)
    } else {
      addLog('error', 'Failed to load courses from API')
    }
  } catch (error) {
    addLog('error', `Failed to load courses: ${error.message}`)
  } finally {
    loading.value = false
  }
}

async function syncCourse(courseCode) {
  const course = courses.value.find(c => c.code === courseCode)
  if (!course) return

  course.syncing = true
  course.syncProgress = { current: 0, total: 0 }
  addLog('info', `Starting sync for ${courseCode}...`)

  try {
    const response = await fetch(`http://localhost:3456/api/storage/sync/${courseCode}`, {
      method: 'POST'
    })

    if (response.ok) {
      const data = await response.json()
      course.syncStatus = 'synced'
      course.lastSyncTime = new Date().toISOString()
      course.fileCount = data.filesUploaded
      totalFilesUploaded.value += data.filesUploaded
      addLog('success', `✅ ${courseCode}: ${data.filesUploaded} files uploaded`)
    } else {
      const error = await response.json()
      addLog('error', `❌ ${courseCode}: ${error.message}`)
    }
  } catch (error) {
    addLog('error', `❌ ${courseCode}: ${error.message}`)
  } finally {
    course.syncing = false
    course.syncProgress = null
  }
}

async function syncAllCourses() {
  syncing.value = true
  addLog('info', '🚀 Starting bulk sync to S3...')

  const syncableCourses = courses.value.filter(c => c.hasRequiredFiles && c.syncStatus !== 'synced')

  for (const course of syncableCourses) {
    await syncCourse(course.code)
  }

  syncing.value = false
  addLog('success', `✅ Bulk sync complete: ${syncableCourses.length} courses`)
}

async function downloadFromS3(courseCode) {
  const course = courses.value.find(c => c.code === courseCode)
  if (!course) return

  course.downloading = true
  addLog('info', `Downloading ${courseCode} from S3...`)

  try {
    const response = await fetch(`http://localhost:3456/api/storage/download/${courseCode}`, {
      method: 'POST'
    })

    if (response.ok) {
      const data = await response.json()
      addLog('success', `✅ ${courseCode}: ${data.filesDownloaded} files downloaded`)
      await loadCourses()
    } else {
      const error = await response.json()
      addLog('error', `❌ ${courseCode}: ${error.message}`)
    }
  } catch (error) {
    addLog('error', `❌ ${courseCode}: ${error.message}`)
  } finally {
    course.downloading = false
  }
}

function viewCourseDetails(courseCode) {
  router.push(`/courses/${courseCode}`)
}

function getSyncStatusClass(status) {
  switch (status) {
    case 'synced':
    case 'in_s3':
      return 'bg-green-600 text-white'
    case 'not_synced':
      return 'bg-yellow-600 text-white'
    case 'incomplete':
      return 'bg-red-600 text-white'
    default:
      return 'bg-slate-600 text-slate-300'
  }
}

function formatTime(isoString) {
  if (!isoString) return 'Never'
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function addLog(type, message) {
  const time = new Date().toLocaleTimeString()
  syncLog.value.unshift({ type, message, time })
  if (syncLog.value.length > 100) syncLog.value.pop()
}
</script>
