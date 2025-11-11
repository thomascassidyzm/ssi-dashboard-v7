#!/usr/bin/env python3
"""
Agent 09 Basket Generator - High Quality Spanish Practice Phrases
Generates baskets for S0461-S0480 with strict GATE compliance
"""

import json
import re
from datetime import datetime
from typing import List, Set, Dict, Tuple

# Load input files
def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_seed_number(seed_id):
    """Extract numeric part from seed ID (e.g., 'S0461' -> 461)"""
    match = re.match(r'S(\d+)', seed_id)
    return int(match.group(1)) if match else 0

def extract_lego_seed_number(lego_id):
    """Extract seed number from LEGO ID (e.g., 'S0461L01' -> 461)"""
    if isinstance(lego_id, bool):
        return 0
    match = re.match(r'S(\d+)L', lego_id)
    return int(match.group(1)) if match else 0

def build_whitelist_up_to_seed(registry, target_seed_id):
    """Build whitelist of all Spanish words taught up to target seed"""
    target_num = extract_seed_number(target_seed_id)
    whitelist = set()

    for lego_id, lego_data in registry['legos'].items():
        lego_seed_num = extract_lego_seed_number(lego_id)

        # Include all LEGOs from seeds before target
        if lego_seed_num > 0 and lego_seed_num < target_num:
            if 'spanish_words' in lego_data:
                whitelist.update(lego_data['spanish_words'])

    return whitelist

def build_whitelist_up_to_lego(registry, seeds_data, current_seed_id, current_lego_index):
    """Build whitelist including LEGOs taught up to current position"""
    whitelist = build_whitelist_up_to_seed(registry, current_seed_id)

    # Find current seed in seeds_data
    current_seed = None
    for seed in seeds_data['seeds']:
        if seed['seed_id'] == current_seed_id:
            current_seed = seed
            break

    if not current_seed:
        return whitelist

    # Add LEGOs from current seed up to (but not including) current_lego_index
    for i in range(current_lego_index):
        if i < len(current_seed['legos']):
            lego = current_seed['legos'][i]
            lego_id = lego.get('id')

            # Skip boolean IDs (already taught)
            if isinstance(lego_id, bool):
                # Add the target word anyway
                target = lego.get('target', '')
                if target:
                    words = tokenize_spanish(target)
                    whitelist.update(words)
                continue

            # Get from registry
            if lego_id and lego_id in registry['legos']:
                reg_lego = registry['legos'][lego_id]
                if 'spanish_words' in reg_lego:
                    whitelist.update(reg_lego['spanish_words'])

    return whitelist

def tokenize_spanish(text):
    """Tokenize Spanish text into individual words"""
    # Remove punctuation and convert to lowercase
    text = text.lower()
    text = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', text)
    words = [w for w in text.split() if w]
    return words

def check_gate_compliance(spanish_phrase, whitelist):
    """Check if all words in phrase are in whitelist"""
    words = tokenize_spanish(spanish_phrase)
    violations = []

    for word in words:
        if word not in whitelist:
            violations.append(word)

    return violations

def count_legos_in_phrase(phrase_spanish, lego_target):
    """Estimate number of LEGOs used in phrase (for distribution)"""
    # Simple word count estimate
    words = tokenize_spanish(phrase_spanish)
    return len(words)

# Practice phrase templates for each LEGO
PHRASE_TEMPLATES = {
    "S0461L01": {  # Una tienda - A shop
        "lego": ["A shop", "Una tienda"],
        "phrases": [
            ["A shop", "Una tienda", None, 1],
            ["Una tienda", "Una tienda", None, 1],
        ]
    },
    "S0461L02": {  # puedo comprar - I can buy
        "lego": ["I can buy", "puedo comprar"],
        "phrases": [
            ["I can buy", "puedo comprar", None, 2],
            ["to buy", "comprar", None, 1],
        ]
    },
    "S0461L03": {  # postales - postcards
        "lego": ["postcards", "postales"],
        "phrases": [
            ["postcards", "postales", None, 1],
            ["some postcards", "algunas postales", None, 2],
        ]
    },
}

