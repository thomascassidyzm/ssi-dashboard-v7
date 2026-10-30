#!/usr/bin/env node
// Job #983: join each turn's trial clips (ffmpeg concat -> audio-only mp4, the one audio form publish-doc accepts), publish each,
// then publish an index page. Usage: node ita-part1-page.cjs <manifest.json> <workdir>   (env CS_CONV_TOKEN, CONV_ID)
const fs = require('fs'), cp = require('child_process'), path = require('path')
const [man, dir] = process.argv.slice(2); const m = JSON.parse(fs.readFileSync(man, 'utf8')); fs.mkdirSync(dir, { recursive: true })
const cache = path.join(dir, 'published.json'); const pub = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : {}
const H = { 'Content-Type': 'application/json', 'x-cs-conv': process.env.CS_CONV_TOKEN }
const post = async b => (await fetch('http://localhost:4317/api/publish-doc', { method: 'POST', headers: H, body: JSON.stringify({ conv_id: process.env.CONV_ID, ...b }) })).json()
;(async () => {
  const turns = {}; m.forEach(e => (turns[e.turn] ||= []).push(e))
  const chapNames = ['1. Tecnologia on demand e streaming']; let md = '# Aran e Tom dicono stronzate - Parte 1 (Italian audio)\n\nTom = Lorenzo, Aran = Luca (Cartesia). Tap a speaker line to open its clip. Text is the job #30 trial script, unedited.\n'
  let lastChap = null, have = 0, total = 0
  for (const [n, es] of Object.entries(turns)) {
    total++
    const chap = es[0].chap || chapNames[0]; if (chap !== lastChap) { md += `\n## ${chap}\n`; lastChap = chap }
    const text = es.map(e => e.text).join(' ')
    if (es.every(e => e.audioId) && !pub[n]) {
      const list = path.join(dir, `t${n}.txt`); fs.writeFileSync(list, es.map(e => { const f = path.join(dir, `${e.audioId}.mp3`); return `file '${f}'` }).join('\n'))
      for (const e of es) { const f = path.join(dir, `${e.audioId}.mp3`); if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from(await (await fetch('http://localhost:3470/api/audio/trial/' + e.audioId)).arrayBuffer())) }
      const out = path.join(dir, `turn${n}.mp4`); cp.execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out])
      const r = await post({ file: out, title: `Talk Bollocks IT P1 turn ${n} (${es[0].spk})`, internal: true }); pub[n] = r.url; fs.writeFileSync(cache, JSON.stringify(pub))
    }
    if (pub[n]) have++
    md += `\n**${n}. ${es[0].spk}** ${pub[n] ? `[▶ play](${pub[n]})` : '_(audio still rendering)_'}\n\n${text}\n`
  }
  md = md.replace('\n## ', `\nAudio ready for ${have} of ${total} turns.\n\n## `)
  const r = await post({ content: md, title: 'Aran e Tom dicono stronzate - Parte 1 (Italian audio)' }); console.log(have, total, r.url || JSON.stringify(r))
})()
