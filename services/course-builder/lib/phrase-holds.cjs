/**
 * A LEGO THE GATE REFUSED TWICE IS HELD FOR A HUMAN, NOT REGENERATED (job #422·AD, Kai's go, 4 Nov 2026).
 *
 * generateLegoPhrases now makes at most two Opus calls per LEGO (MAX_GATE_RETRIES = 1): the first
 * attempt, then one retry that carries the gate's own reasons. A set still refused after that comes
 * back blocked. Without a hold, nothing stops a builder agent asking the door again for the same LEGO,
 * and every ask is two more full-prompt Opus calls on a LEGO that has already shown the model cannot
 * make it pass. So the door records the refusal here, and the next ask for the SAME LEGO (same course,
 * seed, index and, for a proposed LEGO, the same known|target text) is answered from this record with
 * `held: true` and no model call.
 *
 * A builder that re-designs the LEGO (different text) is asking about a different item and is not held.
 * A person clears a hold by calling the door with `"retry_held": true`; the builder brief tells agents
 * never to send it. GET /api/phrases/held/:courseCode lists what is waiting for review.
 *
 * Only GATE refusals are held: a not-new LEGO (P25) and a structural stop never call the model and
 * already carry their own answer and flag.
 *
 * Storage is an append-only JSONL file outside the tracked tree (evidence path; env
 * POPTY_PHRASE_HOLDS_FILE overrides), read once per process, so a hold survives a restart.
 */

const fs = require('fs');
const path = require('path');

function defaultFile() {
  if (process.env.POPTY_PHRASE_HOLDS_FILE) return process.env.POPTY_PHRASE_HOLDS_FILE;
  const { evidencePath } = require(path.join(__dirname, '../../../tools/lib/evidence-path.cjs'));
  return evidencePath('services/course-builder/phrase-holds.jsonl');
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** The identity of "the same LEGO" for a hold. */
function holdKey(courseCode, seed, lego, proposedLego) {
  const text = proposedLego ? `${norm(proposedLego.known)}|${norm(proposedLego.target)}` : '';
  return `${courseCode}:S${Number(seed)}L${Number(lego)}:${text}`;
}

/** Was this result refused by the gate after a model call (as opposed to a P25 / structural answer)? */
function isGateRefusal(result) {
  return !!(result && result.blocked && !result.stoppedFor && Array.isArray(result.attempts) && result.attempts.length > 0);
}

function createHoldStore(file = defaultFile()) {
  let holds = null; // key -> hold

  function load() {
    if (holds) return holds;
    holds = new Map();
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch (_) { return holds; }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        if (rec.released) holds.delete(rec.key); else holds.set(rec.key, rec);
      } catch (_) { /* a torn last line is skipped, never fatal */ }
    }
    return holds;
  }

  function append(rec) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, JSON.stringify(rec) + '\n');
    } catch (e) {
      // The in-memory hold still stands for this process; say that the durable copy did not land.
      console.error(`[phrase-holds] could not write ${file}: ${e.message} (hold kept in memory only)`);
    }
  }

  function find(courseCode, seed, lego, proposedLego) {
    return load().get(holdKey(courseCode, seed, lego, proposedLego)) || null;
  }

  function record(courseCode, seed, lego, proposedLego, result, pipeline) {
    const last = result.attempts[result.attempts.length - 1] || {};
    const rec = {
      key: holdKey(courseCode, seed, lego, proposedLego),
      course_code: courseCode, seed: Number(seed), lego: Number(lego), pipeline,
      lego_known: result.legoKnown ?? proposedLego?.known ?? null,
      lego_target: result.legoTarget ?? proposedLego?.target ?? null,
      held_at: new Date().toISOString(),
      attempts: result.attempts.length,
      failing_gates: result.gate?.failingGates || [],
      reasons: last.reasons || [],
      build: result.build || [], use: result.use || [],
    };
    load().set(rec.key, rec);
    append(rec);
    return rec;
  }

  function release(courseCode, seed, lego, proposedLego, by) {
    const key = holdKey(courseCode, seed, lego, proposedLego);
    if (!load().has(key)) return false;
    holds.delete(key);
    append({ key, released: true, released_at: new Date().toISOString(), by: by || null });
    return true;
  }

  function list(courseCode) {
    return [...load().values()].filter((h) => !courseCode || h.course_code === courseCode);
  }

  return { find, record, release, list, file };
}

let shared = null;
const phraseHolds = () => (shared ||= createHoldStore());

/** The door's answer for a held LEGO: the same shape as a blocked generation, and no model call. */
function heldAnswer(hold, pipeline) {
  return {
    ok: false, blocked: true, held: true, code: 'HELD_FOR_REVIEW', pipeline, model: null,
    course_code: hold.course_code, seed: hold.seed, lego: hold.lego,
    legoKnown: hold.lego_known, legoTarget: hold.lego_target,
    build: hold.build, use: hold.use, attempts: [],
    gate: { overallPass: false, failingGates: hold.failing_gates },
    hold,
    error: `held for review since ${hold.held_at}: the gate refused this LEGO's set ${hold.attempts} time(s), ` +
      'the last time with its reasons in front of the model. Do not call again and do not submit these phrases; ' +
      'leave this seed unsubmitted, say so in chat and move on. A person clears the hold with "retry_held": true.',
  };
}

module.exports = { createHoldStore, phraseHolds, holdKey, isGateRefusal, heldAnswer };
