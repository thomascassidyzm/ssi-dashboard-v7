require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
module.exports = { sb };
// CLI. Two modes:
//   node q.cjs                          -> course summary counts (the old behaviour)
//   node q.cjs "<postgrest path>"       -> run that query, e.g.
//     node q.cjs "course_seeds?select=seed_number,known_text&course_code=eq.gle_cn_for_eng&seed_number=gte.37&seed_number=lte.89&order=seed_number&limit=100"
//
// The argument used to be IGNORED — every invocation silently printed seeds 1-2 regardless of what
// you asked for, so a worker following the dispatch brief literally read the wrong seeds and had no
// way to notice. Found by worker T2 on 2026-08-20. Do not remove the argv branch.
if (require.main === module) {
  (async () => {
    const C = 'gle_cn_for_eng';
    const q = process.argv[2];
    if (q) {
      const url = `${process.env.SUPABASE_URL}/rest/v1/${q}`;
      const key = process.env.SUPABASE_SERVICE_KEY;
      const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' } });
      const body = await r.text();
      if (!r.ok) { console.error('QUERY FAILED', r.status, body); process.exit(1); }
      console.log(`${r.status} ${r.headers.get('content-range') || ''}`);
      try { console.log(JSON.stringify(JSON.parse(body), null, 1)); } catch { console.log(body); }
      return;
    }
    for (const t of ['course_seeds','course_legos','course_practice_phrases','course_audio']) {
      const { count, error } = await sb.from(t).select('*',{count:'exact',head:true}).eq('course_code',C);
      console.log(t, count, error?.message||'');
    }
    const { data } = await sb.from('course_seeds').select('*').eq('course_code',C).order('seed_number').limit(2);
    console.log('SEED COLUMNS:', Object.keys(data[0]||{}).join(', '));
    console.log(JSON.stringify(data,null,1).slice(0,1500));
  })();
}
