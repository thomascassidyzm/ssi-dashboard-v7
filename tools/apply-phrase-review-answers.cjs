#!/usr/bin/env node
/**
 * Apply a human reviewer's answers from a phrase-review page to a Welsh sandbox course.
 *
 *   node tools/apply-phrase-review-answers.cjs <course> <answers.json> <items.json>            # dry run
 *   node tools/apply-phrase-review-answers.cjs <course> <answers.json> <items.json> --apply    # backup + write
 *   node tools/apply-phrase-review-answers.cjs <course> --undo <backup_table> [--apply]        # restore
 *
 * Built for Aran's North/South review rounds (job #836): cym_nv2_for_eng batches 1-9, then cym_sv2_for_eng.
 * It only ever touches the v2 sandbox courses (SANDBOX_COURSES) — never cym_n_for_eng, cym_s_for_eng
 * or canonical_seeds.
 *
 * Inputs
 *   answers.json  [{id, choice:'accept'|'option'|'own', text?}]   id = '<shortId>' or '<shortId>-2' (2nd flag, same row)
 *   items.json    {items:[{id, source, proposed, options}]}   source says "change the ENGLISH|WELSH" for a suggestion
 *
 * Rules (Aran's)
 *   accept / 'Make this change' -> set the field named in `source` (ENGLISH = known_text, WELSH = target_text) to `proposed`
 *   'Leave it as it is'         -> nothing
 *   'Remove this phrase'        -> delete the row (backed up first)
 *   own text                    -> Welsh text replaces target_text; an English instruction ('Fix the English
 *                                  capitalisation') is carried out on known_text by capitaliseEnglish()
 * Straight apostrophes in any new text become the course's curly ’ (the course is ~99% curly).
 * A Welsh change is mirrored into the row's `decomposition` segments; an English change into their `known`
 * glosses. Rows whose decomposition could not be mirrored, and rows with audio linked, are listed, not hidden.
 * Audio links are never removed (make-before-break) — the report says which clips may no longer match.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');

const SANDBOX_COURSES = new Set(['cym_nv2_for_eng', 'cym_sv2_for_eng']);
const SURFACE = 'tools/apply-phrase-review-answers.cjs';
const TABLE = 'course_practice_phrases';

// ── text rules ────────────────────────────────────────────────────────────────────────────
const curly = (s) => s.replace(/'/g, '’');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MONTHS = ['january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// Course style (measured on cym_nv2_for_eng): sentences start lower-case; only I, Welsh/English, days,
// months and names are capitalised. So the first letter is deliberately NOT capitalised here.
function capitaliseEnglish(s) {
  let t = curly(s);
  t = t.replace(/\bi(?=\b|’)/g, 'I');
  t = t.replace(/\b(welsh|english)\b/gi, (m) => m[0].toUpperCase() + m.slice(1).toLowerCase());
  for (const d of [...DAYS, ...MONTHS]) t = t.replace(new RegExp(`\\b${d}\\b`, 'gi'), d[0].toUpperCase() + d.slice(1));
  return t;
}

// An 'own' answer is an instruction (not Welsh) when it reads like one.
const looksLikeInstruction = (t) => /^(fix|capitalis|change|make|correct)\b/i.test(t.trim());

// ── decomposition mirroring ───────────────────────────────────────────────────────────────
// Segments tile the text: join(segment[key]) === text. Apply the old->new edit (common prefix/suffix
// diff) to the one segment it falls in. Returns null if it cannot be done safely.
function mirrorEdit(segments, key, oldText, newText) {
  if (!Array.isArray(segments) || !segments.length) return { segments, status: 'none' };
  const sep = key === 'known' ? ' ' : '';
  const parts = segments.map((s) => s[key] || '');
  const nonEmpty = parts.map((p, i) => [p, i]).filter(([p]) => p !== '');
  if (nonEmpty.map(([p]) => p).join(sep) !== oldText) return { segments, status: 'not-tiling' };
  let p = 0;
  const max = Math.min(oldText.length, newText.length);
  while (p < max && oldText[p] === newText[p]) p++;
  let q = 0;
  while (q < max - p && oldText[oldText.length - 1 - q] === newText[newText.length - 1 - q]) q++;
  const oldMid = oldText.slice(p, oldText.length - q);
  const newMid = newText.slice(p, newText.length - q);
  // locate the span [p, oldText.length-q) in segment coordinates
  let pos = 0; const spans = [];
  nonEmpty.forEach(([part, i], n) => { const start = pos; pos += part.length; spans.push({ i, start, end: pos }); pos += n < nonEmpty.length - 1 ? sep.length : 0; });
  const from = p, to = oldText.length - q;
  const hit = spans.filter((s) => (to > from ? s.start < to && s.end > from : s.start <= from && from <= s.end));
  if (hit.length !== 1 || (to === from && spans.filter((s) => s.start <= from && from <= s.end).length !== 1)) return { segments, status: 'spans-segments' };
  const h = hit[0];
  const seg = parts[h.i];
  const lf = from - h.start, lt = to - h.start;
  if (lf < 0 || lt > seg.length) return { segments, status: 'spans-segments' };
  const out = segments.map((s) => ({ ...s }));
  out[h.i][key] = seg.slice(0, lf) + newMid + seg.slice(lt);
  return { segments: out, status: 'ok', edit: [oldMid, newMid] };
}

// ── planning (pure: no DB) ────────────────────────────────────────────────────────────────
function planAnswers(answers, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const plan = []; // {rowShort, itemId, action:'set'|'remove'|'leave'|'skip', field?, to?, why}
  for (const a of answers) {
    const it = byId.get(a.id);
    const rowShort = a.id.replace(/-\d+$/, '');
    if (!it) { plan.push({ itemId: a.id, rowShort, action: 'skip', why: 'answer has no matching item in items.json' }); continue; }
    const choice = a.choice === 'option' ? a.text : a.choice;
    if (a.choice === 'option' && /leave it as it is/i.test(choice)) { plan.push({ itemId: a.id, rowShort, action: 'leave' }); continue; }
    if (a.choice === 'option' && /remove this phrase/i.test(choice)) { plan.push({ itemId: a.id, rowShort, action: 'remove' }); continue; }
    if (a.choice === 'accept' || (a.choice === 'option' && /make this change/i.test(choice))) {
      const m = /change the (ENGLISH|WELSH)/.exec(it.source || '');
      if (!m) { plan.push({ itemId: a.id, rowShort, action: 'noop', why: 'accepted, but no fix was suggested (proposed = current text)' }); continue; }
      plan.push({ itemId: a.id, rowShort, action: 'set', field: m[1] === 'ENGLISH' ? 'known_text' : 'target_text', to: curly(it.proposed), fromLabel: true });
      continue;
    }
    if (a.choice === 'own') {
      if (looksLikeInstruction(a.text)) {
        if (/capitali[sz]ation/i.test(a.text) && /english/i.test(a.text)) plan.push({ itemId: a.id, rowShort, action: 'set', field: 'known_text', to: null, transform: 'capitaliseEnglish' });
        else if (/rhai to unrhyw/i.test(a.text)) {
          // 'change rhai to unrhyw and change some to any': word swaps in the Welsh and the English of the row
          plan.push({ itemId: a.id, rowShort, action: 'set', field: 'target_text', to: null, swap: [/\brhai\b/, 'unrhyw'] });
          plan.push({ itemId: a.id, rowShort, action: 'set', field: 'known_text', to: null, swap: [/\bsome\b/, 'any'] });
        } else {
          // explicit values: "change Welsh to '…' and the English to '…'" sets both fields exactly
          const w = /\bWelsh to '([^']+)'/i.exec(a.text.replace(/[‘]/g, "'"));
          const e = /\bEnglish to '([^']+)'/i.exec(a.text.replace(/[‘]/g, "'"));
          if (w && e) {
            plan.push({ itemId: a.id, rowShort, action: 'set', field: 'target_text', to: curly(w[1]) });
            plan.push({ itemId: a.id, rowShort, action: 'set', field: 'known_text', to: curly(e[1]) });
          } else if (e && !w) {
            plan.push({ itemId: a.id, rowShort, action: 'set', field: 'known_text', to: curly(e[1]) });
          } else plan.push({ itemId: a.id, rowShort, action: 'skip', why: `instruction not understood: "${a.text}"` });
        }
      } else plan.push({ itemId: a.id, rowShort, action: 'set', field: 'target_text', to: curly(a.text.trim()) });
      continue;
    }
    plan.push({ itemId: a.id, rowShort, action: 'skip', why: `unrecognised answer ${JSON.stringify(a)}` });
  }
  return plan;
}

// ── DB ────────────────────────────────────────────────────────────────────────────────────
function supa() {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}
function psql(sql) {
  let url = process.env.DATABASE_URL;
  if (!url) {
    const m = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'));
    url = m[1].replace(/^["']|["']$/g, '');
  }
  const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
const safeTable = (t) => { if (!/^backup_[a-z0-9_]+$/.test(t)) throw new Error(`bad backup table name ${t}`); return t; };

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const undoAt = argv.indexOf('--undo');
  const pos = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--undo');
  const course = pos[0];
  if (!SANDBOX_COURSES.has(course)) throw new Error(`refusing: ${course} is not a sandbox course (${[...SANDBOX_COURSES].join(', ')})`);
  const sb = supa();
  const identity = serviceIdentity('apply-phrase-review-answers', { role: 'content-fix' });

  if (undoAt >= 0) return undo(sb, identity, course, safeTable(argv[undoAt + 1]), apply);

  const [, answersPath, itemsPath] = pos;
  const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8')).items;
  const plan = planAnswers(answers, items);

  const ids = [...new Set(plan.map((p) => `${course}:${p.rowShort}`))];
  const { data: rows, error } = await sb.from(TABLE).select('*').eq('course_code', course).in('id', ids);
  if (error) throw error;
  const rowMap = new Map(rows.map((r) => [r.id, r]));

  const report = { set: [], removed: [], left: [], noop: [], unapplied: [], audio: [], decompNote: [], remaining: [] };
  const edits = new Map(); // rowId -> {known_text?, target_text?, decomposition?, items[]}
  const removals = [];
  for (const p of plan) {
    const id = `${course}:${p.rowShort}`;
    const row = rowMap.get(id);
    if (p.action === 'leave') { report.left.push(p.itemId); continue; }
    if (p.action === 'noop') { report.noop.push(`${p.itemId}: ${p.why}`); continue; }
    if (p.action === 'skip') { report.unapplied.push(`${p.itemId}: ${p.why}`); continue; }
    if (!row) { report.unapplied.push(`${p.itemId}: row ${id} not found in ${course}`); continue; }
    if (p.action === 'remove') { removals.push(row); report.removed.push(p.itemId); continue; }
    const e = edits.get(id) || { row, set: {}, items: [] };
    // The items file's 'change the ENGLISH|WELSH' label can be wrong: decide the field by which of the row's
    // two texts the proposal actually resembles (shared words), not by the label.
    if (p.fromLabel) {
      const toks = (t) => new Set(String(t).toLowerCase().replace(/[’']/g, '').split(/[^\p{L}]+/u).filter(Boolean));
      const overlap = (a, b) => { const B = toks(b); return [...toks(a)].filter((w) => B.has(w)).length; };
      const ow = overlap(p.to, row.target_text), oe = overlap(p.to, row.known_text);
      const guess = ow > oe ? 'target_text' : oe > ow ? 'known_text' : p.field;
      if (guess !== p.field) { console.log(`field fixed ${p.itemId}: label said ${p.field}, text resembles ${guess}`); p.field = guess; }
    }
    const base = e.set[p.field] ?? row[p.field];
    if (p.swap) p.to = base.replace(p.swap[0], p.swap[1]);
    const to = p.transform === 'capitaliseEnglish' ? capitaliseEnglish(base) : p.to;
    if (to === base) { report.noop.push(`${p.itemId}: ${p.field} already "${to}"`); continue; }
    e.set[p.field] = to; e.items.push(p.itemId); edits.set(id, e);
  }
  // a row both edited and removed: removal wins
  const removedIds = new Set(removals.map((r) => r.id));
  for (const id of removedIds) edits.delete(id);

  const legoIds = new Set();
  for (const [, e] of edits) for (const s of e.row.decomposition || []) if (s.legoId) legoIds.add(s.legoId);
  const { data: legos, error: le } = legoIds.size
    ? await sb.from('course_legos').select('lego_id,target_text').eq('course_code', course).in('lego_id', [...legoIds])
    : { data: [] };
  if (le) throw le;
  const legoTarget = new Map(legos.map((l) => [l.lego_id, l.target_text]));
  let englishGlossLoose = 0;
  for (const [id, e] of edits) {
    const { row } = e;
    for (const [field, key] of [['target_text', 'target'], ['known_text', 'known']]) {
      if (e.set[field] === undefined) continue;
      if (row.decomposition) {
        const m = mirrorEdit(e.set.decomposition || row.decomposition, key, row[field], e.set[field]);
        if (m.status === 'ok') e.set.decomposition = m.segments;
        else if (m.status !== 'none') {
          // Known-side glosses are per-LEGO and never tiled the English exactly (ghost segments, "to" doubled);
          // only the Welsh side is a strict tiling, so only a Welsh miss is worth a line.
          if (key === 'target') report.decompNote.push(`${id}: Welsh change NOT mirrored into decomposition (${m.status}) — needs a look`);
          else englishGlossLoose++;
        }
      }
      if (field === 'target_text' && e.set.decomposition) {
        e.set.decomposition.forEach((s, i) => {
          const was = row.decomposition[i];
          if (s.target === was.target || !s.legoId) return;
          const lt = legoTarget.get(s.legoId);
          if (lt !== undefined && s.target.trim() !== lt) report.decompNote.push(`${id}: segment "${s.target.trim()}" (LEGO ${s.legoId}, whose own Welsh is "${lt}") — segment now differs from its LEGO`);
        });
      }
      const audioCols = field === 'target_text' ? ['target1_audio_id', 'target2_audio_id', 'presentation_audio_id'] : ['known_audio_id'];
      const linked = audioCols.filter((c) => row[c]);
      if (linked.length) report.audio.push(`${id}: ${field} changed, audio kept but may no longer match (${linked.join(', ')})`);
    }
    for (const col of ['display_tiling', 'known_gloss_segments']) if (row[col]) report.decompNote.push(`${id}: has ${col} that was not regenerated`);
    report.set.push(`${id}: ${Object.keys(e.set).filter((k) => k !== 'decomposition').map((k) => `${k}: "${row[k]}" -> "${e.set[k]}"`).join(' | ')}`);
  }
  for (const r of removals) {
    const { count } = await sb.from(TABLE).select('id', { count: 'exact', head: true }).eq('course_code', course).eq('seed_number', r.seed_number).eq('lego_index', r.lego_index);
    report.remaining.push(`${r.id}: LEGO S${String(r.seed_number).padStart(4, '0')}L${String(r.lego_index).padStart(2, '0')} keeps ${count - 1} phrases after removal` + (count - 1 < 5 ? '  <-- TOO FEW?' : ''));
    for (const c of ['target1_audio_id', 'target2_audio_id', 'known_audio_id', 'presentation_audio_id']) if (r[c]) report.audio.push(`${r.id}: removed row had ${c} linked`);
  }

  if (englishGlossLoose) report.decompNote.push(`${englishGlossLoose} English edits: decomposition known-glosses never tiled the English exactly, left as they were`);
  const summary = `changed ${edits.size} rows (${plan.filter((p) => p.action === 'set').length} answers), removed ${removals.length}, left ${report.left.length}, no-op ${report.noop.length}, unapplied ${report.unapplied.length}`;
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${course}: ${summary}`);
  for (const [k, v] of Object.entries(report)) if (v.length && k !== 'left') console.log(`\n[${k}]\n  ${v.join('\n  ')}`);
  if (!apply) return console.log('\n(dry run: nothing written; add --apply)');

  // backup first: whole rows, edited and removed
  const tag = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const backup = `backup_${course}_review_${tag}`;
  const idList = [...edits.keys(), ...removedIds].map((i) => `'${i.replace(/'/g, "''")}'`).join(',');
  if (!idList) return console.log('nothing to write');
  psql(`create table ${backup} as select * from ${TABLE} where id in (${idList})`);
  const nBack = psql(`select count(*) from ${backup}`);
  if (Number(nBack) !== edits.size + removedIds.size) throw new Error(`backup has ${nBack} rows, expected ${edits.size + removedIds.size}`);
  console.log(`\nbackup table ${backup}: ${nBack} rows. Undo: node ${SURFACE.replace('tools/', 'tools/')} ${course} --undo ${backup} --apply`);

  const eventId = await recordContentEdit(sb, {
    identity, courseCode: course, surface: SURFACE, operation: 'update',
    scope: { phrase_ids: [...edits.keys(), ...removedIds] },
    detail: { backup, answers: path.basename(answersPath), changed: edits.size, removed: removals.length },
  });
  for (const [id, e] of edits) {
    const { error: ue } = await sb.from(TABLE).update({ ...e.set, last_edit_event_id: eventId }).eq('id', id).eq('course_code', course);
    if (ue) throw new Error(`update ${id}: ${ue.message}`);
  }
  if (removals.length) {
    const delEvent = await recordContentEdit(sb, {
      identity, courseCode: course, surface: SURFACE, operation: 'delete',
      scope: { phrase_ids: removals.map((r) => r.id) }, detail: { backup },
    });
    const { error: de } = await sb.from(TABLE).delete().in('id', removals.map((r) => r.id)).eq('course_code', course);
    if (de) throw new Error(`delete: ${de.message}`);
    void delEvent;
  }
  console.log('written.');
}

async function undo(sb, identity, course, backup, apply) {
  const rows = JSON.parse(psql(`select coalesce(json_agg(id),'[]') from ${backup}`));
  const n = rows.length;
  const gone = JSON.parse(psql(`select coalesce(json_agg(b.id),'[]') from ${backup} b left join ${TABLE} t on t.id=b.id where t.id is null`));
  console.log(`${apply ? 'UNDO' : 'UNDO DRY RUN'} ${course} from ${backup}: ${n} rows (${gone.length} to re-insert, ${n - gone.length} to restore)`);
  if (!apply) return;
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: course, surface: SURFACE, operation: 'update',
    scope: { phrase_ids: rows }, detail: { undo_of: backup },
  });
  void eventId;
  psql(`insert into ${TABLE} select * from ${backup} b where not exists (select 1 from ${TABLE} t where t.id=b.id)`);
  psql(`update ${TABLE} t set known_text=b.known_text, target_text=b.target_text, decomposition=b.decomposition, last_edit_event_id=b.last_edit_event_id, updated_at=b.updated_at from ${backup} b where t.id=b.id and t.course_code='${course}'`);
  console.log('restored.');
}

module.exports = { planAnswers, mirrorEdit, capitaliseEnglish, curly };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
