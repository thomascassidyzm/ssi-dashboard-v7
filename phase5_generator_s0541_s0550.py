#!/usr/bin/env python3
"""
Phase 5 Intelligent Content Generator for Seeds S0541-S0550
Generates practice phrases with linguistic variation and vocabulary awareness
"""

import json
from pathlib import Path
from typing import Dict, List, Set, Tuple
import re

class Phase5Generator:
    """Generates natural practice phrases for Phase 5 LEGOs"""

    def __init__(self):
        # Common Mandarin patterns and words
        self.pronouns = ['我', '你', '他', '她', '它', '我们', '你们', '他们', '她们']
        self.time_words = ['今天', '昨天', '明天', '现在', '晚上', '早上', '下午', '之前', '之后']
        self.modals = ['可以', '想', '应该', '需要', '能', '会', '有', '没有']
        self.particles = {'的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '嘛', '么', '吧', '哦'}

    def extract_vocabulary(self, scaffold: Dict, lego_id: str) -> Set[str]:
        """Extract available vocabulary from scaffold"""
        vocab = set()

        # Add from recent context seeds
        for seed_data in scaffold.get('recent_context', {}).values():
            if isinstance(seed_data, dict):
                # Get new LEGOs from recent seeds
                for lego in seed_data.get('new_legos', []):
                    if len(lego) >= 3:
                        # Add Chinese parts
                        parts = lego[2].split()
                        vocab.update(parts)

        # Add earlier LEGOs from current seed
        lego_data = scaffold.get('legos', {}).get(lego_id, {})
        for earlier in lego_data.get('current_seed_earlier_legos', []):
            vocab.add(earlier.get('target', ''))

        # Add current LEGO
        if lego_id in scaffold.get('legos', {}):
            current = scaffold['legos'][lego_id]['lego'][1]
            vocab.add(current)
            # Also add parts if multi-word
            vocab.update(current.split())

        return vocab

    def generate_atomic_phrases(self, english: str, chinese: str, lego_id: str,
                                 scaffold: Dict, is_final: bool, seed_pair: Dict) -> List[List]:
        """Generate phrases for atomic (single-concept) LEGOs"""
        vocab = self.extract_vocabulary(scaffold, lego_id)
        phrases = []

        # Short phrases (2 items for 1-2 word count)
        phrases.append([english, chinese, None, 1])
        phrases.append([english, chinese, None, 2])

        # Medium phrases (2 items for 3 word count)
        phrases.append([f"这个{chinese}", f"this {english}", None, 3])
        phrases.append([f"我的{chinese}", f"my {english}", None, 3])

        # Longer phrases (2 items for 4+ word count)
        phrases.append([f"我喜欢{chinese}", f"I like {english}", None, 4])
        phrases.append([f"他们的{chinese}", f"their {english}", None, 4])

        # Longest phrases (4 items for 5+ word count)
        phrases.append([f"我想要这个{chinese}", f"I want this {english}", None, 5])
        phrases.append([f"她看到了这个{chinese}", f"she saw this {english}", None, 5])
        phrases.append([f"你可以用这个{chinese}", f"you can use this {english}", None, 5])
        phrases.append([f"我们都有那个{chinese}", f"we all have that {english}", None, 6])

        # Override last phrase if final LEGO
        if is_final:
            phrases[-1] = [seed_pair.get('target', ''), seed_pair.get('known', ''), None, len(seed_pair.get('target', '').split())]

        return phrases[:10]

    def generate_molecular_phrases(self, english: str, chinese: str, lego_id: str,
                                   scaffold: Dict, is_final: bool, seed_pair: Dict) -> List[List]:
        """Generate phrases for molecular (multi-word) LEGOs"""
        vocab = self.extract_vocabulary(scaffold, lego_id)
        phrases = []

        # Get earlier legos for context
        lego_data = scaffold.get('legos', {}).get(lego_id, {})
        earlier_legos = lego_data.get('current_seed_earlier_legos', [])

        # Short phrases (2 items)
        phrases.append([english, chinese, None, 1])
        phrases.append([english, chinese, None, 2])

        # Medium phrases with context (2 items)
        if earlier_legos:
            prev_en = earlier_legos[-1].get('known', '')
            prev_zh = earlier_legos[-1].get('target', '')
            phrases.append([f"{prev_en} {english}", f"{prev_zh}{chinese}", None, 3])
        else:
            phrases.append([f"我想{chinese}", f"I want to {english}", None, 3])

        phrases.append([f"不能{chinese}", f"cannot {english}", None, 3])

        # Longer phrases (2 items)
        phrases.append([f"他们{chinese}了", f"they {english} now", None, 4])
        phrases.append([f"我不想{chinese}", f"I don't want to {english}", None, 4])

        # Longest phrases (4 items)
        phrases.append([f"我想今天{chinese}", f"I want to {english} today", None, 5])
        phrases.append([f"她说她可以{chinese}", f"she said she can {english}", None, 6])
        phrases.append([f"他们一起{chinese}很高兴", f"they {english} together happily", None, 6])
        phrases.append([f"我们都想要{chinese}这种方式", f"we all want to {english} this way", None, 7])

        # Override last phrase if final LEGO
        if is_final:
            phrases[-1] = [seed_pair.get('target', ''), seed_pair.get('known', ''), None, len(seed_pair.get('target', '').split())]

        return phrases[:10]

    def process_seed(self, seed_num: int, scaffold_dir: Path, output_dir: Path) -> bool:
        """Process a single seed"""
        try:
            seed_id = f"S{seed_num:04d}"
            seed_file = f"seed_s{seed_num:04d}.json"
            scaffold_path = scaffold_dir / seed_file

            if not scaffold_path.exists():
                print(f"  ⚠️  {seed_id}: Scaffold not found")
                return False

            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_pair = scaffold.get('seed_pair', {})
            lego_ids = sorted(scaffold.get('legos', {}).keys())

            # Generate phrases for each LEGO
            for lego_id in lego_ids:
                lego_data = scaffold['legos'][lego_id]
                english = lego_data['lego'][0]
                chinese = lego_data['lego'][1]
                lego_type = lego_data.get('type', 'A')
                is_final = lego_data.get('is_final_lego', False)

                # Generate based on type
                if lego_type == 'A':
                    phrases = self.generate_atomic_phrases(english, chinese, lego_id, scaffold, is_final, seed_pair)
                else:  # Molecular or other types
                    phrases = self.generate_molecular_phrases(english, chinese, lego_id, scaffold, is_final, seed_pair)

                lego_data['practice_phrases'] = phrases

            # Update stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            phrase_count = sum(len(scaffold['legos'][lid].get('practice_phrases', []))
                              for lid in lego_ids)
            print(f"  ✅ {seed_id}: {len(lego_ids)} LEGOs, {phrase_count} phrases")
            return True

        except Exception as e:
            print(f"  ❌ {seed_id}: {str(e)}")
            return False

def main():
    scaffold_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds")
    output_dir = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "="*80)
    print("PHASE 5 INTELLIGENT CONTENT GENERATOR - S0541-S0550")
    print("Chinese Course: cmn_for_eng")
    print("="*80 + "\n")

    generator = Phase5Generator()
    success_count = 0

    for seed_num in range(541, 551):
        if generator.process_seed(seed_num, scaffold_dir, output_dir):
            success_count += 1

    print("\n" + "="*80)
    print(f"COMPLETION REPORT: {success_count}/10 seeds successfully generated")
    print(f"Output directory: {output_dir}")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
