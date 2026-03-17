<template>
  <div class="login-form max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-lg p-8">
    <h2 class="text-2xl font-bold text-emerald-400 mb-6 text-center">
      Sign In to Popty
    </h2>

    <!-- Step 1: Email Entry -->
    <div v-if="step === 'email'" class="space-y-4">
      <div>
        <label class="block text-sm text-slate-400 mb-2">Email Address</label>
        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          @keyup.enter="handleSendOTP"
        />
      </div>

      <button
        @click="handleSendOTP"
        :disabled="loading || !email"
        class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-semibold transition-colors"
      >
        <span v-if="loading">Sending...</span>
        <span v-else>Send Login Code</span>
      </button>

      <p v-if="error" class="text-red-400 text-sm text-center">
        {{ error }}
      </p>
    </div>

    <!-- Step 2: OTP Code Entry -->
    <div v-else-if="step === 'code'" class="space-y-4">
      <p class="text-slate-300 text-center mb-4">
        We sent a 6-digit code to<br/>
        <strong class="text-emerald-400">{{ email }}</strong>
      </p>

      <div>
        <label class="block text-sm text-slate-400 mb-2">Enter Code</label>
        <input
          ref="codeInput"
          v-model="code"
          type="text"
          maxlength="6"
          placeholder="000000"
          class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-center text-2xl tracking-widest font-mono"
          @keyup.enter="handleVerifyOTP"
        />
      </div>

      <button
        @click="handleVerifyOTP"
        :disabled="loading || code.length < 6"
        class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-semibold transition-colors"
      >
        <span v-if="loading">Verifying...</span>
        <span v-else>Sign In</span>
      </button>

      <p v-if="error" class="text-red-400 text-sm text-center">
        {{ error }}
      </p>

      <div class="flex justify-between text-sm">
        <button
          @click="handleSendOTP"
          :disabled="loading"
          class="text-slate-400 hover:text-emerald-400 transition-colors"
        >
          Resend code
        </button>
        <button
          @click="reset"
          class="text-slate-400 hover:text-slate-300 transition-colors"
        >
          Different email
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { sendOTP, verifyOTP, loading, error } = useAuth()

const step = ref('email')
const email = ref('')
const code = ref('')
const codeInput = ref(null)

async function handleSendOTP() {
  if (!email.value) return

  try {
    await sendOTP(email.value)
    step.value = 'code'
    code.value = ''
    await nextTick()
    codeInput.value?.focus()
  } catch (err) {
    // Error handled in composable
  }
}

async function handleVerifyOTP() {
  if (code.value.length < 6) return

  try {
    await verifyOTP(email.value, code.value)
    // Redirect to home or the page they were trying to access
    const redirect = router.currentRoute.value.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    // Error handled in composable
  }
}

function reset() {
  step.value = 'email'
  code.value = ''
  error.value = null
}
</script>
