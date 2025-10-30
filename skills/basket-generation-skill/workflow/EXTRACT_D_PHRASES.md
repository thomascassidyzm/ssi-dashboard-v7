# Extract D-Phrases (Step 2)

D-phrases are **debut phrases** - scaffolding fragments extracted from e-phrases for initial practice.

## Goal

Mechanically extract expanding windows (2-5 LEGOs) containing the operative LEGO from each e-phrase.

## Key Insight: You Already Know the LEGO Sequence

**You just assembled the e-phrase from LEGOs. You know exactly which LEGOs you used.**

When you created:
```
E-phrase: "Si puedes hablar más lentamente eso sería excelente"
```

You assembled it from these LEGOs:
```
[Si] [puedes] [hablar] [más] [lentamente] [eso] [sería] [excelente]
```

**You already have the LEGO sequence. D-phrase extraction is trivial - just take windows from that sequence.**

**This is automatic. No parsing, no greedy search needed.**

## The Process (Trivial)

**Step 1**: For each e-phrase, recall the LEGO sequence you used to build it

**Step 2**: Find the operative LEGO position in that sequence

**Step 3**: Extract all windows (2-5 LEGOs) containing the operative LEGO

**Step 4**: Reconstruct the Spanish/English text for each window

**That's it. You're just taking windows from a sequence you already assembled.**

### E-phrase you just generated:
```
"Si puedes hablar más lentamente eso sería excelente"
(If you can speak more slowly that would be great)
```

### LEGO sequence you used:
```
Position: 0    1       2       3    4           5    6      7
LEGO:    [Si] [puedes] [hablar] [más] [lentamente] [eso] [sería] [excelente]
Spanish: Si    puedes   hablar   más   lentamente   eso   sería   excelente
English: If    you can  speak    more  slowly       that  would   great
```

### Operative LEGO: "Si" (If) at position 0

### Extract windows containing position 0:

**2-LEGO windows:**
- Positions 0-1: `[Si, puedes]` → "Si puedes" / "If you can"

**3-LEGO windows:**
- Positions 0-2: `[Si, puedes, hablar]` → "Si puedes hablar" / "If you can speak"

**4-LEGO windows:**
- Positions 0-3: `[Si, puedes, hablar, más]` → "Si puedes hablar más" / "If you can speak more"

**5-LEGO windows:**
- Positions 0-4: `[Si, puedes, hablar, más, lentamente]` → "Si puedes hablar más lentamente" / "If you can speak more slowly"

### Result:
```json
{
  "d": {
    "2": [["Si puedes", "If you can"]],
    "3": [["Si puedes hablar", "If you can speak"]],
    "4": [["Si puedes hablar más", "If you can speak more"]],
    "5": [["Si puedes hablar más lentamente", "If you can speak more slowly"]]
  }
}
```

## Another Example (Operative in Middle)

### E-phrase you assembled:
```
"Quería preguntarte algo importante sobre tu trabajo ayer"
```

### LEGO sequence you used:
```
Position: 0       1            2    3          4      5         6
LEGO:    [Quería] [preguntarte] [algo] [importante] [sobre] [tu trabajo] [ayer]
                                                                          ↑ operative (position 6)
```

### Extract windows containing position 6:

**2-LEGO windows:**
- Positions 5-6: `[tu trabajo, ayer]` → "tu trabajo ayer" / "your work yesterday"

**3-LEGO windows:**
- Positions 4-6: `[sobre, tu trabajo, ayer]` → "sobre tu trabajo ayer" / "about your work yesterday"

**4-LEGO windows:**
- Positions 3-6: `[importante, sobre, tu trabajo, ayer]` → "importante sobre tu trabajo ayer" / "important about your work yesterday"

**5-LEGO windows:**
- Positions 2-6: `[algo, importante, sobre, tu trabajo, ayer]` → "algo importante sobre tu trabajo ayer" / "something important about your work yesterday"

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
