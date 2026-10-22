'use strict';
// Decisions for k41-infinitive-to-2026-10-22.cjs (job #530). Every row below was READ in full against live data (seed sentence,
// LEGO, tiles, BUILD fragments) — a regex found the candidates, a person decided. `change` is the list owed "to"; the tool's ZUT
// test holds the ones whose "to X" already stands over another target. `skip` is what was read and judged NOT owed.
const clit = /(-?(me|te|se|lo|la|le|nos|os|los|las|les|lhe|lhes))+$/;
const iberianInf = (t) => { const w = String(t).toLowerCase().split(/\s+/)[0].replace(clit, ''); return /[aeiíô]r$|[ôo]r$/.test(w) && w.length > 3; };
const frInf = (t) => { const w = String(t).toLowerCase().replace(/^(me|te|se|nous|vous|s'|m'|t')\s*/, '').split(/\s+/)[0]; return /(er|ir|re|oir)$/.test(w) && w.length > 3; };
const deInf = (t) => { const ws = String(t).split(/\s+/); const w = ws[ws.length - 1]; return /^[a-zäöüß]+(en|ern|eln)$/.test(w) && w.length > 4; };

module.exports = {
  fra_for_eng: {
    isInfinitiveTile: frInf,
    change: {
      S0091L02: {}, S0095L02: {}, S0251L01: {},   // each holds on ZUT: to think = réfléchir, to go home = rentrer, to find out = découvrir
      S0106L02: {}, S0173L01: {}, S0529L01: {},
    },
    // he's stopping | s'arrêter (seed: n'aime pas s'arrêter de parler): a finite-looking mis-gloss of an infinitive. Re-glossing it
    // "to stop" makes the LATER S0402L02 (to stop | s'arrêter) an exact duplicate — an is_new call on a LEGO this pass does not touch.
    hold: { S0240L03: 'gloss "he\'s stopping" is finite over an infinitive; "to stop" would make the later S0402L02 a duplicate (is_new call) and rewrite four fragments by hand: Kai\'s call' },
    skip: {},
  },

  spa_for_eng: {
    isInfinitiveTile: iberianInf,
    change: {
      S0098L03: {}, S0150L02: {}, S0173L02: {}, S0174L02: {}, S0211L04: {}, S0270L02: {}, S0496L02: {}, S0504L02: {}, S0630L01: {}, S0095L01: {}, S0156L01: {}, S0588L02: {},
      S0357L03: { known: 'to send her', phrases: { S0357L03B01: 'to send her' }, comps: [{ known: 'to send', target: 'mandar' }, { known: 'her', target: 'le' }] },
    },
    hold: {},
  },
  por_for_eng: {
    isInfinitiveTile: iberianInf,
    change: {
      S0065L03: {}, S0071L02: {}, S0071L04: {}, S0228L01: {}, S0269L01: {}, S0274L01: {}, S0337L01: {}, S0447L02: {}, S0499L05: {},
      S0490L02: { phrases: { S0490L02B02: 'never to trust anyone' } },
      S0530L01: { known: 'to be able to' },
    },
    hold: {},
  },
  por_br_for_eng: {
    isInfinitiveTile: iberianInf,
    change: {
      S0065L02: {}, S0069L02: {}, S0071L04: {}, S0071L02: {}, S0074L03: {}, S0098L02: {}, S0200L04: {}, S0269L01: {}, S0425L03: {}, S0433L02: {}, S0434L02: {}, S0437L02: {}, S0438L04: {}, S0451L03: {}, S0452L03: {}, S0442L02: {}, S0445L02: {}, S0446L02: {}, S0450L03: {}, S0455L02: {}, S0466L02: {}, S0469L03: {}, S0471L02: {}, S0490L02: {}, S0496L02: {}, S0497L03: {}, S0499L02: {}, S0501L02: {}, S0505L02: {}, S0525L03: {}, S0528L02: {}, S0529L02: {}, S0530L02: {}, S0531L03: {}, S0549L02: {}, S0562L02: {}, S0563L02: {}, S0593L03: {}, S0665L02: {}, S0668L03: {},
    },
    hold: {},
  },
  deu_for_eng: {
    isInfinitiveTile: deInf,
    change: {
      S0088L02: {}, S0186L04: {}, S0095L02: {},  S0106L03: {}, S0173L03: {}, S0181L03: {}, S0200L02: {}, S0313L01: {},  S0508L03: {}, S0534L02: {}, S0646L01: {},
      S0168L02: { known: 'to be able to come and help' },
      S0106L01: { phrases: { S0106L01B01: 'To feel happy' } },
      S0415L03: { phrases: { S0415L03B02: 'to ask me now' } },
      S0351L02: { phrases: { S0351L02B02: 'not to leave me alone' } },
    },
    hold: {
      S0288L02: 'like watching television | gern fernsehen: the known side is a finite/gerund gloss of a finite seed verb (sehen gern fern), not a bare infinitive: Kai\'s call',
      S0472L02: 'don\'t know the facts | die Fakten nicht kennen: finite subordinate verb in the seed (dass wir die Fakten nicht kennen); a finite known side: Kai\'s call',
    },
  },
};