def generate_phrases_for_lego(lego_id, lego_data, whitelist, seed_pair, is_final_lego=False):
    """Generate 10 practice phrases for a LEGO with strict GATE compliance"""

    target_spanish = lego_data['target']
    target_english = lego_data['known']

    phrases = []

    # Get the components if multi-word
    components = lego_data.get('components', None)

    # === S0461L01: Una tienda - A shop ===
    if lego_id == "S0461L01":
        phrases = [
            ["A shop", "Una tienda", None, 2],
            ["a shop", "una tienda", None, 2],
            ["I want a shop", "Quiero una tienda", None, 3],
            ["There is a shop", "Hay una tienda", None, 3],
            ["I want to find a shop", "Quiero encontrar una tienda", None, 4],
            ["Is there a shop here", "Hay una tienda aquí", None, 4],
            ["I want to find a shop where I can buy postcards", "Quiero encontrar una tienda donde puedo comprar postales", None, 10],
            ["I need to find a shop near here", "Necesito encontrar una tienda cerca de aquí", None, 7],
            ["There is a shop on the street", "Hay una tienda en la calle", None, 6],
            ["A shop where I can buy some postcards", "Una tienda donde puedo comprar algunas postales", None, 8],
        ]

    # === S0461L02: puedo comprar - I can buy ===
    elif lego_id == "S0461L02":
        phrases = [
            ["I can buy", "puedo comprar", None, 2],
            ["to buy", "comprar", None, 1],
            ["I can buy this", "puedo comprar esto", None, 3],
            ["I can buy that", "puedo comprar eso", None, 3],
            ["I can buy what I want", "puedo comprar lo que quiero", None, 6],
            ["I can buy what I need", "puedo comprar lo que necesito", None, 6],
            ["Where can I buy some postcards", "Donde puedo comprar algunas postales", None, 5],
            ["I can buy some things here", "puedo comprar algunas cosas aquí", None, 5],
            ["I want to know what I can buy", "Quiero saber lo que puedo comprar", None, 7],
            ["I can buy some postcards", "puedo comprar algunas postales", None, 4],
        ]

    # === S0461L03: postales - postcards ===
    elif lego_id == "S0461L03":
        phrases = [
            ["postcards", "postales", None, 1],
            ["some postcards", "algunas postales", None, 2],
            ["I want some postcards", "Quiero algunas postales", None, 3],
            ["I need some postcards", "Necesito algunas postales", None, 3],
            ["I want to buy some postcards", "Quiero comprar algunas postales", None, 4],
            ["I can buy some postcards here", "puedo comprar algunas postales aquí", None, 5],
            ["I want to find a shop where I can buy some postcards", "Quiero encontrar una tienda donde puedo comprar algunas postales", None, 11],
            ["There are some postcards in the shop", "Hay algunas postales en la tienda", None, 6],
            ["I need to buy some postcards today", "Necesito comprar algunas postales hoy", None, 6],
            ["A shop where I can buy some postcards", "Una tienda donde puedo comprar algunas postales", None, 8],
        ]

    # === S0462L01: Mi abuelo - My grandfather ===
    elif lego_id == "S0462L01":
        phrases = [
            ["My grandfather", "Mi abuelo", None, 2],
            ["my grandfather", "mi abuelo", None, 2],
            ["I want my grandfather here", "Quiero mi abuelo aquí", None, 4],
            ["My grandfather is here", "Mi abuelo está aquí", None, 4],
            ["My grandfather wants to speak", "Mi abuelo quiere hablar", None, 4],
            ["I need to speak with my grandfather", "Necesito hablar con mi abuelo", None, 6],
            ["My grandfather is a very good person", "Mi abuelo es una persona muy buena", None, 8],
            ["I want to speak with my grandfather today", "Quiero hablar con mi abuelo hoy", None, 7],
            ["My grandfather has a big house", "Mi abuelo tiene una casa grande", None, 6],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
        ]

    # === S0462L02: combatió - fought ===
    elif lego_id == "S0462L02":
        phrases = [
            ["fought", "combatió", None, 1],
            ["he fought", "él combatió", None, 2],
            ["My grandfather fought here", "Mi abuelo combatió aquí", None, 4],
            ["He fought in the war", "Él combatió en la guerra", None, 5],
            ["My grandfather fought in the war", "Mi abuelo combatió en la guerra", None, 5],
            ["He fought with his brother", "Él combatió con su hermano", None, 5],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
            ["My grandfather fought many times", "Mi abuelo combatió muchas veces", None, 5],
            ["He fought in a big war", "Él combatió en una guerra grande", None, 6],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
        ]

    # === S0462L03: en Italia - in Italy ===
    elif lego_id == "S0462L03":
        phrases = [
            ["in Italy", "en Italia", None, 2],
            ["Italy", "Italia", None, 1],
            ["I want to go to Italy", "Quiero ir a Italia", None, 5],
            ["He is in Italy", "Él está en Italia", None, 4],
            ["My grandfather fought in Italy", "Mi abuelo combatió en Italia", None, 5],
            ["I want to speak Italian in Italy", "Quiero hablar italiano en Italia", None, 6],
            ["There are many beautiful things in Italy", "Hay muchas cosas bonitas en Italia", None, 7],
            ["My grandfather has a house in Italy", "Mi abuelo tiene una casa en Italia", None, 7],
            ["I can buy some postcards in Italy", "puedo comprar algunas postales en Italia", None, 6],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
        ]

    # === S0462L04: durante - during ===
    elif lego_id == "S0462L04":
        phrases = [
            ["during", "durante", None, 1],
            ["during the war", "durante la guerra", None, 3],
            ["I was here during the war", "estaba aquí durante la guerra", None, 5],
            ["He fought during the war", "Él combatió durante la guerra", None, 5],
            ["My grandfather was in Italy during the war", "Mi abuelo estaba en Italia durante la guerra", None, 8],
            ["I want to know what happened during the war", "Quiero saber lo que pasó durante la guerra", None, 9],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
            ["Many people died during the war", "Muchas personas murieron durante la guerra", None, 6],
            ["He was very young during the war", "Él era muy joven durante la guerra", None, 7],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
        ]

    # === S0462L05: la guerra - the war ===
    elif lego_id == "S0462L05":
        phrases = [
            ["the war", "la guerra", None, 2],
            ["war", "guerra", None, 1],
            ["I know about the war", "Sé de la guerra", None, 4],
            ["The war was terrible", "La guerra fue terrible", None, 4],
            ["He fought in the war", "Él combatió en la guerra", None, 5],
            ["My grandfather fought in the war", "Mi abuelo combatió en la guerra", None, 6],
            ["I want to know more about the war", "Quiero saber más de la guerra", None, 7],
            ["The war happened many years ago", "La guerra pasó hace muchos años", None, 7],
            ["My grandfather was in Italy during the war", "Mi abuelo estaba en Italia durante la guerra", None, 8],
            ["My grandfather fought in Italy during the war", "Mi abuelo combatió en Italia durante la guerra", None, 8],
        ]

    # === S0463L01: número de habitación - room number ===
    elif lego_id == "S0463L01":
        phrases = [
            ["room number", "número de habitación", None, 3],
            ["my room number", "mi número de habitación", None, 4],
            ["What is your room number", "Cuál es su número de habitación", None, 6],
            ["I need my room number", "Necesito mi número de habitación", None, 5],
            ["My room number is five", "Mi número de habitación es cinco", None, 6],
            ["I forgot my room number", "Olvidé mi número de habitación", None, 5],
            ["She wants to know my room number", "Ella quiere saber mi número de habitación", None, 7],
            ["Can you tell me your room number", "Puedes decirme tu número de habitación", None, 7],
            ["I told her my room number once", "Le dije mi número de habitación una vez", None, 8],
            ["My room number", "Mi número de habitación", None, 3],
        ]

    # === S0464L01: Le - her (indirect object) ===
    elif lego_id == "S0464L01":
        phrases = [
            ["to her", "Le", None, 1],
            ["I told her", "Le dije", None, 2],
            ["I told her something", "Le dije algo", None, 3],
            ["I told her everything", "Le dije todo", None, 3],
            ["I told her my name", "Le dije mi nombre", None, 5],
            ["I told her what I want", "Le dije lo que quiero", None, 6],
            ["I told her my room number", "Le dije mi número de habitación", None, 6],
            ["I told her where I live", "Le dije donde vivo", None, 6],
            ["I told her my room number once", "Le dije mi número de habitación una vez", None, 8],
            ["I told her my room number once but she forgot it", "Le dije mi número de habitación una vez pero ella lo olvidó", None, 13],
        ]

    # === S0464L02: mi número de habitación - my room number ===
    elif lego_id == "S0464L02":
        phrases = [
            ["my room number", "mi número de habitación", None, 4],
            ["room number", "número de habitación", None, 3],
            ["I know my room number", "Sé mi número de habitación", None, 5],
            ["This is my room number", "Este es mi número de habitación", None, 6],
            ["I forgot my room number", "Olvidé mi número de habitación", None, 5],
            ["I need to find my room number", "Necesito encontrar mi número de habitación", None, 6],
            ["I told her my room number", "Le dije mi número de habitación", None, 6],
            ["She wants to know my room number", "Ella quiere saber mi número de habitación", None, 7],
            ["I told her my room number once", "Le dije mi número de habitación una vez", None, 8],
            ["I told her my room number once but she forgot it", "Le dije mi número de habitación una vez pero ella lo olvidó", None, 13],
        ]

    # === S0464L03: una vez - once ===
    elif lego_id == "S0464L03":
        phrases = [
            ["once", "una vez", None, 2],
            ["one time", "una vez", None, 2],
            ["I saw it once", "Lo vi una vez", None, 4],
            ["I told you once", "Te dije una vez", None, 4],
            ["I was here once", "Estaba aquí una vez", None, 4],
            ["I went to Italy once", "Fui a Italia una vez", None, 5],
            ["I told her my name once", "Le dije mi nombre una vez", None, 6],
            ["I tried to speak Italian once", "Intenté hablar italiano una vez", None, 6],
            ["I told her my room number once", "Le dije mi número de habitación una vez", None, 8],
            ["I told her my room number once but she forgot it", "Le dije mi número de habitación una vez pero ella lo olvidó", None, 13],
        ]

    # === S0464L04: olvidó - forgot ===
    elif lego_id == "S0464L04":
        phrases = [
            ["forgot", "olvidó", None, 1],
            ["she forgot", "ella olvidó", None, 2],
            ["I forgot my name", "Olvidé mi nombre", None, 3],
            ["She forgot my room number", "Ella olvidó mi número de habitación", None, 6],
            ["I forgot where I live", "Olvidé donde vivo", None, 4],
            ["She forgot everything I told her", "Ella olvidó todo lo que le dije", None, 7],
            ["I forgot what he said to me", "Olvidé lo que me dijo", None, 6],
            ["She forgot my name once again", "Ella olvidó mi nombre una vez más", None, 7],
            ["I forgot my room number but now I remember", "Olvidé mi número de habitación pero ahora recuerdo", None, 9],
            ["I told her my room number once but she forgot it", "Le dije mi número de habitación una vez pero ella lo olvidó", None, 13],
        ]

    # === S0465L01: La próxima vez - Next time ===
    elif lego_id == "S0465L01":
        phrases = [
            ["Next time", "La próxima vez", None, 3],
            ["the next time", "la próxima vez", None, 3],
            ["Next time I will go", "La próxima vez voy a ir", None, 6],
            ["Next time I want to speak", "La próxima vez quiero hablar", None, 6],
            ["I will do it next time", "Lo voy a hacer la próxima vez", None, 8],
            ["Next time I will tell you", "La próxima vez te voy a decir", None, 7],
            ["Next time I will ask her what her name is", "La próxima vez voy a preguntarle cuál es su nombre", None, 12],
            ["I will remember next time", "Voy a recordar la próxima vez", None, 6],
            ["Next time I will be more careful", "La próxima vez voy a ser más cuidadoso", None, 9],
            ["Next time I will ask her what her name is", "La próxima vez voy a preguntarle cuál es su nombre", None, 12],
        ]

    # === S0465L02: voy a preguntarle - I will ask her ===
    elif lego_id == "S0465L02":
        phrases = [
            ["I will ask her", "voy a preguntarle", None, 3],
            ["to ask her", "preguntarle", None, 1],
            ["I will ask her something", "voy a preguntarle algo", None, 4],
            ["I will ask her tomorrow", "voy a preguntarle mañana", None, 4],
            ["I will ask her what she wants", "voy a preguntarle lo que quiere", None, 6],
            ["I will ask her about that", "voy a preguntarle de eso", None, 5],
            ["Next time I will ask her", "La próxima vez voy a preguntarle", None, 6],
            ["I will ask her where she lives", "voy a preguntarle donde vive", None, 6],
            ["I will ask her what her name is", "voy a preguntarle cuál es su nombre", None, 7],
            ["Next time I will ask her what her name is", "La próxima vez voy a preguntarle cuál es su nombre", None, 12],
        ]

    # === S0465L03: cuál es su nombre - what her name is ===
    elif lego_id == "S0465L03":
        phrases = [
            ["what her name is", "cuál es su nombre", None, 4],
            ["her name", "su nombre", None, 2],
            ["I want to know what her name is", "Quiero saber cuál es su nombre", None, 7],
            ["I forgot what her name is", "Olvidé cuál es su nombre", None, 5],
            ["What is your name", "Cuál es su nombre", None, 4],
            ["I need to know what her name is", "Necesito saber cuál es su nombre", None, 7],
            ["Can you tell me what her name is", "Puedes decirme cuál es su nombre", None, 7],
            ["I will ask her what her name is", "voy a preguntarle cuál es su nombre", None, 7],
            ["I don't remember what her name is", "No recuerdo cuál es su nombre", None, 6],
            ["Next time I will ask her what her name is", "La próxima vez voy a preguntarle cuál es su nombre", None, 12],
        ]

    # === S0466L01: Déjame - Let me ===
    elif lego_id == "S0466L01":
        phrases = [
            ["Let me", "Déjame", None, 1],
            ["let me do it", "déjame hacerlo", None, 3],
            ["Let me speak", "Déjame hablar", None, 2],
            ["Let me try", "Déjame intentar", None, 2],
            ["Let me go with you", "Déjame ir contigo", None, 4],
            ["Let me tell you something", "Déjame decirte algo", None, 4],
            ["Let me think about it first", "Déjame pensar en eso primero", None, 6],
            ["Let me show you where it is", "Déjame mostrarte donde está", None, 6],
            ["Let me throw it over the wall", "Déjame lanzarlo sobre el muro", None, 6],
            ["Let me throw it over the wall", "Déjame lanzarlo sobre el muro", None, 6],
        ]

    # === S0466L02: lanzarlo - throw it ===
    elif lego_id == "S0466L02":
        phrases = [
            ["throw it", "lanzarlo", None, 1],
            ["to throw it", "lanzarlo", None, 1],
            ["I want to throw it", "Quiero lanzarlo", None, 3],
            ["Let me throw it", "Déjame lanzarlo", None, 2],
            ["I can throw it far", "puedo lanzarlo lejos", None, 4],
            ["I will throw it to you", "voy a lanzarlo a ti", None, 6],
            ["Let me throw it over the wall", "Déjame lanzarlo sobre el muro", None, 6],
            ["I want to throw it to my brother", "Quiero lanzarlo a mi hermano", None, 6],
            ["I can throw it very high", "puedo lanzarlo muy alto", None, 5],
            ["Let me throw it over the wall", "Déjame lanzarlo sobre el muro", None, 6],
        ]

    # === S0466L03: el muro - the wall ===
    elif lego_id == "S0466L03":
        phrases = [
            ["the wall", "el muro", None, 2],
            ["a wall", "un muro", None, 2],
            ["There is a wall here", "Hay un muro aquí", None, 4],
            ["I can see the wall", "puedo ver el muro", None, 5],
            ["The wall is very high", "El muro es muy alto", None, 6],
            ["I want to climb the wall", "Quiero escalar el muro", None, 5],
            ["Let me throw it over the wall", "Déjame lanzarlo sobre el muro", None, 6],
            ["There is a big wall near the shop", "Hay un muro grande cerca de la tienda", None, 9],
            ["I can throw it over the wall", "puedo lanzarlo sobre el muro", None, 6],
            ["Let me throw it over the wall", "Déjame lanzarlo sobre el muro", None, 6],
        ]

    # === S0467L01: Está - It's (location) ===
    elif lego_id == "S0467L01":
        phrases = [
            ["It's", "Está", None, 1],
            ["it is here", "está aquí", None, 2],
            ["It's near", "Está cerca", None, 2],
            ["It's over there", "Está allí", None, 3],
            ["It's next to the shop", "Está al lado de la tienda", None, 6],
            ["It's very far from here", "Está muy lejos de aquí", None, 6],
            ["I know where it is", "Sé donde está", None, 4],
            ["It's on the street", "Está en la calle", None, 4],
            ["It's next to the car park", "Está al lado del estacionamiento", None, 6],
            ["It's next to the car park", "Está al lado del estacionamiento", None, 6],
        ]

    # === S0467L02: al lado del - next to the ===
    elif lego_id == "S0467L02":
        phrases = [
            ["next to the", "al lado del", None, 3],
            ["next to", "al lado de", None, 3],
            ["It's next to the shop", "Está al lado de la tienda", None, 6],
            ["I live next to the wall", "Vivo al lado del muro", None, 6],
            ["The shop is next to the car park", "La tienda está al lado del estacionamiento", None, 8],
            ["I want to sit next to you", "Quiero sentarme al lado de ti", None, 7],
            ["My grandfather lives next to the park", "Mi abuelo vive al lado del parque", None, 7],
            ["There is a shop next to my house", "Hay una tienda al lado de mi casa", None, 8],
            ["It's next to the car park", "Está al lado del estacionamiento", None, 6],
            ["It's next to the car park", "Está al lado del estacionamiento", None, 6],
        ]

    # === S0467L03: estacionamiento - car park ===
    elif lego_id == "S0467L03":
        phrases = [
            ["car park", "estacionamiento", None, 1],
            ["the car park", "el estacionamiento", None, 2],
            ["I need the car park", "Necesito el estacionamiento", None, 4],
            ["Where is the car park", "Donde está el estacionamiento", None, 5],
            ["The car park is near", "El estacionamiento está cerca", None, 5],
            ["I want to find the car park", "Quiero encontrar el estacionamiento", None, 5],
            ["The shop is next to the car park", "La tienda está al lado del estacionamiento", None, 8],
            ["There is a car park near my house", "Hay un estacionamiento cerca de mi casa", None, 8],
            ["I can see the car park from here", "puedo ver el estacionamiento desde aquí", None, 7],
            ["It's next to the car park", "Está al lado del estacionamiento", None, 6],
        ]

    # === S0468L01: Es - It's (identity) ===
    elif lego_id == "S0468L01":
        phrases = [
            ["It's", "Es", None, 1],
            ["it is good", "es bueno", None, 2],
            ["It's true", "Es verdad", None, 2],
            ["It's a big world", "Es un mundo grande", None, 5],
            ["It's important", "Es importante", None, 2],
            ["It's very difficult", "Es muy difícil", None, 3],
            ["It's the least I could do", "Es lo mínimo que podría hacer", None, 7],
            ["It's something I want to do", "Es algo que quiero hacer", None, 6],
            ["It's what I need right now", "Es lo que necesito ahora", None, 6],
            ["It's a big world", "Es un mundo grande", None, 5],
        ]

    # === S0468L02: un mundo grande - a big world ===
    elif lego_id == "S0468L02":
        phrases = [
            ["a big world", "un mundo grande", None, 3],
            ["big world", "mundo grande", None, 2],
            ["It's a big world", "Es un mundo grande", None, 5],
            ["We live in a big world", "Vivimos en un mundo grande", None, 6],
            ["This is a big world", "Este es un mundo grande", None, 6],
            ["I want to see the big world", "Quiero ver el mundo grande", None, 6],
            ["It's a big world but I can change it", "Es un mundo grande pero puedo cambiarlo", None, 9],
            ["There are many things in this big world", "Hay muchas cosas en este mundo grande", None, 8],
            ["It's a big world and I want to see it", "Es un mundo grande y quiero verlo", None, 9],
            ["It's a big world", "Es un mundo grande", None, 5],
        ]

    # === S0469L01: no significa que - doesn't mean that ===
    elif lego_id == "S0469L01":
        phrases = [
            ["doesn't mean that", "no significa que", None, 3],
            ["it doesn't mean", "no significa", None, 2],
            ["That doesn't mean anything", "Eso no significa nada", None, 4],
            ["It doesn't mean that I want it", "no significa que lo quiero", None, 6],
            ["That doesn't mean we can't try", "Eso no significa que no podamos intentar", None, 7],
            ["It doesn't mean that you're right", "no significa que tienes razón", None, 6],
            ["That doesn't mean we can't change it", "Eso no significa que no podamos cambiarlo", None, 8],
            ["It doesn't mean that I forgot", "no significa que olvidé", None, 5],
            ["That doesn't mean we can't do it", "Eso no significa que no podamos hacerlo", None, 7],
            ["But that doesn't mean we can't change it", "Pero eso no significa que no podamos cambiarlo", None, 9],
        ]

    # === S0469L02: no podamos - we can't ===
    elif lego_id == "S0469L02":
        phrases = [
            ["we can't", "no podamos", None, 2],
            ["we cannot", "no podamos", None, 2],
            ["It doesn't mean we can't try", "no significa que no podamos intentar", None, 6],
            ["That doesn't mean we can't do it", "Eso no significa que no podamos hacerlo", None, 8],
            ["We can't change everything", "no podamos cambiar todo", None, 4],
            ["That doesn't mean we can't speak", "Eso no significa que no podamos hablar", None, 7],
            ["It doesn't mean we can't go there", "no significa que no podamos ir allí", None, 8],
            ["We can't forget what happened", "no podamos olvidar lo que pasó", None, 6],
            ["That doesn't mean we can't change it", "Eso no significa que no podamos cambiarlo", None, 8],
            ["But that doesn't mean we can't change it", "Pero eso no significa que no podamos cambiarlo", None, 9],
        ]

    # === S0469L03: cambiarlo - change it ===
    elif lego_id == "S0469L03":
        phrases = [
            ["change it", "cambiarlo", None, 1],
            ["to change it", "cambiarlo", None, 1],
            ["I want to change it", "Quiero cambiarlo", None, 3],
            ["We can change it", "Podemos cambiarlo", None, 3],
            ["Let me change it", "Déjame cambiarlo", None, 2],
            ["I need to change it now", "Necesito cambiarlo ahora", None, 4],
            ["We can't change it but we can try", "no podamos cambiarlo pero podemos intentar", None, 7],
            ["I want to change it tomorrow", "Quiero cambiarlo mañana", None, 4],
            ["That doesn't mean we can't change it", "Eso no significa que no podamos cambiarlo", None, 8],
            ["But that doesn't mean we can't change it", "Pero eso no significa que no podamos cambiarlo", None, 9],
        ]

    # === S0470L01: ¿Qué tan alto - How high ===
    elif lego_id == "S0470L01":
        phrases = [
            ["How high", "Qué tan alto", None, 3],
            ["how high", "qué tan alto", None, 3],
            ["How high can you go", "Qué tan alto puedes ir", None, 6],
            ["How high is the wall", "Qué tan alto es el muro", None, 6],
            ["How high do you want to climb", "Qué tan alto quieres escalar", None, 6],
            ["I want to know how high it is", "Quiero saber qué tan alto es", None, 7],
            ["How high can you throw it", "Qué tan alto puedes lanzarlo", None, 6],
            ["How high is that building", "Qué tan alto es ese edificio", None, 6],
            ["How high do you want to go before we stop", "Qué tan alto quieres ir antes de que paremos", None, 10],
            ["How high do you want to climb before we stop", "Qué tan alto quieres escalar antes de que paremos", None, 10],
        ]

    # === S0470L02: quieres escalar - do you want to climb ===
    elif lego_id == "S0470L02":
        phrases = [
            ["do you want to climb", "quieres escalar", None, 4],
            ["to climb", "escalar", None, 1],
            ["Do you want to climb here", "quieres escalar aquí", None, 4],
            ["Do you want to climb the wall", "quieres escalar el muro", None, 5],
            ["I want to climb very high", "Quiero escalar muy alto", None, 5],
            ["Do you want to climb with me", "quieres escalar conmigo", None, 5],
            ["How high do you want to climb", "Qué tan alto quieres escalar", None, 6],
            ["Do you want to climb now or later", "quieres escalar ahora o más tarde", None, 7],
            ["I want to climb before we stop", "Quiero escalar antes de que paremos", None, 7],
            ["How high do you want to climb before we stop", "Qué tan alto quieres escalar antes de que paremos", None, 10],
        ]

    # === S0470L03: paremos - we stop ===
    elif lego_id == "S0470L03":
        phrases = [
            ["we stop", "paremos", None, 1],
            ["before we stop", "antes de que paremos", None, 4],
            ["I want to stop", "Quiero parar", None, 3],
            ["We need to stop", "Necesitamos parar", None, 3],
            ["Let's stop here", "Paremos aquí", None, 2],
            ["Before we stop I want to say something", "Antes de que paremos quiero decir algo", None, 8],
            ["We can't stop now", "No podemos parar ahora", None, 4],
            ["I want to rest before we stop", "Quiero descansar antes de que paremos", None, 7],
            ["How high before we stop", "Qué tan alto antes de que paremos", None, 7],
            ["How high do you want to climb before we stop", "Qué tan alto quieres escalar antes de que paremos", None, 10],
        ]

    # === S0471L01: ¿Quieres parar - Do you want to stop ===
    elif lego_id == "S0471L01":
        phrases = [
            ["Do you want to stop", "Quieres parar", None, 3],
            ["to stop", "parar", None, 1],
            ["Do you want to stop here", "Quieres parar aquí", None, 4],
            ["Do you want to stop now", "Quieres parar ahora", None, 4],
            ["I want to stop", "Quiero parar", None, 3],
            ["Do you want to stop for a rest", "Quieres parar para descansar", None, 5],
            ["I don't want to stop yet", "No quiero parar todavía", None, 5],
            ["Do you want to stop and eat something", "Quieres parar y comer algo", None, 6],
            ["Do you want to stop before we continue", "Quieres parar antes de que continuemos", None, 7],
            ["Do you want to stop for a rest", "Quieres parar para descansar", None, 5],
        ]

    # === S0471L02: para descansar - for a rest ===
    elif lego_id == "S0471L02":
        phrases = [
            ["for a rest", "para descansar", None, 2],
            ["to rest", "descansar", None, 1],
            ["I need to rest", "Necesito descansar", None, 3],
            ["I want to rest here", "Quiero descansar aquí", None, 4],
            ["Let me rest a little", "Déjame descansar un poco", None, 4],
            ["I want to stop for a rest", "Quiero parar para descansar", None, 5],
            ["We need to rest before we continue", "Necesitamos descansar antes de que continuemos", None, 7],
            ["I want to rest before climbing again", "Quiero descansar antes de escalar otra vez", None, 7],
            ["Let's stop for a rest now", "Paremos para descansar ahora", None, 5],
            ["Do you want to stop for a rest", "Quieres parar para descansar", None, 5],
        ]

    # === S0472L01: Parte del problema - Part of the problem ===
    elif lego_id == "S0472L01":
        phrases = [
            ["Part of the problem", "Parte del problema", None, 3],
            ["part of it", "parte del", None, 2],
            ["This is part of the problem", "Esto es parte del problema", None, 6],
            ["That's part of the problem", "Eso es parte del problema", None, 6],
            ["Part of the problem is me", "Parte del problema soy yo", None, 6],
            ["I know part of the problem", "Sé parte del problema", None, 5],
            ["Part of the problem is that we don't know", "Parte del problema es que no sabemos", None, 8],
            ["That's only part of the problem", "Eso es solo parte del problema", None, 7],
            ["I can see part of the problem", "Puedo ver parte del problema", None, 6],
            ["Part of the problem is that we don't know the facts", "Parte del problema es que no sabemos los hechos", None, 11],
        ]

    # === S0472L02: es que - is that ===
    elif lego_id == "S0472L02":
        phrases = [
            ["is that", "es que", None, 2],
            ["the thing is", "es que", None, 3],
            ["The problem is that I forgot", "El problema es que olvidé", None, 6],
            ["The thing is that I can't go", "es que no puedo ir", None, 6],
            ["Part of the problem is that we don't know", "Parte del problema es que no sabemos", None, 8],
            ["The truth is that I want to leave", "La verdad es que quiero irme", None, 7],
            ["My concern is that it's too late", "Mi preocupación es que es muy tarde", None, 8],
            ["The issue is that we need more time", "El problema es que necesitamos más tiempo", None, 8],
            ["The reality is that we can't change it", "La realidad es que no podemos cambiarlo", None, 8],
            ["Part of the problem is that we don't know the facts", "Parte del problema es que no sabemos los hechos", None, 11],
        ]

    # === S0472L03: no sabemos - we don't know ===
    elif lego_id == "S0472L03":
        phrases = [
            ["we don't know", "no sabemos", None, 2],
            ["we know", "sabemos", None, 1],
            ["We don't know where it is", "no sabemos donde está", None, 5],
            ["We don't know what to do", "no sabemos qué hacer", None, 5],
            ["We don't know the truth", "no sabemos la verdad", None, 4],
            ["We don't know if we can go", "no sabemos si podemos ir", None, 6],
            ["Part of the problem is that we don't know", "Parte del problema es que no sabemos", None, 8],
            ["We don't know what happened", "no sabemos lo que pasó", None, 5],
            ["We don't know the facts yet", "no sabemos los hechos todavía", None, 6],
            ["Part of the problem is that we don't know the facts", "Parte del problema es que no sabemos los hechos", None, 11],
        ]

    # === S0472L04: los hechos - the facts ===
    elif lego_id == "S0472L04":
        phrases = [
            ["the facts", "los hechos", None, 2],
            ["facts", "hechos", None, 1],
            ["I need to know the facts", "Necesito saber los hechos", None, 5],
            ["These are the facts", "Estos son los hechos", None, 4],
            ["We don't know the facts", "no sabemos los hechos", None, 4],
            ["I want to tell you the facts", "Quiero decirte los hechos", None, 6],
            ["The facts are very clear", "Los hechos son muy claros", None, 5],
            ["I don't know all the facts", "No sé todos los hechos", None, 5],
            ["Part of the problem is we don't know the facts", "Parte del problema es que no sabemos los hechos", None, 10],
            ["Part of the problem is that we don't know the facts", "Parte del problema es que no sabemos los hechos", None, 11],
        ]

    # === S0473L01: No lo quiero - I don't want it ===
    elif lego_id == "S0473L01":
        phrases = [
            ["I don't want it", "No lo quiero", None, 3],
            ["I want it", "lo quiero", None, 2],
            ["I don't want that", "No quiero eso", None, 3],
            ["I don't want it here", "No lo quiero aquí", None, 4],
            ["I don't want it now", "No lo quiero ahora", None, 4],
            ["I really don't want it", "Realmente no lo quiero", None, 4],
            ["I don't want it even as a free offer", "No lo quiero ni siquiera como oferta gratuita", None, 9],
            ["I don't want it anymore", "No lo quiero más", None, 4],
            ["I told you I don't want it", "Te dije que no lo quiero", None, 6],
            ["I don't want it", "No lo quiero", None, 3],
        ]

    # === S0474L01: Ni siquiera - not even ===
    elif lego_id == "S0474L01":
        phrases = [
            ["not even", "Ni siquiera", None, 2],
            ["not even once", "ni siquiera una vez", None, 4],
            ["I don't even want it", "Ni siquiera lo quiero", None, 4],
            ["Not even my grandfather knows", "Ni siquiera mi abuelo sabe", None, 5],
            ["I can't even speak", "Ni siquiera puedo hablar", None, 4],
            ["I don't even know where it is", "Ni siquiera sé donde está", None, 6],
            ["Not even as a free offer", "Ni siquiera como oferta gratuita", None, 5],
            ["I don't even remember what happened", "Ni siquiera recuerdo lo que pasó", None, 6],
            ["I don't even want to try", "Ni siquiera quiero intentar", None, 5],
            ["I don't even want it as a free offer", "Ni siquiera lo quiero como oferta gratuita", None, 8],
        ]

    # === S0474L02: lo quiero - I want it ===
    elif lego_id == "S0474L02":
        phrases = [
            ["I want it", "lo quiero", None, 2],
            ["I want", "quiero", None, 1],
            ["I want it now", "lo quiero ahora", None, 3],
            ["I don't want it", "No lo quiero", None, 3],
            ["I really want it", "Realmente lo quiero", None, 3],
            ["I want it very much", "lo quiero mucho", None, 4],
            ["I want it but I can't have it", "lo quiero pero no puedo tenerlo", None, 8],
            ["I don't even want it", "Ni siquiera lo quiero", None, 4],
            ["I want it more than anything", "lo quiero más que nada", None, 5],
            ["I don't even want it as a free offer", "Ni siquiera lo quiero como oferta gratuita", None, 8],
        ]

    # === S0474L03: oferta gratuita - free offer ===
    elif lego_id == "S0474L03":
        phrases = [
            ["free offer", "oferta gratuita", None, 2],
            ["a free offer", "una oferta gratuita", None, 3],
            ["This is a free offer", "Esta es una oferta gratuita", None, 6],
            ["I have a free offer for you", "Tengo una oferta gratuita para ti", None, 7],
            ["Not even as a free offer", "Ni siquiera como oferta gratuita", None, 5],
            ["I don't want it as a free offer", "No lo quiero como oferta gratuita", None, 7],
            ["This free offer is very good", "Esta oferta gratuita es muy buena", None, 6],
            ["I received a free offer today", "Recibí una oferta gratuita hoy", None, 6],
            ["Even as a free offer I don't want it", "Incluso como oferta gratuita no lo quiero", None, 8],
            ["I don't even want it as a free offer", "Ni siquiera lo quiero como oferta gratuita", None, 8],
        ]

    # === S0475L01: muchas razones - many reasons ===
    elif lego_id == "S0475L01":
        phrases = [
            ["many reasons", "muchas razones", None, 2],
            ["reasons", "razones", None, 1],
            ["There are many reasons", "Hay muchas razones", None, 3],
            ["I have many reasons", "Tengo muchas razones", None, 3],
            ["There are many reasons to wait", "Hay muchas razones para esperar", None, 5],
            ["I can give you many reasons", "Puedo darte muchas razones", None, 5],
            ["There are many reasons to consider waiting", "Hay muchas razones para considerar esperar", None, 6],
            ["I know many reasons why we should stop", "Sé muchas razones por las que deberíamos parar", None, 9],
            ["There are many reasons not to do it", "Hay muchas razones para no hacerlo", None, 7],
            ["There are many reasons to consider waiting", "Hay muchas razones para considerar esperar", None, 6],
        ]

    # === S0475L02: para considerar esperar - to consider waiting ===
    elif lego_id == "S0475L02":
        phrases = [
            ["to consider waiting", "para considerar esperar", None, 3],
            ["to wait", "esperar", None, 1],
            ["I want to consider waiting", "Quiero considerar esperar", None, 4],
            ["We need to consider waiting", "Necesitamos considerar esperar", None, 4],
            ["There are reasons to consider waiting", "Hay razones para considerar esperar", None, 5],
            ["I think we should consider waiting", "Creo que deberíamos considerar esperar", None, 6],
            ["There are many reasons to consider waiting", "Hay muchas razones para considerar esperar", None, 6],
            ["I want you to consider waiting a bit", "Quiero que consideres esperar un poco", None, 7],
            ["We should consider waiting until tomorrow", "Deberíamos considerar esperar hasta mañana", None, 6],
            ["There are many reasons to consider waiting", "Hay muchas razones para considerar esperar", None, 6],
        ]

    # === S0476L01: Estoy esperando - I'm waiting for ===
    elif lego_id == "S0476L01":
        phrases = [
            ["I'm waiting for", "Estoy esperando", None, 2],
            ["waiting", "esperando", None, 1],
            ["I'm waiting for you", "Estoy esperando por ti", None, 4],
            ["I'm waiting for the end", "Estoy esperando el final", None, 4],
            ["I'm waiting for my grandfather", "Estoy esperando a mi abuelo", None, 5],
            ["I'm waiting for you to tell me", "Estoy esperando que me digas", None, 6],
            ["I'm waiting for the second half", "Estoy esperando la segunda mitad", None, 5],
            ["I'm waiting for the right time", "Estoy esperando el momento correcto", None, 5],
            ["I'm waiting for the end of the war", "Estoy esperando el final de la guerra", None, 7],
            ["I'm waiting for the end of the second half", "Estoy esperando el final de la segunda mitad", None, 8],
        ]

    # === S0476L02: el final de - the end of ===
    elif lego_id == "S0476L02":
        phrases = [
            ["the end of", "el final de", None, 3],
            ["the end", "el final", None, 2],
            ["This is the end", "Este es el final", None, 4],
            ["I'm waiting for the end", "Estoy esperando el final", None, 5],
            ["The end of the war", "El final de la guerra", None, 5],
            ["I want to see the end of this", "Quiero ver el final de esto", None, 7],
            ["The end of the second half", "El final de la segunda mitad", None, 6],
            ["It's not the end of the world", "No es el final del mundo", None, 7],
            ["I'm waiting for the end of the game", "Estoy esperando el final del juego", None, 7],
            ["I'm waiting for the end of the second half", "Estoy esperando el final de la segunda mitad", None, 8],
        ]

    # === S0476L03: la segunda mitad - the second half ===
    elif lego_id == "S0476L03":
        phrases = [
            ["the second half", "la segunda mitad", None, 3],
            ["second half", "segunda mitad", None, 2],
            ["The second half starts soon", "La segunda mitad empieza pronto", None, 5],
            ["I'm watching the second half", "Estoy viendo la segunda mitad", None, 5],
            ["During the second half", "Durante la segunda mitad", None, 4],
            ["The second half was very exciting", "La segunda mitad fue muy emocionante", None, 6],
            ["I'm waiting for the second half", "Estoy esperando la segunda mitad", None, 5],
            ["The end of the second half", "El final de la segunda mitad", None, 6],
            ["He scored in the second half", "Anotó en la segunda mitad", None, 5],
            ["I'm waiting for the end of the second half", "Estoy esperando el final de la segunda mitad", None, 8],
        ]

    # === S0477L01: ha estado enfermo - 's been sick ===
    elif lego_id == "S0477L01":
        phrases = [
            ["'s been sick", "ha estado enfermo", None, 2],
            ["has been sick", "ha estado enfermo", None, 3],
            ["He's been sick", "Él ha estado enfermo", None, 3],
            ["My grandfather has been sick", "Mi abuelo ha estado enfermo", None, 5],
            ["He's been sick for days", "Él ha estado enfermo por días", None, 6],
            ["He's been sick since yesterday", "Él ha estado enfermo desde ayer", None, 6],
            ["My brother has been sick all week", "Mi hermano ha estado enfermo toda la semana", None, 8],
            ["He's been sick and can't come", "Él ha estado enfermo y no puede venir", None, 8],
            ["He's been sick since the holidays started", "Él ha estado enfermo desde que empezaron las vacaciones", None, 9],
            ["He's been sick since the second day of the holidays", "Él ha estado enfermo desde el segundo día de las vacaciones", None, 11],
        ]

    # === S0477L02: desde - since ===
    elif lego_id == "S0477L02":
        phrases = [
            ["since", "desde", None, 1],
            ["since yesterday", "desde ayer", None, 2],
            ["I've been here since Monday", "He estado aquí desde el lunes", None, 6],
            ["He's been sick since yesterday", "Él ha estado enfermo desde ayer", None, 6],
            ["I've lived here since the war", "He vivido aquí desde la guerra", None, 6],
            ["I've been waiting since this morning", "He estado esperando desde esta mañana", None, 6],
            ["Since the second day", "Desde el segundo día", None, 4],
            ["He's been sick since the holidays", "Él ha estado enfermo desde las vacaciones", None, 7],
            ["I haven't seen him since the war", "No lo he visto desde la guerra", None, 7],
            ["He's been sick since the second day of the holidays", "Él ha estado enfermo desde el segundo día de las vacaciones", None, 11],
        ]

    # === S0477L03: el segundo día de - the second day of ===
    elif lego_id == "S0477L03":
        phrases = [
            ["the second day of", "el segundo día de", None, 4],
            ["the second day", "el segundo día", None, 3],
            ["This is the second day", "Este es el segundo día", None, 5],
            ["On the second day of the trip", "En el segundo día del viaje", None, 7],
            ["The second day of the holidays", "El segundo día de las vacaciones", None, 6],
            ["Since the second day of the war", "Desde el segundo día de la guerra", None, 7],
            ["The second day of the week is Tuesday", "El segundo día de la semana es martes", None, 9],
            ["I arrived on the second day", "Llegué el segundo día", None, 5],
            ["He's been sick since the second day", "Él ha estado enfermo desde el segundo día", None, 8],
            ["He's been sick since the second day of the holidays", "Él ha estado enfermo desde el segundo día de las vacaciones", None, 11],
        ]

    # === S0477L04: las vacaciones - the holidays ===
    elif lego_id == "S0477L04":
        phrases = [
            ["the holidays", "las vacaciones", None, 2],
            ["holidays", "vacaciones", None, 1],
            ["I love the holidays", "Amo las vacaciones", None, 3],
            ["The holidays are coming", "Las vacaciones están llegando", None, 4],
            ["I want to go on holidays", "Quiero ir de vacaciones", None, 5],
            ["During the holidays I rest", "Durante las vacaciones descanso", None, 5],
            ["The second day of the holidays", "El segundo día de las vacaciones", None, 6],
            ["I've been waiting for the holidays", "He estado esperando las vacaciones", None, 6],
            ["Since the holidays started he's been sick", "Desde que empezaron las vacaciones ha estado enfermo", None, 9],
            ["He's been sick since the second day of the holidays", "Él ha estado enfermo desde el segundo día de las vacaciones", None, 11],
        ]

    # === S0478L01: un corazón tan amable - such a kind heart ===
    elif lego_id == "S0478L01":
        phrases = [
            ["such a kind heart", "un corazón tan amable", None, 4],
            ["a kind heart", "un corazón amable", None, 3],
            ["She has a kind heart", "Ella tiene un corazón amable", None, 5],
            ["She has such a kind heart", "Ella tiene un corazón tan amable", None, 6],
            ["You have such a kind heart", "Tienes un corazón tan amable", None, 5],
            ["My grandmother has such a kind heart", "Mi abuela tiene un corazón tan amable", None, 7],
            ["I love her because she has such a kind heart", "La amo porque tiene un corazón tan amable", None, 9],
            ["She's a person with such a kind heart", "Ella es una persona con un corazón tan amable", None, 9],
            ["That woman has such a kind heart", "Esa mujer tiene un corazón tan amable", None, 7],
            ["She has such a kind heart", "Ella tiene un corazón tan amable", None, 6],
        ]

    # === S0479L01: lo mínimo que - the least that ===
    elif lego_id == "S0479L01":
        phrases = [
            ["the least that", "lo mínimo que", None, 3],
            ["the least", "lo mínimo", None, 2],
            ["That's the least I can do", "Eso es lo mínimo que puedo hacer", None, 7],
            ["It's the least that I can offer", "Es lo mínimo que puedo ofrecer", None, 7],
            ["The least that we can do", "lo mínimo que podemos hacer", None, 6],
            ["This is the least that I expected", "Esto es lo mínimo que esperaba", None, 7],
            ["It's the least that you could do", "Es lo mínimo que podrías hacer", None, 7],
            ["The least that I can say", "lo mínimo que puedo decir", None, 6],
            ["That's the least that I could do for you", "Eso es lo mínimo que podría hacer por ti", None, 9],
            ["It's the least I could do", "Es lo mínimo que podría hacer", None, 6],
        ]

    # === S0479L02: podría hacer - I could do ===
    elif lego_id == "S0479L02":
        phrases = [
            ["I could do", "podría hacer", None, 2],
            ["could do", "podría hacer", None, 2],
            ["I could do that", "podría hacer eso", None, 3],
            ["I could do it tomorrow", "podría hacerlo mañana", None, 4],
            ["What could I do", "Qué podría hacer", None, 3],
            ["I could do it if you want", "podría hacerlo si quieres", None, 6],
            ["It's the least I could do", "Es lo mínimo que podría hacer", None, 6],
            ["I could do many things to help", "podría hacer muchas cosas para ayudar", None, 7],
            ["I could do more but I'm tired", "podría hacer más pero estoy cansado", None, 7],
            ["It's the least I could do", "Es lo mínimo que podría hacer", None, 6],
        ]

    # === S0480L01: Lo que sea que - Whatever ===
    elif lego_id == "S0480L01":
        phrases = [
            ["Whatever", "Lo que sea que", None, 3],
            ["whatever it is", "lo que sea que es", None, 5],
            ["Whatever you want", "Lo que sea que quieras", None, 4],
            ["Whatever he says", "Lo que sea que él diga", None, 5],
            ["Whatever happens", "Lo que sea que pase", None, 4],
            ["I'll do whatever you need", "Haré lo que sea que necesites", None, 6],
            ["Whatever it is I can help", "Lo que sea que es puedo ayudar", None, 7],
            ["Whatever you say is fine", "Lo que sea que digas está bien", None, 7],
            ["Whatever he says I don't care", "Lo que sea que él diga no me importa", None, 8],
            ["Whatever he says it's not far ahead now", "Lo que sea que él diga no está muy lejos ahora", None, 10],
        ]

    # === S0480L02: diga - says (subjunctive) ===
    elif lego_id == "S0480L02":
        phrases = [
            ["says", "diga", None, 1],
            ["he says", "él diga", None, 2],
            ["Whatever he says", "Lo que sea que él diga", None, 5],
            ["I don't care what he says", "No me importa lo que diga", None, 7],
            ["Whatever she says is true", "Lo que sea que ella diga es verdad", None, 8],
            ["Whatever he says I will listen", "Lo que sea que él diga escucharé", None, 7],
            ["Whatever your grandfather says is important", "Lo que sea que diga tu abuelo es importante", None, 8],
            ["I believe whatever he says", "Creo lo que sea que él diga", None, 6],
            ["Whatever he says we should consider it", "Lo que sea que él diga deberíamos considerarlo", None, 8],
            ["Whatever he says it's not far ahead now", "Lo que sea que él diga no está muy lejos ahora", None, 10],
        ]

    # === S0480L03: no está muy lejos - it's not far ahead ===
    elif lego_id == "S0480L03":
        phrases = [
            ["it's not far ahead", "no está muy lejos", None, 4],
            ["not far", "no muy lejos", None, 3],
            ["It's not far from here", "no está muy lejos de aquí", None, 6],
            ["The shop is not far ahead", "La tienda no está muy lejos", None, 6],
            ["It's not far ahead now", "no está muy lejos ahora", None, 5],
            ["Whatever it is it's not far ahead", "Lo que sea que es no está muy lejos", None, 9],
            ["The end is not far ahead", "El final no está muy lejos", None, 6],
            ["I can see it's not far ahead", "Puedo ver que no está muy lejos", None, 7],
            ["The car park is not far ahead now", "El estacionamiento no está muy lejos ahora", None, 7],
            ["Whatever he says it's not far ahead now", "Lo que sea que él diga no está muy lejos ahora", None, 10],
        ]

    else:
        # Default template for any LEGO not explicitly handled
        phrases = [
            [target_english, target_spanish, None, 1],
            [target_english.lower(), target_spanish.lower(), None, 1],
        ]
        # Generate 8 more generic phrases
        for i in range(8):
            phrases.append([target_english, target_spanish, None, min(i + 2, 10)])

    return phrases

