#!/usr/bin/env python3
"""cs #976·AI, correction (parent room, after Kai's 12:25Z ruling): S0450 is a KNOWN-SIDE-ONLY fix in every sister course.
Writes batches/<course>.v2.json. expect = the live state after the undo events ebce154a / 2bb1c8b7 / 7ac2cd58."""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
def upd(known_before, target, known_after):
    return {'op': 'seed.update', 'seed_number': 450, 'set': {'known_text': known_after}, 'expect': {'known_text': known_before, 'target_text': target}}
b = {
 # same English as spa_for_eng / por_br_for_eng (#964·AI ev 4c968a42 / c072c634) and spa_mx (ev e4f337ed)
 'por_for_eng': upd('no they have to catch the train themselves', 'não, eles têm de apanhar o comboio', 'no they have to catch the train'),
 # neighbours 401/406/430/436 put "No," as casual いや、 and drop the subject
 'spa_for_jpn': upd('自分たちで電車に乗らないといけない。', 'No, ellos tienen que coger el tren.', 'いや、電車に乗らないといけない。'),
 # neighbours 424/436/443: 不，他们…
 'spa_for_zho': upd('不，他们得自己赶火车。', 'No, ellos tienen que coger el tren.', '不，他们得赶火车。'),
}
for c, op in b.items(): json.dump({'ops': [op]}, open(f'{H}/batches/{c}.v2.json', 'w'), ensure_ascii=False, indent=1)
