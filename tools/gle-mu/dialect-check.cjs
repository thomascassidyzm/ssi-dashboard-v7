#!/usr/bin/env node
/**
 * Munster (Corca Dhuibhne) dialect + consistency check for gle_mu_for_eng.
 *
 * WHY THIS EXISTS RATHER THAN grep.  Irish initial mutation means a banned form
 * rarely appears in its dictionary shape: "Gaeilge" hides inside "nGaeilge" and
 * "Gaeilge" vs "Gaelainn" both inflect for genitive (Gaeilge/Gaelainne).  A naive
 * word-boundary grep therefore under-reports the banned form and over-reports the
 * blessed one.  Every rule below is written against that.
 *
 * ALWAYS CALIBRATE.  --selftest runs every detector against a hand-built string
 * that is a KNOWN POSITIVE for that rule and a KNOWN NEGATIVE for its neighbours.
 * If the selftest does not come back all-pass, every count this tool prints is
 * meaningless.  Never quote a number from here without running it.
 *
 * Usage:
 *   node tools/gle-mu/dialect-check.cjs --selftest
 *   node tools/gle-mu/dialect-check.cjs            # reads the DB
 *   node tools/gle-mu/dialect-check.cjs --files    # reads scripts/gle-mu/out/*.json
 */
require('dotenv').config();

// Irish initial mutations, as a regex fragment placed BEFORE a lenitable stem.
// Covers eclipsis (n/m/g/b/d), lenition-h, and the vowel prefixes.
const ECL = '(?:n|m|g|b|d|t|h)?';

/**
 * Each rule: the BANNED form (standard Irish or the Connemara choice) and the
 * Munster form that must appear instead.  `bad` is what we hunt for.
 */
