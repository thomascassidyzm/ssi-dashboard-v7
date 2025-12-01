<template>
  <div class="login-form max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-lg p-8">
    <h2 class="text-2xl font-bold text-emerald-400 mb-6 text-center">
      Sign In to SSi Dashboard
    </h2>

    <!-- Email Entry -->
    <div v-if="!linkSent" class="space-y-4">
      <div>
        <label class="block text-sm text-slate-400 mb-2">Email Address</label>
        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          @keyup.enter="sendLink"
        />
      </div>

      <button
        @click="sendLink"
        :disabled="loading || !email"
        class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-semibold transition-colors"
      >
        <span v-if="loading">Sending...</span>
        <span v-else>Send Magic Link</span>
      </button>

      <!-- Dev bypass for testing -->
      <button
        v-if="isDev"
        @click="devLogin"
        :disabled="loading"
        class="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors"
      >
        Dev Login (tom@ssi.com)
      </button>

      <p v-if="error" class="text-red-400 text-sm text-center">
        {{ error }}
      </p>
    </div>

    <!-- Success State -->
    <div v-else class="text-center space-y-4">
      <div class="text-6xl mb-4">✉️</div>
      <p class="text-slate-300">
        We sent a login link to<br/>
        <strong class="text-emerald-400">{{ email }}</strong>
      </p>
      <p class="text-sm text-slate-500">
        Check your email and click the link to sign in.<br/>
        The link expires in 15 minutes.
      </p>

      <!-- Dev mode: Show link directly -->
      <div v-if="devLink" class="mt-6 p-4 bg-slate-900 rounded-lg border border-yellow-500/50">
        <p class="text-xs text-yellow-400 mb-2">Development Mode:</p>
        <a :href="devLink" class="text-emerald-400 hover:underline text-sm break-all">
          {{ devLink }}
        </a>
      </div>

      <button
        @click="reset"
        class="text-slate-400 hover:text-slate-300 text-sm mt-4"
      >
        Use a different email
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { requestMagicLink, devBypassLogin, loading, error } = useAuth()

const email = ref('')
const linkSent = ref(false)
const devLink = ref(null)

// Only show dev login in development mode
const isDev = computed(() => import.meta.env.DEV)

async function sendLink() {
  if (!email.value) return

  try {
    const result = await requestMagicLink(email.value)
    linkSent.value = true
    devLink.value = result.link || null // Only in dev mode
  } catch (err) {
    // Error is handled in composable
  }
}

async function devLogin() {
  try {
    await devBypassLogin('tom@ssi.com')
    router.push('/')
  } catch (err) {
    // Error is handled in composable
  }
}

function reset() {
  email.value = ''
  linkSent.value = false
  devLink.value = null
}
</script>
