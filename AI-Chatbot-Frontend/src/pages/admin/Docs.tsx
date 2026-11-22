import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { SkeletonBox } from '@/components/ui/Skeleton';
import '@/styles/docs.css';
import {
  addDocTeamMember,
  deleteDocTeamMember,
  getAdminDocs,
  getAdminTeamAvatarUrl,
  getErrorMessage,
  listAdminDocVersions,
  publishAdminDocs,
  restoreAdminDocVersion,
  saveAdminDocsDraft,
  setAdminDocsEnabled,
  setAdminDocsSchedule,
  unpublishAdminDocs,
  updateDocTeamMember,
  updateDocTeamMemberAvatar,
} from '@/lib/docs';
import { localInputToUtcIso, TIMEZONE_OPTIONS, utcIsoToLocalInput } from '@/lib/docsTime';
import type { AdminDocs, DocsBlock, DocsChangelogEntry, DocsFeatureRow, DocsRoadmapEntry, DocsTeamMember, DocsVersionEntry } from '@/types';

type AdminDocsSnapshot = AdminDocs;

const TABS = ['Pitch deck', 'Product overview', 'Custom sections', 'Features', 'Team', 'Roadmap', 'Changelog', 'Versions', 'Publishing'] as const;
type DocsTab = (typeof TABS)[number];

