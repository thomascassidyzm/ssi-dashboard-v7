#!/usr/bin/env python3
"""Build Steve's custom Senedd/S4C listening pod from the Welsh Parliament's
own bilingual XML export.

Source  : https://record.senedd.wales/XMLExport/Download?meetingID=13847&xmlDownloadType=BilingualTranscript
Session : Culture, Communications, Welsh Language, Sport and International
          Relations Committee, Sixth Senedd, 11 January 2024 — agenda item 8,
          "Allegations concerning bullying at S4C: evidence session with S4C"
          (the XML's own item id for it is 240111-4).

THE POD IS THE WHOLE FLOOR, IN SESSION ORDER (Tom's ruling, 2026-09-03).

  The first build carried only the 109 contributions spoken in Welsh. That left
  answers with no questions: the 51 English contributions are overwhelmingly the
  QUESTIONS — Chris Jones 17, Tom Giffard 15, Alun Davies 11 — and the Welsh
  answers to them ARE in the pod. Dropping them opened a 13-turn hole in the
  middle of the session and left one Welsh line whose entire content is "Sorry, I
  don't know why I turned to English there", immediately after the English speech
  it refers to. It was a bilingual session; the honest artefact is the bilingual
  one.

  So every spoken contribution is here, in `Contribution_Order_ID` order:

    - Welsh contributions  -> target_text = the Welsh, known_text = the record's
      own English translation. Aran reads the Welsh.
    - English contributions -> known_text = the English actually spoken;
      **target_text is the EMPTY STRING**. Nothing is translated into Welsh.
      Inventing Welsh words nobody said in that room is explicitly not wanted,
      and an empty target is also what keeps these lines out of Aran's recording
      queue: recordist-queue.cjs skips a sentence whose target_text is blank
      (`if (!text) continue`, services/voice-engine/recordist-queue.cjs). The
      queue is a Welsh queue and stays exactly the size it was.

What this does NOT do: translate, paraphrase, tidy, correct or normalise a
single word. Splitting a contribution into readable lines is the only editing
operation, and it never crosses the Welsh/English pairing (see split_*.py).

Emits SQL + a per-row JSON log; it writes nothing itself.

  python3 build-senedd-s4c-pod.py <transcript.xml> --out <dir> [--first N]
"""
import argparse, json, os, sys, xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from split_contributions import split_pair2, sentences, paragraphs

COURSE = 'cym_n_for_eng'
SLUG = 'senedd-s4c-steve'
POD_ID = f'{COURSE}:{SLUG}'
AGENDA_ITEM = '240111-4'
VOICE = 'human_aran_cym_n'
SOURCE_URL = ('https://record.senedd.wales/XMLExport/Download'
              '?meetingID=13847&xmlDownloadType=BilingualTranscript')


def clean_speaker(name):
    """The record spells the same member 'Delyth Jewell AC' and 'Tom Giffard AS'
    in one file — two spellings of "Member of the Senedd", not two people. The
    label is the person's name; the title lives in the pod's metadata."""
    n = (name or '').strip()
    for suffix in (' AC', ' AS', ' MS', ' AM'):
        if n.endswith(suffix):
            n = n[:-len(suffix)].strip()
    return n


