# west shard (cs #770): new expect-LEGO baskets for courses where seed 108 had no hope LEGO. See mkb.py.
# Frames are taken from rows already live in each course's seed 108, so the vocabulary is course vocabulary; the validator confirms.
NEW = {}
NEW["dan_for_eng"] = {"lego": ("expected", "forventede"), "rows": [
 ("build", "expected", "forventede"),
 ("build", "I expected to learn", "jeg forventede at lære"),
 ("build", "he expected to work", "han forventede at arbejde"),
 ("build", "we didn't expect to wake up", "vi forventede ikke at vågne"),
 ("use", "she expected to hear something", "hun forventede at høre noget"),
 ("use", "he expected to work in the middle of the night", "han forventede at arbejde midt om natten"),
 ("use", "I didn't expect to learn in the middle of the night", "jeg forventede ikke at lære midt om natten"),
 ("use", "we didn't expect to wake up in the middle of the night", "vi forventede ikke at vågne midt om natten"),
]}
NEW["dan_for_eng"]["rows"].insert(7, ("use", "I didn't expect to wake up in the middle of the night", "jeg forventede ikke at vågne midt om natten"))
def N(c, lego, rows): NEW[c] = {"lego": lego, "rows": [("build", lego[0], lego[1])] + [(r, k, t) for r, k, t in rows]}
B, U = "build", "use"
N("afr_for_eng", ("expected", "verwag"), [
 (B, "I expected it", "Ek het dit verwag"), (B, "I didn't expect it", "Ek het dit nie verwag nie"), (B, "we didn't expect it", "Ons het dit nie verwag nie"),
 (U, "she didn't expect it", "Sy het dit nie verwag nie"),
 (U, "I didn't expect it in the middle of the week", "Ek het dit nie in die middel van die week verwag nie"),
 (U, "we didn't expect it in the middle of the night", "Ons het dit nie in die middel van die nag verwag nie"),
 (U, "why did you expect it", "Waarom het jy dit verwag"),
 (U, "we didn't expect to wake up in the middle of the night", "Ons het nie verwag om in die middel van die nag wakker te word nie")])
N("deu_at_for_eng", ("expected", "erwartet"), [
 (B, "we expected", "mir hobn erwartet"), (B, "we didn't expect", "mir hobn ned erwartet"), (B, "we expected to wake up", "mir hobn erwartet, dass ma aufwochen"),
 (U, "we expected to wake up in time", "mir hobn erwartet, dass ma rechtzeitig aufwochen"),
 (U, "we didn't expect to wake up", "mir hobn ned erwartet, dass ma aufwochen"),
 (U, "we didn't expect to wake up in the night", "mir hobn ned erwartet, dass ma in der Nocht aufwochen"),
 (U, "we expected to wake up in the middle of the night", "mir hobn erwartet, dass ma mitten in der Nocht aufwochen"),
 (U, "he didn't expect us to wake up in the middle of the night", "er hot ned erwartet, dass ma mitten in der Nocht aufwochen")])
N("deu_ch_for_eng", ("expected", "erwartet"), [
 (B, "we expected", "mir händ erwartet"), (B, "we didn't expect", "mir händ nöd erwartet"), (B, "she expected", "si hät erwartet"),
 (U, "we expected that the night would be good", "mir händ erwartet, dass d Nacht guet isch"),
 (U, "she didn't expect to wake up in the middle of the night", "si hät nöd erwartet, mitts i de Nacht ufzwache"),
 (U, "we expected that the night would be difficult", "mir händ erwartet, dass d Nacht schwierig isch"),
 (U, "she expected not to wake up in the middle of the night", "si hät erwartet, nöd mitts i de Nacht ufzwache"),
 (U, "we didn't expect that it's already night", "mir händ nöd erwartet, dass es scho Nacht isch")])
N("isl_for_eng", ("we didn't expect", "við bjuggumst ekki við"), [
 (B, "we didn't expect to wake up", "við bjuggumst ekki við að vakna"), (B, "we didn't expect to work", "við bjuggumst ekki við að vinna"), (B, "we didn't expect to try", "við bjuggumst ekki við að reyna"),
 (U, "we didn't expect to work in the middle of the night", "við bjuggumst ekki við að vinna um miðja nótt"),
 (U, "we didn't expect to try to wake up", "við bjuggumst ekki við að reyna að vakna"),
 (U, "we didn't expect to try to work in the middle of the night", "við bjuggumst ekki við að reyna að vinna um miðja nótt"),
 (U, "we didn't expect to try to wake up in the middle of the night", "við bjuggumst ekki við að reyna að vakna um miðja nótt"),
 (U, "we didn't expect to wake up in the middle of the night", "við bjuggumst ekki við að vakna um miðja nótt")])
