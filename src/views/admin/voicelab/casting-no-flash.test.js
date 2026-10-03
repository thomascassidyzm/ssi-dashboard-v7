/**
 * Saving a pick must not blank every language (Tom, 2026-10-03: "whenever I make
 * a change it refreshes the whole page, it disappears for all langs"). The cause
 * was `loading.value = true` on EVERY load, with the table behind `v-else` of it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

for (const f of ['CastingPanel.vue', 'PodVoicesPanel.vue', 'LanguagesPanel.vue']) {
  describe(f, () => {
    it('only gates the table on the first read, never on a reload', () => {
      const src = readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), 'utf8')
      const body = src.slice(src.indexOf('async function load ('), src.indexOf('onMounted(load)'))
      expect(body).not.toMatch(/loading\.value = true/)
    })
  })
}
