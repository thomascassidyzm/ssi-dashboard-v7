# GATE Violation Fixes

## Summary
Found 30 GATE violations that need fixing. Most are words used before they're taught.

## Critical Fixes Needed

### S0101L02 - phrase 10
- VIOLATION: "pienso que deberías aprender más sobre este lenguaje"
- ISSUE: "lenguaje" not yet taught (taught in next LEGO S0101L03)
- FIX: Replace with "pienso que deberías aprender más sobre esto"

### S0103L02 - phrase 9
- VIOLATION: "estamos intentando oír lo que estás diciendo"
- ISSUE: "diciendo" not taught
- FIX: Replace with "estamos intentando oír lo que estás haciendo"

### S0104L03 - phrases 5, 8, 10
- VIOLATIONS: Multiple uses of "significa" which is not taught
- FIX: Replace with different phrases avoiding "significa"

### S0105L01 - phrase 6
- VIOLATION: "por eso dije eso"
- ISSUE: "dije" not taught
- FIX: Replace with "por eso dijo eso" (using taught "dijo")

### S0106L02 - phrases 2, 4, 6, 7, 8, 9, 10
- VIOLATION: "felices" used before taught
- ISSUE: "felices" taught in next LEGO S0106L03
- FIX: Can't use "felices" in S0106L02 - need alternative phrases

### S0106 - S0104L01 review - phrases 3, 5, 7, 9
- VIOLATION: "solo" used before taught
- ISSUE: "solo" taught in S0106L04
- FIX: This is a review LEGO appearing AFTER S0106L04, so these should be OK
  Actually checking whitelist - appears to be whitelist calculation issue

### S0108L03/L04 - multiple phrases
- VIOLATION: "desperté" not taught
- FIX: Replace with taught forms

### S0109 - S0002L02 - phrase 9
- VIOLATION: "nuevas" used before taught (taught in S0109L03)
- FIX: This phrase shouldn't use "nuevas" yet

### S0110 - S0015L01 - phrase 2
- VIOLATION: "tú y yo" - personal pronouns not taught
- FIX: Replace with different phrase

### S0110L03 - phrases 6, 8
- VIOLATION: "podemos" not taught
- FIX: Replace with taught modal forms

### S0110 - S0011L01 - phrases 4, 8
- VIOLATION: "terminemos" used before it appears in S0110L03
- FIX: These phrases come AFTER S0110L03, so need to check whitelist order

## Distribution Fixes
Many minor distribution mismatches (off by 1 in word count) - need to recount carefully.
