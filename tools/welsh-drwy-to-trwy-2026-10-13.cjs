// Aran's ruling 2026-10-13 (job #645): in the Welsh sandboxes cym_nv2_for_eng and cym_sv2_for_eng,
// "drwy’r dydd" reads "trwy’r dydd" (unmutated). Only that phrase changes; drwy’r coed / drwy’r prynhawn stay.
// Covers phrases (target_text + decomposition), legos (target_text + components), seeds, and the one
// component phrase "drwy" that belongs to LEGO S1014L03 (known "through"). Both apostrophes (’ and ').
// Usage: node tools/welsh-drwy-to-trwy-2026-10-13.cjs [--dry|--apply|--undo]
// --apply makes a backup table first, then edits in one transaction; each UPDATE reads the row's CURRENT
// text, so a concurrent edit to another word in the same row (job #643, dipyn->tipyn) is preserved.
// --undo reverses only the drwy->trwy substring on those rows (it does not restore stale snapshots).
const { execFileSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql') });
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const IN = COURSES.map((c) => `'${c}'`).join(',');
const BACKUP = 'bak_645_drwy_trwy_20261013';
const mode = process.argv[2] || '--dry';
const psql = (sql) => execFileSync('psql', [process.env.DATABASE_URL, '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
const RX = "drwy(?=[’'']r dydd)";   // lookahead keeps the apostrophe variant untouched
const RXB = "trwy(?=[’'']r dydd)";
const PHR = `course_code in (${IN}) and (target_text ~ '${RX}' or (target_text='drwy' and lego_id is null and id like '%S1014L03C01'))`;
const LEG = `course_code in (${IN}) and (target_text ~ '${RX}' or (seed_number=1014 and lego_index=3 and components::text ~ '"drwy"'))`;
const SED = `course_code in (${IN}) and target_text ~ '${RX}'`;
const fix = (col, rx, to) => `regexp_replace(${col}, '${rx}', '${to}', 'g')`;
(async () => {
  if (mode === '--undo') {
    console.log(psql(`begin;
update course_practice_phrases set target_text=regexp_replace(regexp_replace(target_text,'${RXB}','drwy','g'),'^trwy$','drwy'), decomposition=case when decomposition is null then null else regexp_replace(regexp_replace(decomposition::text,'${RXB}','drwy','g'),'"target": "trwy"','"target": "drwy"','g')::jsonb end, updated_at=now() where id in (select id from ${BACKUP} where tbl='phrase');
update course_legos set target_text=regexp_replace(target_text,'${RXB}','drwy','g'), components=regexp_replace(components::text,'"target": "trwy"','"target": "drwy"','g')::jsonb, updated_at=now() where id::text in (select id from ${BACKUP} where tbl='lego');
update course_seeds set target_text=regexp_replace(target_text,'${RXB}','drwy','g'), updated_at=now() where id::text in (select id from ${BACKUP} where tbl='seed');
commit;`));
    return;
  }
  console.log(psql(`select 'phrase',course_code,id,target_text,concat_ws('',(known_audio_id is not null)::int,(target1_audio_id is not null)::int,(target2_audio_id is not null)::int,(presentation_audio_id is not null)::int) from course_practice_phrases where ${PHR} union all select 'lego',course_code,id::text,target_text,(known_audio_id is not null or presentation_audio_id is not null)::int::text from course_legos where ${LEG} union all select 'seed',course_code,id::text,target_text,(known_audio_id is not null)::int::text from course_seeds where ${SED} order by 1,2,3`));
  if (mode !== '--apply') return console.log('DRY RUN: nothing written');
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const ids = [];
  for (const c of COURSES) {
    ids.push([c, await recordContentEdit(sb, { identity: serviceIdentity('welsh-drwy-to-trwy-2026-10-13', { role: 'content-fix' }), courseCode: c, surface: 'tools/welsh-drwy-to-trwy-2026-10-13.cjs', operation: 'update', detail: { rule: "'drwy’r dydd' -> 'trwy’r dydd' (Aran 2026-10-13)" } })]);
  }
  const ev = Object.fromEntries(ids);
  const evFor = (col) => `case course_code ${COURSES.map((c) => `when '${c}' then '${ev[c]}'::uuid`).join(' ')} end`;
  console.log(psql(`begin;
create table ${BACKUP} as select 'phrase'::text tbl, id::text id, course_code, target_text, decomposition::text extra from course_practice_phrases where ${PHR} union all select 'lego', id::text, course_code, target_text, components::text from course_legos where ${LEG} union all select 'seed', id::text, course_code, target_text, null from course_seeds where ${SED};
update course_practice_phrases set target_text=case when target_text='drwy' then 'trwy' else ${fix('target_text', RX, 'trwy')} end,
  decomposition=case when decomposition is null then null else regexp_replace(regexp_replace(decomposition::text,'${RX}','trwy','g'),'("target": "|"target": " )drwy(")','\\1trwy\\2','g')::jsonb end,
  last_edit_event_id=${evFor()}, updated_at=now() where ${PHR};
update course_legos set target_text=${fix('target_text', RX, 'trwy')},
  components=case when components is null then null else regexp_replace(components::text,'"target": "drwy"','"target": "trwy"','g')::jsonb end,
  last_edit_event_id=${evFor()}, updated_at=now() where ${LEG};
update course_seeds set target_text=${fix('target_text', RX, 'trwy')}, last_edit_event_id=${evFor()}, updated_at=now() where ${SED};
commit; select tbl,course_code,count(*) from ${BACKUP} group by 1,2 order by 1,2;`));
})();
