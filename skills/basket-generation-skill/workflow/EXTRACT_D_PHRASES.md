# Extract D-Phrases (Step 2)

D-phrases are **debut phrases** - scaffolding fragments extracted from e-phrases for initial practice.

## Goal

Mechanically extract expanding windows (2-5 LEGOs) containing the operative LEGO from each e-phrase.

**This is automatic. No thinking needed.**

## The Algorithm

```javascript
function extractDPhrases(ePhrases, operativeLegoId) {
  const dPhrases = { "2": [], "3": [], "4": [], "5": [] };

  for (const ePhrase of ePhrases) {
    // Parse e-phrase into LEGO sequence
    const legoSequence = parseIntoLegos(ePhrase);

    // Extract all windows of size 2, 3, 4, 5
    for (let windowSize = 2; windowSize <= 5; windowSize++) {
      for (let start = 0; start <= legoSequence.length - windowSize; start++) {
        const window = legoSequence.slice(start, start + windowSize);

        // Only keep windows containing the operative LEGO
        if (window.includes(operativeLegoId)) {
          const phrase = reconstructPhrase(window);
          dPhrases[windowSize.toString()].push(phrase);
        }
      }
    }
  }

  // Remove duplicates
  for (let size = 2; size <= 5; size++) {
    dPhrases[size.toString()] = deduplicate(dPhrases[size.toString()]);
  }

  return dPhrases;
}
```

## Example

### E-phrase:
```
"Quería preguntarte algo importante sobre tu trabajo ayer."
(I wanted to ask you something important about your work yesterday.)
```

### Operative LEGO:
```
"ayer" (yesterday) - position 7
```

### LEGO sequence:
```
1. Quería
2. preguntarte
3. algo
4. importante
5. sobre
6. tu trabajo
7. ayer  ← operative
```

### Extracted d-phrases:

**2-LEGO windows containing "ayer":**
```
6-7: "tu trabajo ayer" (your work yesterday)
```

**3-LEGO windows containing "ayer":**
```
5-6-7: "sobre tu trabajo ayer" (about your work yesterday)
```

**4-LEGO windows containing "ayer":**
```
4-5-6-7: "importante sobre tu trabajo ayer" (important about your work yesterday)
```

**5-LEGO windows containing "ayer":**
```
3-4-5-6-7: "algo importante sobre tu trabajo ayer" (something important about your work yesterday)
```

### Result:
```json
{
  "d": {
    "2": [["tu trabajo ayer", "your work yesterday"]],
    "3": [["sobre tu trabajo ayer", "about your work yesterday"]],
    "4": [["importante sobre tu trabajo ayer", "important about your work yesterday"]],
    "5": [["algo importante sobre tu trabajo ayer", "something important about your work yesterday"]]
  }
}
```

## Complete Example

### Input:
```json
{
  "S0030L04": {
    "lego": ["ayer", "yesterday"],
    "e": [
      ["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."],
      ["Estaba pensando en ti ayer.", "I was thinking about you yesterday."],
      ["No podía recordar tu nombre ayer.", "I couldn't remember your name yesterday."]
    ]
  }
}
```

### Extraction process:

**E-phrase 1:** "Quería preguntarte algo ayer"
- LEGOs: [Quería, preguntarte, algo, ayer]
- Windows with "ayer":
  - 2: "algo ayer"
  - 3: "preguntarte algo ayer"
  - 4: "Quería preguntarte algo ayer"

**E-phrase 2:** "Estaba pensando en ti ayer"
- LEGOs: [Estaba, pensando, en, ti, ayer]
- Windows with "ayer":
  - 2: "ti ayer"
  - 3: "en ti ayer"
  - 4: "pensando en ti ayer"
  - 5: "Estaba pensando en ti ayer"

**E-phrase 3:** "No podía recordar tu nombre ayer"
- LEGOs: [No, podía, recordar, tu nombre, ayer]
- Windows with "ayer":
  - 2: "tu nombre ayer"
  - 3: "recordar tu nombre ayer"
  - 4: "podía recordar tu nombre ayer"
  - 5: "No podía recordar tu nombre ayer"

### Output:
```json
{
  "d": {
    "2": [
      ["algo ayer", "something yesterday"],
      ["ti ayer", "you yesterday"],
      ["tu nombre ayer", "your name yesterday"]
    ],
    "3": [
      ["preguntarte algo ayer", "to ask you something yesterday"],
      ["en ti ayer", "about you yesterday"],
      ["recordar tu nombre ayer", "to remember your name yesterday"]
    ],
    "4": [
      ["Quería preguntarte algo ayer", "I wanted to ask you something yesterday"],
      ["pensando en ti ayer", "thinking about you yesterday"],
      ["podía recordar tu nombre ayer", "could remember your name yesterday"]
    ],
    "5": [
      ["Estaba pensando en ti ayer", "I was thinking about you yesterday"],
      ["No podía recordar tu nombre ayer", "I couldn't remember your name yesterday"]
    ]
  }
}
```

## Key Points

### 1. Mechanical extraction = no judgment

Don't curate or filter d-phrases based on "quality" or "usefulness". Extract ALL windows containing the operative LEGO.

### 2. Deduplication

If the same phrase appears multiple times, include it only once:

```
E-phrase 1: "Quiero hablar español ayer"  → "hablar español ayer"
E-phrase 2: "Voy a hablar español ayer"   → "hablar español ayer" (duplicate)

Result: Only one "hablar español ayer" in d-phrases
```

### 3. Empty windows are okay

If e-phrases are short, some window sizes may be empty:

```json
{
  "e": [["Hablo español ahora.", "I speak Spanish now."]],  // 3 LEGOs
  "d": {
    "2": [["español ahora", "Spanish now"]],
    "3": [["Hablo español ahora", "I speak Spanish now"]],
    "4": [],  // ← Empty (phrase only has 3 LEGOs)
    "5": []   // ← Empty
  }
}
```

This is CORRECT.

### 4. Both languages

Extract windows in BOTH target and known languages:

```
Target: "algo importante ayer"
Known: "something important yesterday"
```

Output as array: `["algo importante ayer", "something important yesterday"]`

## Extraction Checklist

- ✓ Extract ALL windows sizes 2-5?
- ✓ Only include windows containing operative LEGO?
- ✓ Deduplicate within each window size?
- ✓ Include BOTH target and known language?
- ✓ Maintain proper JSON structure?

## Bottom Line

**D-phrase extraction is mechanical. Extract all windows containing the operative LEGO. No curation, no filtering, just extraction.**
