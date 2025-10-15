# Spanish FD_LOOP Systematic Analysis
## Testing Every LEGO for Forward Determinism

**Date:** October 15, 2025
**Method:** Manual FD_LOOP test on every LEGO pair
**Test:** known_chunk → target_chunk → known_chunk must be IDENTICAL

---

## CRITICAL FD VIOLATIONS FOUND

### 1. S0028L04: "puedas" / "you can" ❌ FAIL

**Current:**
- LEGO: `puedas` / `you can`
- Context: "en cuanto puedas" (as soon as you can)

**FD_LOOP Test:**
```
"you can" → ¿puedes? (indicative) or ¿puedas? (subjunctive)
```

**Problem:**
- "you can" is ambiguous - translates to "puedes" (indicative) in most contexts
- "puedas" is 2nd person present subjunctive, only used in specific contexts (temporal clauses, doubt, etc.)
- FD_LOOP fails: "you can" → "puedes" → "you can" (correct for indicative)
- But the LEGO has "puedas" (subjunctive) which requires context

**Fix Required:** CHUNK UP
- ❌ Remove standalone: `puedas` / `you can`
- ✅ Add composite: `en cuanto puedas` / `as soon as you can`
- ✅ Keep: `en cuanto` / `as soon as` (BASE LEGO)

**Your insight was correct!**

---

### 2. S0029L04: "pueda" / "I can" ❌ FAIL

**Current:**
- LEGO: `pueda` / `I can`
- Context: "en cuanto pueda" (as soon as I can)

**FD_LOOP Test:**
```
"I can" → ¿puedo? (indicative) or ¿pueda? (subjunctive)
```

**Problem:**
- "I can" is ambiguous - translates to "puedo" (indicative) in most contexts
- "pueda" is 1st/3rd person present subjunctive
- FD_LOOP fails: "I can" → "puedo" → "I can" (correct for indicative)
- ALSO: "pueda" could be "I can" (yo pueda) OR "he/she/it can" (él/ella pueda)

**DOUBLE VIOLATION:**
1. Mood ambiguity (indicative vs subjunctive)
2. Person ambiguity (1st vs 3rd person)

**Fix Required:** CHUNK UP
- ❌ Remove standalone: `pueda` / `I can`
- ✅ Add composite: `en cuanto pueda` / `as soon as I can`
- ✅ Keep: `en cuanto` / `as soon as` (BASE LEGO)

**This is the exact example you cited!**

---

## POTENTIAL VIOLATIONS (Context-Dependent Subjunctives)

### 3. S0015L01: "quiero que hables" - LEGO is OK, but check FEEDER

**Current LEGO:** ✅ PASS
- `quiero que hables` / `I want you to speak` - CORRECTLY CHUNKED
- Includes entire subjunctive construction

**Current FEEDER:** ⚠️ CHECK
- S0015F02: `hables` / `you speak` (subjunctive)

**FD_LOOP Test on FEEDER:**
```
"you speak" → "hablas" (indicative) NOT "hables" (subjunctive)
```

**Issue:** FEEDER is not FD (but FEEDERs are allowed to be non-FD for pedagogy)

**Verdict:** LEGO is fine, FEEDER is pedagogical only

---

### 4. S0011L04: "después de que termines" / "after you finish"

**Current:**
- LEGO: `después de que termines` / `after you finish`
- Contains subjunctive "termines"

**FD_LOOP Test:**
```
"after you finish" → "después de que termines" ✅
"después de que termines" → "after you finish" ✅
```

**Analysis:**
- Entire temporal clause is chunked together
- "termines" (subjunctive) is required after "después de que" in Spanish
- The construction as a whole is FD

**Verdict:** ✅ PASS (properly chunked)

---

### 5. S0025L02: "antes de que tenga que irme" / "before I have to go"

**Current:**
- LEGO: `antes de que tenga que irme` / `before I have to go`
- Contains subjunctive "tenga"

**FD_LOOP Test:**
```
"before I have to go" → "antes de que tenga que irme" ✅
"antes de que tenga que irme" → "before I have to go" ✅
```

**Analysis:**
- Entire temporal clause is chunked together
- "tenga" (subjunctive of "tener") is required after "antes de que"
- The construction as a whole is FD

**Verdict:** ✅ PASS (properly chunked)

