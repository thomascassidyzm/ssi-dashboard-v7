# Practice Basket Upload Summary - S0051L07 & S0052L02

**Status**: Ready for upload (connection issue preventing automatic upload)

## LEGOs Processed

### S0051L07: "with my friends" / "和朋友一起"
- **Type**: M-type (Molecular)
- **Status**: new = true
- **Component**: "my friends" / "朋友"
- **Seed**: S0051
- **Practice phrases**: 10 (progressive difficulty)

### S0052L02: "wanted to" / "想"
- **Type**: A-type (Atomic)
- **Status**: new = true
- **Seed**: S0052
- **Practice phrases**: 10 (progressive difficulty)

---

## Generated Practice Phrases

### S0051L07: "with my friends" / "和朋友一起"

1. I want to go with my friends / 我想和朋友一起去
2. I'm learning with my friends / 我在和朋友一起学
3. I like to speak Chinese with my friends / 我喜欢和朋友一起说中文
4. I'm trying to study with my friends / 我在尝试和朋友一起学习
5. I want to watch a movie with my friends / 我想和朋友一起看电影
6. I went to Beijing with my friends / 我和朋友一起去了北京
7. I'm eating dinner with my friends now / 我现在在和朋友一起吃晚饭
8. I like to travel with my friends / 我喜欢和朋友一起旅行
9. I went to the restaurant with my friends yesterday / 我昨天和朋友一起去了餐厅
10. I want to practice speaking Chinese with my friends as often as possible / 我想尽可能常和朋友一起练习说中文

**Pattern**: Progressive complexity from simple "want to go" to complex sentence with temporal markers and frequency adverbs. All phrases incorporate "with my friends" in natural contexts using vocabulary from S0001-S0052.

### S0052L02: "wanted to" / "想"

1. I wanted to go / 我想去
2. I wanted to learn Chinese / 我想学中文
3. I wanted to speak with you / 我想跟你说
4. I wanted to try / 我想尝试
5. I wanted to eat dinner / 我想吃晚饭
6. I wanted to watch a movie / 我想看电影
7. I wanted to go to Beijing yesterday / 我昨天想去北京
8. I wanted to study with my friends / 我想和朋友一起学习
9. I wanted to practice speaking Chinese last week / 我上周想练习说中文
10. I wanted to travel to China as soon as possible / 我想尽快去中国旅行

**Pattern**: Progressive complexity from simple verb phrases to sentences with temporal markers (yesterday, last week) and frequency/manner adverbs (as soon as possible). Note: In Chinese, "想" serves for both present "want to" and past "wanted to" - context from temporal markers (昨天, 上周) indicates past tense.

---

## Upload Details

**Endpoint**: `POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`

**JSON Files**:
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/baskets_s0051_s0052/s0051_basket.json`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/baskets_s0051_s0052/s0052_basket.json`

**Upload Status**: ❌ Connection failed (SSL_ERROR_SYSCALL)

### Issue Details
- All upload attempts failed with SSL connection error
- Error: `LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to mirthlessly-nonanesthetized-marilyn.ngrok-free.dev:443`
- Both Node.js fetch and curl encountered the same SSL handshake failure
- Ngrok tunnel may be down or experiencing connectivity issues

### Manual Upload Instructions

When the ngrok tunnel is available, upload each basket file using curl:

```bash
# Upload S0051L07 basket
curl -k -X POST 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket' \
  -H 'Content-Type: application/json' \
  -H 'ngrok-skip-browser-warning: true' \
  --data @/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/baskets_s0051_s0052/s0051_basket.json

# Upload S0052L02 basket
curl -k -X POST 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket' \
  -H 'Content-Type: application/json' \
  -H 'ngrok-skip-browser-warning: true' \
  --data @/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/baskets_s0051_s0052/s0052_basket.json
```

Or use the retry script:
```bash
node /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/upload_s0051_s0052_baskets.cjs
```

---

## Validation

### Vocabulary Coverage
- All practice phrases use only vocabulary from S0001-S0052 (280 unique LEGOs)
- No out-of-scope vocabulary introduced
- Verified against `/tmp/vocab_s0052.txt`

### LEGO Usage Rules
- ✅ Complete LEGO appears in every phrase
- ✅ Progressive difficulty (2-2-2-4 pattern)
- ✅ Natural contexts for LEGO usage
- ✅ M-type (S0051L07) uses component "my friends" / "朋友" throughout
- ✅ A-type (S0052L02) demonstrates "wanted to" in various contexts

### Format Compliance
- ✅ JSON structure matches required schema
- ✅ Each basket has exactly 10 practice phrases
- ✅ All fields present: course, seed, baskets, lego_id, practice_phrases
- ✅ Each phrase has "known" and "target" keys

---

## Next Steps

1. **Verify ngrok tunnel**: Check if the endpoint is accessible
2. **Retry upload**: Run the upload script or use curl commands above
3. **Confirm receipt**: Verify baskets were successfully stored in Supabase
4. **Mark complete**: Update task status once upload confirmed

---

**Generated**: 2026-01-11
**Course**: zho_for_eng
**Seeds**: S0051, S0052
**LEGOs**: S0051L07, S0052L02
**Total Practice Phrases**: 20 (10 per LEGO)
