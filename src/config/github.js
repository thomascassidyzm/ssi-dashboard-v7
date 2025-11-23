/**
 * GitHub Configuration
 *
 * Dashboard fetches course data from GitHub raw content API instead of bundling it.
 * This keeps Vercel deployments lightweight and separates production tooling from course data.
 */

export const GITHUB_CONFIG = {
  // GitHub repository info
  owner: 'thomascassidyzm',
  repo: 'ssi-dashboard-v7',
  branch: 'main',

  // Base URL for raw content
  get rawBaseUrl() {
    return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}`
  },

  // Course data path
  get coursesPath() {
    return `${this.rawBaseUrl}/public/vfs/courses`
  },

  // Helper to build course file URL
  getCourseFileUrl(courseCode, filename) {
    return `${this.coursesPath}/${courseCode}/${filename}`
  },

  // Manifest URL (always available, lightweight)
  get manifestUrl() {
    return `${this.rawBaseUrl}/public/vfs/courses-manifest.json`
  }
}

// For local development, always use localhost for immediate feedback
// This lets you see manifest changes immediately after regeneration
if (import.meta.env.DEV) {
  GITHUB_CONFIG.rawBaseUrl = 'http://localhost:5173'
  GITHUB_CONFIG.coursesPath = '/vfs/courses'
  console.log('[GitHub Config] DEV mode: Using local VFS at http://localhost:5173/vfs')
}
