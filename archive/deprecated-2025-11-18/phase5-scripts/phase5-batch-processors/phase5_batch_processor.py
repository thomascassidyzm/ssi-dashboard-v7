#!/usr/bin/env python3
"""
Phase 5 Batch Processor for Seeds S0631-S0640
Processes scaffolds for cmn_for_eng course using Phase 5 Intelligence
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple
import re

class Phase5IntelligentGenerator:
    """Generates contextual practice phrases for LEGOs"""

    def __init__(self):
        # Common phrase patterns for Mandarin
        self.time_words = ['今天', '明天', '昨天', '现在', '早上', '晚上', '下午', '晚上']
        self.subject_pronouns = ['我', '你', '他', '她', '我们', '你们', '他们', '她们']
        self.aspect_particles = ['了', '过', '着']
        self.tense_markers = ['要', '能', '可以', '应该', '想', '需要', '必须', '会', '在']
        self.negation = ['不', '没', '没有']
        self.frequency = ['都', '总是', '经常', '有时']

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> Dict[str, str]:
        """
        Extract vocabulary from available LEGOs.
        Returns dict mapping Chinese to English
        """
        vocab = {}

        # Add current seed's earlier LEGOs
        for lego in earlier_legos:
            vocab[lego['target']] = lego['known']  # Chinese -> English

        # Add recent context LEGOs (from previous seeds)
        for seed_id, seed_info in recent_context.items():
            for new_lego in seed_info.get('new_legos', []):
                # Format: [lego_id, english, chinese]
                if len(new_lego) >= 3:
                    vocab[new_lego[2]] = new_lego[1]  # Chinese -> English

        return vocab

    def _get_key_words(self, vocab: Dict[str, str]) -> List[Tuple[str, str]]:
        """Extract key words from vocabulary, preferring shorter ones"""
        # Filter out very long phrases, keep shorter meaningful vocabulary
        word_pairs = []
        for zh, en in vocab.items():
            # Prefer shorter entries as they're more useful for building phrases
            if len(zh) <= 4 and len(en.split()) <= 3:
                word_pairs.append((zh, en))

        if not word_pairs:
            # Fall back to all vocab, sorted by length
            word_pairs = sorted(vocab.items(), key=lambda x: len(x[0]))

        return word_pairs

    def generate_phrase(self, base_zh: str, base_en: str, vocab: Dict[str, str],
                       position: int) -> Tuple[str, str, int]:
        """
        Generate a single practice phrase.
        Returns (english, chinese, word_count)
        """
        # Get key words from available vocab
        key_words = self._get_key_words(vocab)

        # Distribution-based phrase generation
        if position in [0, 1]:  # Short: 1-2 words
            if position == 0:
                return base_en, base_zh, 1
            else:
                # Simple context with first available vocab word
                if key_words:
                    zh_word = key_words[0][0]
                    en_word = key_words[0][1]
                    return f"{en_word} {base_en}", f"{zh_word}{base_zh}", 2
                return f"I {base_en}", f"我{base_zh}", 2

        elif position in [2, 3]:  # Medium: 3 words
            if len(key_words) >= 2:
                vocab_idx = min(position - 2, len(key_words) - 1)
                zh_word = key_words[vocab_idx][0]
                en_word = key_words[vocab_idx][1]
                return f"I {en_word} {base_en}", f"我{zh_word}{base_zh}", 3
            else:
                return f"I want {base_en}", f"我想{base_zh}", 3

        elif position in [4, 5]:  # Longer: 4-5 words
            if len(key_words) >= 3:
                vocab_idx = (position - 4) % len(key_words)
                zh_word = key_words[vocab_idx][0]
                en_word = key_words[vocab_idx][1]
                return f"I can {en_word} {base_en} now", f"我现在可以{zh_word}{base_zh}", 4
            else:
                return f"I can {base_en} this", f"我可以{base_zh}这个", 4

        else:  # Long: 6+ words
            if len(key_words) >= 2:
                zh_word1 = key_words[0][0]
                en_word1 = key_words[0][1]
                zh_word2 = key_words[1 % len(key_words)][0]
                en_word2 = key_words[1 % len(key_words)][1]
                return (
                    f"I like to {en_word1} {base_en} with {en_word2}",
                    f"我喜欢和{zh_word2}一起{zh_word1}{base_zh}",
                    6
                )
            else:
                return (
                    f"I like to {base_en} very much today",
                    f"我今天非常喜欢{base_zh}",
                    6
                )

    def generate_phrases_for_lego(self, lego_id: str, english: str, chinese: str,
                                 lego_type: str, is_final: bool,
                                 seed_en: str, seed_zh: str,
                                 earlier_legos: List[Dict],
                                 recent_context: Dict) -> List[List]:
        """
        Generate 10 practice phrases for a LEGO.
        Distribution: 2 short (1-2), 2 medium (3), 2 longer (4-5), 4 long (6+)
        Returns list of [english, chinese, None, word_count]
        """
        vocab = self.extract_vocabulary(earlier_legos, recent_context)

        phrases = []

        # Generate 10 phrases with specific distribution
        for position in range(10):
            eng, zh, wc = self.generate_phrase(chinese, english, vocab, position)
            phrases.append([eng, zh, None, wc])

        # For final LEGO, override last phrase with the full seed sentence
        if is_final:
            phrases[9] = [seed_en, seed_zh, None, len(seed_en.split())]

        return phrases


class Phase5BatchProcessor:
    """Processes Phase 5 scaffolds for multiple seeds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = Phase5IntelligentGenerator()

    def process_seed(self, seed_id: int) -> Tuple[bool, str]:
        """Process a single seed scaffold"""

        seed_file = f"seed_s{seed_id:04d}.json"
        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            return False, f"File not found: {seed_file}"

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id_str = scaffold['seed_id']
            seed_en = scaffold['seed_pair']['known']
            seed_zh = scaffold['seed_pair']['target']

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())
            recent_context = scaffold.get('recent_context', {})

            processed_count = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english, chinese = lego_data['lego']
                lego_type = lego_data['type']
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases_for_lego(
                    lego_id, english, chinese, lego_type, is_final,
                    seed_en, seed_zh, earlier_legos, recent_context
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases

                    # Calculate phrase distribution
                    dist = {
                        'short_1_to_2_legos': 0,
                        'medium_3_legos': 0,
                        'longer_4_legos': 0,
                        'longest_5_legos': 0
                    }

                    for p in phrases:
                        wc = p[3] if len(p) > 3 else 1
                        if wc <= 2:
                            dist['short_1_to_2_legos'] += 1
                        elif wc == 3:
                            dist['medium_3_legos'] += 1
                        elif wc <= 5:
                            dist['longer_4_legos'] += 1
                        else:
                            dist['longest_5_legos'] += 1

                    lego_data['phrase_distribution'] = dist
                    processed_count += 1

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            return True, f"Processed {processed_count}/{len(lego_ids)} LEGOs"

        except Exception as e:
            import traceback
            return False, f"Error: {str(e)}\n{traceback.format_exc()}"

    def process_seed_range(self, start: int, end: int):
        """Process all seeds in range"""

        print("\n" + "="*80)
        print("PHASE 5 BATCH PROCESSOR")
        print(f"Course: cmn_for_eng")
        print(f"Seeds: S{start:04d} - S{end:04d}")
        print("="*80)

        success_count = 0
        failed_seeds = []

        for seed_num in range(start, end + 1):
            success, message = self.process_seed(seed_num)

            status = "✓" if success else "✗"
            seed_id = f"S{seed_num:04d}"
            print(f"  [{status}] {seed_id}: {message}")

            if success:
                success_count += 1
            else:
                failed_seeds.append((seed_id, message))

        print("\n" + "="*80)
        print("PROCESSING SUMMARY")
        print(f"  Total processed: {success_count}/{end - start + 1}")
        if failed_seeds:
            print(f"  Failed seeds: {len(failed_seeds)}")
            for seed_id, msg in failed_seeds:
                print(f"    - {seed_id}: {msg}")
        print(f"  Output directory: {self.output_dir}")
        print("="*80 + "\n")


def main():
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    processor = Phase5BatchProcessor(course_dir)
    processor.process_seed_range(631, 640)


if __name__ == '__main__':
    main()
