# west shard specs (cs #770). One entry per course; see gen.py. Sources cited in each note (they become the plan-file header).
E1 = "We didn't expect to wake up in the middle of the night."
e1 = "we didn't expect to wake up in the middle of the night"
KH = [("didn't hope", "didn't expect")]
SPECS = {}
def S(c, **k): SPECS[c] = k

S("afr_for_eng", seed=(E1, "Ons het nie verwag om in die middel van die nag wakker te word nie."),
  note="""afr_for_eng C0108 hope -> expect. gehoop -> verwag (HAT / Pharos: verwag = expect; "het nie verwag om ... te ... nie").
Seed 108 has only the 'in the middle of' LEGO: no row says hope or bare wake, so the plan is the seed pair alone.
The verb has no LEGO in seed 108 (pre-existing gap: hope had none here either).""")

S("dan_for_eng", seed=(E1, "Vi forventede ikke at vågne midt om natten."),
  ksubs=[("not hoping to wake", "didn't expect to wake")], tsubs=[("håbede ikke at", "forventede ikke at")],
  note="""dan_for_eng C0108 hope -> expect. håbede (på) -> forventede (Den Danske Ordbog: forvente = "regne med at noget vil ske").
No hope LEGO in seed 108; L01B03 was the hope row and is rewritten, B02/U02 get wake -> wake up (English only).""")

S("deu_for_eng", seed=(e1, "wir haben nicht erwartet, mitten in der Nacht aufzuwachen"),
  over={"S0108L01": {"lego": ("have expected", "haben erwartet"), "components": [{"known": "have", "target": "haben"}, {"known": "expected", "target": "erwartet"}]},
        "S0108L01C02": ("Expected", "Erwartet"), "S0108L01B01": ("Have expected", "Haben erwartet")},
  ksubs=KH + [("have hoped", "have expected")], tsubs=[("haben gehofft", "haben erwartet"), ("haben nicht gehofft", "haben nicht erwartet")],
  note="""deu_for_eng C0108 hope -> expect. gehofft -> erwartet (Duden: erwarten = "mit etwas rechnen"), perfect tense kept to match
the course's live cut 'haben gehofft'. L01 re-cut to 'have expected' = 'haben erwartet'; every L01 row keeps its frame with the new verb.""")

S("deu_at_for_eng", seed=(e1, "mir hobn ned erwartet, dass ma mitten in der Nocht aufwochen"),
  ksubs=KH, tsubs=[("hobn ned ghofft", "hobn ned erwartet")],
  note="""deu_at_for_eng C0108 hope -> expect. ghofft -> erwartet (Österreichisches Wörterbuch: erwarten; er- verbs take no ge- prefix,
so the dialect participle is the standard one; the course's own dass-clause frame is kept). No hope LEGO in seed 108: seed pair +
the seed-echo row L02U01. L02U03 'we hoped to wake up in time' is a natural positive hope and stays.""")

S("deu_ch_for_eng", seed=(E1, "Mir händ nöd erwartet, mitts i de Nacht ufzwache."),
  ksubs=KH, tsubs=[("händ nöd ghofft", "händ nöd erwartet")],
  note="""deu_ch_for_eng C0108 hope -> expect. ghofft -> erwartet (Schweizerisches Idiotikon / Zürichdeutsches Wörterbuch: erwarte, Partizip erwartet).
No hope LEGO in seed 108: seed pair + seed-echo L02U01; L02 rows get wake -> wake up (English only).
L01U03 / L02U03 are natural positive 'hoped' rows and keep their verb.""")

