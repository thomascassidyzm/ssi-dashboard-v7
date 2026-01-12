const fs = require('fs');
const path = require('path');

// Read lego_pairs.json to get available vocabulary
const legoData = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../public/vfs/courses/zho_for_eng/lego_pairs.json'),
  'utf8'
));

// Extract all LEGOs up to S0047
const availableLegos = [];
for (const seed of legoData.seeds) {
  const seedNum = parseInt(seed.seed_id.substring(1));
  if (seedNum <= 47) {
    for (const lego of seed.legos) {
      availableLegos.push({
        id: lego.id,
        known: lego.known,
        target: lego.target,
        type: lego.type,
        seed: seed.seed_id
      });
    }
  }
}

console.log(`Available LEGOs up to S0047: ${availableLegos.length}`);

// Generate practice phrases for S0046L03: "making mistakes" / "犯错"
const s0046l03Basket = {
  lego: {
    known: "making mistakes",
    target: "犯错"
  },
  practice_phrases: [
    {
      known: "I don't like making mistakes.",
      target: "我不喜欢犯错。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 1
    },
    {
      known: "Making mistakes is normal.",
      target: "犯错很正常。",
      syllable_count: 5,
      word_count: 5,
      lego_count: 2,
      position: 2
    },
    {
      known: "I don't worry about making mistakes.",
      target: "我不担心犯错。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 3
    },
    {
      known: "She doesn't worry about making mistakes.",
      target: "她不担心犯错。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 4
    },
    {
      known: "I don't care about making mistakes.",
      target: "我不在意犯错。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 5
    },
    {
      known: "Making mistakes helps you learn.",
      target: "犯错帮你学习。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 6
    },
    {
      known: "I think that making mistakes is good.",
      target: "我认为犯错是好的。",
      syllable_count: 7,
      word_count: 7,
      lego_count: 4,
      position: 7
    },
    {
      known: "He said that he doesn't worry about making mistakes.",
      target: "他说他不担心犯错。",
      syllable_count: 8,
      word_count: 8,
      lego_count: 5,
      position: 8
    },
    {
      known: "I know someone who doesn't worry about making mistakes.",
      target: "我认识一个不担心犯错的人。",
      syllable_count: 11,
      word_count: 11,
      lego_count: 5,
      position: 9
    },
    {
      known: "She told me that making mistakes is a good thing.",
      target: "她告诉我犯错是件好事。",
      syllable_count: 10,
      word_count: 10,
      lego_count: 5,
      position: 10
    }
  ],
  is_final_lego: false,
  phrase_count: 10
};

// Generate practice phrases for S0047L01: "I think" / "我认为"
const s0047l01Basket = {
  lego: {
    known: "I think",
    target: "我认为"
  },
  practice_phrases: [
    {
      known: "I think so.",
      target: "我认为是的。",
      syllable_count: 4,
      word_count: 4,
      lego_count: 2,
      position: 1
    },
    {
      known: "I think it's good.",
      target: "我认为很好。",
      syllable_count: 5,
      word_count: 5,
      lego_count: 2,
      position: 2
    },
    {
      known: "I think you can help.",
      target: "我认为你能帮忙。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 3
    },
    {
      known: "I think she wants to learn.",
      target: "我认为她想学。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 4,
      position: 4
    },
    {
      known: "I think it's a good thing.",
      target: "我认为是件好事。",
      syllable_count: 6,
      word_count: 6,
      lego_count: 3,
      position: 5
    },
    {
      known: "I think that making mistakes is good.",
      target: "我认为犯错是好的。",
      syllable_count: 7,
      word_count: 7,
      lego_count: 4,
      position: 6
    },
    {
      known: "I think he said something yesterday.",
      target: "我认为他昨天说了些什么。",
      syllable_count: 9,
      word_count: 9,
      lego_count: 5,
      position: 7
    },
    {
      known: "I think you should try to help her.",
      target: "我认为你应该试着帮她。",
      syllable_count: 9,
      word_count: 9,
      lego_count: 5,
      position: 8
    },
    {
      known: "I think that making mistakes is a good thing to do.",
      target: "我认为犯错是件好事。",
      syllable_count: 11,
      word_count: 11,
      lego_count: 5,
      position: 9
    },
    {
      known: "I think she told me that she wants to learn Chinese.",
      target: "我认为她告诉我她想学中文。",
      syllable_count: 11,
      word_count: 11,
      lego_count: 6,
      position: 10
    }
  ],
  is_final_lego: false,
  phrase_count: 10
};

// Create the baskets object
const baskets = {
  S0046L03: s0046l03Basket,
  S0047L01: s0047l01Basket
};

// Write output
const outputPath = path.join(__dirname, 'practice_phrases_s0046_s0047.json');
fs.writeFileSync(outputPath, JSON.stringify(baskets, null, 2));
console.log(`\nGenerated practice phrases written to: ${outputPath}`);
console.log(`\nS0046L03 (making mistakes / 犯错): ${s0046l03Basket.phrase_count} phrases`);
console.log(`S0047L01 (I think / 我认为): ${s0047l01Basket.phrase_count} phrases`);
