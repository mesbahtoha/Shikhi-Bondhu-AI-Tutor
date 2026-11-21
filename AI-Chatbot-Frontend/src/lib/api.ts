import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiError, AttemptResponse, PracticeAttempt, PracticeBookSummary, PracticeChapterSummary, PracticeQuestionSetSummary, QuestionResult } from '@/types';

const ACCESS_KEY = 'nf_access_token';
const REFRESH_KEY = 'nf_refresh_token';
const PRACTICE_GUEST_KEY = 'sb_practice_guest';

/**
 * A private, device-scoped id that lets a visitor start and finish a practice
 * attempt without creating an account. The server hashes this value; it never
 * becomes an account identity.
 */
export function getPracticeGuestId(): string {
  try {
    const existing = localStorage.getItem(PRACTICE_GUEST_KEY);
    if (existing && /^[a-f0-9-]{16,64}$/i.test(existing)) return existing;
    const created =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(PRACTICE_GUEST_KEY, created);
    return created;
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }
}

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Shorter than the old 60s so a dead mobile connection fails (and retries)
  // instead of leaving the UI spinning for a minute. AI/upload calls override
  // this with their own longer timeouts.
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Practice works for signed-out visitors too. The header is only sent to
  // the student practice API, never to admin or chat routes.
  if (config.url?.startsWith('/api/v1/practice/')) {
    config.headers['x-practice-guest'] = getPracticeGuestId();
  }
  return config;
});

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
    refreshToken,
  }, { timeout: 10000 });
  const tokens = data?.tokens;
  if (!tokens?.accessToken) throw new Error('Refresh failed');

  tokenStore.set(tokens.accessToken, tokens.refreshToken ?? refreshToken);
  return tokens.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    const isAuthEndpoint =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      !isAuthEndpoint &&
      original &&
      !original._retried
    ) {
      original._retried = true;
      if (!tokenStore.refresh) {
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new ApiRequestError('Session expired. Please log in again.', 401);
      }
      try {
        refreshInFlight = refreshInFlight ?? refreshAccessToken();
        const token = await refreshInFlight;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        // Only an explicit rejection should end the session. A dropped mobile
        // connection during refresh must not sign the learner out.
        const refreshStatus = axios.isAxiosError(refreshError)
          ? refreshError.response?.status ?? 0
          : 0;
        if (refreshStatus === 401 || refreshStatus === 403) {
          tokenStore.clear();
          window.dispatchEvent(new CustomEvent('auth:expired'));
          throw new ApiRequestError('Session expired. Please log in again.', 401);
        }
        throw new ApiRequestError(
          'Network problem while refreshing your session. Please check your connection and try again.',
          0
        );
      } finally {
        refreshInFlight = null;
      }
    }

    if (error.response?.data?.message) {
      throw new ApiRequestError(error.response.data.message, error.response.status);
    }
    if (error.response?.status === 429) {
      throw new ApiRequestError(
        error.response.data?.message || 'Too many requests. Please try again later.',
        429
      );
    }
    throw new ApiRequestError(error.message || 'Network error. Please try again.', error.response?.status ?? 0);
  }
);

export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Network failures and transient gateway errors are worth one quick retry. */
function isRetryableRequestError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 0 || error.status === 408 || error.status === 502 || error.status === 503 || error.status === 504;
  }
  return false;
}

