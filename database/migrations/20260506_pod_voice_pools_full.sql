-- Auto-generated migration: extend pod_voice_pools to all 29 broken pods' target languages.
-- Date: 2026-05-06
-- Strategy: xAI dedicated voices first (when register-appropriate), then each
-- course's Azure target1/target2. English (known track) is the fixed Tom/Olivia/Henry
-- → Sonia/Libby/Hollie/Ryan/Thomas/Alfie/Maisie ranking from 20260505.

UPDATE app_config
SET value = $${
  "eng": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "bedd6226",
        "name": "Olivia"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-SoniaNeural",
        "name": "Sonia"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-LibbyNeural",
        "name": "Libby"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-HollieNeural",
        "name": "Hollie"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-MaisieNeural",
        "name": "Maisie"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "gfzdpspr5fdp",
        "name": "Tom"
      },
      {
        "provider": "xai",
        "voice_id": "f15c6a6a",
        "name": "Henry"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-RyanNeural",
        "name": "Ryan"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-ThomasNeural",
        "name": "Thomas"
      },
      {
        "provider": "azure",
        "voice_id": "en-GB-AlfieNeural",
        "name": "Alfie"
      }
    ]
  },
  "spa": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "f2f41225",
        "name": "Maria"
      },
      {
        "provider": "xai",
        "voice_id": "46a802e3",
        "name": "Lucia"
      },
      {
        "provider": "azure",
        "voice_id": "es-ES-ElviraNeural",
        "name": "Elvira"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "d2313a0d",
        "name": "Pablo"
      },
      {
        "provider": "xai",
        "voice_id": "1a59f327",
        "name": "Carlos"
      },
      {
        "provider": "azure",
        "voice_id": "es-ES-AlvaroNeural",
        "name": "Alvaro"
      }
    ]
  },
  "fra": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "fr-FR-CelesteNeural",
        "name": "Celeste"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "fr-FR-HenriNeural",
        "name": "Henri"
      }
    ]
  },
  "ita": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "43423dee",
        "name": "Giulia"
      },
      {
        "provider": "azure",
        "voice_id": "it-IT-ElsaNeural",
        "name": "Elsa"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "57700f39",
        "name": "Leon"
      },
      {
        "provider": "xai",
        "voice_id": "1ebfec36",
        "name": "Marco"
      },
      {
        "provider": "azure",
        "voice_id": "it-IT-BenignoNeural",
        "name": "Benigno"
      }
    ]
  },
  "deu": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "44c91d64",
        "name": "Sonja"
      },
      {
        "provider": "azure",
        "voice_id": "de-DE-KatjaNeural",
        "name": "Katja"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "e1fc5a89",
        "name": "Felix"
      },
      {
        "provider": "azure",
        "voice_id": "de-DE-ConradNeural",
        "name": "Conrad"
      }
    ]
  },
  "zho": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "e521cc67",
        "name": "Hui"
      },
      {
        "provider": "xai",
        "voice_id": "09b02491",
        "name": "Mei"
      },
      {
        "provider": "azure",
        "voice_id": "zh-CN-XiaoxiaoMultilingualNeural",
        "name": "Xiaoxiao Multilingual"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "9ab26871",
        "name": "Wei"
      },
      {
        "provider": "xai",
        "voice_id": "6997b0ec",
        "name": "Yang"
      },
      {
        "provider": "azure",
        "voice_id": "zh-CN-YunyiMultilingualNeural",
        "name": "Yunyi Multilingual"
      }
    ]
  },
  "kor": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "ko-KR-YuJinNeural",
        "name": "YuJin"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "d74461c6",
        "name": "Hyun-woo"
      },
      {
        "provider": "azure",
        "voice_id": "ko-KR-GookMinNeural",
        "name": "GookMin"
      }
    ]
  },
  "ara": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "025a38c5",
        "name": "Yasmin"
      },
      {
        "provider": "azure",
        "voice_id": "ar-SA-ZariyahNeural",
        "name": "Zariyah"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "5f0c2251",
        "name": "Youssef"
      },
      {
        "provider": "xai",
        "voice_id": "f4b9d6fc",
        "name": "Omar"
      },
      {
        "provider": "azure",
        "voice_id": "ar-SA-HamedNeural",
        "name": "Hamed"
      }
    ]
  },
  "hin": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "a00ce99a",
        "name": "Priya"
      },
      {
        "provider": "xai",
        "voice_id": "0735ff93",
        "name": "Diya"
      },
      {
        "provider": "azure",
        "voice_id": "hi-IN-AartiNeural",
        "name": "Aarti"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "bcf738e4",
        "name": "Vihaan"
      },
      {
        "provider": "azure",
        "voice_id": "hi-IN-KunalNeural",
        "name": "Kunal"
      }
    ]
  },
  "pol": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "ce19f825",
        "name": "Magdalena"
      },
      {
        "provider": "xai",
        "voice_id": "4984accb",
        "name": "Zofia"
      },
      {
        "provider": "azure",
        "voice_id": "pl-PL-ZofiaNeural",
        "name": "Zofia"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "70071d42",
        "name": "Tomasz"
      },
      {
        "provider": "xai",
        "voice_id": "2902bcfd",
        "name": "Piotr"
      },
      {
        "provider": "azure",
        "voice_id": "pl-PL-MarekNeural",
        "name": "Marek"
      }
    ]
  },
  "dan": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "a69bdfe7",
        "name": "Astrid"
      },
      {
        "provider": "xai",
        "voice_id": "47519c37",
        "name": "Freja"
      },
      {
        "provider": "azure",
        "voice_id": "da-DK-ChristelNeural",
        "name": "Christel"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "cfccf16b",
        "name": "Mads"
      },
      {
        "provider": "xai",
        "voice_id": "524f4cb1",
        "name": "Lucas"
      },
      {
        "provider": "azure",
        "voice_id": "da-DK-JeppeNeural",
        "name": "Jeppe"
      }
    ]
  },
  "swe": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "3b312632",
        "name": "Alice"
      },
      {
        "provider": "xai",
        "voice_id": "bab9c92f",
        "name": "Elsa"
      },
      {
        "provider": "azure",
        "voice_id": "sv-SE-SofieNeural",
        "name": "Sofie"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "4c7f16ff",
        "name": "Oscar"
      },
      {
        "provider": "xai",
        "voice_id": "93bea908",
        "name": "William"
      },
      {
        "provider": "azure",
        "voice_id": "sv-SE-MattiasNeural",
        "name": "Mattias"
      }
    ]
  },
  "tha": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "a5341c30",
        "name": "Nicha"
      },
      {
        "provider": "xai",
        "voice_id": "330f1e6d",
        "name": "Pim"
      },
      {
        "provider": "azure",
        "voice_id": "th-TH-PremwadeeNeural",
        "name": "Premwadee"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "4b7af2d7",
        "name": "Somchai"
      },
      {
        "provider": "xai",
        "voice_id": "0463086e",
        "name": "Thanawat"
      },
      {
        "provider": "azure",
        "voice_id": "th-TH-NiwatNeural",
        "name": "Niwat"
      }
    ]
  },
  "tur": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "tr-TR-AhmetNeural",
        "name": "Ahmet"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "f331ee80",
        "name": "Ahmet"
      },
      {
        "provider": "azure",
        "voice_id": "tr-TR-EmelNeural",
        "name": "Emel"
      }
    ]
  },
  "cat": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "4d3af3e1",
        "name": "Mireia"
      },
      {
        "provider": "xai",
        "voice_id": "155d4e9b",
        "name": "Nuria"
      },
      {
        "provider": "azure",
        "voice_id": "ca-ES-AlbaNeural",
        "name": "Alba"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "c630b236",
        "name": "Jordi"
      },
      {
        "provider": "xai",
        "voice_id": "e5d4f53e",
        "name": "Pol"
      },
      {
        "provider": "azure",
        "voice_id": "ca-ES-EnricNeural",
        "name": "Enric"
      }
    ]
  },
  "nld": {
    "f": [
      {
        "provider": "xai",
        "voice_id": "cdb1cec8",
        "name": "Lieke"
      },
      {
        "provider": "xai",
        "voice_id": "6fe32f8a",
        "name": "Sophie"
      },
      {
        "provider": "azure",
        "voice_id": "nl-NL-FennaNeural",
        "name": "Fenna"
      }
    ],
    "m": [
      {
        "provider": "xai",
        "voice_id": "18245f0d",
        "name": "Bas"
      },
      {
        "provider": "xai",
        "voice_id": "ef4ce33e",
        "name": "Daan"
      },
      {
        "provider": "azure",
        "voice_id": "nl-NL-MaartenNeural",
        "name": "Maarten"
      }
    ]
  },
  "hrv": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "hr-HR-GabrijelaNeural",
        "name": "Gabrijela"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "hr-HR-SreckoNeural",
        "name": "Srecko"
      }
    ]
  },
  "ukr": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "uk-UA-PolinaNeural",
        "name": "Polina"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "uk-UA-OstapNeural",
        "name": "Ostap"
      }
    ]
  },
  "swa": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "sw-KE-ZuriNeural",
        "name": "Zuri"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "sw-KE-RafikiNeural",
        "name": "Rafiki"
      }
    ]
  },
  "nep": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "ne-NP-HemkalaNeural",
        "name": "Hemkala"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "ne-NP-SagarNeural",
        "name": "Sagar"
      }
    ]
  },
  "isl": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "is-IS-GudrunNeural",
        "name": "Gudrun"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "is-IS-GunnarNeural",
        "name": "Gunnar"
      }
    ]
  },
  "hye": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "hy-AM-AnahitNeural",
        "name": "Anahit"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "hy-AM-HaykNeural",
        "name": "Hayk"
      }
    ]
  },
  "gle": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "ga-IE-OrlaNeural",
        "name": "Orla"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "ga-IE-ColmNeural",
        "name": "Colm"
      }
    ]
  },
  "fas": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "fa-IR-DilaraNeural",
        "name": "Dilara"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "fa-IR-FaridNeural",
        "name": "Farid"
      }
    ]
  },
  "lav": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "lv-LV-EveritaNeural",
        "name": "Everita"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "lv-LV-NilsNeural",
        "name": "Nils"
      }
    ]
  },
  "lit": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "lt-LT-OnaNeural",
        "name": "Ona"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "lt-LT-LeonasNeural",
        "name": "Leonas"
      }
    ]
  },
  "est": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "et-EE-AnuNeural",
        "name": "Anu"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "et-EE-KertNeural",
        "name": "Kert"
      }
    ]
  },
  "eus": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "eu-ES-AinhoaNeural",
        "name": "Ainhoa"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "eu-ES-AnderNeural",
        "name": "Ander"
      }
    ]
  },
  "heb": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "he-IL-HilaNeural",
        "name": "Hila"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "he-IL-AvriNeural",
        "name": "Avri"
      }
    ]
  },
  "ell": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "el-GR-AthinaNeural",
        "name": "Athina"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "el-GR-NestorasNeural",
        "name": "Nestoras"
      }
    ]
  },
  "bul": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "bg-BG-KalinaNeural",
        "name": "Kalina"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "bg-BG-BorislavNeural",
        "name": "Borislav"
      }
    ]
  },
  "ron": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "ro-RO-AlinaNeural",
        "name": "Alina"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "ro-RO-EmilNeural",
        "name": "Emil"
      }
    ]
  },
  "nor": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "nb-NO-IselinNeural",
        "name": "Iselin"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "nb-NO-FinnNeural",
        "name": "Finn"
      }
    ]
  },
  "por": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "pt-PT-RaquelNeural",
        "name": "Raquel"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "pt-PT-DuarteNeural",
        "name": "Duarte"
      }
    ]
  },
  "jpn": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "ja-JP-MayuNeural",
        "name": "Mayu"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "ja-JP-NaokiNeural",
        "name": "Naoki"
      }
    ]
  },
  "spa_mx": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "es-MX-CarlotaNeural",
        "name": "Carlota"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "es-MX-LucianoNeural",
        "name": "Luciano"
      }
    ]
  },
  "fra_ca": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "fr-CA-SylvieNeural",
        "name": "Sylvie"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "fr-CA-AntoineNeural",
        "name": "Antoine"
      }
    ]
  },
  "ara_sy": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "ar-SY-AmanyNeural",
        "name": "Amany"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "ar-SY-LaithNeural",
        "name": "Laith"
      }
    ]
  },
  "por_br": {
    "f": [
      {
        "provider": "azure",
        "voice_id": "pt-BR-BrendaNeural",
        "name": "Brenda"
      }
    ],
    "m": [
      {
        "provider": "azure",
        "voice_id": "pt-BR-JulioNeural",
        "name": "Julio"
      }
    ]
  }
}$$::jsonb,
    updated_at = now()
WHERE key = 'pod_voice_pools';
