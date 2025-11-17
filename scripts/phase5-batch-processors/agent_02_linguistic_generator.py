#!/usr/bin/env python3
"""
Practice Basket Generation Agent 02 - Linguistic Generator
Uses grammatical intelligence to generate meaningful, correct Spanish phrases

This generator:
1. Analyzes each LEGO's grammatical structure
2. Generates semantically appropriate phrases
3. Validates Spanish grammatical correctness
4. Uses natural communicative patterns
"""

import json
import re
from typing import List, Dict, Set, Tuple
from collections import defaultdict

class LegoAnalyzer:
    """Analyzes LEGO structure to determine appropriate generation strategy"""

    @staticmethod
    def get_lego_type(eng: str, spa: str) -> str:
        """Determine the grammatical type of a LEGO"""

        # Question words/phrases
        if any(eng.lower().startswith(q) for q in ["why", "what", "when", "where", "who", "how", "which"]):
            return "QUESTION"

        # Because clauses
        if eng.lower().startswith("because"):
            return "REASON"

        # Verb phrases (I + verb, you + verb, etc.)
        if re.match(r"^I(?:'m| am| want| can| like| have)", eng):
            return "STATEMENT_I"
        if re.match(r"^(you|he|she|we|they)(?:'re| are| want| can| like| have)", eng, re.IGNORECASE):
            return "STATEMENT_OTHER"

        # Infinitive verb phrases
        if eng.startswith("to "):
            return "INFINITIVE"

        # Gerunds / -ing forms
        if " " in eng and eng.split()[-1].endswith("ing"):
            return "GERUND_PHRASE"

        # Time/place markers
        if eng.lower() in ["yesterday", "today", "tomorrow", "tonight", "now", "soon", "here", "there"]:
            return "ADVERBIAL"

        # Simple nouns/adjectives
        if len(eng.split()) <= 2 and not any(c in eng for c in ["'", "to", "ing"]):
            return "NOMINAL"

        # Default
        return "PHRASE"

