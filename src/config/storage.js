/**
 * Storage Configuration
 * Abstracts storage backend (S3 or GitHub)
 */

const S3_BUCKET = 'popty-bach-lfs';
const AWS_REGION = 'eu-west-1';
const S3_BASE = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;

export const STORAGE_CONFIG = {
  // S3 configuration (primary)
  s3: {
    bucket: S3_BUCKET,
    region: AWS_REGION,
    coursesPath: `${S3_BASE}/courses`,
    getCourseFileUrl(courseCode, filename) {
      return `${S3_BASE}/courses/${courseCode}/${filename}`;
    },
    get manifestUrl() {
      return `${S3_BASE}/courses/manifest.json`;
    }
  },

  // GitHub configuration (fallback/legacy)
  github: {
    owner: 'thomascassidyzm',
    repo: 'ssi-dashboard-v7',
    branch: 'main',
    get rawBaseUrl() {
      return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}`;
    },
    get coursesPath() {
      return `${this.rawBaseUrl}/public/vfs/courses`;
    },
    getCourseFileUrl(courseCode, filename) {
      return `${this.coursesPath}/${courseCode}/${filename}`;
    },
    get manifestUrl() {
      return `${this.rawBaseUrl}/public/vfs/courses-manifest.json`;
    }
  }
};

// Export the active storage backend
// Default to S3, can be overridden via localStorage for testing
export function getStorageConfig() {
  // In DEV mode, use local files (localhost:5173)
  if (import.meta.env.DEV) {
    return {
      coursesPath: '/vfs/courses',
      getCourseFileUrl(courseCode, filename) {
        return `/vfs/courses/${courseCode}/${filename}`;
      },
      get manifestUrl() {
        return '/vfs/courses-manifest.json';
      }
    };
  }

  const backend = localStorage.getItem('storage_backend') || 's3';
  return STORAGE_CONFIG[backend] || STORAGE_CONFIG.s3;
}

// For components that import directly
export default STORAGE_CONFIG.s3;
