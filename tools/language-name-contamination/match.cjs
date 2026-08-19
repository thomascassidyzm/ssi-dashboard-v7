// Script-aware language-name matcher.
// JS \b is ASCII-only and a \p{L} lookbehind wrongly rejects CJK/Thai/Arabic
// (no spaces), so: find every match, then demand word boundaries only when the
// matched text is itself Latin script.
const strip=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'');
const LAT=/^[\p{Script=Latin}\p{M}\s'-]+$/u;
const isLetter=ch=>ch!==undefined&&/[\p{L}\p{M}]/u.test(ch);
function hits(re,text){
  if(!text) return false;
  const g=new RegExp(re.source,'giu');
  for(const t of [text,strip(text)]){
    g.lastIndex=0; let m;
    while((m=g.exec(t))){
      if(!m[0]) {g.lastIndex++; continue}
      if(!LAT.test(m[0])) return true;                  // non-Latin: no boundary needed
      if(!isLetter(t[m.index-1])) return true;   // left boundary only: names inflect (davvisámegiela, jorubagillii, española)
    }
  }
  return false;
}
module.exports={hits,strip};
