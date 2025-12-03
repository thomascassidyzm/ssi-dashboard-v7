/**
 * GET /api/courses/:courseCode/files/:filename
 * Proxy course files from S3 to avoid CORS issues
 *
 * Supported files: lego_pairs.json, lego_baskets.json, introductions.json,
 *                  seed_pairs.json, course_manifest.json
 */

import { readCourseFile } from '../../../lib/s3-course.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode, filename } = req.query;

  if (!courseCode || !filename) {
    return res.status(400).json({ error: 'Missing courseCode or filename' });
  }

  // Validate filename to prevent directory traversal
  const allowedFiles = [
    'lego_pairs.json',
    'lego_baskets.json',
    'introductions.json',
    'seed_pairs.json',
    'course_manifest.json',
    'draft_lego_pairs.json'
  ];

  if (!allowedFiles.includes(filename)) {
    return res.status(400).json({
      error: 'Invalid filename',
      allowed: allowedFiles
    });
  }

  try {
    const { content, etag } = await readCourseFile(courseCode, filename);

    // Set cache headers (5 minutes for course data)
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    if (etag) {
      res.setHeader('ETag', etag);
    }

    res.json(content);
  } catch (err) {
    if (err.code === 'NOT_FOUND' || err.code === 'NoSuchKey' || err.name === 'NoSuchKey') {
      return res.status(404).json({
        error: 'File not found',
        courseCode,
        filename
      });
    }

    console.error(`[Files] Failed to read ${courseCode}/${filename}:`, err.message);
    res.status(500).json({ error: err.message });
  }
}
