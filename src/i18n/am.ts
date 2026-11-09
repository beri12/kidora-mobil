import type { Dictionary } from './en';

/**
 * Amharic (አማርኛ). Drafted for the app; have a native-speaking educator
 * review the wording before release (tracked in docs/mobile/IMPLEMENTATION_PLAN.md).
 * Brand and provider names (Kidora, Kai, Google, Facebook) stay in Latin script
 * where they are product names.
 */
export const am: Dictionary = {
  tabs: {
    home: 'መነሻ',
    islands: 'ደሴቶች',
    games: 'ጨዋታዎች',
    kai: 'ካይ',
    me: 'እኔ',
    family: 'ቤተሰብ',
    activity: 'እንቅስቃሴ',
    classes: 'ክፍሎች',
    library: 'ቤተ-መጻሕፍት',
  },
  signIn: {
    title: 'እንኳን በደህና ተመለሱ!',
    subtitle: 'የመማር ጉዞዎን ለመቀጠል ይግቡ።',
    email: 'ኢሜይል',
    password: 'የይለፍ ቃል',
    mfaCode: 'የማረጋገጫ መተግበሪያ ኮድ',
    mfaPrompt: 'ከማረጋገጫ መተግበሪያዎ ባለ 6 አሃዝ ኮዱን ያስገቡ።',
    forgot: 'የይለፍ ቃል ረሱ?',
    submit: 'ግባ',
    phone: 'በስልክ ኮድ ይግቡ',
    newHere: 'ለKidora አዲስ ነዎት? ',
    createAccount: 'መለያ ይፍጠሩ',
    failed: 'መግባት አልተሳካም።',
  },
  social: {
    or: 'ወይም በዚህ ይቀጥሉ',
    google: 'በGoogle ይቀጥሉ',
    facebook: 'በFacebook ይቀጥሉ',
    failed: 'መግባት አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
  },
  settings: {
    title: 'ቅንብሮች',
    feel: 'ድምፅ እና እንቅስቃሴ',
    sounds: 'ድምፆች',
    soundsHint: 'በጨዋታዎች ውስጥ የደስታ እና የመጫን ድምፆች',
    vibration: 'ንዝረት',
    vibrationHint: 'ለትክክለኛ እና ለተሳሳተ መልስ ትንሽ ንዝረት',
    calm: 'ረጋ ያለ እንቅስቃሴ',
    calmHint: 'ያነሱ አኒሜሽኖች፣ ኮንፈቲ የለም',
    dailyGoal: 'የዕለት ግብ',
    minutes: '{n} ደቂቃ',
    language: 'ቋንቋ',
    languageSystem: 'የስልኩ ቅንብር',
    account: 'መለያ',
    privacy: 'የግላዊነት ፖሊሲ',
    terms: 'የአጠቃቀም ደንቦች',
    logout: 'ውጣ',
    logoutTitle: 'መውጣት ይፈልጋሉ?',
    logoutBody: 'ከመስመር ውጭ ለመጠቀም በዚህ ስልክ የተቀመጡ ትምህርቶች ይሰረዛሉ።',
    cancel: 'ይቅር',
  },
  join: {
    title: 'በኮድ ይቀላቀሉ',
    hint: 'መምህርዎ የሰጠዎትን የኮርስ ኮድ ይጻፉ፤ ለምሳሌ CPP-7K4M9X።',
    label: 'የኮርስ ኮድ',
    submit: 'ኮርሱን ተቀላቀል',
    badFormat: 'የኮርስ ኮድ እንደዚህ ይመስላል፦ CPP-7K4M9X።',
    joined: 'ገብተዋል፦ {title}',
    already: '{title}ን አስቀድመው ተቀላቅለዋል።',
    open: 'ኮርሱን ክፈት',
    entry: 'ከመምህርዎ ኮድ አለዎት?',
  },
  browse: {
    title: 'ኮርስ ይፈልጉ',
    search: 'ፈልግ',
    placeholder: 'ክፍልፋዮች፣ ንባብ፣ ጠፈር…',
    empty: 'ምንም ኮርስ አልተገኘም',
  },
};
