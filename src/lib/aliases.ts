// Vernacular / Hinglish / Sanskrit -> English + botanical terms. Used for query expansion and the prior-art planner.
export interface Herb {
  key: string;
  names: string[]; // lowercase aliases, Latin script
  hindi?: string[];
  botanical: string;
  note?: string;
}

export const HERBS: Herb[] = [
  { key: "turmeric", names: ["turmeric", "haldi", "haridra"], hindi: ["हल्दी", "हरिद्रा"], botanical: "Curcuma longa" },
  { key: "neem", names: ["neem", "nimba", "margosa"], hindi: ["नीम"], botanical: "Azadirachta indica" },
  { key: "ashwagandha", names: ["ashwagandha", "withania"], hindi: ["अश्वगंधा"], botanical: "Withania somnifera" },
  { key: "tulsi", names: ["tulsi", "holy basil"], hindi: ["तुलसी"], botanical: "Ocimum tenuiflorum" },
  { key: "brahmi", names: ["brahmi", "bacopa"], hindi: ["ब्राह्मी"], botanical: "Bacopa monnieri" },
  { key: "giloy", names: ["giloy", "guduchi", "amrita"], hindi: ["गिलोय", "गुडूची"], botanical: "Tinospora cordifolia" },
  { key: "amla", names: ["amla", "amalaki", "gooseberry"], hindi: ["आंवला", "आमलकी"], botanical: "Phyllanthus emblica" },
  { key: "haritaki", names: ["haritaki", "harad", "harde"], hindi: ["हरड़", "हरीतकी"], botanical: "Terminalia chebula" },
  { key: "bibhitaki", names: ["bibhitaki", "baheda"], hindi: ["बहेड़ा"], botanical: "Terminalia bellirica" },
  { key: "shatavari", names: ["shatavari", "shatavar"], hindi: ["शतावरी"], botanical: "Asparagus racemosus" },
  { key: "arjuna", names: ["arjuna", "arjun"], hindi: ["अर्जुन"], botanical: "Terminalia arjuna" },
  { key: "guggul", names: ["guggul", "guggulu"], hindi: ["गुग्गुल"], botanical: "Commiphora wightii" },
  { key: "kutki", names: ["kutki", "kutaki"], hindi: ["कुटकी"], botanical: "Picrorhiza kurroa" },
  { key: "ginger", names: ["ginger", "adrak", "shunthi", "sonth"], hindi: ["अदरक", "सोंठ"], botanical: "Zingiber officinale" },
  { key: "long pepper", names: ["pippali", "long pepper"], hindi: ["पिप्पली"], botanical: "Piper longum" },
  { key: "black pepper", names: ["maricha", "kali mirch", "black pepper"], hindi: ["काली मिर्च"], botanical: "Piper nigrum" },
  { key: "liquorice", names: ["mulethi", "yashtimadhu", "liquorice", "licorice"], hindi: ["मुलेठी", "यष्टिमधु"], botanical: "Glycyrrhiza glabra" },
  { key: "kalmegh", names: ["kalmegh", "bhunimba"], hindi: ["कालमेघ"], botanical: "Andrographis paniculata" },
  { key: "aloe", names: ["aloe", "kumari", "ghritkumari"], hindi: ["एलोवेरा", "घृतकुमारी"], botanical: "Aloe vera (Aloe barbadensis)" },
  { key: "vasaka", names: ["vasaka", "adusa", "adhatoda"], hindi: ["वासा", "अडूसा"], botanical: "Justicia adhatoda" },
  { key: "sarpagandha", names: ["sarpagandha"], hindi: ["सर्पगंधा"], botanical: "Rauvolfia serpentina" },
  { key: "bhringraj", names: ["bhringraj", "bhringaraj"], hindi: ["भृंगराज"], botanical: "Eclipta prostrata" },
  { key: "bitter gourd", names: ["karela", "bitter gourd", "bitter melon"], hindi: ["करेला"], botanical: "Momordica charantia" },
  { key: "jamun", names: ["jamun", "jambul"], hindi: ["जामुन"], botanical: "Syzygium cumini" },
  { key: "manjistha", names: ["manjistha"], hindi: ["मंजिष्ठा"], botanical: "Rubia cordifolia" },
  { key: "punarnava", names: ["punarnava"], hindi: ["पुनर्नवा"], botanical: "Boerhavia diffusa" },
  { key: "gokshura", names: ["gokshura", "gokhru"], hindi: ["गोखरू"], botanical: "Tribulus terrestris" },
  { key: "kapikacchu", names: ["kapikacchu", "kaunch"], hindi: ["कौंच"], botanical: "Mucuna pruriens" },
  { key: "vidanga", names: ["vidanga"], hindi: ["विडंग"], botanical: "Embelia ribes" },
  { key: "chitrak", names: ["chitrak", "chitraka"], hindi: ["चित्रक"], botanical: "Plumbago zeylanica" },
  { key: "fenugreek", names: ["methi", "fenugreek"], hindi: ["मेथी"], botanical: "Trigonella foenum-graecum" },
  { key: "ajwain", names: ["ajwain", "ajowan"], hindi: ["अजवायन"], botanical: "Trachyspermum ammi" },
  { key: "basmati", names: ["basmati"], hindi: ["बासमती"], botanical: "Oryza sativa", note: "Rice: relevant to GI, not Ayurveda formulations" },
  { key: "sandalwood", names: ["sandalwood", "chandan"], hindi: ["चंदन"], botanical: "Santalum album", note: "High-value species under the ABS regulations" },
  { key: "red sanders", names: ["red sanders", "raktachandan"], hindi: ["रक्तचंदन"], botanical: "Pterocarpus santalinus", note: "High-value species under the ABS regulations" },
  { key: "agarwood", names: ["agarwood", "agar", "oud"], hindi: ["अगर"], botanical: "Aquilaria malaccensis", note: "High-value species under the ABS regulations" },
];

