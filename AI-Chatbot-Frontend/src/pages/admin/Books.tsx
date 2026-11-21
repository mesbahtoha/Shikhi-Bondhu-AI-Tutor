import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  adminArchiveBook,
  adminCompleteBookUpload,
  adminCreateBookUploadSession,
  adminDeleteBook,
  adminGetBook,
  adminListBooks,
  adminPublishBook,
  adminReindexBook,
  adminUnpublishBook,
  adminUploadBook,
  adminUploadBookChunk,
} from '@/lib/tutor';
import { getErrorMessage, isRouteNotFoundError } from '@/lib/api';
import { StaleBackendNotice } from '@/components/ui/StaleBackendNotice';
import type { AdminBook, IngestionJob } from '@/types';

/** Vercel rejects request bodies over 4.5 MB, so larger PDFs are sent in slices. */
const DIRECT_UPLOAD_LIMIT = 3.5 * 1024 * 1024;

async function uploadChunkWithRetry(uploadId: string, index: number, chunk: Blob) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await adminUploadBookChunk(uploadId, index, chunk);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw lastError;
}

function stateBadge(book: AdminBook) {
  if (book.publicationState === 'published') return <Badge variant="success">প্রকাশিত</Badge>;
  if (book.publicationState === 'archived') return <Badge variant="muted">আর্কাইভ</Badge>;
  if (book.processingState === 'failed') return <Badge variant="danger">ব্যর্থ</Badge>;
  if (book.processingState !== 'ready') return <Badge variant="warning">প্রসেসিং</Badge>;
  return <Badge variant="info">খসড়া</Badge>;
}

