/**
 * The Copy area — one editable page per learner-facing copy surface.
 *
 *   GET  /api/copy?list=1      → { docs: [{ id, title, blurb, versions, savedAt, savedBy, edited }] }
 *   GET  /api/copy?doc=<id>    → { id, title, current, original, savedAt, savedBy, versions }
 *   POST /api/copy?doc=<id>    → save a new version. Body: { content: "<text>" }
 *
 * Store is append-only: public.htw_copy_versions holds, per doc_id, one frozen
 * 'original' row (seeded byte-identically from code) plus one 'save' row per save.
 * The original is never overwritten, so every edit stays diffable and recoverable.
 *
 * Known doc ids live in ./lib/copy-docs.js — an id that is not registered is
 * refused, so no client can invent a document.
 *
 * Auth: Popty session only — Bearer Supabase JWT, verified by verifySupabaseJWT
 * (which also enforces dashboard access). No token-in-URL, no anonymous writes.
 *
 * /api/htw-copy is a permanent thin alias for doc=htw: that link is already in
 * someone's inbox and must never break.
 */

import { verifySupabaseJWT } from './lib/auth.js';
import { getSupabase } from './lib/supabase.js';
import { COPY_DOCS, findCopyDoc } from './lib/copy-docs.js';

const MAX_CHARS = 1_000_000;
const TABLE = 'htw_copy_versions';

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

/**
 * @param {object} req
 * @param {object} res
 * @param {string|null} forcedDocId  set by the /api/htw-copy alias; otherwise read from ?doc=
 */
export async function handleCopy(req, res, forcedDocId = null) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });

  const user = await requireUser(req, res);
  if (!user) return;

  // The index: every surface, with how much editing has happened to each.
  if (!forcedDocId && req.method === 'GET' && req.query?.list !== undefined) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('doc_id, kind, saved_at, saved_by')
      .order('saved_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const docs = COPY_DOCS.map(d => {
      const saves = (data || []).filter(r => r.doc_id === d.id && r.kind === 'save');
      const last = saves[saves.length - 1];
      const seeded = (data || []).some(r => r.doc_id === d.id && r.kind === 'original');
      return {
        id: d.id,
        title: d.title,
        blurb: d.blurb,
        seeded,
        versions: saves.length,
        savedAt: last?.saved_at ?? null,
        savedBy: last?.saved_by ?? null
      };
    });
    return res.json({ docs });
  }

  const docId = forcedDocId || req.query?.doc;
  if (!docId) return res.status(400).json({ error: 'Which document? Pass ?doc=<id>' });

  const doc = findCopyDoc(docId);
  if (!doc) return res.status(404).json({ error: `No such copy document: ${docId}` });

  if (req.method === 'GET') {
    const [originalRes, currentRes, countRes] = await Promise.all([
      supabase.from(TABLE).select('content')
        .eq('doc_id', doc.id).eq('kind', 'original').limit(1).maybeSingle(),
      supabase.from(TABLE).select('content, saved_at, saved_by')
        .eq('doc_id', doc.id).eq('kind', 'save')
        .order('saved_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from(TABLE).select('*', { count: 'exact', head: true })
        .eq('doc_id', doc.id).eq('kind', 'save')
    ]);

    if (originalRes.error) return res.status(500).json({ error: originalRes.error.message });
    if (!originalRes.data) return res.status(500).json({ error: 'Document not seeded' });

    return res.json({
      id: doc.id,
      title: doc.title,
      blurb: doc.blurb,
      original: originalRes.data.content,
      current: currentRes.data?.content ?? originalRes.data.content,
      savedAt: currentRes.data?.saved_at ?? null,
      savedBy: currentRes.data?.saved_by ?? null,
      versions: countRes.count ?? 0
    });
  }

  if (req.method === 'POST') {
    const content = req.body?.content;
    if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' });
    if (content.length > MAX_CHARS) return res.status(413).json({ error: 'Too large' });

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ doc_id: doc.id, kind: 'save', content, saved_by: user.email || user.name || 'unknown' })
      .select('saved_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, savedAt: data.saved_at });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  return handleCopy(req, res, null);
}
