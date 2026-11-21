import type { PracticeQuestionType } from '../../constants';
import type { ChapterRef } from './types';
import {
  SUBJECT_MATCHING_PAIRS,
  SUBJECT_ONE_WORD,
  TITLE_TRANSLATIONS,
  TRANSLATION_PAIRS,
  type TranslationPair,
} from './translation-bank';

/**
 * Content-driven question builder for the practice auto-seed.
 *
 * The builder never calls an LLM. It extracts clean sentences and key terms
 * from the real textbook chapter, then turns them into the seven supported
 * question shapes. Every answer is derived from the chapter text (or a small
 * hand-checked translation/one-word bank), so a child is never asked to answer
 * something that is not in the book.
 */

export interface SeedChapterContext {
  bookTitle: string;
  subject: string;
  language?: string;
  chapter: ChapterRef;
  chapterText: string;
  siblingTitles: string[];
  /** 1-based position used to rotate fallback banks. */
  chapterIndex: number;
}

export interface SeedQuestion {
  questionType: PracticeQuestionType;
  marks: number;
  payload: Record<string, unknown>;
  answer: Record<string, unknown>;
  alternatives: string[];
  chapterId: string;
  chapterTitle: string;
}

interface TextInfo {
  bangla: boolean;
  sentences: string[];
  keywords: string[];
  titleKeywords: string[];
}

const SENTENCE_MIN = 24;
const SENTENCE_MAX = 190;
const MAX_CHAPTER_TEXT = 80_000;

const STOP_BANGLA = new Set([
  'আর', 'এবং', 'কিন্তু', 'তবে', 'যে', 'যা', 'এই', 'সেই', 'একটি', 'একটা', 'একজন', 'আমরা', 'তারা', 'তুমি', 'আমি',
  'তাহলে', 'কেন', 'কীভাবে', 'কোথায়', 'কখন', 'কত', 'হয়', 'হবে', 'হলো', 'হল', 'করে', 'কর', 'করো', 'করেন', 'করব',
  'করেছি', 'করেছ', 'করেছে', 'করি', 'থেকে', 'জন্য', 'সঙ্গে', 'মধ্যে', 'উপর', 'নিচে', 'আগে', 'পরে', 'খুব', 'বেশ',
  'অনেক', 'কিছু', 'সব', 'নয়', 'না', 'হ্যাঁ', 'ও', 'বা', 'এর', 'তার', 'তাদের', 'আমাদের', 'তোমার', 'আমার', 'এসব',
  'সেসব', 'এখানে', 'সেখানে', 'যেমন', 'কারণ', 'যদি', 'তাই', 'দিয়ে', 'দ্বারা', 'প্রতি', 'মতো', 'পর্যন্ত', 'ওপর',
  'ভিতরে', 'বাইরে', 'একই', 'অন্য', 'সকল', 'সবাই', 'কেউ', 'কিছুই', 'থাকে', 'থাকেন', 'থাকি', 'যায়', 'যান', 'যাব',
  'পাওয়া', 'পায়', 'পান', 'হতে', 'হয়েছে', 'হয়তো', 'নেওয়া', 'নেয়', 'দেওয়া', 'দেয়', 'বলে', 'বলেন', 'বলি', 'এবং',
  'ইত্যাদি', 'তিনি', 'তারা', 'এটি', 'সেটি', 'একে', 'তাকে', 'তোমাকে', 'আমাকে', 'নিজের', 'নিজে', 'মাধ্যমে', 'অনুযায়ী',
  'কাজে', 'সময়', 'ধরনের', 'রকম', 'রকমের', 'একটি', 'একটা', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'পাঠ', 'অধ্যায়',
]);

const STOP_ENGLISH = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'these', 'those', 'from', 'into', 'about', 'have', 'has', 'had',
  'are', 'was', 'were', 'will', 'would', 'can', 'could', 'should', 'you', 'your', 'our', 'their', 'his', 'her',
  'they', 'them', 'there', 'here', 'what', 'when', 'where', 'who', 'why', 'how', 'not', 'but', 'all', 'any',
  'some', 'many', 'more', 'most', 'very', 'also', 'then', 'than', 'because', 'been', 'being', 'does', 'did',
  'doing', 'each', 'other', 'such', 'only', 'just', 'now', 'out', 'off', 'over', 'under', 'again', 'once',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
]);

