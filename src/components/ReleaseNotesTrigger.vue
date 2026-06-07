<template>
  <div class="release-notes-trigger">
    <div class="rnt-row">
      <button class="rnt-btn" :disabled="generating || publishing" @click="onGenerate">
        {{ generating ? 'Generating…' : 'Generate release notes' }}
      </button>
      <button
        class="rnt-btn rnt-btn--ghost"
        :disabled="!draft || publishing || generating"
        @click="onPublish"
      >
        {{ publishing ? 'Publishing…' : 'Publish' }}
      </button>
    </div>

    <p v-if="status" class="rnt-status" :class="{ 'rnt-status--err': !!error }">{{ status }}</p>

    <p class="rnt-hint">
      Reads the learning-app's <code>main..staging</code> changes and asks Claude (on the subscription)
      to write a plain, learner-facing note. Generates a draft you can edit, then publish.
    </p>

    <!-- Editable draft -->
    <div v-if="draft" class="rnt-draft">
      <div class="rnt-meta">
        Draft · version <code>{{ draft.version }}</code> · {{ draft.commitCount }} changes
      </div>

      <label class="rnt-label">Headline</label>
      <input v-model="editHeadline" class="rnt-input" type="text" placeholder="Headline" />

      <label class="rnt-label">Bullets (one per line)</label>
      <textarea v-model="editBullets" class="rnt-textarea" rows="6" placeholder="One bullet per line"></textarea>

      <p v-if="published" class="rnt-published">
        Published — live for learners.
        <a href="https://saysomethingin.app/admin/release-notes" target="_blank" rel="noopener">View in the app</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useReleaseNotesGen } from '@/composables/useReleaseNotesGen'

const { generating, publishing, error, draft, published, generate, publish } = useReleaseNotesGen()
const status = ref('')
const editHeadline = ref('')
const editBullets = ref('')

// When a fresh draft arrives, seed the editable fields with its content.
watch(draft, (d) => {
  if (d) {
    editHeadline.value = d.headline || ''
    editBullets.value = (d.bullets || []).join('\n')
  }
})

async function onGenerate() {
  status.value = ''
  try {
    const d = await generate()
    status.value = `Draft ready (${d.commitCount} changes in main..staging). Review, edit, then Publish.`
  } catch (e) {
    status.value = `Failed: ${e.message}`
  }
}

async function onPublish() {
  if (!draft.value) return
  status.value = ''
  const bullets = editBullets.value.split('\n').map(s => s.trim()).filter(Boolean)
  try {
    await publish({ id: draft.value.id, headline: editHeadline.value.trim(), bullets })
    status.value = 'Published — live for learners.'
  } catch (e) {
    status.value = `Failed: ${e.message}`
  }
}
</script>

<style scoped>
.release-notes-trigger { display: flex; flex-direction: column; gap: 0.6rem; }
.rnt-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.rnt-btn {
  padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid transparent;
  background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer;
}
.rnt-btn:disabled { opacity: 0.55; cursor: default; }
.rnt-btn--ghost { background: transparent; color: #a5b4fc; border-color: #4f46e5; }
.rnt-status { font-size: 0.85rem; color: #9ca3af; margin: 0; }
.rnt-status--err { color: #f87171; }
.rnt-hint { font-size: 0.78rem; color: #6b7280; margin: 0; max-width: 70ch; }
.rnt-hint code { background: #1f2937; padding: 0.05rem 0.35rem; border-radius: 0.25rem; }
.rnt-draft {
  display: flex; flex-direction: column; gap: 0.35rem;
  background: #111827; border: 1px solid #1f2937; border-radius: 0.6rem; padding: 0.9rem 1rem; margin-top: 0.25rem;
}
.rnt-meta { font-size: 0.8rem; color: #6b7280; margin-bottom: 0.25rem; }
.rnt-meta code { background: #1f2937; padding: 0.05rem 0.35rem; border-radius: 0.25rem; color: #a5b4fc; }
.rnt-label { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.03em; color: #9ca3af; margin-top: 0.35rem; }
.rnt-input, .rnt-textarea {
  width: 100%; box-sizing: border-box; background: #0b1220; border: 1px solid #1f2937; border-radius: 0.4rem;
  color: #e5e7eb; font: inherit; font-size: 0.9rem; padding: 0.45rem 0.6rem; resize: vertical;
}
.rnt-input:focus, .rnt-textarea:focus { outline: none; border-color: #4f46e5; }
.rnt-published { font-size: 0.85rem; color: #a7f3d0; margin: 0.4rem 0 0; }
.rnt-published a { color: #a5b4fc; }
</style>
