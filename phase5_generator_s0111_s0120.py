#!/usr/bin/env python3
"""
Phase 5 Intelligent Generator for Chinese Learning - Seeds S0111-S0120
Generates practice phrases following Phase 5 Intelligence v7.0 methodology
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

class ChinesePhraseGenerator:
    """Generates natural Chinese practice phrases using linguistic intelligence"""

    def __init__(self):
        """Initialize the generator with common patterns and particles"""
        # Common particles that don't need vocabulary validation
        self.particles = {
            '的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '嘿', '嘛', '么', '吧',
            '是', '在', '有', '被', '把', '给', '向', '跟', '和', '同', '跟', '对'
        }

        # Common function words that can be used with available vocabulary
        self.function_words = {
            '不', '很', '也', '都', '只', '又', '还', '那', '这', '那么', '这样',
            '更', '最', '太', '非常', '特别', '一点', '一些', '一个', '一'
        }

        # Common time words and connectors often available
        self.common_connectors = {
            '因为', '所以', '但是', '然后', '最后', '首先', '其次', '虽然', '虽然', '尽管'
        }

    def load_scaffold(self, scaffold_path: str) -> Dict:
        """Load a scaffold JSON file"""
        with open(scaffold_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_vocabulary_from_context(self, recent_context: Dict) -> Set[str]:
        """Extract all available Chinese vocabulary from recent context"""
        vocab = set()

        for seed_id, seed_data in recent_context.items():
            # Extract from sentence
            if 'sentence' in seed_data and isinstance(seed_data['sentence'], list):
                if len(seed_data['sentence']) > 1:
                    chinese_sentence = seed_data['sentence'][1]  # Chinese is index 1
                    # Split by pipe to get individual LEGO tiles
                    tiles = [t.strip() for t in chinese_sentence.split('|')]
                    vocab.update(tiles)

            # Extract from new_legos
            if 'new_legos' in seed_data:
                for lego_info in seed_data['new_legos']:
                    if len(lego_info) >= 3:
                        chinese_lego = lego_info[2]  # Chinese is index 2
                        vocab.add(chinese_lego)

        return vocab

    def extract_earlier_lego_vocab(self, earlier_legos: List[Dict]) -> Set[str]:
        """Extract vocabulary from earlier LEGOs in current seed"""
        vocab = set()
        for lego in earlier_legos:
            if 'target' in lego:
                vocab.add(lego['target'])
        return vocab

    def get_all_available_vocab(self, scaffold: Dict, current_lego_id: str) -> Set[str]:
        """Get all available vocabulary for a LEGO"""
        vocab = set()

        # 1. Add vocabulary from recent context
        vocab.update(self.extract_vocabulary_from_context(scaffold.get('recent_context', {})))

        # 2. Add current seed's earlier LEGOs
        lego_data = scaffold['legos'].get(current_lego_id, {})
        vocab.update(self.extract_earlier_lego_vocab(lego_data.get('current_seed_earlier_legos', [])))

        # 3. Add the current LEGO itself
        if 'lego' in lego_data and isinstance(lego_data['lego'], list):
            vocab.add(lego_data['lego'][1])  # Chinese is index 1

        return vocab

    def validate_chinese_phrase(self, chinese_phrase: str, available_vocab: Set[str]) -> bool:
        """Validate that all content words are in available vocabulary"""
        if not chinese_phrase or not available_vocab:
            return True

        # Split by spaces and common delimiters
        words = re.split(r'[\s\-\,\。\，\！\？\「\」\『\』\（\）\(\)]+', chinese_phrase.strip())

        for word in words:
            if not word:
                continue
            # Skip if it's a particle/function word
            if word in self.particles or word in self.function_words:
                continue
            # Skip single characters that might be grammatical
            if len(word) == 1 and word in self.function_words:
                continue
            # Check if word is in vocab
            if word not in available_vocab:
                return False

        return True

    def generate_phrases_for_lego(self, lego_data: Dict, scaffold: Dict, lego_id: str) -> List[List]:
        """
        Generate 10 practice phrases for a LEGO following 2-2-2-4 distribution
        Format: [english, chinese, null, lego_count]
        """
        phrases = []

        english_lego = lego_data['lego'][0]
        chinese_lego = lego_data['lego'][1]
        is_final = lego_data.get('is_final_lego', False)
        current_seed_earlier = lego_data.get('current_seed_earlier_legos', [])

        # Get available vocabulary
        available_vocab = self.get_all_available_vocab(scaffold, lego_id)

        # Get recent context for pattern building
        recent_context = scaffold.get('recent_context', {})
        seed_pair = scaffold.get('seed_pair', {})

        # Generate phrases with varying complexity
        # Group 1: Simple 1-2 LEGO phrases
        phrases.extend(self._generate_simple_phrases(
            english_lego, chinese_lego, current_seed_earlier,
            recent_context, available_vocab, count=2
        ))

        # Group 2: Medium 3 LEGO phrases
        phrases.extend(self._generate_medium_phrases(
            english_lego, chinese_lego, current_seed_earlier,
            recent_context, available_vocab, count=2
        ))

        # Group 3: Longer 4 LEGO phrases
        phrases.extend(self._generate_longer_phrases(
            english_lego, chinese_lego, current_seed_earlier,
            recent_context, available_vocab, count=2
        ))

        # Group 4: Longest 5+ LEGO phrases (include final seed sentence if final LEGO)
        if is_final:
            # Include the complete seed sentence as the final phrase
            known = seed_pair.get('known', '')
            target = seed_pair.get('target', '')
            phrases.append([known, target, None, self._count_legos_in_phrase(target)])

            # Add 3 more complex phrases
            phrases.extend(self._generate_longest_phrases(
                english_lego, chinese_lego, current_seed_earlier,
                recent_context, available_vocab, count=3
            ))
        else:
            phrases.extend(self._generate_longest_phrases(
                english_lego, chinese_lego, current_seed_earlier,
                recent_context, available_vocab, count=4
            ))

        # Ensure we have exactly 10 phrases
        phrases = phrases[:10]
        while len(phrases) < 10:
            phrases.append([english_lego, chinese_lego, None, 1])

        return phrases

    def _generate_simple_phrases(self, english: str, chinese: str,
                                 earlier_legos: List[Dict],
                                 recent_context: Dict,
                                 available_vocab: Set[str],
                                 count: int = 2) -> List[List]:
        """Generate simple 1-2 LEGO phrases"""
        phrases = []

        # First phrase: just the LEGO itself
        phrases.append([english, chinese, None, 1])

        if count > 1 and earlier_legos:
            # Second phrase: combine with an earlier LEGO
            earlier = earlier_legos[0]
            earlier_english = earlier.get('known', '')
            earlier_chinese = earlier.get('target', '')

            combined_english = f"{earlier_english} {english}"
            combined_chinese = f"{earlier_chinese} {chinese}"

            if self.validate_chinese_phrase(combined_chinese, available_vocab):
                phrases.append([combined_english, combined_chinese, None, 2])
            else:
                phrases.append([english, chinese, None, 1])

        return phrases[:count]

    def _generate_medium_phrases(self, english: str, chinese: str,
                                 earlier_legos: List[Dict],
                                 recent_context: Dict,
                                 available_vocab: Set[str],
                                 count: int = 2) -> List[List]:
        """Generate medium 3 LEGO phrases"""
        phrases = []

        # Use earlier LEGOs and recent context to build medium complexity
        if len(earlier_legos) >= 2:
            # Combine multiple earlier LEGOs
            first = earlier_legos[0]
            second = earlier_legos[1] if len(earlier_legos) > 1 else earlier_legos[0]

            combined_english = f"{first.get('known', '')} {second.get('known', '')} {english}"
            combined_chinese = f"{first.get('target', '')} {second.get('target', '')} {chinese}"

            if self.validate_chinese_phrase(combined_chinese, available_vocab):
                phrases.append([combined_english, combined_chinese, None, 3])

        # Alternative medium phrase from recent context
        if len(phrases) < count:
            # Try using a recent LEGO pattern
            for seed_id in list(recent_context.keys())[-3:]:
                seed_data = recent_context.get(seed_id, {})
                if 'new_legos' in seed_data and seed_data['new_legos']:
                    lego_info = seed_data['new_legos'][0]
                    recent_english = lego_info[1]
                    recent_chinese = lego_info[2]

                    combined_english = f"{recent_english} {english}"
                    combined_chinese = f"{recent_chinese} {chinese}"

                    if self.validate_chinese_phrase(combined_chinese, available_vocab):
                        phrases.append([combined_english, combined_chinese, None, 3])
                        break

        # Fallback
        while len(phrases) < count:
            phrases.append([english, chinese, None, 1])

        return phrases[:count]

    def _generate_longer_phrases(self, english: str, chinese: str,
                                 earlier_legos: List[Dict],
                                 recent_context: Dict,
                                 available_vocab: Set[str],
                                 count: int = 2) -> List[List]:
        """Generate longer 4 LEGO phrases"""
        phrases = []

        # Build 4+ LEGO combinations
        if len(earlier_legos) >= 3:
            lego_strs = [lego.get('known', '') for lego in earlier_legos[:3]]
            lego_strs.append(english)
            lego_strs_cn = [lego.get('target', '') for lego in earlier_legos[:3]]
            lego_strs_cn.append(chinese)

            combined_english = ' '.join(lego_strs)
            combined_chinese = ' '.join(lego_strs_cn)

            if self.validate_chinese_phrase(combined_chinese, available_vocab):
                phrases.append([combined_english, combined_chinese, None, 4])

        # Alternative: use recent context patterns
        if len(phrases) < count:
            recent_lego = list(recent_context.values())[0] if recent_context else None
            if recent_lego and 'new_legos' in recent_lego:
                for lego_info in recent_lego['new_legos'][:2]:
                    combined_english = f"{lego_info[1]} {english}"
                    combined_chinese = f"{lego_info[2]} {chinese}"

                    if len(earlier_legos) >= 1:
                        combined_english = f"{earlier_legos[0].get('known', '')} {combined_english}"
                        combined_chinese = f"{earlier_legos[0].get('target', '')} {combined_chinese}"

                    if self.validate_chinese_phrase(combined_chinese, available_vocab):
                        phrases.append([combined_english, combined_chinese, None, 4])
                        if len(phrases) >= count:
                            break

        # Fallback
        while len(phrases) < count:
            phrases.append([english, chinese, None, 2])

        return phrases[:count]

    def _generate_longest_phrases(self, english: str, chinese: str,
                                  earlier_legos: List[Dict],
                                  recent_context: Dict,
                                  available_vocab: Set[str],
                                  count: int = 4) -> List[List]:
        """Generate longest 5+ LEGO phrases"""
        phrases = []

        # Build complex phrases using all available earlier LEGOs
        if len(earlier_legos) >= 4:
            lego_strs = [lego.get('known', '') for lego in earlier_legos]
            lego_strs.append(english)
            lego_strs_cn = [lego.get('target', '') for lego in earlier_legos]
            lego_strs_cn.append(chinese)

            combined_english = ' '.join(lego_strs)
            combined_chinese = ' '.join(lego_strs_cn)

            if self.validate_chinese_phrase(combined_chinese, available_vocab):
                phrases.append([combined_english, combined_chinese, None,
                               len(earlier_legos) + 1])

        # Add variations with different earlier LEGO combinations
        for i in range(min(len(earlier_legos), 3)):
            lego_subset = earlier_legos[i:min(i+3, len(earlier_legos))]
            if lego_subset:
                lego_strs = [lego.get('known', '') for lego in lego_subset]
                lego_strs.append(english)
                lego_strs_cn = [lego.get('target', '') for lego in lego_subset]
                lego_strs_cn.append(chinese)

                combined_english = ' '.join(lego_strs)
                combined_chinese = ' '.join(lego_strs_cn)

                if (self.validate_chinese_phrase(combined_chinese, available_vocab) and
                    [combined_english, combined_chinese, None, len(lego_subset) + 1] not in phrases):
                    phrases.append([combined_english, combined_chinese, None,
                                   len(lego_subset) + 1])

                if len(phrases) >= count:
                    break

        # Fallback with recent context
        while len(phrases) < count:
            recent_seeds = list(recent_context.values())
            if recent_seeds:
                seed_data = recent_seeds[-1]
                if 'new_legos' in seed_data and seed_data['new_legos']:
                    for lego_info in seed_data['new_legos'][-2:]:
                        combined_english = f"{lego_info[1]} {english}"
                        combined_chinese = f"{lego_info[2]} {chinese}"
                        phrases.append([combined_english, combined_chinese, None, 3])
                        if len(phrases) >= count:
                            break

            if len(phrases) < count:
                phrases.append([english, chinese, None, 2])

        return phrases[:count]

    def _count_legos_in_phrase(self, chinese_phrase: str) -> int:
        """Count approximate number of LEGOs in a phrase"""
        # Simple heuristic: count spaces + 1
        words = chinese_phrase.split()
        return len([w for w in words if w and w not in self.particles])

    def process_seed(self, seed_id: str, scaffold_path: str, output_dir: str) -> bool:
        """Process a single seed scaffold and generate output"""
        try:
            # Load scaffold
            scaffold = self.load_scaffold(scaffold_path)

            # Process each LEGO
            for lego_id, lego_data in scaffold['legos'].items():
                if 'practice_phrases' in lego_data:
                    # Generate phrases
                    phrases = self.generate_phrases_for_lego(lego_data, scaffold, lego_id)
                    # Update the scaffold with generated phrases
                    lego_data['practice_phrases'] = phrases

            # Update generation stage
            scaffold['generation_stage'] = 'PHRASE_GENERATION_COMPLETE'

            # Write output
            output_filename = f"seed_{seed_id.lower()}.json"
            output_path = os.path.join(output_dir, output_filename)

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            return True
        except Exception as e:
            print(f"Error processing {seed_id}: {e}")
            return False

def main():
    """Main entry point"""
    # Directories
    scaffold_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_scaffolds/"
    output_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/phase5_outputs/"

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Initialize generator
    generator = ChinesePhraseGenerator()

    # Process seeds S0111-S0120
    seeds = [f"S{i:04d}" for i in range(111, 121)]

    successful = 0
    failed = 0

    for seed_id in seeds:
        scaffold_filename = f"seed_{seed_id.lower()}.json"
        scaffold_path = os.path.join(scaffold_dir, scaffold_filename)

        if os.path.exists(scaffold_path):
            print(f"Processing {seed_id}...", end=" ")
            if generator.process_seed(seed_id, scaffold_path, output_dir):
                print("✓ COMPLETE")
                successful += 1
            else:
                print("✗ FAILED")
                failed += 1
        else:
            print(f"Skipping {seed_id} - scaffold not found")

    print(f"\n{'='*50}")
    print(f"Generation complete!")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Output directory: {output_dir}")

if __name__ == "__main__":
    main()
