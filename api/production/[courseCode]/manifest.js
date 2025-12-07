/**
 * GET /api/production/:courseCode/manifest
 * Returns the course manifest for Production Suite
 */

import { readCourseFile, courseFileExists } from '../../lib/s3-course.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code is required' });
  }

  try {
    // First check if course_manifest.json exists
    const manifestExists = await courseFileExists(courseCode, 'course_manifest.json');

    if (!manifestExists) {
      // Try lego_baskets.json as fallback for courses without audio yet
      const basketsExists = await courseFileExists(courseCode, 'lego_baskets.json');

      if (!basketsExists) {
        return res.status(404).json({
          error: 'Course not found',
          message: `No manifest or baskets found for course: ${courseCode}`
        });
      }

      // Return baskets as a basic manifest structure
      const { content: baskets } = await readCourseFile(courseCode, 'lego_baskets.json');

      return res.json({
        courseCode,
        status: 'pre_audio',
        message: 'Course exists but audio has not been generated yet',
        hasManifest: false,
        hasBaskets: true,
        seedCount: Array.isArray(baskets) ? baskets.length : Object.keys(baskets).length,
        baskets
      });
    }

    // Return the full manifest
    const { content: manifest, etag } = await readCourseFile(courseCode, 'course_manifest.json');

    res.setHeader('ETag', etag || '');
    res.json(manifest);

  } catch (err) {
    console.error(`[Production] Manifest fetch failed for ${courseCode}:`, err.message);

    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Course not found',
        message: err.message
      });
    }

    res.status(500).json({
      error: 'Failed to fetch manifest',
      message: err.message
    });
  }
}
