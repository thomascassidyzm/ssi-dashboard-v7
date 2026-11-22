// cs #468·AK: reads the clip_index dump tools/audio-estate-coverage.cjs caches (a local file, no DB) and sorts a day list into
// held in the cast voice / held only in another voice / missing.  node held-in-cast.cjs <dump.tsv.gz> <dayN-batch.jsonl> <gaps-out.jsonl>
const fs=require('fs'),zlib=require('zlib'),R=require('path').resolve(__dirname,'../../..')+'/'
const {clipTextKey,clipLanguageKey}=require(R+'services/shared/clip-index.cjs')
const {tryCanonicalVoiceId}=require(R+'services/shared/clip-identity.cjs')
const idx=new Map()
for(const l of zlib.gunzipSync(fs.readFileSync(process.argv[2])).toString('utf8').split('\n')){const [lang,voice,origin,...w]=l.split('\t');if(!lang)continue
 const k=lang+'\u001f'+w.join('\t'); if(!idx.has(k))idx.set(k,new Set()); idx.get(k).add(tryCanonicalVoiceId(voice)||voice)}
const course={course_code:'spa_for_zho',known_lang:'zho',target_lang:'spa'}
const asks=fs.readFileSync(process.argv[3],'utf8').split('\n').filter(Boolean).map(JSON.parse)
const t={},gaps=[]
for(const a of asks){const lang=clipLanguageKey(a.role==='known'?'zho':'spa',course);const k=lang+'\u001f'+clipTextKey(a.text);const vs=idx.get(k)||new Set()
 const want=tryCanonicalVoiceId(a.voiceId)||a.voiceId; const v=vs.has(want)?'held_cast':vs.size?'held_other_voice':'missing'
 const s=(t[a.role]||(t[a.role]={}));const e=(s[v]||(s[v]={asks:0,chars:0,slots:0}));e.asks++;e.chars+=a.chars;e.slots+=a.slots.length
 if(v!=='held_cast')gaps.push({role:a.role,text:a.text,chars:a.chars,firstSeed:a.firstSeed,verdict:v,voicesHeld:[...vs]})}
console.log(JSON.stringify(t,null,1));fs.writeFileSync(process.argv[4],gaps.map(g=>JSON.stringify(g)).join('\n')+'\n')
console.log('lang keys',clipLanguageKey('spa',course),clipLanguageKey('zho',course))
