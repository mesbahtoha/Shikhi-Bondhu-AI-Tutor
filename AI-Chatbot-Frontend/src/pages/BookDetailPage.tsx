import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MdDownload, MdMenuBook } from 'react-icons/md';
import { getBook, listBooks } from '@/lib/tutor';
import { API_BASE_URL, ApiRequestError, getErrorMessage } from '@/lib/api';
import { RequestErrorState, SlowLoadingNotice, useSlowLoading } from '@/components/ui/RequestState';
import { useTutorStore } from '@/store/tutor.store';
import { useLang } from '@/lib/i18n';
import type { BookInfo } from '@/types';

function languageLabel(book: BookInfo, bn: boolean): string {
  const code = book.ocrLanguage || book.language;
  if (code === 'bn') return bn ? 'বাংলা' : 'Bengali';
  if (code === 'en') return 'English';
  return code || (bn ? 'বাংলা/ইংরেজি' : 'bn/en');
}

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const setBookId = useTutorStore((s) => s.setBookId);
  const setSubject = useTutorStore((s) => s.setSubject);
  const { lang } = useLang();
  const bn = lang === 'bn';
  const [book, setBook] = useState<BookInfo | null>(null);
  const [related, setRelated] = useState<BookInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!bookId) return;
    const controller = new AbortController();
    let active = true;
    setBook(null);
    setError(null);
    setNotFound(false);
    setLoading(true);
    getBook(bookId, controller.signal)
      .then((r) => {
        if (active) setBook(r.book);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    listBooks(undefined, controller.signal)
      .then((all) => {
        if (active) setRelated(all.filter((b) => b._id !== bookId).slice(0, 3));
      })
      .catch(() => {
        if (active) setRelated([]);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [bookId, reloadTick]);

  const slow = useSlowLoading(loading);
  const retry = useCallback(() => setReloadTick((tick) => tick + 1), []);

  if (notFound) {
    return (
      <div className="pg-app" style={{ padding: 24 }}>
        <div className="pg-container" style={{ maxWidth: 720 }}>
          <p>{bn ? 'বইটি পাওয়া যায়নি।' : 'This book could not be found.'}</p>
          <Link to="/books" className="pg-btn-secondary">{bn ? 'সব বই' : 'All books'}</Link>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pg-app" style={{ padding: 24 }}>
        <div className="pg-container" style={{ maxWidth: 720 }}>
          <RequestErrorState
            icon="📚"
            title={bn ? 'বই লোড করা যায়নি' : 'Could not load this book'}
            description={error}
            onRetry={retry}
            secondaryAction={<Link to="/books" className="pg-btn-secondary">{bn ? 'সব বই' : 'All books'}</Link>}
          />
        </div>
      </div>
    );
  }
  if (loading || !book) {
    return (
      <div className="pg-app" style={{ padding: 24 }}>
        <div className="pg-container">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text short" />
          <SlowLoadingNotice show={slow} onRetry={retry} />
        </div>
      </div>
    );
  }

  const downloadUrl = book.downloadUrl
    ? `${API_BASE_URL}${book.downloadUrl}`
    : `${API_BASE_URL}/api/v1/books/${book._id}/download`;
  const canDownload = book.hasDownload !== false;

  return (
    <div className="pg-app" style={{ paddingBottom: 72 }}>
      <div className="pg-container" style={{ maxWidth: 860, paddingTop: 24 }}>
        <Link to="/books" className="pg-btn-secondary">{bn ? 'সব বই' : 'All books'}</Link>
        <div className="pg-card pg-card-yellow-shadow" style={{ padding: 24, marginTop: 14 }}>
          <span className="pg-badge pg-badge-mint">{book.subject}</span>
          <h1 style={{ fontSize: 30, margin: '10px 0 4px' }}>{book.title}</h1>
          <p className="muted">{book.subject}, {book.grade}, {book.curriculum}{book.edition ? `, ${book.edition}` : ''}</p>
          <div className="key-grid">
            {[
              [bn ? 'বিষয়' : 'Subject', book.subject],
              [bn ? 'শ্রেণি' : 'Grade', book.grade],
              [bn ? 'কারিকুলাম' : 'Curriculum', book.curriculum],
              [bn ? 'ভাষা' : 'Language', languageLabel(book, bn)],
              [bn ? 'সংস্করণ' : 'Edition', book.edition || (bn ? 'প্রযোজ্য নয়' : 'N/A')],
              [bn ? 'প্রকাশক' : 'Publisher', book.publisher || (bn ? 'প্রযোজ্য নয়' : 'N/A')],
            ].map(([k, v]) => (
              <div key={k} className="key-cell"><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>
          <button
            className="pg-btn-candy"
            style={{ marginTop: 14 }}
            onClick={() => {
              setBookId(book._id);
              if (book.subject) setSubject(book.subject);
              navigate('/tutor');
            }}
          >
            {bn ? 'এই বই থেকে জিজ্ঞেস করো' : 'Ask from this book'}
          </button>
        </div>

        <div className="pg-card download-card" style={{ padding: 22, marginTop: 16 }}>
          <div className="download-icon" aria-hidden="true"><MdMenuBook size={26} /></div>
          <div className="download-copy">
            <h2 style={{ fontSize: 19, margin: 0 }}>{bn ? 'বইটি ডাউনলোড করো' : 'Download this book'}</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13.5 }}>
              {bn
                ? `পুরো বইয়ের PDF${book.pageCount ? ` · ${book.pageCount} পৃষ্ঠা` : ''}। অফলাইনে পড়া বা প্রিন্ট করার জন্য সংরক্ষণ করো।`
                : `The complete book PDF${book.pageCount ? ` · ${book.pageCount} pages` : ''}. Save it for offline reading or printing.`}
            </p>
          </div>
          {canDownload ? (
            <a className="pg-btn-candy download-btn" href={downloadUrl} download={`${book.title}.pdf`} rel="noreferrer">
              <MdDownload size={19} /> {bn ? 'PDF ডাউনলোড' : 'Download PDF'}
            </a>
          ) : (
            <span className="pg-badge pg-badge-yellow" style={{ alignSelf: 'center' }}>
              {bn ? 'PDF এখনো যুক্ত হয়নি' : 'PDF not added yet'}
            </span>
          )}
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 19 }}>{bn ? 'সম্পর্কিত বই' : 'Related books'}</h2>
            <div className="book-grid">
              {related.map((r) => (
                <article key={r._id} className="pg-card book-card hover-lift">
                  <div className="book-body">
                    <h3>{r.title}</h3>
                    <p className="muted small">{r.subject} • {r.grade}</p>
                    <Link to={`/books/${r._id}`} className="pg-btn-secondary book-btn">{bn ? 'বিস্তারিত দেখো' : 'View details'}</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
