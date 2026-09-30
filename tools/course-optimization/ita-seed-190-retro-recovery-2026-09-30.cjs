#!/usr/bin/env node
'use strict';
// Job #920 retro-recovery: the three ita_for_eng S0190L01 BUILD phrases that regenerate-debut-practice
// deleted at 2026-09-30 11:06Z (event cee1f4c2…, which kept ids only). The rows themselves are gone and
// no DB backup / PITR copy is reachable from this box, so this is RECONSTRUCTED FROM EVIDENCE FILES,
// and each field says where it came from. B03's TARGET is NOT recovered (null) — nothing on disk states
// it; the only candidates are inferred from audio clip text and are deliberately not written as fact.
// Evidence predates the delete (2026-08-17 / 2026-09-10), so a phrase edited between then and the
// delete would show its older text. DRY by default; APPLY=1 files one event (no row is touched).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { changeEntry, phraseChangesDetail } = require('../../services/shared/phrase-change-log.cjs');

const COURSE = 'ita_for_eng';
const SRC_AUG = '~/ssi-evidence/ssi-dashboard-v7/docs/deborah/filler-build-sweep-2026-08-17.json (known_text of the phrase id)';
const SRC_TSV = '~/ssi-evidence/ssi-dashboard-v7/question-marks/ita_for_eng-question-mark-candidates.tsv, 2026-09-10 (known + target of the phrase id)';
const SRC_CSV = '~/ssi-evidence/ssi-dashboard-v7/ita-qmark-close-out/before-flagged-slots.csv, 2026-09-10 (known of the phrase id)';
const base = { course_code: COURSE, seed_number: 190, lego_index: 1, lego_id: 'S0190L01', phrase_role: 'build', position: null };
const RECOVERED = [
  { ...base, id: 'ita_for_eng:S0190L01B02', known_text: 'do you mind if I ask you', target_text: 'ti dispiace se ti faccio', sources: [SRC_TSV], note: 'identical to the LEGO and to B01 — a duplicate, which fits why it was cut' },
  { ...base, id: 'ita_for_eng:S0190L01B03', known_text: 'do you mind if I ask you later?', target_text: null, sources: [SRC_AUG], note: 'TARGET NOT RECOVERED. Unverified audio-only hints: "Ti dispiace se ti faccio dopo?" (course_audio 2026-02-11) — not evidence of this row' },
  { ...base, id: 'ita_for_eng:S0190L01B04', known_text: 'do you mind if I ask you that', target_text: 'ti dispiace se ti faccio quello', sources: [SRC_AUG, SRC_TSV, SRC_CSV], note: 'known agrees across three sources' },
];
module.exports = { RECOVERED };
async function main() {
  const detail = phraseChangesDetail(RECOVERED.map((r) => ({ ...changeEntry(r, null), sources: r.sources, note: r.note })), {
    job: '#920', retro_recovery: true, recovers_event: 'cee1f4c2-458d-4211-8dc8-3479a1253800',
    honesty: 'reconstructed from evidence files, not read from the deleted rows; B03 target unrecovered; nothing here was written to any phrase row' });
  if (process.env.APPLY !== '1') { console.log('DRY RUN — nothing written\n' + JSON.stringify(detail, null, 1)); return; }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const id = await recordContentEdit(supabase, { identity: serviceIdentity('ita-seed-190-retro-recovery', { role: 'content-sweep' }), courseCode: COURSE,
    surface: 'tools/course-optimization/ita-seed-190-retro-recovery-2026-09-30.cjs', operation: 'phrase-delete-retro-recovery',
    scope: { seed_numbers: [190], lego_ids: ['S0190L01'], phrase_ids: RECOVERED.map((r) => r.id), rows: 0 }, detail });
  console.log('event', id);
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
