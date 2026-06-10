/**
 * pod-generation-prompt.cjs — the production pod-generation prompt + renderer.
 *
 * The prompt itself lives in services/pod-generation-prompt.txt (version
 * controlled, editable). It was designed + validated by the
 * `pod-generation-prompt-design` workflow (native-scriptwriter approach,
 * winner 4.67/5; grafted register-discipline + item-fidelity + slip patches).
 *
 * renderPrompt() fills the {{PLACEHOLDERS}} for one scene.
 */

const fs = require('fs')
const path = require('path')

const PROMPT = fs.readFileSync(path.join(__dirname, 'pod-generation-prompt.txt'), 'utf8')

/**
 * @param {object} a
 * @param {string} a.targetLanguage  e.g. "Finnish"
 * @param {string} a.knownLanguage   e.g. "English"
 * @param {string} a.cultureNotes    the per-target-culture notes blob
 * @param {string} a.sceneTitle      e.g. "Coffee Shop"
 * @param {Array<{global_order:number, speaker:string, english_text:string}>} a.lines
 * @returns {string} the filled prompt to send to claude --print
 */
function renderPrompt({ targetLanguage, knownLanguage, cultureNotes, sceneTitle, lines, ledger }) {
  // Canon v2 placeholder: "[target language]" → the language's English name
  // (deterministic; the model then renders it natively in target_text and the
  // ledger pins the one self-name). Local substitution only — never mutate the
  // line objects, sceneHash is computed on the canonical english_text.
  const linesBlock = lines
    .map(l => `${l.global_order}. [${l.speaker || 'Speaker'}] ${String(l.english_text).replace(/\[target language\]/gi, targetLanguage)}`)
    .join('\n')
  return PROMPT
    .replace(/\{\{TARGET_LANGUAGE\}\}/g, targetLanguage)
    .replace(/\{\{KNOWN_LANGUAGE\}\}/g, knownLanguage)
    .replace(/\{\{CULTURE_NOTES\}\}/g, cultureNotes)
    .replace(/\{\{SCENE_TITLE\}\}/g, sceneTitle)
    .replace(/\{\{LINES\}\}/g, linesBlock)
    .replace(/\{\{LEDGER\}\}/g, ledger || '(none for this pod)')
}

module.exports = { PROMPT, renderPrompt }
