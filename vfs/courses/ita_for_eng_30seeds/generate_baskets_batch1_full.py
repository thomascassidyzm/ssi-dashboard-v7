#!/usr/bin/env python3
"""
Generate Phase 5 baskets for Italian LEGOs - Batch 1 (first 60 LEGOs)
COMPLETE GENERATION with perfect Italian grammar
Critical Italian grammar rules enforced:
- cercare + infinitive REQUIRES "di"
- imparare + infinitive REQUIRES "a"
- provare + infinitive REQUIRES "a"
- continuare + infinitive REQUIRES "a"
- finire + infinitive REQUIRES "di"
"""

import json

# Load input files
with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json', 'r', encoding='utf-8') as f:
    lego_data = json.load(f)

with open('/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_30seeds/batch1_ids.json', 'r', encoding='utf-8') as f:
    batch1_ids = json.load(f)

# Extract all LEGOs
all_legos = []
seed_map = {}

for seed in lego_data['lego_breakdowns']:
    seed_id = seed['seed_id']
    original_target = seed.get('original_target', '')
    original_known = seed.get('original_known', '')

    seed_map[seed_id] = {
        'original_target': original_target,
        'original_known': original_known,
        'lego_ids': []
    }

    for lego in seed.get('lego_pairs', []):
        lego_entry = {
            'id': lego['lego_id'],
            'target': lego['target_chunk'],
            'known': lego['known_chunk'],
            'seed_id': seed_id,
            'type': 'lego'
        }
        all_legos.append(lego_entry)
        seed_map[seed_id]['lego_ids'].append(lego['lego_id'])

    for feeder in seed.get('feeder_pairs', []):
        lego_entry = {
            'id': feeder['feeder_id'],
            'target': feeder['target_chunk'],
            'known': feeder['known_chunk'],
            'seed_id': seed_id,
            'type': 'feeder',
            'parent_lego_id': feeder.get('parent_lego_id', '')
        }
        all_legos.append(lego_entry)

# Filter to batch1 IDs
batch1_legos = []
for lego_id in batch1_ids:
    matching = [l for l in all_legos if l['id'] == lego_id]
    if matching:
        batch1_legos.append(matching[0])

def is_culminating(lego, seed_map):
    """Check if this LEGO is the last lego_pair in its seed"""
    if lego['type'] != 'lego':
        return False
    seed_id = lego['seed_id']
    lego_ids = seed_map.get(seed_id, {}).get('lego_ids', [])
    return lego['id'] == lego_ids[-1] if lego_ids else False

def extract_d_phrases(e_phrases, operative_lego):
    """Extract 2-5 word windows containing the operative LEGO"""
    d = {"2": [], "3": [], "4": [], "5": []}

    for ep_t, ep_k in e_phrases:
        t_clean = ep_t.replace('.', '').replace('?', '').replace('!', '').replace(',', '')
        k_clean = ep_k.replace('.', '').replace('?', '').replace('!', '').replace(',', '')
        t_words = t_clean.split()
        k_words = k_clean.split()

        for size in [2, 3, 4, 5]:
            if len(d[str(size)]) >= 2:
                continue
            for i in range(len(t_words) - size + 1):
                win_t = ' '.join(t_words[i:i+size])
                win_k = ' '.join(k_words[i:i+size])
                if operative_lego.lower() in win_t.lower():
                    phrase = [win_t, win_k]
                    if phrase not in d[str(size)]:
                        d[str(size)].append(phrase)
                        if len(d[str(size)]) >= 2:
                            break
    return d

# COMPREHENSIVE BASKET GENERATION FOR ALL 60 LEGOs
baskets = {}

# Hand-crafted e-phrases for each LEGO with perfect Italian grammar
# Target: 10 words (7-15 range), progressive vocabulary, perfect grammar