S("fry_for_eng", seed=(E1, "Wy ferwachten net midden yn 'e nacht wekker te wurden."),
  over={"S0108L02": {"lego": ("we didn't expect", "wy ferwachten net"), "components": [{"known": "we expected", "target": "wy ferwachten"}, {"known": "not", "target": "net"}]},
        "S0108L02C01": ("we expected", "wy ferwachten"),
        "S0108L02B01": ("we didn't expect to make mistakes", "wy ferwachten net flaters te meitsjen"),
        "S0108L02B02": ("we didn't expect to hear more words", "wy ferwachten net mear wurden te hearren"),
        "S0108L02B03": ("we didn't expect to talk all day", "wy ferwachten net de hiele dei te praten"),
        "S0108L02U01": ("we didn't expect to find out more about this language", "wy ferwachten net mear oer dizze taal út te finen"),
        "S0108L02U02": ("yes but we didn't expect to find the answer", "ja, mar wy ferwachten net it antwurd te finen"),
        "S0108L02U03": ("we didn't expect to finish so quickly", "wy ferwachten net sa fluch klear te wêzen"),
        "S0108L02U04": ("we didn't expect to go home", "wy ferwachten net nei hûs te gean"),
        "S0108L02U05": ("we didn't expect to wake up in the middle of the night", "wy ferwachten net midden yn 'e nacht wekker te wurden")},
  note="""fry_for_eng C0108 hope -> expect. hopen -> ferwachten (Frysk Hânwurdboek / taalweb.frl: ferwachtsje, doetiid ferwachte(n)).
ferwachtsje takes a plain te-infinitive, so the 'om' the hope rows carried is dropped. L02 re-cut to 'we didn't expect' = 'wy ferwachten net'.
U03 'as quickly as possible' -> 'so quickly' (expecting to finish as quickly as possible does not make sense negated).
All L02 rows are human-voice re-takes for Auke.""")

S("isl_for_eng", seed=(E1, "Við bjuggumst ekki við að vakna um miðja nótt."),
  ksubs=KH, tsubs=[("vonuðum ekki að", "bjuggumst ekki við að")],
  note="""isl_for_eng C0108 hope -> expect. vonuðum -> bjuggumst við (ISLEX / Íslensk nútímamálsorðabók: búast við e-u = expect).
No hope LEGO in seed 108: seed pair + seed-echo L01U01; other rows wake -> wake up (English only). U04 'we hoped not to' stays hope.""")

S("nld_for_eng", seed=(e1, "we verwachtten niet midden in de nacht wakker te worden"),
  ksubs=KH, tsubs=[("hoopten niet", "verwachtten niet")],
  note="""nld_for_eng C0108 hope -> expect. hoopten -> verwachtten (Van Dale: verwachten = "rekenen op"; + te-infinitive).
No hope LEGO in seed 108: seed pair + seed-echo L02U05; L02U04 wake -> wake up. 'she hoped not to' rows stay hope.""")

S("nor_for_eng", seed=(E1, "Vi forventet ikke å våkne midt på natten."),
  ksubs=KH + [("did you hope", "did you expect")], tsubs=[("håpet ikke å", "forventet ikke å"), ("håpet du å", "forventet du å")],
  note="""nor_for_eng C0108 hope -> expect. håpet -> forventet (Bokmålsordboka: forvente = "vente, regne med").
No hope LEGO in seed 108. Rewritten: L01U01, L02U01 (seed echo), L02U05 ('did you hope to wake in the middle of the night?' was the
same odd frame as a question). All other rows: wake -> wake up, English only.""")

S("pdc_for_eng", seed=(E1, "Mir hen net erwaart fer uffwache in der Mitt vun der Nacht."),
  over={"S0108L01U01": ("we didn't expect to wake up in the middle of the night", "mir hen net erwaart fer uffwache in der Mitt vun der Nacht")},
  note="""pdc_for_eng C0108 hope -> expect. ghofft -> erwaart (Beam, Revised Pennsylvania German Dictionary: erwaarde, pp. erwaart = to expect).
No hope LEGO in seed 108. L01U01 carried the old seed target under the known 'we hoped not to wake...' and becomes the seed echo.
B03 / U05 are positive 'hoped' rows and keep their verb; wake -> wake up, English only.""")

S("swe_for_eng", seed=(e1, "Vi förväntade oss inte att vakna mitt i natten."),
  ksubs=KH, tsubs=[("hoppades inte på att", "förväntade oss inte att")],
  note="""swe_for_eng C0108 hope -> expect. hoppades (på) -> förväntade oss (Svensk ordbok / SAOL: förvänta sig = "räkna med").
No hope LEGO in seed 108: seed pair + the two rows that echo it (L02U01, L03U01).""")

S("yid_for_eng", seed=(E1, "מיר האָבן זיך נישט געריכט זיך אויפֿצוּוועקן אין מיטן נאַכט"),
  note="""yid_for_eng C0108 hope -> expect. געהאָפֿט -> זיך געריכט (Comprehensive Yiddish-English Dictionary, Beinfeld & Bochner:
ריכטן זיך = expect). Only the verb changes; the rest of the live wording is kept. Seed-only draft: no LEGOs.""")

