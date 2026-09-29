import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { fixGata } = createRequire(import.meta.url)('./gender-expansion-rowless-fixes-2026-09-29.cjs')
describe('Romanian gata is invariable', () => {
  it('turns gată and gat into gata, leaves gata and other words alone', () => {
    expect(fixGata('nu sunt gată')).toBe('nu sunt gata');
    expect(fixGata('nu eram gat când am vorbit')).toBe('nu eram gata când am vorbit');
    expect(fixGata('sunt gata, deja gătit')).toBe('sunt gata, deja gătit');
    expect(fixGata(null)).toBe(null);
  });
});
