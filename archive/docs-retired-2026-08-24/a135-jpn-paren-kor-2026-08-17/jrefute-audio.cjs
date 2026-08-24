// AXIS 6 — re-derive the audio consequence of the ACTUAL plan.
// Faithful re-implementation of the live DB functions, read out of pg_proc today:
//   normalize_text(t)      = rtrim(lower(trim(t)), '.?!¿¡。？！')
//   audio_id_for_text(c,t,r) = SELECT id FROM course_audio
//        WHERE course_code=c AND role=r AND s3_key IS NOT NULL
//          AND text_normalized = normalize_text(t)
//        ORDER BY (origin='human') DESC, created_at DESC, id::text DESC LIMIT 1
// Triggers (BEFORE UPDATE, both tables): on known_text change -> known_audio_id repointed.
// course_legos ALSO repoints presentation_audio_id from NEW.target_text on a known_text change.
// course_practice_phrases deliberately leaves presentation_audio_id alone.
const fs = require('fs');
const plan = require('./adj-plan.json');
const audio = require('./jrefute-audio.json');
const corpus = require('./jrefute-corpus.json');

const TRIM_CHARS = '.?!¿¡。？！';
function normalize_text(t) {
  if (t == null) return null;
  let s = String(t).trim().toLowerCase();
  let end = s.length;
  while (end > 0 && TRIM_CHARS.includes(s[end - 1])) end--;
  return s.slice(0, end);
}

// build the index audio_id_for_text selects from
const idx = new Map(); // course|role|text_normalized -> [rows]
for (const a of audio) {
  if (!a.has_key) continue;
  const k = a.course_code + '|' + a.role + '|' + a.text_normalized;
  if (!idx.has(k)) idx.set(k, []);
  idx.get(k).push(a);
}
for (const rows of idx.values()) {
  rows.sort((x, y) => {
    const hx = x.origin === 'human' ? 0 : 1, hy = y.origin === 'human' ? 0 : 1;
    if (hx !== hy) return hx - hy;
    if (x.created_at !== y.created_at) return x.created_at < y.created_at ? 1 : -1;
    return x.id < y.id ? 1 : -1;
  });
}
function audio_id_for_text(course, text, role) {
  const rows = idx.get(course + '|' + role + '|' + normalize_text(text));
  return rows ? rows[0] : null;
}
const byClipId = new Map(audio.map(a => [a.id, a]));

// live state of every row (known_audio_id came from the corpus dump)
const live = new Map(corpus.map(r => [r.row_uuid + '|' + r.tbl, r]));

function simulate(edits, label, verbose) {
  let free = 0, silent = 0, unchanged = 0;
  const voiceChanges = [], textMismatch = [], goesSilent = [], clipSwap = [];
  for (const e of edits) {
    const key = e.row_uuid + '|' + e.table;
    const row = live.get(key);
    if (!row) { console.log('  !! row not in corpus', key); continue; }
    const newClip = audio_id_for_text(row.course_code, e.new_known_text, 'known');
    const oldClip = row.known_audio_id ? byClipId.get(row.known_audio_id) : null;
    if (!newClip) {
      silent++;
      if (row.known_audio_id) goesSilent.push({ ...e, old_clip: row.known_audio_id, old_voice: oldClip && oldClip.voice_id, old_text: oldClip && oldClip.text });
      continue;
    }
    free++;
    if (oldClip && newClip.id !== oldClip.id) clipSwap.push({ e, oldClip, newClip });
    if (oldClip && newClip.voice_id !== oldClip.voice_id) voiceChanges.push({ e, oldClip, newClip });
    if (newClip.text !== e.new_known_text) textMismatch.push({ e, newClip });
    if (oldClip && newClip.id === oldClip.id) unchanged++;
  }
  console.log(`\n### ${label}: ${edits.length} edits | free rebind ${free} | goes SILENT ${silent} (of which had a clip: ${goesSilent.length}) | rebind is same clip ${unchanged}`);
  console.log(`    clip SWAPS (different clip id): ${clipSwap.length}`);
  console.log(`    VOICE CHANGES: ${voiceChanges.length}`);
  console.log(`    TEXT MISMATCH (matched clip's raw text != new known_text): ${textMismatch.length}`);
  if (verbose) {
    for (const v of voiceChanges) console.log('    VOICE', v.e.course_code, v.e.row_key, JSON.stringify(v.e.old_known_text), '->', JSON.stringify(v.e.new_known_text), '|', v.oldClip.voice_id, '->', v.newClip.voice_id);
    for (const t of textMismatch.slice(0, 40)) console.log('    TEXT ', t.e.course_code, t.e.row_key, 'row now says', JSON.stringify(t.e.new_known_text), 'clip says', JSON.stringify(t.newClip.text), 'voice', t.newClip.voice_id);
    if (textMismatch.length > 40) console.log('    ... +' + (textMismatch.length - 40) + ' more text mismatches');
  }
  return { free, silent, goesSilent, voiceChanges, textMismatch, clipSwap };
}

const ktRows = plan.filter(p => p.surface === 'known_text');
const editRows = ktRows.filter(p => ['strip', 'rewrite', 'partial'].includes(p.action));
const otherEdits = plan.filter(p => p.surface !== 'known_text' && ['strip', 'rewrite', 'partial'].includes(p.action));
console.log('plan: known_text rows', ktRows.length, '| known_text edits', editRows.length, '| tile/component edits', otherEdits.length, '| total edits', editRows.length + otherEdits.length);

// CONTROL — naive full strip of all 997 known_text rows (the lead measured 424 free rebinds, 0 voice changes)
const stripParen = s => s.replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, ' ').trim();
simulate(ktRows.map(p => ({ ...p, new_known_text: stripParen(p.old_known_text) })), 'CONTROL naive full strip (997)', false);

// THE ACTUAL PLAN
const r = simulate(editRows, 'ACTUAL PLAN known_text edits', true);

// presentation repoint on the lego side
let presRepoint = 0, presChanged = 0, presLost = 0;
const presDetail = [];
for (const e of editRows) {
  if (e.table !== 'course_legos') continue;
  presRepoint++;
  const row = live.get(e.row_uuid + '|' + e.table);
  const np = audio_id_for_text(row.course_code, e.target_text, 'presentation');
  presDetail.push({ row_key: e.row_key, course: e.course_code, new_pres: np ? np.id : null, pres_text: np ? np.text : null });
  if (!np) presLost++;
}
console.log(`\n### presentation_audio_id repoint (course_legos known_text edits only): ${presRepoint} rows fire it`);
console.log(`    of which audio_id_for_text(target_text,'presentation') finds NOTHING -> presentation_audio_id set to NULL: ${presLost}`);
console.log(`    NOTE: repoint is keyed on target_text, which this plan does NOT change.`);

fs.writeFileSync('./jrefute-a6-derived.json', JSON.stringify({
  control: null,
  voiceChanges: r.voiceChanges, textMismatch: r.textMismatch, goesSilent: r.goesSilent, clipSwap: r.clipSwap.map(c => ({ row_key: c.e.row_key, course: c.e.course_code, old: c.oldClip.id, new: c.newClip.id, old_voice: c.oldClip.voice_id, new_voice: c.newClip.voice_id, old_text: c.oldClip.text, new_text: c.newClip.text })),
  presDetail,
}, null, 1));
