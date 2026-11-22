import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import {
  MdAccountCircle,
  MdApi,
  MdArrowForward,
  MdContentPasteSearch,
  MdFactCheck,
  MdGroup,
  MdHistory,
  MdLibraryBooks,
  MdSecurity,
  MdSettingsRemote,
  MdStorage,
  MdSummarize,
  MdTableChart,
  MdTimeline,
} from 'react-icons/md';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { ArchitectureDiagram, AiDataFlowDiagram, PitchDeckBlock } from '@/components/docs/Diagram';
import { getDocsContent, getDocsMeta, getDocsStats, getTeamAvatarUrl } from '@/lib/docs';
import { ApiRequestError, getErrorMessage } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import type {
  DocsBlock,
  DocsContent,
  DocsFeatureRow,
  DocsMeta,
  DocsRoadmapEntry,
  DocsTeamMember,
  PublicDocStats,
} from '@/types';
import '@/styles/docs.css';

/* ------------------------------------------------------------------ */
/* Content definitions                                                */
/* ------------------------------------------------------------------ */

interface SectionDef {
  id: string;
  label: string;
  icon: ComponentType;
  searchText: string;
  customBlock?: DocsBlock;
}

const BASE_SECTIONS: SectionDef[] = [
  {
    id: 'pitch-deck',
    label: 'Pitch deck',
    icon: MdTimeline,
    searchText: 'problem solution why now product demo market opportunity business model traction competition unique advantage go-to-market team vision assumptions verified',
  },
  {
    id: 'product-overview',
    label: 'Product overview',
    icon: MdSummarize,
    searchText: 'target users students parents teachers how tutor works textbooks practice exams administrators',
  },
  {
    id: 'feature-matrix',
    label: 'Feature matrix',
    icon: MdTableChart,
    searchText: 'completed in progress planned feature status route',
  },
  {
    id: 'architecture',
    label: 'System architecture',
    icon: MdSettingsRemote,
    searchText: 'react vite frontend express node backend mongodb mongoose gridfs services authentication authorization retrieval provider routing practice evaluation vercel',
  },
  {
    id: 'ai-data-flow',
    label: 'AI data flow',
    icon: MdAccountCircle,
    searchText: 'language detection banglish query processing textbook retrieval relevance scoring bm25 lexical context construction llm provider routing generation citation validation response insufficient context',
  },
  {
    id: 'technology-stack',
    label: 'Technology stack',
    icon: MdLibraryBooks,
    searchText: 'react vite typescript express node mongodb mongoose jwt zod helmet cors rate limit pdfjs tesseract openrouter gemini anthropic vercel',
  },
  {
    id: 'api-reference',
    label: 'API documentation',
    icon: MdApi,
    searchText: 'endpoint method path authentication request response errors auth users tutor books conversations messages attachments practice admin docs notices files legacy',
  },
  {
    id: 'data-layer',
    label: 'Data layer',
    icon: MdStorage,
    searchText: 'collections schemas users conversations messages books chunks ingestion gridfs files practice attempts sessions settings refresh tokens logs privacy',
  },
  {
    id: 'ai-layer',
    label: 'AI layer',
    icon: MdSecurity,
    searchText: 'providers models openrouter anthropic gemini compatible mock routing modes fast balanced accurate prompt language detection banglish retrieval bm25 citation insufficient context safety',
  },
  {
    id: 'security',
    label: 'Security & scalability',
    icon: MdFactCheck,
    searchText: 'authentication rbac validation rate limiting sanitization security headers quotas provider fallback indexes privacy scaling future',
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: MdArrowForward,
    searchText: 'short term mid term long term planned improvements expansion analytics teacher infrastructure',
  },
  {
    id: 'team',
    label: 'Team Infyners',
    icon: MdGroup,
    searchText: 'team infyners mesbahul alam moniruzzaman shaon halima tuz sadia team lead member contact',
  },
  {
    id: 'live-statistics',
    label: 'Live statistics',
    icon: MdFactCheck,
    searchText: 'live statistics registered users conversations messages books practice attempts sets ai usage active users aggregate privacy',
  },
  {
    id: 'changelog',
    label: 'Changelog',
    icon: MdHistory,
    searchText: 'changelog version date changes feature additions bug fixes technical improvements',
  },
];

const TECH_STACK = [
  {
    title: 'Frontend',
    items: [
      ['React 18', 'Hook-based UI library with memoization and lazy routes'],
      ['Vite 5', 'Production build, code splitting and CSS splitting'],
      ['TypeScript 5.6', 'Typed application code and build-time checks'],
      ['React Router 6', 'Route table with lazy loading and guards'],
      ['Zustand', 'Small stores for auth, tutor and chat state'],
      ['Axios', 'REST client with token refresh, timeouts and GET retry'],
    ],
  },
  {
    title: 'Backend',
    items: [
      ['Node.js 18.17+', 'Server runtime (Vercel-friendly)'],
      ['Express 4', 'Versioned REST API and SSE endpoints'],
      ['TypeScript', 'Strict service/controller typing'],
      ['Mongoose 8', 'MongoDB models, indexes and GridFS access'],
      ['Zod 3', 'Request and schedule validation'],
      ['Winston', 'Console logging plus MongoDB log transport on Vercel'],
    ],
  },
  {
    title: 'Data & files',
    items: [
      ['MongoDB Atlas / MongoDB', 'Primary document database'],
      ['GridFS', 'Textbook PDFs, notice files, user avatars and team avatars'],
      ['Text chunks', 'Page-aware textbook chunks used by retrieval'],
      ['TTL caches', 'Short-lived aggregate statistics cache (5 seconds)'],
    ],
  },
  {
    title: 'AI & textbook processing',
    items: [
      ['OpenRouter', 'Default gateway for text and vision models'],
      ['Anthropic / Gemini / OpenAI-compatible', 'Optional provider adapters in the registry'],
      ['Mock provider', 'Offline tests without network calls'],
      ['pdfjs-dist + @napi-rs/canvas', 'Page rendering and text extraction'],
      ['tesseract.js', 'Local OCR for scanned pages'],
      ['Vision fallback', 'Re-reads difficult pages with a configured vision model'],
    ],
  },
  {
    title: 'Security & operations',
    items: [
      ['JWT + bcryptjs', 'Short-lived access tokens, rotating refresh tokens'],
      ['Helmet + CORS', 'Security headers and origin allowlist'],
      ['express-rate-limit', 'Global, auth, AI, guest and feedback limits'],
      ['express-mongo-sanitize', 'MongoDB operator-injection protection'],
      ['Vercel', 'Two projects: Vite frontend and Express serverless API'],
    ],
  },
];

interface ApiEndpoint {
  method: string;
  path: string;
  auth: string;
  purpose: string;
  request: string;
  response: string;
  errors: string;
}

interface ApiGroup {
  id: string;
  title: string;
  note: string;
  endpoints: ApiEndpoint[];
}