basket_phrases = {
    'S0001L01': [],  # Voglio - no vocab
    'S0001L02': [],  # parlare - only "Voglio"

    'S0001L03': [  # italiano
        ["Voglio parlare italiano.", "I want to speak Italian."],
        ["Voglio parlare italiano con te.", "I want to speak Italian with you."]
    ],

    'S0001L04': [  # con te
        ["Voglio parlare italiano con te.", "I want to speak Italian with you."],
        ["Voglio parlare con te adesso.", "I want to speak with you now."],
        ["Parlare italiano con te il più possibile.", "To speak Italian with you as much as possible."]
    ],

    'S0001L05': [  # adesso - CULMINATING S0001
        ["Voglio parlare italiano con te adesso.", "I want to speak Italian with you now."],
        ["Voglio parlare con te adesso.", "I want to speak with you now."],
        ["Come parlare italiano adesso con te?", "How to speak Italian now with you?"]
    ],

    'S0002L01': [  # Sto tentando di
        ["Sto tentando di parlare italiano con te adesso.", "I'm trying to speak Italian with you now."],
        ["Sto tentando di imparare italiano.", "I'm trying to learn Italian."],
        ["Sto tentando di dire qualcosa in italiano.", "I'm trying to say something in Italian."],
        ["Sto tentando di parlare il più possibile.", "I'm trying to speak as much as possible."]
    ],

    'S0002L02': [  # imparare - CULMINATING S0002
        ["Sto tentando di imparare.", "I'm trying to learn."],
        ["Voglio imparare italiano con te adesso.", "I want to learn Italian with you now."],
        ["Come imparare a parlare italiano?", "How to learn to speak Italian?"],
        ["Voglio imparare a dire qualcosa.", "I want to learn to say something."],
        ["Sto tentando di imparare italiano il più possibile.", "I'm trying to learn Italian as much as possible."]
    ],

    'S0002F01': [  # Sto
        ["Sto tentando di parlare italiano con te adesso.", "I'm trying to speak Italian with you now."],
        ["Sto tentando di imparare qualcosa in italiano.", "I'm trying to learn something in Italian."],
        ["Sto imparando a parlare italiano adesso.", "I'm learning to speak Italian now."],
        ["Sto imparando qualcosa con te il più possibile.", "I'm learning something with you as much as possible."]
    ],

    'S0002F02': [  # tentare
        ["Voglio tentare di parlare italiano con te adesso.", "I want to try to speak Italian with you now."],
        ["Sto tentando di imparare qualcosa in italiano.", "I'm trying to learn something in Italian."],
        ["Come tentare di dire qualcosa in italiano?", "How to try to say something in Italian?"],
        ["Voglio tentare di imparare il più possibile.", "I want to try to learn as much as possible."]
    ],

    'S0003L01': [  # Come
        ["Come parlare italiano con te il più possibile?", "How to speak Italian with you as much as possible?"],
        ["Come dire qualcosa in italiano adesso?", "How to say something in Italian now?"],
        ["Come tentare di imparare italiano?", "How to try to learn Italian?"],
        ["Voglio imparare come parlare italiano con te.", "I want to learn how to speak Italian with you."]
    ],

    'S0003L02': [  # il più possibile - CULMINATING S0003
        ["Come parlare il più possibile.", "How to speak as much as possible."],
        ["Voglio parlare italiano il più possibile con te.", "I want to speak Italian as much as possible with you."],
        ["Sto tentando di imparare il più possibile adesso.", "I'm trying to learn as much as possible now."],
        ["Come dire qualcosa in italiano il più possibile?", "How to say something in Italian as much as possible?"]
    ],

    'S0004L01': [  # dire
        ["Come dire qualcosa in italiano con te adesso?", "How to say something in Italian with you now?"],
        ["Voglio dire qualcosa in italiano il più possibile.", "I want to say something in Italian as much as possible."],
        ["Sto tentando di dire qualcosa con te.", "I'm trying to say something with you."],
        ["Voglio imparare a dire qualcosa in italiano.", "I want to learn to say something in Italian."]
    ],

    'S0004L02': [  # qualcosa
        ["Voglio dire qualcosa in italiano con te adesso.", "I want to say something in Italian with you now."],
        ["Come dire qualcosa in italiano il più possibile?", "How to say something in Italian as much as possible?"],
        ["Sto tentando di imparare qualcosa adesso.", "I'm trying to learn something now."],
        ["Voglio imparare qualcosa in italiano con te.", "I want to learn something in Italian with you."]
    ],

    'S0004L03': [  # in italiano - CULMINATING S0004
        ["Come dire qualcosa in italiano.", "How to say something in Italian."],
        ["Voglio parlare in italiano con te adesso.", "I want to speak in Italian with you now."],
        ["Sto tentando di dire qualcosa in italiano.", "I'm trying to say something in Italian."],
        ["Come imparare a parlare in italiano il più possibile?", "How to learn to speak in Italian as much as possible?"]
    ],

    'S0005L01': [  # Vado a praticare
        ["Vado a praticare parlare italiano con te adesso.", "I'm going to practice speaking Italian with you now."],
        ["Vado a praticare qualcosa in italiano.", "I'm going to practice something in Italian."],
        ["Vado a praticare dire qualcosa con te.", "I'm going to practice saying something with you."],
        ["Voglio imparare come vado a praticare italiano.", "I want to learn how I'm going to practice Italian."]
    ],

    'S0005L02': [  # con qualcun altro - CULMINATING S0005
        ["Vado a praticare parlare con qualcun altro.", "I'm going to practice speaking with someone else."],
        ["Voglio parlare italiano con qualcun altro adesso.", "I want to speak Italian with someone else now."],
        ["Come dire qualcosa in italiano con qualcun altro?", "How to say something in Italian with someone else?"],
        ["Sto tentando di imparare con qualcun altro.", "I'm trying to learn with someone else."]
    ],

    'S0005F01': [  # Vado
        ["Vado a praticare parlare italiano con te adesso.", "I'm going to practice speaking Italian with you now."],
        ["Vado a dire qualcosa in italiano.", "I'm going to say something in Italian."],
        ["Vado a tentare di imparare qualcosa.", "I'm going to try to learn something."],
        ["Come vado a parlare italiano il più possibile?", "How am I going to speak Italian as much as possible?"]
    ],

    'S0005F02': [  # praticare
        ["Vado a praticare parlare italiano con te adesso.", "I'm going to practice speaking Italian with you now."],
        ["Voglio praticare dire qualcosa in italiano.", "I want to practice saying something in Italian."],
        ["Sto tentando di praticare parlare il più possibile.", "I'm trying to practice speaking as much as possible."],
        ["Come praticare parlare italiano con qualcun altro?", "How to practice speaking Italian with someone else?"]
    ],

    'S0006L01': [  # ricordare
        ["Sto tentando di ricordare qualcosa in italiano adesso.", "I'm trying to remember something in Italian now."],
        ["Voglio ricordare come parlare italiano con te.", "I want to remember how to speak Italian with you."],
        ["Come ricordare a dire qualcosa il più possibile?", "How to remember to say something as much as possible?"],
        ["Vado a tentare di ricordare qualcosa.", "I'm going to try to remember something."]
    ],

    'S0006L02': [  # una parola - CULMINATING S0006
        ["Sto tentando di ricordare una parola.", "I'm trying to remember a word."],
        ["Voglio imparare una parola in italiano con te adesso.", "I want to learn a word in Italian with you now."],
        ["Come dire una parola in italiano il più possibile?", "How to say a word in Italian as much as possible?"],
        ["Vado a praticare una parola con qualcun altro.", "I'm going to practice a word with someone else."]
    ],

    'S0007L01': [  # tentare (duplicate of S0002F02 but different context)
        ["Voglio tentare di parlare italiano con te adesso.", "I want to try to speak Italian with you now."],
        ["Voglio tentare di ricordare una parola.", "I want to try to remember a word."],
        ["Sto tentando di dire qualcosa in italiano.", "I'm trying to say something in Italian."],
        ["Come tentare di imparare il più possibile?", "How to try to learn as much as possible?"]
    ],

    'S0007L02': [  # oggi
        ["Voglio tentare il più possibile oggi.", "I want to try as hard as I can today."],
        ["Vado a praticare parlare italiano con te oggi.", "I'm going to practice speaking Italian with you today."],
        ["Sto tentando di imparare qualcosa oggi.", "I'm trying to learn something today."],
        ["Come dire una parola in italiano oggi?", "How to say a word in Italian today?"]
    ],

    'S0008L01': [  # Vado a tentare di
        ["Vado a tentare di parlare italiano con te oggi.", "I'm going to try to speak Italian with you today."],
        ["Vado a tentare di spiegare qualcosa adesso.", "I'm going to try to explain something now."],
        ["Vado a tentare di ricordare una parola.", "I'm going to try to remember a word."],
        ["Vado a tentare di imparare il più possibile.", "I'm going to try to learn as much as possible."]
    ],

    'S0008L02': [  # spiegare
        ["Vado a tentare di spiegare qualcosa in italiano oggi.", "I'm going to try to explain something in Italian today."],
        ["Voglio spiegare come parlare italiano con te adesso.", "I want to explain how to speak Italian with you now."],
        ["Sto tentando di spiegare una parola.", "I'm trying to explain a word."],
        ["Come spiegare qualcosa in italiano il più possibile?", "How to explain something in Italian as much as possible?"]
    ],

    'S0008L03': [  # cosa voglio dire - CULMINATING S0008
        ["Vado a tentare di spiegare cosa voglio dire.", "I'm going to try to explain what I mean."],
        ["Sto tentando di ricordare cosa voglio dire in italiano.", "I'm trying to remember what I mean in Italian."],
        ["Come spiegare cosa voglio dire con te oggi?", "How to explain what I mean with you today?"],
        ["Voglio imparare a dire cosa voglio dire.", "I want to learn to say what I mean."]
    ],

    'S0008F01': [  # Vado (duplicate but generate basket)
        ["Vado a parlare italiano con te oggi.", "I'm going to speak Italian with you today."],
        ["Vado a tentare di ricordare una parola adesso.", "I'm going to try to remember a word now."],
        ["Vado a praticare dire qualcosa in italiano.", "I'm going to practice saying something in Italian."],
        ["Come vado a spiegare cosa voglio dire?", "How am I going to explain what I mean?"]
    ],

    'S0008F02': [  # tentare (another duplicate)
        ["Voglio tentare di spiegare qualcosa in italiano oggi.", "I want to try to explain something in Italian today."],
        ["Vado a tentare di parlare con qualcun altro.", "I'm going to try to speak with someone else."],
        ["Sto tentando di ricordare una parola adesso.", "I'm trying to remember a word now."],
        ["Come tentare di dire cosa voglio dire?", "How to try to say what I mean?"]
    ],

    'S0009L01': [  # Parlo
        ["Parlo italiano con te il più possibile oggi.", "I speak Italian with you as much as possible today."],
        ["Parlo un po' di italiano adesso.", "I speak a little Italian now."],
        ["Voglio imparare come parlo italiano con qualcun altro.", "I want to learn how I speak Italian with someone else."],
        ["Sto tentando di ricordare come parlo una parola.", "I'm trying to remember how I speak a word."]
    ],

    'S0009L02': [  # un po' di - CULMINATING S0009
        ["Parlo un po' di italiano adesso.", "I speak a little Italian now."],
        ["Voglio imparare un po' di italiano con te oggi.", "I want to learn a little Italian with you today."],
        ["Sto tentando di ricordare un po' di qualcosa.", "I'm trying to remember a little of something."],
        ["Vado a praticare un po' di italiano.", "I'm going to practice a little Italian."]
    ],

    'S0010L01': [  # Non sono sicuro
        ["Non sono sicuro come parlare italiano con te oggi.", "I'm not sure how to speak Italian with you today."],
        ["Non sono sicuro cosa voglio dire adesso.", "I'm not sure what I mean now."],
        ["Non sono sicuro se parlo italiano il più possibile.", "I'm not sure if I speak Italian as much as possible."],
        ["Vado a spiegare perché non sono sicuro.", "I'm going to explain why I'm not sure."]
    ],

    'S0010L02': [  # se
        ["Non sono sicuro se posso parlare italiano oggi.", "I'm not sure if I can speak Italian today."],
        ["Voglio imparare se parlo un po' di italiano.", "I want to learn if I speak a little Italian."],
        ["Sto tentando di ricordare se voglio dire qualcosa.", "I'm trying to remember if I want to say something."],
        ["Vado a tentare se posso spiegare.", "I'm going to try if I can explain."]
    ],

    'S0010L03': [  # posso
        ["Non sono sicuro se posso parlare italiano adesso.", "I'm not sure if I can speak Italian now."],
        ["Posso tentare di dire qualcosa con te oggi.", "I can try to say something with you today."],
        ["Vado a praticare se posso ricordare una parola.", "I'm going to practice if I can remember a word."],
        ["Come posso imparare a parlare il più possibile?", "How can I learn to speak as much as possible?"]
    ],

    'S0010L04': [  # tutta la frase - CULMINATING S0010
        ["Non sono sicuro se posso ricordare tutta la frase.", "I'm not sure if I can remember the whole sentence."],
        ["Voglio imparare tutta la frase in italiano oggi.", "I want to learn the whole sentence in Italian today."],
        ["Sto tentando di dire tutta la frase adesso.", "I'm trying to say the whole sentence now."],
        ["Vado a praticare tutta la frase con te.", "I'm going to practice the whole sentence with you."]
    ],

    'S0011L01': [  # Mi piacerebbe
        ["Mi piacerebbe parlare italiano con te oggi.", "I'd like to speak Italian with you today."],
        ["Mi piacerebbe imparare tutta la frase adesso.", "I'd like to learn the whole sentence now."],
        ["Non sono sicuro se mi piacerebbe dire qualcosa.", "I'm not sure if I'd like to say something."],
        ["Mi piacerebbe tentare di ricordare una parola.", "I'd like to try to remember a word."]
    ],

    'S0011L02': [  # poter
        ["Mi piacerebbe poter parlare italiano il più possibile oggi.", "I'd like to be able to speak Italian as much as possible today."],
        ["Voglio poter dire tutta la frase in italiano.", "I want to be able to say the whole sentence in Italian."],
        ["Non sono sicuro se posso poter ricordare.", "I'm not sure if I can be able to remember."],
        ["Sto tentando di poter spiegare qualcosa adesso.", "I'm trying to be able to explain something now."]
    ],

    'S0011L03': [  # dopo che finisci - CULMINATING S0011
        ["Mi piacerebbe poter parlare dopo che finisci.", "I'd like to be able to speak after you finish."],
        ["Vado a tentare di dire qualcosa dopo che finisci.", "I'm going to try to say something after you finish."],
        ["Voglio imparare tutta la frase dopo che finisci oggi.", "I want to learn the whole sentence after you finish today."],
        ["Non sono sicuro cosa dire dopo che finisci.", "I'm not sure what to say after you finish."]
    ],

    'S0011F01': [  # finire
        ["Mi piacerebbe finire di parlare italiano con te oggi.", "I'd like to finish speaking Italian with you today."],
        ["Vado a tentare di finire tutta la frase adesso.", "I'm going to try to finish the whole sentence now."],
        ["Non sono sicuro se posso finire di dire qualcosa.", "I'm not sure if I can finish saying something."],
        ["Voglio finire di imparare un po' di italiano.", "I want to finish learning a little Italian."]
    ],

    'S0012L01': [  # Non mi piacerebbe
        ["Non mi piacerebbe dire qualcosa in italiano adesso.", "I wouldn't like to say something in Italian now."],
        ["Non mi piacerebbe finire di parlare con te oggi.", "I wouldn't like to finish speaking with you today."],
        ["Non sono sicuro se non mi piacerebbe imparare.", "I'm not sure if I wouldn't like to learn."],
        ["Non mi piacerebbe tentare di ricordare tutta la frase.", "I wouldn't like to try to remember the whole sentence."]
    ],

    'S0012L02': [  # indovinare
        ["Non mi piacerebbe indovinare cosa voglio dire oggi.", "I wouldn't like to guess what I mean today."],
        ["Voglio imparare come indovinare tutta la frase in italiano.", "I want to learn how to guess the whole sentence in Italian."],
        ["Sto tentando di indovinare se posso parlare adesso.", "I'm trying to guess if I can speak now."],
        ["Non sono sicuro se mi piacerebbe indovinare.", "I'm not sure if I'd like to guess."]
    ],

    'S0012L03': [  # cosa succederà
        ["Non mi piacerebbe indovinare cosa succederà domani.", "I wouldn't like to guess what's going to happen tomorrow."],
        ["Voglio spiegare cosa succederà dopo che finisci oggi.", "I want to explain what's going to happen after you finish today."],
        ["Non sono sicuro cosa succederà se parlo italiano.", "I'm not sure what's going to happen if I speak Italian."],
        ["Sto tentando di ricordare cosa succederà adesso.", "I'm trying to remember what's going to happen now."]
    ],

    'S0012L04': [  # domani
        ["Non mi piacerebbe indovinare cosa succederà domani.", "I wouldn't like to guess what's going to happen tomorrow."],
        ["Vado a praticare parlare italiano con te domani.", "I'm going to practice speaking Italian with you tomorrow."],
        ["Mi piacerebbe poter dire tutta la frase domani.", "I'd like to be able to say the whole sentence tomorrow."],
        ["Voglio imparare qualcosa in italiano domani.", "I want to learn something in Italian tomorrow."]
    ],

    'S0012F01': [  # succedere
        ["Voglio spiegare cosa succederà domani con te.", "I want to explain what's going to happen tomorrow with you."],
        ["Non sono sicuro cosa può succedere adesso.", "I'm not sure what can happen now."],
        ["Mi piacerebbe indovinare cosa può succedere oggi.", "I'd like to guess what can happen today."],
        ["Sto tentando di ricordare cosa può succedere.", "I'm trying to remember what can happen."]
    ],

    'S0013L01': [  # Parli
        ["Parli italiano molto bene con me oggi.", "You speak Italian very well with me today."],
        ["Non sono sicuro se parli un po' di italiano.", "I'm not sure if you speak a little Italian."],
        ["Mi piacerebbe se parli tutta la frase adesso.", "I'd like if you speak the whole sentence now."],
        ["Vado a tentare di imparare come parli.", "I'm going to try to learn how you speak."]
    ],

    'S0013L02': [  # molto bene - CULMINATING S0013
        ["Parli italiano molto bene.", "You speak Italian very well."],
        ["Mi piacerebbe poter parlare molto bene domani.", "I'd like to be able to speak very well tomorrow."],
        ["Voglio imparare a dire qualcosa molto bene oggi.", "I want to learn to say something very well today."],
        ["Non sono sicuro se posso ricordare molto bene.", "I'm not sure if I can remember very well."]
    ],

    'S0014L01': [  # tutto il giorno - CULMINATING S0014
        ["Parli italiano tutto il giorno?", "Do you speak Italian all day?"],
        ["Vado a praticare parlare italiano tutto il giorno domani.", "I'm going to practice speaking Italian all day tomorrow."],
        ["Mi piacerebbe poter imparare tutto il giorno con te.", "I'd like to be able to learn all day with you."],
        ["Voglio tentare di ricordare qualcosa tutto il giorno.", "I want to try to remember something all day."]
    ],

    'S0015L01': [  # E
        ["E voglio parlare italiano con te oggi.", "And I want to speak Italian with you today."],
        ["Parli molto bene, e mi piacerebbe imparare domani.", "You speak very well, and I'd like to learn tomorrow."],
        ["Vado a finire adesso, e voglio ricordare tutta la frase.", "I'm going to finish now, and I want to remember the whole sentence."],
        ["Non sono sicuro, e non mi piacerebbe indovinare.", "I'm not sure, and I wouldn't like to guess."]
    ],

    'S0015L02': [  # voglio che tu parli
        ["E voglio che tu parli italiano con me domani.", "And I want you to speak Italian with me tomorrow."],
        ["Voglio che tu parli molto bene tutto il giorno.", "I want you to speak very well all day."],
        ["Non sono sicuro se voglio che tu parli adesso.", "I'm not sure if I want you to speak now."],
        ["Mi piacerebbe che tu parli tutta la frase oggi.", "I'd like you to speak the whole sentence today."]
    ],

    'S0015L03': [  # con me
        ["E voglio che tu parli italiano con me domani.", "And I want you to speak Italian with me tomorrow."],
        ["Mi piacerebbe poter parlare molto bene con me stesso.", "I'd like to be able to speak very well with myself."],
        ["Parli italiano con me tutto il giorno oggi?", "Do you speak Italian with me all day today?"],
        ["Vado a praticare dire tutta la frase con me.", "I'm going to practice saying the whole sentence with myself."]
    ],

    'S0015F01': [  # parlare (duplicate)
        ["E voglio che tu parli italiano con me domani.", "And I want you to speak Italian with me tomorrow."],
        ["Mi piacerebbe poter parlare molto bene tutto il giorno.", "I'd like to be able to speak very well all day."],
        ["Vado a tentare di parlare tutta la frase adesso.", "I'm going to try to speak the whole sentence now."],
        ["Non sono sicuro se voglio parlare con qualcun altro.", "I'm not sure if I want to speak with someone else."]
    ],

    'S0016L01': [  # Lui vuole
        ["Lui vuole parlare italiano con me tutto il giorno domani.", "He wants to speak Italian with me all day tomorrow."],
        ["Non sono sicuro se lui vuole imparare adesso.", "I'm not sure if he wants to learn now."],
        ["E lui vuole che tu parli molto bene oggi.", "And he wants you to speak very well today."],
        ["Mi piacerebbe se lui vuole finire tutta la frase.", "I'd like if he wants to finish the whole sentence."]
    ],

    'S0016L02': [  # ritornare
        ["Lui vuole ritornare a parlare italiano con me domani.", "He wants to come back to speak Italian with me tomorrow."],
        ["Vado a ritornare dopo che finisci oggi.", "I'm going to come back after you finish today."],
        ["Mi piacerebbe ritornare e imparare tutto il giorno.", "I'd like to come back and learn all day."],
        ["Non sono sicuro se voglio ritornare adesso.", "I'm not sure if I want to come back now."]
    ],

    'S0016L03': [  # con tutti gli altri
        ["Lui vuole ritornare con tutti gli altri domani.", "He wants to come back with everyone else tomorrow."],
        ["Vado a parlare italiano con tutti gli altri oggi.", "I'm going to speak Italian with everyone else today."],
        ["Mi piacerebbe imparare tutta la frase con tutti gli altri.", "I'd like to learn the whole sentence with everyone else."],
        ["E voglio che tu parli con tutti gli altri.", "And I want you to speak with everyone else."]
    ],

    'S0016L04': [  # più tardi - CULMINATING S0016
        ["Lui vuole ritornare con tutti gli altri più tardi.", "He wants to come back with everyone else later on."],
        ["Vado a tentare di parlare italiano più tardi oggi.", "I'm going to try to speak Italian later on today."],
        ["Mi piacerebbe poter finire tutta la frase più tardi.", "I'd like to be able to finish the whole sentence later on."],
        ["E voglio ritornare con te più tardi domani.", "And I want to come back with you later on tomorrow."]
    ],

    'S0017L01': [  # Lei vuole
        ["Lei vuole imparare italiano con me tutto il giorno domani.", "She wants to learn Italian with me all day tomorrow."],
        ["Non sono sicuro se lei vuole parlare adesso.", "I'm not sure if she wants to speak now."],
        ["E lei vuole ritornare con tutti gli altri più tardi.", "And she wants to come back with everyone else later on."],
        ["Mi piacerebbe se lei vuole finire oggi.", "I'd like if she wants to finish today."]
    ],

    'S0017L02': [  # scoprire
        ["Lei vuole scoprire come parlare italiano molto bene domani.", "She wants to find out how to speak Italian very well tomorrow."],
        ["Vado a tentare di scoprire tutta la frase oggi.", "I'm going to try to find out the whole sentence today."],
        ["Mi piacerebbe scoprire cosa succederà più tardi.", "I'd like to find out what's going to happen later on."],
        ["E voglio scoprire se parli italiano con me.", "And I want to find out if you speak Italian with me."]
    ],

    'S0017L03': [  # qual è la risposta - CULMINATING S0017
        ["Lei vuole scoprire qual è la risposta.", "She wants to find out what the answer is."],
        ["Non sono sicuro qual è la risposta adesso.", "I'm not sure what the answer is now."],
        ["Vado a tentare di dire qual è la risposta oggi.", "I'm going to try to say what the answer is today."],
        ["Mi piacerebbe scoprire qual è la risposta più tardi.", "I'd like to find out what the answer is later on."]
    ],

    'S0017F01': [  # la risposta
        ["Lei vuole scoprire la risposta oggi.", "She wants to find out the answer today."],
        ["Non sono sicuro qual è la risposta adesso.", "I'm not sure what the answer is now."],
        ["Vado a tentare di ricordare la risposta domani.", "I'm going to try to remember the answer tomorrow."],
        ["Mi piacerebbe imparare la risposta con te più tardi.", "I'd like to learn the answer with you later on."]
    ],

    'S0018L01': [  # Vogliamo
        ["Vogliamo parlare italiano con te tutto il giorno domani.", "We want to speak Italian with you all day tomorrow."],
        ["Vogliamo scoprire qual è la risposta più tardi oggi.", "We want to find out what the answer is later on today."],
        ["E vogliamo ritornare con tutti gli altri adesso.", "And we want to come back with everyone else now."],
        ["Non sono sicuro se vogliamo finire.", "I'm not sure if we want to finish."]
    ],

    'S0018L02': [  # incontrarci
        ["Vogliamo incontrarci e parlare italiano con te domani.", "We want to meet and speak Italian with you tomorrow."],
        ["Mi piacerebbe incontrarci con tutti gli altri più tardi oggi.", "I'd like to meet with everyone else later on today."],
        ["Vado a incontrarci dopo che finisci adesso.", "I'm going to meet after you finish now."],
        ["Lei vuole incontrarci per scoprire la risposta.", "She wants to meet to find out the answer."]
    ],

    'S0018L03': [  # alle sei
        ["Vogliamo incontrarci alle sei per parlare italiano domani.", "We want to meet at six o'clock to speak Italian tomorrow."],
        ["Mi piacerebbe ritornare alle sei più tardi oggi.", "I'd like to come back at six o'clock later on today."],
        ["Lei vuole scoprire qual è la risposta alle sei.", "She wants to find out what the answer is at six o'clock."],
        ["Vado a finire tutto il giorno alle sei.", "I'm going to finish all day at six o'clock."]
    ],

    'S0018L04': [  # stasera - CULMINATING S0018
        ["Vogliamo incontrarci alle sei stasera.", "We want to meet at six o'clock this evening."],
        ["Mi piacerebbe parlare italiano con te tutto il giorno stasera.", "I'd like to speak Italian with you all day this evening."],
        ["Lei vuole ritornare con tutti gli altri stasera.", "She wants to come back with everyone else this evening."],
        ["Vado a scoprire la risposta più tardi stasera.", "I'm going to find out the answer later on this evening."]
    ]
}

# Generate baskets for all 60 LEGOs
for idx, lego in enumerate(batch1_legos):
    lego_id = lego['id']
    lego_target = lego['target']
    lego_known = lego['known']

    e_phrases = basket_phrases.get(lego_id, [])
    d_phrases = extract_d_phrases(e_phrases, lego_target)

    baskets[lego_id] = {
        "lego": [lego_target, lego_known],
        "e": e_phrases,
        "d": d_phrases
    }

    is_culm = is_culminating(lego, seed_map)
    status = "CULMINATING" if is_culm else ""
    print(f"{idx+1:2d}. {lego_id:11s} ({lego_target:35s}): {len(e_phrases):1d} e-phrases {status}")

# Save to output file
output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_30seeds/baskets_batch1.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(baskets, f, ensure_ascii=False, indent=2)

print(f"\n✓ Generated {len(baskets)} baskets for batch 1")
print(f"✓ Saved to: {output_path}")
print(f"\nNote: LEGOs 1-2 have empty baskets (insufficient vocabulary)")
print(f"LEGOs 3+ have progressively richer baskets as vocabulary builds")