// Words -> English retrieval terms (Devanagari + Hinglish + a few Marathi)
export const TERM_MAP: Record<string, string> = {
  "पेटेंट": "patent", "पेटेन्ट": "patent", "एकस्व": "patent",
  "ट्रेडमार्क": "trade mark", "व्यापार चिह्न": "trade mark", "ब्रांड": "trade mark brand",
  "डिज़ाइन": "design", "डिजाइन": "design", "कॉपीराइट": "copyright",
  "भौगोलिक संकेत": "geographical indication", "जीआई": "geographical indication",
  "आयुर्वेद": "ayurveda", "आयुर्वेदिक": "ayurvedic", "औषधि": "drug medicine", "दवा": "drug medicine", "दवाई": "drug medicine",
  "पारंपरिक ज्ञान": "traditional knowledge", "पारम्परिक ज्ञान": "traditional knowledge",
  "जैव विविधता": "biological diversity", "जैविक विविधता": "biological diversity",
  "लाभ साझा": "benefit sharing", "लाभ बंटवारा": "benefit sharing", "लाभ में हिस्सेदारी": "benefit sharing",
  "अनुमति": "approval", "मंजूरी": "approval", "लाइसेंस": "licence licensing", "पंजीकरण": "registration",
  "विदेशी": "foreigner non-citizen", "निर्यात": "export", "आयात": "import", "कंपनी": "company",
  "पौधा": "plant", "पौधों": "plants", "जड़ी बूटी": "medicinal plants herbs", "जड़ी-बूटी": "medicinal plants herbs",
  "किसान": "farmers cultivators", "वैद्य": "vaid practitioner", "हकीम": "hakim practitioner",
  "सौंदर्य प्रसाधन": "cosmetic", "कॉस्मेटिक": "cosmetic", "खाद्य": "food",
  "पूर्व कला": "prior art", "समुदाय": "community",
  // Hinglish
  "haq": "right", "dawai": "drug medicine", "dawa": "drug medicine", "jadi buti": "medicinal plants herbs",
  "anumati": "approval", "vaidya": "vaid practitioner", "paramparik gyan": "traditional knowledge",
  "labh": "benefit sharing", "nirayat": "export", "videshi": "foreigner", "pehchan": "registration",
};

const HINGLISH_HINTS = /\b(kya|kaise|hai|hain|kar|karna|milega|mujhe|mera|meri|humara|hamara|ke liye|nahi|nhi|kitna|kaun|kab|dawai|dawa|haldi|vaidya|anumati|jadi|buti|paramparik|videshi)\b/i;

export function needsTranslation(q: string): boolean {
  const letters = q.replace(/[\s\d\p{P}]/gu, "");
  if (!letters) return false;
  const nonLatin = (letters.match(/[^\u0000-\u024F]/g) || []).length;
  return nonLatin / letters.length > 0.2 || HINGLISH_HINTS.test(q);
}

export function expandQuery(q: string): { extra: string[]; herbs: Herb[] } {
  const low = q.toLowerCase();
  const extra: string[] = [];
  for (const [k, v] of Object.entries(TERM_MAP)) if (low.includes(k.toLowerCase())) extra.push(v);
  const herbs: Herb[] = [];
  for (const h of HERBS) {
    const hit = h.names.some((n) => new RegExp(`(^|[^a-z])${n}([^a-z]|$)`).test(low)) || (h.hindi || []).some((n) => q.includes(n));
    if (hit) {
      herbs.push(h);
      extra.push(h.botanical);
    }
  }
  return { extra, herbs };
}
