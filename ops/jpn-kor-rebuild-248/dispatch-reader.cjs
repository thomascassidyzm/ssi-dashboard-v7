// Prints the /api/dispatch body for one reader band: node dispatch-reader.cjs <jpn|kor> <from-to>  (job #248)
const fs=require('fs'), path=require('path'); const [lang,range]=process.argv.slice(2);
const code={jpn:'jpn_for_eng',kor:'kor_for_eng'}[lang];
const note= lang==='jpn' ? 'JAPANESE NOTE: Kai can follow Japanese but cannot rule on correctness, so your judgement is the language check. The course uses casual plain style (〜たい, って言ってた, 〜てる); keep that register. The course teaches "trying to say" = って言いたい (seed 102) — that pairing is the course\'s own, not a mismatch.'
 : 'KOREAN NOTE: Kai does not read Korean at all, so you are the only language judge. The course uses polite 해요-style. Watch especially for: 교회 (church) with no church in the English; 있어요 left dangling after a particle or -면 (the progressive -고 있어요 is fine); "heard about X" / "trust about" template English; a verb in the English with no verb in the Korean.';
const b=fs.readFileSync(path.join(__dirname,'reader-brief.md'),'utf8').replaceAll('COURSE_CODE',code).replaceAll('LANGUAGE_NOTE',note).replaceAll('LANG',lang).replaceAll('RANGE',range);
process.stdout.write(JSON.stringify({cwd:'/home/tomcassidy/SSi/ssi-dashboard-v7-clean',label:`248-read-${lang}-${range}`,prompt:b,parent:'b8478144-ab42-483c-ae4e-2fa1ae9d4613',model:'sol'}));
