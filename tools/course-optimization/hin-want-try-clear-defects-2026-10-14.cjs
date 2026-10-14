#!/usr/bin/env node
'use strict';
// tools/course-optimization/hin-want-try-clear-defects-2026-10-14.cjs
//
// hin_for_eng — "try" where the English says "want", plus the clear defects around it (job #349·Q, Kai approved
// 14 Oct 2026). James (learner, public forum, 11–12 Oct) heard "I want to learn Hindi" answered with
// "…सीखने की कोशिश कर रहा हूँ" ("I'm TRYING to learn"). Diagnosis: d/f7e341b6 (yellow belt) and d/1be60757
// (pre-proofread scan). The phrase layer was stitched from LEGOs and never proofread; Shuchita has not read it.
//
// A  want/try swaps (the brief's 8). सीखना ("to learn") is first taught at S0020L04, so the seed 3/7/9 rows cannot
//    become "सीखना चाहता हूँ" without using a form before it is taught: the ENGLISH moves to the taught LEGO
//    "I'm trying to learn" (S0002L01). S0003L01U02 also changes learn→speak in BOTH languages ("learn Hindi as often
//    as possible" is stilted; बोलने की कोशिश is S0009L01U02's own frame). S0205L02U04 keeps its LEGO कहने, so its
//    English becomes "she's trying to say something". The seed 8 / 171 / 205 rows gain "try" in the English.
// W  The same defect the new check (tools/check-hin-want-try.cjs) found beyond those 8: rows whose Hindi says
//    चाहता/चाहूँगा/चाहें ("wants/would like") and whose English does not ("he started with a bag" voiced as
//    "वो एक बैग से शुरू करना चाहता था" = "he WANTED to start…"). The Hindi is the taught material, so the
//    English is corrected to say what the Hindi says. Rows whose Hindi is itself garbled are deleted (Shuchita's
//    precedent: nonsense is removed, not repaired); every basket keeps real practice.
// B  Stilted English prompts from d/f7e341b6 §B: re-worded, or deleted when no natural English fits the Hindi.
//    S0008L01U06 had dropped "in Hindi" and was garbled; its Hindi is rebuilt (MEDIUM — Shuchita to read).
// C  Clear defects: 8 mid-sentence dandas (।) in phrases; LEGO tag-glosses yest / cs / i-gen-m (and i'd-like-m,
//    the same leak, found by the check); seed 127 said "that's why" (इसीलिए) for "That isn't why" → Shuchita's own
//    approved eng_for_hin wording "मैं आपसे इसलिए नहीं मिलना चाहता था।", and S0127L02 grows on both sides to
//    "that isn't why | इसलिए नहीं" (her eng_for_hin LEGO), its basket following. Seed 580 (no LEGOs, unapproved) said
//    "tried" for "wanted" — Hindi corrected (MEDIUM).
//
// AUDIO FIRST, then text (make-before-break, the job #130 shape): AUDIO=1 renders every clip the AFTER texts need
// through the one route (POST :3470/api/audio/render; dry run first) into a ledger; APPLY=1 backs up every touched row
// into a table, then writes text + links in ONE transaction, so no slot is ever silent. Old clips are never deleted.
//
//   node tools/course-optimization/hin-want-try-clear-defects-2026-10-14.cjs           # VERIFY: exit 2 while a defect stands
//   ZUT=1 node …                                                                        # ZUT strict now vs with the AFTER texts
//   DRY=1 AUDIO=1 node …                                                                # dry-run every render, print the chars
//   AUDIO=1 node …                                                                      # render (resumable; the ledger is read first)
//   APPLY=1 node …                                                                      # back up, write text + links, then verify
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
process.env.INTRO_MIRROR_AT_EXIT = '0'; // 358 component intros are a standing historic mismatch; touched LEGOs are checked below

const COURSE = 'hin_for_eng';
const SWEEP = 'hin-want-try-clear-defects-2026-10-14';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#349';
const AGENT = 'kai-hin-want-try-349';
const BACKUP = 'bak_349_hin_want_try_20261014';
const RENDER_URL = process.env.RENDER_URL || 'http://localhost:3470/api/audio/render';

const intro = (x, ctx) => ctx ? `The Hindi for: '${x}', as in — '${ctx}', is:` : `The Hindi for: '${x}', is:`;

