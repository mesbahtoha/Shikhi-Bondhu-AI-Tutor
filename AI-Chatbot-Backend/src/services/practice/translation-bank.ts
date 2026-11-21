/**
 * Small, hand-checked translation bank for Class 3 practice questions.
 *
 * The auto-seed builder only emits a translation question when the source word
 * or phrase actually appears in that chapter, so the child is always
 * translating something from the textbook rather than an unrelated phrase.
 */
export interface TranslationPair {
  /** English word/phrase. */
  en: string;
  /** Bangla word/phrase. */
  bn: string;
  /** Extra accepted spellings for the English answer. */
  enAlternatives?: string[];
  /** Extra accepted spellings for the Bangla answer. */
  bnAlternatives?: string[];
  subject?: string;
}

export const TRANSLATION_PAIRS: TranslationPair[] = [
  // English For Today - greetings, family, school, requests
  { en: 'Good morning', bn: 'সুপ্রভাত', subject: 'English' },
  { en: 'Good afternoon', bn: 'শুভ অপরাহ্ন', subject: 'English' },
  { en: 'Good evening', bn: 'শুভ সন্ধ্যা', subject: 'English' },
  { en: 'Goodbye', bn: 'বিদায়', subject: 'English' },
  { en: 'See you later', bn: 'পরে দেখা হবে', subject: 'English' },
  { en: 'Thank you', bn: 'ধন্যবাদ', subject: 'English' },
  { en: 'How are you', bn: 'তুমি কেমন আছো', subject: 'English' },
  { en: 'I am fine', bn: 'আমি ভালো আছি', subject: 'English' },
  { en: 'My name is', bn: 'আমার নাম', subject: 'English' },
  { en: 'family', bn: 'পরিবার', subject: 'English' },
  { en: 'friend', bn: 'বন্ধু', subject: 'English' },
  { en: 'mother', bn: 'মা', subject: 'English' },
  { en: 'father', bn: 'বাবা', subject: 'English' },
  { en: 'school', bn: 'বিদ্যালয়', subject: 'English' },
  { en: 'teacher', bn: 'শিক্ষক', subject: 'English' },
  { en: 'book', bn: 'বই', subject: 'English' },
  { en: 'water', bn: 'পানি', subject: 'English' },
  { en: 'river', bn: 'নদী', subject: 'English' },
  { en: 'tree', bn: 'গাছ', subject: 'English' },
  { en: 'flower', bn: 'ফুল', subject: 'English' },
  { en: 'leaf', bn: 'পাতা', subject: 'English' },
  { en: 'root', bn: 'মূল', subject: 'English' },
  { en: 'sun', bn: 'সূর্য', subject: 'English' },
  { en: 'moon', bn: 'চাঁদ', subject: 'English' },
  { en: 'rain', bn: 'বৃষ্টি', subject: 'English' },
  { en: 'clean', bn: 'পরিষ্কার', subject: 'English' },
  { en: 'dirty', bn: 'নোংরা', subject: 'English' },
  { en: 'happy', bn: 'খুশি', subject: 'English' },
  { en: 'ant', bn: 'পিঁপড়া', subject: 'English' },
  { en: 'grasshopper', bn: 'ঘাসফড়িং', subject: 'English' },
  { en: 'Save water', bn: 'পানি বাঁচাও', subject: 'English' },
  { en: 'Wash your hands', bn: 'তোমার হাত ধোও', subject: 'English' },
  { en: 'Open the door, please', bn: 'দয়া করে দরজাটি খোলো', subject: 'English' },
  { en: 'Can I borrow your pencil, please?', bn: 'দয়া করে কি তোমার পেন্সিল ধার নিতে পারি?', subject: 'English' },
  { en: 'seven', bn: 'সাত', subject: 'English' },
  { en: 'ten', bn: 'দশ', subject: 'English' },
  { en: 'twenty', bn: 'বিশ', subject: 'English' },

  // Bangla
  { en: 'vowel', bn: 'স্বরবর্ণ', subject: 'Bangla' },
  { en: 'consonant', bn: 'ব্যঞ্জনবর্ণ', subject: 'Bangla' },
  { en: 'sentence', bn: 'বাক্য', subject: 'Bangla' },
  { en: 'word', bn: 'শব্দ', subject: 'Bangla' },
  { en: 'story', bn: 'গল্প', subject: 'Bangla' },
  { en: 'poem', bn: 'কবিতা', subject: 'Bangla' },
  { en: 'flag', bn: 'পতাকা', subject: 'Bangla' },
  { en: 'national anthem', bn: 'জাতীয় সঙ্গীত', subject: 'Bangla' },
  { en: 'village', bn: 'গ্রাম', subject: 'Bangla' },
  { en: 'city', bn: 'শহর', subject: 'Bangla' },
  { en: 'festival', bn: 'উৎসব', subject: 'Bangla' },
  { en: 'muslin', bn: 'মসলিন', subject: 'Bangla' },
  { en: 'liberation war', bn: 'মুক্তিযুদ্ধ', subject: 'Bangla' },
  { en: 'palm tree', bn: 'তালগাছ', subject: 'Bangla' },
  { en: 'smile', bn: 'হাসি', subject: 'Bangla' },
  { en: 'homeland', bn: 'মাতৃভূমি', subject: 'Bangla' },
  { en: 'language', bn: 'ভাষা', subject: 'Bangla' },
  { en: 'child', bn: 'শিশু', subject: 'Bangla' },

  // Math
  { en: 'addition', bn: 'যোগ', subject: 'Math' },
  { en: 'subtraction', bn: 'বিয়োগ', subject: 'Math' },
  { en: 'multiplication', bn: 'গুণ', subject: 'Math' },
  { en: 'division', bn: 'ভাগ', subject: 'Math' },
  { en: 'number', bn: 'সংখ্যা', subject: 'Math' },
  { en: 'fraction', bn: 'ভগ্নাংশ', subject: 'Math' },
  { en: 'measurement', bn: 'পরিমাপ', subject: 'Math' },
  { en: 'geometry', bn: 'জ্যামিতি', subject: 'Math' },
  { en: 'triangle', bn: 'ত্রিভুজ', subject: 'Math' },
  { en: 'circle', bn: 'বৃত্ত', subject: 'Math' },
  { en: 'money', bn: 'টাকা', subject: 'Math' },
  { en: 'dozen', bn: 'ডজন', subject: 'Math' },
  { en: 'data', bn: 'উপাত্ত', subject: 'Math' },
  { en: 'length', bn: 'দৈর্ঘ্য', subject: 'Math' },
  { en: 'width', bn: 'প্রস্থ', subject: 'Math' },

  // Science
  { en: 'plant', bn: 'উদ্ভিদ', subject: 'Science' },
  { en: 'animal', bn: 'প্রাণী', subject: 'Science' },
  { en: 'stem', bn: 'কাণ্ড', subject: 'Science' },
  { en: 'fruit', bn: 'ফল', subject: 'Science' },
  { en: 'soil', bn: 'মাটি', subject: 'Science' },
  { en: 'air', bn: 'বাতাস', subject: 'Science' },
  { en: 'energy', bn: 'শক্তি', subject: 'Science' },
  { en: 'food', bn: 'খাদ্য', subject: 'Science' },
  { en: 'health', bn: 'স্বাস্থ্য', subject: 'Science' },
  { en: 'matter', bn: 'পদার্থ', subject: 'Science' },
  { en: 'force', bn: 'বল', subject: 'Science' },
  { en: 'technology', bn: 'প্রযুক্তি', subject: 'Science' },
  { en: 'information', bn: 'তথ্য', subject: 'Science' },
  { en: 'sunlight', bn: 'সূর্যালোক', subject: 'Science' },
  { en: 'seed', bn: 'বীজ', subject: 'Science' },

  // Islam
  { en: 'Allah', bn: 'আল্লাহ', subject: 'Islam' },
  { en: 'faith', bn: 'ইমান', subject: 'Islam' },
  { en: 'prayer', bn: 'নামাজ', subject: 'Islam' },
  { en: 'Quran', bn: 'কুরআন', subject: 'Islam' },
  { en: 'Prophet', bn: 'রাসুল', subject: 'Islam' },
  { en: 'kindness', bn: 'দয়া', subject: 'Islam' },
  { en: 'creation', bn: 'সৃষ্টি', subject: 'Islam' },
  { en: 'worship', bn: 'ইবাদত', subject: 'Islam' },
  { en: 'honesty', bn: 'সততা', subject: 'Islam' },
  { en: 'patience', bn: 'ধৈর্য', subject: 'Islam' },
];

