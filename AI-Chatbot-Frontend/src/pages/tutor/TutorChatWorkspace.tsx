import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaRobot } from 'react-icons/fa';
import {
  MdClose,
  MdDelete,
  MdDownload,
  MdEdit,
  MdKeyboardArrowDown,
  MdLink,
  MdMenu,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import { useChatStore } from '@/store/chat.store';
import { useChatSession } from '@/hooks/useChatSession';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatComposer, type ComposerSendPayload } from '@/components/chat/ChatComposer';
import { TutorHistory } from '@/components/tutor/TutorHistory';
import { QuizCard } from '@/components/lesson/QuizCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Form';
import { ChatSkeleton } from '@/components/ui/Skeleton';
import { API_BASE_URL, apiPost, getErrorMessage } from '@/lib/api';
import { makeTutorQuiz } from '@/lib/tutor';
import type { QuizPreview, TutorSource } from '@/types';
import { TUTOR_EXAMPLES } from './examples';

function TutorQuizAction({ topic }: { topic: string }) {
  const [quiz, setQuiz] = useState<{ quiz: QuizPreview; sources: TutorSource[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  const build = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setTried(true);
    try {
      setQuiz(await makeTutorQuiz(topic));
    } finally {
      setLoading(false);
    }
  };

  if (quiz) return <QuizCard quiz={quiz.quiz} sources={quiz.sources} />;

  return (
    <div className="tutor-quiz-action">
      <button
        type="button"
        className="pg-btn-secondary"
        style={{ minHeight: 42, padding: '8px 18px', fontSize: 13.5, width: 'auto' }}
        onClick={() => void build()}
        disabled={loading}
      >
        {loading ? 'Making practice question…' : '📝 Make practice question'}
      </button>
      {tried && !loading && (
        <span className="tutor-quiz-note">No practice question ready for this topic yet.</span>
      )}
    </div>
  );
}

/**
 * Signed-in Tutor: the former "My Chat" experience (saved conversations,
 * streaming answers, rename/share/export/delete) rendered inside Tutor.
 */
export function TutorChatWorkspace() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const current = useChatStore((s) => s.current);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const session = useChatSession(conversationId ?? '');
  const ready = Boolean(current && conversationId && current.conversation._id === conversationId);
  const messages = ready && current ? current.messages : [];
  const conversation = ready && current ? current.conversation : null;
  const lastMessage = messages[messages.length - 1];
  const lastAssistant =
    lastMessage?.role === 'assistant' && lastMessage.status === 'complete' ? lastMessage : null;
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');

  const closeHistory = () => setHistoryOpen(false);

  const handleNewChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await createConversation('New chat');
      closeHistory();
      navigate(`/tutor/${created._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleted = (id: string) => {
    closeHistory();
    if (id === conversationId) navigate('/tutor', { replace: true });
  };

  // No conversation in the URL: resume the most recent chat, or create one so
  // the composer is always ready for a signed-in learner.
  useEffect(() => {
    if (conversationId) return;
    let active = true;
    void loadConversations().then(async () => {
      if (!active) return;
      const latest = useChatStore.getState().conversations[0];
      if (latest) {
        navigate(`/tutor/${latest._id}`, { replace: true });
        return;
      }
      try {
        const created = await createConversation('New chat');
        if (active) navigate(`/tutor/${created._id}`, { replace: true });
      } catch (error) {
        if (active) toast.error(getErrorMessage(error));
      }
    });
    return () => {
      active = false;
    };
  }, [conversationId, loadConversations, createConversation, navigate]);

  // Load the selected conversation and keep the history list fresh.
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    setLoading(true);
    loadConversation(conversationId)
      .catch(() => {
        if (active) navigate('/tutor', { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void loadConversations();
    return () => {
      active = false;
    };
  }, [conversationId, loadConversation, loadConversations, navigate]);

  // The selected chat disappeared (deleted here or in another tab).
  useEffect(() => {
    if (!conversationId || loading) return;
    if (current && current.conversation._id !== conversationId) {
      navigate('/tutor', { replace: true });
    }
  }, [conversationId, loading, current, navigate]);

  // Follow the conversation while the learner is at the bottom.
  useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    setShowScrollBtn(false);
  }, [conversationId]);

  // Lock body scroll + close on Escape while the mobile history drawer is open.
  useEffect(() => {
    document.body.classList.toggle('drawer-open', historyOpen);
    if (!historyOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHistoryOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [historyOpen]);

  useEffect(() => {
    return () => document.body.classList.remove('drawer-open');
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = nearBottom;
    setShowScrollBtn(!nearBottom);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    atBottomRef.current = true;
    setShowScrollBtn(false);
  };

  const handleRename = async () => {
    if (!conversationId || !renameValue.trim()) return;
    await renameConversation(conversationId, renameValue.trim());
    setRenameOpen(false);
    toast.success('Renamed');
  };

  const handleShare = async () => {
    if (!conversationId) return;
    try {
      const payload = await apiPost<{ shareToken: string; shareUrl: string | null }>(
        `/api/v1/conversations/${conversationId}/share`,
        { enabled: true }
      );
      const url = `${window.location.origin}/share/${payload.shareToken}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Share link copied to clipboard');
      } catch {
        window.prompt('Share link:', url);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    if (!conversationId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/conversations/${conversationId}/export?format=${format}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('nf_access_token') ?? ''}` } }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-${conversationId.slice(-8)}.${format === 'markdown' ? 'md' : 'json'}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const handleDelete = async () => {
    if (!conversationId) return;
    if (!window.confirm('Delete this conversation?')) return;
    await deleteConversation(conversationId);
    navigate('/tutor', { replace: true });
  };

  const sendExample = (text: string) => {
    if (!ready || isStreaming) return;
    session.sendMessage(text);
  };

  const historyPanel = (
    <TutorHistory
      activeId={conversationId}
      creating={creating}
      onNew={() => void handleNewChat()}
      onSelect={(id) => {
        closeHistory();
        navigate(`/tutor/${id}`);
      }}
      onDeleted={handleDeleted}
    />
  );

  return (
    <div className="pg-app tutor-workspace">
      <aside className="tutor-sidebar" aria-label="Chat history">
        {historyPanel}
      </aside>

      {historyOpen && (
        <>
          <div className="drawer-overlay" onClick={closeHistory} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Chat history">
            <div className="drawer-head">
              <span className="font-semibold" style={{ fontSize: 15 }}>Your chats</span>
              <button className="btn btn-ghost btn-icon" onClick={closeHistory} aria-label="Close chat history">
                <MdClose size={20} />
              </button>
            </div>
            {historyPanel}
          </div>
        </>
      )}

      <div className="tutor-main">
        <header className="tutor-chat-header">
          <button
            type="button"
            className="btn btn-ghost btn-icon tutor-menu-btn"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open chat history"
          >
            <MdMenu size={20} />
          </button>

          <div className="tutor-chat-title">
            <strong className="ellipsis">{conversation?.title || 'Tutor'}</strong>
            <small>
              {conversation
                ? `${messages.length} message${messages.length === 1 ? '' : 's'} · saved automatically`
                : 'Ask from your book'}
            </small>
          </div>

          {conversation && (
            <div className="tutor-chat-actions">
              <Button
                size="sm"
                variant="ghost"
                className="chat-action"
                title="Rename"
                onClick={() => {
                  setRenameValue(conversation.title);
                  setRenameOpen(true);
                }}
              >
                <MdEdit size={15} /> <span className="chat-action-label">Rename</span>
              </Button>
              <Button size="sm" variant="ghost" className="chat-action" title="Share" onClick={() => void handleShare()}>
                <MdLink size={15} /> <span className="chat-action-label">Share</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="chat-action"
                title="Export"
                onClick={() => void handleExport('markdown')}
              >
                <MdDownload size={15} /> <span className="chat-action-label">Export</span>
              </Button>
              <Button size="sm" variant="ghost" className="chat-action" title="Delete" onClick={() => void handleDelete()}>
                <MdDelete size={15} />
              </Button>
            </div>
          )}
        </header>

        <div className="tutor-scroll scroll-thin" ref={scrollRef} onScroll={handleScroll}>
          {!ready || loading ? (
            <ChatSkeleton />
          ) : messages.length === 0 ? (
            <div className="tutor-empty">
              <div className="tutor-empty-icon" aria-hidden="true">
                <FaRobot />
              </div>
              <h1 style={{ fontSize: 26, margin: '0 0 8px' }}>👋 শিখি বন্ধু, আজ কী শিখবে?</h1>
              <p style={{ color: 'var(--text-secondary)', margin: '0 auto 14px', maxWidth: 480 }}>
                Ask from your book in Bangla or Banglish. Your chats are saved here, so you can come back anytime.
              </p>
              <div className="tutor-empty-steps">
                <span className="pg-badge pg-badge-mint">1. Write Unit</span>
                <span className="pg-badge pg-badge-pink">2. Add Lesson and Page</span>
                <span className="pg-badge pg-badge-yellow">3. Add Activity</span>
              </div>
              <div className="tutor-empty-examples">
                {TUTOR_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="pg-btn-secondary"
                    style={{ fontSize: 13, padding: '8px 16px', minHeight: 40, width: 'auto' }}
                    onClick={() => sendExample(example)}
                    disabled={isStreaming}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="tutor-thread">
              {messages.map((message) => (
                <MessageBubble key={message._id} message={message} />
              ))}
              {lastAssistant && !isStreaming && (
                <TutorQuizAction key={lastAssistant._id} topic={lastUser?.content ?? ''} />
              )}
            </div>
          )}
        </div>

        <div className="tutor-composer">
          {showScrollBtn && (
            <button className="scroll-bottom-btn" onClick={scrollToBottom} title="Scroll to latest message" aria-label="Scroll to latest message">
              <MdKeyboardArrowDown size={22} />
            </button>
          )}
          <div className="tutor-composer-inner">
            <ChatComposer
              onSend={(payload: ComposerSendPayload) =>
                session.sendMessage(payload.content, {
                  language: payload.language,
                  mode: payload.mode,
                  attachments: payload.attachments,
                })
              }
              isStreaming={isStreaming}
              onStop={session.stop}
              disabled={!ready || loading}
            />
          </div>
        </div>
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename conversation">
        <Input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          placeholder="Conversation title"
          onKeyDown={(event) => event.key === 'Enter' && void handleRename()}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleRename()}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}
