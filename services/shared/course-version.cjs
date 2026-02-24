/**
 * Course content versioning (semver).
 *
 * bumpCourseVersion(supabase, courseCode, 'minor') → '0.1.0'
 */

async function bumpCourseVersion(supabase, courseCode, level = 'minor') {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('content_version')
      .eq('course_code', courseCode)
      .single();

    if (error) {
      console.error(`[Version] Failed to read version for ${courseCode}:`, error.message);
      return null;
    }

    const current = data?.content_version || '0.0.0';
    const [major, minor, patch] = current.split('.').map(Number);

    let newVersion;
    switch (level) {
      case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
      case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
      default:
        console.error(`[Version] Invalid level: ${level}`);
        return null;
    }

    const { error: updateError } = await supabase
      .from('courses')
      .update({ content_version: newVersion })
      .eq('course_code', courseCode);

    if (updateError) {
      console.error(`[Version] Failed to update version for ${courseCode}:`, updateError.message);
      return null;
    }

    console.log(`[Version] ${courseCode}: ${current} → ${newVersion} (${level})`);
    return newVersion;
  } catch (err) {
    console.error(`[Version] Error bumping version for ${courseCode}:`, err.message);
    return null;
  }
}

module.exports = { bumpCourseVersion };
