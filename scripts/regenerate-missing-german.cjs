/**
 * Regenerate German presentation audio for files missing from S3
 */
const { createClient } = require('@supabase/supabase-js')
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const sdk = require('microsoft-cognitiveservices-speech-sdk')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const VOICE_CONFIG = { voice: 'en-GB-SoniaNeural', style: 'friendly' }

async function generateAzureTTS(text) {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    )

    speechConfig.speechSynthesisVoiceName = VOICE_CONFIG.voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig)

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-GB">
      <voice name="${VOICE_CONFIG.voice}">
        <mstts:express-as style="${VOICE_CONFIG.style}">
          ${text}
        </mstts:express-as>
      </voice>
    </speak>`

    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close()
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData))
        } else {
          reject(new Error(`TTS failed: ${result.errorDetails}`))
        }
      },
      error => {
        synthesizer.close()
        reject(error)
      }
    )
  })
}

async function checkS3Exists(key) {
  try {
    await s3.send(new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET || 'ssi-courses',
      Key: key
    }))
    return true
  } catch {
    return false
  }
}

async function uploadToS3(buffer, uuid) {
  const key = `mastered/${uuid}.mp3`
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET || 'ssi-courses',
    Key: key,
    Body: buffer,
    ContentType: 'audio/mpeg'
  }))
  return key
}

async function main() {
  console.log('=== REGENERATING MISSING GERMAN PRESENTATION AUDIO ===\n')

  // Get all German LEGOs with presentation_audio_id
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, presentation_audio_id')
    .eq('course_code', 'deu_for_eng')
    .eq('is_new', true)
    .not('presentation_audio_id', 'is', null)

  console.log(`Checking ${legos.length} LEGOs for missing S3 files...\n`)

  // Find LEGOs with missing S3 files
  const toRegenerate = []

  for (const lego of legos) {
    const { data: audio } = await supabase
      .from('course_audio')
      .select('s3_key')
      .eq('id', lego.presentation_audio_id)
      .single()

    if (!audio?.s3_key || !(await checkS3Exists(audio.s3_key))) {
      toRegenerate.push(lego)
    }
  }

  console.log(`Found ${toRegenerate.length} LEGOs needing regeneration\n`)

  if (toRegenerate.length === 0) {
    console.log('Nothing to regenerate!')
    return
  }

  let success = 0
  let failed = 0

  for (let i = 0; i < toRegenerate.length; i++) {
    const lego = toRegenerate[i]
    const legoId = `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`
    const presentationText = `The German for '${lego.known_text}', is:`

    process.stdout.write(`[${i + 1}/${toRegenerate.length}] ${legoId} "${lego.known_text}"... `)

    try {
      // Generate TTS
      const audioBuffer = await generateAzureTTS(presentationText)

      // Upload to S3
      const audioId = uuidv4()
      const s3Key = await uploadToS3(audioBuffer, audioId)

      // Create new audio record
      const { error: insertError } = await supabase
        .from('course_audio')
        .insert({
          id: audioId,
          course_code: 'deu_for_eng',
          role: 'presentation',
          text: presentationText,
          text_normalized: presentationText.toLowerCase(),
          language: 'eng',
          voice_id: VOICE_CONFIG.voice,
          origin: 'tts',
          lego_id: legoId,
          s3_key: s3Key
        })

      if (insertError) throw new Error(insertError.message)

      // Update LEGO to point to new audio
      const { error: updateError } = await supabase
        .from('course_legos')
        .update({ presentation_audio_id: audioId })
        .eq('course_code', 'deu_for_eng')
        .eq('seed_number', lego.seed_number)
        .eq('lego_index', lego.lego_index)

      if (updateError) throw new Error(updateError.message)

      console.log('✓')
      success++
    } catch (error) {
      console.log('✗', error.message)
      failed++
    }

    // Small delay to avoid rate limiting
    if (i % 10 === 9) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\n=== DONE ===`)
  console.log(`Success: ${success}, Failed: ${failed}`)
}

main().catch(console.error)
