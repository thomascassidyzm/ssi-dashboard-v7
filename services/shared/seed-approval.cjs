// services/shared/seed-approval.cjs
//
// UNAPPROVE SEEDS as course-edit ops (Tom 2026-10-14, r-2026-10-14-kai-is-team-
// his-agents-get). Sets approved_at = NULL on the named seeds and touches
// nothing else: decomposed_at, the LEGOs and every phrase's decomposition stay,
// unlike the build lane's redo/rebuild which wipe them. The undo (re-stamping the
// old approved_at) is derived by the edit engine.

const MAX_SEEDS = 2000;

/** @returns {{seeds: number[]}} deduped, validated; throws Error with .status 400 */
function parseSeedList(raw) {
  if (!Array.isArray(raw) || !raw.length) throw badRequest('"seeds" must be a non-empty array of seed numbers');
  const seeds = [...new Set(raw.map((s) => Number(String(s).replace(/^S/i, ''))))];
  if (seeds.some((n) => !Number.isInteger(n) || n < 1)) throw badRequest('every seed must be a positive integer (or "S0042")');
  if (seeds.length > MAX_SEEDS) throw badRequest(`at most ${MAX_SEEDS} seeds per request`);
  return seeds.sort((a, b) => a - b);
}

function badRequest(message) { const e = new Error(message); e.status = 400; e.code = 'BAD_REQUEST'; return e; }

function planUnapprove(seeds) {
  return seeds.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } }));
}

module.exports = { parseSeedList, planUnapprove, MAX_SEEDS };
