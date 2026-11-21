import mongoose from 'mongoose';
import env from '../../config/env';
import { log } from '../../config/logger';
import { BookModel } from '../../database/models/Book.model';
import { BookChunkModel } from '../../database/models/BookChunk.model';
import { PracticeQuestionModel } from '../../database/models/PracticeQuestion.model';
import { PracticeQuestionSetModel } from '../../database/models/PracticeQuestionSet.model';
import { SettingModel } from '../../database/models/Setting.model';
import { AUTO_SEED_QUESTION_TYPES, buildChapterQuestions, questionTypeLabel, type SeedQuestion } from './auto-seed-question-builder';
import { listChaptersForBook } from './chapters.service';
import type { ChapterRef } from './types';

/**
 * Idempotent, book-grounded practice seeding.
 *
 * Every published book gets one published question set per chapter and per
 * question type, so a learner can immediately practise any chapter without an
 * admin authoring questions one by one. Questions are generated from the
 * chapter's own ingested text; answers stay deterministic.
 */

export const AUTO_SEED_KEY_PREFIX = 'sb-practice-v1';
export const AUTO_SEED_CREATED_BY = 'Shikhi Bondhu auto-seed';
const AUTO_SEED_MARKER_KEY = 'practice.autoSeedVersion';

export interface AutoSeedStats {
  books: number;
  chapters: number;
  setsCreated: number;
  setsKept: number;
  questionsCreated: number;
  skipped: boolean;
}

interface SetPlan {
  key: string;
  chapter: ChapterRef;
  questionType: (typeof AUTO_SEED_QUESTION_TYPES)[number];
  questions: SeedQuestion[];
  bookId: mongoose.Types.ObjectId;
  bookTitle: string;
  subject: string;
}

function setKey(bookId: string, chapterId: string, questionType: string): string {
  return `${AUTO_SEED_KEY_PREFIX}:${bookId}:${chapterId}:${questionType}`;
}

function safeTitle(value: string, max = 190): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

async function chapterText(bookId: mongoose.Types.ObjectId, chapter: ChapterRef): Promise<string> {
  const base = { bookId, pageType: { $ne: 'noise' } as const };
  const query: Record<string, unknown> =
    chapter.id && chapter.id !== 'general'
      ? { ...base, $or: [{ chapterId: chapter.id }, { chapterTitle: chapter.title }] }
      : // A book without chapter metadata (English For Today) starts its real
        // lessons after the contents pages; skip the front matter.
        { ...base, pageStart: { $gte: 13 } };

  const chunks = await BookChunkModel.find(query)
    .sort({ pageStart: 1, chunkIndex: 1 })
    .select('text normalizedText')
    .limit(180)
    .lean();

  const text = chunks
    // Prefer raw text: normalizedText is a search index and strips the
    // punctuation we need to split real sentences.
    .map((chunk) => String(chunk.text || chunk.normalizedText || ''))
    .filter(Boolean)
    .join('\n');

  // The first 80k characters are plenty for a Class 3 chapter and keep the
  // boot job comfortably fast.
  return text.slice(0, 80_000);
}

function buildSetPlan(
  bookId: mongoose.Types.ObjectId,
  bookTitle: string,
  subject: string,
  chapter: ChapterRef,
  questionType: (typeof AUTO_SEED_QUESTION_TYPES)[number],
  questions: SeedQuestion[]
): SetPlan {
  return {
    key: setKey(String(bookId), chapter.id, questionType),
    chapter,
    questionType,
    questions,
    bookId,
    bookTitle,
    subject,
  };
}

/**
 * Seeds questions for every published book/chapter/type that has no auto-seed
 * set yet. Safe to call on every boot: it only adds what is missing.
 */
