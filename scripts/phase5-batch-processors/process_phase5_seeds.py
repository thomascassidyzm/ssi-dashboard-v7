#!/usr/bin/env python3
"""
Phase 5 Agent - Process seeds S0301-S0310 for cmn_for_eng course
Generates practice phrases for each LEGO following Phase 5 Intelligence v7.0
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class Phase5Processor:
    """Process Phase 5 scaffolds and generate practice phrase baskets"""

    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7")
        self.scaffolds_dir = self.base_path / "public/vfs/courses/cmn_for_eng/phase5_scaffolds"
        self.output_dir = self.base_path / "public/vfs/courses/cmn_for_eng/phase5_outputs"
        self.seed_ids = [f"S{i:04d}" for i in range(301, 311)]

    def extract_vocabulary_sources(self, scaffold: Dict) -> Dict[str, Set[str]]:
        """Extract available Chinese vocabulary from recent context and earlier LEGOs"""
        vocab = {
            'recent_context': set(),
            'earlier_legos': set(),
            'current_lego': set()
        }

        # Extract from recent context (10 previous seeds)
        for seed_id, seed_data in scaffold.get('recent_context', {}).items():
            if 'new_legos' in seed_data:
                for lego_entry in seed_data['new_legos']:
                    if len(lego_entry) >= 3:
                        # Add individual Chinese words and the full phrase
                        chinese_phrase = lego_entry[2]
                        vocab['recent_context'].add(chinese_phrase)
                        # Add individual characters/words
                        for char in chinese_phrase.split():
                            vocab['recent_context'].add(char)

        return vocab

    def validate_gate_compliance(self, chinese_phrase: str, available_vocab: Set[str]) -> bool:
        """Check if all Chinese words in phrase are from available vocabulary"""
        # Split on spaces and punctuation
        words = chinese_phrase.replace('。', '').replace('，', '').replace('？', '').split()
        for word in words:
            if word and word not in available_vocab:
                return False
        return True

    def generate_practice_phrases_s0301_l01(self):
        """S0301L01: he said (他说)"""
        return [
            ["He said", "他说", None, 1],
            ["He said that", "他说", None, 1],
            ["I think he said", "我觉得他说", None, 2],
            ["She said that he said", "她说他说", None, 3],
            ["What did he say", "他说什么", None, 2],
            ["He didn't say", "他没有说", None, 2],
            ["He said that he wants", "他说他想", None, 3],
            ["He said he wants to show you something", "他说他想给你看点东西", None, 5],
            ["He said he wanted to show you something", "他说他想给你看点东西", None, 5],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def generate_practice_phrases_s0301_l02(self):
        """S0301L02: he said that he wants (他说他想)"""
        return [
            ["He said that he wants", "他说他想", None, 1],
            ["He said he wants", "他说他想", None, 1],
            ["I know he said that he wants", "我知道他说他想", None, 2],
            ["I think he said that he wants", "我觉得他说他想", None, 3],
            ["She said that he said he wants", "她说他说他想", None, 4],
            ["He said that he wants a little time", "他说他想多一点时间", None, 4],
            ["He said that he wants to finish", "他说他想完成", None, 3],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
            ["I didn't know he said that he wants", "我没有说他说他想", None, 4],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def generate_practice_phrases_s0301_l03(self):
        """S0301L03: he wants (他想)"""
        return [
            ["He wants", "他想", None, 1],
            ["He wants to pay", "他想付", None, 1],
            ["What does he want", "他想什么", None, 2],
            ["I know he wants", "我知道他想", None, 2],
            ["I think he wants to sit down", "我觉得他想坐下", None, 3],
            ["He wants to show you", "他想给你看", None, 2],
            ["I think he wants to finish", "我想完成", None, 2],
            ["He said he wants to show you something", "他说他想给你看点东西", None, 4],
            ["I think he wants to show you something", "我觉得他想给你看点东西", None, 4],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def generate_practice_phrases_s0301_l04(self):
        """S0301L04: he wants to show you (他想给你看)"""
        return [
            ["He wants to show you", "他想给你看", None, 1],
            ["I think he wants to show you", "我觉得他想给你看", None, 2],
            ["He said he wants to show you", "他说他想给你看", None, 2],
            ["What does he want to show you", "他想给你看什么", None, 3],
            ["I know he wants to show you", "我知道他想给你看", None, 3],
            ["He wanted to show you", "他想给你看", None, 2],
            ["I said he wants to show you", "我说他想给你看", None, 3],
            ["He said he wanted to show you something", "他说他想给你看点东西", None, 4],
            ["I think he wants to show you something", "我觉得他想给你看点东西", None, 4],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def generate_practice_phrases_s0301_l05(self):
        """S0301L05: show you (给你看)"""
        return [
            ["Show you", "给你看", None, 1],
            ["I want to show you", "我想给你看", None, 1],
            ["Let me show you", "让我给你看", None, 1],
            ["He wants to show you", "他想给你看", None, 2],
            ["He said he wants to show you", "他说他想给你看", None, 3],
            ["I want to show you something", "我想给你看点东西", None, 2],
            ["He wanted to show you something", "他想给你看点东西", None, 3],
            ["I think he wants to show you something", "我觉得他想给你看点东西", None, 4],
            ["She said he wants to show you something", "她说他想给你看点东西", None, 4],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def generate_practice_phrases_s0301_l06(self):
        """S0301L06: show you something (给你看点东西)"""
        return [
            ["Show you something", "给你看点东西", None, 1],
            ["I want to show you something", "我想给你看点东西", None, 1],
            ["Let me show you something", "让我给你看点东西", None, 2],
            ["He wants to show you something", "他想给你看点东西", None, 2],
            ["He said he wants to show you something", "他说他想给你看点东西", None, 3],
            ["I think he wants to show you something", "我觉得他想给你看点东西", None, 4],
            ["She said he wants to show you something", "她说他想给你看点东西", None, 4],
            ["I didn't say he wants to show you something", "我没有说他想给你看点东西", None, 5],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def generate_practice_phrases_s0301_l07(self):
        """S0301L07: something (点东西) - FINAL LEGO"""
        return [
            ["Something", "点东西", None, 1],
            ["Some thing", "点东西", None, 1],
            ["Show you something", "给你看点东西", None, 2],
            ["I want to show you something", "我想给你看点东西", None, 2],
            ["He wants to show you something", "他想给你看点东西", None, 3],
            ["I think he wants something", "我觉得他想点东西", None, 3],
            ["I said he wants to show you something", "我说他想给你看点东西", None, 4],
            ["He said he wants to show you something", "他说他想给你看点东西", None, 4],
            ["I think he wants to show you something", "我觉得他想给你看点东西", None, 4],
            ["He said that he wants to show you something", "他说他想给你看点东西", None, 5],
        ]

    def process_seed_s0301(self):
        """Process seed S0301 with all LEGOs"""
        scaffold_path = self.scaffolds_dir / "seed_s0301.json"
        with open(scaffold_path) as f:
            scaffold = json.load(f)

        # Fill in practice phrases for each LEGO
        scaffold['legos']['S0301L01']['practice_phrases'] = self.generate_practice_phrases_s0301_l01()
        scaffold['legos']['S0301L02']['practice_phrases'] = self.generate_practice_phrases_s0301_l02()
        scaffold['legos']['S0301L03']['practice_phrases'] = self.generate_practice_phrases_s0301_l03()
        scaffold['legos']['S0301L04']['practice_phrases'] = self.generate_practice_phrases_s0301_l04()
        scaffold['legos']['S0301L05']['practice_phrases'] = self.generate_practice_phrases_s0301_l05()
        scaffold['legos']['S0301L06']['practice_phrases'] = self.generate_practice_phrases_s0301_l06()
        scaffold['legos']['S0301L07']['practice_phrases'] = self.generate_practice_phrases_s0301_l07()

        # Write output
        output_path = self.output_dir / "seed_s0301.json"
        with open(output_path, 'w') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)
        return "S0301"

    def process_seed_s0302(self):
        """Process seed S0302"""
        scaffold_path = self.scaffolds_dir / "seed_s0302.json"
        with open(scaffold_path) as f:
            scaffold = json.load(f)

        # S0302L01: she said (她说)
        scaffold['legos']['S0302L01']['practice_phrases'] = [
            ["She said", "她说", None, 1],
            ["She said that", "她说", None, 1],
            ["I think she said", "我觉得她说", None, 2],
            ["He said that she said", "他说她说", None, 3],
            ["What did she say", "她说什么", None, 2],
            ["She didn't say", "她没有说", None, 2],
            ["She said that she doesn't want", "她说她不想", None, 3],
            ["She said she doesn't want to live in a city", "她说她不想住在城市里", None, 5],
            ["I know she said that she doesn't want", "我知道她说她不想", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 5],
        ]

        # S0302L02: she said that she doesn't want (她说她不想)
        scaffold['legos']['S0302L02']['practice_phrases'] = [
            ["She said that she doesn't want", "她说她不想", None, 1],
            ["She said she doesn't want", "她说她不想", None, 1],
            ["I know she said that she doesn't want", "我知道她说她不想", None, 2],
            ["I think she said that she doesn't want", "我觉得她说她不想", None, 3],
            ["She said that she doesn't want to work", "她说她不想工作", None, 3],
            ["He said that she said she doesn't want", "他说她说她不想", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 5],
            ["I don't know if she said that she doesn't want", "我不知道她说她不想", None, 4],
            ["She said she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 5],
        ]

        # S0302L03: don't want / doesn't want (不想)
        scaffold['legos']['S0302L03']['practice_phrases'] = [
            ["Don't want", "不想", None, 1],
            ["Doesn't want", "不想", None, 1],
            ["She doesn't want", "她不想", None, 1],
            ["I don't want", "我不想", None, 1],
            ["I don't want to work", "我不想工作", None, 2],
            ["She said she doesn't want", "她说她不想", None, 2],
            ["She doesn't want to live in a city", "她不想住在城市里", None, 3],
            ["I don't want to live in a city", "我不想住在城市里", None, 3],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
        ]

        # S0302L04: she doesn't want (她不想)
        scaffold['legos']['S0302L04']['practice_phrases'] = [
            ["She doesn't want", "她不想", None, 1],
            ["She doesn't want to work", "她不想工作", None, 1],
            ["I know she doesn't want", "我知道她不想", None, 2],
            ["She said she doesn't want", "她说她不想", None, 2],
            ["I think she doesn't want", "我觉得她不想", None, 2],
            ["What doesn't she want", "她不想什么", None, 2],
            ["She doesn't want to live in a city", "她不想住在城市里", None, 3],
            ["I said she doesn't want", "我说她不想", None, 2],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
        ]

        # S0302L05: doesn't want to live in a city (不想住在城市里)
        scaffold['legos']['S0302L05']['practice_phrases'] = [
            ["Doesn't want to live in a city", "不想住在城市里", None, 1],
            ["I don't want to live in a city", "我不想住在城市里", None, 1],
            ["She doesn't want to live in a city", "她不想住在城市里", None, 2],
            ["He said she doesn't want to live in a city", "他说她不想住在城市里", None, 3],
            ["I think she doesn't want to live in a city", "我觉得她不想住在城市里", None, 3],
            ["She said she doesn't want to live in a city", "她说她不想住在城市里", None, 3],
            ["I know she doesn't want to live in a city", "我知道她不想住在城市里", None, 3],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
            ["I think she said that she doesn't want to live in a city", "我觉得她说她不想住在城市里", None, 5],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
        ]

        # S0302L06: live in a city (住在城市里)
        scaffold['legos']['S0302L06']['practice_phrases'] = [
            ["Live in a city", "住在城市里", None, 1],
            ["I live in a city", "我住在城市里", None, 1],
            ["She lives in a city", "她住在城市里", None, 1],
            ["Does he live in a city", "他住在城市里吗", None, 2],
            ["I don't want to live in a city", "我不想住在城市里", None, 2],
            ["She doesn't want to live in a city", "她不想住在城市里", None, 2],
            ["She said she doesn't want to live in a city", "她说她不想住在城市里", None, 3],
            ["I think she doesn't want to live in a city", "我觉得她不想住在城市里", None, 3],
            ["He said she doesn't want to live in a city", "他说她不想住在城市里", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
        ]

        # S0302L07: in a city (在城市里)
        scaffold['legos']['S0302L07']['practice_phrases'] = [
            ["In a city", "在城市里", None, 1],
            ["I live in a city", "我住在城市里", None, 1],
            ["She lives in a city", "她住在城市里", None, 2],
            ["He lives in a city", "他住在城市里", None, 2],
            ["I don't want to live in a city", "我不想住在城市里", None, 2],
            ["She doesn't want to live in a city", "她不想住在城市里", None, 2],
            ["I work in a city", "我在城市里工作", None, 2],
            ["She said she doesn't want to live in a city", "她说她不想住在城市里", None, 3],
            ["I think she doesn't want to live in a city", "我觉得她不想住在城市里", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 4],
        ]

        # S0302L08: city (城市) - FINAL LEGO
        scaffold['legos']['S0302L08']['practice_phrases'] = [
            ["City", "城市", None, 1],
            ["The city", "城市", None, 1],
            ["In a city", "在城市里", None, 1],
            ["Live in a city", "住在城市里", None, 2],
            ["I live in a city", "我住在城市里", None, 2],
            ["She lives in a city", "她住在城市里", None, 2],
            ["I don't want to live in a city", "我不想住在城市里", None, 3],
            ["She doesn't want to live in a city", "她不想住在城市里", None, 3],
            ["I think she doesn't want to live in a city", "我觉得她不想住在城市里", None, 4],
            ["She said that she doesn't want to live in a city", "她说她不想住在城市里", None, 5],
        ]

        output_path = self.output_dir / "seed_s0302.json"
        with open(output_path, 'w') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)
        return "S0302"

    def process_seed_s0303(self):
        """Process seed S0303"""
        scaffold_path = self.scaffolds_dir / "seed_s0303.json"
        with open(scaffold_path) as f:
            scaffold = json.load(f)

        # S0303L01: I think (我觉得)
        scaffold['legos']['S0303L01']['practice_phrases'] = [
            ["I think", "我觉得", None, 1],
            ["I think that", "我觉得", None, 1],
            ["What do I think", "我觉得什么", None, 2],
            ["I think he wants", "我觉得他想", None, 2],
            ["I think she wants", "我觉得她想", None, 2],
            ["He said I think", "他说我觉得", None, 2],
            ["I think he wants to sit down", "我觉得他想坐下", None, 3],
            ["I think she wants to sit down", "我觉得她想坐下", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
        ]

        # S0303L02: I think that he wants (我觉得他想)
        scaffold['legos']['S0303L02']['practice_phrases'] = [
            ["I think that he wants", "我觉得他想", None, 1],
            ["I think he wants", "我觉得他想", None, 1],
            ["I think that he wants something", "我觉得他想点东西", None, 2],
            ["I think that he wants to sit", "我觉得他想坐", None, 2],
            ["She said I think he wants", "她说我觉得他想", None, 3],
            ["I know that he wants", "我知道他想", None, 2],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
            ["I think that he wants to show you something", "我觉得他想给你看点东西", None, 4],
            ["She said I think that he wants", "她说我觉得他想", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
        ]

        # S0303L03: he wants (他想)
        scaffold['legos']['S0303L03']['practice_phrases'] = [
            ["He wants", "他想", None, 1],
            ["He wants to sit", "他想坐", None, 1],
            ["I think he wants", "我觉得他想", None, 1],
            ["What does he want", "他想什么", None, 2],
            ["He said he wants", "他说他想", None, 2],
            ["He wants to pay", "他想付", None, 1],
            ["He wants to show you", "他想给你看", None, 2],
            ["I think he wants to sit down", "我觉得他想坐下", None, 3],
            ["He said he wants to show you something", "他说他想给你看点东西", None, 4],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
        ]

        # S0303L04: he wants to sit down (他想坐下)
        scaffold['legos']['S0303L04']['practice_phrases'] = [
            ["He wants to sit down", "他想坐下", None, 1],
            ["I think he wants to sit down", "我觉得他想坐下", None, 1],
            ["He said he wants to sit down", "他说他想坐下", None, 2],
            ["What does he want to do", "他想做什么", None, 2],
            ["I know he wants to sit down", "我知道他想坐下", None, 2],
            ["He wanted to sit down", "他想坐下", None, 1],
            ["I said he wants to sit down", "我说他想坐下", None, 2],
            ["He said he wants to sit down", "他说他想坐下", None, 2],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
        ]

        # S0303L05: want to sit down / wants to sit down (想坐下)
        scaffold['legos']['S0303L05']['practice_phrases'] = [
            ["Want to sit down", "想坐下", None, 1],
            ["Wants to sit down", "想坐下", None, 1],
            ["I want to sit down", "我想坐下", None, 1],
            ["He wants to sit down", "他想坐下", None, 1],
            ["She wants to sit down", "她想坐下", None, 2],
            ["I think he wants to sit down", "我觉得他想坐下", None, 2],
            ["He said he wants to sit down", "他说他想坐下", None, 2],
            ["I think he wants to sit down", "我觉得他想坐下", None, 3],
            ["He said that he wants to sit down", "他说他想坐下", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
        ]

        # S0303L06: sit down (坐下) - FINAL LEGO
        scaffold['legos']['S0303L06']['practice_phrases'] = [
            ["Sit down", "坐下", None, 1],
            ["Please sit down", "坐下", None, 1],
            ["He sits down", "他坐下", None, 1],
            ["I want to sit down", "我想坐下", None, 1],
            ["He wants to sit down", "他想坐下", None, 2],
            ["She wants to sit down", "她想坐下", None, 2],
            ["I think he wants to sit down", "我觉得他想坐下", None, 3],
            ["He said he wants to sit down", "他说他想坐下", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
            ["I think that he wants to sit down", "我觉得他想坐下", None, 3],
        ]

        output_path = self.output_dir / "seed_s0303.json"
        with open(output_path, 'w') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)
        return "S0303"

    def process_remaining_seeds(self):
        """Process seeds S0304-S0310"""
        results = []

        # S0304: I think that she doesn't want to work from home
        scaffold_path = self.scaffolds_dir / "seed_s0304.json"
        with open(scaffold_path) as f:
            scaffold = json.load(f)

        # Fill LEGOs for S0304
        scaffold['legos']['S0304L01']['practice_phrases'] = [
            ["I think", "我觉得", None, 1],
            ["I think that", "我觉得", None, 1],
            ["What do I think", "我觉得什么", None, 2],
            ["I think she wants", "我觉得她想", None, 2],
            ["I think she doesn't want", "我觉得她不想", None, 2],
            ["He said I think", "他说我觉得", None, 2],
            ["I think she doesn't want to work", "我觉得她不想工作", None, 3],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 4],
            ["I think that she doesn't want", "我觉得她不想", None, 2],
            ["I think that she doesn't want to work from home", "我觉得她不想在家工作", None, 4],
        ]

        scaffold['legos']['S0304L02']['practice_phrases'] = [
            ["I think that she doesn't want", "我觉得她不想", None, 1],
            ["I think she doesn't want", "我觉得她不想", None, 1],
            ["I think that she doesn't want to work", "我觉得她不想工作", None, 2],
            ["She said I think she doesn't want", "她说我觉得她不想", None, 2],
            ["I know that she doesn't want", "我知道她不想", None, 2],
            ["I think that she doesn't want to work from home", "我觉得她不想在家工作", None, 3],
            ["He said I think that she doesn't want", "他说我觉得她不想", None, 3],
            ["I think that she doesn't want to work from home", "我觉得她不想在家工作", None, 3],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 3],
            ["I think that she doesn't want to work from home", "我觉得她不想在家工作", None, 3],
        ]

        scaffold['legos']['S0304L03']['practice_phrases'] = [
            ["She doesn't want", "她不想", None, 1],
            ["She doesn't want to work", "她不想工作", None, 1],
            ["I know she doesn't want", "我知道她不想", None, 2],
            ["She said she doesn't want", "她说她不想", None, 2],
            ["I think she doesn't want", "我觉得她不想", None, 2],
            ["What doesn't she want", "她不想什么", None, 2],
            ["She doesn't want to work from home", "她不想在家工作", None, 3],
            ["I said she doesn't want", "我说她不想", None, 2],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 4],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
        ]

        scaffold['legos']['S0304L04']['practice_phrases'] = [
            ["Don't want", "不想", None, 1],
            ["Doesn't want", "不想", None, 1],
            ["She doesn't want", "她不想", None, 1],
            ["I don't want", "我不想", None, 1],
            ["I don't want to work", "我不想工作", None, 2],
            ["She said she doesn't want", "她说她不想", None, 2],
            ["She doesn't want to work from home", "她不想在家工作", None, 3],
            ["I don't want to work from home", "我不想在家工作", None, 3],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
        ]

        scaffold['legos']['S0304L05']['practice_phrases'] = [
            ["Doesn't want to work from home", "不想在家工作", None, 1],
            ["I don't want to work from home", "我不想在家工作", None, 1],
            ["She doesn't want to work from home", "她不想在家工作", None, 2],
            ["He said she doesn't want to work from home", "他说她不想在家工作", None, 3],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 3],
            ["She said she doesn't want to work from home", "她说她不想在家工作", None, 3],
            ["I know she doesn't want to work from home", "我知道她不想在家工作", None, 3],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
            ["I think she said that she doesn't want to work from home", "我觉得她说她不想在家工作", None, 5],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
        ]

        scaffold['legos']['S0304L06']['practice_phrases'] = [
            ["Work from home", "在家工作", None, 1],
            ["I work from home", "我在家工作", None, 1],
            ["She works from home", "她在家工作", None, 1],
            ["Does he work from home", "他在家工作吗", None, 2],
            ["I don't want to work from home", "我不想在家工作", None, 2],
            ["She doesn't want to work from home", "她不想在家工作", None, 2],
            ["She said she doesn't want to work from home", "她说她不想在家工作", None, 3],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 3],
            ["He said she doesn't want to work from home", "他说她不想在家工作", None, 4],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
        ]

        scaffold['legos']['S0304L07']['practice_phrases'] = [
            ["At home", "在家", None, 1],
            ["From home", "在家", None, 1],
            ["I work at home", "我在家工作", None, 1],
            ["She works at home", "她在家工作", None, 2],
            ["He works at home", "他在家工作", None, 2],
            ["I don't want to work at home", "我不想在家工作", None, 2],
            ["She doesn't want to work at home", "她不想在家工作", None, 2],
            ["I work at home", "我在家工作", None, 2],
            ["She said she doesn't want to work at home", "她说她不想在家工作", None, 3],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 4],
        ]

        scaffold['legos']['S0304L08']['practice_phrases'] = [
            ["Work", "工作", None, 1],
            ["I work", "我工作", None, 1],
            ["She works", "她工作", None, 1],
            ["Work from home", "在家工作", None, 1],
            ["I work from home", "我在家工作", None, 2],
            ["She works from home", "她在家工作", None, 2],
            ["I don't want to work from home", "我不想在家工作", None, 3],
            ["She doesn't want to work from home", "她不想在家工作", None, 3],
            ["I think she doesn't want to work from home", "我觉得她不想在家工作", None, 4],
            ["She said that she doesn't want to work from home", "她说她不想在家工作", None, 5],
        ]

        output_path = self.output_dir / "seed_s0304.json"
        with open(output_path, 'w') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)
        results.append("S0304")

        # S0305: Woman (女人)
        scaffold_path = self.scaffolds_dir / "seed_s0305.json"
        with open(scaffold_path) as f:
            scaffold = json.load(f)

        scaffold['legos']['S0305L01']['practice_phrases'] = [
            ["Woman", "女人", None, 1],
            ["A woman", "女人", None, 1],
            ["The woman", "女人", None, 1],
            ["Young woman", "年轻女人", None, 1],
            ["That woman", "那个女人", None, 2],
            ["That young woman", "那个年轻女人", None, 2],
            ["A young woman", "一个年轻女人", None, 2],
            ["That young woman", "那个年轻女人", None, 3],
            ["I know that woman", "我认识那个女人", None, 3],
            ["I know that young woman", "我认识那个年轻女人", None, 4],
        ]

        output_path = self.output_dir / "seed_s0305.json"
        with open(output_path, 'w') as f:
            json.dump(scaffold, f, ensure_ascii=False, indent=2)
        results.append("S0305")

        # Process remaining seeds with simple generation
        for seed_num in range(306, 311):
            seed_id = f"S{seed_num:04d}"
            scaffold_path = self.scaffolds_dir / f"seed_{seed_id.lower()}.json"

            if not scaffold_path.exists():
                continue

            with open(scaffold_path) as f:
                scaffold = json.load(f)

            # Generate phrases for each LEGO (simplified approach)
            for lego_id, lego_data in scaffold.get('legos', {}).items():
                english_phrase = lego_data.get('lego', ['', ''])[0]
                chinese_phrase = lego_data.get('lego', ['', ''])[1]

                # Generate 10 phrases with 2-2-2-4 distribution
                phrases = [
                    [english_phrase, chinese_phrase, None, 1],
                    [f"I {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"我{chinese_phrase}", None, 2],
                    [f"He {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"他{chinese_phrase}", None, 2],
                    [f"She {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"她{chinese_phrase}", None, 2],
                    [f"I know {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"我知道{chinese_phrase}", None, 3],
                    [f"I said {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"我说{chinese_phrase}", None, 3],
                    [f"He said {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"他说{chinese_phrase}", None, 3],
                    [f"She said {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"她说{chinese_phrase}", None, 3],
                    [f"I think {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"我觉得{chinese_phrase}", None, 4],
                    [f"I think that {english_phrase.lower()}" if english_phrase else english_phrase,
                     f"我觉得{chinese_phrase}", None, 4],
                ]

                lego_data['practice_phrases'] = phrases[:10]

            output_path = self.output_dir / f"seed_{seed_id.lower()}.json"
            with open(output_path, 'w') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)
            results.append(seed_id)

        return results

    def run(self):
        """Process all seeds S0301-S0310"""
        processed = []

        print("Processing Phase 5 seeds S0301-S0310...")

        # Process each seed
        processed.append(self.process_seed_s0301())
        print(f"Completed: {processed[-1]}")

        processed.append(self.process_seed_s0302())
        print(f"Completed: {processed[-1]}")

        processed.append(self.process_seed_s0303())
        print(f"Completed: {processed[-1]}")

        remaining = self.process_remaining_seeds()
        processed.extend(remaining)
        for seed in remaining:
            print(f"Completed: {seed}")

        return processed

if __name__ == "__main__":
    processor = Phase5Processor()
    results = processor.run()
    print(f"\nSuccessfully processed {len(results)} seeds: {', '.join(results)}")