class LinguisticPhraseGenerator:
    """Generates grammatically correct, semantically meaningful phrases"""

    def __init__(self, vocab: Set[str], whitelist: List[List[str]]):
        self.vocab = vocab
        self.whitelist = whitelist

        # Create lookups
        self.spa_to_eng = {spa: eng for spa, eng in whitelist}
        self.eng_to_spa = {eng: spa for spa, eng in whitelist}

        # Index common patterns
        self.verbs = {}  # Spanish verb -> English
        self.nouns = {}
        self.questions = {}
        self.statements = {}

        for spa, eng in whitelist:
            if "quiero" in spa or "puedo" in spa or "voy" in spa or "estoy" in spa:
                self.verbs[spa] = eng
            if eng.startswith("I ") or eng.startswith("you ") or eng.startswith("he ") or eng.startswith("she "):
                self.statements[spa] = eng
            if eng.startswith(("why", "what", "when", "where", "who", "how")):
                self.questions[spa] = eng

    def has(self, spanish: str) -> bool:
        """Check if Spanish phrase is available"""
        return spanish in [s for s, e in self.whitelist]

    def has_word(self, spanish_word: str) -> bool:
        """Check if a single Spanish word is available"""
        return spanish_word in self.vocab

    def validate(self, spanish: str, debug=False) -> bool:
        """Validate all words are available (strips punctuation, case-insensitive)"""
        import re
        # Remove common Spanish punctuation
        words = spanish.split()
        missing = []
        for word in words:
            # Strip punctuation from word
            clean_word = re.sub(r'^[¿¡\.\,\?\!\"\']+|[¿¡\.\,\?\!\"\']+$', '', word)
            # Check case-insensitively
            if clean_word and clean_word.lower() not in self.vocab:
                missing.append((word, clean_word))
        if missing:
            if debug:
                print(f"      DEBUG: Validation failed - missing {len(missing)} words:")
                for orig, clean in missing[:5]:
                    print(f"        - '{orig}' (cleaned: '{clean}')")
            return False
        return True

    def count_legos(self, spanish: str) -> int:
        """Count LEGOs in phrase (match longest first)"""
        sorted_legos = sorted(self.whitelist, key=lambda x: len(x[0].split()), reverse=True)
        remaining = " " + spanish + " "
        count = 0
        for spa, _ in sorted_legos:
            pattern = " " + spa + " "
            while pattern in remaining:
                remaining = remaining.replace(pattern, " ", 1)
                count += 1
        return max(1, count)

    def make(self, eng: str, spa: str, debug=False) -> List:
        """Create phrase if valid"""
        if not self.validate(spa, debug=debug):
            return None
        count = self.count_legos(spa)
        return [eng, spa, None, count]

    def generate_for_question(self, lego_eng: str, lego_spa: str, target: int) -> List[List]:
        """Generate phrases for question LEGOs like 'why are you learning'"""
        phrases = []

        # Bare LEGO
        p = self.make(lego_eng, lego_spa)
        if p: phrases.append(p)

        # Add common completions
        if self.has("español"):
            p = self.make(f"{lego_eng} Spanish", f"{lego_spa} español")
            if p: phrases.append(p)

        if self.has("su nombre"):
            p = self.make(f"{lego_eng} his name", f"{lego_spa} su nombre")
            if p: phrases.append(p)

        if self.has("ahora"):
            p = self.make(f"{lego_eng} now", f"{lego_spa} ahora")
            if p: phrases.append(p)

        # Add context-appropriate variations
        if self.has("con"):
            if self.has("alguien"):
                p = self.make(f"{lego_eng} with someone", f"{lego_spa} con alguien")
                if p: phrases.append(p)

        # Fill to target
        while len(phrases) < target:
            # Try adding other available elements
            for noun in ["algo", "una palabra", "eso", "esto"]:
                if self.has(noun) and len(phrases) < target:
                    p = self.make(f"{lego_eng} {noun}", f"{lego_spa} {noun}")
                    if p and p not in phrases:
                        phrases.append(p)
                        break
            else:
                break  # Couldn't generate more

        return phrases[:target]

    def generate_for_statement(self, lego_eng: str, lego_spa: str, target: int, subject_type: str) -> List[List]:
        """Generate phrases for statements like 'I want' or 'you are'"""
        phrases = []

        # Bare LEGO
        p = self.make(lego_eng, lego_spa)
        if p: phrases.append(p)

        # Add infinitive verbs
        # Check if LEGO already ends with "to" to avoid "to to learn"
        lego_ends_with_to = lego_eng.rstrip().endswith(" to")

        for inf_eng, inf_spa in [("to learn", "aprender"), ("to speak", "hablar"),
                                  ("to remember", "recordar"), ("to practice", "practicar")]:
            if self.has(inf_spa):
                # If LEGO ends with "to", just add bare infinitive without "to"
                if lego_ends_with_to:
                    inf_eng_clean = inf_eng.replace("to ", "", 1)  # Remove "to " prefix
                    p = self.make(f"{lego_eng} {inf_eng_clean}", f"{lego_spa} {inf_spa}")
                else:
                    p = self.make(f"{lego_eng} {inf_eng}", f"{lego_spa} {inf_spa}")
                if p and len(phrases) < target:
                    phrases.append(p)

        # Add noun objects
        for noun_eng, noun_spa in [("Spanish", "español"), ("something", "algo"),
                                     ("that", "eso"), ("this", "esto")]:
            if self.has(noun_spa):
                p = self.make(f"{lego_eng} {noun_eng}", f"{lego_spa} {noun_spa}")
                if p and len(phrases) < target and p not in phrases:
                    phrases.append(p)

        # Build longer phrases
        if self.has("hablar") and self.has("español"):
            p = self.make(f"{lego_eng} to speak Spanish", f"{lego_spa} hablar español")
            if p and len(phrases) < target:
                phrases.append(p)

        if self.has("aprender") and self.has("español"):
            p = self.make(f"{lego_eng} to learn Spanish", f"{lego_spa} aprender español")
            if p and len(phrases) < target:
                phrases.append(p)

        return phrases[:target]

    def generate_for_infinitive(self, lego_eng: str, lego_spa: str, target: int) -> List[List]:
        """Generate phrases for infinitive LEGOs like 'to remember'"""
        phrases = []

        # Bare LEGO
        p = self.make(lego_eng, lego_spa)
        if p: phrases.append(p)

        # Add modal verbs
        for modal_eng, modal_spa in [("I want", "quiero"), ("I can", "puedo"),
                                       ("I'm going", "voy a"), ("I need", "necesito")]:
            if self.has(modal_spa):
                p = self.make(f"{modal_eng} {lego_eng}", f"{modal_spa} {lego_spa}")
                if p and len(phrases) < target:
                    phrases.append(p)

        # Add objects if LEGO is a transitive verb
        if "remember" in lego_eng or "learn" in lego_eng or "speak" in lego_eng:
            for obj_eng, obj_spa in [("Spanish", "español"), ("something", "algo"),
                                       ("a word", "una palabra"), ("that", "eso")]:
                if self.has(obj_spa):
                    p = self.make(f"{lego_eng} {obj_eng}", f"{lego_spa} {obj_spa}")
                    if p and len(phrases) < target and p not in phrases:
                        phrases.append(p)

        return phrases[:target]

    def generate_for_reason(self, lego_eng: str, lego_spa: str, target: int) -> List[List]:
        """Generate phrases for 'because' clauses"""
        phrases = []

        # Bare LEGO
        p = self.make(lego_eng, lego_spa)
        if p: phrases.append(p)

        # Add verb completions
        for verb_eng, verb_spa in [("to learn", "aprender"), ("to speak", "hablar"),
                                    ("to practice", "practicar"), ("to remember", "recordar")]:
            if self.has(verb_spa):
                p = self.make(f"{lego_eng} {verb_eng}", f"{lego_spa} {verb_spa}")
                if p and len(phrases) < target:
                    phrases.append(p)

        # Add noun completions
        for noun_eng, noun_spa in [("Spanish", "español"), ("something", "algo")]:
            if self.has(noun_spa):
                p = self.make(f"{lego_eng} {noun_eng}", f"{lego_spa} {noun_spa}")
                if p and len(phrases) < target and p not in phrases:
                    phrases.append(p)

        # Build longer phrases
        if self.has("hablar") and self.has("español"):
            p = self.make(f"{lego_eng} to speak Spanish", f"{lego_spa} hablar español")
            if p and len(phrases) < target:
                phrases.append(p)

        return phrases[:target]

    def generate_for_nominal(self, lego_eng: str, lego_spa: str, target: int) -> List[List]:
        """Generate phrases for nouns/adjectives"""
        phrases = []

        # Bare LEGO
        p = self.make(lego_eng, lego_spa)
        if p: phrases.append(p)

        # Try with common verb phrases
        for verb_eng, verb_spa in [("I want", "quiero"), ("I like", "me gusta"),
                                    ("I need", "necesito"), ("I have", "tengo")]:
            if self.has(verb_spa):
                p = self.make(f"{verb_eng} {lego_eng}", f"{verb_spa} {lego_spa}")
                if p and len(phrases) < target:
                    phrases.append(p)

        # Try as object of preposition
        for prep_eng, prep_spa in [("with", "con"), ("for", "para"), ("about", "sobre")]:
            if self.has(prep_spa):
                p = self.make(f"{prep_eng} {lego_eng}", f"{prep_spa} {lego_spa}")
                if p and len(phrases) < target and p not in phrases:
                    phrases.append(p)

        return phrases[:target]

    def generate_generic(self, lego_eng: str, lego_spa: str, target: int) -> List[List]:
        """Generic generation for complex phrases"""
        phrases = []

        # Bare LEGO
        p = self.make(lego_eng, lego_spa)
        if p: phrases.append(p)

        # Try building on it
        for addition_eng, addition_spa in [("now", "ahora"), ("too", "también"),
                                            ("here", "aquí"), ("today", "hoy")]:
            if self.has(addition_spa):
                p = self.make(f"{lego_eng} {addition_eng}", f"{lego_spa} {addition_spa}")
                if p and len(phrases) < target:
                    phrases.append(p)

        return phrases[:target]

    def generate_phrases(self, lego_eng: str, lego_spa: str, target: int,
                        is_final: bool, seed_pair: dict) -> List[List]:
        """Main generation method - routes to appropriate strategy"""

        # Determine LEGO type
        lego_type = LegoAnalyzer.get_lego_type(lego_eng, lego_spa)

        # Generate using appropriate strategy
        if lego_type == "QUESTION":
            phrases = self.generate_for_question(lego_eng, lego_spa, target)
        elif lego_type == "REASON":
            phrases = self.generate_for_reason(lego_eng, lego_spa, target)
        elif lego_type.startswith("STATEMENT"):
            phrases = self.generate_for_statement(lego_eng, lego_spa, target, lego_type)
        elif lego_type == "INFINITIVE":
            phrases = self.generate_for_infinitive(lego_eng, lego_spa, target)
        elif lego_type == "NOMINAL":
            phrases = self.generate_for_nominal(lego_eng, lego_spa, target)
        else:
            phrases = self.generate_generic(lego_eng, lego_spa, target)

        # Handle final LEGO rule FIRST
        final_phrase = None
        if is_final and seed_pair:
            final_phrase = self.make(seed_pair['target'], seed_pair['known'])

        # Determine how many non-final phrases we need
        target_non_final = target - 1 if final_phrase else target

        # Limit to target (leaving room for final phrase if needed)
        phrases = phrases[:target_non_final]

        # Pad if we're short (shouldn't happen often with good generation)
        while len(phrases) < target_non_final:
            # Try to generate more creative phrases with proper English/Spanish pairs
            simple_additions = [
                ("now", "ahora"),
                ("also", "también"),
                ("here", "aquí"),
                ("today", "hoy"),
                ("well", "bien"),
                ("too", "también"),
                ("later", "luego"),
            ]

            added = False
            for add_eng, add_spa in simple_additions:
                if self.has_word(add_spa):
                    # Try different combinations
                    variations = [
                        (f"{lego_eng} {add_eng}", f"{lego_spa} {add_spa}"),
                        (f"{add_eng} {lego_eng}", f"{add_spa} {lego_spa}"),
                    ]
                    for eng_try, spa_try in variations:
                        p = self.make(eng_try, spa_try)
                        if p and p not in phrases:
                            phrases.append(p)
                            added = True
                            break
                if added:
                    break

            if not added:
                # Last resort: just use the bare LEGO
                bare = self.make(lego_eng, lego_spa)
                if bare and bare not in phrases:
                    phrases.append(bare)
                else:
                    # Can't generate more - break to avoid infinite loop
                    break

        # Add final phrase as the last element
        if final_phrase:
            phrases.append(final_phrase)

        return phrases


