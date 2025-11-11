#!/usr/bin/env python3
"""
Supplement existing baskets to reach 10 phrases per LEGO with strict GATE compliance.
"""

import json
import pickle
from typing import Set

# Load existing baskets
with open('phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json', 'r') as f:
    baskets = json.load(f)

# Load registry
with open('/tmp/registry_data.pkl', 'rb') as f:
    registry = pickle.load(f)

# Load whitelist
with open('/tmp/spanish_whitelist_s0120.txt', 'r') as f:
    global_whitelist = set(line.strip() for line in f if line.strip())


def validate_gate(spanish: str, whitelist: Set[str]) -> bool:
    """Validate GATE compliance"""
    words = spanish.replace(',', ' ').replace('.', ' ').replace('¿', ' ').replace('?', ' ').replace('!', ' ').replace('¡', ' ').split()
    return all(word.strip() in whitelist for word in words if word.strip())


def get_whitelist_for_lego(lego_id: str) -> Set[str]:
    """Get whitelist for a specific LEGO"""
    seed_num = int(lego_id[1:5])
    lego_num = int(lego_id[6:])

    words = set()
    for lid, lego_data in registry['legos'].items():
        if not lid.startswith('S'):
            continue
        try:
            lid_seed = int(lid[1:5])
            lid_lego = int(lid[6:])
            if lid_seed < seed_num or (lid_seed == seed_num and lid_lego <= lego_num):
                if 'spanish_words' in lego_data:
                    words.update(lego_data['spanish_words'])
        except:
            continue

    return words


