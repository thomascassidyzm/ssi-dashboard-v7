/**
 * VOICELAB · AUDITION PARAGRAPHS — one fixed text per language, as data.
 *
 * ── WHY ONE FIXED PARAGRAPH AND NOT A TYPED SENTENCE ────────────────────────
 * The audition answers exactly one question: "what does THIS voice sound like
 * speaking THAT language?" Two voices judged on two different sentences are not
 * being compared — one of them got the lucky line. So the text is a constant of
 * the language, held here, and the only thing that varies between two auditions
 * of the same language is the voice. That is what makes the comparison mean
 * something, and it is what makes the cache in audition.cjs possible at all: a
 * fixed text is a cache key.
 *
 * ── WHY A DIALECT IS ITS OWN ENTRY ──────────────────────────────────────────
 * Tom's standing rule: dialect is a language on this estate. `deu_at_for_eng`,
 * `spa_mx_for_eng` and `por_br_for_eng` are courses in their own right, not
 * flavours of a parent, and an Austrian voice auditioned on Berlin German has
 * been asked the wrong question. So each dialect carries its OWN paragraph,
 * written with that dialect's own vocabulary and idiom — heuer and Sackerl and
 * the Greißler for Austria, ahorita and platicando and ¿te late? for Mexico —
 * and never inherits its parent's.
 *
 * HONEST ABOUT WHAT THE STEER CAN AND CANNOT DO: the provider is handed a
 * BCP-47 locale, and for most dialects that locale is the parent's (Cartesia
 * takes `de`, not `de-AT`). So the dialect lives in the TEXT, not in a provider
 * setting, and the screen says so rather than implying the vendor is doing
 * something it is not. What you are hearing is this voice reading Austrian
 * German — which is the honest form of the question anyway, because it is what
 * a learner of that course would hear.
 *
 * ── AN EMPTY SLOT IS A FINDING, NOT A BUG ───────────────────────────────────
 * `text: null` means nobody has written a paragraph good enough for that
 * language yet. It renders as "not yet available" with the reason, and the
 * button will not arm. Guessing a paragraph badly in a language nobody here can
 * check would be worse than the gap: it would put a wrong-sounding audition in
 * front of a casting decision and call it evidence.
 *
 * ── VERSION ─────────────────────────────────────────────────────────────────
 * `version` is part of the cache key. Change the text, bump the version, and
 * every cached clip for that language falls out of the cache on its own — no
 * invalidation call, no stale audio quietly outliving the words it says.
 */

/**
 * Each entry:
 *   code       the estate's language key — parent ISO 639-3, or `<parent>_<region>`
 *              for a dialect, matching the course-code convention (deu_at, spa_mx)
 *   name       what a human calls it
 *   dialectOf  the parent code, or null for a parent language
 *   steer      what params.findLanguage() resolves against, so the render path
 *              gets the locale it already knows how to send
 *   version    bump when the text changes
 *   text       the paragraph, or null with a `gap` line saying why
 */
