'use strict';

/*
 * windowedRead — keep a nightly aggregate inside the 5 s statement cap WITHOUT raising it.
 *
 * A grouped scan over one whole course can be a second at 5k rows and thirty at 100k. Rather than
 * lift the cap, this runs `run(predicate)` for the whole scope first and, only if the backend
 * cancels it (57014), re-runs it as `seed_number` windows, halving any window that is still too big
 * down to a single value. Windows partition the key space exactly (NULL has a window of its own),
 * so ADDITIVE results — counts, sums, groups whose key contains the window column — merge without
 * loss. Callers merge; this returns one result per leaf window.
 *
 * `memo` (a Set the caller keeps for the run) remembers scopes that already timed out whole, so a
 * big course costs one cancelled statement per run, not one per table or column.
 */

const FLOOR = -1e9;
const CEIL = 1e9;
const STEP = 50;
const TOP = 1001;

const isTimeout = (e) => !!e && e.code === '57014';

function baseWindows() {
  const w = [{ nulls: true }, { lo: FLOOR, hi: 1 }];
  for (let lo = 1; lo < TOP; lo += STEP) w.push({ lo, hi: lo + STEP });
  w.push({ lo: TOP, hi: CEIL });
  return w;
}

const predicateOf = (column, w) => (w.nulls ? `${column} is null` : `(${column} >= ${w.lo} and ${column} < ${w.hi})`);

function split(w) {
  const mid = w.hi - w.lo > 2000 ? w.lo + 1000 : w.lo + Math.floor((w.hi - w.lo) / 2);
  return [{ lo: w.lo, hi: mid }, { lo: mid, hi: w.hi }];
}

async function runWindow(run, column, w, out) {
  try { out.push(await run(predicateOf(column, w))); }
  catch (e) {
    if (!isTimeout(e) || w.nulls || w.hi - w.lo <= 1) throw e;
    for (const half of split(w)) await runWindow(run, column, half, out);
  }
}

/**
 * @param {(predicate: string|null) => Promise<any>} run  one capped statement; predicate is a SQL boolean on `column`, or null for the whole scope
 * @param {{column?: string|null, memo?: Set<string>, key?: string}} opts  column null = this shape cannot be windowed, so a timeout is final
 * @returns {Promise<any[]>} one result per leaf window (a single result when the whole scope fit)
 */
async function windowedRead(run, { column = 'seed_number', memo = null, key = '' } = {}) {
  if (!column) return [await run(null)];
  if (!(memo && memo.has(key))) {
    try { return [await run(null)]; }
    catch (e) { if (!isTimeout(e)) throw e; if (memo) memo.add(key); }
  }
  const out = [];
  for (const w of baseWindows()) await runWindow(run, column, w, out);
  return out;
}

/**
 * batchedRead — many small scopes per statement, so the 4 round trips a bounded statement costs (BEGIN, SET, query, COMMIT) are paid
 * once per batch, not once per course. On prod that overhead is ~0.6 s a statement and a per-course walk of ~130 courses x 7
 * statements blew the 10-minute run cap. A batch the backend cancels is halved; a single item that is still cancelled falls through
 * to `single(item)` (the caller's windowedRead). Results are returned flat, in no particular order.
 * @param {any[]} items  scopes (course codes)
 * @param {(items: any[]) => Promise<any>} run  one capped statement over a batch
 * @param {(item: any) => Promise<any[]>} single  the per-scope fallback, itself returning an array of results
 */
async function batchedRead(items, run, single, { size = 16 } = {}) {
  const out = [];
  async function go(batch) {
    if (batch.length === 1) { out.push(...await single(batch[0])); return; }
    try { out.push(await run(batch)); }
    catch (e) {
      if (!isTimeout(e)) throw e;
      const mid = Math.ceil(batch.length / 2);
      await go(batch.slice(0, mid)); await go(batch.slice(mid));
    }
  }
  for (let i = 0; i < items.length; i += size) await go(items.slice(i, i + size));
  return out;
}

module.exports = { batchedRead, windowedRead, predicateOf, baseWindows, isTimeout };