const BOILERPLATE = /জাতীয় শিক্ষাক্রম|পাঠ্যপুস্তক বোর্ড|প্রকাশক|প্রথম সংস্করণ|পরিমার্জিত সংস্করণ|পুনর্মুদ্রণ|মুদ্রণে|সর্বস্বত্ব|ISBN|All rights reserved|Published by|Printed by|For free distribution|Ministry of Education|National Curriculum/i;

/** Exercise pages are full of instructions, not sentences to learn from. */
const EXERCISE_MARKERS =
  /শূন্যস্থান|তালিকা তৈরি|বর্ণনা করো|মিল করো|বেছে নাও|সঠিক উত্তর|উত্তর লেখো|লেখো|লিখি|পূর্ণ করো|নিচের|প্রশ্ন \d|পাঠ \d|অধ্যায় \d|\bWrite\b|\bMatch\b|\bChoose\b|\bFill\b|\bAnswer\b|\bComplete\b|\bTick\b|Let's practise|Activity [A-Z]|Exercise \d|Lesson \d|Unit \d|Page \d/i;

const ANTONYM_PAIRS_BANGLA: Array<[string, string]> = [
  ['বড়', 'ছোট'], ['উপরে', 'নিচে'], ['দিন', 'রাত'], ['আগে', 'পরে'], ['ভালো', 'খারাপ'], ['গরম', 'ঠান্ডা'],
  ['শুরু', 'শেষ'], ['সত্য', 'মিথ্যা'], ['অনেক', 'কম'], ['নতুন', 'পুরোনো'], ['জীবিত', 'মৃত'], ['ভরা', 'খালি'],
  ['উচ্চ', 'নিচু'], ['হালকা', 'ভারী'], ['শুকনো', 'ভেজা'], ['দূর', 'কাছে'], ['আলো', 'অন্ধকার'], ['সহজ', 'কঠিন'],
];

const ANTONYM_PAIRS_ENGLISH: Array<[string, string]> = [
  ['big', 'small'], ['hot', 'cold'], ['day', 'night'], ['before', 'after'], ['good', 'bad'], ['start', 'end'],
  ['true', 'false'], ['many', 'few'], ['old', 'new'], ['full', 'empty'], ['high', 'low'], ['light', 'heavy'],
  ['dry', 'wet'], ['far', 'near'], ['easy', 'hard'], ['above', 'below'],
];

const GENERIC_DISTRACTORS_BN = ['নদী', 'বই', 'স্কুল', 'পরিবার', 'গাছ', 'পানি', 'আকাশ', 'বন্ধু', 'শিক্ষক', 'মাটি', 'ফুল', 'পাখি'];
const GENERIC_DISTRACTORS_EN = ['school', 'family', 'water', 'river', 'friend', 'teacher', 'book', 'plant', 'animal', 'garden', 'morning', 'village'];

const TYPE_LABELS: Record<PracticeQuestionType, string> = {
  mcq: 'Multiple choice',
  fill_blank: 'Fill in the blanks',
  true_false: 'True or false',
  matching: 'Matching',
  one_word: 'One word answer',
  rearrange: 'Rearrange',
  translation: 'Translation',
};

export const AUTO_SEED_QUESTION_TYPES: PracticeQuestionType[] = [
  'mcq',
  'true_false',
  'matching',
  'one_word',
  'translation',
];

export function questionTypeLabel(type: PracticeQuestionType): string {
  return TYPE_LABELS[type];
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

function tidy(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\d.)\-–—•]+/, '')
    .trim();
}

function isBanglaText(text: string): boolean {
  const bangla = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return bangla > latin;
}

