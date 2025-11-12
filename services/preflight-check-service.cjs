/**
 * Pre-flight Check Service
 *
 * Validates all required services and connections before Phase 8 audio generation.
 * Prevents wasted time by catching configuration issues early.
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');

/**
 * Check if Azure Speech API is accessible and working
 */
async function checkAzureConnection() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key) {
    return {
      success: false,
      service: 'Azure Speech',
      error: 'AZURE_SPEECH_KEY not set in .env file'
    };
  }

  if (!region) {
    return {
      success: false,
      service: 'Azure Speech',
      error: 'AZURE_SPEECH_REGION not set in .env file'
    };
  }

  // Test actual API connection
  return new Promise((resolve) => {
    const options = {
      hostname: `${region}.tts.speech.microsoft.com`,
      path: '/cognitiveservices/voices/list',
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': key
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const voices = JSON.parse(data);
            resolve({
              success: true,
              service: 'Azure Speech',
              message: `Connected to ${region} (${voices.length} voices available)`,
              details: {
                region,
                voiceCount: voices.length
              }
            });
          } catch (error) {
            resolve({
              success: false,
              service: 'Azure Speech',
              error: `Invalid response from API: ${error.message}`
            });
          }
        } else if (res.statusCode === 401) {
          resolve({
            success: false,
            service: 'Azure Speech',
            error: `Invalid API key (HTTP 401). Check AZURE_SPEECH_KEY in .env`
          });
        } else if (res.statusCode === 403) {
          resolve({
            success: false,
            service: 'Azure Speech',
            error: `Access forbidden (HTTP 403). Check region and permissions`
          });
        } else {
          resolve({
            success: false,
            service: 'Azure Speech',
            error: `API returned HTTP ${res.statusCode}`
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        service: 'Azure Speech',
        error: `Network error: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        service: 'Azure Speech',
        error: 'Connection timeout (10s). Check network or region.'
      });
    });

    req.end();
  });
}

/**
 * Check if ElevenLabs API is accessible and working
 */
async function checkElevenLabsConnection() {
  const key = process.env.ELEVENLABS_API_KEY;

  if (!key) {
    return {
      success: false,
      service: 'ElevenLabs',
      error: 'ELEVENLABS_API_KEY not set in .env file',
      warning: 'Only needed if using ElevenLabs voices (source/presentation roles)'
    };
  }

  // Test API connection
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/user',
      method: 'GET',
      headers: {
        'xi-api-key': key
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const user = JSON.parse(data);
            resolve({
              success: true,
              service: 'ElevenLabs',
              message: `Connected (${user.subscription?.tier || 'unknown'} tier)`,
              details: {
                tier: user.subscription?.tier,
                characterCount: user.subscription?.character_count,
                characterLimit: user.subscription?.character_limit
              }
            });
          } catch (error) {
            resolve({
              success: false,
              service: 'ElevenLabs',
              error: `Invalid response: ${error.message}`
            });
          }
        } else if (res.statusCode === 401) {
          resolve({
            success: false,
            service: 'ElevenLabs',
            error: 'Invalid API key (HTTP 401). Check ELEVENLABS_API_KEY in .env'
          });
        } else {
          resolve({
            success: false,
            service: 'ElevenLabs',
            error: `API returned HTTP ${res.statusCode}`
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        service: 'ElevenLabs',
        error: `Network error: ${error.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        service: 'ElevenLabs',
        error: 'Connection timeout (10s). Check network connection.'
      });
    });

    req.end();
  });
}

/**
 * Check if AWS S3 credentials are configured
 */
async function checkS3Configuration() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;

  const missing = [];
  if (!accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
  if (!secretKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!region) missing.push('AWS_REGION');
  if (!bucket) missing.push('S3_BUCKET');

  if (missing.length > 0) {
    return {
      success: false,
      service: 'AWS S3',
      error: `Missing environment variables: ${missing.join(', ')}`
    };
  }

  // Note: We don't test S3 connection here to avoid extra costs
  // S3 will be tested during actual upload
  return {
    success: true,
    service: 'AWS S3',
    message: 'Configuration found',
    details: {
      region,
      bucket
    }
  };
}