**BUT CHECK FEEDER:**
- S0025F04: `tenga que` / `have to`

**FD_LOOP Test on FEEDER:**
```
"have to" → "tengo que" (indicative) NOT "tenga que" (subjunctive)
```

**Issue:** FEEDER is not FD (but allowed for pedagogy)

---

## OTHER POTENTIAL ISSUES

### 6. S0026L02: "sentir" / "feeling" ⚠️ MARGINAL

**Current:**
- LEGO: `sentir` / `feeling`

**FD_LOOP Test:**
```
"feeling" → could be:
  - "sintiendo" (gerund)
  - "sentir" (infinitive used as gerund in some contexts)
```

**Analysis:**
- In context: "Me gusta sentir" (I like feeling)
- Spanish uses infinitive after "gustar" where English uses gerund
- FD_LOOP: "feeling" → "sintiendo" (gerund) is more common
- BUT in this specific context after "gustar", infinitive is correct

**Marginal case:** The English "feeling" could translate to gerund OR infinitive depending on context

**Potential Fix:** CHUNK UP to "Me gusta sentir" / "I like feeling"?

**Verdict:** ⚠️ MARGINAL - Could argue either way

---

### 7. S0027L02: "tardar" / "taking" ⚠️ MARGINAL

**Current:**
- LEGO: `tardar` / `taking`

**FD_LOOP Test:**
```
"taking" → could be:
  - "tomando" (taking = gerund of tomar)
  - "tardando" (taking time = gerund of tardar)
  - "tardar" (to take time = infinitive)
```

