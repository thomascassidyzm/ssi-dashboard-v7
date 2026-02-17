/**
 * Regenerate German presentation audio WITH seed context
 * Format: "The German for '{known_lego}', as in '{known_seed}', is:"
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
  console.log('=== REGENERATING GERMAN AUDIO WITH SEED CONTEXT ===\n')

  // Find audio records I generated (short format without "as in")
  const { data: shortFormatAudio } = await supabase
    .from('course_audio')
    .select('id, text, lego_id')
    .eq('course_code', 'deu_for_eng')
    .eq('role', 'presentation')
    .like('text', "The German for '%', is:")
    .not('text', 'ilike', "%as in%")

  console.log(`Found ${shortFormatAudio?.length || 0} audio records with short format\n`)

  if (!shortFormatAudio || shortFormatAudio.length === 0) {
    console.log('Nothing to regenerate!')
    return
  }

  // Get seed texts for context
  const seedCache = new Map()
  async function getSeedText(seedNumber) {
    if (seedCache.has(seedNumber)) return seedCache.get(seedNumber)

    const { data: seed } = await supabase
      .from('course_seeds')
      .select('known_text')
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', seedNumber)
      .single()

    seedCache.set(seedNumber, seed?.known_text || '')
    return seed?.known_text || ''
  }

  let success = 0
  let failed = 0

  for (let i = 0; i < shortFormatAudio.length; i++) {
    const audio = shortFormatAudio[i]

    // Parse lego_id to get seed number
    const legoId = audio.lego_id
    if (!legoId) {
      console.log(`[${i + 1}/${shortFormatAudio.length}] Skipping - no lego_id`)
      failed++
      continue
    }

    const seedNumber = parseInt(legoId.substring(1, 5))
    const legoIndex = parseInt(legoId.substring(6, 8))

    // Get the LEGO's known_text
    const { data: lego } = await supabase
      .from('course_legos')
      .select('known_text')
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', seedNumber)
      .eq('lego_index', legoIndex)
      .single()

    if (!lego) {
      console.log(`[${i + 1}/${shortFormatAudio.length}] ${legoId} - LEGO not found`)
      failed++
      continue
    }

    // Get seed text
    const seedText = await getSeedText(seedNumber)

    // Build full presentation text
    const presentationText = `The German for '${lego.known_text}', as in '${seedText}', is:`

    process.stdout.write(`[${i + 1}/${shortFormatAudio.length}] ${legoId} "${lego.known_text}"... `)

    try {
      // Generate TTS
      const audioBuffer = await generateAzureTTS(presentationText)

      // Upload to S3
      const newAudioId = uuidv4()
      const s3Key = await uploadToS3(audioBuffer, newAudioId)

      // Update the existing audio record with new file and text
      const { error: updateError } = await supabase
        .from('course_audio')
        .update({
          text: presentationText,
          text_normalized: presentationText.toLowerCase(),
          s3_key: s3Key
        })
        .eq('id', audio.id)

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
