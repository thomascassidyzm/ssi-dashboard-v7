/**
 * TIER 1 — duration vs script, denominated in SYLLABLES, calibrated PER VOICE.
 *
 * Tom's framing (2026-08-06): the clip that started this is about one second long and is
 * supposed to contain "to speak German with you" — "how can it get that whole phrase in,
 * in one second???" That question is the whole tier. It costs one ffmpeg decode and no
 * model, and it is the first filter, not the authority.
 *
 * Two design rulings from Tom, both adopted:
 *   - SYLLABLES, not words. "Words are useless, but syllables are pretty consistent."
 *   - Calibrate each VOICE's rate from its own corpus of presumed-good clips. A voice that
 *     naturally trails off slowly simply carries its own measured rate, so the slow-voice
 *     ambiguity disappears into the calibration instead of into a fudge factor.
 *
 * SYLLABLE METHOD: vowel-group counting. Lower-case the script, strip punctuation, and count
 * maximal runs of vowels per word against a per-language vowel set (German adds ä ö ü, French
 * and Spanish their accented sets); every word counts at least one. It over-counts diphthongs
 * and under-counts syllabic consonants, and that is fine — the tier compares a clip against
 * OTHER CLIPS COUNTED THE SAME WAY, so a consistent bias cancels out of the ratio.
 *
 * RATE CORPUS: rates must be calibrated on clips that are presumed good BY CONSTRUCTION, not
 * by opinion. The shipped calibration uses the 384 fresh provider renders from the 2026-08-05
 * naked pass, which went through no trimming, no silence stripping and no tail detection.
 *
 * One-syllable clips are NOT scored: they are onset and release with nothing in between, so
 * their "rate" is a floor effect rather than a rate.
 *
 * THIS MODULE NEVER WRITES.
 */
const fs=require('fs'),path=require('path');

const VOWELS={
  eng:/[aeiouy]+/g,
  deu:/[aeiouyäöü]+/g,
  fra:/[aeiouyàâéèêëîïôùûüœ]+/g,
  spa:/[aeiouyáéíóúü]+/g,
  ita:/[aeiouyàèéìòóù]+/g,
  cym:/[aeiouwyâêîôûŵŷ]+/g,
};

/** Vowel-group syllable count. Documented, deliberately crude, consistent across the corpus. */
function countSyllables(text,lang){
  const words=String(text||'').toLowerCase()
    .replace(/[^\p{L}\p{N}'\s-]/gu,' ').split(/\s+/).filter(Boolean);
  const re=VOWELS[lang]||VOWELS.eng;
  let sylls=0;
  for(const w of words){ const m=w.match(re); sylls+=Math.max(1,m?m.length:1); }
  return {sylls, words:words.length};
}

/**
 * DURATION MODEL: speechMs = intercept + msPerSyllable * syllables, fitted per voice.
 * A flat syllables/sec was fitted first and rejected on the data: a clip carries a fixed
 * onset+release overhead, so a flat rate reads every short clip as slow and every long clip
 * as fast. The linear fit reaches R2 0.91-0.93 per voice and lets 2-syllable clips be scored
 * at all, which a flat rate could not do honestly.
 *
 * MEASURED PERFORMANCE — state it before using it. Against the 9 ear-labelled damaged clips
 * and the 384 never-trimmed renders (2026-08-06):
 *
 *      z <= -0.75    5 of 9 caught     18.9% of never-trimmed renders flagged
 *      z <= -1.00    2 of 9 caught     10.3%
 *      z <= -1.50    2 of 9 caught      2.5%
 *
 * This tier is CHEAP AND BLUNT, and it is shipped as such. Four of the nine damaged clips lost
 * only the final word's decay - 50 to 250 ms - which sits inside the corpus's own duration
 * spread (relative residual sd 0.13-0.24), so there is nothing here for a duration test to see.
 * Tier 1 catches amputations big enough to move the total; the edge-shape tier catches the rest.
 * Do not promote a tier-1 flag to a verdict, and do not read a tier-1 pass as "clean".
 */
const MIN_SYLLABLES=2;
const DEFAULT_Z=-1.5;      // the low-false-flag operating point (2.5% on never-trimmed renders)

function loadRates(file){
  const f=file||path.join(__dirname,'..','calibration','voice-rates.json');
  if(!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f,'utf8'));
}

/**
 * @param {object} clip  {speechMs, script, language, voice}  speechMs is the SPEECH span,
 *                       not the file duration - leading/trailing silence must already be excluded.
 * @param {object} opts  {rates, shortRatio}
 * @returns {{tier:1, scored:boolean, flagged:boolean|null, reason:string, ...}}
 */
function score(clip,opts={}){
  const rates=opts.rates||loadRates(opts.ratesFile);
  const zThreshold=opts.z!=null?opts.z:DEFAULT_Z;
  const {sylls,words}=countSyllables(clip.script,clip.language);
  const base={tier:1,sylls,words,speechMs:clip.speechMs,voice:clip.voice};

  if(sylls<MIN_SYLLABLES)
    return {...base,scored:false,flagged:null,
      reason:`${sylls} syllable — too short to model; a one-syllable clip is onset and release, not a rate`};
  const v=rates&&rates.voices&&rates.voices[clip.voice];
  if(!v)
    return {...base,scored:false,flagged:null,
      reason:`no measured rate for voice "${clip.voice}" — calibrate it before this tier can speak`};

  const expectedMs=Math.round(v.intercept_ms+v.ms_per_syllable*sylls);
  const shortfall=+((clip.speechMs-expectedMs)/expectedMs).toFixed(3);
  const z=+(shortfall/v.relative_residual_sd).toFixed(2);
  const flagged=z<=zThreshold;
  return {...base, scored:true, flagged, expectedMs, shortfall, z, zThreshold,
    voiceMsPerSyllable:v.ms_per_syllable, voiceN:v.n,
    reason: flagged
      ? `${sylls} syllables in ${clip.speechMs} ms — ${clip.voice} takes ${expectedMs} ms for that `+
        `across ${v.n} untrimmed renders, so this clip is ${Math.abs(Math.round(shortfall*100))}% short (z ${z})`
      : `${sylls} syllables in ${clip.speechMs} ms against ${expectedMs} ms expected for ${clip.voice} `+
        `(${shortfall>=0?'+':''}${Math.round(shortfall*100)}%, z ${z}) — within this voice's own spread`};
}

module.exports={score,countSyllables,loadRates,VOWELS,MIN_SYLLABLES,DEFAULT_Z};
