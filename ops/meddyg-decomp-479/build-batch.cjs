// Job #479: Welsh 'doctor' left in phrase decomposition[].target after #473 -> 'meddyg'. Text only (decomposition column, no audio).
// Reads live rows via the production API; writes an edit-batch body to stdout. usage: node build-batch.cjs <course> [apply]
const http = require('http');
const [course, apply] = process.argv.slice(2);
const sw = t => t.replace(/\bdoctor\b/g, 'meddyg');
http.get(`http://localhost:3470/api/production/${course}/seeds`, r => {
  let b = ''; r.on('data', d => b += d); r.on('end', () => {
    const ops = [];
    for (const s of JSON.parse(b).seeds) for (const l of s.legos || []) for (const p of l.basket_phrases || []) {
      if (!/doctor/i.test(JSON.stringify(p.decomposition || []))) continue;
      ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { decomposition: p.decomposition },
        set: { decomposition: p.decomposition.map(c => ({ ...c, target: sw(c.target) })) } });
    }
    console.log(JSON.stringify({ ops, ...(apply ? { apply: true } : {}) }));
  });
});
