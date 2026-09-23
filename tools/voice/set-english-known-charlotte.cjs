#!/usr/bin/env node
/**
 * THE DEFAULT ENGLISH FEMALE VOICE, SPLIT BY JOB.
 *
 * ── SUPERSEDED (Kai, 2026-09-23 14:16Z, job #863) ───────────────────────────
 * English is Charlotte EVERYWHERE, no Gemma. The known-slot row this tool
 * writes is KEPT (it is the mechanism), but the phrase slot no longer holds
 * Gemma — see tools/voice/set-english-charlotte-everywhere.cjs, which is the
 * live apply/revert. The pre-flight below therefore accepts either Gemma or
 * Charlotte in the phrase slot. The original reasoning follows, as history.
 *
 * Deborah and Kai's ruling, 2026-09-23 (Kai: "apply the ruling to all the
 * courses"): when English is the TARGET — a learner learning English — the
 * female voice is Cartesia "Gemma - Decisive Agent", because she varies her
 * delivery more. When English is the KNOWN prompt — a learner learning another
 * language from English — it is Cartesia "Charlotte" (en-GB).
 *
 * ── WHY ONE ROW AND NOT 74 OVERRIDES ────────────────────────────────────────
 * The 2026-09-04 language cast put Gemma in the ('eng','f','phrase',0) slot,
 * which services/shared/language-voice-cast.cjs read for `known` and `target1`
 * alike — so Gemma became the English prompt on every *_for_eng course AND the
 * English answer on every eng_for_* course. The alternative to this tool was a
 * per-course override on ~74 courses: the 94 copies Tom's 2026-08-29 ruling
 * exists to abolish. So the distinction is one row in the cast table, in the
 * KNOWN slot the resolver now reads for the `known` role ahead of the phrase
 * slot (KNOWN_SLOT in language-voice-cast.cjs). The phrase slot keeps Gemma.
 *
 * ── WHAT IT WRITES ──────────────────────────────────────────────────────────
 *   1. voice_language_roles_slot_check gains 'known' (idempotent DDL).
 *   2. voices gains a row for Charlotte if it has none — the slot table carries
 *      a foreign key. Registered through the same helper the Voice Lab uses
 *      when the Cartesia key is on this box, else from the facts below.
 *   3. voice_language_roles ('known','eng','f',0) = Charlotte.
 *
 * ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
 *   • Renders NOTHING. Adoption is forward-only: every existing clip keeps
 *     playing on the voice it was made with.
 *   • Touches no course row, no override, no male slot, no phrase slot. The
 *     six courses cast with a MALE English prompt (deu, fra, fra_ca, por_br,
 *     spa_mx, pdc → Tom's clone) read ('eng','m') and are untouched; the
 *     human-recorded Welsh known sides are stopped by the human guard before
 *     the cast is consulted at all.
 *   • Reaches no render until the resolver that reads the known slot is on
 *     main and the services have restarted. Until then the row is inert.
 *
 * Usage:  node tools/voice/set-english-known-charlotte.cjs           # dry run
 *         node tools/voice/set-english-known-charlotte.cjs --apply
 *         node tools/voice/set-english-known-charlotte.cjs --revert --apply
 */

'use strict';

const path = require('path');
const fs = require('fs');
const REPO = path.join(__dirname, '..', '..');
const PRIMARY = '/home/tomcassidy/SSi/ssi-dashboard-v7-clean';
for (const p of [path.join(REPO, '.env.psql'), path.join(PRIMARY, '.env.psql')]) {
  if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break; }
}
for (const p of [path.join(REPO, '.env'), path.join(PRIMARY, '.env')]) {
  if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break; }
}
if (!process.env.DATABASE_URL) throw new Error('no DATABASE_URL: .env.psql not found');
const { Client } = require('pg');
const { KNOWN_SLOT } = require(path.join(REPO, 'services/shared/language-voice-cast.cjs'));