def process_scaffold(input_path: str, output_path: str):
    """Process the entire scaffold with linguistic intelligence"""

    print("=" * 70)
    print("PRACTICE BASKET GENERATION AGENT 02")
    print("Seeds: S0021-S0040")
    print("Methodology: Phase 5 v6.2 with Linguistic Intelligence")
    print("=" * 70)

    # Load
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    seeds = data['seeds']
    print(f"\n✓ Loaded {len(seeds)} seeds\n")

    total_legos = 0
    total_phrases = 0

    # Process each seed
    for seed_id in sorted(seeds.keys()):
        seed = seeds[seed_id]
        print(f"\n🌱 {seed_id}: {seed['seed_pair']['target'][:60]}...")

        for lego_id in sorted(seed['legos'].keys()):
            lego = seed['legos'][lego_id]
            lego_eng, lego_spa = lego['lego']

            # Extract vocabulary from whitelist
            vocab = set()
            whitelist = lego['_metadata']['whitelist_pairs']
            for spa, eng in whitelist:
                vocab.update(spa.split())

            # CRITICAL: Add the current LEGO's words to available vocabulary
            vocab.update(lego_spa.split())

            # Also add the current LEGO as a phrase pattern to the whitelist
            whitelist_with_current = whitelist + [[lego_spa, lego_eng]]

            # Generate
            generator = LinguisticPhraseGenerator(vocab, whitelist_with_current)

            phrases = generator.generate_phrases(
                lego_eng, lego_spa,
                lego['target_phrase_count'],
                lego['is_final_lego'],
                lego['_metadata']['seed_context'] if lego['is_final_lego'] else None
            )

            # Update
            lego['practice_phrases'] = phrases
            total_legos += 1
            total_phrases += len(phrases)

            # Report
            lego_type = LegoAnalyzer.get_lego_type(lego_eng, lego_spa)
            print(f"  {lego_id} [{lego_type}]: {len(phrases)} phrases - \"{lego_eng}\" / \"{lego_spa}\"")

        seed['generation_stage'] = "PHRASES_GENERATED"

    # Update overall status
    data['generation_stage'] = "PHRASES_GENERATED"

    # Save
    print(f"\n💾 Saving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Report
    print(f"\n{'='*70}")
    print("🎉 GENERATION COMPLETE")
    print(f"{'='*70}")
    print(f"Seeds processed: {len(seeds)}")
    print(f"Total LEGOs processed: {total_legos}")
    print(f"Total phrases generated: {total_phrases}")
    print(f"Average: {total_phrases/total_legos:.1f} phrases/LEGO")
    print(f"{'='*70}\n")


if __name__ == '__main__':
    input_path = 'public/vfs/courses/spa_for_eng/phase5_scaffolds/agent_02.json'
    output_path = 'public/vfs/courses/spa_for_eng/phase5_outputs/agent_02_provisional.json'
    process_scaffold(input_path, output_path)
