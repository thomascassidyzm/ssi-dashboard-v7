# Basket Upload for S0051L05 and S0051L06

## Status: Ready for Upload (Tunnel Down)

The baskets have been generated and are ready for upload, but the ngrok tunnel appears to be inactive.

## Generated Files

- `basket_S0051L05.json` - "things" (事) - 11 practice phrases
- `basket_S0051L06.json` - "my friends" (朋友) - 11 practice phrases

## Upload Instructions

### When tunnel is active:

```bash
# Upload S0051L05
curl -k -X POST 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket' \
  -H 'Content-Type: application/json' \
  -H 'ngrok-skip-browser-warning: true' \
  -d @basket_S0051L05.json

# Upload S0051L06
curl -k -X POST 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket' \
  -H 'Content-Type: application/json' \
  -H 'ngrok-skip-browser-warning: true' \
  -d @basket_S0051L06.json
```

### Or use the automated script:

```bash
node upload_baskets_s0051.cjs
```

## Basket Details

### S0051L05: "things" (事)

**Practice Pattern**: 1 complete + 2+2+2+4 progressive
- 1 complete LEGO: "things"
- 6 two-word phrases (interesting things, many things, etc.)
- 4 four-word sentences (I want to do things, I enjoy doing things, etc.)

**Total**: 11 practice phrases

### S0051L06: "my friends" (朋友)

**Practice Pattern**: 1 complete + 2+2+2+4 progressive
- 1 complete LEGO: "my friends"
- 6 two-word phrases (my good friends, many friends, etc.)
- 4 four-word sentences (I want to help my friends, I enjoy speaking with my friends, etc.)

**Total**: 11 practice phrases

## Vocabulary Scope

All practice phrases use vocabulary introduced in seeds S0001-S0051 (211 unique vocabulary items).

## Next Steps

1. Verify ngrok tunnel is active
2. Run upload script or use curl commands above
3. Verify successful upload responses
4. Confirm baskets appear in database