S("gla_for_eng", seed=(E1, "Cha robh dùil againn dùsgadh am meadhan na h-oidhche."),
  ksubs=KH, tsubs=[("cha robh sinn an dòchas", "cha robh dùil againn"), ("cha robh mi an dòchas", "cha robh dùil agam"), ("cha robh thu an dòchas", "cha robh dùil agad")],
  over={"S0108L01": {"lego": ("we didn't expect", "cha robh dùil againn"), "components": [{"known": "there was no expectation", "target": "cha robh dùil"}, {"known": "at us", "target": "againn"}]},
        "S0108L01C01": ("there was no expectation", "cha robh dùil"), "S0108L01C02": ("at us", "againn"),
        "S0108L01B02": ("we didn't expect to start today", "cha robh dùil againn tòiseachadh an-diugh"),
        "S0108L01B03": ("we didn't expect to learn now", "cha robh dùil againn ionnsachadh a-nis"),
        "S0108L01U05": ("we didn't expect to find out", "cha robh dùil againn lorg a-mach"),
        "S0108L03B03": ("we didn't expect to wake up in the middle of the night now", "cha robh dùil againn dùsgadh am meadhan na h-oidhche a-nis")},
  note="""gla_for_eng C0108 hope -> expect. an dòchas -> dùil (Am Faclair Beag: dùil = expectation; "tha dùil agam" = I expect;
LearnGaelic: "cha robh dùil agam ri sin" = I didn't expect that). L01 re-cut to 'we didn't expect' = 'cha robh dùil againn'.
The two bare builds 'we didn't hope today / at all' cannot stand with expect (it needs a complement) so they take a verb (B02, B03;
B03's live target said a-nis 'now' under the known 'at all'). L03B03's target already ended in a-nis: the known now says 'now'.
L02 known 'to wake' -> 'to wake up'; other rows wake -> wake up, English only.""")

S("cor_for_eng", seed=(E1, "nyns esen ni ow kwaytya difuna yn kres an nos"),
  ksubs=KH,
  over={"S0108L01": {"lego": ("we didn't expect", "nyns esen ni ow kwaytya"), "components": [{"known": "we were not", "target": "nyns esen ni"}, {"known": "expecting", "target": "ow kwaytya"}, {"known": "to expect", "target": "gwaytya"}]},
        "S0108L01C01": ("we were not", "nyns esen ni"), "S0108L01C02": ("expecting", "ow kwaytya"), "S0108L01C03": ("to expect", "gwaytya"),
        "S0108L01B01": ("we didn't expect to speak", "nyns esen ni ow kwaytya kewsel"),
        "S0108L01B02": ("we didn't expect to hear the young dog", "nyns esen ni ow kwaytya klewes an ki yowynk"),
        "S0108L01B03": ("we didn't expect to go home", "nyns esen ni ow kwaytya mos tre"),
        "S0108L01U01": ("we didn't expect to hear the truth", "nyns esen ni ow kwaytya klewes an gwir"),
        "S0108L01U02": ("we didn't expect to speak with people I don't know", "nyns esen ni ow kwaytya kewsel gans tus na aswonnav"),
        "S0108L01U03": ("we didn't expect to understand everything", "nyns esen ni ow kwaytya konvedhes puptra"),
        "S0108L01U04": ("we didn't expect to understand what you were doing", "nyns esen ni ow kwaytya konvedhes an pyth eses ta orth y wul"),
        "S0108L01U05": ("we didn't expect to understand in a short time", "nyns esen ni ow kwaytya konvedhes yn berr spys"),
        "S0108L02": {"lego": ("to wake up", "difuna"), "components": None},
        "S0108L02C01": "DELETE", "S0108L02C02": "DELETE",
        "S0108L02B01": ("we didn't expect to wake up", "nyns esen ni ow kwaytya difuna"),
        "S0108L02B02": ("I don't want to wake up", "ny vynnav vy difuna"),
        "S0108L02B03": ("it isn't easy to wake up", "nyns yw es difuna"),
        "S0108L02U01": ("I don't want to wake up this morning", "ny vynnav vy difuna an myttin ma"),
        "S0108L02U03": ("I don't like to wake up at six o'clock", "nyns yw da genev vy difuna dhe hwegh eur"),
        "S0108L02U05": ("why do you want to wake up this morning", "prag y fyn'ta difuna an myttin ma?"),
        "S0108L03B02": ("to wake up in the middle of the night", "difuna yn kres an nos"),
        "S0108L02U02": ("we didn't expect to wake up at six o'clock", "nyns esen ni ow kwaytya difuna dhe hwegh eur"),
        "S0108L02U04": ("we didn't expect to wake up tonight", "nyns esen ni ow kwaytya difuna haneth"),
        "S0108L03B01": ("we didn't expect to wake up in the middle of the night", "nyns esen ni ow kwaytya difuna yn kres an nos"),
        "S0108L03U02": ("we didn't expect to speak in the middle of the night", "nyns esen ni ow kwaytya kewsel yn kres an nos")},
  note="""cor_for_eng C0108 hope -> expect. govenek (hope, noun frame 'nyns esa govenek dhyn dhe ...') -> gwaytya (Gerlyver Kernewek,
cornishdictionary.org.uk: gwaytya = to expect), in the long form the course already uses for the past ('eses ta orth y wul'):
'nyns esen ni ow kwaytya' = we were not expecting (ow hardens gw- to kw-). gwaytya takes the bare verbal noun, so the 'dhe' + soft
mutation of the hope frame goes: worfenna -> gorfenna, weles -> gweles, vos -> mos, glewes -> klewes, gewsel -> kewsel, gonvedhes -> konvedhes.
L02 follows from that: 'to wake' = 'dhe dhifuna' (M: dhe + dhifuna) becomes 'to wake up' = 'difuna' (A), which is the form the new seed
needs and the form L03B03/U01 already use; its two component rows (dhe, dhifuna) are deleted because an A LEGO has none.
The validator matches LEGO text literally, so the five L02 rows and L03B02 that carried the mutated 'dhe dhifuna' (after parys / govenek)
are rewritten onto frames that take the bare verbal noun and are already live in this seed's L03 rows (ny vynnav vy, nyns yw es,
nyns yw da genev vy, prag y fyn'ta). The two 'see' rows and the two 'finish' rows in L01 take other verbs (hear, understand, speak): bare 'gweles' is not yet course
vocabulary (only the mutated 'weles' is; validator-probed), and 'gorfenna' was avoided for the same reason.
Course is parked for audio (Kai, 16 Nov): text only.""")

