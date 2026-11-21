import { Navigate, useParams } from 'react-router-dom';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import { GuestTutor } from './tutor/GuestTutor';
import { TutorChatWorkspace } from './tutor/TutorChatWorkspace';
import '@/styles/tutor.css';

/**
 * Tutor is the single chat home for the app:
 * - guests get the temporary text tutor,
 * - signed-in learners get the saved chat history that used to live in "My Chat".
 */
export function TutorPage() {
  const status = useAuthStore((s) => s.status);
  const authed = useAuthStore((s) => s.status === 'authenticated' && !!s.user);
  const { conversationId } = useParams<{ conversationId?: string }>();

  if (status === 'loading') {
    return <FullPageSpinner label="Opening Tutor…" />;
  }

  if (!authed) {
    // Guest deep-links to a saved chat should land on the guest Tutor page.
    if (conversationId) return <Navigate to="/tutor" replace />;
    return <GuestTutor />;
  }

  return <TutorChatWorkspace />;
}

export default TutorPage;
