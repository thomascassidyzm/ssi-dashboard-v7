#!/usr/bin/env node
/**
 * edit-impact-check — the blast-radius check for a content edit.
 *
 * Kai, 2026-08-17: "seed text edits ... can affect the legos and the phrases and
 * all phrases that use something from the seed all over the course. And therefore
 * all of that audio (including the presentations of any affected legos). ... I think
 * this is a general problem. Any changes like these need to trigger a check of the
 * effects."
 *
 * HOW IT IS MEANT TO BE CALLED (Kai's ruling, 2026-08-17):
 *
 *   "it's probably better to just get the original agent to do that (or to launch
 *    one when they have a proposed change ready). The results might affect the
 *    original decision, so it's good to loop the original agent back in."
 *
 * So this is NOT a monitor and there is NO guardian process. The loop is:
 *
 *      agent has a change ready
 *          → agent runs this check itself, BEFORE applying
 *          → agent reads `decision` and decides
 *          → the result may change or cancel the original proposal
 *
 * The check answers one question — should this proposal go ahead as written? —
 * and, if it should, exactly what else must be done to leave the course whole.
 * `decision.verdict` is one of `proceed` / `proceed-with-repairs` / `reconsider`,
 * mirrored in the exit code (0 / 10 / 20; 2 means the tool itself failed).
 * It is advice to the proposing agent. It blocks nothing, by design.
 *
 * It is cheap enough to run inline — ~15s for one edit — so run it yourself
 * rather than dispatching a worker unless you have a large batch.
 *
 * This is the READ-ONLY half of that. It answers, for a proposed (or already
 * applied) edit to a seed / LEGO / phrase, in any course, by any route:
 *
 *   1. what the edited row is, and which DB trigger will fire on it
 *   2. what happens to that row's AUDIO LINKS — exactly, by asking the live
 *      `audio_id_for_text()` the triggers themselves call
 *   3. what happens to the LEGOs and phrases derived from it
 *   4. what happens course-wide: phrases that tile through a chunk this edit
 *      removes, and words taught late but used early
 *   5. the presentation/intro clips that go stale
 *   6. the doctrine flags — pod migration, make-before-break, cache invalidation
 *   7. a TTS re-render volume estimate (it NEVER renders)
 *
 * It writes NOTHING. The DB session is opened read-only at the transaction level,
 * so that is enforced by Postgres, not by good intentions.
 *
 * -------------------------------------------------------------------------
 * WHY THIS EXISTS ALONGSIDE edit-cascade.cjs
 *
 * `services/course-builder/routes/edit-cascade.cjs` already has a dryRun that
 * computes the Case 1 / Case 2 vocab discriminator and the downstream tiling
 * failures, and it does that WELL — this tool reuses the same idea and the same
 * validation library rather than reinventing it. But that dry run:
 *   - only accepts a TARGET-side seed edit, and REQUIRES a ready `legos`
 *     breakdown as input, which a worker doing a one-line text repair does not
 *     have (see `if (!Array.isArray(legos) || legos.length === 0)`);
 *   - has NO knowledge of course_audio at all — its `estimateAudio()` is a
 *     formula (`phrases*3 + legos`), not a query, so it cannot say which clip
 *     goes silent, which clip gets silently re-pointed, or to what voice;
 *   - is reachable only over HTTP from a running course-builder, which the
 *     direct-SQL edit path never touches.
 * This tool covers those, and is a CLI so the direct-SQL path is protected too.
 * -------------------------------------------------------------------------
 *
 * USAGE
 *
 *   # a proposed seed known-side repair (the eng_for_sin shape)
 *   node tools/edit-impact-check.cjs --course eng_for_sin --seed 181 \
 *        --known "ඒත් මට මගේ අම්මව දොස්තර ළඟට එක්කගෙන යන්න වෙනවා"
 *
 *   # a proposed target-side edit
 *   node tools/edit-impact-check.cjs --course cym_for_eng --seed 42 --target "..."
 *
 *   # a LEGO or a phrase
 *   node tools/edit-impact-check.cjs --course eng_for_sin --lego 181:2 --known "..."
 *   node tools/edit-impact-check.cjs --course eng_for_sin --phrase <uuid> --target "..."
 *
 *   # a batch, from a plan file: [{table,seed,lego_index,id,known,target}, ...]
 *   node tools/edit-impact-check.cjs --course eng_for_sin --plan my-edits.json
 *
 *   # the agent call pattern: pipe the pending proposal in, read the decision out
 *   echo "$MY_PROPOSED_EDITS" \
 *     | node tools/edit-impact-check.cjs --course eng_for_sin --plan - --json - --quiet \
 *     | jq -r '.decision.verdict, .decision.required_actions[]'
 *
 *   # or in-process, no CLI:
 *   #   const { checkEdits } = require('./tools/edit-impact-check.cjs')
 *   #   const r = await checkEdits('eng_for_sin', [{ seed: 181, known: '…' }])
 *
 *   # replay edits that ALREADY happened, from content_audit_log — this is how
 *   # you check the reporter against reality
 *   node tools/edit-impact-check.cjs --course eng_for_sin --replay-since 2026-08-17
 *
 *   --json <path>   also write the machine-readable report
 *   --quiet         suppress the human rendering
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '..');
const { isChinese } = require(path.join(REPO, 'services/course-builder/lib/language-config.cjs'));
const {
  extractVocab,
  normalizeForContainment,
  normalizeForStorage,
} = require(path.join(REPO, 'services/course-builder/lib/text-normalization.cjs'));
const { checkVocabViolations } = require(path.join(REPO, 'services/course-builder/lib/validation.cjs'));
// Pure constants + functions, no side effects on load — safe to require.
const { decodeVoiceId } = require(path.join(REPO, 'services/audio-repair-core.cjs'));

// The SAME voice is stored under more than one id: `si-LK-SameeraNeural` and
// `azure_si-LK-SameeraNeural` are one voice, as are a bare and an `xai_`-prefixed
// id. Comparing the raw strings manufactures a voice-change finding out of a
// tagging artefact — a `reconsider` verdict has to be worth the word, so decode
// both sides with the estate's own rule before calling it a change.
function sameVoice(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const x = decodeVoiceId(a), y = decodeVoiceId(b);
  return x.provider === y.provider && x.voiceId === y.voiceId;
}

// ── Tables we understand, and what the live schema does to each ───────────────
// The trigger facts are VERIFIED at runtime against pg_trigger (see loadTriggerFacts)
// rather than trusted from this table — a doc that asserts a trigger exists is
// exactly the kind of thing that rots.
const TABLES = {
  course_seeds: {
    audioCols: { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' },
    nullingTrigger: 'trg_null_seed_audio_on_text_change',   // expected ABSENT
  },
  course_legos: {
    audioCols: {
      known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id',
      presentation: 'presentation_audio_id',
    },
    nullingTrigger: 'trg_null_lego_audio_on_text_change',
  },
  course_practice_phrases: {
    audioCols: { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' },
    nullingTrigger: 'trg_null_phrase_audio_on_text_change',
  },
};

// ── CLI ───────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) { a[key] = true; }
    else { a[key] = next; i++; }
  }
  return a;
}

function usage(msg) {
  if (msg) console.error(`\n  ${msg}\n`);
  console.error(fs.readFileSync(__filename, 'utf8').split('\n')
    .slice(0, 80).filter(l => l.startsWith(' *')).map(l => l.slice(2)).join('\n'));
  process.exit(msg ? 2 : 0);
}

// ── DB ────────────────────────────────────────────────────────────────────────
function databaseUrl() {
  const envPath = path.join(REPO, '.env.psql');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.psql not found at the repo root — it is gitignored and provisioned per machine (docs/secrets-vault.md §Provisioning).');
  }
  const m = fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql has no DATABASE_URL');
  return m[1].trim();
}

async function connect() {
  const client = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  // Enforced read-only: any write in this session errors at the server.
  await client.query('SET default_transaction_read_only = on');
  await client.query("SET statement_timeout = '60s'");
  return client;
}

const q = async (c, sql, params = []) => (await c.query(sql, params)).rows;

// ── Live trigger facts (never trusted from a doc) ─────────────────────────────
async function loadTriggerFacts(c) {
  const rows = await q(c, `
    SELECT tgrelid::regclass::text AS tbl, tgname
      FROM pg_trigger
     WHERE tgrelid IN ('course_seeds'::regclass,'course_legos'::regclass,
                       'course_practice_phrases'::regclass,'course_audio'::regclass)
       AND NOT tgisinternal`);
  const byTable = {};
  for (const r of rows) (byTable[r.tbl] ||= []).push(r.tgname);
  return byTable;
}

// ── The exact prediction: ask the function the trigger itself calls ───────────
// null_{lego,phrase}_audio_on_text_change do:
//    NEW.<col> := audio_id_for_text(course, <new text>, '<role>')
// which is STABLE and side-effect-free, so calling it read-only tells us the
// post-edit value EXACTLY, including "no match => NULL => silent slot".
async function predictAudioId(c, courseCode, text, role) {
  const rows = await q(c, 'SELECT audio_id_for_text($1,$2,$3) AS id', [courseCode, text, role]);
  return rows[0]?.id || null;
}

async function clipDetail(c, id) {
  if (!id) return null;
  const rows = await q(c, `SELECT id, role, voice_id, language, origin, duration_ms,
                                  s3_key IS NOT NULL AS has_object, text, text_normalized, created_at
                             FROM course_audio WHERE id = $1`, [id]);
  return rows[0] || null;
}

// Would an INSERT of a NEW clip for this text collide with
// unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)?
async function collisionRisk(c, courseCode, text, role) {
  return q(c, `SELECT id, voice_id, language, lego_id, s3_key IS NOT NULL AS has_object, text
                 FROM course_audio
                WHERE course_code = $1 AND role = $2 AND text_normalized = normalize_text($3)
                ORDER BY created_at`, [courseCode, role, text]);
}

// ── Course snapshot (one read, reused by every edit in the batch) ─────────────
async function loadCourse(c, courseCode) {
  const [seeds, legos, phrases, course] = await Promise.all([
    q(c, `SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id,
                 target2_audio_id, decomposed_at
            FROM course_seeds WHERE course_code = $1 ORDER BY seed_number`, [courseCode]),
    q(c, `SELECT id, seed_number, lego_index, known_text, target_text, type, components, is_new,
                 known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
            FROM course_legos WHERE course_code = $1 ORDER BY seed_number, lego_index`, [courseCode]),
    q(c, `SELECT id, seed_number, lego_index, known_text, target_text, phrase_role,
                 known_audio_id, target1_audio_id, target2_audio_id
            FROM course_practice_phrases WHERE course_code = $1
           ORDER BY seed_number, lego_index, id`, [courseCode]),
    q(c, `SELECT course_code, content_stamp, audio_stamp, new_app_status, seed_count
            FROM courses WHERE course_code = $1`, [courseCode]),
  ]);
  if (!course.length) throw new Error(`Course ${courseCode} not found in \`courses\`.`);
  return { courseCode, chinese: isChinese(courseCode), seeds, legos, phrases, course: course[0] };
}

// ── Tiling blast radius — the Case 1 / Case 2 machinery, reused ───────────────
// Mirrors the accumulate/tile-then-add walk in v2.cjs POST /v2/validate so the
// verdict is the same verdict the builder's own gate would give.
function accumulate(seedLegos, vocab, chinese) {
  for (const l of seedLegos) {
    extractVocab(l.target_text, chinese).forEach(v => vocab.add(v));
    if (l.type === 'M' && l.components) {
      for (const comp of l.components) {
        if (comp?.target) extractVocab(comp.target, chinese).forEach(v => vocab.add(v));
      }
    }
  }
}

/**
 * Which phrases course-wide stop tiling if `removedUnits` leave the cumulative
 * vocabulary at `fromSeed`?  This is the honest answer to "all phrases that use
 * something from the seed all over the course."
 */
