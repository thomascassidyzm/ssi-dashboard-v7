// unused-requires.cjs — finds require() bindings a CommonJS file never uses.
//
// Why a hand tokenizer and not a parser: the repo carries no JS parser as a
// direct dependency (acorn and @babel/parser are only transitive, and a lint
// that breaks when vite's tree changes is a lint nobody trusts). The three
// classic false results are handled explicitly:
//   - a name that appears only inside a string or comment is NOT a use
//     (strings and comments are stripped before counting; `${…}` inside a
//     template literal is kept, because that is code);
//   - a destructured require binds the LOCAL names (`{ a, b: c }` binds a, c);
//   - a bare `require('x')` with no binding is a side-effect import, not a
//     violation.
// Shadowing and regex literals make a name look used; that errs towards
// silence, never towards a false red.
//
// Consumed by services/unused-requires.test.cjs (the baseline that can only
// shrink). Run directly to list offenders: node services/shared/unused-requires.cjs [dir]
const fs = require('fs')
const path = require('path')

/** A `/` starts a regex literal when what precedes it cannot end an operand. */
function regexCanStart (emitted) {
  const m = emitted.match(/(\S)\s*$/)
  if (!m) return true
  if (/[(,=:[!&|?{};+\-*%<>~^]/.test(m[1])) return true
  return /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|new|delete|void|throw)\s*$/.test(emitted)
}

/** Source with comments and string contents removed; `${…}` bodies kept. */
function stripStringsAndComments (src) {
  let out = ''
  let i = 0
  const n = src.length
  if (src.startsWith('#!')) { i = src.indexOf('\n'); if (i < 0) return ''; }
  // Stack of template-literal nesting: each entry is the brace depth at which
  // the current `${` expression closes.
  const tpl = []
  let braceDepth = 0
  while (i < n) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue }
    if (c === '/' && regexCanStart(out)) {
      // Regex literal: its quotes and backticks are not string delimiters.
      let j = i + 1; let inClass = false
      while (j < n && src[j] !== '\n' && (inClass || src[j] !== '/')) {
        if (src[j] === '\\') j++
        else if (src[j] === '[') inClass = true
        else if (src[j] === ']') inClass = false
        j++
      }
      out += '//'; i = j + 1; continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++ }
      out += c + c; i = j + 1; continue
    }
    if (c === '`') {
      // Consume the literal up to its end or the first `${`.
      let j = i + 1
      while (j < n && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) { if (src[j] === '\\') j++; j++ }
      if (src[j] === '$') { tpl.push(braceDepth); braceDepth++; out += '`` ${'; i = j + 2 } else { out += '``'; i = j + 1 }
      continue
    }
    if (c === '{') { braceDepth++; out += c; i++; continue }
    if (c === '}') {
      if (tpl.length && braceDepth - 1 === tpl[tpl.length - 1]) {
        // End of a `${…}`: resume the template literal's string part.
        braceDepth--; tpl.pop(); out += '}'
        let j = i + 1
        while (j < n && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) { if (src[j] === '\\') j++; j++ }
        if (src[j] === '$') { tpl.push(braceDepth); braceDepth++; out += '`` ${'; i = j + 2 } else { out += '``'; i = j + 1 }
        continue
      }
      braceDepth--; out += c; i++; continue
    }
    out += c; i++
  }
  return out
}

const DECL = /(?:^|[;\n{}])\s*(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*=\s*require\s*\(/g

function boundNames (pattern) {
  if (pattern[0] === '{' || pattern[0] === '[') {
    return pattern.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/(?:^\.\.\.\s*)?([A-Za-z_$][\w$]*)\s*$/)   // `b: c` binds c; `...rest` binds rest
      return m ? m[1] : null
    }).filter(Boolean)
  }
  return [pattern]
}

/** Names bound by require() in `src` that are never referenced afterwards. */
function unusedRequires (src) {
  const code = stripStringsAndComments(src)
  const decls = []
  let m
  while ((m = DECL.exec(code))) decls.push({ start: m.index, end: DECL.lastIndex, names: boundNames(m[1]) })
  if (!decls.length) return []
  // Blank out every declaration so the binding site itself never counts as a use.
  let rest = code
  for (const d of decls) rest = rest.slice(0, d.start) + ' '.repeat(d.end - d.start) + rest.slice(d.end)
  const unused = []
  for (const d of decls) {
    for (const name of d.names) {
      // `obj.name` is a property, not a use; `...name` (spread) is a use.
      const re = new RegExp(`(?<![\\w$])(?<!(?:^|[^.])\\.)${name.replace(/\$/g, '\\$')}(?![\\w$])`)
      if (!re.test(rest)) unused.push(name)
    }
  }
  return unused
}

const SKIP_DIRS = new Set(['node_modules', 'deprecated', 'archive', '__tests__'])

function listServiceFiles (root) {
  const files = []
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      if (fs.statSync(full).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(full); continue }
      if (name.endsWith('.cjs') && !name.endsWith('.test.cjs')) files.push(full)
    }
  }
  walk(root)
  return files.sort()
}

/** { 'relative/file.cjs': ['name', …] } for every offending file under root. */
function scan (root) {
  const result = {}
  for (const file of listServiceFiles(root)) {
    const names = unusedRequires(fs.readFileSync(file, 'utf8'))
    if (names.length) result[path.relative(root, file)] = names
  }
  return result
}

module.exports = { stripStringsAndComments, unusedRequires, scan, listServiceFiles }

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..'))
  const r = scan(root)
  console.log(JSON.stringify(r, null, 2))
  console.error(`${Object.keys(r).length} files, ${Object.values(r).flat().length} unused names`)
}
