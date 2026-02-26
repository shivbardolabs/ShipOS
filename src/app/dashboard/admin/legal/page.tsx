'use client';

/**
 * Admin Legal Document Management — /dashboard/admin/legal
 *
 * Allows superadmins to view, edit, and publish new versions of
 * Terms & Conditions and Privacy Policy without redeployment.
 * Each publish creates a new version; users must re-accept on next login.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/components/tenant-provider';
import { Button } from '@/components/ui/button';
import {
  ScrollText,
  Shield,
  FileText,
  Eye,
  History,
  AlertCircle,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface LegalDoc {
  id: string;
  type: string;
  content: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type DocType = 'terms' | 'privacy';

const DOC_META: Record<DocType, { label: string; icon: React.ElementType; color: string }> = {
  terms: { label: 'Terms & Conditions', icon: FileText, color: '#6366f1' },
  privacy: { label: 'Privacy Policy', icon: Shield, color: '#10b981' },
};

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */
export default function LegalManagementPage() {
  const { localUser } = useTenant();
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DocType>('terms');
  const [editorContent, setEditorContent] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [publishError, setPublishError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  // ── Guard: superadmin only ──
  if (localUser && localUser.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-surface-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-surface-200 mb-1">Access Denied</h2>
          <p className="text-sm text-surface-500">
            Legal document management requires superadmin access.
          </p>
        </div>
      </div>
    );
  }

  /* eslint-disable react-hooks/rules-of-hooks */

  // ── Fetch docs ──
  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/legal');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDocs(data.docs || []);
    } catch {
      console.error('Failed to fetch legal docs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // ── Derived data ──
  const docsForType = docs.filter((d) => d.type === activeTab);
  const activeDocs = docsForType.filter((d) => d.isActive);
  const currentDoc = activeDocs[0] || null;
  const previousDocs = docsForType.filter((d) => !d.isActive);

  // When switching tabs, pre-fill editor with current active content
  useEffect(() => {
    if (currentDoc) {
      setEditorContent(currentDoc.content);
    } else {
      setEditorContent('');
    }
    setShowPreview(false);
    setPublishSuccess('');
    setPublishError('');
  }, [activeTab, currentDoc]);

  // ── Publish new version ──
  const handlePublish = async () => {
    if (!editorContent.trim()) {
      setPublishError('Content cannot be empty');
      return;
    }
    // Don't publish if content is identical to current version
    if (currentDoc && editorContent.trim() === currentDoc.content.trim()) {
      setPublishError('Content is identical to the current version. Make changes before publishing.');
      return;
    }

    setPublishing(true);
    setPublishError('');
    setPublishSuccess('');

    try {
      const res = await fetch('/api/admin/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, content: editorContent.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to publish');
      }
      const { doc } = await res.json();
      setPublishSuccess(
        `Published ${DOC_META[activeTab].label} v${doc.version}. Users will need to re-accept on next login.`
      );
      await fetchDocs();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const toggleVersion = (id: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* eslint-enable react-hooks/rules-of-hooks */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'rgba(225, 29, 72, 0.1)' }}
          >
            <ScrollText className="h-5 w-5" style={{ color: '#e11d48' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-100">Legal Documents</h1>
            <p className="text-sm text-surface-500">
              Manage Terms &amp; Conditions and Privacy Policy
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(Object.keys(DOC_META) as DocType[]).map((type) => {
          const meta = DOC_META[type];
          const Icon = meta.icon;
          const isActive = activeTab === type;
          const typeActiveDocs = docs.filter((d) => d.type === type && d.isActive);
          const version = typeActiveDocs[0]?.version;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-surface-800 text-surface-100 border border-surface-600'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
              }`}
            >
              <Icon className="h-4 w-4" style={isActive ? { color: meta.color } : undefined} />
              {meta.label}
              {version != null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-700 text-surface-400">
                  v{version}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-surface-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Editor — 2 columns */}
          <div className="xl:col-span-2 space-y-4">
            {/* Current version info */}
            {currentDoc && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-800/50 border border-surface-700">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-surface-300">
                    Current: <strong className="text-surface-100">Version {currentDoc.version}</strong>
                  </span>
                  <span className="text-xs text-surface-500 ml-2">
                    Published {new Date(currentDoc.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Editor / Preview toggle */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setShowPreview(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !showPreview
                    ? 'bg-surface-700 text-surface-100'
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                <FileText className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showPreview
                    ? 'bg-surface-700 text-surface-100'
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
              <span className="text-[10px] text-surface-600 ml-2">
                HTML supported — content renders on the public page
              </span>
            </div>

            {/* Editor textarea or Preview */}
            {showPreview ? (
              <div
                className="min-h-[500px] rounded-xl border border-surface-700 bg-surface-900/80 p-6 prose-invert text-sm text-surface-300 leading-relaxed overflow-auto"
                dangerouslySetInnerHTML={{ __html: editorContent }}
              />
            ) : (
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full min-h-[500px] rounded-xl border border-surface-700 bg-surface-900/80 p-4 text-sm text-surface-200 font-mono leading-relaxed placeholder:text-surface-600 focus:outline-none focus:border-primary-600 resize-y"
                placeholder={`Enter ${DOC_META[activeTab].label} content (HTML)…`}
                spellCheck={false}
              />
            )}

            {/* Publish actions */}
            {publishError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {publishError}
              </div>
            )}
            {publishSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                {publishSuccess}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-surface-600">
                Publishing creates a new version. Users who previously accepted will need to re-accept.
              </p>
              <Button
                onClick={handlePublish}
                loading={publishing}
                disabled={publishing || !editorContent.trim()}
              >
                Publish v{(currentDoc?.version ?? 0) + 1}
              </Button>
            </div>
          </div>

          {/* Version history — 1 column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-surface-200">
              <History className="h-4 w-4 text-surface-500" />
              Version History
            </div>

            {docsForType.length === 0 ? (
              <div className="text-center py-8 text-sm text-surface-600">
                No versions published yet.
              </div>
            ) : (
              <div className="space-y-2">
                {docsForType.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-lg border transition-colors ${
                      doc.isActive
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-surface-700 bg-surface-800/30'
                    }`}
                  >
                    <button
                      onClick={() => toggleVersion(doc.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {expandedVersions.has(doc.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 text-surface-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-surface-500" />
                        )}
                        <span className="text-sm font-medium text-surface-200">
                          v{doc.version}
                        </span>
                        {doc.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-surface-500">
                        {new Date(doc.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </button>

                    {expandedVersions.has(doc.id) && (
                      <div className="px-3 pb-3 border-t border-surface-700/50">
                        <div
                          className="mt-2 max-h-60 overflow-auto rounded-md bg-surface-900/80 p-3 text-xs text-surface-400 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: doc.content }}
                        />
                        {!doc.isActive && (
                          <button
                            onClick={() => {
                              setEditorContent(doc.content);
                              setShowPreview(false);
                            }}
                            className="mt-2 text-[11px] text-primary-500 hover:text-primary-400 font-medium"
                          >
                            Load into editor →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            {previousDocs.length > 0 && (
              <div className="text-xs text-surface-600 px-1">
                {previousDocs.length} previous version{previousDocs.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
