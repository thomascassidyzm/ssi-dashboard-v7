// services/shared/course-edit-ops.cjs
//
// THE ONE ENGINE behind Popty's course-edit door (job #391, 2026-10-14).
//
// Why it exists: since job #388 the agent login (agent_script) can read every
// course table and write none of them. The edits agents used to make by SQL —
// relink a slot to a clip, fix a seed/LEGO/phrase text, drop or insert a phrase,
// correct a clip's metadata, fix a gender expansion — now go through Popty, which
// resolves who is asking (content-edit-gate.cjs) and keeps an undo. This module is
// that "go through Popty": one op vocabulary, used by the single-op route, the
// batch route and the legacy PATCH lego route alike.
//
// The shape, and why:
//   - ALL ops of a request run in ONE Postgres transaction on the owner login.
//     A sweep either lands whole or not at all; there is no half-applied batch.
//   - DRY RUN IS THE SAME TRANSACTION, ROLLED BACK. The preview therefore shows
//     exactly what the database would do, triggers included (a text edit that
//     makes null_*_audio_on_text_change re-point or drop a clip shows up in the
//     dry run's "after"), rather than what this file guesses it would do.
//   - THE UNDO IS DERIVED, NOT AUTHORED: every touched row is read before and
//     after, and the undo of an update sets back every column that differs — the
//     trigger's side effects included. Undo ops are ordinary ops: post them back.
//   - Text columns are written before audio columns, in two statements, because
//     the text-change triggers re-derive the audio links from OLD.*: restoring a
//     text and its old clip in one UPDATE would let the trigger overwrite the clip.
//   - Every op may carry `expect: {column: value}` — a before-state assertion.
//     Drift aborts the whole transaction (the sweep protocol's "abort on drift").

const { hasNonExampleText } = require('../course-builder/lib/validation.cjs');

const MAX_OPS = 2000;

// Columns that are never set by a caller: identity, bookkeeping, triggers' own.
const NEVER_SET = new Set(['course_code', 'last_edit_event_id', 'version', 'updated_at', 'created_at']);
const AUDIO_COLS = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'];
// Ignored when diffing before/after for the undo: the database moves them itself.
const DIFF_IGNORE = new Set(['version', 'updated_at', 'last_edit_event_id', 'text_normalized']);

