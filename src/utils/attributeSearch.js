/**
 * Attribute search — the filter behind SearchSelect.
 *
 * Pure module: no Vue, no DOM. Takes a query and a list of items carrying a
 * `haystack` string, returns the ones that match. Extracted rather than left in
 * the component so the one rule that matters can be tested — see the male/female
 * case below, which is how the rule got its shape.
 *
 * Tom, 2026-08-31, of the Voice Lab's voice picker: "these long lists are
 * impenetrable as drop downs… this could search for any parameters/variables
 * like gender/accent etc." So the haystack is everything the caller knows about
 * the item — name, gender, accent, country, provider, the vendor's own
 * description — and every whitespace-separated term has to match somewhere.
 */

/** Case- and diacritic-insensitive, so "elodie" finds "Élodie". */
export function fold (s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * A term matches where a WORD STARTS, never mid-word. Partial words still work
 * — "scot" finds "scottish", "brit" finds "british", "cart" finds "cartesia" —
 * but "male" stops matching "female", which it did: "australian male" returned
 * 29 Australian voices of both genders. Word-start is the smallest rule that
 * keeps the forgiveness and loses that collision.
 */
export function termPatterns (query) {
  return fold(query).split(/\s+/).filter(Boolean).map((t) => new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u'))
}

/** Every term must match somewhere in the item's haystack. */
export function filterByAttributes (options, query) {
  const terms = termPatterns(query)
  if (!terms.length) return options
  return options.filter((o) => {
    const hay = ` ${fold(o.haystack || o.label)}`
    return terms.every((re) => re.test(hay))
  })
}
