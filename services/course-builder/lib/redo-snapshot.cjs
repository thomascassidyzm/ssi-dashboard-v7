/**
 * Redo snapshots — before-images for the destructive seed-rebuild flows.
 *
 * The redo endpoint (POST /api/build/redo/:courseCode) deletes a seed's LEGOs
 * and practice phrases and then spawns an agent to rebuild it. Before this
 * module existed, nothing captured the old decomposition: a bad redo was
 * unrecoverable, and the rebuild agent had no idea what it was replacing.
 *
 * Contract:
 *   1. snapshotSeeds() runs BEFORE any delete and either captures everything or
 *      throws — the caller must not delete if it throws.
 *   2. latestSnapshots() gives the redo brief the old decomposition to show the
 *      agent (the DB rows are gone by then; the snapshot is the only copy).
 *   3. restoreSnapshot() puts the old decomposition back: delete whatever is
 *      there now for that seed, re-insert the snapshot rows verbatim (same ids,
 *      same audio pointers), and restore the seed's decomposed/approved/flagged
 *      stamps. That is the undo.
 *
 * Deletion/insertion order matters: course_practice_phrases has an FK onto
 * course_legos (course_code, seed_number, lego_index), so phrases are deleted
 * first and inserted last. lego_id is a GENERATED ALWAYS column and must be
 * stripped before re-insert.
 */

const { randomUUID } = require('crypto');

const SNAPSHOT_TABLE = 'seed_redo_snapshots';

// lego_id is GENERATED ALWAYS — Postgres rejects an explicit value for it.
function stripGenerated(row) {
  const { lego_id, ...rest } = row || {};
  return rest;
}

function seedStamp(seed) {
  if (!seed) return {};
  return {
    known_text: seed.known_text ?? null,
    target_text: seed.target_text ?? null,
    decomposed_at: seed.decomposed_at ?? null,
    approved_at: seed.approved_at ?? null,
    flagged_at: seed.flagged_at ?? null,
  };
}

/**
 * Capture one before-image row per seed. Throws on any read/write failure so the
 * caller aborts before deleting anything.
 *
 * @returns {{ batchId: string, snapshots: Array<{id,seed_number,lego_count,phrase_count}> }}
 */
