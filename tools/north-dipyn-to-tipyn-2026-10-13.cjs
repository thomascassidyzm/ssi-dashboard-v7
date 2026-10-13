// Aran's ruling 2026-10-13 (job #643): in North sandbox cym_nv2_for_eng, 'dipyn bach' as the OBJECT of a
// verb-noun is unmutated 'tipyn bach'. Mutated 'am dipyn' and adverbial 'wedi blino dipyn bach' stay.
// Usage: node tools/north-dipyn-to-tipyn-2026-10-13.cjs            -> dry run (prints plan)
//        ... --apply   -> backup table + edit event + update, in one psql transaction
//        ... --undo    -> restore text from the backup table
// Sandbox only: the course code is hard-wired; cym_n_for_eng / cym_s_for_eng / canonical_seeds are never named.
const { execFileSync } = require('child_process');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const COURSE = 'cym_nv2_for_eng';
const BACKUP = 'bak_643_dipyn_tipyn_20261013';
const mode = process.argv[2] || '--dry';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.psql') });
const psql = (sql) => execFileSync('psql', [process.env.DATABASE_URL, '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
// object-position: 'dipyn bach o ' only ('am dipyn' and 'blino dipyn bach' have no 'o Gymraeg' after them)
const PH = `course_code='${COURSE}' and target_text like '%dipyn bach o %'`;
const SD = `course_code='${COURSE}' and target_text like '%dipyn bach o %'`;
(async () => {
  if (mode === '--undo') {
    console.log(psql(`begin; update course_practice_phrases p set target_text=b.target_text from ${BACKUP} b where b.tbl='phrase' and b.id=p.id; update course_seeds s set target_text=b.target_text from ${BACKUP} b where b.tbl='seed' and b.id=s.id::text; commit;`));
    return;
  }
  const rows = psql(`select 'phrase',id,target_text,(target1_audio_id is not null or target2_audio_id is not null) from course_practice_phrases where ${PH} union all select 'seed',id::text,target_text,(target1_audio_id is not null or target2_audio_id is not null) from course_seeds where ${SD} order by 1,2`);
  console.log(rows);
  if (mode !== '--apply') return console.log('DRY RUN: nothing written');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const ev = await recordContentEdit(sb, { identity: serviceIdentity('north-dipyn-to-tipyn-2026-10-13', { role: 'content-fix' }), courseCode: COURSE, surface: 'tools/north-dipyn-to-tipyn-2026-10-13.cjs', operation: 'update', detail: { rule: "object-position 'dipyn bach' -> 'tipyn bach' (Aran 2026-10-13)" } });
  console.log(psql(`begin;
create table ${BACKUP} as select 'phrase'::text tbl, id::text, target_text from course_practice_phrases where ${PH} union all select 'seed', id::text, target_text from course_seeds where ${SD};
update course_practice_phrases set target_text=replace(target_text,'dipyn bach o ','tipyn bach o '), last_edit_event_id='${ev}', updated_at=now() where ${PH};
update course_seeds set target_text=replace(target_text,'dipyn bach o ','tipyn bach o '), last_edit_event_id='${ev}', updated_at=now() where ${SD};
commit; select count(*) from ${BACKUP};`));
})();
