<template>
  <div class="relative">
    <!-- Compact indicator -->
    <button
      @click="showDetails = !showDetails"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition"
      :class="statusClasses"
    >
      <span v-if="loading" class="animate-pulse">...</span>
      <span v-else-if="error" class="text-red-400">Schema Error</span>
      <span v-else-if="validation?.valid" class="flex items-center gap-1">
        <span class="w-2 h-2 bg-emerald-400 rounded-full"></span>
        Schema OK
      </span>
      <span v-else class="flex items-center gap-1">
        <span class="w-2 h-2 bg-red-400 rounded-full"></span>
        Schema Drift
      </span>
    </button>

    <!-- Details dropdown -->
    <div
      v-if="showDetails && !loading"
      class="absolute right-0 top-full mt-2 w-80 bg-surface border border-line rounded-lg shadow-xl z-50 p-4"
    >
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-semibold text-ink">Schema Validation</h4>
        <button @click="runValidation" class="text-xs text-emerald-400 hover:text-emerald-300">
          Refresh
        </button>
      </div>

      <div v-if="error" class="text-red-400 text-sm">
        {{ error }}
      </div>

      <div v-else-if="validation" class="space-y-3">
        <!-- Overall status -->
        <div class="flex items-center gap-2">
          <span :class="validation.valid ? 'text-emerald-400' : 'text-red-400'" class="font-medium">
            {{ validation.valid ? 'VALID' : 'DRIFT DETECTED' }}
          </span>
          <span class="text-faint text-xs">
            v{{ validation.schemaVersion }}
          </span>
        </div>

        <!-- Summary -->
        <div class="text-xs text-muted space-y-1">
          <div>Tables: {{ validation.summary.matched }}/{{ validation.summary.total }} matched</div>
          <div v-if="validation.summary.missing > 0" class="text-red-400">
            Missing: {{ validation.summary.missing }}
          </div>
          <div v-if="validation.summary.columnIssues > 0" class="text-yellow-400">
            Column issues: {{ validation.summary.columnIssues }}
          </div>
        </div>

        <!-- Table details -->
        <div class="border-t border-line pt-2 space-y-1">
          <div
            v-for="(result, tableName) in validation.tables"
            :key="tableName"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-ink font-mono">{{ tableName }}</span>
            <span :class="getStatusClass(result.status)">
              {{ result.status }}
              <span v-if="result.columnCount" class="text-faint">({{ result.columnCount }})</span>
            </span>
          </div>
        </div>

        <!-- Validated timestamp -->
        <div class="text-xs text-faint pt-2 border-t border-line">
          Last checked: {{ formatTime(validation.validatedAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getProductionApiUrl } from '../services/api.js'

const loading = ref(true)
const error = ref(null)
const validation = ref(null)
const showDetails = ref(false)

const statusClasses = computed(() => {
  if (loading.value) return 'bg-surface-2 text-muted'
  if (error.value) return 'bg-red-900/50 text-red-400 hover:bg-red-900/70'
  if (validation.value?.valid) return 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
  return 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
})

function getStatusClass(status) {
  if (status === 'OK') return 'text-emerald-400'
  if (status === 'MISSING') return 'text-red-400'
  return 'text-yellow-400'
}

function formatTime(isoString) {
  if (!isoString) return 'Never'
  const date = new Date(isoString)
  return date.toLocaleTimeString()
}

async function runValidation() {
  loading.value = true
  error.value = null

  try {
    const productionApiUrl = getProductionApiUrl()
    const response = await fetch(`${productionApiUrl}/api/production/schema/validate`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    validation.value = await response.json()
  } catch (err) {
    error.value = err.message
    console.error('Schema validation failed:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  runValidation()
})
</script>