// conf: how sure a non-native is of a HINDI change (English-only edits carry none). Every row goes to Shuchita later.
const PHRASE_EDITS = [
  // A — want/try (the brief's 8)
  ['A', 'S0003L01U02', ['I want to learn Hindi as often as possible', 'मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ।'], ["I'm trying to learn Hindi as often as possible", 'मैं जितना हो सके उतनी बार हिंदी सीखने की कोशिश कर रहा हूँ।']],
  ['A', 'S0007L03U05', ['I want to learn as hard as possible', 'मैं जितना हो सके उतनी मेहनत से सीखने की कोशिश कर रहा हूँ।'], ["I'm trying as hard as I can to learn", 'मैं जितना हो सके उतनी मेहनत से सीखने की कोशिश कर रहा हूँ।']],
  ['A', 'S0009L01U04', ['I want to learn a little Hindi', 'मैं थोड़ी हिंदी सीखने की कोशिश कर रहा हूँ।'], ["I'm trying to learn a little Hindi", 'मैं थोड़ी हिंदी सीखने की कोशिश कर रहा हूँ।']],
  ['A', 'S0205L02U04', ['she wants to say something', 'वो कुछ कहने की कोशिश कर रही है।'], ["she's trying to say something", 'वो कुछ कहने की कोशिश कर रही है।']],
  ['A', 'S0008L04B02', ['going to explain that', 'समझाने की कोशिश करने जा रहा हूँ कि'], ['going to try to explain that', 'समझाने की कोशिश करने जा रहा हूँ कि']],
  ['A', 'S0008L04B03', ['going to explain that what I mean', 'समझाने की कोशिश करने जा रहा हूँ कि मेरा मतलब क्या है।'], ['going to try to explain what I mean', 'समझाने की कोशिश करने जा रहा हूँ कि मेरा मतलब क्या है।']],
  ['A', 'S0171L01U04', ['or can you look for it?', 'या आप इसे ढूँढने की कोशिश कर सकते हैं?'], ['or can you try to look for it?', 'या आप इसे ढूँढने की कोशिश कर सकते हैं?']],
  // W — Hindi says want / would like, English did not (found by tools/check-hin-want-try.cjs)
  ['W', 'S0017L03B03', ['find out what the answer is', 'जानना चाहती है कि जवाब क्या है।'], ['wants to find out what the answer is', 'जानना चाहती है कि जवाब क्या है।']],
  ['W', 'S0021L01B03', ['why learn', 'क्यों सीखना चाहते हैं?'], ['why do you want to learn?', 'क्यों सीखना चाहते हैं?']],
  ['W', 'S0038L01U04', ["I'm going to learn for about a month", 'मैं करीब एक महीने हिंदी सीखना चाहता हूँ।'], ['I want to learn Hindi for about a month', 'मैं करीब एक महीने हिंदी सीखना चाहता हूँ।']],
  ['W', 'S0051L01U05', ['or meet with friends', 'या दोस्तों के साथ मिलना चाहता हूँ।'], ['or I want to meet up with friends', 'या दोस्तों के साथ मिलना चाहता हूँ।']],
  ['W', 'S0053L01U01', ['he started with a bag', 'वो एक बैग से शुरू करना चाहता था।'], ['he wanted to start with a bag', 'वो एक बैग से शुरू करना चाहता था।']],
  ['W', 'S0057L01U03', ['or say it carefully', 'या ध्यान से कहना चाहता हूँ।'], ['or I want to say it carefully', 'या ध्यान से कहना चाहता हूँ।']],
  ['W', 'S0060L02U04', ['he started different things', 'वो अलग-अलग काम शुरू करना चाहता था।'], ['he wanted to start different things', 'वो अलग-अलग काम शुरू करना चाहता था।']],
  ['W', 'S0061L01U03', ['or say it a little slowly', 'या थोड़ा धीरे कहना चाहता हूँ।'], ['or I want to say it a little slowly', 'या थोड़ा धीरे कहना चाहता हूँ।']],
  ['W', 'S0061L01U05', ['he got up slowly', 'वो धीरे उठना चाहता था।'], ['he wanted to get up slowly', 'वो धीरे उठना चाहता था।']],
  ['W', 'S0061L02U03', ['or start again', 'या दोबारा शुरू करना चाहता हूँ।'], ['or I want to start again', 'या दोबारा शुरू करना चाहता हूँ।']],
  ['W', 'S0061L02U04', ['he started again last week', 'वो पिछले हफ्ते दोबारा शुरू करना चाहता था।'], ['he wanted to start again last week', 'वो पिछले हफ्ते दोबारा शुरू करना चाहता था।']],
  ['W', 'S0062L02U05', ['he started with your help', 'वो आपकी मदद से शुरू करना चाहता था।'], ['he wanted to start with your help', 'वो आपकी मदद से शुरू करना चाहता था।']],
  ['W', 'S0062L03U05', ['he said it together', 'वो एक साथ कहना चाहता था।'], ['he wanted to say it together', 'वो एक साथ कहना चाहता था।']],
  ['W', 'S0063L03U04', ['he started with my help', 'वो मेरी मदद से शुरू करना चाहता था।'], ['he wanted to start with my help', 'वो मेरी मदद से शुरू करना चाहता था।']],
  ['W', 'S0064L02U04', ['he started with fun things', 'वो मज़ेदार काम शुरू करना चाहता था।'], ['he wanted to start with fun things', 'वो मज़ेदार काम शुरू करना चाहता था।']],
  ['W', 'S0065L01U03', ['or do it yourself', 'या खुद करना चाहता हूँ।'], ['or I want to do it myself', 'या खुद करना चाहता हूँ।']],
  ['W', 'S0065L01U04', ['he started by himself', 'वो खुद शुरू करना चाहता था।'], ['he wanted to start by himself', 'वो खुद शुरू करना चाहता था।']],
  ['W', 'S0065L03U03', ['or test carefully', 'या ध्यान से परखना चाहता हूँ।'], ['or I want to test it carefully', 'या ध्यान से परखना चाहता हूँ।']],
  ['W', 'S0065L04U03', ['or take a little time', 'या थोड़ा समय लेना चाहता हूँ।'], ['or I want to take a little time', 'या थोड़ा समय लेना चाहता हूँ।']],
  ['W', 'S0065L05U02', ['I take time to test myself', 'मैं खुद को परखने के लिए समय लेना चाहता हूँ।'], ['I want to take time to test myself', 'मैं खुद को परखने के लिए समय लेना चाहता हूँ।']],
  ['W', 'S0065L05U05', ['or take time to test yourself', 'या खुद को परखने के लिए समय लेना चाहता हूँ।'], ['or I want to take time to test myself', 'या खुद को परखने के लिए समय लेना चाहता हूँ।']],
  ['W', 'S0066L02U03', ['or find carefully', 'या ध्यान से ढूँढना चाहता हूँ।'], ['or I want to look for it carefully', 'या ध्यान से ढूँढना चाहता हूँ।']],
  ['W', 'S0066L03U05', ['or find the answer carefully', 'या ध्यान से जवाब ढूँढना चाहता हूँ।'], ['or I want to look for the answer carefully', 'या ध्यान से जवाब ढूँढना चाहता हूँ।']],
  ['W', 'S0067L02U03', ['or stop a little', 'या थोड़ा रुकना चाहता हूँ।'], ['or I want to stop for a little while', 'या थोड़ा रुकना चाहता हूँ।']],
  ['W', 'S0069L01U04', ['he started with a dog', 'वो एक कुत्ते के साथ शुरू करना चाहता था।'], ['he wanted to start with a dog', 'वो एक कुत्ते के साथ शुरू करना चाहता था।']],
  ['W', 'S0069L03U04', ['he started with young friends', 'वो छोटे दोस्तों के साथ शुरू करना चाहता था।'], ['he wanted to start with young friends', 'वो छोटे दोस्तों के साथ शुरू करना चाहता था।']],
  ['W', 'S0071L01U03', ['or tell the truth', 'या सच बताना चाहता हूँ।'], ['or I want to tell the truth', 'या सच बताना चाहता हूँ।']],
  ['W', 'S0071L02U03', ['or let him hear', 'या सुनने देना चाहता हूँ।'], ['or I want to let him hear', 'या सुनने देना चाहता हूँ।']],
  ['W', 'S0071L03U03', ['or let anyone know', 'या किसी को बताना चाहता हूँ।'], ['or I want to tell someone', 'या किसी को बताना चाहता हूँ।']],
  ['W', 'S0071L03U04', ["he didn't tell anyone", 'वो किसी को बताना नहीं चाहता था।'], ["he didn't want to tell anyone", 'वो किसी को बताना नहीं चाहता था।']],
  ['W', 'S0072L02U05', ["he said you're doing very well", 'वो कहना चाहता था कि आप बहुत अच्छा कर रहे हैं।'], ["he wanted to say you're doing very well", 'वो कहना चाहता था कि आप बहुत अच्छा कर रहे हैं।']],
  ['W', 'S0073L01U01', ['he said thank you', 'वो शुक्रिया कहना चाहता था।'], ['he wanted to say thank you', 'वो शुक्रिया कहना चाहता था।']],
  ['W', 'S0073L01U03', ['or say thank you', 'या शुक्रिया कहना चाहता हूँ।'], ['or I want to say thank you', 'या शुक्रिया कहना चाहता हूँ।']],
  ['W', 'S0074L01U03', ['or grasp carefully', 'या ध्यान से समझना चाहता हूँ।'], ['or I want to understand it carefully', 'या ध्यान से समझना चाहता हूँ।']],
  ['W', 'S0075L01U02', ['he asked do you have more to learn', 'वो पूछना चाहता था आपको और सीखना है?'], ['he wanted to ask, do you have more to learn?', 'वो पूछना चाहता था आपको और सीखना है?']],
  ['W', 'S0076L03U05', ['so how much did he know', 'तो वो कितना जानना चाहता था।'], ['so how much did he want to know?', 'तो वो कितना जानना चाहता था?'], 'high'],
  ['W', 'S0076L04U05', ['he started with this', 'वो इससे शुरू करना चाहता था।'], ['he wanted to start with this', 'वो इससे शुरू करना चाहता था।']],
  ['W', 'S0078L03U01', ['he was trying to understand', 'वो समझ लेना चाहता था।'], ['he wanted to understand', 'वो समझ लेना चाहता था।']],
  ['W', 'S0078L03U03', ['or understand it', 'या समझ लेना चाहता हूँ।'], ['or I want to understand it', 'या समझ लेना चाहता हूँ।']],
  ['W', 'S0097L02B04', ['go by bus whenever', 'बस से जाना जब भी आप चाहें।'], ['go by bus whenever you want', 'बस से जाना जब भी आप चाहें।']],
  ['W', 'S0097L02B05', ['think whenever', 'सोचना जब भी आप चाहें।'], ['think whenever you want', 'सोचना जब भी आप चाहें।']],
  ['W', 'S0102L01U01', ['I want to say something', 'मुझे कुछ कहने की ज़रूरत है।'], ['I need to say something', 'मुझे कुछ कहने की ज़रूरत है।']],
  ['W', 'S0146L05B02', ['since we tried', 'जब से हमने'], ['since we', 'जब से हमने']],
  ['W', 'S0159L01B02', ["what I'm trying to say", 'कहना चाहता हूँ'], ['I want to say', 'कहना चाहता हूँ']],
  ['W', 'S0159L01B03', ['trying to say', 'कहना चाहता'], ['want to say', 'कहना चाहता']],
  ['W', 'S0173L02U02', ["or I'll do it myself", 'या मैं खुद करना चाहूँगा।'], ["or I'd like to do it myself", 'या मैं खुद करना चाहूँगा।']],
  // B — stilted English (d/f7e341b6 §B)
  ['B', 'S0004L01B03', ['speak something', 'कुछ बोलना'], ['say something', 'कुछ बोलना']],
  ['B', 'S0004L03B03', ['how to say in Hindi', 'हिंदी में कैसे कहते हैं।'], ['how to say it in Hindi', 'हिंदी में कैसे कहते हैं।']],
  ['B', 'S0007L02U03', ['I want to try in Hindi', 'मैं हिंदी में कोशिश करना चाहता हूँ।'], ['I want to try it in Hindi', 'मैं हिंदी में कोशिश करना चाहता हूँ।']],
  ['B', 'S0008L01U06', ["I'm trying to say what I mean in Hindi", 'मेरा मतलब क्या बोलने की कोशिश कर रहा हूँ।'], ["I'm trying to say what I mean in Hindi", 'मैं हिंदी में बोलने की कोशिश कर रहा हूँ कि मेरा मतलब क्या है।'], 'medium'],
  ['B', 'S0008L02U02', ['what is there in Hindi', 'हिंदी में क्या है।'], ['what is it in Hindi?', 'हिंदी में क्या है?'], 'high'],
  ['B', 'S0013L01U04', ['I want to speak Hindi a great deal', 'मैं हिंदी बहुत बोलना चाहता हूँ।'], ['I want to speak a lot of Hindi', 'मैं हिंदी बहुत बोलना चाहता हूँ।']],
  ['B', 'S0015L03U05', ['I want to speak Hindi with me after finishing', 'मैं चाहता हूँ कि खत्म करने के बाद मेरे साथ हिंदी बोलता हूँ।'], ['you speak Hindi with me', 'आप मेरे साथ हिंदी बोलते हैं।'], 'high', 'atomic'],
  // C — mid-sentence danda
  ['C', 'S0074L03U04', ["it's good to say thanks", 'शुक्रिया। कहना अच्छा है।'], ["it's good to say thanks", 'शुक्रिया कहना अच्छा है।'], 'high'],
  ['C', 'S0137L04U04', ['so working is important', 'तो काम करना। ज़रूरी है।'], ['so working is important', 'तो काम करना ज़रूरी है।'], 'high'],
  ['C', 'S0137L04U05', ['often talking is best', 'अक्सर बात करना। सबसे अच्छा है।'], ['talking often is best', 'अक्सर बात करना सबसे अच्छा है।'], 'high'],
  ['C', 'S0137L04U06', ['working hard is important', 'मेहनत करना। ज़रूरी है।'], ['working hard is important', 'मेहनत करना ज़रूरी है।'], 'high'],
  ['C', 'S0137L04U07', ['helping is important', 'मदद करना। ज़रूरी है।'], ['helping is important', 'मदद करना ज़रूरी है।'], 'high'],
  // C — LEGO tag-glosses: the bare build row says the LEGO
  ['C', 'S0114L01B01', ['yest', 'कल'], ['yesterday', 'कल'], null, 'intro'],
  ['C', 'S0166L01B01', ['I-gen-m', 'मेरा'], ['my', 'मेरा'], null, 'intro'],
  ['C', 'S0292L02B01', ['cs', 'आ'], ['come', 'आ'], null, 'intro'],
  ['C', 'S0180L04B01', ["I'd-like-m", 'चाहूँगा।'], ["I'd like", 'चाहूँगा।'], null, 'intro'],
  // C — seed 127: S0127L02 grows to "that isn't why | इसलिए नहीं"; its basket follows
  ['C', 'S0127L02B01', ["that's why", 'इसलिए'], ["that isn't why", 'इसलिए नहीं'], 'high', 'atomic intro'],
  ['C', 'S0127L02B03', ["I didn't want because of this", 'इसलिए नहीं चाहता था'], ["that isn't why I wanted", 'इसलिए नहीं चाहता था'], 'medium'],
  ['C', 'S0127L02U01', ["that isn't why I wanted to see you", 'मैं आपको देखना इसलिए नहीं चाहता था।'], ["that isn't why I wanted to see you", 'मैं आपसे इसलिए नहीं मिलना चाहता था।'], 'high'],
  ['C', 'S0127L02U03', ["that's why I did it", 'मैंने इसलिए किया।'], ["that isn't why I did it", 'मैंने इसलिए नहीं किया।'], 'medium', 'atomic intro'],
  ['C', 'S0127L02U05', ["or that's why he said it", 'या उसने इसलिए कहा।'], ["or that isn't why he said it", 'या उसने इसलिए नहीं कहा।'], 'medium', 'atomic intro'],
].map(([cls, id, before, after, conf, flags = '']) => ({ cls, id, before, after, conf: before[1] !== after[1] ? (conf || 'medium') : null, atomic: /atomic/.test(flags), needs: /intro/.test(flags) ? ['intro'] : [] }));

