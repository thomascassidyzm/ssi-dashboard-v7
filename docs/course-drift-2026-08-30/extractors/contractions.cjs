const q=require('./q.cjs');
// expanded -> contracted, English
const PAIRS=[
 ["i am","I'm"],["i will","I'll"],["i have","I've"],["i would","I'd"],["i had","I'd"],
 ["we are","we're"],["we will","we'll"],["we have","we've"],["we would","we'd"],
 ["you are","you're"],["you will","you'll"],["you have","you've"],["you would","you'd"],
 ["he is","he's"],["he will","he'll"],["he would","he'd"],
 ["she is","she's"],["she will","she'll"],["she would","she'd"],
 ["it is","it's"],["it will","it'll"],
 ["they are","they're"],["they will","they'll"],["they have","they've"],["they would","they'd"],
 ["that is","that's"],["there is","there's"],["what is","what's"],["who is","who's"],
 ["do not","don't"],["does not","doesn't"],["did not","didn't"],["is not","isn't"],["are not","aren't"],
 ["was not","wasn't"],["were not","weren't"],["cannot","can't"],["can not","can't"],["could not","couldn't"],
 ["will not","won't"],["would not","wouldn't"],["should not","shouldn't"],["have not","haven't"],["has not","hasn't"]
];
const rx=e=>new RegExp('\\b'+e.replace(/ /g,'\\s+')+'\\b','gi');
(async()=>{
 const course=process.argv[2];
 const legos=await q("select lego_id,seed_number,lego_index,known_text,target_text,created_at from course_legos where course_code=$1",[course]);
 const phr=await q("select id,seed_number,lego_index,phrase_role,known_text,target_text,created_at from course_practice_phrases where course_code=$1 and phrase_role<>'component'",[course]);
 const key=r=>r.seed_number+'|'+r.lego_index;
 const legoByKey={}; for(const l of legos) legoByKey[key(l)]=l;
 // taught inventory: which contractions are taught, and which expansions are taught
 const taughtC={}, taughtE={};
 for(const l of legos){ const t=(l.target_text||'').toLowerCase();
   for(const [e,c] of PAIRS){ if(rx(c).test(t)) (taughtC[c]=taughtC[c]||[]).push(l);
                              if(rx(e).test(t)) (taughtE[e]=taughtE[e]||[]).push(l); } }
 const rows=[];
 for(const p of phr){ const t=p.target_text||'';
   for(const [e,c] of PAIRS){ const m=t.match(rx(e)); if(!m) continue;
     const own=legoByKey[key(p)];
     const ownTeachesC=own && rx(c).test((own.target_text||'').toLowerCase());
     const ownTeachesE=own && rx(e).test((own.target_text||'').toLowerCase());
     rows.push({phrase_id:p.id,role:p.phrase_role,seed:p.seed_number,lego_index:p.lego_index,
       expanded:e,contracted:c,hits:m.length,known:p.known_text,before:t,
       after:t.replace(rx(e),(mm)=>mm[0]===mm[0].toUpperCase()?c.charAt(0).toUpperCase()+c.slice(1):c),
       lesson_lego:own?own.lego_id:null,lesson_target:own?own.target_text:null,
       own_teaches_contracted:!!ownTeachesC, own_teaches_expanded:!!ownTeachesE,
       course_teaches_contracted:!!taughtC[c], course_teaches_expanded:!!taughtE[e],
       created:p.created_at});
   }}
 const A=rows.filter(r=>r.own_teaches_contracted);
 const B=rows.filter(r=>!r.own_teaches_expanded && r.course_teaches_contracted);
 console.error(course,'expanded-in-drill rows:',rows.length,'| own lesson teaches contracted (strict):',A.length,'| course teaches contracted & own lesson does not teach expanded:',B.length);
 process.stdout.write(JSON.stringify(rows,null,1));
})();
