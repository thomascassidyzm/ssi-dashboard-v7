/**
 * The Copy area — one editable page per learner-facing copy surface.
 *
 *   GET  /api/copy?list=1               → { docs: [{ id, title, blurb, versions, savedAt, savedBy, publishedAt, publishedBy, unpublished }] }
 *   GET  /api/copy?doc=<id>             → the document, its draft, and its publication state
 *   POST /api/copy?doc=<id>             → save a new version. Body: { content: "<text>" }
 *   POST /api/copy?doc=<id>&publish=1   → publish a version. Body: { versionId } or nothing for the latest save
 *
 * Save and publish are two different acts. Saving is the draft safety net — the
 * editor autosaves into it every couple of seconds and nothing a learner reads
 * changes. Publishing marks one existing version as the live text, and that is
 * what /api/copy-published hands the learner app.
 *
 * Store is append-only: public.htw_copy_versions holds, per doc_id, one frozen
 * 'original' row (seeded byte-identically from code) plus one 'save' row per
 * save. The original is never overwritten, so every edit stays diffable and
 * recoverable.
 *
 * Publication is two nullable columns on the same rows — published_at and
 * published_by. The live text is the row with the greatest non-null
 * published_at. Publishing stamps a row; rolling back stamps an OLDER row,
 * which thereby becomes the newest published. Content is never copied, edited
 * or deleted, so a rollback loses nothing and every publish is attributable.
 *
 * Known doc ids live in ./lib/copy-docs.js — an id that is not registered is
 * refused, so no client can invent a document.
 *
 * Auth: Popty session only — Bearer Supabase JWT, verified by verifySupabaseJWT
 * (which also enforces dashboard access). No token-in-URL, no anonymous writes.
 * Publishing takes the same gate as editing: signed in to Popty. Every publish
 * is stamped with the publisher's email and every one of them is reversible by
 * republishing an older row, so attribution and undo do the work a narrower
 * gate would have done.
 *
 * /api/htw-copy is a permanent thin alias for doc=htw: that link is already in
 * someone's inbox and must never break.
 */

import { verifySupabaseJWT } from './lib/auth.js';
import { getSupabase } from './lib/supabase.js';
import { COPY_DOCS, findCopyDoc } from './lib/copy-docs.js';
import { liveVersion, versionList, publicationState, nextPublishStamp } from './lib/copy-publish.js';

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

/** Truthy for ?publish=1, ?publish, and { publish: true } in the body. */
function wantsPublish(req) {
  const q = req.query?.publish;
  if (q !== undefined && q !== 'false' && q !== '0') return true;
  return req.body?.publish === true;
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

  // The index: every surface, how much editing has happened to each, and
  // whether what is live for learners is behind what the editor has written.
  if (!forcedDocId && req.method === 'GET' && req.query?.list !== undefined) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, doc_id, kind, saved_at, saved_by, published_at, published_by')
      .order('saved_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const docs = COPY_DOCS.map(d => {
      const rows = (data || []).filter(r => r.doc_id === d.id);
      const saves = rows.filter(r => r.kind === 'save');
      const last = saves[saves.length - 1];
      const live = liveVersion(rows);
      return {
        id: d.id,
        title: d.title,
        blurb: d.blurb,
        seeded: rows.some(r => r.kind === 'original'),
        versions: saves.length,
        savedAt: last?.saved_at ?? null,
        savedBy: last?.saved_by ?? null,
        publishedAt: live?.published_at ?? null,
        publishedBy: live?.published_by ?? null,
        // Is there editing a learner cannot see yet? True when nothing has ever
        // been published, or when a save landed after the live version's row.
        unpublished: !live || (last ? Number(last.id) > Number(live.id) : false)
      };
    });
    return res.json({ docs });
  }

  const docId = forcedDocId || req.query?.doc;
  if (!docId) return res.status(400).json({ error: 'Which document? Pass ?doc=<id>' });

  const doc = findCopyDoc(docId);
  if (!doc) return res.status(404).json({ error: `No such copy document: ${docId}` });

  if (req.method === 'GET') {
    // One read of the whole document's history: small (one text column per
    // save, a handful per doc) and it lets the draft, the original, the live
    // text and the version list all be answered without four round trips.
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, kind, content, saved_at, saved_by, published_at, published_by')
      .eq('doc_id', doc.id)
      .order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const rows = data || [];
    const original = rows.find(r => r.kind === 'original');
    if (!original) return res.status(500).json({ error: 'Document not seeded' });

    const saves = rows.filter(r => r.kind === 'save');
    const draft = saves[saves.length - 1] ?? original;
    const state = publicationState(rows, draft);

    return res.json({
      id: doc.id,
      title: doc.title,
      blurb: doc.blurb,
      original: original.content,
      current: draft.content,
      savedAt: draft.kind === 'save' ? draft.saved_at : null,
      savedBy: draft.kind === 'save' ? draft.saved_by : null,
      versions: saves.length,
      // Publication state, for the editor's status line and its rollback list.
      published: state.published,
      publishedContent: state.publishedContent,
      draftDiffers: state.draftDiffers,
      versionList: versionList(rows)
    });
  }

  if (req.method === 'POST' && wantsPublish(req)) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, kind, content, saved_at, published_at')
      .eq('doc_id', doc.id)
      .order('id', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const rows = data || [];
    if (!rows.length) return res.status(500).json({ error: 'Document not seeded' });

    // Which version? An explicit id for a rollback or a re-publish of a known
    // row; otherwise the newest save, which is what the editor is looking at.
    const asked = req.body?.versionId;
    let target;
    if (asked !== undefined && asked !== null && asked !== '') {
      target = rows.find(r => String(r.id) === String(asked));
      if (!target) return res.status(404).json({ error: `No version ${asked} of ${doc.id}` });
    } else {
      const saves = rows.filter(r => r.kind === 'save');
      target = saves[saves.length - 1] ?? rows.find(r => r.kind === 'original');
    }

    const live = liveVersion(rows);
    if (live && String(live.id) === String(target.id)) {
      // Already the live text. Say so rather than churning the timestamp — a
      // double-click should be a no-op, not a new publish event.
      return res.json({
        ok: true,
        alreadyLive: true,
        versionId: Number(target.id),
        publishedAt: live.published_at,
        publishedBy: live.published_by ?? null
      });
    }

    const publishedBy = user.email || user.name || 'unknown';
    const { data: stamped, error: stampErr } = await supabase
      .from(TABLE)
      .update({ published_at: nextPublishStamp(live), published_by: publishedBy })
      .eq('id', target.id)
      .eq('doc_id', doc.id)
      .select('id, published_at, published_by')
      .single();

    if (stampErr) return res.status(500).json({ error: stampErr.message });

    return res.json({
      ok: true,
      versionId: Number(stamped.id),
      publishedAt: stamped.published_at,
      publishedBy: stamped.published_by,
      // True when the publish moved backwards in the history — a rollback.
      rolledBack: !!live && Number(target.id) < Number(live.id)
    });
  }

  if (req.method === 'POST') {
    const content = req.body?.content;
    if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' });
    if (content.length > MAX_CHARS) return res.status(413).json({ error: 'Too large' });

    // A plain save NEVER publishes: published_at stays null on the new row, so
    // whatever was live for learners a moment ago is still live now.
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ doc_id: doc.id, kind: 'save', content, saved_by: user.email || user.name || 'unknown' })
      .select('id, saved_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, versionId: Number(data.id), savedAt: data.saved_at });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  return handleCopy(req, res, null);
}
