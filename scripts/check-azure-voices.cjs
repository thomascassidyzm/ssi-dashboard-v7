#!/usr/bin/env node
require('dotenv').config();

const https = require('https');

const AZURE_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const AZURE_KEY = process.env.AZURE_SPEECH_KEY;

// ISO 639-3 to Azure locale prefix mapping
const LANG_MAP = {
  'ara': 'ar',
  'cym': 'cy',
  'deu': 'de',
  'eng': 'en',
  'fin': 'fi',
  'fra': 'fr',
  'gle': 'ga',
  'ita': 'it',
  'jpn': 'ja',
  'kor': 'ko',
  'nld': 'nl',
  'por': 'pt',
  'spa': 'es',
  'swe': 'sv',
  'tur': 'tr',
  'zho': 'zh'
};

const LANG_NAMES = {
  'ara': 'Arabic',
  'cym': 'Welsh',
  'deu': 'German',
  'eng': 'English',
  'fin': 'Finnish',
  'fra': 'French',
  'gle': 'Irish',
  'ita': 'Italian',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'nld': 'Dutch',
  'por': 'Portuguese',
  'spa': 'Spanish',
  'swe': 'Swedish',
  'tur': 'Turkish',
  'zho': 'Chinese'
};

async function fetchVoices() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${AZURE_REGION}.tts.speech.microsoft.com`,
      path: '/cognitiveservices/voices/list',
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Fetching Azure TTS voices...\n');

  const voices = await fetchVoices();

  // Group by language
  const byLang = {};
  voices.forEach(v => {
    const lang = v.Locale.split('-')[0];
    if (!byLang[lang]) byLang[lang] = [];
    byLang[lang].push(v);
  });

  const needed = Object.keys(LANG_MAP);

  console.log('Azure TTS Coverage for Your Languages:\n');
  console.log('Language     | Code | Voices | Neural | Multilingual | Status');
  console.log('-'.repeat(70));

  let allCovered = true;

  needed.forEach(iso3 => {
    const azureLang = LANG_MAP[iso3];
    const langVoices = byLang[azureLang] || [];
    const neural = langVoices.filter(v => v.VoiceType === 'Neural');
    const multi = langVoices.filter(v => v.ShortName.includes('Multilingual'));

    const status = langVoices.length > 0 ? '✓' : '✗ MISSING';
    if (langVoices.length === 0) allCovered = false;

    console.log(
      LANG_NAMES[iso3].padEnd(12) + ' | ' +
      iso3.padEnd(4) + ' | ' +
      String(langVoices.length).padStart(6) + ' | ' +
      String(neural.length).padStart(6) + ' | ' +
      String(multi.length).padStart(12) + ' | ' +
      status
    );
  });

  console.log('\n' + '='.repeat(70));
  console.log('Total Azure voices:', voices.length);
  console.log('Total Azure languages:', Object.keys(byLang).length);
  console.log('Your languages covered:', allCovered ? 'ALL ✓' : 'SOME MISSING ✗');

  // Show sample voices for each needed language
  console.log('\n\nSample voices per language:\n');

  needed.forEach(iso3 => {
    const azureLang = LANG_MAP[iso3];
    const langVoices = byLang[azureLang] || [];
    const neural = langVoices.filter(v => v.VoiceType === 'Neural');

    if (neural.length > 0) {
      const samples = neural.slice(0, 3).map(v => v.ShortName).join(', ');
      console.log(`${LANG_NAMES[iso3]} (${iso3}): ${samples}${neural.length > 3 ? '...' : ''}`);
    } else if (langVoices.length > 0) {
      const samples = langVoices.slice(0, 3).map(v => v.ShortName).join(', ');
      console.log(`${LANG_NAMES[iso3]} (${iso3}): ${samples} [non-neural]`);
    } else {
      console.log(`${LANG_NAMES[iso3]} (${iso3}): NO VOICES`);
    }
  });
}

main().catch(console.error);
