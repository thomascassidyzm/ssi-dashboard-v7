/**
 * GET  /api/htw-copy   → { current, original, savedAt, savedBy, versions }
 * POST /api/htw-copy   → save a new version. Body: { content: "<markdown>" }
 *
 * The learner-facing "How This Works" copy, editable in the dashboard at /htw-copy.
 * Store is append-only: public.htw_copy_versions holds one 'original' row (the frozen
 * seed, docs/htw-copy-for-aran.md @ 270edaf6 in ssi-learning-app) and one 'save' row
 * per save, so every edit is diffable against the original and against each other.
 *
 * Auth: Popty session only — Bearer Supabase JWT, verified by verifySupabaseJWT
 * (which also enforces dashboard access). No token-in-URL, no anonymous writes.
 */

import { verifySupabaseJWT } from './lib/auth.js';
import { getSupabase } from './lib/supabase.js';

const DOC_ID = 'htw';
const MAX_CHARS = 1_000_000;

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

  if (req.method === 'GET') {
    const [originalRes, currentRes, countRes] = await Promise.all([
      supabase.from('htw_copy_versions').select('content')
        .eq('doc_id', DOC_ID).eq('kind', 'original').limit(1).maybeSingle(),
      supabase.from('htw_copy_versions').select('content, saved_at, saved_by')
        .eq('doc_id', DOC_ID).eq('kind', 'save')
        .order('saved_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('htw_copy_versions').select('*', { count: 'exact', head: true })
        .eq('doc_id', DOC_ID).eq('kind', 'save')
    ]);

    if (originalRes.error) return res.status(500).json({ error: originalRes.error.message });
    if (!originalRes.data) return res.status(500).json({ error: 'Document not seeded' });

    return res.json({
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
      .from('htw_copy_versions')
      .insert({ doc_id: DOC_ID, kind: 'save', content, saved_by: user.email || user.name || 'unknown' })
      .select('saved_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, savedAt: data.saved_at });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