function cleanEnough(text: string, bangla: boolean): boolean {
  if (text.length < SENTENCE_MIN || text.length > SENTENCE_MAX) return false;
  if (BOILERPLATE.test(text)) return false;
  if (EXERCISE_MARKERS.test(text)) return false;
  if (/\.{4,}|_{3,}|\|/.test(text)) return false;
  if ((text.match(/\d/g) ?? []).length > 10) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;
  const singleLetterWords = words.filter((word) => word.replace(/[^\u0980-\u09FFA-Za-z]/g, '').length <= 1).length;
  if (singleLetterWords > Math.max(2, Math.floor(words.length * 0.2))) return false;
  const allowed = bangla
    ? /[\u0980-\u09FFA-Za-z0-9\s.,!?;:'"()\-–—]/
    : /[A-Za-z0-9\s.,!?;:'"()\-–—]/;
  const compact = text.replace(/\s/g, '');
  if (compact.length < 20) return false;
  const allowedCount = (compact.match(new RegExp(allowed, 'g')) ?? []).length;
  // OCR noise usually has lots of symbols. Keep only fairly clean lines.
  return allowedCount / compact.length >= 0.9;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '\n')
    .split(/(?<=[।!?])\s+|(?<=\.)\s+(?=[A-Z\u0980-\u09FF])|\n+/)
    .filter(Boolean);
}

/** Removes OCR chapter/page headings that get glued to the first sentence. */
function stripHeading(raw: string, chapterTitle: string): string {
  let sentence = tidy(raw)
    .replace(/^পাঠ\s*[০-৯\d]+\s*/, '')
    .replace(/^\(?\s*অধ্যায়\s*[০-৯\d]+\s*\)?\s*/, '')
    .replace(/^Unit\s*[-–]?\s*\d+\s*/i, '')
    .replace(/^Lesson\s*\d+\s*[:.\-]?\s*/i, '')
    .replace(/^Page\s*\d+\s*/i, '');
  const title = tidy(chapterTitle);
  if (title && sentence.startsWith(title)) sentence = sentence.slice(title.length).trim();
  return tidy(sentence);
}

function sentenceScore(sentence: string, bangla: boolean): number {
  const length = sentence.length;
  let score = 0;
  if (length >= 45 && length <= 150) score += 5;
  else if (length >= 32 && length <= 175) score += 3;
  if (/[।.!?]$/.test(sentence)) score += 1;
  if (bangla ? /[\u0980-\u09FF]/.test(sentence) : /[A-Za-z]/.test(sentence)) score += 1;
  if (!/\d/.test(sentence)) score += 1;
  if ((sentence.match(/,/g) ?? []).length > 3) score -= 2;
  return score;
}

function keywordTokens(text: string, bangla: boolean): string[] {
  const pattern = bangla ? /[\u0980-\u09FF]{3,}/g : /[A-Za-z]{4,}/g;
  return (text.match(pattern) ?? []).map((word) => word.trim()).filter(Boolean);
}

function buildTextInfo(context: SeedChapterContext): TextInfo {
  const text = context.chapterText.slice(0, MAX_CHAPTER_TEXT);
  const bangla = isBanglaText(`${context.chapter.title} ${text}`);
  const seen = new Set<string>();
  const sentences = splitSentences(text)
    .map((sentence) => stripHeading(sentence, context.chapter.title))
    .filter((sentence) => cleanEnough(sentence, bangla))
    .filter((sentence) => {
      const key = sentence.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => sentenceScore(b, bangla) - sentenceScore(a, bangla))
    .slice(0, 24);

  const titleKeywords = keywordTokens(context.chapter.title, bangla);
  const frequency = new Map<string, number>();
  for (const word of keywordTokens(text, bangla)) {
    const key = bangla ? word : word.toLowerCase();
    frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }
  const stop = bangla ? STOP_BANGLA : STOP_ENGLISH;
  const keywords = Array.from(frequency.entries())
    .filter(([word, count]) => {
      if (count < 1) return false;
      if (stop.has(bangla ? word : word.toLowerCase())) return false;
      return bangla ? word.length >= 3 : word.length >= 4;
    })
    .sort((a, b) => {
      const aTitle = titleKeywords.some((word) => (bangla ? word === a[0] : word.toLowerCase() === a[0])) ? 1 : 0;
      const bTitle = titleKeywords.some((word) => (bangla ? word === b[0] : word.toLowerCase() === b[0])) ? 1 : 0;
      return bTitle - aTitle || b[1] - a[1] || b[0].length - a[0].length;
    })
    .map(([word]) => word)
    .filter((word, index, all) => all.indexOf(word) === index)
    .slice(0, 28);

  return { bangla, sentences, keywords, titleKeywords };
}

function seededRandom(seedText: string): () => number {
  let state = Array.from(seedText).reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], seedText: string): T[] {
  const random = seededRandom(seedText);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function unique<T>(items: T[]): T[] {
  return items.filter((item, index, all) => all.indexOf(item) === index);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function chooseBlankWord(sentence: string, info: TextInfo): string | null {
  const words = keywordTokens(sentence, info.bangla);
  if (words.length === 0) return null;
  const candidates = words
    .filter((word) => {
      if (info.bangla ? word.length < 3 : word.length < 4) return false;
      if ((info.bangla ? STOP_BANGLA : STOP_ENGLISH).has(info.bangla ? word : word.toLowerCase())) return false;
      // Only replace a word that occurs once, so the answer is unambiguous.
      return sentence.split(word).length === 2;
    })
    .sort((a, b) => b.length - a.length);
  return candidates[0] ?? null;
}

function replaceWithBlank(sentence: string, word: string): string {
  return sentence.replace(word, '{{1}}');
}

function numericDistractors(info: TextInfo, count: number): string[] {
  const numeric = info.keywords.filter((word) => /^\d+$/.test(word));
  const generic = info.bangla ? ['১', '২', '৩', '৪', '৫'] : ['1', '2', '3', '4', '5'];
  return unique([...numeric, ...generic]).slice(0, count);
}

function optionPool(info: TextInfo, correct: string, count: number): string[] {
  const correctNorm = info.bangla ? correct : correct.toLowerCase();
  const pool = info.keywords
    .filter((word) => (info.bangla ? word !== correctNorm : word.toLowerCase() !== correctNorm))
    .filter((word) => Math.abs(word.length - correct.length) <= 5);
  const fallback = info.bangla ? GENERIC_DISTRACTORS_BN : GENERIC_DISTRACTORS_EN;
  const distractors = unique([...pool, ...fallback])
    .filter((word) => (info.bangla ? word !== correctNorm : word.toLowerCase() !== correctNorm))
    .slice(0, count);
  return [correct, ...distractors];
}

function questionBase(context: SeedChapterContext, type: PracticeQuestionType, payload: Record<string, unknown>, answer: Record<string, unknown>, alternatives: string[] = []): SeedQuestion {
  return {
    questionType: type,
    marks: 1,
    payload,
    answer,
    alternatives,
    chapterId: context.chapter.id,
    chapterTitle: context.chapter.title,
  };
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function buildMcq(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const questions: SeedQuestion[] = [];
  const used = new Set<string>();

  for (const sentence of info.sentences) {
    if (questions.length >= 4) break;
    const word = chooseBlankWord(sentence, info);
    if (!word || used.has(sentence)) continue;
    used.add(sentence);
    const options = shuffle(optionPool(info, word, 3), `${sentence}|${word}`);
    const correctIndex = options.findIndex((option) => (info.bangla ? option === word : option.toLowerCase() === word.toLowerCase()));
    if (correctIndex < 0) continue;
    const prompt = info.bangla
      ? `সঠিক শব্দটি বেছে নাও: ${replaceWithBlank(sentence, word).replace('{{1}}', '______')}`
      : `Choose the correct word: ${replaceWithBlank(sentence, word).replace('{{1}}', '______')}`;
    questions.push(
      questionBase(context, 'mcq', { question: prompt, options }, { correctIndex })
    );
  }

  if (questions.length < 3 && context.siblingTitles.length > 0) {
    const correctTitle = context.chapter.title;
    const options = shuffle(
      unique([correctTitle, ...context.siblingTitles.filter((title) => title !== correctTitle)]).slice(0, 4),
      `title|${correctTitle}`
    );
    questions.push(
      questionBase(
        context,
        'mcq',
        {
          question: info.bangla ? `এই পাঠের শিরোনাম কোনটি?` : `What is the title of this lesson?`,
          options,
        },
        { correctIndex: options.indexOf(correctTitle) }
      )
    );
  }

  return questions.slice(0, 5);
}

function buildFillBlank(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const questions: SeedQuestion[] = [];
  for (const sentence of info.sentences) {
    if (questions.length >= 4) break;
    const word = chooseBlankWord(sentence, info);
    if (!word) continue;
    questions.push(
      questionBase(
        context,
        'fill_blank',
        { text: replaceWithBlank(sentence, word) },
        { blanks: [{ accepted: unique([word, titleCase(word)]) }] }
      )
    );
  }

  if (questions.length === 0) {
    const word = context.subject === 'English' ? 'book' : 'বই';
    const text = info.bangla ? `আমি প্রতিদিন {{1}} পড়ি।` : `I read a {{1}} every day.`;
    questions.push(
      questionBase(context, 'fill_blank', { text }, { blanks: [{ accepted: [word] }] })
    );
  }

  return questions;
}

function mutateSentence(sentence: string, info: TextInfo): string | null {
  const numberMatch = sentence.match(/[0-9]+|[০-৯]+/);
  if (numberMatch) {
    const raw = numberMatch[0];
    const ascii = raw.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
    const nextValue = Number(ascii) + 1;
    if (Number.isFinite(nextValue)) {
      const replacement = info.bangla
        ? String(nextValue).replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)])
        : String(nextValue);
      return sentence.replace(raw, replacement);
    }
  }

  const pairs = info.bangla ? ANTONYM_PAIRS_BANGLA : ANTONYM_PAIRS_ENGLISH;
  for (const [left, right] of pairs) {
    if (sentence.includes(left)) return sentence.replace(left, right);
    if (sentence.includes(right)) return sentence.replace(right, left);
  }
  return null;
}

function questionLike(sentence: string, bangla: boolean): boolean {
  if (/[?]\s*$/.test(sentence)) return true;
  if (bangla) return /^(কী|কে|কেন|কোথায়|কখন|কত|কতটি|কীভাবে|কোনটি|কোন)\b/.test(sentence);
  return /^(what|who|why|where|when|how|which|do|does|did|can|could|is|are|was|were)\b/i.test(sentence);
}

function buildTrueFalse(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const questions: SeedQuestion[] = [];
  const statements = new Set<string>();
  const trueSentences = info.sentences.filter((sentence) => !questionLike(sentence, info.bangla)).slice(0, 4);

  trueSentences.forEach((sentence, index) => {
    if (questions.length >= 3 || statements.has(sentence)) return;
    statements.add(sentence);
    questions.push(questionBase(context, 'true_false', { statement: sentence }, { value: true }));
    if (index < 2) {
      const mutated = mutateSentence(sentence, info);
      if (mutated && mutated !== sentence && !statements.has(mutated)) {
        statements.add(mutated);
        questions.push(questionBase(context, 'true_false', { statement: mutated }, { value: false }));
      }
    }
  });

  if (questions.length < 4) {
    const sibling = context.siblingTitles[context.chapterIndex % Math.max(context.siblingTitles.length, 1)] ?? '';
    if (sibling && sibling !== context.chapter.title) {
      const statement = info.bangla
        ? `এই পাঠে '${sibling}' সম্পর্কে বলা হয়েছে।`
        : `This lesson is about "${sibling}".`;
      questions.push(questionBase(context, 'true_false', { statement }, { value: false }));
    } else {
      questions.push(
        questionBase(
          context,
          'true_false',
          {
            statement: info.bangla
              ? `'${context.chapter.title}' অধ্যায়টি ${context.bookTitle} বইয়ে আছে।`
              : `The lesson "${context.chapter.title}" is in the book ${context.bookTitle}.`,
          },
          { value: true }
        )
      );
    }
  }

  return questions.slice(0, 5);
}

function definitionPairs(info: TextInfo): Array<{ left: string; right: string }> {
  const pairs: Array<{ left: string; right: string }> = [];
  const seen = new Set<string>();
  for (const sentence of info.sentences) {
    const match = info.bangla
      ? sentence.match(/([^,।]{2,42}?)\s*(?:হলো|হল|বলে|বলা হয়|এর অর্থ|অর্থ হলো)\s*([^।]{3,72})/)
      : sentence.match(/([A-Z][^,.]{1,42}?)\s+(?:is|are|means|refers to)\s+([^.]{3,72})/);
    if (!match) continue;
    const left = tidy(match[1]).replace(/^(তবে|আর|এবং|তাই)\s+/, '');
    const right = tidy(match[2]).replace(/[।.]$/, '');
    if (!left || !right || left.length < 2 || right.length < 3) continue;
    const key = left.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ left, right });
    if (pairs.length >= 4) break;
  }
  return pairs;
}

