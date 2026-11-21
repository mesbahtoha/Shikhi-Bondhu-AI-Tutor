import { ChatLogModel, ChunkModel, ConversationModel, MessageModel, NoticeModel, RefreshTokenModel, AIUsageModel, BookModel, BookChunkModel, BookUploadSessionModel, BookUploadChunkModel, IngestionJobModel, PracticeQuestionSetModel, PracticeQuestionModel, PracticeAttemptModel, DocumentationContentModel, DocumentationVersionModel } from '../database/models';

interface TextIndexInfo {
  name?: string;
  key: Record<string, unknown>;
  language_override?: string;
  default_language?: string;
}

interface TextIndexCollection {
  indexes: () => Promise<TextIndexInfo[]>;
  dropIndex: (name: string) => Promise<unknown>;
  createIndex: (keys: Record<string, unknown>, options: Record<string, unknown>) => Promise<unknown>;
}

const TEXT_INDEX_DEFAULTS = {
  default_language: 'none',
  // MongoDB text search has no Bengali support. Never use the document's
  // `language: 'bn'` field as the override, or every insert is rejected with
  // "language override unsupported: bn".
  language_override: 'textSearchLanguage',
} as const;

/**
 * Ensures a text index has the language-safe options. Existing indexes built
 * with MongoDB's default `language_override: 'language'` are dropped and
 * recreated once, which repairs deployments created before this fix.
 */
async function ensureTextIndex(
  collection: TextIndexCollection,
  keys: Record<string, unknown>,
  name: string
): Promise<void> {
  let existing: TextIndexInfo[] = [];
  try {
    existing = (await collection.indexes()) as unknown as TextIndexInfo[];
  } catch {
    existing = [];
  }

  const wantedKeys = Object.keys(keys);
  const isTextIndex = (index: TextIndexInfo) => Object.values(index.key ?? {}).includes('text');
  const sameKeys = (index: TextIndexInfo) =>
    Object.keys(index.key ?? {}).length === wantedKeys.length &&
    wantedKeys.every((key) => index.key?.[key] === keys[key]);
  const sameOptions = (index: TextIndexInfo) =>
    index.language_override === TEXT_INDEX_DEFAULTS.language_override &&
    index.default_language === TEXT_INDEX_DEFAULTS.default_language;

  if (existing.some((index) => isTextIndex(index) && sameKeys(index) && sameOptions(index))) {
    return;
  }

  for (const index of existing) {
    if (!isTextIndex(index) || !index.name) continue;
    try {
      await collection.dropIndex(index.name);
    } catch {
      // Ignore races or an index that is already gone.
    }
  }

  await collection.createIndex(keys, { name, ...TEXT_INDEX_DEFAULTS });
}

/**
 * Central index creation. Idempotent - safe to run on every boot.
 */
export async function ensureIndexes(): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  // Conversations
  tasks.push(
    ConversationModel.collection.createIndex({ userId: 1, pinned: -1, updatedAt: -1 }),
    ConversationModel.collection.createIndex({ userId: 1, title: 'text' }),
    ConversationModel.collection.createIndex({ shareToken: 1 }, { sparse: true })
  );

  // Messages
  tasks.push(
    MessageModel.collection.createIndex({ conversationId: 1, createdAt: 1 }),
    MessageModel.collection.createIndex({ userId: 1, createdAt: -1 })
  );

  // Usage
  tasks.push(
    AIUsageModel.collection.createIndex({ userId: 1, createdAt: -1 }),
    AIUsageModel.collection.createIndex({ createdAt: 1 }),
    AIUsageModel.collection.createIndex({ userId: 1, createdAt: 1 })
  );

  // Refresh tokens
  tasks.push(
    RefreshTokenModel.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    RefreshTokenModel.collection.createIndex({ userId: 1 })
  );

  // Legacy notices + chunks (text indexes preserved)
  tasks.push(
    NoticeModel.collection.createIndex({ title: 'text', normalizedText: 'text', category: 'text', summary: 'text' }),
    NoticeModel.collection.createIndex({ createdAt: -1 }),
    NoticeModel.collection.createIndex({ category: 1, createdAt: -1 }),
    ChunkModel.collection.createIndex({ documentId: 1 }),
    ChunkModel.collection.createIndex({ category: 1 }),
    ChunkModel.collection.createIndex({ title: 'text', chunkText: 'text' })
  );

  // Legacy chat logs
  tasks.push(
    ChatLogModel.collection.createIndex({ userId: 1, createdAt: -1 })
  );

  // Class 3 textbooks (published-only retrieval)
  tasks.push(
    BookModel.collection.createIndex({ publicationState: 1, subject: 1 }),
    ensureTextIndex(
      BookModel.collection as unknown as TextIndexCollection,
      { title: 'text', subject: 'text' },
      'book_text_search'
    ),
    BookChunkModel.collection.createIndex({ bookId: 1, chunkIndex: 1 }),
    BookChunkModel.collection.createIndex({ bookId: 1, searchTerms: 1 }),
    BookChunkModel.collection.createIndex({ bookId: 1, pageType: 1 }),
    ensureTextIndex(
      BookChunkModel.collection as unknown as TextIndexCollection,
      { bookTitle: 'text', text: 'text', normalizedText: 'text', chapterTitle: 'text' },
      'book_chunk_text_search'
    ),
    IngestionJobModel.collection.createIndex({ bookId: 1, createdAt: -1 }),
    BookUploadSessionModel.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    BookUploadSessionModel.collection.createIndex({ userId: 1, createdAt: -1 }),
    BookUploadChunkModel.collection.createIndex({ sessionId: 1, index: 1 }, { unique: true }),
    BookUploadChunkModel.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 })
  );

  // Practice & examination
  tasks.push(
    PracticeQuestionSetModel.collection.createIndex({
      publicationState: 1,
      bookId: 1,
      questionType: 1,
    }),
    PracticeQuestionSetModel.collection.createIndex({ publicationState: 1, 'chapters.id': 1 }),
    PracticeQuestionSetModel.collection.createIndex({ autoSeedKey: 1 }, { unique: true, sparse: true }),
    PracticeQuestionModel.collection.createIndex({ setId: 1, order: 1 }),
    PracticeQuestionModel.collection.createIndex({ setId: 1, chapterId: 1 }),
    PracticeQuestionModel.collection.createIndex({ autoSeedKey: 1 }, { unique: true, sparse: true }),
    PracticeAttemptModel.collection.createIndex({ userId: 1, createdAt: -1 }),
    PracticeAttemptModel.collection.createIndex({ setId: 1, status: 1 }),
    PracticeAttemptModel.collection.createIndex({ status: 1, expiresAt: 1 })
  );

  // Documentation (public site + version history)
  tasks.push(
    DocumentationContentModel.collection.createIndex({ publishedVersion: -1 }),
    DocumentationVersionModel.collection.createIndex({ version: -1 }),
    DocumentationVersionModel.collection.createIndex({ publishedAt: -1 })
  );

  await Promise.allSettled(tasks);
}
