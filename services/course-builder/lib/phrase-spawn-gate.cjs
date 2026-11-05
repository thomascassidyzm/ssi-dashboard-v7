/**
 * ONE CAP ON CONCURRENT OPUS PHRASE SPAWNS, ACROSS EVERY COURSE BUILD (job #422·AD, Kai's go, 4 Nov 2026).
 *
 * On 4 Nov fry, jpn and kor built at once and Popty ran up to 31 Opus phrase sessions in parallel
 * (13-17 on a one-course day), emptying claude@'s week in about eight hours with no time for anybody
 * to react (Tom's Watson's forensics, /d/fb91abbf, finding 2). Nothing capped it: every builder's
 * curl to /api/phrases/v{3,4}/generate became a `claude --print --model opus` straight away, and the
 * builder brief tells each agent to fire a seed's LEGOs in parallel.
 *
 * Every Opus spawn that phrase-generation.cjs makes goes through this gate. The v3 and v4 doors both
 * live in course-builder-api.cjs, ONE process, so one in-process gate is global across builds.
 * (A tools/ script that requires phrase-generation.cjs directly runs in its own process and has its
 * own gate: that is a known hole, and none of those scripts was running on 4 Nov.)
 *
 * EXCESS WORK QUEUES, IT IS NEVER REFUSED. A call over the cap waits, first come first served, and
 * starts when a slot frees. The one exception is a caller that has gone away: a builder whose curl
 * gave up while queued is removed from the queue and never spawns, because an abandoned request that
 * still spends is exactly the waste this gate exists to stop.
 *
 * WHY 12 (env POPTY_PHRASE_SPAWN_CAP overrides it):
 *  - the low end of the forensics' 12-16: a normal one-course day peaked at 13-17 and cost ~$815,
 *    so 12 keeps a single build near its usual pace while three builds SHARE it instead of tripling it;
 *  - watson-1 is 8 cores / 30 GB with Popty's other services, the surface and its workers on it, and
 *    each spawn is a CLI process plus the Haiku frame-tagger calls that follow it; 12 leaves headroom;
 *  - one LEGO spends 1-2 spawns (MAX_GATE_RETRIES), so 12 slots is 6-12 LEGOs in flight at once.
 * Raise it with the env var on the unit if a human wants more; no code change needed.
 */

const DEFAULT_PHRASE_SPAWN_CAP = 12;

function capFromEnv(env = process.env) {
  const n = Number(env.POPTY_PHRASE_SPAWN_CAP);
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_PHRASE_SPAWN_CAP;
}

function clientGone(label) {
  const err = new Error(`phrase spawn gate: caller went away while queued${label ? ` (${label})` : ''} — not spawned`);
  err.code = 'CLIENT_GONE';
  return err;
}

/** A FIFO counting semaphore. Pure: no clock, no I/O, so the rule is testable without a model. */
function createSpawnGate(cap = DEFAULT_PHRASE_SPAWN_CAP) {
  let running = 0;
  let peakRunning = 0;
  let peakQueued = 0;
  const queue = []; // { start, reject, signal, onAbort }

  function next() {
    while (running < cap && queue.length) {
      const w = queue.shift();
      if (w.signal) w.signal.removeEventListener('abort', w.onAbort);
      w.start();
    }
  }

  /**
   * Run `fn` (which spawns one CLI) inside a slot. `signal` (an AbortSignal) drops a QUEUED call
   * when its HTTP caller disconnects; a call already running is left to finish.
   */
  function run(fn, { signal, label } = {}) {
    if (signal && signal.aborted) return Promise.reject(clientGone(label));
    return new Promise((resolve, reject) => {
      const start = () => {
        running += 1;
        if (running > peakRunning) peakRunning = running;
        Promise.resolve().then(fn).then(resolve, reject).finally(() => { running -= 1; next(); });
      };
      if (running < cap) return start();
      const w = { start, reject, signal, onAbort: null };
      if (signal) {
        w.onAbort = () => {
          const i = queue.indexOf(w);
          if (i !== -1) { queue.splice(i, 1); reject(clientGone(label)); }
        };
        signal.addEventListener('abort', w.onAbort, { once: true });
      }
      queue.push(w);
      if (queue.length > peakQueued) peakQueued = queue.length;
      console.log(`[phrase-spawn-gate] ${label || 'spawn'} queued: ${running}/${cap} running, ${queue.length} waiting`);
    });
  }

  function stats() {
    return { cap, running, queued: queue.length, peakRunning, peakQueued };
  }

  return { run, stats, cap };
}

const phraseSpawnGate = createSpawnGate(capFromEnv());

/**
 * An AbortSignal that fires when the HTTP caller hangs up before its answer was written, so a call
 * still QUEUED behind the cap is dropped instead of spending for nobody.
 */
function callerGoneSignal(res) {
  const ac = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ac.abort(); });
  return ac.signal;
}

module.exports = { DEFAULT_PHRASE_SPAWN_CAP, capFromEnv, createSpawnGate, phraseSpawnGate, callerGoneSignal };