function tilingBlastRadius(snap, fromSeed, removedUnits) {
  if (!removedUnits.size) return { checked: 0, broken: [], note: 'No vocab unit removed — nothing can stop tiling.' };
  const bySeed = {};
  for (const l of snap.legos) (bySeed[l.seed_number] ||= []).push(l);

  const vocab = new Set();
  const broken = [];
  let checked = 0;

  for (const seed of snap.seeds) {
    const seedLegos = bySeed[seed.seed_number] || [];
    if (seed.seed_number >= fromSeed) {
      const withSeed = new Set(vocab);
      accumulate(seedLegos, withSeed, snap.chinese);
      for (const u of removedUnits) withSeed.delete(u);

      const seedPhrases = snap.phrases.filter(p => p.seed_number === seed.seed_number
        && (p.phrase_role === 'build' || p.phrase_role === 'use'));
      checked += seedPhrases.length;
      const violations = checkVocabViolations(
        seedPhrases.map(p => ({ target: p.target_text })), withSeed, snap.courseCode);
      const byText = new Map(violations.map(v => [v.phrase, v.unknown]));
      for (const p of seedPhrases) {
        if (byText.has(p.target_text)) {
          broken.push({
            phrase_id: p.id, seed: p.seed_number, lego_index: p.lego_index,
            role: p.phrase_role, target_text: p.target_text,
            untileable_from: byText.get(p.target_text),
          });
        }
      }
    }
    accumulate(seedLegos, vocab, snap.chinese);
  }
  return { checked, broken, note: 'Phrases re-tiled against the post-edit cumulative vocabulary (the builder\'s own DP chunk-tiler).' };
}

// ── Gap 4: taught-late / used-early, on whichever side was edited ─────────────
// `හැබැයි` is taught as a LEGO at seed 469 but used by seeds 165…464. An impact
// check that only looks at the edited seed's own children never sees that.
// Languages written without spaces between words. Splitting these on ' ' yields
// ONE token — the whole sentence — which can never match a LEGO, so every CJK
// known side came back "the course teaches it at no point at all" and inherited a
// false `reconsider`. Measured on eng_for_jpn S0267L01U04: the proposed prompt
// 今週あなたの息子から連絡がありましたか？ is built entirely from 今週 (taught S63),
// 息子 (S197) and the seed's own 連絡がありましたか, and was still reported untaught.
// This is the same fault A135 fixed in the known-side gate's tokenizer; that fix
// is on its own branch and has not reached main, and this tool carries a second,
// independent copy of it in `words()`.
const SPACELESS = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-๿຀-໿ក-៿က-႟]/;

function words(text) {
  const norm = normalizeForContainment(text || '');
  if (!norm) return [];
  // English tokenizes byte-for-byte as it always did — the space split is proven
  // against real English prompts and must not move.
  if (!SPACELESS.test(norm)) return norm.split(' ').filter(Boolean);
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    // No segmenter: fall back to the space split rather than invent boundaries.
    // Reports stay as blind as before, but nothing is fabricated.
    return norm.split(' ').filter(Boolean);
  }
  const seg = new Intl.Segmenter(undefined, { granularity: 'word' });
  const out = [];
  for (const part of norm.split(' ')) {
    if (!part) continue;
    for (const { segment, isWordLike } of seg.segment(part)) {
      if (isWordLike && segment.trim()) out.push(segment);
    }
  }
  return out;
}

