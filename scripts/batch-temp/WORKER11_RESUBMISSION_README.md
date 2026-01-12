# Worker 11 Basket Resubmission

## Status: ⚠️ READY TO UPLOAD (Endpoint Currently Unavailable)

The practice phrases for Worker 11's LEGOs have been generated and are ready for upload. However, the ngrok endpoint is currently experiencing TLS connection issues.

## LEGOs Generated

### S0121L02 - unusual/不寻常 (A-type)
**Practice Phrases (10 total, 2-2-2-4 progression):**

**Phase 1: Simple contexts (2)**
1. It is unusual → 这很不寻常
2. That is unusual → 那很不寻常

**Phase 2: Question forms (2)**
3. Is it unusual? → 这不寻常吗？
4. Was that unusual? → 那不寻常吗？

**Phase 3: Descriptive contexts (2)**
5. This is very unusual → 这非常不寻常
6. It seems unusual → 这似乎很不寻常

**Phase 4: Complex usage (4)**
7. That is quite unusual for him → 这对他来说很不寻常
8. I find this unusual → 我觉得这很不寻常
9. This is not unusual here → 这在这里并不不寻常
10. It would be unusual to see that → 看到那个会很不寻常

---

### S0121L03 - your/你的 (A-type)
**Practice Phrases (10 total, 2-2-2-4 progression):**

**Phase 1: Simple possession (2)**
1. your book → 你的书
2. your house → 你的房子

**Phase 2: Question forms (2)**
3. Is this your bag? → 这是你的包吗？
4. Is that your car? → 那是你的车吗？

**Phase 3: Descriptive contexts (2)**
5. I like your idea → 我喜欢你的想法
6. Your friend is here → 你的朋友在这里

**Phase 4: Complex usage (4)**
7. This is your opportunity → 这是你的机会
8. I appreciate your help → 我感谢你的帮助
9. Your decision is important → 你的决定很重要
10. What is your name? → 你的名字是什么？

---

## Upload Instructions

### Option 1: Automated Script (When Endpoint Available)
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp
./upload_worker11.sh
```

### Option 2: Manual Upload via curl

**S0121L02:**
```bash
curl -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "course": "zho_for_eng",
  "seed": "S0121",
  "baskets": {
    "S0121L02": {
      "lego_id": "S0121L02",
      "practice_phrases": [
        {"known": "It is unusual", "target": "这很不寻常"},
        {"known": "That is unusual", "target": "那很不寻常"},
        {"known": "Is it unusual?", "target": "这不寻常吗？"},
        {"known": "Was that unusual?", "target": "那不寻常吗？"},
        {"known": "This is very unusual", "target": "这非常不寻常"},
        {"known": "It seems unusual", "target": "这似乎很不寻常"},
        {"known": "That is quite unusual for him", "target": "这对他来说很不寻常"},
        {"known": "I find this unusual", "target": "我觉得这很不寻常"},
        {"known": "This is not unusual here", "target": "这在这里并不不寻常"},
        {"known": "It would be unusual to see that", "target": "看到那个会很不寻常"}
      ]
    }
  }
}
EOF
```

**S0121L03:**
```bash
curl -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "course": "zho_for_eng",
  "seed": "S0121",
  "baskets": {
    "S0121L03": {
      "lego_id": "S0121L03",
      "practice_phrases": [
        {"known": "your book", "target": "你的书"},
        {"known": "your house", "target": "你的房子"},
        {"known": "Is this your bag?", "target": "这是你的包吗？"},
        {"known": "Is that your car?", "target": "那是你的车吗？"},
        {"known": "I like your idea", "target": "我喜欢你的想法"},
        {"known": "Your friend is here", "target": "你的朋友在这里"},
        {"known": "This is your opportunity", "target": "这是你的机会"},
        {"known": "I appreciate your help", "target": "我感谢你的帮助"},
        {"known": "Your decision is important", "target": "你的决定很重要"},
        {"known": "What is your name?", "target": "你的名字是什么？"}
      ]
    }
  }
}
EOF
```

### Option 3: Use Node.js Script (When Endpoint Available)
```bash
node /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/resubmit_worker11_baskets.cjs
```

---

## Files Generated

1. **worker11_baskets.json** - Complete basket data in JSON format
2. **upload_worker11.sh** - Bash script for automated upload
3. **resubmit_worker11_baskets.cjs** - Node.js script with retry logic
4. **WORKER11_RESUBMISSION_README.md** - This file

---

## Troubleshooting

### Current Issue: TLS Handshake Failure
The ngrok tunnel at `mirthlessly-nonanesthetized-marilyn.ngrok-free.dev` is experiencing SSL/TLS connection issues:
- Error: `SSL_ERROR_SYSCALL` during TLS handshake
- Connection establishes but fails during SSL negotiation

### Solutions:
1. **Wait for ngrok tunnel to stabilize** - Temporary network issue
2. **Restart ngrok tunnel** - May resolve SSL certificate issues
3. **Use different endpoint** - If alternative endpoint available
4. **Test connectivity:**
   ```bash
   curl -I https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
   ```

---

## Expected Completion Message

Once successfully uploaded:
```
✅ Worker 11 resubmitted: 2 LEGOs
```

---

## Metadata

- **Worker:** 11
- **Seed:** S0121
- **LEGOs:** S0121L02, S0121L03
- **Type:** A-type (Atomic)
- **Course:** zho_for_eng (Chinese for English speakers)
- **Total Practice Phrases:** 20 (10 per LEGO)
- **Progression:** 2-2-2-4 (Simple → Question → Descriptive → Complex)
- **Endpoint:** https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
- **Status:** Ready to upload (endpoint currently unavailable)
- **Generated:** 2026-01-11
