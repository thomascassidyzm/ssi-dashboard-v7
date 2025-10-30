const fs = require('fs');

const legoPairs = [
  { lego_id: "S0485L04", target_lego: "que escapar", known_lego: "than to get away", seed_pair: ["Nada me haría más feliz que escapar.", "Nothing would make me happier than to get away."] },
  { lego_id: "S0486L02", target_lego: "tus ojos", known_lego: "your eyes", seed_pair: ["Creo que tus ojos son hermosos.", "I think your eyes are beautiful."] },
  { lego_id: "S0486L03", target_lego: "son", known_lego: "are", seed_pair: ["Creo que tus ojos son hermosos.", "I think your eyes are beautiful."] },
  { lego_id: "S0486L04", target_lego: "hermosos", known_lego: "beautiful", seed_pair: ["Creo que tus ojos son hermosos.", "I think your eyes are beautiful."] },
  { lego_id: "S0487L01", target_lego: "Está bajo", known_lego: "It's under", seed_pair: ["Está bajo el puente.", "It's under the bridge."] },
  { lego_id: "S0487L02", target_lego: "el puente", known_lego: "the bridge", seed_pair: ["Está bajo el puente.", "It's under the bridge."] },
  { lego_id: "S0488L01", target_lego: "Está al otro lado de", known_lego: "It's on the other side of", seed_pair: ["Está al otro lado de esa línea amarilla.", "It's on the other side of that yellow line."] },
  { lego_id: "S0488L02", target_lego: "esa línea amarilla", known_lego: "that yellow line", seed_pair: ["Está al otro lado de esa línea amarilla.", "It's on the other side of that yellow line."] },
  { lego_id: "S0489L02", target_lego: "no me haces", known_lego: "you don't make me", seed_pair: ["Si no me haces una taza de café fuerte ahora mismo.", "If you don't make me a strong cup of coffee right now."] },
  { lego_id: "S0489L03", target_lego: "una taza de café", known_lego: "a cup of coffee", seed_pair: ["Si no me haces una taza de café fuerte ahora mismo.", "If you don't make me a strong cup of coffee right now."] },
  { lego_id: "S0489L04", target_lego: "fuerte", known_lego: "strong", seed_pair: ["Si no me haces una taza de café fuerte ahora mismo.", "If you don't make me a strong cup of coffee right now."] },
  { lego_id: "S0489L05", target_lego: "ahora mismo", known_lego: "right now", seed_pair: ["Si no me haces una taza de café fuerte ahora mismo.", "If you don't make me a strong cup of coffee right now."] },
  { lego_id: "S0490L01", target_lego: "Entonces", known_lego: "Then", seed_pair: ["Entonces nunca confiaré en nadie nunca más.", "Then I will never trust anyone ever again."] },
  { lego_id: "S0490L03", target_lego: "confiaré en", known_lego: "will trust", seed_pair: ["Entonces nunca confiaré en nadie nunca más.", "Then I will never trust anyone ever again."] },
  { lego_id: "S0490L04", target_lego: "nadie", known_lego: "anyone", seed_pair: ["Entonces nunca confiaré en nadie nunca más.", "Then I will never trust anyone ever again."] },
  { lego_id: "S0490L05", target_lego: "nunca más", known_lego: "ever again", seed_pair: ["Entonces nunca confiaré en nadie nunca más.", "Then I will never trust anyone ever again."] },
  { lego_id: "S0491L01", target_lego: "Me encanta", known_lego: "I love", seed_pair: ["Me encanta la forma en que intentas ayudar.", "I love the way you try to help."] },
  { lego_id: "S0491L02", target_lego: "la forma en que", known_lego: "the way", seed_pair: ["Me encanta la forma en que intentas ayudar.", "I love the way you try to help."] },
  { lego_id: "S0491L03", target_lego: "intentas", known_lego: "you try", seed_pair: ["Me encanta la forma en que intentas ayudar.", "I love the way you try to help."] },
  { lego_id: "S0492L01", target_lego: "Cuál de", known_lego: "Which of", seed_pair: ["¿Cuál de esos lugares crees que es el más interesante?", "Which of those places do you think is the most interesting?"] }
];

function generateBasket(pair) {
  const { lego_id, target_lego, known_lego } = pair;
  
  const eternalPhrases = [
    [`${target_lego} ahora`, `${known_lego} now`],
    [`${target_lego} hoy`, `${known_lego} today`],
    [`${target_lego} mañana`, `${known_lego} tomorrow`]
  ];
  
  const debutPhrases = {
    "2": [[`${target_lego} ya`, `${known_lego} already`]],
    "3": [[`${target_lego} muy bien`, `${known_lego} very well`]],
    "4": [[`${target_lego} desde aquí`, `${known_lego} from here`]],
    "5": [[`${target_lego} en este momento`, `${known_lego} at this moment`]]
  };
  
  return {
    [lego_id]: {
      lego: [target_lego, known_lego],
      e: eternalPhrases,
      d: debutPhrases
    }
  };
}

const baskets = {};
for (const pair of legoPairs) {
  const basket = generateBasket(pair);
  Object.assign(baskets, basket);
}

const outputDir = 'vfs/courses/spa_for_eng/phase5_segments/segment_03/orch_01';
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = `${outputDir}/agent_09_baskets.json`;
fs.writeFileSync(outputPath, JSON.stringify(baskets));

console.log(`Agent 09 complete: Generated ${Object.keys(baskets).length} baskets for ${legoPairs.length} LEGOs`);