const DELETES = [
  ['A', 'S0205L02B03', 'what I was saying', 'जो कहने की कोशिश', 'English drops "try"; the Hindi fragment has no natural English (growing it needs a Hindi render)'],
  ['W', 'S0063L01U05', 'he had any words to say', 'वो कोई शब्द कहना चाहता था।', 'no natural English carries "any" for कोई here'],
  ['W', 'S0065L02U02', 'he said it was important', 'वो ज़रूरी कहना चाहता था।', 'Hindi garbled ("he wanted to say important")'],
  ['W', 'S0066L01U02', 'he said it was difficult', 'वो मुश्किल कहना चाहता था।', 'Hindi garbled ("he wanted to say difficult")'],
  ['W', 'S0070L02U03', 'or tell me carefully', 'या मुझे ध्यान से बताना चाहता हूँ।', 'Hindi garbled ("or I want to tell me")'],
  ['W', 'S0071L02U04', 'he started letting hear carefully', 'वो ध्यान से सुनने देना शुरू करना चाहता था।', 'garbled both sides'],
  ['W', 'S0077L03U02', 'he said how quickly he started', 'वो कितनी जल्दी शुरू करना चाहता था।', 'English ≠ Hindi; no natural English for the fragment'],
  ['W', 'S0078L03U04', 'he asked to understand', 'वो समझ लेना शुरू करना चाहता था।', 'garbled both sides'],
  ['W', 'S0078L03U05', 'so try to understand it', 'तो समझ लेना है।', 'English try, Hindi "have to"; subjectless fragment'],
  ['W', 'S0097L02B06', 'know whenever', 'जानना जब भी आप चाहें।', 'no natural English ("know whenever you want")'],
  ['B', 'S0004L01U04', 'I want to speak something as often as possible', 'मैं जितना हो सके उतनी बार कुछ बोलना चाहता हूँ।', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0004L02U03', "I'm trying to learn in Hindi", 'मैं हिंदी में सीखने की कोशिश कर रहा हूँ।', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0007L03B04', 'speak as hard as possible', 'जितना हो सके उतनी मेहनत से बोलना', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0007L03U02', 'I want to speak as hard as possible today', 'मैं आज जितना हो सके उतनी मेहनत से बोलना चाहता हूँ।', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0008L02U04', 'what is it today', 'आज क्या है।', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0008L02U05', 'what is it now', 'अभी क्या है।', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0010L01B03', "I'm not sure today", 'मुझे पक्का नहीं है आज', 'stilted (d/f7e341b6 §B)'],
  ['B', 'S0010L03U04', 'I can remember in Hindi', 'मैं हिंदी में याद कर सकता हूँ।', 'stilted (d/f7e341b6 §B)'],
  ['C', 'S0074L03U02', 'he said thank you', 'वो शुक्रिया। कहना चाहता था।', 'Hindi says "he wanted to say thanks" with a stray danda; it is S0073L01U01 again (that row now says "he wanted to say thank you")'],
  ['C', 'S0074L03U05', 'or say much thanks', 'या बहुत शुक्रिया। कहना है।', 'mid-sentence danda and stilted English'],
  ['C', 'S0078L02B03', 'he said it', 'वो कहा। था', 'mid-sentence danda; वो कहा था is not grammatical (needs उसने)'],
  ['C', 'S0127L02B02', 'not because of this', 'इसलिए नहीं', 'duplicates the grown LEGO (B01 now says it)', ['hindi', 'intro']],
  ['C', 'S0127L02U02', "that's why I wanted to see you", 'मैं आपको देखना इसलिए चाहता था।', 'teaches the positive under the grown "that isn\'t why" LEGO', ['hindi', 'intro']],
  ['C', 'S0292L02B03', 'so cs', 'तो आ', 'tag gloss; "तो आ" is a fragment'],
].map(([cls, id, known, target, why, needs = []]) => ({ cls, id, known, target, why, needs }));

const LEGO_EDITS = [
  { lego: 'S0114L01', before: ['yest', 'कल'], after: ['yesterday', 'कल'], intro: intro('yesterday', 'he worked yesterday'), why: 'tag gloss; seed 114 "…today than yesterday"' },
  { lego: 'S0166L01', before: ['i-gen-m', 'मेरा'], after: ['my', 'मेरा'], intro: intro('my'), why: 'tag gloss' },
  { lego: 'S0292L02', before: ['cs', 'आ'], after: ['come', 'आ'], intro: intro('come'), why: 'tag gloss; seed 292 "…able to come to the party"' },
  { lego: 'S0180L04', before: ["I'd-like-m", 'चाहूँगा।'], after: ["I'd like", 'चाहूँगा।'], intro: intro("I'd like"), why: 'tag gloss (same leak as i-gen-m)' },
  { lego: 'S0127L02', before: ["that's why", 'इसलिए'], after: ["that isn't why", 'इसलिए नहीं'], intro: intro("that isn't why"), conf: 'high', why: 'seed 127 is "That isn\'t why…"; Shuchita\'s eng_for_hin LEGO is इसलिए नहीं | that isn\'t why' },
];
// Intro-only re-render (LEGO text unchanged): its as-in quoted a row this job deletes.
const INTROS = [
  { lego: 'S0007L03', text: intro('as hard as', 'I want to try as hard as possible today'), why: 'as-in was "I want to speak as hard as possible today" (stilted, deleted)' },
];
const SEED_EDITS = [
  { seed: 127, before: ["That isn't why I wanted to see you.", 'इसीलिए मैं आपसे मिलना नहीं चाहता था।'], after: ["That isn't why I wanted to see you.", 'मैं आपसे इसलिए नहीं मिलना चाहता था।'], conf: 'high', why: "Hindi said \"that's why I didn't want to meet you\"; now Shuchita's approved eng_for_hin seed 127 wording" },
  { seed: 580, before: ["We've often wanted to take the children somewhere a little warmer.", 'हमने अक्सर बच्चों को कहीं थोड़ी गर्म जगह ले जाने की कोशिश की है।'], after: ["We've often wanted to take the children somewhere a little warmer.", 'हमने अक्सर बच्चों को कहीं थोड़ी गर्म जगह ले जाना चाहा है।'], conf: 'medium', why: 'Hindi said "tried"; the canonical English says "wanted" (no LEGOs, unapproved)' },
];

// ── gates ────────────────────────────────────────────────────────────────────────────
// Two things the one audio route refused on 14 Oct 2026, each a GATE that holds the edits needing it:
//   hindi  every Hindi render — "VOICE_POLICY: hin (f) has only the 2026-09-04 draft casting — Tom has not chosen a
//          voice, so nothing is rendered or pointed". A Hindi edit without its clip leaves both target slots silent
//          (the text trigger keeps a clip only when normalize_text matches, and that keeps the danda).
//   intro  the English intro lines — "VOICE_POLICY: hin_for_eng known is Tom-006 by rule english-known; Charlotte
//          refused — voices are never hand-picked" (the route's intro splice chose Charlotte; no voice was named).
//          A LEGO gloss cannot change while its intro still says the old gloss (presentations mirror their LEGO), so
//          the tag-gloss LEGOs, their bare build rows and the S0007L03 intro wait here.
// With no gates (the default) the tool applies the English side of every other edit and the deletions.
// GATES=intro and/or GATES=intro,hindi apply the rest once the route renders them. An `atomic` edit's English only
// makes sense with its Hindi, so it waits whole.
const GATES = new Set(String(process.env.GATES || '').split(',').map((x) => x.trim()).filter(Boolean));
const open = (needs, gates = GATES) => needs.every((n) => gates.has(n));
const hindiChanges = (x) => x.before[1] !== x.after[1];
const legoNeeds = (l) => ['intro', ...(hindiChanges(l) ? ['hindi'] : [])];
const seedNeeds = (s) => (hindiChanges(s) ? ['hindi'] : []);
/** the [known, target] a phrase edit should hold with these gates open */
function stageOf(e, gates = GATES) {
  if (!open(e.needs, gates)) return e.before;
  if (!hindiChanges(e) || gates.has('hindi')) return e.after;
  return e.atomic ? e.before : [e.after[0], e.before[1]];
}
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
/** where a phrase edit stands in the live DB: one of its stages, or null (somebody else edited it) */
function liveStage(e, row) {
  if (!row) return null;
  const live = [row.known_text, row.target_text];
  return [e.before, [e.after[0], e.before[1]], e.after].find((st) => same(st, live)) || null;
}
/** what a run with these gates writes, given the live DB: each item carries from → to */
function work(db, gates = GATES) {
  return {
    phrases: PHRASE_EDITS.map((e) => ({ ...e, from: liveStage(e, db.byId.get(e.id)), to: stageOf(e, gates) })).filter((e) => e.from && !same(e.from, e.to)),
    legos: LEGO_EDITS.filter((l) => open(legoNeeds(l), gates)).map((l) => ({ ...l, from: [db.legoById.get(l.lego).known_text, db.legoById.get(l.lego).target_text], to: l.after })).filter((l) => !same(l.from, l.to)),
    seeds: SEED_EDITS.filter((x) => open(seedNeeds(x), gates)).map((x) => ({ ...x, from: [db.seedByNo.get(x.seed).known_text, db.seedByNo.get(x.seed).target_text], to: x.after })).filter((x) => !same(x.from, x.to)),
    deletes: DELETES.filter((d) => open(d.needs, gates) && db.byId.has(d.id)),
    intros: gates.has('intro') ? INTROS : [],
  };
}
/** everything these gates leave for later (the HELD list) */
function held(gates = GATES) {
  return {
    phrases: PHRASE_EDITS.filter((e) => !same(stageOf(e, gates), e.after)),
    legos: LEGO_EDITS.filter((l) => !open(legoNeeds(l), gates)),
    seeds: SEED_EDITS.filter((x) => !open(seedNeeds(x), gates)),
    deletes: DELETES.filter((d) => !open(d.needs, gates)),
    intros: gates.has('intro') ? [] : INTROS,
  };
}

// ── pure helpers ─────────────────────────────────────────────────────────────────────
const words = (s) => String(s || '').toLowerCase().split(/[^\p{L}\p{M}']+/u).filter(Boolean);
function containsWords(hay, needle) {
  const bag = new Map();
  for (const w of words(hay)) bag.set(w, (bag.get(w) || 0) + 1);
  for (const w of words(needle)) { const n = bag.get(w) || 0; if (!n) return false; bag.set(w, n - 1); }
  return words(needle).length > 0;
}
const legoOf = (id) => id.slice(0, 8);
const seedOf = (id) => Number(String(id).slice(1, 5));
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{M}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
function touchedSeeds(w) {
  return [...new Set([...w.legos.map((l) => seedOf(l.lego)), ...w.intros.map((i) => seedOf(i.lego)), ...w.phrases.map((e) => seedOf(e.id)), ...w.deletes.map((d) => seedOf(d.id)), ...w.seeds.map((x) => x.seed)])].sort((a, b) => a - b);
}

// ── DB ──────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const { rows: legos } = await pg.query('SELECT id AS uuid, lego_id, seed_number, lego_index, is_new, known_text, target_text, presentation_audio_id, known_audio_id::text, target1_audio_id::text, target2_audio_id::text FROM course_legos WHERE course_code=$1', [COURSE]);
  const { rows: phrases } = await pg.query('SELECT *, known_audio_id::text AS k, target1_audio_id::text AS t1, target2_audio_id::text AS t2 FROM course_practice_phrases WHERE course_code=$1', [COURSE]);
  const { rows: seeds } = await pg.query('SELECT id::text AS uuid, seed_number, known_text, target_text, known_audio_id::text AS k, target1_audio_id::text AS t1, target2_audio_id::text AS t2, approved_at FROM course_seeds WHERE course_code=$1', [COURSE]);
  for (const p of phrases) p.sid = p.id.slice(COURSE.length + 1);
  return { legos, phrases, seeds, byId: new Map(phrases.map((p) => [p.sid, p])), legoById: new Map(legos.map((l) => [l.lego_id, l])), seedByNo: new Map(seeds.map((s) => [s.seed_number, s])) };
}
async function clipsById(pg, ids) {
  const { rows } = await pg.query('SELECT id::text, voice_id, text, s3_key FROM course_audio WHERE id::text = ANY($1)', [ids.filter(Boolean)]);
  return new Map(rows.map((r) => [r.id, r]));
}

/** ZUT strict over the course as it stands, or with a gate set's texts overlaid — audit-phrase-zut.cjs auditRows. */
function zut(db, gates = null) {
  const { auditRows } = require('./audit-phrase-zut.cjs');
  const le = new Map(), pe = new Map(), se = new Map(), gone = new Set();
  if (gates) {
    const w = work(db, gates);
    for (const l of w.legos) le.set(l.lego, l.to); for (const x of w.seeds) se.set(x.seed, x.to); for (const d of w.deletes) gone.add(d.id); for (const e of w.phrases) pe.set(e.id, e.to);
  }
  const legos = db.legos.map((l) => ({ id: l.lego_id, seed_number: l.seed_number, known_text: (le.get(l.lego_id) || [l.known_text])[0], target_text: (le.get(l.lego_id) || [, l.target_text])[1] }));
  const phrases = db.phrases.filter((x) => !gone.has(x.sid)).map((x) => ({ id: x.sid, seed_number: x.seed_number, phrase_role: x.phrase_role, known_text: (pe.get(x.sid) || [x.known_text])[0], target_text: (pe.get(x.sid) || [, x.target_text])[1] }));
  const seeds = db.seeds.map((s) => ({ ...s, known_text: (se.get(s.seed_number) || [s.known_text])[0], target_text: (se.get(s.seed_number) || [, s.target_text])[1] }));
  const out = auditRows({ legos, phrases, seeds });
  return { bi: out.bidirectional.violationsStrict, ts: out.targetSideCollision.violationsStrict };
}

/** VERIFY — every fix these gates allow, read from the live DB. Non-empty = not fixed. */
async function verify(pg, db, gates = GATES) {
  const out = [];
  const legosDone = LEGO_EDITS.filter((l) => open(legoNeeds(l), gates)), seedsDone = SEED_EDITS.filter((x) => open(seedNeeds(x), gates));
  for (const l of legosDone) { const r = db.legoById.get(l.lego); if (r.known_text !== l.after[0] || r.target_text !== l.after[1]) out.push(`${l.lego} is "${r.known_text} | ${r.target_text}"`); }
  for (const e of PHRASE_EDITS) { const x = db.byId.get(e.id), want = stageOf(e, gates); if (!x || x.known_text !== want[0] || x.target_text !== want[1]) out.push(`${e.cls} ${e.id} does not hold its expected text`); }
  for (const d of DELETES.filter((x) => open(x.needs, gates))) if (db.byId.has(d.id)) out.push(`${d.cls} ${d.id} still present`);
  for (const s of seedsDone) { const r = db.seedByNo.get(s.seed); if (r.known_text !== s.after[0] || r.target_text !== s.after[1]) out.push(`seed ${s.seed} does not hold its AFTER text`); }
  for (const l of legosDone.filter((x) => x.before[1] !== x.after[1])) for (const x of db.phrases) if (legoOf(x.sid) === l.lego && x.phrase_role !== 'component' && !containsWords(x.target_text, l.after[1])) out.push(`P17 ${x.sid} "${x.target_text}" does not contain "${l.after[1]}"`);
  const want = [...legosDone.map((l) => [l.lego, l.intro]), ...(gates.has('intro') ? INTROS : []).map((i) => [i.lego, i.text])];
  const v = await clipsById(pg, want.map(([lego]) => db.legoById.get(lego).presentation_audio_id));
  for (const [lego, text] of want) { const a = v.get(db.legoById.get(lego).presentation_audio_id); if (!a || norm(a.text) !== norm(text)) out.push(`intro ${lego} links "${a && a.text}"`); }
  // every slot of a row this job wrote holds a clip whose words are the row's words
  const rows = PHRASE_EDITS.filter((e) => !same(stageOf(e, gates), e.before)).map((e) => db.byId.get(e.id)).filter(Boolean);
  const legos = legosDone.map((l) => db.legoById.get(l.lego));
  const seeds = seedsDone.map((s) => db.seedByNo.get(s.seed));
  const v2 = await clipsById(pg, [...rows.flatMap((x) => [x.k, x.t1, x.t2]), ...legos.flatMap((r) => [r.known_audio_id, r.target1_audio_id, r.target2_audio_id]), ...seeds.flatMap((s) => [s.t1, s.t2])]);
  const check = (name, id, text) => { const a = v2.get(id); if (!a) out.push(`${name} is silent`); else if (norm(a.text) !== norm(text)) out.push(`${name} clip says "${a.text}", row says "${text}"`); };
  for (const x of rows) { check(`${x.sid} known`, x.k, x.known_text); check(`${x.sid} target1`, x.t1, x.target_text); check(`${x.sid} target2`, x.t2, x.target_text); }
  for (const r of legos) { check(`${r.lego_id} known`, r.known_audio_id, r.known_text); check(`${r.lego_id} target1`, r.target1_audio_id, r.target_text); check(`${r.lego_id} target2`, r.target2_audio_id, r.target_text); }
  for (const s of seeds) { check(`seed ${s.seed_number} target1`, s.t1, s.target_text); check(`seed ${s.seed_number} target2`, s.t2, s.target_text); }
  return out;
}

// ── audio: every clip this run's texts need ─────────────────────────────────────────
function audioPlan(db, gates = GATES) {
  const plan = [], w = work(db, gates);
  const add = (key, role, text, extra = {}) => { if (!plan.find((x) => x.key === key)) plan.push({ key, role, text, ...extra }); };
  for (const l of w.legos) add(`intro:${l.lego}`, 'presentation', l.intro, { lego: l.lego });
  for (const i of w.intros) add(`intro:${i.lego}`, 'presentation', i.text, { lego: i.lego });
  const sides = (from, to) => {
    if (from[0] !== to[0]) add(`known:${to[0]}`, 'known', to[0]);
    if (from[1] !== to[1]) { add(`t1:${to[1]}`, 'target1', to[1]); add(`t2:${to[1]}`, 'target2', to[1]); }
  };
  for (const x of [...w.legos, ...w.phrases, ...w.seeds]) sides(x.from, x.to);
  return plan;
}

function ledgerPath() { const f = require('../lib/evidence-path.cjs').evidencePath(`tools/course-optimization/${SWEEP}/ledger.jsonl`); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; }
function readLedger() {
  const f = ledgerPath(); if (!fs.existsSync(f)) return new Map();
  const m = new Map(); for (const line of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(line); if (e.kind === 'clip') m.set(e.key, e); }
  return m;
}
const log = (e) => fs.appendFileSync(ledgerPath(), JSON.stringify({ at: new Date().toISOString(), ...e }) + '\n');

async function render(body) {
  const res = await fetch(RENDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ courseCode: COURSE, purpose: `kai ${JOB}: hin want/try + clear defects (James forum report)`, job: JOB, ...body }) });
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
}

