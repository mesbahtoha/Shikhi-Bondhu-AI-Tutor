import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonBox } from '@/components/ui/Skeleton';
import { DocsDocument } from '@/pages/DocsPage';
import { getAdminDocs, getErrorMessage } from '@/lib/docs';
import type { DocsContent, DocsMeta } from '@/types';
import '@/styles/docs.css';

/**
 * Admin-only draft preview. It renders the same document component as /docs,
 * but with the saved draft and an explicit "not published" banner.
 */
export function DocsPreviewPage() {
  const [content, setContent] = useState<DocsContent | null>(null);
  const [meta, setMeta] = useState<DocsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDocs();
      const draft = data.doc;
      setContent({
        ...draft,
        customSections: draft.customSections ?? [],
      });
      setMeta({
        accessible: true,
        reason: null,
        enabled: true,
        version: draft.publishedVersion,
        window: {
          start: draft.settings?.start ?? null,
          end: draft.settings?.end ?? null,
          timezone: draft.settings?.timezone ?? 'Asia/Dhaka',
        },
        updatedAt: data.updatedAt,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
        <SkeletonBox width="34%" height={26} style={{ marginBottom: 16 }} />
        <SkeletonBox width="100%" height={120} />
      </div>
    );
  }

  if (error || !content || !meta) {
    return (
      <div style={{ padding: 24, maxWidth: 680, margin: '0 auto' }}>
        <EmptyState
          icon="⚠️"
          title="Draft preview unavailable"
          description={error ?? 'The documentation draft could not be loaded.'}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <Button onClick={() => void load()}>Try again</Button>
          <Link to="/admin/docs" className="pg-btn-secondary" style={{ textDecoration: 'none' }}>Back to CMS</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '12px 20px 0' }}>
        <Link to="/admin/docs" className="pg-btn-secondary" style={{ textDecoration: 'none' }}>← Back to documentation CMS</Link>
      </div>
      <DocsDocument
        content={content}
        meta={meta}
        stats={null}
        statsError={null}
        statsRefreshing={false}
        onRefreshStats={() => undefined}
        preview
      />
    </>
  );
}

export default DocsPreviewPage;
