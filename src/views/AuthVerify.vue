<template>
  <div class="min-h-screen bg-canvas flex items-center justify-center p-8">
    <div class="text-center">
      <div v-if="loading" class="space-y-4">
        <div class="text-6xl animate-pulse">🔐</div>
        <p class="text-muted">Verifying your login...</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <div class="text-6xl">❌</div>
        <p class="text-danger">{{ error }}</p>
        <router-link to="/login" class="text-accent-2 hover:underline">
          Try again
        </router-link>
      </div>

      <div v-else class="space-y-4">
        <div class="text-6xl">✅</div>
        <p class="text-accent-2">Logged in successfully!</p>
        <p class="text-muted">Redirecting...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { verifyToken } = useAuth()

const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  const token = route.query.token

  if (!token) {
    error.value = 'No token provided'
    loading.value = false
    return
  }

  try {
    await verifyToken(token)
    // Redirect to home after successful login
    setTimeout(() => router.push('/'), 1500)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>
