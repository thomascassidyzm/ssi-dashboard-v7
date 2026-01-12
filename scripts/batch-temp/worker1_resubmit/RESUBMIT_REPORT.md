# Worker 1 Resubmission Report: S0107L05, S0108L02

**Course**: zho_for_eng (Chinese for English speakers)
**Date**: 2026-01-11
**Status**: Baskets generated, upload pending (endpoint unavailable)

## LEGOs Processed

### S0107L05: "were doing" → "在做"
- **Type**: A-type (Atomic)
- **New**: true
- **Seed**: S0107 - "We hoped to see what you were doing." → "我们希望看到你当时在做什么。"
- **Practice phrases**: 10 (following 2-2-2-4 complexity pattern)

### S0108L02: "didn't hope" → "不希望"
- **Type**: A-type (Atomic)
- **New**: true
- **Seed**: S0108 - "We didn't hope to wake in the middle of the night." → "我们不希望在半夜被唤醒。"
- **Practice phrases**: 10 (following 2-2-2-4 complexity pattern)

## Complexity Distribution

Both baskets follow the required 2-2-2-4 pattern:

### Phrases 1-2: SHORT (LEGO alone or +1 word)
- Simple questions and statements using the LEGO
- Example: "What were you doing?" / "I didn't hope for this."

### Phrases 3-4: MEDIUM (LEGO +2-3 words)
- Basic contextual usage
- Example: "She was doing the laundry yesterday." / "They didn't hope to leave so early."

### Phrases 5-6: LONGER (LEGO +4-6 words)
- More complex sentence structures
- Example: "We were doing our best to finish the project." / "We didn't hope to spend so much money on this."

### Phrases 7-10: LONGEST (LEGO +6+ words)
- Complex sentences with subordinate clauses and contextual detail
- Example: "They were doing their homework when their friends came to visit them." / "She didn't hope to be working late every night when she accepted the new job."

## Upload Status

**Endpoint**: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket

**Issue**: SSL connection error (LibreSSL SSL_connect: SSL_ERROR_SYSCALL)

**Attempts**: Multiple retry attempts with increasing timeouts (10-30 seconds)

**Files saved**:
- `/tmp/basket_S0107L05.json` (1.7K)
- `/tmp/basket_S0108L02.json` (1.8K)
- Backed up to: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/worker1_resubmit/`

## Next Steps

Once the ngrok endpoint is restored, upload using:

```bash
curl -X POST "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @basket_S0107L05.json

curl -X POST "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket" \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @basket_S0108L02.json
```

## Basket Format Validation

Both baskets include:
- ✓ `course`: "zho_for_eng"
- ✓ `seed`: Seed ID
- ✓ `baskets` object with LEGO_ID keys
- ✓ `lego_id` field
- ✓ `lego` object with `known` and `target` fields
- ✓ `practice_phrases` array (10 items)
- ✓ Each phrase has `known` and `target` fields

Format matches the API requirements based on the initial error message received.
