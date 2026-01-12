# Worker 13 Basket Resubmission

## Overview

This directory contains scripts and data for resubmitting Worker 13's baskets to the database.

**LEGOs to resubmit:**
- `S0121L07`: "It's unusual" / "很不寻常" (A-type)
- `S0122L01`: "easier" / "容易" (A-type)

**Endpoint:** `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`

## Files

- `resubmit_worker13.cjs` - Node.js script with automatic retry logic
- `resubmit_worker13_v2.sh` - Bash script with connectivity testing
- `worker13_S0121L07.json` - JSON payload for S0121L07
- `worker13_S0122L01.json` - JSON payload for S0122L01

## Usage

### Option 1: Automated Script (Node.js - Recommended)

```bash
node scripts/resubmit_worker13.cjs
```

Features:
- Tests endpoint connectivity first
- Automatic retry logic (3 attempts per LEGO)
- Colored output for easy status tracking
- Timeout protection (30s per request)

### Option 2: Bash Script

```bash
./scripts/resubmit_worker13_v2.sh
```

### Option 3: Manual Upload with curl

When the endpoint is available, you can manually upload each basket:

```bash
# Upload S0121L07
curl -X POST \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @scripts/worker13_S0121L07.json \
  https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket

# Upload S0122L01
curl -X POST \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d @scripts/worker13_S0122L01.json \
  https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
```

## Troubleshooting

### Endpoint Not Accessible

If you see the error "Endpoint is not accessible", this means the ngrok tunnel is not currently active. To resolve:

1. Ensure the ngrok tunnel is running
2. Verify the endpoint URL is correct
3. Check that the backend service is running on the tunneled port
4. Test the health endpoint: `curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/health`

### Connection Timeout

If requests timeout:
- The backend service may be overloaded
- Network connectivity issues
- Try increasing the timeout in the script

### HTTP Error Codes

- `200/201` - Success, basket uploaded
- `400` - Bad request, check JSON format
- `404` - Endpoint not found, verify URL
- `500` - Server error, check backend logs

## Practice Phrases Structure

Each basket contains 10 practice phrases following the 2-2-2-4 progression:

**Levels:**
1. Simple (phrases 1-2): Short, basic usage
2. Intermediate (phrases 3-4): Moderate complexity
3. Advanced (phrases 5-6): Complex structures
4. Expert (phrases 7-10): Longest and most complex

## Basket Data Summary

### S0121L07: "It's unusual" (很不寻常)

A-type LEGO from seed S0121. Practice phrases range from simple "It's unusual." to complex sentences with multiple clauses.

**Sample phrases:**
- Simple: "It's unusual."
- Intermediate: "It's unusual you said that."
- Advanced: "It's unusual you don't like to go by bus."
- Expert: "It's unusual when we meet people who don't like to use your car."

### S0122L01: "easier" (容易)

A-type LEGO from seed S0122. Practice phrases focus on comparative constructions and feelings about learning.

**Sample phrases:**
- Simple: "It's easier."
- Intermediate: "Speaking Chinese is easier."
- Advanced: "Speaking is easier than before."
- Expert: "I think speaking Chinese is easier now than when we were in the pub."

## Expected Result

When successful, you should see:

```
✅ Worker 13 resubmitted: 2 LEGOs
```

Both LEGOs will be stored in the database with their complete practice phrase sets.