export function AdminBooks() {
  const confirm = useConfirm();
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<{ book: AdminBook; jobs: IngestionJob[]; samples: { chunkId: string; chunkIndex: number; chapterTitle?: string; pageStart?: number; pageEnd?: number; preview: string }[] } | null>(null);
  const [form, setForm] = useState({ title: '', subject: 'গণিত', grade: 'Class 3', curriculum: 'NCTB', language: 'bn', edition: '', publisher: '', rightsStatus: 'unverified' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [staleBackend, setStaleBackend] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  const pageCount = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleBooks = useMemo(
    () => books.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [books, safePage]
  );

  const refresh = async () => {
    setLoading(true);
    setStaleBackend(false);
    try {
      setBooks(await adminListBooks({ search: search || undefined }));
    } catch (e) {
      if (isRouteNotFoundError(e)) {
        setStaleBackend(true);
        setBooks([]);
      } else {
        toast.error(getErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: string) => {
    if (openingId) return;
    setOpeningId(id);
    try {
      setDetail(await adminGetBook(id));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setOpeningId(null);
    }
  };

  const doAction = async (id: string, action: () => Promise<unknown>, label: string) => {
    setBusy(id + label);
    try {
      await action();
      toast.success(label + ' সফল');
      await refresh();
      if (detail) setDetail(await adminGetBook(id));
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const removeBook = async (book: AdminBook) => {
    const confirmed = await confirm({
      title: 'বই মুছে ফেলবেন?',
      message: `"${book.title}" এবং এর সব চাঙ্ক মুছে যাবে। এটি ফেরানো যাবে না।`,
      confirmLabel: 'মুছো',
      cancelLabel: 'বাতিল',
      danger: true,
    });
    if (!confirmed) return;
    await doAction(book._id, () => adminDeleteBook(book._id), 'মোছা');
  };

  const upload = async () => {
    if (!form.title.trim() || !form.subject.trim() || !file) {
      toast.error('শিরোনাম, বিষয় ও PDF ফাইল দাও');
      return;
    }
    setBusy('upload');
    setUploadProgress(null);
    try {
      let result: { jobId: string };
      if (file.size <= DIRECT_UPLOAD_LIMIT) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(form)) fd.append(k, v);
        fd.append('file', file);
        result = await adminUploadBook(fd);
      } else {
        const session = await adminCreateBookUploadSession({
          ...form,
          fileName: file.name,
          fileSize: file.size,
        });
        for (let index = 0; index < session.totalChunks; index += 1) {
          const start = index * session.chunkSize;
          const end = Math.min(start + session.chunkSize, file.size);
          const chunk = file.slice(start, end, 'application/pdf');
          await uploadChunkWithRetry(session.uploadId, index, chunk);
          setUploadProgress({ done: index + 1, total: session.totalChunks });
        }
        result = await adminCompleteBookUpload(session.uploadId);
      }
      toast.success(`আপলোড হয়েছে। প্রসেসিং চলছে (job ${result.jobId.slice(-6)})`);
      setUploadOpen(false);
      setFile(null);
      await refresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy('');
      setUploadProgress(null);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 20 }}>📚 বই ব্যবস্থাপনা</h1>
        <Button onClick={() => setUploadOpen(true)}>＋ নতুন বই</Button>
      </div>
      <div className="flex gap-2" style={{ marginBottom: 12 }}>
        <Input placeholder="খোঁজো…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <Button variant="secondary" onClick={() => void refresh()}>খোঁজো</Button>
      </div>
      {loading ? (
        <p className="text-muted">লোড হচ্ছে…</p>
      ) : staleBackend ? (
        <StaleBackendNotice feature="বই ব্যবস্থাপনা" onRetry={() => void refresh()} />
      ) : books.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <p className="text-muted">কোনো বই নেই। “নতুন বই” চাপ দিয়ে PDF আপলোড করো।</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13.5 }}>
            <thead>
              <tr className="text-muted" style={{ textAlign: 'left' }}>
                <th style={{ padding: 10 }}>শিরোনাম</th>
                <th style={{ padding: 10 }}>বিষয়</th>
                <th style={{ padding: 10 }}>অবস্থা</th>
                <th style={{ padding: 10 }}>চাঙ্ক</th>
                <th style={{ padding: 10 }}>কাজ</th>
              </tr>
            </thead>
            <tbody>
              {visibleBooks.map((b) => (
                <tr key={b._id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => void openDetail(b._id)}
                      disabled={openingId !== null}
                      aria-busy={openingId === b._id}
                      style={{ padding: 0 }}
                    >
                      {openingId === b._id ? 'খোলা হচ্ছে…' : b.title}
                    </button>
                    <div className="text-xs text-muted">{b.grade} • {b.curriculum}{b.edition ? ` • ${b.edition}` : ''}</div>
                  </td>
                  <td style={{ padding: 10 }}>{b.subject}</td>
                  <td style={{ padding: 10 }}>{stateBadge(b)}</td>
                  <td style={{ padding: 10 }}>{b.chunkCount ?? 0}</td>
                  <td style={{ padding: 10 }}>
                    <div className="flex flex-wrap" style={{ gap: 4 }}>
                      <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void doAction(b._id, () => adminPublishBook(b._id), 'প্রকাশ')}>প্রকাশ</Button>
                      <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void doAction(b._id, () => adminUnpublishBook(b._id), 'অপ্রকাশ')}>অপ্রকাশ</Button>
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void doAction(b._id, () => adminReindexBook(b._id), 'রি-ইনডেক্স')}>রি-ইনডেক্স</Button>
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void doAction(b._id, () => adminArchiveBook(b._id), 'আর্কাইভ')}>আর্কাইভ</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => void removeBook(b)}
                      >
                        মুছো
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {books.length > PAGE_SIZE && (
            <div
              className="flex items-center justify-between"
              style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 8 }}
            >
              <span className="text-xs text-muted">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, books.length)} / {books.length}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                  আগের
                </Button>
                <span className="text-xs text-muted">{safePage} / {pageCount}</span>
                <Button size="sm" variant="secondary" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                  পরের
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="নতুন বই আপলোড (PDF)">
        <div className="flex flex-col" style={{ gap: 10 }}>
          <Input placeholder="শিরোনাম *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex gap-2">
            <Input placeholder="বিষয় *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <Input placeholder="শ্রেণি" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="কারিকুলাম" value={form.curriculum} onChange={(e) => setForm({ ...form, curriculum: e.target.value })} />
            <Input placeholder="ভাষা (bn/en)" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="সংস্করণ" value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} />
            <Input placeholder="প্রকাশক" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="PDF ফাইল" disabled={busy === 'upload'} />
          {busy === 'upload' && uploadProgress && (
            <div>
              <div className="text-xs text-muted" style={{ marginBottom: 4 }}>
                আপলোড হচ্ছে… {uploadProgress.done}/{uploadProgress.total} ({Math.round((uploadProgress.done / Math.max(1, uploadProgress.total)) * 100)}%)
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.round((uploadProgress.done / Math.max(1, uploadProgress.total)) * 100)}%`,
                    background: 'var(--color-primary)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-muted">শুধু PDF (সর্বোচ্চ ৬০MB)। বড় বই স্বয়ংক্রিয়ভাবে টুকরো করে আপলোড হবে। সার্ভারে ফাইল যাচাই হবে।</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>বাতিল</Button>
            <Button onClick={() => void upload()} disabled={busy === 'upload'}>{busy === 'upload' ? 'আপলোড হচ্ছে…' : 'আপলোড'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.book.title ?? 'বই'}>
        {detail && (
          <div style={{ fontSize: 13.5 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              {stateBadge(detail.book)}
              <span className="text-xs text-muted">
                {detail.book.processingState} • {detail.book.processingProgress ?? 0}% • {detail.book.chunkCount ?? 0} চাঙ্ক • {detail.book.pageCount ?? 0} পৃষ্ঠা
              </span>
            </div>
            {detail.book.processingError && <p style={{ color: 'var(--danger-text)' }}>⚠️ {detail.book.processingError}</p>}
            <div className="font-semibold" style={{ margin: '10px 0 4px' }}>প্রসেসিং কাজ</div>
            {detail.jobs.length === 0 && <p className="text-muted">কোনো কাজ নেই।</p>}
            {detail.jobs.map((j) => (
              <div key={j._id} className="text-xs" style={{ padding: '6px 0', borderTop: '1px solid var(--border-color)' }}>
                {j.kind} • {j.state} • {j.progress}% • {j.errorMessage || j.warnings?.join(' | ') || 'Not set'}
              </div>
            ))}
            <div className="font-semibold" style={{ margin: '10px 0 4px' }}>নমুনা টেক্সট (প্রথম ৮ চাঙ্ক)</div>
            {detail.samples.map((s) => (
              <div key={s.chunkId} style={{ padding: '6px 0', borderTop: '1px solid var(--border-color)' }}>
                <div className="text-xs text-muted">#{s.chunkIndex}{s.chapterTitle ? ` • ${s.chapterTitle}` : ''}{s.pageStart ? ` • পৃষ্ঠা ${s.pageStart}` : ''}</div>
                <div>{s.preview}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
