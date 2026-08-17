// Unicode-aware introduced-before-used check for the SINHALA KNOWN side.
//
// WHY THIS EXISTS: the repo's own known-side gate is INERT for Sinhala. tokenizeKnown()
// splits on an ASCII-only character class, so Sinhala text tokenises to nothing and the
// gate always returns 0 violations. A 0 from it means nothing. This is an independent
// implementation.
//
// METHOD, stated plainly:
//   * Tokens are whitespace-delimited words. Within a word, characters are grouped with
//     Intl.Segmenter({granularity:'grapheme'}), so Sinhala vowel signs (U+0DCF..U+0DDF),
//     al-lakuna U+0DCA and the ZWJ (U+200D) inside conjuncts are never split off. The
//     grapheme pass is what makes the STEM comparison below safe; it is not used to
//     re-split words.
//   * Text is NFC-normalised. Trailing ? ! . and Sinhala danda are stripped.
//   * TWO verdicts are reported per token:
//       EXACT  — the identical word form appears in a known_text at or before this seed.
//       STEM   — a word at or before this seed shares a >=3-grapheme leading prefix with
//                it, or vice versa. This is a crude stand-in for morphology.
//   * WHICH WAY IT ERRS: the STEM rule OVER-ACCEPTS. Sinhala is agglutinative
//     (වෙනවා / වෙන්න / වෙන්නට are one verb), so demanding EXACT invents breaches that
//     are not real; allowing a 3-grapheme prefix instead lets through unrelated words
//     that happen to share an onset (ගෙදර / ගෙනියනවා). So STEM under-reports breaches
//     and EXACT over-reports them. I report both counts rather than picking one, and
//     hand-adjudicate anything that is EXACT-fail.
const P=require('./phrases.json'), L=require('./alllegos.json'), prop=require('./proposal.json')
const seg=new Intl.Segmenter('si',{granularity:'grapheme'})
const graphemes=w=>[...seg.segment(w)].map(s=>s.segment)
const clean=s=>s.normalize('NFC').replace(/[?!.෴]+/g,' ')
const words=s=>clean(s).split(/\s+/).filter(Boolean)
// corpus: known-side word -> earliest seed it appears in
const first=new Map()
const add=(txt,seed)=>{for(const w of words(txt||'')){const c=first.get(w); if(c===undefined||seed<c)first.set(w,seed)}}
for(const p of P) add(p.known_text,p.seed_number)
for(const l of L) add(l.known_text,l.seed_number)
const corpusWords=[...first.keys()]
function stemOk(w,seed){
  const g=graphemes(w)
  for(const c of corpusWords){
    if(first.get(c)>seed) continue
    const gc=graphemes(c), n=Math.min(g.length,gc.length)
    if(n<3) continue
    let k=0; while(k<n&&g[k]===gc[k])k++
    if(k>=3) return c
  }
  return null
}
let exactFail=0, stemFail=0, tot=0
const report=[]
for(const r of prop){
  for(const w of words(r.new)){
    tot++
    const f=first.get(w)
    const exact = f!==undefined && f<=r.seed
    if(exact) continue
    exactFail++
    const s=stemOk(w,r.seed)
    if(s) report.push({row:r.id.split(':')[1],seed:r.seed,word:w,verdict:'EXACT-fail STEM-ok',nearest:s,nearest_seed:first.get(s),exact_first_seen:f===undefined?null:f})
    else {stemFail++; report.push({row:r.id.split(':')[1],seed:r.seed,word:w,verdict:'EXACT-fail STEM-fail',exact_first_seen:f===undefined?null:f})}
  }
}
console.log(`tokens checked: ${tot}`)
console.log(`EXACT-introduced-before-used failures: ${exactFail}`)
console.log(`  of those, STEM-clean (a related form was already taught): ${exactFail-stemFail}`)
console.log(`  STEM failures too (nothing like it taught by that seed): ${stemFail}`)
for(const r of report) console.log(' ',r.row,'s'+r.seed,JSON.stringify(r.word),r.verdict, r.nearest?`~ ${r.nearest} (s${r.nearest_seed})`:'', r.exact_first_seen!==null?`[exact form first appears s${r.exact_first_seen}]`:'[never appears in course]')
require('fs').writeFileSync(__dirname+'/knowngate.json',JSON.stringify({tot,exactFail,stemFail,report},null,1))