function orderingCheck(snap, side, addedForms, editedSeed) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const form of addedForms) {
    // Where is this form first TAUGHT (a LEGO whose text is/contains it)?
    let taughtAt = null;
    for (const l of snap.legos) {
      if (words(l[col]).includes(form)) { taughtAt = l.seed_number; break; }
    }
    // Where is it USED — earliest seed, phrase or seed text?
    const uses = [];
    for (const s of snap.seeds) if (words(s[col]).includes(form)) uses.push({ kind: 'seed', seed: s.seed_number });
    for (const p of snap.phrases) if (words(p[col]).includes(form)) uses.push({ kind: 'phrase', seed: p.seed_number, id: p.id });
    uses.sort((a, b) => a.seed - b.seed);
    const earliestUse = uses.length ? uses[0].seed : null;
    out.push({
      form,
      taught_at_seed: taughtAt,
      first_used_at_seed: earliestUse,
      total_uses: uses.length,
      uses_before_taught: taughtAt == null ? uses.length : uses.filter(u => u.seed < taughtAt).length,
      earlier_use_seeds: taughtAt == null ? uses.slice(0, 12).map(u => u.seed)
        : uses.filter(u => u.seed < taughtAt).slice(0, 12).map(u => u.seed),
      introduced_by_this_edit_at_seed: editedSeed,
      // THE ONE THAT SHOULD CHANGE THE PROPOSAL: this edit puts the form at seed
      // `editedSeed`, but the course does not teach it until later — or ever. That
      // is the methodology rail directly ("never use words the learner hasn't been
      // given yet"), caused by THIS edit rather than inherited from the course.
      untaught_at_this_position: editedSeed != null
        && (taughtAt == null || taughtAt > editedSeed),
    });
  }
  return out.filter(r => r.uses_before_taught > 0 || r.taught_at_seed == null || r.untaught_at_this_position);
}

// ── Presentations: clips that embed the edited text ───────────────────────────
// The presentation template is course/language specific (it is built at render
// time, not stored as a formula), so we do NOT try to author the replacement
// text. We find every presentation clip whose text EMBEDS the old text — those
// are the intros that now say the wrong thing — and report them for recomposition.
async function presentationImpact(c, courseCode, oldTexts) {
  const hits = [];
  for (const t of oldTexts) {
    const trimmed = (t || '').trim().replace(/[.?!]+$/, '');
    if (trimmed.length < 3) continue;
    const rows = await q(c, `SELECT id, lego_id, voice_id, text, s3_key IS NOT NULL AS has_object
                               FROM course_audio
                              WHERE course_code = $1 AND role = 'presentation'
                                AND text LIKE '%' || $2 || '%'
                              ORDER BY lego_id NULLS LAST LIMIT 200`, [courseCode, trimmed]);
    for (const r of rows) hits.push({ ...r, embeds: trimmed });
  }
  // de-dup by clip id
  const seen = new Set();
  return hits.filter(h => (seen.has(h.id) ? false : (seen.add(h.id), true)));
}

// ── Doctrine flags ────────────────────────────────────────────────────────────
async function doctrineFlags(c, snap, edit, audioFindings) {
  const flags = [];

  // Pod content → the standing content-change migration protocol (plate A-111).
  const pods = await q(c, `SELECT p.pod_id, count(*) AS sentences
                             FROM listening_pod_sentences p
                            WHERE p.pod_id LIKE $1 || ':%' GROUP BY 1`, [snap.courseCode])
    .catch(() => []);
  if (pods.length) {
    flags.push({
      flag: 'pod-content-migration',
      severity: 'check',
      detail: `${snap.courseCode} has ${pods.length} pod(s). If this edit touches text that a pod sentence carries, learner progress MUST be migrated — progress is filed under a slot, not the text, so an in-place edit silently credits a learner with a sentence they never heard.`,
      doctrine: 'docs/pods/pod-migration-protocol.md (adopted 2026-08-16, plate A-111)',
    });
  }

  // Make-before-break: any clip this edit orphans or re-points.
  const willChange = audioFindings.filter(f => f.verdict !== 'unchanged');
  if (willChange.length) {
    flags.push({
      flag: 'make-before-break',
      severity: 'required',
      detail: `${willChange.length} audio link(s) change. Generate and VERIFY the replacement clip before the old one is touched — never the other way round. Deletion never precedes a verified replacement.`,
      doctrine: 'docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b',
    });
  }

  // Cache invalidation. Every one of these three tables carries a
  // touch_course_content_stamp trigger (verified live), so any text edit bumps
  // courses.content_stamp and invalidates the learner script cache.
  flags.push({
    flag: 'learner-cache-invalidated',
    severity: 'info',
    detail: `${edit.table} carries touch_course_content_stamp, so this edit bumps courses.content_stamp (currently ${snap.course.content_stamp}). Learner script caches for ${snap.courseCode} invalidate on the next read.`,
  });

  // Is anyone actually reading this course?
  flags.push({
    flag: 'learner-reach',
    severity: 'info',
    detail: `courses.new_app_status = ${JSON.stringify(snap.course.new_app_status)}. ` +
      (snap.course.new_app_status === 'not_available'
        ? 'Nothing applied here reaches a learner today.'
        : 'This course is reachable by learners — the blast radius is live.'),
  });

  return flags;
}