/**
 * Idempotent GETs retry once on flaky mobile connections. This avoids a single
 * dropped packet showing an error page or leaving a route half-loaded.
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data } = await api.get(url, config);
      return data as T;
    } catch (error) {
      lastError = error;
      if (attempt === 1 || !isRetryableRequestError(error)) throw error;
      await sleep(400);
    }
  }
  throw lastError;
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.post(url, body, config);
  return data as T;
}

export async function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.put(url, body, config);
  return data as T;
}

export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.patch(url, body, config);
  return data as T;
}

/** Multipart upload (FormData). The auth interceptor adds the bearer token. */
export async function apiUpload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.post(url, formData, {
    ...config,
    headers: { 'Content-Type': 'multipart/form-data', ...config?.headers },
    timeout: 120000,
  });
  return data as T;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.delete(url, config);
  return data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 0 || /network error|timeout|failed to fetch/i.test(error.message)) {
      return 'Network problem. Please check your internet connection and try again.';
    }
    return error.message;
  }
  if (axios.isAxiosError(error)) {
    if (!error.response || /network error|timeout|failed to fetch/i.test(error.message)) {
      return 'Network problem. Please check your internet connection and try again.';
    }
    return error.response.data?.message || error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

// ---- Practice & Examination ----

export type { AttemptResponse, PracticeAttempt, PracticeBookSummary, PracticeChapterSummary, PracticeQuestionSetSummary, QuestionResult };

/**
 * Practice responses are validated at the boundary so a malformed or partial
 * payload becomes one clear error instead of a crash deep inside a page.
 */
function unexpectedResponse(): never {
  throw new ApiRequestError('The server sent an unexpected response. Please try again.', 502);
}

function assertArray(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) unexpectedResponse();
}

function assertAttempt(value: unknown): asserts value is PracticeAttempt {
  const attempt = value as Partial<PracticeAttempt> | null | undefined;
  if (!attempt || typeof attempt._id !== 'string' || !Array.isArray(attempt.questions) || !Array.isArray(attempt.answers)) {
    unexpectedResponse();
  }
}

export async function listPracticeBooks(): Promise<{ books: PracticeBookSummary[] }> {
  const data = await apiGet<{ books?: unknown }>('/api/v1/practice/books');
  assertArray(data?.books);
  return { books: data.books as PracticeBookSummary[] };
}

export async function listPracticeChapters(bookId: string): Promise<{ chapters: PracticeChapterSummary[] }> {
  const data = await apiGet<{ chapters?: unknown }>(`/api/v1/practice/books/${bookId}/chapters`);
  assertArray(data?.chapters);
  return { chapters: data.chapters as PracticeChapterSummary[] };
}

export async function listPracticeSets(params: { bookId?: string; chapterIds?: string[]; questionType?: string; mode?: string }) {
  const query = new URLSearchParams();
  if (params.bookId) query.set('bookId', params.bookId);
  (params.chapterIds ?? []).forEach((id) => query.append('chapterIds', id));
  if (params.questionType) query.set('questionType', params.questionType);
  if (params.mode) query.set('mode', params.mode);
  const qs = query.toString();
  return apiGet<{ sets: PracticeQuestionSetSummary[]; total: number; page: number; limit: number }>(
    `/api/v1/practice/sets${qs ? `?${qs}` : ''}`
  );
}

export async function getPracticeSet(id: string): Promise<{ set: PracticeQuestionSetSummary }> {
  return apiGet<{ set: PracticeQuestionSetSummary }>(`/api/v1/practice/sets/${id}`);
}

export async function startPracticeAttempt(body: {
  bookId: string;
  questionType: string;
  mode: 'practice' | 'exam';
  chapters?: string[];
}) {
  const { data } = await api.post<{ success: boolean; attempt?: unknown; created?: boolean }>('/api/v1/practice/attempts', body);
  assertAttempt(data?.attempt);
  return { ...data, attempt: data.attempt };
}

export async function checkPracticeAnswer(id: string, questionId: string, value: unknown) {
  const { data } = await api.post<{ success: boolean; result?: import('@/types').QuestionResult }>(
    `/api/v1/practice/attempts/${id}/check`,
    { questionId, value }
  );
  if (!data?.result || typeof data.result.questionId !== 'string') unexpectedResponse();
  return { ...data, result: data.result };
}

export async function getPracticeAttempt(id: string) {
  const data = await apiGet<import('@/types').AttemptResponse>(`/api/v1/practice/attempts/${id}`);
  assertAttempt(data?.attempt);
  return data;
}

