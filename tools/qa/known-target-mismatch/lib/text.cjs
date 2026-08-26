function norm(s) {
  return (s || '').toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[¿¡]/g, ' ')
    .replace(/[.,!?;:"“”()\-–—]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function tokens(s) { return norm(s).split(' ').filter(Boolean); }
function terminal(s) {
  const t = (s || '').trim();
  const m = t.match(/[.?!]+$/);
  return m ? m[0][m[0].length - 1] : '';
}
module.exports = { norm, tokens, terminal };
