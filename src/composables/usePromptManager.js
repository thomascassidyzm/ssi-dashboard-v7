import { ref } from 'vue'
import { baseURL } from '../services/api'

export function usePromptManager(phaseId) {
  const prompt = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)
  const promptMeta = ref(null)

  // Fetch prompt from APML registry via API
  const fetchPrompt = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${baseURL}/api/prompts/${phaseId}`)
      const data = await response.json()

      if (response.ok) {
        prompt.value = data.prompt
        promptMeta.value = {
          phase: data.phase,
          name: data.name,
          version: data.version,
          lastModified: data.lastModified
        }
      } else {
        throw new Error(data.error || 'Failed to fetch prompt')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching prompt:', err)
    } finally {
      loading.value = false
    }
  }

  // Save updated prompt to APML file
  const savePrompt = async (changelog = '', improvedBy = 'human') => {
    saving.value = true
    error.value = null

    try {
      const response = await fetch(`${baseURL}/api/prompts/${phaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.value,
          changelog,
          improvedBy
        })
      })

      const data = await response.json()

      if (response.ok) {
        promptMeta.value.version = data.version
        return {success: true, message: data.message }
      } else {
        throw new Error(data.error || 'Failed to save prompt')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error saving prompt:', err)
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    prompt,
    loading,
    saving,
    error,
    promptMeta,
    fetchPrompt,
    savePrompt
  }
}
