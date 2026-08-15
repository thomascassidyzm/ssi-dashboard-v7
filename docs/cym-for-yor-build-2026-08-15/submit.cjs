/**
 * Submits the cym_for_yor golden decompositions through the REAL course-builder
 * API, one seed at a time, stopping at the first failure so nothing half-lands.
 *   node docs/cym-for-yor-build-2026-08-15/submit.cjs [--from N] [--to N] [--dry]
 */
const seeds = require('./golden-decompositions-seeds-1-10.cjs');
const API = 'http://localhost:3471/api/seed/complete';
const COURSE = 'cym_for_yor';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FROM = arg('--from', 1), TO = arg('--to', 999), DRY = process.argv.includes('--dry');

(async () => {
  const log = [];
  for (const seed of seeds) {
    if (seed.seed_number < FROM || seed.seed_number > TO) continue;
    const body = {
      course_code: COURSE,
      seed_number: seed.seed_number,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos: seed.legos.map(l => ({
        idx: l.idx, type: l.type, known: l.known, target: l.target,
        ...(l.components ? { components: l.components } : {}),
        build: l.build || [], use: l.use || [],
      })),
    };
    if (DRY) { console.log(JSON.stringify(body, null, 1)); continue; }

    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    const entry = { seed: seed.seed_number, status: r.status, body: j };
    log.push(entry);
    if (r.ok) {
      console.log(`✓ seed ${seed.seed_number}: ${r.status}  legos=${j.legos_created ?? j.legos ?? '?'} phrases=${j.phrases_created ?? j.phrases ?? '?'}${j.zut_held_out ? `  ZUT-held-out=${j.zut_held_out}` : ''}`);
    } else {
      console.log(`✗ seed ${seed.seed_number}: ${r.status}`);
      console.log(JSON.stringify(j, null, 1).slice(0, 3000));
      require('fs').writeFileSync(__dirname + '/submit-log.json', JSON.stringify(log, null, 1));
      process.exit(1);
    }
  }
  require('fs').writeFileSync(__dirname + '/submit-log.json', JSON.stringify(log, null, 1));
  console.log(`\nwrote submit-log.json (${log.length} seeds)`);
})();
