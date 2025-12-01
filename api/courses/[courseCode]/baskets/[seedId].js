/**
 * PUT /api/courses/:courseCode/baskets/:seedId
 *
 * Updates a basket in lego_baskets.json
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

  const { courseCode, seedId } = req.query;
  const basketData = req.body;

  // Validate
  if (!courseCode || !seedId || !basketData) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'seedId', 'basketData']
    });
  }

  try {
    // Read from S3
    const { content: data } = await readCourseFile(courseCode, 'lego_baskets.json');

    // Update baskets for this seed
    if (!data.baskets) {
      data.baskets = {};
    }

    // Handle v6.2+ format where basketData has nested legos
    if (basketData.legos && typeof basketData.legos === 'object') {
      for (const [legoKey, legoData] of Object.entries(basketData.legos)) {
        if (legoKey.startsWith(seedId)) {
          data.baskets[legoKey] = legoData;
        }
      }
    } else {
      // Legacy format: basketData is flat with LEGOs at root
      for (const [key, value] of Object.entries(basketData)) {
        if (key.startsWith('S') && key.includes('L')) {
          data.baskets[key] = value;
        }
      }
    }

    console.log(`[API] Updated baskets for ${seedId}`);

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'dashboard_edit';

    // Write to S3
    const { etag, url } = await writeCourseFile(courseCode, 'lego_baskets.json', data);
    console.log(`[API] Wrote to S3: ${url} (etag: ${etag})`);

    res.status(200).json({
      success: true,
      message: 'Basket updated and saved to S3',
      seedId,
      s3: {
        etag,
        url
      }
    });

  } catch (error) {
    console.error('[API] Error updating basket:', error);

    // Return 404 for missing files, 500 for other errors
    const statusCode = error.code === 'NOT_FOUND' ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to update basket',
      message: error.message
    });
  }
}
