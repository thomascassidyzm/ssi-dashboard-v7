#!/usr/bin/env node
/** Derives the affected seed sets from adj-plan.json and reads their approval state. Read-only. */
const fs = require('fs'); const path = require('path'); const { Client } = require('pg');
const HERE = __dirname;
const plan = JSON.parse(fs.readFileSync(path.join(HERE, 'adj-plan.json'), 'utf8'));
const url = /DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql', 'utf8'))[1].trim();
const sets = {};
for (const r of plan) {
  const s = sets[r.course_code] = sets[r.course_code] || { all: new Set(), edit: new Set() };
  s.all.add(r.seed_number);
  if (r.action !== 'hold') s.edit.add(r.seed_number);
}
const lit = (a) => a.length ? a.join(',') : '-1';
const sql = Object.entries(sets).map(([c, s]) => `select '${c}' course,
  (select new_app_status from courses where course_code='${c}') new_app_status,
  count(*) seeds, count(approved_at) approved,
  count(*) filter (where seed_number in (${lit([...s.all])})) seeds_touched,
  count(*) filter (where seed_number in (${lit([...s.all])}) and approved_at is not null) touched_approved,
  count(*) filter (where seed_number in (${lit([...s.edit])})) seeds_edited,
  count(*) filter (where seed_number in (${lit([...s.edit])}) and approved_at is not null) edited_approved
  from course_seeds where course_code='${c}'`).join(' union all ') + ' order by 1';
(async () => {
  const c = new Client({ connectionString: url }); await c.connect();
  const r = await c.query(sql); await c.end();
  const out = {};
  for (const row of r.rows) { const k = row.course; delete row.course; out[k] = row; }
  fs.writeFileSync(path.join(HERE, 'adj-approval.json'), JSON.stringify(out, null, 1));
  console.log(Object.entries(out).map(([k, v]) => `${k}\t${v.new_app_status}\ttouched ${v.seeds_touched} (${v.touched_approved} approved)\tedited ${v.seeds_edited} (${v.edited_approved} approved)\tcourse ${v.approved}/${v.seeds}`).join('\n'));
})().catch(e => { console.error(e.message); process.exit(1); });
