/**
 * POST /api/courses/[courseCode]/sync
 * Sync local course files to S3
 *
 * This endpoint reads course files from the local VFS and uploads them to S3.
 * It's the dashboard-triggerable version of the CLI sync tool.
 *
 * Request body (optional):
 * {
 *   "files": ["lego_pairs.json", "lego_baskets.json"],  // specific files to sync
 *   "force": true  // force upload even if no changes
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "synced": ["lego_pairs.json", "lego_baskets.json"],
 *   "courseCode": "spa_for_eng",
 *   "timestamp": "2025-12-03T20:30:00.000Z"
 * }
 */

import { writeCourseFile, readCourseFile } from '../../lib/s3-course.js';
import fs from 'fs';
import path from 'path';

// Default files to sync
const DEFAULT_FILES = [
  'lego_pairs.json',
  'lego_baskets.json',
  'course_manifest.json'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;
  const { files = DEFAULT_FILES, force = false } = req.body || {};

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code required' });
  }

  console.log(`[Sync] Starting sync for ${courseCode}, files: ${files.join(', ')}`);

  try {
    const results = {
      success: true,
      courseCode,
      synced: [],
      skipped: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    // Determine VFS path - check multiple locations
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'vfs', 'courses', courseCode),
      path.join(process.cwd(), 'vfs', 'courses', courseCode),
      `/tmp/vfs/courses/${courseCode}`
    ];

    let vfsPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        vfsPath = p;
        break;
      }
    }

    if (!vfsPath) {
      return res.status(404).json({
        error: 'Course directory not found',
        searched: possiblePaths
      });
    }

    console.log(`[Sync] Using VFS path: ${vfsPath}`);

    // Sync each file
    for (const filename of files) {
      const localPath = path.join(vfsPath, filename);

      // Check if local file exists
      if (!fs.existsSync(localPath)) {
        console.log(`[Sync] File not found: ${localPath}`);
        results.skipped.push({ file: filename, reason: 'not_found' });
        continue;
      }

      try {
        // Read local file
        const localContent = fs.readFileSync(localPath, 'utf-8');
        const localData = JSON.parse(localContent);

        // Check if S3 version differs (unless force)
        if (!force) {
          try {
            const { content: s3Data } = await readCourseFile(courseCode, filename);
            // Simple comparison - could be more sophisticated
            if (JSON.stringify(s3Data) === JSON.stringify(localData)) {
              console.log(`[Sync] No changes: ${filename}`);
              results.skipped.push({ file: filename, reason: 'no_changes' });
              continue;
            }
          } catch (e) {
            // File doesn't exist on S3 - proceed with upload
            if (e.code !== 'NOT_FOUND') {
              console.warn(`[Sync] Error checking S3: ${e.message}`);
            }
          }
        }

        // Upload to S3
        const { etag, url } = await writeCourseFile(courseCode, filename, localData);
        console.log(`[Sync] Uploaded: ${filename} (etag: ${etag})`);

        results.synced.push({
          file: filename,
          etag,
          url,
          size: localContent.length
        });

      } catch (fileError) {
        console.error(`[Sync] Error with ${filename}:`, fileError.message);
        results.errors.push({ file: filename, error: fileError.message });
      }
    }

    // Set success based on errors
    results.success = results.errors.length === 0;

    console.log(`[Sync] Complete: ${results.synced.length} synced, ${results.skipped.length} skipped, ${results.errors.length} errors`);

    res.json(results);

  } catch (err) {
    console.error('[Sync] Failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: err.message,
      courseCode
    });
  }
}
