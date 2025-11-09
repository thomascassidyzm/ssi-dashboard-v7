<template>
  <div class="mb-8">
    <h3 class="text-lg font-medium text-slate-300 mb-4">Select Execution Mode</h3>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Web Mode (Recommended) -->
      <button
        @click="selectMode('web')"
        :class="[
          'p-6 rounded-lg border-2 transition text-left relative',
          modelValue === 'web'
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/50'
        ]"
      >
        <div class="absolute top-3 right-3">
          <span v-if="modelValue === 'web'" class="px-2 py-1 text-xs font-semibold bg-emerald-500 text-white rounded">
            Selected
          </span>
          <span v-else class="px-2 py-1 text-xs font-semibold bg-blue-500/80 text-white rounded">
            Recommended
          </span>
        </div>

        <div class="text-3xl mb-3">🌐</div>
        <h4 class="text-lg font-semibold text-slate-100 mb-2">Claude Code on the Web</h4>
        <p class="text-sm text-slate-400 mb-4">Browser automation to claude.ai/code</p>

        <div class="space-y-2 mb-4">
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Uses Claude Pro subscription ($0 cost)</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Runs on Anthropic servers (~8GB RAM saved)</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">34 parallel agents in 20-30 minutes</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Manual prompt pasting (better control)</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-600/50">
          <div class="text-xs text-slate-500">
            <span class="font-semibold text-slate-400">Requirements:</span> Browser, Claude Pro account
          </div>
        </div>
      </button>

      <!-- Local Mode -->
      <button
        @click="selectMode('local')"
        :class="[
          'p-6 rounded-lg border-2 transition text-left relative',
          modelValue === 'local'
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/50'
        ]"
      >
        <div class="absolute top-3 right-3">
          <span v-if="modelValue === 'local'" class="px-2 py-1 text-xs font-semibold bg-emerald-500 text-white rounded">
            Selected
          </span>
        </div>

        <div class="text-3xl mb-3">💻</div>
        <h4 class="text-lg font-semibold text-slate-100 mb-2">Local Machine</h4>
        <p class="text-sm text-slate-400 mb-4">iTerm2 windows + Claude CLI</p>

        <div class="space-y-2 mb-4">
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Fully automated (no manual steps)</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Parallel agent spawning in iTerm2</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-amber-400 mt-0.5">⚠</span>
            <span class="text-slate-300">API costs (~$0.34/batch)</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-amber-400 mt-0.5">⚠</span>
            <span class="text-slate-300">High RAM usage (~10GB for 34 agents)</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-600/50">
          <div class="text-xs text-slate-500">
            <span class="font-semibold text-slate-400">Requirements:</span> iTerm2, Claude CLI, API key
          </div>
        </div>
      </button>

      <!-- API Mode -->
      <button
        @click="selectMode('api')"
        :class="[
          'p-6 rounded-lg border-2 transition text-left relative',
          modelValue === 'api'
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/50'
        ]"
      >
        <div class="absolute top-3 right-3">
          <span v-if="modelValue === 'api'" class="px-2 py-1 text-xs font-semibold bg-emerald-500 text-white rounded">
            Selected
          </span>
        </div>

        <div class="text-3xl mb-3">⚡</div>
        <h4 class="text-lg font-semibold text-slate-100 mb-2">Direct API</h4>
        <p class="text-sm text-slate-400 mb-4">Server-side Anthropic API calls</p>

        <div class="space-y-2 mb-4">
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Fully automated server-side execution</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">No local resources needed</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-amber-400 mt-0.5">⚠</span>
            <span class="text-slate-300">API costs (~$0.34/batch)</span>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <span class="text-green-400 mt-0.5">✓</span>
            <span class="text-slate-300">Sequential phase execution</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-600/50">
          <div class="text-xs text-slate-500">
            <span class="font-semibold text-slate-400">Requirements:</span> API key in .env file
          </div>
        </div>
      </button>
    </div>

    <!-- Info Box -->
    <div class="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div class="flex items-start gap-3">
        <div class="text-blue-400 text-xl">ℹ️</div>
        <div class="text-sm text-slate-300">
          <p class="font-medium mb-1">Execution Mode Comparison</p>
          <p class="text-slate-400">
            <span class="font-semibold text-emerald-400">Web Mode</span> is recommended for cost-effective generation using your Claude Pro subscription.
            <span class="font-semibold text-slate-300">Local Mode</span> offers full automation with iTerm2 but uses API credits.
            <span class="font-semibold text-purple-400">API Mode</span> provides fully automated server-side execution (no local resources needed).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'web', // Default to web mode (recommended)
    validator: (value) => ['local', 'api', 'web'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

const selectMode = (mode) => {
  emit('update:modelValue', mode)
}
</script>