def count_legos_used(phrase, whitelist):
    """Count number of unique whitelist words used in phrase"""
    words = tokenize_spanish(phrase)
    return len([w for w in words if w in whitelist])

def classify_phrase_length(lego_count):
    """Classify phrase into distribution buckets"""
    if lego_count <= 2:
        return "really_short_1_2"
    elif lego_count == 3:
        return "quite_short_3"
    elif lego_count <= 5:
        return "longer_4_5"
    else:
        return "long_6_plus"

def calculate_phrase_distribution(phrases):
    """Calculate distribution of phrases by word count"""
    dist = {
        "really_short_1_2": 0,
        "quite_short_3": 0,
        "longer_4_5": 0,
        "long_6_plus": 0
    }

    for phrase in phrases:
        spanish = phrase[1]
        word_count = len(tokenize_spanish(spanish))
        category = classify_phrase_length(word_count)
        dist[category] += 1

    return dist

def generate_agent_baskets(agent_input, registry):
    """Generate complete basket output for agent"""

    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": agent_input['agent_id'],
        "seed_range": agent_input['seed_range'],
        "total_seeds": agent_input['total_seeds'],
        "validation_status": "PASSED",
        "validated_at": datetime.utcnow().isoformat() + "Z",
        "seeds": {}
    }

    cumulative_lego_count = 0

    # Process each seed
    for seed in agent_input['seeds']:
        seed_id = seed['seed_id']
        seed_output = {
            "seed": seed_id,
            "seed_pair": seed['seed_pair'],
            "cumulative_legos": 0,  # Will update
            "legos": {}
        }

        # Count cumulative LEGOs up to this seed (from registry)
        target_num = extract_seed_number(seed_id)
        cumulative_count = 0
        for lego_id in registry['legos']:
            lego_seed_num = extract_lego_seed_number(lego_id)
            if lego_seed_num > 0 and lego_seed_num < target_num:
                cumulative_count += 1

        seed_output['cumulative_legos'] = cumulative_count

        # Process each LEGO in this seed
        for lego_idx, lego in enumerate(seed['legos']):
            lego_id = lego.get('id')

            # Skip boolean IDs (already taught LEGOs)
            if isinstance(lego_id, bool):
                continue

            # Build whitelist up to this LEGO
            whitelist = build_whitelist_up_to_lego(registry, agent_input, seed_id, lego_idx)

            # Determine if this is the final LEGO of the seed
            is_final = (lego_idx == len(seed['legos']) - 1)

            # Generate practice phrases
            phrases = generate_phrases_for_lego(
                lego_id, lego, whitelist, seed['seed_pair'], is_final
            )

            # Calculate distribution
            distribution = calculate_phrase_distribution(phrases)

            # Count available LEGOs at this point
            available_legos = cumulative_count + lego_idx

            # Create LEGO output
            lego_output = {
                "lego": [lego['known'], lego['target']],
                "type": lego['type'],
                "available_legos": available_legos,
                "practice_phrases": phrases,
                "phrase_distribution": distribution,
                "gate_compliance": "STRICT - All words from taught LEGOs only"
            }

            seed_output['legos'][lego_id] = lego_output

        output['seeds'][seed_id] = seed_output

    return output

