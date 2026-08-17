// Every Sinhala string used in a repair is SLICED OUT OF A DATABASE ROW at runtime.
// Nothing here is hand-typed Sinhala. Two workers on this plate corrupted Sinhala by
// typing it; this module makes that impossible by construction.
const P=require('./phrases.json'), L=require('./alllegos.json')
const byId={}; for(const p of P) byId[p.id.split(':')[1]]=p
const byLego={}; for(const l of L) byLego[l.lego_id]=l
// take(source, from, to) -> space-joined words [from,to) of that row's known_text
function take(src,from,to){
  const row = byId[src]||byLego[src]
  if(!row) throw new Error('no such source row: '+src)
  const w=row.known_text.trim().replace(/[?]$/,'').split(/\s+/)
  const out=w.slice(from, to===undefined?from+1:to).join(' ')
  if(!out) throw new Error(`empty slice ${src}[${from},${to}]`)
  return out
}
const p = {
  // interrogative frame
  oyaata:   take('S0095L01U05',0),        // ඔයාට      "do you (dat)"  <- "ඔයාට ඕනේද ගෙදර යන්න?"
  oonead:   take('S0095L01U05',1),        // ඕනේද       "want ...?"
  mata:     take('S0052L01U01',0),        // මට         "I (dat)"       <- "මට ලියන්නෙ ඕනේ"
  oone:     take('S0052L01U01',2),        // ඕනේ        "want"
  apita:    take('S0138L01U01',1),        // අපිට  "us (dat)" -- 220 course hits vs 34 for අපට
  apata:    take('S0018L01',0,2),         // lego "we want" known side, first half
  apata_oone: null,
  // verbs / objects
  yanna:    take('S0026L03',0),           // යන්න        "to go"
  gedara:   take('S0095L01U05',2),        // ගෙදර        "home"
  yan_eka:  take('S0401L02C01',1,3),      // යන එක       "going" (nominalised)
  igenaganna: take('S0002L01',0),         // ඉගෙනගන්න     "to learn"
  igena_ganeema: take('S0146L03U06',2),  // ඉගෙනීම  "learning" (verbal noun) -- 15 hits vs 1 for ඉගෙන ගෙ0නීම // ඉගෙන ගැනීම   "learning" (verbal noun)
  eka_that: take('S0123L02',0),           // ඒක          "it / that"
  liyanne:  take('S0052L01U01',1),        // ලියන්නෙ      "to write"
  katha_karanna: take('S0001L03',0,2),    // කතා කරන්න    "to speak/talk"
  katha_karamu:  take('S0158L02B02',0,2), // කතා කරමු     "let's talk"
  balaagena_inne: take('S0063L02B02',0),  // (pattern donor below)
  balaagena_inna: take('S0155L01B01',0,2),// බලාගෙන ඉන්න   "to wait"
  kamak_naeda: take('S0063L02B01',0,2),   // කමක් නෑද      "don't mind"
  muna_gahenna_oonead: take('S0138L01U01',1,4), // අපිට මුණ ගැහෙන්න  "meet us"
  hamu_wenna: take('S0154L02',0,2),       // හමු වෙන්න     "meet"
  // nouns / adjuncts
  restaurant_dat: take('S0161L02U05',3,5),// රෙස්ටෝරන්ට් එකකට "to a restaurant"
  me_rae:   take('S0031L02',0,2),         // මේ රෑ        "tonight"
  sen_rae:  take('S0154L01B02',0,2),      // සෙනසුරාදා රෑ  "on Saturday night"
  owun_samaga: take('S0134L02',0,2),      // ඔවුන් සමග     "with them"
  oya_ekka: take('S0001L04',0,2),         // ඔයා එක්ක      "with you"
  ekka:     take('S0001L04',1),           // එක්ක         "with"
  kawuruhari: take('S0131L03U06',1),      // කවුරුහරි      "someone"
  ekata:    take('S0133L02',0),           // එකට          "together"
  naeth_nam: take('S0044L01',0),          // නැත්නම්       "or"
  gaena:    take('S0037L02C02',0),        // ගැන          "about"
  ae_gaena: take('S0037L02B01',0,2),      // ඒ ගැන        "about that/it"
  wiwidha:  take('S0060L01',0),           // විවිධ        "different"
  dewal:    take('S0051L02C02',0),        // දේවල්        "things"
  minithhu_kihipayak: take('S0155L02B02',0,2), // මිනිත්තු කිහිපයක් "a few minutes"
  wena_deyak: take('S0167L01U08',2,4),    // වෙන දෙයක්     "something else"
  english:  take('S0001L02',0),           // ඉංග්‍රීසි
  english_in: take('S0004L03',0),         // ඉංග්‍රීසියෙන්  "in English"
  apata_full: take('S0018L01',0,9),
}
module.exports={p,take,byId,byLego}
if(require.main===module){for(const [k,v] of Object.entries(p)) if(v) console.log(k.padEnd(22), JSON.stringify(v))}
