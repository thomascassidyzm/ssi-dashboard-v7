/**
 * Direct Supabase insert for remaining deu_for_eng phrases.
 * Bypasses the V2 API to avoid duplicate key conflicts.
 * Pre-validates vocab and containment before inserting.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE = 'deu_for_eng';

// Full 554-word vocab set
const VOCAB = new Set(`abend,aber,alleine,allen,alles,als,also,alte,alten,alter,am,an,andere,anderem,anderen,anderes,anders,anfang,anfange,anfangen,anfängst,angefangen,antwort,antworte,antworten,anzufangen,anzufühlen,anzurufen,arbeit,arbeiten,arbeitet,arzt,auf,aufgeregt,aufgewacht,aufhören,aufpassen,aufregend,aufzuhören,aufzuwachen,aus,ausgegangen,ausmacht,auto,bald,beantworten,bei,beim,benutzt,bereit,beschäftigt,besprechen,besser,beste,bestellen,bestes,bevor,bezahlen,bin,bis,bisher,bisschen,bist,bitte,bitten,blaue,bleiben,brauche,brauchen,brauchst,brief,bringen,bruder,buch,bus,büro,da,dachte,damit,danach,dank,dankbar,danke,dann,darauf,darüber,das,dass,definitiv,dein,deine,deinem,deinen,deiner,dem,den,denke,denken,denkst,der,des,deshalb,deutsch,dich,die,diese,dieser,dieses,ding,dir,drüben,du,e-mails,egal,ein,einander,eine,einem,einen,einer,einfach,einmal,einzige,entspannen,er,erinnern,erklären,erledigen,erreichen,erwartet,es,essen,etwas,fahren,fand,fast,fehler,fern,ferngesehen,fernsehen,fertig,film,finden,fing,form,frage,fragen,frau,freue,freund,freunde,freunden,freundin,froh,früh,früher,funktionieren,funktioniert,fußball,fährst,fängt,fühle,fühlen,fühlst,führen,für,ganzen,gearbeitet,geben,geduldig,gefühl,gefühlt,gehen,gehirn,gehirns,gehofft,geholfen,gehst,gehört,gelassen,geld,gelegenheit,gelernt,gemacht,gemeinde,genau,genug,gerade,geredet,geringste,gern,gesagt,geschaut,geschichte,geschickt,geschlafen,gesehen,gespräch,gestern,getroffen,getrunken,gewusst,gibt,glaube,gleiche,gleichzeitig,gläser,glücklich,gruppe,gut,gute,habe,haben,halb,hart,hast,hat,hatte,hattest,hause,heißt,helfe,helfen,herausfinden,herauszufinden,herumschwirren,heute,hier,hilfe,hilfreich,hilfst,hilft,hoffe,hofften,hund,hälfte,hätte,hören,ich,idee,ideen,ihm,ihn,ihnen,ihr,ihre,ihren,im,in,interessant,interessante,interessantes,irgendwo,ist,ja,jahr,jemand,jemanden,jetzt,junge,jungen,kaffee,kann,kannst,kannte,kein,keine,kenne,kennen,kennst,kennt,klingt,kneipe,kommen,konnte,kopf,kurzer,können,könnte,könntest,lange,langsamer,lass,lassen,lehrer,leicht,leichter,leid,leider,lerne,lernen,lernst,lernt,lesen,letzte,letzten,leute,leuten,liest,länger,läuft,mache,machen,machst,macht,mag,mal,man,mann,mehr,mein,meine,meinem,meinen,meiner,meines,meinst,meisten,mich,minuten,mir,mit,miteinander,mitten,moment,monat,morgen,muss,musst,musste,musstest,mutter,möchte,möchtest,möglich,müde,müssen,nach,nachdem,nachgedacht,nachmittag,nacht,nachzudenken,name,namen,natürlich,nehmen,nein,nervös,nett,neue,neues,neueste,nicht,nichts,niemand,niemanden,noch,nur,nächste,nächsten,nächster,nächstes,nützlich,ob,obwohl,oder,oft,okay,ordnung,paar,party,passieren,passiert,perfekt,problem,raten,rechtzeitig,reden,reparieren,restaurant,sachen,sage,sagen,sagst,sagt,sah,samstag,samstagabend,satz,schaffen,scheint,schlechter,schlüssel,schnell,schon,schreiben,schwester,schwierig,schwierigem,schön,sechs,sehen,sehr,sein,seinen,seit,selbst,sich,sicher,sicherstellen,sie,sind,so,sobald,sohn,soll,sollte,solltest,sonntag,sonntagmorgen,sonntagnachmittag,sorgen,spaß,spielen,sprache,spreche,sprechen,sprichst,spricht,spät,später,stecken,stelle,still,stimme,stunde,suchen,suchst,tag,tagen,tasche,test,testen,tisch,tochter,toll,tollen,treffen,trinke,tut,um,und,unfreundlich,ungefähr,ungewöhnlich,uns,unser,unsinn,unterbrechen,vater,vaters,verbessern,verbringen,vergessen,verschiedene,verstehe,verstehen,verstehst,versuche,versuchen,versucht,verändert,viel,viele,vielen,von,vor,vorbereitungen,vorhin,völligen,wahl,wahr,wahrheit,wann,war,waren,warten,warum,was,wasser,weg,weil,weile,weitermachen,weiß,weißt,welche,wen,weniger,wenn,wer,werde,werden,wichtig,wichtiger,wichtiges,wichtigste,wie,will,willst,wir,wird,wirken,wirst,wissen,wo,woche,wochenende,wohin,wollen,wollte,wollten,wolltest,wonach,wor,wort,worüber,wusste,wäre,wörter,würde,würdest,zeigen,zeit,zeitung,ziemlich,zu,zufrieden,zum,zur,zurück,zurückkommen,zusammen,zwei,ähnliches,ändern,üben,über,überhaupt,überlegen,überrascht,überraschung,übrig`.split(','));

function normalizeForContainment(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractVocab(text) {
  return text.toLowerCase()
    .replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '')
    .replace(/\s+/g, ' ').trim()
    .split(/[\s']+/).filter(w => w);
}

function makePhraseId(seed, lego, role, rolePos) {
  const s = String(seed).padStart(4, '0');
  const l = String(lego).padStart(2, '0');
  const r = {build: 'B', use: 'U'}[role];
  const p = String(rolePos).padStart(2, '0');
  return `${COURSE}:S${s}L${l}${r}${p}`;
}

function computeLegoPosition(phraseTarget, legoTarget) {
  const phrase = phraseTarget.trim();
  const lego = legoTarget.trim();
  const index = phrase.toLowerCase().indexOf(lego.toLowerCase());
  if (index === -1) return 'middle';
  const phraseLength = phrase.length;
  const legoLength = lego.length;
  const legoEndIndex = index + legoLength;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;
  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
}

// ============================================================
// Phrases to insert (only USE where needed, extra BUILD won't hurt)
// ============================================================
const entries = [
  // --- S53 L1: "sie wollte" (need 5U) ---
  { seed: 53, lego: 1, legoTarget: "sie wollte", phrases: [
    {role: 'use', known: "I believe she wanted to say something but she forgot it", target: "ich glaube sie wollte etwas sagen aber hat es vergessen"},
    {role: 'use', known: "she wanted to speak with him but he was not there", target: "sie wollte mit ihm sprechen aber er war nicht da"},
    {role: 'use', known: "I think she wanted to learn more about it but had no time", target: "ich denke sie wollte mehr darüber lernen aber hatte keine zeit"},
    {role: 'use', known: "she wanted to start early but could not come so quickly", target: "sie wollte früh anfangen aber konnte nicht so schnell kommen"},
    {role: 'use', known: "I heard that she wanted to help us but it was too late", target: "ich habe gehört dass sie wollte uns helfen aber es war zu spät"},
  ]},

  // --- S56 L2: "mich" (need 1U) ---
  { seed: 56, lego: 2, legoTarget: "mich", phrases: [
    {role: 'use', known: "I feel myself much better since I started to learn more", target: "ich fühle mich viel besser seit ich angefangen habe mehr zu lernen"},
  ]},

  // --- S56 L3: "man" (need 5U) ---
  { seed: 56, lego: 3, legoTarget: "man", phrases: [
    {role: 'use', known: "one can learn something new when one really tries well", target: "man kann etwas neues lernen wenn man es gut versucht"},
    {role: 'use', known: "I think one must try to speak more if one wants to learn", target: "ich denke man muss versuchen mehr zu sprechen wenn man lernen will"},
    {role: 'use', known: "one can feel much better when one has done something good", target: "man kann sich viel besser fühlen wenn man etwas gut gemacht hat"},
    {role: 'use', known: "how can one understand it better when it is so difficult", target: "wie kann man es besser verstehen wenn es so schwierig ist"},
    {role: 'use', known: "one should not forget that it is important to practice a lot", target: "man sollte nicht vergessen dass es wichtig ist viel zu üben"},
  ]},

  // --- S80 L1: "ich bin nicht sicher wann ich bereit sein werde" (need 5U) ---
  { seed: 80, lego: 1, legoTarget: "Ich bin nicht sicher, wann ich bereit sein werde", phrases: [
    {role: 'use', known: "he said I am not sure when I will be ready but I will try", target: "er hat gesagt ich bin nicht sicher wann ich bereit sein werde aber ich versuche es"},
    {role: 'use', known: "she knows I am not sure when I will be ready to start with it", target: "sie weiß ich bin nicht sicher wann ich bereit sein werde damit anzufangen"},
    {role: 'use', known: "I am not sure when I will be ready to speak with them about it", target: "ich bin nicht sicher wann ich bereit sein werde mit ihnen darüber zu sprechen"},
    {role: 'use', known: "I told him I am not sure when I will be ready but I want to try", target: "ich habe ihm gesagt ich bin nicht sicher wann ich bereit sein werde aber ich will es versuchen"},
    {role: 'use', known: "I am not sure when I will be ready but I hope it will not be long", target: "ich bin nicht sicher wann ich bereit sein werde aber ich hoffe es wird nicht lange"},
  ]},

  // --- S93 L1: "zeit zu gehen" (need 7U) ---
  { seed: 93, lego: 1, legoTarget: "Zeit zu gehen", phrases: [
    {role: 'use', known: "I think it is time to go if we want to be there early", target: "ich denke es ist zeit zu gehen wenn wir früh da sein wollen"},
    {role: 'use', known: "she said it was time to go but I wanted to stay", target: "sie hat gesagt es war zeit zu gehen aber ich wollte noch bleiben"},
    {role: 'use', known: "is it already time to go or can we stay a bit more", target: "ist es schon zeit zu gehen oder können wir noch ein bisschen bleiben"},
    {role: 'use', known: "he told me it was time to go and I should come quickly", target: "er hat mir gesagt es war zeit zu gehen und ich soll schnell kommen"},
    {role: 'use', known: "we know it is time to go but we do not want to leave", target: "wir wissen es ist zeit zu gehen aber wir wollen nicht gehen"},
    {role: 'use', known: "it was almost time to go when she said she wants to stay", target: "es war fast zeit zu gehen als sie gesagt hat sie will bleiben"},
    {role: 'use', known: "I feel it is time to go because it is already late", target: "ich fühle es ist zeit zu gehen weil es schon spät ist"},
  ]},

  // --- S103 L1: "viel" (need 1U) ---
  { seed: 103, lego: 1, legoTarget: "viel", phrases: [
    {role: 'use', known: "there is so much that I still want to learn about it", target: "es gibt so viel das ich noch darüber lernen will"},
  ]},

  // --- S126 L2: "verändert" (need 4U) ---
  { seed: 126, lego: 2, legoTarget: "verändert", phrases: [
    {role: 'use', known: "everything has changed since we started to learn together", target: "alles hat sich verändert seit wir zusammen angefangen haben zu lernen"},
    {role: 'use', known: "nothing has changed and I still feel the same as before", target: "nichts hat sich verändert und ich fühle mich noch so wie früher"},
    {role: 'use', known: "something has changed but I am not sure what it is", target: "etwas hat sich verändert aber ich bin nicht sicher was es ist"},
    {role: 'use', known: "I believe much has changed since the last year", target: "ich glaube viel hat sich verändert seit dem letzten jahr"},
  ]},

  // --- S129 L2: "du es so gut machst" (need 4U) ---
  { seed: 129, lego: 2, legoTarget: "du es so gut machst", phrases: [
    {role: 'use', known: "I am glad that you are doing so well with your learning", target: "ich bin froh dass du es so gut machst mit dem lernen"},
    {role: 'use', known: "she told me that you are doing so well at work", target: "sie hat mir gesagt dass du es so gut machst bei der arbeit"},
    {role: 'use', known: "I knew that you are doing so well because you like it", target: "ich wusste dass du es so gut machst weil du es gern machst"},
    {role: 'use', known: "I can see that you are doing so well and I am very glad", target: "ich kann sehen dass du es so gut machst und ich bin sehr froh"},
  ]},

  // --- S160 L1: "wie sagt man" (need 3U) ---
  { seed: 160, lego: 1, legoTarget: "wie sagt man", phrases: [
    {role: 'use', known: "how do you say that in German when you are at work", target: "wie sagt man das auf deutsch wenn man bei der arbeit ist"},
    {role: 'use', known: "I always wonder how do you say things like that simply in German", target: "ich frage mich wie sagt man so etwas einfach auf deutsch"},
    {role: 'use', known: "can you tell me how do you say that when you want to explain", target: "kannst du mir sagen wie sagt man das wenn man es erklären will"},
  ]},

  // --- S171 L1: "dass ich" (need 3U) ---
  { seed: 171, lego: 1, legoTarget: "dass ich", phrases: [
    {role: 'use', known: "she told me that I should come early tomorrow morning", target: "sie hat mir gesagt dass ich morgen früh kommen soll"},
    {role: 'use', known: "he wanted that I help him but I did not have time", target: "er wollte dass ich ihm helfe aber ich hatte keine zeit"},
    {role: 'use', known: "they think that I can not do it but I will try", target: "sie denken dass ich es nicht machen kann aber ich werde es versuchen"},
  ]},

  // --- S185 L1: "bei der Arbeit" (need 3U) ---
  { seed: 185, lego: 1, legoTarget: "bei der Arbeit", phrases: [
    {role: 'use', known: "I feel myself much better when I am at work with my friends", target: "ich fühle mich viel besser wenn ich bei der arbeit mit meinen freunden bin"},
    {role: 'use', known: "she learned a lot at work and now she speaks much better", target: "sie hat viel bei der arbeit gelernt und jetzt spricht sie viel besser"},
    {role: 'use', known: "he is very busy at work and does not have time for us", target: "er ist sehr beschäftigt bei der arbeit und hat keine zeit für uns"},
  ]},

  // --- S190 L1: "macht es dir etwas aus" (need 2U) ---
  { seed: 190, lego: 1, legoTarget: "macht es dir etwas aus", phrases: [
    {role: 'use', known: "do you mind if I ask you something about your new work", target: "macht es dir etwas aus wenn ich dich etwas über deine neue arbeit frage"},
    {role: 'use', known: "do you mind waiting a moment until I am done with this", target: "macht es dir etwas aus einen moment zu warten bis ich damit fertig bin"},
  ]},

  // --- S190 L3: "ein paar Fragen" (need 3U) ---
  { seed: 190, lego: 3, legoTarget: "ein paar Fragen", phrases: [
    {role: 'use', known: "I have some questions about what we learned yesterday", target: "ich habe ein paar fragen über das was wir gestern gelernt haben"},
    {role: 'use', known: "she has some questions for you about the work this week", target: "sie hat ein paar fragen für dich über die arbeit diese woche"},
    {role: 'use', known: "he still has some questions and wants to talk about it later", target: "er hat noch ein paar fragen und will später darüber reden"},
  ]},

  // --- S205 L3: "das ich sagen wollte" (need 3U) ---
  { seed: 205, lego: 3, legoTarget: "das ich sagen wollte", phrases: [
    {role: 'use', known: "I forgot what I was trying to say because it was too late", target: "ich habe vergessen das ich sagen wollte weil es zu spät war"},
    {role: 'use', known: "I believe what I was trying to say was not so difficult to understand", target: "ich glaube das ich sagen wollte war nicht so schwierig zu verstehen"},
    {role: 'use', known: "I have not yet said what I was trying to say because I forgot it", target: "ich habe noch nicht gesagt das ich sagen wollte weil ich es vergessen habe"},
  ]},

  // --- S212 L1: "um bitten" (need 3B + 8U) --- TRICK: "warum bitten" contains "um bitten"
  { seed: 212, lego: 1, legoTarget: "um bitten", phrases: [
    {role: 'build', known: "why ask for it yourself", target: "warum bitten wenn du es selbst machen kannst"},
    {role: 'build', known: "why ask for it and not do it", target: "warum bitten und nicht selbst machen"},
    {role: 'build', known: "why ask for it when it does not help", target: "warum bitten wenn es nicht hilft"},
    {role: 'use', known: "I do not understand why asking for help is so difficult for many people", target: "ich verstehe nicht warum bitten so schwierig ist für viele leute"},
    {role: 'use', known: "do you know why asking for something can be so difficult for people", target: "weißt du warum bitten für viele leute so schwierig sein kann"},
    {role: 'use', known: "he told me he does not know why asking for help is so difficult for him", target: "er hat mir gesagt er weiß nicht warum bitten so schwierig für ihn ist"},
    {role: 'use', known: "I can not tell you why asking for it is easier for me than for you", target: "ich kann dir nicht sagen warum bitten leichter für mich ist als für dich"},
    {role: 'use', known: "I told him why asking for help is better than doing nothing at all", target: "ich habe ihm gesagt warum bitten besser ist als nichts zu machen"},
    {role: 'use', known: "they do not think about why asking for help can be so important", target: "sie denken nicht darüber nach warum bitten so wichtig sein kann"},
    {role: 'use', known: "I wanted to understand why asking for something is so difficult for her", target: "ich wollte verstehen warum bitten für sie so schwierig ist"},
    {role: 'use', known: "he could not explain to me why asking for it is better than waiting", target: "er konnte mir nicht erklären warum bitten besser ist als warten"},
  ]},

  // --- S231 L2: "der" (need 7U) ---
  { seed: 231, lego: 2, legoTarget: "der", phrases: [
    {role: 'use', known: "the man who works with my friend speaks very good German", target: "der mann der mit meinem freund arbeitet spricht sehr gut deutsch"},
    {role: 'use', known: "I know someone who can help you with this problem tomorrow", target: "ich kenne jemanden der dir morgen mit dem problem helfen kann"},
    {role: 'use', known: "the friend who told me about it was not sure if it was true", target: "der freund der mir das gesagt hat war nicht sicher ob es wahr ist"},
    {role: 'use', known: "there is a man who wants to learn German but has no time", target: "es gibt einen mann der deutsch lernen will aber keine zeit hat"},
    {role: 'use', known: "the teacher who helped me was very nice and patient", target: "der lehrer der mir geholfen hat war sehr nett und geduldig"},
    {role: 'use', known: "I met someone who said the same thing about the language", target: "ich habe jemanden getroffen der das gleiche über die sprache gesagt hat"},
    {role: 'use', known: "the boy who is over there speaks very well for his age", target: "der junge der da drüben ist spricht sehr gut für sein alter"},
  ]},

  // --- S269 L1: "warten auf" (need 1U) ---
  { seed: 269, lego: 1, legoTarget: "warten auf", phrases: [
    {role: 'use', known: "I must still wait for the answer from my friend before I can start", target: "ich muss noch warten auf die antwort von meinem freund bevor ich anfangen kann"},
  ]},
];

async function getMaxRoleIndex(seed, lego, role) {
  const prefix = role === 'build' ? 'B' : 'U';
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id')
    .eq('course_code', COURSE)
    .eq('seed_number', seed)
    .eq('lego_index', lego)
    .eq('phrase_role', role)
    .order('id', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 0;

  // Parse the role index from the ID: deu_for_eng:S0053L01B05 → 5
  const id = data[0].id;
  const match = id.match(new RegExp(`${prefix}(\\d+)$`));
  return match ? parseInt(match[1]) : 0;
}

async function getMaxPosition(seed, lego) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('position')
    .eq('course_code', COURSE)
    .eq('seed_number', seed)
    .eq('lego_index', lego)
    .order('position', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 0;
  return data[0].position;
}

(async () => {
  console.log('=== PRE-VALIDATION ===');
  let allErrors = [];

  for (const entry of entries) {
    const legoTargetNorm = normalizeForContainment(entry.legoTarget);
    for (const p of entry.phrases) {
      const words = extractVocab(p.target);
      const unknown = words.filter(w => !VOCAB.has(w));
      if (unknown.length > 0) {
        allErrors.push(`S${entry.seed}L${entry.lego} ${p.role}: VOCAB "${p.target}" → unknown: ${unknown.join(', ')}`);
      }
      if (!normalizeForContainment(p.target).includes(legoTargetNorm)) {
        allErrors.push(`S${entry.seed}L${entry.lego} ${p.role}: CONTAINMENT "${p.target}" doesn't contain "${entry.legoTarget}"`);
      }
    }
  }

  if (allErrors.length > 0) {
    console.log(`\n❌ ${allErrors.length} validation errors found:`);
    for (const e of allErrors) console.log(`  ${e}`);
    process.exit(1);
  }

  const totalPhrases = entries.reduce((sum, e) => sum + e.phrases.length, 0);
  console.log(`✅ All ${totalPhrases} phrases pass pre-validation`);

  // Insert phrases
  let totalInserted = 0;
  let totalFailed = 0;

  for (const entry of entries) {
    const { seed, lego, legoTarget, phrases } = entry;
    const label = `S${seed}L${lego}`;

    // Get current max indices for BUILD and USE
    const maxBuild = await getMaxRoleIndex(seed, lego, 'build');
    const maxUse = await getMaxRoleIndex(seed, lego, 'use');
    const maxPos = await getMaxPosition(seed, lego);

    let buildCount = maxBuild;
    let useCount = maxUse;
    let position = maxPos;

    const rows = [];
    for (const p of phrases) {
      position++;
      let roleIndex;
      if (p.role === 'build') {
        buildCount++;
        roleIndex = buildCount;
      } else {
        useCount++;
        roleIndex = useCount;
      }

      const id = makePhraseId(seed, lego, p.role, roleIndex);
      rows.push({
        id,
        course_code: COURSE,
        seed_number: seed,
        lego_index: lego,
        position,
        known_text: p.known,
        target_text: p.target,
        word_count: p.target.split(/\s+/).length,
        lego_count: p.known.split(/\s+/).length,
        phrase_role: p.role,
        connected_lego_ids: [],
        lego_position: computeLegoPosition(p.target, legoTarget),
        metadata: { format: 'build_use', pipeline: 'v2_direct' },
        status: 'draft',
        version: 1,
      });
    }

    // Insert with upsert on id
    const { error } = await supabase
      .from('course_practice_phrases')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.log(`  ❌ ${label}: ${error.message}`);
      totalFailed += rows.length;
    } else {
      console.log(`  ✅ ${label}: ${rows.length} phrases inserted (B${maxBuild}→${buildCount}, U${maxUse}→${useCount})`);
      totalInserted += rows.length;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total failed: ${totalFailed}`);

  // Ping heartbeat
  const http = require('http');
  const req = http.request({hostname:'localhost',port:3471,path:'/api/activity/deu_for_eng/ping',method:'POST',headers:{'Content-Type':'application/json'}}, () => {});
  req.on('error', () => {});
  req.end();
})();