/** Known chapter-title translations, used as a safe fallback. */
export const TITLE_TRANSLATIONS: Array<{ bn: string; en: string; subject?: string }> = [
  { bn: 'আমাদের কথা', en: 'Our Words', subject: 'Bangla' },
  { bn: 'আমাদের পরিবার ও আমাদের প্রতিবেশী', en: 'Our Family and Our Neighbours', subject: 'Bangla' },
  { bn: 'ময়লার বাকসো', en: 'The Dustbin', subject: 'Bangla' },
  { bn: 'আবার পড়ি কারচিহ্ন', en: 'Let Us Read Kar Signs Again', subject: 'Bangla' },
  { bn: 'আবার পড়ি ফলাচিহ্ন', en: 'Let Us Read Phala Signs Again', subject: 'Bangla' },
  { bn: 'দেখে বুঝে কাজ করি', en: 'We Work by Looking and Understanding', subject: 'Bangla' },
  { bn: 'ঘাসফড়িং আর পিঁপড়ার গল্প', en: 'The Story of the Grasshopper and the Ant', subject: 'Bangla' },
  { bn: 'আমি হব', en: 'I Will Be', subject: 'Bangla' },
  { bn: 'ব্যাঙের সাজা', en: "The Frog's Punishment", subject: 'Bangla' },
  { bn: 'বাক্য পড়ি ও লিখি', en: 'We Read and Write Sentences', subject: 'Bangla' },
  { bn: 'আনন্দের দিন', en: 'A Day of Joy', subject: 'Bangla' },
  { bn: 'বালুচরে একদিন', en: 'A Day on the Sandbar', subject: 'Bangla' },
  { bn: 'আমাদের গ্রাম', en: 'Our Village', subject: 'Bangla' },
  { bn: 'নদীর দেশ', en: 'Land of Rivers', subject: 'Bangla' },
  { bn: 'হার-জিতের গল্প', en: 'The Story of Winning and Losing', subject: 'Bangla' },
  { bn: 'হাসি', en: 'Smile', subject: 'Bangla' },
  { bn: 'আমাদের উৎসব', en: 'Our Festivals', subject: 'Bangla' },
  { bn: 'রাষ্ট্রভাষা বাংলা চাই', en: 'We Want Bangla as the State Language', subject: 'Bangla' },
  { bn: 'আজিকার শিশু', en: "Today's Child", subject: 'Bangla' },
  { bn: 'ঢাকাই মসলিন', en: 'Dhakai Muslin', subject: 'Bangla' },
  { bn: 'আমার পণ', en: 'My Vow', subject: 'Bangla' },
  { bn: 'মানব জয়ের গল্প', en: 'The Story of Human Victory', subject: 'Bangla' },
  { bn: 'তালগাছ', en: 'The Palm Tree', subject: 'Bangla' },
  { bn: 'রবীন্দ্রনাথ ঠাকুরের ছেলেবেলা', en: "Rabindranath Tagore's Childhood", subject: 'Bangla' },
  { bn: 'মুক্তিযুদ্ধে রাজারবাগ', en: 'Rajarbagh in the Liberation War', subject: 'Bangla' },
  { bn: 'নিজের মতো লিখি', en: 'We Write in Our Own Way', subject: 'Bangla' },
  { bn: 'প্রতিযোগিতায় নাম লিখি', en: 'We Write Our Names in the Competition', subject: 'Bangla' },
  { bn: 'সংখ্যা', en: 'Numbers', subject: 'Math' },
  { bn: 'যোগ', en: 'Addition', subject: 'Math' },
  { bn: 'বিয়োগ', en: 'Subtraction', subject: 'Math' },
  { bn: 'যোগ ও বিয়োগের সম্পর্ক', en: 'Relationship between Addition and Subtraction', subject: 'Math' },
  { bn: 'গুণ', en: 'Multiplication', subject: 'Math' },
  { bn: 'ভাগ', en: 'Division', subject: 'Math' },
  { bn: 'গুণ ও ভাগের সম্পর্ক', en: 'Relationship between Multiplication and Division', subject: 'Math' },
  { bn: 'যোগ, বিয়োগ, গুণ ও ভাগসংক্রান্ত সমস্যা', en: 'Problems on Addition, Subtraction, Multiplication and Division', subject: 'Math' },
  { bn: 'ভগ্নাংশ', en: 'Fractions', subject: 'Math' },
  { bn: 'বাংলাদেশি মুদ্রা', en: 'Bangladeshi Currency', subject: 'Math' },
  { bn: 'পরিমাপ', en: 'Measurement', subject: 'Math' },
  { bn: 'জ্যামিতি', en: 'Geometry', subject: 'Math' },
  { bn: 'উপাত্ত সংগ্রহ ও বিন্যস্তকরণ', en: 'Collecting and Organizing Data', subject: 'Math' },
  { bn: 'উদ্ভিদ পরিচিতি', en: 'Introduction to Plants', subject: 'Science' },
  { bn: 'প্রাণী পরিচিতি', en: 'Introduction to Animals', subject: 'Science' },
  { bn: 'স্বাস্থ্যের জন্য খাদ্য', en: 'Food for Health', subject: 'Science' },
  { bn: 'পদার্থ', en: 'Matter', subject: 'Science' },
  { bn: 'শক্তি', en: 'Energy', subject: 'Science' },
  { bn: 'বস্তুর উপর বলের প্রভাব', en: 'Effect of Force on Objects', subject: 'Science' },
  { bn: 'পানি', en: 'Water', subject: 'Science' },
  { bn: 'মাটি', en: 'Soil', subject: 'Science' },
  { bn: 'জীবনের জন্য সূর্য', en: 'Sun for Life', subject: 'Science' },
  { bn: 'প্রযুক্তির সঙ্গে পরিচয়', en: 'Introduction to Technology', subject: 'Science' },
  { bn: 'তথ্য ও যোগাযোগ', en: 'Information and Communication', subject: 'Science' },
  { bn: 'প্রথম অধ্যায় স্রষ্টা ও সৃষ্টি', en: 'Chapter One: The Creator and Creation', subject: 'Islam' },
  {
    bn: 'দ্বিতীয় অধ্যায় রাসুল (স.) ও তাঁর সাহাবিগণের জীবনচরিত অনুসরণ',
    en: 'Chapter Two: Following the Lives of the Prophet (PBUH) and His Companions',
    subject: 'Islam',
  },
  { bn: 'তৃতীয় অধ্যায় - [তে 4 ই', en: 'Chapter Three', subject: 'Islam' },
  { bn: 'চতুর্থ অধ্যায় ধর্মীয় সম্প্রীতি', en: 'Chapter Four: Religious Harmony', subject: 'Islam' },
  {
    bn: 'পঞ্চম অধ্যায় জীবজগৎ ও প্রকৃতির প্রতি ভালোবাসা',
    en: 'Chapter Five: Love for Living Beings and Nature',
    subject: 'Islam',
  },
  { bn: 'English For Today', en: 'English For Today', subject: 'English' },
];