/** Cartesia "Charlotte", the only Charlotte in the catalogue, en-GB. */
const CHARLOTTE = {
  voice_id: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121',
  bare: '71a7ad14-091c-4e8e-a314-022ece01c121',
  name: 'Charlotte',
  gender: 'f',
  language: 'en-GB',
};
const GEMMA = 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca';
const CAST = { slot: KNOWN_SLOT, language: 'eng', gender: 'f', rank: 0 };
const ASSIGNED_BY = 'kai-deborah-ruling-2026-09-23';
const NOTES = "Deborah + Kai, 2026-09-23: Charlotte is the female English voice when English is the KNOWN prompt language (every *_for_eng course); Gemma stays the phrase-slot voice, i.e. the English TARGET voice on eng_for_* courses. Written by tools/voice/set-english-known-charlotte.cjs (job #847). Forward-only: no existing clip is re-rendered.";

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const log = { at: new Date().toISOString(), mode: APPLY ? 'applied' : 'dryrun', revert: REVERT, steps: [] };

  // ── PRE-FLIGHT: the phrase slot must still say Gemma, or the ruling's other half is not in place.
  const { rows: [phrase] } = await c.query(
    "select voice_id from voice_language_roles where slot='phrase' and language='eng' and gender='f' and rank=0");
  if (!phrase || (phrase.voice_id !== GEMMA && phrase.voice_id !== CHARLOTTE.voice_id)) {
    throw new Error(`('eng','f','phrase',0) is ${phrase ? phrase.voice_id : 'EMPTY'}, expected Gemma ${GEMMA} (the 12:30Z split) or Charlotte ${CHARLOTTE.voice_id} (the 14:16Z Charlotte-everywhere ruling, job #863) — refusing to write the known half over an unknown state`);
  }
  log.steps.push({ step: 'preflight', phraseSlotF0: phrase.voice_id });

  // ── 1. THE CHECK CONSTRAINT MUST ADMIT 'known' ────────────────────────────
  const { rows: [con] } = await c.query(
    "select pg_get_constraintdef(oid) def from pg_constraint where conname='voice_language_roles_slot_check'");
  const admits = con && con.def.includes(`'${KNOWN_SLOT}'`);
  log.steps.push({ step: 'slot_check', before: con ? con.def : null, admitsKnown: Boolean(admits) });
  if (!REVERT && !admits) {
    if (APPLY) {
      await c.query('alter table voice_language_roles drop constraint voice_language_roles_slot_check');
      await c.query(`alter table voice_language_roles add constraint voice_language_roles_slot_check check (slot = any (array['phrase'::text, 'guide'::text, 'presentation'::text, '${KNOWN_SLOT}'::text]))`);
      // COMMENT takes no bind parameters, so the literal is quoted by hand.
      const comment = "phrase = the male/female course-material voices. known = the phrase voice this language uses when it is a course''s KNOWN side (Deborah + Kai, 2026-09-23: Charlotte prompts in English, Gemma teaches it); gendered like phrase, read for the `known` role ahead of phrase, empty means same as phrase. guide = the instruction and encouragement voice, cast against the KNOWN language, one per language, gender informational only (Tom, 2026-08-29). presentation = the course narrator (the LEGO intro), also cast against the KNOWN language, also one per language and gender-informational, and also outside the completeness count (Tom, 2026-09-10).";
      await c.query(`comment on column voice_language_roles.slot is '${comment}'`);
    }
    log.steps.push({ step: 'slot_check', action: 'add known' });
  }

  // ── 2. CHARLOTTE MUST HAVE A voices ROW (foreign key) ─────────────────────
  const { rows: [existing] } = await c.query('select voice_id, gender, is_active, tts_engine from voices where voice_id=$1', [CHARLOTTE.voice_id]);
  if (!REVERT && !existing) {
    log.steps.push({ step: 'voices', action: 'register', voice: CHARLOTTE });
    if (APPLY) {
      let registered = false;
      if (process.env.CARTESIA_API_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          const { createClient } = require('@supabase/supabase-js');
          const cartesia = require(path.join(REPO, 'services/voicelab/cartesia.cjs'));
          const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
          const meta = await cartesia.fetchVoice(CHARLOTTE.voice_id);
          await cartesia.registerVoice(db, {
            voiceId: CHARLOTTE.voice_id, name: meta.name || CHARLOTTE.name, language: meta.language || 'en',
            gender: meta.gender === 'feminine' ? 'f' : meta.gender === 'masculine' ? 'm' : CHARLOTTE.gender,
            registeredBy: ASSIGNED_BY,
          });
          registered = true;
          log.steps.push({ step: 'voices', via: 'cartesia.registerVoice', meta: { name: meta.name, language: meta.language, gender: meta.gender } });
        } catch (e) {
          log.steps.push({ step: 'voices', via: 'cartesia.registerVoice', failed: e.message });
        }
      }
      if (!registered) {
        await c.query(`insert into voices (voice_id, type, tts_engine, display_name, languages, gender, is_active, provider_id, model, metadata_source, notes)
                       values ($1,'tts','cartesia',$2,'{en}',$3,true,$4,'sonic-3.6','cartesia-catalogue (tools/voice/set-english-known-charlotte.cjs)',$5)
                       on conflict (voice_id) do nothing`,
          [CHARLOTTE.voice_id, CHARLOTTE.name, CHARLOTTE.gender, CHARLOTTE.bare, 'Registered when cast into the known slot for eng (Deborah + Kai ruling, 2026-09-23). Already the eng_for_hin target1 voice of record for 8,997 clips rendered 2026-09-23 (job #827).']);
        log.steps.push({ step: 'voices', via: 'direct insert' });
      }
    }
  } else if (existing) {
    log.steps.push({ step: 'voices', action: 'exists', existing });
    if (existing.gender !== 'f') {
      log.steps.push({ step: 'voices.gender', from: existing.gender, to: 'f', why: 'genderForRole reads the stored voice gender; null would fall to the default and could flip a course' });
      if (APPLY && !REVERT) await c.query("update voices set gender='f', updated_at=now() where voice_id=$1", [CHARLOTTE.voice_id]);
    }
  }

  // ── 3. THE ROW ────────────────────────────────────────────────────────────
  const { rows: prior } = await c.query(
    'select * from voice_language_roles where slot=$1 and language=$2 and gender=$3 and rank=$4',
    [CAST.slot, CAST.language, CAST.gender, CAST.rank]);
  if (REVERT) {
    log.steps.push({ step: 'voice_language_roles', action: 'delete', prior: prior[0] || null });
    if (APPLY) await c.query('delete from voice_language_roles where slot=$1 and language=$2 and gender=$3 and rank=$4',
      [CAST.slot, CAST.language, CAST.gender, CAST.rank]);
  } else {
    log.steps.push({ step: 'voice_language_roles', action: prior.length ? 'update' : 'insert', prior: prior[0] || null, to: CHARLOTTE.voice_id });
    if (APPLY) {
      await c.query(`insert into voice_language_roles (slot, language, gender, rank, voice_id, assigned_by, notes)
                     values ($1,$2,$3,$4,$5,$6,$7)
                     on conflict (slot, language, gender, rank)
                     do update set voice_id=excluded.voice_id, assigned_by=excluded.assigned_by, notes=excluded.notes, updated_at=now()`,
        [CAST.slot, CAST.language, CAST.gender, CAST.rank, CHARLOTTE.voice_id, ASSIGNED_BY, NOTES]);
    }
  }

  log.rollback = REVERT
    ? 'node tools/voice/set-english-known-charlotte.cjs --apply'
    : "node tools/voice/set-english-known-charlotte.cjs --revert --apply  (deletes the ('known','eng','f',0) row; the phrase slot was never touched; the voices row and the widened check constraint are harmless to leave)";
  await c.end();
  console.log(JSON.stringify(log, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
