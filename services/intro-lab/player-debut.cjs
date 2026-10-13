/**
 * The player's debut, in numbers — a port of what ssi-learning-app does when it plays one LEGO's
 * intro cycle and debut cycle. READ-ONLY lab support; nothing here touches course data.
 *
 * Every rule below is copied from the player source, not guessed (function names are the player's):
 *   packages/core/src/script/voicePace.ts        targetPace, effectivePaceRatio, paceMultiplier, playbackSpeedForVoice
 *   packages/core/src/script/computePauseDuration.ts   computePauseDuration
 *   packages/player-vue/src/providers/toSimpleRounds.ts  courseVoiceSpeedFor, computeCycleSpeed, intro lingerMs 2000,
 *                                                        intro pauseDuration 0, debut pause = computePauseDuration
 *   packages/player-vue/src/components/LearningPlayer.vue  currentTargetSpeedConfig (where the inputs come from),
 *                                                        getPostVoice2GapMs (Easy holds a gap after voice2)
 * If the player's rule moves, player-debut.test.cjs holds the worked numbers that will say so.
 */
'use strict'

const MIN_SPEED = 0.7
const MAX_SPEED = 1.0
const INTRO_LINGER_MS = 2000 // toSimpleRounds: intro cycle lingerMs

const toNumber = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round2 = (n) => Math.round(n * 100) / 100
const round3 = (n) => Math.round(n * 1000) / 1000

/** Target language: Easy 0.80, Fast 0.90 of the language's reference pace. */
function targetPaceFor(mode) {
  return String(mode || '').toLowerCase() === 'fast' ? 0.9 : 0.8
}

function effectivePaceRatio(voice) {
  if (!voice) return null
  const pre = toNumber(voice.effectivePaceRatio)
  if (pre !== null) return pre > 0 ? pre : null
  const measured = toNumber(voice.naturalPaceRatio)
  if (measured === null || measured <= 0) return null
  const nudge = toNumber(voice.naturalPaceNudge)
  return nudge === null || nudge <= 0 ? measured : measured * nudge
}

/** The pace facts for one slot; a slot with none falls back to the other target slot (voicePaceForSlot). */
function voicePaceForSlot(pace, slot) {
  if (!pace || pace.unavailable) return null
  const direct = pace.roles && pace.roles[slot]
  if (direct && direct.primary) return direct.primary
  if (slot === 'target1' || slot === 'target2') {
    const other = pace.roles && pace.roles[slot === 'target1' ? 'target2' : 'target1']
    if (other && other.primary) return other.primary
  }
  return null
}

/** The inputs the player builds in currentTargetSpeedConfig(), from a course's voice_config. */
function targetSpeedConfigFrom(voiceConfig, voicePace, mode) {
  const vc = voiceConfig || {}
  const voices = vc.voices || vc
  const t1Speed = voices.target1 && voices.target1.settings && voices.target1.settings.speed
  const dbSpeed = vc.target_speed || {}
  return {
    globalSpeed: dbSpeed.global_speed ?? 1.0,
    nativeSpeed: (t1Speed === 1 || t1Speed === 1.0) && !!(voices.target1 && voices.target1.voiceId),
    mode: mode === 'fast' ? 'fast' : 'easy',
    voicePace,
    courseVoiceSpeed: {
      target1: (voices.target1 && voices.target1.playbackSpeed) ?? null,
      target2: (voices.target2 && voices.target2.playbackSpeed) ?? null,
    },
  }
}

