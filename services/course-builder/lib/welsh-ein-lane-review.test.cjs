import { it, expect } from 'vitest'

const { welshContainsLego } = require('./welsh-mutation.cjs');
const { checkVocabViolations } = require('./validation.cjs');
const course = 'cym_sv2_for_eng';

it('recognises ein rhai ni when ni also carries the following yn contraction', () => {
  expect(welshContainsLego(course, 'ein rhai ni', 'ma’n rhai ni’n moyn trafod popeth')).toBe(true);
});

it('retains recognised ein in the taught-word fallback without requiring yn', () => {
  expect(checkVocabViolations(
    [{ target: 'ma’n rhai ni' }], new Set(['ma fe', 'ein rhai ni']), course
  )).toEqual([]);
});
