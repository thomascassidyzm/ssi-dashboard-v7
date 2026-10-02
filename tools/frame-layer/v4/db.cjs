/**
 * READ-ONLY course data for the v4 frame tools, via psql and .env.psql.
 *
 * Why psql and not supabase-js: one SELECT returning json_agg is one round
 * trip, no 1,000-row paging, and the connection string is the repo's own
 * .env.psql (gitignored, provisioned per machine). Nothing here writes: every
 * query is a SELECT and the role is whatever .env.psql grants.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = fs.readFileSync(path.join(ROOT, '.env.psql'), 'utf8');
  const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql carries no DATABASE_URL');
  return m[1].trim();
}

/** Run one SELECT and return its rows as objects. */
function query(sql, params = []) {
  if (!/^\s*(select|with)\b/i.test(sql)) throw new Error('read-only: only SELECT/WITH is allowed here');
  const wrapped = `select coalesce(json_agg(q), '[]'::json) from (${sql}) q`;
  const args = ['-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1'];
  for (let i = 0; i < params.length; i++) args.push('-v', `p${i + 1}=${params[i]}`);
  args.push('-c', wrapped, databaseUrl());
  const out = execFileSync('psql', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  return JSON.parse(out.trim() || '[]');
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;

function loadCourse(course, { maxSeed = 9999 } = {}) {
  const seeds = query(`select seed_number, known_text, target_text from course_seeds
    where course_code=${lit(course)} and seed_number<=${+maxSeed} order by seed_number`);
  const legos = query(`select id, seed_number, lego_index, known_text, target_text, type, is_new
    from course_legos where course_code=${lit(course)} and seed_number<=${+maxSeed} order by seed_number, lego_index`);
  const phrases = query(`select id, seed_number, lego_index, position, phrase_role, known_text, target_text,
    metadata->>'pipeline' as pipeline from course_practice_phrases
    where course_code=${lit(course)} and seed_number<=${+maxSeed} order by seed_number, lego_index, position`);
  return { course, seeds, legos,
    components: phrases.filter(p => p.phrase_role === 'component'),
    phrases: phrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use') };
}

module.exports = { query, loadCourse, lit };
