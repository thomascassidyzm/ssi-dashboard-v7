/**
 * Generate presentation audio for specific missing LEGOs
 */
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
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

// Voice configs for presentation (English narrator)
const PRESENTATION_VOICES = {
  fra_for_eng: { voice: 'en-GB-SoniaNeural', style: 'friendly' },
  deu_for_eng: { voice: 'en-GB-SoniaNeural', style: 'friendly' },
  ara_for_eng: { voice: 'en-GB-SoniaNeural', style: 'friendly' }
}

const LANGUAGE_NAMES = {
  fra_for_eng: 'French',
  deu_for_eng: 'German',
  ara_for_eng: 'Arabic'
}

// Missing LEGOs to generate
const MISSING_LEGOS = [
  { course: 'fra_for_eng', seed: 250, lego: 1, known: 'Can you tell me' },
  { course: 'deu_for_eng', seed: 4, lego: 6, known: 'how one says' },
  { course: 'deu_for_eng', seed: 7, lego: 5, known: 'I want to try' },
  { course: 'deu_for_eng', seed: 25, lego: 8, known: 'before I have to go' },
  { course: 'deu_for_eng', seed: 47, lego: 10, known: 'that it is a good thing' },
  { course: 'deu_for_eng', seed: 3, lego: 4, known: 'how one speaks' },
  { course: 'ara_for_eng', seed: 168, lego: 1, known: 'And then' }
]

async function generateAzureTTS(text, voiceConfig) {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    )

    speechConfig.speechSynthesisVoiceName = voiceConfig.voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig)

    // Build SSML with style if specified
    let ssml
    if (voiceConfig.style) {
      ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-GB">
        <voice name="${voiceConfig.voice}">
          <mstts:express-as style="${voiceConfig.style}">
            ${text}
          </mstts:express-as>
        </voice>
      </speak>`
    } else {
      ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="${voiceConfig.voice}">${text}</voice>
      </speak>`
    }

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

async function generateForLego(legoInfo) {
  const { course, seed, lego, known } = legoInfo
  const legoId = `S${String(seed).padStart(4, '0')}L${String(lego).padStart(2, '0')}`
  const langName = LANGUAGE_NAMES[course]
  const voiceConfig = PRESENTATION_VOICES[course]

  // Generate presentation text
  const presentationText = `The ${langName} for '${known}', is:`

  console.log(`  Generating: "${presentationText}"`)

  try {
    // Generate TTS
    const audioBuffer = await generateAzureTTS(presentationText, voiceConfig)

    // Upload to S3
    const audioId = uuidv4()
    await uploadToS3(audioBuffer, audioId)

    // Create course_audio record
    const { data: audioRecord, error: audioError } = await supabase
      .from('course_audio')
      .insert({
        id: audioId,
        course_code: course,
        role: 'presentation',
        text: presentationText,
        text_normalized: presentationText.toLowerCase(),
        language: 'eng',  // Presentation is always in English
        voice_id: voiceConfig.voice,
        origin: 'tts',
        lego_id: legoId,
        s3_key: `mastered/${audioId}.mp3`
      })
      .select()
      .single()

    if (audioError) {
      throw new Error(`Failed to create audio record: ${audioError.message}`)
    }

    // Bind to LEGO
    const { error: updateError } = await supabase
      .from('course_legos')
      .update({ presentation_audio_id: audioId })
      .eq('course_code', course)
      .eq('seed_number', seed)
      .eq('lego_index', lego)

    if (updateError) {
      throw new Error(`Failed to bind to LEGO: ${updateError.message}`)
    }

    console.log(`  ✓ ${course} ${legoId}: Generated and bound`)
    return true
  } catch (error) {
    console.log(`  ✗ ${course} ${legoId}: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('=== GENERATING MISSING PRESENTATION AUDIO ===\n')
  console.log(`Generating ${MISSING_LEGOS.length} presentations...\n`)

  let success = 0
  let failed = 0

  for (const lego of MISSING_LEGOS) {
    const result = await generateForLego(lego)
    if (result) success++
    else failed++
  }

  console.log(`\n=== DONE ===`)
  console.log(`Success: ${success}, Failed: ${failed}`)
}

main().catch(console.error)
