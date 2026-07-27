// mdlite — the pack's markdown-lite renderer: paragraphs, **bold**, `code`.
// Pack content is compiled repo data, but escape anyway so the renderer never
// trusts input (same stance as HowThisWorks.vue).
export function mdlite(text) {
  if (!text) return ''
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p>${p
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, ' ')}</p>`)
    .join('')
}
