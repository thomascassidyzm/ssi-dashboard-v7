#!/usr/bin/env node
/**
 * TTS bake-off runner.
 *
 * Run from the repo root (that is where dotenv and node_modules resolve):
 *
 *   node tools/tts-bakeoff/run-bakeoff.cjs \
 *     --utterances tools/tts-bakeoff/data/utterances-fixture.json \
 *     --provider azure --voice cy-GB-NiaNeural \
 *     --out $CS_SCRATCH/harness/out/azure
 *
 * DRY RUN IS THE DEFAULT AND IT SPENDS NOTHING. It resolves the request that
 * WOULD have been sent, writes the full metadata sidecar, and writes a
 * deterministic placeholder tone in place of audio. --live is required to call
 * anything, and even --live is refused unless PHASE2_SPEND_APPROVED=1 is set by
 * a human who has cleared the approval gate. Phase 1 of this bake-off spends
 * zero; that is the brief, and the code enforces it rather than trusting me.
 *
 * Docs: docs/tts-bakeoff/harness-design-2026-08-26.md
 */
const fs = require('fs');
const path = require('path');

// Credentials live in the repo-root .env, which is why this must be run from the
// repo root. Without this, XAI/AZURE/ELEVENLABS read as missing and the harness
// reports "no credential" for keys that are sitting right there — a false gap,
// and a false gap is exactly the kind of thing that poisons a phase-2 handover.
try { require('dotenv').config(); } catch (_) { /* dotenv absent: env-only mode */ }

const registry = require('./lib/registry.cjs');
const { missingEnv } = require('./lib/adapter-utils.cjs');
const { placeholderWav, sha256 } = require('./lib/audio.cjs');

const HARNESS_VERSION = '1.0.0';

function parseArgs(argv) {
  const out = { live: false, repeat: null, seed: null, temperature: null, opts: {} };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--utterances': out.utterances = next(); break;
      case '--provider': out.provider = next(); break;
      case '--voice': out.voice = next(); break;
      case '--out': out.out = next(); break;
      case '--live': out.live = true; break;
      case '--seed': out.seed = Number(next()); break;
      case '--temperature': out.temperature = Number(next()); break;
      case '--repeat': out.repeat = Number(next()); break;
      case '--model': out.model = next(); break;
      case '--language': out.language = next(); break;
      case '--limit': out.limit = Number(next()); break;
      case '--help': case '-h': out.help = true; break;
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    }
  }
  return out;
}

const USAGE = `
tts bake-off runner (dry-run by default — spends nothing)

  --utterances <path>   utterance-set JSON (schema_version 1)
  --provider <id>       ${registry.IDS.join(' | ')}
  --voice <id>          provider voice id / voice name / reference clip path
  --out <dir>           output directory (created)
  --live                actually call the provider. STILL blocked in phase 1
                        unless PHASE2_SPEND_APPROVED=1 is exported.
  --seed <n>            seed, where the provider has one
  --temperature <x>     temperature, where the provider has one
  --repeat <n>          override every utterance's repeat_count
  --model <id>          override the provider's default model / snapshot id
  --language <code>     override the utterance language
  --limit <n>           only process the first n utterances (smoke tests)
`;

function loadUtteranceSet(p) {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (raw.schema_version !== 1) {
    throw new Error(`utterance set ${p}: schema_version ${raw.schema_version}, expected 1`);
  }
  if (!Array.isArray(raw.utterances) || !raw.utterances.length) {
    throw new Error(`utterance set ${p}: no utterances`);
  }
  for (const u of raw.utterances) {
    if (!u.id || !u.text) throw new Error(`utterance set ${p}: an utterance is missing id or text`);
    if (!u.language) u.language = raw.language;
    if (u.repeat_count == null) u.repeat_count = 1;
  }
  return raw;
}