// What an `update` op may set, per table. Audio-slot columns are allowed on the
// content tables so an undo can put a clip back; the checked door for linking a
// clip is `audio.link`, which proves the clip speaks the row's words.
const UPDATABLE = {
  course_seeds: ['known_text', 'target_text', 'target_text_roman', 'status', 'approved_at',
    'known_audio_id', 'target1_audio_id', 'target2_audio_id'],
  course_legos: ['known_text', 'target_text', 'type', 'is_new', 'components', 'status',
    'target_text_roman', 'known_gloss_segments', 'target_lego_id',
    'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
  course_practice_phrases: ['known_text', 'target_text', 'phrase_role', 'position', 'introduce',
    'status', 'register', 'difficulty', 'lego_id', 'connected_lego_ids', 'lego_position',
    'target_text_roman', 'metadata', 'known_gloss_segments', 'word_count', 'lego_count',
    'target_syllable_count', 'target_phrase_id', 'decomposition', 'decomposition_course_version',
    'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
  // s3_key, clip_id, id and course_code are not metadata: moving them moves the
  // file a slot plays, which is the render route's business, not this door's.
  course_audio: ['text', 'text_stripped', 'role', 'voice_id', 'origin', 'lego_id', 'language',
    'rerecord_wanted', 'word_boundaries', 'word_timings', 'duration_ms', 'sequence', 'recorded_at',
    'veracity_pass', 'veracity_reason', 'veracity_checked_at', 'veracity_checker'],
  course_gender_expansions: ['original_text', 'language', 'expanded_f', 'expanded_m', 'text_side', 'processed_at'],
};

// Insertable = any live column except NEVER_SET (an undo of a delete puts the
// whole row back, audio links, decomposition and all).
const INSERTABLE_TABLES = new Set(['course_practice_phrases', 'course_gender_expansions', 'course_legos']);
const DELETABLE_TABLES = new Set(['course_practice_phrases', 'course_gender_expansions', 'course_legos']);
// course_legos.lego_id is a GENERATED column (S<seed>L<index>): it is read, never written.
const GENERATED = { course_legos: ['lego_id'] };
const LEGO_TYPES = ['A', 'M'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGO_ID_RE = /^S\d{4}L\d{2}$/;
const SLOTS = ['known', 'target1', 'target2', 'presentation'];

class EditOpError extends Error {
  constructor(index, message, code = 'BAD_OP') { super(`op ${index}: ${message}`); this.index = index; this.code = code; }
}

/** The op vocabulary, served by GET /api/production/:courseCode/edit-ops. */
const OP_HELP = {
  'seed.update':   { key: 'seed_number', set: UPDATABLE.course_seeds },
  'lego.update':   { key: 'lego_id (S0001L02) or id (uuid)', set: UPDATABLE.course_legos },
  'phrase.update': { key: 'phrase_id', set: UPDATABLE.course_practice_phrases },
  'phrase.insert': { row: 'full course_practice_phrases row; id must start "<course>:"' },
  'phrase.delete': { key: 'phrase_id', note: 'its course_qa_flags rows go with it' },
  'lego.insert':   { row: 'course_legos row: seed_number (the seed must exist), lego_index (free), known_text, target_text, type A|M (M needs components[]); lego_id is derived',
                     note: 'structural: on a beta/released course an apply needs "tom_go". The undo is lego.delete.' },
  'lego.delete':   { key: 'lego_id (S0001L02) or id (uuid)', cascade_phrases: 'true to delete its BUILD/USE/component rows with it; otherwise refused while any remain',
                     note: 'structural: on a beta/released course an apply needs "tom_go". Clips are never deleted. The undo re-inserts the LEGO and its phrases whole.' },
  'audio.link':    { key: 'target: seed|lego|phrase + seed_number|lego_id|phrase_id', slot: SLOTS,
                     audio_id: 'course_audio id, or null to unlink',
                     note: 'refused unless the clip speaks the row\'s words (normalize_text); allow_text_mismatch:true overrides. presentation is exempt.' },
  'audio.update':  { key: 'audio_id', set: UPDATABLE.course_audio },
  'gender.update': { key: 'id', set: UPDATABLE.course_gender_expansions },
  'gender.insert': { row: 'course_gender_expansions row (id optional)' },
  'gender.delete': { key: 'id' },
  common: { expect: '{column: value} before-state assertion; drift aborts the whole request' },
};

/** Resolve one op into { table, kind, where, set|row, ... }. Pure; throws EditOpError. */
function planOp(op, index, courseCode) {
  if (!op || typeof op !== 'object') throw new EditOpError(index, 'not an object');
  const name = op.op;
  const expect = op.expect && typeof op.expect === 'object' ? op.expect : null;
  const base = { index, name, expect };

  const needSet = (table) => {
    const set = op.set;
    if (!set || typeof set !== 'object' || !Object.keys(set).length) throw new EditOpError(index, `${name} needs a non-empty "set"`);
    const bad = Object.keys(set).filter(c => !UPDATABLE[table].includes(c));
    if (bad.length) throw new EditOpError(index, `${name} cannot set ${bad.join(', ')} (allowed: ${UPDATABLE[table].join(', ')})`);
    for (const c of ['known_text', 'target_text']) {
      if (c in set && table !== 'course_audio' && (typeof set[c] !== 'string' || !set[c].trim() || hasNonExampleText(set[c]))) {
        throw new EditOpError(index, `${c} must be plain speakable text: no brackets, (notes) or slash-separated alternatives`, 'NON_EXAMPLE_TEXT');
      }
    }
    return set;
  };

  switch (name) {
    case 'seed.update': {
      const n = Number(op.seed_number);
      if (!Number.isInteger(n) || n < 1) throw new EditOpError(index, 'seed.update needs seed_number');
      return { ...base, table: 'course_seeds', kind: 'update', where: { course_code: courseCode, seed_number: n }, set: needSet('course_seeds') };
    }
    case 'lego.update': {
      return { ...base, table: 'course_legos', kind: 'update', where: legoWhere(op, index, courseCode), set: needSet('course_legos') };
    }
    case 'phrase.update': {
      return { ...base, table: 'course_practice_phrases', kind: 'update', where: phraseWhere(op, index, courseCode), set: needSet('course_practice_phrases') };
    }
    case 'lego.insert': {
      const row = op.row;
      if (!row || typeof row !== 'object') throw new EditOpError(index, 'lego.insert needs "row"');
      const seedN = Number(row.seed_number), idx = Number(row.lego_index);
      if (!Number.isInteger(seedN) || seedN < 1) throw new EditOpError(index, 'lego.insert row.seed_number must be a positive integer');
      if (!Number.isInteger(idx) || idx < 1) throw new EditOpError(index, 'lego.insert row.lego_index must be a positive integer');
      // A row that carries its `id` is a RESTORE (the undo of lego.delete puts back exactly what was there,
      // legacy values and all); only a NEW LEGO is held to the content shape.
      const restoring = row.id !== undefined;
      if (typeof row.target_text !== 'string' || !row.target_text.trim()) throw new EditOpError(index, 'lego.insert row.target_text is required');
      if (!restoring) {
        for (const c of ['known_text', 'target_text']) {
          if (typeof row[c] !== 'string' || !row[c].trim()) throw new EditOpError(index, `lego.insert row.${c} is required`);
          if (hasNonExampleText(row[c])) throw new EditOpError(index, `${c} must be plain speakable text: no brackets, (notes) or slash-separated alternatives`, 'NON_EXAMPLE_TEXT');
        }
        if (!LEGO_TYPES.includes(row.type)) throw new EditOpError(index, `lego.insert row.type must be one of ${LEGO_TYPES.join(', ')}`);
        if (row.type === 'M' && !(Array.isArray(row.components) && row.components.length)) throw new EditOpError(index, 'an M LEGO needs a non-empty components[] (its tiling parts)');
      }
      if (row.lego_id !== undefined && row.lego_id !== legoIdOf(seedN, idx)) throw new EditOpError(index, `row.lego_id is derived from seed_number + lego_index (${legoIdOf(seedN, idx)}); leave it out`);
      if (row.id !== undefined && !UUID_RE.test(String(row.id))) throw new EditOpError(index, 'lego.insert row.id must be a uuid when given');
      return { ...base, table: 'course_legos', kind: 'insert', structural: true, row: stripNeverSet(row, 'course_legos'),
        key: { seed_number: seedN, lego_index: idx }, courseCode };
    }
    case 'lego.delete': {
      return { ...base, table: 'course_legos', kind: 'delete', structural: true, cascadePhrases: op.cascade_phrases === true, where: legoWhere(op, index, courseCode) };
    }
    case 'phrase.delete': {
      return { ...base, table: 'course_practice_phrases', kind: 'delete', where: phraseWhere(op, index, courseCode) };
    }
    case 'phrase.insert': {
      const row = op.row;
      if (!row || typeof row !== 'object') throw new EditOpError(index, 'phrase.insert needs "row"');
      if (typeof row.id !== 'string' || !row.id.startsWith(`${courseCode}:`)) {
        throw new EditOpError(index, `phrase.insert row.id must start "${courseCode}:"`);
      }
      for (const c of ['seed_number', 'lego_index', 'known_text', 'target_text', 'phrase_role']) {
        if (row[c] === undefined || row[c] === null || row[c] === '') throw new EditOpError(index, `phrase.insert row.${c} is required`);
      }
      for (const c of ['known_text', 'target_text']) {
        if (hasNonExampleText(row[c])) throw new EditOpError(index, `${c} must be plain speakable text`, 'NON_EXAMPLE_TEXT');
      }
      return { ...base, table: 'course_practice_phrases', kind: 'insert', row: stripNeverSet(row, 'course_practice_phrases'), key: { id: row.id }, courseCode };
    }
    case 'audio.link': {
      const slot = op.slot;
      if (!SLOTS.includes(slot)) throw new EditOpError(index, `audio.link slot must be one of ${SLOTS.join(', ')}`);
      const audioId = op.audio_id === undefined ? undefined : op.audio_id;
      if (audioId !== null && !(typeof audioId === 'string' && UUID_RE.test(audioId))) {
        throw new EditOpError(index, 'audio.link audio_id must be a course_audio uuid, or null to unlink');
      }
      let table, where;
      if (op.target === 'seed') {
        if (slot === 'presentation') throw new EditOpError(index, 'a seed has no presentation slot');
        const n = Number(op.seed_number);
        if (!Number.isInteger(n) || n < 1) throw new EditOpError(index, 'audio.link on a seed needs seed_number');
        table = 'course_seeds'; where = { course_code: courseCode, seed_number: n };
      } else if (op.target === 'lego') {
        table = 'course_legos'; where = legoWhere(op, index, courseCode);
      } else if (op.target === 'phrase') {
        table = 'course_practice_phrases'; where = phraseWhere(op, index, courseCode);
      } else {
        throw new EditOpError(index, 'audio.link target must be seed, lego or phrase');
      }
      return { ...base, table, kind: 'update', where, set: { [`${slot}_audio_id`]: audioId },
        link: { slot, audioId, allowTextMismatch: op.allow_text_mismatch === true } };
    }
    case 'audio.update': {
      if (!UUID_RE.test(String(op.audio_id || ''))) throw new EditOpError(index, 'audio.update needs audio_id (uuid)');
      return { ...base, table: 'course_audio', kind: 'update', where: { course_code: courseCode, id: op.audio_id }, set: needSet('course_audio') };
    }
    case 'gender.update': {
      if (!UUID_RE.test(String(op.id || ''))) throw new EditOpError(index, 'gender.update needs id (uuid)');
      return { ...base, table: 'course_gender_expansions', kind: 'update', where: { course_code: courseCode, id: op.id }, set: needSet('course_gender_expansions') };
    }
    case 'gender.delete': {
      if (!UUID_RE.test(String(op.id || ''))) throw new EditOpError(index, 'gender.delete needs id (uuid)');
      return { ...base, table: 'course_gender_expansions', kind: 'delete', where: { course_code: courseCode, id: op.id } };
    }
    case 'gender.insert': {
      const row = op.row;
      if (!row || typeof row !== 'object' || !row.original_text) throw new EditOpError(index, 'gender.insert needs row.original_text');
      if (row.id !== undefined && !UUID_RE.test(String(row.id))) throw new EditOpError(index, 'gender.insert row.id must be a uuid when given');
      return { ...base, table: 'course_gender_expansions', kind: 'insert', row: stripNeverSet(row, 'course_gender_expansions'), key: row.id ? { id: row.id } : null, courseCode };
    }
    default:
      throw new EditOpError(index, `unknown op "${name}" (known: ${Object.keys(OP_HELP).filter(k => k !== 'common').join(', ')})`);
  }
}

function legoWhere(op, index, courseCode) {
  if (op.id && UUID_RE.test(String(op.id))) return { course_code: courseCode, id: op.id };
  if (LEGO_ID_RE.test(String(op.lego_id || ''))) return { course_code: courseCode, lego_id: op.lego_id };
  throw new EditOpError(index, `${op.op} needs lego_id like S0001L02 (or the row uuid as id)`);
}
function phraseWhere(op, index, courseCode) {
  const id = String(op.phrase_id || '');
  if (!id.startsWith(`${courseCode}:`)) throw new EditOpError(index, `${op.op} needs phrase_id starting "${courseCode}:"`);
  return { course_code: courseCode, id };
}
const legoIdOf = (seed, index) => `S${String(seed).padStart(4, '0')}L${String(index).padStart(2, '0')}`;
function stripNeverSet(row, table) {
  const out = {};
  const generated = GENERATED[table] || [];
  for (const [k, v] of Object.entries(row)) if ((!NEVER_SET.has(k) || k === 'created_at') && !generated.includes(k)) out[k] = v;
  return out;
}

/** Validate a whole request before any database work. Returns plans or throws. */
function planOps(ops, courseCode) {
  if (!Array.isArray(ops) || !ops.length) throw new EditOpError(-1, '"ops" must be a non-empty array');
  if (ops.length > MAX_OPS) throw new EditOpError(-1, `at most ${MAX_OPS} ops per request (got ${ops.length})`);
  return ops.map((op, i) => planOp(op, i, courseCode));
}

// ─── SQL ────────────────────────────────────────────────────────────────────

function q(ident) { return `"${String(ident).replace(/"/g, '""')}"`; }

/** Column types, read once per transaction: json/jsonb values are stringified, arrays passed as arrays. */
async function columnTypes(client, table) {
  const { rows } = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table]);
  return new Map(rows.map(r => [r.column_name, r.data_type]));
}
function paramValue(types, col, v) {
  const t = types.get(col);
  if (v !== null && v !== undefined && (t === 'json' || t === 'jsonb')) return JSON.stringify(v);
  return v;
}

function whereSql(where, params) {
  return Object.entries(where).map(([c, v]) => { params.push(v); return `${q(c)} = $${params.length}`; }).join(' AND ');
}

async function selectRow(client, table, where, { lock = false } = {}) {
  const params = [];
  const sql = `SELECT * FROM ${q(table)} WHERE ${whereSql(where, params)}${lock ? ' FOR UPDATE' : ''}`;
  const { rows } = await client.query(sql, params);
  return rows;
}

async function updateRow(client, types, table, where, set) {
  if (!Object.keys(set).length) return;
  const params = [];
  const assigns = Object.entries(set).map(([c, v]) => {
    if (!types.has(c)) throw new Error(`${table} has no column ${c}`);
    params.push(paramValue(types, c, v)); return `${q(c)} = $${params.length}`;
  });
  const sql = `UPDATE ${q(table)} SET ${assigns.join(', ')} WHERE ${whereSql(where, params)}`;
  await client.query(sql, params);
}

function same(a, b) {
  if (a instanceof Date) a = a.toISOString();
  if (b instanceof Date) b = b.toISOString();
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a == b; // null ~ undefined
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
}

/** The undo op that turns `after` back into `before` for one row. */
function undoFor(plan, before, after, opName) {
  const keyOf = (row) => plan.table === 'course_practice_phrases' ? { phrase_id: row.id }
    : plan.table === 'course_seeds' ? { seed_number: row.seed_number }
    : plan.table === 'course_legos' ? { id: row.id }
    : plan.table === 'course_audio' ? { audio_id: row.id }
    : { id: row.id };
  const updOp = { course_seeds: 'seed.update', course_legos: 'lego.update', course_practice_phrases: 'phrase.update',
    course_audio: 'audio.update', course_gender_expansions: 'gender.update' }[plan.table];
  const insOp = { course_practice_phrases: 'phrase.insert', course_gender_expansions: 'gender.insert', course_legos: 'lego.insert' }[plan.table];
  const delOp = { course_practice_phrases: 'phrase.delete', course_gender_expansions: 'gender.delete', course_legos: 'lego.delete' }[plan.table];

  if (!before && after) return { op: delOp, ...keyOf(after), ...(plan.table === 'course_legos' ? { lego_id: undefined } : {}) };
  if (before && !after) return { op: insOp, row: stripNeverSet(before, plan.table) };
  const set = {};
  const allowed = new Set(UPDATABLE[plan.table]);
  for (const c of Object.keys(before)) {
    if (DIFF_IGNORE.has(c) || !allowed.has(c)) continue;
    if (!same(before[c], after[c])) set[c] = before[c] instanceof Date ? before[c].toISOString() : before[c];
  }
  if (!Object.keys(set).length) return null;
  return { op: updOp, ...keyOf(after), set };
}

/**
 * Run planned ops in one transaction.
 *
 * @param {Object} args
 * @param {() => Promise<pg.Client>} args.connect   returns a CONNECTED client
 * @param {string}  args.courseCode
 * @param {Array}   args.plans       from planOps()
 * @param {boolean} args.apply       false → roll back (dry run)
 * @param {() => Promise<string>} [args.eventId]  called once, only when applying; its id is stamped on content rows
 * @returns {Promise<{applied, results, undo_ops, touched}>}
 */
async function runPlans({ connect, courseCode, plans, apply, eventId }) {
  const client = await connect();
  const results = [];
  const undo = [];
  const touched = { seed_numbers: new Set(), lego_ids: new Set(), phrase_ids: new Set(), audio_ids: new Set(), legos: false, audio_slots: false };
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = '60s'`);
    const evId = apply && eventId ? await eventId() : null;
    const typesCache = new Map();
    const types = async (t) => { if (!typesCache.has(t)) typesCache.set(t, await columnTypes(client, t)); return typesCache.get(t); };

    for (const plan of plans) {
      const t = await types(plan.table);
      let before = null, after = null, cascadeUndo = null;

      if (plan.kind === 'insert') {
        const row = { ...plan.row, course_code: courseCode };
        if (plan.table === 'course_practice_phrases' && evId) row.last_edit_event_id = evId;
        const cols = Object.keys(row);
        const bad = cols.filter(c => !t.has(c));
        if (bad.length) throw new EditOpError(plan.index, `${plan.table} has no column ${bad.join(', ')}`);
        if (plan.key) {
          const exists = await selectRow(client, plan.table, { course_code: courseCode, ...plan.key });
          if (exists.length) throw new EditOpError(plan.index, `${plan.name}: ${JSON.stringify(plan.key)} already exists`, 'EXISTS');
        }
        if (plan.name === 'lego.insert') {
          // The seed must be there to carry it, and the slot (seed, index) must be free — an id is never reused.
          const seed = await selectRow(client, 'course_seeds', { course_code: courseCode, seed_number: row.seed_number });
          if (!seed.length) throw new EditOpError(plan.index, `lego.insert: ${courseCode} has no seed ${row.seed_number}; a LEGO needs its seed`, 'NO_SUCH_SEED');
          const taken = await selectRow(client, 'course_legos', { course_code: courseCode, seed_number: row.seed_number, lego_index: row.lego_index });
          if (taken.length) throw new EditOpError(plan.index, `lego.insert: ${legoIdOf(row.seed_number, row.lego_index)} already exists`, 'EXISTS');
        }
        // Text first, audio links after (see header): an insert has no OLD, but the
        // phrase trigger refusing component presentation binds still reads NEW.
        const params = cols.map(c => paramValue(t, c, row[c]));
        const { rows } = await client.query(
          `INSERT INTO ${q(plan.table)} (${cols.map(q).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, params);
        after = rows[0];
      } else {
        const rows = await selectRow(client, plan.table, plan.where, { lock: true });
        if (rows.length === 0) throw new EditOpError(plan.index, `${plan.name}: no row ${JSON.stringify(plan.where)}`, 'NOT_FOUND');
        if (rows.length > 1) throw new EditOpError(plan.index, `${plan.name}: ${rows.length} rows match ${JSON.stringify(plan.where)}; refusing`, 'AMBIGUOUS');
        before = rows[0];
        if (plan.expect) {
          const drift = Object.entries(plan.expect).filter(([c, v]) => !same(before[c], v));
          if (drift.length) {
            throw new EditOpError(plan.index, `before-state drift on ${drift.map(([c, v]) => `${c} (expected ${JSON.stringify(v)}, found ${JSON.stringify(before[c])})`).join('; ')}`, 'DRIFT');
          }
        }
        const where = { id: before.id };

        if (plan.kind === 'delete' && plan.table === 'course_legos') {
          // A LEGO with phrases under it is refused unless the caller says the phrases go with it.
          const kids = await selectRow(client, 'course_practice_phrases',
            { course_code: courseCode, seed_number: before.seed_number, lego_index: before.lego_index }, { lock: true });
          if (kids.length && !plan.cascadePhrases) {
            const by = {}; for (const k of kids) by[k.phrase_role] = (by[k.phrase_role] || 0) + 1;
            throw new EditOpError(plan.index, `lego.delete: ${before.lego_id} still has ${kids.length} phrase row(s) (${JSON.stringify(by)}); delete them first or send "cascade_phrases": true`, 'LEGO_HAS_PHRASES');
          }
          for (const k of kids) {
            await client.query(`DELETE FROM course_qa_flags WHERE phrase_id = $1`, [k.id]);
            await client.query(`DELETE FROM course_practice_phrases WHERE id = $1`, [k.id]);
            touched.phrase_ids.add(k.id);
          }
          await client.query(`DELETE FROM course_legos WHERE id = $1`, [before.id]);
          after = null;
          // Undo order matters: the LEGO goes back before its phrases.
          cascadeUndo = [{ op: 'lego.insert', row: stripNeverSet(before, 'course_legos') },
            ...kids.map(k => ({ op: 'phrase.insert', row: stripNeverSet(k, 'course_practice_phrases') }))];
        } else if (plan.kind === 'delete') {
          if (plan.table === 'course_practice_phrases') {
            await client.query(`DELETE FROM course_qa_flags WHERE phrase_id = $1`, [before.id]);
          }
          await client.query(`DELETE FROM ${q(plan.table)} WHERE id = $1`, [before.id]);
          after = null;
        } else {
          if (plan.link && plan.link.audioId) await checkLink(client, plan, before, courseCode);
          const textSet = {}, audioSet = {};
          for (const [c, v] of Object.entries(plan.set)) (AUDIO_COLS.includes(c) ? audioSet : textSet)[c] = v;
          const stamp = evId && 'last_edit_event_id' in before ? { last_edit_event_id: evId } : {};
          await updateRow(client, t, plan.table, where, { ...textSet, ...stamp });
          await updateRow(client, t, plan.table, where, audioSet);
          after = (await selectRow(client, plan.table, where))[0];
        }
      }

      const row = after || before;
      if (row.seed_number) touched.seed_numbers.add(row.seed_number);
      if (plan.table === 'course_legos') { touched.legos = true; if (row.lego_id) touched.lego_ids.add(row.lego_id); }
      if (plan.table === 'course_practice_phrases') touched.phrase_ids.add(row.id);
      if (plan.table === 'course_audio') touched.audio_ids.add(row.id);
      const audioMoved = AUDIO_COLS.some(c => before && after && c in before && !same(before[c], after[c]));
      if (audioMoved || plan.link) touched.audio_slots = true;

      const u = cascadeUndo ? cascadeUndo[0] : undoFor(plan, before, after, plan.name);
      if (cascadeUndo) undo.unshift(...cascadeUndo);
      else if (u) undo.unshift(u);
      results.push({ index: plan.index, op: plan.name, key: plan.where || plan.key, before: summarise(before, plan), after: summarise(after, plan), changed: !!u });
    }

    if (apply) { await client.query('COMMIT'); committed = true; }
    else await client.query('ROLLBACK');
  } catch (err) {
    if (!committed) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
  return {
    applied: committed,
    results,
    undo_ops: undo,
    touched: {
      seed_numbers: [...touched.seed_numbers], lego_ids: [...touched.lego_ids], phrase_ids: [...touched.phrase_ids],
      audio_ids: [...touched.audio_ids], legos: touched.legos, audio_slots: touched.audio_slots,
    },
  };
}

