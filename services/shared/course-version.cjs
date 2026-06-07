/**
 * Course content versioning.
 *
 * Two distinct version columns on `courses`, two distinct helpers:
 *
 *   bumpCourseVersion(supabase, courseCode, 'minor') → '0.1.0'
 *     Editor-facing SEMVER `content_version`. Human release-note style.
 *
 *   bumpCourseRevalidation(supabase, courseCode) → integer (new value)
 *     Machine-facing INTEGER `version`. The learning app's cache-bust /
 *     revalidation key and the decomposition-staleness key
 *     (decomposition_course_version < courses.version). Normally bumped by the
 *     `course_legos` trigger (20260518_courses_version_stamp.sql), which
 *     DELIBERATELY excludes audio_id columns — so audio generation never
 *     moves it. This helper bumps it explicitly at audio-completion so the
 *     app auto-detects freshly generated audio. Call ONCE per run, not per
 *     batch/row.
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

/**
 * Increment the integer `courses.version` by one. This is the learning app's
 * cache-bust / revalidation key — the trigger only moves it on course_legos
 * text/structure changes, so audio-only runs must bump it here or the app
 * never revalidates newly generated audio.
 *
 * Read-modify-write (no atomic SQL increment available through PostgREST). The
 * window is harmless: this fires ONCE at end-of-run, runs are serialised per
 * course by the pipeline, and a missed concurrent +1 only means one extra
 * (cheap) revalidation later — never a stale-forever app.
 *
 * @returns {Promise<number|null>} the new integer version, or null on error.
 */
async function bumpCourseRevalidation(supabase, courseCode) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('version')
      .eq('course_code', courseCode)
      .single();

    if (error) {
      console.error(`[Version] Failed to read integer version for ${courseCode}:`, error.message);
      return null;
    }

    const current = Number.isInteger(data?.version) ? data.version : 1;
    const next = current + 1;

    const { error: updateError } = await supabase
      .from('courses')
      .update({ version: next })
      .eq('course_code', courseCode);

    if (updateError) {
      console.error(`[Version] Failed to update integer version for ${courseCode}:`, updateError.message);
      return null;
    }

    console.log(`[Version] ${courseCode}: integer version ${current} → ${next} (revalidation key — audio generated)`);
    return next;
  } catch (err) {
    console.error(`[Version] Error bumping integer version for ${courseCode}:`, err.message);
    return null;
  }
}

module.exports = { bumpCourseVersion, bumpCourseRevalidation };
