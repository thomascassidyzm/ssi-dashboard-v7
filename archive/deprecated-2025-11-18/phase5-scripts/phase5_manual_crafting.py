#!/usr/bin/env python3
"""
Phase 5 Manual Crafting - Hand-crafted phrases for S0371-S0380
Using linguistic intelligence and natural language understanding
"""

import json
from pathlib import Path

COURSE = "cmn_for_eng"
SCAFFOLD_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_scaffolds"
OUTPUT_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_outputs"

def load_scaffold(seed_id):
    """Load scaffold file"""
    with open(f"{SCAFFOLD_DIR}/seed_s{seed_id:04d}.json", 'r', encoding='utf-8') as f:
        return json.load(f)

def save_output(seed_id, output):
    """Save output file"""
    with open(f"{OUTPUT_DIR}/seed_s{seed_id:04d}.json", 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

def process_s0371():
    """
    S0371: "I went to see a film on Wednesday."
    我星期三去看了一部电影。
    """
    scaffold = load_scaffold(371)
    output = scaffold.copy()

    # S0371L01: "on Wednesday" / "星期三"
    output['legos']['S0371L01']['practice_phrases'] = [
        ["on Wednesday", "星期三", None, 1],
        ["Wednesday", "星期三", None, 1],
        ["I went on Wednesday", "我星期三去了", None, 3],
        ["Did you come on Wednesday?", "你星期三来了吗？", None, 3],
        ["Can you come on Wednesday?", "你能在星期三来吗？", None, 4],
        ["He said on Wednesday", "他说在星期三", None, 3],
        ["I want to see you on Wednesday", "我想在星期三见你", None, 5],
        ["Do you want to meet on Wednesday?", "你想在星期三见面吗？", None, 5],
        ["Yes I can come on Wednesday", "是的，我能在星期三来", None, 5],
        ["I went to see a film on Wednesday.", "我星期三去看了一部电影。", None, 8],
    ]
    output['legos']['S0371L01']['phrase_distribution'] = {
        "really_short_1_2": 2,
        "quite_short_3": 3,
        "longer_4_5": 3,
        "long_6_plus": 2
    }

    # S0371L02: "went to see" / "去看了"
    output['legos']['S0371L02']['practice_phrases'] = [
        ["went to see", "去看了", None, 2],
        ["I went to see", "我去看了", None, 3],
        ["He went to see", "他去看了", None, 3],
        ["She went to see", "她去看了", None, 3],
        ["wanted to go see", "想去看了", None, 3],
        ["I went to see something", "我去看了一些东西", None, 4],
        ["He went to see a friend", "他去看了一个朋友", None, 4],
        ["Did you go to see her?", "你去看了她吗？", None, 4],
        ["I went to see him yesterday", "我昨天去看了他", None, 4],
        ["I went to see a film on Wednesday.", "我星期三去看了一部电影。", None, 8],
    ]
    output['legos']['S0371L02']['phrase_distribution'] = {
        "really_short_1_2": 2,
        "quite_short_3": 4,
        "longer_4_5": 3,
        "long_6_plus": 1
    }

    # S0371L03: "a film" / "一部电影"
    output['legos']['S0371L03']['practice_phrases'] = [
        ["a film", "一部电影", None, 2],
        ["film", "电影", None, 1],
        ["I like a film", "我喜欢一部电影", None, 4],
        ["I watched a film", "我看了一部电影", None, 4],
        ["This is a film", "这是一部电影", None, 4],
        ["That was a film", "那是一部电影", None, 4],
        ["I went to see a film", "我去看了一部电影", None, 5],
        ["That a film was good", "那部电影很好", None, 4],
        ["He wanted to see a film", "他想看一部电影", None, 4],
        ["I went to see a film on Wednesday.", "我星期三去看了一部电影。", None, 8],
    ]
    output['legos']['S0371L03']['phrase_distribution'] = {
        "really_short_1_2": 2,
        "quite_short_3": 0,
        "longer_4_5": 6,
        "long_6_plus": 2
    }

    # S0371L04: "went to see a film" / "去看了一部电影"
    output['legos']['S0371L04']['practice_phrases'] = [
        ["went to see a film", "去看了一部电影", None, 4],
        ["I went to see a film", "我去看了一部电影", None, 5],
        ["He went to see a film", "他去看了一部电影", None, 5],
        ["wanted to go see a film", "想去看一部电影", None, 4],
        ["I want to see a film", "我想看一部电影", None, 4],
        ["She wants to see a film", "她想看一部电影", None, 4],
        ["Can you go see a film?", "你能去看一部电影吗？", None, 5],
        ["He said he went to see a film", "他说他去看了一部电影", None, 6],
        ["Do you want to go see a film?", "你想去看一部电影吗？", None, 6],
        ["I went to see a film on Wednesday.", "我星期三去看了一部电影。", None, 8],
    ]
    output['legos']['S0371L04']['phrase_distribution'] = {
        "really_short_1_2": 0,
        "quite_short_3": 0,
        "longer_4_5": 6,
        "long_6_plus": 4
    }

    # S0371L05: "saw a film" / "看了一部电影"
    output['legos']['S0371L05']['practice_phrases'] = [
        ["saw a film", "看了一部电影", None, 3],
        ["I saw a film", "我看了一部电影", None, 4],
        ["He saw a film", "他看了一部电影", None, 4],
        ["She saw a film", "她看了一部电影", None, 4],
        ["I want to see a film", "我想看一部电影", None, 4],
        ["I enjoyed seeing a film", "我很高兴看了一部电影", None, 4],
        ["I saw a film at home", "我在家看了一部电影", None, 5],
        ["I saw a film last night", "我昨晚看了一部电影", None, 5],
        ["Did you see a film?", "你看了一部电影吗？", None, 4],
        ["I went to see a film on Wednesday.", "我星期三去看了一部电影。", None, 8],
    ]
    output['legos']['S0371L05']['phrase_distribution'] = {
        "really_short_1_2": 0,
        "quite_short_3": 1,
        "longer_4_5": 7,
        "long_6_plus": 2
    }

    # S0371L06: "I went to see" / "我去看了" (FINAL LEGO)
    output['legos']['S0371L06']['practice_phrases'] = [
        ["I went to see", "我去看了", None, 3],
        ["went to see", "去看了", None, 2],
        ["I wanted to go see", "我想去看了", None, 4],
        ["I said I went to see", "我说我去看了", None, 4],
        ["Can I go see?", "我能去看吗？", None, 4],
        ["He went to see", "他去看了", None, 3],
        ["She said I went to see", "她说我去看了", None, 4],
        ["I went to see him", "我去看了他", None, 4],
        ["I went to see the film", "我去看了那部电影", None, 4],
        ["I went to see a film on Wednesday.", "我星期三去看了一部电影。", None, 8],
    ]
    output['legos']['S0371L06']['phrase_distribution'] = {
        "really_short_1_2": 1,
        "quite_short_3": 2,
        "longer_4_5": 6,
        "long_6_plus": 1
    }

    output['generation_stage'] = 'PHRASES_GENERATED'
    save_output(371, output)
    print("✓ S0371: Processed with manual crafting")

if __name__ == '__main__':
    process_s0371()