export async function savePracticeAnswers(id: string, answers: Array<{ questionId: string; value: unknown }>) {
  const { data } = await api.post<{ success: boolean; attempt: import('@/types').PracticeAttempt; autoSubmitted?: boolean }>(
    `/api/v1/practice/attempts/${id}/answers`,
    answers
  );
  assertAttempt(data?.attempt);
  return data;
}

export async function submitPracticeAnswers(id: string, answers: Array<{ questionId: string; value: unknown }>) {
  const { data } = await api.post<{ success: boolean; attempt: import('@/types').PracticeAttempt; evaluation: import('@/types').AttemptResponse['evaluation']; duplicate?: boolean; autoSubmitted?: boolean }>(
    `/api/v1/practice/attempts/${id}/submit`,
    answers
  );
  assertAttempt(data?.attempt);
  return data;
}

export async function listPracticeAttempts(params?: { mode?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.mode) query.set('mode', params.mode);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiGet<{ attempts: Array<Record<string, unknown>> }>(`/api/v1/practice/attempts${qs ? `?${qs}` : ''}`);
}

// ---- Admin: Practice & Examination management ----

export interface AdminPracticeSetRow extends PracticeQuestionSetSummary {
  questionCount: number;
  publicationState?: 'draft' | 'published' | 'archived';
  createdBy?: string;
  createdAt?: string | null;
}

export async function listAdminPracticeSets(params: Record<string, unknown>) {
  const queryParts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  const qs = queryParts.join('&');
  return apiGet<{ sets: AdminPracticeSetRow[]; total: number; page: number; limit: number }>(`/api/v1/admin/practice/sets${qs ? `?${qs}` : ''}`);
}

export async function createAdminPracticeSet(body: Record<string, unknown>) {
  const { data } = await api.post<{ success: boolean; set: AdminPracticeSetRow }>('/api/v1/admin/practice/sets', body);
  return data;
}

export async function updateAdminPracticeSet(setId: string, body: Record<string, unknown>) {
  const { data } = await api.patch<{ success: boolean; set: AdminPracticeSetRow }>(`/api/v1/admin/practice/sets/${setId}`, body);
  return data;
}

export async function deleteAdminPracticeSet(setId: string) {
  const { data } = await api.delete<{ success: boolean; deleted: boolean }>(`/api/v1/admin/practice/sets/${setId}`);
  return data;
}

export async function duplicateAdminPracticeSet(setId: string) {
  const { data } = await api.post<{ success: boolean; set: AdminPracticeSetRow; created?: boolean }>(
    `/api/v1/admin/practice/sets/${setId}/duplicate`
  );
  return data;
}

export async function publishAdminPracticeSet(setId: string) {
  const { data } = await api.post<{ success: boolean; set: AdminPracticeSetRow }>(`/api/v1/admin/practice/sets/${setId}/publish`);
  return data;
}

export async function unpublishAdminPracticeSet(setId: string) {
  const { data } = await api.post<{ success: boolean; set: AdminPracticeSetRow }>(`/api/v1/admin/practice/sets/${setId}/unpublish`);
  return data;
}

export async function previewAdminPracticeSet(setId: string) {
  const { data } = await api.post<{ success: boolean; attempt: PracticeAttempt }>(`/api/v1/admin/practice/sets/${setId}/preview`);
  return data;
}

export async function listAdminPracticeQuestions(setId: string) {
  const { data } = await api.get<{ success: boolean; questions: Array<Record<string, unknown>> }>(
    `/api/v1/admin/practice/sets/${setId}/questions`
  );
  return data;
}

export async function createAdminPracticeQuestion(setId: string, body: Record<string, unknown>) {
  const { data } = await api.post<{ success: boolean; question: Record<string, unknown>; totalQuestions?: number; totalMarks?: number }>(
    `/api/v1/admin/practice/sets/${setId}/questions`,
    body
  );
  return data;
}

export async function updateAdminPracticeQuestion(setId: string, questionId: string, body: Record<string, unknown>) {
  const { data } = await api.patch<{ success: boolean; question: Record<string, unknown>; totalQuestions?: number; totalMarks?: number }>(
    `/api/v1/admin/practice/sets/${setId}/questions/${questionId}`,
    body
  );
  return data;
}

