import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs-extra'

// Get git commit hash at build time (fallback for Vercel where .git doesn't exist)
let gitCommit = 'unknown'
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim()
} catch (err) {
  // Git not available (e.g., Vercel build), use env var or timestamp
  gitCommit = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || `build-${Date.now()}`
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
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit)
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  publicDir: 'public'
})