const API_GROUPS: ApiGroup[] = [
  {
    id: 'auth',
    title: 'Authentication',
    note: 'Credential endpoints use the auth rate limiter. Access tokens are sent as Bearer tokens; refresh tokens rotate on use.',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/register', auth: 'Public', purpose: 'Create a learner account.', request: '{ name, email, password }', response: '{ user, tokens? }', errors: '400 validation, 403 registration disabled, 409 duplicate, 429 rate limit' },
      { method: 'POST', path: '/api/v1/auth/login', auth: 'Public', purpose: 'Learner login.', request: '{ email, password }', response: '{ user, tokens }', errors: '401 invalid credentials, 429 rate limit' },
      { method: 'POST', path: '/api/v1/auth/login/admin', auth: 'Public', purpose: 'Admin login.', request: '{ email, password }', response: '{ user, tokens }', errors: '401/403, 429' },
      { method: 'POST', path: '/api/v1/auth/refresh', auth: 'Public', purpose: 'Rotate the refresh token and issue an access token.', request: '{ refreshToken } or refresh cookie', response: '{ tokens }', errors: '401 invalid/expired/reused token, 429' },
      { method: 'POST', path: '/api/v1/auth/logout', auth: 'Public', purpose: 'Revoke a refresh token.', request: '{ refreshToken }', response: '{ success }', errors: '400 malformed body' },
      { method: 'POST', path: '/api/v1/auth/forgot-password', auth: 'Public', purpose: 'Send a reset email when SMTP is configured.', request: '{ email }', response: '{ message, previewLink? (development) }', errors: '400 validation, 429' },
      { method: 'POST', path: '/api/v1/auth/reset-password', auth: 'Public', purpose: 'Reset a password and revoke sessions.', request: '{ token, password }', response: '{ success }', errors: '400 invalid/expired token, 429' },
      { method: 'GET', path: '/api/v1/auth/me', auth: 'Bearer JWT', purpose: 'Return the current principal.', request: '—', response: '{ user }', errors: '401' },
      { method: 'POST', path: '/api/v1/auth/change-password', auth: 'Bearer JWT', purpose: 'Change the password and revoke sessions.', request: '{ currentPassword, newPassword }', response: '{ success }', errors: '400, 401' },
    ],
  },
  {
    id: 'users',
    title: 'Users',
    note: 'Authenticated learner profile and quota endpoints.',
    endpoints: [
      { method: 'GET', path: '/api/v1/users/me', auth: 'Bearer JWT', purpose: 'Profile details.', request: '—', response: '{ user }', errors: '401' },
      { method: 'PATCH', path: '/api/v1/users/me', auth: 'Bearer JWT', purpose: 'Update allowed profile fields.', request: '{ name?, ... }', response: '{ user }', errors: '400, 401' },
      { method: 'POST', path: '/api/v1/users/me/avatar', auth: 'Bearer JWT', purpose: 'Upload a profile avatar.', request: 'multipart field avatar (max 5 MB)', response: '{ user }', errors: '400 unsupported file, 401, 413' },
      { method: 'GET', path: '/api/v1/users/me/usage', auth: 'Bearer JWT', purpose: 'Quota and usage summary.', request: '—', response: '{ usage }', errors: '401' },
    ],
  },
  {
    id: 'tutor',
    title: 'AI Tutor',
    note: 'Guest chat is text-only and rate-limited. Authenticated chat adds modes, attachments and token quotas.',
    endpoints: [
      { method: 'POST', path: '/api/v1/tutor/guest-chat', auth: 'Public + guest limit', purpose: 'Temporary text question.', request: '{ message, language?, subject?, bookId? }', response: '{ tutor }', errors: '422 validation, 429 guest limit' },
      { method: 'POST', path: '/api/v1/tutor/chat', auth: 'Bearer JWT + AI limit', purpose: 'Authenticated non-streaming tutor answer.', request: '{ message, language?, mode?, subject?, bookId?, attachments? }', response: '{ tutor }', errors: '401, 422, 429 quota/rate limit' },
      { method: 'POST', path: '/api/v1/tutor/quiz', auth: 'Bearer JWT + AI limit', purpose: 'One textbook-grounded practice question.', request: '{ message, language?, subject?, bookId? }', response: '{ quiz, sources }', errors: '404 no context, 429' },
      { method: 'POST', path: '/api/v1/tutor/feedback', auth: 'Public + feedback limit', purpose: 'Stateless helpful/not-helpful feedback.', request: '{ requestId, helpful, comment? }', response: '{ message }', errors: '422, 429' },
    ],
  },
  {
    id: 'books',
    title: 'Textbooks',
    note: 'Public catalogue only exposes published books. Raw files are never exposed through the metadata routes; download is a separate streaming endpoint.',
    endpoints: [
      { method: 'GET', path: '/api/v1/books', auth: 'Public', purpose: 'List published textbooks.', request: 'query: subject, grade, curriculum, search', response: '{ books[] }', errors: '400 invalid query' },
      { method: 'GET', path: '/api/v1/books/:id', auth: 'Public', purpose: 'Book metadata plus up to six sample chunks.', request: 'path id', response: '{ book, samples[] }', errors: '404' },
      { method: 'GET', path: '/api/v1/books/:id/download', auth: 'Public', purpose: 'Stream the stored PDF with range support.', request: 'path id; optional Range header', response: 'application/pdf stream', errors: '404 missing book/file, 416 invalid range' },
      { method: 'GET', path: '/api/v1/books/meta/subjects', auth: 'Public', purpose: 'Distinct published subjects.', request: '—', response: '{ subjects[] }', errors: '500' },
    ],
  },
  {
    id: 'conversations',
    title: 'Conversations & messages',
    note: 'Signed-in chat history and SSE streaming. Shared views are public by token.',
    endpoints: [
      { method: 'GET', path: '/api/v1/conversations/share/:token', auth: 'Public token', purpose: 'Read a shared conversation.', request: 'path token', response: '{ chat }', errors: '404' },
      { method: 'GET', path: '/api/v1/conversations', auth: 'Bearer JWT', purpose: 'Paginated conversation list.', request: 'query: page, limit, search, archived?', response: '{ conversations[], total, page, limit }', errors: '401, 400' },
      { method: 'POST', path: '/api/v1/conversations', auth: 'Bearer JWT', purpose: 'Create a conversation.', request: '{ title? }', response: '{ conversation }', errors: '401, 400' },
      { method: 'DELETE', path: '/api/v1/conversations/clear-all', auth: 'Bearer JWT', purpose: 'Delete all conversations for the user.', request: '—', response: '{ deleted }', errors: '401' },
      { method: 'GET', path: '/api/v1/conversations/:id', auth: 'Bearer JWT', purpose: 'Conversation with messages.', request: 'path id', response: '{ conversation, messages[] }', errors: '401, 404' },
      { method: 'PATCH', path: '/api/v1/conversations/:id', auth: 'Bearer JWT', purpose: 'Rename, pin or archive.', request: '{ title?, pinned?, isArchived? }', response: '{ conversation }', errors: '401, 404' },
      { method: 'DELETE', path: '/api/v1/conversations/:id', auth: 'Bearer JWT', purpose: 'Delete one conversation.', request: 'path id', response: '{ deleted }', errors: '401, 404' },
      { method: 'GET', path: '/api/v1/conversations/:id/export', auth: 'Bearer JWT', purpose: 'Export conversation JSON or Markdown.', request: 'query: format=json|markdown', response: 'file download', errors: '400, 401, 404' },
      { method: 'POST', path: '/api/v1/conversations/:id/share', auth: 'Bearer JWT', purpose: 'Enable or disable a share link.', request: '{ enabled }', response: '{ shareToken, shareUrl }', errors: '401, 404' },
      { method: 'POST', path: '/api/v1/conversations/:conversationId/messages', auth: 'Bearer JWT + AI limit', purpose: 'Send a message and stream the reply (SSE).', request: '{ content, language?, mode?, attachments? }', response: 'SSE start/token/citations/usage/done/error', errors: '401, 422, 429' },
      { method: 'POST', path: '/api/v1/conversations/:id/messages/regenerate', auth: 'Bearer JWT + AI limit', purpose: 'Regenerate an assistant reply (SSE).', request: '{ messageId, language?, mode? }', response: 'SSE stream', errors: '401, 404, 429' },
      { method: 'POST', path: '/api/v1/conversations/:id/messages/continue', auth: 'Bearer JWT + AI limit', purpose: 'Continue the last reply (SSE).', request: '{ language?, mode? }', response: 'SSE stream', errors: '401, 429' },
      { method: 'POST', path: '/api/v1/conversations/:id/messages/:messageId/feedback', auth: 'Bearer JWT', purpose: 'Like/dislike an assistant message.', request: '{ type, comment? }', response: '{ success }', errors: '401, 404' },
    ],
  },
  {
    id: 'attachments',
    title: 'Attachments',
    note: 'Temporary files are memory-only, magic-byte checked, single-use and expire after 30 minutes. They are never written to MongoDB or disk.',
    endpoints: [
      { method: 'POST', path: '/api/v1/attachments', auth: 'Bearer JWT', purpose: 'Upload up to five temporary images/PDFs for the next tutor or chat message.', request: 'multipart field files; max 10 MB each', response: '{ attachments[{ id, type, name, mime, size }] }', errors: '400 unsupported file, 401, 413 too large, 422 vision unsupported' },
    ],
  },
  {
    id: 'practice',
    title: 'Practice & examinations',
    note: 'Practice works for guests with the x-practice-guest header and for signed-in learners with a Bearer token.',
    endpoints: [
      { method: 'GET', path: '/api/v1/practice/books', auth: 'Public', purpose: 'Books available to practice.', request: '—', response: '{ books[] }', errors: '500' },
      { method: 'GET', path: '/api/v1/practice/books/:bookId/chapters', auth: 'Public', purpose: 'Chapters for a book.', request: 'path bookId', response: '{ chapters[] }', errors: '404' },
      { method: 'GET', path: '/api/v1/practice/sets', auth: 'Public', purpose: 'Published practice sets.', request: 'query: bookId, chapterIds, questionType, mode', response: '{ sets[], total, page, limit }', errors: '400' },
      { method: 'GET', path: '/api/v1/practice/sets/:id', auth: 'Public', purpose: 'One published set.', request: 'path id', response: '{ set }', errors: '404' },
      { method: 'POST', path: '/api/v1/practice/attempts', auth: 'Optional JWT or guest header', purpose: 'Start a practice or exam attempt.', request: '{ bookId, questionType, mode, chapters? }', response: '{ attempt }', errors: '401 no actor, 400 invalid, 404 no questions' },
      { method: 'GET', path: '/api/v1/practice/attempts', auth: 'Optional JWT or guest header', purpose: 'List the actor’s attempts.', request: 'query: limit, mode?', response: '{ attempts[] }', errors: '401' },
      { method: 'GET', path: '/api/v1/practice/attempts/:attemptId', auth: 'Optional JWT or guest header', purpose: 'Load one attempt and evaluation.', request: 'path attemptId', response: '{ attempt, evaluation?, duplicate?, autoSubmitted? }', errors: '401, 404' },
      { method: 'POST', path: '/api/v1/practice/attempts/:attemptId/answers', auth: 'Optional JWT or guest header', purpose: 'Auto-save draft answers.', request: 'array of { questionId, value }', response: '{ attempt, autoSubmitted }', errors: '401, 400, 404' },
      { method: 'POST', path: '/api/v1/practice/attempts/:attemptId/check', auth: 'Optional JWT or guest header', purpose: 'Check one answer in practice mode.', request: '{ questionId, value }', response: '{ result }', errors: '401, 400, 404' },
      { method: 'POST', path: '/api/v1/practice/attempts/:attemptId/submit', auth: 'Optional JWT or guest header', purpose: 'Submit and deterministically evaluate the attempt.', request: 'array of { questionId, value }', response: '{ attempt, evaluation, duplicate?, autoSubmitted? }', errors: '401, 400, 404, 409 already submitted' },
    ],
  },
  {
    id: 'docs-public',
    title: 'Documentation (public)',
    note: 'All public documentation routes obey the same server-side ON/OFF and timezone-aware schedule gate.',
    endpoints: [
      { method: 'GET', path: '/api/v1/docs/meta', auth: 'Public', purpose: 'Visibility state, reason, version and schedule window.', request: '—', response: '{ accessible, reason, enabled, version, window, updatedAt }', errors: '500' },
      { method: 'GET', path: '/api/v1/docs/content', auth: 'Public', purpose: 'Published documentation snapshot.', request: '—', response: '{ content }', errors: '403 disabled/scheduled, 404 unpublished' },
      { method: 'GET', path: '/api/v1/docs/stats', auth: 'Public', purpose: 'Privacy-safe aggregate statistics.', request: '—', response: '{ stats }', errors: '403 disabled/scheduled/unpublished' },
      { method: 'GET', path: '/api/v1/docs/media/:memberId', auth: 'Public', purpose: 'Stream a published team avatar.', request: 'path memberId', response: 'image stream', errors: '404 avatar/book not available' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin console',
    note: 'Every admin route is protected by authenticate + requireAdmin. This table summarizes the operational surface; the repository route files are the source of truth.',
    endpoints: [
      { method: 'GET', path: '/api/v1/admin/dashboard', auth: 'Admin JWT', purpose: 'Aggregate dashboard counts.', request: '—', response: '{ ...counts, usage }', errors: '401, 403' },
      { method: 'GET/PATCH/DELETE', path: '/api/v1/admin/users[/:id]', auth: 'Admin JWT', purpose: 'Search users, change role/status, delete.', request: 'query + { role?, isActive? }', response: '{ users, total } or { user }', errors: '401, 403, 404, 400' },
      { method: 'GET/POST', path: '/api/v1/admin/notices', auth: 'Admin JWT', purpose: 'List or create notices (optional file).', request: 'multipart fields + file', response: '{ notices } / { notice }', errors: '400, 401, 403, 413' },
      { method: 'GET/PUT/DELETE', path: '/api/v1/admin/notices/:id', auth: 'Admin JWT', purpose: 'Read, update or delete a notice.', request: 'fields / file', response: '{ notice } / { deleted }', errors: '400, 401, 403, 404' },
      { method: 'POST', path: '/api/v1/admin/notices/:id/reindex', auth: 'Admin JWT', purpose: 'Rebuild notice chunks.', request: '—', response: '{ job }', errors: '401, 403, 404' },
      { method: 'GET', path: '/api/v1/admin/chats', auth: 'Admin JWT', purpose: 'Paginated chat history.', request: 'query filters', response: '{ logs, total }', errors: '400, 401, 403' },
      { method: 'GET', path: '/api/v1/admin/analytics/usage', auth: 'Admin JWT', purpose: 'Usage analytics by day/month.', request: 'query: from, to, groupBy', response: '{ usage }', errors: '400, 401, 403' },
      { method: 'GET', path: '/api/v1/admin/tokens/usage', auth: 'Admin JWT', purpose: 'Token overview and top users.', request: '—', response: '{ overview, users }', errors: '401, 403' },
      { method: 'GET/PUT', path: '/api/v1/admin/settings', auth: 'Admin JWT', purpose: 'Read or update application settings.', request: 'setting values', response: '{ settings }', errors: '400, 401, 403' },
      { method: 'GET', path: '/api/v1/admin/settings/api-key', auth: 'Admin JWT', purpose: 'OpenRouter environment-key status.', request: '—', response: '{ configured }', errors: '401, 403' },
      { method: 'GET/POST/PATCH/DELETE', path: '/api/v1/admin/prompt-templates[/:id]', auth: 'Admin JWT', purpose: 'Manage prompt templates.', request: 'template fields', response: '{ templates } / { template }', errors: '400, 401, 403, 404' },
      { method: 'GET', path: '/api/v1/admin/logs', auth: 'Admin JWT', purpose: 'Filterable application logs.', request: 'query filters', response: '{ logs, total }', errors: '400, 401, 403' },
      { method: 'GET', path: '/api/v1/admin/system', auth: 'Admin JWT', purpose: 'Runtime, memory, MongoDB and environment info.', request: '—', response: '{ system }', errors: '401, 403' },
      { method: 'GET/POST', path: '/api/v1/admin/books', auth: 'Admin JWT', purpose: 'List all books or upload a PDF.', request: 'multipart file + metadata', response: '{ books } / { book, jobId }', errors: '400, 401, 403, 413' },
      { method: 'GET/PATCH/DELETE', path: '/api/v1/admin/books/:id', auth: 'Admin JWT', purpose: 'Inspect, update or delete a book.', request: 'metadata', response: '{ book, jobs, samples } / { deleted }', errors: '401, 403, 404' },
      { method: 'POST', path: '/api/v1/admin/books/upload-sessions[/...]', auth: 'Admin JWT', purpose: 'Chunked upload for PDFs above the serverless limit.', request: 'session metadata / binary slices / complete / cancel', response: '{ uploadId, chunkSize, totalChunks } / { book, jobId }', errors: '400, 401, 403, 413' },
      { method: 'POST', path: '/api/v1/admin/books/:id/publish|unpublish|reindex|archive', auth: 'Admin JWT', purpose: 'Book lifecycle actions.', request: '—', response: '{ book } / { job }', errors: '401, 403, 404, 409 not ready' },
      { method: 'GET/PUT', path: '/api/v1/admin/providers', auth: 'Admin JWT', purpose: 'Read masked provider state or switch provider/model/fallbacks.', request: '{ provider, model, fallbacks, keys? }', response: '{ active, providers, credentials }', errors: '400 invalid pair, 401, 403' },
      { method: 'POST', path: '/api/v1/admin/providers/:providerId/validate', auth: 'Admin JWT', purpose: 'Live credential validation.', request: '—', response: '{ ok, latencyMs, model }', errors: '400, 401, 403' },
      { method: 'GET/POST/PATCH/DELETE', path: '/api/v1/admin/practice/sets[/:id]', auth: 'Admin JWT', purpose: 'Question set CRUD, duplicate, publish/unpublish/preview.', request: 'set configuration', response: '{ sets } / { set }', errors: '400, 401, 403, 404, 409' },
      { method: 'GET/POST/PATCH/DELETE', path: '/api/v1/admin/practice/sets/:id/questions[/...]', auth: 'Admin JWT', purpose: 'Question CRUD, reorder and duplicate.', request: 'question payload', response: '{ questions } / { question }', errors: '400, 401, 403, 404' },
      { method: 'GET/PUT', path: '/api/v1/admin/docs', auth: 'Admin JWT', purpose: 'Read the editable docs draft or save sections.', request: '{ pitchDeck?, productOverview?, customSections?, featureMatrix?, roadmap?, changelog? }', response: '{ doc, publishedVersion, versions }', errors: '400, 401, 403' },
      { method: 'POST', path: '/api/v1/admin/docs/publish|unpublish', auth: 'Admin JWT', purpose: 'Publish a snapshot or disable public docs.', request: '—', response: '{ doc, publishedVersion }', errors: '401, 403' },
      { method: 'PUT', path: '/api/v1/admin/docs/enabled|schedule', auth: 'Admin JWT', purpose: 'Toggle visibility or set a timezone-aware window.', request: '{ enabled } or { start, end, timezone }', response: '{ doc }', errors: '400 invalid timezone/order, 401, 403' },
      { method: 'GET/POST', path: '/api/v1/admin/docs/versions[/:version/restore]', auth: 'Admin JWT', purpose: 'List published versions or restore one into the draft.', request: 'path version', response: '{ versions } / { doc }', errors: '401, 403, 404' },
      { method: 'POST/PATCH/DELETE', path: '/api/v1/admin/docs/team[/:memberId]', auth: 'Admin JWT', purpose: 'Add, edit or remove a team member.', request: 'name, role, contact, optional avatar', response: '{ member, versions } / { deleted }', errors: '400, 401, 403, 404, 409 confirmed member removal' },
      { method: 'POST', path: '/api/v1/admin/docs/team/:memberId/avatar', auth: 'Admin JWT', purpose: 'Upload or replace a team profile image.', request: 'multipart avatar (max 5 MB)', response: '{ member, avatarId }', errors: '400, 401, 403, 404, 413' },
    ],
  },
  {
    id: 'legacy',
    title: 'Legacy compatibility routes',
    note: 'Mounted at /api (not /api/v1) for the original NoticeFlow contract. Public student/AI routes remain open; legacy admin notice routes require an admin JWT.',
    endpoints: [
      { method: 'GET', path: '/api/test, /api/routes', auth: 'Public', purpose: 'Compatibility and route inspection.', request: '—', response: '{ ... }', errors: '—' },
      { method: 'GET/POST', path: '/api/users', auth: 'Public compatibility', purpose: 'Legacy user list/create.', request: 'legacy shape', response: 'legacy shape', errors: '400' },
      { method: 'GET/POST/PUT/DELETE', path: '/api/admin/notices[/:id]', auth: 'Admin JWT', purpose: 'Legacy notice CRUD and reindex.', request: 'notice fields + optional file', response: 'legacy shape', errors: '400, 401, 403, 404' },
      { method: 'GET', path: '/api/files/:fileId', auth: 'Public', purpose: 'Stream a notice file.', request: 'path fileId', response: 'file stream', errors: '404' },
      { method: 'GET/POST', path: '/api/student/*, /api/ai/ask, /api/feedback', auth: 'Public', purpose: 'Legacy search, notice and AI compatibility endpoints.', request: 'legacy shape', response: 'legacy shape', errors: '400, 429' },
    ],
  },
];

const DATA_LAYER = [
  { collection: 'users', description: 'Learner accounts, profile fields, role and active state.' },
  { collection: 'admin', description: 'Seeded administrator credentials and admin profile data.' },
  { collection: 'refreshtokens', description: 'Hashed refresh-token families with expiry and rotation state.' },
  { collection: 'conversations', description: 'Signed-in chat sessions, titles, pin/archive state and share token.' },
  { collection: 'messages', description: 'User and assistant messages, status, citations, sources, token counts.' },
  { collection: 'books', description: 'Textbook metadata, publication state, processing state, chunk/page counts.' },
  { collection: 'book_chunks', description: 'Page-aware textbook chunks with chapter, range, preview and search terms.' },
  { collection: 'ingestion_jobs', description: 'Background PDF ingestion state, page counts, OCR/vision usage and errors.' },
  { collection: 'book_upload_sessions / book_upload_chunks', description: 'Temporary chunked-upload state for large textbook PDFs.' },
  { collection: 'practice_question_sets', description: 'Book/chapter-wise set configuration, modes, marks, draft/publish state.' },
  { collection: 'practice_questions', description: 'Question payload, answer key, alternatives, marks and ordering.' },
  { collection: 'practice_attempts', description: 'Snapshotted questions, saved answers, timing, evaluation and results.' },
  { collection: 'aiusage', description: 'Per-request token and model usage records for quotas and analytics.' },
  { collection: 'documentation_contents', description: 'Singleton documentation draft, settings and published version pointer.' },
  { collection: 'documentation_versions', description: 'Immutable published documentation snapshots for history/restore.' },
  { collection: 'documents / chunks', description: 'Legacy notice documents and notice retrieval chunks.' },
  { collection: 'chatLogs / feedback', description: 'Legacy chat logs and helpful/not-helpful feedback records.' },
  { collection: 'settings / prompttemplates', description: 'Runtime AI/app settings and database-backed prompt templates.' },
  { collection: 'logs', description: 'Application warning/error logs (MongoDB transport on Vercel).' },
  { collection: 'uploads (GridFS)', description: 'Textbook PDFs, notice files, user avatars and team avatars.' },
];

const AI_LAYER = [
  { step: '1. Input preservation', detail: 'The original learner message is kept exactly; the model never receives a rewritten question as the source of truth.' },
  { step: '2. Script and language detection', detail: 'Detects Bengali, English, Banglish or mixed input. Banglish and mixed queries answer in Bengali script; pure English answers in English unless Bengali is chosen.' },
  { step: '3. Query expansion', detail: 'Builds weighted terms from original tokens, light stems, conservative Banglish-to-Bangla variants and topic synonyms.' },
  { step: '4. Candidate retrieval', detail: 'Indexed token lookup over published book chunks (with a regex fallback for legacy chunks), filtered by book/subject/grade/curriculum.' },
  { step: '5. Relevance scoring', detail: 'BM25 lexical ranking plus chapter-heading and exact-phrase bonuses. Near-duplicates are dropped and candidates below the minimum score are excluded.' },
  { step: '6. Context construction', detail: 'Up to eight retrieved chunks are inserted into the tutor prompt as explicitly untrusted textbook context with book/chapter/page metadata.' },
  { step: '7. Provider routing', detail: 'The active provider/model, timeout and up to three fallbacks come from ai.* settings. Recoverable failures may fall back; auth/config errors fail fast.' },
  { step: '8. Generation', detail: 'Fast/Balanced/Accurate modes select ai.modelFast, ai.model or ai.modelAccurate. Default deployment is OpenRouter with Gemini 2.5 Flash Lite for fast/balanced and Gemini 2.5 Pro for accurate.' },
  { step: '9. Sanitization', detail: 'Script/style/HTML tags and javascript: URLs are stripped. Answers are length-capped and rendered as sanitized Markdown on the client.' },
  { step: '10. Citation validation', detail: 'Citations are derived only from retrieved chunk metadata. A cited chunk ID that was not retrieved is discarded.' },
  { step: '11. Insufficient context', detail: 'Weak retrieval returns INSUFFICIENT_BOOK_CONTEXT with clearly labelled general help, not a fabricated page. An attached file becomes the source of truth instead.' },
];

const SECURITY_ITEMS = [
  { title: 'Authentication', detail: 'JWT access tokens default to 15 minutes; refresh tokens default to 30 days. Refresh tokens are hashed, rotated on every refresh, and reuse revokes the token family.' },
  { title: 'Role-based access control', detail: 'Every /api/v1/admin/* route runs authenticate + requireAdmin. Admin editing remains protected even when public documentation is disabled.' },
  { title: 'Input validation', detail: 'Zod schemas validate request bodies, params and query objects. Mongoose strict schemas provide a second boundary.' },
  { title: 'Rate limiting', detail: 'Global /api 600 requests/15 min; auth 20/10 min; AI generation 20/min; guest tutor default 10/min; tutor feedback 30/min.' },
  { title: 'Injection and header hardening', detail: 'Helmet security headers, strict CORS allowlist, express-mongo-sanitize, disabled x-powered-by, request IDs and a central error handler that does not leak stack traces.' },
  { title: 'AI quotas', detail: 'Authenticated AI calls check daily/monthly token quotas. Admins are exempt; guests are rate-limited instead. Every authenticated AI request records token usage.' },
  { title: 'Provider failure handling', detail: 'Timeouts, allowlisted fallback pairs and bounded retries. Vision requests are rejected before quota is consumed when the selected model cannot read images.' },
  { title: 'File and attachment safety', detail: 'Uploaded files are magic-byte checked. Chat attachments are memory-only, single-use, capped at 10 MB × 5 and expire after 30 minutes.' },
  { title: 'Database optimization', detail: 'Explicit indexes, lean read queries, pagination on admin lists, candidate-token lookup for retrieval and short-lived aggregate-statistics caching.' },
];

const SCALING_DIRECTIONS = [
  'Replace lexical retrieval with a multilingual embedding/vector index behind the existing embedding adapter boundary.',
  'Move temporary chat attachments to a shared short-TTL store for multi-instance deployments.',
  'Add read replicas, HTTP caching and CDN strategy for increasingly large textbook catalogues.',
  'Introduce multi-tenant/school isolation, audit trails and per-school content access controls.',
  'Add structured tracing and queue-based ingestion for larger PDF workloads.',
];

const ARCHITECTURE_TEXT = [
  'Client: React 18 + Vite 5 + TypeScript frontend on Vercel.',
  'API: Node.js + Express 4 under /api/v1, with a legacy /api compatibility router.',
  'Modules: auth/RBAC, users, tutor, conversations/SSE messages, books, practice/exams, admin, docs, attachments and legacy notices.',
  'Services: textbook ingestion/OCR, lexical retrieval, prompt builder, provider router, citation validator, deterministic attempt evaluator, docs content/versioning and aggregate statistics.',
  'Data: MongoDB + Mongoose; GridFS uploads bucket for PDFs and images.',
  'AI providers: OpenRouter, Anthropic, Gemini, OpenAI-compatible and mock, selected at runtime from ai.* settings.',
  'Deployment: separate Vercel projects for the Vite frontend and the Express serverless API, with MongoDB Atlas.',
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function blocksText(blocks: DocsBlock[] | undefined): string {
  return (blocks ?? []).map((block) => `${block.heading ?? ''} ${(block.body ?? []).join(' ')}`).join(' ');
}

function sectionIdForBlock(block: DocsBlock, index: number): string {
  const base = String(block.id || block.heading || `section-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `custom-${base || index + 1}`;
}

function buildSections(content: DocsContent): SectionDef[] {
  const custom: SectionDef[] = (content.customSections ?? []).map((block, index) => ({
    id: sectionIdForBlock(block, index),
    label: block.heading || `Custom section ${index + 1}`,
    icon: MdSummarize,
    searchText: `${block.heading ?? ''} ${(block.body ?? []).join(' ')}`,
    customBlock: block,
  }));
  const roadmapIndex = BASE_SECTIONS.findIndex((section) => section.id === 'roadmap');
  return [
    ...BASE_SECTIONS.slice(0, roadmapIndex),
    ...custom,
    ...BASE_SECTIONS.slice(roadmapIndex),
  ];
}

function sectionMatches(section: SectionDef, content: DocsContent, term: string): boolean {
  if (!term) return true;
  if (section.customBlock) return `${section.label} ${blocksText([section.customBlock])}`.toLowerCase().includes(term);
  if (section.label.toLowerCase().includes(term) || section.searchText.includes(term)) return true;

  const blockMatches = (blocks: DocsBlock[]) =>
    `${blocksText(blocks)}`.toLowerCase().includes(term);

  switch (section.id) {
    case 'pitch-deck':
      return blockMatches(content.pitchDeck);
    case 'product-overview':
      return blockMatches(content.productOverview);
    case 'feature-matrix':
      return content.featureMatrix.some((feature) =>
        `${feature.name} ${feature.description} ${feature.route ?? ''} ${feature.status}`.toLowerCase().includes(term)
      );
    case 'roadmap':
      return content.roadmap.some((entry) => `${entry.item} ${entry.description} ${entry.category}`.toLowerCase().includes(term));
    case 'team':
      return content.teamMembers.some((member) => `${member.name} ${member.role} ${member.contact}`.toLowerCase().includes(term));
    case 'changelog':
      return content.changelog.some((entry) => `${entry.version} ${entry.title} ${entry.items.join(' ')}`.toLowerCase().includes(term));
    case 'api-reference':
      return API_GROUPS.some((group) =>
        `${group.title} ${group.note} ${group.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path} ${endpoint.purpose} ${endpoint.auth}`).join(' ')}`
          .toLowerCase()
          .includes(term)
      );
    default:
      return false;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SB';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatDate(value: string | null | undefined, timeZone?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...(timeZone ? { timeZone } : {}),
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/* ------------------------------------------------------------------ */
/* Public page loader                                                  */
/* ------------------------------------------------------------------ */

export function DocsPage() {
  const [meta, setMeta] = useState<DocsMeta | null>(null);
  const [content, setContent] = useState<DocsContent | null>(null);
  const [stats, setStats] = useState<PublicDocStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsRefreshing, setStatsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<{ title: string; description: string } | null>(null);

  const loadStats = useCallback(async () => {
    setStatsRefreshing(true);
    setStatsError(null);
    try {
      setStats(await getDocsStats());
    } catch (err) {
      setStatsError(getErrorMessage(err));
    } finally {
      setStatsRefreshing(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(null);
    setStats(null);
    setStatsError(null);
    try {
      const docsMeta = await getDocsMeta();
      setMeta(docsMeta);

      if (!docsMeta.accessible) {
        setContent(null);
        if (docsMeta.reason === 'unpublished') {
          setUnavailable({
            title: 'Documentation is not published yet',
            description: 'The documentation CMS is available to administrators, but no public version has been published.',
          });
        } else if (docsMeta.reason === 'scheduled') {
          const windowText = docsMeta.window.start || docsMeta.window.end
            ? `The configured public window is ${formatDate(docsMeta.window.start, docsMeta.window.timezone)} → ${formatDate(docsMeta.window.end, docsMeta.window.timezone)} (${docsMeta.window.timezone}).`
            : 'The configured publishing window is not active.';
          setUnavailable({
            title: 'Documentation is outside its publishing window',
            description: windowText,
          });
        } else {
          setUnavailable({
            title: 'Documentation is currently disabled',
            description: 'An administrator has turned off public documentation. Administrator editing remains protected and available.',
          });
        }
        return;
      }

      const docsContent = await getDocsContent();
      setContent(docsContent);
      void loadStats();
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : 0;
      if (status === 403 || status === 404) {
        setUnavailable({
          title: status === 404 ? 'Documentation is not published yet' : 'Documentation is not available',
          description: 'The server rejected this request under the current documentation visibility rules.',
        });
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Refresh aggregate statistics periodically while the tab is visible.
  useEffect(() => {
    if (!content) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadStats();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [content, loadStats]);

  if (loading) return <DocsSkeleton />;

  if (unavailable) {
    return (
      <div className="docs-page pg-app">
        <div className="docs-state-wrap">
          <EmptyState icon="🔒" title={unavailable.title} description={unavailable.description} />
          <p className="text-muted docs-state-note">
            Public access is enforced by the backend. Only administrators can change documentation visibility.
          </p>
          <a href="/" className="pg-btn-secondary docs-state-action">Back to home</a>
        </div>
      </div>
    );
  }

  if (error || !content || !meta) {
    return (
      <div className="docs-page pg-app">
        <div className="docs-state-wrap">
          <EmptyState
            icon="⚙️"
            title="Could not load documentation"
            description={error ?? 'The documentation response was incomplete.'}
          />
          <Button onClick={() => void loadAll()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <DocsDocument
      content={content}
      meta={meta}
      stats={stats}
      statsError={statsError}
      statsRefreshing={statsRefreshing}
      onRefreshStats={loadStats}
    />
  );
}

function DocsSkeleton() {
  return (
    <div className="docs-page pg-app">
      <div className="docs-layout">
        <div className="docs-skeleton-nav" aria-hidden="true">
          <SkeletonBox width="70%" height={14} />
          <SkeletonBox width="90%" height={34} />
          <SkeletonBox width="80%" height={34} />
          <SkeletonBox width="85%" height={34} />
        </div>
        <div className="docs-article" style={{ paddingTop: 28 }}>
          <SkeletonBox width="38%" height={28} style={{ marginBottom: 18 }} />
          <SkeletonBox width="100%" height={14} style={{ marginBottom: 10 }} />
          <SkeletonBox width="92%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBox width="74%" height={14} style={{ marginBottom: 28 }} />
          {[1, 2, 3].map((item) => (
            <SkeletonBox key={item} width="100%" height={120} style={{ marginBottom: 16 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Document renderer (shared by public page and admin draft preview)   */
/* ------------------------------------------------------------------ */

export interface DocsDocumentProps {
  content: DocsContent;
  meta: DocsMeta;
  stats: PublicDocStats | null;
  statsError: string | null;
  statsRefreshing: boolean;
  onRefreshStats: () => void;
  preview?: boolean;
}

export function DocsDocument({
  content,
  meta,
  stats,
  statsError,
  statsRefreshing,
  onRefreshStats,
  preview = false,
}: DocsDocumentProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [activeSection, setActiveSection] = useState('pitch-deck');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const shareTimer = useRef<number | null>(null);

  const sections = useMemo(() => buildSections(content), [content]);
  const searchTerm = deferredSearch.trim().toLowerCase();
  const visibleSections = useMemo(
    () => sections.filter((section) => sectionMatches(section, content, searchTerm)),
    [sections, content, searchTerm]
  );
  const visibleSectionKey = visibleSections.map((section) => section.id).join('|');

  useEffect(() => {
    if (visibleSections.length && !visibleSections.some((section) => section.id === activeSection)) {
      setActiveSection(visibleSections[0].id);
    }
  }, [visibleSections, activeSection]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = preview ? 'Draft preview — Shikhi Bondhu Documentation' : 'Documentation — Shikhi Bondhu';
    return () => {
      document.title = previousTitle;
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (shareTimer.current !== null) window.clearTimeout(shareTimer.current);
    };
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.docs-section'));
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id.startsWith('docs-')) {
          setActiveSection(visible.target.id.slice('docs-'.length));
        }
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: [0, 0.2, 0.6] }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [visibleSectionKey, preview]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(`docs-${id}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
    try {
      window.history.replaceState(null, '', `#docs-${id}`);
    } catch {
      // ignore
    }
  };

  const exportMarkdown = () => {
    const lines: string[] = [];
    lines.push('# Shikhi Bondhu AI Tutor — Project Documentation', '');
    lines.push(`Version: ${preview ? `draft ${content.draftVersion}` : `published ${content.publishedVersion}`}`);
    lines.push(`Generated: ${new Date().toISOString()}`, '');

    const writeBlocks = (title: string, blocks: DocsBlock[]) => {
      if (!blocks.length) return;
      lines.push(`## ${title}`, '');
      for (const block of blocks) {
        lines.push(`### ${block.heading}`, '');
        lines.push(...block.body, '');
      }
    };

    writeBlocks('Pitch deck', content.pitchDeck);
    writeBlocks('Product overview', content.productOverview);
    writeBlocks('Additional sections', content.customSections ?? []);

    lines.push('## Feature matrix', '');
    lines.push('| Feature | Status | Description | Route |', '| --- | --- | --- | --- |');
    for (const feature of content.featureMatrix) {
      lines.push(`| ${escapeMarkdownCell(feature.name)} | ${feature.status} | ${escapeMarkdownCell(feature.description)} | ${escapeMarkdownCell(feature.route ?? '—')} |`);
    }
    lines.push('');

    lines.push('## System architecture', '');
    ARCHITECTURE_TEXT.forEach((line) => lines.push(`- ${line}`));
    lines.push('');

    lines.push('## AI data flow', '');
    AI_LAYER.forEach((stage) => lines.push(`- **${stage.step}**: ${stage.detail}`));
    lines.push('');

    lines.push('## Technology stack', '');
    for (const group of TECH_STACK) {
      lines.push(`### ${group.title}`, '');
      group.items.forEach(([name, detail]) => lines.push(`- **${name}** — ${detail}`));
      lines.push('');
    }

    lines.push('## API reference', '');
    for (const group of API_GROUPS) {
      lines.push(`### ${group.title}`, '', group.note, '');
      lines.push('| Method | Path | Auth | Purpose | Request | Response | Errors |', '| --- | --- | --- | --- | --- | --- | --- |');
      for (const endpoint of group.endpoints) {
        lines.push(`| ${endpoint.method} | \`${endpoint.path}\` | ${escapeMarkdownCell(endpoint.auth)} | ${escapeMarkdownCell(endpoint.purpose)} | ${escapeMarkdownCell(endpoint.request)} | ${escapeMarkdownCell(endpoint.response)} | ${escapeMarkdownCell(endpoint.errors)} |`);
      }
      lines.push('');
    }

    lines.push('## Data layer', '');
    lines.push('| Collection | Description |', '| --- | --- |');
    for (const row of DATA_LAYER) lines.push(`| \`${row.collection}\` | ${escapeMarkdownCell(row.description)} |`);
    lines.push('');

    lines.push('## Security & scalability', '');
    SECURITY_ITEMS.forEach((item) => lines.push(`- **${item.title}**: ${item.detail}`));
    lines.push('', '### Planned scaling directions', '');
    SCALING_DIRECTIONS.forEach((item) => lines.push(`- ${item}`));
    lines.push('');

    lines.push('## Roadmap', '');
    for (const category of ['shortTerm', 'midTerm', 'longTerm'] as const) {
      const entries = content.roadmap.filter((entry) => entry.category === category);
      if (!entries.length) continue;
      lines.push(`### ${roadmapLabel(category)}`, '');
      entries.forEach((entry) => lines.push(`- **${entry.item}** — ${entry.description}`));
      lines.push('');
    }

    lines.push('## Team Infyners', '');
    for (const member of content.teamMembers) {
      lines.push(`- **${member.name}** — ${member.role} — ${member.contact}${member.isConfirmed ? ' (confirmed)' : ''}`);
    }
    lines.push('');

    lines.push('## Live statistics', '');
    if (stats) {
      const statRows: Array<[string, number | null]> = [
        ['Registered users', stats.totalRegisteredUsers],
        ['Conversations', stats.totalConversations],
        ['Messages', stats.totalMessages],
        ['Published books', stats.totalPublishedBooks],
        ['Practice/exam attempts', stats.totalPracticeExamAttempts],
        ['Published practice sets', stats.totalPublishedPracticeSets],
        ['AI usage records', stats.totalAIUsageRecords],
        ['Active users (unexpired session)', stats.activeUsers],
      ];
      statRows.forEach(([label, value]) => lines.push(`- ${label}: ${value === null ? 'unavailable' : value}`));
      lines.push('', `Generated: ${stats.generatedAt}`);
    } else {
      lines.push('- Statistics were unavailable when this export was generated.');
    }
    lines.push('');

    lines.push('## Changelog', '');
    for (const entry of content.changelog) {
      lines.push(`### v${entry.version} — ${entry.date} — ${entry.title}`, '');
      entry.items.forEach((item) => lines.push(`- ${item}`));
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = preview ? 'shikhi-bondhu-docs-draft.md' : 'shikhi-bondhu-docs.md';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const exportPdf = () => {
    const previousTitle = document.title;
    document.title = preview ? 'Shikhi Bondhu Documentation — Draft' : 'Shikhi Bondhu Documentation';
    document.body.classList.add('docs-print');

    // Expand every API group so the printed/PDF version includes the complete
    // reference, then restore the previous open state.
    const details = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.docs-api-group'));
    const openStates = details.map((element) => element.open);
    details.forEach((element) => { element.open = true; });

    const cleanup = () => {
      document.body.classList.remove('docs-print');
      document.title = previousTitle;
      details.forEach((element, index) => { element.open = openStates[index] ?? false; });
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(() => window.print(), 150);
    window.setTimeout(cleanup, 15_000);
  };

  const share = async () => {
    const url = `${window.location.origin}/docs${window.location.hash || ''}`;
    const copied = await copyText(url);
    setShareState(copied ? 'copied' : 'failed');
    if (shareTimer.current !== null) window.clearTimeout(shareTimer.current);
    shareTimer.current = window.setTimeout(() => setShareState('idle'), 2200);
  };

  return (
    <div className="docs-page pg-app">
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <nav className="docs-nav" aria-label="Documentation sections">
            <h2 className="docs-nav-title">On this page</h2>
            <ul className="docs-nav-list">
              {visibleSections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`docs-nav-link${activeSection === section.id ? ' active' : ''}`}
                    aria-current={activeSection === section.id ? 'location' : undefined}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
              {visibleSections.length === 0 && <li className="docs-nav-empty">No sections match</li>}
            </ul>
            <div className="docs-sidebar-actions">
              <Button className="docs-btn-full" variant="secondary" onClick={exportMarkdown} size="sm">Export Markdown</Button>
              <Button className="docs-btn-full" variant="secondary" onClick={exportPdf} size="sm">Print to PDF</Button>
              {!preview && (
                <Button className="docs-btn-full" variant="secondary" onClick={() => void share()} size="sm">
                  {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Copy share link'}
                </Button>
              )}
            </div>
          </nav>
        </aside>

        <article className="docs-article">
          {preview && (
            <div className="docs-preview-banner" role="status">
              <strong>Draft preview</strong>
              <span>This is the saved draft. It is not visible to the public until an administrator publishes it.</span>
            </div>
          )}

          <header className="docs-header">
            <div>
              <span className={`docs-badge-live${preview ? ' docs-badge-draft' : ''}`}>
                {preview ? 'DRAFT PREVIEW' : 'PUBLIC DOCUMENTATION'}
              </span>
              <h1 className="docs-title">Shikhi Bondhu AI Tutor Documentation</h1>
              <p className="docs-subtitle">
                Project pitch, product overview, technical architecture, AI pipeline, API reference, live aggregate statistics and release history.
                {' '}
                {preview
                  ? `Draft version ${content.draftVersion}.`
                  : `${meta.version ? `Published version ${meta.version}` : 'Not published'}${meta.updatedAt ? ` · Updated ${new Date(meta.updatedAt).toLocaleDateString()}` : ''}.`}
              </p>
              <div className="docs-header-actions">
                <Button onClick={exportMarkdown}>Export Markdown</Button>
                <Button variant="secondary" onClick={exportPdf}>Print to PDF</Button>
                {!preview && (
                  <Button variant="secondary" onClick={() => void share()}>
                    {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Share documentation'}
                  </Button>
                )}
              </div>
            </div>
            <div className="docs-search">
              <label htmlFor="docs-search-input" className="sr-only">Search documentation</label>
              <input
                id="docs-search-input"
                type="search"
                placeholder="Search sections, APIs, features…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <MdContentPasteSearch aria-hidden="true" />
            </div>
          </header>

          <div className="docs-mobile-nav">
            <label htmlFor="docs-mobile-section" className="sr-only">Jump to section</label>
            <select
              id="docs-mobile-section"
              value={activeSection}
              onChange={(event) => scrollToSection(event.target.value)}
            >
              {visibleSections.map((section) => (
                <option key={section.id} value={section.id}>{section.label}</option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={exportMarkdown}>Markdown</Button>
            <Button size="sm" variant="secondary" onClick={exportPdf}>PDF</Button>
          </div>

          {visibleSections.map((section) => (
            <section key={section.id} id={`docs-${section.id}`} className="docs-section">
              <SectionHeader id={section.id} label={section.label} icon={section.icon} />
              {section.customBlock ? (
                <PitchDeckBlock block={section.customBlock} />
              ) : (
                <DocsSectionContent
                  sectionId={section.id}
                  content={content}
                  stats={stats}
                  statsError={statsError}
                  refreshing={statsRefreshing}
                  onRefreshStats={onRefreshStats}
                  preview={preview}
                />
              )}
            </section>
          ))}

          {visibleSections.length === 0 && (
            <EmptyState
              icon="🔍"
              title="No sections matched"
              description={`No documentation sections match “${deferredSearch.trim()}”.`}
            />
          )}

          <footer className="docs-footer">
            <div className="docs-footer-links">
              <a href="#docs-pitch-deck">Pitch deck</a>
              <a href="#docs-feature-matrix">Feature matrix</a>
              <a href="#docs-api-reference">API reference</a>
              <a href="#docs-live-statistics">Live statistics</a>
            </div>
            <div className="docs-footer-meta">
              {preview ? 'Draft preview' : `${meta.version ? `Documentation version ${meta.version}` : 'Not published'}`}
              {' · '}
              {stats?.generatedAt ? `Statistics generated ${formatDate(stats.generatedAt)}` : 'Statistics unavailable'}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

function SectionHeader({ id, label, icon: Icon }: { id: string; label: string; icon: ComponentType }) {
  return (
    <h2 className="docs-section-title">
      <Icon aria-hidden="true" />
      {label}
      <a className="docs-anchor" href={`#docs-${id}`} aria-label={`Link to ${label}`}>#</a>
    </h2>
  );
}

/* ------------------------------------------------------------------ */
/* Section renderers                                                   */
/* ------------------------------------------------------------------ */

function DocsSectionContent({
  sectionId,
  content,
  stats,
  statsError,
  refreshing,
  onRefreshStats,
  preview,
}: {
  sectionId: string;
  content: DocsContent;
  stats: PublicDocStats | null;
  statsError: string | null;
  refreshing: boolean;
  onRefreshStats: () => void;
  preview: boolean;
}) {
  switch (sectionId) {
    case 'pitch-deck':
      return content.pitchDeck.length ? (
        <div className="docs-pitch">
          {content.pitchDeck.map((block) => <PitchDeckBlock key={block.id} block={block} />)}
        </div>
      ) : <EmptyState icon="📝" title="Pitch deck is empty" />;

    case 'product-overview':
      return content.productOverview.length ? (
        <div className="docs-overview">
          {content.productOverview.map((block) => <PitchDeckBlock key={block.id} block={block} />)}
        </div>
      ) : <EmptyState icon="📚" title="Product overview is empty" />;

    case 'feature-matrix':
      return <FeatureMatrixTable features={content.featureMatrix} />;

    case 'architecture':
      return <ArchitectureSection />;

    case 'ai-data-flow':
      return <AiFlowSection />;

    case 'technology-stack':
      return (
        <div className="docs-stack">
          {TECH_STACK.map((group) => (
            <div key={group.title} className="docs-stack-card">
              <h3>{group.title}</h3>
              <ul>
                {group.items.map(([name, detail]) => (
                  <li key={name}><strong>{name}</strong> — {detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );

    case 'api-reference':
      return <ApiReference />;

    case 'data-layer':
      return <DataLayer />;

    case 'ai-layer':
      return <AiLayer />;

    case 'security':
      return <SecuritySection />;

    case 'roadmap':
      return <RoadmapSection entries={content.roadmap} />;

    case 'team':
      return <TeamSection members={content.teamMembers} />;

    case 'live-statistics':
      return (
        <LiveStatistics
          stats={stats}
          error={statsError}
          refreshing={refreshing}
          onRefresh={onRefreshStats}
          preview={preview}
        />
      );

    case 'changelog':
      return <Changelog entries={content.changelog} />;

    default:
      return <EmptyState icon="⚡" title="Section not found" />;
  }
}

function ArchitectureSection() {
  return (
    <>
      <p className="docs-section-lead">
        The diagram reflects the current repository: a React/Vite client, an Express API with modular services, MongoDB/GridFS,
        and a runtime-selectable AI provider router. It is not a generic RAG template.
      </p>
      <div className="docs-diagram-scroll">
        <ArchitectureDiagram />
      </div>
      <div className="docs-module-grid">
        {[
          ['Frontend', 'Landing, Tutor, Books, Practice/Exam, auth, saved chat, admin console and /docs.'],
          ['API modules', 'Auth, users, tutor, conversations/SSE, books, practice, admin, docs, attachments and legacy notices.'],
          ['Services', 'Ingestion/OCR, lexical retrieval, prompt builder, provider router, citation validation, evaluator, docs versioning and stats.'],
          ['Data', 'MongoDB collections + GridFS uploads bucket. Published-book filtering is enforced in retrieval.'],
          ['AI providers', 'OpenRouter by default; Anthropic, Gemini, OpenAI-compatible and mock adapters are available in the registry.'],
          ['Deployment', 'Vercel frontend + Vercel serverless API + MongoDB Atlas.'],
        ].map(([title, detail]) => (
          <div key={title} className="docs-module-card">
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function AiFlowSection() {
  return (
    <>
      <p className="docs-section-lead">
        The pipeline below is implemented in the backend tutor service. Retrieval is lexical (BM25-style), not embedding-based.
        No vector database, GraphRAG or semantic index is claimed.
      </p>
      <div className="docs-diagram-scroll">
        <AiDataFlowDiagram />
      </div>
      <ol className="docs-ai-steps">
        {AI_LAYER.map((stage) => (
          <li key={stage.step}>
            <strong>{stage.step}</strong>
            <p>{stage.detail}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function ApiReference() {
  return (
    <div className="docs-api">
      <p className="docs-api-note">
        Inventoried from the Express route files. Admin routes are under <code>/api/v1/admin</code> and require both authentication
        and the admin role. The repository remains the source of truth when a route changes.
      </p>
      {API_GROUPS.map((group, index) => (
        <details key={group.id} className="docs-api-group" open={index === 0}>
          <summary>
            <span>{group.title}</span>
            <Badge variant="muted">{group.endpoints.length} endpoints</Badge>
          </summary>
          <p className="docs-api-group-note">{group.note}</p>
          <div className="docs-api-table-wrap">
            <table className="docs-api-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Auth</th>
                  <th>Purpose</th>
                  <th>Request</th>
                  <th>Response</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {group.endpoints.map((endpoint) => (
                  <tr key={`${endpoint.method}-${endpoint.path}`}>
                    <td><Badge variant="info">{endpoint.method}</Badge></td>
                    <td className="docs-api-path">{endpoint.path}</td>
                    <td className="docs-api-auth">{endpoint.auth}</td>
                    <td>{endpoint.purpose}</td>
                    <td>{endpoint.request}</td>
                    <td>{endpoint.response}</td>
                    <td className="text-muted">{endpoint.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

function DataLayer() {
  return (
    <div className="docs-data-layer">
      <p className="docs-section-lead">
        Collection names below are taken from the Mongoose models. There is no separate SQL database or PII analytics warehouse.
      </p>
      <div className="docs-table-scroll">
        <table>
          <thead><tr><th>Collection</th><th>Purpose</th></tr></thead>
          <tbody>
            {DATA_LAYER.map((row) => (
              <tr key={row.collection}><td className="docs-data-name">{row.collection}</td><td>{row.description}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="docs-callout">
        <strong>Privacy and retention</strong>
        <p>
          Chat attachments are memory-only, single-use and expire after 30 minutes. Conversation history is stored for signed-in
          users only. Public statistics expose aggregate counts and never return names, email addresses, message text or tokens.
          Team avatars are only served from a published documentation snapshot.
        </p>
      </div>
    </div>
  );
}

function AiLayer() {
  return (
    <>
      <div className="docs-callout docs-callout-accent">
        <strong>Implemented vs planned</strong>
        <p>
          Lexical retrieval, citation validation, insufficient-context handling, provider fallback and the three answer modes are
          implemented. Vector/semantic retrieval and personalized learning are roadmap items, not current features.
        </p>
      </div>
      <ol className="docs-ai-steps">
        {AI_LAYER.map((stage) => (
          <li key={stage.step}>
            <strong>{stage.step}</strong>
            <p>{stage.detail}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function SecuritySection() {
  return (
    <>
      <div className="docs-security-grid">
        {SECURITY_ITEMS.map((item) => (
          <div key={item.title} className="docs-security-card">
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="docs-callout docs-callout-accent">
        <strong>Future scaling directions (not implemented)</strong>
        <ul>
          {SCALING_DIRECTIONS.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </>
  );
}

function RoadmapSection({ entries }: { entries: DocsRoadmapEntry[] }) {
  if (!entries.length) return <EmptyState icon="🗺️" title="Roadmap is empty" />;
  return (
    <div className="docs-roadmap">
      {(['shortTerm', 'midTerm', 'longTerm'] as const).map((category) => {
        const categoryEntries = entries.filter((entry) => entry.category === category);
        return (
          <div key={category} className="docs-roadmap-card">
            <h3>{roadmapLabel(category)}</h3>
            {categoryEntries.length ? (
              <ul>
                {categoryEntries.map((entry) => (
                  <li key={`${entry.item}-${entry.description}`}><strong>{entry.item}</strong> — {entry.description}</li>
                ))}
              </ul>
            ) : <p className="text-muted">No entries yet.</p>}
          </div>
        );
      })}
    </div>
  );
}

function roadmapLabel(category: DocsRoadmapEntry['category']): string {
  if (category === 'shortTerm') return 'Short term';
  if (category === 'midTerm') return 'Mid term';
  return 'Long term';
}

function TeamSection({ members }: { members: DocsTeamMember[] }) {
  if (!members.length) return <EmptyState icon="👥" title="Team is empty" />;
  return (
    <>
      <p className="docs-section-lead">
        Only confirmed contact information supplied by Team Infyners is shown. Missing profile images use a professional initials
        avatar; no biographies or social links are invented.
      </p>
      <div className="docs-team">
        {members.map((member) => (
          <article key={member.id} className="docs-team-card">
            <TeamAvatar member={member} />
            <div className="docs-team-body">
              <h3>{member.name}</h3>
              <p className="docs-team-role">{member.role}</p>
              {member.contact ? (
                <a className="docs-team-contact" href={`tel:${member.contact.replace(/[^\d+]/g, '')}`}>
                  {member.contact}
                </a>
              ) : null}
              {member.isConfirmed ? <Badge variant="success">Confirmed member</Badge> : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function TeamAvatar({ member }: { member: DocsTeamMember }) {
  const [failed, setFailed] = useState(false);
  if (!member.avatarId || failed) {
    return <div className="docs-team-avatar-fallback" aria-hidden="true">{initials(member.name)}</div>;
  }
  return (
    <img
      className="docs-team-avatar"
      src={getTeamAvatarUrl(member.id, member.avatarId)}
      alt={`${member.name} profile`}
      loading="lazy"
      decoding="async"
      width={72}
      height={72}
      onError={() => setFailed(true)}
    />
  );
}

function LiveStatistics({
  stats,
  error,
  refreshing,
  onRefresh,
  preview,
}: {
  stats: PublicDocStats | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  preview: boolean;
}) {
  if (preview) {
    return (
      <div className="docs-stats">
        <h3>Live, privacy-safe statistics</h3>
        <p>
          Statistics are read live from the backend and are not part of the editable draft. They appear on the public
          page after the documentation is published and accessible.
        </p>
      </div>
    );
  }

  return (
    <div className="docs-stats">
      <div className="docs-stats-header">
        <div>
          <h3>Live, privacy-safe statistics</h3>
          <p>
            Aggregate counts only. No personal data, conversation text, credentials or sensitive records are exposed.
            {stats?.generatedAt ? ` Generated ${formatDate(stats.generatedAt)}.` : ''}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="docs-stats-error" role="alert">
          <span>Statistics could not be refreshed: {error}</span>
          <Button size="sm" variant="secondary" onClick={onRefresh}>Try again</Button>
        </div>
      )}

      {!stats && !error && (
        <div className="docs-stats-grid">
          {[1, 2, 3, 4].map((item) => <SkeletonBox key={item} width="100%" height={84} />)}
        </div>
      )}

      {stats && (
        <div className="docs-stats-grid">
          <DocsStatCard label="Registered users" value={stats.totalRegisteredUsers} />
          <DocsStatCard label="Conversations" value={stats.totalConversations} />
          <DocsStatCard label="Messages" value={stats.totalMessages} />
          <DocsStatCard label="Published books" value={stats.totalPublishedBooks} />
          <DocsStatCard label="Practice/exam attempts" value={stats.totalPracticeExamAttempts} />
          <DocsStatCard label="Published practice sets" value={stats.totalPublishedPracticeSets} />
          <DocsStatCard label="AI usage records" value={stats.totalAIUsageRecords} />
          <DocsStatCard label="Active users (unexpired session)" value={stats.activeUsers} />
        </div>
      )}

      {stats?.metricsUnavailable.length ? (
        <p className="docs-stats-unavailable">
          Unavailable metrics: {stats.metricsUnavailable.join(', ')}. A missing value is not treated as zero.
        </p>
      ) : null}
      <p className="docs-stats-note">
        Statistics refresh every 60 seconds while this tab is visible. “Active users” counts distinct users with an unexpired
        refresh session and is an activity proxy, not a real-time online counter.
      </p>
    </div>
  );
}

function DocsStatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="docs-stat">
      <strong className="docs-stat-value">{value === null ? '—' : value.toLocaleString()}</strong>
      <span className="docs-stat-label">{label}</span>
      {value === null && <span className="docs-stat-unavail">Unavailable</span>}
    </div>
  );
}

function Changelog({ entries }: { entries: DocsContent['changelog'] }) {
  if (!entries.length) return <EmptyState icon="📜" title="Changelog is empty" />;
  return (
    <div className="docs-changelog">
      {entries.map((entry) => (
        <div key={`${entry.version}-${entry.date}`} className="docs-changelog-entry">
          <div className="docs-changelog-head">
            <span className="docs-changelog-version">v{entry.version}</span>
            <span className="docs-changelog-date">{entry.date}</span>
            <h3>{entry.title}</h3>
          </div>
          {entry.items.length > 0 && (
            <ul>{entry.items.map((item) => <li key={item}>{item}</li>)}</ul>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureMatrixTable({ features }: { features: DocsFeatureRow[] }) {
  if (!features.length) return <EmptyState icon="🗺️" title="Feature matrix is empty" />;
  const statusMeta: Record<DocsFeatureRow['status'], { icon: ComponentType<{ size?: number }>; label: string; variant: 'success' | 'warning' | 'info' }> = {
    completed: { icon: MdFactCheck, label: 'Completed', variant: 'success' },
    in_progress: { icon: MdTimeline, label: 'In progress', variant: 'warning' },
    planned: { icon: MdArrowForward, label: 'Planned', variant: 'info' },
  };
  return (
    <div className="docs-table-scroll">
      <table className="docs-features">
        <thead>
          <tr><th>Feature</th><th>Status</th><th>Description</th><th>Route</th></tr>
        </thead>
        <tbody>
          {features.map((row) => {
            const meta = statusMeta[row.status] ?? statusMeta.planned;
            const Icon = meta.icon;
            return (
              <tr key={row.name}>
                <td><strong>{row.name}</strong></td>
                <td>
                  <Badge variant={meta.variant}>
                    <span className="docs-status-label"><Icon size={13} aria-hidden="true" /> {meta.label}</span>
                  </Badge>
                </td>
                <td>{row.description}</td>
                <td>{row.route ? <code className="docs-route-link">{row.route}</code> : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DocsPage;
