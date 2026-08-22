/**
 * The learner read path — published copy only, no sign-in.
 *
 *   GET /api/copy-published?doc=<id>
 *
 * 200, when a version has been published:
 *   { id, title, content, publishedAt, publishedBy, versionId }
 *
 * 404, when nothing has been published yet — the honest state of every doc
 * until someone clicks Publish:
 *   { error: 'Nothing published yet', id }
 *
 * This is the only endpoint in the Copy area with no auth, so the rule it keeps
 * is narrow and absolute: it can return the content of a row with a non-null
 * published_at and nothing else. Drafts are unreachable without a Popty JWT —
 * it never reads by id, never takes a version from the caller, and never falls
 * back to the newest save or to the frozen original when nothing is published.
 * A doc that has never been published 404s, and the learner app answers that
 * with its own built-in text.
 *
 * Named copy-published rather than copy/published so it cannot be confused with
 * a path under /api/copy — one file, one route, no ambiguity for the router.
 *
 * Caching: public, s-maxage=60, stale-while-revalidate=300. A publish reaches
 * learners inside about a minute; a stale edge copy is served for up to five
 * more while the refresh happens behind it, so neither Popty nor the database
 * is hammered by the learner path and no learner ever waits on it.
 */

import { getSupabase } from './lib/supabase.js';
import { findCopyDoc } from './lib/copy-docs.js';
import { liveVersion } from './lib/copy-publish.js';

const TABLE = 'htw_copy_versions';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const docId = req.query?.doc;
  if (!docId) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'Which document? Pass ?doc=<id>' });
  }

  const doc = findCopyDoc(docId);
  if (!doc) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: `No such copy document: ${docId}` });
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Published rows only — the filter is the security boundary, so it is on the
  // query rather than applied after the fact.
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, content, published_at, published_by')
    .eq('doc_id', doc.id)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: error.message });
  }

  // liveVersion rather than data[0]: one place decides what "live" means, and
  // it breaks published_at ties the same way the editor does.
  const live = liveVersion(data || []);
  if (!live) {
    // Short cache on the empty answer too, so the first publish is not held
    // behind an edge copy of the 404 for long.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(404).json({ error: 'Nothing published yet', id: doc.id });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.json({
    id: doc.id,
    title: doc.title,
    content: live.content,
    publishedAt: live.published_at,
    publishedBy: live.published_by ?? null,
    versionId: Number(live.id)
  });
}
