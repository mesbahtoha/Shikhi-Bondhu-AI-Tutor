import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminRoute, PublicOnlyRoute } from '@/routes/guards';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { lazyRoute } from '@/lib/lazyRoute';
import { LandingPage } from '@/pages/LandingPage';

// The landing page is the most common entry point, so it is bundled eagerly to
// avoid a second network waterfall before first paint. Every other route is
// split and loaded on demand. `lazyRoute` adds retries so a dropped mobile
// connection does not leave a route stuck on the loading spinner.
const LoginPage = lazyRoute(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })), 'login');
const RegisterPage = lazyRoute(() => import('@/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })), 'register');
const ForgotPasswordPage = lazyRoute(() => import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage })), 'forgot-password');
const ResetPasswordPage = lazyRoute(() => import('@/pages/auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage })), 'reset-password');
const ShareView = lazyRoute(() => import('@/pages/chat/ShareView').then((m) => ({ default: m.ShareView })), 'share');
const WelcomePage = lazyRoute(() => import('@/pages/WelcomePage').then((m) => ({ default: m.WelcomePage })), 'welcome');
const TutorPage = lazyRoute(() => import('@/pages/TutorPage').then((m) => ({ default: m.TutorPage })), 'tutor');
const BooksPage = lazyRoute(() => import('@/pages/BooksPage').then((m) => ({ default: m.BooksPage })), 'books');
const BookDetailPage = lazyRoute(() => import('@/pages/BookDetailPage').then((m) => ({ default: m.BookDetailPage })), 'book-detail');
const LearnPage = lazyRoute(() => import('@/pages/LearnPage').then((m) => ({ default: m.LearnPage })), 'learn');
const PracticePage = lazyRoute(() => import('@/pages/PracticePage').then((m) => ({ default: m.PracticePage })), 'practice');
const PracticeAttemptPage = lazyRoute(() => import('@/pages/PracticeAttemptPage').then((m) => ({ default: m.PracticeAttemptPage })), 'practice-attempt');
const DocsPage = lazyRoute(() => import('@/pages/DocsPage').then((m) => ({ default: m.DocsPage })), 'docs');
const DocsAdminPage = lazyRoute(() => import('@/pages/admin/Docs').then((m) => ({ default: m.DocsAdminPage })), 'admin-docs');
const DocsPreviewPage = lazyRoute(() => import('@/pages/admin/DocsPreview').then((m) => ({ default: m.DocsPreviewPage })), 'admin-docs-preview');
const AboutPage = lazyRoute(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })), 'about');
const ContactPage = lazyRoute(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })), 'contact');
const HelpPage = lazyRoute(() => import('@/pages/HelpPage').then((m) => ({ default: m.HelpPage })), 'help');
const PrivacyPage = lazyRoute(() => import('@/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })), 'privacy');
const AdminDashboard = lazyRoute(() => import('@/pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })), 'admin-dashboard');
const AdminUsers = lazyRoute(() => import('@/pages/admin/Users').then((m) => ({ default: m.AdminUsers })), 'admin-users');
const AdminNotices = lazyRoute(() => import('@/pages/admin/Notices').then((m) => ({ default: m.AdminNotices })), 'admin-notices');
const AdminChats = lazyRoute(() => import('@/pages/admin/Chats').then((m) => ({ default: m.AdminChats })), 'admin-chats');
const AdminAnalytics = lazyRoute(() => import('@/pages/admin/Analytics').then((m) => ({ default: m.AdminAnalytics })), 'admin-analytics');
const AdminTokens = lazyRoute(() => import('@/pages/admin/Tokens').then((m) => ({ default: m.AdminTokens })), 'admin-tokens');
const AdminBooks = lazyRoute(() => import('@/pages/admin/Books').then((m) => ({ default: m.AdminBooks })), 'admin-books');
const AdminAISettings = lazyRoute(() => import('@/pages/admin/AISettings').then((m) => ({ default: m.AdminAISettings })), 'admin-ai-settings');
const AdminSettings = lazyRoute(() => import('@/pages/admin/Settings').then((m) => ({ default: m.AdminSettings })), 'admin-settings');
const AdminPromptTemplates = lazyRoute(() => import('@/pages/admin/PromptTemplates').then((m) => ({ default: m.AdminPromptTemplates })), 'admin-prompt-templates');
const AdminLogs = lazyRoute(() => import('@/pages/admin/Logs').then((m) => ({ default: m.AdminLogs })), 'admin-logs');
const AdminSystem = lazyRoute(() => import('@/pages/admin/System').then((m) => ({ default: m.AdminSystem })), 'admin-system');
const AdminPractice = lazyRoute(() => import('@/pages/admin/Practice').then((m) => ({ default: m.PracticeAdminPage })), 'admin-practice');

/**
 * Route fallback that offers a manual retry when a chunk download stalls on a
 * weak mobile connection. The app normally recovers on its own (lazyRoute
 * retries and reloads once), but this guarantees an escape hatch.
 */
function PageLoader() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 9000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '50vh', gap: 12, padding: 24, textAlign: 'center' }}>
      <FullPageSpinner label="Loading…" />
      {slow && (
        <button type="button" className="pg-btn-secondary" style={{ width: 'auto' }} onClick={() => window.location.reload()}>
          Taking too long? Reload
        </button>
      )}
    </div>
  );
}

/** Old "My Chat" links now open the same conversation inside Tutor. */
function LegacyChatRedirect() {
  const { id } = useParams<{ id?: string }>();
  return <Navigate to={id ? `/tutor/${id}` : '/tutor'} replace />;
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const logout = useAuthStore((s) => s.logout);
  const resetChat = useChatStore((s) => s.reset);
  const location = useLocation();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const onExpired = () => {
      void logout();
      window.location.assign('/login');
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [logout]);

  useEffect(() => {
    return () => resetChat();
  }, [resetChat]);

  return (
    <ErrorBoundary key={location.pathname}>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/tutor/:conversationId" element={<TutorPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
          <Route path="/learn/:lessonId" element={<LearnPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/attempt/:attemptId" element={<PracticeAttemptPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route path="/share/:token" element={<ShareView />} />
          <Route path="/chat" element={<LegacyChatRedirect />} />
          <Route path="/chat/:id" element={<LegacyChatRedirect />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/books" element={<AdminBooks />} />
            <Route path="/admin/practice" element={<AdminPractice />} />
            <Route path="/admin/docs" element={<DocsAdminPage />} />
            <Route path="/admin/docs/preview" element={<DocsPreviewPage />} />
            <Route path="/admin/ai-settings" element={<AdminAISettings />} />
            <Route path="/admin/notices" element={<AdminNotices />} />
            <Route path="/admin/chats" element={<AdminChats />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/tokens" element={<AdminTokens />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/prompt-templates" element={<AdminPromptTemplates />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/system" element={<AdminSystem />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
