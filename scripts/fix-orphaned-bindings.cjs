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

const VOICE_CONFIG = { voice: 'en-GB-SoniaNeural', style: 'friendly' }

const LANGUAGE_NAMES = {
  zho_for_eng: 'Chinese',
  jpn_for_eng: 'Japanese'
}

const ORPHANED_LEGOS = [
  { course: 'zho_for_eng', seed: 23, lego: 8, known: 'started' },
  { course: 'zho_for_eng', seed: 53, lego: 3, known: 'put it here' },
  { course: 'zho_for_eng', seed: 133, lego: 9, known: 'well' },
  { course: 'jpn_for_eng', seed: 33, lego: 3, known: 'have you been learning' }
]

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

async function fixLego(info) {
  const { course, seed, lego, known } = info
  const legoId = `S${String(seed).padStart(4, '0')}L${String(lego).padStart(2, '0')}`
  const langName = LANGUAGE_NAMES[course]
  const presentationText = `The ${langName} for '${known}', is:`

  console.log(`  ${course} ${legoId}: "${known}"`)
  console.log(`    Generating: "${presentationText}"`)

  try {
    // Generate TTS
    const audioBuffer = await generateAzureTTS(presentationText)

    // Upload to S3
    const audioId = uuidv4()
    const s3Key = await uploadToS3(audioBuffer, audioId)

    // Create course_audio record
    const { error: audioError } = await supabase
      .from('course_audio')
      .insert({
        id: audioId,
        course_code: course,
        role: 'presentation',
        text: presentationText,
        text_normalized: presentationText.toLowerCase(),
        language: 'eng',
        voice_id: VOICE_CONFIG.voice,
        origin: 'tts',
        lego_id: legoId,
        s3_key: s3Key
      })

    if (audioError) throw new Error(`Audio insert failed: ${audioError.message}`)

    // Update LEGO with new presentation_audio_id
    const { error: updateError } = await supabase
      .from('course_legos')
      .update({ presentation_audio_id: audioId })
      .eq('course_code', course)
      .eq('seed_number', seed)
      .eq('lego_index', lego)

    if (updateError) throw new Error(`LEGO update failed: ${updateError.message}`)

    console.log(`    ✓ Generated and bound: ${audioId}`)
    return true
  } catch (error) {
    console.log(`    ✗ ${error.message}`)
    return false
  }
}

async function main() {
  console.log('=== FIXING ORPHANED PRESENTATION BINDINGS ===\n')

  let success = 0
  for (const lego of ORPHANED_LEGOS) {
    if (await fixLego(lego)) success++
  }

  console.log(`\n=== DONE: ${success}/${ORPHANED_LEGOS.length} fixed ===`)
}

main().catch(console.error)
