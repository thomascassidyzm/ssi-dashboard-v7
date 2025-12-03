/**
 * Storage Configuration
 *
 * All course data is stored in S3 (popty-bach-lfs bucket).
 * Frontend fetches via API proxy to avoid CORS issues.
 *
 * Architecture:
 * - S3 is the Single Source of Truth for course data
 * - API endpoints proxy to S3 (/api/courses/:code/files/:filename)
 * - Frontend NEVER fetches directly from S3
 */

import { baseURL } from '../services/api.js'

export const STORAGE_CONFIG = {
  // API proxy configuration (routes to S3 via backend)
  s3: {
    bucket: 'popty-bach-lfs',
    region: 'eu-west-1',
    getCourseFileUrl(courseCode, filename) {
      // Use API endpoint that proxies to S3
      return `${baseURL}/api/courses/${courseCode}/files/${filename}`;
    },
    get manifestUrl() {
      return `${baseURL}/api/courses/manifest`;
    }
  },

  // GitHub configuration (legacy fallback - also via API)
  github: {
    getCourseFileUrl(courseCode, filename) {
      return `${baseURL}/api/courses/${courseCode}/files/${filename}`;
    },
    get manifestUrl() {
      return `${baseURL}/api/courses/manifest`;
    }
  }
};

// Export the active storage backend
// Always use S3 API proxy - the dashboard runs remotely (Vercel)
// and tunnels to local machines for processing, but reads data from S3
export function getStorageConfig() {
  // Always use S3 API proxy - no local dev mode
  return STORAGE_CONFIG.s3;
}

// For components that import directly
export default STORAGE_CONFIG.s3;