/**
 * Subject-aware fallback pairs used only when a chapter contains too little
 * clean text to build chapter-specific questions.
 */
export const SUBJECT_MATCHING_PAIRS: Record<string, Array<{ left: string; right: string }>> = {
  Math: [
    { left: 'যোগ', right: '+' },
    { left: 'বিয়োগ', right: '−' },
    { left: 'গুণ', right: '×' },
    { left: 'ভাগ', right: '÷' },
    { left: 'ডজন', right: '১২টি' },
    { left: 'ত্রিভুজ', right: '৩টি বাহু' },
  ],
  Science: [
    { left: 'উদ্ভিদ', right: 'মূল, কাণ্ড ও পাতা' },
    { left: 'প্রাণী', right: 'নিজের খাদ্য নিজে তৈরি করতে পারে না' },
    { left: 'মাটি', right: 'গাছের মূল যেখানে থাকে' },
    { left: 'সূর্য', right: 'আলো ও তাপের উৎস' },
    { left: 'পানি', right: 'জীবনের জন্য অপরিহার্য' },
    { left: 'বাতাস', right: 'শ্বাস নিতে প্রয়োজন' },
  ],
  Islam: [
    { left: 'আল্লাহ', right: 'সৃষ্টিকর্তা' },
    { left: 'ইমান', right: 'বিশ্বাস' },
    { left: 'নামাজ', right: 'ইবাদত' },
    { left: 'কুরআন', right: 'আসমানি কিতাব' },
    { left: 'রাসুল', right: 'আল্লাহর প্রেরিত ব্যক্তি' },
    { left: 'দয়া', right: 'সদাচরণ' },
  ],
  Bangla: [
    { left: 'স্বরবর্ণ', right: 'অ, আ, ই, ঈ' },
    { left: 'ব্যঞ্জনবর্ণ', right: 'ক, খ, গ, ঘ' },
    { left: 'বাক্য', right: 'শব্দ দিয়ে গঠিত' },
    { left: 'গল্প', right: 'ঘটনাবলির বর্ণনা' },
    { left: 'কবিতা', right: 'ছন্দে লেখা রচনা' },
    { left: 'পতাকা', right: 'দেশের প্রতীক' },
  ],
  English: [
    { left: 'Hello', right: 'শুভেচ্ছা' },
    { left: 'Goodbye', right: 'বিদায়' },
    { left: 'Family', right: 'পরিবার' },
    { left: 'Friend', right: 'বন্ধু' },
    { left: 'Water', right: 'পানি' },
    { left: 'School', right: 'বিদ্যালয়' },
  ],
};

