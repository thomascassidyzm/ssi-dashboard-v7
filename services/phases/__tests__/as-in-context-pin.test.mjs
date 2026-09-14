/**
 * An "as in" context, once given, survives re-authoring (2026-09-03, eng_for_hin).
 *
 * Hindi कल is both "yesterday" and "tomorrow": the context sentence is the only
 * thing that says which. Re-authoring asks the judge from scratch, and the
 * judge — asked live — answered "bare" for three of the six कल chunks, because
 * a clean standalone word reads as self-sufficient. So the caller may PIN the
 * frame with `forceFrame`, and authorPresentations must honour it without
 * asking: a pinned item keeps its frame whatever the judge would say, a batch
 * where every item is pinned never calls the CLI at all, and a pinned 'B'
 * whose seed does not contain the chunk is downgraded to 'A' (a context that
 * does not demonstrate the chunk is worse than none).
 *
 * The CLI is stubbed by seeding Node's require cache before the module loads,
 * same harness as clip-identity-writers.test.mjs. No DB, no network, no CLI.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
const requireCjs = createRequire(import.meta.url)

const cli = { calls: [], reply: '' }
const cliPath = requireCjs.resolve('../../shared/claude-cli.cjs')
requireCjs.cache[cliPath] = {
  id: cliPath, filename: cliPath, loaded: true,
  exports: {
    claudeChat: async (prompt) => { cli.calls.push(prompt); return cli.reply },
    HAIKU_MODEL: 'haiku', SONNET_MODEL: 'sonnet',
  },
}
const pa = requireCjs('../presentation-author.cjs')

const HINDI = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :"
const opts = { template: HINDI, targetLangName: 'अंग्रेज़ी', knownLangName: 'Hindi' }
const author = (items) => pa.authorPresentations(null, {}, items, opts)

beforeEach(() => { cli.calls = []; cli.reply = '' })

describe('forceFrame pins the introduction frame through re-authoring', () => {
  it('a fully pinned batch never asks the judge and keeps its pins', async () => {
    // The judge, if asked, would say the opposite of every pin.
    cli.reply = '1. A\n2. B'
    const { authored } = await author([
      { lego_id: 'L1', chunk: 'कल सुबह', form: 'tomorrow morning', seed: 'मैं कल सुबह आऊँगा', forceFrame: 'B' },
      { lego_id: 'L2', chunk: 'कल', form: 'yesterday', seed: 'मैं कल आया था', forceFrame: 'A' },
    ])
    expect(cli.calls).toHaveLength(0)
    expect(authored.map(a => a.frame)).toEqual(['B', 'A'])
    expect(authored[0].text).toContain('जैसे')
    expect(authored[1].text).not.toContain('जैसे')
  })

  it('in a mixed batch the pin wins over the judge and the rest still get judged', async () => {
    cli.reply = '1. A\n2. A\nFLAG: 2 — seed does not match chunk'
    const { authored, flags } = await author([
      { lego_id: 'L1', chunk: 'कल रात', form: 'last night', seed: 'कल रात बारिश हुई', forceFrame: 'B' },
      { lego_id: 'L2', chunk: 'घर', form: 'house', seed: 'मैं घर जा रहा हूँ' },
    ])
    expect(cli.calls).toHaveLength(1)
    expect(authored.map(a => a.frame)).toEqual(['B', 'A'])
    expect(flags).toHaveLength(1)
    expect(flags[0].lego_id).toBe('L2')
  })

  it("a pinned 'B' whose seed does not contain the chunk comes back 'A'", async () => {
    const { authored } = await author([
      { lego_id: 'L1', chunk: 'कल', form: 'tomorrow', seed: 'यह वाक्य उसे नहीं दिखाता', forceFrame: 'B' },
    ])
    expect(cli.calls).toHaveLength(0)
    expect(authored[0].frame).toBe('A')
    expect(authored[0].text).not.toMatch(/''/)
  })
})
