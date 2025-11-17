# Azure TTS Setup Instructions

## Current Status
✅ **ElevenLabs API key configured and ready**
⏳ **Azure TTS awaiting new subscription key from Kai**

## What's Already Configured

### 1. Environment Variables (.env)
The `.env` file has been updated with:
- ✅ AWS S3 credentials (for audio storage)
- ✅ ElevenLabs API key (for TTS generation)
- ⏳ Azure TTS placeholders (ready for keys)

### 2. TTS Service
The TTS service (`services/tts-service.cjs`) supports both:
- **ElevenLabs**: High-quality multilingual TTS
- **Azure Speech Services**: Microsoft TTS with SSML support

### 3. Audio Generation System
- Course manifest loading: ✅ Working
- S3 audio storage: ✅ Configured
- TTS generation: ✅ Ready (pending provider selection)

## When Azure Keys Arrive

### Step 1: Add Keys to .env
When Kai provides the new Azure subscription key and region, update `.env`:

```bash
# Azure TTS (for Phase 8 audio generation - alternative to ElevenLabs)
AZURE_TTS_KEY=your_new_azure_key_here
AZURE_TTS_REGION=your_azure_region_here  # e.g., 'eastus', 'westeurope'
```

### Step 2: Restart the Server
```bash
# Kill the current automation server
lsof -ti :3456 | xargs kill -9

# Start it again (it will load the new env vars)
node automation_server.cjs > /tmp/automation_server.log 2>&1 &
```

### Step 3: Test in AudioGeneration View
1. Navigate to `/audio-generation` in the dashboard
2. Select `spa_for_eng` from the course dropdown
3. Load the manifest
4. Choose your TTS provider:
   - **ElevenLabs**: Already configured and ready
   - **Azure**: Will be available once keys are added
5. Configure voice mappings for target/source languages
6. Generate audio

## Voice Configuration

### ElevenLabs Voice IDs
Common voice IDs for Spanish/English:
- Spanish: `TBA` (need to check ElevenLabs account)
- English: `TBA` (need to check ElevenLabs account)

### Azure Voice Names
Common voice names:
- Spanish (Spain): `es-ES-AlvaroNeural`, `es-ES-ElviraNeural`
- Spanish (Latin America): `es-MX-DaliaNeural`, `es-MX-JorgeNeural`
- English (US): `en-US-JennyNeural`, `en-US-GuyNeural`
- English (UK): `en-GB-SoniaNeural`, `en-GB-RyanNeural`

Full list: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support

## Cost Considerations

### ElevenLabs
- Free tier: 10,000 characters/month
- Creator tier: $5/month for 30,000 characters
- Pro tier: $22/month for 100,000 characters

For a 100-seed course with ~5000 words of audio:
- Approximately 25,000 characters
- **Estimated cost**: Creator tier ($5/month) should be sufficient

### Azure Speech Services
- Free tier: 5 hours of audio per month
- Standard tier: $1 per hour of audio

For a 100-seed course:
- Approximately 30-45 minutes of audio
- **Estimated cost**: Free tier should cover multiple courses

## Testing Checklist

- [ ] AWS S3 credentials working (test upload)
- [ ] ElevenLabs API key working (test generation)
- [ ] Azure credentials added (when available)
- [ ] Azure TTS working (test generation)
- [ ] Course manifest loads correctly
- [ ] Audio generates and uploads to S3
- [ ] Generated audio is accessible from S3 URLs

## Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :3456

# Kill any processes
lsof -ti :3456 | xargs kill -9

# Start fresh
node automation_server.cjs
```

### Environment Variables Not Loading
```bash
# Verify .env file exists
cat .env | grep -E "AZURE|ELEVENLABS|AWS"

# Server loads env vars on startup
# Must restart after changes
```

### TTS Generation Fails
1. Check API keys are valid
2. Check API quotas/limits
3. Check network connectivity
4. Review logs in `/tmp/automation_server.log`

## Next Steps

1. ⏳ Wait for Kai to set up new Azure subscription with admin account
2. ⏳ Receive Azure subscription key and region
3. ✅ Update `.env` file with Azure keys
4. ✅ Restart automation server
5. ✅ Test audio generation in dashboard
6. ✅ Generate audio for full course
7. ✅ Deploy to production

---

**Last Updated**: 2025-11-11
**Server Status**: Running on port 3456
**Environment**: Development (local machine)
