import { describe, it, expect } from 'vitest'
import { parsePod } from './pod-arg.cjs'

describe('parsePod', () => {
  it('defaults to pod-0 when no --pod flag is present', () => {
    expect(parsePod(['node', 'script.cjs', 'hrv_for_eng'])).toBe('pod-0')
  })

  it('reads an explicit --pod=pod-N flag', () => {
    expect(parsePod(['node', 'script.cjs', 'hrv_for_eng', '--pod=pod-1'])).toBe('pod-1')
  })

  it('is unaffected by other flags on the line', () => {
    expect(parsePod(['node', 'script.cjs', 'hrv_for_eng', '1,2,3', '--dry', '--pod=pod-2'])).toBe('pod-2')
  })

  it('honours a custom default', () => {
    expect(parsePod(['node', 'script.cjs'], 'pod-9')).toBe('pod-9')
  })
})
