// services/shared/lego-reorder.cjs
//
// THE `lego.reorder` OP of the course-edit door (cs #248·AI, 2026-11-16; Kai: "Can't we
// make a reorder operation?"). Called only from course-edit-ops.cjs runPlans(), inside its
// one transaction, so a dry run is this same work rolled back and an apply commits it
// together with the batch's other ops.
//
// WHY A REORDER IS A RELABELLING. Inside a seed, course_legos.lego_index IS the
// teaching order (there is no separate order column) and course_legos.lego_id is
// GENERATED from (seed_number, lego_index). Teaching the seed's chunks in another
// order therefore gives them new labels, and everything that names a LEGO by
// label or by index must follow its CHUNK, not its slot, or tiles silently point
// at a different chunk. Ported from tools/gle-lego-reorder-2026-09-09.cjs
// (job #737·F), with these changes:
//   * NO DDL. The old tool dropped fk_course_practice_phrases_lego for the length
//     of its transaction (an ACCESS EXCLUSIVE lock on course_practice_phrases and a
//     whole-table re-validation on re-add — not acceptable on the database the
//     recording booth is reading). Here each renumbering step updates the LEGOs,
//     their phrases and the phrases' QA flags in ONE statement (data-modifying
//     CTEs): a non-deferrable FK is checked at the end of the statement, when both
//     sides have already moved. Unique keys are checked per row, so the moved rows go
//     through a parking step (lego_index + 50, id / lego_id + '#reorder') first.
//   * The new indexes are the seed's EXISTING index set, handed out in the new
//     order. A seed with a gap (1, 2, 4) keeps those labels, so no label is created
//     or retired: the label set is permuted, which is what makes the reverse
//     reorder (by uuid) an exact undo.
//   * Every query is course-scoped and keyed (course_code + seed, or course_code +
//     the moved labels). No whole-course read into node, as the old tool did.
//   * course_practice_phrases.target_phrase_id is NOT touched: it names a row of
//     the target_phrases table (course-builder seed-translate), not a course phrase id.
//
// WHAT IT NEVER WRITES: learner state. lego_progress & co. are keyed by lego_id; a
// relabel strands a learner's per-chunk state on the wrong chunk (the 2026-09-09
// reorder needed #745·F's separate repair: 138 rows / 69 learners). So the op
// counts them, and REFUSES the apply (LEARNER_STATE) while any exist; repairing them
// is a learner-data migration and somebody else's decision.
//
// No text column is written, so the audio-nulling triggers (gated on
// known_text / target_text) never fire, and no audio link moves.

const PARK = 50;
const PARK_TAG = '#reorder';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Learner-owned rows that name a LEGO by label: [table, course column, label columns].
// class_sessions has no course column and is counted through classes, below.
const LEARNER_STATE = [
  ['lego_progress', 'course_id', ['lego_id']],
  ['learner_lego_metrics', 'course_code', ['lego_id']],
  ['learner_l1_state', 'course_code', ['lego_id']],
  ['course_enrollments', 'course_id', ['last_completed_lego_id', 'highest_completed_lego_id']],
  ['classes', 'course_code', ['last_lego_id']],
];

const legoIdOf = (seed, index) => `S${String(seed).padStart(4, '0')}L${String(index).padStart(2, '0')}`;
const q = (ident) => `"${String(ident).replace(/"/g, '""')}"`;

/**
 * The relabelling a reorder implies. Pure.
 * @param {number} seedNumber
 * @param {number[]} currentIndexes        the seed's lego_index values
 * @param {number[]} newOrderAsOldIndexes  the same values, in the new teaching order
 * @returns {{idx: Map<number,number>, label: Map<string,string>}} only the LEGOs that move
 */
function reorderLabelMap(seedNumber, currentIndexes, newOrderAsOldIndexes) {
  const slots = [...currentIndexes].sort((a, b) => a - b);
  const idx = new Map(); const label = new Map();
  newOrderAsOldIndexes.forEach((oldIdx, i) => {
    const newIdx = slots[i];
    if (oldIdx === newIdx) return;
    idx.set(oldIdx, newIdx);
    label.set(legoIdOf(seedNumber, oldIdx), legoIdOf(seedNumber, newIdx));
  });
  return { idx, label };
}

/** A phrase id follows the LEGO whose label it carries ("<course>:S0012L01B01"). Null when it carries no moved label. */
function renamedPhraseId(id, labelMap) {
  const m = /^(.*:)(S\d{4}L\d{2})(.*)$/.exec(id);
  if (!m || !labelMap.has(m[2])) return null;
  return m[1] + labelMap.get(m[2]) + m[3];
}

