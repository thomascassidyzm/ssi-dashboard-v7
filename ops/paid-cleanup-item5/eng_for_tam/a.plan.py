# eng_for_tam item 5 (cs #701·AI). Past tense: "learned/spoke/met" are untaught, so past rows use the taught
# "I wanted to" (S0030L03 கேட்க விரும்பினேன்), "you wanted to" (S0031L02), "I started to" (S0037L05),
# "I was starting to feel better" (S0042L03). "an" is untaught at seed 51, so "a interesting" rows are reworded.
C = "eng_for_tam"
PLAN = {
 # he / she + bare verb
 "S0016L01B01": ("அவர் இங்கே கற்க விரும்புகிறார்", "he wants to learn here"),
 "S0016L01B02": ("அவர் நாளை பேச விரும்புகிறார்", "he wants to speak tomorrow"),
 "S0016L01B03": ("அவர் என்னுடன் சந்திக்க விரும்புகிறார்", "he wants to meet with me"),
 "S0017L01B03": ("அவள் இன்று பேச விரும்புகிறாள்", "she wants to speak today"),
 "S0017L01B04": ("அவள் என்னுடன் சந்திக்க விரும்புகிறாள்", "she wants to meet with me"),
 # last month (basket rebuilt)
 "S0037L02B01": ("நான் கடந்த மாதம் கற்க விரும்பினேன்", "I wanted to learn last month"),
 "S0037L02B02": ("நீங்கள் கடந்த மாதம் பேச விரும்பினீர்கள்", "you wanted to speak last month"),
 "S0037L02B03": ("நான் கடந்த மாதம் மக்களைச் சந்திக்க விரும்பினேன்", "I wanted to meet people last month"),
 "S0037L02U01": ("நான் கடந்த மாதம் ஆங்கிலம் கற்க விரும்பினேன்", "I wanted to learn English last month"),
 "S0037L02U02": ("நான் கடந்த மாதம் அதிகமாக பயிற்சி செய்ய விரும்பினேன்", "I wanted to practise more last month"),
 "S0037L02U03": ("நான் கடந்த மாதம் கவனமாக கற்க விரும்பினேன்", "I wanted to learn carefully last month"),
 "S0037L02U04": ("நான் கடந்த மாதம் உங்களிடம் ஏதாவது கேட்க விரும்பினேன்", "I wanted to ask you something last month"),
 "S0037L02U05": ("நீங்கள் கடந்த மாதம் ஆங்கிலம் பேச விரும்பினீர்கள்", "you wanted to speak English last month"),
 "S0037L03U04": ("நான் அதைப் பற்றி ஏதாவது சொல்ல விரும்புகிறேன்", "I want to say something about it"),
 "S0037L03U05": ("நான் கடந்த மாதம் அதைப் பற்றி கற்க விரும்பினேன்", "I wanted to learn about it last month"),
 # for about a week (ஒரு வாரமாக = for the past week, so it goes with "I've been learning")
 "S0038L02B03": ("இப்போது சுமாரக ஒரு வாரமாக", "for about a week now"),
 "S0038L02U01": ("நான் சுமாரக ஒரு வாரமாக ஆங்கிலம் கற்றுவருகிறேன்", "I've been learning English for about a week"),
 "S0038L02U02": ("நான் சுமாரக ஒரு வாரமாக உங்களுடன் கற்றுவருகிறேன்", "I've been learning with you for about a week"),
 "S0038L02U03": ("நான் சுமாரக ஒரு வாரமாக ஆங்கிலம் பேசக் கற்றுவருகிறேன்", "I've been learning to speak English for about a week"),
 "S0038L02U04": ("நான் சுமாரக ஒரு வாரமாக கொஞ்சம் ஆங்கிலம் கற்றுவருகிறேன்", "I've been learning a little English for about a week"),
 "S0038L02U05": ("நான் சுமாரக ஒரு வாரமாக ஆங்கிலம் எப்படி பேசுவது என்று கற்றுவருகிறேன்", "I've been learning how to speak English for about a week"),
 "S0038L03B02": ("கொஞ்சம் கற்றுவருகிறேன்", "I've been learning a little"),
 "S0038L03U06": ("நான் கவனமாக ஆங்கிலம் கற்றுவருகிறேன்", "I've been learning English carefully"),
 # how do you feel
 "S0040L03U03": ("அதைப் பற்றி நீங்கள் எப்படி உணர்கிறீர்கள்?", "how do you feel about it?"),
 # enjoy
 "S0051L04B01": ("நான் கற்பதை ரசிக்கிறேன்", "I enjoy learning"),
 "S0051L04B02": ("நான் பேசுவதை ரசிக்கிறேன்", "I enjoy speaking"),
 "S0051L04B03": ("நான் பேசிக்கொண்டிருப்பதை ரசிக்கிறேன்", "I enjoy talking"),
 "S0051L04U02": ("நான் சுவாரஸ்யமான மக்களுடன் ஆங்கிலம் பேசுவதை ரசிக்கிறேன்", "I enjoy speaking English with interesting people"),
 "S0051L04U03": ("நான் ஆங்கிலம் கற்பதை ரசிக்கிறேன்", "I enjoy learning English"),
 "S0051L04U04": ("நான் உங்களுடன் ஆங்கிலம் பேசுவதை ரசிக்கிறேன்", "I enjoy speaking English with you"),
 "S0051L04U05": ("நான் என்னுடைய நண்பர்களுடன் கற்பதை ரசிக்கிறேன்", "I enjoy learning with my friends"),
 # last week (basket rebuilt)
 "S0052L01B01": ("நான் கடந்த வாரம் கற்க விரும்பினேன்", "I wanted to learn last week"),
 "S0052L01B02": ("நீங்கள் கடந்த வாரம் பேச விரும்பினீர்கள்", "you wanted to speak last week"),
 "S0052L01B03": ("நான் கடந்த வாரம் என்னுடைய நண்பர்களைச் சந்திக்க விரும்பினேன்", "I wanted to meet my friends last week"),
 "S0052L01U01": ("நான் கடந்த வாரம் ஆங்கிலம் கற்க விரும்பினேன்", "I wanted to learn English last week"),
 "S0052L01U02": ("நான் கடந்த வாரம் என்னுடைய நண்பர்களுடன் பேச விரும்பினேன்", "I wanted to speak with my friends last week"),
 "S0052L01U03": ("நான் கடந்த வாரம் பயிற்சி செய்யத் தொடங்கினேன்", "I started to practise last week"),
 "S0052L01U04": ("கடந்த வாரம் நான் நன்றாக உணரத் தொடங்கினேன்", "I was starting to feel better last week"),
 "S0052L01U05": ("நான் கடந்த வாரம் ஆங்கிலம் கற்கத் தொடங்கினேன்", "I started to learn English last week"),
 # like someone I used to know
 "S0128L03B03": ("நான் முன்பு அறிந்த யாரோ கொஞ்சம் போல", "a little like someone I used to know"),
 "S0128L03U01": ("நான் முன்பு அறிந்த யாரோ போல நீங்கள் இருக்கிறீர்கள்", "you're like someone I used to know"),
 "S0128L03U02": ("நான் முன்பு அறிந்த யாரோ கொஞ்சம் போல நீங்கள் இருக்கிறீர்கள்", "you're a little like someone I used to know"),
 "S0128L03U03": ("ஏனென்றால் நான் முன்பு அறிந்த யாரோ போல நீங்கள் இருக்கிறீர்கள்", "because you're like someone I used to know"),
 "S0128L03U04": ("நான் முன்பு அறிந்த யாரோ போல நீங்கள் இருக்கிறீர்கள் என்று நான் நினைக்கிறேன்", "I think you're like someone I used to know"),
 "S0128L03U05": ("நான் முன்பு நன்றாக அறிந்த யாரோ போல நீங்கள் இருக்கிறீர்கள்", "you're like someone I used to know very well"),
 # that's very kind of you and I'm — apostrophes (LEGO + components + rows)
 "S0142L05": {"lego": (None, "that's very kind of you and I'm"), "components": [{"known": "கருணையான", "target": "kind"}, {"known": "இது", "target": "that's"}, {"known": "மிகவும்", "target": "very"}, {"known": "இதன்", "target": "of"}, {"known": "நீங்கள்", "target": "you"}, {"known": "மற்றும்", "target": "and"}, {"known": "நான்", "target": "I'm"}]},
 "S0142L05B01": (None, "that's very kind of you and I'm"),
 "S0142L05U01": (None, "that's very kind of you and I'm grateful"),
 "S0142L05U02": ("நான் நினைக்கிறேன் இது மிகவும் கருணையானது நீங்கள் மற்றும் நான் நன்றியுள்ளவன்", "I think that's very kind of you and I'm grateful"),
 "S0142L05U03": (None, "today that's very kind of you and I'm grateful"),
 "S0142L05U05": (None, "that's very kind of you and I'm grateful to you for helping"),
}
