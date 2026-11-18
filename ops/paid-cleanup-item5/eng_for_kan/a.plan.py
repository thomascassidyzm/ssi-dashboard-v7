# eng_for_kan item 5 (cs #701·AI). S0578L02 "that is more warm" → "warmer" (the seed says "somewhere warmer"): the LEGO
# becomes one chunk (type A), S0578L03's component follows, and every row under it says "warmer".
C = "eng_for_kan"
PLAN = {
 "S0034L03B02": (None, "he doesn't want to speak"),  # "talk" is untaught here (validator)
 "S0049L02B03": (None, "this morning it's like this"),
 "S0049L02U04": (None, "this evening it's like this"),
 "S0067L01B04": ("ಇವತ್ತು ನಿಮಗೆ ನಿಲ್ಲಿಸಬೇಕು?", "do you want to stop today?"),
 "S0081L01B03": ("ನಾಳೆ ನಿಮಗೆ ಶುರು ಮಾಡಬೇಕು?", "do you want to start tomorrow?"),  # "today" is already a row here
 "S0578L02": {"lego": (None, "warmer"), "components": None},
 "S0578L03": {"lego": (None, "somewhere warmer"), "components": [{"known": "ಎಲ್ಲಾದರೂ", "target": "somewhere"}, {"known": "ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ", "target": "warmer"}]},
 "S0578L02B01": (None, "warmer"),
 "S0578L02B02": (None, "a warmer church"),
 "S0578L02B03": (None, "she wants a warmer church"),
 "S0578L02U01": (None, "the warmer church is here"),
 "S0578L02U02": (None, "I like the warmer church"),
 "S0578L02U03": (None, "I want a warmer church"),
 "S0578L02U04": (None, "where is the warmer church?"),
 "S0636L01B02": ("ಈಗ, ಅದು ಜೇನ್‌ಳ ಚೀಲ ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ", "now I think that that is Jane's bag"),
}
