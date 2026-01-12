# Worker 6 Basket Submission Status

**Date**: 2026-01-11
**Status**: ⚠️ ENDPOINT UNREACHABLE - Baskets prepared, awaiting endpoint availability

## Issue

The ngrok endpoint `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket` is currently unreachable:

```
curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to mirthlessly-nonanesthetized-marilyn.ngrok-free.dev:443
```

This indicates either:
- The ngrok tunnel has expired/stopped
- Network connectivity issues
- The endpoint URL has changed

## Baskets Generated

Both Worker 6 baskets have been successfully generated and saved locally:

### S0118L04 (M-type)
- **LEGO**: "feel better than I felt when we were in the pub" / "比在酒吧的时候感觉更好"
- **File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/worker6_s0118l04_basket.json`
- **Practice Phrases**: 10 (2-2-2-4 progression)

Example phrases:
1. "I feel better than I felt yesterday" / "我感觉比昨天好"
2. "She feels better than she felt last week" / "她感觉比上周好"
3. "Do you feel better than you felt this morning?" / "你感觉比今天早上好吗？"
... (10 total, building to the full LEGO)

### S0119L01 (A-type)
- **LEGO**: "Can I" / "我能"
- **File**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/worker6_s0119l01_basket.json`
- **Practice Phrases**: 10 (various "Can I..." contexts)

Example phrases:
1. "Can I help you?" / "我能帮你吗？"
2. "Can I go now?" / "我能现在走吗？"
3. "Can I eat this?" / "我能吃这个吗？"
... (10 total, varying contexts)

## Next Steps

When the endpoint becomes available, run:

```bash
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/submit_worker6_baskets.sh
```

This script will:
1. Test endpoint connectivity
2. Submit both baskets with retry logic (3 attempts each)
3. Report success/failure for each LEGO
4. Exit with appropriate status code

## Manual Submission

If you need to submit manually:

```bash
# S0118L04
curl -k -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket \
  -H "Content-Type: application/json" \
  -d @/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/worker6_s0118l04_basket.json

# S0119L01
curl -k -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket \
  -H "Content-Type: application/json" \
  -d @/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/worker6_s0119l01_basket.json
```

## Basket JSON Format

Both baskets follow the required format:

```json
{
  "course": "zho_for_eng",
  "seed": "[SEED_ID]",
  "baskets": {
    "[LEGO_ID]": {
      "lego_id": "[LEGO_ID]",
      "practice_phrases": [
        {"known": "...", "target": "..."},
        ...
      ]
    }
  }
}
```

## Troubleshooting

If the endpoint remains unreachable:

1. **Check ngrok status**: Verify the tunnel is running
2. **Update endpoint URL**: If URL has changed, update:
   - `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/submit_worker6_baskets.sh` (line 6)
3. **Check network**: Test basic connectivity: `ping mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
4. **Try without SSL verification**: The script already uses `-k` flag for insecure connections
