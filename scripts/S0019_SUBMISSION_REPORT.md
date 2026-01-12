# S0019 Basket Submission Report

## Status: BLOCKED - SSL/TLS Connection Issue

### Summary

Attempted to resubmit baskets for seed S0019 LEGOs (S0019L01, S0019L03, S0019L04, S0019L05) to the new endpoint but encountered persistent SSL/TLS handshake errors preventing connection to the ngrok endpoint.

### LEGOs Prepared for Submission

| LEGO ID | LEGO Text (Known) | LEGO Text (Target) | Practice Phrases |
|---------|-------------------|-------------------|------------------|
| S0019L01 | But | 但 | 10 phrases |
| S0019L03 | don't want | 不想 | 10 phrases |
| S0019L04 | to stop | 停止 | 10 phrases |
| S0019L05 | talking | 说话 | 11 phrases |

**Total practice phrases**: 41 phrases across 4 LEGOs

### Source Data

- **Basket file**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/phase3_outputs/seed_S0019_baskets.json`
- **Course**: zho_for_eng
- **Seed**: S0019

### Target Endpoint

```
https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
```

### Issue Details

**Error Type**: SSL/TLS handshake failure

**Error Codes**:
- curl: Exit code 35 (SSL_ERROR_SYSCALL)
- Python requests: SSLEOFError (EOF occurred in violation of protocol)

**Attempted Solutions**:
1. ✗ Standard HTTPS connection with curl
2. ✗ HTTPS with SSL verification disabled (-k flag)
3. ✗ Force IPv4 (-4 flag)
4. ✗ Force TLS 1.2 (--tlsv1.2)
5. ✗ Python requests with default SSL
6. ✗ Python requests with SSL verification disabled
7. ✗ HTTP with redirect following (307 redirect to HTTPS fails)

**Diagnostic Output**:
```
LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to mirthlessly-nonanesthetized-marilyn.ngrok-free.dev:443
```

**Root Cause**: The SSL/TLS handshake between this machine (macOS with LibreSSL 3.3.6) and the ngrok endpoint is failing at the protocol level. This could be due to:
- ngrok tunnel configuration
- Network/firewall restrictions
- SSL library incompatibility
- Temporary ngrok service issues

### Prepared Files

All payloads have been prepared and saved for later submission:

1. **Payloads JSON**: `scripts/S0019_basket_payloads.json`
   - Contains all 4 LEGO payloads in the correct format
   - Ready to be submitted when connection is restored

2. **Python Submission Script**: `scripts/submit_s0019_baskets.py`
   - Reads payloads from JSON file
   - Submits each LEGO to the endpoint
   - Handles SSL errors gracefully
   - Provides detailed success/failure reporting
   - Usage: `python3 scripts/submit_s0019_baskets.py`

3. **Shell Submission Script**: `scripts/submit_s0019_baskets.sh`
   - Alternative using curl and jq
   - Usage: `./scripts/submit_s0019_baskets.sh`

### Payload Structure

Each LEGO payload follows this structure:

```json
{
  "course": "zho_for_eng",
  "seed": "S0019",
  "baskets": {
    "[LEGO_ID]": {
      "lego_id": "[LEGO_ID]",
      "practice_phrases": [
        {
          "known": "...",
          "target": "...",
          "syllable_count": N,
          "word_count": N,
          "lego_count": N,
          "position": N
        }
        // ... more phrases
      ]
    }
  }
}
```

### Next Steps

1. **Verify ngrok tunnel status**: Ensure the ngrok tunnel is active and properly configured
2. **Test connectivity**: Try accessing the endpoint from a different machine/network
3. **Alternative connection method**: Consider using a different ngrok tunnel or direct connection
4. **Run submission script**: Once connectivity is restored, run either:
   - `python3 scripts/submit_s0019_baskets.py` (recommended)
   - `./scripts/submit_s0019_baskets.sh` (alternative)

### Manual Submission Example

If the scripts don't work, you can manually submit using curl:

```bash
# For S0019L01
curl -X POST "https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket" \
  -H "Content-Type: application/json" \
  -d @<(jq -c '.payloads.S0019L01' scripts/S0019_basket_payloads.json)
```

Repeat for S0019L03, S0019L04, and S0019L05.

### Verification

Once submissions are successful, verify:
- [ ] All 4 LEGOs received 200 OK response
- [ ] Practice phrases are correctly stored
- [ ] No data corruption or encoding issues with Chinese characters
- [ ] Syllable counts, word counts, and positions are preserved

---

**Report Generated**: 2026-01-11
**Status**: Awaiting connection resolution
**Ready for Retry**: Yes - all payloads prepared and validated
