// Seed 128's lowercase-i lines (job #900·H, Kai 2026-09-23). Seen to fail with the regex's
// lookahead removed (it then capitalised "if" and "it") and to pass as written.
import { describe, it, expect } from 'vitest';
const { capitaliseLeadingI } = require('./eng-for-hin-seed-128-capital-i-2026-09-23.cjs');

describe('capitaliseLeadingI', () => {
  it('capitalises the pronoun at the start of a line', () => {
    expect(capitaliseLeadingI("i think you're like me")).toBe("I think you're like me");
    expect(capitaliseLeadingI("i'm not sure if i want to meet someone")).toBe("I'm not sure if I want to meet someone");
    expect(capitaliseLeadingI('someone i used to know')).toBe('someone I used to know');
    expect(capitaliseLeadingI('do i?')).toBe('do I?');
    expect(capitaliseLeadingI('i used to know')).toBe('I used to know');
  });
  it('leaves other words and already-correct lines alone', () => {
    for (const t of ['if you like', 'it is', 'in the room', "I'm ready", 'I think', 'we need to change his name', 'a hindi word', 'ski in it', '']) expect(capitaliseLeadingI(t)).toBe(t);
  });
});
