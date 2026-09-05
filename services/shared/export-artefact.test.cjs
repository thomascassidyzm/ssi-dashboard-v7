import { describe, it, expect } from 'vitest'
const {
  requirePendingManifest,
  localArtefactStatus,
  respondArtefactAbsent,
  EXPORT_ARTEFACT_ABSENT
} = require('./export-artefact.cjs')

// The defect this file guards: course_export_states is SHARED, the manifest file is LOCAL.
// A row written on another workstation must never read as an available export here.

const fakeFs = (present) => ({
  existsSync: () => present,
  readJson: async () => ({ slices: [{ seeds: [] }] })
})

const fakeSupabase = (row) => ({
  from: () => ({
    select: () => ({
      eq: () => ({ single: async () => ({ data: row }) })
    })
  })
})

const OTHER_MACHINE_ROW = {
  course_code: 'eng_for_jpn',
  manifest_generated: true,
  generated_on_machine: 'Mac.broadband',
  pending_manifest_path: '/Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/temp/course_export_states/eng_for_jpn_pending_manifest.json'
}

describe('export artefact locator', () => {
  it('an export row from another machine produces a named error, not a silent miss', async () => {
    const err = await requirePendingManifest('eng_for_jpn', {
      supabase: fakeSupabase(OTHER_MACHINE_ROW),
      fs: fakeFs(false),
      baseDir: '/srv/popty/temp/course_export_states',
      hostname: 'watson-1'
    }).catch(e => e)

    expect(err.code).toBe(EXPORT_ARTEFACT_ABSENT)
    expect(err.machineMismatch).toBe(true)
    expect(err.generatedOnMachine).toBe('Mac.broadband')
    expect(err.thisMachine).toBe('watson-1')
    // The reader must be told WHICH machine made it and WHERE it was expected here.
    expect(err.message).toContain('Mac.broadband')
    expect(err.message).toContain('/srv/popty/temp/course_export_states/eng_for_jpn_pending_manifest.json')
    expect(err.message).toMatch(/DIFFERENT machine/)
  })

  it('a same-machine artefact that vanished says the file is gone, not that it is elsewhere', async () => {
    const err = await requirePendingManifest('eng_for_jpn', {
      supabase: fakeSupabase({ ...OTHER_MACHINE_ROW, generated_on_machine: 'watson-1' }),
      fs: fakeFs(false),
      hostname: 'watson-1'
    }).catch(e => e)

    expect(err.code).toBe(EXPORT_ARTEFACT_ABSENT)
    expect(err.machineMismatch).toBe(false)
    expect(err.message).toContain('THIS machine')
  })

  it('a row with no recorded machine says so rather than naming one', async () => {
    const err = await requirePendingManifest('eng_for_jpn', {
      supabase: fakeSupabase({ course_code: 'eng_for_jpn', manifest_generated: true }),
      fs: fakeFs(false),
      hostname: 'watson-1'
    }).catch(e => e)

    expect(err.generatedOnMachine).toBeNull()
    expect(err.message).toContain('predates hostname recording')
  })

  it('returns the manifest when the file really is on this disk', async () => {
    const located = await requirePendingManifest('eng_for_jpn', {
      supabase: fakeSupabase(OTHER_MACHINE_ROW),
      fs: fakeFs(true),
      hostname: 'watson-1'
    })
    expect(located.manifest.slices).toHaveLength(1)
  })

  it('export state reports the artefact as absent here when the DB claims success', () => {
    const status = localArtefactStatus(OTHER_MACHINE_ROW, { fs: fakeFs(false), hostname: 'watson-1' })
    expect(status.artefactAbsentHere).toBe(true)
    expect(status.pendingManifestPresentHere).toBe(false)
    expect(status.machineMismatch).toBe(true)
    expect(status.absenceReason).toContain('Mac.broadband')
  })

  it('export state stays quiet when the artefact is present here', () => {
    const status = localArtefactStatus(OTHER_MACHINE_ROW, { fs: fakeFs(true), hostname: 'watson-1' })
    expect(status.artefactAbsentHere).toBe(false)
    expect(status.absenceReason).toBeNull()
  })

  it('the HTTP shape is 409 with the machine named, never a bare 404', async () => {
    const err = await requirePendingManifest('eng_for_jpn', {
      supabase: fakeSupabase(OTHER_MACHINE_ROW),
      fs: fakeFs(false),
      hostname: 'watson-1'
    }).catch(e => e)

    let captured = null
    const res = { status (code) { captured = { code }; return this }, json (body) { captured.body = body; return this } }
    respondArtefactAbsent(res, err)

    expect(captured.code).toBe(409)
    expect(captured.body.code).toBe(EXPORT_ARTEFACT_ABSENT)
    expect(captured.body.generatedOnMachine).toBe('Mac.broadband')
    expect(captured.body.thisMachine).toBe('watson-1')
  })
})
