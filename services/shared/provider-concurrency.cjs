'use strict';
// ONE limiter per provider for the whole process (job #394, Tom 2026-10-24: "are we using full concurrency in the Popty
// process? We have 15 on Cartesia"). Every Cartesia call in the estate goes through speak() (tts-service.cjs), and every
// course render goes through phase8's /render, so a limiter held HERE is the one real count of requests in flight —
// shared by all callers (four zho units at once, phase8's own bulk /generate at AUDIO_CONCURRENCY=20, anything else).
// Callers may oversubscribe freely; the excess waits here instead of reaching Cartesia.
//
// The 15 is Cartesia's concurrency limit for our account, as Tom stated it (one API key, CARTESIA_API_KEY, so per key =
// per plan for us). CARTESIA_MAX_CONCURRENCY overrides it.
//
// A 429 is a BACKOFF signal, not a failure: Cartesia refused the request before generating anything, so no audio exists
// and nothing was billed. The same request is re-sent under the SAME spend-guard reservation — one reservation still
// stands for at most one billed render, so the guard, the daily cap and the repeat limit see exactly what they saw
// before. Meanwhile the cap shrinks by one (never below 1) and creeps back by one after RECOVER_AFTER clean calls.
const LIMITS = { cartesia: () => Number(process.env.CARTESIA_MAX_CONCURRENCY) || 15 };
const RECOVER_AFTER = 20;
const MAX_429_RESENDS = 6;

const is429 = (e) => /\(429\)/.test(String((e && e.message) || e));

function createLimiter(name, max, { wait = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  const s = { name, max, cap: max, inFlight: 0, peak: 0, waiting: 0, calls: 0, throttled: 0, clean: 0 };
  const queue = [];
  const pump = () => { while (s.inFlight < s.cap && queue.length) { s.inFlight++; s.waiting--; s.peak = Math.max(s.peak, s.inFlight); queue.shift()(); } };
  const acquire = () => new Promise((res) => { s.waiting++; queue.push(res); pump(); });
  const release = () => { s.inFlight--; pump(); };

  async function run(fn) {
    for (let resend = 0; ; resend++) {
      await acquire();
      let err = null, out;
      try { out = await fn(); } catch (e) { err = e; } finally { release(); }
      s.calls++;
      if (!err) {
        if (++s.clean >= RECOVER_AFTER && s.cap < s.max) { s.cap++; s.clean = 0; pump(); }
        if (s.calls % 50 === 0) log(`[limiter] ${name} in flight ${s.inFlight}/${s.cap} (max ${s.max}), peak ${s.peak}, waiting ${s.waiting}, calls ${s.calls}, 429s ${s.throttled}`);
        return out;
      }
      if (!is429(err) || resend >= MAX_429_RESENDS) throw err;
      s.throttled++; s.clean = 0;
      s.cap = Math.max(1, s.cap - 1);
      log(`[limiter] ${name} 429 — cap now ${s.cap}, re-sending (${resend + 1}/${MAX_429_RESENDS}); nothing was billed`);
      await wait(Math.min(30000, 1000 * 2 ** resend) * (0.5 + Math.random() / 2));
    }
  }
  return { run, stats: () => ({ ...s }) };
}

const limiters = {};
/** Run fn holding one of the provider's slots; providers without a limit run straight through. */
function withProviderSlot(provider, fn) {
  if (!LIMITS[provider]) return fn();
  if (!limiters[provider]) limiters[provider] = createLimiter(provider, LIMITS[provider]());
  return limiters[provider].run(fn);
}
const providerConcurrencyStats = () => Object.fromEntries(Object.entries(limiters).map(([k, l]) => [k, l.stats()]));

module.exports = { withProviderSlot, providerConcurrencyStats, createLimiter, is429 };
