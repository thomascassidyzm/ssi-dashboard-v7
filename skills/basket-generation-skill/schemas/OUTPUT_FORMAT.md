# Output Format

**CRITICAL: Output must be pure JSON with ZERO commentary.**

## The Absolute Rule

**Output ONLY:**
```json
{"S0001L01":{"lego":["target","known"],"e":[["phrase","translation"]],"d":{"2":[],"3":[],"4":[],"5":[]}},"S0001L02":{...}}
```

**FORBIDDEN:**
- ❌ ANY text before or after JSON
- ❌ Thinking blocks (keep them internal)
- ❌ Status updates ("Reading files...", "Processing...")
- ❌ Validation commentary
- ❌ Explanations
- ❌ Markdown code blocks around JSON
- ❌ Pretty-printed JSON (no indentation/newlines)

## Why Zero Commentary?

You are a sub-agent. The orchestrator:
- Expects pure JSON it can parse immediately
- Will fail if there's ANY non-JSON text
- Doesn't need explanations or status updates
- Processes your output automatically

**Think of yourself as an API endpoint, not a chatbot.**

## Format Specification

### Single Basket Structure

```json
{
  "LEGO_ID": {
    "lego": ["target_lego", "known_lego"],
    "e": [
      ["target_phrase_1", "known_phrase_1"],
      ["target_phrase_2", "known_phrase_2"],
      ["target_phrase_3", "known_phrase_3"]
    ],
    "d": {
      "2": [["2-lego window", "translation"], ...],
      "3": [["3-lego window", "translation"], ...],
      "4": [["4-lego window", "translation"], ...],
      "5": [["5-lego window", "translation"], ...]
    }
  }
}
```

### Field Definitions

**lego**: Array with 2 elements
- `[0]`: Target language LEGO text
- `[1]`: Known language LEGO text

**e**: Array of eternal phrases (3-5 phrases)
- Each phrase is `[target, known]` array
- Target language first, known language second

**d**: Object with debut phrases (windows 2-5)
- Keys: "2", "3", "4", "5" (strings, not numbers)
- Values: Arrays of `[target, known]` phrase pairs
- May be empty arrays if e-phrases are short

### Multiple Baskets

For multiple LEGOs, output as single JSON object:

```json
{
  "S0030L01": {...basket...},
  "S0030L02": {...basket...},
  "S0030L03": {...basket...},
  "S0030L04": {...basket...}
}
```

**Compact format** (single line):

```json
{"S0030L01":{...},"S0030L02":{...},"S0030L03":{...},"S0030L04":{...}}
```

## Complete Example

### ❌ WRONG (with commentary):

```
I've generated baskets for S0030. Here are the results:

```json
{
  "S0030L01": {
    "lego": ["Quería", "I wanted"],
    "e": [
      ["Quería preguntarte algo importante ayer.", "I wanted to ask you something important yesterday."]
    ],
    "d": {
      "2": [["Quería preguntarte", "I wanted to ask you"]],
      "3": [["Quería preguntarte algo", "I wanted to ask you something"]],
      "4": [["Quería preguntarte algo importante", "I wanted to ask you something important"]],
      "5": [["preguntarte algo importante ayer", "to ask you something important yesterday"]]
    }
  }
}
```

All baskets follow GATE constraint and have appropriate phrase length.
```

**Problems**:
- ✗ "I've generated baskets..." (commentary)
- ✗ Markdown code blocks (```json)
- ✗ Pretty-printed with indentation
- ✗ "All baskets follow..." (explanation)

### ✅ CORRECT (pure JSON):

```json
{"S0030L01":{"lego":["Quería","I wanted"],"e":[["Quería preguntarte algo importante ayer.","I wanted to ask you something important yesterday."]],"d":{"2":[["Quería preguntarte","I wanted to ask you"]],"3":[["Quería preguntarte algo","I wanted to ask you something"]],"4":[["Quería preguntarte algo importante","I wanted to ask you something important"]],"5":[["preguntarte algo importante ayer","to ask you something important yesterday"]]}}}
```

**Why this is good**:
- ✓ Pure JSON, no commentary
- ✓ Compact (single line)
- ✓ Immediately parseable
- ✓ No markdown, no explanations

## Target Output Length

**For single LEGO**: 1 line
**For multiple LEGOs**: Still 1 line (compact JSON)

**Not**: 100 lines of pretty-printed JSON with commentary

## JSON Validation

Your output must be valid JSON:

```javascript
JSON.parse(output);  // Must not throw error
```

**Common JSON errors**:
- Trailing commas: `{"key": "value",}` ❌
- Single quotes: `{'key': 'value'}` ❌
- Unquoted keys: `{key: "value"}` ❌
- Missing commas: `{"a": 1 "b": 2}` ❌

**Use double quotes, proper commas, no trailing commas.**

## Internal Thinking

You can use thinking blocks INTERNALLY for reasoning:

```
<thinking>
S0030L01: available #1-122, not culminating
Generate 3 e-phrases, 7-10 words each
Validate GATE + grammar
Extract d-phrases mechanically
</thinking>

{"S0030L01":{...output...}}
```

**The thinking stays internal. Only JSON goes to output.**

## Output Checklist

Before sending output:

- ✓ Pure JSON only?
- ✓ No commentary before/after?
- ✓ No markdown code blocks?
- ✓ Compact format (single line)?
- ✓ Valid JSON (parseable)?
- ✓ All baskets included?

If ALL yes → send output
If ANY no → fix it

## Bottom Line

**You are an API, not a chatbot. Output pure, compact JSON. Nothing else.**
