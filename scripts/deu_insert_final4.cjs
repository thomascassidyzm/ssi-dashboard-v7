/**
 * Insert remaining USE phrases for 4 LEGOs that are still short.
 * S80L1 (need 1U), S185L1 (need 1U), S190L1 (need 2U), S269L1 (need 1U)
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const COURSE = 'deu_for_eng';

const VOCAB = new Set(`abend,aber,alleine,allen,alles,als,also,alte,alten,alter,am,an,andere,anderem,anderen,anderes,anders,anfang,anfange,anfangen,anfängst,angefangen,antwort,antworte,antworten,anzufangen,anzufühlen,anzurufen,arbeit,arbeiten,arbeitet,arzt,auf,aufgeregt,aufgewacht,aufhören,aufpassen,aufregend,aufzuhören,aufzuwachen,aus,ausgegangen,ausmacht,auto,bald,beantworten,bei,beim,benutzt,bereit,beschäftigt,besprechen,besser,beste,bestellen,bestes,bevor,bezahlen,bin,bis,bisher,bisschen,bist,bitte,bitten,blaue,bleiben,brauche,brauchen,brauchst,brief,bringen,bruder,buch,bus,büro,da,dachte,damit,danach,dank,dankbar,danke,dann,darauf,darüber,das,dass,definitiv,dein,deine,deinem,deinen,deiner,dem,den,denke,denken,denkst,der,des,deshalb,deutsch,dich,die,diese,dieser,dieses,ding,dir,drüben,du,e-mails,egal,ein,einander,eine,einem,einen,einer,einfach,einmal,einzige,entspannen,er,erinnern,erklären,erledigen,erreichen,erwartet,es,essen,etwas,fahren,fand,fast,fehler,fern,ferngesehen,fernsehen,fertig,film,finden,fing,form,frage,fragen,frau,freue,freund,freunde,freunden,freundin,froh,früh,früher,funktionieren,funktioniert,fußball,fährst,fängt,fühle,fühlen,fühlst,führen,für,ganzen,gearbeitet,geben,geduldig,gefühl,gefühlt,gehen,gehirn,gehirns,gehofft,geholfen,gehst,gehört,gelassen,geld,gelegenheit,gelernt,gemacht,gemeinde,genau,genug,gerade,geredet,geringste,gern,gesagt,geschaut,geschichte,geschickt,geschlafen,gesehen,gespräch,gestern,getroffen,getrunken,gewusst,gibt,glaube,gleiche,gleichzeitig,gläser,glücklich,gruppe,gut,gute,habe,haben,halb,hart,hast,hat,hatte,hattest,hause,heißt,helfe,helfen,herausfinden,herauszufinden,herumschwirren,heute,hier,hilfe,hilfreich,hilfst,hilft,hoffe,hofften,hund,hälfte,hätte,hören,ich,idee,ideen,ihm,ihn,ihnen,ihr,ihre,ihren,im,in,interessant,interessante,interessantes,irgendwo,ist,ja,jahr,jemand,jemanden,jetzt,junge,jungen,kaffee,kann,kannst,kannte,kein,keine,kenne,kennen,kennst,kennt,klingt,kneipe,kommen,konnte,kopf,kurzer,können,könnte,könntest,lange,langsamer,lass,lassen,lehrer,leicht,leichter,leid,leider,lerne,lernen,lernst,lernt,lesen,letzte,letzten,leute,leuten,liest,länger,läuft,mache,machen,machst,macht,mag,mal,man,mann,mehr,mein,meine,meinem,meinen,meiner,meines,meinst,meisten,mich,minuten,mir,mit,miteinander,mitten,moment,monat,morgen,muss,musst,musste,musstest,mutter,möchte,möchtest,möglich,müde,müssen,nach,nachdem,nachgedacht,nachmittag,nacht,nachzudenken,name,namen,natürlich,nehmen,nein,nervös,nett,neue,neues,neueste,nicht,nichts,niemand,niemanden,noch,nur,nächste,nächsten,nächster,nächstes,nützlich,ob,obwohl,oder,oft,okay,ordnung,paar,party,passieren,passiert,perfekt,problem,raten,rechtzeitig,reden,reparieren,restaurant,sachen,sage,sagen,sagst,sagt,sah,samstag,samstagabend,satz,schaffen,scheint,schlechter,schlüssel,schnell,schon,schreiben,schwester,schwierig,schwierigem,schön,sechs,sehen,sehr,sein,seinen,seit,selbst,sich,sicher,sicherstellen,sie,sind,so,sobald,sohn,soll,sollte,solltest,sonntag,sonntagmorgen,sonntagnachmittag,sorgen,spaß,spielen,sprache,spreche,sprechen,sprichst,spricht,spät,später,stecken,stelle,still,stimme,stunde,suchen,suchst,tag,tagen,tasche,test,testen,tisch,tochter,toll,tollen,treffen,trinke,tut,um,und,unfreundlich,ungefähr,ungewöhnlich,uns,unser,unsinn,unterbrechen,vater,vaters,verbessern,verbringen,vergessen,verschiedene,verstehe,verstehen,verstehst,versuche,versuchen,versucht,verändert,viel,viele,vielen,von,vor,vorbereitungen,vorhin,völligen,wahl,wahr,wahrheit,wann,war,waren,warten,warum,was,wasser,weg,weil,weile,weitermachen,weiß,weißt,welche,wen,weniger,wenn,wer,werde,werden,wichtig,wichtiger,wichtiges,wichtigste,wie,will,willst,wir,wird,wirken,wirst,wissen,wo,woche,wochenende,wohin,wollen,wollte,wollten,wolltest,wonach,wor,wort,worüber,wusste,wäre,wörter,würde,würdest,zeigen,zeit,zeitung,ziemlich,zu,zufrieden,zum,zur,zurück,zurückkommen,zusammen,zwei,ähnliches,ändern,üben,über,überhaupt,überlegen,überrascht,überraschung,übrig`.split(','));

function normalizeForContainment(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '').replace(/\s+/g, ' ').trim();
}

function extractVocab(text) {
  return text.toLowerCase().replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '').replace(/\s+/g, ' ').trim().split(/[\s']+/).filter(w => w);
}

function computeLegoPosition(phraseTarget, legoTarget) {
  const phrase = phraseTarget.trim();
  const lego = legoTarget.trim();
  const index = phrase.toLowerCase().indexOf(lego.toLowerCase());
  if (index === -1) return 'middle';
  const phraseLength = phrase.length;
  const centerPercent = (index + (lego.length / 2)) / phraseLength;
  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
}

const entries = [
  { seed: 80, lego: 1, legoTarget: "Ich bin nicht sicher, wann ich bereit sein werde", phrases: [
    {role:'use', known:"I am not sure when I will be ready to help you with it", target:"ich bin nicht sicher wann ich bereit sein werde dir damit zu helfen"},
  ]},
  { seed: 185, lego: 1, legoTarget: "bei der Arbeit", phrases: [
    {role:'use', known:"something interesting has happened at work that I want to tell you", target:"etwas interessantes ist bei der arbeit passiert das ich dir sagen will"},
  ]},
  { seed: 190, lego: 1, legoTarget: "macht es dir etwas aus", phrases: [
    {role:'use', known:"do you mind if I speak German with you because I want to practice", target:"macht es dir etwas aus wenn ich deutsch mit dir spreche weil ich üben will"},
    {role:'use', known:"do you mind if we talk about this later because I am busy now", target:"macht es dir etwas aus wenn wir später darüber reden weil ich jetzt beschäftigt bin"},
  ]},
  { seed: 269, lego: 1, legoTarget: "warten auf", phrases: [
    {role:'use', known:"I had to wait for my sister because she was not ready yet", target:"ich musste warten auf meine schwester weil sie noch nicht bereit war"},
  ]},
];

(async () => {
  // Pre-validate
  let errors = [];
  for (const entry of entries) {
    const legoNorm = normalizeForContainment(entry.legoTarget);
    for (const p of entry.phrases) {
      const words = extractVocab(p.target);
      const unknown = words.filter(w => !VOCAB.has(w));
      if (unknown.length > 0) errors.push(`S${entry.seed}L${entry.lego}: VOCAB unknown: ${unknown.join(', ')}`);
      if (!normalizeForContainment(p.target).includes(legoNorm)) errors.push(`S${entry.seed}L${entry.lego}: CONTAINMENT fail`);
    }
  }
  if (errors.length > 0) { console.log('ERRORS:', errors); process.exit(1); }
  console.log('✅ Pre-validation passed');

  let totalInserted = 0;
  for (const entry of entries) {
    const {seed, lego, legoTarget, phrases} = entry;
    // Get max USE index
    const {data} = await sb.from('course_practice_phrases').select('id')
      .eq('course_code',COURSE).eq('seed_number',seed).eq('lego_index',lego).eq('phrase_role','use')
      .order('id',{ascending:false}).limit(1);
    let maxUse = 0;
    if (data && data.length > 0) {
      const m = data[0].id.match(/U(\d+)$/);
      if (m) maxUse = parseInt(m[1]);
    }
    const {data: posData} = await sb.from('course_practice_phrases').select('position')
      .eq('course_code',COURSE).eq('seed_number',seed).eq('lego_index',lego)
      .order('position',{ascending:false}).limit(1);
    let maxPos = posData && posData.length > 0 ? posData[0].position : 0;

    const rows = [];
    for (const p of phrases) {
      maxUse++;
      maxPos++;
      rows.push({
        id: `${COURSE}:S${String(seed).padStart(4,'0')}L${String(lego).padStart(2,'0')}U${String(maxUse).padStart(2,'0')}`,
        course_code: COURSE, seed_number: seed, lego_index: lego,
        position: maxPos, known_text: p.known, target_text: p.target,
        word_count: p.target.split(/\s+/).length,
        lego_count: p.known.split(/\s+/).length,
        phrase_role: 'use', connected_lego_ids: [],
        lego_position: computeLegoPosition(p.target, legoTarget),
        metadata: {format:'build_use', pipeline:'v2_direct'},
        status: 'draft', version: 1,
      });
    }
    const {error} = await sb.from('course_practice_phrases').upsert(rows, {onConflict:'id'});
    if (error) console.log(`❌ S${seed}L${lego}: ${error.message}`);
    else { console.log(`✅ S${seed}L${lego}: ${rows.length} USE inserted (U→${maxUse})`); totalInserted += rows.length; }
  }
  console.log(`Total inserted: ${totalInserted}`);
})();