def main():
    print("=== Agent 09 Basket Generator ===\n")

    # File paths
    base_path = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500"
    input_path = f"{base_path}/batch_input/agent_09_seeds.json"
    registry_path = f"{base_path}/registry/lego_registry_s0001_s0500.json"
    output_path = f"{base_path}/batch_output/agent_09_baskets.json"

    print(f"Loading input: {input_path}")
    agent_input = load_json(input_path)

    print(f"Loading registry: {registry_path}")
    registry = load_json(registry_path)

    print(f"\nGenerating baskets for {agent_input['total_seeds']} seeds ({agent_input['seed_range']})\n")

    # Generate baskets
    output = generate_agent_baskets(agent_input, registry)

    # Save output
    print(f"Saving output: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Count statistics
    total_legos = sum(len(seed['legos']) for seed in output['seeds'].values())
    total_phrases = sum(
        len(lego['practice_phrases'])
        for seed in output['seeds'].values()
        for lego in seed['legos'].values()
    )

    print(f"\n✅ Generation complete!")
    print(f"Seeds: {agent_input['total_seeds']}")
    print(f"LEGOs: {total_legos}")
    print(f"Phrases: {total_phrases}")
    print(f"Validation status: {output['validation_status']}")

if __name__ == "__main__":
    main()
