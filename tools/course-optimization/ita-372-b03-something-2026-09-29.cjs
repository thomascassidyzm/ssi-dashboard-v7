// Job #852: ita_for_eng S0372L03B03 — the Italian says "qualcosa" but the English left out "something". Kai approved.
// Only the known side changes; the known clip is unlinked (the old clip "she was trying to create" stays, shared with B02, nothing deleted)
// so the learner never hears the wrong English. Re-render is NOT done here: the known-role route is broken on ita_for_eng (Tom's side).
const path = require('path');
require('dotenv').config({ path: '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql', quiet: true });
require('dotenv').config({ path: '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env', quiet: true });
const COURSE = 'ita_for_eng', ID = 'ita_for_eng:S0372L03B03', SEED = 372;
const BEFORE = 'she was trying to create', AFTER = 'she was trying to create something';
(async () => {
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const identity = serviceIdentity('ita-372-b03-something', { role: 'content-sweep' });
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: 'tools/course-optimization', operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: [ID], rows: 1 }, detail: { why: 'English left out "something"; Kai approved', job: 852 } });
  const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, word_count=word_count, known_audio_id=NULL, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND known_text=$5`, [AFTER, ev, COURSE, ID, BEFORE]);
  if (u.rowCount !== 1) throw new Error('rows ' + u.rowCount);
  const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [ev, COURSE, SEED]);
  console.log('phrase rows', u.rowCount, 'seed rows', un.rowCount); await pg.end();
})().catch(e => { console.error(e); process.exit(1); });