async function columnsExist(client, table, cols) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2)`,
    [table, cols]);
  return rows.length === cols.length;
}

/**
 * Run one lego.reorder inside the caller's open transaction.
 * @param {pg.Client} client
 * @param {{index:number, where:{seed_number:number}, order:string[]}} plan
 * @param {string} courseCode
 * @param {{evId:?string, apply:boolean, types:(t:string)=>Promise<Map>, fail:(msg:string, code:string)=>never}} ctx
 */
async function runReorder(client, plan, courseCode, { evId, apply, types, fail: failRaw }) {
  const seed = plan.where.seed_number;
  const fail = (msg, code) => failRaw(`lego.reorder seed ${seed}: ${msg}`, code);

  const legos = (await client.query(
    `SELECT * FROM course_legos WHERE course_code = $1 AND seed_number = $2 ORDER BY lego_index FOR UPDATE`, [courseCode, seed])).rows;
  if (!legos.length) fail(`${courseCode} has no LEGOs in seed ${seed}`, 'NO_SUCH_SEED');

  // The order must name exactly the seed's LEGOs, each once.
  const byKey = new Map();
  for (const l of legos) { byKey.set(l.id, l); byKey.set(l.lego_id, l); }
  const picked = plan.order.map(k => byKey.get(k));
  const unknown = plan.order.filter((k, i) => !picked[i]);
  if (unknown.length) fail(`not LEGOs of this seed: ${unknown.join(', ')} (the seed has ${legos.map(l => l.lego_id).join(', ')})`, 'ORDER_MISMATCH');
  const seen = new Set(); const dup = [];
  for (const l of picked) { if (seen.has(l.id)) dup.push(l.lego_id); seen.add(l.id); }
  if (dup.length) fail(`named more than once: ${dup.join(', ')}`, 'ORDER_MISMATCH');
  if (picked.length !== legos.length) {
    fail(`order names ${picked.length} of the seed's ${legos.length} LEGOs; missing ${legos.filter(l => !seen.has(l.id)).map(l => l.lego_id).join(', ')}`, 'ORDER_MISMATCH');
  }
  if (legos[legos.length - 1].lego_index >= PARK) fail(`lego_index ${legos[legos.length - 1].lego_index} leaves no room to park (max ${PARK - 1})`, 'TOO_MANY_LEGOS');

  // A no-op order is REFUSED rather than passed through: an apply would still file an edit event for nothing.
  const { idx, label } = reorderLabelMap(seed, legos.map(l => l.lego_index), picked.map(l => l.lego_index));
  if (!idx.size) fail('the order is the current order; nothing to do', 'REORDER_NOOP');
  const oldLabels = [...label.keys()];
  const movedIdx = [...idx.keys()];
  const idxJson = JSON.stringify(Object.fromEntries([...idx].map(([o, n]) => [o + PARK, n])));
  const labelJson = JSON.stringify(Object.fromEntries(label));

  // Learner state names labels; a relabel would move a learner's progress onto another chunk.
  const learner = {};
  for (const [table, courseCol, cols] of LEARNER_STATE) {
    if (!await columnsExist(client, table, [courseCol, ...cols])) { learner[table] = 'absent'; continue; }
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM ${q(table)} WHERE ${q(courseCol)} = $1 AND (${cols.map(c => `${q(c)} = ANY($2::text[])`).join(' OR ')})`,
      [courseCode, oldLabels]);
    learner[table] = rows[0].n;
  }
  if (await columnsExist(client, 'class_sessions', ['class_id', 'start_lego_id', 'end_lego_id'])) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM class_sessions WHERE class_id IN (SELECT id FROM classes WHERE course_code = $1)
         AND (start_lego_id = ANY($2::text[]) OR end_lego_id = ANY($2::text[]))`, [courseCode, oldLabels]);
    learner.class_sessions = rows[0].n;
  } else learner.class_sessions = 'absent';
  const learnerRows = Object.values(learner).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0);
  if (apply && learnerRows) {
    fail(`${learnerRows} learner-state row(s) name the LEGOs this would relabel (${JSON.stringify(learner)}); this op never writes learner data, so the apply is refused. A learner-progress migration (cf. tools/gle-learner-progress-repair-2026-09-09.cjs) is a separate decision.`, 'LEARNER_STATE');
  }

  // Phrase ids that carry a moved label, seed-scoped.
  const seedPhrases = (await client.query(
    `SELECT id FROM course_practice_phrases WHERE course_code = $1 AND seed_number = $2 FOR UPDATE`, [courseCode, seed])).rows.map(r => r.id);
  if (seedPhrases.some(id => id.includes(PARK_TAG))) fail(`a phrase id already contains "${PARK_TAG}"; refusing`, 'BAD_STATE');
  const idRename = new Map();
  for (const id of seedPhrases) { const n = renamedPhraseId(id, label); if (n && n !== id) idRename.set(id, n); }
  const renOld = [...idRename.keys()];
  const parkedIdJson = JSON.stringify(Object.fromEntries([...idRename].map(([o, n]) => [o + PARK_TAG, n])));

  if (evId && !UUID_RE.test(String(evId))) fail('event id is not a uuid', 'BAD_STATE');
  const legoStamp = evId && (await types('course_legos')).has('last_edit_event_id') ? `, last_edit_event_id = '${evId}'::uuid` : '';
  const phraseStamp = evId && (await types('course_practice_phrases')).has('last_edit_event_id') ? `, last_edit_event_id = '${evId}'::uuid` : '';
  const counts = {};
  const one = async (name, sql, params) => { const r = await client.query(sql, params); counts[name] = (counts[name] || 0) + r.rowCount; return r; };

  // Step 1: park. LEGOs, their phrases and the phrases' flags in ONE statement (FKs are checked at its end).
  const park = (await client.query(
    `WITH l AS (UPDATE course_legos SET lego_index = lego_index + ${PARK}${legoStamp}
                 WHERE course_code = $1 AND seed_number = $2 AND lego_index = ANY($3::int[]) RETURNING 1),
          p AS (UPDATE course_practice_phrases
                   SET lego_index = CASE WHEN lego_index = ANY($3::int[]) THEN lego_index + ${PARK} ELSE lego_index END,
                       id = CASE WHEN id = ANY($4::text[]) THEN id || '${PARK_TAG}' ELSE id END${phraseStamp}
                 WHERE course_code = $1 AND seed_number = $2 AND (lego_index = ANY($3::int[]) OR id = ANY($4::text[])) RETURNING 1),
          f AS (UPDATE course_qa_flags SET phrase_id = phrase_id || '${PARK_TAG}'
                 WHERE course_code = $1 AND phrase_id = ANY($4::text[]) RETURNING 1)
     SELECT (SELECT count(*) FROM l)::int AS l, (SELECT count(*) FROM p)::int AS p, (SELECT count(*) FROM f)::int AS f`,
    [courseCode, seed, movedIdx, renOld])).rows[0];
  if (park.l !== movedIdx.length) fail(`parked ${park.l} LEGOs, expected ${movedIdx.length}`, 'BAD_STATE');

  // Step 2: land. Parked rows take their new index / id, again in one statement.
  const land = (await client.query(
    `WITH l AS (UPDATE course_legos SET lego_index = ($3::jsonb ->> lego_index::text)::int
                 WHERE course_code = $1 AND seed_number = $2 AND lego_index >= ${PARK} RETURNING 1),
          p AS (UPDATE course_practice_phrases
                   SET lego_index = CASE WHEN lego_index >= ${PARK} THEN ($3::jsonb ->> lego_index::text)::int ELSE lego_index END,
                       id = CASE WHEN id = ANY($5::text[]) THEN $4::jsonb ->> id ELSE id END
                 WHERE course_code = $1 AND seed_number = $2 AND (lego_index >= ${PARK} OR id = ANY($5::text[])) RETURNING 1),
          f AS (UPDATE course_qa_flags SET phrase_id = $4::jsonb ->> phrase_id
                 WHERE course_code = $1 AND phrase_id = ANY($5::text[]) RETURNING 1)
     SELECT (SELECT count(*) FROM l)::int AS l, (SELECT count(*) FROM p)::int AS p, (SELECT count(*) FROM f)::int AS f`,
    [courseCode, seed, idxJson, parkedIdJson, renOld.map(i => i + PARK_TAG)])).rows[0];
  if (land.l !== park.l || land.p !== park.p || land.f !== park.f) fail(`landed ${JSON.stringify(land)} but parked ${JSON.stringify(park)}`, 'BAD_STATE');
  counts.course_legos = land.l;
  counts['course_practice_phrases (lego_index / id)'] = land.p;
  counts['course_practice_phrases (id renamed)'] = renOld.length;
  counts['course_qa_flags.phrase_id'] = land.f;

  // Step 3: every other place a label is written, course-scoped. One statement each,
  // so the permutation is applied simultaneously (L01->L02 and L02->L01 never chain).
  await one('course_practice_phrases.lego_id',
    `UPDATE course_practice_phrases SET lego_id = $2::jsonb ->> lego_id${phraseStamp} WHERE course_code = $1 AND lego_id = ANY($3::text[])`,
    [courseCode, labelJson, oldLabels]);
  await one('course_practice_phrases.connected_lego_ids',
    `UPDATE course_practice_phrases
        SET connected_lego_ids = ARRAY(SELECT COALESCE($2::jsonb ->> x, x) FROM unnest(connected_lego_ids) WITH ORDINALITY u(x, o) ORDER BY o)${phraseStamp}
      WHERE course_code = $1 AND connected_lego_ids && $3::text[]`,
    [courseCode, labelJson, oldLabels]);
  const tiles = await client.query(
    `WITH hit AS (
       SELECT id,
              (SELECT count(*) FROM jsonb_array_elements(decomposition) e
                WHERE jsonb_typeof(e) = 'object' AND e ->> 'legoId' = ANY($3::text[]))::int AS n
         FROM course_practice_phrases
        WHERE course_code = $1 AND jsonb_typeof(decomposition) = 'array')
     UPDATE course_practice_phrases p
        SET decomposition = (SELECT jsonb_agg(CASE WHEN jsonb_typeof(e) = 'object' AND e ->> 'legoId' = ANY($3::text[])
                                                   THEN jsonb_set(e, '{legoId}', to_jsonb($2::jsonb ->> (e ->> 'legoId'))) ELSE e END ORDER BY o)
                               FROM jsonb_array_elements(p.decomposition) WITH ORDINALITY a(e, o))${phraseStamp}
       FROM hit WHERE p.id = hit.id AND hit.n > 0
     RETURNING hit.n`,
    [courseCode, labelJson, oldLabels]);
  counts['decomposition phrases'] = tiles.rowCount;
  counts['decomposition tiles'] = tiles.rows.reduce((a, r) => a + r.n, 0);
  await one('course_qa_flags.lego_id',
    `UPDATE course_qa_flags SET lego_id = $2::jsonb ->> lego_id WHERE course_code = $1 AND lego_id = ANY($3::text[])`, [courseCode, labelJson, oldLabels]);
  await one('course_audio.lego_id',
    `UPDATE course_audio SET lego_id = $2::jsonb ->> lego_id WHERE course_code = $1 AND lego_id = ANY($3::text[])`, [courseCode, labelJson, oldLabels]);
  if (await columnsExist(client, 'course_audio_usage', ['course_code', 'lego_id'])) {
    await one('course_audio_usage.lego_id',
      `UPDATE course_audio_usage SET lego_id = $2::jsonb ->> lego_id WHERE course_code = $1 AND lego_id = ANY($3::text[])`, [courseCode, labelJson, oldLabels]);
  }
  // Unique on (course_code, lego_id): park, then land.
  for (const table of ['lego_introductions', 'course_lego_positions']) {
    if (!await columnsExist(client, table, ['course_code', 'lego_id'])) continue;
    await one(`${table}.lego_id`,
      `UPDATE ${q(table)} SET lego_id = lego_id || '${PARK_TAG}' WHERE course_code = $1 AND lego_id = ANY($2::text[])`, [courseCode, oldLabels]);
    await client.query(
      `UPDATE ${q(table)} SET lego_id = $2::jsonb ->> replace(lego_id, '${PARK_TAG}', '') WHERE course_code = $1 AND lego_id = ANY($3::text[])`,
      [courseCode, labelJson, oldLabels.map(l => l + PARK_TAG)]);
  }
  let signoffs = null;
  if (await columnsExist(client, 'course_round_signoffs', ['course_code', 'lego_id'])) {
    signoffs = (await client.query(
      `SELECT count(*)::int AS n FROM course_round_signoffs WHERE course_code = $1 AND lego_id = ANY($2::text[])`, [courseCode, oldLabels])).rows[0].n;
  }

  // Read back: the uuids must now stand in the requested order.
  const after = (await client.query(
    `SELECT id, lego_index, lego_id, known_text, target_text FROM course_legos WHERE course_code = $1 AND seed_number = $2 ORDER BY lego_index`,
    [courseCode, seed])).rows;
  if (JSON.stringify(after.map(r => r.id)) !== JSON.stringify(picked.map(l => l.id))) fail('read-back order differs from the requested order', 'BAD_STATE');

  return {
    lego_ids: oldLabels,
    phrase_ids: [...idRename.values()],
    // The reverse reorder, by uuid: the labels are permuted, so this restores every label exactly.
    undo: { op: 'lego.reorder', seed_number: seed, order: legos.map(l => l.id) },
    result: {
      before: legos.map(l => ({ id: l.id, lego_id: l.lego_id, known_text: l.known_text, target_text: l.target_text })),
      after: after.map(r => ({ id: r.id, lego_id: r.lego_id, known_text: r.known_text, target_text: r.target_text })),
      label_map: Object.fromEntries(label),
      phrase_id_map: Object.fromEntries(idRename),
      moved: counts,
      learner_state: { ...learner, total: learnerRows, ...(learnerRows ? { on_apply: 'REFUSED (LEARNER_STATE)' } : {}) },
      not_carried: { course_round_signoffs: signoffs },
    },
  };
}

module.exports = { runReorder, reorderLabelMap, renamedPhraseId };
