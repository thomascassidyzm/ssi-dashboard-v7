/**
 * Resemble Chatterbox — CANDIDATE, and the odd one out: open source, self-hosted,
 * no vendor HTTP call and therefore NO PER-CLIP COST. It shells out to a local
 * python runner instead of an endpoint.
 *
 * Vendor sources fetched 2026-08-26:
 *   https://github.com/resemble-ai/chatterbox
 *   https://huggingface.co/ResembleAI/chatterbox
 *
 * Interface as documented:
 *   pip install chatterbox-tts
 *   from chatterbox.mtl_tts import ChatterboxMultilingualTTS
 *   model = ChatterboxMultilingualTTS.from_pretrained(device="cuda"|"cpu"|"mps")
 *   wav = model.generate(text, audio_prompt_path=..., language_id=...,
 *                        exaggeration=0.5, cfg_weight=0.5, temperature=...)
 *
 * SEED: generate() takes NO seed argument. Reproducibility is obtained by
 * seeding the process RNGs before the call (torch.manual_seed / numpy / random),
 * which is what the reference Gradio app does. So seed IS first-class for us —
 * we own the runner — but it is a PROCESS-level seed, not a request field, and
 * that distinction belongs in the axis-E write-up.
 *
 * GATE ZERO: the published 23-language list is
 *   ar da de el en es fi fr he hi it ja ko ms nl no pl pt ru sv sw tr zh
 * Welsh is NOT in it. Chatterbox is therefore dead for canonical Welsh work
 * unless fine-tuning on Aran/Catrin's recordings is put on the table as its own
 * project — which is a different, much larger question than a bake-off.
 *
 * TWO HARD BLOCKERS ON THIS BOX (watson-1, verified 2026-08-26):
 *   - no GPU (Virtio display adapter only, no CUDA, no nvidia-smi)
 *   - Python 3.14.4 with NO pip and NO ensurepip; venv works but cannot
 *     bootstrap packages, so chatterbox-tts and torch cannot be installed here
 *     at all. This adapter can build its invocation, and can never run it here.
 */
const path = require('path');
const { noCredentialError, assertSpendAllowed } = require('../lib/adapter-utils.cjs');

const LANGS = 'ar da de el en es fi fr he hi it ja ko ms nl no pl pt ru sv sw tr zh'.split(' ');
const { shortLang } = require('../lib/adapter-utils.cjs');

module.exports = {
  id: 'chatterbox',
  displayName: 'Resemble Chatterbox (self-hosted)',
  role: 'candidate',
  requiredEnv: [],            // no key — it is open source
  requiredLocal: ['CHATTERBOX_PYTHON', 'CHATTERBOX_RUNNER'],
  stubbed: true,
  stubReason:
    'Self-hosted and free to call, but UNRUNNABLE on watson-1: no GPU/CUDA, and Python 3.14.4 here has no pip and ' +
    'no ensurepip, so chatterbox-tts + torch cannot be installed. This is a HARDWARE/ENVIRONMENT blocker, not a ' +
    'credential one — phase 2 needs a GPU box (or at minimum a python with pip) before Chatterbox can be heard at all.',
  supportsSeed: true,
  supportsTemperature: true,
  supportsVersionPinning: true,
  versionPinningNote:
    'The strongest pin in the whole shortlist, because the weights are ours: pin the HuggingFace repo id AND the ' +
    'commit revision (e.g. ResembleAI/Chatterbox-Multilingual-TTS@<sha>), plus the chatterbox-tts package version ' +
    'and the torch version. Nothing can change under us without us changing it. That is the argument FOR self-hosting ' +
    'and it should be scored honestly under axis F even though Welsh kills it under Gate Zero.',
  docs: ['https://github.com/resemble-ai/chatterbox', 'https://huggingface.co/ResembleAI/chatterbox'],
  languageSupport(iso3) {
    const code = shortLang(iso3);
    return {
      supported: LANGS.includes(code),
      note: LANGS.includes(code)
        ? `"${code}" is in the Chatterbox Multilingual 23-language list (fetched 2026-08-26).`
        : `"${code}" is NOT in the Chatterbox Multilingual 23-language list (fetched 2026-08-26). For cym this is a GATE ZERO failure.`,
    };
  },

  /**
   * Local transport. The "request" is an argv plus a JSON payload on stdin, and
   * it is recorded in metadata exactly like an HTTP body would be.
   */
  buildRequest(utterance, opts = {}) {
    const payload = {
      text: utterance.text,
      language_id: shortLang(utterance.language || opts.language),
      audio_prompt_path: opts.voice || null,   // reference clip = the "voice"
      exaggeration: opts.exaggeration != null ? opts.exaggeration : 0.5,
      cfg_weight: opts.cfgWeight != null ? opts.cfgWeight : 0.5,
      temperature: opts.temperature != null ? opts.temperature : 0.8,
      seed: opts.seed != null ? opts.seed : 0,   // 0 = unseeded, per the reference app
      device: opts.device || 'cuda',
      model_repo: opts.modelRepo || 'ResembleAI/Chatterbox-Multilingual-TTS',
      model_revision: opts.modelRevision || null,  // pin me in phase 2
      output_path: opts.outputPath || null,
    };
    const python = process.env.CHATTERBOX_PYTHON || 'python3';
    const runner = process.env.CHATTERBOX_RUNNER || path.join('tools', 'tts-bakeoff', 'runners', 'chatterbox_runner.py');
    return {
      transport: 'local',
      endpoint: `${python} ${runner}`,
      method: 'EXEC',
      argv: [python, runner, '--payload-stdin'],
      headers: {},
      body: payload,
      responseKind: 'local-file',
      notes: [
        'seed is applied by the runner via torch.manual_seed/np.random.seed/random.seed before generate(); ' +
          'chatterbox generate() itself takes no seed argument',
        'the runner script is NOT written in phase 1 — writing it would be pointless on a box that cannot install torch',
      ],
    };
  },

  async synthesise(utterance, opts = {}) {
    assertSpendAllowed(this, opts);
    const err = new Error(
      'no runtime: phase 2 blocker — Chatterbox needs a GPU host with a pip-capable python. ' +
      'watson-1 has neither (no CUDA; python 3.14.4 with no pip/ensurepip). Costs nothing to run, ' +
      'cannot be run here.'
    );
    err.code = 'NO_RUNTIME';
    err.provider = this.id;
    throw err;
  },
};
