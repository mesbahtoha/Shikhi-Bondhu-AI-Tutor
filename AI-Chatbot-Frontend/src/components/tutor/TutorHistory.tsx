import { useEffect, useState } from 'react';
import { MdAdd, MdDelete } from 'react-icons/md';
import { useChatStore } from '@/store/chat.store';
import { useConfirm } from '@/components/ui/ConfirmDialog';

interface TutorHistoryProps {
  activeId?: string;
  creating?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted?: (id: string) => void;
}

/**
 * Saved chat history for the Tutor workspace. This is the former "My Chat"
 * conversation list, now living inside Tutor so learners have one chat page.
 */
export function TutorHistory({ activeId, creating = false, onSelect, onNew, onDeleted }: TutorHistoryProps) {
  const confirm = useConfirm();
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadConversations(search.trim() || undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, loadConversations]);

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: 'Delete chat?',
      message: `Delete "${title || 'this chat'}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    await deleteConversation(id);
    if (id === activeId) onDeleted?.(id);
  };

  return (
    <div className="tutor-history">
      <div className="tutor-history-head">
        <button type="button" className="tutor-new-chat" onClick={onNew} disabled={creating}>
          <MdAdd size={18} /> New chat
        </button>
      </div>

      <div className="tutor-history-search">
        <input
          className="input"
          placeholder="Search chats…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search chats"
        />
      </div>

      <div className="tutor-history-list scroll-thin">
        {conversations.length === 0 ? (
          <p className="tutor-history-empty">
            {search.trim() ? 'No chats match your search.' : 'No chats yet. Ask your first question!'}
          </p>
        ) : (
          conversations.map((conversation) => {
            const active = conversation._id === activeId;
            return (
              <div key={conversation._id} className={`tutor-history-item${active ? ' active' : ''}`}>
                <button
                  type="button"
                  className="tutor-history-open"
                  title={conversation.title || 'Untitled chat'}
                  onClick={() => onSelect(conversation._id)}
                >
                  {conversation.pinned ? '📌 ' : ''}
                  {conversation.title || 'Untitled chat'}
                </button>
                <button
                  type="button"
                  className="tutor-history-delete"
                  title="Delete chat"
                  aria-label={`Delete ${conversation.title || 'chat'}`}
                  onClick={() => void handleDelete(conversation._id, conversation.title)}
                >
                  <MdDelete size={15} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
