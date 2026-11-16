import re
V='aeiouáéíóú'
def syl(t):
    return len(re.findall('['+V+']+',t.lower()))
