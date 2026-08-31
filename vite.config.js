import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs-extra'

// Get git commit hash at build time (fallback for Vercel where .git doesn't exist)
let gitCommit = 'unknown'
try {
  gitCommit = execSync('git rev-parse --short=8 HEAD').toString().trim()
} catch (err) {
  // Git not available (e.g., Vercel build), use env var or timestamp
  gitCommit = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || `build-${Date.now()}`
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Custom plugin to exclude VFS course data from build
    // Dashboard will fetch course data from GitHub instead
    {
      name: 'exclude-vfs-courses',
      closeBundle() {
        // After build, remove course data but keep manifest
        const vfsPath = path.resolve(__dirname, 'dist/vfs/courses')
        if (fs.existsSync(vfsPath)) {
          const items = fs.readdirSync(vfsPath)
          for (const item of items) {
            const itemPath = path.join(vfsPath, item)
            try {
              // Use lstatSync to handle symlinks (doesn't follow them)
              const stat = fs.lstatSync(itemPath)
              if (stat.isDirectory() || stat.isSymbolicLink()) {
                // Remove course directories and symlinks (spa_for_eng, cmn_for_eng, zho_for_eng, etc.)
                fs.removeSync(itemPath)
                console.log(`✓ Excluded from build: vfs/courses/${item}`)
              }
            } catch (err) {
              // Skip if file doesn't exist or can't be accessed
              console.log(`⚠ Skipped: vfs/courses/${item} (${err.message})`)
            }
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit)
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3470',
        changeOrigin: true,
        secure: false,
        // Add x-forwarded-for so dev-proxied requests are NOT mistaken for
        // same-host service-mesh calls (isLoopbackDirectRequest in
        // production-api). Without it, the course-scope gate silently no-ops
        // for all `npm run dev` traffic and never gets exercised before prod.
        xfwd: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Write a version file for stale-tab detection
    rollupOptions: {
      plugins: [{
        name: 'write-version',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify({ version: gitCommit, built: new Date().toISOString() })
          })
        }
      }]
    }
  },
  publicDir: 'public',
  test: {
    // Real vitest specs only — exclude playwright's e2e/*.spec.js (run via
    // `npx playwright test` against their own per-folder playwright.config.js,
    // not vitest) and stray gitignored worktree/scratch checkouts that
    // duplicate the whole services/ tree and would otherwise be double-collected.
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      'scripts/**',
      '.worktrees/**',
      '.claude/worktrees/**',
      // Standalone scripts named *.test.cjs that use node:test/bare assert +
      // process.exit(), not vitest's describe/it — run directly with `node
      // <file>`, not through vitest. Collecting them here just logs
      // "No test suite found" (or a bogus process.exit failure). There is no
      // naming convention that separates these from real *.test.cjs vitest
      // specs living in the same directories (e.g. tools/pod-sync-*.test.cjs
      // IS vitest), so this has to be an explicit file list — regenerate it
      // with:
      //   for f in $(git ls-files '*.test.cjs' '*.test.js' '*.test.mjs'); do
      //     grep -q "from 'vitest'" "$f" || echo "$f"
      //   done
      'ops/watchdog/holmes-availability-sentinel.test.cjs',
      'services/voice-engine/clone-source.test.cjs',
      'services/voice-engine/recordist-clip-variant.test.cjs',
      'services/voice-engine/recordist-queue.test.cjs',
      'tools/audio-regen-probe/*.test.cjs',
      'tools/distinctions/*.test.cjs',
      'tools/frame-layer/derive-and-baskets.test.cjs',
      'tools/frame-layer/extract-patterns.test.cjs',
      'tools/phrase-lab/score.test.cjs',
      'tools/pod-recast-target-pair.test.cjs',
      'tools/pod-voice-pool-reorder.test.cjs',
      'tools/pods/parse-pod-markdown.test.cjs',
      'tools/pods/splice-sentence-clips.test.cjs'
    ]
  }
})