export function DocsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminDocsSnapshot | null>(null);
  const [versions, setVersions] = useState<DocsVersionEntry[]>([]);
  const [pitchDeck, setPitchDeck] = useState<DocsBlock[]>([]);
  const [productOverview, setProductOverview] = useState<DocsBlock[]>([]);
  const [customSections, setCustomSections] = useState<DocsBlock[]>([]);
  const [featureMatrix, setFeatureMatrix] = useState<DocsFeatureRow[]>([]);
  const [roadmap, setRoadmap] = useState<DocsRoadmapEntry[]>([]);
  const [teamMembers, setTeamMembers] = useState<DocsTeamMember[]>([]);
  const [changelog, setChangelog] = useState<DocsChangelogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DocsTab>('Pitch deck');
  const [teamForm, setTeamForm] = useState({ name: '', role: 'Member', contact: '' });
  const [teamAvatarFile, setTeamAvatarFile] = useState<File | null>(null);
  const [teamUploading, setTeamUploading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, versionsData] = await Promise.all([getAdminDocs(), listAdminDocVersions()]);
      const draft = data.doc;
      setPitchDeck(draft.pitchDeck ?? []);
      setProductOverview(draft.productOverview ?? []);
      setCustomSections(draft.customSections ?? []);
      setFeatureMatrix(draft.featureMatrix ?? []);
      setRoadmap(draft.roadmap ?? []);
      setTeamMembers(draft.teamMembers ?? []);
      setChangelog(draft.changelog ?? []);
      setVersions(versionsData.versions ?? []);
      setAdmin(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persistDraft = async (silent = false) => {
    setSaving(true);
    try {
      await saveAdminDocsDraft({ pitchDeck, productOverview, customSections, featureMatrix, roadmap, changelog });
      if (!silent) toast.success('Draft saved.');
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (await persistDraft()) await refresh();
  };

  const publish = async () => {
    setPublishLoading(true);
    try {
      // Persist local editor state first; otherwise Publish would publish the
      // previously saved draft and silently discard the visible changes.
      const saved = await saveAdminDocsDraft({ pitchDeck, productOverview, customSections, featureMatrix, roadmap, changelog });
      const data = await publishAdminDocs();
      toast.success(`Published version ${data.publishedVersion}. Draft v${saved.doc.draftVersion} is now live.`);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPublishLoading(false);
    }
  };

  const previewDraft = async () => {
    const saved = await persistDraft(true);
    if (!saved) return;
    window.open('/admin/docs/preview', '_blank', 'noopener');
  };

  const unpublish = async () => {
    setPublishLoading(true);
    try {
      await unpublishAdminDocs();
      toast.success('Documentation disabled. Public /docs now shows unavailable state.');
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPublishLoading(false);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    try {
      await setAdminDocsEnabled(enabled);
      toast.success(enabled ? 'Documentation enabled.' : 'Documentation disabled.');
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const restoreVersion = async (version: number) => {
    try {
      const { doc } = await restoreAdminDocVersion(version);
      toast.success(`Restored version ${version} to draft.`);
      setPitchDeck(doc.pitchDeck ?? []);
      setProductOverview(doc.productOverview ?? []);
      setCustomSections(doc.customSections ?? []);
      setFeatureMatrix(doc.featureMatrix ?? []);
      setRoadmap(doc.roadmap ?? []);
      setTeamMembers(doc.teamMembers ?? []);
      setChangelog(doc.changelog ?? []);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addTeam = async () => {
    if (!teamForm.name) {
      toast.error('Team member name is required.');
      return;
    }
    const form = new FormData();
    form.append('name', teamForm.name);
    form.append('role', teamForm.role);
    form.append('contact', teamForm.contact);
    if (teamAvatarFile) form.append('avatar', teamAvatarFile);
    setTeamUploading(true);
    try {
      const { member } = await addDocTeamMember(form);
      if (member) setTeamMembers((current) => [...current, member]);
      toast.success(`Team member added: ${member?.name ?? teamForm.name}.`);
      setTeamForm({ name: '', role: 'Member', contact: '' });
      setTeamAvatarFile(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTeamUploading(false);
    }
  };

  const updateTeam = async (memberId: string, patch: { name?: string; role?: string; contact?: string; avatarId?: string }) => {
    try {
      await updateDocTeamMember(memberId, patch);
      setTeamMembers((current) => current.map((member) => (member.id === memberId ? { ...member, ...patch } : member)));
      toast.success('Team member updated.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const updateTeamAvatar = async (memberId: string, file: File) => {
    try {
      const { avatarId } = await updateDocTeamMemberAvatar(memberId, file);
      setTeamMembers((current) => current.map((member) => (member.id === memberId ? { ...member, avatarId } : member)));
      toast.success('Profile image updated. Publish to show it on the public page.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeTeam = async (memberId: string, isConfirmed: boolean) => {
    if (isConfirmed) {
      toast.error('Confirmed team members cannot be removed.');
      return;
    }
    try {
      const { deleted } = await deleteDocTeamMember(memberId);
      if (deleted) setTeamMembers((current) => current.filter((member) => member.id !== memberId));
      toast.success('Team member removed.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h1>Documentation CMS</h1>
        <p className="text-muted">Edit every documentation section, publish, schedule, manage the team and history.</p>
      </header>

      {error && (
        <div className="pg-card" style={{ padding: 16, background: 'var(--surface-warn)', marginBottom: 12 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="pg-card" style={{ padding: 16 }}>
          <SkeletonBox width="40%" height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width="70%" height={14} />
        </div>
      ) : !admin ? (
        <div className="pg-card" style={{ padding: 16 }}>No documentation data found.</div>
      ) : (
        <>
          <div className="docs-cms-toolbar">
            <div className="docs-cms-state">
              Published: <strong>{admin.publishedVersion ? `v${admin.publishedVersion}` : 'Not published yet'}</strong> · Draft v{admin.doc?.draftVersion} ·
              <span className="text-muted"> {admin.updatedBy ? `(by ${admin.updatedBy})` : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => void saveDraft()} loading={saving}>Save draft</Button>
              <Button variant="secondary" onClick={() => void previewDraft()} loading={saving}>Preview draft</Button>
              <Button onClick={() => void publish()} loading={publishLoading}>Publish</Button>
              <Button variant="secondary" onClick={() => void unpublish()} loading={publishLoading}>Unpublish (disable)</Button>
              <Button variant="secondary" onClick={() => window.open('/docs', '_blank', 'noopener')}>Open public page</Button>
            </div>
          </div>

          <div className="docs-cms-tabs" role="tablist" aria-label="Documentation editor tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className="docs-cms-tab"
                style={{
                  border: 'none',
                  background: activeTab === tab ? 'var(--text-primary)' : 'transparent',
                  color: activeTab === tab ? 'var(--bg-body)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  borderRadius: 10,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Pitch deck' && <BlockList title="Pitch deck" blocks={pitchDeck} onBlocks={setPitchDeck} />}
          {activeTab === 'Product overview' && <BlockList title="Product overview" blocks={productOverview} onBlocks={setProductOverview} />}
          {activeTab === 'Custom sections' && <BlockList title="Custom sections" blocks={customSections} onBlocks={setCustomSections} />}
          {activeTab === 'Features' && <FeatureEditor features={featureMatrix} onFeatures={setFeatureMatrix} />}
          {activeTab === 'Team' && (
            <TeamEditor
              members={teamMembers}
              onMembers={setTeamMembers}
              form={teamForm}
              setForm={setTeamForm}
              setAvatarFile={setTeamAvatarFile}
              uploading={teamUploading}
              onAdd={() => void addTeam()}
              onUpdate={(id, patch) => void updateTeam(id, patch)}
              onAvatar={(id, file) => void updateTeamAvatar(id, file)}
              onRemove={(id, isConfirmed) => void removeTeam(id, isConfirmed)}
            />
          )}
          {activeTab === 'Roadmap' && <RoadmapEditor entries={roadmap} onEntries={setRoadmap} />}
          {activeTab === 'Changelog' && <ChangelogEditor entries={changelog} onEntries={setChangelog} />}
          {activeTab === 'Versions' && (
            <div className="pg-card" style={{ padding: 16 }}>
              <h3>Version history</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
                <thead>
                  <tr><th style={{ textAlign: 'left', padding: 6 }}>Version</th><th style={{ textAlign: 'left', padding: 6 }}>Published by</th><th style={{ textAlign: 'left', padding: 6 }}>Published at</th><th style={{ textAlign: 'left', padding: 6, width: 80 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {versions.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 8, color: 'var(--text-secondary)' }}>No published versions yet.</td></tr>
                  ) : versions.map((version) => (
                    <tr key={version.version} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 6 }}>v{version.version}</td>
                      <td style={{ padding: 6 }}>{version.publishedBy || '—'}</td>
                      <td style={{ padding: 6 }}>{new Date(version.publishedAt).toLocaleString()}</td>
                      <td style={{ padding: 6 }}>
                        <Button size="sm" variant="secondary" onClick={() => void restoreVersion(version.version)}>Restore</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'Publishing' && (
            <div className="pg-card" style={{ padding: 16 }}>
              <h3>Publishing settings</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                <Button variant="secondary" onClick={() => void setEnabled(true)}>Enable public docs</Button>
                <Button variant="danger" onClick={() => void setEnabled(false)}>Disable public docs</Button>
                <span className="text-muted">Status: {admin.doc?.settings?.enabled ? 'enabled' : 'disabled'}</span>
              </div>
              <ScheduleEditor settings={admin.doc?.settings ?? { enabled: true, start: null, end: null, timezone: 'Asia/Dhaka' }} onSave={async (schedule) => {
                try {
                  await setAdminDocsSchedule({
                    start: schedule.start,
                    end: schedule.end,
                    timezone: schedule.timezone,
                  });
                  toast.success('Schedule saved.');
                  await refresh();
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Editors ---------------- */

interface BlockListProps {
  title: string;
  blocks: DocsBlock[];
  onBlocks: (blocks: DocsBlock[]) => void;
}

function BlockList({ title, blocks, onBlocks }: BlockListProps) {
  const updateBlock = (index: number, patch: Partial<DocsBlock>) => {
    onBlocks(blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  };
  const updateParagraph = (blockIndex: number, lineIndex: number, text: string) => {
    onBlocks(blocks.map((block, i) => {
      if (i !== blockIndex) return block;
      const body = [...block.body];
      body[lineIndex] = text;
      return { ...block, body };
    }));
  };
  return (
    <div className="pg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <Button variant="secondary" onClick={() => onBlocks([...blocks, { id: `block-${Date.now()}-${blocks.length + 1}`, heading: 'New section', body: [''] }])}>Add block</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
        {blocks.map((block, blockIndex) => (
          <div key={block.id} className="pg-card" style={{ padding: 14, background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <Input value={block.heading} placeholder="Heading" style={{ fontWeight: 800 }} onChange={(e) => updateBlock(blockIndex, { heading: e.target.value })} />
              <Button variant="danger" onClick={() => onBlocks(blocks.filter((_, i) => i !== blockIndex))}>Remove block</Button>
            </div>
            {block.body.map((line, lineIndex) => (
              <Input
                key={`${blockIndex}-${lineIndex}`}
                value={line}
                placeholder={`Paragraph ${lineIndex + 1}`}
                onChange={(e) => updateParagraph(blockIndex, lineIndex, e.target.value)}
                style={{ marginBottom: 4 }}
              />
            ))}
            <Button variant="secondary" size="sm" onClick={() => updateBlock(blockIndex, { body: [...block.body, ''] })}>Add paragraph</Button>
          </div>
        ))}
        {blocks.length === 0 && <p className="text-muted">No blocks yet.</p>}
      </div>
    </div>
  );
}

interface FeatureEditorProps { features: DocsFeatureRow[]; onFeatures: (features: DocsFeatureRow[]) => void; }

function FeatureEditor({ features, onFeatures }: FeatureEditorProps) {
  const update = (index: number, patch: Partial<DocsFeatureRow>) => onFeatures(features.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="pg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Feature matrix</h3>
        <Button variant="secondary" onClick={() => onFeatures([...features, { name: 'New feature', description: '', status: 'planned' }])}>Add feature</Button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr><th style={{ textAlign: 'left', padding: 6 }}>Name</th><th style={{ textAlign: 'left', padding: 6 }}>Status</th><th style={{ textAlign: 'left', padding: 6 }}>Description</th><th style={{ textAlign: 'left', padding: 6 }}>Route</th><th style={{ textAlign: 'left', padding: 6, width: 100 }}>Actions</th></tr>
        </thead>
        <tbody>
          {features.map((row, index) => (
            <tr key={`${row.name}-${index}`} style={{ borderTop: '1px solid var(--border-color)' }}>
              <td style={{ padding: 6 }}><Input value={row.name} onChange={(e) => update(index, { name: e.target.value })} /></td>
              <td style={{ padding: 6 }}>
                <select value={row.status} onChange={(e) => update(index, { status: e.target.value as DocsFeatureRow['status'] })} className="select" aria-label={`Status of ${row.name}`}>
                  <option value="completed">completed</option>
                  <option value="in_progress">in_progress</option>
                  <option value="planned">planned</option>
                </select>
              </td>
              <td style={{ padding: 6 }}><Input value={row.description} placeholder="Description" onChange={(e) => update(index, { description: e.target.value })} /></td>
              <td style={{ padding: 6, width: 130 }}><Input value={row.route ?? ''} placeholder="/route" onChange={(e) => update(index, { route: e.target.value || undefined })} /></td>
              <td style={{ padding: 6, width: 90 }}><Button size="sm" variant="danger" onClick={() => onFeatures(features.filter((_, i) => i !== index))}>Remove</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TeamEditorProps {
  members: DocsTeamMember[];
  onMembers: (members: DocsTeamMember[]) => void;
  form: { name: string; role: string; contact: string };
  setForm: (form: { name: string; role: string; contact: string }) => void;
  setAvatarFile: (file: File | null) => void;
  uploading: boolean;
  onAdd: () => void;
  onUpdate: (id: string, patch: { name?: string; role?: string; contact?: string; avatarId?: string }) => void;
  onAvatar: (id: string, file: File) => void;
  onRemove: (id: string, isConfirmed: boolean) => void;
}

function TeamEditor({ members, onMembers, form, setForm, setAvatarFile, uploading, onAdd, onUpdate, onAvatar, onRemove }: TeamEditorProps) {
  const updateMember = (id: string, patch: Partial<DocsTeamMember>) => {
    onMembers(members.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  };

  return (
    <div className="pg-card" style={{ padding: 16 }}>
      <h3 style={{ margin: 0 }}>Team Infyners</h3>
      <p className="text-muted" style={{ fontSize: 13, margin: '6px 0 10px' }}>
        The three confirmed members are protected from deletion. Profile images are optional and fall back to initials.
        Publish the documentation after changing team details or images.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', margin: '12px 0' }}>
        <Input value={form.name} placeholder="Full name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input value={form.role} placeholder="Role" onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <Input value={form.contact} placeholder="Contact (e.g. +880 1601860526)" onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        <Input type="file" accept="image/jpeg,image/png,image/webp,image/bmp" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} className="docs-file-input" aria-label="New team member avatar" />
        <Button variant="secondary" onClick={onAdd} loading={uploading}>Add member</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((member) => (
          <TeamMemberRow
            key={member.id}
            member={member}
            onChange={(patch) => updateMember(member.id, patch)}
            onSave={() => onUpdate(member.id, { name: member.name, role: member.role, contact: member.contact })}
            onAvatar={(file) => onAvatar(member.id, file)}
            onRemove={() => onRemove(member.id, Boolean(member.isConfirmed))}
          />
        ))}
      </div>
    </div>
  );
}

function TeamMemberRow({
  member,
  onChange,
  onSave,
  onAvatar,
  onRemove,
}: {
  member: DocsTeamMember;
  onChange: (patch: Partial<DocsTeamMember>) => void;
  onSave: () => void;
  onAvatar: (file: File) => void;
  onRemove: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!member.avatarId) {
      setPreviewUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    getAdminTeamAvatarUrl(member.id)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewUrl(url);
        setImageFailed(false);
      })
      .catch(() => {
        if (active) setImageFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [member.id, member.avatarId]);

  return (
    <div className="pg-card" style={{ padding: 12, background: 'var(--bg-surface-2)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {member.avatarId && previewUrl && !imageFailed ? (
          <img
            className="docs-team-avatar"
            src={previewUrl}
            alt={`${member.name} profile`}
            onError={() => setImageFailed(true)}
            width={72}
            height={72}
          />
        ) : (
          <div className="docs-team-avatar-fallback" aria-hidden="true">
            {member.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'SB'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: 6 }}>
          <Input value={member.name} placeholder="Full name" onChange={(e) => onChange({ name: e.target.value })} />
          <Input value={member.role} placeholder="Role" onChange={(e) => onChange({ role: e.target.value })} />
          <Input value={member.contact} placeholder="Contact" onChange={(e) => onChange({ contact: e.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <Button size="sm" variant="secondary" onClick={onSave}>Save details</Button>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            className="docs-file-input"
            aria-label={`Update ${member.name} photo`}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button size="sm" variant="secondary" disabled={!file} onClick={() => { if (file) onAvatar(file); setFile(null); }}>
            Update photo
          </Button>
          <Button size="sm" variant="danger" disabled={member.isConfirmed === true} onClick={onRemove}>
            {member.isConfirmed ? 'Protected member' : 'Remove member'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RoadmapEditorProps { entries: DocsRoadmapEntry[]; onEntries: (entries: DocsRoadmapEntry[]) => void; }

function RoadmapEditor({ entries, onEntries }: RoadmapEditorProps) {
  const update = (index: number, patch: Partial<DocsRoadmapEntry>) => onEntries(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  return (
    <div className="pg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Roadmap</h3>
        <Button variant="secondary" onClick={() => onEntries([...entries, { category: 'shortTerm', item: 'New roadmap item', description: '' }])}>Add entry</Button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr><th style={{ textAlign: 'left', padding: 6 }}>Category</th><th style={{ textAlign: 'left', padding: 6 }}>Item</th><th style={{ textAlign: 'left', padding: 6 }}>Description</th><th style={{ textAlign: 'left', padding: 6, width: 80 }}>Actions</th></tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.category}-${index}`} style={{ borderTop: '1px solid var(--border-color)' }}>
              <td style={{ padding: 6 }}>
                <select value={entry.category} onChange={(e) => update(index, { category: e.target.value as DocsRoadmapEntry['category'] })} className="select" aria-label={`Category of ${entry.item}`}>
                  <option value="shortTerm">shortTerm</option>
                  <option value="midTerm">midTerm</option>
                  <option value="longTerm">longTerm</option>
                </select>
              </td>
              <td style={{ padding: 6 }}><Input value={entry.item} onChange={(e) => update(index, { item: e.target.value })} /></td>
              <td style={{ padding: 6 }}><Input value={entry.description} onChange={(e) => update(index, { description: e.target.value })} /></td>
              <td style={{ padding: 6, width: 90 }}><Button size="sm" variant="danger" onClick={() => onEntries(entries.filter((_, i) => i !== index))}>Remove</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ChangelogEditorProps { entries: DocsChangelogEntry[]; onEntries: (entries: DocsChangelogEntry[]) => void; }

function ChangelogEditor({ entries, onEntries }: ChangelogEditorProps) {
  const updateEntry = (index: number, patch: Partial<DocsChangelogEntry>) => {
    onEntries(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };
  return (
    <div className="pg-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Changelog</h3>
        <Button variant="secondary" onClick={() => onEntries([...entries, { version: '1.0.0', date: '2026-11-20', title: 'New version', items: ['First entry.'] }])}>Add entry</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {entries.map((entry, index) => (
          <div key={`entry-${index}`} className="pg-card" style={{ padding: 12, background: 'var(--bg-surface-2)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Input style={{ width: 96, fontWeight: 800 }} value={entry.version} placeholder="Version" onChange={(e) => updateEntry(index, { version: e.target.value })} />
              <Input style={{ width: 120 }} type="date" value={entry.date} onChange={(e) => updateEntry(index, { date: e.target.value })} />
              <Input style={{ flex: 1, minWidth: 200 }} value={entry.title} placeholder="Title" onChange={(e) => updateEntry(index, { title: e.target.value })} />
              <Button variant="danger" onClick={() => onEntries(entries.filter((_, i) => i !== index))}>Remove</Button>
            </div>
            {entry.items.map((item, itemIndex) => (
              <Input
                key={itemIndex}
                value={item}
                placeholder={`Change ${itemIndex + 1}`}
                onChange={(e) => updateEntry(index, { items: entry.items.map((current, i) => (i === itemIndex ? e.target.value : current)) })}
                style={{ marginTop: 4 }}
              />
            ))}
            <Button variant="secondary" size="sm" style={{ marginTop: 4 }} onClick={() => updateEntry(index, { items: [...entry.items, ''] })}>Add change</Button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-muted">No changelog entries yet.</p>}
      </div>
    </div>
  );
}

interface ScheduleEditorProps {
  settings: { start: string | null; end: string | null; timezone: string };
  onSave: (schedule: { start: string | null; end: string | null; timezone: string }) => void;
}

function ScheduleEditor({ settings, onSave }: ScheduleEditorProps) {
  const timezone = settings.timezone || 'Asia/Dhaka';
  const [form, setForm] = useState({
    start: utcIsoToLocalInput(settings.start, timezone),
    end: utcIsoToLocalInput(settings.end, timezone),
    timezone,
  });

  useEffect(() => {
    const nextTimezone = settings.timezone || 'Asia/Dhaka';
    setForm({
      start: utcIsoToLocalInput(settings.start, nextTimezone),
      end: utcIsoToLocalInput(settings.end, nextTimezone),
      timezone: nextTimezone,
    });
  }, [settings]);

  const startUtc = form.start ? localInputToUtcIso(form.start, form.timezone) : null;
  const endUtc = form.end ? localInputToUtcIso(form.end, form.timezone) : null;
  const invalidRange = Boolean(startUtc && endUtc && Date.parse(startUtc) > Date.parse(endUtc));
  const invalidDate = Boolean((form.start && !startUtc) || (form.end && !endUtc));
  const timezoneOptions = Array.from(new Set([...TIMEZONE_OPTIONS, form.timezone]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <label className="pg-field" style={{ margin: 0 }}>
          <span>Start (local)</span>
          <Input
            style={{ width: 210 }}
            type="datetime-local"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
        </label>
        <label className="pg-field" style={{ margin: 0 }}>
          <span>End (local)</span>
          <Input
            style={{ width: 210 }}
            type="datetime-local"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
          />
        </label>
        <label className="pg-field" style={{ margin: 0 }}>
          <span>Timezone</span>
          <select
            className="select"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            style={{ minHeight: 44, minWidth: 180 }}
          >
            {timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <Button
          variant="secondary"
          onClick={() => onSave({ start: startUtc, end: endUtc, timezone: form.timezone })}
          disabled={invalidRange || invalidDate}
        >
          Save schedule
        </Button>
      </div>
      <span className="text-muted" style={{ fontSize: 12.5 }}>
        Empty start/end means always accessible while documentation is enabled. Both values are interpreted in the selected IANA timezone.
        {startUtc ? ` Stored start: ${new Date(startUtc).toISOString()}` : ''}
        {endUtc ? ` · Stored end: ${new Date(endUtc).toISOString()}` : ''}
      </span>
      {invalidRange && <span className="form-error">Start must be on or before end.</span>}
      {invalidDate && <span className="form-error">Enter a valid local date and time.</span>}
    </div>
  );
}

export default DocsAdminPage;
