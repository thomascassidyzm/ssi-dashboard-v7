# Manual Upload Instructions for S0045L04 and S0046L02

## Summary

Generated practice baskets for LEGOs S0045L04 and S0046L02 according to specifications:
- 10 practice phrases per LEGO
- Progressive complexity: 2-2-2-4 pattern (simple → medium → medium-complex → complex)
- Vocabulary limited to S0001-S0046 range
- Each phrase uses the complete LEGO

## Generated Baskets

### S0045L04: "everything" / "一切"
- **Seed**: S0045
- **File**: `s0045_basket.json`
- **Practice phrases**: 10
- **Complexity progression**:
  - 2 simple (2-3 words): "I want everything.", "You know everything."
  - 2 medium (4-5 words): "I don't understand everything.", etc.
  - 2 medium-complex (6-7 words): "I want to know everything about you.", etc.
  - 4 complex (8-12 words): Full contextual sentences

### S0046L02: "don't worry about" / "不担心"
- **Seed**: S0046
- **File**: `s0046_basket.json`
- **Practice phrases**: 10
- **Complexity progression**:
  - 2 simple: "Don't worry about me.", "I don't worry about it."
  - 2 medium: "Don't worry about making mistakes.", etc.
  - 2 medium-complex: "You don't need to worry about anything.", etc.
  - 4 complex: Full contextual sentences

## Upload Endpoint

**URL**: `http://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`
**Method**: POST
**Content-Type**: application/json

## TLS Issue Encountered

The ngrok endpoint has a TLS/SSL configuration issue:
- HTTP (port 80) returns 307 redirect to HTTPS
- HTTPS (port 443) fails with SSL handshake error
- Error: `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`

## Manual Upload Options

### Option 1: Using curl (if TLS is fixed)
```bash
curl -X POST 'http://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket' \
  -H 'Content-Type: application/json' \
  -H 'ngrok-skip-browser-warning: true' \
  -d @s0045_basket.json

curl -X POST 'http://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket' \
  -H 'Content-Type: application/json' \
  -H 'ngrok-skip-browser-warning: true' \
  -d @s0046_basket.json
```

### Option 2: Using browser/Postman
1. Open Postman or similar API client
2. Set method to POST
3. Set URL: `http://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`
4. Set header: `Content-Type: application/json`
5. Set header: `ngrok-skip-browser-warning: true`
6. Copy content from `s0045_basket.json` into request body
7. Send request
8. Repeat for `s0046_basket.json`

### Option 3: Alternative endpoint
If there's a local endpoint running (e.g., on port 3456 or 3459), you can upload directly:
```bash
curl -X POST 'http://localhost:XXXX/upload-basket' \
  -H 'Content-Type: application/json' \
  -d @s0045_basket.json
```

## Verification

After upload, verify that:
1. Both baskets were accepted (HTTP 200/201/204 response)
2. Data appears in the database/storage
3. Practice phrases are properly associated with their LEGOs

## Files Location

All files are saved in:
`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/baskets_s0045_s0046/`

- `s0045_basket.json` - S0045L04 basket
- `s0046_basket.json` - S0046L02 basket
- `MANUAL_UPLOAD_INSTRUCTIONS.md` - This file

---

**Generated**: 2026-01-11
**Course**: zho_for_eng
**LEGOs**: S0045L04, S0046L02
