#!/usr/bin/env node
/**
 * Build the editable seed document for the seven onboarding messages.
 *
 *   node tools/htw-copy/build-onboarding.cjs [--out docs/copy-surfaces/onboarding-messages.md]
 *
 * Reads public.onboarding_messages — the live-editable table the old
 * /admin/onboarding editor wrote to — and flattens every word a learner would
 * read into a markdown document with one heading per string and a stable key
 * under each heading. Nothing is paraphrased: the strings are copied verbatim,
 * so a later worker maps edits back into the table by key, mechanically.
 *
 * What is deliberately NOT editable in the document: `channel`, `sort_order`,
 * `active` and `message_key`. Those are wiring, not copy. `trigger_description`
 * and `notes` are shown as context, unkeyed — an editor needs to know when a
 * message fires and why it is worded as it is, but neither is sent to anyone.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.join(__dirname, '../..')
const outArg = process.argv.indexOf('--out')
const OUT = path.join(REPO,
  outArg > -1 ? process.argv[outArg + 1] : 'docs/copy-surfaces/onboarding-messages.md')

const url = (fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  .match(/DATABASE_URL=(.*)/) || [])[1].trim()

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  const { rows } = await c.query(
    'select message_key, title, channel, subject, preheader, body, trigger_description, notes, sort_order' +
    ' from public.onboarding_messages order by sort_order')
  await c.end()

  const L = []
  const key = k => L.push('`' + k + '`', '')

  L.push('# The messages that meet a new learner', '')
  L.push('For whoever is editing. These are the seven messages the app sends someone in their')
  L.push('first week or two: five emails and two little tips that appear inside the app. They')
  L.push('run from the hour they sign up to the moment they reach the end of the free part.', '')
  L.push('None of them is sending yet — the sender does not exist. This is the copy waiting for')
  L.push('it, so the words are worth getting right before a single one goes out.', '')
  L.push('**Edit the words freely.** The `##`/`###` headings and the little `key` lines under')
  L.push('them are how we map your edits back, so please leave those alone — everything else is')
  L.push('yours to change.', '')
  L.push('Two things that are not words and are not yours to change here: **when it fires** and')
  L.push('**why it is worded this way** are printed under each message as context only. If a')
  L.push('message should fire at a different moment, say so in your edit and we will move it —')
  L.push('that part is wiring.', '')
  L.push('Anything in `{{double braces}}` is filled in per learner when the message is sent —')
  L.push('leave the braces and the name between them exactly as they are.', '')
  L.push('A few lines are governed by settled rulings and are fine to raise, but we will come')
  L.push('back to Tom on them rather than silently applying or reverting your edit:', '')
  L.push('- The names **Easy** and **Fast** for the two paces.')
  L.push('- The **no-streaks, no-points, no-leaderboard** framing — the decision, not just the words.')
  L.push('- The **honest thirty-hours arc**: that the first thirty hours are hard, and we say so.')
  L.push('- No learner-facing line says **lego** or **seed** — those are our words, not theirs.')
  L.push('- British English throughout.', '')
  L.push('Source: the `onboarding_messages` table, which the retired `/admin/onboarding` editor')
  L.push('used to write to. This page replaces it.', '')
  L.push('---', '')

  for (const m of rows) {
    const where = m.channel === 'email' ? 'Email' : 'A card inside the app'
    L.push(`## ${m.sort_order}. ${m.title}`, '')
    L.push(`*${where}. Fires: ${m.trigger_description}*`, '')
    if (m.notes) L.push(`*Why it is worded this way: ${m.notes}*`, '')

    L.push('### What we call it')
    key(`${m.message_key} / title`)
    L.push(m.title, '')

    if (m.subject !== null) {
      L.push('### The subject line')
      key(`${m.message_key} / subject`)
      L.push(m.subject, '')
    }
    if (m.preheader !== null) {
      L.push('### The preview line under the subject')
      key(`${m.message_key} / preheader`)
      L.push(m.preheader, '')
    }

    L.push('### The message itself')
    key(`${m.message_key} / body`)
    L.push(m.body, '')
    L.push('---', '')
  }

  const text = L.join('\n').replace(/\n{3,}/g, '\n\n')
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, text)

  const words = text.split(/\s+/).filter(Boolean).length
  console.log(`wrote ${OUT}`)
  console.log(`${rows.length} messages, ${words} words`)
})().catch(e => { console.error(e.message); process.exit(1) })