export async function deleteAdminPracticeQuestion(setId: string, questionId: string) {
  const { data } = await api.delete<{ success: boolean; deleted: boolean }>(
    `/api/v1/admin/practice/sets/${setId}/questions/${questionId}`
  );
  return data;
}

export async function reorderAdminPracticeQuestions(setId: string, questionIds: string[]) {
  const { data } = await api.patch<{ success: boolean; reordered: boolean; totalQuestions: number }>(
    `/api/v1/admin/practice/sets/${setId}/questions/order`,
    { questionIds }
  );
  return data;
}

export async function duplicateAdminPracticeQuestion(setId: string, questionId: string) {
  const { data } = await api.post<{ success: boolean; question: Record<string, unknown> }>(
    `/api/v1/admin/practice/sets/${setId}/questions/${questionId}/duplicate`
  );
  return data;
}

/**
 * True when the backend does not implement the called route (stale deploy).
 * Callers should show a persistent "backend outdated" notice instead of a
 * bare toast so the admin knows to redeploy ,  not retry the same click.
 */
export function isRouteNotFoundError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 404 && /route not found/i.test(error.message);
  }
  if (axios.isAxiosError(error)) {
    return (
      error.response?.status === 404 &&
      /route not found/i.test(String(error.response?.data?.message ?? ''))
    );
  }
  return false;
}

type StreamEvent = { type: string; [key: string]: unknown };

function emitSseFrame(rawEvent: string, onEvent: (event: StreamEvent) => void): void {
  if (!rawEvent.trim()) return;
  for (const line of rawEvent.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        onEvent(parsed as StreamEvent);
      }
    } catch {
      // skip malformed frames instead of breaking the whole answer
    }
  }
}

const STREAM_FIRST_BYTE_TIMEOUT_MS = 45000;
const STREAM_IDLE_TIMEOUT_MS = 30000;
const STREAM_TIMEOUT_MESSAGE = 'The connection timed out. Please check your internet and try again.';

/**
 * Reads an SSE stream from an authenticated POST request.
 *
 * A mobile connection can silently stall mid-stream (the socket stays open but
 * no bytes arrive). A watchdog aborts the request after a first-byte / idle
 * timeout so the UI never hangs forever, while the caller's AbortSignal still
 * stops generation immediately when the learner taps Stop.
 */
export async function streamPost(
  url: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = tokenStore.access;
  const controller = new AbortController();
  let timedOut = false;
  let watchdog: number | null = null;

  const armWatchdog = (ms: number) => {
    if (watchdog !== null) window.clearTimeout(watchdog);
    watchdog = window.setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException(STREAM_TIMEOUT_MESSAGE, 'TimeoutError'));
    }, ms);
  };
  const onExternalAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', onExternalAbort, { once: true });

  armWatchdog(STREAM_FIRST_BYTE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const payload = await response.json();
        if (payload?.message) message = payload.message;
      } catch {
        // ignore parse errors
      }
      throw new ApiRequestError(message, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new ApiRequestError('Stream not supported', 0);

    const decoder = new TextDecoder();
    let buffer = '';
    armWatchdog(STREAM_IDLE_TIMEOUT_MS);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      armWatchdog(STREAM_IDLE_TIMEOUT_MS);
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 2);
        emitSseFrame(rawEvent, onEvent);
      }
    }

    // Decode any trailing bytes and emit a final frame that arrived without
    // the usual blank-line terminator.
    buffer += decoder.decode();
    emitSseFrame(buffer, onEvent);
  } catch (error) {
    if (timedOut) throw new ApiRequestError(STREAM_TIMEOUT_MESSAGE, 0);
    // Preserve AbortError so callers can show "Generation stopped" cleanly.
    throw error;
  } finally {
    if (watchdog !== null) window.clearTimeout(watchdog);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
