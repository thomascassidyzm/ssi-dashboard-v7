// node:test — run with: node --test tools/frame-layer/v4/voice-gap-fill.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { planSlots, buildLinkOps, linkChunk } = require('./voice-gap-fill.cjs');

test('25 stale slots do not silently abandon the remaining valid slot', () => {
  const ops = buildLinkOps(Array.from({ length: 26 }, (_, i) => ({ id: `row-${i}`, role: 'known', audioId: `audio-${i}` })));
  const call = (method, url, body) => {
    if (body.ops[0].phrase_id !== 'row-25') {
      const err = new Error('drift');
      err.body = { code: 'DRIFT', index: 0 };
      throw err;
    }
    return { undo_file: 'undo.json' };
  };
  const result = linkChunk('fra_for_eng', ops, { call });
  assert.strictEqual(result.skipped.length, 25);
  assert.strictEqual(result.applied, 1);
});

test('voices the Bengali known side (Ananya only) but never touches a filled slot', () => {
  const rows = [{ id: 'a', known_text: 'আমি', target_text: 'I', known_audio_id: null, target1_audio_id: 'x', target2_audio_id: null }];
  const slots = planSlots('eng_for_ben', rows);
  assert.deepStrictEqual(slots.map(s => s.role), ['known', 'target2']);
  assert.strictEqual(slots[0].voiceId, 'cartesia_48b9e1de-e2fa-4914-8b32-31c437813548'); // Ananya
  assert.strictEqual(slots[1].voiceId, 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'); // Tom, male slot
});

test('French known in Tom, target1 female, target2 male', () => {
  const slots = planSlots('fra_for_eng', [{ id: 'b', known_text: 'I want', target_text: 'je veux' }]);
  assert.deepStrictEqual(slots.map(s => [s.role, s.text]), [['known', 'I want'], ['target1', 'je veux'], ['target2', 'je veux']]);
});

test('Bengali known is Ananya for every line, never Rubel (Tom 2026-10-09)', () => {
  const rows = Array.from({ length: 40 }, (_, i) => ({ id: `r${i}`, known_text: `বাক্য ${i}`, target_text: `line ${i}`, target1_audio_id: 'x', target2_audio_id: 'y' }));
  const voices = new Set(planSlots('eng_for_ben', rows).filter(s => s.role === 'known').map(s => s.voiceId));
  assert.deepStrictEqual([...voices], ['cartesia_48b9e1de-e2fa-4914-8b32-31c437813548']);
});

// job #544: voice-gap-fill goes through Popty's doors, no direct database.
test('no direct database: the tool code names no database client and no SQL', () => {
  const src = require('fs').readFileSync(require.resolve('./voice-gap-fill.cjs'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/supabase|createClient|\.from\('|dotenv/i.test(code), 'found a direct-database trace');
});

test('a link is fill-only: each op pins its slot column to NULL', () => {
  const ops = buildLinkOps([{ id: 'fra_for_eng:S0012L01U05', role: 'target2', audioId: 'aud-1' }, { id: 'x:S1L1B1', role: 'known', audioId: 'aud-2' }]);
  assert.deepStrictEqual(ops[0], { op: 'audio.link', target: 'phrase', phrase_id: 'fra_for_eng:S0012L01U05', slot: 'target2', audio_id: 'aud-1', expect: { target2_audio_id: null } });
  assert.deepStrictEqual(ops[1].expect, { known_audio_id: null });
});

test('previews before it applies, and drops only the op the door refuses (a slot filled since the read)', () => {
  const ops = buildLinkOps([1, 2, 3].map(n => ({ id: `c:S1L1U0${n}`, role: 'known', audioId: `a${n}` })));
  const calls = [];
  const call = (method, url, body) => {
    calls.push({ url, apply: body.apply, n: body.ops.length });
    if (!body.apply && body.ops.some(o => o.phrase_id === 'c:S1L1U02')) {
      const err = new Error('drift');
      err.body = { code: 'DRIFT', index: body.ops.findIndex(o => o.phrase_id === 'c:S1L1U02'), error: 'before-state drift' };
      throw err;
    }
    return body.apply ? { undo_file: 'undo-1.json', event_id: 'ev' } : { ok: true };
  };
  const r = linkChunk('c_for_e', ops, { call });
  assert.strictEqual(r.applied, 2);
  assert.deepStrictEqual(r.skipped.map(s => [s.op.phrase_id, s.code]), [['c:S1L1U02', 'DRIFT']]);
  assert.deepStrictEqual(r.undoFiles, ['undo-1.json']);
  assert.deepStrictEqual(calls.map(c => [c.apply, c.n]), [[false, 3], [false, 2], [true, 2]]);
  assert.ok(calls.every(c => c.url === '/api/admin/course-edit/c_for_e/edit-batch'));
});

test('a refusal that is not about one op stops the run instead of being swallowed', () => {
  const call = () => { const e = new Error('nope'); e.body = { code: 'TOM_GO_REQUIRED' }; throw e; };
  assert.throws(() => linkChunk('c_for_e', buildLinkOps([{ id: 'c:S1L1U01', role: 'known', audioId: 'a' }]), { call }), /nope/);
});

test('more than 25 refusals still applies the remaining slot', () => {
  let refusals = 30;
  const result = linkChunk('c', Array.from({ length: 31 }, (_, id) => ({ id })), { call: (_m, _u, body) => {
    if (!body.apply && refusals-- > 0) { const e = new Error('drift'); e.body = { code: 'DRIFT', index: 0 }; throw e; }
    return {};
  } });
  assert.strictEqual(result.applied, 1);
  assert.strictEqual(result.skipped.length, 30);
});