// ── The check, for one edit ───────────────────────────────────────────────────
async function checkEdit(c, snap, triggers, edit) {
  const spec = TABLES[edit.table];
  const report = {
    edit: {
      course_code: snap.courseCode, table: edit.table, key: edit.key,
      seed_number: edit.seed_number ?? null,
      changes: {},
      source: edit.source || 'proposed',
    },
    trigger: {}, audio: [], derived: {}, course_wide: {}, presentations: [],
    tts_estimate: {}, doctrine: [], verdicts: [],
  };

  const sides = [];
  if (edit.known != null && edit.known !== edit.row.known_text) {
    report.edit.changes.known_text = { from: edit.row.known_text, to: edit.known };
    sides.push('known');
  }
  if (edit.target != null && edit.target !== edit.row.target_text) {
    report.edit.changes.target_text = { from: edit.row.target_text, to: edit.target };
    sides.push('target');
  }
  if (!sides.length) {
    report.verdicts.push({ level: 'ok', message: 'No text change — nothing to check.' });
    return report;
  }

  const newKnown = edit.known != null ? edit.known : edit.row.known_text;
  const newTarget = edit.target != null ? edit.target : edit.row.target_text;

  // ── 1. Trigger, verified live ───────────────────────────────────────────────
  const live = triggers[edit.table] || [];
  const hasNulling = live.includes(spec.nullingTrigger);
  report.trigger = {
    table: edit.table,
    live_triggers: live,
    relink_trigger: hasNulling ? spec.nullingTrigger : null,
    behaviour: hasNulling
      ? `${spec.nullingTrigger} fires BEFORE UPDATE and REPLACES the audio link with audio_id_for_text(course, <new text>, role) — which is NULL when nothing matches (silent slot) and an EXISTING clip when something does (silent re-point, possibly to another voice).`
      : `NO nulling/relink trigger on ${edit.table}. The audio link is left EXACTLY AS IT WAS, still pointing at the clip for the OLD text. No NULL, no orphan, no alarm — a missing-audio sweep cannot see it and audio_autolink cannot rescue it (it only fills links that are already NULL).`,
  };
  if (!hasNulling) {
    report.verdicts.push({
      level: 'danger',
      message: `SILENT STALE AUDIO: ${edit.table} has no audio-nulling trigger. After this edit the learner keeps hearing the OLD text with nothing to signal it. You must repoint the link by hand, or generate the new clip and NULL the link first so audio_autolink can bind it.`,
    });
  }

  // ── 2. Audio links, predicted exactly ───────────────────────────────────────
  for (const [role, col] of Object.entries(spec.audioCols)) {
    const currentId = edit.row[col] || null;
    const textForRole = role === 'known' ? newKnown : newTarget;
    const oldTextForRole = role === 'known' ? edit.row.known_text : edit.row.target_text;
    const sideChanged = role === 'known' ? sides.includes('known') : sides.includes('target');
    // The lego trigger invalidates presentation on EITHER side changing.
    const affected = role === 'presentation' ? sides.length > 0 : sideChanged;
    if (!affected) continue;

    const current = await clipDetail(c, currentId);
    let predictedId = currentId;
    let verdict;

    if (hasNulling) {
      predictedId = await predictAudioId(c, snap.courseCode, textForRole, role);
      if (!predictedId) verdict = 'nulled-silent';
      else if (predictedId === currentId) verdict = 'unchanged';
      else verdict = 'relinked';
    } else {
      verdict = currentId ? 'left-stale' : 'unchanged';
    }
    const predicted = predictedId === currentId ? current : await clipDetail(c, predictedId);

    // With no trigger, the link does not move — but the clip it SHOULD point at
    // may already exist. Naming it turns the warning into a one-line repair.
    let repair = null;
    if (verdict === 'left-stale') {
      const correctId = await predictAudioId(c, snap.courseCode, textForRole, role);
      repair = correctId
        ? { correct_audio_id: correctId, clip: await clipDetail(c, correctId),
            action: `UPDATE ${edit.table} SET ${col} = '${correctId}' — the clip for the NEW text already exists; repoint the link by hand, the trigger will not.` }
        : { correct_audio_id: null,
            action: `No clip exists for the new text yet. NULL ${col} so audio_autolink binds the new clip when it is rendered, then queue an audio pass (tools/course-optimization/queue-audio-pass.cjs).` };
    }

    const finding = {
      column: col, role, verdict,
      current_audio_id: currentId,
      current_clip: current && {
        voice_id: current.voice_id, language: current.language, origin: current.origin,
        has_object: current.has_object, text: current.text,
      },
      predicted_audio_id: predictedId,
      predicted_clip: predicted && {
        voice_id: predicted.voice_id, language: predicted.language, origin: predicted.origin,
        has_object: predicted.has_object, text: predicted.text,
      },
      voice_change: !!(current && predicted && !sameVoice(current.voice_id, predicted.voice_id)),
      needs_tts: verdict === 'nulled-silent' || (verdict === 'left-stale' && !repair?.correct_audio_id),
      repair,
    };

    // Would minting the replacement clip collide with the unique constraint?
    const existing = await collisionRisk(c, snap.courseCode, textForRole, role);
    if (existing.length) {
      finding.unique_constraint = {
        constraint: 'unique_course_audio_per_voice (course_code, text_normalized, language, role, voice_id)',
        existing_clips: existing.map(e => ({ id: e.id, voice_id: e.voice_id, language: e.language, lego_id: e.lego_id, has_object: e.has_object })),
        note: 'An INSERT of a new clip for this text in one of these voices WILL be rejected. Bind the existing clip instead of minting one.',
      };
    }

    if (finding.verdict === 'relinked') {
      report.verdicts.push({
        level: finding.voice_change ? 'danger' : 'warn',
        message: `SILENT RE-POINT (${col}): the trigger will bind this row to an existing clip ${predictedId}` +
          (finding.voice_change ? ` IN A DIFFERENT VOICE (${current?.voice_id} → ${predicted?.voice_id}).` : '.') +
          ' Matching is on text_normalized, which strips trailing ? . ! — a retired-voice clip can win the slot.',
      });
    }
    if (finding.verdict === 'nulled-silent') {
      report.verdicts.push({
        level: 'warn',
        message: `SILENT SLOT (${col}): no existing clip matches the new text, so the trigger sets this to NULL. The slot is silent until Generate Missing Audio runs.`,
      });
    }
    if (finding.verdict === 'left-stale') {
      report.verdicts.push({
        level: 'danger',
        message: `STALE LINK (${col}): still points at ${currentId}, which speaks "${(current?.text || '').slice(0, 60)}" — the OLD text. ${repair.action}`,
      });
    }
    report.audio.push(finding);
    void oldTextForRole;
  }

  // ── 3. Derived rows ─────────────────────────────────────────────────────────
  if (edit.table === 'course_seeds') {
    const legos = snap.legos.filter(l => l.seed_number === edit.seed_number);
    const phrases = snap.phrases.filter(p => p.seed_number === edit.seed_number);
    // Case 1 / Case 2 — the same discriminator edit-cascade.cjs uses.
    const oldUnits = new Set(); accumulate(legos, oldUnits, snap.chinese);
    const stillCovered = sides.includes('target')
      ? checkVocabViolations([{ target: newTarget }], oldUnits, snap.courseCode).length === 0
      : true;
    report.derived = {
      legos: legos.length,
      phrases: phrases.length,
      lego_rows: legos.map(l => ({ seed: l.seed_number, idx: l.lego_index, known: l.known_text, target: l.target_text, type: l.type })),
      edit_case: sides.includes('target')
        ? (stillCovered ? 'vocab-preserving (Case 1) — the new target still tiles from this seed\'s existing LEGOs'
                        : 'vocab-changing (Case 2) — the new target does NOT tile from this seed\'s existing LEGOs; a re-decomposition is required')
        : 'known-side edit — the target-side chunk set is untouched, so tiling downstream is unaffected. The blast radius is ZUT, the known-side gate, and audio.',
      note: sides.includes('target') && !stillCovered
        ? 'Re-decompose this seed (POST /api/course/:code/edit-cascade with the new legos, or /v2/decompose) — the LEGOs below no longer cover the seed text.'
        : null,
    };
    if (sides.includes('target') && !stillCovered) {
      report.verdicts.push({ level: 'warn', message: `RE-DECOMPOSITION NEEDED: seed ${edit.seed_number}'s ${legos.length} LEGO(s) no longer tile its new target text.` });
    }
  } else if (edit.table === 'course_legos') {
    const sibs = snap.phrases.filter(p => p.seed_number === edit.row.seed_number && p.lego_index === edit.row.lego_index);
    // Containment: do this LEGO's own phrases still contain it?
    const legoNorm = normalizeForContainment(newTarget);
    const fails = sibs.filter(p => (p.phrase_role === 'build' || p.phrase_role === 'use')
      && !normalizeForContainment(p.target_text).includes(legoNorm));
    report.derived = {
      phrases: sibs.length,
      containment_failures: fails.map(p => ({ id: p.id, role: p.phrase_role, target_text: p.target_text })),
      note: 'A LEGO is the teaching unit; its own build/use phrases must still contain its target text.',
    };
    if (fails.length) {
      report.verdicts.push({ level: 'danger', message: `CONTAINMENT BROKEN: ${fails.length} of this LEGO's own phrase(s) no longer contain its new target text.` });
    }
  } else {
    report.derived = { note: 'A phrase has no derived rows; its blast radius is its own audio plus the course-wide checks below.' };
  }

  // ── 4. Course-wide ──────────────────────────────────────────────────────────
  const fromSeed = edit.seed_number ?? 0;

  // 4a. Tiling — only a target-side change can remove a chunk.
  let removedUnits = new Set();
  if (sides.includes('target') && edit.table === 'course_legos') {
    const oldU = new Set(extractVocab(edit.row.target_text, snap.chinese));
    const newU = new Set(extractVocab(newTarget, snap.chinese));
    removedUnits = new Set([...oldU].filter(u => !newU.has(u)));
  }
  report.course_wide.tiling = tilingBlastRadius(snap, fromSeed, removedUnits);
  report.course_wide.tiling.removed_vocab_units = [...removedUnits];
  if (report.course_wide.tiling.broken.length) {
    report.verdicts.push({
      level: 'danger',
      message: `COURSE-WIDE BREAKAGE: ${report.course_wide.tiling.broken.length} phrase(s) elsewhere in the course tile through a chunk this edit removes and will no longer validate.`,
    });
  }

  // 4b. Taught-late / used-early, on each edited side (Gap 4).
  report.course_wide.ordering = [];
  for (const side of sides) {
    const oldW = new Set(words(side === 'known' ? edit.row.known_text : edit.row.target_text));
    const newW = words(side === 'known' ? newKnown : newTarget);
    const added = [...new Set(newW.filter(w => !oldW.has(w)))];
    const rows = orderingCheck(snap, side, added, edit.seed_number ?? null);
    for (const r of rows) report.course_wide.ordering.push({ side, ...r });
  }
  if (report.course_wide.ordering.length) {
    report.verdicts.push({
      level: 'warn',
      message: `TAUGHT LATE, USED EARLY: this edit introduces ${report.course_wide.ordering.length} word-form(s) that the course uses before (or without ever) teaching them. This is the shape that generalises past the edited row.`,
    });
  }

  // 4c. Every other row that carries the OLD text verbatim — the "all over the
  //     course" that a per-row check misses.
  report.course_wide.same_text_elsewhere = [];
  for (const side of sides) {
    const col = side === 'known' ? 'known_text' : 'target_text';
    const oldText = edit.row[col];
    const norm = normalizeForStorage(oldText || '', snap.chinese);
    if (!norm) continue;
    const same = [
      ...snap.seeds.filter(s => normalizeForStorage(s[col] || '', snap.chinese) === norm)
        .map(s => ({ table: 'course_seeds', seed: s.seed_number })),
      ...snap.legos.filter(l => normalizeForStorage(l[col] || '', snap.chinese) === norm)
        .map(l => ({ table: 'course_legos', seed: l.seed_number, lego_index: l.lego_index })),
      ...snap.phrases.filter(p => normalizeForStorage(p[col] || '', snap.chinese) === norm)
        .map(p => ({ table: 'course_practice_phrases', seed: p.seed_number, id: p.id })),
    // Exclude the row being edited — and ONLY that row. `edit.key` is a DISPLAY
    // label ("phrase eng_for_jpn:S0267L01U04"), never an identity, so comparing
    // it to r.id could not match: every phrase edit reported ITSELF as "1 other
    // row carrying the identical old text" and inherited a false `reconsider`.
    // The seed/lego side had the mirror fault — with r.id undefined the guard
    // collapsed to table+seed and swallowed genuine same-text siblings sharing
    // that seed. Match on the row's own identity instead.
    ].filter(r => !(r.table === edit.table
                    && String(r.seed) === String(edit.seed_number)
                    && (r.id != null || edit.row_id != null
                          ? r.id === edit.row_id
                          : r.lego_index === undefined || r.lego_index === edit.lego_index)));
    if (same.length) report.course_wide.same_text_elsewhere.push({ side, old_text: oldText, rows: same });
  }
  if (report.course_wide.same_text_elsewhere.length) {
    const n = report.course_wide.same_text_elsewhere.reduce((a, r) => a + r.rows.length, 0);
    report.verdicts.push({
      level: 'warn',
      message: `SAME TEXT ELSEWHERE: ${n} other row(s) in this course carry the identical old text. Editing one and not the others leaves the course inconsistent — and they share the same clip.`,
    });
  }

  // ── 5. Presentations ────────────────────────────────────────────────────────
  // A presentation clip embeds BOTH sides ("The <lang> for — '<known>' — is: '<target>'"),
  // and in a course whose narration language is the known side it may quote neither
  // verbatim. So we search on both old texts whichever side changed, AND we always
  // include the edited row's own currently-linked intro clip.
  const oldTexts = [edit.row.known_text, edit.row.target_text];
  report.presentations = await presentationImpact(c, snap.courseCode, oldTexts);
  const ownPres = report.audio.find(x => x.role === 'presentation' && x.verdict !== 'unchanged');
  if (ownPres?.current_audio_id && !report.presentations.some(p => p.id === ownPres.current_audio_id)) {
    const clip = await clipDetail(c, ownPres.current_audio_id);
    if (clip) report.presentations.unshift({ id: clip.id, lego_id: null, voice_id: clip.voice_id, text: clip.text, has_object: clip.has_object, embeds: '(this row\'s own intro clip)' });
  }
  if (report.presentations.length) {
    report.verdicts.push({
      level: 'danger',
      message: `PRESENTATIONS STALE: ${report.presentations.length} intro clip(s) embed the OLD text and will keep speaking it. Presentations are per-LEGO and must be re-composed; the presentation text is built at render time, so this tool reports the clips, not the replacement wording.`,
    });
  }

  // ── 6. TTS volume (estimated, NEVER rendered) ───────────────────────────────
  // Presentation clips are counted once, in the presentations list — not twice.
  const needTts = report.audio.filter(a => a.needs_tts && a.role !== 'presentation').length;
  report.tts_estimate = {
    clips_needing_render: needTts + report.presentations.length,
    breakdown: { row_clips: needTts, presentation_clips: report.presentations.length },
    note: 'ESTIMATE ONLY. This tool never renders. Content passes end by QUEUEING an audio pass (tools/course-optimization/queue-audio-pass.cjs), never by running TTS.',
  };

  // ── 7. Doctrine ─────────────────────────────────────────────────────────────
  report.doctrine = await doctrineFlags(c, snap, edit, report.audio);

  if (!report.verdicts.length) report.verdicts.push({ level: 'ok', message: 'No blast radius detected beyond the edited row.' });

  // ── 8. The decision — what the PROPOSING agent should do with this ──────────
  report.decision = decide(report, edit);
  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE DECISION BLOCK
//
// Kai's ruling, 2026-08-17: "it's probably better to just get the original agent
// to do that (or to launch one when they have a proposed change ready). The
// results might affect the original decision, so it's good to loop the original
// agent back in."
//
// So this is not a monitor and there is no guardian. The proposing agent runs the
// check BEFORE applying, and reads this block to decide. It answers one question —
// should this proposal go ahead as written? — and, if it should, exactly what else
// the agent has to do to leave the course whole.
//
//   proceed              nothing beyond the edited row
//   proceed-with-repairs safe to apply, but ONLY if required_actions are carried out
//   reconsider           the edit as written damages work beyond itself; revise it,
//                        narrow it, or accept the listed cost deliberately
//
// `reconsider` is advice to the proposing agent, never a refusal — this tool cannot
// block anything, by design.
// ─────────────────────────────────────────────────────────────────────────────
function decide(report, edit) {
  const reasons = [];
  const actions = [];
  let level = 'proceed';
  const raise = (l) => {
    const rank = { proceed: 0, 'proceed-with-repairs': 1, reconsider: 2 };
    if (rank[l] > rank[level]) level = l;
  };

  // ── Things that should change the proposal ─────────────────────────────────
  const broken = report.course_wide.tiling.broken;
  if (broken.length) {
    raise('reconsider');
    const seeds = [...new Set(broken.map(b => b.seed))];
    reasons.push({
      code: 'course-wide-breakage',
      detail: `${broken.length} phrase(s) across ${seeds.length} seed(s) stop tiling once this edit removes ${report.course_wide.tiling.removed_vocab_units.map(u => JSON.stringify(u)).join(', ')}. Those phrases are other people's finished work.`,
    });
    actions.push(`Either keep the removed chunk(s) in the new text, or accept re-authoring ${broken.length} phrase(s) (seeds ${seeds.slice(0, 10).join(', ')}${seeds.length > 10 ? `, +${seeds.length - 10} more` : ''}).`);
  }

  const contain = report.derived.containment_failures || [];
  if (contain.length) {
    raise('reconsider');
    reasons.push({ code: 'containment-broken', detail: `${contain.length} of this LEGO's own build/use phrases no longer contain its target text, so the LEGO stops being what those phrases teach.` });
    actions.push(`Re-author ${contain.length} phrase(s) for this LEGO, or choose a new text those phrases still contain.`);
  }

  if (/Case 2/.test(report.derived.edit_case || '')) {
    raise('reconsider');
    reasons.push({ code: 're-decomposition-required', detail: 'The new seed target does not tile from this seed\'s existing LEGOs, so the breakdown must be rebuilt — this is not a text-only edit.' });
    actions.push('Produce a new LEGO breakdown and apply it through POST /api/course/:code/edit-cascade (which snapshots and rolls back on a bad breakdown) rather than by direct UPDATE.');
  }

  const untaught = (report.course_wide.ordering || []).filter(o => o.untaught_at_this_position);
  if (untaught.length) {
    raise('reconsider');
    reasons.push({
      code: 'uses-untaught-vocabulary',
      detail: `This edit places ${untaught.map(o => JSON.stringify(o.form)).join(', ')} at seed ${edit.seed_number}, but the course teaches ${untaught.length > 1 ? 'them' : 'it'} at ${untaught.map(o => o.taught_at_seed == null ? 'no point at all' : `seed ${o.taught_at_seed}`).join(', ')}. The methodology rail is that the learner is never given a word they haven't been taught.`,
      caveat: 'Matching is on exact word-forms with NO stemming, exactly like the known-side gate. In an inflecting language a flagged form may be a case/tense variant of a word that IS taught — which a gate could not tell apart, and you can. Judge it; do not assume it.',
    });
    actions.push('Use vocabulary already introduced by this point, or move the introduction earlier — deliberately, as a separate decision.');
  }

  const voiceSwaps = report.audio.filter(a => a.verdict === 'relinked' && a.voice_change);
  if (voiceSwaps.length) {
    raise('reconsider');
    reasons.push({ code: 'silent-voice-change', detail: `${voiceSwaps.length} link(s) would silently bind to a clip in a DIFFERENT voice (${voiceSwaps.map(a => `${a.current_clip?.voice_id} → ${a.predicted_clip?.voice_id}`).join('; ')}). Nothing reports this and the learner hears the swap.` });
    actions.push('Decide the voice deliberately: bind the correct clip explicitly after the edit, or render a replacement in the intended voice (make-before-break).');
  }

  // ── Things that are safe to apply, provided you then do the work ───────────
  for (const a of report.audio) {
    if (a.verdict === 'left-stale') {
      raise('proceed-with-repairs');
      reasons.push({ code: 'stale-link', detail: `${a.column} will be left pointing at the OLD text with no trigger and no alarm.` });
      actions.push(a.repair.action);
    } else if (a.verdict === 'nulled-silent') {
      raise('proceed-with-repairs');
      reasons.push({ code: 'silent-slot', detail: `${a.column} becomes NULL — a silent slot until new audio is rendered.` });
      actions.push(`Queue an audio pass so ${a.column} is refilled: node tools/course-optimization/queue-audio-pass.cjs ${report.edit.course_code} --reason "<pass>". Do NOT run TTS directly.`);
    } else if (a.verdict === 'relinked') {
      raise('proceed-with-repairs');
      reasons.push({ code: 'silent-relink', detail: `${a.column} rebinds to existing clip ${a.predicted_audio_id} (same voice). Verify it says what you intend — matching strips trailing punctuation.` });
      actions.push(`Listen to / verify clip ${a.predicted_audio_id} before trusting the rebind.`);
    }
    if (a.unique_constraint) {
      raise('proceed-with-repairs');
      actions.push(`Do NOT INSERT a new clip for ${a.column}: unique_course_audio_per_voice will reject it. Bind existing clip ${a.unique_constraint.existing_clips[0].id} instead.`);
    }
  }

  if (report.presentations.length) {
    raise('proceed-with-repairs');
    reasons.push({ code: 'stale-presentations', detail: `${report.presentations.length} intro clip(s) embed the old text and will keep speaking it.` });
    actions.push(`Re-compose ${report.presentations.length} presentation clip(s) (POST /regenerate-presentations, which self-scopes to missing), then queue the audio pass.`);
  }

  const sameText = report.course_wide.same_text_elsewhere;
  if (sameText.length) {
    raise('proceed-with-repairs');
    const n = sameText.reduce((a, r) => a + r.rows.length, 0);
    reasons.push({ code: 'same-text-elsewhere', detail: `${n} other row(s) carry the identical old text and share its clip. Editing one leaves the course inconsistent.` });
    actions.push(`Decide explicitly whether the other ${n} row(s) should change too — include them in this proposal, or say why not.`);
  }

  if (report.doctrine.some(d => d.flag === 'pod-content-migration')) {
    raise('proceed-with-repairs');
    actions.push('If this text appears in a pod, migrate learner progress FIRST — docs/pods/pod-migration-protocol.md. Never edit a live pod in place.');
  }

  if (report.tts_estimate.clips_needing_render > 0) {
    actions.push(`≈${report.tts_estimate.clips_needing_render} clip(s) will need rendering. TTS costs money — show a plan and get approval; end the pass by QUEUEING, never by running TTS.`);
  }

  return {
    verdict: level,
    headline: level === 'proceed'
      ? 'Apply as proposed — nothing beyond the edited row is affected.'
      : level === 'proceed-with-repairs'
        ? `Safe to apply, but it is not finished when the text lands — ${actions.length} follow-up action(s) are required to leave the course whole.`
        : 'Reconsider this edit as written: it damages work beyond itself. Revise it, narrow it, or accept the listed cost as a deliberate decision.',
    reasons,
    required_actions: [...new Set(actions)],
    note: 'Advice to the proposing agent. This tool cannot and does not block anything.',
  };
}

// ── Edit sources ──────────────────────────────────────────────────────────────
async function resolveRow(c, courseCode, edit) {
  if (edit.table === 'course_seeds') {
    const r = await q(c, `SELECT * FROM course_seeds WHERE course_code=$1 AND seed_number=$2`, [courseCode, edit.seed_number]);
    if (!r.length) throw new Error(`seed ${edit.seed_number} not found in ${courseCode}`);
    return { row: r[0], key: `seed ${edit.seed_number}`, row_id: null };
  }
  if (edit.table === 'course_legos') {
    const r = await q(c, `SELECT * FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3`,
      [courseCode, edit.seed_number, edit.lego_index]);
    if (!r.length) throw new Error(`lego ${edit.seed_number}:${edit.lego_index} not found in ${courseCode}`);
    return { row: r[0], key: `lego ${edit.seed_number}:${edit.lego_index}`, row_id: null };
  }
  const r = await q(c, `SELECT * FROM course_practice_phrases WHERE id=$1`, [edit.id]);
  if (!r.length) throw new Error(`phrase ${edit.id} not found`);
  return { row: r[0], key: `phrase ${edit.id}`, row_id: r[0].id };
}

// Replay: reconstruct already-applied edits from content_audit_log, whose old_row
// keeps the WHOLE previous row. The "new" text is the row's value today, so this
// asks: what SHOULD the check have said before that edit was applied?
async function replayEdits(c, courseCode, since) {
  const rows = await q(c, `
    SELECT id, table_name, changed_at, old_row
      FROM content_audit_log
     WHERE changed_at >= $1 AND change_type = 'UPDATE'
       AND table_name IN ('course_seeds','course_legos','course_practice_phrases')
       AND old_row->>'course_code' = $2
     ORDER BY changed_at, id`, [since, courseCode]);
  const edits = [];
  for (const r of rows) {
    const o = r.old_row;
    const base = { table: r.table_name, source: `audit#${r.id} @ ${r.changed_at.toISOString()}` };
    if (r.table_name === 'course_seeds') Object.assign(base, { seed_number: Number(o.seed_number) });
    else if (r.table_name === 'course_legos') Object.assign(base, { seed_number: Number(o.seed_number), lego_index: Number(o.lego_index) });
    else Object.assign(base, { id: o.id, seed_number: Number(o.seed_number) });
    // Current value = what the edit changed it TO.
    let cur;
    try { cur = await resolveRow(c, courseCode, base); } catch { continue; }
    if (cur.row.known_text === o.known_text && cur.row.target_text === o.target_text) continue; // not a text edit
    edits.push({
      ...base,
      known: cur.row.known_text, target: cur.row.target_text,
      // The row AS IT WAS — so the prediction is made against the pre-edit state.
      row: o, key: cur.key,
      seed_number: base.seed_number,
    });
  }
  return edits;
}

// ── Human rendering ───────────────────────────────────────────────────────────
const ICON = { ok: '  ok ', warn: ' WARN', danger: 'DANGER', check: 'CHECK', required: ' REQD', info: ' info' };

function render(rep) {
  const L = [];
  const e = rep.edit;
  L.push('');
  L.push('═'.repeat(78));
  L.push(`  ${e.course_code}  ·  ${e.table}  ·  ${e.key}${e.source !== 'proposed' ? `  [${e.source}]` : '  [proposed]'}`);
  L.push('═'.repeat(78));
  for (const [col, ch] of Object.entries(e.changes)) {
    L.push(`  ${col}:`);
    L.push(`      was  ${JSON.stringify(ch.from)}`);
    L.push(`      now  ${JSON.stringify(ch.to)}`);
  }

  // The decision goes FIRST — it is what the proposing agent came for.
  const d = rep.decision;
  if (d) {
    L.push('');
    L.push('┌─ DECISION ' + '─'.repeat(65));
    L.push(`│  ${d.verdict.toUpperCase()}`);
    L.push(`│  ${d.headline}`);
    if (d.reasons.length) {
      L.push('│');
      L.push('│  because:');
      for (const r of d.reasons) {
        L.push(`│    · ${r.detail}`);
        if (r.caveat) L.push(`│      (${r.caveat})`);
      }
    }
    if (d.required_actions.length) {
      L.push('│');
      L.push('│  before this edit is finished, you must:');
      d.required_actions.forEach((x, i) => L.push(`│    ${i + 1}. ${x}`));
    }
    L.push('└' + '─'.repeat(76));
  }

  L.push('');
  L.push('── VERDICT ' + '─'.repeat(66));
  for (const v of rep.verdicts) L.push(`  [${ICON[v.level] || v.level}] ${v.message}`);

  L.push('');
  L.push('── TRIGGER ' + '─'.repeat(66));
  L.push(`  relink trigger: ${rep.trigger.relink_trigger || 'NONE'}`);
  L.push(`  ${rep.trigger.behaviour}`);

  if (rep.audio.length) {
    L.push('');
    L.push('── AUDIO LINKS ' + '─'.repeat(62));
    for (const a of rep.audio) {
      L.push(`  ${a.column.padEnd(22)} ${a.verdict}`);
      L.push(`      now:  ${a.current_audio_id || '(none)'}  ${a.current_clip ? `[${a.current_clip.voice_id}] "${(a.current_clip.text || '').slice(0, 48)}"` : ''}`);
      L.push(`      after:${a.predicted_audio_id || ' NULL (silent)'}  ${a.predicted_clip ? `[${a.predicted_clip.voice_id}] "${(a.predicted_clip.text || '').slice(0, 48)}"` : ''}`);
      if (a.voice_change) L.push('      !! VOICE CHANGES');
      if (a.repair) L.push(`      →  ${a.repair.action}`);
      if (a.unique_constraint) {
        L.push(`      !! unique_course_audio_per_voice: ${a.unique_constraint.existing_clips.length} clip(s) already hold this text in role '${a.role}'`);
        for (const x of a.unique_constraint.existing_clips.slice(0, 5)) L.push(`         ${x.id} [${x.voice_id}]${x.lego_id ? ` lego=${x.lego_id}` : ''}`);
        L.push('         → bind the existing clip; an INSERT will be REJECTED.');
      }
    }
  }

  L.push('');
  L.push('── DERIVED ' + '─'.repeat(66));
  for (const [k, v] of Object.entries(rep.derived)) {
    if (v == null || (Array.isArray(v) && !v.length)) continue;
    if (k === 'lego_rows') { L.push(`  legos:`); for (const l of v) L.push(`      L${l.idx} (${l.type})  ${JSON.stringify(l.known)} → ${JSON.stringify(l.target)}`); continue; }
    if (k === 'containment_failures') { L.push(`  containment failures:`); for (const f of v) L.push(`      ${f.role} ${f.id}  ${JSON.stringify(f.target_text)}`); continue; }
    L.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }

  L.push('');
  L.push('── COURSE-WIDE ' + '─'.repeat(62));
  const t = rep.course_wide.tiling;
  L.push(t.removed_vocab_units.length
    ? `  tiling: ${t.broken.length} phrase(s) break of ${t.checked} re-tiled  (chunks removed: ${t.removed_vocab_units.join(', ')})`
    : `  tiling: not at risk — ${t.note}`);
  for (const b of t.broken.slice(0, 15)) L.push(`      seed ${b.seed} L${b.lego_index} ${b.role}: ${JSON.stringify(b.target_text)}  ✗ "${b.untileable_from}"`);
  if (t.broken.length > 15) L.push(`      … and ${t.broken.length - 15} more (full list in the JSON report)`);

  if (rep.course_wide.ordering.length) {
    L.push(`  taught late / used early:`);
    for (const o of rep.course_wide.ordering) {
      L.push(`      [${o.side}] ${JSON.stringify(o.form)} — taught at seed ${o.taught_at_seed ?? 'NEVER'}, used ${o.total_uses}× from seed ${o.first_used_at_seed}` +
        (o.earlier_use_seeds.length ? `; used earlier at ${o.earlier_use_seeds.join(', ')}` : ''));
    }
  }
  for (const s of rep.course_wide.same_text_elsewhere) {
    L.push(`  same ${s.side} text elsewhere (${s.rows.length}): ${s.rows.slice(0, 10).map(r => r.table === 'course_seeds' ? `seed ${r.seed}` : r.table === 'course_legos' ? `lego ${r.seed}:${r.lego_index}` : `phrase ${r.seed}/${String(r.id).slice(0, 8)}`).join(', ')}${s.rows.length > 10 ? ` … +${s.rows.length - 10}` : ''}`);
  }

  if (rep.presentations.length) {
    L.push('');
    L.push('── PRESENTATIONS ' + '─'.repeat(60));
    L.push(`  ${rep.presentations.length} intro clip(s) embed the old text:`);
    for (const p of rep.presentations.slice(0, 12)) L.push(`      ${p.id}${p.lego_id ? ` lego=${p.lego_id}` : ' (component)'} [${p.voice_id}] "${(p.text || '').slice(0, 56)}"`);
    if (rep.presentations.length > 12) L.push(`      … and ${rep.presentations.length - 12} more`);
  }

  L.push('');
  L.push('── TTS ' + '─'.repeat(70));
  L.push(`  ≈ ${rep.tts_estimate.clips_needing_render} clip(s) would need rendering (${rep.tts_estimate.breakdown.row_clips} row + ${rep.tts_estimate.breakdown.presentation_clips} presentation). NOTHING WAS RENDERED.`);

  L.push('');
  L.push('── DOCTRINE ' + '─'.repeat(65));
  for (const d of rep.doctrine) {
    L.push(`  [${ICON[d.severity] || d.severity}] ${d.flag}: ${d.detail}`);
    if (d.doctrine) L.push(`         → ${d.doctrine}`);
  }
  L.push('');
  return L.join('\n');
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const a = parseArgs(process.argv);
  if (a.help || a.h) usage();
  const courseCode = a.course;
  if (!courseCode) usage('--course <course_code> is required.');

  const c = await connect();
  try {
    const triggers = await loadTriggerFacts(c);
    const snap = await loadCourse(c, courseCode);

    let edits = [];
    if (a['replay-since']) {
      edits = await replayEdits(c, courseCode, a['replay-since']);
      if (!edits.length) console.error(`  (no text edits to ${courseCode} in content_audit_log since ${a['replay-since']})`);
    } else if (a.plan) {
      // `--plan -` reads the proposal from stdin, so an agent can pipe its own
      // pending change straight in without inventing a temp file. (/tmp is shared
      // between dispatched workers; a scratch file there has been silently
      // overwritten by a parallel slice before.)
      const raw = a.plan === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(a.plan, 'utf8');
      const plan = JSON.parse(raw);
      for (const p of (Array.isArray(plan) ? plan : plan.edits || [])) {
        const spec = p.table || (p.id ? 'course_practice_phrases' : p.lego_index != null ? 'course_legos' : 'course_seeds');
        const e = { table: spec, seed_number: p.seed ?? p.seed_number, lego_index: p.lego_index, id: p.id, known: p.known ?? p.known_text, target: p.target ?? p.target_text };
        const r = await resolveRow(c, courseCode, e);
        // A phrase is addressed by id alone, so a plan entry legitimately carries
        // no seed — and without this backfill every batched phrase edit ran with
        // seed_number undefined. That is not cosmetic: the taught-late/used-early
        // check and the tiling blast radius are both anchored on the edited seed,
        // and the same-text-elsewhere self-exclusion is keyed on it. The single
        // --phrase path already did this; the --plan path is the one real work
        // goes through, and it did not.
        if (e.seed_number == null && r.row.seed_number != null) e.seed_number = r.row.seed_number;
        edits.push({ ...e, ...r });
      }
    } else {
      let e;
      if (a.seed != null && a.seed !== true) e = { table: 'course_seeds', seed_number: Number(a.seed) };
      else if (a.lego) { const [s, i] = String(a.lego).split(':'); e = { table: 'course_legos', seed_number: Number(s), lego_index: Number(i) }; }
      else if (a.phrase) e = { table: 'course_practice_phrases', id: a.phrase };
      else usage('Give one of --seed N, --lego N:I, --phrase <id>, --plan <file>, --replay-since <date>.');
      if (a.known == null && a.target == null) usage('Give --known "..." and/or --target "..." (the proposed new text).');
      e.known = a.known === true ? null : a.known;
      e.target = a.target === true ? null : a.target;
      const r = await resolveRow(c, courseCode, e);
      if (e.table === 'course_practice_phrases') e.seed_number = r.row.seed_number;
      edits.push({ ...e, ...r });
    }

    const reports = [];
    for (const e of edits) reports.push(await checkEdit(c, snap, triggers, e));

    const out = buildEnvelope(courseCode, reports, a['replay-since'] ? 'replay' : a.plan ? 'plan' : 'single');

    if (!a.quiet) {
      for (const r of reports) console.log(render(r));
      console.log(`\n  ${reports.length} edit(s) checked · DECISION: ${out.decision.verdict.toUpperCase()} · ` +
        `${out.summary.danger} danger · ${out.summary.warn} warn · ≈${out.summary.clips_needing_render} clip(s) would need rendering · 0 rendered · 0 rows written\n`);
    }
    if (a.json === '-') {
      process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    } else if (a.json && a.json !== true) {
      fs.writeFileSync(a.json, JSON.stringify(out, null, 2));
      console.error(`  JSON report → ${a.json}`);
    }
    process.exitCode = EXIT[out.decision.verdict];
  } finally {
    await c.end();
  }
}

// Exit codes, so a proposing agent can branch on the decision without parsing.
// 2 is reserved for the tool itself failing — never confuse "the check broke"
// with "the check found nothing".
const EXIT = { proceed: 0, 'proceed-with-repairs': 10, reconsider: 20 };

function buildEnvelope(courseCode, reports, mode) {
  const rank = { proceed: 0, 'proceed-with-repairs': 1, reconsider: 2 };
  const worst = reports.reduce((w, r) => rank[r.decision.verdict] > rank[w] ? r.decision.verdict : w, 'proceed');
  const allActions = [...new Set(reports.flatMap(r => r.decision.required_actions))];
  return {
    tool: 'edit-impact-check',
    generated_at: new Date().toISOString(),
    course_code: courseCode,
    mode,
    read_only: true,
    tts_rendered: 0,
    edits: reports.length,
    // The proposing agent reads THIS first and decides. Everything below is why.
    decision: {
      verdict: worst,
      exit_code: EXIT[worst],
      headline: worst === 'proceed'
        ? `All ${reports.length} proposed edit(s) are self-contained — apply as written.`
        : worst === 'proceed-with-repairs'
          ? `Apply, then carry out ${allActions.length} follow-up action(s). The edit is not finished when the text lands.`
          : `${reports.filter(r => r.decision.verdict === 'reconsider').length} of ${reports.length} edit(s) damage work beyond themselves. Revise, narrow, or accept the cost deliberately — then re-run this check.`,
      required_actions: allActions,
      reconsider_edits: reports.filter(r => r.decision.verdict === 'reconsider')
        .map(r => ({ key: r.edit.key, reasons: r.decision.reasons.map(x => x.code) })),
      note: 'Advice to the agent that proposed these edits. This tool blocks nothing.',
    },
    summary: {
      danger: reports.reduce((n, r) => n + r.verdicts.filter(v => v.level === 'danger').length, 0),
      warn: reports.reduce((n, r) => n + r.verdicts.filter(v => v.level === 'warn').length, 0),
      clips_needing_render: reports.reduce((n, r) => n + r.tts_estimate.clips_needing_render, 0),
      phrases_broken_course_wide: reports.reduce((n, r) => n + r.course_wide.tiling.broken.length, 0),
    },
    reports,
  };
}

/**
 * In-process API, for a service or an agent already holding a connection.
 * Same computation, same envelope, no CLI.
 *
 *   const { checkEdits } = require('./tools/edit-impact-check.cjs');
 *   const report = await checkEdits('eng_for_sin', [{ seed: 181, known: '…' }]);
 *   if (report.decision.verdict === 'reconsider') ... rethink the proposal
 *
 * Safe to require: this module runs nothing on load (see the require.main guard).
 */
async function checkEdits(courseCode, proposed) {
  const c = await connect();
  try {
    const triggers = await loadTriggerFacts(c);
    const snap = await loadCourse(c, courseCode);
    const reports = [];
    for (const p of proposed) {
      const e = {
        table: p.table || (p.id ? 'course_practice_phrases' : p.lego_index != null ? 'course_legos' : 'course_seeds'),
        seed_number: p.seed ?? p.seed_number, lego_index: p.lego_index, id: p.id,
        known: p.known ?? p.known_text ?? null, target: p.target ?? p.target_text ?? null,
      };
      const r = await resolveRow(c, courseCode, e);
      if (e.table === 'course_practice_phrases') e.seed_number = r.row.seed_number;
      reports.push(await checkEdit(c, snap, triggers, { ...e, ...r }));
    }
    return buildEnvelope(courseCode, reports, 'api');
  } finally {
    await c.end();
  }
}

if (require.main === module) {
  main().catch(err => { console.error(`\n  edit-impact-check FAILED: ${err.message}\n`); process.exit(2); });
}

module.exports = { checkEdits, decide, buildEnvelope, sameVoice, tilingBlastRadius, orderingCheck, accumulate, words, EXIT };
