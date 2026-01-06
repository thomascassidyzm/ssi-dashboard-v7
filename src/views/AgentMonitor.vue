<template>
  <div class="agent-monitor-page">
    <AgentSwimlane
      v-if="courseCode"
      :course-code="courseCode"
      :poll-interval="3000"
    />

    <!-- No course selected state -->
    <div v-else class="no-course">
      <div class="no-course-content">
        <div class="no-course-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0-6v6m18-6v6"/>
          </svg>
        </div>
        <h2>Agent Swimlane Monitor</h2>
        <p>Select a course to view agent activity</p>

        <div class="course-selector">
          <label>Course Code</label>
          <div class="input-row">
            <input
              v-model="inputCourseCode"
              type="text"
              placeholder="e.g., zho_for_eng"
              @keyup.enter="navigateToCourse"
            />
            <button @click="navigateToCourse" :disabled="!inputCourseCode">
              Monitor
            </button>
          </div>
        </div>

        <div class="recent-courses" v-if="recentCourses.length">
          <span class="recent-label">Recent:</span>
          <button
            v-for="course in recentCourses"
            :key="course"
            class="recent-course"
            @click="inputCourseCode = course; navigateToCourse()"
          >
            {{ course }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AgentSwimlane from '../components/AgentSwimlane.vue'

const route = useRoute()
const router = useRouter()

const courseCode = computed(() => route.params.courseCode || '')
const inputCourseCode = ref('')
const recentCourses = ref([])

function navigateToCourse() {
  if (inputCourseCode.value) {
    // Save to recent courses
    const recent = JSON.parse(localStorage.getItem('recentAgentMonitorCourses') || '[]')
    if (!recent.includes(inputCourseCode.value)) {
      recent.unshift(inputCourseCode.value)
      localStorage.setItem('recentAgentMonitorCourses', JSON.stringify(recent.slice(0, 5)))
    }

    router.push(`/monitor/${inputCourseCode.value}`)
  }
}

onMounted(() => {
  recentCourses.value = JSON.parse(localStorage.getItem('recentAgentMonitorCourses') || '[]')
})
</script>

<style scoped>
.agent-monitor-page {
  min-height: 100vh;
  background: #0a0f1a;
}

.no-course {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(180deg, #0a0f1a 0%, #0f172a 100%);
}

.no-course-content {
  text-align: center;
  max-width: 400px;
}

.no-course-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981 0%, rgba(16, 185, 129, 0.4) 100%);
  border-radius: 1rem;
}

.no-course-icon svg {
  width: 2rem;
  height: 2rem;
  color: #0a0f1a;
}

.no-course-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}

.no-course-content p {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0 0 2rem 0;
}

.course-selector {
  text-align: left;
}

.course-selector label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-row input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  color: #f1f5f9;
  font-size: 0.875rem;
  font-family: 'SF Mono', Monaco, monospace;
}

.input-row input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.input-row input::placeholder {
  color: #475569;
}

.input-row button {
  padding: 0.75rem 1.5rem;
  background: #10b981;
  border: none;
  border-radius: 0.5rem;
  color: #0a0f1a;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.input-row button:hover:not(:disabled) {
  background: #34d399;
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recent-courses {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.recent-label {
  font-size: 0.75rem;
  color: #64748b;
}

.recent-course {
  padding: 0.375rem 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.375rem;
  color: #94a3b8;
  font-size: 0.75rem;
  font-family: 'SF Mono', Monaco, monospace;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-course:hover {
  border-color: #10b981;
  color: #10b981;
}
</style>