S("bre_for_eng", seed=(e1, "ne c'hortozemp ket dihuniñ e-kreiz an noz"),
  note="""bre_for_eng C0108 hope -> expect. spi (hope, 'n'hor boa ket spi da') -> gortoz (Favereau, Geriadur ar brezhoneg a-vremañ, and
Ménard, Dictionnaire français-breton: gortoz = attendre, s'attendre à; 'ne c'hortozen ket an dra-se' = je ne m'y attendais pas).
Imperfect 1pl 'ne c'hortozemp ket' + bare verbal noun 'dihuniñ' (the 'da' + soft mutation of the spi frame goes). Seed-only draft: no LEGOs.""")

S("fra_for_eng", seed=(e1, "nous ne nous attendions pas à nous réveiller au milieu de la nuit"),
  ksubs=KH, tsubs=[("nous n'espérions pas", "nous ne nous attendions pas à")],
  over={"S0108L01": {"lego": ("we didn't expect to", "nous ne nous attendions pas à"), "components": [{"known": "didn't expect to", "target": "ne nous attendions pas à"}, {"known": "we didn't expect to", "target": "nous ne nous attendions pas à"}]},
        "S0108L01C01": ("didn't expect to", "ne nous attendions pas à")},
  note="""fra_for_eng C0108 hope -> expect. espérions -> nous attendions à (Larousse / Le Robert: s'attendre à = "prévoir, compter sur").
L01 re-cut to 'we didn't expect to' = 'nous ne nous attendions pas à' (the à belongs to the verb, so it sits inside the LEGO);
every L01 row keeps its frame with the new verb. L02 known 'to wake' -> 'to wake up' and its rows likewise (English only);
L02U05 'we hoped to wake up before tomorrow' is a natural positive hope and keeps its verb. L03U05 / L03U08 rewritten.""")

S("fra_ca_for_eng", seed=(e1, "On s'attendait pas à se réveiller au milieu de la nuit"),
  ksubs=KH, tsubs=[("on espérait pas", "on s'attendait pas à")],
  over={"S0108L01": {"lego": ("we didn't expect to", "on s'attendait pas à"), "components": [{"known": "we", "target": "on"}, {"known": "didn't expect to", "target": "s'attendait pas à"}]},
        "S0108L01C02": ("didn't expect to", "s'attendait pas à"),
        "S0108L01B01": ("we didn't expect to", "on s'attendait pas à")},
  note="""fra_ca_for_eng C0108 hope -> expect. espérait -> s'attendait à (Usito: s'attendre à = "prévoir, compter sur"), in the course's
colloquial frame (on, no ne): 'on s'attendait pas à'. L01 re-cut to 'we didn't expect to' = 'on s'attendait pas à' (à inside the LEGO,
so the seed still tiles); every L01 row keeps its frame. L02 / L03 rows that said 'didn't hope' follow.""")

