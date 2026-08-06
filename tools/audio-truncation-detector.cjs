#!/usr/bin/env node
/**
 * audio-truncation-detector — finds clips whose final sound was cut off.
 *
 * WHY THIS EXISTS
 * The estate already has two damage checkers and both of them pass clips that Tom
 * hears as clipped (2026-08-06, listened outside the app, so not a player bug):
 *
 *   - unprimed-whisper CER / final-word retention: passes them, because the final
 *     word is still *recognisable*. Whisper identifies a word from its onset; the
 *     ear hears the word's ending amputated. ASR cannot see this class at all —
 *     measured, see docs/audio-truncation-detector-2026-08-06.md.
 *   - the tail-ratio / release-time detector: passes them, because it anchors its
 *     release measurement on the clip's global peak at 5 ms resolution, and reports
 *     40-65 ms for clips whose fall actually takes 21-36 ms.
 *
 * WHAT IT MEASURES
 * A trim leaves two fingerprints that a render allowed to finish does not have:
 *
 *   1. The fall into silence is near-instantaneous. Speech decays; a cut does not.
 *      We measure the time from the last frame at (peak - 12 dB) to speech end
 *      (peak - 40 dB), at 1 ms resolution, and express it as dB per ms.
 *   2. The silence after speech end is digitally pure. The trim re-pads with
 *      generated silence (exact zero samples); a natural ending carries the
 *      provider's noise floor.
 *
 * Neither fingerprint needs a re-render, a database, or a network call: the clip
 * and its script are enough.
 *
 * CALIBRATION (2026-08-06, deu_for_eng seeds 1-5)
 *   fallRate over 39 fresh, never-trimmed provider renders:  max 0.633 dB/ms
 *   fallRate over 9 clips Tom confirmed damaged by ear:      min 0.741 dB/ms
 * The threshold sits in that gap. The margin is narrow (0.11 dB/ms) and is stated
 * here rather than hidden: this is calibrated on one course and 48 clips.
 *
 * THIS TOOL NEVER WRITES. It reports a verdict; it does not repair, delete or render.
 */
const fs=require('fs'),os=require('os'),path=require('path'),{execFileSync}=require('child_process');

// The measurement itself lives in the audio-intelligence engine, not here. This file is the
// CLI over it. Two implementations of one calibrated threshold is how the estate ended up
// with checkers that disagreed on clips Tom could hear were damaged.
const tier2=require('../services/audio-intelligence/tiers/tier2-edge-shape.cjs');

const SR=tier2.SAMPLE_RATE;
const DEFAULTS=tier2.THRESHOLDS;
const DETECTOR=tier2.DETECTOR;

function decodePcm(file){
  const buf=execFileSync('ffmpeg',['-v','quiet','-i',file,'-ac','1','-ar',String(SR),'-f','s16le','-'],
    {maxBuffer:1<<28});
  return new Int16Array(buf.buffer,buf.byteOffset,Math.floor(buf.length/2));
}
const envelopeDb=tier2.envelopeDb;

const VOWELS={eng:/[aeiouy]+/g, deu:/[aeiouyäöü]+/g, fra:/[aeiouyàâéèêëîïôùûü]+/g,
  spa:/[aeiouyáéíóúü]+/g, ita:/[aeiouyàèéìòù]+/g, cym:/[aeiouwyâêîôûŵŷ]+/g};
function scriptShape(text,lang){
  const words=String(text||'').toLowerCase().replace(/[^\p{L}\p{N}'\s-]/gu,' ').split(/\s+/).filter(Boolean);
  const re=VOWELS[lang]||VOWELS.eng;
  let sylls=0; for(const w of words){ const m=w.match(re); sylls+=Math.max(1,m?m.length:1); }
  return {words:words.length, sylls, chars:words.join('').length};
}

/** Measure one clip. `text`/`lang` are optional and only feed the secondary rate signal. */
function measure(file,{text,lang,...thresholds}={}){
  const m=tier2.measure(decodePcm(file),thresholds);
  if(m.error) return m;
  if(text){ const s=scriptShape(text,lang);
    m.sylls=s.sylls; m.words=s.words;
    m.syllablesPerSec=+(s.sylls/(m.speechMs/1000)).toFixed(2);
    m.charsPerSec=+(s.chars/(m.speechMs/1000)).toFixed(2);
  }
  return m;
}

/**
 * Verdict for one clip. Returns {damaged, reason, measurements}. Never writes.
 * `damaged` is three-valued: true, false, or null when the clip could not be measured —
 * an unmeasurable clip is never silently a pass.
 */
function check(file,opts={}){
  const cfg={...DEFAULTS,...(opts.thresholds||{})};
  const m=measure(file,{...opts,...cfg});
  const v=tier2.verdict(m,cfg);
  return {damaged:v.flagged, reason:v.reason, category:v.category, measurements:m, thresholds:cfg};
}

async function fetchToTemp(url){
  const dst=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'trunc-')),'clip.mp3');
  const https=require('https');
  await new Promise((res,rej)=>{
    const f=fs.createWriteStream(dst);
    https.get(url,r=>{ if(r.statusCode!==200){f.close();return rej(new Error(`HTTP ${r.statusCode} for ${url}`));}
      r.pipe(f); f.on('finish',()=>f.close(()=>res())); }).on('error',rej);
  });
  return dst;
}
module.exports={check,measure,scriptShape,DEFAULTS,DETECTOR,decodePcm,fetchToTemp};

if(require.main===module){
  (async()=>{
    const args=process.argv.slice(2);
    if(!args.length){
      console.error('usage: audio-truncation-detector.cjs <file-or-url> [--text "..."] [--lang deu]');
      console.error('       audio-truncation-detector.cjs --batch <list.json>   # [{id,url|file,text,lang}]');
      process.exit(2);
    }
    const flag=n=>{const i=args.indexOf('--'+n);return i<0?null:args[i+1];};
    if(args[0]==='--batch'){
      const list=JSON.parse(fs.readFileSync(flag('batch'),'utf8'));
      const out=[];
      for(const it of list){
        const f=it.file||await fetchToTemp(it.url);
        const r=check(f,{text:it.text,lang:it.lang});
        out.push({...it,...r});
        console.log(`${r.damaged?'DAMAGED':'clean  '} ${it.id||it.url}  ${r.reason}`);
      }
      console.log(JSON.stringify(out,null,1));
      return;
    }
    const src=args[0];
    const f=/^https?:/.test(src)?await fetchToTemp(src):src;
    const r=check(f,{text:flag('text'),lang:flag('lang')});
    console.log(JSON.stringify(r,null,2));
    process.exit(r.damaged?1:0);
  })().catch(e=>{console.error(e.message);process.exit(3);});
}
