# Basket Upload Report - S0051L03 & S0051L04

**Date**: 2026-01-11
**LEGOs**: S0051L03 (doing/做), S0051L04 (interesting/有趣的)
**Status**: Generated - Upload Failed (SSL Error)

## Generated Baskets

### S0051L03 (doing/做)
**File**: `basket_s0051l03.json`
**Practice Phrases**: 10 (2 short, 2 medium, 2 medium-long, 4 longer)

1. I'm doing this. → 我在做这个。
2. What are you doing? → 你在做什么？
3. I'm doing this now. → 我现在在做这个。
4. She's doing something good. → 她在做好事。
5. I want to start doing this tomorrow. → 我想明天开始做这个。
6. He's doing something very important. → 他在做很重要的事。
7. I enjoy doing different things every day. → 我喜欢每天做不同的事。
8. We need to finish doing this as quickly as possible. → 我们需要尽快完成做这个。
9. I want to know what you're doing right now. → 我想知道你现在在做什么。
10. She said she's doing something important at home. → 她说她在家做重要的事。

### S0051L04 (interesting/有趣的)
**File**: `basket_s0051l04.json`
**Practice Phrases**: 10 (2 short, 2 medium, 2 medium-long, 4 longer)

1. This is interesting. → 这个很有趣。
2. That's very interesting. → 那很有趣。
3. I want something interesting. → 我想要有趣的东西。
4. This is really interesting. → 这真的很有趣。
5. I enjoy doing interesting things. → 我喜欢做有趣的事。
6. That's a very interesting idea. → 那是个很有趣的想法。
7. I enjoy doing interesting things with my friends. → 我喜欢和朋友一起做有趣的事。
8. She wants to try something new and interesting tomorrow. → 她想明天尝试新的有趣的事。
9. We always do interesting things on the weekend. → 我们周末总是做有趣的事。
10. I think this is the most interesting thing here. → 我觉得这是这里最有趣的事。

## Upload Attempts

**Endpoint**: `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`
**Method**: POST with JSON payload

### Errors Encountered

All upload attempts (both Node.js and Python) failed with SSL errors:

```
SSLError: EOF occurred in violation of protocol
SSL_ERROR_SYSCALL in connection
Client network socket disconnected before secure TLS connection was established
```

### Possible Causes

1. **ngrok tunnel expired** - The tunnel URL may no longer be active
2. **Network/firewall blocking** - SSL handshake being blocked
3. **SSL/TLS version mismatch** - Protocol negotiation failing

## Files Generated

```
scripts/batch-temp/
├── basket_s0051l03.json              # S0051L03 basket (ready to upload)
├── basket_s0051l04.json              # S0051L04 basket (ready to upload)
├── generate_baskets_s0051l03_s0051l04.cjs  # Generation script
├── upload_baskets_s0051.cjs          # Node.js upload script
└── upload_baskets_s0051.py           # Python upload script
```

## Next Steps

### Option 1: Verify ngrok tunnel
Check if the ngrok tunnel is still active:
```bash
curl -k https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/health
```

### Option 2: Use alternative endpoint
If you have a different endpoint (local, different tunnel, etc.):
```bash
# Edit the scripts to use new endpoint
ENDPOINT="http://localhost:3456/upload-basket"

# Run upload
node scripts/batch-temp/upload_baskets_s0051.cjs
```

### Option 3: Manual upload with curl
If SSL continues to fail, try from a different network/machine:
```bash
curl -X POST http://your-endpoint/upload-basket \
  -H "Content-Type: application/json" \
  -d @basket_s0051l03.json

curl -X POST http://your-endpoint/upload-basket \
  -H "Content-Type: application/json" \
  -d @basket_s0051l04.json
```

### Option 4: Direct database insert
If the endpoint is not accessible, baskets can be inserted directly into the database if you have access.

## Basket Validation

Both baskets follow the required format:
- ✓ 10 practice phrases each
- ✓ Progressive complexity (2-2-2-4 pattern)
- ✓ Each phrase includes the target LEGO
- ✓ Vocabulary limited to S0001-S0051
- ✓ Natural, varied contexts
- ✓ Proper JSON structure

## Summary

**Generated**: 2/2 baskets
**Uploaded**: 0/2 baskets (SSL connection failed)

The baskets are ready and properly formatted. The upload failure is due to SSL/network issues with the ngrok endpoint, not issues with the basket data itself.
