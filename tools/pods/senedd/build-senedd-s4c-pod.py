#!/usr/bin/env python3
"""Build Steve's custom Senedd/S4C listening pod from the Welsh Parliament's
own bilingual XML export.

Source  : https://record.senedd.wales/XMLExport/Download?meetingID=13847&xmlDownloadType=BilingualTranscript
Session : Culture, Communications, Welsh Language, Sport and International
          Relations Committee, Sixth Senedd, 11 January 2024 — agenda item 8,
          "Allegations concerning bullying at S4C: evidence session with S4C"
          (the XML's own item id for it is 240111-4).

What this does NOT do: translate, paraphrase, tidy, correct or normalise a
single word. Splitting a contribution into readable lines is the only editing
operation, and it never crosses the Welsh/English pairing (see split_*.py).

Emits SQL + a per-row JSON log; it writes nothing itself.

  python3 build-senedd-s4c-pod.py <transcript.xml> --out <dir> [--first N]
"""
import argparse, json, os, sys, xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from split_contributions import split_pair2, sentences

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

    if args.first:
        welsh = welsh[:args.first]

    lines, fallback = [], []
    scene = 0
    for d in welsh:
        scene += 1
        pairs, how = split_pair2(d['contribution_verbatim'], d['contribution_translated'])
        if how in ('whole', 'aligned') and any(
                len(sentences(w)) > 1 or len(sentences(e)) > 1 for w, e in pairs):
            fallback.append(d['Contribution_ID'])
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
        'english_is_recorded_here': (
            "Tom, 2026-09-03: Aran records the ENGLISH lines too. This English exists in no other "
            "pod, so there is nothing to reuse and no TTS pass planned — every sentence carries "
            "rerecord_wanted.known naming Aran, which is what puts the English line in his queue. "
            "Do NOT strip those wants: they are the English half of the pod, not a leftover flag."),
        'english_only_contributions': [
            {'contribution_id': r['Contribution_ID'], 'order': int(r['Contribution_Order_ID']),
             'speaker': clean_speaker(r['Member_name_English'])} for r in english_only],
        'source_lines': {l['id']: l['source'] for l in lines},
    }

    stats = dict(
        contributions_in_item=len(item), placeholder_rows=len(placeholders),
        contributions_spoken=len(spoken), welsh_contributions=len(welsh),
        english_only_contributions=len(english_only),
        paired_lines=len(lines), recordable_lines=len(lines) * 2,
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
        + "\n) ON CONFLICT (id) DO UPDATE SET metadata = EXCLUDED.metadata, "
          "speakers = EXCLUDED.speakers, title = EXCLUDED.title;")
    # Cast every speaker in this pod to Aran. Additive: existing keys untouched.
    cast = {s: {'name': 'Aran', 'email': 'aran@hey.com', 'gender': 'm', 'voiceId': VOICE} for s in speakers}
    sql.append(
        "UPDATE courses SET voice_config = jsonb_set(voice_config, '{podCast}', "
        f"coalesce(voice_config->'podCast','{{}}'::jsonb) || {sqlq(json.dumps(cast, ensure_ascii=False))}::jsonb) "
        f"WHERE course_code = {sqlq(COURSE)};")
    want = json.dumps({'known': VOICE}, ensure_ascii=False)
    for l in lines:
        sql.append(
            "INSERT INTO listening_pod_sentences (id, pod_id, scene_number, sentence_number, "
            "global_order, speaker, target_text, known_text, beat_label, glue_to_next, rerecord_wanted) "
            "VALUES (" + ', '.join([
                sqlq(l['id']), sqlq(POD_ID), str(l['scene_number']), str(l['sentence_number']),
                str(l['global_order']), sqlq(l['speaker']), sqlq(l['target_text']),
                sqlq(l['known_text']), sqlq(l['beat_label']), 'false', sqlq(want) + '::jsonb'])
            + ") ON CONFLICT (id) DO NOTHING;")
    sql.append('COMMIT;')

    base = os.path.join(args.out, f'senedd-s4c-steve-{args.label}')
    open(base + '.sql', 'w').write('\n'.join(sql) + '\n')
    json.dump({'stats': stats, 'pod': {'id': POD_ID, 'visibility': 'held'}, 'cast': cast,
               'lines': lines}, open(base + '-dryrun-log.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(stats, ensure_ascii=False, indent=1))
    print(f'wrote {base}.sql and {base}-dryrun-log.json')


if __name__ == '__main__':
    main()