export const SUBJECT_ONE_WORD: Record<string, Array<{ question: string; answer: string; alternatives?: string[] }>> = {
  Math: [
    { question: 'যোগের চিহ্ন কোনটি?', answer: '+' },
    { question: 'বিয়োগের চিহ্ন কোনটি?', answer: '−', alternatives: ['-'] },
    { question: 'গুণের চিহ্ন কোনটি?', answer: '×', alternatives: ['x'] },
    { question: 'ভাগের চিহ্ন কোনটি?', answer: '÷', alternatives: ['/'] },
    { question: 'এক ডজনে কতটি হয়?', answer: '১২', alternatives: ['12'] },
    { question: 'ত্রিভুজের কয়টি বাহু থাকে?', answer: '৩', alternatives: ['3'] },
  ],
  Science: [
    { question: 'গাছের কোন অংশ মাটি থেকে পানি শোষণ করে?', answer: 'মূল' },
    { question: 'আমরা কোন গ্যাস ছাড়া বাঁচতে পারি না?', answer: 'অক্সিজেন' },
    { question: 'সূর্য কোন দিক থেকে ওঠে?', answer: 'পূর্ব' },
    { question: 'গাছের খাদ্য তৈরির প্রক্রিয়ার নাম কী?', answer: 'সালোকসংশ্লেষণ' },
    { question: 'আমাদের শরীরের জন্য কোন ভিটামিন সূর্যের আলো থেকে পাওয়া যায়?', answer: 'ভিটামিন ডি', alternatives: ['ডি'] },
  ],
  Islam: [
    { question: 'ইমান অর্থ কী?', answer: 'বিশ্বাস' },
    { question: 'দিনে কত ওয়াক্ত নামাজ ফরজ?', answer: '৫', alternatives: ['পাঁচ'] },
    { question: 'মুসলিমদের পবিত্র কিতাবের নাম কী?', answer: 'কুরআন' },
    { question: 'আল্লাহ কতজন?', answer: 'একজন', alternatives: ['এক'] },
    { question: 'নামাজে মুখ কোন দিকে করে দাঁড়াতে হয়?', answer: 'কাবা', alternatives: ['কাবার দিকে'] },
  ],
  Bangla: [
    { question: 'বাংলা বর্ণমালায় স্বরবর্ণ কতটি?', answer: '১১', alternatives: ['11'] },
    { question: 'বাংলাদেশের জাতীয় ফুল কী?', answer: 'শাপলা' },
    { question: 'বাংলাদেশের জাতীয় পাখি কী?', answer: 'দোয়েল' },
    { question: 'বাংলাদেশের জাতীয় পতাকার রং কী?', answer: 'সবুজ' },
    { question: 'বাংলাদেশের রাজধানীর নাম কী?', answer: 'ঢাকা' },
  ],
  English: [
    { question: 'What is the opposite of "big"?', answer: 'small' },
    { question: 'How many days are in a week?', answer: 'seven', alternatives: ['7'] },
    { question: 'What is the capital of Bangladesh?', answer: 'Dhaka' },
    { question: 'What do we say when we meet someone in the morning?', answer: 'Good morning' },
    { question: 'How many legs does a bird have?', answer: 'two', alternatives: ['2'] },
  ],
};
