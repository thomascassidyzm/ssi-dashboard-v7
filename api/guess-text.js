/**
 * The /guess game's text, edited in Popty (the canonical home; the game reads it back from
 * api/guess-text-published.js). Behind the Popty sign-in, like the Copy area.
 *
 *   GET  /api/guess-text?known=eng                     → { known, items: [{ kind, id, live, draft }] }
 *   POST /api/guess-text   { action:'save',        known, kind, id, content }  → write the DRAFT for one item
 *   POST /api/guess-text   { action:'approve',     known, kind, id }           → draft becomes live
 *   POST /api/guess-text   { action:'approve-all', known, kind? }              → every draft (of a kind) becomes live
 *   POST /api/guess-text   { action:'discard',     known, kind, id }           → drop the draft
 *
 * SAVE NEVER PUBLISHES. Editing, and the seeded humanised draft, only ever write state='draft';
 * a learner reads state='live' rows alone. Approving is a deliberate act, stamped with who did
 * it; the replaced live row is kept as 'superseded', so nothing is lost and every change has a name.
 * Nothing in this file promotes a draft on its own.
 *
 * Every write records the editor's email (verified Popty JWT) in edited_by / approved_by.
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

/** Make `draft` the live row for its item; the old live row (if any) is kept as superseded. */
async function promote(supabase, draft, who) {
  const { known_lang, kind, item_id } = draft;
  const { data: lives, error: e1 } = await supabase.from(TABLE).select('id').eq('known_lang', known_lang).eq('kind', kind).eq('item_id', item_id).eq('state', 'live');
  if (e1) return e1;
  for (const l of lives || []) {
    const { error } = await supabase.from(TABLE).update({ state: 'superseded' }).eq('id', l.id);
    if (error) return error;
  }
  const { error } = await supabase.from(TABLE).update({ state: 'live', approved_by: who, approved_at: new Date().toISOString() }).eq('id', draft.id);
  return error || null;
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
    const { data: existing, error: e0 } = await supabase.from(TABLE).select('id, state').eq('known_lang', known).eq('kind', kind).eq('item_id', id);
    if (e0) return res.status(500).json({ error: e0.message });
    if (known === DEFAULT_KNOWN && !(existing || []).length) return res.status(404).json({ error: `No such item: ${kind} ${id}` });
    for (const r of (existing || []).filter(r => r.state === 'draft')) {
      const { error } = await supabase.from(TABLE).update({ state: 'superseded' }).eq('id', r.id);
      if (error) return res.status(500).json({ error: error.message });
    }
    const { data, error } = await supabase.from(TABLE)
      .insert({ known_lang: known, kind, item_id: id, content, state: 'draft', source: 'editor', edited_by: who })
      .select('id, created_at').single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, draftId: Number(data.id), savedAt: data.created_at });
  }

  if (action === 'approve' || action === 'discard') {
    if (!KINDS.includes(kind) || typeof id !== 'string') return res.status(400).json({ error: 'kind and id are required' });
    const { data, error } = await supabase.from(TABLE).select(COLS).eq('known_lang', known).eq('kind', kind).eq('item_id', id).eq('state', 'draft');
    if (error) return res.status(500).json({ error: error.message });
    const draft = (data || [])[0];
    if (!draft) return res.status(404).json({ error: 'No draft for that item' });
    const err = action === 'approve'
      ? await promote(supabase, draft, who)
      : (await supabase.from(TABLE).update({ state: 'superseded' }).eq('id', draft.id)).error;
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ ok: true, action });
  }

  if (action === 'approve-all') {
    if (kind !== undefined && !KINDS.includes(kind)) return res.status(400).json({ error: 'bad kind' });
    const { data, error } = await supabase.from(TABLE).select(COLS).eq('known_lang', known).eq('state', 'draft');
    if (error) return res.status(500).json({ error: error.message });
    let approved = 0;
    for (const d of (data || []).filter(d => !kind || d.kind === kind)) {
      const err = await promote(supabase, d, who);
      if (err) return res.status(500).json({ error: err.message, approved });
      approved++;
    }
    return res.json({ ok: true, approved });
  }

  return res.status(400).json({ error: 'action must be save, approve, approve-all or discard' });
}
