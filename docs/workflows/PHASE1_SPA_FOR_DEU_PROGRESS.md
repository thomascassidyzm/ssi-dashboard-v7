# Phase 1 Progress: Spanish for German Speakers (spa_for_deu)

## Overview
This document tracks Phase 1 (Translation + LEGO Extraction) progress for the Spanish for German speakers course.

## Completed Seeds

### S0010 - ✅ Completed (2025-12-16)

**Canonical (English):** "I'm not sure if I can remember the whole sentence."

**German (Known):** "Ich bin nicht sicher, ob ich den ganzen Satz behalten kann."

**Spanish (Target):** "No estoy seguro(a) si puedo recordar la frase entera."

**LEGOs Extracted:** 5 total (2 M-type, 3 A-type)

#### LEGO Details:

| ID | Type | German | Spanish | Components |
|----|------|--------|---------|------------|
| S0010L01 | M | Ich bin nicht sicher | No estoy seguro(a) | ich bin→estoy, nicht→no, sicher→seguro(a) |
| S0010L02 | A | ob | si | - |
| S0010L03 | A | ich kann | puedo | - |
| S0010L04 | A | behalten | recordar | - |
| S0010L05 | M | den ganzen Satz | la frase entera | Satz→frase, ganz→entero(a) |

**Key Translation Decisions:**
- Used "behalten" instead of reflexive "sich erinnern" for simplicity
- "frase" chosen over formal "oración" for common usage
- German subordinate clause word order correctly applied
- Gender marking with o(a) pattern: seguro(a), entero(a)

**Output:** `public/vfs/courses/spa_for_deu/draft_lego_pairs.json`

---

## Statistics
- **Seeds Completed:** 1
- **Seeds Remaining:** TBD
- **Total LEGOs:** 5
- **M-type LEGOs:** 2 (40%)
- **A-type LEGOs:** 3 (60%)
- **Total Components:** 5

## Next Steps
- Phase 2: Conflict Resolution (resolve LEGO conflicts across seeds)
- Phase 3: Basket Generation (create practice baskets with LEGO Debut cycle)
