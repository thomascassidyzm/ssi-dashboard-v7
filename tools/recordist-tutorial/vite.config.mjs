// Build config for the recordist practice page — dev/preview only.
//
// A SEPARATE config, and a separate root, so that:
//   - the dashboard's own `npm run build` is untouched;
//   - the bundle contains only what TutorialStudio.vue imports. There is no
//     router, no auth, no API client, and therefore nothing that could upload a
//     practice take even by accident.
//
// Build:  npx vite build --config tools/recordist-tutorial/vite.config.mjs
// Output: tools/recordist-tutorial/dist/  (gitignored; served by
//         serve-recordist-tutorial.cjs, never by a vite dev server — a dev
//         server would put the whole of /src behind the preview URL.)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..')

export default defineConfig({
  root: path.join(here, 'app'),
  base: './',
  plugins: [vue()],
  resolve: {
    alias: { '@': path.join(repo, 'src') },
  },
  build: {
    outDir: path.join(here, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
