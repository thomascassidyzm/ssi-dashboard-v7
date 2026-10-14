// Aran's ruling 2026-10-14 (job #125): English capitalisation in the Welsh sandboxes cym_nv2_for_eng and
// cym_sv2_for_eng — known_text of seeds, LEGOs and practice phrases. Capitalise the pronoun I (I / I'm / I'd /
// I'll / I've), language and nationality names, days, months, personal names and place names. The first letter of a
// line is otherwise left as the course has it. Welsh text is never touched. Casing-only edits keep the audio links:
// null_*_audio_on_text_change keeps a clip whose normalize_text() still matches the new text, and --apply
// re-checks every link column is identical before commit (it rolls back otherwise).
// The word list is deliberately closed: it is every proper noun found in the 957-word known vocabulary of the two
// courses. sir/madam and the modal "may" are NOT in it (not named in the ruling; "may" is never the month here).
// Usage: node tools/welsh-english-capitalisation-2026-10-14.cjs [--dry|--apply|--undo]
const { execFileSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql') });
const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const IN = COURSES.map((c) => `'${c}'`).join(',');
const BACKUP = 'bak_125_en_caps_20261014';
const TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases'];
const mode = process.argv[2] || '--dry';
const psql = (sql) => execFileSync('psql', [process.env.DATABASE_URL, '-X', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 1 << 28 }); // stdin: the apply script is too long for argv
const NAMES = 'welsh english french spanish italy africa argentina china england wales jane monday tuesday wednesday thursday friday saturday sunday saturdays sundays'.split(' ');
const NAME_RE = new RegExp(`(?<![A-Za-z])(${NAMES.join('|')})(?![A-Za-z])`, 'g');
const I_RE = /(?<![A-Za-z0-9])i(?=$|[^A-Za-z0-9’'])|(?<![A-Za-z0-9])i(?=[’'](?:m|d|ll|ve)(?![A-Za-z]))/g;
const fix = (t) => t.replace(I_RE, 'I').replace(NAME_RE, (m) => m[0].toUpperCase() + m.slice(1));
module.exports = { fix };
if (require.main !== module) return;
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const LINKS = { course_seeds: 'known_audio_id,target1_audio_id,target2_audio_id', course_legos: 'known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id', course_practice_phrases: 'known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id' };
const ID = { course_seeds: 'id::text', course_legos: 'id::text', course_practice_phrases: 'id::text' };
const rows = () => {
  const out = [];
  for (const t of TABLES) {
    for (const l of psql(`select ${ID[t]}, course_code, known_text from ${t} where course_code in (${IN}) and known_text is not null`).split('\n')) {
      if (!l) continue;
      const [id, cc, kt] = l.split('|');
      const n = fix(kt);
      if (n !== kt) out.push({ t, id, cc, old: kt, new: n });
    }
  }
  return out;
};
(() => {
  if (mode === '--undo') {
    for (const t of TABLES) console.log(psql(`update ${t} x set known_text=b.known_text, updated_at=now() from ${BACKUP} b where b.tbl='${t}' and b.id=x.id::text and x.known_text is distinct from b.known_text and lower(x.known_text)=lower(b.known_text);`));
    return;
  }
  const ch = rows();
  const per = {};
  for (const r of ch) per[`${r.cc} ${r.t}`] = (per[`${r.cc} ${r.t}`] || 0) + 1;
  console.log(per);
  if (mode !== '--apply') return console.log('DRY RUN: nothing written');
  const links = (t) => `select id::text, md5(concat_ws(',',${LINKS[t].split(',').join(',')})) h from ${t} where course_code in (${IN})`;
  const evid = {};
  for (const c of COURSES) evid[c] = psql(`insert into content_edit_events (course_code,surface,operation,actor_kind,actor_id,actor_label,actor_verified,actor_role,scope,detail) values ('${c}','tools/welsh-english-capitalisation-2026-10-14.cjs','update','service','welsh-english-capitalisation-2026-10-14','welsh-english-capitalisation-2026-10-14',false,'content-fix','{}','{"rule":"English capitalisation, Aran 2026-10-14"}') returning id`).split('\n')[0].trim();
  const evFor = `case course_code ${COURSES.map((c) => `when '${c}' then '${evid[c]}'::uuid`).join(' ')} end`;
  const js = q(JSON.stringify(ch));
  let sql = `begin;
create table ${BACKUP} as select * from (values (null::text,null::text,null::text,null::text)) v(tbl,id,course_code,known_text) where false;
create temp table links_before as ${TABLES.map((t) => `select '${t}'::text tbl, * from (${links(t)}) z`).join(' union all ')};
create temp table plan as select * from jsonb_to_recordset(${js}::jsonb) as p(t text,id text,cc text,old text,new text);
insert into ${BACKUP} select t,id,cc,old from plan;
`;
  for (const t of TABLES) sql += `update ${t} x set known_text=p.new, last_edit_event_id=${evFor.replace(/course_code/g, 'x.course_code')}, updated_at=now() from plan p where p.t='${t}' and p.id=x.id::text and x.known_text=p.old;\n`;
  sql += `do $$ declare n int; begin
select count(*) into n from (${TABLES.map((t) => `select '${t}'::text tbl, * from (${links(t)}) z`).join(' union all ')}) a join links_before b using (tbl,id) where a.h<>b.h;
if n<>0 then raise exception 'audio links changed on % rows - rolling back', n; end if; end $$;
commit; select tbl,course_code,count(*) from ${BACKUP} group by 1,2 order by 1,2;`;
  console.log(psql(sql));
})();