const RULES = [
  // --- the headline lexical rulings -------------------------------------
  { id: 'gaeilge',   bad: /(?<![\wÀ-ſ])[nN]?[gG]aeilge(?:ann)?(?![\wÀ-ſ])/g,
                     good: /[gG]aelainn/, want: 'Gaelainn', why: 'the language is Gaelainn in Corca Dhuibhne' },
  { id: 'i-ngaeilge',bad: /(?<![\wÀ-ſ])i\s+n[gG]aeilge(?![\wÀ-ſ])/g,
                     good: /as\s+[gG]aelainn/, want: 'as Gaelainn', why: 'Connemara ruling, not Kerry' },
  { id: 'eicint',    bad: /(?<![\wÀ-ſ])eicínt(?![\wÀ-ſ])/g,      want: 'éigint', why: 'eicínt is the Connemara form, 0 in every Kerry source' },
  { id: 'eigin',     bad: /(?<![\wÀ-ſ])éigin(?![\wÀ-ſ])/g,       want: 'éigint', why: "Ó Sé's transcribed speech says éigint",
                     // "ar éigin" = barely, and "b'éigin" = had to. Different lexemes; do not count them.
                     exclude: /(?:ar|b'|ba)\s*éigin/i },
  { id: 'amarach',   bad: /(?<![\wÀ-ſ])amárach(?![\wÀ-ſ])/g,     want: 'amáireach', why: 'amárach is 0 in all three Kerry sources' },
  { id: 'ceard',     bad: /(?<![\wÀ-ſ])[cC]éard(?![\wÀ-ſ])/g,    want: 'cad', why: 'céard is 0 in Kerry, 2,201 in Connacht' },
  { id: 'cen-chaoi', bad: /(?<![\wÀ-ſ])[cC]én\s+chaoi(?![\wÀ-ſ])/gi, want: 'conas', why: 'cén chaoi is Connacht' },
  { id: 'cen-fath',  bad: /(?<![\wÀ-ſ])[cC]én\s+fáth(?![\wÀ-ſ])/g, want: 'canathaobh', why: 'cén fáth is 0 in Kerry' },
  { id: 'cen-uair',  bad: /(?<![\wÀ-ſ])[cC]én\s+uair(?![\wÀ-ſ])/g, want: 'cathain', why: 'cén uair is Connacht' },
  { id: 'anseo',     bad: /(?<![\wÀ-ſ])anseo(?![\wÀ-ſ])/g,       want: 'anso', why: 'anso 3,352 MU vs anseo ~0' },
  { id: 'ansin',     bad: /(?<![\wÀ-ſ])ansin(?![\wÀ-ſ])/g,       want: 'ansan', why: 'ansan 7,028 MU' },
  { id: 'chuile',    bad: /(?<![\wÀ-ſ])chuile(?![\wÀ-ſ])/g,      want: 'gach aoinne', why: 'chuile is Connacht' },
  // NO BLANKET sin->san / seo->so RULE.  It was written, calibrated, run, and it
  // produced 30 FALSE POSITIVES, so it is deliberately absent.  Ó Sé gives the
  // inventory so/san/súd, but the alternation is PHONOLOGICALLY CONDITIONED and
  // sin/seo are perfectly good Kerry in the right frame.  Measured on the three
  // Kerry texts (ose / ty / oil):
  //     mar sin  45/4/49   vs  mar san   0/0/1     <- "mar sin" IS Kerry
  //     é sin   110/20/57  vs  é san     2/0/3     <- "é sin"  IS Kerry
  //     sin é    37/10/27  vs  san é     6/1/6     <- "sin é"  IS Kerry
  //     an X sin 83/11/139 vs  an X san 72/16/75   <- genuinely mixed
  // `san` shows up after a broad consonant (an t-am san, an lá san, an gníomh san).
  // Nobody has found that conditioning rule stated in print, so flagging every
  // `sin` as an error is unsound.  The adverbs are a different matter and ARE
  // decisive - see the anseo/ansin rules above (anso 3,352 vs anseo ~0).
  // If a Kerry speaker ever states the conditioning, encode it HERE and not as a
  // blanket substitution.
  { id: 'go-tapa',   bad: /(?<![\wÀ-ſ])go\s+tapa(?![\wÀ-ſ])/g,   want: 'go tapaidh', why: 'go tapa is 0 in Kerry' },
  { id: 'faoi',      bad: /(?<![\wÀ-ſ])faoi(?![\wÀ-ſ])/g,        want: 'fé', why: 'fé 2,573 MU vs faoi 25' },
  { id: 'teach',     bad: /(?<![\wÀ-ſ])teach(?![\wÀ-ſ])/g,       want: 'tigh', why: 'sa tigh 141 MU vs sa teach 3' },

  // --- the verb system: the part that decides Kerry vs Caighdean --------
  { id: 'ta-me',     bad: /(?<![\wÀ-ſ])tá\s+mé(?![\wÀ-ſ])/g,     want: 'táim', why: 'synthetic 1sg; tá mé is Connacht' },
  { id: 'nil-me',    bad: /(?<![\wÀ-ſ])níl\s+mé(?![\wÀ-ſ])/g,    want: 'nílim', why: 'synthetic 1sg negative' },
  { id: 'bhi-me',    bad: /(?<![\wÀ-ſ])bhí\s+mé(?![\wÀ-ſ])/g,    want: 'bhíos', why: 'synthetic 1sg past' },
  { id: 'muid',      bad: /(?<![\wÀ-ſ])muid(?![\wÀ-ſ])/g,        want: '-mid', why: 'muid 36 MU vs 11,150 CO; Kerry has no muid' },
  { id: 'ta-tu',     bad: /(?<![\wÀ-ſ])tá\s+tú(?![\wÀ-ſ])/g,     want: 'tánn tú', why: 'tánn tú 249 MU / 0 CO' },
  { id: 'bhfuilir',  bad: /(?<![\wÀ-ſ])bhfuilir(?![\wÀ-ſ])/g,    want: 'an bhfuil tú', why: 'the 2sg -ir is dead: 0 hits in Kerry broadcast' },
  { id: 'nach',      bad: /(?<![\wÀ-ſ])nach(?![\wÀ-ſ])/g,        want: 'ná', why: 'ná fuil 1,161 MU vs 1 CO',
                     // The COPULA keeps `nach` - Ó Sé §634, and measured on the Kerry texts:
                     //   nach féidir 4/0/2  vs  ná féidir 0/0/0   <- decisive
                     //   nach maith  1/0/6  vs  ná maith  4/0/2   <- genuinely mixed
                     // So `nach` before a copula predicate is NOT an error. The `ná` ruling is
                     // about the substantive verb (ná fuil 1,161 vs nach bhfuil 209), not the copula.
                     exclude: /nach\s+(?:ea|é|í|iad|hea|féidir|maith|dócha|fíor|cuma|deacair|fearr|mór|ceart)(?![\wÀ-ſ])/i },
  // NB [\wÀ-ſ], never \w: JS \w is ASCII-only, so \w+ cannot match "mé" and the
  // rule silently missed "Tá mé ag iarraidh". Calibration caught it.
  { id: 'ag-iarraidh-want', bad: /(?<![\wÀ-ſ])(?:tá|táim|bhí|bhíos)\s+(?:[\wÀ-ſ]+\s+)?ag\s+iarraidh(?![\wÀ-ſ])/gi,
                     want: "teastaíonn ... uaim / táim d'iarraidh", why: 'ag iarraidh is 0 in all of Teach Yourself Irish; it is the Connemara spine' },
  { id: 'silim',     bad: /(?<![\wÀ-ſ])sílim(?![\wÀ-ſ])/g,       want: 'is dóigh liom', why: 'sílim 9 MU vs 322 CO / 442 UL' },
  { id: 'ceapaim',   bad: /(?<![\wÀ-ſ])ceapaim(?![\wÀ-ſ])/g,     want: 'is dóigh liom', why: 'is dóigh liom 1,617 MU' },
  { id: 'in-ann',    bad: /(?<![\wÀ-ſ])in\s+ann(?![\wÀ-ſ])/g,    want: 'is féidir liom', why: 'in ann is 0 in Teach Yourself Irish' },
  { id: 'sa-ecl',    bad: /(?<![\wÀ-ſ])sa\s+(?:mb|gc|nd|ng|bhf|dt)/g, want: 'sa + lenition', why: "Connacht's sa mbaile is not Munster; sa lenites" },
];

// Irish capitalises the first word of a sentence, so "Tá mé" must trip the same
// rule as "tá mé".  Calibration caught this as a live bug; do not remove.
for (const r of RULES) {
  if (!r.bad.flags.includes('i')) r.bad = new RegExp(r.bad.source, r.bad.flags + 'i');
}

function scan(rows) {
  const findings = [];
  for (const r of RULES) {
    const hits = [];
    for (const row of rows) {
      const t = row.target_text || '';
      if (!t.trim()) continue;
      for (const m of t.matchAll(r.bad)) {
        // hunt our own false positives before counting
        if (r.exclude) {
          const ctx = t.slice(Math.max(0, m.index - 12), m.index + m[0].length + 12);
          if (r.exclude.test(ctx)) continue;
        }
        hits.push({ seed: row.seed_number, hit: m[0], text: t });
      }
    }
    if (hits.length) findings.push({ rule: r, hits });
  }
  return findings;
}

/** ZUT: one English prompt must map to exactly one Irish form. */
function zut(rows) {
  const byKnown = new Map();
  for (const r of rows) {
    if (!r.target_text || !r.target_text.trim()) continue;
    const k = (r.known_text || '').trim().toLowerCase();
    if (!byKnown.has(k)) byKnown.set(k, new Map());
    const m = byKnown.get(k);
    const t = r.target_text.trim();
    if (!m.has(t)) m.set(t, []);
    m.get(t).push(r.seed_number);
  }
  return [...byKnown.entries()]
    .filter(([, m]) => m.size > 1)
    .map(([k, m]) => ({ known: k, variants: [...m.entries()] }));
}

// ---------------------------------------------------------------------------
// CALIBRATION.  Each case is a known positive for its own rule.  If any of these
// fail, the detector is broken and every zero it prints is a lie.
const SELFTEST = [
  ['gaeilge',   'Tá Gaeilge agam',                 true ],
  ['gaeilge',   'Tá Gaelainn agam',                false],
  ['gaeilge',   'Táim ag foghlaim na Gaeilge',     true ],  // genitive must still trip
  ['gaeilge',   'beagán Gaelainne',                false],  // genitive of the GOOD form must not
  ['gaeilge',   'labhairt i nGaeilge',             true ],  // eclipsed must still trip
  ['eigin',     'rud éigin a rá',                  true ],
  ['eigin',     'rud éigint a rá',                 false],
  ['eigin',     "ar éigin a chuala mé é",          false],  // "barely" - different lexeme
  ['eigin',     "b'éigin dom imeacht",             false],  // "had to" - different lexeme
  ['nach',      'deir sé nach bhfuil sé anso',     true ],
  ['nach',      'deir sé ná fuil sé anso',         false],
  ['nach',      'Múinteoir is ea é, nach ea?',     false],
  ['nach',      'a chreidiúint nach féidir leat',   false],  // copula: nach féidir 7, ná féidir 0
  ['nach',      'deir sé nach bhfuilim anso',       true ],   // substantive verb: must still trip  // copula exception
  ['ta-me',     'Tá mé anso',                      true ],
  ['ta-me',     'Táim anso',                       false],
  ['muid',      'Tá muid anso',                    true ],
  ['muid',      'Táimid anso',                     false],
  ['ansin',     'Bhí sé ansin',                    true ],
  ['ansin',     'Bhí sé ansan',                    false],
  ['anseo',     'Tá sé anseo',                     true ],
  ['anseo',     'Tá sé anso',                      false],
  ['faoi',      'ag caint faoi',                   true ],
  ['faoi',      'ag caint fé',                     false],
  ['sa-ecl',    'sa mbaile',                       true ],
  ['sa-ecl',    'sa bhaile',                       false],
  ['ag-iarraidh-want', 'Tá mé ag iarraidh foghlaim', true ],
  ['ag-iarraidh-want', "Táim d'iarraidh foghlaim",  false],
  ['in-ann',    'níl mé in ann é a dhéanamh',      true ],
  ['in-ann',    'ní féidir liom é a dhéanamh',     false],
  ['bhfuilir',  'an bhfuilir ann?',                true ],
  ['bhfuilir',  'an bhfuil tú ann?',               false],
];

function selftest() {
  let pass = 0, fail = 0;
  for (const [id, text, expect] of SELFTEST) {
    const r = RULES.find(x => x.id === id);
    if (!r) { console.log(`  ?? no rule ${id}`); fail++; continue; }
    const f = scan([{ seed_number: 0, known_text: '', target_text: text }]);
    const got = f.some(x => x.rule.id === id);
    if (got === expect) { pass++; }
    else { fail++; console.log(`  FAIL [${id}] expected ${expect ? 'HIT' : 'no hit'}: "${text}"`); }
  }
  console.log(`\ncalibration: ${pass} pass, ${fail} fail`);
  if (fail) { console.log('DETECTOR IS BROKEN — do not trust any count it prints.'); process.exit(1); }
  console.log('detector calibrated; counts below are meaningful.');
  return true;
}

async function fromDb() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  let all = [];
  for (let off = 0; off < 2000; off += 500) {
    const r = await fetch(`${url}/rest/v1/course_seeds?course_code=eq.gle_mu_for_eng` +
      `&select=seed_number,known_text,target_text&order=seed_number&limit=500&offset=${off}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const j = await r.json();
    all = all.concat(j);
    if (j.length < 500) break;
  }
  return all;
}

function fromFiles() {
  const fs = require('fs'), path = 'scripts/gle-mu/out';
  let all = [];
  for (const f of fs.readdirSync(path).filter(x => x.endsWith('.json')).sort()) {
    try { all = all.concat(JSON.parse(fs.readFileSync(`${path}/${f}`, 'utf8'))); }
    catch (e) { console.log(`  !! ${f} unreadable: ${e.message}`); }
  }
  return all.sort((a, b) => a.seed_number - b.seed_number);
}

(async () => {
  if (process.argv.includes('--selftest')) { selftest(); return; }
  selftest();
  const rows = process.argv.includes('--files') ? fromFiles() : await fromDb();
  const done = rows.filter(r => r.target_text && r.target_text.trim());
  console.log(`\n${rows.length} rows, ${done.length} translated, ${rows.length - done.length} empty\n`);

  const findings = scan(rows);
  if (!findings.length) console.log('DIALECT: clean — no banned standard/Connacht form found.');
  for (const f of findings) {
    console.log(`\n[${f.rule.id}] ${f.hits.length} hit(s) — want "${f.rule.want}" (${f.rule.why})`);
    for (const h of f.hits.slice(0, 8)) console.log(`   S${h.seed}: ${h.hit}   ⟵ ${h.text}`);
    if (f.hits.length > 8) console.log(`   ... and ${f.hits.length - 8} more`);
  }

  const z = zut(rows);
  console.log(`\nZUT: ${z.length} English prompt(s) with more than one Irish form`);
  for (const c of z) {
    console.log(`   "${c.known}"`);
    for (const [t, seeds] of c.variants) console.log(`      ${seeds.join(',')}: ${t}`);
  }
})();
