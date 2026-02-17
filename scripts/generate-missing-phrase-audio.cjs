/**
 * Generate missing phrase audio to reach 100% coverage
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

// Voice configuration per language
const VOICES = {
  en: 'en-GB-SoniaNeural',
  deu: 'de-DE-KatjaNeural',
  jpn: 'ja-JP-NanamiNeural',
  zho: 'zh-CN-XiaoxiaoNeural'
}

// Second voice for target2
const VOICES_2 = {
  deu: 'de-DE-ConradNeural',
  jpn: 'ja-JP-KeitaNeural',
  zho: 'zh-CN-YunxiNeural'
}

async function generateTTS(text, voice) {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY,
      process.env.AZURE_SPEECH_REGION
    )
    speechConfig.speechSynthesisVoiceName = voice
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig)
    synthesizer.speakTextAsync(
      text,
      result => {
        synthesizer.close()
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData))
        } else {
          reject(new Error('TTS failed: ' + result.errorDetails))
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
  const key = 'mastered/' + uuid + '.mp3'
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET || 'ssi-courses',
    Key: key,
    Body: buffer,
    ContentType: 'audio/mpeg'
  }))
  return key
}

async function createAudioAndBind(courseCode, phraseId, text, role, language) {
  const voice = role === 'target2' ? VOICES_2[language] : VOICES[language]

  // Generate TTS
  const audioBuffer = await generateTTS(text, voice)

  // Upload to S3
  const audioId = uuidv4()
  const s3Key = await uploadToS3(audioBuffer, audioId)

  // Create course_audio record
  const { error: insertError } = await supabase
    .from('course_audio')
    .insert({
      id: audioId,
      course_code: courseCode,
      role: role,
      text: text,
      text_normalized: text.toLowerCase().trim(),
      language: language === 'en' ? 'en' : language,
      voice_id: voice,
      s3_key: s3Key,
      origin: 'tts'
    })

  if (insertError) throw new Error('Insert failed: ' + insertError.message)

  // Bind to phrase
  const updateField = role === 'known' ? 'known_audio_id' :
                      role === 'target1' ? 'target1_audio_id' : 'target2_audio_id'

  const { error: updateError } = await supabase
    .from('course_practice_phrases')
    .update({ [updateField]: audioId })
    .eq('id', phraseId)

  if (updateError) throw new Error('Update failed: ' + updateError.message)

  return audioId
}

async function main() {
  console.log('=== GENERATING MISSING PHRASE AUDIO ===\n')

  const courses = [
    { code: 'deu_for_eng', lang: 'deu' },
    { code: 'jpn_for_eng', lang: 'jpn' },
    { code: 'zho_for_eng', lang: 'zho' }
  ]

  let totalGenerated = 0

  for (const { code, lang } of courses) {
    console.log('--- ' + code + ' ---')

    // Find phrases missing known audio
    const { data: noKnown } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, known_text')
      .eq('course_code', code)
      .is('known_audio_id', null)

    for (const p of noKnown || []) {
      const ref = 'S' + String(p.seed_number).padStart(4,'0') + 'L' + String(p.lego_index).padStart(2,'0') + 'P' + String(p.position).padStart(2,'0')
      process.stdout.write(ref + ' known "' + p.known_text.substring(0,30) + '"... ')
      try {
        await createAudioAndBind(code, p.id, p.known_text, 'known', 'en')
        console.log('✓')
        totalGenerated++
      } catch (e) {
        console.log('✗ ' + e.message)
      }
    }

    // Find phrases missing target1 audio
    const { data: noTarget1 } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, target_text')
      .eq('course_code', code)
      .is('target1_audio_id', null)

    for (const p of noTarget1 || []) {
      const ref = 'S' + String(p.seed_number).padStart(4,'0') + 'L' + String(p.lego_index).padStart(2,'0') + 'P' + String(p.position).padStart(2,'0')
      process.stdout.write(ref + ' target1 "' + p.target_text.substring(0,30) + '"... ')
      try {
        await createAudioAndBind(code, p.id, p.target_text, 'target1', lang)
        console.log('✓')
        totalGenerated++
      } catch (e) {
        console.log('✗ ' + e.message)
      }
    }

    // Find phrases missing target2 audio
    const { data: noTarget2 } = await supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, target_text')
      .eq('course_code', code)
      .is('target2_audio_id', null)

    for (const p of noTarget2 || []) {
      const ref = 'S' + String(p.seed_number).padStart(4,'0') + 'L' + String(p.lego_index).padStart(2,'0') + 'P' + String(p.position).padStart(2,'0')
      process.stdout.write(ref + ' target2 "' + p.target_text.substring(0,30) + '"... ')
      try {
        await createAudioAndBind(code, p.id, p.target_text, 'target2', lang)
        console.log('✓')
        totalGenerated++
      } catch (e) {
        console.log('✗ ' + e.message)
      }
    }

    console.log('')
  }

  console.log('=== DONE: Generated ' + totalGenerated + ' audio files ===')
}

main().catch(console.error)
