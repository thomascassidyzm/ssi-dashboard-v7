// A-134 STEP-2 (seed repairs) — SEVEN GATES, adapted from docs/a134-sin27-2026-08-17/gates-12.cjs.
// DISCLOSED DEVIATIONS (these clips are bare `known`-role SEED PROMPTS, not presentation clips):
//   gate2: rate model REFITTED on this course's 13,301 clean known/sin SameeraNeural clips
//          (ms = 1398.0 + 45.58*chars, sd 149.6). The #823 presentation model (3143 + 45.4)
//          carries a spoken preamble these clips do not have; slope agrees to 0.4%.
//   gate4: 'ඉතින්' terminator does not exist on a seed prompt. Replaced with an equivalent
//          truncation test: the LAST word of the text must appear in the final boundary tokens.
//   gate7: no context/example sentence exists for a seed prompt, so gate7 is repurposed to
//          FULL-TEXT coverage: EVERY word of the seed text voiced per the token array, in order.
//   gate3 keeps its meaning (headword voiced per token array) — here the headword is the
//          seed's own opening chunk. Duration cannot do this job; the token array can.
const cp = require('child_process')
const MODEL = require('./rate-model.json')

function normalizeSin(s){return String(s||'').replace(/['".,:!?]/g,'').replace(/\s+/g,' ').trim()}
function tokenCorpus(wb){return normalizeSin((wb||[]).map(t=>t.text).join(' '))}
function wordsPresent(text,corpus){const w=normalizeSin(text).split(' ').filter(Boolean);const missing=w.filter(x=>!corpus.includes(x));return{ok:missing.length===0,missing}}
function tailFloorDb(file){
  const pcm=cp.execSync(`ffmpeg -v quiet -i "${file}" -ac 1 -ar 44100 -f s16le -`,{maxBuffer:1<<28,shell:'/bin/bash'})
  const n=pcm.length>>1;const s=new Int16Array(n);for(let i=0;i<n;i++)s[i]=pcm.readInt16LE(i*2)
  let peak=1;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(s[i]))
  const sr=44100,win=Math.round(sr*0.002)
  const from=Math.max(0,n-Math.round(sr*0.400)),to=Math.max(0,n-Math.round(sr*0.150))
  const vals=[];for(let i=from;i+win<=to;i+=win){let p=1;for(let k=i;k<i+win;k++)p=Math.max(p,Math.abs(s[k]));vals.push(20*Math.log10(p/peak))}
  vals.sort((a,b)=>a-b);return vals.length?vals[vals.length>>1]:NaN
}
function ffprobeDurationMs(file){return Math.round(parseFloat(cp.execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,{shell:'/bin/bash'}).toString().trim())*1000)}

function runGates(text, wordBoundaries, ms, file){
  const fail=[];const corpus=tokenCorpus(wordBoundaries)
  // G1 decode + duration agreement
  let ffprobeMs=null
  try{ffprobeMs=ffprobeDurationMs(file);if(Math.abs(ffprobeMs-ms)>60)fail.push(`gate1_duration_mismatch: recorded ${ms}ms vs ffprobe ${ffprobeMs}ms`)}
  catch(e){fail.push(`gate1_decode_error: ${e.message}`)}
  // G2 duration within 3sd of REFITTED model
  const chars=[...text].length, expected=MODEL.intercept+MODEL.slope*chars, z=(ms-expected)/MODEL.sd
  if(Math.abs(z)>3)fail.push(`gate2_duration_z_out_of_range: z=${z.toFixed(2)}`)
  // G3 headword (opening chunk) voiced per token array
  const head=normalizeSin(text).split(' ').slice(0,2).join(' ')
  const h=wordsPresent(head,corpus); if(!h.ok)fail.push(`gate3_headword_not_voiced: missing ${JSON.stringify(h.missing)}`)
  // G4 not truncated — last word present in the final boundary tokens
  const lastWord=normalizeSin(text).split(' ').filter(Boolean).pop()
  const lastTokens=normalizeSin((wordBoundaries||[]).slice(-3).map(t=>t.text).join(' '))
  if(!lastTokens.includes(lastWord))fail.push(`gate4_truncated: last word "${lastWord}" absent from final tokens "${lastTokens}"`)
  // G5 no filler regression
  const f=corpus.match(/ඒ ගෙ/g); if(f)fail.push(`gate5_filler_regression: ${f.length} 'ඒ ගෙ' pairs voiced`)
  // G6 no end click
  let tailDb=null
  try{tailDb=tailFloorDb(file);if(tailDb>-40)fail.push(`gate6_end_click: tail at ${tailDb.toFixed(1)}dB rel. peak`)}
  catch(e){fail.push(`gate6_tail_measure_error: ${e.message}`)}
  // G7 FULL text coverage per token array
  const full=wordsPresent(text,corpus); if(!full.ok)fail.push(`gate7_text_not_fully_voiced: missing ${JSON.stringify(full.missing)}`)
  return{fail,z,tail:tailDb,tokens:(wordBoundaries||[]).length,chars,expected_ms:Math.round(expected),ffprobe_ms:ffprobeMs,
    gate3_headword_voiced:h.ok,gate7_full_text_voiced:full.ok}
}
module.exports={runGates,normalizeSin,tokenCorpus,wordsPresent,tailFloorDb,ffprobeDurationMs}
