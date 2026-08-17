const {norm,tokenCorpus,MODELS}=require('./gates.cjs');
const fs=require('fs');const {Client}=require('pg');
const url=/DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(fs.readFileSync('/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql','utf8'))[1].trim();
(async()=>{const c=new Client({connectionString:url});await c.connect();await c.query('begin read only');
for(const [course,voice,re] of [['eng_for_kor','azure_ko-KR-SunHiNeural','[가-힯]'],['eng_for_jpn','azure_ja-JP-MayuNeural','[぀-ヿ一-鿿]']]){
 const r=await c.query(`select text, word_boundaries, duration_ms from course_audio where course_code=$1 and voice_id=$2 and role='known' and s3_key is not null and word_boundaries::text like '%"text"%' and length(regexp_replace(text,'[[:space:]]','','g')) between 8 and 32 and text ~ '${re}' order by random() limit 400`,[course,voice]);
 let g7=0,g4=0,g2=0;const ex=[];
 const M=MODELS[course+'|'+voice];
 for(const x of r.rows){
   const corpus=tokenCorpus(x.word_boundaries), want=norm(x.text);
   if(corpus===want) g7++; else if(ex.length<3) ex.push([x.text,corpus]);
   if(corpus&&want&&want.endsWith(corpus.slice(-Math.min(corpus.length,4)))) g4++;
   const z=(x.duration_ms-(M.intercept+M.slope*want.length))/M.sd; if(Math.abs(z)<=3) g2++;
 }
 const n=r.rows.length;
 console.log(`${course}: n=${n}  gate7(char-coverage) pass ${g7} (${(100*g7/n).toFixed(1)}%)  gate4 pass ${g4} (${(100*g4/n).toFixed(1)}%)  gate2 pass ${g2} (${(100*g2/n).toFixed(1)}%)`);
 for(const [t,co] of ex) console.log('   g7 miss: text=',JSON.stringify(t),' corpus=',JSON.stringify(co));
}
await c.end();})()
