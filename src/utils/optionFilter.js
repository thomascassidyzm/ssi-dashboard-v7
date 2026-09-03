/**
 * Option normalisation + filtering for FilterSelect.
 *
 * Pure module: no Vue, no DOM. Two jobs:
 *  1. turn whatever a call site passes (strings, `{value,label}`, optgroups)
 *     into one canonical shape, so the component has a single code path;
 *  2. filter that list against what the user typed.
 *
 * The matching is `searchCourses` — the ranked, tokenised, fuzzy matcher the
 * course pickers already use. Reused rather than re-implemented so a dropdown
 * of course codes behaves identically wherever it appears, and so `fra_for_eng`
 * (which Tom types) matches on the VALUE as well as the visible label.
 */

import { searchCourses } from './courseSearch'

/** One option: `{ value, label, hint, disabled }`. */
export function normaliseOption(raw) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { value: raw, label: String(raw), hint: '', disabled: false }
  }
  const value = 'value' in raw ? raw.value : raw.code
  const label = raw.label ?? raw.name ?? (value === null || value === undefined ? '' : String(value))
  return {
    value: value === undefined ? '' : value,
    label: String(label),
    hint: raw.hint === undefined || raw.hint === null ? '' : String(raw.hint),
    disabled: Boolean(raw.disabled),
  }
}

/**
 * Groups: `[{ label, options: [...] }]`. A flat list becomes one unlabelled
 * group, so grouped and ungrouped call sites render through the same loop.
 */
export function normaliseOptions(raw) {
  const list = Array.isArray(raw) ? raw : []
  const groups = []
  let current = null

  for (const item of list) {
    if (item && typeof item === 'object' && Array.isArray(item.options)) {
      groups.push({
        label: item.label ? String(item.label) : '',
        options: item.options.map(normaliseOption).filter(Boolean),
      })
      current = null
      continue
    }
    const option = normaliseOption(item)
    if (!option) continue
    if (!current) {
      current = { label: '', options: [] }
      groups.push(current)
    }
    current.options.push(option)
  }

  return groups
}

/**
 * Filter already-normalised options by query. Empty query = everything, in the
 * order given (a dropdown must not reshuffle itself just because it opened).
 */
export function filterOptions(query, options) {
  const list = Array.isArray(options) ? options : []
  if (!query || !String(query).trim()) return list

  // `searchCourses` scores `{ code, name }`; an option's value is its code and
  // its label its name, which is exactly the same shape of problem.
  const asCourses = list.map((option, index) => ({
    code: option.value === null || option.value === undefined ? '' : String(option.value),
    name: option.label,
    __index: index,
  }))

  return searchCourses(query, asCourses).map((c) => list[c.__index])
}

export default filterOptions
