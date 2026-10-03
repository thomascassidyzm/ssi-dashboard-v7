const test = require('node:test')
const assert = require('node:assert')
const { localesForVariety, orderForVariety, localeOfCandidate } = require('./variety-locales.cjs')

const c = (voiceId, engine, extra = {}) => ({ voiceId, engine, kind: engine, ...extra })

test('every Arabic, German, French, Spanish and Portuguese variety maps to its provider locale', () => {
  assert.deepEqual(['fra_ca', 'spa_mx', 'por_br', 'deu_at', 'deu_ch', 'ara_eg', 'ara_sy', 'ara_lb'].map((k) => localesForVariety(k)[0]),
    ['fr-CA', 'es-MX', 'pt-BR', 'de-AT', 'de-CH', 'ar-EG', 'ar-SY', 'ar-LB'])
  assert.deepEqual(localesForVariety('cym_north'), [])
})

test('regional voices lead BEFORE the 80-voice cap can cut them', () => {
  const rest = Array.from({ length: 100 }, (_, i) => c(`cartesia_p${i}`, 'cartesia', { accentLocale: 'fr-FR' }))
  const out = orderForVariety([...rest, c('cartesia_qc', 'cartesia', { accentLocale: 'fr-CA' }), c('fr-CA-SylvieNeural', 'azure')], 'fra_ca').slice(0, 80)
  assert.equal(out[0].voiceId, 'cartesia_qc')
  assert.equal(out[0].regional, true)
  assert.ok(!out.some((v) => v.voiceId === 'fr-CA-SylvieNeural'), 'Azure is held back where Cartesia has the locale')
})

test('Azure carries its locale in its id', () => {
  assert.equal(localeOfCandidate(c('ar-EG-SalmaNeural', 'azure')), 'ar-EG')
  const out = orderForVariety([c('ar-AE-HamdanNeural', 'azure'), c('ar-EG-SalmaNeural', 'azure')], 'ara_eg')
  assert.equal(out[0].voiceId, 'ar-EG-SalmaNeural')
})
