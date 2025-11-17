#!/usr/bin/env python3
"""
Generate Phase 5 practice phrases for S0021-S0030 (Agent 02)
Following v5.0 intelligence doc methodology
"""

import json
import re
from pathlib import Path

# Load scaffold
scaffold_path = Path('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng_s0001-0030/phase5_scaffolds/agent_02.json')
with open(scaffold_path, 'r') as f:
    data = json.load(f)

def count_words(phrase):
    return len(phrase.split())

def validate_spanish(spanish, whitelist_set):
    """Check if all Spanish words are in whitelist"""
    words = re.findall(r'\b[\wáéíóúñü]+\b', spanish.lower())
    missing = [w for w in words if w not in whitelist_set]
    return len(missing) == 0, missing

def check_distribution(phrases):
    """Check if phrases meet 2-2-2-4 distribution"""
    word_counts = [count_words(p[0]) for p in phrases]
    return [
        sum(1 for w in word_counts if 1 <= w <= 2),
        sum(1 for w in word_counts if w == 3),
        sum(1 for w in word_counts if 4 <= w <= 5),
        sum(1 for w in word_counts if w >= 6)
    ]

# ============================================================================
# S0021: "Why are you learning her name?"
# Target: "¿Por qué estás aprendiendo su nombre?"
# ============================================================================

seed = data['seeds']['S0021']
whitelist = seed['whitelist']
wl_set = set()
for pair in whitelist:
    spa = pair[0].lower().strip()
    wl_set.add(spa)
    words = re.findall(r'\b[\wáéíóúñü]+\b', spa)
    for word in words:
        wl_set.add(word)

# S0021L01: "Why" / "¿Por qué"
# Question word, begins questions asking for reasons
phrases_S0021L01 = [
    # 2 short (1-2)
    ["Why", "¿Por qué", None],
    ["Why not", "¿Por qué no", None],
    # 2 quite short (3)
    ["Why not today", "¿Por qué no hoy", None],
    ["Why not Spanish", "¿Por qué no español", None],
    # 2 longer (4-5)
    ["Why do you want Spanish", "¿Por qué quieres español", None],
    ["Why are you learning Spanish", "¿Por qué estás aprendiendo español", None],
    # 4 long (6+)
    ["Why do you want to learn Spanish", "¿Por qué quieres aprender español", None],
    ["Why are you learning her name now", "¿Por qué estás aprendiendo su nombre ahora", None],
    ["Why do you want to learn her name", "¿Por qué quieres aprender su nombre", None],
    ["Why are you not learning her name", "¿Por qué no estás aprendiendo su nombre", None],
]

# S0021L02: "are you learning" / "estás aprendiendo"
# Present continuous verb phrase, 2nd person
phrases_S0021L02 = [
    # 2 short (1-2)
    ["Learning", "Aprendiendo", None],
    ["You're learning", "Estás aprendiendo", None],
    # 2 quite short (exactly 3)
    ["You're learning Spanish", "Estás aprendiendo español", None],
    ["Learning Spanish today", "Aprendiendo español hoy", None],
    # 2 longer (4-5)
    ["Are you learning something today", "¿Estás aprendiendo algo hoy", None],
    ["You're learning her name now", "Estás aprendiendo su nombre ahora", None],
    # 4 long (6+)
    ["Are you learning Spanish with me today", "¿Estás aprendiendo español conmigo hoy", None],
    ["You're learning the whole sentence very well", "Estás aprendiendo la oración completa muy bien", None],
    ["Are you learning to speak Spanish very well", "¿Estás aprendiendo a hablar español muy bien", None],
    ["You're learning her name with me very well", "Estás aprendiendo su nombre conmigo muy bien", None],
]

# S0021L03: "her" / "su"
# Possessive adjective (her/his/your-formal/their)
phrases_S0021L03 = [
    # 2 short (1-2)
    ["Her name", "Su nombre", None],
    ["Her Spanish", "Su español", None],
    # 2 quite short (exactly 3)
    ["Her name today", "Su nombre hoy", None],
    ["Her name is", "Su nombre es", None],
    # 2 longer (4-5)
    ["I'm learning her name today", "Estoy aprendiendo su nombre hoy", None],
    ["I want her name", "Quiero su nombre", None],
    # 4 long (6+)
    ["Why do you want to learn her name", "¿Por qué quieres aprender su nombre", None],
    ["I'm trying to remember her name very well", "Estoy intentando recordar su nombre muy bien", None],
    ["I want to practise her name with you today", "Quiero practicar su nombre contigo hoy", None],
    ["Why are you learning her name with me today", "¿Por qué estás aprendiendo su nombre conmigo hoy", None],
]

# S0021L04: "name" / "nombre" (FINAL LEGO)
# Noun
phrases_S0021L04 = [
    # 2 short (1-2)
    ["Name", "Nombre", None],
    ["Her name", "Su nombre", None],
    # 2 quite short (exactly 3)
    ["The name today", "El nombre hoy", None],
    ["Her name is", "Su nombre es", None],
    # 2 longer (4-5)
    ["I'm learning her name today", "Estoy aprendiendo su nombre hoy", None],
    ["I want her name", "Quiero su nombre", None],
    # 4 long (6+)
    ["Are you learning her name now", "¿Estás aprendiendo su nombre ahora", None],
    ["Why do you want to learn her name", "¿Por qué quieres aprender su nombre", None],
    ["I'm trying to remember her name very well today", "Estoy intentando recordar su nombre muy bien hoy", None],
    # Final: SEED SENTENCE
    ["Why are you learning her name?", "¿Por qué estás aprendiendo su nombre?", None],
]

# Validate all phrases
all_phrases = {
    'S0021L01': phrases_S0021L01,
    'S0021L02': phrases_S0021L02,
    'S0021L03': phrases_S0021L03,
    'S0021L04': phrases_S0021L04,
}

print("=" * 80)
print("S0021 PHRASE VALIDATION")
print("=" * 80)

all_valid = True
for lego_id, phrases in all_phrases.items():
    lego_data = seed['legos'][lego_id]
    print(f"\n{lego_id}: {lego_data['lego']} [{'FINAL' if lego_data['is_final_lego'] else 'regular'}]")

    for i, phrase in enumerate(phrases, 1):
        eng, spa, _ = phrase
        wc = count_words(eng)
        valid, missing = validate_spanish(spa, wl_set)
        phrase[2] = None  # pattern code
        phrase.append(wc)  # Add word count

        status = "✓" if valid else "✗"
        cat = "1-2" if wc <= 2 else ("3" if wc == 3 else ("4-5" if wc <= 5 else "6+"))
        print(f"  {i:2d}. [{wc:2d}w {cat:3s}] {status} {eng[:50]:50s}")

        if not valid:
            all_valid = False
            print(f"       MISSING: {missing}")

    # Check distribution
    dist = check_distribution(phrases)
    dist_ok = (dist == [2, 2, 2, 4])
    print(f"  Distribution: {dist[0]}-{dist[1]}-{dist[2]}-{dist[3]} (Target: 2-2-2-4) {'✓' if dist_ok else '✗ INCORRECT'}")

print("\n" + "=" * 80)
if all_valid:
    print("✓ ALL PHRASES VALID - READY TO WRITE TO SCAFFOLD")
else:
    print("✗ VALIDATION ERRORS - MUST FIX BEFORE WRITING")
print("=" * 80)
