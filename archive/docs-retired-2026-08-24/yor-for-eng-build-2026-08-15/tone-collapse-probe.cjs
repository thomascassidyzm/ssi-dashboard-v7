const N=require('../../services/course-builder/lib/text-normalization.cjs');
// Yoruba minimal sets that differ ONLY by tone and/or dot-below
const sets=[
 ['oko (farm)','ọkọ (husband)','ọkọ̀ (vehicle)','òkò (stone)'],
 ['igba (200)','ìgbà (time)','igbá (calabash)','ìgbá (garden egg)'],
 ['ọwọ́ (hand)','ọwọ̀ (respect)','owó (money)','owo (business)'],
 ['ṣe (to do)','se (to cook)'],
 ['bí (to give birth/how)','bi (to ask)','bì (to vomit)'],
 ['ìwé (book)','iwe (?)'],
];
for(const s of sets){
  console.log('--- set');
  for(const w of s){
    const word=w.split(' ')[0];
    console.log(`  ${word.padEnd(8)} ZUT=${JSON.stringify(N.normalizeForZUT(word)).padEnd(10)} STORAGE=${JSON.stringify(N.normalizeForStorage(word)).padEnd(10)} CONTAIN=${JSON.stringify(N.normalizeForContainment(word))}   ${w}`);
  }
  const zut=new Set(s.map(w=>N.normalizeForZUT(w.split(' ')[0])));
  console.log(`  >> ${s.length} distinct words collapse to ${zut.size} ZUT form(s): ${[...zut].join(', ')}`);
}
