import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { optionalAuthenticate } from '../../../middleware/auth.middleware';
import { asyncHandler, ok } from '../../../utils/response.utils';
import practiceController from './practice.controller';
import { validate } from '../../../middleware/validate.middleware';
import { startAttemptSchema, attemptAnswersSchema, checkAnswerSchema } from './practice.validation';

const router = Router();

/** Guests get a private, device-scoped attempt id without creating an account. */
const GUEST_HEADER = 'x-practice-guest';

function guestActorId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!/^[a-f0-9-]{16,64}$/i.test(value)) return null;
  return crypto.createHash('sha256').update(`practice-guest:${value}`).digest('hex').slice(0, 24);
}

function practiceActorId(req: Request): string | null {
  if (req.user?.id) return req.user.id;
  return guestActorId(req.headers[GUEST_HEADER]);
}

function requirePracticeActor(req: Request, res: Response): string | null {
  const actorId = practiceActorId(req);
  if (!actorId) {
    res.status(401).json({ success: false, message: 'Practice session required. Please reload the page and try again.' });
    return null;
  }
  return actorId;
}


router.get('/books', asyncHandler(async (_req, res) => {
  const books = await practiceController.listBooks();
  return ok(res, { books });
}));

router.get(
  '/books/:bookId/chapters',
  asyncHandler(async (req, res) => {
    const chapters = await practiceController.listChapters(String(req.params.bookId));
    return ok(res, { chapters });
  })
);

router.get(
  '/sets',
  asyncHandler(async (req, res) => {
    const { bookId, questionType, mode, chapterIds } = req.query as Record<string, string>;
    const filters: Record<string, unknown> = {};
    if (bookId) filters.bookId = bookId;
    if (questionType) filters.questionType = questionType;
    if (mode) filters.mode = mode;
    if (chapterIds) filters.chapterIds = String(chapterIds).split(',').filter(Boolean);
    const result = await practiceController.listSets(filters);
    return ok(res, result);
  })
);

router.get(
  '/sets/:id',
  asyncHandler(async (req, res) => {
    const set = await practiceController.getSet(String(req.params.id));
    return ok(res, { set });
  })
);

router.post(
  '/attempts',
  optionalAuthenticate,
  validate(startAttemptSchema, 'body'),
  asyncHandler(async (req, res) => {
    const actorId = requirePracticeActor(req, res);
    if (!actorId) return;
    const attempt = await practiceController.startAttempt(actorId, req.body);
    return ok(res, { attempt }, 201);
  })
);

router.get(
  '/attempts',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const actorId = requirePracticeActor(req, res);
    if (!actorId) return;
    const limitParam = req.query.limit ? Number(req.query.limit) : undefined;
    const rawMode = String(req.query.mode ?? '');
    const modeParam = (rawMode === 'practice' || rawMode === 'exam' ? rawMode : undefined);
    const attempts = await practiceController.listAttempts(actorId, { limit: limitParam, mode: modeParam });
    return ok(res, { attempts });
  })
);

router.get(
  '/attempts/:attemptId',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const actorId = requirePracticeActor(req, res);
    if (!actorId) return;
    const { attempt, evaluation, duplicate, autoSubmitted } = await practiceController.getAttempt(actorId, String(req.params.attemptId));
    return ok(res, { attempt, evaluation, duplicate, autoSubmitted });
  })
);

router.post(
  '/attempts/:attemptId/answers',
  optionalAuthenticate,
  validate(attemptAnswersSchema, 'body'),
  asyncHandler(async (req, res) => {
    const actorId = requirePracticeActor(req, res);
    if (!actorId) return;
    const { attempt, autoSubmitted } = await practiceController.saveAnswers(actorId, String(req.params.attemptId), req.body);
    return ok(res, { attempt, autoSubmitted });
  })
);

router.post(
  '/attempts/:attemptId/check',
  optionalAuthenticate,
  validate(checkAnswerSchema, 'body'),
  asyncHandler(async (req, res) => {
    const actorId = requirePracticeActor(req, res);
    if (!actorId) return;
    const { questionId, value } = req.body as { questionId: string; value: unknown };
    const { result } = await practiceController.checkAnswer(actorId, String(req.params.attemptId), questionId, value);
    return ok(res, { result });
  })
);

router.post(
  '/attempts/:attemptId/submit',
  optionalAuthenticate,
  validate(attemptAnswersSchema, 'body'),
  asyncHandler(async (req, res) => {
    const actorId = requirePracticeActor(req, res);
    if (!actorId) return;
    const { attempt, evaluation, duplicate, autoSubmitted } = await practiceController.submitAttempt(actorId, String(req.params.attemptId), req.body);
    return ok(res, { attempt, evaluation, duplicate, autoSubmitted });
  })
);

export default router;
