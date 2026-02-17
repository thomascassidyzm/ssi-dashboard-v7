require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { supabase } = require('../services/supabase-client.cjs');

const translations = [
  [1, "Ich will jetzt mit dir Deutsch sprechen."],
  [2, "Ich versuche zu lernen."],
  [3, "Ich versuche, so oft wie möglich zu sprechen."],
  [4, "Ich versuche, etwas auf Deutsch zu sagen."],
  [5, "Ich werde mit jemand anderem sprechen üben."],
  [6, "Ich versuche, mich an ein Wort zu erinnern."],
  [7, "Ich will heute mein Bestes versuchen."],
  [8, "Ich versuche zu erklären, was ich meine."],
  [9, "Ich spreche jetzt ein bisschen Deutsch."],
  [10, "Ich bin nicht sicher, ob ich den ganzen Satz erinnern kann."],
  [11, "Ich möchte nach dir sprechen können."],
  [12, "Ich möchte nicht raten, was morgen passiert."],
  [13, "Du sprichst sehr gut Deutsch."],
  [14, "Sprichst du den ganzen Tag Deutsch?"],
  [15, "Und ich will morgen mit dir Deutsch sprechen."],
  [16, "Er will später mit allen anderen zurückkommen."],
  [17, "Sie will herausfinden, was die Antwort ist."],
  [18, "Wir wollen uns heute Abend um sechs treffen."],
  [19, "Aber ich will nicht aufhören zu sprechen."],
  [20, "Du willst seinen Namen schnell lernen."],
  [21, "Warum lernst du ihren Namen?"],
  [22, "Weil ich Leute treffen will, die Deutsch sprechen."],
  [23, "Ich werde bald mehr sprechen anfangen."],
  [24, "Ich werde mich nicht leicht erinnern können."],
  [25, "Wirst du mir helfen, bevor ich gehen muss?"],
  [26, "Ich mag das Gefühl, fast bereit zu sein zu gehen."],
  [27, "Ich mag es nicht, zu viel Zeit zum Antworten zu brauchen."],
  [28, "Es ist nützlich, so früh wie möglich zu sprechen."],
  [29, "Ich freue mich darauf, bald besser zu sprechen."],
  [30, "Ich wollte dich gestern etwas fragen."],
  [31, "Du wolltest heute Abend mit mir sprechen."],
  [32, "Wolltest du mir etwas zeigen?"],
  [33, "Wie lange lernst du schon Deutsch?"],
  [34, "Er will nicht still sein, wenn andere Leute hier sind."],
  [35, "Sie will heute Nachmittag nichts lesen."],
  [36, "Wir wollen die Geschichte nicht unterbrechen."],
  [37, "Ich habe letzten Monat angefangen, darüber nachzudenken."],
  [38, "Ich lerne seit ungefähr einer Woche."],
  [39, "Aber ich bin heute Morgen ein bisschen müde."],
  [40, "Wie fühlst du dich im Moment?"],
  [41, "Ich fühle mich okay, aber ich werde müde."],
  [42, "Ich fing an, mich besser zu fühlen als letzte Nacht."],
  [43, "Ich habe nicht darüber nachgedacht, wie ich antworten soll."],
  [44, "Oder ob ich mich verbessern muss."],
  [45, "Ich muss nicht alles wissen."],
  [46, "Aber ich mache mir keine Sorgen über Fehler."],
  [47, "Weil ich denke, dass Fehler gut sind."],
  [48, "Es ist mir egal, Fehler zu machen."],
  [49, "Es ist so, wenn du weißt, was ich meine."],
  [50, "Ich versuche nicht, so schnell wie möglich fertig zu werden."],
];

async function main() {
  let updated = 0;
  let errors = 0;
  for (const [seedNum, targetText] of translations) {
    const { error } = await supabase
      .from('course_seeds')
      .update({ target_text: targetText })
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', seedNum);
    if (error) {
      console.error(`S${seedNum}: ${error.message}`);
      errors++;
    } else {
      updated++;
    }
  }
  console.log(`Updated ${updated} seed translations (${errors} errors)`);
}

main().catch(e => { console.error(e); process.exit(1); });
