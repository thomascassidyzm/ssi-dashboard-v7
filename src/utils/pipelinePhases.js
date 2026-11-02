// Pure shaping of the pipeline phase rows CourseManager renders. Lifted from four
// byte-identical copies inside the view (job #146) so the rule lives once.

/**
 * The earliest phase, by number, that still has work: status 'pending' or 'partial'.
 * Never mutates the input. Returns undefined when every phase is done.
 */
export function nextIncompletePhase(phases) {
  return (phases || [])
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .sort((a, b) => a.number - b.number)[0]
}