def sqlq(v):
    if v is None: return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def english_lines(raw_html):
    """Split an English-only floor contribution into one-breath lines.

    Monolingual, so there is no pairing to protect and no alignment to get
    wrong: paragraph first, then sentence, exactly the hierarchy the bilingual
    splitter uses — just without the second column.
    """
    out = []
    for p in paragraphs(raw_html):
        parts = sentences(p)
        out.extend(parts if parts else [p])
    return [s for s in out if s.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('xml')
    ap.add_argument('--out', required=True)
    ap.add_argument('--first', type=int, default=0, help='only the first N contributions')
    ap.add_argument('--label', default='full')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    rows = [{e.tag: (e.text or '') for e in c} for c in ET.parse(args.xml).getroot()]
    item = [r for r in rows if r['Agenda_Item_ID'] == AGENDA_ITEM]
    item.sort(key=lambda d: int(d['Contribution_Order_ID']))

    spoken = [r for r in item if r['contribution_verbatim'].strip()]
    welsh = [r for r in spoken if r['contribution_language'] == 'Cy']
    english_only = [r for r in spoken if r['contribution_language'] != 'Cy']
    placeholders = [r for r in item if not r['contribution_verbatim'].strip()]

    # SESSION ORDER, not Welsh-first. `spoken` is already sorted by
    # Contribution_Order_ID, and that ordering is the whole point of this build.
    ordered = spoken[:args.first] if args.first else spoken

    lines, fallback = [], []
    scene = 0
    for d in ordered:
        scene += 1
        is_welsh = d['contribution_language'] == 'Cy'
        if is_welsh:
            pairs, how = split_pair2(d['contribution_verbatim'], d['contribution_translated'])
            if how in ('whole', 'aligned') and any(
                    len(sentences(w)) > 1 or len(sentences(e)) > 1 for w, e in pairs):
                fallback.append(d['Contribution_ID'])
        else:
            # Spoken in English on the floor. No Welsh exists for it anywhere in
            # the record — not in the bilingual export, not in the Welsh-only
            # one — and none is invented here.
            pairs = [('', en) for en in english_lines(d['contribution_verbatim'])]
            how = 'english-floor'
        for k, (cy, en) in enumerate(pairs, 1):
            n = len(lines) + 1
            lines.append(dict(
                id=f'{POD_ID}:SC{scene:03d}-S{n:04d}',
                scene_number=scene, sentence_number=n, global_order=n,
                speaker=clean_speaker(d['Member_name_English']),
                target_text=cy, known_text=en,
                beat_label=f"contribution {d['Contribution_ID']} · part {k}/{len(pairs)}",
                source=dict(contribution_id=d['Contribution_ID'],
                            contribution_order=int(d['Contribution_Order_ID']),
                            language=d['contribution_language'],
                            part=k, parts=len(pairs), split=how,
                            job_title=d['Member_job_title_English'].strip() or None,
                            record_name=d['Member_name_English'].strip(),
                            senedd_tv=d['contribution_spoken_seneddTv']),
            ))

    speakers = sorted({l['speaker'] for l in lines})

    metadata = {
        'source': {'url': SOURCE_URL, 'meeting_id': 13847, 'agenda_item': AGENDA_ITEM,
                   'meeting_date': '2024-01-11',
                   'committee': ('Culture, Communications, Welsh Language, Sport and '
                                 'International Relations Committee, Sixth Senedd'),
                   'title_en': '8. Allegations concerning bullying at S4C: evidence session with S4C',
                   'licence': 'Senedd Commission copyright, reproduced under the Senedd’s own terms of use; '
                              'non-commercial, one learner.'},
        'restriction': 'Built HELD and stays held. Named individuals, dismissals and bullying '
                       'allegations: public record, but not general-learner content. For Steve only.',
        'one_voice_exception': (
            "Tom, 2026-09-03: every speaker in this pod is read by Aran — "
            "\"Stephen Fry reads all of Harry Potter in the same voice\". The male/female "
            "alternation gate (tools/pods/pod-cast-gate.cjs) and the same-voice-run warning "
            "(tools/pods/pod-script-view.cjs) are correct for the canonical pods and are "
            "DELIBERATELY not satisfied here. Do not 'fix' the casting; do not weaken either gate."),
        'english_is_tts': (
            "Tom, 2026-09-03: \"the English lines will be TTS, because it is fast and cheap.\" "
            "Aran records the WELSH ONLY. The known track is synthesised on Tom's own English "
            "clone; no sentence here carries a rerecord_wanted, and none should be added — a "
            "want on the known side is what would put English into a Welsh recording queue."),
        'english_floor_turns': (
            "Tom's ruling, 2026-09-03: the 51 contributions spoken in ENGLISH on the floor are "
            "IN this pod, in session order, as English audio. They are overwhelmingly the "
            "QUESTIONS (Chris Jones 17, Tom Giffard 15, Alun Davies 11) whose Welsh answers are "
            "already here; excluding them left a 13-turn hole and a Welsh line apologising for an "
            "English speech the pod did not contain. Their target_text is the EMPTY STRING and "
            "must stay empty: nothing was said in Welsh, nothing is invented in Welsh, and a "
            "blank target is what keeps them out of Aran's recording queue "
            "(services/voice-engine/recordist-queue.cjs skips blank target_text)."),
        'english_only_contributions': [
            {'contribution_id': r['Contribution_ID'], 'order': int(r['Contribution_Order_ID']),
             'speaker': clean_speaker(r['Member_name_English'])} for r in english_only],
        'source_lines': {l['id']: l['source'] for l in lines},
    }

    welsh_lines = [l for l in lines if l['target_text']]
    eng_lines = [l for l in lines if not l['target_text']]
    stats = dict(
        contributions_in_item=len(item), placeholder_rows=len(placeholders),
        contributions_spoken=len(spoken), welsh_contributions=len(welsh),
        english_only_contributions=len(english_only),
        contributions_built=len(ordered),
        paired_lines=len(lines),
        welsh_lines=len(welsh_lines), english_floor_lines=len(eng_lines),
        alignment_fallback_contributions=len(fallback), fallback_ids=fallback,
        speakers=speakers,
    )

    sql = []
    sql.append('BEGIN;')
    sql.append(
        "INSERT INTO listening_pods (id, course_code, pod_type, slug, title, scene, difficulty, "
        "speakers, source_file, metadata, visibility) VALUES (\n  "
        + ', '.join([sqlq(POD_ID), sqlq(COURSE), sqlq('choice'), sqlq(SLUG),
                     sqlq('Senedd: allegations of bullying at S4C (11 January 2024)'),
                     sqlq('Culture, Communications, Welsh Language, Sport and International Relations Committee'),
                     sqlq('advanced'),
                     sqlq(json.dumps(speakers, ensure_ascii=False)) + '::jsonb',
                     sqlq(SOURCE_URL),
                     sqlq(json.dumps(metadata, ensure_ascii=False)) + '::jsonb',
                     sqlq('held')])
        # `speakers` is DELIBERATELY not in the update list: on an existing pod
        # that column holds the per-track CAST object (set-senedd-cast.sql), and
        # overwriting it with this bare name array would strip every voice.
        + "\n) ON CONFLICT (id) DO UPDATE SET metadata = EXCLUDED.metadata, "
          "title = EXCLUDED.title;")
    # Cast every WELSH-SPEAKING speaker in this pod to Aran, for the recordist
    # queue's gender lookup. A speaker who only ever spoke English on the floor
    # has no Welsh to record and is deliberately absent here: adding them would
    # be a claim that Aran owes us a reading he does not.
    welsh_speakers = sorted({l['speaker'] for l in welsh_lines})
    cast = {s: {'name': 'Aran', 'email': 'aran@hey.com', 'gender': 'm', 'voiceId': VOICE}
            for s in welsh_speakers}
    sql.append(
        "UPDATE courses SET voice_config = jsonb_set(voice_config, '{podCast}', "
        f"coalesce(voice_config->'podCast','{{}}'::jsonb) || {sqlq(json.dumps(cast, ensure_ascii=False))}::jsonb) "
        f"WHERE course_code = {sqlq(COURSE)};")
    # REBUILD, not top-up. The ordering columns all move when the English floor
    # turns are interleaved, and (pod_id, global_order) plus
    # (pod_id, scene_number, sentence_number) are both UNIQUE — so an in-place
    # renumber would collide with itself halfway through. Safe here and only
    # here because this pod has, verified before the write: zero linked human
    # takes, zero rerecord wants, and zero rows in learner_pod_state. Aran's
    # "already recorded" status is derived from course_audio by text identity,
    # never from these links, so no take can be lost by this DELETE.
    sql.append(f"DELETE FROM listening_pod_sentences WHERE pod_id = {sqlq(POD_ID)};")
    for l in lines:
        sql.append(
            "INSERT INTO listening_pod_sentences (id, pod_id, scene_number, sentence_number, "
            "global_order, speaker, target_text, known_text, beat_label, glue_to_next) "
            "VALUES (" + ', '.join([
                sqlq(l['id']), sqlq(POD_ID), str(l['scene_number']), str(l['sentence_number']),
                str(l['global_order']), sqlq(l['speaker']), sqlq(l['target_text']),
                sqlq(l['known_text']), sqlq(l['beat_label']), 'false'])
            + ");")
    sql.append('COMMIT;')

    base = os.path.join(args.out, f'senedd-s4c-steve-{args.label}')
    open(base + '.sql', 'w').write('\n'.join(sql) + '\n')
    json.dump({'stats': stats, 'pod': {'id': POD_ID, 'visibility': 'held'}, 'cast': cast,
               'lines': lines}, open(base + '-dryrun-log.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(stats, ensure_ascii=False, indent=1))
    print(f'wrote {base}.sql and {base}-dryrun-log.json')


if __name__ == '__main__':
    main()