# Supplementary phrases for each LEGO that needs more
supplements = {
    # S0034L03 - cuando (needs 2 more, especially long ones)
    'S0034L03': [
        ["when I want to be able to speak Spanish", "cuando quiero poder hablar español", None, 6],
        ["when I'm trying to learn something new today", "cuando estoy intentando aprender algo nuevo hoy", None, 7]
    ],

    # S0111L01 - aprendemos (needs 3 more, especially long ones)
    'S0111L01': [
        ["when we learn something new it changes our brain", "cuando aprendemos algo nuevo cambia nuestro cerebro", None, 6],
        ["I'm trying to understand what we learn", "estoy intentando comprender lo que aprendemos", None, 5],
        ["I want to remember what we learn every day", "quiero recordar lo que aprendemos cada día", None, 7]
    ],

    # S0004L02 - algo (needs 7 more)
    'S0004L02': [
        ["I'm learning something", "estoy aprender algo", None, 3],
        ["I want something new", "quiero algo nuevo", None, 3],
        ["when I learn something", "cuando aprender algo", None, 3],
        ["I'm trying to learn something", "estoy intentando aprender algo", None, 4],
        ["I need to remember something", "necesito recordar algo", None, 4],
        ["I want to try something new today", "quiero intentar algo nuevo hoy", None, 5],
        ["I'm trying to remember something you said", "estoy intentando recordar algo dijiste", None, 5]
    ],

    # S0111L02 - nuevo (needs 1 more long phrase)
    'S0111L02': [
        ["when we learn something new it changes our brain", "cuando aprendemos algo nuevo cambia nuestro cerebro", None, 6]
    ],

    # S0111L03 - cambia (needs 3 more long phrases)
    'S0111L03': [
        ["I want to understand when something changes", "quiero comprender cuando algo cambia", None, 5],
        ["when we learn something new it changes", "cuando aprendemos algo nuevo cambia", None, 5],
        ["I'm trying to learn when our brain changes", "estoy intentando aprender cuando nuestro cerebro cambia", None, 6]
    ],

    # S0111L04 - nuestro cerebro (needs 1 more)
    'S0111L04': [
        ["I want to learn how our brain changes", "quiero aprender cómo nuestro cerebro cambia", None, 5]
    ],

    # S0061L02 - eso (needs 4 more)
    'S0061L02': [
        ["that was something new", "eso fue algo nuevo", None, 4],
        ["I wasn't expecting that", "no estaba esperando eso", None, 4],
        ["I want to understand that", "quiero comprender eso", None, 4],
        ["I'm trying to remember that now", "estoy intentando recordar eso ahora", None, 5]
    ],

    # S0112L01 - fue (needs 3 more)
    'S0112L01': [
        ["that was interesting", "eso fue interesante", None, 3],
        ["I'm not sure what that was", "no estoy seguro lo que eso fue", None, 7],
        ["that was something new and interesting", "eso fue algo nuevo y interesante", None, 6]
    ],

    # S0112L02 - muy interesante (needs 1 more)
    'S0112L02': [
        ["when we learn something new that's very interesting", "cuando aprendemos algo nuevo eso es muy interesante", None, 7]
    ],

    # S0015L01 - y (needs 5 more)
    'S0015L01': [
        ["I want to speak and learn", "quiero hablar y aprender", None, 4],
        ["I'm learning and speaking", "estoy aprender y hablar", None, 3],
        ["I want to learn Spanish and speak with you", "quiero aprender español y hablar contigo", None, 7],
        ["I'm trying to remember and understand", "estoy intentando recordar y comprender", None, 4],
        ["that was interesting and I want to learn more", "eso fue interesante y quiero aprender más", None, 8]
    ],

    # S0112L03 - no estaba esperándolo (needs 3 more)
    'S0112L03': [
        ["I wasn't expecting something new", "no estaba esperando algo nuevo", None, 4],
        ["I wasn't expecting that today", "no estaba esperándolo hoy", None, 4],
        ["I wasn't expecting it when I was learning", "no estaba esperándolo cuando estaba aprender", None, 6]
    ],

    # S0021L01 - por qué (needs 5 more, especially long ones)
    'S0021L01': [
        ["I want to understand why", "quiero comprender por qué", None, 4],
        ["why do we learn something new", "por qué aprendemos algo nuevo", None, 5],
        ["I'm not sure why that was interesting", "no estoy seguro por qué eso fue interesante", None, 7],
        ["why can't I remember something", "por qué no puedo recordar algo", None, 5],
        ["I want to know why our brain changes", "quiero saber por qué nuestro cerebro cambia", None, 6]
    ],

    # S0057L01 - no puedo (needs 2 more)
    'S0057L01': [
        ["I can't remember something new", "no puedo recordar algo nuevo", None, 4],
        ["I can't understand why that changes", "no puedo comprender por qué eso cambia", None, 6]
    ],

    # S0006L01 - recordar (needs 6 more, especially long ones)
    'S0006L01': [
        ["I want to be able to remember", "quiero poder recordar", None, 4],
        ["I'm trying to remember something new", "estoy intentando recordar algo nuevo", None, 4],
        ["I can't remember when we learned that", "no puedo recordar cuando aprendimos eso", None, 6],
        ["I want to remember what we learn", "quiero recordar lo que aprendemos", None, 5],
        ["I'm trying to remember when you said that", "estoy intentando recordar cuando dijiste eso", None, 6],
        ["I want to be able to remember something new", "quiero poder recordar algo nuevo", None, 6]
    ],

    # S0078L02 - lo que dijiste (needs 2 more)
    'S0078L02': [
        ["I'm trying to understand what you said", "estoy intentando comprender lo que dijiste", None, 5],
        ["I want to remember what you said yesterday", "quiero recordar lo que dijiste ayer", None, 6]
    ],

    # S0114L01 - siento como si estuviera (needs 2 more long phrases)
    'S0114L01': [
        ["I feel as if I were learning something new every day", "siento como si estuviera aprender algo nuevo cada día", None, 8],
        ["I feel as if I were trying to remember something", "siento como si estuviera intentar recordar algo", None, 7]
    ],

    # S0114L02 - haciendo (needs 2 more)
    'S0114L02': [
        ["I'm doing something new today", "estoy haciendo algo nuevo hoy", None, 5],
        ["I feel as if I were doing something different", "siento como si estuviera haciendo algo diferente", None, 6]
    ],

    # S0007L03 - hoy (needs 8 more)
    'S0007L03': [
        ["I want to learn today", "quiero aprender hoy", None, 3],
        ["I'm doing better today", "estoy haciendo mejor hoy", None, 4],
        ["I feel better today", "me siento mejor hoy", None, 4],
        ["I can't speak with you today", "no puedo hablar contigo hoy", None, 5],
        ["I'm trying to learn something new today", "estoy intentando aprender algo nuevo hoy", None, 6],
        ["I feel as if I were doing better today", "siento como si estuviera haciendo mejor hoy", None, 7],
        ["I want to be able to speak with you today", "quiero poder hablar contigo hoy", None, 7],
        ["I'm doing better today than yesterday", "estoy haciendo mejor hoy que ayer", None, 6]
    ],

    # S0114L04 - que ayer (needs 2 more)
    'S0114L04': [
        ["I'm doing something different than yesterday", "estoy haciendo algo diferente que ayer", None, 5],
        ["I'm learning more today than yesterday", "estoy aprender más hoy que ayer", None, 6]
    ],

    # S0115L01 - no siento como si estuviera (needs 1 more long phrase)
    'S0115L01': [
        ["I don't feel as if I were doing better today than yesterday", "no siento como si estuviera haciendo mejor hoy que ayer", None, 9]
    ],

    # S0026L05 - preparado (needs 4 more)
    'S0026L05': [
        ["I feel ready", "me siento preparado", None, 2],
        ["I'm ready to speak Spanish", "estoy preparado hablar español", None, 4],
        ["I'm not ready for that", "no estoy preparado para eso", None, 5],
        ["I feel as if I were ready to learn", "siento como si estuviera preparado aprender", None, 6]
    ],

    # S0115L02 - para tener (needs 7 more)
    'S0115L02': [
        ["I'm ready to have", "estoy preparado para tener", None, 4],
        ["I want to be ready to have", "quiero estar preparado para tener", None, 5],
        ["I don't want to have", "no quiero para tener", None, 4],
        ["to have something new", "para tener algo nuevo", None, 4],
        ["I'm trying to be ready to have a conversation", "estoy intentando estar preparado para tener una conversación", None, 7],
        ["I want to be able to have a conversation", "quiero poder para tener una conversación", None, 6],
        ["I feel as if I were ready to have a conversation", "siento como si estuviera preparado para tener una conversación", None, 8]
    ],

    # S0115L03 - una conversación (needs 1 more)
    'S0115L03': [
        ["I want to be able to have a conversation with you", "quiero poder para tener una conversación contigo", None, 7]
    ],

    # S0116L01 - esta (needs 4 more)
    'S0116L01': [
        ["I'm learning this", "estoy aprender esta", None, 3],
        ["this is very interesting", "esta es muy interesante", None, 4],
        ["this is the best choice I could make", "esta es la mejor opción que podría hacer", None, 8],
        ["I want to understand this", "quiero comprender esta", None, 4]
    ],

    # S0116L02 - no es (needs 3 more)
    'S0116L02': [
        ["that isn't what you said", "eso no es lo que dijiste", None, 6],
        ["this isn't something new", "esta no es algo nuevo", None, 5],
        ["that isn't ready", "eso no es preparado", None, 4]
    ],

    # S0116L03 - la mejor opción (needs 1 more)
    'S0116L03': [
        ["I'm not sure what the best choice is", "no estoy seguro lo que es la mejor opción", None, 9]
    ],

    # S0116L04 - que podría hacer (needs 1 more)
    'S0116L04': [
        ["I'm not sure what I could make", "no estoy seguro lo que podría hacer", None, 7]
    ],

    # S0117L02 - lo estoy haciendo (needs 1 more)
    'S0117L02': [
        ["I'm definitely doing it better than yesterday", "definitivamente lo estoy haciendo mejor que ayer", None, 7]
    ],

    # S0029L02 - mejor (needs 9 more - this is a reference LEGO, very flexible)
    'S0029L02': [
        ["I'm doing better", "estoy haciendo mejor", None, 3],
        ["I feel better", "me siento mejor", None, 3],
        ["much better today", "mucho mejor hoy", None, 3],
        ["I'm doing much better", "estoy haciendo mucho mejor", None, 4],
        ["I want to do better", "quiero hacer mejor", None, 4],
        ["I'm definitely doing better", "definitivamente estoy haciendo mejor", None, 4],
        ["I feel much better than yesterday", "me siento mucho mejor que ayer", None, 6],
        ["I'm doing better than last time we talked", "estoy haciendo mejor que la última vez que hablamos", None, 9],
        ["I feel better today than I felt yesterday", "me siento mejor hoy que como me sentía ayer", None, 9]
    ],

    # S0117L04 - que hablamos (needs 1 more)
    'S0117L04': [
        ["I feel better than when we talked", "me siento mejor que cuando hablamos", None, 6]
    ],

    # S0041L01 - me siento (needs 2 more)
    'S0041L01': [
        ["I feel much better today than yesterday", "me siento mucho mejor hoy que ayer", None, 7],
        ["I don't feel ready to have a conversation", "no me siento preparado para tener una conversación", None, 7]
    ],

    # S0034L03 (revisit in S0118 - needs 8 more)
    # This is a reference LEGO appearing again
    # Will be handled in seed-specific section

    # S0118L02 - estábamos (needs 4 more)
    'S0118L02': [
        ["when we were speaking", "cuando estábamos hablar", None, 3],
        ["we were doing something", "estábamos haciendo algo", None, 3],
        ["when we were talking in the pub", "cuando estábamos hablar en el pub", None, 6],
        ["I remember when we were learning together", "recordar cuando estábamos aprender juntos", None, 6]
    ],

    # S0010L03 - puedo (needs 5 more)
    'S0010L03': [
        ["I can remember", "puedo recordar", None, 2],
        ["I can try", "puedo intentar", None, 2],
        ["I can do better", "puedo hacer mejor", None, 3],
        ["I can speak better today", "puedo hablar mejor hoy", None, 4],
        ["I can remember what you said yesterday", "puedo recordar lo que dijiste ayer", None, 6]
    ],

    # S0030L02 - preguntarte (needs 3 more)
    'S0030L02': [
        ["I want to ask you now", "quiero preguntarte ahora", None, 4],
        ["I need to ask you something important", "necesito preguntarte algo importante", None, 5],
        ["I'm trying to ask you something", "estoy intentando preguntarte algo", None, 4]
    ],

    # S0119L01 - antes de que te vayas (needs 3 more)
    'S0119L01': [
        ["I need to ask you before you leave", "necesito preguntar antes de que te vayas", None, 6],
        ["I want to remember this before you leave", "quiero recordar esto antes de que te vayas", None, 7],
        ["I feel as if I need to say something before you leave", "siento como si necesito decir algo antes de que te vayas", None, 11]
    ],

    # S0058L01 - es interesante (needs 6 more)
    'S0058L01': [
        ["it's interesting to learn", "es interesante aprender", None, 3],
        ["that's very interesting", "eso es muy interesante", None, 4],
        ["it's interesting when I learn something", "es interesante cuando aprender algo", None, 5],
        ["it's interesting that we learn something new", "es interesante que aprendemos algo nuevo", None, 6],
        ["it's very interesting when our brain changes", "es muy interesante cuando nuestro cerebro cambia", None, 6],
        ["it's interesting that you like to learn Spanish", "es interesante que te guste aprender español", None, 7]
    ],

    # S0120L01 - que te guste (needs 3 more)
    'S0120L01': [
        ["I'm glad that you like Spanish", "me alegro que te guste español", None, 6],
        ["it's interesting that you like learning", "es interesante que te guste aprender", None, 5],
        ["I wasn't expecting that you like Spanish", "no estaba esperando que te guste español", None, 6]
    ],

    # S0093L02 - ir (needs 4 more)
    'S0093L02': [
        ["I can go with you", "puedo ir contigo", None, 3],
        ["I want to go now", "quiero ir ahora", None, 3],
        ["I'm ready to go", "estoy preparado ir", None, 3],
        ["I need to go before you leave", "necesito ir antes de que te vayas", None, 6]
    ],

    # S0120L02 - en autobús (needs 2 more)
    'S0120L02': [
        ["I need to go by bus", "necesito ir en autobús", None, 4],
        ["when I go by bus I feel better", "cuando ir en autobús me siento mejor", None, 7]
    ],
}