S("ita_for_eng", seed=(e1, "non ci aspettavamo di svegliarci nel mezzo della notte"),
  ksubs=KH, tsubs=[("non speravamo di", "non ci aspettavamo di")],
  over={"S0108L01": {"lego": ("we didn't expect to wake up", "non ci aspettavamo di svegliarci"), "components": [{"known": "we didn't expect to wake up", "target": "non ci aspettavamo di svegliarci"}]}},
  note="""ita_for_eng C0108 hope -> expect. speravamo -> ci aspettavamo (Treccani: aspettarsi = "prevedere, ritenere probabile"; + di + infinito).
L01 keeps its live span and its live one-piece component shape: 'we didn't expect to wake up' = 'non ci aspettavamo di svegliarci';
every L01 row keeps its frame. L02: U03 (seed echo) rewritten, U01/U08 wake -> wake up; U05 'we hoped to see you' keeps its verb.""")

S("ron_for_eng", seed=(E1, "Nu ne așteptam să ne trezim în mijlocul nopții."),
  ksubs=KH, tsubs=[("nu am sperat să ne trezim", "nu ne așteptam să ne trezim")],
  note="""ron_for_eng C0108 hope -> expect. am sperat -> ne așteptam (DEX: a se aștepta = "a prevedea, a bănui"; imperfect is the natural
tense for 'we weren't expecting'). No hope LEGO in seed 108: the three rows that said 'didn't hope' follow (L01B02, L01U02, L02B03).
L01U03 'we hoped to see something' keeps its verb.""")

S("mlt_for_eng", seed=(E1, "Ma stennejniex li nqumu f'nofs il-lejl."),
  over={"S0108L01": {"lego": ("we wake up", None)},
        "S0108L01B02": ("we wake up now", None),
        "S0108L03": {"lego": ("we didn't expect", "ma stennejniex"), "components": [{"known": "not", "target": "ma"}, {"known": "we expected", "target": "stennejniex"}]},
        "S0108L03C02": ("we expected", "stennejniex"),
        "S0108L03B01": ("we didn't expect", "ma stennejniex"),
        "S0108L03B02": ("we didn't expect to wake up", "ma stennejniex li nqumu"),
        "S0108L03B03": ("we didn't expect it to be possible", "ma stennejniex li kien possibbli"),
        "S0108L03U01": ("we didn't expect to wake up in the middle of the night", "ma stennejniex li nqumu f'nofs il-lejl"),
        "S0108L03U02": ("we didn't expect this", "ma stennejniex dan"),
        "S0108L03U03": ("we didn't expect it to work", "ma stennejniex li jaħdem"),
        "S0108L03U04": ("i know we didn't expect this", "naf li ma stennejniex dan"),
        "S0108L03U05": ("unfortunately we didn't expect it to work", "sfortunatament ma stennejniex li jaħdem"),
        "S0108L03U06": ("we didn't expect it to be easy", "ma stennejniex li kien faċli")},
  note="""mlt_for_eng C0108 hope -> expect. ttamajna -> stennejna (Aquilina, Maltese-English Dictionary: stenna = to wait for, to expect;
'ma stennejniex li ...' = we didn't expect that ...). stenna takes li + clause, so the seed gains 'li' (already used in this basket:
'li kien possibbli'). L03 re-cut to 'we didn't expect' = 'ma stennejniex'; the two bare rows ('i know we didn't hope',
'unfortunately we didn't hope') take an object because expect needs one. L01: known 'we wake' -> 'we wake up' (English only), and
B02, which already said 'we wake up' for 'nqumu issa', now says 'we wake up now' (was one known -> two targets once L01 changes).""")