async function snapshotSeeds(supabase, courseCode, seedNumbers, { reason = 'redo', notes = '' } = {}) {
  const batchId = randomUUID();
  const rows = [];

  for (const seedNum of seedNumbers) {
    const { data: seed, error: seedErr } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text, decomposed_at, approved_at, flagged_at')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .maybeSingle();
    if (seedErr) throw new Error(`Snapshot failed reading seed ${seedNum}: ${seedErr.message}`);

    const { data: legos, error: legoErr } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index');
    if (legoErr) throw new Error(`Snapshot failed reading LEGOs for seed ${seedNum}: ${legoErr.message}`);

    const { data: phrases, error: phraseErr } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index')
      .order('position');
    if (phraseErr) throw new Error(`Snapshot failed reading phrases for seed ${seedNum}: ${phraseErr.message}`);

    rows.push({
      batch_id: batchId,
      course_code: courseCode,
      seed_number: seedNum,
      reason,
      notes: notes || null,
      seed_row: seedStamp(seed),
      legos: legos || [],
      phrases: phrases || [],
      lego_count: (legos || []).length,
      phrase_count: (phrases || []).length,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from(SNAPSHOT_TABLE)
    .insert(rows)
    .select('id, seed_number, lego_count, phrase_count');
  if (insErr) throw new Error(`Snapshot insert failed (nothing deleted): ${insErr.message}`);

  return { batchId, snapshots: inserted || [] };
}

/**
 * Most recent snapshot per seed — what the redo brief shows the rebuild agent.
 * Read-only and non-throwing at the call site's discretion.
 */
async function latestSnapshots(supabase, courseCode, seedNumbers) {
  const out = new Map();
  for (const seedNum of seedNumbers) {
    const { data } = await supabase
      .from(SNAPSHOT_TABLE)
      .select('id, batch_id, seed_number, reason, notes, seed_row, legos, phrases, lego_count, phrase_count, created_at, restored_at')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length) out.set(seedNum, data[0]);
  }
  return out;
}

/** List snapshots for a course (newest first), without the heavy jsonb payloads. */
async function listSnapshots(supabase, courseCode, { seed = null, limit = 50 } = {}) {
  let q = supabase
    .from(SNAPSHOT_TABLE)
    .select('id, batch_id, course_code, seed_number, reason, notes, lego_count, phrase_count, created_at, restored_at, restored_by')
    .eq('course_code', courseCode)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (seed) q = q.eq('seed_number', Number(seed));
  const { data, error } = await q;
  if (error) throw new Error(`Failed to list redo snapshots: ${error.message}`);
  return data || [];
}

/**
 * Undo a redo: put the snapshotted decomposition back.
 *
 * Resolution: an explicit snapshotId, otherwise the newest snapshot for the seed.
 * dryRun reports what it would do and changes nothing.
 */
async function restoreSnapshot(supabase, { courseCode, seedNumber, snapshotId, dryRun = false, restoredBy = 'redo-undo' }) {
  let snap;
  if (snapshotId) {
    const { data, error } = await supabase
      .from(SNAPSHOT_TABLE).select('*').eq('id', snapshotId).maybeSingle();
    if (error) throw new Error(`Failed to load snapshot ${snapshotId}: ${error.message}`);
    snap = data;
  } else {
    const { data, error } = await supabase
      .from(SNAPSHOT_TABLE).select('*')
      .eq('course_code', courseCode).eq('seed_number', Number(seedNumber))
      .order('created_at', { ascending: false }).limit(1);
    if (error) throw new Error(`Failed to load snapshot for seed ${seedNumber}: ${error.message}`);
    snap = (data || [])[0];
  }

  if (!snap) {
    throw new Error(`No redo snapshot found for ${courseCode} seed ${seedNumber}. Nothing to undo — this seed was redone before snapshotting existed, or was never redone.`);
  }
  if (snap.course_code !== courseCode) {
    throw new Error(`Snapshot ${snap.id} belongs to ${snap.course_code}, not ${courseCode}.`);
  }

  const legos = (snap.legos || []).map(stripGenerated);
  const phrases = snap.phrases || [];

  // What is there now — reported either way, and what a dry run is for.
  const { count: currentLegos } = await supabase
    .from('course_legos').select('id', { count: 'exact', head: true })
    .eq('course_code', courseCode).eq('seed_number', snap.seed_number);
  const { count: currentPhrases } = await supabase
    .from('course_practice_phrases').select('id', { count: 'exact', head: true })
    .eq('course_code', courseCode).eq('seed_number', snap.seed_number);

  if (dryRun) {
    return {
      dry_run: true,
      snapshot_id: snap.id,
      seed_number: snap.seed_number,
      taken_at: snap.created_at,
      would_delete: { legos: currentLegos || 0, phrases: currentPhrases || 0 },
      would_restore: { legos: legos.length, phrases: phrases.length },
      already_restored_at: snap.restored_at || null,
    };
  }

  // Phrases first (FK onto course_legos), then LEGOs.
  const { error: delPhraseErr } = await supabase
    .from('course_practice_phrases').delete()
    .eq('course_code', courseCode).eq('seed_number', snap.seed_number);
  if (delPhraseErr) throw new Error(`Undo failed deleting current phrases: ${delPhraseErr.message}`);

  const { error: delLegoErr } = await supabase
    .from('course_legos').delete()
    .eq('course_code', courseCode).eq('seed_number', snap.seed_number);
  if (delLegoErr) throw new Error(`Undo failed deleting current LEGOs: ${delLegoErr.message}`);

  if (legos.length) {
    const { error } = await supabase.from('course_legos').insert(legos);
    if (error) throw new Error(`Undo failed restoring LEGOs: ${error.message}`);
  }
  if (phrases.length) {
    const { error } = await supabase.from('course_practice_phrases').insert(phrases);
    if (error) throw new Error(`Undo failed restoring phrases (LEGOs are back, phrases are not — re-run the undo): ${error.message}`);
  }

  const stamp = snap.seed_row || {};
  const { error: seedErr } = await supabase
    .from('course_seeds')
    .update({
      decomposed_at: stamp.decomposed_at ?? null,
      approved_at: stamp.approved_at ?? null,
      flagged_at: stamp.flagged_at ?? null,
    })
    .eq('course_code', courseCode).eq('seed_number', snap.seed_number);
  if (seedErr) throw new Error(`Undo restored content but failed restoring seed stamps: ${seedErr.message}`);

  await supabase.from(SNAPSHOT_TABLE)
    .update({ restored_at: new Date().toISOString(), restored_by: restoredBy })
    .eq('id', snap.id);

  return {
    ok: true,
    snapshot_id: snap.id,
    seed_number: snap.seed_number,
    taken_at: snap.created_at,
    deleted: { legos: currentLegos || 0, phrases: currentPhrases || 0 },
    restored: { legos: legos.length, phrases: phrases.length },
  };
}

/**
 * Render a snapshot as markdown for the rebuild agent's brief — same shape the
 * golden-seed examples use, so old-vs-desired reads as a like-for-like compare.
 */
function formatSnapshotForBrief(snap) {
  if (!snap) return null;
  const seed = snap.seed_row || {};
  const lines = [`### Seed ${snap.seed_number}: "${seed.known_text || ''}" → "${seed.target_text || ''}"`];
  lines.push(`_Previous decomposition — ${snap.lego_count} LEGO(s), ${snap.phrase_count} phrase(s), captured ${snap.created_at}._`);

  const phrases = snap.phrases || [];
  for (const lego of snap.legos || []) {
    const own = phrases.filter(p => p.lego_index === lego.lego_index);
    const build = own.filter(p => p.phrase_role === 'build' || p.phrase_role === 'practice');
    const use = own.filter(p => p.phrase_role === 'use');
    const components = own.filter(p => p.phrase_role === 'component');

    lines.push(`\n**L${lego.lego_index} (${lego.type})**: "${lego.known_text}" → "${lego.target_text}"`);
    if (Array.isArray(lego.components) && lego.components.length) {
      lines.push(`  Components: ${lego.components.map(c => `"${c.known || c.known_text}" → "${c.target || c.target_text}"`).join(', ')}`);
    } else if (components.length) {
      lines.push(`  Components: ${components.map(c => `"${c.known_text}" → "${c.target_text}"`).join(', ')}`);
    }
    if (build.length) lines.push(`  BUILD (${build.length}): ${build.map(p => `"${p.known_text}" → "${p.target_text}"`).join(' | ')}`);
    if (use.length) lines.push(`  USE (${use.length}): ${use.map(p => `"${p.known_text}" → "${p.target_text}"`).join(' | ')}`);
  }
  return lines.join('\n');
}

module.exports = {
  SNAPSHOT_TABLE,
  snapshotSeeds,
  latestSnapshots,
  listSnapshots,
  restoreSnapshot,
  formatSnapshotForBrief,
  stripGenerated,
};
