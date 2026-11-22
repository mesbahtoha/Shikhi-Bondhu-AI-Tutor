import { api, apiGet, apiPost, apiPut, apiUpload, API_BASE_URL } from './api';
export { getErrorMessage } from './api';
import type { DocsContent, DocsDraft, DocsMeta, PublicDocStats, AdminDocs, DocsTeamMember, DocsVersionEntry } from '@/types';

/** Docs public-site API helpers. */

export async function getDocsMeta(): Promise<DocsMeta> {
  return apiGet<DocsMeta>('/api/v1/docs/meta');
}

export async function getDocsContent(): Promise<DocsContent> {
  const { content } = await apiGet<{ content: DocsContent }>('/api/v1/docs/content');
  return content;
}

export async function getDocsStats(): Promise<PublicDocStats> {
  const { stats } = await apiGet<{ stats: PublicDocStats }>('/api/v1/docs/stats');
  return stats;
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
