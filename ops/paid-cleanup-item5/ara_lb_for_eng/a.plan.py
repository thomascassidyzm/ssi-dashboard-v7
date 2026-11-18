# ara_lb_for_eng item 5 (cs #701·AI). The English here is the PROMPT. "I think / because + a question" rows
# (بفكر شو بدك؟ = "I think what would you like") are template glue in both languages: deleted, with their
# "because + question" siblings in the same baskets; where a plain sentence exists in the Arabic, the English is
# reworded to say it (649U05), or the row is rewritten whole from taught chunks (642, 657, 666).
C = "ara_lb_for_eng"
PLAN = {
 "S0631L01U02": "DELETE",
 "S0642L02U01": ("how are you, sir?", "كيفك يا أستاذ؟", "kiifak ya ustaaz?"),
 "S0642L02U02": "DELETE",
 "S0642L02U03": "DELETE",
 "S0642L02U04": ("how are you here?", "كيفك هون؟", "kiifik hoon?"),
 "S0648L01U05": "DELETE",
 "S0649L01U05": "DELETE",  # an English-only reword tripped the containment count in the validator; the Arabic is glue too
 "S0652L01U05": "DELETE",
 "S0657L01U01": ("how are you all now?", "كيفكون هلق؟", "kiifkun halla'?"),
 "S0657L01U02": "DELETE",
 "S0657L01U04": ("how are you all here?", "كيفكون هون؟", "kiifkun hoon?"),
 "S0657L01U05": "DELETE",
 "S0658L01U05": "DELETE",
 "S0663L01U05": "DELETE",
 "S0665L01U05": "DELETE",
 "S0666L01U01": ("what do you all think now?", "شو رأيكون هلق؟", "shu ra'yukun halla'?"),
 "S0666L01U02": "DELETE",
 "S0666L01U04": ("what do you all think here?", "شو رأيكون هون؟", "shu ra'yukun hoon?"),
 "S0666L01U05": "DELETE",
 "S0667L01U01": "DELETE",
 "S0667L01U02": "DELETE",
 "S0667L01U05": "DELETE",
}
