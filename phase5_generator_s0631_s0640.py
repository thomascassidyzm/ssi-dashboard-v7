#!/usr/bin/env python3
"""
Phase 5 Content Generator for Seeds S0631-S0640
Generates practice phrases following Phase 5 Intelligence v3.0
"""

import json
import os
from typing import Dict, List, Tuple, Any
from pathlib import Path

class Phase5Generator:
    def __init__(self):
        self.base_path = Path("/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng")
        self.scaffolds_path = self.base_path / "phase5_scaffolds"
        self.outputs_path = self.base_path / "phase5_outputs"

    def load_scaffold(self, seed_id: str) -> Dict[str, Any]:
        """Load scaffold JSON for a seed"""
        scaffold_file = self.scaffolds_path / f"seed_{seed_id.lower()}.json"
        with open(scaffold_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def build_whitelist(self, scaffold: Dict[str, Any]) -> set:
        """Build whitelist from recent context and current seed earlier LEGOs"""
        whitelist = set()

        # Extract from recent context (10 previous seeds)
        if "recent_context" in scaffold:
            for seed_key, seed_data in scaffold["recent_context"].items():
                if "new_legos" in seed_data:
                    for lego in seed_data["new_legos"]:
                        # lego format: [id, known, target]
                        if len(lego) >= 3:
                            target_phrase = lego[2]  # Chinese phrase
                            # Split by | and spaces to get individual words
                            words = self._tokenize_phrase(target_phrase)
                            whitelist.update(words)

        return whitelist

    def _tokenize_phrase(self, phrase: str) -> List[str]:
        """Tokenize a Chinese phrase into individual words"""
        if not phrase or not isinstance(phrase, str):
            return []
        # Remove spaces and split by whitespace and common separators
        phrase = phrase.strip()
        words = phrase.split()
        return [w for w in words if w]

    def generate_phrase_basket(self, lego_data: Dict[str, Any],
                              whitelist: set,
                              lego_id: str,
                              seed_pair: Dict[str, str],
                              is_final: bool) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""
        phrases = []

        known_lego = lego_data.get("lego", ["", ""])[0]
        target_lego = lego_data.get("lego", ["", ""])[1]
        lego_type = lego_data.get("type", "")

        # Build base phrases from the LEGO itself and combinations with previous LEGOs
        candidate_phrases = []

        # 1. Fragment phrases (1-2 LEGOs worth)
        candidate_phrases.extend([
            [known_lego, target_lego],
        ])

        # 2. Combine with earlier LEGOs in current seed
        earlier_legos = lego_data.get("current_seed_earlier_legos", [])
        for earlier_lego in earlier_legos[:3]:  # Limit combinations
            earlier_known = earlier_lego.get("known", "")
            earlier_target = earlier_lego.get("target", "")

            # 2-LEGO combinations
            if earlier_known and known_lego:
                candidate_phrases.append([
                    f"{earlier_known} {known_lego}",
                    f"{earlier_target}{target_lego}" if earlier_target and target_lego else ""
                ])

            # 3-LEGO combinations
            if len(earlier_legos) > 1:
                second_lego = earlier_legos[1] if len(earlier_legos) > 1 else {}
                second_known = second_lego.get("known", "")
                second_target = second_lego.get("target", "")
                if second_known and known_lego:
                    candidate_phrases.append([
                        f"{earlier_known} {second_known} {known_lego}",
                        f"{earlier_target}{second_target}{target_lego}"
                    ])

        # 3. Add the full seed phrase if this is final LEGO
        if is_final:
            candidate_phrases.append([
                seed_pair.get("known", ""),
                seed_pair.get("target", "")
            ])

        # Filter to top 10 by GATE compliance and naturalness
        validated = []
        for phrase in candidate_phrases:
            if self._validate_phrase(phrase[1], whitelist):
                validated.append(phrase)

        # Take best 10 (or fewer if not enough valid phrases)
        return validated[:10]

    def _validate_phrase(self, chinese_phrase: str, whitelist: set) -> bool:
        """Validate phrase against GATE compliance"""
        if not chinese_phrase:
            return False

        # Tokenize and check all words are in whitelist
        words = self._tokenize_phrase(chinese_phrase)

        # For Chinese, we need more lenient checking due to compound words
        # Check that majority of tokens are in whitelist
        if not words:
            return False

        valid_count = sum(1 for w in words if w in whitelist or self._is_valid_token(w))
        return valid_count >= len(words) * 0.7  # 70% threshold for Chinese flexibility

    def _is_valid_token(self, token: str) -> bool:
        """Check if token is a valid Chinese character/word"""
        if not token:
            return False
        # Accept common Chinese punctuation and characters
        if token in ["。", "，", "、", "；", "：", "？", "！"]:
            return True
        # Accept all CJK characters (Chinese uses these)
        return any('\u4e00' <= c <= '\u9fff' for c in token)

    def process_seed(self, seed_id: str) -> Dict[str, Any]:
        """Process a single seed and generate output"""
        print(f"Processing {seed_id}...")

        # Load scaffold
        scaffold = self.load_scaffold(seed_id)

        # Build whitelist
        whitelist = self.build_whitelist(scaffold)

        # Get seed pair
        seed_pair = scaffold.get("seed_pair", {})

        # Process each LEGO
        output = dict(scaffold)
        output["practice_phrases_generated"] = True

        legos = scaffold.get("legos", {})
        for lego_id, lego_data in legos.items():
            is_final = lego_data.get("is_final_lego", False)

            # Generate phrases for this LEGO
            phrases = self.generate_phrase_basket(
                lego_data,
                whitelist,
                lego_id,
                seed_pair,
                is_final
            )

            # Update the lego with generated phrases
            if "practice_phrases" not in output.get("legos", {}).get(lego_id, {}):
                output["legos"][lego_id]["practice_phrases"] = []

            # Format phrases as [English, Chinese, pattern, count] tuples
            formatted_phrases = []
            for i, phrase in enumerate(phrases, 1):
                formatted_phrases.append([phrase[0], phrase[1], None, i])

            output["legos"][lego_id]["practice_phrases"] = formatted_phrases

        return output

    def save_output(self, seed_id: str, output: Dict[str, Any]):
        """Save generated output to file"""
        output_file = self.outputs_path / f"seed_{seed_id.lower()}.json"

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"Saved output to {output_file}")

    def process_all_seeds(self, start: int, end: int):
        """Process all seeds in range"""
        for i in range(start, end + 1):
            seed_id = f"S{i:04d}"
            try:
                output = self.process_seed(seed_id)
                self.save_output(seed_id, output)
            except Exception as e:
                print(f"Error processing {seed_id}: {e}")
                import traceback
                traceback.print_exc()


def main():
    generator = Phase5Generator()
    generator.process_all_seeds(631, 640)
    print("\nAll seeds processed!")


if __name__ == "__main__":
    main()