for c, t, n in [
 ("fur_for_eng", "no si spietavin di sveâsi tal mieç de gnot", "speravin -> si spietavin (Grant Dizionari Bilengâl Talian-Furlan, ARLeF: aspettarsi = spietâsi)"),
 ("lmo_for_eng", "se speciavom minga de dessedass in mezz a la nott", "speravom -> se speciavom (Cherubini, Vocabolario milanese-italiano: speccià = aspettare; reflexive speciass = aspettarsi, 1pl clitic se)"),
 ("nap_for_eng", "nun ce aspettàvemo 'e ce scetà mmiez'a notte", "speràvemo -> ce aspettàvemo (D'Ascoli, Nuovo vocabolario dialettale napoletano: aspettà; reflexive 1pl ce)"),
 ("rgn_for_eng", "a n s'aspitémi ad dasdês int e' mèẓ dla nòt", "sperémi -> s'aspitémi (Ercolani, Vocabolario romagnolo-italiano: aspitê = aspettare; reflexive aspitês, same -émi ending as the live verb)"),
 ("roh_for_eng", "nus n'avain betg spetgà d'ans dasdar amez la notg", "sperà -> spetgà (Pledari Grond: erwarten = spetgar)"),
 ("scn_for_eng", "nun n'aspittàvamu d'arruspigghiàrini nta lu menzu di la notti.", "spiràvamu -> n'aspittàvamu (Piccitto, Vocabolario Siciliano: aspittari; reflexive aspittàrisi, 1pl clitic ni)"),
 ("vec_for_eng", "no se spetàvimo de svejarse in mexo a ła note", "speràvimo -> se spetàvimo (Boerio, Dizionario del dialetto veneziano: spetar / aspetar; reflexive spetarse)"),
]:
    S(c, seed=(E1, t), note=f"{c} C0108 hope -> expect. {n}.\nOnly the verb changes; the rest of the live wording is kept. Seed-only draft: no LEGOs.")

S("eng_for_deu", seed=("Wir erwarteten nicht, mitten in der Nacht aufzuwachen.", E1),
  ksubs=[("hofften nicht", "erwarteten nicht"), ("hoffte ich nicht", "erwartete ich nicht"), ("hoffte nicht", "erwartete nicht")], tsubs=KH,
  skip=["S0108L01"],
  note="""eng_for_deu C0108 hope -> expect (English is the TARGET here). Known side: hofften -> erwarteten (Duden: erwarten = "mit etwas rechnen"),
preterite kept to match the course's live known wording. L02 re-cut to 'erwarteten nicht aufzuwachen' = 'didn't expect to wake up';
every L02 row keeps its frame. L03B02 (seed echo) follows.
HELD for the parent: L01 'wir hofften' = 'we hoped' is a not-new reference LEGO with no rows; it no longer matches the seed and is
left untouched (deleting a LEGO is structural).""")

S("eng_for_fra", seed=("Nous ne nous attendions pas à nous réveiller au milieu de la nuit.", E1),
  ksubs=[("nous n'espérions pas", "nous ne nous attendions pas à")], tsubs=KH,
  over={"S0108L01": {"lego": ("nous ne nous attendions pas à", "we didn't expect to"), "components": [{"known": "nous nous attendions", "target": "we expected"}, {"known": "pas", "target": "not"}]},
        "S0108L01C01": ("nous nous attendions", "we expected")},
  note="""eng_for_fra C0108 hope -> expect (English is the TARGET here). Known side: espérions -> nous attendions à (Larousse: s'attendre à).
L01 re-cut to 'nous ne nous attendions pas à' = 'we didn't expect to'; every L01 row keeps its frame. L02 / L03 rows that said
'didn't hope' follow. English already said 'wake up' everywhere except the seed.""")

S("eng_for_ita", seed=("Non ci aspettavamo di svegliarci nel mezzo della notte.", E1),
  ksubs=[("non speravamo di", "non ci aspettavamo di")], tsubs=KH,
  over={"S0108L01": {"lego": ("non ci aspettavamo di", "we didn't expect to"), "components": [{"known": "ci aspettavamo", "target": "expected"}, {"known": "non ci aspettavamo di", "target": "we didn't expect to"}]},
        "S0108L01C01": ("ci aspettavamo", "expected"),
        "S0108L02": {"lego": (None, "wake up in the middle of the night"), "components": [{"known": "svegliarci", "target": "wake up"}, {"known": "nel mezzo della notte", "target": "in the middle of the night"}]},
        "S0108L02C01": (None, "wake up")},
  note="""eng_for_ita C0108 hope -> expect (English is the TARGET here). Known side: speravamo -> ci aspettavamo (Treccani: aspettarsi).
L01 re-cut to 'non ci aspettavamo di' = 'we didn't expect to'; every L01 row keeps its frame. L02 English 'wake' -> 'wake up'
(LEGO, component and every row), which is the #701 fold-in on the target side.""")
