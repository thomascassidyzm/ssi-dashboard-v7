/**
 * GET /api/courses
 * List all courses - DATABASE FIRST, S3 fallback
 *
 * Returns course list with status info for each course
 */

import { listCourses, courseFileExists } from '../lib/s3-course.js';
import { listCoursesFromDatabase, getCourseContentCounts, isSupabaseConfigured } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let courses = [];
    let source = 'unknown';

    // Try database first (preferred)
    if (isSupabaseConfigured()) {
      const dbCourses = await listCoursesFromDatabase();
      if (dbCourses && dbCourses.length > 0) {
        courses = dbCourses;
        source = 'database';
        console.log(`[Courses] Loaded ${courses.length} courses from database`);
      }
    }

    // Fallback to S3 if database empty or not configured
    if (courses.length === 0) {
      const s3Courses = await listCourses();
      courses = s3Courses.map(c => ({ ...c, source: 's3' }));
      source = 's3';
      console.log(`[Courses] Loaded ${courses.length} courses from S3 (fallback)`);
    }

    // Optionally include detailed status
    const includeStatus = req.query.status === 'true';
    const includeCounts = req.query.counts === 'true';

    if (includeStatus || includeCounts) {
      const keyFiles = ['lego_pairs.json', 'lego_baskets.json', 'introductions.json', 'course_manifest.json'];

      const coursesWithDetails = await Promise.all(
        courses.map(async (course) => {
          const result = { ...course };

          // Check S3 file status if requested
          if (includeStatus) {
            const fileStatus = {};
            for (const file of keyFiles) {
              fileStatus[file.replace('.json', '')] = await courseFileExists(course.code || course.course_code, file);
            }
            result.files = fileStatus;
            result.complete = Object.values(fileStatus).every(Boolean);
          }

          // Get database content counts if requested
          if (includeCounts && isSupabaseConfigured()) {
            const counts = await getCourseContentCounts(course.code || course.course_code);
            if (counts) {
              result.counts = counts;
              result.hasContent = counts.seeds > 0 || counts.legos > 0;
            }
          }

          return result;
        })
      );

      return res.json({
        courses: coursesWithDetails,
        total: coursesWithDetails.length,
        complete: coursesWithDetails.filter(c => c.complete).length,
        source
      });
    }

    // Simple list
    res.json({
      courses,
      total: courses.length,
      source
    });

  } catch (err) {
    console.error('[Courses] List failed:', err.message);
    res.status(500).json({ error: 'Failed to list courses', message: err.message });
  }
}
