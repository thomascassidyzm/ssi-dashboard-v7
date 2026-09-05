// The two course-code grammars must agree, or a route silently stops being
// protected (Popty finding P4, 2026-09-05).
//
// Course routes are gated by app.param('courseCode') in production-api.cjs,
// which applies NO grammar: whatever is in the path position is the course, and
// it is checked against the caller's course list. The wildcard course-builder
// proxies (/api/build/*, /api/v2/*, …) never fire that param, so they recover
// the course with courseCodeFromRequest(). If that recogniser does not know a
// course code, extractProxyCourseCode returns null, requireProxyCourseAccess
// skips its per-course check, and an authenticated editor scoped to one course
// can drive the course-builder for a course they hold no access to. Nothing
// errors. Nothing logs. Every test passes.
//
// That is not hypothetical: the recogniser was /^[a-z]{2,4}_for_[a-z]{2,4}$/,
// which misses all 26 live courses carrying a variant suffix.
//
// So this test asserts the property that actually matters: for every course
// code the system really has, the proxy recogniser extracts the same string the
// param gate would have been handed.
//
// LIVE_COURSE_CODES is a census of `select course_code from courses where
// course_code like '%\_for\_%'` taken 2026-09-05 (148 rows). It is a fixture,
// not a live query — a unit test must not need the database. Add codes here
// when a new SHAPE appears; a new course in an existing shape needs nothing.

import { describe, it, expect } from 'vitest'

const { COURSE_CODE_RE, isCourseCode, courseCodeFromRequest } = require('./course-code-grammar.cjs')
const { COURSE_CODE_RE: WRITE_SURFACES_RE, courseCodeFrom } = require('./content-write-surfaces.cjs')

const LIVE_COURSE_CODES = [
  'afr_for_eng', 'ara_eg_for_eng', 'ara_eg_for_jpn', 'ara_eg_for_zho',
  'ara_for_cym', 'ara_for_eng', 'ara_for_jpn', 'ara_for_zho',
  'ara_lb_for_eng', 'ara_sy_for_eng', 'ara_sy_for_jpn', 'ara_sy_for_zho',
  'ben_for_eng', 'bre_for_eng', 'bre_for_fra', 'bul_for_eng',
  'cat_for_eng', 'cat_for_spa', 'ceb_for_eng', 'ces_for_eng',
  'cor_for_eng', 'cym_anthem_for_jpn', 'cym_for_yor', 'cym_n_for_eng',
  'cym_nnew_for_eng', 'cym_s_for_eng', 'dan_for_eng', 'deu_at_for_eng',
  'deu_at_for_jpn', 'deu_at_for_zho', 'deu_ch_for_eng', 'deu_for_cym',
  'deu_for_eng', 'deu_for_jpn', 'deu_for_zho', 'ell_for_eng',
  'eng_for_ara', 'eng_for_ben', 'eng_for_deu', 'eng_for_fra',
  'eng_for_guj', 'eng_for_hin', 'eng_for_ita', 'eng_for_jpn',
  'eng_for_kan', 'eng_for_kor', 'eng_for_mar', 'eng_for_pan',
  'eng_for_por', 'eng_for_sin', 'eng_for_spa', 'eng_for_tam',
  'eng_for_tel', 'eng_for_urd', 'eng_for_zho', 'est_for_eng',
  'eus_for_eng', 'eus_for_spa', 'fas_for_eng', 'fin_for_eng',
  'fra_ca_for_eng', 'fra_for_cym', 'fra_for_eng', 'fra_for_jpn',
  'fra_for_zho', 'fur_for_eng', 'gla_for_eng', 'gle_cn_for_eng',
  'gle_for_eng', 'gle_mu_for_eng', 'gle_ul_for_eng', 'glg_for_eng',
  'hak_for_eng', 'heb_for_eng', 'hin_for_eng', 'hrv_for_eng',
  'hun_for_eng', 'hye_for_eng', 'ind_for_eng', 'isl_for_eng',
  'ita_for_cym', 'ita_for_eng', 'ita_for_jpn', 'ita_for_zho',
  'jpn_for_cym', 'jpn_for_eng', 'jpn_for_zho', 'kan_for_eng',
  'kor_for_cym', 'kor_for_eng', 'kor_for_hin', 'kor_for_jpn',
  'kor_for_tam', 'kor_for_zho', 'lav_for_eng', 'lit_for_eng',
  'lmo_for_eng', 'mar_for_eng', 'mkd_for_eng', 'mlt_for_eng',
  'nan_for_eng', 'nap_for_eng', 'nep_for_eng', 'nld_for_eng',
  'nor_for_eng', 'pdc_for_eng', 'pol_for_eng', 'por_br_for_eng',
  'por_br_for_jpn', 'por_br_for_zho', 'por_for_aze', 'por_for_cym',
  'por_for_eng', 'por_for_jpn', 'por_for_lit', 'por_for_zho',
  'rgn_for_eng', 'roh_for_eng', 'ron_for_eng', 'rus_for_eng',
  'sbx_for_eng', 'scn_for_eng', 'sme_for_eng', 'spa_for_cym',
  'spa_for_eng', 'spa_for_jpn', 'spa_for_zho', 'spa_mx_for_eng',
  'spa_mx_for_jpn', 'spa_mx_for_zho', 'srp_for_eng', 'swa_for_eng',
  'swe_for_eng', 'tel_for_eng', 'tha_for_eng', 'tur_for_eng',
  'ukr_for_eng', 'vec_for_eng', 'yid_for_eng', 'yor_for_eng',
  'yue_for_eng', 'zho_for_cym', 'zho_for_eng', 'zho_for_gle',
  'zho_for_hin', 'zho_for_jpn', 'zho_for_tam', 'zzz_test2_for_eng',
]

