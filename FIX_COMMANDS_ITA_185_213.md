# Fix Commands - Italian Seeds 185-213 QA Issues

## 4 Phrases Need Fixing

Execute these SQL updates directly in Supabase:

```sql
-- Fix 1: S195 L2 - Gender mismatch
UPDATE course_practice_phrases
SET target_text = 'ho visto i soldi in ufficio.'
WHERE id = 'dc7793b7-db31-4a26-8292-a8bafe47fffe';

-- Fix 2: S197 L1 - Gender/number mismatch  
UPDATE course_practice_phrases
SET target_text = 'ho visto mio figlio in ufficio stamattina.'
WHERE id = '3f376845-7860-4903-b49f-b37191f78e02';

-- Fix 3: S198 L1 - Number mismatch
UPDATE course_practice_phrases
SET target_text = 'ho visto mia figlia in ufficio stamattina.'
WHERE id = '06662a1b-cfbe-424b-8236-743df246426e';

-- Fix 4: S204 L1 - Subjunctive required
UPDATE course_practice_phrases
SET target_text = 'volevo che lei trovasse i soldi in ufficio.'
WHERE id = '6f37da3b-5eb1-48c1-acd3-09557ed4cc8f';
```

## Verification Query

After applying fixes, verify:

```sql
SELECT seed_number, lego_index, known_text, target_text
FROM course_practice_phrases
WHERE course_code = 'ita_for_eng'
  AND id IN (
    'dc7793b7-db31-4a26-8292-a8bafe47fffe',
    '3f376845-7860-4903-b49f-b37191f78e02',
    '06662a1b-cfbe-424b-8236-743df246426e',
    '6f37da3b-5eb1-48c1-acd3-09557ed4cc8f'
  )
ORDER BY seed_number, lego_index;
```

Expected output after fixes:
```
S195 L2: "ho visto i soldi in ufficio."
S197 L1: "ho visto mio figlio in ufficio stamattina."
S198 L1: "ho visto mia figlia in ufficio stamattina."
S204 L1: "volevo che lei trovasse i soldi in ufficio."
```

## Notes

- All 4 fixes remove incorrect clitic forms
- Using simple "ho visto" (no clitic) is clearer and grammatically safe
- S204 requires subjunctive "trovasse" not infinitive "trovare"
- Audio IDs will auto-null via triggers when text changes
- Phase 8 will regenerate audio for these 4 phrases

## Impact

- 4 phrases fixed (0.76% of 524 total)
- No LEGO changes needed
- No cascading effects to other seeds
- Audio regeneration required for these 4 only
