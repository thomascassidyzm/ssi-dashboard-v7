/**
 * THE COURSE FAMILY — a base course and its sector segments, resolved once.
 *
 * The defect this exists for (sector-helix design 2026-08-31, §7 failure mode 1):
 * "Cross-course ZUT is not enforced by anything today. The validator checks ZUT
 * within one course code. Until the union check is built, sector authoring could
 * mint a known text that collides with core's mapping. This is the one piece
 * that must exist BEFORE the first sector seed is authored, not after."
 *
 * A sector segment is registered as its OWN course code (§5: "to every existing
 * tool a sector segment is just a course"), and is authored against a declared
 * `core_anchor_lego_id` in its base course. So to the learner it is one course
 * and to the validator it was two. This module is what makes the validator's
 * INPUT the family. Per §6: "The gate itself does not change; only what feeds
 * it." Nothing here loosens whole-chunk discipline — it only widens the set of
 * rows the same functions read.
 *
 * TWO SCOPES, AND THEY ARE DELIBERATELY DIFFERENT (the one judgement call this
 * build had to make, flagged in the report):
 *
 *   ZUT / collision scope = THE WHOLE FAMILY, UNBOUNDED, BOTH DIRECTIONS.
 *     §5b: "ZUT run over the UNION of base course + all its segments — same
 *     known → same target across the whole family, because to the learner it is
 *     one course." No anchor bound: a fork is a fork whenever it lands. If the
 *     segment glosses "you" as vosotros and core meets "you" → usted at seed
 *     400, the learner still forks — later, and worse.
 *
 *   AVAILABILITY / ownership scope = ANCHOR-BOUNDED.
 *     §5b: "the validator's vocabulary window seeded from the base course up to
 *     core_anchor_lego_id". The learner genuinely has not met base material past
 *     the anchor, so it cannot be spent. That window lives in
 *     tools/frame-layer/union.cjs, which is a query change, not a logic change.
 *
 * THE REGISTRY DOES NOT EXIST IN THE DATABASE YET, and this module does not need
 * it to: `resolveCourseFamily` reads `course_sectors` when it is there, treats a
 * missing table as "no family", and every consumer takes the family as an
 * INJECTABLE input. So the gate is honest and testable today, and needs no
 * rewrite the day the table lands. Migration file: tools/union-zut/course_sectors.sql
 * (written, deliberately NOT applied).
 *
 * READ-ONLY.
 */

/** `S0040L02` → { seed_number: 40, lego_index: 2 }. Null for anything else — an
 *  unparseable anchor is an absent bound, never a guessed one. */
function parseLegoId(legoId) {
  const m = /^S(\d+)L(\d+)$/i.exec(String(legoId || '').trim());
  return m ? { seed_number: +m[1], lego_index: +m[2] } : null;
}

async function readSectorRows(supabase) {
  try {
    const { data, error } = await supabase.from('course_sectors')
      .select('base_course_code,sector_slug,sector_course_code,core_anchor_lego_id,status');
    if (error) return null;              // missing table / no grant → no family
    return data || [];
  } catch {
    return null;                          // the table genuinely does not exist yet
  }
}

/**
 * The family `courseCode` belongs to, or null if it belongs to none.
 *
 * Returns the SAME shape whether `courseCode` is the base or a segment, so
 * callers never branch:
 *   { courseCode, baseCourseCode, sectorSlug, segmentCourseCodes,
 *     zutCourseCodes,           // what the ZUT gate must see: the whole family
 *     anchor }                  // (seed, lego) bound on the BASE, segment view only
 *
 * `opts.rows` injects registry rows directly (tests, demonstrations, and the
 * period before the table exists).
 */
async function resolveCourseFamily(supabase, courseCode, opts = {}) {
  const rows = opts.rows !== undefined ? opts.rows : await readSectorRows(supabase);
  if (!rows || !rows.length) return null;
  const live = rows.filter(r => r && r.base_course_code && r.sector_course_code
                                 && (opts.includeDraft !== false || r.status === 'live'));

  const asSegment = live.find(r => r.sector_course_code === courseCode);
  if (asSegment) {
    const siblings = live.filter(r => r.base_course_code === asSegment.base_course_code);
    return {
      courseCode,
      baseCourseCode: asSegment.base_course_code,
      sectorSlug: asSegment.sector_slug || null,
      segmentCourseCodes: siblings.map(r => r.sector_course_code),
      zutCourseCodes: [asSegment.base_course_code, ...siblings.map(r => r.sector_course_code)],
      anchor: parseLegoId(asSegment.core_anchor_lego_id),
    };
  }

  const segments = live.filter(r => r.base_course_code === courseCode);
  if (!segments.length) return null;
  return {
    courseCode,
    baseCourseCode: courseCode,
    sectorSlug: null,
    segmentCourseCodes: segments.map(r => r.sector_course_code),
    zutCourseCodes: [courseCode, ...segments.map(r => r.sector_course_code)],
    anchor: null,                          // the base is not authored against an anchor
  };
}

/** The course codes a ZUT check must see for `courseCode`. Null family → the
 *  single course, which is byte-identically what every course does today. */
function zutScope(courseCode, family) {
  if (!family || !family.zutCourseCodes || !family.zutCourseCodes.length) return [courseCode];
  const codes = [courseCode, ...family.zutCourseCodes.filter(c => c !== courseCode)];
  return [...new Set(codes)];
}

/**
 * `resolveCourseFamily` with a 60-second memo, which is what the live call sites
 * use: a seed submission runs the ZUT gate up to five times and the registry
 * answer cannot change between those calls. Today the table does not exist, so
 * the memo also means one failed lookup per course per minute rather than one
 * per check. A registration takes effect within the minute; nothing in sector
 * authoring turns on it landing sooner.
 */
const _cache = new Map();
const FAMILY_TTL_MS = 60_000;
async function courseFamily(supabase, courseCode, opts = {}) {
  if (opts.rows !== undefined || opts.noCache) return resolveCourseFamily(supabase, courseCode, opts);
  const hit = _cache.get(courseCode);
  if (hit && Date.now() - hit.at < FAMILY_TTL_MS) return hit.family;
  const family = await resolveCourseFamily(supabase, courseCode, opts);
  _cache.set(courseCode, { at: Date.now(), family });
  return family;
}

module.exports = { parseLegoId, resolveCourseFamily, courseFamily, zutScope, readSectorRows };
