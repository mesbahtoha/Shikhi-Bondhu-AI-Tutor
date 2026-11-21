import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { QuizCard } from '@/components/lesson/QuizCard';
import { ChatComposer, getLanguagePreference } from '@/components/chat/ChatComposer';
import type { ComposerLockedFeature, ComposerSendPayload } from '@/components/chat/ChatComposer';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { guestChat, listBooks, sendTutorFeedback } from '@/lib/tutor';
import { getErrorMessage } from '@/lib/api';
import { useTutorStore } from '@/store/tutor.store';
import { parseTextbookRef } from '@/lib/textbookRef';
import type { AIMode, BookInfo, ChatAttachment, TutorResponse } from '@/types';
import { TUTOR_EXAMPLES } from './examples';

interface Turn {
  id: number;
  question: string;
  attachments?: ChatAttachment[];
  response?: TutorResponse;
  error?: string;
  stopped?: boolean;
  pending: boolean;
  feedback?: 'up' | 'down' | null;
}

const LOCKED_FEATURE_TEXT: Record<ComposerLockedFeature, { title: string; detail: string }> = {
  attachment: {
    title: 'Attach a photo or PDF',
    detail: 'Send a photo of your book page or a PDF, and the tutor will read it and help you.',
  },
  mode: {
    title: 'Choose an answer mode',
    detail: 'Pick Fast, Balanced or Accurate to control how the tutor answers.',
  },
  language: {
    title: 'Choose the reply language',
    detail: 'Pick Auto, English, বাংলা or Banglish for the answer.',
  },
  mic: {
    title: 'Use voice input',
    detail: 'Speak your question instead of typing it.',
  },
  voice: {
    title: 'Start a voice conversation',
    detail: 'Talk with the tutor and hear the answer read aloud.',
  },
};

function isAbortError(error: unknown): boolean {
  const candidate = error as { name?: string; code?: string } | null;
  return candidate?.name === 'CanceledError' || candidate?.name === 'AbortError' || candidate?.code === 'ERR_CANCELED';
}

let turnId = 0;

function RefHelper({ question }: { question: string }) {
  const ref = useMemo(() => parseTextbookRef(question), [question]);
  if (!ref) return null;
  return (
    <div
      className="pg-card pg-card-yellow-shadow"
      style={{ padding: 14, marginBottom: 12, background: 'var(--surface-warn)' }}
    >
      <div style={{ fontWeight: 800, marginBottom: 4 }}>I found your book part: {ref.label}</div>
      <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 14 }}>
        {ref.exercise
          ? 'This is the letter exercise. You can read the answer below or practice it in the Practice section.'
          : 'Nice. You wrote Unit, Lesson and Page together. That helps me find the exact answer.'}
      </p>
      {ref.exercise && (
        <Link to="/practice" className="pg-btn-secondary" style={{ textDecoration: 'none', minHeight: 44 }}>
          Practice this exercise
        </Link>
      )}
    </div>
  );
}

