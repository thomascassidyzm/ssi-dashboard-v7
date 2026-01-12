#!/usr/bin/env node

/**
 * Generate practice baskets for S0051L05 and S0051L06
 * LEGOs: "things" (事), "my friends" (朋友)
 * Vocabulary scope: S0001-S0051
 */

const baskets = {
  S0051L05: {
    lego_id: "S0051L05",
    lego: { known: "things", target: "事" },
    practice_phrases: [
      // Complete LEGO (1 phrase)
      { known: "things", target: "事" },

      // 2-word phrases (2 phrases)
      { known: "interesting things", target: "有趣的事" },
      { known: "many things", target: "很多事" },

      // 2-word phrases (2 phrases)
      { known: "difficult things", target: "困难的事" },
      { known: "important things", target: "重要的事" },

      // 2-word phrases (2 phrases)
      { known: "good things", target: "好事" },
      { known: "new things", target: "新事" },

      // 4-word phrases (4 phrases)
      { known: "I want to do things", target: "我想做事" },
      { known: "I enjoy doing things", target: "我喜欢做事" },
      { known: "trying to remember things", target: "努力记住事" },
      { known: "I don't want those things", target: "我不想要那些事" }
    ]
  },

  S0051L06: {
    lego_id: "S0051L06",
    lego: { known: "my friends", target: "朋友" },
    practice_phrases: [
      // Complete LEGO (1 phrase)
      { known: "my friends", target: "朋友" },

      // 2-word phrases (2 phrases)
      { known: "my good friends", target: "我的好朋友" },
      { known: "many friends", target: "很多朋友" },

      // 2-word phrases (2 phrases)
      { known: "my Chinese friends", target: "我的中文朋友" },
      { known: "with friends", target: "和朋友" },

      // 2-word phrases (2 phrases)
      { known: "help friends", target: "帮助朋友" },
      { known: "my new friends", target: "我的新朋友" },

      // 4-word phrases (4 phrases)
      { known: "I want to help my friends", target: "我想帮助朋友" },
      { known: "I enjoy speaking with my friends", target: "我喜欢和朋友说话" },
      { known: "my friends speak Chinese well", target: "朋友中文说得很好" },
      { known: "I'm going with my friends", target: "我和朋友一起去" }
    ]
  }
};

// Format for upload
const payloads = {
  S0051L05: {
    course: "zho_for_eng",
    seed: "S0051",
    baskets: {
      S0051L05: baskets.S0051L05
    }
  },
  S0051L06: {
    course: "zho_for_eng",
    seed: "S0051",
    baskets: {
      S0051L06: baskets.S0051L06
    }
  }
};

// Write to files for inspection
const fs = require('fs');
const path = require('path');

const outputDir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp';

fs.writeFileSync(
  path.join(outputDir, 'basket_S0051L05.json'),
  JSON.stringify(payloads.S0051L05, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'basket_S0051L06.json'),
  JSON.stringify(payloads.S0051L06, null, 2)
);

console.log('✓ Generated baskets:');
console.log('  - S0051L05 (things): 10 practice phrases');
console.log('  - S0051L06 (my friends): 10 practice phrases');
console.log('\nFiles written to:');
console.log('  - scripts/batch-temp/basket_S0051L05.json');
console.log('  - scripts/batch-temp/basket_S0051L06.json');
