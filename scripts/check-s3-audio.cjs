const { createClient } = require('@supabase/supabase-js')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

async function checkAudio() {
  // Check the specific audio IDs from the error
  const audioIds = [
    '356e236e-ac22-4eb8-b312-50a9c976aab1',
    'f331d5cc-bfa7-416d-99bc-2144cc4c9674'
  ]

  for (const id of audioIds) {
    console.log('Checking', id + ':')

    // Get the audio record
    const { data: audio } = await supabase
      .from('course_audio')
      .select('id, s3_key, text')
      .eq('id', id)
      .single()

    if (!audio) {
      console.log('  NOT FOUND in database!')
      continue
    }

    console.log('  DB record s3_key:', audio.s3_key)
    console.log('  Text:', audio.text?.substring(0, 60))

    // Check S3
    if (audio.s3_key) {
      try {
        await s3.send(new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET || 'ssi-courses',
          Key: audio.s3_key
        }))
        console.log('  S3: ✓ EXISTS')
      } catch (e) {
        console.log('  S3: ✗ NOT FOUND -', e.name)
      }
    } else {
      console.log('  S3: ✗ NO KEY IN DATABASE!')
    }
    console.log()
  }
}

checkAudio().catch(console.error)
