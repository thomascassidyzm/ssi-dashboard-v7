/**
 * The /guess game's text, edited in Popty (the canonical home; the game reads it back from
 * api/guess-text-published.js). Behind the Popty sign-in, like the Copy area.
 *
 *   GET  /api/guess-text?known=eng                     → { known, items: [{ kind, id, live }] }
 *   POST /api/guess-text   { action:'save', known, kind, id, content }  → the new text is LIVE at once
 *
 * SAVE IS LIVE (Tom 2026-10-04: no draft/approve step; /guess is not public yet, so no review gate).
 * A save (the guess_text_save SQL function, atomic) writes a new state='live' row stamped with who and when (edited_by, approved_by/at), and the
 * row it replaces is kept as 'superseded', so nothing is lost and every change has a name.
 * The friendlier (humanised) wording is the canonical live text; the pre-humanised wording is history.
 */
import { verifySupabaseJWT } from './lib/auth.js';
import { getSupabase } from './lib/supabase.js';
import { KINDS, DEFAULT_KNOWN, validKnown, validateItem, itemsForEditor } from './lib/guess-text.js';

const TABLE = 'guess_text_items';

async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Sign in to Popty first' }); return null; }
  const user = await verifySupabaseJWT(token);
  if (!user) { res.status(403).json({ error: 'This sign-in has no Popty access — sign out and sign in with your Popty email' }); return null; }
  return user;
}

const COLS = 'id, known_lang, kind, item_id, content, state, source, edited_by, created_at, approved_by, approved_at';

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
  const who = user.email || user.name || 'unknown';

  const known = (req.method === 'GET' ? req.query?.known : req.body?.known) || DEFAULT_KNOWN;
  if (!validKnown(known)) return res.status(400).json({ error: 'known must be a three-letter language code, e.g. eng' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from(TABLE).select(COLS).eq('known_lang', known).order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ known, kinds: KINDS, items: itemsForEditor(data || []) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, kind, id } = req.body || {};

  if (action === 'save') {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : req.body?.content;
    const bad = validateItem({ kind, item_id: id, content });
    if (bad) return res.status(400).json({ error: bad });
    // An item is only editable once it exists (seeded): the editor cannot conjure new ids,
    // so the game's stable item ids stay the only keys.
    const { data: existing, error: e0 } = await supabase.from(TABLE).select('id').eq('known_lang', known).eq('kind', kind).eq('item_id', id);
    if (e0) return res.status(500).json({ error: e0.message });
    if (known === DEFAULT_KNOWN && !(existing || []).length) return res.status(404).json({ error: `No such item: ${kind} ${id}` });
    // ONE transaction in the database (supersede the old live row + insert the new one), so a crash
    // between the two can never leave the item with no live text. See tools/guess-text/setup-save-fn.cjs.
    const { data, error } = await supabase.rpc('guess_text_save', { p_known: known, p_kind: kind, p_item: id, p_content: content, p_who: who })
    if (error) return res.status(500).json({ error: error.message });
    const saved = Array.isArray(data) ? data[0] : data
    return res.json({ ok: true, id: Number(saved.id), savedAt: saved.created_at });
  }

  return res.status(400).json({ error: 'action must be save' });
}
