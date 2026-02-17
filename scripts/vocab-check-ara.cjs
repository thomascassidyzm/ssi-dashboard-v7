// Sample phrases from checkpoint (all 50)
const samplePhrases = [
  {target: "أريد أن أتكلم."},
  {target: "أريد أن أتكلم العربية."},
  {target: "أريد أن أتكلم معك."},
  {target: "أريد أن أتكلم الآن."},
  {target: "أريد أن أتكلم معك الآن."},
  {target: "أحاول أن أتكلم العربية."},
  {target: "أحاول أن أتكلم العربية الآن."},
  {target: "أريد أن أحاول أن أتكلم العربية."},
  {target: "أريد أن أتعلم العربية."},
  {target: "أريد أن أتعلم العربية معك."},
  {target: "أريد أن أتعلم العربية معك الآن."},
  {target: "أريد أن أتعلم كيف أتكلم."},
  {target: "أريد أن أتعلم كيف أتكلم العربية."},
  {target: "أريد أن أتعلم كيف أتكلم العربية."},
  {target: "أتكلم العربية معك."},
  {target: "أحاول أن أتعلم كيف أتكلم العربية الآن."},
  {target: "أريد أن أتكلم قدر الإمكان."},
  {target: "أريد أن أتعلم العربية قدر الإمكان."},
  {target: "أحاول أن أتكلم العربية قدر الإمكان."},
  {target: "أريد أن أتعلم كيف أقول."},
  {target: "أريد أن أتعلم كيف أقول العربية."},
  {target: "أريد أن أقول شيئاً."},
  {target: "أريد أن أتعلم كيف أقول شيئاً."},
  {target: "أريد أن أتعلم كيف أقول شيئاً الآن."},
  {target: "أريد أن أقول شيئاً بالعربية."},
  {target: "أريد أن أتعلم كيف أقول شيئاً بالعربية."},
  {target: "أريد أن أتعلم كيف أقول شيئاً بالعربية الآن."},
  {target: "سأمارس العربية الآن."},
  {target: "سأمارس العربية معك الآن."},
  {target: "سأمارس العربية قدر الإمكان."},
  {target: "أريد أن أمارس العربية الآن."},
  {target: "أريد أن أمارس العربية معك."},
  {target: "أريد أن أمارس العربية معك الآن."},
  {target: "أريد أن أمارس التكلم الآن."},
  {target: "أحاول أن أمارس التكلم الآن."},
  {target: "سأمارس التكلم بالعربية."},
  {target: "أريد أن أمارس التكلم معك."},
  {target: "أحاول أن أمارس التكلم معك."},
  {target: "أريد أن أمارس التكلم مع شخص."},
  {target: "أحاول أن أمارس التكلم مع شخص."},
  {target: "سأمارس التكلم مع شخص الآن."},
  {target: "أريد أن أمارس التكلم مع شخص آخر."},
  {target: "أحاول أن أمارس التكلم مع شخص آخر."},
  {target: "سأمارس التكلم بالعربية مع شخص آخر."},
  {target: "أريد أن أتذكر كيف أتكلم العربية معك الآن."},
  {target: "أتعلم أن أتذكر كيف أتكلم قدر الإمكان."},
  {target: "أحاول أن أتذكر كيف أتكلم العربية معك الآن."},
  {target: "أريد أن أقول كلمة بالعربية معك الآن."},
  {target: "أريد أن أتذكر كيف أقول كلمة بالعربية."},
  {target: "أحاول أن أقول كلمة بالعربية معك الآن."}
];

// Vocabulary from LEGOs (targets and components)
const vocab = new Set([
  "أريد", "أنا", "يريد", "أن أتكلم", "أن", "يتكلم", "العربية", "معك", "مع", "أنت", "الآن",
  "أحاول", "يحاول", "أن أتعلم", "يتعلم", "كيف", "أتكلم", "قدر الإمكان", "قدر", "إمكان",
  "أقول", "شيئاً", "بالعربية", "ب", "سأمارس", "س", "يمارس", "أن أمارس", "التكلم", "شخص",
  "آخر", "أن أتذكر", "يتذكر", "كلمة", "أن أحاول", "بأقصى جهدي", "جهد", "أقصى", "اليوم",
  "سأحاول", "سـ", "أن أشرح", "يشرح", "ما أعنيه", "ما", "يعني", "قليلاً", "من", "لست",
  "متأكداً", "إذا كنت أستطيع", "إذا", "يستطيع", "الجملة", "كاملة"
]);

// Also add derived forms that appear in phrases
// Arabic morphology means أتعلم comes from أن أتعلم (I learn), أمارس from أن أمارس
const derivedForms = new Set([
  "أتعلم",  // from أن أتعلم
  "أمارس",  // from أن أمارس
  "أتذكر",  // from أن أتذكر
  "الإمكان" // from قدر الإمكان
]);

// Punctuation to strip
const punct = /[.،؟!]/g;

// Simple word tokenizer for Arabic
function tokenize(text) {
  return text.replace(punct, "").split(/\s+/).filter(w => w.length > 0);
}

// Check each phrase
const violations = [];
for (const phrase of samplePhrases) {
  const words = tokenize(phrase.target);
  for (const word of words) {
    // Check if word is in vocabulary or derived forms
    if (!vocab.has(word) && !derivedForms.has(word)) {
      // Also check if it's a substring of any vocab item (for affixes)
      let found = false;
      for (const v of vocab) {
        if (v.includes(word) || word.includes(v)) {
          found = true;
          break;
        }
      }
      if (!found) {
        violations.push({phrase: phrase.target, word});
      }
    }
  }
}

console.log(JSON.stringify({
  phrases_checked: samplePhrases.length,
  violations_count: violations.length,
  violations: violations.slice(0, 10)
}, null, 2));
