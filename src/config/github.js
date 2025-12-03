/**
 * Course Data Configuration
 *
 * Course data is stored in S3 (popty-bach-lfs bucket).
 * Frontend fetches via API endpoints to avoid CORS issues.
 *
 * Architecture:
 * - S3 is the Single Source of Truth for course data
 * - API endpoints proxy to S3 (/api/courses/:code/files/:filename)
 * - Frontend never fetches directly from S3
 */

import { baseURL } from '../services/api.js'

export const GITHUB_CONFIG = {
  // Named GITHUB_CONFIG for backward compatibility with existing code
  // Actually fetches from API which proxies to S3

  // Helper to build course file URL (via API proxy)
  getCourseFileUrl(courseCode, filename) {
    // Use API endpoint that proxies to S3
    return `${baseURL}/api/courses/${courseCode}/files/${filename}`
  },

  // Manifest URL (via API)
  get manifestUrl() {
    return `${baseURL}/api/courses/manifest`
  }
}

// For local development, use localhost for immediate feedback
if (import.meta.env.DEV) {
  console.log('[Course Config] Using API proxy for course files')
}
