// Builds jrefute-rows.json — one judgement per plan row, keyed (row_uuid, surface).
// Severity order: refuted > change > ok. Each row records the axis that drove its verdict.
const fs = require('fs');
const path = require('path');
const D = __dirname;
const plan = require(path.join(D, 'adj-plan.json'));
const a1 = require(path.join(D, 'jrefute-a1-derived.json'));
const a6 = require(path.join(D, 'jrefute-a6-derived.json'));
const corpus = require(path.join(D, 'jrefute-corpus.json'));

// nothing in the plan is a unique key (row_uuid repeats across surfaces, row_key repeats
// across tiles), so judgements are keyed on the plan row's own index.
const IDX = new Map(plan.map((r, i) => [r, i]));
const key = r => String(IDX.get(r));
const out = new Map();
const RANK = { ok: 0, change: 1, refuted: 2 };
function put(r, verdict, axis, reason, alt) {
  const k = key(r);
  const prev = out.get(k);
  if (prev && RANK[prev.verdict] >= RANK[verdict]) {
    prev.also = (prev.also || []).concat(axis + ': ' + reason);
    return;
  }
  const rec = {
    row_uuid: r.row_uuid, surface: r.surface, course: r.course_code, seed: r.seed_number,
    row_key: r.row_key, old_known_text: r.old_known_text, new_known_text: r.new_known_text,
    target_text: r.target_text, proposed_action: r.action, verdict, axis, reason,
    proposed_alternative: alt || null,
  };
  if (prev) rec.also = (prev.also || []).concat(prev.axis + ': ' + prev.reason);
  out.set(k, rec);
}

// ---------- default: everything starts ok ----------
for (const r of plan) put(r, 'ok', 'axis 2', 'no defect found on this row: the post-edit ZUT re-derivation puts it in no multi-target group on the production prompt surface.');

// ---------- AXIS 1: rewrites ----------
const fKey = f => f.row_uuid + '|' + f.surface + '|' + f.row_key + '|' + f.old;
const lateSet = new Set(a1.lateOnes.map(fKey));
const byKeyFinding = new Map(a1.findings.map(f => [fKey(f), f]));
const planFKey = r => r.row_uuid + '|' + r.surface + '|' + r.row_key + '|' + r.old_known_text;

// targets whose subject is NOT a person: impersonal, inanimate, an auxiliary, or non-finite.
// 「彼・彼女」 asserts a human he/she subject that these forms do not have.
const NON_PERSON = new Set([
  'funktioniert', 'verändert', 'fängt', 'läuft', 'scheint', 'klingt', 'hat', 'wird',
  'è', 'era', 'sta', 'sta iniziando a', 'sta cercando di', 'va', 'va a', 'iniziato a',
  'esercitarsi', 'avrebbe', 'potrebbe', 'riesce', 'riesce a', 'darebbe',
  'é', 'foi', 'está a', 'pode', 'pode ser', 'parece', 'sobrava', 'consegue',
  'está', 'suena', 'importa', 'queda', 'quedaba', 'acaba', 'iba', 'cambia',
]);