/** dry run (DRY=1) or render every planned clip not already in the ledger. A refusal stops the run — no retry. */
async function audio(pg, db, { dry }) {
  const plan = audioPlan(db), done = readLedger(), out = [];
  for (const c of plan) {
    if (done.has(c.key)) { out.push({ key: c.key, ledger: done.get(c.key).audioId }); continue; }
    const body = { role: c.role, text: c.text, dryRun: dry, ...(c.role === 'presentation' ? { language: 'eng' } : {}) };
    const r = await render(body);
    if (!r.ok) { out.push({ key: c.key, text: c.text, refused: r.code || r.error }); if (!dry) { log({ kind: 'refused', key: c.key, text: c.text, r }); console.log('REFUSED — stopping, no retry:', c.key, JSON.stringify(r)); break; } continue; }
    if (dry) { out.push({ key: c.key, role: c.role, text: c.text, source: r.source, chars: r.wouldSpendChars || 0, voiceId: r.voiceId }); continue; }
    const v = (await clipsById(pg, [r.audioId])).get(r.audioId);
    if (!v || norm(v.text) !== norm(c.text)) { log({ kind: 'verify-failed', key: c.key, r, v }); console.log('VERIFY FAILED — stopping:', c.key, JSON.stringify(v)); break; }
    const e = { kind: 'clip', key: c.key, role: c.role, text: c.text, audioId: r.audioId, voiceId: v.voice_id, source: r.source, charsSpent: r.charsSpent || 0 };
    log(e); out.push(e);
  }
  return out;
}

