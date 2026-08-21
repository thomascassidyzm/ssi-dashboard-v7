import { describe, it, expect } from 'vitest'
const { reconcileFlags, resolveKeyFor } = require('./flag-resolution.cjs');

function phrase(id, seed, known, target) {
  return { id, seed_number: seed, lego_index: 1, position: 1, known_text: known, target_text: target };
}
function course() {
  return {
    phrases: [
      phrase('c:S0054L02U06', 54, 'I want to give something to her friend', 'mä haluun antaa jotain kaverillensa'),
      phrase('c:S0054L02U07', 54, 'I want to give something to him', 'mä haluun antaa jotain sille'),
      phrase('c:S0105L02B05', 105, "he didn't know her name", 'se ei tiennyt sen nimeä'),
    ],
    seeds: [{ seed_number: 54, approved_at: '2026-07-21T00:00:45.377+00:00' }, { seed_number: 105, approved_at: null }],
  };
}
function flagged(data, id, note) {
  return {
    course: 'c',
    decisions: {
      'c:S0054L02U07': { status: 'ok', note: '', at: '2026-08-18T09:00:00.000Z' },
      [id]: { status: 'flagged', note, at: '2026-08-18T09:14:33.735Z', resolve: resolveKeyFor(data.phrases, id) },
    },
  };
}

describe('a flag closes itself when its row is fixed', () => {
  it('stays open while nothing has been done about it', () => {
    const data = course();
    const progress = flagged(data, 'c:S0054L02U06', 'reads a bit awkward.');
    const { closed } = reconcileFlags(data, progress);
    expect(closed).toEqual([]);
    expect(progress.decisions['c:S0054L02U06'].status).toBe('flagged');
  });

  it('closes when the row itself is edited', () => {
    const data = course();
    const progress = flagged(data, 'c:S0054L02U06', 'reads a bit awkward.');
    data.phrases[0].target_text = 'mä haluun antaa jotain sen kaverille';
    const { closed } = reconcileFlags(data, progress);
    expect(closed).toHaveLength(1);
    expect(closed[0].reason).toBe('the row was edited');
    expect(closed[0].seedNumber).toBe(54);
  });

  it('closes when the row is deleted rather than edited', () => {
    const data = course();
    const progress = flagged(data, 'c:S0054L02U06', 'pull this one');
    data.phrases = data.phrases.filter((p) => p.id !== 'c:S0054L02U06');
    const { closed } = reconcileFlags(data, progress);
    expect(closed).toHaveLength(1);
    expect(closed[0].reason).toBe('the row was removed from the course');
  });

  it('closes when the fix was phrases ADDED to its seed, leaving the row untouched', () => {
    const data = course();
    const progress = flagged(data, 'c:S0105L02B05', 'we could also add some "she didn\'t know"s');
    data.phrases.push(phrase('c:S0105L02B06', 105, "she didn't know his name", 'se ei tiennyt sen nimeä'));
    const { closed } = reconcileFlags(data, progress);
    expect(closed).toHaveLength(1);
    expect(closed[0].reason).toBe('the seed it sits in changed');
  });

  it('leaves the row UNCHECKED, never ok, and keeps the note for the reviewer', () => {
    const data = course();
    const progress = flagged(data, 'c:S0054L02U06', 'reads a bit awkward.');
    data.phrases[0].target_text = 'fixed';
    reconcileFlags(data, progress);
    expect(progress.decisions['c:S0054L02U06']).toBeUndefined();
    expect(progress.resolvedFlags['c:S0054L02U06'].note).toBe('reads a bit awkward.');
  });

  it('does not touch ok decisions, or flags in other seeds', () => {
    const data = course();
    const progress = flagged(data, 'c:S0105L02B05', 'note');
    data.phrases[0].target_text = 'an edit in seed 54, nothing to do with this flag';
    const { closed } = reconcileFlags(data, progress);
    expect(closed).toEqual([]);
    expect(progress.decisions['c:S0054L02U07'].status).toBe('ok');
  });

  it('adopts what an older flag was left on, and does not close it on that read', () => {
    const data = course();
    const progress = flagged(data, 'c:S0054L02U06', 'older flag');
    delete progress.decisions['c:S0054L02U06'].resolve;
    const first = reconcileFlags(data, progress);
    expect(first.closed).toEqual([]);
    expect(first.adopted).toEqual(['c:S0054L02U06']);
    data.phrases[0].known_text = 'I want to give something to his friend';
    const second = reconcileFlags(data, progress);
    expect(second.closed).toHaveLength(1);
  });

  it('closes an older flag whose row is already gone, having nothing to compare', () => {
    const data = course();
    const progress = flagged(data, 'c:S0054L02U06', 'older flag');
    delete progress.decisions['c:S0054L02U06'].resolve;
    data.phrases = data.phrases.filter((p) => p.id !== 'c:S0054L02U06');
    const { closed } = reconcileFlags(data, progress);
    expect(closed).toHaveLength(1);
    expect(closed[0].reason).toBe('the row was removed from the course');
  });
});
