// Job #473: Welsh 'doctor' -> 'meddyg' in nv2/sv2. Every hit is "y doctor" (masc. sing. after 'y' = no mutation),
// so a plain replace is correct. Reads live rows via the production API; writes an edit-batch body to stdout.
// usage: node build-batch.cjs <course> [apply]
const http = require('http');
const [course, apply] = process.argv.slice(2);
const sw = t => t.replace(/\bdoctor\b/g, 'meddyg');
http.get(`http://localhost:3470/api/production/${course}/seeds`, r => {
  let b = ''; r.on('data', d => b += d); r.on('end', () => {
    const ops = [];
    for (const s of JSON.parse(b).seeds) {
      if (/doctor/i.test(s.target_text)) ops.push({ op: 'seed.update', seed_number: s.seed_number, expect: { target_text: s.target_text }, set: { target_text: sw(s.target_text) } });
      for (const l of s.legos || []) {
        const set = {};
        if (/doctor/i.test(l.target_text)) set.target_text = sw(l.target_text);
        if (l.components && /doctor/i.test(JSON.stringify(l.components))) set.components = l.components.map(c => ({ ...c, target: sw(c.target) }));
        if (Object.keys(set).length) ops.push({ op: 'lego.update', lego_id: l.lego_id, expect: { target_text: l.target_text }, set });
        for (const p of l.basket_phrases || []) if (/doctor/i.test(p.target_text)) ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { target_text: p.target_text }, set: { target_text: sw(p.target_text) } });
      }
    }
    console.log(JSON.stringify({ ops, ...(apply ? { apply: true } : {}) }));
  });
});
