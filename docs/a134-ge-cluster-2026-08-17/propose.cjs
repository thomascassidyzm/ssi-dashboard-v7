const {p,byId}=require('./parts.cjs'), fs=require('fs')
const j=(...a)=>a.filter(Boolean).join(' ').replace(/\s+/g,' ').trim()
const apata=p.apita, oone=p.apata.split(' ')[1]
const Q=(...a)=>j(p.oyaata,...a)+'?'
const R = {
// ---- seed 60: ගෙ stands for ගැන ("about"). Sibling S0060L02U04 "මට ඒ ගැන ලියන්නෙ ඕනේ".
 S0060L01U06:{ text:j(p.mata,p.wiwidha,p.dewal,p.gaena,p.liyanne,p.oone), conf:'HIGH',
   ge:'ගැන ("about") — but the row also lost its object; rebuilt',
   ground:'S0052L01U01 (මට…ලියන්නෙ ඕනේ) + S0060L02U04 (ලියන්නෙ … ගැන) + S0060L01 විවිධ + S0051L02C02 දේවල්' },
// ---- seed 154
 S0154L01U05:{ text:Q(p.sen_rae,p.eka_that,p.igenaganna,p.oonead), conf:'HIGH',
   ge:'nothing — filler; the row had no verb, no subject and no question marker',
   ground:'S0095L01U05 (ඔයාට…ඕනේද) + S0154L01B02 සෙනසුරාදා රෑ + S0123L02 ඒක + S0002L01 ඉගෙනගන්න' },
 S0154L02U04:{ text:j(p.eka_that,p.igenaganna,apata,p.ekata,p.hamu_wenna,oone), conf:'MEDIUM',
   ge:'nothing — filler standing between "meet" and "learn"',
   ground:'S0018L01 (…ඕනේ) + S0138L01U01 අපිට (220 hits vs 34 for අපට) + S0133L02 එකට + S0154L02 හමු වෙන්න + S0002L01 + S0123L02' },
 S0154L02U05:{ text:Q(p.sen_rae,p.muna_gahenna_oonead,p.oonead), conf:'HIGH',
   ge:'nothing — filler where "on Saturday night" belonged',
   ground:'S0138L01U01 verbatim frame "ඔයාට අපිට මුණ ගැහෙන්න ඕනේද" + S0154L01B02' },
// ---- seed 155
 S0155L02U03:{ text:j(p.mata,p.owun_samaga,p.minithhu_kihipayak,p.igenaganna,p.oone), conf:'HIGH',
   ge:'nothing — filler; "for a few minutes" was truncated to bare මිනිත්තු',
   ground:'S0052L01U01 frame + S0134L02 ඔවුන් සමග + S0155L02B02 මිනිත්තු කිහිපයක් + S0002L01' },
 S0155L02U04:{ text:Q(p.owun_samaga,p.minithhu_kihipayak,p.balaagena_inna,p.kamak_naeda), conf:'MEDIUM',
   ge:'nothing — the row was word salad ("ඒ ගැන ගෙ ඒ ගාවෙ ගිය මිනිත්තු")',
   ground:'S0063L02B02 (VERB කමක් නෑද) + S0048L01U07 (ඔයාට කමක් නෑද…) + S0169L01U07 (මිනිත්තු කිහිපයක් බලාගෙන ඉන්නේ)' },
// ---- seed 156: ගෙ occupies the dative slot of "restaurant". Course's own later
//      rendering of exactly "to a restaurant" is රෙස්ටෝරන්ට් එකකට (S0161L02U05, S0167L01U07).
 S0156L01B02:{ text:p.restaurant_dat, conf:'HIGH', ge:'the dative -ට on "restaurant"',
   ground:'S0161L02U05 / S0167L01U07 verbatim; dative on a loan noun also at S0095L02U02 බස් එකට' },
 S0156L01B03:{ text:Q(p.restaurant_dat,p.yanna,p.oonead), conf:'HIGH', ge:'the dative -ට, and "go" was missing',
   ground:'S0161L02U05 verbatim minus the time adjunct' },
 S0156L01U01:{ text:Q(p.me_rae,p.restaurant_dat,p.yanna,p.oonead), conf:'HIGH', ge:'ditto',
   ground:'S0161L02U05 with S0031L02 මේ රෑ in the time slot' },
 S0156L01U02:{ text:Q(p.owun_samaga,p.restaurant_dat,p.yanna,p.oonead), conf:'HIGH', ge:'ditto',
   ground:'S0161L02U05 + S0134L02 ඔවුන් සමග' },
 S0156L01U03:{ text:Q(p.restaurant_dat,p.yanna,p.oonead,p.naeth_nam,p.gedara,p.yanna,p.oonead), conf:'MEDIUM',
   ge:'ditto; the disjunction "or go home" had collapsed to "ඒ ගෙදර"',
   ground:'S0161L02U05 + S0044L01 නැත්නම් + S0095L01U05 ගෙදර යන්න' },
 S0156L01U04:{ text:j(p.mata,p.me_rae,p.oya_ekka,p.restaurant_dat,p.yanna,p.oone), conf:'HIGH',
   ge:'ditto', ground:'S0052L01U01 frame + S0161L02U05 + S0001L04 ඔයා එක්ක + S0031L02' },
 S0156L01U05:{ text:Q(p.sen_rae,p.restaurant_dat,p.yanna,p.oonead), conf:'HIGH', ge:'ditto',
   ground:'S0161L02U05 verbatim, ඉරිදා රෑ → සෙනසුරාදා රෑ (S0154L01B02)' },
 S0156L01U06:{ text:Q(p.me_rae,p.owun_samaga,p.restaurant_dat,p.yanna,p.oonead), conf:'HIGH', ge:'ditto',
   ground:'S0161L02U05 + S0134L02 + S0031L02' },
// ---- seed 158: ගෙ stands for ගැන ("about"), but the rows also lost their verb frame.
//      Clean sibling S0158L01B03 "ඒ ගැන කතා" shows the intended shape.
 S0158L01U01:{ text:j(p.mata,p.igena_ganeema,p.gaena,p.katha_karanna,p.oone), conf:'HIGH',
   ge:'ගැන ("about")', ground:'S0146L03U06 ඉගෙනීම ගැන + S0001L03 කතා කරන්න + S0052L01U01 frame' },
 S0158L01U02:{ text:j(p.mata,p.gedara,p.yan_eka,p.gaena,p.katha_karanna,p.oone), conf:'MEDIUM', silent:true,
   ge:'ගැන ("about")', ground:'S0401L02C01 ගෙදර යන එක + S0037L02C02 ගැන + S0001L03 (NOTE: යන එක is attested only from seed 401)' },
 S0158L01U04:{ text:j(p.mata,p.kawuruhari,p.ekka,p.english_in,p.katha_karanna,p.oone), conf:'MEDIUM',
   ge:'the instrumental -යෙන් on "English" (ඉංග්‍රීසියෙන්)',
   ground:'S0004L03 ඉංග්‍රීසියෙන් + S0131L03U06 කවුරුහරි + S0001L04 එක්ක (කවුරුහරි එක්ක is by analogy)' },
 S0158L01U05:{ text:j(p.mata,p.owun_samaga,p.igena_ganeema,p.gaena,p.katha_karanna,p.oone), conf:'HIGH', silent:true,
   ge:'ගැන ("about") twice over', ground:'S0146L03U06 ඉගෙනීම + S0134L02 + S0001L03' },
 S0158L01U06:{ text:j(p.mata,p.restaurant_dat,p.yan_eka,p.gaena,p.katha_karanna,p.oone), conf:'MEDIUM', silent:true,
   ge:'ගැන ("about") and the dative -ට', ground:'S0161L02U05 + S0401L02C01 යන එක + S0037L02C02' },
 S0158L02U01:{ text:j(p.owun_samaga,p.ae_gaena,p.katha_karamu), conf:'HIGH',
   ge:'ගැන — "ඒ ගෙ" is a direct corruption of "ඒ ගැන"',
   ground:'S0158L01B03 ඒ ගැන කතා + S0158L02B02 කතා කරමු + S0134L02' },
 S0158L02U03:{ text:j(p.ekata,p.gedara,p.yan_eka,p.gaena,p.katha_karamu), conf:'MEDIUM',
   ge:'ගැන ("about")', ground:'S0401L02C01 + S0133L02 එකට + S0158L02B02' },
 S0158L02U04:{ text:j(p.igenaganna,p.wena_deyak,p.gaena,p.katha_karamu), conf:'HIGH',
   ge:'ගැන ("about")', ground:'S0167L01U08 "වෙන දෙයක් ගැන කතා කරමු" verbatim + S0002L01' },
 S0158L02U05:{ text:j(p.me_rae,p.restaurant_dat,p.yan_eka,p.gaena,p.katha_karamu), conf:'MEDIUM',
   ge:'ගැන ("about")', ground:'S0161L02U05 + S0401L02C01 + S0167L01U08 frame' },
 S0158L02U06:{ text:j(p.kawuruhari,p.ekka,p.english,p.igena_ganeema,p.gaena,p.katha_karamu), conf:'MEDIUM',
   ge:'ගැන ("about")', ground:'S0146L03U06 ඉගෙනීම ගැන + S0167L01U08 frame + S0131L03U06' },
}
const out=[]
for(const [k,v] of Object.entries(R)){
  const row=byId[k]; if(!row) throw new Error('missing row '+k)
  if(/(^| )ගෙ( |$)/.test(v.text)) throw new Error('repair still contains bare ගෙ: '+k)
  out.push({id:row.id,lego_id:row.lego_id,seed:row.seed_number,eng:row.target_text,
    old:row.known_text,new:v.text,confidence:v.conf,ge_stood_for:v.ge,grounding:v.ground,
    was_silent:!!v.silent,current_audio:row.kaid})
}
fs.writeFileSync(__dirname+'/proposal.json',JSON.stringify(out,null,1))
for(const r of out) console.log(`s${r.seed} ${r.lego_id?'':''}${r.id.split(':')[1]} [${r.confidence}]${r.was_silent?' SILENT':''}\n  E   : ${r.eng}\n  old : ${r.old}\n  NEW : ${r.new}\n  ගෙ = ${r.ge_stood_for}\n`)
console.log('proposed:',out.length)
