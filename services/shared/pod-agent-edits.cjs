// services/shared/pod-agent-edits.cjs
//
// TWO NARROW POD WRITES that had no door at all (job #410, 2026-10-14), so the
// only way to do them was round it:
//
//   PATCH /api/admin/pods/:courseCode/:slug/solo-readers   { soloReaders: [voiceId, ...] }
//   POST  /api/admin/pods/:courseCode/:slug/sentence/:sentenceId/link-clip { audioId, replace?, expectCurrent? }
//
// Both are gated by `adminOrAgent(scope 'pod:write')`: an admin session, or a
// signed same-host agent (agent-admin-identity.cjs). Neither touches text, so
// neither moves learner progress (pod-migration-protocol: progress is filed
// under the slot, and these change who reads a slot / which clip fills it).
//
// solo_readers is the whole switch for a solo-reader pod (pod-solo-readers.cjs);
// [] hands the pod back to ordinary speaker-casting. Only that one metadata key
// is writable here — the rest of `metadata` (scene_hashes, sections…) is
// pod-sync's, and is carried over untouched.
//
// link-clip is FILL-ONLY by default: a slot that already holds a clip is not
// repointed unless the caller says `replace` AND names the clip they expect to
// be there. The clip must speak the sentence's words (normalizeForDb, the same
// test link-clip.cjs applies to course rows) — a pointer to the wrong words is
// the damage this feature must never do.

'use strict';

const { normalizeForDb } = require('./text-normalize.cjs');
const { bumpCourseVersion } = require('./course-version.cjs');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pure: the validated reader list, or an error. */
function parseSoloReaders(body) {
  const raw = body && body.soloReaders;
  if (!Array.isArray(raw)) return { ok: false, error: 'soloReaders must be an array (use [] to clear)' };
  if (raw.length > 8) return { ok: false, error: 'at most 8 readers' };
  const readers = [];
  for (const v of raw) {
    const id = String(v === null || v === undefined ? '' : v).trim();
    if (!/^[A-Za-z0-9_.:-]{2,80}$/.test(id)) return { ok: false, error: `not a voice id: ${JSON.stringify(v)}` };
    if (!readers.includes(id)) readers.push(id);
  }
  return { ok: true, readers };
}

/** Pure: may this clip fill (or replace) this sentence's target slot? */
function judgeLink({ sentence, clip, replace, expectCurrent }) {
  if (!clip) return { ok: false, status: 404, error: 'no such clip' };
  if (normalizeForDb(String(clip.text || '')) !== normalizeForDb(String(sentence.target_text || ''))) {
    return { ok: false, status: 409, error: `the clip says "${clip.text}", the line says "${sentence.target_text}" — not linked` };
  }
  if (sentence.target_audio_id === clip.id) return { ok: true, unchanged: true };
  if (sentence.target_audio_id) {
    if (!replace) return { ok: false, status: 409, error: `the line already holds clip ${sentence.target_audio_id}; pass replace + expectCurrent to repoint it` };
    if (expectCurrent !== sentence.target_audio_id) return { ok: false, status: 409, error: `expectCurrent does not match the clip now in the slot (${sentence.target_audio_id})` };
  }
  return { ok: true };
}

function mount(app, { gate, getDb, logger = console, onSlotChanged = () => {} }) {
  async function loadPod(db, courseCode, slug) {
    const { data, error } = await db.from('listening_pods')
      .select('id, course_code, metadata, updated_at').eq('id', `${courseCode}:${slug}`).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  app.patch('/api/admin/pods/:courseCode/:slug/solo-readers', async (req, res) => {
    const who = await gate(req, res, 'pod:write');
    if (!who) return;
    try {
      const parsed = parseSoloReaders(req.body);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      const db = getDb();
      const { courseCode, slug } = req.params;
      const pod = await loadPod(db, courseCode, slug);
      if (!pod) return res.status(404).json({ error: `no pod ${courseCode}:${slug}` });
      const before = (pod.metadata && pod.metadata.solo_readers) || null;
      const metadata = { ...(pod.metadata || {}), solo_readers: parsed.readers };
      const { data, error } = await db.from('listening_pods')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', pod.id).eq('updated_at', pod.updated_at).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return res.status(409).json({ error: 'the pod changed while this was applied — retry' });
      onSlotChanged(courseCode);
      logger.log(`[PodAgentEdit] ${pod.id} solo_readers ${JSON.stringify(before)} -> ${JSON.stringify(parsed.readers)} by ${who.email}`);
      res.json({ ok: true, podId: pod.id, before, soloReaders: parsed.readers, by: who.email });
    } catch (err) {
      logger.error(`[PodAgentEdit] solo-readers: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/pods/:courseCode/:slug/sentence/:sentenceId/link-clip', async (req, res) => {
    const who = await gate(req, res, 'pod:write');
    if (!who) return;
    try {
      const { audioId, replace = false, expectCurrent = null, dryRun = false } = req.body || {};
      if (!UUID.test(String(audioId || ''))) return res.status(400).json({ error: 'audioId must be a course_audio uuid' });
      const db = getDb();
      const { courseCode, slug, sentenceId } = req.params;
      const pod = await loadPod(db, courseCode, slug);
      if (!pod) return res.status(404).json({ error: `no pod ${courseCode}:${slug}` });
      const { data: sentence, error: sErr } = await db.from('listening_pod_sentences')
        .select('id, pod_id, target_text, target_audio_id').eq('id', sentenceId).maybeSingle();
      if (sErr) throw new Error(sErr.message);
      if (!sentence || sentence.pod_id !== pod.id) return res.status(404).json({ error: `sentence ${sentenceId} is not in ${pod.id}` });
      const { data: clip, error: cErr } = await db.from('course_audio')
        .select('id, text, voice_id, language').eq('id', audioId).maybeSingle();
      if (cErr) throw new Error(cErr.message);
      const verdict = judgeLink({ sentence, clip, replace: !!replace, expectCurrent });
      if (!verdict.ok) return res.status(verdict.status).json({ error: verdict.error });
      if (verdict.unchanged || dryRun) return res.json({ ok: true, unchanged: !!verdict.unchanged, dryRun: !!dryRun, sentenceId, audioId, voiceId: clip.voice_id });
      let write = db.from('listening_pod_sentences')
        .update({ target_audio_id: clip.id, updated_at: new Date().toISOString() })
        .eq('id', sentence.id);
      write = sentence.target_audio_id ? write.eq('target_audio_id', sentence.target_audio_id) : write.is('target_audio_id', null);
      const { data, error } = await write.select('id').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return res.status(409).json({ error: 'the slot changed while this was applied — retry' });
      onSlotChanged(courseCode);
      await bumpCourseVersion(db, courseCode, 'patch');
      logger.log(`[PodAgentEdit] ${sentence.id} target_audio_id ${sentence.target_audio_id || 'empty'} -> ${clip.id} (${clip.voice_id}) by ${who.email}`);
      res.json({ ok: true, sentenceId, audioId: clip.id, voiceId: clip.voice_id, previous: sentence.target_audio_id || null, by: who.email });
    } catch (err) {
      logger.error(`[PodAgentEdit] link-clip: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { mount, parseSoloReaders, judgeLink };
