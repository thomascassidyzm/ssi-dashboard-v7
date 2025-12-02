/**
 * PUT /api/courses/:courseCode/translations/:uuid
 *
 * Updates a translation in seed_pairs.json
 * Reads from and writes to S3 (SSoT)
 */

import { readCourseFile, writeCourseFile } from '../../../lib/s3-course.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { courseCode, uuid } = req.query;
  const { source, target } = req.body;

  // Validate
  if (!courseCode || !uuid || !source || !target) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'uuid', 'source', 'target']
    });
  }

  try {
    // Read from S3
    const { content: data } = await readCourseFile(courseCode, 'seed_pairs.json');

    // Find and update the translation
    let found = false;
    if (data.translations && typeof data.translations === 'object') {
      // Format: { "S0001": ["target", "known"], ... }
      for (const [seedId, translation] of Object.entries(data.translations)) {
        // Match by checking if translation matches (uuid is typically the seedId)
        if (seedId === uuid || (Array.isArray(translation) && translation[0] === source)) {
          data.translations[seedId] = [target, source]; // [target, known/source]
          found = true;
          console.log(`[API] ✅ Updated translation ${seedId}: "${source}" → "${target}"`);
          break;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: 'Translation not found',
        uuid
      });
    }

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'dashboard_edit';

    // Write to S3
    const { etag, url } = await writeCourseFile(courseCode, 'seed_pairs.json', data);
    console.log(`[API] Wrote to S3 (etag: ${etag})`);

    res.status(200).json({
      success: true,
      message: 'Translation updated and saved to S3',
      updated: {
        uuid,
        source,
        target
      },
      s3: { etag, url }
    });

  } catch (error) {
    console.error('[API] Error updating translation:', error);
    res.status(500).json({
      error: 'Failed to update translation',
      message: error.message
    });
  }
}