/** Stable key order so identical requests serialise identically — the hash depends on it. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, k) => { acc[k] = canonical(value[k]); return acc; }, {});
  }
  return value;
}
const canonicalJSON = (v) => JSON.stringify(canonical(v));

function extOf(req) {
  if (req.bodyKind === 'ssml') return 'mp3';
  const b = req.body || {};
  return (
    (b.output_format && b.output_format.codec) ||
    (b.output_format && b.output_format.container) ||
    (b.audio_setting && b.audio_setting.format) ||
    b.response_format ||
    'mp3'
  );
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.utterances || !args.provider || !args.out) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }

  const adapter = registry.load(args.provider);
  const set = loadUtteranceSet(args.utterances);
  const runStartedAt = new Date().toISOString();
  const runId = `${adapter.id}-${runStartedAt.replace(/[:.]/g, '-')}`;

  const outDir = path.resolve(args.out);
  const audioDir = path.join(outDir, 'audio');
  const metaDir = path.join(outDir, 'metadata');
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });

  const baseOpts = {
    voice: args.voice,
    live: args.live,
    seed: args.seed,
    temperature: args.temperature,
    model: args.model,
    language: args.language,
  };

  // Gate-zero check up front: say it loudly, once, and keep going. A provider
  // that has no Welsh still gets a dry run — the request shape is still worth
  // reviewing — but nobody should read the output without seeing this.
  const langs = [...new Set(set.utterances.map((u) => u.language))];
  const gateZero = langs.map((l) => ({ language: l, ...adapter.languageSupport(l) }));
  for (const g of gateZero) {
    if (g.supported === false) console.error(`GATE ZERO — ${adapter.displayName} does not list ${g.language}: ${g.note}`);
    else if (g.supported === null) console.error(`gate zero UNKNOWN — ${adapter.displayName} / ${g.language}: ${g.note}`);
  }

  if (!args.live) {
    console.error(`DRY RUN — no provider will be called, nothing will be spent. Placeholder tones stand in for audio.`);
  }

  const utterances = args.limit ? set.utterances.slice(0, args.limit) : set.utterances;
  const renders = [];
  let ok = 0, failed = 0;

  for (const u of utterances) {
    const repeats = args.repeat != null ? args.repeat : (u.repeat_count || 1);
    for (let r = 1; r <= repeats; r++) {
      const opts = { ...baseOpts, warnings: [] };
      let req = null, err = null;
      try {
        req = adapter.buildRequest(u, opts);
      } catch (e) {
        err = e;
      }

      const stem = `${adapter.id}__${u.id}__r${String(r).padStart(2, '0')}`;
      const requestJson = req ? canonicalJSON({ endpoint: req.endpoint, method: req.method, headers: req.headers, body: req.body }) : null;
      let audioPath = null, audioSha = null, audioBytes = null, providerMeta = null, placeholder = false;

      if (req && !err) {
        try {
          if (args.live) {
            const result = await adapter.synthesise(u, opts);
            const buf = result.audioBuffer;
            audioPath = path.join(audioDir, `${stem}.${extOf(req)}`);
            fs.writeFileSync(audioPath, buf);
            audioSha = sha256(buf);
            audioBytes = buf.length;
            providerMeta = result.metadata || null;
          } else {
            const buf = placeholderWav(requestJson, u.text);
            audioPath = path.join(audioDir, `${stem}.placeholder.wav`);
            fs.writeFileSync(audioPath, buf);
            audioSha = sha256(buf);
            audioBytes = buf.length;
            placeholder = true;
          }
          ok++;
        } catch (e) {
          err = e;
          failed++;
        }
      } else {
        failed++;
      }

      const meta = {
        harness_version: HARNESS_VERSION,
        run_id: runId,
        timestamp: new Date().toISOString(),

        provider: adapter.id,
        provider_display_name: adapter.displayName,
        provider_role: adapter.role,
        product_model: (req && req.body && (req.body.model || req.body.model_id || req.body.model_repo)) || args.model || null,
        // The pinning story is the thing we are testing. null is an ANSWER here,
        // not a hole — it means the vendor will not let us pin, and the note says so.
        model_version_or_snapshot_id: resolveSnapshot(adapter, req, args),
        model_version_note: adapter.versionPinningNote,
        supports_version_pinning: adapter.supportsVersionPinning,

        voice_id: args.voice || null,
        seed: args.seed,
        seed_supported: adapter.supportsSeed,
        temperature: args.temperature,
        temperature_supported: adapter.supportsTemperature,
        settings_sent: req ? req.body : null,
        options_requested_but_unsupported: (req && req.unsupportedOptions) || [],
        adapter_notes: (req && req.notes) || [],
        warnings: opts.warnings || [],

        request: req ? { transport: req.transport, endpoint: req.endpoint, method: req.method, headers: req.headers, body: req.body, body_kind: req.bodyKind || 'json', response_kind: req.responseKind } : null,
        // Hash of the exact request. Two runs with the same request_sha256 SHOULD
        // produce the same audio_sha256 on a repeatable provider; where they do
        // not, that difference is the axis-E finding.
        request_sha256: requestJson ? sha256(Buffer.from(requestJson)) : null,

        utterance_id: u.id,
        utterance_text: u.text,
        utterance_category: u.category || null,
        utterance_language: u.language,
        utterance_provenance: u.provenance || null,
        repeat_index: r,
        repeat_total: repeats,

        dry_run: !args.live,
        audio_is_placeholder: placeholder,
        output_file: audioPath ? path.relative(outDir, audioPath) : null,
        audio_sha256: audioSha,
        audio_bytes: audioBytes,
        provider_response_metadata: providerMeta,

        gate_zero: gateZero.find((g) => g.language === u.language) || null,
        error: err ? { message: err.message, code: err.code || null } : null,
      };

      fs.writeFileSync(path.join(metaDir, `${stem}.json`), JSON.stringify(meta, null, 2));
      renders.push(meta);
      if (err) console.error(`  FAIL ${stem}: ${err.message}`);
    }
  }

  // Repeatability roll-up: for each (utterance, request) the distinct audio hashes.
  const byRequest = new Map();
  for (const m of renders) {
    if (!m.audio_sha256) continue;
    const k = `${m.utterance_id}|${m.request_sha256}`;
    if (!byRequest.has(k)) byRequest.set(k, { utterance_id: m.utterance_id, request_sha256: m.request_sha256, renders: 0, hashes: new Set() });
    const e = byRequest.get(k);
    e.renders++; e.hashes.add(m.audio_sha256);
  }
  const repeatability = [...byRequest.values()].map((e) => ({
    utterance_id: e.utterance_id,
    request_sha256: e.request_sha256,
    renders: e.renders,
    distinct_audio_sha256: e.hashes.size,
    byte_identical: e.hashes.size === 1,
  }));

  const manifest = {
    harness_version: HARNESS_VERSION,
    run_id: runId,
    started_at: runStartedAt,
    finished_at: new Date().toISOString(),
    dry_run: !args.live,
    provider: adapter.id,
    provider_role: adapter.role,
    provider_stubbed: Boolean(adapter.stubbed),
    provider_stub_reason: adapter.stubReason || null,
    // Recorded per run so a phase-2 reader can see which gaps were real ON THE
    // DAY rather than inferring them from a doc that has since gone stale.
    required_env: adapter.requiredEnv || [],
    missing_env: missingEnv(adapter),
    voice_id: args.voice || null,
    seed: args.seed,
    temperature: args.temperature,
    utterance_set: path.relative(process.cwd(), path.resolve(args.utterances)),
    utterance_set_language: set.language,
    utterance_set_source: set.source,
    counts: { renders: renders.length, ok, failed },
    gate_zero: gateZero,
    repeatability,
    adapter_docs: adapter.docs || [],
  };
  fs.writeFileSync(path.join(outDir, 'run-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n${adapter.displayName}`);
  console.log(`  mode        : ${args.live ? 'LIVE' : 'dry-run (nothing spent)'}`);
  console.log(`  renders     : ${renders.length}  ok ${ok}  failed ${failed}`);
  console.log(`  pinning     : ${adapter.supportsVersionPinning}  seed ${adapter.supportsSeed}  temperature ${adapter.supportsTemperature}`);
  console.log(`  out         : ${outDir}`);
  for (const rr of repeatability.filter((x) => x.renders > 1)) {
    console.log(`  repeat probe: ${rr.utterance_id} — ${rr.renders} renders, ${rr.distinct_audio_sha256} distinct sha256 (${rr.byte_identical ? 'byte-identical' : 'NOT byte-identical'})`);
  }
  if (failed) process.exitCode = 1;
}

function resolveSnapshot(adapter, req, args) {
  if (!req) return null;
  const b = req.body || {};
  if (adapter.id === 'cartesia') return `${b.model_id} + Cartesia-Version:${req.headers['Cartesia-Version']}`;
  if (adapter.id === 'openai') return b.model || null;
  if (adapter.id === 'minimax') return b.model || null;
  if (adapter.id === 'elevenlabs') return b.model_id || null;
  if (adapter.id === 'chatterbox') return b.model_revision ? `${b.model_repo}@${b.model_revision}` : `${b.model_repo}@UNPINNED`;
  return null;   // azure and xai: the vendor exposes nothing to pin. See versionPinningNote.
}

main().catch((e) => { console.error(`\nFATAL: ${e.message}`); process.exit(1); });
