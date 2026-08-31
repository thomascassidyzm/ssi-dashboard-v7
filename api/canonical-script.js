/**
 * The Script Lab's line editor — saving WITH a history behind it.
 *
 *   GET  /api/canonical-script?line=<scenario_id>          → the line, its current text, its versions
 *   GET  /api/canonical-script?slug=<pod_slug>&history=1   → every edited line in that script
 *   POST /api/canonical-script?line=<scenario_id>          → save. Body: { english_text, speaker?, author_notes? }
 *   POST /api/canonical-script?line=<id>&restore=1         → restore. Body: { versionId }
 *
 * Until this route existed, editing a canonical script line was a straight
 * UPDATE with nothing kept: no history, no attribution, no way back. The rule
 * in this estate is that learner-facing copy gets an editable page WITH
 * versioning and a diff back, and this is that, following api/copy.js rather
 * than inventing a second pattern.
 *
 * A save does three things, in this order:
 *   1. if this line has never been edited, freeze its PRE-EDIT state as the
 *      'original' version — once, ever;
 *   2. append a 'save' version carrying the line's new state in full;
 *   3. update canonical_pod_scenarios, which stays the one place the generator
 *      reads the live text from.
 * The history is written BEFORE the live text moves, so a failure between the
 * two leaves an unused version row rather than an unrecoverable edit.
 *
 * A restore appends a save carrying an older version's words. Nothing is ever
 * deleted or overwritten — the table's trigger refuses both.
 *
 * WHY THIS LIVES IN api/ AND NOT services/production-api.cjs: api/*.js are
 * Vercel routes that ship with the front end on every deploy. production-api is
 * a long-lived process on watson-1 that does not auto-deploy, so a new route
 * there 404s live until a human restarts a shared process. The Script Lab still
 * READS from production-api (that route already exists and is running); only
 * the new write path is here.
 *
 * Auth: Popty session only — Bearer Supabase JWT, verified by verifySupabaseJWT,
 * exactly as api/copy.js. Every version row is stamped with the editor's email.
 */

import { verifySupabaseJWT } from './lib/auth.js';
import { getSupabase } from './lib/supabase.js';
import {
  hasOriginal, originalRowFrom, patchFor, saveRowFrom,
  versionList, editSummary, pickVersion, EDITABLE_FIELDS
} from './lib/canonical-script-versions.js';

const VERSIONS = 'canonical_script_versions';
const LINES = 'canonical_pod_scenarios';
const MAX_CHARS = 20_000;

async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Sign in to Popty first' });
    return null;
  }
  const user = await verifySupabaseJWT(token);
  if (!user) {
    res.status(403).json({ error: 'This sign-in has no Popty access — sign out and sign in with your Popty email' });
    return null;
  }
  return user;
}

/** Truthy for ?flag=1, ?flag, and { flag: true } in the body. */
function flagged(req, name) {
  const q = req.query?.[name];
  if (q !== undefined && q !== 'false' && q !== '0') return true;
  return req.body?.[name] === true;
}

async function loadLine(supabase, id) {
  const { data, error } = await supabase
    .from(LINES)
    .select('id, pod_slug, scene_number, sentence_number, speaker, english_text, author_notes')
    .eq('id', id)
    .maybeSingle();
  return { line: data ?? null, error };
}

async function loadVersions(supabase, scenarioId) {
  const { data, error } = await supabase
    .from(VERSIONS)
    .select('id, scenario_id, pod_slug, kind, english_text, speaker, author_notes, saved_at, saved_by')
    .eq('scenario_id', scenarioId)
    .order('id', { ascending: true });
  return { rows: data || [], error };
}

