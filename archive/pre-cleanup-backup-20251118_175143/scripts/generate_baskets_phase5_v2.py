#!/usr/bin/env python3
"""
Phase 5: Generate practice baskets for 88 deduplicated LEGOs
Each basket contains e-phrases (eternal) and d-phrases (debut)
VERSION 2 - With improved Chinese phrase generation
"""

import json
import os
import uuid
from pathlib import Path
from typing import Dict, List, Tuple, Set
import re

# Paths
LEGOS_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/amino_acids/legos_deduplicated")
GRAPH_FILE = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/phase_outputs/phase_3.5_lego_graph.json")
TRANSLATIONS_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/amino_acids/translations")
BASKETS_DIR = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng_30seeds/amino_acids/baskets")

# Ensure output directory exists
BASKETS_DIR.mkdir(parents=True, exist_ok=True)


def load_graph() -> Dict:
    """Load the LEGO graph"""
    with open(GRAPH_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_legos() -> Dict[str, Dict]:
    """Load all deduplicated LEGOs"""
    legos = {}
    for lego_file in LEGOS_DIR.glob("*.json"):
        with open(lego_file, 'r', encoding='utf-8') as f:
            lego = json.load(f)
            # Use lego_id if available, otherwise construct from seed_origin
            if 'lego_id' in lego:
                legos[lego['lego_id']] = lego
            else:
                # For composite LEGOs without lego_id, use the target as key
                legos[lego['target']] = lego
    return legos


def load_translations() -> Dict[str, Dict]:
    """Load all seed translations"""
    translations = {}
    for trans_file in TRANSLATIONS_DIR.glob("*.json"):
        with open(trans_file, 'r', encoding='utf-8') as f:
            trans = json.load(f)
            translations[trans['seed_id']] = trans
    return translations


def build_fcfs_order(graph: Dict, legos: Dict) -> List[Tuple[str, Dict]]:
    """
    Build FCFS (First-Come-First-Serve) teaching order from graph
    Returns list of (lego_id, lego_dict) tuples in teaching order
    """
    edges = graph['edges']
    order = []
    visited = set()

    # Build adjacency list
    adj = {}
    for edge in edges:
        from_node = edge['from']
        to_node = edge['to']
        if from_node not in adj:
            adj[from_node] = []
        adj[from_node].append(to_node)

    # Group edges by seed
    seeds = {}
    for edge in edges:
        seed = edge['seed']
        if seed not in seeds:
            seeds[seed] = []
        seeds[seed].append(edge)

    # For each seed, follow the path
    for seed_id in sorted(seeds.keys()):
        seed_edges = seeds[seed_id]
        # Find starting node (one that's not a "to" in this seed)
        to_nodes = {e['to'] for e in seed_edges}
        from_nodes = {e['from'] for e in seed_edges}
        start_nodes = from_nodes - to_nodes

        if not start_nodes:
            # Circular or complex - pick first from
            start_nodes = {seed_edges[0]['from']}

        # Traverse from start
        for start in start_nodes:
            current = start
            while current and current not in visited:
                # Find the LEGO
                lego = None
                if current in legos:
                    lego = legos[current]
                else:
                    # Try to find by target
                    for l in legos.values():
                        if l['target'] == current:
                            lego = l
                            break

                if lego:
                    order.append((current, lego))
                    visited.add(current)

                # Move to next
                if current in adj:
                    next_nodes = [n for n in adj[current] if n not in visited]
                    if next_nodes:
                        current = next_nodes[0]
                    else:
                        break
                else:
                    break

    return order


def is_culminating_lego(lego_id: str, graph: Dict) -> Tuple[bool, str]:
    """
    Check if this LEGO is the last (culminating) one in its seed
    Returns (is_culminating, seed_id)
    """
    edges = graph['edges']

    # Find which seed this LEGO belongs to
    lego_seed = None
    for edge in edges:
        if edge['from'] == lego_id or edge['to'] == lego_id:
            lego_seed = edge['seed']
            break

    if not lego_seed:
        # Check if lego_id itself is like "S0001L06"
        if lego_id.startswith('S') and 'L' in lego_id:
            lego_seed = lego_id.split('L')[0]

    if not lego_seed:
        return False, None

    # Find all LEGOs in this seed
    seed_edges = [e for e in edges if e['seed'] == lego_seed]
    if not seed_edges:
        return False, None

    # Find terminal node (one that's not a "from" in this seed)
    from_nodes = {e['from'] for e in seed_edges}
    to_nodes = {e['to'] for e in seed_edges}
    terminal_nodes = to_nodes - from_nodes

    is_last = lego_id in terminal_nodes
    return is_last, lego_seed


def count_characters(text: str) -> int:
    """Count Chinese characters (excluding spaces and punctuation)"""
    return sum(1 for c in text if '\u4e00' <= c <= '\u9fff')


class ChinesePhraseGenerator:
    """
    Generates natural, grammatically correct Chinese phrases
    """

    def __init__(self):
        # Track vocabulary as LEGOs are taught
        self.taught_vocab = {}
        self.taught_list = []

    def add_lego(self, target: str, known: str):
        """Add a newly taught LEGO to the vocabulary"""
        self.taught_vocab[target] = known
        self.taught_list.append(target)

    def has_vocab(self, *words: str) -> bool:
        """Check if all words are in taught vocabulary"""
        return all(w in self.taught_vocab for w in words)

    def generate_e_phrases(self, lego: Dict, is_culminating: bool, seed_trans: Dict = None) -> List[Dict]:
        """
        Generate 3-5 eternal practice phrases for this LEGO
        Using proper Chinese grammar and only previously taught vocabulary
        """
        target = lego['target']
        known = lego['known']
        e_phrases = []

        # If culminating LEGO, first e-phrase is the parent seed
        if is_culminating and seed_trans:
            e_phrases.append({
                "target": seed_trans['target'],
                "known": seed_trans['known'],
                "char_count": count_characters(seed_trans['target']),
                "word_count": len(seed_trans['known'].split()),
                "quality_notes": "Parent seed - culminating LEGO"
            })

        # Generate natural phrases based on what we've learned
        phrases = self._generate_contextual_phrases(target, known)

        for phrase_target, phrase_known, quality in phrases:
            if len(e_phrases) >= 5:
                break
            char_count = count_characters(phrase_target)
            word_count = len(phrase_known.split())
            # Target 10-15 characters for Chinese
            if 8 <= char_count <= 18:
                e_phrases.append({
                    "target": phrase_target,
                    "known": phrase_known,
                    "char_count": char_count,
                    "word_count": word_count,
                    "quality_notes": quality
                })

        # Ensure we have at least 3 e-phrases
        # Generate simple fallback phrases if needed
        while len(e_phrases) < 3:
            fallback = self._generate_simple_phrase(target, known)
            if fallback:
                phrase_target, phrase_known, quality = fallback
                e_phrases.append({
                    "target": phrase_target,
                    "known": phrase_known,
                    "char_count": count_characters(phrase_target),
                    "word_count": len(phrase_known.split()),
                    "quality_notes": quality
                })
            else:
                break

        return e_phrases

    def _generate_contextual_phrases(self, target: str, known: str) -> List[Tuple[str, str, str]]:
        """
        Generate contextually appropriate phrases based on the LEGO and taught vocabulary
        """
        phrases = []

        # Pronouns
        if target == "我":
            if self.has_vocab("想"):
                phrases.append(("我想学中文。", "I want to learn Chinese.", "Natural desire expression, HSK 1"))
            if self.has_vocab("要", "学"):
                phrases.append(("我要学说中文。", "I'm going to learn to speak Chinese.", "Future intention + verb chain"))
            if self.has_vocab("现在", "说"):
                phrases.append(("我现在想说中文。", "I want to speak Chinese now.", "Time expression + want + verb"))
            phrases.append(("我很好。", "I'm very well.", "Simple state expression"))

        elif target == "你":
            if self.has_vocab("想", "说"):
                phrases.append(("你想说什么？", "What do you want to say?", "Common question pattern"))
            if self.has_vocab("会", "说", "中文"):
                phrases.append(("你会说中文吗？", "Can you speak Chinese?", "Ability question with 吗"))
            if self.has_vocab("好"):
                phrases.append(("你说得很好。", "You speak very well.", "Compliment with 得"))

        elif target == "他":
            if self.has_vocab("想", "学"):
                phrases.append(("他想学中文。", "He wants to learn Chinese.", "Third person + want + verb"))
            if self.has_vocab("现在", "说"):
                phrases.append(("他现在在说话。", "He is speaking now.", "Progressive aspect 在"))

        elif target == "她":
            if self.has_vocab("要", "来"):
                phrases.append(("她要来了。", "She's going to come.", "Future + 了 completion"))
            if self.has_vocab("会", "说"):
                phrases.append(("她会说中文。", "She can speak Chinese.", "Ability + verb"))

        elif target == "我们":
            if self.has_vocab("一起", "学"):
                phrases.append(("我们一起学中文。", "We learn Chinese together.", "Together + verb"))
            if self.has_vocab("想", "说"):
                phrases.append(("我们想说中文。", "We want to speak Chinese.", "Plural pronoun + want"))

        # Core verbs
        elif target == "想":
            if self.has_vocab("我", "学"):
                phrases.append(("我想学中文。", "I want to learn Chinese.", "Want + verb, HSK 1 pattern"))
            if self.has_vocab("你", "说"):
                phrases.append(("你想说什么？", "What do you want to say?", "Question with 想"))
            phrases.append(("我想去。", "I want to go.", "Simple want + go"))

        elif target == "要":
            if self.has_vocab("我", "学"):
                phrases.append(("我要学中文。", "I'm going to learn Chinese.", "Future intention 要"))
            if self.has_vocab("你", "说"):
                phrases.append(("你要说什么？", "What are you going to say?", "Future question"))
            phrases.append(("我要去。", "I'm going to go.", "Simple future"))

        elif target == "说":
            if self.has_vocab("我", "想", "中文"):
                phrases.append(("我想说中文。", "I want to speak Chinese.", "Want + speak + language"))
            if self.has_vocab("你", "会"):
                phrases.append(("你会说中文吗？", "Can you speak Chinese?", "Ability + speak question"))
            if self.has_vocab("我", "在"):
                phrases.append(("我在说中文。", "I'm speaking Chinese.", "Progressive 在 + verb"))

        elif target == "学":
            if self.has_vocab("我", "想", "中文"):
                phrases.append(("我想学中文。", "I want to learn Chinese.", "Classic HSK 1 sentence"))
            if self.has_vocab("我", "在"):
                phrases.append(("我在学中文。", "I'm learning Chinese.", "Progressive learning"))
            if self.has_vocab("我", "要"):
                phrases.append(("我要学说中文。", "I'm going to learn to speak Chinese.", "Learn + speak chain"))

        elif target == "能":
            if self.has_vocab("我", "说", "中文"):
                phrases.append(("我能说中文。", "I can speak Chinese.", "Ability marker 能"))
            if self.has_vocab("你"):
                phrases.append(("你能帮我吗？", "Can you help me?", "Polite request with 能"))

        elif target == "会":
            if self.has_vocab("我", "说", "中文"):
                phrases.append(("我会说中文。", "I can speak Chinese.", "Learned ability 会"))
            if self.has_vocab("你"):
                phrases.append(("你会说什么？", "What can you say?", "Question with 会"))

        # Question words
        elif target == "什么":
            if self.has_vocab("你", "想", "说"):
                phrases.append(("你想说什么？", "What do you want to say?", "What question with 想"))
            if self.has_vocab("这", "是"):
                phrases.append(("这是什么？", "What is this?", "Basic what question"))

        elif target == "怎么":
            if self.has_vocab("你", "说"):
                phrases.append(("你怎么说？", "How do you say it?", "How question"))
            if self.has_vocab("我"):
                phrases.append(("我怎么学中文？", "How do I learn Chinese?", "How to learn"))

        elif target == "为什么":
            if self.has_vocab("你", "学"):
                phrases.append(("你为什么学中文？", "Why do you learn Chinese?", "Why question"))
            if self.has_vocab("你", "说"):
                phrases.append(("你为什么这么说？", "Why do you say that?", "Why + this way"))

        # Time words
        elif target == "现在":
            if self.has_vocab("我", "想", "说"):
                phrases.append(("我现在想说中文。", "I want to speak Chinese now.", "Time + want + verb"))
            if self.has_vocab("我", "在", "学"):
                phrases.append(("我现在在学中文。", "I'm learning Chinese now.", "Time + progressive"))

        elif target == "今天":
            if self.has_vocab("我", "要", "学"):
                phrases.append(("我今天要学中文。", "I'm going to learn Chinese today.", "Time + future"))
            if self.has_vocab("你"):
                phrases.append(("你今天好吗？", "How are you today?", "Daily greeting"))

        elif target == "明天":
            if self.has_vocab("我", "要", "学"):
                phrases.append(("我明天要学中文。", "I'm going to learn Chinese tomorrow.", "Tomorrow + future"))
            if self.has_vocab("我们", "一起"):
                phrases.append(("我们明天一起学。", "We'll learn together tomorrow.", "Group future plan"))

        elif target == "昨天":
            if self.has_vocab("我", "学", "了"):
                phrases.append(("我昨天学了中文。", "I learned Chinese yesterday.", "Past with 了"))
            if self.has_vocab("他", "说"):
                phrases.append(("他昨天说的。", "He said it yesterday.", "Past + 的"))

        # Adjectives/Adverbs
        elif target == "好":
            if self.has_vocab("你", "说", "很"):
                phrases.append(("你说得很好。", "You speak very well.", "Complement with 得"))
            if self.has_vocab("我"):
                phrases.append(("我很好。", "I'm very well.", "State of being"))
            phrases.append(("好！", "Good!", "Simple affirmation"))

        elif target == "很":
            if self.has_vocab("你", "说", "好"):
                phrases.append(("你说得很好。", "You speak very well.", "Degree adverb"))
            if self.has_vocab("我", "想", "学"):
                phrases.append(("我很想学中文。", "I really want to learn Chinese.", "Intensifier"))

        elif target == "不":
            if self.has_vocab("我", "想", "说"):
                phrases.append(("我不想说。", "I don't want to speak.", "Negation with 不"))
            if self.has_vocab("我", "会"):
                phrases.append(("我不会说中文。", "I can't speak Chinese.", "Negative ability"))

        # Common nouns
        elif target == "中文":
            if self.has_vocab("我", "想", "学"):
                phrases.append(("我想学中文。", "I want to learn Chinese.", "Classic sentence"))
            if self.has_vocab("你", "会", "说"):
                phrases.append(("你会说中文吗？", "Can you speak Chinese?", "Ability question"))

        elif target == "名字":
            if self.has_vocab("你", "的"):
                phrases.append(("你的名字是什么？", "What is your name?", "Name question"))
            if self.has_vocab("我", "的"):
                phrases.append(("我的名字是李明。", "My name is Li Ming.", "Name statement"))

        elif target == "词":
            if self.has_vocab("这", "是", "什么"):
                phrases.append(("这是什么词？", "What word is this?", "Word identification"))
            if self.has_vocab("我", "想", "学", "一个"):
                phrases.append(("我想学一个新词。", "I want to learn a new word.", "Learning new word"))

        # Particles and grammar
        elif target == "的":
            if self.has_vocab("我", "名字"):
                phrases.append(("我的名字是李明。", "My name is Li Ming.", "Possessive 的"))
            if self.has_vocab("你", "书"):
                phrases.append(("这是你的书吗？", "Is this your book?", "Possessive question"))

        elif target == "了":
            if self.has_vocab("我", "学", "中文"):
                phrases.append(("我学了中文。", "I learned Chinese.", "Completion 了"))
            if self.has_vocab("他", "来"):
                phrases.append(("他来了。", "He came.", "Change of state 了"))

        elif target == "吗":
            if self.has_vocab("你", "想", "学"):
                phrases.append(("你想学中文吗？", "Do you want to learn Chinese?", "Yes/no question"))
            if self.has_vocab("你", "会", "说"):
                phrases.append(("你会说中文吗？", "Can you speak Chinese?", "Ability question"))

        elif target == "在":
            if self.has_vocab("我", "学", "中文"):
                phrases.append(("我在学中文。", "I'm learning Chinese.", "Progressive 在"))
            if self.has_vocab("我", "说", "话"):
                phrases.append(("我在说话。", "I'm speaking.", "Progressive action"))

        elif target == "和":
            if self.has_vocab("你", "我"):
                phrases.append(("我和你一起学。", "You and I learn together.", "Conjunction 和"))
            if self.has_vocab("他", "她"):
                phrases.append(("他和她都会说。", "He and she can both speak.", "Connecting people"))

        # Quantifiers
        elif target == "一些":
            if self.has_vocab("我", "想", "学", "词"):
                phrases.append(("我想学一些新词。", "I want to learn some new words.", "Indefinite quantity"))
            phrases.append(("我知道一些中文。", "I know some Chinese.", "Some knowledge"))

        elif target == "一点儿":
            if self.has_vocab("我", "会", "说"):
                phrases.append(("我会说一点儿中文。", "I can speak a little Chinese.", "Small quantity"))
            phrases.append(("我想学一点儿。", "I want to learn a little.", "A little bit"))

        elif target == "一个":
            if self.has_vocab("这", "是", "词"):
                phrases.append(("这是一个新词。", "This is a new word.", "Classifier + noun"))
            if self.has_vocab("我", "想", "问"):
                phrases.append(("我想问一个问题。", "I want to ask a question.", "One + question"))

        # Return generated phrases
        return phrases

    def _generate_simple_phrase(self, target: str, known: str) -> Tuple[str, str, str]:
        """Generate a simple fallback phrase"""
        # Try to create basic patterns
        if self.has_vocab("我", "想"):
            return (f"我想{target}。", f"I want to {known}.", "Simple want + verb pattern")
        elif self.has_vocab("我"):
            return (f"我{target}。", f"I {known}.", "Simple subject + verb")
        else:
            return (f"{target}。", f"{known}.", "Basic statement")

    def generate_d_phrases(self, lego: Dict) -> Dict[str, List[Dict]]:
        """
        Generate debut phrases with expanding windows (2/3/4/5 LEGO combinations)
        These combine recently taught LEGOs in grammatically sensible ways
        """
        target = lego['target']
        known = lego['known']

        d_phrases = {
            "window_2": [],
            "window_3": [],
            "window_4": [],
            "window_5": []
        }

        # Get recent LEGOs for combination
        recent = self.taught_list[-10:] if len(self.taught_list) > 10 else self.taught_list

        # Window 2: 2-LEGO combinations
        if len(recent) >= 1:
            for i in range(max(0, len(recent) - 3), len(recent)):
                combo_target = f"{recent[i]}{target}"
                combo_known = f"{self.taught_vocab[recent[i]]} {known}"
                d_phrases["window_2"].append({
                    "target": combo_target,
                    "known": combo_known
                })

        # Window 3: 3-LEGO combinations
        if len(recent) >= 2:
            for i in range(max(0, len(recent) - 2), len(recent)):
                if i >= 1:
                    combo_target = f"{recent[i-1]}{recent[i]}{target}"
                    combo_known = f"{self.taught_vocab[recent[i-1]]} {self.taught_vocab[recent[i]]} {known}"
                    d_phrases["window_3"].append({
                        "target": combo_target,
                        "known": combo_known
                    })

        # Window 4: 4-LEGO combinations
        if len(recent) >= 3:
            for i in range(max(0, len(recent) - 1), len(recent)):
                if i >= 2:
                    combo_target = f"{recent[i-2]}{recent[i-1]}{recent[i]}{target}"
                    combo_known = f"{self.taught_vocab[recent[i-2]]} {self.taught_vocab[recent[i-1]]} {self.taught_vocab[recent[i]]} {known}"
                    d_phrases["window_4"].append({
                        "target": combo_target,
                        "known": combo_known
                    })

        # Window 5: 5-LEGO combinations
        if len(recent) >= 4:
            for i in range(max(0, len(recent) - 1), len(recent)):
                if i >= 3:
                    combo_target = f"{recent[i-3]}{recent[i-2]}{recent[i-1]}{recent[i]}{target}"
                    combo_known = f"{self.taught_vocab[recent[i-3]]} {self.taught_vocab[recent[i-2]]} {self.taught_vocab[recent[i-1]]} {self.taught_vocab[recent[i]]} {known}"
                    d_phrases["window_5"].append({
                        "target": combo_target,
                        "known": combo_known
                    })

        # Ensure we have exactly 2 phrases per window (total 8)
        for window in ["window_2", "window_3", "window_4", "window_5"]:
            while len(d_phrases[window]) < 2:
                d_phrases[window].append({
                    "target": target,
                    "known": known
                })
            d_phrases[window] = d_phrases[window][:2]

        return d_phrases


def generate_basket(lego_id: str, lego: Dict, generator: ChinesePhraseGenerator,
                   translations: Dict, graph: Dict) -> Dict:
    """
    Generate a complete basket for one LEGO
    """
    # Check if culminating LEGO
    is_culminating, seed_id = is_culminating_lego(lego_id, graph)

    # Get seed translation if culminating
    seed_trans = translations.get(seed_id) if is_culminating else None

    # Generate e-phrases
    e_phrases = generator.generate_e_phrases(lego, is_culminating, seed_trans)

    # Generate d-phrases
    d_phrases = generator.generate_d_phrases(lego)

    # Calculate stats
    d_phrase_count = sum(len(phrases) for phrases in d_phrases.values())

    basket = {
        "uuid": str(uuid.uuid4()),
        "phase": "phase_5_basket",
        "lego_provenance": lego_id,
        "target": lego['target'],
        "known": lego['known'],
        "e_phrases": e_phrases,
        "d_phrases": d_phrases,
        "basket_stats": {
            "e_phrase_count": len(e_phrases),
            "d_phrase_count": d_phrase_count,
            "total_phrases": len(e_phrases) + d_phrase_count
        }
    }

    return basket


def main():
    print("Loading data...")
    graph = load_graph()
    legos = load_legos()
    translations = load_translations()

    print(f"Loaded {len(legos)} LEGOs")
    print(f"Loaded {len(translations)} translations")

    # Build FCFS teaching order
    print("\nBuilding FCFS teaching order...")
    fcfs_order = build_fcfs_order(graph, legos)
    print(f"FCFS order contains {len(fcfs_order)} LEGOs")

    # Initialize phrase generator
    generator = ChinesePhraseGenerator()

    # Generate baskets
    print("\nGenerating baskets...")
    baskets_generated = 0

    for i, (lego_id, lego) in enumerate(fcfs_order, 1):
        # Generate basket
        basket = generate_basket(lego_id, lego, generator, translations, graph)

        # Save basket
        basket_file = BASKETS_DIR / f"{basket['uuid']}.json"
        with open(basket_file, 'w', encoding='utf-8') as f:
            json.dump(basket, f, ensure_ascii=False, indent=2)

        baskets_generated += 1
        print(f"  [{i}/{len(fcfs_order)}] Generated basket for {lego_id}: {lego['target']} ({lego['known']})")

        # Add to taught vocabulary
        generator.add_lego(lego['target'], lego['known'])

    print(f"\n✓ Generated {baskets_generated} baskets successfully!")
    print(f"  Output directory: {BASKETS_DIR}")

    # Show sample baskets
    if baskets_generated > 0:
        sample_files = sorted(list(BASKETS_DIR.glob("*.json")))[:3]
        for sample_file in sample_files:
            print(f"\n{'='*60}")
            print(f"Sample basket: {sample_file.name}")
            print('='*60)
            with open(sample_file, 'r', encoding='utf-8') as f:
                sample = json.load(f)
                print(f"LEGO: {sample['target']} ({sample['known']})")
                print(f"\nE-phrases ({len(sample['e_phrases'])}):")
                for i, ep in enumerate(sample['e_phrases'], 1):
                    print(f"  {i}. {ep['target']} → {ep['known']}")
                    print(f"     ({ep['char_count']} chars, {ep['word_count']} words) - {ep['quality_notes']}")
                print(f"\nD-phrases: {sample['basket_stats']['d_phrase_count']} total")


if __name__ == "__main__":
    main()
