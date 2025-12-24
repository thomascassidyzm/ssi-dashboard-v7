require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Check all distinct course_codes in course_audio
  const { data: codes } = await supabase
    .from('course_audio')
    .select('course_code, role')
    .limit(2000);

  const courseStats = {};
  for (const row of (codes || [])) {
    if (!courseStats[row.course_code]) {
      courseStats[row.course_code] = {};
    }
    courseStats[row.course_code][row.role] = (courseStats[row.course_code][row.role] || 0) + 1;
  }

  console.log('Course audio by course_code and role:');
  console.log(JSON.stringify(courseStats, null, 2));

  // Check courses table
  const { data: courses } = await supabase
    .from('courses')
    .select('course_code, display_name');

  console.log('\nCourses in database:');
  for (const c of (courses || [])) {
    console.log('  ' + c.course_code + ' - ' + c.display_name);
  }
}

check().catch(console.error);
