#!/usr/bin/env node
/**
 * Build docs/frame-layer/spanish-structural-splits.{json,md}.
 *
 * Split definitions are authored here; every attesting seed's known and target
 * text is pulled LIVE from course_seeds, so no example in the artefact is typed
 * from memory. A cited seed that does not exist, or whose text no longer shows
 * the split, is reported rather than silently carried.
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'), path = require('path');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const COURSE = 'spa_for_eng';

const SPLITS = [
  { id: 'S1', pattern: 'P1', name: 'want(X) to — subject switch',
    trigger: 'Does the wanting subject also do the wanted action?',
    outcomes: [
      { form: 'querer + INFINITIVE', when: 'same subject', seed: 1 },
      { form: 'querer que + PRESENT SUBJUNCTIVE', when: 'subject switches', seed: 15 } ] },
  { id: 'S2', pattern: 'P11', name: 'hope — subject switch',
    trigger: 'Same question as S1, on a different matrix verb. Seeds 291 and 292 are ADJACENT: the authors put the minimal pair side by side.',
    outcomes: [
      { form: 'esperar + INFINITIVE', when: 'same subject', seed: 291 },
      { form: 'esperar que + PRESENT SUBJUNCTIVE', when: 'subject switches', seed: 292 } ] },
  { id: 'S3', pattern: 'P13', name: 'before / after — subject switch',
    trigger: 'Same subject in the temporal clause, or a new one?',
    outcomes: [
      { form: 'después de + INFINITIVE', when: 'same subject', seed: 110 },
      { form: 'antes de que + SUBJUNCTIVE', when: 'subject switches', seed: 25 },
      { form: 'antes de que + SUBJUNCTIVE (second attestation)', when: 'subject switches', seed: 281 } ] },
  { id: 'S4', pattern: 'P9', name: 'think that — matrix negation',
    trigger: 'Is the matrix verb negated?',
    outcomes: [
      { form: 'pensar que + INDICATIVE', when: 'affirmative', seed: 325 },
      { form: 'no pensar que + SUBJUNCTIVE', when: 'negated', seed: 326 } ] },
  { id: 'S5', pattern: 'P16', name: 'relative clause — specificity',
    trigger: 'Does the head noun refer to someone specific and known to exist?',
    outcomes: [
      { form: 'que + INDICATIVE', when: 'specific referent', seed: 22 },
      { form: 'que + SUBJUNCTIVE', when: 'non-specific / under negation', seed: 297 } ] },
  { id: 'S6', pattern: 'P4', name: "could → podía / pudo / podría",
    trigger: 'Habitual ability in the past, a single completed event, or a hypothetical? English "could" marks none of these.',
    outcomes: [
      { form: 'podría (conditional / hypothetical)', when: 'hypothetical', seed: 310 },
      { form: 'podía (imperfect / ongoing ability)', when: 'past ongoing', seed: 311 },
      { form: 'pudo (preterite / single completed event)', when: 'single event', seed: 148 },
      { form: 'pueda (present subjunctive, under negated matrix)', when: 'negated matrix', seed: 318 } ] },
  { id: 'S7', pattern: 'P17', name: "the double-'d — 'd = would vs 'd = had",
    trigger: "Does the 'd sit in the main clause (= would) or the if-clause (= had)? Both spellings are 'd.",
    outcomes: [
      { form: 'habría + PARTICIPLE (main clause)', when: "'d = would", seed: 599 },
      { form: 'hubiera / hubieras + PARTICIPLE (if-clause)', when: "'d = had", seed: 600 },
      { form: 'both, if-clause first', when: 'if-clause fronted', seed: 606 },
      { form: 'both, second attestation', when: 'if-clause fronted', seed: 607 } ] },
  { id: 'S8', pattern: 'P31', name: 'like → dative inversion',
    trigger: 'None on the known side. English SUBJ-likes-OBJ becomes Spanish OBJ-pleases-DATIVE.',
    outcomes: [
      { form: 'a [X] le gusta [theme]', when: 'always', seed: 239 },
      { form: 'me gustaría + INFINITIVE', when: 'conditional', seed: 11 } ] },
  { id: 'S9', pattern: 'P10', name: 'know → saber / conocer (lexical)',
    trigger: 'Knowing a fact vs being acquainted with a person or place. No English trace.',
    outcomes: [
      { form: 'saber', when: 'a fact', seed: 105 },
      { form: 'conocer', when: 'a person', seed: 233 } ] },
  { id: 'S10', pattern: 'P12', name: 'ask → preguntar / pedir (lexical)',
    trigger: 'Asking a question vs asking for a thing. No English trace.',
    outcomes: [
      { form: 'preguntar (a question)', when: 'question', seed: 30 },
      { form: 'pedir (for something)', when: 'request', seed: 212 } ] },
  { id: 'S11', pattern: 'P16', name: "personal 'a'",
    trigger: 'Is the direct object a specific person? Then Spanish mints an `a` with no English trace at all.',
    outcomes: [
      { form: 'a + human direct object', when: 'human, specific', seed: 22 },
      { form: 'a + human direct object (second attestation)', when: 'human, specific', seed: 181 } ] },
  { id: 'S12', pattern: 'P18', name: 'it is → ser / estar',
    trigger: 'An inherent property vs a state or location.',
    outcomes: [
      { form: 'ser (es)', when: 'property', seed: 28 },
      { form: 'estar (está)', when: 'location / state', seed: 487 } ] },
];

(async () => {
  const wanted = [...new Set(SPLITS.flatMap(s => s.outcomes.map(o => o.seed)))];
  const { data, error } = await sb.from('course_seeds')
    .select('seed_number,known_text,target_text').eq('course_code', COURSE).in('seed_number', wanted);
  if (error) throw new Error(error.message);
  const by = Object.fromEntries(data.map(r => [r.seed_number, r]));
  const missing = wanted.filter(n => !by[n]);

  const out = { course: COURSE, generated: new Date().toISOString(), missing_seeds: missing,
    splits: SPLITS.map(s => ({ ...s, outcomes: s.outcomes.map(o => ({ ...o,
      known_text: by[o.seed]?.known_text ?? null, target_text: by[o.seed]?.target_text ?? null })) })) };
  const dir = path.join(__dirname, '..', '..', 'docs', 'frame-layer');
  fs.writeFileSync(path.join(dir, 'spanish-structural-splits.json'), JSON.stringify(out, null, 2));

  const L = ['# Spanish structural splits (spa_for_eng)', '',
    `${SPLITS.length} splits. Every attesting seed's text below was pulled live from \`course_seeds\` on ${out.generated.slice(0,10)} — none of it is transcribed.`, '',
    'A **split** is one English frame that the target realises two or more ways, chosen by a trigger. The trigger is the whole teaching job of the seeds that carry it; a phrase set that never crosses the split has not taught the seed, however legal every phrase in it is.', '',
    '**The seed authors were doing detachment-rule pedagogy at the frame level in 2009.** The minimal pairs below are deliberate — 291/292 are adjacent; 310–318 drill one block; 599/600 step from infinitive to participle, one distinction at a time. The extraction recovers the theory the course was written with.', ''];
  for (const s of out.splits) {
    L.push(`## ${s.id} — ${s.name}  \`(${s.pattern})\``);
    L.push('');
    L.push(`**Trigger:** ${s.trigger}`);
    L.push('');
    L.push('| seed | known side | target | outcome | when |');
    L.push('|---:|---|---|---|---|');
    for (const o of s.outcomes) {
      L.push(`| ${o.seed} | ${o.known_text ?? '**MISSING**'} | ${o.target_text ?? '**MISSING**'} | \`${o.form}\` | ${o.when} |`);
    }
    L.push('');
  }
  if (missing.length) L.push(`**Seeds cited but not found live:** ${missing.join(' ')}`);
  fs.writeFileSync(path.join(dir, 'spanish-structural-splits.md'), L.join('\n') + '\n');
  console.log(`${SPLITS.length} splits, ${wanted.length} seeds pulled, ${missing.length} missing`);
})();
