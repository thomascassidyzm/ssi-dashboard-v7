<template>
  <div class="copy-wrap">
    <header>
      <h1>Copy</h1>
      <p class="note">
        Every piece of copy a learner reads, editable in place. Pick one, change the words,
        and they save as you type. Nothing goes live in the app until someone maps the edits
        back into the code, so you can never break anything by editing here.
      </p>
    </header>

    <p v-if="error" class="err">{{ error }}</p>
    <p v-else-if="loading" class="note">Loading…</p>

    <ul v-else class="docs">
      <li v-for="d in docs" :key="d.id">
        <router-link :to="`/copy/${d.id}`" class="doc">
          <span class="title">{{ d.title }}</span>
          <span class="blurb">{{ d.blurb }}</span>
          <span class="meta">
            <template v-if="!d.seeded">not set up yet</template>
            <template v-else-if="d.versions === 0">not edited yet</template>
            <template v-else>{{ d.versions }} save{{ d.versions === 1 ? '' : 's' }}<template v-if="d.savedBy"> · last by {{ d.savedBy }}</template></template>
          </span>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { getAccessToken } = useAuth()
const docs = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const token = await getAccessToken()
    const res = await fetch('/api/copy?list=1', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error || ''}`)
    docs.value = (await res.json()).docs || []
  } catch (e) {
    error.value = `Could not load the list — ${e.message}. Reload the page.`
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.copy-wrap { max-width: 900px; margin: 0 auto; padding: 16px 12px; }
h1 { font-size: 18px; margin: 0 0 6px; font-weight: 600; }
.note { margin: 0; font-size: 14px; opacity: 0.75; line-height: 1.5; }
.err { color: #c0392b; font-size: 14px; }
.docs { list-style: none; padding: 0; margin: 18px 0 0; display: flex; flex-direction: column; gap: 10px; }
.doc {
  display: flex; flex-direction: column; gap: 4px; padding: 14px;
  border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 10px;
  color: inherit; text-decoration: none;
}
.title { font-size: 16px; font-weight: 600; }
.blurb { font-size: 14px; opacity: 0.75; line-height: 1.5; }
.meta { font-size: 13px; opacity: 0.6; }
</style>
