# Phase 8: Azure TTS Connection Pool Implementation

## Problem

Azure Speech SDK was creating a new connection for every TTS request, causing:
- **Concurrent connection exhaustion** (~10-20 connection backend limit)
- **HTTP 429 throttling** after just 10 minutes of generation
- **Inability to process full courses** (which require hours of generation)

## Root Cause

**Before:** Created new `SpeechSynthesizer` for every request
```javascript
// OLD CODE (services/azure-tts-service.cjs)
const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
synthesizer.speakSsmlAsync(...);
synthesizer.close(); // Closed immediately after use
```

With 8 concurrent requests per worker and multiple workers, this opened **hundreds of connections** during generation, hitting Azure's backend capacity limit (not the 200 TPS quota).

**Comparison with Working Python Script:**
- Python script processed **1 sample at a time sequentially**
- Node.js processed **8-16 samples concurrently** → connection exhaustion

## Solution: Connection Pool

Implemented synthesizer connection pooling following Microsoft's best practices:

### Pool Configuration
```javascript
{
  MIN_POOL_SIZE: 2,   // Pre-warmed connections on startup
  MAX_POOL_SIZE: 8,   // Maximum concurrent connections
  created: 0,         // Total connections created
  available: [],      // Available for reuse
  inUse: 0           // Currently in use
}
```

### How It Works

1. **Pre-warming**: 2 connections created on module load
2. **Borrow**: Worker gets synthesizer from pool
3. **Use**: Generate audio with reused connection
4. **Return**: Synthesizer returned to pool (not closed)
5. **Reuse**: Next request uses same connection

### Benefits

- ✅ **Eliminates connection exhaustion** - Max 8 concurrent connections
- ✅ **Faster generation** - No connection overhead per request
- ✅ **Supports full courses** - Can run for hours without throttling
- ✅ **Maintains performance** - Still processes 8 samples concurrently
- ✅ **Automatic cleanup** - Pool closed on process exit

## Implementation Details

### File Modified
`services/azure-tts-service.cjs`

### Key Functions

**`borrowSynthesizer()`**
- Returns synthesizer from available pool
- Creates new if pool empty and under MAX_POOL_SIZE
- Returns null if pool exhausted (triggers retry logic)

**`returnSynthesizer(synthesizer)`**
- Returns synthesizer to pool for reuse
- Closes synthesizer if pool full

**`prewarmPool()`**
- Creates MIN_POOL_SIZE connections on startup
- Called automatically on module load

**`closePool()`**
- Closes all pooled connections
- Called on process exit (SIGINT, SIGTERM)

**`getPoolStats()`**
- Returns current pool statistics for monitoring

### Updated Functions

**`generateSpeech()`** (main worker function)
- Now uses pool with retry logic (10 attempts, 100ms delay)
- Properly returns synthesizer after use (success or error)
- Falls back to error if pool exhausted after retries

**`generateAudio()`** (file-based)
- Still creates dedicated synthesizer (requires AudioConfig for file output)
- Used infrequently (testing, voice samples)

## Testing

### Manual Test (When Rate Limit Resets)
```bash
node -e "
require('dotenv').config();
const azureTTS = require('./services/azure-tts-service.cjs');

(async () => {
  console.log('Pool stats:', azureTTS.getPoolStats());

  // Generate 3 samples concurrently
  await Promise.all([
    azureTTS.generateSpeech('uno', 'es-ES-TrianaNeural', 'es', { rate: 0.7 }),
    azureTTS.generateSpeech('dos', 'es-ES-TrianaNeural', 'es', { rate: 0.7 }),
    azureTTS.generateSpeech('tres', 'es-ES-TrianaNeural', 'es', { rate: 0.7 })
  ]);

  console.log('Pool stats after:', azureTTS.getPoolStats());
  // Expected: available: 2, inUse: 0 (all returned to pool)
})();
"
```

### Phase 8 Test
```bash
# Wait for Azure rate limit to reset (check with pre-flight)
node scripts/phase8-audio-generation.cjs spa_for_eng_TEST --execute
```

Expected improvements:
- ✅ No more "only 2 samples per worker run"
- ✅ Retry loop completes successfully
- ✅ All 428 Azure samples generated
- ✅ No HTTP 429 errors during generation

## Monitoring

Monitor pool usage in logs:
```
[Azure TTS] Pre-warming connection pool (2 connections)...
```

Check pool stats programmatically:
```javascript
const stats = azureTTS.getPoolStats();
console.log(stats);
// { available: 2, inUse: 0, total: 2, maxSize: 8 }
```

## Microsoft Documentation References

- [How to lower speech synthesis latency](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-lower-speech-synthesis-latency)
- [Service connectivity how-to](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-control-connections)
- **Key Quote**: "Reuse SpeechSynthesizer to avoid connection latency. For service scenarios, use an object pool."

## Current Status

- ✅ **Implementation complete** - Connection pool fully implemented
- ⏳ **Awaiting test** - Azure still rate-limited from earlier testing
- ⏱️ **Estimated reset** - 2-4 hours from last test (check with `curl`)

## Next Steps

1. **Wait for rate limit reset** (~2-4 hours)
2. **Run Phase 8 test** - Verify connection pool resolves throttling
3. **Monitor pool stats** - Ensure connections reused correctly
4. **Test full course** - Run with larger dataset to confirm scalability

---

**Author**: Claude Code
**Date**: 2025-11-21
**Related Issues**: Phase 8 Azure TTS throttling, connection exhaustion
