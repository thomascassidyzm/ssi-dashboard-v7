// Drift guard for the language-cast write-back (Tom's ruling, 2026-08-29:
// "the Voice Lab cast doesn't write back to Poppy's Phase 8 generate audio").
//
// The derivation exists — services/shared/language-voice-cast.cjs, reached via
// voiceConfigService.resolveVoiceConfig(). What did not exist was anything that
// notices when a NEW render seam quietly stops using it. A list written once is
// a list that rots the first time somebody adds a handler, so this test does not
// compare the manifest with a copy of itself: it RE-DERIVES, by scanning the
// render-path sources, every scope that reads a raw courses.voice_config, and
// fails when the derived set and the manifest disagree in either direction.
//
// The scan unit is a SCOPE — a route declaration or a top-level function — not
// a line, because line numbers in an 8,700-line file rot on the next edit.
// A scope that contains a resolveVoiceConfig()/loadVoiceConfig() call is
// RESOLVED and needs no manifest entry; that is the whole point of the rule.

import { describe, it, expect } from 'vitest'

const fs = require('fs');
const path = require('path');

const {
  RENDER_PATH_FILES, DISPOSITIONS, RAW_READ_SURFACES, findRawReadSurface,
} = require('./voice-resolution-surfaces.cjs');
const {
  CAST_ROLES, EXCLUDED_ROLES, exclusionReason, slotForRole, isSingleVoiceSlot,
} = require('./language-voice-cast.cjs');

const REPO = path.resolve(__dirname, '../..');