/** Guest tutor workspace: temporary text chat with login prompts. */
export function GuestTutor() {
  const subject = useTutorStore((s) => s.subject);
  const bookId = useTutorStore((s) => s.bookId);
  const setSubject = useTutorStore((s) => s.setSubject);
  const setBookId = useTutorStore((s) => s.setBookId);
  const bumpGuestUsed = useTutorStore((s) => s.bumpGuestUsed);
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sending, setSending] = useState(false);
  const [loginFeature, setLoginFeature] = useState<ComposerLockedFeature | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listBooks().then(setBooks).catch(() => setBooks([]));
  }, []);

  const send = async (text: string, options?: { language?: string; mode?: AIMode }) => {
    const question = text.trim();
    if (!question || sending) return;
    const id = ++turnId;
    setTurns((current) => [...current, { id, question, pending: true }]);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const lang = options?.language ?? getLanguagePreference();
      const language = lang === 'banglish' ? 'auto' : lang;
      const response = await guestChat(question, {
        language,
        subject: subject || undefined,
        bookId: bookId || undefined,
      });
      bumpGuestUsed();
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, response, pending: false } : turn)));
    } catch (error) {
      if (isAbortError(error)) {
        setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, pending: false, stopped: true } : turn)));
        toast('Generation stopped.', { icon: '⏹️' });
        return;
      }
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, error: getErrorMessage(error), pending: false } : turn)));
      toast.error(getErrorMessage(error));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
    }
  };

  const stop = () => abortRef.current?.abort();

  const handleLockedAction = (feature: ComposerLockedFeature) => {
    setLoginFeature(feature);
  };

  const lastTurn = turns[turns.length - 1];
  const voiceExternal = {
    busy: sending,
    reply: lastTurn?.response
      ? { id: lastTurn.response.requestId, text: lastTurn.response.answer }
      : null,
  };

  const vote = (id: number, helpful: boolean) => {
    setTurns((current) => current.map((turn) => {
      if (turn.id !== id || !turn.response || turn.feedback) return turn;
      void sendTutorFeedback(turn.response.requestId, helpful);
      return { ...turn, feedback: helpful ? 'up' : 'down' };
    }));
  };

  return (
    <div className="pg-app" style={{ paddingBottom: 190 }}>
      <div className="pg-container" style={{ maxWidth: 780, paddingTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontSize: 26 }}>
            Shikhi Bondhu{' '}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Class 3 English Friend</span>
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/practice" className="pg-badge pg-badge-pink" style={{ textDecoration: 'none' }}>Practice</Link>
            <Link
              to="/login"
              state={{ from: '/tutor' }}
              className="pg-badge pg-badge-mint"
              style={{ textDecoration: 'none' }}
            >
              Log in to save chats
            </Link>
          </div>
        </div>

        <div className="pg-card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>How to ask in 3 steps</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="pg-badge pg-badge-mint">1. Write Unit</span>
            <span className="pg-badge pg-badge-pink">2. Add Lesson and Page</span>
            <span className="pg-badge pg-badge-yellow">3. Add Activity</span>
          </div>
          <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 14.5 }}>Example: Unit 3, Lesson 5, Page 45, Match the requests.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="pg-input" value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Pick subject" style={{ minWidth: 140 }}>
              <option value="">All subjects</option>
              {Array.from(new Set(books.map((book) => book.subject))).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select className="pg-input" value={bookId} onChange={(event) => setBookId(event.target.value)} aria-label="Pick book" style={{ minWidth: 160 }}>
              <option value="">All books</option>
              {books.filter((book) => !subject || book.subject === subject).map((book) => (
                <option key={book._id} value={book._id}>{book.title}</option>
              ))}
            </select>
          </div>
          <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            Guest mode allows text questions only. <Link to="/login" state={{ from: '/tutor' }}>Log in</Link> for photos, voice and saved chats.
          </p>
        </div>

        {turns.length === 0 && (
          <div className="pg-card pg-card-yellow-shadow" style={{ padding: 22, textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 44 }} aria-hidden="true">📖</div>
            <h2 style={{ fontSize: 20, margin: '8px 0' }}>What will you learn today</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Tap one below. Bangla or Banglish is fine. Answer comes in easy Bangla.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {TUTOR_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="pg-btn-secondary"
                  style={{ fontSize: 13, padding: '8px 16px', minHeight: 40, width: 'auto' }}
                  onClick={() => void send(example)}
                  disabled={sending}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {turns.map((turn) => (
            <div key={turn.id}>
              <div className="pg-card" style={{ padding: 14, background: 'var(--surface-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>You wrote:</div>
                <div style={{ whiteSpace: 'pre-wrap', fontWeight: 600 }}>{turn.question}</div>
              </div>
              <div className="pg-card pg-card-mint-shadow" style={{ padding: 18, marginTop: 10 }}>
                {turn.pending && <p style={{ color: 'var(--text-secondary)' }}>Friend is thinking...</p>}
                {turn.stopped && <p style={{ color: 'var(--text-secondary)' }}>Stopped. Ask again whenever you are ready.</p>}
                {turn.error && <p style={{ color: 'var(--danger-text)' }}>{turn.error}</p>}
                {turn.response && (
                  <>
                    <RefHelper question={turn.question} />
                    <MarkdownRenderer content={turn.response.answer} />
                    {turn.response.answerStatus === 'INSUFFICIENT_BOOK_CONTEXT' && (
                      <div className="pg-card" style={{ padding: 12, marginTop: 10, background: 'var(--surface-warn)' }}>
                        <p className="pg-badge pg-badge-yellow" style={{ marginBottom: 8 }}>General help, not found in book</p>
                        <p style={{ margin: '8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                          Tip: write Unit, Lesson, Page and Activity together. Or paste the full question text for a perfect check.
                        </p>
                        <Link to="/practice" className="pg-btn-secondary" style={{ textDecoration: 'none', minHeight: 44, width: 'auto' }}>
                          Practice this request
                        </Link>
                      </div>
                    )}
                    {turn.response.sources.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--border-color)' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>Book source</div>
                        {turn.response.sources.map((source) => (
                          <div key={source.chunkId} style={{ fontSize: 14, marginBottom: 4 }}>
                            Book: {source.bookTitle}
                            {source.chapterTitle ? `, Chapter: ${source.chapterTitle}` : ''}
                            {source.pageStart ? `, Page ${source.pageStart}${source.pageEnd && source.pageEnd !== source.pageStart ? ` to ${source.pageEnd}` : ''}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                    {turn.response.quiz && <QuizCard quiz={turn.response.quiz} sources={turn.response.sources} />}
                    {turn.response.followUpQuestion && (
                      <p className="text-sm" style={{ marginTop: 10 }}>Now you try. {turn.response.followUpQuestion}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '2px solid var(--border-color)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 700 }}>Did this help</span>
                      <button
                        type="button"
                        className="pg-btn-secondary"
                        style={{ minHeight: 38, padding: '6px 14px', fontSize: 13, width: 'auto' }}
                        aria-label="It helped"
                        disabled={!turn.response || !!turn.feedback}
                        onClick={() => vote(turn.id, true)}
                      >
                        {turn.feedback === 'up' ? 'Thanks' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        className="pg-btn-secondary"
                        style={{ minHeight: 38, padding: '6px 14px', fontSize: 13, width: 'auto', opacity: turn.feedback === 'up' ? 0.45 : 1 }}
                        aria-label="It did not help"
                        disabled={!turn.response || !!turn.feedback}
                        onClick={() => vote(turn.id, false)}
                      >
                        {turn.feedback === 'down' ? 'Sorry' : 'Not yet'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            borderTop: '2px solid var(--border-color)',
            padding: '10px 16px',
            zIndex: 40,
          }}
        >
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <ChatComposer
              onSend={(payload: ComposerSendPayload) =>
                void send(payload.content, { language: payload.language, mode: payload.mode })
              }
              isStreaming={sending}
              onStop={stop}
              locked
              onLockedAction={handleLockedAction}
              voiceExternal={voiceExternal}
            />
          </div>
        </div>
      </div>

      <Modal
        open={!!loginFeature}
        onClose={() => setLoginFeature(null)}
        title={loginFeature ? `🔒 ${LOCKED_FEATURE_TEXT[loginFeature].title}` : 'Log in first'}
        maxWidth={460}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => setLoginFeature(null)}>
              Keep chatting as guest
            </Button>
            <Button onClick={() => navigate('/login', { state: { from: '/tutor' } })}>Log in</Button>
          </div>
        }
      >
        <p style={{ marginTop: 0, fontWeight: 600 }}>
          {loginFeature ? LOCKED_FEATURE_TEXT[loginFeature].detail : ''}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Attachments, voice input, voice conversation, reply language and answer mode are for
          logged-in learners. This keeps your files private and saves your progress.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 0 }}>
          আগে লগইন করো, তারপর এই সুবিধাগুলো ব্যবহার করো। গেস্ট হিসেবে তুমি লেখা প্রশ্ন করতে পারো।
        </p>
      </Modal>
    </div>
  );
}
