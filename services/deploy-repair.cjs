/**
 * Deploy repair — the fallback when a normal Deploy's `git pull` jams on a machine.
 *
 * Shape (Tom's ruling, 2026-08-05): Repair force-resets the machine's checkout to
 * exactly match origin/<branch> and then restarts services like a normal deploy.
 * It is a FALLBACK, never a first option, and it is never accidental:
 *
 *   1. It can only run after a normal deploy has failed — the failed deploy issues a
 *      single-use, short-lived repair token, and repair without a live token is a 409.
 *   2. It requires an explicit `confirm: true` from the caller (the UI shows the
 *      "local changes will be discarded" confirm step that sets it).
 *   3. It captures a safety snapshot of everything it is about to discard BEFORE
 *      touching the checkout — a git ref + bundle + tarball of untracked files —
 *      so "discarded" never means "unrecoverable".
 *   4. Every deploy and every repair is appended to a deploy history log.
 *
 * Make-before-break (CLAUDE.md): the snapshot is made and verified readable before
 * the reset runs; a snapshot failure aborts the repair.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');

const HISTORY_DIR = 'logs';
const HISTORY_FILE = 'deploy-history.jsonl';
const SNAPSHOT_DIR = path.join('logs', 'repair-snapshots');
const SNAPSHOT_REF_PREFIX = 'refs/repair-snapshots';
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes — repair is a fallback to a failure you just saw
const HISTORY_MAX_LINES = 500;

function machineName() {
  return process.env.MACHINE_NAME || os.hostname();
}

function sh(cmd, projectDir, timeout = 30000) {
  return execSync(cmd, { cwd: projectDir, encoding: 'utf-8', timeout }).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Repair tokens — guardrail (1): repair only exists after a failed deploy
// ─────────────────────────────────────────────────────────────────────────────

/** token -> { issuedAt, reason } — in-memory by design: a token dies with the process. */
const repairTokens = new Map();

function issueRepairToken(reason) {
  const token = crypto.randomBytes(16).toString('hex');
  repairTokens.set(token, { issuedAt: Date.now(), reason: reason || 'deploy failed' });
  // opportunistic sweep
  for (const [t, meta] of repairTokens) {
    if (Date.now() - meta.issuedAt > TOKEN_TTL_MS) repairTokens.delete(t);
  }
  return token;
}

/**
 * Single-use consumption. Returns { ok } or { ok: false, error } — never throws,
 * so the caller can turn it straight into a 409.
 */
function consumeRepairToken(token) {
  if (!token) return { ok: false, error: 'No repair token — Repair is only available after a deploy has failed on this machine.' };
  const meta = repairTokens.get(token);
  if (!meta) return { ok: false, error: 'Unknown or already-used repair token — run Deploy again and repair from that failure.' };
  repairTokens.delete(token);
  if (Date.now() - meta.issuedAt > TOKEN_TTL_MS) {
    return { ok: false, error: 'Repair token expired — run Deploy again and repair from that failure.' };
  }
  return { ok: true, reason: meta.reason };
}

