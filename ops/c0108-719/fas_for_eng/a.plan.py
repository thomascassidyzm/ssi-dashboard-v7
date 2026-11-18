# fas_for_eng C0108 hope -> expect (cs #771 shard east). Colloquial Tehrani register as live (بیدار شیم, می‌دیم).
# Verb: امیدوار نبودیم (we weren't hopeful) -> انتظار نداشتیم (we didn't expect, lit. "we didn't have expectation"), the standard everyday form.
# Source: Aryanpur Persian-English, انتظار داشتن "to expect"; Wiktionary انتظار داشتن "to expect".
# The seed's old hope chunk was 'امیدوار' (earlier seed) + L01 'we weren't' = نبودیم. نبودیم is no longer in the seed, so L01 is re-cut to the
# short expect chunk 'we didn't expect' = انتظار نداشتیم (A -> M: انتظار + نداشتیم) and its 7 rows rewritten to practise it.
# Knock-on: 7 rows in L02-L04 used نبودیم, which seed 108 no longer teaches (validator: vocab violations) — rewritten with the new chunk too.
C = "fas_for_eng"
PLAN = {
 "SEED": ("We didn't expect to wake up in the middle of the night.", "انتظار نداشتیم وسط شب بیدار شیم.", "entezâr nadâshtim vasat-e shab bidâr shim."),
 "S0108L01": {"lego": ("we didn't expect", "انتظار نداشتیم"), "type": "M", "components": [{"known": "expectation", "target": "انتظار"}, {"known": "we didn't have", "target": "نداشتیم"}], "roman": "entezâr nadâshtim"},
 "S0108L01B01": ("we didn't expect to try", "انتظار نداشتیم امتحان کنیم", "entezâr nadâshtim emtehân konim"),
 "S0108L01B02": ("we didn't expect to work hard", "انتظار نداشتیم سخت کار کنیم", "entezâr nadâshtim sakht kâr konim"),
 "S0108L01U01": ("we didn't expect to be ready", "انتظار نداشتیم آماده باشیم", "entezâr nadâshtim âmâde bâshim"),
 "S0108L01U02": ("we didn't expect to be sure", "انتظار نداشتیم مطمئن باشیم", "entezâr nadâshtim motma'en bâshim"),
 "S0108L01U03": ("we didn't expect to be ready for this", "انتظار نداشتیم برای این آماده باشیم", "entezâr nadâshtim barâ-ye in âmâde bâshim"),
 "S0108L01U04": ("we didn't expect to be sure what to do", "انتظار نداشتیم مطمئن باشیم چیکار کنیم", "entezâr nadâshtim motma'en bâshim chikâr konim"),
 "S0108L01U05": ("we didn't expect to be hopeful", "انتظار نداشتیم امیدوار باشیم", "entezâr nadâshtim omidvâr bâshim"),
 "S0108L02U01": ("we didn't expect to be ready in the middle", "انتظار نداشتیم وسط آماده باشیم", "entezâr nadâshtim vasat âmâde bâshim"),
 "S0108L02U02": ("we didn't expect to be in the middle", "انتظار نداشتیم وسط باشیم", "entezâr nadâshtim vasat bâshim"),
 "S0108L02U04": ("we didn't expect to work in the middle", "انتظار نداشتیم وسط کار کنیم", "entezâr nadâshtim vasat kâr konim"),
 "S0108L03U01": ("we didn't expect to be ready that night", "انتظار نداشتیم اون شب آماده باشیم", "entezâr nadâshtim un shab âmâde bâshim"),
 "S0108L03U02": ("we didn't expect to work at night", "انتظار نداشتیم شب کار کنیم", "entezâr nadâshtim shab kâr konim"),
 "S0108L03U05": ("we didn't expect to work hard in the middle of the night", "انتظار نداشتیم وسط شب سخت کار کنیم", "entezâr nadâshtim vasat-e shab sakht kâr konim"),
 "S0108L04U02": ("we didn't expect to wake up at night", "انتظار نداشتیم شب بیدار شیم", "entezâr nadâshtim shab bidâr shim"),
 "S0108L04U01": ("we didn't expect to wake up in the middle of the night", "انتظار نداشتیم وسط شب بیدار شیم", "entezâr nadâshtim vasat-e shab bidâr shim"),
 "S0108L04U03": ("we didn't expect to wake up ready", "انتظار نداشتیم آماده بیدار شیم", "entezâr nadâshtim âmâde bidâr shim"),
}
