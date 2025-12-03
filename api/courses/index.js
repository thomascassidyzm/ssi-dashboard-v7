/**
 * GET /api/courses
 * List all courses from S3
 *
 * Returns course list with status info for each course
 */

import { listCourses, readCourseFile, courseFileExists } from '../lib/s3-course.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Get list of all courses
    const courses = await listCourses();

    // Optionally include file status for each course
    const includeStatus = req.query.status === 'true';

    if (includeStatus) {
      // Check key files for each course
      const keyFiles = ['lego_pairs.json', 'lego_baskets.json', 'introductions.json', 'course_manifest.json'];

      const coursesWithStatus = await Promise.all(
        courses.map(async (course) => {
          const fileStatus = {};
          for (const file of keyFiles) {
            fileStatus[file.replace('.json', '')] = await courseFileExists(course.code, file);
          }
          return {
            ...course,
            files: fileStatus,
            complete: Object.values(fileStatus).every(Boolean)
          };
        })
      );

      return res.json({
        courses: coursesWithStatus,
        total: coursesWithStatus.length,
        complete: coursesWithStatus.filter(c => c.complete).length
      });
    }

    // Simple list without status
    res.json({
      courses,
      total: courses.length
    });

  } catch (err) {
    console.error('[Courses] List failed:', err.message);
    res.status(500).json({ error: 'Failed to list courses', message: err.message });
  }
}