// A read of the course's own stored voice block. `.voice_config` catches
// `course.voice_config`, `data?.voice_config` and `(row || {}).voice_config`;
// the second alternative catches the SELECT that fetches it in the first place,
// which is what makes a new handler visible before it has even used the value.
const RAW_READ = /\.voice_config\b|\.select\(\s*['"`][^'"`]*voice_config/;
const RESOLVES = /resolveVoiceConfig\s*\(|loadVoiceConfig\s*\(/;
const ROUTE = /^(?:app|router)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)/;
const FUNC = /^(?:async\s+)?function\s+(\w+)/;
const COMMENT = /^\s*(?:\*|\/\/|\/\*)/;

/** Split one file into scopes, each recording its raw reads and its resolutions. */
function scopesOf(file) {
  const lines = fs.readFileSync(path.join(REPO, file), 'utf8').split('\n');
  const out = [];
  let cur = { file, name: '<module>', raw: [], resolve: [], code: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const route = ROUTE.exec(line);
    const fn = route ? null : FUNC.exec(line);
    if (route || fn) {
      out.push(cur);
      cur = { file, name: route ? `${route[1].toUpperCase()} ${route[2]}` : `${fn[1]}()`, raw: [], resolve: [], code: [] };
    }
    // A COMMENT IS NOT A CALL. The scope body used to include them, and the
    // line "// Thin wrapper around getAudioNeeds()" above /needs made this test
    // report a three-line stub as an unresolved caller.
    if (COMMENT.test(line)) continue;
    cur.code.push(line);
    if (RESOLVES.test(line)) cur.resolve.push(i + 1);
    else if (RAW_READ.test(line)) cur.raw.push(i + 1);
  }
  out.push(cur);
  return out;
}

const ALL_SCOPES = RENDER_PATH_FILES.flatMap(scopesOf);
const RAW_SCOPES = ALL_SCOPES.filter(s => s.raw.length && !s.resolve.length);
const RESOLVED_SCOPES = ALL_SCOPES.filter(s => s.resolve.length);

describe('voice-resolution surface manifest', () => {
  it('the scanner still finds render seams to check', () => {
    // If a refactor renames the column or moves the files, this drops to zero
    // and every other assertion below passes vacuously. Fail loudly instead.
    expect(RESOLVED_SCOPES.length).toBeGreaterThan(8);
    expect(RAW_SCOPES.length).toBeGreaterThan(5);
  });

  it('every raw voice_config read on the render path is accounted for', () => {
    const unlisted = RAW_SCOPES
      .filter(s => !findRawReadSurface(s.file, s.name))
      .map(s => `${s.file} :: ${s.name}  (reads voice_config at line ${s.raw.join(', ')})`);

    expect(unlisted, 'These scopes read a raw courses.voice_config and never call '
      + 'resolveVoiceConfig(), so a voice cast in the Voice Lab would not reach them. '
      + 'Either resolve at the fetch (see POST /generate/:courseCode in '
      + 'phase8-audio-v13.cjs for the shape), or add the scope to '
      + 'services/shared/voice-resolution-surfaces.cjs with the reason it does not '
      + 'need to be:\n' + unlisted.join('\n')).toEqual([]);
  });

  it('every manifest entry still names a real unresolved scope', () => {
    const live = new Set(RAW_SCOPES.map(s => `${s.file} :: ${s.name}`));
    const stale = RAW_READ_SURFACES
      .map(s => `${s.file} :: ${s.scope}`)
      .filter(k => !live.has(k));

    expect(stale, 'Manifest entries that no longer read a raw voice_config — the scope '
      + 'was renamed, deleted, or now resolves. Delete the entry so the list keeps '
      + 'meaning what it says:\n' + stale.join('\n')).toEqual([]);
  });

  it('every manifest entry carries a known disposition and a reason', () => {
    const bad = RAW_READ_SURFACES
      .filter(s => !DISPOSITIONS[s.disposition] || !s.note || s.note.length < 20)
      .map(s => `${s.file} :: ${s.scope} (disposition=${s.disposition})`);
    expect(bad, 'A disposition must be one of ' + Object.keys(DISPOSITIONS).join(', ')
      + ' and must come with a note saying why:\n' + bad.join('\n')).toEqual([]);
  });

  // The 'caller-resolved' disposition is the one that can lie: it claims a
  // helper is safe because of somebody ELSE's code. Where the manifest names
  // the function callers come through, hold that claim to the sources.
  it('a caller-resolved helper really is only reached from resolved scopes', () => {
    const claims = RAW_READ_SURFACES.filter(s => s.callersOf);
    expect(claims.length).toBeGreaterThan(0);

    const unresolvedCallers = [];
    for (const claim of claims) {
      const call = new RegExp(`\\b(?:await\\s+)?${claim.callersOf}\\s*\\(`);
      for (const scope of ALL_SCOPES) {
        if (scope.file !== claim.file) continue;
        if (scope.name === `${claim.callersOf}()`) continue;  // the definition
        if (!call.test(scope.code.join('\n'))) continue;
        if (scope.resolve.length) continue;
        unresolvedCallers.push(`${scope.file} :: ${scope.name} calls ${claim.callersOf}() `
          + 'but never resolves the voice config it hands over');
      }
    }
    expect(unresolvedCallers, 'A caller-resolved helper is only as good as its callers:\n'
      + unresolvedCallers.join('\n')).toEqual([]);
  });

  // ── The exclusion, stated rather than inferred ───────────────────────────
  describe('role coverage', () => {
    const svc = require('../voice-config-service.cjs');
    const configRoles = Object.keys(svc.DEFAULT_VOICE_CONFIG.voices);

    it('every role a voice_config can carry is either cast or explicitly excluded', () => {
      const undecided = configRoles.filter(r => !CAST_ROLES.includes(r) && !exclusionReason(r));
      expect(undecided, 'A role in DEFAULT_VOICE_CONFIG.voices that is neither in '
        + 'CAST_ROLES nor in EXCLUDED_ROLES has had no decision made about it — it is '
        + 'excluded from the language cast by accident. Put it on one side or the other '
        + 'in services/shared/language-voice-cast.cjs:\n' + undecided.join(', ')).toEqual([]);
    });

    // FLIPPED ON 2026-09-10, deliberately. This asserted the opposite for as
    // long as `presentation` sat outside the cast, and the exclusion note said
    // out loud that "one word from him moves it into CAST_ROLES". Tom said the
    // word. What the estate needs asserted now is the other half of the same
    // safety property: the role is cast, and the ENGLISH cast row exists, so
    // "obey the table" cannot mean "lose Tom's clone".
    it('presentation is CAST, against the known language, in its own slot', () => {
      expect(CAST_ROLES).toContain('presentation');
      expect(exclusionReason('presentation')).toBeNull();
      expect(slotForRole('presentation')).toBe('presentation');
      expect(isSingleVoiceSlot('presentation')).toBe(true);
    });

    it('a role is never both cast and excluded', () => {
      const both = CAST_ROLES.filter(r => Object.prototype.hasOwnProperty.call(EXCLUDED_ROLES, r));
      expect(both).toEqual([]);
    });
  });
});