/** Freeze-then-append, shared by save and restore. Returns { versionId, savedAt } or { error }. */
async function recordVersion(supabase, line, rows, patch, savedBy) {
  if (!hasOriginal(rows)) {
    const { error } = await supabase.from(VERSIONS).insert(originalRowFrom(line, savedBy)).select('id').single();
    // A duplicate here means another editor froze the same line a moment ago —
    // the partial unique index doing its job. That is fine: the original exists,
    // which is all this step was for.
    if (error && !/duplicate|unique/i.test(error.message || '')) return { error };
  }
  const { data, error } = await supabase
    .from(VERSIONS)
    .insert(saveRowFrom(line, patch, savedBy))
    .select('id, saved_at')
    .single();
  if (error) return { error };
  return { versionId: Number(data.id), savedAt: data.saved_at };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await requireUser(req, res);
  if (!user) return;

  const editor = user.email || user.name || 'unknown';

  // Which lines in this script have been touched, and by whom — one read, so
  // the page can chip every edited line without a request per line.
  if (req.method === 'GET' && req.query?.slug && flagged(req, 'history')) {
    const slug = String(req.query.slug);
    const { data, error } = await supabase
      .from(VERSIONS)
      .select('id, scenario_id, kind, saved_at, saved_by')
      .eq('pod_slug', slug)
      .order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    const lines = editSummary(data || []);
    return res.json({ slug, lines, editedLines: lines.length });
  }

  const lineId = req.query?.line;
  if (!lineId) return res.status(400).json({ error: 'Which line? Pass ?line=<scenario_id>, or ?slug=<pod_slug>&history=1' });

  const { line, error: lineErr } = await loadLine(supabase, String(lineId));
  if (lineErr) return res.status(500).json({ error: lineErr.message });
  if (!line) return res.status(404).json({ error: `No such canonical line: ${lineId}` });

  if (req.method === 'GET') {
    const { rows, error } = await loadVersions(supabase, line.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({
      line: {
        id: line.id,
        podSlug: line.pod_slug,
        speaker: line.speaker ?? null,
        englishText: line.english_text ?? '',
        authorNotes: line.author_notes ?? null
      },
      versions: versionList(rows),
      edits: rows.filter(r => r.kind === 'save').length
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rows, error: rowsErr } = await loadVersions(supabase, line.id);
  if (rowsErr) return res.status(500).json({ error: rowsErr.message });

  // ── Restore: append an older version's words as a new save ────────────────
  if (flagged(req, 'restore')) {
    const asked = req.body?.versionId;
    if (asked === undefined || asked === null || asked === '') {
      return res.status(400).json({ error: 'Which version? Pass { versionId }' });
    }
    const target = pickVersion(rows, asked);
    if (!target) return res.status(404).json({ error: `No version ${asked} of line ${line.id}` });

    const patch = patchFor(line, {
      english_text: target.english_text ?? '',
      speaker: target.speaker ?? '',
      author_notes: target.author_notes ?? ''
    });
    if (!Object.keys(patch).length) {
      return res.json({ ok: true, unchanged: true, versionId: Number(target.id), line: { id: line.id, englishText: line.english_text } });
    }

    const rec = await recordVersion(supabase, line, rows, patch, editor);
    if (rec.error) return res.status(500).json({ error: rec.error.message });

    const { data: updated, error: upErr } = await supabase
      .from(LINES).update(patch).eq('id', line.id)
      .select('id, english_text, speaker, author_notes').maybeSingle();
    if (upErr) return res.status(500).json({ error: upErr.message });

    return res.json({
      ok: true, restored: true, fromVersionId: Number(target.id),
      versionId: rec.versionId, savedAt: rec.savedAt,
      line: { id: line.id, englishText: updated?.english_text ?? patch.english_text ?? line.english_text }
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  if (typeof req.body?.english_text === 'string' && req.body.english_text.length > MAX_CHARS) {
    return res.status(413).json({ error: 'Too large' });
  }
  if (!EDITABLE_FIELDS.some(f => typeof req.body?.[f] === 'string')) {
    return res.status(400).json({ error: `Send at least one of: ${EDITABLE_FIELDS.join(', ')}` });
  }
  if (typeof req.body?.english_text === 'string' && !req.body.english_text.trim()) {
    return res.status(400).json({ error: 'A canonical line cannot be emptied — edit it or leave it' });
  }

  const patch = patchFor(line, req.body);
  // Nothing typed. A blur is not an edit, and a no-op save that minted a version
  // row would fill the history with duplicates of the same words.
  if (!Object.keys(patch).length) {
    return res.json({ ok: true, unchanged: true, line: { id: line.id, englishText: line.english_text } });
  }

  const rec = await recordVersion(supabase, line, rows, patch, editor);
  if (rec.error) return res.status(500).json({ error: rec.error.message });

  const { data: updated, error: upErr } = await supabase
    .from(LINES).update(patch).eq('id', line.id)
    .select('id, english_text, speaker, author_notes').maybeSingle();
  if (upErr) return res.status(500).json({ error: upErr.message });

  return res.json({
    ok: true,
    versionId: rec.versionId,
    savedAt: rec.savedAt,
    savedBy: editor,
    edits: rows.filter(r => r.kind === 'save').length + 1,
    line: {
      id: line.id,
      englishText: updated?.english_text ?? patch.english_text ?? line.english_text,
      speaker: updated?.speaker ?? line.speaker ?? null,
      authorNotes: updated?.author_notes ?? line.author_notes ?? null
    }
  });
}