for (const r of plan.filter(p => p.action === 'rewrite')) {
  const f = byKeyFinding.get(planFKey(r));
  const np = f && f.new_paren;
  const late = lateSet.has(planFKey(r));
  const nonPerson = NON_PERSON.has((r.target_text || '').replace(/"/g, '').trim());
  const isThird = np && /彼・彼女/.test(np);

  if (late) {
    const l = f.late.map(c => `「${c.needle}」 debuts ${c.debut === null ? 'NOWHERE in this course' : 'at seed ' + c.debut}`).join('; ');
    put(r, 'refuted', 'axis 1',
      `Controlled-language breach: the rewrite puts Japanese in the prompt that the learner has not been given at seed ${r.seed_number}. ${l}.`,
      isThird
        ? 'Hold. If a person marker is wanted here, use one this course already teaches at or before this seed, and introduce 「彼・彼女…」 as its own debut first.'
        : 'Hold until the marker is introduced earlier in the course, or use a marker already taught by this seed.');
  }
  if (isThird && nonPerson) {
    put(r, 'refuted', 'axis 1',
      `Elicitation error: the target 「${r.target_text}」 is impersonal, inanimate, an auxiliary or non-finite — it has no he/she subject. 「${np}」 asserts a human subject the target does not have.`,
      'Do not rewrite person onto this row. Either hold, or replace the label with what the form actually means (e.g. 「〜ている」 aspect, or 「それが」 for an inanimate subject) — authored, not mapped.');
  } else if (isThird) {
    put(r, 'change', 'axis 1',
      `「${np}」 is a written-only convention with a ・ disjunction, and these prompts are SPOKEN: the TTS reads it as two nouns in a list, not as a pronoun. It also fixes gender the target does not fix, and in Spanish/Portuguese it silently drops the polite usted/você reading of the third person.`,
      'Use a single spoken-natural marker the course already teaches, or carry the person in the stem rather than a parenthesis.');
  }
}

// ---------- AXIS 3: strips that are load-bearing ----------
const STRIP_REFUTE = {
  '誰も（否定・主語）': ['Japanese 誰も is only "nobody" in the presence of a following negative; bare 「誰も」 is read "anyone". Stripping 否定 leaves a prompt that does not determine niemand.', 'Rewrite to 「誰も〜ない」 so the negation is carried by the Japanese, not by a label.'],
  'あげるでしょう（dar条件法）': ['でしょう reads as future/presumptive, not conditional. The bare prompt does not distinguish daría from dará.', 'Rewrite to a conditional-carrying Japanese form, e.g. 「あげるだろうに」 / 「あげるのに」, authored against what the seed has taught.'],
  '手伝うでしょう（ayudar条件法）': ['Same as above: bare 「手伝うでしょう」 does not distinguish ayudaría from ayudará.', 'Author a conditional-carrying Japanese form.'],
  '～すべき（deber条件法）': ['「～すべき」 is deontic and tenseless; it does not distinguish debería from debe/deberá.', 'Author a conditional-carrying form.'],
  '～できるかもしれない（poder条件法）': ['かもしれない is epistemic possibility, not the conditional; it does not pin podría against puede/podrá.', 'Author a conditional-carrying form.'],
  '〜しようとするつもりだ（条件形）': ['つもりだ is intention, not conditional; the bare prompt does not pin "versuchen würde".', 'Author a conditional-carrying form.'],
  '何をするか（条件）': ['条件 is what makes this the conditional "tu ferais" rather than the present "tu fais". Stripping leaves the tense undetermined.', 'Author a conditional-carrying Japanese form.'],
};
for (const r of plan.filter(p => p.action === 'strip')) {
  const hit = STRIP_REFUTE[r.old_known_text];
  if (hit) put(r, 'refuted', 'axis 3', 'Load-bearing content misread as metadata. ' + hit[0], hit[1]);
}

// ---------- AXIS 4: metalinguistic tags kept ----------
const parenOf = s => { const m = /[（(]([^）)]*)[）)]/.exec(s || ''); return m ? m[1] : null; };
const META_TAGS = new Set(['丁寧', '口語', '改まった', '状態', '強調', '期間', 'について', 'する', '一般的に', 'とても', '君は・丁寧']);
for (const r of plan.filter(p => p.hold_kind === 'keep_content_no_edit_needed')) {
  const p = parenOf(r.old_known_text);
  if (!META_TAGS.has(p)) continue;
  put(r, 'change', 'axis 4',
    `「${p}」 is a metalinguistic LABEL, not a word of the message — the learner cannot act on it without knowing the grammar term, which is exactly #880's own producibility test. ${r.has_clip ? 'This row has a live clip, so the label is SPOKEN as well as printed.' : 'Printed only (no clip on this row today).'} #880 conceded register "is metalinguistic in form" and then kept it anyway.`,
    'Treat as the person labels were treated: rewrite the information into Japanese the learner can act on (register via the pronoun choice 君/あなた, ser/estar via the Japanese predicate, 強調 via the actual emphatic word), or hold for an author — but do not keep the tag.');
}

// ---------- AXIS 5: the 36 broken rows ----------
for (const r of plan) {
  if (r.hold_kind === 'blocked_row_corrupt') {
    put(r, 'refuted', 'axis 5',
      `Live corruption, not a paren defect: the known_text is truncated mid-parenthesis (「${r.old_known_text}」). status='draft' but the learner content API applies NO status filter, so this is served today${r.has_clip ? ', and the TTS clip was rendered from the truncated string, so the learner hears the broken text' : ''}.`,
      'Escalate as its own fix now, ahead of this plate: repair the known_text from the target, then re-render the clip under make-before-break. Do not park it as a hold.');
  }
  if (r.hold_kind === 'blocked_wrong_language') {
    put(r, 'refuted', 'axis 5',
      `The known side is ENGLISH ("${r.old_known_text}") in a Japanese-known course, so the prompt is unusable for its learner. Served today (no status filter on the learner path).`,
      'Escalate as its own fix: author the Japanese known text for 「teus」 (2nd-person plural possessive) at seed 283. Not a hold.');
  }
  if (r.hold_kind === 'blocked_no_gloss_to_fall_back_on') {
    put(r, 'change', 'axis 5',
      `The whole known side IS the annotation (「${r.old_known_text}」) — there is no message left after a strip, so holding is right, but "hold" hides that the row is already defective: the learner is shown a bare grammar term as the gloss for 「${r.target_text}」.`,
      'Author a real gloss for this element rather than parking it. These are function words (articles, markers, impersonal se) — the method bundles them into the noun/verb LEGO rather than glossing them standalone.');
  }
}

// ---------- AXIS 6: silent slots ----------
for (const g of a6.goesSilent) {
  const r = plan.find(p => p.row_uuid === g.row_uuid && p.surface === g.surface && p.row_key === g.row_key);
  if (!r) continue;
  put(r, 'change', 'axis 6',
    `Applying this edit NULLs known_audio_id: audio_id_for_text() finds no clip for 「${r.new_known_text}」, so a prompt slot that is audible today goes SILENT. The row's current clip is 「${g.old_text}」 (voice ${g.old_voice}).`,
    'Make-before-break: render and verify the new clip BEFORE the text edit lands, or apply the text edits only as part of an approved+fulfilled audio pass. Do not ship the edit into a live beta course ahead of the audio.');
}

// ---------- AXIS 7: presentation pointer destroyed ----------
const legoEdits = plan.filter(p => p.surface === 'known_text' && p.table === 'course_legos' && ['strip', 'rewrite', 'partial'].includes(p.action));
const presRows = new Set(require(path.join(D, 'jrefute-a7-presrows.json')));
for (const r of legoEdits) {
  if (!presRows.has(r.row_uuid)) continue;
  put(r, 'change', 'axis 7',
    'This is a course_legos row, so trg_null_lego_audio_on_text_change also repoints presentation_audio_id — via audio_id_for_text(course, TARGET_text, \'presentation\'), which matches for 0 legos in these courses because presentation clips are keyed on the narration sentence, not the target word. The edit therefore DESTROYS this row\'s presentation-clip pointer outright.',
    'Capture the presentation_audio_id before-image and restore it in the same transaction, or fix the trigger, before any of these edits are applied.');
}

const arr = [...out.values()];
const tally = {}; for (const a of arr) tally[a.verdict] = (tally[a.verdict] || 0) + 1;
const byAxis = {}; for (const a of arr) if (a.verdict !== 'ok') byAxis[a.axis] = (byAxis[a.axis] || 0) + 1;
console.log('rows judged:', arr.length, '(the whole plan)');
console.log('verdicts:', tally);
console.log('non-ok by driving axis:', byAxis);
fs.writeFileSync(path.join(D, 'jrefute-rows.json'), JSON.stringify(arr, null, 1));
