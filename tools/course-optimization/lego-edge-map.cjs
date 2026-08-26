#!/usr/bin/env node
/**
 * LEGO EDGE MAP — what does each new LEGO actually connect to?
 *
 * A new LEGO is a NODE. Its BUILD phrases are the EDGES it draws into the graph of
 * everything the learner already has. Nothing in the estate has ever measured those edges,
 * so nothing has ever been able to say whether we follow our own rule of ONE NEW
 * DISTINCTION AT A TIME: a BUILD phrase should pair the new LEGO with ONE previous LEGO,
 * then a DIFFERENT one, then maybe a third — not dump four partners at once, and not
 * pair with the same partner four times running.
 *
 * READ-ONLY. Touches no course content, writes nothing to the database.
 *
 * TWO INDEPENDENT EDGE SOURCES, deliberately, because one source cannot check itself:
 *
 *   DECLARED — course_practice_phrases.decomposition, the tiling the builder itself
 *     recorded. Each tile carries {known, target, legoId, isGhost, isSalient}. This is the
 *     builder's own claim about which LEGOs a phrase combines.
 *
 *   MATCHED — an independent longest-match non-overlapping tiling of the phrase's TARGET
 *     text against the introduced inventory at that moment, the way the validator's
 *     containment logic thinks about it.
 *
 * Where the two disagree, that IS a finding and it is reported, never averaged away.
 *
 * WHAT THE MATCHER CANNOT SEE, stated up front rather than scored as zero:
 *   contractions (del = de + el, al = a + el), clitic attachment (explicarlo, decirme),
 *   elision, and agreement changes (amable/amables, poco/poca). Target tokens the matcher
 *   cannot attribute go to an `unmatched` bucket WITH A REASON. A check that cries wolf is
 *   a check people learn to ignore.
 *
 * Usage:
 *   node tools/course-optimization/lego-edge-map.cjs spa_for_eng
 *   node tools/course-optimization/lego-edge-map.cjs spa_for_eng fra_for_eng
 *   EDGE_OUT=path.json   itemised per-LEGO and per-phrase detail
 *   REGIONS=1-150,151-400,401-9999   override the region partition
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const FREE_CLASS_ES = new Set([
  // Spanish glue the known-side controlled language licenses without a LEGO of its own.
  // Present so an unmatched token that is only glue is not reported as untaught vocabulary.
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'a', 'en', 'y', 'o', 'que',
  'del', 'al', 'lo', 'se', 'me', 'te', 'nos', 'le', 'les', 'su', 'sus', 'mi', 'mis', 'tu',
  'tus', 'es', 'no', 'si', 'por', 'para', 'con',
]);

function supa() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Lowercase, drop punctuation, collapse space. Accents KEPT — they distinguish words in Spanish. */
function norm(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[¿?¡!.,;:"'“”‘’()\[\]…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  const n = norm(s);
  return n ? n.split(' ') : [];
}

/** Accent-and-agreement-tolerant fold, used ONLY to explain an unmatched token, never to score a match. */
function fold(s) {
  return norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** PostgREST offset paging needs an explicit order, or rows repeat and others are never seen. */
async function page(sb, table, cols, courseCode, orderCols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(cols).eq('course_code', courseCode);
    for (const c of orderCols) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table} ${courseCode}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

function parseRegions() {
  const spec = process.env.REGIONS || '1-150,151-400,401-9999';
  const names = ['early', 'middle', 'late'];
  return spec.split(',').map((r, i) => {
    const [lo, hi] = r.split('-').map(Number);
    return { name: names[i] || `region${i + 1}`, lo, hi };
  });
}

function regionOf(regions, seed) {
  return (regions.find((r) => seed >= r.lo && seed <= r.hi) || { name: 'unbanded' }).name;
}

async function loadCourse(sb, courseCode) {
  const legos = await page(
    sb, 'course_legos',
    'lego_id,seed_number,lego_index,type,is_new,known_text,target_text,components',
    courseCode, ['seed_number', 'lego_index'],
  );
  const phrases = await page(
    sb, 'course_practice_phrases',
    'id,seed_number,lego_index,position,known_text,target_text,phrase_role,decomposition',
    courseCode, ['seed_number', 'lego_index', 'position'],
  );
  return { legos, phrases };
}

/**
 * Longest-match non-overlapping tiling of a token list against the introduced inventory.
 * Returns the LEGO ids covered and the tokens nothing could account for, each with a reason.
 */
function tile(toks, inventoryByPhrase, maxLen, ownTargetToks, ownKeys) {
  const covered = new Set();
  const unmatched = [];
  let i = 0;
  // The NEW LEGO's own target must be consumed WHOLE before anything else. Without this the
  // matcher shreds a multi-word new LEGO ("el mayor tiempo posible") into four older LEGOs and
  // reports four edges where there are none — the single largest source of over-counting.
  const localMax = Math.max(maxLen, ...ownKeys.map((k) => k.split(' ').length));
  while (i < toks.length) {
    let hit = null;
    for (let len = Math.min(localMax, toks.length - i); len >= 1; len--) {
      const key = toks.slice(i, i + len).join(' ');
      if (ownKeys.includes(key)) { hit = { lego: null, len }; break; }
      const lego = inventoryByPhrase.get(key);
      if (lego) { hit = { lego, len }; break; }
    }
    if (hit) {
      if (hit.lego) covered.add(hit.lego);
      i += hit.len;
      continue;
    }
    const t = toks[i];
    let reason = 'unknown';
    if (FREE_CLASS_ES.has(t)) reason = 'free_class';
    else if (ownTargetToks.includes(t)) reason = 'own_lego';
    else if (/^(del|al)$/.test(t)) reason = 'contraction';
    else if (/(lo|la|le|me|te|se|nos|los|las|les)$/.test(t) && t.length > 4) reason = 'possible_clitic';
    else {
      // agreement / accent variant of something we DO have
      for (const key of inventoryByPhrase.keys()) {
        if (key.indexOf(' ') !== -1) continue;
        if (fold(key) === fold(t)) { reason = 'accent_variant'; break; }
        if (key.length > 3 && (fold(key).replace(/[oa]s?$/, '') === fold(t).replace(/[oa]s?$/, ''))) {
          reason = 'agreement_variant'; break;
        }
      }
    }
    unmatched.push({ token: t, reason });
    i += 1;
  }
  return { covered, unmatched };
}

function analyse(courseCode, { legos, phrases }, regions) {
  // Ordinal order: a LEGO may use every LEGO of every earlier seed, plus earlier-indexed
  // LEGOs of its own seed. Sorting by (seed, index) makes "introduced" simply "lower ordinal".
  legos.sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  legos.forEach((l, i) => { l.ordinal = i; });
  const byId = new Map(legos.map((l) => [l.lego_id, l]));

  const buildsByLego = new Map();
  const usesByLego = new Map();
  for (const p of phrases) {
    const k = `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`;
    if (p.phrase_role === 'build') {
      if (!buildsByLego.has(k)) buildsByLego.set(k, []);
      buildsByLego.get(k).push(p);
    } else if (p.phrase_role === 'use') {
      usesByLego.set(k, (usesByLego.get(k) || 0) + 1);
    }
  }

  // Rolling inventory of introduced target strings, keyed by normalised target text.
  const inv = new Map();
  let maxLen = 1;

  const legoRows = [];
  const phraseRows = [];
  const partnerUse = new Map(); // lego_id -> how many times used as an edge partner after debut

  for (const lego of legos) {
    const builds = buildsByLego.get(lego.lego_id) || [];
    const ownToks = tokens(lego.target_text);
    const ownKnown = norm(lego.known_text);

    const ownKeys = [norm(lego.target_text)].filter(Boolean);
    for (const c of (Array.isArray(lego.components) ? lego.components : [])) {
      const ck = norm(c && (c.target || c.target_text));
      if (ck) ownKeys.push(ck);
    }
    ownKeys.sort((a, b) => b.length - a.length);

    const perPhrase = [];
    for (const p of builds) {
      const decomp = Array.isArray(p.decomposition) ? p.decomposition : [];
      const declared = new Set();
      let ghostTiles = 0;
      let ghostTaught = 0;
      let forwardRefs = [];
      for (const tileRow of decomp) {
        if (tileRow.isGhost || !tileRow.legoId) {
          ghostTiles += 1;
          // A ghost whose text IS a taught LEGO is under-attribution, not untaught material.
          if (inv.has(norm(tileRow.target))) ghostTaught += 1;
          continue;
        }
        if (tileRow.legoId === lego.lego_id) continue;
        const partner = byId.get(tileRow.legoId);
        if (!partner) { forwardRefs.push(tileRow.legoId + ':unknown'); continue; }
        if (partner.ordinal > lego.ordinal) { forwardRefs.push(tileRow.legoId); continue; }
        declared.add(tileRow.legoId);
      }

      const m = tile(tokens(p.target_text), inv, maxLen, ownToks, ownKeys);
      const matched = new Set([...m.covered].map((l) => l.lego_id));
      // A CONTENT edge is a partner that carries meaning. A LEGO whose whole target is one
      // free-class glue word ("a", "de", "que") is licensed machinery, not a distinction the
      // phrase is teaching, and counting it as an edge would flatter every phrase in the course.
      const contentMatched = [...m.covered]
        .filter((l) => { const k = norm(l.target_text); return !(k.indexOf(' ') === -1 && FREE_CLASS_ES.has(k)); })
        .map((l) => l.lego_id);

      const declaredArr = [...declared];
      const matchedArr = [...matched];
      const agree = declaredArr.length === matchedArr.length
        && declaredArr.every((x) => matched.has(x));
      // Does the recorded tiling actually reconstruct the phrase? If not it is STALE — the text
      // was edited after the decomposition was written — and its edge list cannot be trusted.
      const rebuilt = norm(decomp.map((t) => t.target || '').join(''));
      const decompStatus = !decomp.length ? 'absent'
        : (rebuilt === norm(p.target_text) ? 'complete' : 'stale');

      const containsOwnTarget = norm(p.target_text).includes(norm(lego.target_text));
      const containsOwnKnown = norm(p.known_text).includes(ownKnown);

      perPhrase.push({
        phrase_id: p.id,
        seed: p.seed_number,
        known: p.known_text,
        target: p.target_text,
        declared: declaredArr,
        matched: matchedArr,
        contentMatched,
        edges: contentMatched.length,      // the headline measure: meaningful partners
        edges_declared: declaredArr.length,
        edges_matched: matchedArr.length,
        agree,
        decompStatus,
        ghostTiles,
        ghostTaught,
        forwardRefs,
        unmatched: m.unmatched,
        containsOwnTarget,
        containsOwnKnown,
        hasDecomposition: decomp.length > 0,
      });
      for (const d of contentMatched) partnerUse.set(d, (partnerUse.get(d) || 0) + 1);
    }

    const allPartners = new Set();
    perPhrase.forEach((p) => p.contentMatched.forEach((d) => allPartners.add(d)));
    const distances = [];
    for (const d of allPartners) {
      const partner = byId.get(d);
      if (partner) distances.push(lego.ordinal - partner.ordinal);
    }
    // Repetition: how concentrated is the partner set? 1.0 = every phrase draws the same partners.
    const partnerSlots = perPhrase.reduce((a, p) => a + p.contentMatched.length, 0);
    const variety = partnerSlots ? allPartners.size / partnerSlots : null;

    legoRows.push({
      lego_id: lego.lego_id,
      seed: lego.seed_number,
      ordinal: lego.ordinal,
      region: regionOf(regions, lego.seed_number),
      type: lego.type,
      known: lego.known_text,
      target: lego.target_text,
      buildCount: builds.length,
      useCount: usesByLego.get(lego.lego_id) || 0,
      distinctPartners: allPartners.size,
      partnerSlots,
      variety,
      distances,
      medianDistance: distances.length
        ? distances.slice().sort((a, b) => a - b)[Math.floor(distances.length / 2)] : null,
      edgeHistogram: perPhrase.reduce((h, p) => { h[Math.min(p.edges, 4)] = (h[Math.min(p.edges, 4)] || 0) + 1; return h; }, {}),
      zeroEdgeBuilds: perPhrase.filter((p) => p.edges === 0).length,
      soloBuilds: perPhrase.filter((p) => p.edges === 0 && norm(p.target) === norm(lego.target_text)).length,
      phrases: perPhrase,
    });
    phraseRows.push(...perPhrase.map((p) => ({ ...p, lego_id: lego.lego_id, region: regionOf(regions, p.seed) })));

    // Only now does this LEGO join the inventory — no forward references.
    const key = norm(lego.target_text);
    if (key && !inv.has(key)) {
      inv.set(key, lego);
      maxLen = Math.max(maxLen, key.split(' ').length);
    }
    for (const c of (Array.isArray(lego.components) ? lego.components : [])) {
      const ck = norm(c && (c.target || c.target_text));
      if (ck && !inv.has(ck)) { inv.set(ck, lego); maxLen = Math.max(maxLen, ck.split(' ').length); }
    }
  }

  // Which nodes are ever re-used as an edge partner after their own debut?
  for (const l of legoRows) l.reusedAsPartner = partnerUse.get(l.lego_id) || 0;

  return { courseCode, legoRows, phraseRows, regions };
}

function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }

function report(res) {
  const { courseCode, legoRows, phraseRows, regions } = res;
  const lines = [];
  const say = (s) => { lines.push(s); console.log(s); };

  say(`\n═══ ${courseCode} — LEGO EDGE MAP ═══`);
  say(`${legoRows.length} LEGOs, ${phraseRows.length} BUILD phrases`);

  const bands = [...regions.map((r) => r.name), 'ALL'];
  const inBand = (rows, b) => (b === 'ALL' ? rows : rows.filter((r) => r.region === b));

  say('\n— EDGES PER BUILD PHRASE (how many previous LEGOs each phrase combines the new one with)');
  say('region      phrases      0 edges     1 edge     2 edges    3 edges    4+ edges   mean');
  for (const b of bands) {
    const rs = inBand(phraseRows, b);
    const h = [0, 1, 2, 3, 4].map((k) => rs.filter((r) => (k === 4 ? r.edges >= 4 : r.edges === k)).length);
    const mean = rs.length ? (rs.reduce((a, r) => a + r.edges, 0) / rs.length).toFixed(2) : '—';
    say(`${b.padEnd(10)} ${String(rs.length).padStart(7)}   ${h.map((c) => `${String(c).padStart(5)} ${pct(c, rs.length).padStart(6)}`).join(' ')}  ${mean}`);
  }

  say('\n— ONE-DISTINCTION RATE (share of BUILD phrases drawing exactly one edge)');
  for (const b of bands) {
    const rs = inBand(phraseRows, b);
    say(`${b.padEnd(10)} ${pct(rs.filter((r) => r.edges === 1).length, rs.length).padStart(7)}`);
  }

  say('\n— ZERO-EDGE BUILD PHRASES (the new LEGO plugged into nothing at all)');
  say('region      zero-edge   of which the LEGO ALONE');
  for (const b of bands) {
    const rs = inBand(phraseRows, b);
    const z = rs.filter((r) => r.edges === 0);
    const solo = inBand(legoRows, b).reduce((a, l) => a + l.soloBuilds, 0);
    say(`${b.padEnd(10)} ${String(z.length).padStart(6)} ${pct(z.length, rs.length).padStart(7)}   ${String(solo).padStart(6)}`);
  }

  say('\n— PARTNER VARIETY PER LEGO (distinct previous LEGOs touched across all its BUILD phrases)');
  say('region       LEGOs   mean distinct   mean builds   1-partner LEGOs   variety ratio');
  for (const b of bands) {
    const rs = inBand(legoRows, b).filter((l) => l.buildCount > 0);
    const md = rs.length ? (rs.reduce((a, l) => a + l.distinctPartners, 0) / rs.length).toFixed(2) : '—';
    const mb = rs.length ? (rs.reduce((a, l) => a + l.buildCount, 0) / rs.length).toFixed(2) : '—';
    const one = rs.filter((l) => l.distinctPartners === 1).length;
    const vr = rs.filter((l) => l.variety !== null);
    const v = vr.length ? (vr.reduce((a, l) => a + l.variety, 0) / vr.length).toFixed(2) : '—';
    say(`${b.padEnd(10)} ${String(rs.length).padStart(7)} ${String(md).padStart(14)} ${String(mb).padStart(13)} ${String(one).padStart(12)} ${pct(one, rs.length).padStart(6)} ${String(v).padStart(9)}`);
  }

  say('\n— DISTANCE PROFILE (how far back in the graph the partners live, in LEGO ordinals)');
  say('region      edges   dist 1-2    dist 3-10   dist 11-50   dist 51+    median');
  for (const b of bands) {
    const rs = inBand(legoRows, b);
    const all = rs.flatMap((l) => l.distances);
    const bucket = (lo, hi) => all.filter((d) => d >= lo && d <= hi).length;
    const sorted = all.slice().sort((a, c) => a - c);
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : '—';
    say(`${b.padEnd(10)} ${String(all.length).padStart(6)}  ${[[1, 2], [3, 10], [11, 50], [51, 1e9]].map(([lo, hi]) => pct(bucket(lo, hi), all.length).padStart(8)).join('   ')}  ${String(med).padStart(6)}`);
  }

  say('\n— ORPHAN NODES (taught once, never re-used as an edge partner in any later BUILD phrase)');
  say('region       LEGOs   never re-used            re-used once');
  for (const b of bands) {
    const rs = inBand(legoRows, b);
    const never = rs.filter((l) => l.reusedAsPartner === 0).length;
    const once = rs.filter((l) => l.reusedAsPartner === 1).length;
    say(`${b.padEnd(10)} ${String(rs.length).padStart(7)} ${String(never).padStart(7)} ${pct(never, rs.length).padStart(7)}   ${String(once).padStart(7)} ${pct(once, rs.length).padStart(7)}`);
  }

  say('\n— PHRASE FLOORS (>=4 BUILD and >=5 USE per LEGO, S4 onward)');
  say('region       LEGOs   under 4 BUILD   under 5 USE   zero BUILD');
  for (const b of bands) {
    const rs = inBand(legoRows, b).filter((l) => l.seed >= 4);
    const ub = rs.filter((l) => l.buildCount < 4).length;
    const uu = rs.filter((l) => l.useCount < 5).length;
    const zb = rs.filter((l) => l.buildCount === 0).length;
    say(`${b.padEnd(10)} ${String(rs.length).padStart(7)} ${String(ub).padStart(8)} ${pct(ub, rs.length).padStart(6)}   ${String(uu).padStart(6)} ${pct(uu, rs.length).padStart(6)}   ${String(zb).padStart(6)}`);
  }

  say('\n— THE TWO EDGE SOURCES AGAINST EACH OTHER (builder\'s own tiling vs independent match)');
  say('region      phrases   agree     builder saw MORE   builder saw FEWER');
  for (const b of bands) {
    const rs = inBand(phraseRows, b);
    const ag = rs.filter((r) => r.agree).length;
    const dm = rs.filter((r) => r.edges_declared > r.edges_matched).length;
    const md = rs.filter((r) => r.edges_matched > r.edges_declared).length;
    say(`${b.padEnd(10)} ${String(rs.length).padStart(7)}  ${pct(ag, rs.length).padStart(7)}   ${String(dm).padStart(8)} ${pct(dm, rs.length).padStart(7)}  ${String(md).padStart(8)} ${pct(md, rs.length).padStart(7)}`);
  }

  say('\n— HEALTH OF THE BUILDER\'S OWN RECORDED TILING (can it even reconstruct the phrase?)');
  say('region      phrases   complete       STALE          absent    ghost tiles that are TAUGHT LEGOs');
  for (const b of bands) {
    const rs = inBand(phraseRows, b);
    const c = rs.filter((r) => r.decompStatus === 'complete').length;
    const st = rs.filter((r) => r.decompStatus === 'stale').length;
    const ab = rs.filter((r) => r.decompStatus === 'absent').length;
    const gt = rs.filter((r) => r.ghostTaught > 0).length;
    say(`${b.padEnd(10)} ${String(rs.length).padStart(7)}  ${String(c).padStart(5)} ${pct(c, rs.length).padStart(7)}  ${String(st).padStart(5)} ${pct(st, rs.length).padStart(7)}  ${String(ab).padStart(5)} ${pct(ab, rs.length).padStart(6)}   ${String(gt).padStart(5)} ${pct(gt, rs.length).padStart(7)}`);
  }

  say('\n— WHAT THE INDEPENDENT MATCHER COULD NOT ACCOUNT FOR (reasons, not silent zeroes)');
  const reasons = {};
  for (const r of phraseRows) for (const u of r.unmatched) reasons[u.reason] = (reasons[u.reason] || 0) + 1;
  const totalTokens = phraseRows.reduce((a, r) => a + tokens(r.target).length, 0);
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    say(`  ${String(v).padStart(6)} ${pct(v, totalTokens).padStart(7)}  ${k}`);
  }

  say('\n— INVARIANTS');
  const noOwnT = phraseRows.filter((r) => !r.containsOwnTarget).length;
  const noOwnK = phraseRows.filter((r) => !r.containsOwnKnown).length;
  const fwd = phraseRows.filter((r) => r.forwardRefs.length).length;
  const ghost = phraseRows.filter((r) => r.ghostTiles > 0).length;
  say(`  BUILD phrases missing their own LEGO's TARGET text : ${noOwnT} (${pct(noOwnT, phraseRows.length)})`);
  say(`  BUILD phrases missing their own LEGO's KNOWN text  : ${noOwnK} (${pct(noOwnK, phraseRows.length)})`);
  say(`  BUILD phrases citing a LEGO not yet introduced     : ${fwd} (${pct(fwd, phraseRows.length)})`);
  say(`  BUILD phrases with untiled "ghost" target material : ${ghost} (${pct(ghost, phraseRows.length)})`);

  return lines.join('\n');
}

(async () => {
  const courses = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!courses.length) { console.error('usage: lego-edge-map.cjs <course_code> [...]'); process.exit(1); }
  const sb = supa();
  const regions = parseRegions();
  const all = {};
  for (const c of courses) {
    const data = await loadCourse(sb, c);
    const res = analyse(c, data, regions);
    report(res);
    all[c] = res;
  }
  if (process.env.EDGE_OUT) {
    fs.writeFileSync(process.env.EDGE_OUT, JSON.stringify(all, null, 1));
    console.log(`\nitemised detail → ${process.env.EDGE_OUT}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
