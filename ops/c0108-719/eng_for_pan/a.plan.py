"""C0108 hope -> expect, eng_for_pan (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known side KEPT. ਉਮੀਦ is the course's own prompt for "wasn't expecting" (ਉਮੀਦ ਨਹੀਂ ਸੀ, S0112L02); Punjabi University Punjabi-English
Dictionary: ਉਮੀਦ = hope, expectation. Only the English target changes: LEGO S0108L02 -> "we didn't expect" (component ਉਮੀਦ = expect; its known
string differs from S0107L03 and S0112L02, so no prompt clash), wake LEGO S0108L01 -> "wake up", rows follow.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_pan'
PLAN = {
 'SEED': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਸੀ ਕਿ ਅਸੀਂ ਅੱਧੀ ਰਾਤ ਨੂੰ ਜਾਗਾਂਗੇ।', "We didn't expect to wake up in the middle of the night."),
 'S0108L01': {'lego': ('ਜਾਗਣ', 'wake up')},
 'S0108L01B01': ('ਜਾਗਣ', 'wake up'),
 'S0108L01B02': ('ਅੱਜ ਜਾਗਣ', 'wake up today'),
 'S0108L01B03': ('ਜਲਦੀ ਜਾਗਣ', 'wake up quickly'),
 'S0108L01U01': ('ਮੈਂ ਜਾਗਣ ਨਹੀਂ ਚਾਹੁੰਦਾ', "I don't want to wake up"),
 'S0108L01U02': ('ਮੈਂ ਹੁਣ ਜਾਗਣ ਲਈ ਤਿਆਰ ਹਾਂ', "I'm ready to wake up now"),
 'S0108L01U03': ('ਮੈਂ ਅੱਜ ਜਾਗਣ ਨਹੀਂ ਚਾਹੁੰਦਾ', "I don't want to wake up today"),
 'S0108L01U04': ('ਮੈਂ ਜਾਗਣ ਕੋਸ਼ਿਸ਼ ਕਰ ਰਿਹਾ ਹਾਂ', "I'm trying to wake up"),
 'S0108L01U05': ('ਮੈਂ ਇਸ ਤਰੀਕੇ ਨਾਲ ਜਾਗਣ ਚਾਹੁੰਦਾ ਹਾਂ', 'I want to wake up this way'),
 'S0108L02': {'lego': ('ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ', "we didn't expect"), 'components': [{'known': 'ਉਮੀਦ', 'target': 'expect'}, {'known': 'ਨਹੀਂ ਕੀਤੀ', 'target': "didn't"}]},
 'S0108L02B01': ('ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ', "we didn't expect"),
 'S0108L02B02': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਅੱਜ', "we didn't expect today"),
 'S0108L02B03': ('ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਦੇਖਣਾ', "we didn't expect to see"),
 'S0108L02C01': ('ਉਮੀਦ', 'expect'),
 'S0108L02U01': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਜਾਗਣ', "we didn't expect to wake up"),
 'S0108L02U02': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਦੇਖਣਾ ਕਿ ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਸੀ', "we didn't expect to see what you were doing"),
 'S0108L02U03': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਬਦਲਣ ਦੀ', "we didn't expect to change"),
 'S0108L02U04': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਅੱਜ ਦੇਖਣਾ', "we didn't expect to see today"),
 'S0108L03B02': ('ਜਾਗਣ ਅੱਧੀ ਰਾਤ ਨੂੰ', 'wake up in the middle of the night'),
 'S0108L03U01': ('ਮੈਂ ਅੱਧੀ ਰਾਤ ਨੂੰ ਜਾਗਣ ਨਹੀਂ ਚਾਹੁੰਦਾ', "I don't want to wake up in the middle of the night"),
 'S0108L03U02': ('ਅਸੀਂ ਉਮੀਦ ਨਹੀਂ ਕੀਤੀ ਜਾਗਣ ਅੱਧੀ ਰਾਤ ਨੂੰ', "we didn't expect to wake up in the middle of the night"),
 'S0108L03U03': ('ਅੱਧੀ ਰਾਤ ਨੂੰ ਜਾਗਣ ਔਖਾ ਹੈ', "it's difficult to wake up in the middle of the night"),
}
