#!/usr/bin/env node
/**
 * post-findings.cjs — v1, DETERMINISTIC (no LLM / no Claude account needed).
 * Reads the latest gather snapshot, extracts the anomalies + headline counts, and posts a summary
 * to a dedicated Basecamp message on the "Kai" board (43553001) — NOT onto Deborah's course cards.
 * Also writes a success marker so the afternoon check knows the run completed.
 * (A later v2 can add LLM reasoning about abandoned/unclear-goal once the routine's account is pinned.)
 *
 * Usage: post-findings.cjs <snapshot.md>
 */
const fs = require('fs');
const { execFileSync } = require('child_process');
const KAI_BOARD = '43553001';

const snap = process.argv[2];
if (!snap || !fs.existsSync(snap)) { console.error('snapshot not found:', snap); process.exit(1); }
const text = fs.readFileSync(snap, 'utf8');

const header = (text.split('\n').find(l => l.startsWith('# Course status snapshot')) || 'Course status snapshot').replace(/^#\s*/, '');
const anomalies = (text.match(/## Anomalies[\s\S]*?(?=\n## |\n_debug|$)/) || [''])[0].trim();
const encoutdated = (text.match(/^\S+\t\S+\t\d+\/\d+\toutdated$/gm) || []).length;
const today = new Date().toISOString().slice(0, 10);

const body = [
  `**${header}**`,
  '',
  anomalies || '_No anomalies section in snapshot._',
  '',
  encoutdated ? `Encouragements: ${encoutdated} deployed courses currently outdated.` : '',
  '',
  `_Auto-posted by course-monitor run-daily. Full snapshot on the dashboard host: ${snap}_`,
].filter(x => x !== undefined).join('\n');

if (process.argv.includes('--dry')) { console.log('--- DRY: would post to Kai board ---\n' + body); process.exit(0); }
const bc = (args) => execFileSync('basecamp', args, { encoding: 'utf8', env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }, maxBuffer: 8 * 1024 * 1024 });
try {
  bc(['message', '--project', KAI_BOARD, `Course Monitor — ${today}`, body]);
  console.log('posted findings to Kai board');
  // success marker for the afternoon check
  const marker = process.env.COURSE_MONITOR_MARKER || `${require('os').homedir()}/Documents/GitHub/ssi-dashboard-v7/temp/course-monitor/LAST_OK`;
  fs.mkdirSync(require('path').dirname(marker), { recursive: true });
  fs.writeFileSync(marker, `${new Date().toISOString()}\n${snap}\n`);
} catch (e) { console.error('post failed:', e.message.split('\n')[0]); process.exit(1); }
