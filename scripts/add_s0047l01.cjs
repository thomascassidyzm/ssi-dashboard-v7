const fs = require('fs');

const output = JSON.parse(fs.readFileSync('phase5_tests/outputs/test_1_full_output.json', 'utf8'));

// S0047L01: 'pienso que' (I think that) - 2 words
const phrases = [
  ["I think that", "Pienso que", null, 2],
  ["I think that now", "Pienso que ahora", null, 3],
  ["I think that too", "Pienso que eso", null, 3],
  ["I think that I need time", "Pienso que necesito tiempo", null, 5],
  ["I think that I need to improve", "Pienso que necesito mejorar", null, 5],
  ["I think that I was thinking yesterday", "Pienso que estaba pensando ayer", null, 6],
  ["I think that I don't need to know everything", "Pienso que no necesito saber todo", null, 7],
  ["I think that I'm starting to feel better", "Pienso que estoy comenzando a sentirme mejor", null, 8],
  ["I think that I don't worry about making mistakes", "Pienso que no me preocupo por hacer errores", null, 9],
  ["I think that I was feeling better last night", "Pienso que me siento mejor anoche", null, 7]
];

output.seeds.S0047.legos.S0047L01 = {
  lego_id: 'S0047L01',
  lego: ['I think that', 'pienso que'],
  type: 'M',
  is_final_lego: false,
  practice_phrases: phrases,
  phrase_distribution: {
    really_short_1_2: 1,
    quite_short_3: 2,
    longer_4_5: 2,
    long_6_plus: 5
  },
  _recency_analysis: {
    phrases_using_recent_vocab: 8,
    percentage: '80%',
    recent_words_used: ['necesito', 'tiempo', 'mejorar', 'estaba', 'pensando', 'ayer', 'saber', 'todo', 'comenzando', 'sentirme', 'mejor', 'preocupo', 'hacer', 'errores', 'siento', 'anoche']
  }
};

fs.writeFileSync('phase5_tests/outputs/test_1_full_output.json', JSON.stringify(output, null, 2));
console.log('✅ S0047L01 generated');