N("nld_for_eng", ("we expected", "we verwachtten"), [
 (B, "we didn't expect", "we verwachtten niet"), (B, "we expected to start", "we verwachtten te beginnen"), (B, "we expected to wake up", "we verwachtten wakker te worden"),
 (U, "we didn't expect to start at night", "we verwachtten niet in de nacht te beginnen"),
 (U, "we expected to start in the middle of the day", "we verwachtten midden in de dag te beginnen"),
 (U, "we didn't expect to wake up in the night", "we verwachtten niet in de nacht wakker te worden"),
 (U, "we expected to wake up in the middle of the day", "we verwachtten midden in de dag wakker te worden"),
 (U, "we didn't expect to start in the middle of the night", "we verwachtten niet midden in de nacht te beginnen")])
N("nor_for_eng", ("expected", "forventet"), [
 (B, "I expected to wake up", "jeg forventet å våkne"), (B, "she expected to wake up in the night", "hun forventet å våkne på natten"), (B, "we didn't expect to wake up", "vi forventet ikke å våkne"),
 (U, "he expected to wake up in the night", "han forventet å våkne på natten"),
 (U, "I didn't expect to wake up in the middle of the night", "jeg forventet ikke å våkne midt på natten"),
 (U, "she didn't expect to wake up in the middle of the night", "hun forventet ikke å våkne midt på natten"),
 (U, "did you expect to wake up in the night?", "forventet du å våkne på natten?"),
 (U, "he didn't expect to wake up in the night", "han forventet ikke å våkne på natten")])
N("pdc_for_eng", ("expected", "erwaart"), [
 (B, "I expected", "ich hab erwaart"), (B, "we expected", "mir hen erwaart"), (B, "we didn't expect", "mir hen net erwaart"),
 (U, "I expected to speak", "ich hab erwaart fer schwetze"),
 (U, "we expected to wake up", "mir hen erwaart fer uffwache"),
 (U, "I expected to speak in the middle of the night", "ich hab erwaart fer schwetze in der Mitt vun der Nacht"),
 (U, "we expected to wake up in the middle of the night", "mir hen erwaart fer uffwache in der Mitt vun der Nacht"),
 (U, "we didn't expect to speak in the middle of the night", "mir hen net erwaart fer schwetze in der Mitt vun der Nacht")])
N("swe_for_eng", ("we expected", "vi förväntade oss"), [
 (B, "we didn't expect", "vi förväntade oss inte"), (B, "we expected to wake up", "vi förväntade oss att vakna"), (B, "we expected to do it", "vi förväntade oss att göra det"),
 (U, "we didn't expect to do it in the middle of the night", "vi förväntade oss inte att göra det mitt i natten"),
 (U, "we expected to wake up in the middle of the day", "vi förväntade oss att vakna mitt i dagen"),
 (U, "we didn't expect to wake up in the middle of it", "vi förväntade oss inte att vakna mitt i det"),
 (U, "we expected to do it in the middle of the day", "vi förväntade oss att göra det mitt i dagen"),
 (U, "we didn't expect to do it", "vi förväntade oss inte att göra det")])
N("ron_for_eng", ("we expected", "ne așteptam"), [
 (B, "we didn't expect", "nu ne așteptam"), (B, "we expected to wake up", "ne așteptam să ne trezim"), (B, "we expected to see something", "ne așteptam să vedem ceva"),
 (U, "we didn't expect to work in the middle of the night", "nu ne așteptam să muncim în mijlocul nopții"),
 (U, "we expected to work hard", "ne așteptam să muncim mult"),
 (U, "that is why we expected to see something", "de aceea ne așteptam să vedem ceva"),
 (U, "we didn't expect to see what we're doing", "nu ne așteptam să vedem ce facem"),
 (U, "we expected to wake up and work hard", "ne așteptam să ne trezim și să muncim mult")])
