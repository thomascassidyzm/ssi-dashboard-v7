const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  console.log('Applying migration: 20260214_fix_draft_validation_status.sql\n');

  // The migration we need to run:
  const sql1 = `
    ALTER TABLE course_seed_drafts
    DROP CONSTRAINT IF EXISTS course_seed_drafts_validation_status_check;
  `;

  const sql2 = `
    ALTER TABLE course_seed_drafts
    ADD CONSTRAINT course_seed_drafts_validation_status_check
    CHECK (validation_status IN ('valid', 'collision', 'rework', 'decomposed'));
  `;

  console.log('NOTE: Supabase JS client cannot execute DDL statements directly.');
  console.log('\nYou need to apply this migration via Supabase Studio:');
  console.log('1. Go to https://supabase.com/dashboard → SQL Editor');
  console.log('2. Paste the following SQL:\n');
  console.log('----------------------------------------');
  console.log(sql1);
  console.log(sql2);
  console.log('----------------------------------------');
  console.log('\n3. Click "Run" to execute');
  console.log('\nAlternatively, I can write a file you can copy:\n');

  const migrationSQL = fs.readFileSync('./database/migrations/20260214_fix_draft_validation_status.sql', 'utf8');
  console.log(migrationSQL);
}

applyMigration().catch(err => {
  console.error('Error:', err.message);
});