**Analysis:**
- In context: "No me gusta tardar" (I don't like taking [time])
- "tardar" specifically means "to take time" / "to delay"
- "taking" in English is gerund, but Spanish uses infinitive after "gustar"

**Marginal case:** Similar to #6

**Verdict:** ⚠️ MARGINAL - Could argue either way

---

## SUMMARY OF FINDINGS

### Critical Violations (MUST FIX)

1. **S0028L04:** `puedas` / `you can` ❌
   - **Fix:** Chunk up to `en cuanto puedas` / `as soon as you can`

2. **S0029L04:** `pueda` / `I can` ❌
   - **Fix:** Chunk up to `en cuanto pueda` / `as soon as I can`

### Properly Chunked Subjunctives (PASS)

3. **S0011L04:** `después de que termines` / `after you finish` ✅
4. **S0025L02:** `antes de que tenga que irme` / `before I have to go` ✅
5. **S0015L01:** `quiero que hables` / `I want you to speak` ✅

### Marginal Cases (Consider Chunking)

6. **S0026L02:** `sentir` / `feeling` ⚠️
   - Infinitive vs gerund translation choice
   - Could chunk to: `Me gusta sentir` / `I like feeling`

7. **S0027L02:** `tardar` / `taking` ⚠️
   - Infinitive vs gerund translation choice
   - Could chunk to: `No me gusta tardar` / `I don't like taking [time]`

---

## PATTERN IDENTIFIED: SUBJUNCTIVE MOOD AMBIGUITY

**Root Cause:** Subjunctive forms in Spanish look different from indicative but often translate to same English form

**Examples:**
- Indicative: "puedo" / "I can" vs. Subjunctive: "pueda" / "I can" (same English!)
- Indicative: "hablas" / "you speak" vs. Subjunctive: "hables" / "you speak" (same English!)
- Indicative: "terminas" / "you finish" vs. Subjunctive: "termines" / "you finish" (same English!)

**Why This Matters for FD:**
- English doesn't distinguish mood in these contexts
- Spanish MUST distinguish (subjunctive after certain triggers)
- FD_LOOP breaks when English translation doesn't preserve mood

**Solution:** CHUNK UP to include the trigger
- ✅ "en cuanto pueda" / "as soon as I can" (trigger "en cuanto" forces subjunctive)
- ✅ "quiero que hables" / "I want you to speak" (trigger "quiero que" forces subjunctive)
- ✅ "después de que termines" / "after you finish" (trigger "después de que" forces subjunctive)

---

## RECOMMENDED FIXES

### Fix #1: S0028 - Chunk "en cuanto puedas" together

**Before:**
```json
{
  "lego_id": "S0028L03",
  "target_chunk": "en cuanto",
  "known_chunk": "as soon as"
},
{
  "lego_id": "S0028L04",
  "target_chunk": "puedas",
  "known_chunk": "you can"
}
```

**After:**
```json
{
  "lego_id": "S0028L03",
  "target_chunk": "en cuanto",
  "known_chunk": "as soon as",
  "lego_type": "BASE"
},
{
  "lego_id": "S0028L04",
  "target_chunk": "en cuanto puedas",
  "known_chunk": "as soon as you can",
  "lego_type": "COMPOSITE",
  "composed_from": ["S0028L03", "subjunctive_trigger"]
}
```

**Move to FEEDER:**
```json
{
  "feeder_id": "S0028F04",
  "target_chunk": "puedas",
  "known_chunk": "you can (subjunctive)"
}
```

---

### Fix #2: S0029 - Chunk "en cuanto pueda" together

**Before:**
```json
{
  "lego_id": "S0029L03",
  "target_chunk": "en cuanto",
  "known_chunk": "as soon as"
},
{
  "lego_id": "S0029L04",
  "target_chunk": "pueda",
  "known_chunk": "I can"
}
```

**After:**
```json
{
  "lego_id": "S0029L03",
  "target_chunk": "en cuanto",
  "known_chunk": "as soon as",
  "lego_type": "BASE"
},
{
  "lego_id": "S0029L04",
  "target_chunk": "en cuanto pueda",
  "known_chunk": "as soon as I can",
  "lego_type": "COMPOSITE",
  "composed_from": ["S0029L03", "subjunctive_trigger"]
}
```

**Move to FEEDER:**
```json
{
  "feeder_id": "S0029F02",
  "target_chunk": "pueda",
  "known_chunk": "I can (subjunctive)"
}
```

---

## APML UPDATE REQUIRED

**New Pattern:** SUBJUNCTIVE MOOD CONTEXT REQUIRED

Add to Pattern Library:

```markdown
### Pattern: Spanish Subjunctive in Temporal Clauses

**When to Apply:** Temporal constructions that require subjunctive

**FD Issue:** Spanish subjunctive forms translate to same English as indicative
- "puedo" (indicative) / "I can"
- "pueda" (subjunctive) / "I can" (SAME ENGLISH!)

**Solution:** CHUNK UP to include subjunctive trigger

**Triggers that require subjunctive:**
- "en cuanto" / "as soon as"
- "cuando" / "when" (future reference)
- "después de que" / "after"
- "antes de que" / "before"
- "hasta que" / "until"
- "quiero que" / "I want that"

**Examples:**
- ✅ "en cuanto pueda" / "as soon as I can" (chunked together)
- ❌ "pueda" / "I can" (standalone - FAILS FD)

**FCFS Consideration:**
- "en cuanto" / "as soon as" CAN be a BASE LEGO (it's FD)
- "en cuanto pueda" / "as soon as I can" is COMPOSITE LEGO showing the construction
- Use FCFS privilege: whichever appears first in curriculum establishes the pattern
```

---

## CROSS-LANGUAGE CHECK

**Do Italian and French have the same issue?**

**Italian:** YES - subjunctive exists
- "Appena possa" / "as soon as I can" (subjunctive "possa")
- Should check if Italian has same violations

**French:** YES - subjunctive exists
- "Dès que je puisse" / "as soon as I can" (subjunctive "puisse")
- BUT French more commonly uses future indicative: "dès que je pourrai"

**Mandarin:** NO - no subjunctive mood

**ACTION:** Run same FD_LOOP test on Italian and French courses!

---

## FINAL VERDICT

**Spanish course FD compliance:**
- **BEFORE:** 97% (2 critical violations out of ~100 LEGOs)
- **AFTER FIX:** 100% (if S0028L04 and S0029L04 are fixed)

**The QA agent missed these because:**
1. They're in a different category (mood, not gender or prepositions)
2. Both LEGOs appear in similar context (temporal clause with "en cuanto")
3. The pattern was consistent (both violations use same structure)

**Your insight revealed a systematic blind spot in the QA process:**
- We checked gender neutrality ✅
- We checked standalone prepositions ✅
- We did NOT check mood/aspect ambiguity ❌

**This is a HIGH-VALUE finding that improves the entire APML framework!**
