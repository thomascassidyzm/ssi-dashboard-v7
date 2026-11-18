"""C0108 hope -> expect, eng_for_guj (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: આશા નહોતી રાખી -> અપેક્ષા નહોતી રાખી. The course's own seed 112 prompts "I wasn't expecting it" with મને આની અપેક્ષા નહોતી
(S0112L03) and keeps આશા for hope (S0107L02, S0149L02); Gujarati Lexicon: અપેક્ષા = expectation; અપેક્ષા રાખવી = to expect. અપેક્ષા is
feminine like આશા, so ઊઠવાની / નહોતી રાખી agree unchanged. LEGO S0108L03 re-cut (component "didn't expect to"); wake LEGO S0108L01 -> "wake up".
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_guj'
PLAN = {
 'SEED': ('અમે રાત્રે વચ્ચે ઊઠવાની અપેક્ષા નહોતી રાખી.', "We didn't expect to wake up in the middle of the night."),
 'S0108L01': {'lego': ('ઊઠવા', 'wake up')},
 'S0108L01B01': ('ઊઠવા', 'wake up'),
 'S0108L01B02': ('હું ઊઠવા માગું છું', 'I want to wake up'),
 'S0108L01B03': ('હું ઊઠવા જઈ રહ્યો છું', "I'm going to wake up"),
 'S0108L01U01': ('હું ઊઠવા માગતો નથી', "I don't want to wake up"),
 'S0108L01U02': ('હું ઊઠવાની કોશિશ કરી રહ્યો છું', "I'm trying to wake up"),
 'S0108L01U03': ('તમે ક્યારે ઊઠવા માગો છો?', 'when do you want to wake up?'),
 'S0108L01U04': ('એ ઊઠવા માગતો ન’તો', "he didn't want to wake up"),
 'S0108L01U05': ('હું ઊઠવા લાગ્યો', 'I started to wake up'),
 'S0108L02B02': ('હું રાત્રે વચ્ચે ઊઠવા માગું છું', 'I want to wake up in the middle of the night'),
 'S0108L02B03': ('હું રાત્રે વચ્ચે ઊઠવાની કોશિશ કરી રહ્યો છું', "I'm trying to wake up in the middle of the night"),
 'S0108L02U01': ('હું રાત્રે વચ્ચે ઊઠવા માગતો નથી', "I don't want to wake up in the middle of the night"),
 'S0108L02U02': ('એ રાત્રે વચ્ચે ઊઠવા માગતો ન’તો', "he didn't want to wake up in the middle of the night"),
 'S0108L02U03': ('અમે રાત્રે વચ્ચે ઊઠવા માગતા નથી', "we don't want to wake up in the middle of the night"),
 'S0108L02U04': ('એ રાત્રે વચ્ચે ઊઠવા માગતી ન’તી', "she didn't want to wake up in the middle of the night"),
 'S0108L02U05': ('તમે રાત્રે વચ્ચે ઊઠવા માગો છો?', 'do you want to wake up in the middle of the night?'),
 'S0108L03': {'lego': ('અમે અપેક્ષા નહોતી રાખી', "we didn't expect to"), 'components': [{'known': 'અમે', 'target': 'we'}, {'known': 'અપેક્ષા નહોતી રાખી', 'target': "didn't expect to"}]},
 'S0108L03B01': ('અમે અપેક્ષા નહોતી રાખી', "we didn't expect to"),
 'S0108L03B02': ('અમે ઊઠવાની અપેક્ષા નહોતી રાખી', "we didn't expect to wake up"),
 'S0108L03B03': ('અમે બોલવાની અપેક્ષા નહોતી રાખી', "we didn't expect to speak"),
 'S0108L03C02': ('અપેક્ષા નહોતી રાખી', "didn't expect to"),
 'S0108L03U01': ('અમે રાત્રે વચ્ચે ઊઠવાની અપેક્ષા નહોતી રાખી', "we didn't expect to wake up in the middle of the night"),
 'S0108L03U02': ('અમે અંગ્રેજી બોલવાની અપેક્ષા નહોતી રાખી', "we didn't expect to speak English"),
 'S0108L03U03': ('અમે આ શીખવાની અપેક્ષા નહોતી રાખી', "we didn't expect to learn this"),
 'S0108L03U04': ('અમે બોલવાની પ્રેક્ટિસ કરવાની અપેક્ષા નહોતી રાખી', "we didn't expect to practise speaking"),
 'S0108L03U05': ('અમે જવાબ શોધવાની અપેક્ષા નહોતી રાખી', "we didn't expect to find the answer"),
}
