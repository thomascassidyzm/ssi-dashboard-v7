// Minimal, dependency-free markdown → HTML renderer.
// Covers what the docs actually use: headers, paragraphs, bold/italic, inline
// code, fenced code blocks, tables, ordered/unordered lists, blockquotes,
// horizontal rules, links, and italic-only lines (captions). Not a general
// CommonMark implementation — extend only when a real doc needs more.

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text) {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return out
}

function renderTable(lines) {
  const rows = lines.map(line =>
    line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
  )
  const header = rows[0]
  const body = rows.slice(2) // skip the |---|---| separator row
  let html = '<div class="md-table-wrap"><table class="md-table"><thead><tr>'
  html += header.map(cell => `<th>${renderInline(cell)}</th>`).join('')
  html += '</tr></thead><tbody>'
  for (const row of body) {
    html += '<tr>' + row.map(cell => `<td>${renderInline(cell)}</td>`).join('') + '</tr>'
  }
  html += '</tbody></table></div>'
  return html
}

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  let listBuffer = null // { type: 'ul'|'ol', items: [] }

  function flushList() {
    if (!listBuffer) return
    const tag = listBuffer.type
    out.push(`<${tag} class="md-list">` + listBuffer.items.map(li => `<li>${renderInline(li)}</li>`).join('') + `</${tag}>`)
    listBuffer = null
  }

  while (i < lines.length) {
    const line = lines[i]

    if (/^```/.test(line)) {
      const codeLines = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      flushList()
      out.push(`<pre class="md-code"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
      continue
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const tableLines = [line, lines[i + 1]]
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      flushList()
      out.push(renderTable(tableLines))
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      flushList()
      const level = heading[1].length
      out.push(`<h${level} class="md-h${level}">${renderInline(heading[2])}</h${level}>`)
      i++
      continue
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushList()
      out.push('<hr class="md-hr" />')
      i++
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      flushList()
      out.push(`<blockquote class="md-quote">${renderInline(quoteLines.join(' '))}</blockquote>`)
      continue
    }

    const ulItem = line.match(/^\s*[-*]\s+(.*)$/)
    const olItem = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ulItem || olItem) {
      const type = ulItem ? 'ul' : 'ol'
      const content = ulItem ? ulItem[1] : olItem[1]
      if (!listBuffer || listBuffer.type !== type) {
        flushList()
        listBuffer = { type, items: [] }
      }
      listBuffer.items.push(content)
      i++
      // Fold wrapped continuation lines (no marker, not blank, not a new block)
      // into the item just pushed - source markdown wraps long list items across
      // multiple plain lines rather than one long line.
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^\s*>\s?/.test(lines[i]) &&
        !/^\s*---+\s*$/.test(lines[i]) &&
        !/^\s*\|.*\|\s*$/.test(lines[i])
      ) {
        listBuffer.items[listBuffer.items.length - 1] += ' ' + lines[i].trim()
        i++
      }
      continue
    }

    if (/^\s*$/.test(line)) {
      flushList()
      i++
      continue
    }

    // Paragraph — accumulate until a blank line or a block-starting line.
    flushList()
    const paraLines = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !/^\s*\|.*\|\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    const text = paraLines.join(' ')
    if (/^\*[^*]+\*$/.test(text.trim())) {
      out.push(`<p class="md-caption">${renderInline(text.trim())}</p>`)
    } else {
      out.push(`<p>${renderInline(text)}</p>`)
    }
  }

  flushList()
  return out.join('\n')
}