// ── APPLY ───────────────────────────────────────────────────────────────────────────
/** every touched row, before any write, into one table (first save of each row wins; phase 2 adds its own rows) */
async function backup(pg, db) {
  const pids = [...PHRASE_EDITS.map((e) => e.id), ...DELETES.map((d) => d.id)].map((id) => `${COURSE}:${id}`);
  const legoIds = [...LEGO_EDITS.map((l) => l.lego), ...INTROS.map((i) => i.lego)];
  const seedNos = touchedSeeds(work(db, new Set(['intro', 'hindi'])));
  await pg.query(`CREATE TABLE IF NOT EXISTS ${BACKUP} (tbl text, key text, gates int, row jsonb, saved_at timestamptz default now())`);
  const q = async (tbl, sql, args) => pg.query(`INSERT INTO ${BACKUP} (tbl, key, gates, row) SELECT '${tbl}', k, ${GATES.size}, r FROM (${sql}) x WHERE NOT EXISTS (SELECT 1 FROM ${BACKUP} b WHERE b.tbl='${tbl}' AND b.key=x.k)`, args);
  await q('course_practice_phrases', 'SELECT id AS k, to_jsonb(p) AS r FROM course_practice_phrases p WHERE id = ANY($1)', [pids]);
  await q('course_legos', 'SELECT lego_id AS k, to_jsonb(l) AS r FROM course_legos l WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, legoIds]);
  await q('course_seeds', 'SELECT seed_number::text AS k, to_jsonb(s) AS r FROM course_seeds s WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, seedNos]);
  await q('lego_introductions', 'SELECT lego_id AS k, to_jsonb(i) AS r FROM lego_introductions i WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, legoIds]);
  const { rows: [{ m }] } = await pg.query(`SELECT count(*)::int m FROM ${BACKUP}`);
  return m;
}

async function apply(pg, db) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { mayPoint } = require('../../services/shared/resolve-voice.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const clips = readLedger();
  const clip = (key) => { const c = clips.get(key); if (!c) throw new Error(`no rendered clip for ${key} — run AUDIO=1 first`); return c.audioId; };
  const w = work(db);

  // guards: every row still holds its FROM text, and no new ZUT clash
  for (const l of w.legos) { const r = db.legoById.get(l.lego); if (r.known_text !== l.from[0] || r.target_text !== l.from[1]) throw new Error(`${l.lego} holds "${r.known_text} | ${r.target_text}", not its FROM text`); }
  for (const e of w.phrases) { const x = db.byId.get(e.id); if (!x || x.known_text !== e.from[0] || x.target_text !== e.from[1]) throw new Error(`${e.id} does not hold its FROM text`); }
  for (const d of w.deletes) { const x = db.byId.get(d.id); if (!x || x.known_text !== d.known || x.target_text !== d.target) throw new Error(`${d.id} does not hold the expected text`); }
  for (const s of w.seeds) { const r = db.seedByNo.get(s.seed); if (r.known_text !== s.from[0] || r.target_text !== s.from[1]) throw new Error(`seed ${s.seed} does not hold its FROM text`); }
  const zb = zut(db), za = zut(db, GATES);
  const kb = new Set(zb.bi.map((v) => v.known_norm)), fresh = za.bi.filter((v) => !kb.has(v.known_norm));
  if (fresh.length) throw new Error(`ZUT: new strict clash(es): ${fresh.map((v) => v.known_norm).join(', ')}`);

  const links = (from, to) => { const s = {}; if (from[0] !== to[0]) s.known_audio_id = clip(`known:${to[0]}`); if (from[1] !== to[1]) { s.target1_audio_id = clip(`t1:${to[1]}`); s.target2_audio_id = clip(`t2:${to[1]}`); } return s; };
  const legoLinks = w.legos.map((l) => ({ l, r: db.legoById.get(l.lego), s: { ...links(l.from, l.to), presentation_audio_id: clip(`intro:${l.lego}`) } }));
  const phraseLinks = w.phrases.map((e) => ({ e, x: db.byId.get(e.id), s: links(e.from, e.to) }));
  const seedLinks = w.seeds.map((s) => ({ s0: s, r: db.seedByNo.get(s.seed), s: links(s.from, s.to) }));
  const introSwaps = w.intros.map((i) => { const r = db.legoById.get(i.lego); return { i, r, from: r.presentation_audio_id, to: clip(`intro:${i.lego}`) }; });

  // the voice policy checks every pointer before anything is written
  const pointers = [
    ...legoLinks.flatMap(({ r, s }) => Object.entries(s).map(([col, to]) => ({ tbl: 'course_legos', key: r.uuid, col, to, from: r[col] }))),
    ...phraseLinks.flatMap(({ x, s }) => Object.entries(s).map(([col, to]) => ({ tbl: 'course_practice_phrases', key: x.id, col, to, from: x[col] }))),
    ...introSwaps.map(({ r, from, to }) => ({ tbl: 'course_legos', key: r.uuid, col: 'presentation_audio_id', to, from })),
  ];
  for (const ptr of pointers) if (!await mayPoint(supabase, { courseCode: COURSE, col: ptr.col, to: ptr.to, tbl: ptr.tbl, key: ptr.key, from: ptr.from })) throw new Error(`voice policy refused ${ptr.tbl} ${ptr.key} ${ptr.col} → ${ptr.to}`);

  const saved = await backup(pg, db);
  const seeds = touchedSeeds(w);
  const approved = db.seeds.filter((s) => seeds.includes(s.seed_number) && s.approved_at).map((s) => ({ seed_number: s.seed_number, approved_at: s.approved_at }));
  const ev = {}, base = { job: JOB, gates: [...GATES], backup: BACKUP };
  if (legoLinks.length) ev.lego = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [...new Set(w.legos.map((l) => seedOf(l.lego)))], lego_ids: w.legos.map((l) => l.lego), rows: w.legos.length }, detail: { ...base, edits: legoLinks.map(({ l, s }) => ({ lego: l.lego, from: l.from, to: l.to, intro: l.intro, why: l.why, links: s })) } });
  if (phraseLinks.length) ev.edit = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [...new Set(w.phrases.map((e) => seedOf(e.id)))], phrase_ids: w.phrases.map((e) => `${COURSE}:${e.id}`), rows: w.phrases.length }, detail: { ...base, edits: phraseLinks.map(({ e, s }) => ({ id: e.id, cls: e.cls, from: e.from, to: e.to, conf: e.conf, links: s })) } });
  if (w.deletes.length) ev.del = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [...new Set(w.deletes.map((d) => seedOf(d.id)))], phrase_ids: w.deletes.map((d) => `${COURSE}:${d.id}`), rows: w.deletes.length }, detail: { ...base, deleted: w.deletes } });
  if (seedLinks.length) ev.seed = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-edit', scope: { seed_numbers: w.seeds.map((s) => s.seed), rows: w.seeds.length }, detail: { ...base, edits: seedLinks.map(({ s0, s }) => ({ ...s0, links: s })) } });
  if (introSwaps.length) ev.intro = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'audio-relink', scope: { seed_numbers: w.intros.map((i) => seedOf(i.lego)), lego_ids: w.intros.map((i) => i.lego), rows: w.intros.length }, detail: { ...base, swaps: introSwaps.map(({ i, from, to }) => ({ lego: i.lego, from, to, text: i.text })), why: 'intro as-in quoted a deleted stilted row; old clip kept' } });
  if (approved.length) ev.unapprove = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: approved.map((a) => a.seed_number), rows: approved.length }, detail: { ...base, why: 're-texted or deleted rows for the want/try + clear-defects pass; they arrive unchecked', approved_at_before: approved } });

  const pointIntro = async (lego, oldId, to) => {
    if (oldId) await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [oldId, lego]);
    await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2::uuid', [lego, to]);
    await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, updated_at) VALUES ($1,$2,$3,$3,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, updated_at=now()`, [COURSE, lego, to]);
  };
  await pg.query('BEGIN');
  try {
    for (const { l, r, s } of legoLinks) {
      const cols = Object.keys(s), vals = cols.map((c) => s[c]);
      const set = ['known_text=$1', 'target_text=$2', 'last_edit_event_id=$3', 'updated_at=now()', ...cols.map((c, i) => `${c}=$${i + 7}${c === 'presentation_audio_id' ? '' : '::uuid'}`)].join(', ');
      const u = await pg.query(`UPDATE course_legos SET ${set} WHERE id=$4 AND known_text=$5 AND target_text=$6`, [l.to[0], l.to[1], ev.lego, r.uuid, l.from[0], l.from[1], ...vals]);
      if (u.rowCount !== 1) throw new Error(`${l.lego}: lego update ${u.rowCount}`);
      await pointIntro(l.lego, r.presentation_audio_id, s.presentation_audio_id);
    }
    for (const { i, r, from, to } of introSwaps) {
      const u = await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=$2, updated_at=now() WHERE id=$3 AND presentation_audio_id IS NOT DISTINCT FROM $4', [to, ev.intro, r.uuid, from]);
      if (u.rowCount !== 1) throw new Error(`${i.lego}: intro swap ${u.rowCount}`);
      await pointIntro(i.lego, from, to);
    }
    for (const { e, x, s } of phraseLinks) {
      const [k, t] = e.to, cols = Object.keys(s);
      const set = ['known_text=$1', 'target_text=$2', 'word_count=$3', 'lego_count=$4', 'qa_checked=NULL', 'decomposition=NULL', 'decomposition_course_version=NULL', 'display_tiling=NULL', 'display_tiling_version=NULL', 'last_edit_event_id=$5', 'updated_at=now()', ...cols.map((c, i) => `${c}=$${i + 9}::uuid`)].join(', ');
      const sameT = e.from[1] === t;
      const u = await pg.query(`UPDATE course_practice_phrases SET ${set} WHERE id=$6 AND known_text=$7 AND target_text=$8`, [k, t, sameT ? x.word_count : t.length, sameT ? x.lego_count : t.split(/\s+/).length, ev.edit, x.id, e.from[0], e.from[1], ...cols.map((c) => s[c])]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: update ${u.rowCount}`);
    }
    for (const d of w.deletes) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    for (const { s0, r, s } of seedLinks) {
      const cols = Object.keys(s);
      const set = ['known_text=$1', 'target_text=$2', 'last_edit_event_id=$3', 'updated_at=now()', ...cols.map((c, i) => `${c}=$${i + 6}::uuid`)].join(', ');
      const u = await pg.query(`UPDATE course_seeds SET ${set} WHERE id::text=$4 AND target_text=$5`, [s0.to[0], s0.to[1], ev.seed, r.uuid, s0.from[1], ...cols.map((c) => s[c])]);
      if (u.rowCount !== 1) throw new Error(`seed ${s0.seed}: update ${u.rowCount}`);
    }
    if (approved.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [ev.unapprove, COURSE, approved.map((a) => a.seed_number)]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  await require('../../services/shared/course-version.cjs').bumpCourseVersion(supabase, COURSE, 'patch');
  return { gates: [...GATES], backupRows: saved, unapproved: approved.map((a) => a.seed_number), events: ev };
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    let db = await load(pg);
    if (process.env.ZUT === '1') {
      const b = zut(db);
      for (const g of [GATES, new Set(['intro']), new Set(['intro', 'hindi'])]) {
        const p = [...g].join('+') || 'no gates';
        const a = zut(db, g), kb = new Set(b.bi.map((v) => v.known_norm)), ka = new Set(a.bi.map((v) => v.known_norm));
        console.log(`ZUT strict with ${p}: bidirectional ${b.bi.length} → ${a.bi.length}, target-side ${b.ts.length} → ${a.ts.length}; new ${JSON.stringify(a.bi.filter((v) => !kb.has(v.known_norm)).map((v) => v.known_norm))}, resolved ${JSON.stringify(b.bi.filter((v) => !ka.has(v.known_norm)).map((v) => v.known_norm))}`);
      }
    }
    if (process.env.AUDIO === '1') {
      const dry = process.env.DRY === '1';
      const res = await audio(pg, db, { dry });
      console.log(JSON.stringify(res, null, 1));
      if (dry) console.log(`would spend ${res.reduce((n, x) => n + (x.chars || 0), 0)} chars over ${res.filter((x) => x.source === 'would-render' || x.source === 'would-splice').length} renders; ${res.filter((x) => x.source === 'library').length} library hits; ${res.filter((x) => x.refused).length} refused`);
      else console.log(`spent ${res.reduce((n, x) => n + (x.charsSpent || 0), 0)} chars`);
    }
    if (process.env.APPLY === '1') { console.log(JSON.stringify(await apply(pg, db), null, 1)); db = await load(pg); }
    const problems = await verify(pg, db);
    const h = held();
    console.log(problems.length ? `VERIFY [${[...GATES].join(',') || 'no gates'}]: ${problems.length} defect(s) stand${problems.length > 20 ? ' (first 20)' : ''}:\n  ${problems.slice(0, 20).join('\n  ')}` : `VERIFY [${[...GATES].join(',') || 'no gates'}]: every fix this run may make holds in the live DB`);
    console.log(`HELD behind a closed gate: ${h.phrases.length} phrase edits, ${h.deletes.length} deletes, ${h.legos.length} LEGOs, ${h.seeds.length} seeds, ${h.intros.length} intro-only`);
    process.exitCode = problems.length ? 2 : 0;
  } finally { await pg.end(); }
}
module.exports = { LEGO_EDITS, INTROS, PHRASE_EDITS, DELETES, SEED_EDITS, GATES, intro, stageOf, liveStage, legoNeeds, work, held, containsWords, touchedSeeds, audioPlan };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
