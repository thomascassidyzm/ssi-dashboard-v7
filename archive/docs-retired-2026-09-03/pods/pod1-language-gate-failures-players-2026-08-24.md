# Pod 1 language-gate re-run — failing clips, tap to listen — 2026-08-24

49 clips flagged wrong-language out of 2,043 measured (97.6% pass). **Read the caveats before treating any of these as confirmed** — 9 are Hindi/Urdu or Swedish/Norwegian confusion (known STT limitation on correctly-spoken audio), and 30/49 are under 2 seconds (whisper's known blind spot on short clips). Full report: `docs/pods/pod1-language-gate-rerun-2026-08-24.md`.


## ara_eg_for_eng (8)

**Scene 7, sentence 6** — Cafe Customer 1 — expected `ar`, whisper heard `en` (1944ms)
> عايز تيك أواي، من فضلك.
https://ssi-learning-app.vercel.app/api/audio/233b0ee6-404f-4a96-a769-4ed0139c943c?f=.mp3

**Scene 8, sentence 10** — Bar Customer 2 — expected `ar`, whisper heard `hy` (1896ms)
> عايز كمان كوباتين بيرة.
https://ssi-learning-app.vercel.app/api/audio/f4896eb0-492d-4c05-b305-410b18df88ee?f=.mp3

**Scene 13, sentence 6** — Tourist — expected `ar`, whisper heard `de` (932ms)
> وبعدين؟
https://ssi-learning-app.vercel.app/api/audio/1c648486-352b-44a8-81fb-d4c50540497e?f=.mp3

**Scene 15, sentence 1** — Learner — expected `ar`, whisper heard `en` (1008ms)
> ده بكام؟
https://ssi-learning-app.vercel.app/api/audio/9496b2e6-80e0-4ab6-aa6f-63dd60d089fe?f=.mp3

**Scene 16, sentence 7** — Learner — expected `ar`, whisper heard `de` (1176ms)
> ممكن ندفع؟
https://ssi-learning-app.vercel.app/api/audio/9e25fe3a-dc38-47ea-9583-99c93b1227a1?f=.mp3

**Scene 16, sentence 9** — Learner — expected `ar`, whisper heard `he` (2280ms)
> لا، إحنا بناخد كاش بس.
https://ssi-learning-app.vercel.app/api/audio/0adc9a5c-440f-4f37-b9ef-92f026ba4436?f=.mp3

**Scene 20, sentence 7** — Learner — expected `ar`, whisper heard `ms` (1320ms)
> بالتوفيق في كده!
https://ssi-learning-app.vercel.app/api/audio/74934fea-7432-4eda-a315-0f5e682ad7d3?f=.mp3

**Scene 21, sentence 14** — Narrator — expected `ar`, whisper heard `sv` (3240ms)
> أكتوبر. … نوفمبر. … ديسمبر.
https://ssi-learning-app.vercel.app/api/audio/c3fcd48d-3be8-4d15-94d2-fa4bae87af86?f=.mp3


## deu_at_for_eng (2)

**Scene 3, sentence 4** — Sarah — expected `de`, whisper heard `en` (1584ms)
> Hobn S' Snacks?
https://ssi-learning-app.vercel.app/api/audio/70653795-72e7-4098-bd50-c7de7ea22b6d?f=.mp3

**Scene 3, sentence 8** — Sarah — expected `de`, whisper heard `en` (960ms)
> Jo, bitte.
https://ssi-learning-app.vercel.app/api/audio/23380af9-b159-46fd-b80f-d4fae06fbdea?f=.mp3


## hin_for_eng (12)

**Scene 2, sentence 5** — Passenger — expected `hi`, whisper heard `ur` (4008ms)
> यह ज़्यादा दूर नहीं है। शायद तीन या चार मील।
https://ssi-learning-app.vercel.app/api/audio/4feecc04-11b8-46b4-95f7-da38c82666d6?f=.mp3

**Scene 3, sentence 6** — Barista — expected `hi`, whisper heard `ur` (3457ms)
> नहीं, हमारे पास सिर्फ पीने की चीज़ें हैं।
https://ssi-learning-app.vercel.app/api/audio/cb59fd5f-d56f-49ea-b0bc-fa50091339e8?f=.mp3

**Scene 3, sentence 8** — Sarah — expected `hi`, whisper heard `ru` (1248ms)
> हाँ, कृपया।
https://ssi-learning-app.vercel.app/api/audio/7d3f081c-1db4-4cd7-bee8-c80a68af5eca?f=.mp3

**Scene 3, sentence 10** — Sarah — expected `hi`, whisper heard `ar` (2360ms)
> बहुत-बहुत धन्यवाद। अलविदा।
https://ssi-learning-app.vercel.app/api/audio/4521676e-7b03-4a7e-bbdc-4eff1c5eb510?f=.mp3

**Scene 7, sentence 15** — Narrator — expected `hi`, whisper heard `en` (3527ms)
> पाँच। दस। पंद्रह। लाल। हरा।
https://ssi-learning-app.vercel.app/api/audio/b85f785f-0c12-46eb-b658-bda99b011ec8?f=.mp3

**Scene 9, sentence 18** — Narrator — expected `hi`, whisper heard `en` (4810ms)
> सात। नौ। ग्यारह। नारंगी। बैंगनी।
https://ssi-learning-app.vercel.app/api/audio/bbba1b67-3e31-4b28-9c9c-ec662f063f99?f=.mp3

**Scene 12, sentence 4** — Pharmacist — expected `hi`, whisper heard `ur` (5086ms)
> सिरदर्द के लिए पैरासिटामोल लीजिए, और गले के लिए ये लोज़ेंज।
https://ssi-learning-app.vercel.app/api/audio/d2725abb-a757-4ff6-acf7-a5e10cf68008?f=.mp3

**Scene 12, sentence 10** — Narrator — expected `hi`, whisper heard `pt` (4800ms)
> उन्नीस। बीस। इक्कीस। बुधवार। गुरुवार।
https://ssi-learning-app.vercel.app/api/audio/4f61c7d1-34b9-48c5-b5ff-796d549f0766?f=.mp3

**Scene 13, sentence 11** — Narrator — expected `hi`, whisper heard `en` (4274ms)
> तीस। चालीस। पचास। शुक्रवार। शनिवार।
https://ssi-learning-app.vercel.app/api/audio/36dec309-fd83-4279-80c2-bce69f3b6c55?f=.mp3

**Scene 14, sentence 5** — Passenger — expected `hi`, whisper heard `ur` (4099ms)
> क्या आप बता सकते हैं कि स्टेशन में टिकट कहाँ मिलती है?
https://ssi-learning-app.vercel.app/api/audio/5c0b0b1d-7f68-4f1d-9009-79ea5fb165d0?f=.mp3

**Scene 17, sentence 11** — Narrator — expected `hi`, whisper heard `en` (3542ms)
> तीन बजे। नौ बजे। जनवरी। फ़रवरी।
https://ssi-learning-app.vercel.app/api/audio/7ef44ce1-8e96-4dff-b46c-252681aa0e33?f=.mp3

**Scene 21, sentence 14** — Narrator — expected `hi`, whisper heard `en` (3026ms)
> अक्टूबर। नवंबर। दिसंबर।
https://ssi-learning-app.vercel.app/api/audio/666285ec-37c5-4515-9f20-0532e92a227a?f=.mp3


## ita_for_eng (2)

**Scene 3, sentence 7** — Barista — expected `it`, whisper heard `fr` (1728ms)
> Sì, vuole il menù?
https://ssi-learning-app.vercel.app/api/audio/e1714d52-288b-4f7b-a645-8d65eb9cf1db?f=.mp3

**Scene 13, sentence 6** — Tourist — expected `it`, whisper heard `fr` (840ms)
> E poi?
https://ssi-learning-app.vercel.app/api/audio/5fc8bbf4-76fc-4b7d-a597-c046e38cdc15?f=.mp3


## nld_for_eng (6)

**Scene 7, sentence 8** — Cafe Barista — expected `nl`, whisper heard `de` (3000ms)
> Komt eraan. … Kan ik nog iets voor u doen?
https://ssi-learning-app.vercel.app/api/audio/ee880780-a4ff-47d9-b388-05161a823660?f=.mp3

**Scene 7, sentence 15** — Narrator — expected `nl`, whisper heard `en` (4776ms)
> Vijf. … Tien. … Vijftien. … Rood. … Groen.
https://ssi-learning-app.vercel.app/api/audio/9e8330ab-9488-471b-9fee-48776c8a7ebb?f=.mp3

**Scene 13, sentence 6** — Tourist — expected `nl`, whisper heard `en` (696ms)
> En dan?
https://ssi-learning-app.vercel.app/api/audio/f139b97c-af91-45a3-a862-43bf2e05d14f?f=.mp3

**Scene 16, sentence 3** — Learner — expected `nl`, whisper heard `de` (1728ms)
> Kunnen we het nog eens proberen?
https://ssi-learning-app.vercel.app/api/audio/6758f6fd-20b9-497a-8634-835213c9a42b?f=.mp3

**Scene 18, sentence 3** — Learner — expected `nl`, whisper heard `en` (1428ms)
> Heeft u appelsap?
https://ssi-learning-app.vercel.app/api/audio/1ccb490e-8b06-462e-a955-634aa87edc6d?f=.mp3

**Scene 21, sentence 14** — Narrator — expected `nl`, whisper heard `en` (3467ms)
> Oktober. … November. … December.
https://ssi-learning-app.vercel.app/api/audio/d1d680e7-cf62-4f2c-9244-2cfc4cad3c5d?f=.mp3


## por_br_for_eng (1)

**Scene 13, sentence 6** — Tourist — expected `pt`, whisper heard `en` (1176ms)
> E depois?
https://ssi-learning-app.vercel.app/api/audio/bd0330c9-987b-4c6d-b718-0f61195a2ce9?f=.mp3


## por_for_eng (4)

**Scene 13, sentence 6** — Tourist — expected `pt`, whisper heard `en` (1080ms)
> E depois?
https://ssi-learning-app.vercel.app/api/audio/06f83395-0b21-4b06-9000-9825adcda899?f=.mp3

**Scene 15, sentence 1** — Learner — expected `pt`, whisper heard `es` (1438ms)
> Quanto custa isso?
https://ssi-learning-app.vercel.app/api/audio/f1d09223-283c-40d6-b270-66c1ce20a307?f=.mp3

**Scene 16, sentence 3** — Learner — expected `pt`, whisper heard `es` (1864ms)
> Podemos tentar outra vez?
https://ssi-learning-app.vercel.app/api/audio/b9f12c28-ae88-4aa0-a9f9-68b6c93aa0ae?f=.mp3

**Scene 18, sentence 5** — Learner — expected `pt`, whisper heard `fr` (1800ms)
> O autocarro parte daqui?
https://ssi-learning-app.vercel.app/api/audio/2d25120a-4631-467e-b243-75782e0b80ad?f=.mp3


## swe_for_eng (14)

**Scene 3, sentence 3** — Sarah — expected `sv`, whisper heard `no` (1503ms)
> Har du någon mat?
https://ssi-learning-app.vercel.app/api/audio/bed0195a-6708-423c-82a0-6e4c61e5cae2?f=.mp3

**Scene 3, sentence 5** — Sarah — expected `sv`, whisper heard `no` (2560ms)
> Har du chips, eller nötter, eller något?
https://ssi-learning-app.vercel.app/api/audio/510fe8d9-d647-426a-a7cd-508130f8c919?f=.mp3

**Scene 7, sentence 1** — Cafe Barista — expected `sv`, whisper heard `sq` (2760ms)
> Godmorgon. … Vad kan jag få dig?
https://ssi-learning-app.vercel.app/api/audio/366371d8-1059-4ac1-bb8d-91e7c7e41cf5?f=.mp3

**Scene 9, sentence 18** — Narrator — expected `sv`, whisper heard `no` (4946ms)
> Sju. … Nio. … Elva. … Orange. … Lila.
https://ssi-learning-app.vercel.app/api/audio/1ef9b4be-74dc-484d-8cf6-da8a0bfef8bc?f=.mp3

**Scene 16, sentence 6** — Learner — expected `sv`, whisper heard `no` (1673ms)
> Har du något att äta?
https://ssi-learning-app.vercel.app/api/audio/df014e5c-8f74-457d-aee5-f042d4dea701?f=.mp3

**Scene 17, sentence 8** — Learner — expected `sv`, whisper heard `no` (1533ms)
> Är vattnet varmt?
https://ssi-learning-app.vercel.app/api/audio/9e138a2a-1c6f-4fa5-83cc-9d68c3b838ee?f=.mp3

**Scene 18, sentence 2** — Learner — expected `sv`, whisper heard `en` (1800ms)
> Har du apelsinjuice?
https://ssi-learning-app.vercel.app/api/audio/da4a568a-8b60-477a-b46b-1dcf31f79a45?f=.mp3

**Scene 18, sentence 5** — Learner — expected `sv`, whisper heard `ro` (1668ms)
> Går bussen härifrån?
https://ssi-learning-app.vercel.app/api/audio/52f2df97-c631-4d76-9798-b1c5d15b7a93?f=.mp3

**Scene 18, sentence 6** — Learner — expected `sv`, whisper heard `en` (1773ms)
> Var går bussen ifrån?
https://ssi-learning-app.vercel.app/api/audio/5392a664-7673-4b4b-a5f0-2838e61d7b8b?f=.mp3

**Scene 19, sentence 1** — Learner — expected `sv`, whisper heard `sl` (1416ms)
> Det gör mig glad.
https://ssi-learning-app.vercel.app/api/audio/b7870bfc-cbd9-4400-a8a8-2515ad41e768?f=.mp3

**Scene 19, sentence 5** — Learner — expected `sv`, whisper heard `pa` (1954ms)
> Är det okej om vi lägger det här?
https://ssi-learning-app.vercel.app/api/audio/fb9ee099-b62a-4f5d-b7d2-841085b0d896?f=.mp3

**Scene 20, sentence 3** — Learner — expected `sv`, whisper heard `en` (1167ms)
> Har du glass?
https://ssi-learning-app.vercel.app/api/audio/c20e52b2-eeaa-472b-86f1-2485ae972dfc?f=.mp3

**Scene 21, sentence 9** — Learner — expected `sv`, whisper heard `en` (972ms)
> Vad är det?
https://ssi-learning-app.vercel.app/api/audio/7e8bc82c-894c-4902-a44e-7bd3b8a9540b?f=.mp3

**Scene 21, sentence 10** — Learner — expected `sv`, whisper heard `ta` (1553ms)
> Vad är det där borta?
https://ssi-learning-app.vercel.app/api/audio/5ec1180d-ae43-4bd8-8551-7f28d0855e58?f=.mp3