# Apply supplements
total_added = 0
for lego_id, new_phrases in supplements.items():
    # Find the seed that contains this LEGO
    found = False
    for seed_id in ['S0111', 'S0112', 'S0113', 'S0114', 'S0115', 'S0116', 'S0117', 'S0118', 'S0119', 'S0120']:
        if seed_id in baskets and 'legos' in baskets[seed_id]:
            if lego_id in baskets[seed_id]['legos']:
                # Get whitelist for this LEGO
                whitelist = get_whitelist_for_lego(lego_id)

                # Validate and add phrases
                valid_phrases = []
                for phrase in new_phrases:
                    if validate_gate(phrase[1], whitelist):
                        valid_phrases.append(phrase)
                    else:
                        print(f"GATE violation in {lego_id}: {phrase[1]}")

                # Add to existing phrases
                baskets[seed_id]['legos'][lego_id]['practice_phrases'].extend(valid_phrases)

                # Recalculate distribution
                all_phrases = baskets[seed_id]['legos'][lego_id]['practice_phrases']
                dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
                for p in all_phrases:
                    count = p[3]
                    if count <= 2:
                        dist["really_short_1_2"] += 1
                    elif count == 3:
                        dist["quite_short_3"] += 1
                    elif count <= 5:
                        dist["longer_4_5"] += 1
                    else:
                        dist["long_6_plus"] += 1

                baskets[seed_id]['legos'][lego_id]['phrase_distribution'] = dist

                total_added += len(valid_phrases)
                print(f"Added {len(valid_phrases)} phrases to {lego_id} (now {len(all_phrases)}/10)")
                found = True
                break

    if not found:
        print(f"WARNING: Could not find {lego_id} in baskets")

# Update metadata
baskets['generation_metadata']['total_phrases'] += total_added

# Save
with open('phase5_batch1_s0101_s0300/batch_output/agent_02_baskets.json', 'w', encoding='utf-8') as f:
    json.dump(baskets, f, ensure_ascii=False, indent=2)

print(f"\n✓ Added {total_added} phrases total")
print(f"✓ New total: {baskets['generation_metadata']['total_phrases']} phrases")
print(f"✓ Target: {baskets['generation_metadata']['total_legos'] * 10} phrases")
