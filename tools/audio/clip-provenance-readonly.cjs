#!/usr/bin/env node
'use strict';
// node tools/audio/clip-provenance-readonly.cjs <ids.txt> <out.json>
// READ-ONLY (cs #131·AI). For a list of course_audio ids (one per line): each clip's row (voice, text, origin,
// created_at, audio_revision) and every course_audio_revisions entry for it (when its bytes were last swapped, by
// which route, for what reason). That date is when the SERVED bytes were rendered, which is what lets a caller match
// the clip to the TTS spend ledger's per-call text hash (~/.local/state/ssi-tts-spend/ledger.jsonl) and so tell
// whether a female (target1) clip was spoken from the plain male text or from its female reading. The clip's stored
// text cannot tell you that: gender prep keeps the plain text in course_audio.text (gender-haiku-service.cjs).
// Queries are by primary key / audio_id only, through the agent-db door (5 s cap). Run whole-course lists against
// the nightly QA copy: set -a; . ~/ssi-restore/qa-copy.env; set +a; node tools/audio/clip-provenance-readonly.cjs …
const fs = require('fs');
const { connect, clipsById, UUID } = require('../../services/shared/agent-db.cjs');

async function main() {
  const [idsFile, out] = process.argv.slice(2);
  if (!idsFile || !out) throw new Error('usage: <ids.txt> <out.json>');
  const ids = [...new Set(fs.readFileSync(idsFile, 'utf8').split(/\s+/).filter((x) => UUID.test(x)))];
  const pg = await connect();
  try {
    const clips = await clipsById(pg, ids, { cols: 'id::text AS id, course_code, role, language, voice_id, text, origin, created_at, audio_revision' });
    const revisions = [];
    for (let i = 0; i < ids.length; i += 2000) {
      revisions.push(...(await pg.query(
        'SELECT audio_id::text AS audio_id, revision, source, accepted_by, reason, created_at FROM course_audio_revisions WHERE audio_id = ANY($1::uuid[]) ORDER BY audio_id, revision',
        [ids.slice(i, i + 2000)])).rows);
    }
    fs.writeFileSync(out, JSON.stringify({ asked: ids.length, clips, revisions }));
    console.log(`${ids.length} ids asked, ${clips.length} clips found, ${revisions.length} revisions → ${out}`);
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