/** audio.link proves the clip exists, and speaks the row's words unless told otherwise. */
async function checkLink(client, plan, before, courseCode) {
  const { slot, audioId, allowTextMismatch } = plan.link;
  const { rows } = await client.query(`SELECT id, course_code, text, language, role, voice_id FROM course_audio WHERE id = $1`, [audioId]);
  if (!rows.length) throw new EditOpError(plan.index, `audio.link: no course_audio row ${audioId}`, 'NO_SUCH_AUDIO');
  if (slot === 'presentation' || allowTextMismatch) return;
  const rowText = slot === 'known' ? before.known_text : before.target_text;
  const { rows: m } = await client.query(`SELECT normalize_text($1) = normalize_text($2) AS ok`, [rows[0].text, rowText]);
  if (!m[0]?.ok) {
    throw new EditOpError(plan.index,
      `audio.link: clip ${audioId} says ${JSON.stringify(rows[0].text)} but the ${slot} text is ${JSON.stringify(rowText)} (allow_text_mismatch:true to link anyway)`,
      'TEXT_MISMATCH');
  }
}

function summarise(row, plan) {
  if (!row) return null;
  const keep = new Set(['id', 'seed_number', 'lego_index', 'lego_id', ...(plan.set ? Object.keys(plan.set) : []),
    'known_text', 'target_text', ...AUDIO_COLS.filter(c => c in row)]);
  if (plan.table === 'course_audio' || plan.table === 'course_gender_expansions') return row;
  const out = {};
  for (const k of keep) if (k in row) out[k] = row[k];
  return out;
}

module.exports = { planOp, planOps, runPlans, undoFor, OP_HELP, UPDATABLE, EditOpError, MAX_OPS };

/**
 * The live-course gate for STRUCTURAL ops (lego.insert, lego.delete). They move the
 * rounds a learner walks, so on a beta/released course an APPLY needs Tom's words
 * ("tom_go"), exactly as the v4 gap-fill door asks. A preview never needs it.
 * Returns null when fine, else {status, error, code}. Pure.
 */
function structuralGate({ plans, courseStatus, apply, tomGo, kaiGo }) {
  if (!apply || !plans.some(p => p.structural)) return null;
  if (['beta', 'released'].includes(courseStatus) && !String(tomGo || '').trim() && !String(kaiGo || '').trim()) {
    return { status: 409, code: 'TOM_GO_REQUIRED',
      error: `refusing: this course is ${courseStatus} (served to learners) and the batch inserts/deletes a LEGO; an apply needs "tom_go": "<Tom's words>". A preview needs nothing.` };
  }
  return null;
}
module.exports.structuralGate = structuralGate;