/** computeCycleSpeed + explainCycleSpeed for one slot: the speed AND the reason, in words. */
function cycleSpeed(config, slot) {
  const base = config.globalSpeed ?? 1.0
  const ear = config.courseVoiceSpeed && config.courseVoiceSpeed[slot]
  if (typeof ear === 'number' && Number.isFinite(ear) && ear > 0) {
    const ratio = targetPaceFor(config.mode) / targetPaceFor('easy')
    return {
      speed: clamp(round2(base * ear * ratio), MIN_SPEED, base),
      reason: `the course sets ${slot} by ear: ${ear} on Easy${config.mode === 'fast' ? ', scaled to Fast' : ''}`,
    }
  }
  if (!config.nativeSpeed) {
    return { speed: base, reason: `legacy course (voices recorded slow) — played at the course base ${base}` }
  }
  const target = targetPaceFor(config.mode)
  const voice = voicePaceForSlot(config.voicePace, slot)
  const ratio = effectivePaceRatio(voice)
  let speed, reason
  if (ratio === null) {
    speed = clamp(target, MIN_SPEED, MAX_SPEED)
    reason = `target language on ${config.mode} = ${target}; this voice has no measured pace, so used uncorrected`
  } else {
    const raw = target / ratio
    speed = round3(clamp(raw, MIN_SPEED, MAX_SPEED))
    reason = `target ${target} on ${config.mode}, voice speaks at ${round3(ratio)}× reference → ${speed}`
  }
  return { speed: clamp(round2(base * speed), MIN_SPEED, base), reason }
}

/** computePauseDuration (core): k × the mean target clip length + a reaction beat, clamped. */
function computePauseDuration(t1Ms, t2Ms, cfg) {
  const a = t1Ms > 0 ? t1Ms : 0
  const b = t2Ms > 0 ? t2Ms : 0
  const answer = a > 0 || b > 0 ? Math.max(0, (a + b) / 2) : 2500
  const calc = (cfg.pause_k ?? 2.8) * answer + (cfg.pause_reaction_ms ?? 800)
  return Math.max(cfg.min_pause_ms ?? 1000, Math.min(cfg.max_pause_ms ?? 15000, Math.round(calc)))
}

/**
 * What the player does for one LEGO at its debut, as a list of clips to play in order.
 *   INTRO cycle : presentation clip (1.0×) → target1 → target2 (Easy 0.8× etc., NO pause) → 2000 ms linger.
 *   DEBUT cycle : known clip (1.0×) → pause (computePauseDuration) → target1 → target2 → the mode's post-voice2 gap.
 * `modeCfg` is the algorithm_config row for the mode (normal_mode = Easy, fast_mode = Fast).
 */
function debutPlan({ lego, speedConfig, modeCfg }) {
  const s1 = cycleSpeed(speedConfig, 'target1')
  const s2 = cycleSpeed(speedConfig, 'target2')
  const pause = computePauseDuration(lego.target1DurationMs || 0, lego.target2DurationMs || 0, modeCfg || {})
  const gap = toNumber(modeCfg && modeCfg.post_voice2_gap_ms)
  return {
    speeds: { target1: s1, target2: s2 },
    intro: [
      { kind: 'prompt', audioId: lego.presentationAudioId, speed: 1.0 },
      { kind: 'voice1', audioId: lego.target1AudioId, speed: s1.speed },
      { kind: 'voice2', audioId: lego.target2AudioId, speed: s2.speed },
      { kind: 'silence', ms: INTRO_LINGER_MS, why: 'intro lingerMs' },
    ],
    debut: [
      { kind: 'prompt', audioId: lego.knownAudioId, speed: 1.0 },
      { kind: 'silence', ms: pause, why: 'debut pause (computePauseDuration)' },
      { kind: 'voice1', audioId: lego.target1AudioId, speed: s1.speed },
      { kind: 'voice2', audioId: lego.target2AudioId, speed: s2.speed },
      ...(gap && gap > 0 ? [{ kind: 'silence', ms: gap, why: 'post-voice2 gap' }] : []),
    ],
  }
}

module.exports = { MIN_SPEED, MAX_SPEED, INTRO_LINGER_MS, targetPaceFor, effectivePaceRatio, voicePaceForSlot,
  targetSpeedConfigFrom, cycleSpeed, computePauseDuration, debutPlan }
