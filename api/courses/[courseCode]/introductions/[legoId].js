/**
 * PUT /api/courses/:courseCode/introductions/:legoId
 *
 * Updates an introduction/presentation in introductions.json
 * Reads from S3 and writes back to S3
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

  const { courseCode, legoId } = req.query;
  const { text, edited } = req.body;

  // Validate
  if (!courseCode || !legoId || !text) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'legoId', 'text']
    });
  }

  try {
    // Read from S3
    const { content: data } = await readCourseFile(courseCode, 'introductions.json');

    // Update the presentation
    if (!data.presentations) {
      data.presentations = {};
    }

    data.presentations[legoId] = {
      text: text.trim(),
      edited: edited !== undefined ? edited : true,
      updated: new Date().toISOString()
    };

    console.log(`[API] Updated introduction ${legoId}: "${text.substring(0, 50)}..."`);

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'dashboard_edit';

    // Write to S3
    const { etag, url } = await writeCourseFile(courseCode, 'introductions.json', data);
    console.log(`[API] Wrote to S3: ${url} (etag: ${etag})`);

    res.status(200).json({
      success: true,
      message: 'Introduction updated and saved to S3',
      updated: {
        legoId,
        text
      },
      s3: {
        etag,
        url
      }
    });

  } catch (error) {
    console.error('[API] Error updating introduction:', error);

    // Return 404 for missing files, 500 for other errors
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to update introduction',
      message: error.message
    });
  }
}