function hasLiveRepairToken() {
  for (const meta of repairTokens.values()) {
    if (Date.now() - meta.issuedAt <= TOKEN_TTL_MS) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deploy history — guardrail (4): the audit trail
// ─────────────────────────────────────────────────────────────────────────────

function historyPath(projectDir) {
  return path.join(projectDir, HISTORY_DIR, HISTORY_FILE);
}

/** Appends one JSONL row. Never throws — an audit-log failure must not fail a deploy. */
function logDeployEvent(projectDir, event) {
  const row = {
    at: new Date().toISOString(),
    machine: machineName(),
    ...event
  };
  try {
    const file = historyPath(projectDir);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(row) + '\n');
    trimHistory(file);
  } catch (err) {
    console.error('[DeployHistory] Failed to write:', err.message);
  }
  return row;
}

function trimHistory(file) {
  try {
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    if (lines.length > HISTORY_MAX_LINES) {
      fs.writeFileSync(file, lines.slice(-HISTORY_MAX_LINES).join('\n') + '\n');
    }
  } catch { /* best effort */ }
}

function readDeployHistory(projectDir, limit = 50) {
  try {
    const lines = fs.readFileSync(historyPath(projectDir), 'utf-8').split('\n').filter(Boolean);
    return lines.slice(-limit).reverse().map(l => {
      try { return JSON.parse(l); } catch { return { at: null, malformed: l }; }
    });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety snapshot — guardrail (3): discarded never means unrecoverable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Captures, BEFORE anything is reset:
 *   - refs/repair-snapshots/<stamp>  a real commit holding HEAD + tracked dirty state
 *   - logs/repair-snapshots/<stamp>.bundle  the same, as a portable git bundle
 *   - logs/repair-snapshots/<stamp>-untracked.tar.gz  untracked-but-not-ignored files
 *   - logs/repair-snapshots/<stamp>.json  status, branch, HEAD, stash list, recovery commands
 *
 * Ignored files (.env, node_modules, logs) are NOT snapshotted — `git clean` is run
 * without -x precisely so they are never touched in the first place.
 * Existing stashes survive a hard reset untouched; they are recorded for the record.
 *
 * Throws on failure — a repair that cannot snapshot must not proceed.
 */
function captureSafetySnapshot(projectDir, { stamp, addLog = () => {} } = {}) {
  const id = stamp || new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(projectDir, SNAPSHOT_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  const head = sh('git rev-parse HEAD', projectDir);
  const branch = sh('git rev-parse --abbrev-ref HEAD', projectDir);
  const status = sh('git status --porcelain', projectDir);
  let stashes = '';
  try { stashes = sh('git stash list', projectDir); } catch { /* no stashes */ }

  // `git stash create` builds a commit object from the dirty tree WITHOUT touching
  // the working tree or the stash list. Empty output = nothing tracked is dirty.
  let snapshotCommit = '';
  try { snapshotCommit = sh('git stash create "repair snapshot ' + id + '"', projectDir); } catch { snapshotCommit = ''; }
  const refTarget = snapshotCommit || head;
  const ref = `${SNAPSHOT_REF_PREFIX}/${id}`;
  sh(`git update-ref ${ref} ${refTarget}`, projectDir);

  const bundlePath = path.join(outDir, `${id}.bundle`);
  sh(`git bundle create ${JSON.stringify(bundlePath)} ${ref} HEAD 2>&1`, projectDir, 120000);
  if (!fs.existsSync(bundlePath) || fs.statSync(bundlePath).size === 0) {
    throw new Error(`Safety snapshot bundle missing or empty at ${bundlePath} — aborting repair`);
  }

  // Untracked-but-not-ignored files: `git stash create` does not carry these.
  let untrackedPath = null;
  const untracked = sh('git ls-files --others --exclude-standard', projectDir)
    .split('\n').map(s => s.trim()).filter(Boolean);
  if (untracked.length) {
    untrackedPath = path.join(outDir, `${id}-untracked.tar.gz`);
    const listFile = path.join(outDir, `${id}-untracked.list`);
    fs.writeFileSync(listFile, untracked.join('\n') + '\n');
    sh(`tar czf ${JSON.stringify(untrackedPath)} -T ${JSON.stringify(listFile)}`, projectDir, 120000);
    if (!fs.existsSync(untrackedPath) || fs.statSync(untrackedPath).size === 0) {
      throw new Error(`Safety snapshot of untracked files failed at ${untrackedPath} — aborting repair`);
    }
  }

  const manifest = {
    id,
    at: new Date().toISOString(),
    machine: machineName(),
    branch,
    head,
    snapshot_ref: ref,
    snapshot_commit: refTarget,
    dirty_files: status ? status.split('\n').length : 0,
    status,
    untracked_count: untracked.length,
    stash_list: stashes,
    bundle: path.relative(projectDir, bundlePath),
    untracked_archive: untrackedPath ? path.relative(projectDir, untrackedPath) : null,
    recovery: [
      `git show ${refTarget}                      # what was discarded`,
      `git stash apply ${refTarget}               # put the tracked changes back`,
      untrackedPath ? `tar xzf ${path.relative(projectDir, untrackedPath)}   # restore untracked files` : null,
      `git bundle verify ${path.relative(projectDir, bundlePath)}  # portable copy, survives ref GC`
    ].filter(Boolean)
  };
  const manifestPath = path.join(outDir, `${id}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  manifest.manifest = path.relative(projectDir, manifestPath);

  addLog(`Safety snapshot ${id}: ${manifest.dirty_files} dirty file(s), ${untracked.length} untracked, ref ${ref}`);
  return manifest;
}

// ─────────────────────────────────────────────────────────────────────────────
// The reset itself
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Force the checkout to exactly match origin/<branch>.
 * `git clean -fd` deliberately omits -x: ignored files (.env, node_modules, logs,
 * and the snapshots we just wrote) are left alone.
 */
function forceResetToOrigin(projectDir, { branch = 'main', addLog = () => {} } = {}) {
  addLog(`Fetching origin...`);
  const fetchOut = sh('git fetch origin --prune 2>&1', projectDir, 120000);
  if (fetchOut) addLog(`git fetch: ${fetchOut}`);

  const target = `origin/${branch}`;
  const targetSha = sh(`git rev-parse ${target}`, projectDir);

  addLog(`Force-checking out ${branch} at ${target} (${targetSha.slice(0, 8)})...`);
  sh(`git checkout -f -B ${branch} ${target} 2>&1`, projectDir, 60000);
  sh(`git reset --hard ${target} 2>&1`, projectDir, 60000);

  addLog('Cleaning untracked files (ignored files such as .env are kept)...');
  const cleaned = sh('git clean -fd 2>&1', projectDir, 60000);
  if (cleaned) addLog(`git clean: ${cleaned.split('\n').length} path(s) removed`);

  const head = sh('git rev-parse HEAD', projectDir);
  if (head !== targetSha) {
    throw new Error(`Repair verification failed: HEAD is ${head}, expected ${targetSha}`);
  }
  const residue = sh('git status --porcelain', projectDir);
  addLog(`Checkout now matches ${target} at ${head.slice(0, 8)}${residue ? ` (residue: ${residue.split('\n').length} path(s))` : ' — clean'}`);

  return { branch, target, head, cleaned_paths: cleaned ? cleaned.split('\n').filter(Boolean) : [], residue };
}

module.exports = {
  issueRepairToken,
  consumeRepairToken,
  hasLiveRepairToken,
  logDeployEvent,
  readDeployHistory,
  captureSafetySnapshot,
  forceResetToOrigin,
  historyPath,
  TOKEN_TTL_MS,
  SNAPSHOT_DIR
};
