// xAI voice generation is BANNED (Tom 2026-10-10). Two things keep it from coming back by a key reappearing.
import { describe, it, expect } from 'vitest'
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process')
const { bannedKeyLines } = require('./lib/tts-key-guard.cjs')
const ROOT = path.join(__dirname, '..')

describe('xAI ban', () => {
  it('the key guard flags an XAI_API_KEY line even when it is a placeholder', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'xaikey-')), '.env')
    fs.writeFileSync(f, 'A=1\nXAI_API_KEY=STOPPED-BY-TOM-x\n')
    expect(bannedKeyLines(f)).toHaveLength(1)
    fs.writeFileSync(f, 'A=1\n# XAI_API_KEY=\n')
    expect(bannedKeyLines(f)).toHaveLength(0)
  })

  it('no .env.example in the repo carries an XAI_API_KEY line', () => {
    const files = execFileSync('git', ['ls-files', '*.env.example', '*.env*.example', '.env.example'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) expect(bannedKeyLines(path.join(ROOT, f)), f).toHaveLength(0)
  })

  it('no production code reads XAI_API_KEY or calls api.x.ai', () => {
    const allowed = /(\.test\.|tools\/lib\/tts-key-guard|tools\/check-tts-keys|tools\/tts-stop|tools\/a108\/|tools\/prosody-lab\/|tools\/tts-bakeoff\/)/
    const out = execFileSync('git', ['grep', '-lE', 'process\\.env\\.XAI_API_KEY|api\\.x\\.ai', '--', 'services', 'tools'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
    expect(out.filter(f => !allowed.test(f))).toEqual([])
  })
})
