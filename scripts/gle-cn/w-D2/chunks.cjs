require('dotenv').config({path:'.env.psql'});
const {Client}=require('pg');
const upTo=parseInt(process.argv[2]||'45');
(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
const r=await c.query("select seed_number,lego_index,type,known_text,target_text,components from course_legos where course_code='gle_cn_for_eng' and seed_number < $1 order by seed_number,lego_index",[upTo]);
const chunks=new Set();
for(const l of r.rows){
  console.log(`S${l.seed_number}.${l.lego_index} [${l.type}] "${l.known_text}" -> "${l.target_text}"`);
  chunks.add(l.target_text.toLowerCase());
  if(l.components) for(const cp of l.components){console.log(`      comp: "${cp.known}" -> "${cp.target}"`);chunks.add(cp.target.toLowerCase());}
}
console.log('\n--- CHUNKS ('+chunks.size+') ---');
console.log([...chunks].sort().join(' | '));
await c.end()})().catch(e=>{console.error(e.message);process.exit(1)});