function snippetAroundKeyword(sentence: string, keyword: string, maxWords = 11): string {
  const words = tidy(sentence).split(/\s+/);
  const index = words.findIndex((word) => word.includes(keyword));
  if (index < 0) return words.slice(0, maxWords).join(' ');
  const start = Math.max(0, index - 4);
  const end = Math.min(words.length, start + maxWords);
  return words.slice(start, end).join(' ');
}

function buildMatching(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const pairs: Array<{ left: string; right: string }> = [];
  const addPair = (left: string, right: string): void => {
    const cleanLeft = tidy(left);
    const cleanRight = tidy(right);
    if (!cleanLeft || !cleanRight) return;
    if (pairs.some((pair) => pair.left === cleanLeft || pair.right === cleanRight)) return;
    pairs.push({ left: cleanLeft, right: cleanRight });
  };

  // Start with real chapter sentences: match the sentence to its missing word.
  for (const sentence of info.sentences) {
    if (pairs.length >= 3) break;
    const word = chooseBlankWord(sentence, info);
    if (!word) continue;
    const blanked = replaceWithBlank(sentence, word).replace('{{1}}', '______');
    if (blanked.length > 170) continue;
    addPair(blanked, word);
  }

  for (const pair of definitionPairs(info)) {
    if (pairs.length >= 4) break;
    addPair(pair.left, pair.right);
  }

  if (pairs.length < 4) {
    const fallback = SUBJECT_MATCHING_PAIRS[context.subject] ?? SUBJECT_MATCHING_PAIRS.English;
    const rotated = [...fallback.slice(context.chapterIndex % fallback.length), ...fallback.slice(0, context.chapterIndex % fallback.length)];
    for (const pair of rotated) {
      if (pairs.length >= 4) break;
      addPair(pair.left, pair.right);
    }
  }

  if (pairs.length < 4) {
    for (const keyword of info.keywords) {
      if (pairs.length >= 4) break;
      const sentence = info.sentences.find((candidate) => candidate.includes(keyword));
      if (!sentence) continue;
      addPair(keyword, snippetAroundKeyword(sentence, keyword));
    }
  }

  const finalPairs = pairs.slice(0, 4);
  if (finalPairs.length < 2) return [];

  const left = finalPairs.map((pair, index) => ({ id: `l${index}`, text: pair.left }));
  const rightOrder = finalPairs.map((pair, index) => ({ id: `r${index}`, text: pair.right }));
  const right = shuffle(rightOrder, finalPairs.map((pair) => `${pair.left}|${pair.right}`).join('#'));
  const answerPairs = finalPairs.map((pair, index) => ({
    leftId: left[index].id,
    rightId: right.find((item) => item.text === pair.right)?.id ?? right[index].id,
  }));

  return [
    questionBase(
      context,
      'matching',
      {
        question: info.bangla ? 'বাম দিকের সঙ্গে ডান দিকের সঠিক মিল করো।' : 'Match Column A with the correct item in Column B.',
        left,
        right,
      },
      { pairs: answerPairs }
    ),
  ];
}