export async function seedAutoPracticeQuestions(options: { force?: boolean } = {}): Promise<AutoSeedStats> {
  const stats: AutoSeedStats = {
    books: 0,
    chapters: 0,
    setsCreated: 0,
    setsKept: 0,
    questionsCreated: 0,
    skipped: false,
  };

  if (process.env.AUTO_SEED_PRACTICE === 'false') {
    stats.skipped = true;
    return stats;
  }

  // A version marker keeps every cold start cheap. Clear the marker or run the
  // CLI with --force when you intentionally want to rebuild the seeded sets.
  if (!options.force) {
    const marker = await SettingModel.findOne({ key: AUTO_SEED_MARKER_KEY }).select('value').lean();
    if (marker?.value === AUTO_SEED_KEY_PREFIX) {
      stats.skipped = true;
      return stats;
    }
  }

  const books = await BookModel.find({ publicationState: 'published', processingState: 'ready' })
    .select('_id title subject language chunkCount')
    .lean();

  const plans: SetPlan[] = [];

  for (const book of books) {
    if (!book._id || Number(book.chunkCount ?? 0) === 0) continue;
    const bookId = new mongoose.Types.ObjectId(String(book._id));
    let chapters: ChapterRef[] = [];
    try {
      chapters = await listChaptersForBook(String(bookId));
    } catch (error) {
      log.warn('Practice auto-seed skipped a book with no readable chapters', {
        bookId: String(bookId),
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (chapters.length === 0) continue;

    stats.books += 1;
    stats.chapters += chapters.length;
    const siblingTitles = chapters.map((chapter) => chapter.title);

    for (const [chapterIndex, chapter] of chapters.entries()) {
      let text = '';
      try {
        text = await chapterText(bookId, chapter);
      } catch (error) {
        log.warn('Practice auto-seed could not read a chapter', {
          bookId: String(bookId),
          chapter: chapter.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const questionsByType = buildChapterQuestions({
        bookTitle: String(book.title ?? ''),
        subject: String(book.subject ?? ''),
        language: String(book.language ?? ''),
        chapter,
        chapterText: text,
        siblingTitles: siblingTitles.filter((title) => title !== chapter.title),
        chapterIndex,
      });

      for (const questionType of AUTO_SEED_QUESTION_TYPES) {
        const questions = (questionsByType[questionType] ?? []).filter(
          (question) => question.payload && question.answer && Object.keys(question.payload).length > 0
        );
        if (questions.length === 0) continue;
        plans.push(buildSetPlan(bookId, String(book.title ?? ''), String(book.subject ?? ''), chapter, questionType, questions));
      }
    }
  }

  if (plans.length === 0) {
    return stats;
  }

  if (options.force) {
    const existing = await PracticeQuestionSetModel.find({ createdBy: AUTO_SEED_CREATED_BY }).select('_id').lean();
    const ids = existing.map((set) => set._id);
    if (ids.length > 0) {
      await PracticeQuestionModel.deleteMany({ setId: { $in: ids } });
      await PracticeQuestionSetModel.deleteMany({ _id: { $in: ids } });
    }
  }

  const existingBefore = await PracticeQuestionSetModel.find({ autoSeedKey: { $in: plans.map((plan) => plan.key) } })
    .select('autoSeedKey')
    .lean();
  const existingKeys = new Set(existingBefore.map((set) => String(set.autoSeedKey)));
  stats.setsKept = existingKeys.size;

  const newPlans = plans.filter((plan) => !existingKeys.has(plan.key));
  if (newPlans.length > 0) {
    const now = new Date();
    const setDocs = newPlans.map((plan) => {
      const marks = plan.questions.reduce((sum, question) => sum + question.marks, 0);
      return {
        title: safeTitle(`${plan.chapter.title} · ${questionTypeLabel(plan.questionType)}`),
        bookId: plan.bookId,
        bookTitle: plan.bookTitle,
        subject: plan.subject,
        chapters: [{ id: plan.chapter.id, title: plan.chapter.title, order: plan.chapter.order }],
        questionType: plan.questionType,
        difficulty: 'easy',
        instructions: `Book-based ${questionTypeLabel(plan.questionType).toLowerCase()} practice from ${plan.bookTitle}. Auto-prepared and editable in the admin panel.`,
        marksPerQuestion: 1,
        totalQuestions: plan.questions.length,
        totalMarks: marks,
        practiceModeEnabled: true,
        examModeEnabled: true,
        examDurationMinutes: 10,
        negativeMarking: 0,
        allowUnanswered: false,
        publicationState: 'published',
        createdBy: AUTO_SEED_CREATED_BY,
        publishedAt: now,
        autoSeedKey: plan.key,
      };
    });

    // Chunk the bulkWrite so a large catalogue never sends one huge command.
    for (let index = 0; index < setDocs.length; index += 100) {
      const slice = setDocs.slice(index, index + 100);
      try {
        await PracticeQuestionSetModel.bulkWrite(
          slice.map((doc) => ({
            updateOne: {
              filter: { autoSeedKey: doc.autoSeedKey },
              update: { $setOnInsert: doc },
              upsert: true,
            },
          })) as never,
          { ordered: false }
        );
      } catch (error) {
        // A concurrent cold start may have created the same keys. The unique
        // autoSeedKey index keeps the data correct; the next query will find it.
        log.warn('Practice auto-seed bulk insert retried after a concurrent write', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const allSets = await PracticeQuestionSetModel.find({ autoSeedKey: { $in: plans.map((plan) => plan.key) } })
    .select('_id autoSeedKey totalQuestions')
    .lean();
  const setIdByKey = new Map(allSets.map((set) => [String(set.autoSeedKey), String(set._id)]));

  const setIds = allSets.map((set) => set._id);
  const counts = await PracticeQuestionModel.aggregate<{ _id: unknown; count: number }>([
    { $match: { setId: { $in: setIds } } },
    { $group: { _id: '$setId', count: { $sum: 1 } } },
  ]);
  const countBySetId = new Map(counts.map((row) => [String(row._id), Number(row.count ?? 0)]));

  const questionDocs: Array<Record<string, unknown>> = [];
  for (const plan of plans) {
    const setId = setIdByKey.get(plan.key);
    if (!setId) continue;
    if (!options.force && (countBySetId.get(setId) ?? 0) > 0) continue;
    plan.questions.forEach((question, index) => {
      questionDocs.push({
        setId: new mongoose.Types.ObjectId(setId),
        bookId: plan.bookId,
        chapterId: question.chapterId,
        chapterTitle: question.chapterTitle,
        questionType: question.questionType,
        order: index + 1,
        marks: question.marks,
        payload: question.payload,
        answer: question.answer,
        alternatives: question.alternatives,
        autoSeedKey: `${plan.key}:q${index + 1}`,
      });
    });
  }

  if (questionDocs.length > 0) {
    for (let index = 0; index < questionDocs.length; index += 200) {
      try {
        await PracticeQuestionModel.insertMany(questionDocs.slice(index, index + 200), { ordered: false });
      } catch (error) {
        log.warn('Practice auto-seed skipped duplicate questions from a concurrent write', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  stats.setsCreated = Math.max(0, allSets.length - stats.setsKept);
  stats.questionsCreated = questionDocs.length;

  // Keep the denormalized totals honest when questions were just inserted.
  const refreshedCounts = await PracticeQuestionModel.aggregate<{ _id: unknown; count: number; marks: number }>([
    { $match: { setId: { $in: setIds } } },
    { $group: { _id: '$setId', count: { $sum: 1 }, marks: { $sum: '$marks' } } },
  ]);
  if (refreshedCounts.length > 0) {
    await PracticeQuestionSetModel.bulkWrite(
      refreshedCounts.map((row) => ({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { totalQuestions: Number(row.count ?? 0), totalMarks: Number(row.marks ?? 0) } },
        },
      })),
      { ordered: false }
    );
  }

  await SettingModel.updateOne(
    { key: AUTO_SEED_MARKER_KEY },
    {
      $set: {
        value: AUTO_SEED_KEY_PREFIX,
        group: 'practice',
        description: 'Version of the automatically generated, book-based practice question bank.',
      },
    },
    { upsert: true }
  ).catch(() => undefined);

  return stats;
}

/** Runs the seeder detached from the request path with a hard time budget. */
export function schedulePracticeAutoSeed(): void {
  if (env.isDevelopment && process.env.AUTO_SEED_PRACTICE === 'false') return;
  const job = seedAutoPracticeQuestions()
    .then((stats) => {
      if (stats.setsCreated > 0 || stats.questionsCreated > 0) {
        log.info('Practice auto-seed completed', stats as unknown as Record<string, unknown>);
      }
    })
    .catch((error: unknown) => {
      log.warn('Practice auto-seed failed (practise will use existing sets)', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  const timer = setTimeout(() => {
    log.warn('Practice auto-seed is still running after 25s; it will finish in the background');
  }, 25_000);
  timer.unref?.();
  void job.finally(() => clearTimeout(timer));
}