describe('course-code grammar', () => {
  it('recognises every live course code', () => {
    const unrecognised = LIVE_COURSE_CODES.filter(code => !isCourseCode(code))
    expect(unrecognised).toEqual([])
  })

  it('covers the suffixed shapes the old narrow grammar missed', () => {
    const OLD_NARROW = /^[a-z]{2,4}_for_[a-z]{2,4}$/
    const suffixed = LIVE_COURSE_CODES.filter(code => !OLD_NARROW.test(code))
    // If this ever drops to zero the regression is invisible again — the point
    // of the census is that these shapes exist and are protected.
    expect(suffixed.length).toBeGreaterThan(20)
    for (const code of suffixed) expect(isCourseCode(code)).toBe(true)
  })

  it('extracts from a proxied path exactly what the courseCode param gate sees', () => {
    // The three real positions :courseCode sits in on the proxied mounts.
    const shapes = [
      code => `/api/build/rebuild/${code}`,
      code => `/api/v2/phrases/${code}`,
      code => `/api/course/${code}/edit-cascade`,
    ]
    for (const code of LIVE_COURSE_CODES) {
      for (const shape of shapes) {
        expect(courseCodeFromRequest({ path: shape(code) })).toBe(code)
      }
    }
  })

  it('extracts a course named only in the body', () => {
    expect(courseCodeFromRequest({ path: '/api/seed/complete', body: { course_code: 'fra_ca_for_eng' } }))
      .toBe('fra_ca_for_eng')
    expect(courseCodeFromRequest({ path: '/api/seed/complete', body: { courseCode: 'cym_n_for_eng' } }))
      .toBe('cym_n_for_eng')
  })

  it('is the SAME grammar the editor-identity attribution uses', () => {
    // Not "an equivalent copy" — the same object. A copy is what diverged.
    expect(WRITE_SURFACES_RE).toBe(COURSE_CODE_RE)
    for (const code of LIVE_COURSE_CODES) {
      expect(courseCodeFrom({}, `/api/build/rebuild/${code}`, null)).toBe(code)
    }
  })

  it('does not mistake ordinary path segments for a course', () => {
    const notCourses = [
      'api', 'build', 'v2', 'phrases', 'seed', 'complete', 'production',
      'edit-cascade', 'phrases_for_review', 'ready_for_audio', 'for', '_for_',
      'FRA_for_ENG', 'fra_for_eng/', '',
    ]
    for (const seg of notCourses) expect(isCourseCode(seg)).toBe(false)
    expect(courseCodeFromRequest({ path: '/api/build/status' })).toBe(null)
    expect(courseCodeFromRequest({ path: '/api/build/start', body: { course_code: 'not a course' } })).toBe(null)
  })

  // PINNED DISAGREEMENT, not a bug being fixed here.
  //
  // `eng_template` is a live row in `courses` with no `_for_` in it. The param
  // gate would happily scope it (it applies no grammar); no shape-based
  // recogniser can match it without also matching arbitrary path segments like
  // 'edit-cascade', which would scope requests to a course that does not exist.
  // It is a template row, not a buildable course, so the proxy treats a request
  // naming it as unscoped — auth still required, per-course check skipped.
  // If a template ever becomes something an editor is scoped to, this is the
  // line that has to change.
  it('does not recognise the non-course template row', () => {
    expect(isCourseCode('eng_template')).toBe(false)
  })
})