function buildOneWord(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const questions: SeedQuestion[] = [];
  const seen = new Set<string>();

  for (const sentence of info.sentences) {
    if (questions.length >= 2) break;
    const word = chooseBlankWord(sentence, info);
    if (!word || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    questions.push(
      questionBase(
        context,
        'one_word',
        {
          question: info.bangla
            ? `এক শব্দে উত্তর লেখো: ${replaceWithBlank(sentence, word).replace('{{1}}', '______')}`
            : `Answer in one word: ${replaceWithBlank(sentence, word).replace('{{1}}', '______')}`,
        },
        { accepted: unique([word, titleCase(word)]) }
      )
    );
  }

  const bank = SUBJECT_ONE_WORD[context.subject] ?? SUBJECT_ONE_WORD.English;
  const rotated = [...bank.slice(context.chapterIndex % bank.length), ...bank.slice(0, context.chapterIndex % bank.length)];
  for (const item of rotated) {
    if (questions.length >= 4) break;
    if (seen.has(item.answer.toLowerCase())) continue;
    seen.add(item.answer.toLowerCase());
    questions.push(
      questionBase(
        context,
        'one_word',
        { question: item.question },
        { accepted: unique([item.answer, ...(item.alternatives ?? [])]) },
        item.alternatives ?? []
      )
    );
  }

  return questions;
}

function buildRearrange(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const questions: SeedQuestion[] = [];
  const sentenceCandidates = info.sentences
    .map((sentence) => {
      const words = sentence
        .replace(/[।.!?]+$/g, '')
        .split(/\s+/)
        .map((word) => word.replace(/^[,;:"()]+|[,;:"()]+$/g, ''))
        .filter(Boolean);
      return { sentence, words };
    })
    .filter(({ words }) => words.length >= 4 && words.length <= 10)
    .slice(0, 3);

  for (const { sentence, words } of sentenceCandidates) {
    const items = words.map((text, index) => ({ id: `w${index}`, text }));
    const shuffled = shuffle(items, sentence);
    questions.push(
      questionBase(
        context,
        'rearrange',
        {
          question: info.bangla ? 'শব্দগুলো সঠিক ক্রমে সাজাও।' : 'Put the words in the correct order.',
          items: shuffled,
        },
        { order: items.map((item) => item.id) }
      )
    );
  }

  if (questions.length === 0) {
    const fallbackSentence = info.bangla
      ? `${context.chapter.title} এই বইয়ের একটি পাঠ`
      : `${context.chapter.title} is a lesson in this book`;
    const words = fallbackSentence.split(/\s+/);
    const items = words.map((text, index) => ({ id: `w${index}`, text }));
    questions.push(
      questionBase(
        context,
        'rearrange',
        {
          question: info.bangla ? 'শব্দগুলো সঠিক ক্রমে সাজাও।' : 'Put the words in the correct order.',
          items: shuffle(items, fallbackSentence),
        },
        { order: items.map((item) => item.id) }
      )
    );
  }

  return questions;
}

function translationPairsFor(context: SeedChapterContext, info: TextInfo): TranslationPair[] {
  const found: TranslationPair[] = [];
  const haystack = `${context.chapter.title} ${context.chapterText}`.toLowerCase();
  const matches = TRANSLATION_PAIRS.filter((pair) => {
    if (pair.subject && pair.subject !== context.subject) return false;
    const needle = info.bangla ? pair.bn : pair.en;
    return haystack.includes(needle.toLowerCase());
  });
  for (const pair of matches) {
    if (!found.some((existing) => existing.en === pair.en)) found.push(pair);
  }

  // The chapter title is a reliable fallback, but short vocabulary found in
  // the chapter is friendlier for a Class 3 learner, so it comes first.
  const title = TITLE_TRANSLATIONS.find((pair) => pair.bn === context.chapter.title);
  if (title && !found.some((existing) => existing.en === title.en)) {
    found.push({ bn: title.bn, en: title.en, subject: context.subject });
  }

  if (found.length < 3) {
    const subjectPairs = TRANSLATION_PAIRS.filter((pair) => pair.subject === context.subject);
    for (const pair of subjectPairs) {
      if (found.length >= 3) break;
      if (!found.some((existing) => existing.en === pair.en)) found.push(pair);
    }
  }

  return found;
}

function buildTranslation(context: SeedChapterContext, info: TextInfo): SeedQuestion[] {
  const pairs = translationPairsFor(context, info);
  // The imported Bengali-medium books currently carry language: 'en' in the
  // catalogue, so translation direction is decided by subject, not that field.
  const englishBook = context.subject === 'English';
  const sourceLanguage = englishBook ? 'en' : 'bn';
  const targetLanguage = englishBook ? 'bn' : 'en';
  const questions: SeedQuestion[] = [];

  for (const pair of pairs) {
    if (questions.length >= 4) break;
    const source = englishBook ? pair.en : pair.bn;
    const target = englishBook ? pair.bn : pair.en;
    const alternatives = englishBook ? pair.bnAlternatives ?? [] : pair.enAlternatives ?? [];
    const accepted = unique([target, ...alternatives]);
    questions.push(
      questionBase(
        context,
        'translation',
        {
          source,
          sourceLanguage,
          targetLanguage,
          question: englishBook ? 'Translate this into Bangla.' : 'Translate this into English.',
        },
        { accepted },
        alternatives
      )
    );
  }

  return questions;
}

/** Builds all seven question sets' questions for one chapter. */
export function buildChapterQuestions(context: SeedChapterContext): Record<PracticeQuestionType, SeedQuestion[]> {
  const info = buildTextInfo(context);
  return {
    mcq: buildMcq(context, info),
    fill_blank: buildFillBlank(context, info),
    true_false: buildTrueFalse(context, info),
    matching: buildMatching(context, info),
    one_word: buildOneWord(context, info),
    rearrange: buildRearrange(context, info),
    translation: buildTranslation(context, info),
  };
}
