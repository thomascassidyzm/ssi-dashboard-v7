import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { allowedRoles, CHARLOTTE, TOM_006 } = createRequire(import.meta.url)('./charlotte-backfill.cjs')

describe('charlotte-backfill never puts Charlotte on an X_for_eng known slot (job #52)', () => {
  it('drops the known role from any Charlotte pass on an X_for_eng course', () => {
    for (const c of ['ita_for_eng', 'ara_for_eng', 'cym_for_eng']) expect(allowedRoles(c, ['known', 'presentation'], CHARLOTTE)).toEqual(['presentation'])
  })
  it('keeps known for a Tom-006 (male) pass, and leaves eng_for_X alone', () => {
    expect(allowedRoles('ita_for_eng', ['known'], TOM_006)).toEqual(['known'])
    expect(allowedRoles('eng_for_hin', ['known', 'target2'], CHARLOTTE)).toEqual(['known', 'target2'])
  })
})
