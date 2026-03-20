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
          @keyup.enter="goToAuth"
        />
      </div>

      <button
        @click="goToAuth"
        :disabled="loading || !email"
        class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-semibold transition-colors"
      >
        <span v-if="loading">Sending code...</span>
        <span v-else>Send Login Code</span>
      </button>

      <p v-if="error" class="text-red-400 text-sm text-center">
        {{ error }}
      </p>
    </div>

    <!-- Step 2: Password Entry -->
    <div v-else-if="step === 'password'" class="space-y-4">
      <p class="text-slate-300 text-center mb-2">
        <strong class="text-emerald-400">{{ email }}</strong>
      </p>

      <div>
        <label class="block text-sm text-slate-400 mb-2">Password</label>
        <input
          ref="passwordInput"
          v-model="password"
          type="password"
          placeholder="Enter your password"
          class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          @keyup.enter="handlePasswordLogin"
        />
      </div>

      <button
        @click="handlePasswordLogin"
        :disabled="loading || !password"
        class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-semibold transition-colors"
      >
        <span v-if="loading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>

      <p v-if="error" class="text-red-400 text-sm text-center">
        {{ error }}
      </p>

      <div class="flex justify-between text-sm">
        <button
          @click="switchToOTP"
          :disabled="loading"
          class="text-slate-400 hover:text-emerald-400 transition-colors"
        >
          Use login code instead
        </button>
        <button
          @click="reset"
          class="text-slate-400 hover:text-slate-300 transition-colors"
        >
          Different email
        </button>
      </div>
    </div>

    <!-- Step 3: OTP Code Entry -->
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
          @click="switchToPassword"
          class="text-slate-400 hover:text-slate-300 transition-colors"
        >
          Use password
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
const { sendOTP, verifyOTP, signInWithPassword, loading, error } = useAuth()

const step = ref('email')
const email = ref('')
const password = ref('')
const code = ref('')
const codeInput = ref(null)
const passwordInput = ref(null)

async function goToAuth() {
  if (!email.value) return
  error.value = null
  // OTP is the default — send code immediately
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

async function handlePasswordLogin() {
  if (!password.value) return

  try {
    await signInWithPassword(email.value, password.value)
    const redirect = router.currentRoute.value.query.redirect || '/'
    window.location.href = redirect
  } catch (err) {
    // If "Invalid login credentials", stay on password step — user can retry or switch to OTP
  }
}

function switchToPassword() {
  error.value = null
  step.value = 'password'
  password.value = ''
  nextTick(() => passwordInput.value?.focus())
}

async function switchToOTP() {
  error.value = null
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

async function handleSendOTP() {
  try {
    await sendOTP(email.value)
    code.value = ''
  } catch (err) {
    // Error handled in composable
  }
}

async function handleVerifyOTP() {
  if (code.value.length < 6) return

  try {
    await verifyOTP(email.value, code.value)
    const redirect = router.currentRoute.value.query.redirect || '/'
    window.location.href = redirect
  } catch (err) {
    // Error handled in composable
  }
}

function reset() {
  step.value = 'email'
  password.value = ''
  code.value = ''
  error.value = null
}
</script>