const PARAGRAPHS = [
  // ── Germanic ──────────────────────────────────────────────────────────────
  {
    code: 'eng', name: 'English', dialectOf: null, steer: 'eng', version: 1,
    text: "It's funny how quickly a morning gets away from you. I meant to sit down with a coffee and read for half an hour, and here I am, three phone calls later, still in yesterday's shirt. Never mind. The garden needs doing anyway, and the weather looks like it might hold until the afternoon.",
  },
  {
    code: 'deu', name: 'German', dialectOf: null, steer: 'deu', version: 1,
    text: 'Es ist schon komisch, wie schnell so ein Morgen vergeht. Ich wollte mich eigentlich mit einem Kaffee hinsetzen und eine halbe Stunde lesen, und jetzt sind drei Telefonate um und ich stecke immer noch im Hemd von gestern. Auch egal. Der Garten muss sowieso gemacht werden, und das Wetter hält wohl bis zum Nachmittag.',
  },
  {
    code: 'deu_at', name: 'Austrian German', dialectOf: 'deu', steer: 'deu', version: 1,
    text: 'Heuer war der Jänner wirklich mild — am Sonntag sind wir noch ohne Haube spazieren gegangen. Danach haben wir uns ins Kaffeehaus gesetzt, ich hab mir eine Melange bestellt, und meine Schwester hat noch schnell ein Sackerl Erdäpfel geholt. So ein Nachmittag ist mir lieber als jeder Urlaub.',
  },
  {
    code: 'deu_ch', name: 'Swiss German', dialectOf: 'deu', steer: 'deu', version: 1,
    text: 'Am Samstag bin ich mit dem Velo an den See gefahren, was um diese Jahreszeit fast schon zu warm ist. Unterwegs habe ich beim Bäcker angehalten und ein Znüni gekauft, und danach bin ich dem Trottoir entlang bis zur Fähre spaziert. Parkieren muss man dort zum Glück nicht — das ist der halbe Grund, warum ich das Velo nehme.',
  },
  {
    code: 'nld', name: 'Dutch', dialectOf: null, steer: 'nld', version: 1,
    text: 'Het is grappig hoe snel een ochtend voorbij is. Ik wilde eigenlijk met een kop koffie gaan zitten en een half uur lezen, en nu, drie telefoontjes later, loop ik nog steeds in het overhemd van gisteren. Ach ja. De tuin moet toch gedaan worden, en het weer lijkt het tot vanmiddag wel te houden.',
  },

  // ── Romance ───────────────────────────────────────────────────────────────
  {
    code: 'fra', name: 'French', dialectOf: null, steer: 'fra', version: 1,
    text: "C'est fou comme une matinée peut filer. Je comptais m'asseoir tranquillement avec un café et lire pendant une demi-heure, et voilà, trois coups de fil plus tard, je porte encore la chemise d'hier. Tant pis. De toute façon il faut s'occuper du jardin, et on dirait que le temps va tenir jusqu'à cet après-midi.",
  },
  {
    code: 'fra_ca', name: 'Canadian French', dialectOf: 'fra', steer: 'fra', version: 1,
    text: "Il a mouillé toute la fin de semaine, ça fait qu'on est restés en dedans à jouer aux cartes. Ce matin, par exemple, le soleil est enfin sorti, alors j'ai déjeuné sur le balcon avec un café pis le journal. Si ça continue de même, on va aller faire un tour au chalet avant que la neige reprenne.",
  },
  {
    code: 'spa', name: 'Spanish', dialectOf: null, steer: 'spa', version: 1,
    text: 'Es curioso lo rápido que se te escapa una mañana. Pensaba sentarme con un café y leer media hora, y aquí estoy, tres llamadas después, todavía con la camisa de ayer. Da igual. De todas formas hay que hacer algo con el jardín, y parece que el tiempo va a aguantar hasta la tarde. Ya os contaré cómo acaba.',
  },
  {
    code: 'spa_mx', name: 'Mexican Spanish', dialectOf: 'spa', steer: 'spa', version: 1,
    text: 'Ahorita salgo, nada más termino de lavar los trastes. Ayer nos quedamos platicando hasta bien tarde y hoy amanecí con flojera, la verdad. ¿Te late si nos vemos en la esquina como a las seis y de ahí nos vamos caminando? Yo llevo algo para picar, tú nomás llega.',
  },
  {
    code: 'ita', name: 'Italian', dialectOf: null, steer: 'ita', version: 1,
    text: "È incredibile come se ne vada in fretta una mattinata. Volevo sedermi con un caffè e leggere per una mezz'ora, e invece eccomi qui, dopo tre telefonate, ancora con la camicia di ieri. Pazienza. Tanto il giardino va sistemato lo stesso, e sembra che il tempo regga fino a pomeriggio.",
  },
  {
    code: 'por', name: 'Portuguese', dialectOf: null, steer: 'por', version: 1,
    text: 'É engraçado como uma manhã nos foge. Queria sentar-me com um café e ler durante meia hora e, três telefonemas depois, ainda estou com a camisa de ontem. Paciência. De qualquer forma, o jardim precisa de ser tratado, e parece que o tempo aguenta até à tarde.',
  },
  {
    code: 'por_br', name: 'Brazilian Portuguese', dialectOf: 'por', steer: 'por', version: 1,
    text: 'É engraçado como a manhã passa voando. Eu ia sentar com um café e ler meia hora, e agora, depois de três ligações, ainda estou com a camisa de ontem. Deixa pra lá. O quintal precisa de uma capinada de qualquer jeito, e parece que o tempo vai firmar até a tarde.',
  },

  // ── Slavic, Uralic, Turkic ────────────────────────────────────────────────
  {
    code: 'pol', name: 'Polish', dialectOf: null, steer: 'pol', version: 1,
    text: 'To zabawne, jak szybko ucieka poranek. Miałem usiąść z kawą i poczytać przez pół godziny, a tu proszę — trzy telefony później wciąż chodzę we wczorajszej koszuli. Trudno. I tak trzeba się zająć ogrodem, a pogoda chyba wytrzyma do popołudnia.',
  },
  {
    code: 'rus', name: 'Russian', dialectOf: null, steer: 'rus', version: 1,
    text: 'Забавно, как быстро уходит утро. Я собирался сесть с чашкой кофе и почитать полчаса, а теперь, после трёх звонков, всё ещё хожу во вчерашней рубашке. Ну и ладно. Садом всё равно надо заняться, и погода, похоже, продержится до вечера.',
  },
  {
    code: 'fin', name: 'Finnish', dialectOf: null, steer: 'fin', version: 1,
    text: 'On hassua, miten nopeasti aamu karkaa. Ajattelin istua kahvin kanssa ja lukea puoli tuntia, ja nyt, kolmen puhelun jälkeen, minulla on yhä eilinen paita päällä. Ei se mitään. Piha pitää joka tapauksessa hoitaa, ja sää näyttää pysyvän poutaisena iltapäivään asti.',
  },
  {
    code: 'tur', name: 'Turkish', dialectOf: null, steer: 'tur', version: 1,
    text: 'Sabahın nasıl geçtiğini anlamıyor insan. Bir kahve alıp yarım saat kitap okumaya oturacaktım, üç telefon görüşmesi sonra hâlâ dünkü gömlekle dolaşıyorum. Neyse. Zaten bahçeyle ilgilenmek lazım, hava da öğleden sonraya kadar dayanır gibi görünüyor.',
  },

  // ── Asian ─────────────────────────────────────────────────────────────────
  {
    code: 'jpn', name: 'Japanese', dialectOf: null, steer: 'jpn', version: 1,
    text: '朝ってどうしてこんなに早く過ぎるんでしょうね。コーヒーを入れて三十分くらい本を読むつもりだったのに、電話が三本もかかってきて、気づけばまだ昨日のシャツのままです。まあ、いいか。どのみち庭の手入れはしないといけないし、午後までは天気ももちそうですから。',
  },
  {
    code: 'kor', name: 'Korean', dialectOf: null, steer: 'kor', version: 1,
    text: '아침이 어쩜 이렇게 빨리 지나가는지 모르겠어요. 커피 한 잔 놓고 삼십 분쯤 책을 읽으려고 했는데, 전화를 세 통이나 받고 나니 아직도 어제 입던 셔츠 차림이네요. 뭐, 괜찮아요. 어차피 마당은 손봐야 하고, 날씨도 오후까지는 버텨 줄 것 같으니까요.',
  },
  {
    code: 'cmn', name: 'Mandarin', dialectOf: null, steer: 'cmn', version: 1,
    text: '一个早上过得真快。我本来想倒杯咖啡，安安静静看半个小时书，结果接了三通电话，到现在还穿着昨天那件衬衫。算了。反正院子也得收拾，看天气应该能撑到下午。',
  },
  {
    code: 'hin', name: 'Hindi', dialectOf: null, steer: 'hin', version: 1,
    text: 'अजीब बात है कि सुबह कितनी जल्दी निकल जाती है। सोचा था चाय लेकर आधे घंटे कुछ पढ़ूँगा, और अब तीन फ़ोन कॉल के बाद भी कल वाली ही कमीज़ पहने बैठा हूँ। कोई बात नहीं। बगीचे का काम तो वैसे भी करना ही है, और मौसम शायद दोपहर तक ठीक रहेगा।',
  },
  {
    code: 'vie', name: 'Vietnamese', dialectOf: null, steer: 'vie', version: 1,
    text: 'Buổi sáng trôi qua nhanh thật lạ. Tôi định pha một ly cà phê rồi ngồi đọc sách nửa tiếng, vậy mà sau ba cuộc điện thoại vẫn còn mặc nguyên cái áo hôm qua. Thôi cũng được. Dù sao thì cũng phải dọn lại cái vườn, mà xem chừng trời còn nắng đến chiều.',
  },

  // ── Arabic and its dialects ───────────────────────────────────────────────
  {
    code: 'ara', name: 'Arabic (Modern Standard)', dialectOf: null, steer: 'ara', version: 1,
    text: 'من الغريب كم يمرّ الصباح بسرعة. كنت أنوي أن أجلس مع فنجان قهوة وأقرأ نصف ساعة، وها أنا بعد ثلاث مكالمات ما زلت أرتدي قميص الأمس. لا بأس. الحديقة تحتاج إلى عناية على أي حال، ويبدو أن الطقس سيصمد حتى بعد الظهر.',
  },
  {
    code: 'ara_eg', name: 'Egyptian Arabic', dialectOf: 'ara', steer: 'ara', version: 1,
    text: 'غريبة إزاي الصبح بيعدي بسرعة كده. كنت ناوي أقعد أشرب قهوة وأقرا نص ساعة، وأهو بعد تلات مكالمات لسه لابس قميص إمبارح. مش مشكلة. الجنينة محتاجة شغل على أي حال، والجو شكله هيفضل حلو لحد بعد الضهر.',
  },
  {
    code: 'ara_lb', name: 'Lebanese Arabic', dialectOf: 'ara', steer: 'ara', version: 1,
    text: null,
    gap: 'No Lebanese paragraph yet. Lebanese and Syrian are both Levantine and anything I wrote would have come out as one text with a label on it — which is the guess this feature is built to avoid. It wants a paragraph from somebody who speaks it.',
  },
  {
    code: 'ara_sy', name: 'Syrian Arabic', dialectOf: 'ara', steer: 'ara', version: 1,
    text: null,
    gap: 'No Syrian paragraph yet — same reason as Lebanese: I cannot write the two so they are honestly different, and two dialects sharing one text would make the audition lie about which one you are hearing.',
  },
]

/** Fast lookup by code. */
const BY_CODE = new Map(PARAGRAPHS.map((p) => [p.code, p]))

function find (code) {
  return BY_CODE.get(String(code || '').toLowerCase()) || null
}

/** Everything the screen needs, with the text itself included — it is not a secret. */
function list () {
  return PARAGRAPHS.map((p) => ({
    code: p.code,
    name: p.name,
    dialectOf: p.dialectOf || null,
    steer: p.steer,
    version: p.version,
    available: Boolean(p.text),
    text: p.text || null,
    chars: p.text ? p.text.length : 0,
    gap: p.gap || null,
  }))
}

module.exports = { PARAGRAPHS, find, list }
