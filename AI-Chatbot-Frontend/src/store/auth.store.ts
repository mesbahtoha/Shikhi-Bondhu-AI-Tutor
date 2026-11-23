import { create } from 'zustand';
import type { AuthUser, QuotaStatus, UserUsage } from '@/types';
import { ApiRequestError, api, apiPost, tokenStore } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  usage: UserUsage | null;
  status: 'loading' | 'authenticated' | 'guest';
  initialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginAdmin: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

interface AuthPayload {
  user: AuthUser;
  tokens?: { accessToken: string; refreshToken: string };
}

function persistUser(user: AuthUser) {
  localStorage.setItem('nf_user', JSON.stringify(user));
}

export function readPersistedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('nf_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

const initialUser = readPersistedUser();

/**
 * React StrictMode mounts effects twice in development and a slow mobile
 * connection can also trigger duplicate calls from several mounts. One shared
 * promise keeps boot to a single /auth/me request.
 */
let initializeInFlight: Promise<void> | null = null;
let usageInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  usage: null,
  // Trust the persisted profile so mobile users are not blocked behind a slow
  // /auth/me request. The token is validated in the background below.
  status: tokenStore.access ? (initialUser ? 'authenticated' : 'loading') : 'guest',
  initialized: false,

  initialize() {
    if (initializeInFlight) return initializeInFlight;
    const run = async () => {
      if (!tokenStore.access) {
        set({ status: 'guest', initialized: true });
        return;
      }
      const persisted = get().user;
      try {
        // Single short attempt: the app already renders from the cached profile,
        // so a dead mobile connection must not trigger a long retry chain.
        const response = await api.get<{ user: AuthUser }>('/api/v1/auth/me', { timeout: 8000 });
        const payload = response.data;
        persistUser(payload.user);
        set({ user: payload.user, status: 'authenticated', initialized: true });
        void get().refreshUsage();
      } catch (error) {
        const unauthorized = error instanceof ApiRequestError && error.status === 401;
        if (unauthorized) {
          tokenStore.clear();
          localStorage.removeItem('nf_user');
          set({ user: null, status: 'guest', initialized: true });
          return;
        }
        // Offline or slow mobile network: keep the cached profile and let the
        // app render. Individual API calls will surface their own errors.
        if (persisted) {
          set({ status: 'authenticated', initialized: true });
          return;
        }
        set({ status: 'guest', initialized: true });
      }
    };
    initializeInFlight = run().finally(() => {
      initializeInFlight = null;
    });
    return initializeInFlight;
  },

  async login(email, password) {
    const payload = await apiPost<AuthPayload>('/api/v1/auth/login', { email, password });
    if (payload.tokens) tokenStore.set(payload.tokens.accessToken, payload.tokens.refreshToken);
    persistUser(payload.user);
    set({ user: payload.user, status: 'authenticated', initialized: true });
    void get().refreshUsage();
    return payload.user;
  },

  async loginAdmin(email, password) {
    const payload = await apiPost<AuthPayload>('/api/v1/auth/login/admin', { email, password });
    if (payload.tokens) tokenStore.set(payload.tokens.accessToken, payload.tokens.refreshToken);
    persistUser(payload.user);
    set({ user: payload.user, status: 'authenticated', initialized: true });
    return payload.user;
  },

  async register(name, email, password) {
    const payload = await apiPost<AuthPayload>('/api/v1/auth/register', { name, email, password });
    if (payload.tokens) tokenStore.set(payload.tokens.accessToken, payload.tokens.refreshToken);
    persistUser(payload.user);
    set({ user: payload.user, status: 'authenticated', initialized: true });
    void get().refreshUsage();
    return payload.user;
  },

  async logout() {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) {
      try {
        await apiPost('/api/v1/auth/logout', { refreshToken });
      } catch {
        // ignore network errors during logout
      }
    }
    tokenStore.clear();
    localStorage.removeItem('nf_user');
    // Clear user-specific cached data on logout/account switch (child safety).
    try {
      const { useChatStore } = await import('./chat.store');
      const { useTutorStore } = await import('./tutor.store');
      useChatStore.getState().reset();
      useTutorStore.getState().resetTutor();
    } catch {
      // stores may be unavailable in some test contexts
    }
    set({ user: null, usage: null, status: 'guest' });
  },

  refreshUsage() {
    if (usageInFlight) return usageInFlight;
    usageInFlight = (async () => {
      try {
        const payload = await api.get<{ usage: UserUsage }>('/api/v1/users/me/usage', { timeout: 10000 });
        set({ usage: payload.data.usage });
      } catch {
        // non-fatal
      }
    })().finally(() => {
      usageInFlight = null;
    });
    return usageInFlight;
  },

  setUser(user) {
    persistUser(user);
    set({ user });
  },
}));

export function useQuota(): { quota: QuotaStatus | null; quotaPct: number } {
  const usage = useAuthStore((s) => s.usage);
  const quota = usage?.quota ?? null;
  let quotaPct = 0;
  if (quota && quota.daily.limit > 0) {
    quotaPct = Math.min(100, Math.round((quota.daily.used / quota.daily.limit) * 100));
  }
  return { quota, quotaPct };
}