/**
 * Check if required Node modules are installed
 */
async function checkDependencies() {
  const required = [
    { name: 'microsoft-cognitiveservices-speech-sdk', service: 'Azure TTS' },
    { name: 'elevenlabs', service: 'ElevenLabs' },
    { name: '@aws-sdk/client-s3', service: 'AWS S3' },
    { name: 'fs-extra', service: 'File operations' },
    { name: 'dotenv', service: 'Environment variables' }
  ];

  const missing = [];
  const installed = [];

  for (const dep of required) {
    try {
      require.resolve(dep.name);
      installed.push(dep.name);
    } catch (error) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      service: 'Node Dependencies',
      error: `Missing modules: ${missing.map(d => d.name).join(', ')}`,
      fix: `Run: npm install ${missing.map(d => d.name).join(' ')}`
    };
  }

  return {
    success: true,
    service: 'Node Dependencies',
    message: `All ${installed.length} required modules installed`
  };
}

/**
 * Check if sox (audio processor) is available
 */
async function checkSoxAvailability() {
  const { execSync } = require('child_process');

  try {
    execSync('which sox', { stdio: 'ignore' });
    const version = execSync('sox --version', { encoding: 'utf8' }).trim();
    return {
      success: true,
      service: 'SoX (Audio Processor)',
      message: `Installed: ${version.split('\n')[0]}`
    };
  } catch (error) {
    return {
      success: false,
      service: 'SoX (Audio Processor)',
      error: 'sox not found in PATH',
      fix: 'Install via: brew install sox (macOS) or apt-get install sox (Linux)',
      warning: 'Required for audio normalization and duration extraction'
    };
  }
}

/**
 * Run all pre-flight checks
 */
async function runPreflightChecks(options = {}) {
  const { verbose = true, skipOptional = false } = options;

  if (verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('Phase 8: Pre-flight Checks');
    console.log('='.repeat(60));
    console.log();
  }

  const results = [];

  // Critical checks
  if (verbose) console.log('Checking dependencies...');
  results.push(await checkDependencies());

  if (verbose) console.log('Checking Azure Speech API...');
  results.push(await checkAzureConnection());

  if (verbose) console.log('Checking ElevenLabs API...');
  results.push(await checkElevenLabsConnection());

  if (verbose) console.log('Checking S3 configuration...');
  results.push(await checkS3Configuration());

  if (verbose) console.log('Checking SoX audio processor...');
  results.push(await checkSoxAvailability());

  // Summary
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('Pre-flight Check Results');
    console.log('='.repeat(60));
    console.log();

    // Show passed checks
    if (passed.length > 0) {
      console.log('✅ PASSED:');
      passed.forEach(r => {
        console.log(`  ${r.service}: ${r.message || 'OK'}`);
        if (r.details) {
          Object.entries(r.details).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });
        }
      });
      console.log();
    }

    // Show failed checks
    if (failed.length > 0) {
      console.log('❌ FAILED:');
      failed.forEach(r => {
        console.log(`  ${r.service}: ${r.error}`);
        if (r.fix) {
          console.log(`    Fix: ${r.fix}`);
        }
        if (r.warning) {
          console.log(`    Note: ${r.warning}`);
        }
      });
      console.log();
    }

    console.log('='.repeat(60));
    console.log(`Summary: ${passed.length} passed, ${failed.length} failed`);
    console.log('='.repeat(60));
    console.log();
  }

  return {
    passed: passed.length,
    failed: failed.length,
    results,
    allPassed: failed.length === 0
  };
}

module.exports = {
  runPreflightChecks,
  checkAzureConnection,
  checkElevenLabsConnection,
  checkS3Configuration,
  checkDependencies,
  checkSoxAvailability
};
