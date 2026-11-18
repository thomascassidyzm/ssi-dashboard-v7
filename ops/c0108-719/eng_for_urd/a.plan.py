"""C0108 hope -> expect, eng_for_urd (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: امید -> توقع. The course's own prompt for "wasn't expecting" is توقع (S0112L01) and امید stays for hope (S0107L03, seed 149);
Platts: توقع tawaqquʻ = expectation. Seed known rewritten as ہمیں … جاگنے کی توقع نہیں تھی (natural Urdu; live was the calque امید نہیں رکھتے تھے), and it
now says رات کے وسط میں like its own LEGO S0108L03 (live seed said درمیان میں, which that LEGO did not tile). The hope LEGO S0108L02 is re-cut
امید ہے -> توقع ہے = expect and every row rewritten; live build rows were verb-last calques (امید ہے دیکھنا) and are put right while open.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_urd'
PLAN = {
 'SEED': ('ہمیں رات کے وسط میں جاگنے کی توقع نہیں تھی۔', "We didn't expect to wake up in the middle of the night."),
 'S0108L01B02': ('رات کو جاگنا', 'wake up at night'),
 'S0108L01U01': ('میں رات کو جاگنا نہیں چاہتا', "I don't want to wake up at night"),
 'S0108L02': {'lego': ('توقع ہے', 'expect')},
 'S0108L02B01': ('دیکھنے کی توقع ہے', 'expect to see'),
 'S0108L02B02': ('سیکھنے کی توقع ہے', 'expect to learn'),
 'S0108L02B03': ('سننے کی توقع ہے', 'expect to hear'),
 'S0108L02U01': ('مجھے توقع ہے کہ آپ تیار ہیں', 'I expect that you are ready'),
 'S0108L02U02': ('ہمیں توقع نہیں کہ رات کو جاگیں گے', "we don't expect to wake up at night"),
 'S0108L02U03': ('مجھے توقع ہے کہ یہ کام کرے گا', 'I expect that it will work'),
 'S0108L02U04': ('کیا آپ کو اس کی توقع ہے؟', 'do you expect it?'),
 'S0108L02U05': ('مجھے توقع ہے کہ یہ زبان آسان ہے', 'I expect that this language is easy'),
 'S0108L03B02': ('رات کے وسط میں جاگنا', 'wake up in the middle of the night'),
 'S0108L03B04': ('رات کے وسط میں توقع ہے', 'expect in the middle of the night'),
 'S0108L03U01': ('ہمیں رات کے وسط میں جاگنے کی توقع نہیں تھی', "we didn't expect to wake up in the middle of the night"),
 'S0108L03U02': ('میں رات کے وسط میں نہیں جاگنا چاہتا', "I don't want to wake up in the middle of the night"),
 'S0108L03U03': ('رات کے وسط میں جاگنا مشکل ہے', "it's difficult to wake up in the middle of the night"),
 'S0108L03U05': ('کیا آپ رات کے وسط میں جاگتے ہیں؟', 'do you wake up in the middle of the night?'),
}
