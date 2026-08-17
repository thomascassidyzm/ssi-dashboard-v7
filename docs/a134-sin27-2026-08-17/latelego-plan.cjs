// A-134 late-lego — THE PLAN. Every row that must change, and the clip each ends up on.
// Built after the refuter (#870) ruled DO-NOT-SHIP on the seed-only scope: the drill phrases
// are bundled in, so no seed is left contradicting its own drills.
//
// KEY STRUCTURAL FACT found in preflight and NOT in any prior doc: seeds 426/431/456/464 SHARE
// their known clip with their own culminating USE phrase (the phrase text is the seed text minus
// the trailing '.', and normalize_text() strips that, so unique_course_audio_per_voice dedups
// them onto one row). Those four therefore get ONE new clip linked from TWO rows. Rendering two
// would violate the unique index; rendering one and linking one would strand the phrase.
const H='හැබැයි', E='ඒත්'
const sub=s=>s.split(H).join(E)
// ---- the habayi rows (all rows using habayi before its seed-469 teach point) ----
const SEEDS={
 246:'ඔයාව උදව් කරන්නයි මම ඇයට ඕනේ කළා, හැබැයි ඇය ගොඩක් බිස්ස.',
 426:'ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, හැබැයි ඒ අය දුකෙන් ඉන්නවා.',
 431:'ඒ අය තාම සූදානම් නෑ, හැබැයි ඉක්මනින් සූදානම් වෙනවා.',
 456:'ඔහු ඒ තැනේ ඉන්නා, හැබැයි ගොඩ ඉඩ නෑ.',
 464:'මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, හැබැයි ඇයට අමතකවෙලා.'}
const PHRASES=[ // seed, lego_index, position, old_text
 [246,1,6,'ඇයට උදව් කරන්නයි ඕනේ කළා හැබැයි'],
 [246,1,12,'මම ඇයට උදව් කරන්නයි ඕනේ කළා හැබැයි ඇයට බෑ'],
 [246,2,4,'හැබැයි ඇය ගොඩක් බිස්ස'],
 [246,2,6,'මම ඇයට උදව් කරන්නයි ඕනේ කළා හැබැයි ඇය ගොඩක් බිස්ස'],
 [246,2,7,'මම ඇය එක්ක කතා කරන්නයි ඕනේ කළා හැබැයි ඇය ගොඩක් බිස්ස'],
 [247,1,6,'ඒ පොත තරමක් හොඳ හැබැයි හොඳම නෑ'],
 [248,2,9,'මම සල්ලි ආපහු ඕනේ හැබැයි ඒ අය දෙන්නේ නෑ'],
 [257,1,10,'මම ඒ නිල් දේ ලෙයිකයි හැබැයි මට ඒක ඕනේ නෑ'],
 [426,3,6,'ඒ අයට ඔකොව්කො ආදරේ කරන්නයි ඕනේ, හැබැයි ඒ අය දුකෙන් ඉන්නවා'],
 [431,2,7,'ඒ අය තාම සූදානම් නෑ, හැබැයි ඉක්මනින් සූදානම් වෙනවා'],
 [456,2,8,'ඔහු ඒ තැනේ ඉන්නා, හැබැයි ගොඩ ඉඩ නෑ'],
 [464,4,4,'මම ඇයට එක සැරයක් මගේ කාමර අංකේ කිව්වා, හැබැයි ඇයට අමතකවෙලා']]
// ---- the one extra sibling that is safely fixable: seed 230's hapax spelling ----
// 'kaemaethi' occurs in exactly ONE row in the whole course (this seed): 0 legos, 0 phrases.
// Its OWN lego S0230L01 and all 11 of its own phrases use 'kaemathi', LEGO debut seed 27,
// 94 phrase drills. Repaired from the seed's own lego, byte-identical.
const SPELL=[{seed:230,old:'ඔයා එක්ක වැඩ කරන්නයි කැමැති තරුණ කෙනෙකු මම දන්නවා.',
                     new:'ඔයා එක්ක වැඩ කරන්නයි කැමති තරුණ කෙනෙකු මම දන්නවා.',
  note:"hapax 'kaemaethi' -> 'kaemathi' from this seed's own lego. Leaves ONE flagged token, "+
       "'kenneku'@370, DELIBERATELY unfixed: it appears in 10 seeds course-wide and may be a real "+
       "case distinction, not a variant. Seed 230 therefore goes 2 breaches -> 1, NOT to 0."}]

// ---- EXTENSION forced by refuter #872: seeds 165 and 178 carry the identical defect and were
// absent from the 18-row plan. #872 ruled that shipping without them "ships a second incomplete
// pass on the same named defect class". Both are seed-only: neither seed's own drill phrases use
// HABAYI (0 of 11 and 0 of 21), so there is no phrase compounding.
//   165: plain substitution, like the other five. 1 breach -> 0.
//   178: NOT a substitution. Its prompt diverged from its OWN legos on FOUR tokens
//        (habayi@469, 'langa'@358, 'taim'@279, 'nothibunaa'@NEVER-taught). Its own USE phrase
//        L2p6 is the sentence the course actually teaches, and carries the concessive 'wunath'
//        which means "although" by itself -- so no word for "but" is needed at all. Adopted
//        BYTE-IDENTICAL to that phrase (the #850 method for seeds 207/261, which also stored the
//        phrase text without a trailing period). 4 breaches -> 0. Its clip already exists and is
//        REUSED, not re-rendered: inserting a duplicate would violate unique_course_audio_per_voice,
//        and the clip passed all 7 gates on the real S3 bytes (39,168 B, z=-0.79, tail -88.4 dB,
//        9/9 tokens voiced). All 7 of seed 178's L2 use phrases put the concessive clause first,
//        so the adopted word order is the course's own attested pattern.
const EXTRA=[
 {seed:165,old:'හැබැයි ඒ ඇත්ත කියලා මට විශ්වාස නෑ.',
           new:'ඒත් ඒ ඇත්ත කියලා මට විශ්වාස නෑ.'},
 {seed:178,old:'ඔයාව දකින්න ඕනේ වුණා, හැබැයි මම ළඟ ටයිම් නොතිබුණා.',
           new:'ඔයාව දකින්න ඕනේ වුණත්, මට වෙලාවක් තිබුණේ නෑ',
           reuse:'c349d360-f4fc-42e5-9315-7e58d1a329d5'}]
const rows=[]
for(const [n,old] of Object.entries(SEEDS)) rows.push({kind:'seed',seed:+n,old_text:old,new_text:sub(old)})
for(const [s,li,pos,old] of PHRASES) rows.push({kind:'phrase',seed:s,lego_index:li,position:pos,old_text:old,new_text:sub(old)})
for(const p of SPELL) rows.push({kind:'seed',seed:p.seed,old_text:p.old,new_text:p.new,note:p.note})
for(const p of EXTRA) rows.push({kind:'seed',seed:p.seed,old_text:p.old,new_text:p.new,reuse:p.reuse||null})
module.exports={rows,H,E}
if(require.main===module){
 console.log(`${rows.length} rows to change: ${rows.filter(r=>r.kind==='seed').length} seeds, ${rows.filter(r=>r.kind==='phrase').length} phrases`)
 for(const r of rows)console.log(`  ${r.kind==='seed'?'seed '+r.seed+'        ':'s'+r.seed+' L'+r.lego_index+'p'+r.position}  ${r.old_text}\n      -> ${r.new_text}`)
}
