"""C0108 hope -> expect, eng_for_tel (cs #772 asia shard for parent #758). PLAN ONLY: nothing applied.
Known verb: లేవాలని ఆశించలేదు -> లేస్తామని ఊహించలేదు. The course's own prompt for "I wasn't expecting it" is దాన్ని ఊహించలేదు (S0112L02) and ఆశించు
stays for hope (S0107L01, S0149L02); Brown's Telugu-English: ఊహించు = to guess, suppose, expect. ఊహించలేదు takes a plain future clause, so the wish
form లేవాలని ("that we should get up") becomes లేస్తామని ("that we would get up"). The whole-chunk LEGO S0108L01 is re-cut and its rows follow.
Tuples are (known, target[, roman]); None = keep live."""
C = 'eng_for_tel'
PLAN = {
 'SEED': ('మేము అర్ధరాత్రి లేస్తామని ఊహించలేదు.', "We didn't expect to wake up in the middle of the night."),
 'S0108L01': {'lego': ('లేస్తామని ఊహించలేదు', "we didn't expect to wake up")},
 'S0108L01B01': ('లేస్తామని ఊహించలేదు ఇప్పుడు', "we didn't expect to wake up now"),
 'S0108L01B02': ('లేస్తామని ఊహించలేదు ఎవరితోనైనా', "we didn't expect to wake up with someone"),
 'S0108L01B03': ('సహాయం చేసినందుకు లేస్తామని ఊహించలేదు', "we didn't expect to wake up for helping"),
 'S0108L01U01': ('అర్ధరాత్రి లేస్తామని మేము ఊహించలేదు', "we didn't expect to wake up in the middle of the night"),
 'S0108L01U02': ('మేము లేస్తామని ఊహించలేదు', "we didn't expect to wake up"),
 'S0108L01U03': ('మేము లేస్తామని ఊహించలేదని నేను అనుకుంటాను', "I think that we didn't expect to wake up"),
 'S0108L01U04': ('ఈ ఉదయం మేము లేస్తామని ఊహించలేదు', "we didn't expect to wake up this morning"),
 'S0108L01U05': ('ఈ రోజు మేము లేస్తామని ఊహించలేదు', "we didn't expect to wake up today"),
}
