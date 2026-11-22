import { api, apiGet, apiPost, apiPut, apiUpload, API_BASE_URL } from './api';
export { getErrorMessage } from './api';
import type { DocsContent, DocsDraft, DocsMeta, PublicDocStats, AdminDocs, DocsTeamMember, DocsVersionEntry } from '@/types';

/** Docs public-site API helpers. */

interface DocsMetaCache {
  value: DocsMeta;
  at: number;
}

interface DocsContentCache {
  value: DocsContent;
  at: number;
}

interface DocsStatsCache {
  value: PublicDocStats;
  at: number;
}

let metaCache: DocsMetaCache | null = null;
let metaInFlight: Promise<DocsMeta> | null = null;
let contentCache: DocsContentCache | null = null;
let contentInFlight: Promise<DocsContent> | null = null;
let statsCache: DocsStatsCache | null = null;
let statsInFlight: Promise<PublicDocStats> | null = null;
const META_CACHE_MS = 15_000;
const CONTENT_CACHE_MS = 15_000;
const STATS_CACHE_MS = 10_000;

/**
 * Small shared cache so the global navbar and the /docs page do not issue the
 * same metadata request back-to-back. Pass `{ force: true }` after focus or an
 * admin visibility change.
 */
export async function getDocsMeta(options?: { force?: boolean }): Promise<DocsMeta> {
  if (!options?.force && metaCache && Date.now() - metaCache.at < META_CACHE_MS) {
    return metaCache.value;
  }
  if (metaInFlight) return metaInFlight;

  metaInFlight = apiGet<DocsMeta>('/api/v1/docs/meta')
    .then((value) => {
      metaCache = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      metaInFlight = null;
    });
  return metaInFlight;
}

/** Clears published content/statistics caches without touching visibility metadata. */
export function invalidateDocsData(): void {
  contentCache = null;
  contentInFlight = null;
  statsCache = null;
  statsInFlight = null;
}

/** Call after publish/unpublish/schedule changes so the public nav refreshes. */
export function invalidateDocsMeta(): void {
  metaCache = null;
  metaInFlight = null;
  invalidateDocsData();
}

export async function getDocsContent(options?: { force?: boolean }): Promise<DocsContent> {
  if (!options?.force && contentCache && Date.now() - contentCache.at < CONTENT_CACHE_MS) {
    return contentCache.value;
  }
  if (contentInFlight) return contentInFlight;

  contentInFlight = apiGet<{ content: DocsContent }>('/api/v1/docs/content')
    .then(({ content }) => {
      contentCache = { value: content, at: Date.now() };
      return content;
    })
    .finally(() => {
      contentInFlight = null;
    });
  return contentInFlight;
}

export async function getDocsStats(options?: { force?: boolean }): Promise<PublicDocStats> {
  if (!options?.force && statsCache && Date.now() - statsCache.at < STATS_CACHE_MS) {
    return statsCache.value;
  }
  if (statsInFlight) return statsInFlight;

  statsInFlight = apiGet<{ stats: PublicDocStats }>('/api/v1/docs/stats')
    .then(({ stats }) => {
      statsCache = { value: stats, at: Date.now() };
      return stats;
    })
    .finally(() => {
      statsInFlight = null;
    });
  return statsInFlight;
}

export function getTeamAvatarUrl(memberId: string, version?: string): string {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : '';
  return `${API_BASE_URL}/api/v1/docs/media/${encodeURIComponent(memberId)}${suffix}`;
}

/** Docs admin API helpers (admin only). */

export async function getAdminDocs(): Promise<AdminDocs> {
  return apiGet<AdminDocs>('/api/v1/admin/docs');
}

export async function saveAdminDocsDraft(patch: Partial<DocsDraft>) {
  return apiPut<AdminDocs>('/api/v1/admin/docs', patch);
}

export async function publishAdminDocs() {
  return apiPost<AdminDocs>('/api/v1/admin/docs/publish', {});
}

export async function unpublishAdminDocs() {
  return apiPost<AdminDocs>('/api/v1/admin/docs/unpublish', {});
}

export async function setAdminDocsEnabled(enabled: boolean) {
  return apiPut<AdminDocs>('/api/v1/admin/docs/enabled', { enabled });
}

export async function setAdminDocsSchedule(schedule: { start: string | null; end: string | null; timezone: string }) {
  return apiPut<AdminDocs>('/api/v1/admin/docs/schedule', schedule);
}

export async function listAdminDocVersions(): Promise<{ versions: DocsVersionEntry[] }> {
  return apiGet<{ versions: DocsVersionEntry[] }>('/api/v1/admin/docs/versions');
}

export async function restoreAdminDocVersion(version: number) {
  return apiPost<AdminDocs>(`/api/v1/admin/docs/versions/${version}/restore`, {});
}

export async function addDocTeamMember(payload: FormData) {
  const { data } = await api.post<{ member: DocsTeamMember | null }>('/api/v1/admin/docs/team', payload);
  return data;
}

export async function updateDocTeamMember(memberId: string, patch: { name?: string; role?: string; contact?: string; avatarId?: string }) {
  const { data } = await api.patch<{ member: DocsTeamMember | null }>(`/api/v1/admin/docs/team/${memberId}`, patch);
  return data;
}

/** Admin-only preview of the draft avatar. Returns an object URL to revoke. */
export async function getAdminTeamAvatarUrl(memberId: string): Promise<string> {
  const response = await api.get(`/api/v1/admin/docs/team/${memberId}/avatar`, { responseType: 'blob' });
  return URL.createObjectURL(response.data as Blob);
}

export async function updateDocTeamMemberAvatar(memberId: string, file: File) {
  const form = new FormData();
  form.append('avatar', file);
  return apiUpload<{ member: DocsTeamMember | null; avatarId: string }>(
    `/api/v1/admin/docs/team/${memberId}/avatar`,
    form
  );
}

export async function deleteDocTeamMember(memberId: string) {
  const { data } = await api.delete<{ deleted: boolean; remaining: number }>(`/api/v1/admin/docs/team/${memberId}`);
  return data;
}
