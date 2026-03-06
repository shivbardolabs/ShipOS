'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToggleSwitch } from './toggle-switch';
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Edit3, FileText,
  Mail, Package, Plus, Save, Trash2, Upload, X, Shield,
} from 'lucide-react';

/* ── Types ────────────────────────────────────────────────────────────── */

export interface RangeValues {
  rangeStart: number;
  rangeEnd: number;
}

export interface MailboxRangeRecord {
  id: string;
  platform: string;
  label: string;
  rangeStart: number;
  rangeEnd: number;
  isActive: boolean;
  sizeId: string | null;
}

export interface MailboxSizeRecord {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  ranges: MailboxRangeRecord[];
}

export interface ActiveMailboxInfo {
  id: string;
  pmbNumber: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface MailboxTabProps {
  platformEnabled: Record<string, boolean>;
  setPlatformEnabled: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  carrierProgramEnabled: Record<string, boolean>;
  setCarrierProgramEnabled: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  templateContent: string;
  setTemplateContent: (v: string) => void;
  templateFileName: string | null;
  templateFileRef: React.RefObject<HTMLInputElement | null>;
  showEditTemplateModal: boolean;
  setShowEditTemplateModal: (v: boolean) => void;
  templateSaving: boolean;
  templateSaved: boolean;
  handleSaveTemplate: () => void;
  handleUploadTemplate: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /* BAR-387: Range state + save (non-physical platforms) */
  mailboxRanges: Record<string, RangeValues>;
  setMailboxRanges: React.Dispatch<React.SetStateAction<Record<string, RangeValues>>>;
  handleSaveRanges: () => void;
  rangeSaving: boolean;
  rangeSaved: boolean;
  rangeError: string | null;
  /* BAR-424: Sizes + ranges for physical platform */
  mailboxSizes: MailboxSizeRecord[];
  setMailboxSizes: React.Dispatch<React.SetStateAction<MailboxSizeRecord[]>>;
  isSuperAdmin: boolean;
}

/* ── Overlap detection (client-side, non-physical platforms only) ───── */
function detectOverlaps(
  ranges: Record<string, RangeValues>,
  enabled: Record<string, boolean>,
): string | null {
  const keys = Object.keys(ranges).filter((k) => enabled[k] !== false && k !== 'store');
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = ranges[keys[i]];
      const b = ranges[keys[j]];
      if (a.rangeStart <= b.rangeEnd && b.rangeStart <= a.rangeEnd) {
        const labels: Record<string, string> = {
          anytime: 'Anytime Mailbox',
          ipostal1: 'iPostal1',
          postscan: 'PostScan Mail',
        };
        return `${labels[keys[i]] || keys[i]} (${a.rangeStart}–${a.rangeEnd}) overlaps with ${labels[keys[j]] || keys[j]} (${b.rangeStart}–${b.rangeEnd})`;
      }
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  Physical Sizes Sub-Component                                        */
/* ══════════════════════════════════════════════════════════════════════ */

function PhysicalMailboxSizes({
  sizes,
  setSizes,
  isSuperAdmin,
  storeEnabled,
}: {
  sizes: MailboxSizeRecord[];
  setSizes: React.Dispatch<React.SetStateAction<MailboxSizeRecord[]>>;
  isSuperAdmin: boolean;
  storeEnabled: boolean;
}) {
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(
    new Set(sizes.map((s) => s.id)),
  );
  const [addingSizeName, setAddingSizeName] = useState('');
  const [showAddSize, setShowAddSize] = useState(false);
  const [addingSizeLoading, setAddingSizeLoading] = useState(false);

  /* Range add/edit state */
  const [editingRange, setEditingRange] = useState<{
    sizeId: string;
    rangeId?: string;
    rangeStart: number;
    rangeEnd: number;
  } | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  /* Edit size name state */
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [editingSizeName, setEditingSizeName] = useState('');

  /* Active mailbox modal */
  const [activeMailboxModal, setActiveMailboxModal] = useState<{
    label: string;
    mailboxes: ActiveMailboxInfo[];
  } | null>(null);

  /* Error state */
  const [error, setError] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Add Size ───────────────────────────────────────────────────── */
  const handleAddSize = async () => {
    if (!addingSizeName.trim()) return;
    setAddingSizeLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/mailbox-sizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addingSizeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create size');
        return;
      }
      setSizes((prev) => [...prev, data.size]);
      setExpandedSizes((prev) => new Set([...prev, data.size.id]));
      setAddingSizeName('');
      setShowAddSize(false);
    } catch {
      setError('Network error');
    } finally {
      setAddingSizeLoading(false);
    }
  };

  /* ── Toggle Size Active ─────────────────────────────────────────── */
  const handleToggleSizeActive = async (size: MailboxSizeRecord) => {
    setError(null);
    try {
      const res = await fetch(`/api/settings/mailbox-sizes/${size.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !size.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.activeMailboxes) {
          setActiveMailboxModal({
            label: `Cannot ${size.isActive ? 'disable' : 'enable'} "${size.name}"`,
            mailboxes: data.activeMailboxes,
          });
        } else {
          setError(data.error || 'Failed to update size');
        }
        return;
      }
      setSizes((prev) => prev.map((s) => (s.id === size.id ? data.size : s)));
    } catch {
      setError('Network error');
    }
  };

  /* ── Update Size Name ───────────────────────────────────────────── */
  const handleUpdateSizeName = async (sizeId: string) => {
    if (!editingSizeName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/settings/mailbox-sizes/${sizeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSizeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update size');
        return;
      }
      setSizes((prev) => prev.map((s) => (s.id === sizeId ? data.size : s)));
      setEditingSizeId(null);
    } catch {
      setError('Network error');
    }
  };

  /* ── Delete Size ────────────────────────────────────────────────── */
  const handleDeleteSize = async (size: MailboxSizeRecord) => {
    setError(null);
    try {
      const res = await fetch(`/api/settings/mailbox-sizes/${size.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.activeMailboxes) {
          setActiveMailboxModal({
            label: `Cannot delete "${size.name}"`,
            mailboxes: data.activeMailboxes,
          });
        } else {
          setError(data.error || 'Failed to delete size');
        }
        return;
      }
      setSizes((prev) => prev.filter((s) => s.id !== size.id));
    } catch {
      setError('Network error');
    }
  };

  /* ── Add / Edit Range ───────────────────────────────────────────── */
  const handleSaveRange = async () => {
    if (!editingRange) return;
    setRangeLoading(true);
    setError(null);
    try {
      let res: Response;
      if (editingRange.rangeId) {
        // Update existing range
        res = await fetch(`/api/settings/mailbox-size-ranges/${editingRange.rangeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rangeStart: editingRange.rangeStart,
            rangeEnd: editingRange.rangeEnd,
          }),
        });
      } else {
        // Create new range
        res = await fetch(`/api/settings/mailbox-sizes/${editingRange.sizeId}/ranges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rangeStart: editingRange.rangeStart,
            rangeEnd: editingRange.rangeEnd,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.activeMailboxes) {
          setActiveMailboxModal({
            label: 'Cannot modify range',
            mailboxes: data.activeMailboxes,
          });
        } else {
          setError(data.error || 'Failed to save range');
        }
        return;
      }

      // Refresh sizes from server to get consistent state
      const refreshRes = await fetch('/api/settings/mailbox-sizes');
      const refreshData = await refreshRes.json();
      if (refreshData.sizes) setSizes(refreshData.sizes);
      setEditingRange(null);
    } catch {
      setError('Network error');
    } finally {
      setRangeLoading(false);
    }
  };

  /* ── Delete Range ───────────────────────────────────────────────── */
  const handleDeleteRange = async (range: MailboxRangeRecord) => {
    setError(null);
    try {
      const res = await fetch(`/api/settings/mailbox-size-ranges/${range.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.activeMailboxes) {
          setActiveMailboxModal({
            label: `Cannot delete range ${range.rangeStart}–${range.rangeEnd}`,
            mailboxes: data.activeMailboxes,
          });
        } else {
          setError(data.error || 'Failed to delete range');
        }
        return;
      }
      // Remove from local state
      setSizes((prev) =>
        prev.map((s) => ({
          ...s,
          ranges: s.ranges.filter((r) => r.id !== range.id),
        })),
      );
    } catch {
      setError('Network error');
    }
  };

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-status-error-500/30 bg-status-error-500/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-status-error-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-status-error-300 flex-1">{error}</p>
          <button onClick={() => setError(null)}>
            <X className="h-3 w-3 text-surface-500 hover:text-surface-300" />
          </button>
        </div>
      )}

      {/* Sizes */}
      <div className="space-y-2">
        {sizes.map((size) => {
          const isExpanded = expandedSizes.has(size.id);
          const rangeCount = size.ranges.length;
          const totalNumbers = size.ranges.reduce(
            (acc, r) => acc + (r.rangeEnd - r.rangeStart + 1),
            0,
          );

          return (
            <div
              key={size.id}
              className={`rounded-lg border bg-surface-850/50 ${
                size.isActive
                  ? 'border-surface-700/50'
                  : 'border-surface-700/30 opacity-60'
              }`}
            >
              {/* Size header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => toggleExpand(size.id)}
                  className="text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                <Package className="h-3.5 w-3.5 text-surface-400" />

                {editingSizeId === size.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingSizeName}
                      onChange={(e) => setEditingSizeName(e.target.value)}
                      className="bg-surface-800 border border-surface-600 rounded px-2 py-0.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500 w-40"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateSizeName(size.id);
                        if (e.key === 'Escape') setEditingSizeId(null);
                      }}
                    />
                    <button
                      onClick={() => handleUpdateSizeName(size.id)}
                      className="text-status-success-400 hover:text-status-success-300"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingSizeId(null)}
                      className="text-surface-500 hover:text-surface-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    className="text-sm font-medium text-surface-200 flex-1 cursor-pointer"
                    onClick={() => toggleExpand(size.id)}
                  >
                    {size.name}
                  </span>
                )}

                <span className="text-xs text-surface-500">
                  {rangeCount} range{rangeCount !== 1 ? 's' : ''} · {totalNumbers} numbers
                </span>

                <Badge
                  dot={false}
                  className={`text-[10px] ${
                    size.isActive
                      ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30'
                      : 'bg-surface-700 text-surface-400 border-surface-600'
                  }`}
                >
                  {size.isActive ? 'Active' : 'Disabled'}
                </Badge>

                {isSuperAdmin && editingSizeId !== size.id && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => {
                        setEditingSizeId(size.id);
                        setEditingSizeName(size.name);
                      }}
                      className="p-1 rounded hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
                      title="Rename size"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSize(size)}
                      className="p-1 rounded hover:bg-status-error-500/10 text-surface-500 hover:text-status-error-400 transition-colors"
                      title="Delete size"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <ToggleSwitch
                      checked={size.isActive}
                      onChange={() => handleToggleSizeActive(size)}
                    />
                  </div>
                )}
              </div>

              {/* Ranges (expanded) */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-surface-700/30">
                  <div className="space-y-1.5 ml-5">
                    {size.ranges.map((range) => (
                      <div
                        key={range.id}
                        className={`flex items-center justify-between rounded-md px-3 py-1.5 ${
                          range.isActive
                            ? 'bg-surface-800/60'
                            : 'bg-surface-800/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-surface-300">
                            {range.rangeStart} — {range.rangeEnd}
                          </span>
                          <span className="text-[10px] text-surface-500">
                            ({range.rangeEnd - range.rangeStart + 1} numbers)
                          </span>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setEditingRange({
                                  sizeId: size.id,
                                  rangeId: range.id,
                                  rangeStart: range.rangeStart,
                                  rangeEnd: range.rangeEnd,
                                })
                              }
                              className="p-1 rounded hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
                              title="Edit range"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteRange(range)}
                              className="p-1 rounded hover:bg-status-error-500/10 text-surface-500 hover:text-status-error-400 transition-colors"
                              title="Delete range"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {size.ranges.length === 0 && (
                      <p className="text-xs text-surface-500 italic py-1">
                        No ranges defined yet
                      </p>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() =>
                          setEditingRange({
                            sizeId: size.id,
                            rangeStart: 0,
                            rangeEnd: 0,
                          })
                        }
                        className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors mt-1"
                      >
                        <Plus className="h-3 w-3" /> Add Range
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sizes.length === 0 && (
          <p className="text-xs text-surface-500 italic py-2 ml-1">
            No mailbox sizes configured. Add one to get started.
          </p>
        )}

        {/* Add Size */}
        {isSuperAdmin && (
          <div className="pt-1">
            {showAddSize ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={addingSizeName}
                  onChange={(e) => setAddingSizeName(e.target.value)}
                  placeholder="e.g. Small Box, Large Box"
                  className="bg-surface-800 border border-surface-600 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSize();
                    if (e.key === 'Escape') {
                      setShowAddSize(false);
                      setAddingSizeName('');
                    }
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddSize}
                  loading={addingSizeLoading}
                  disabled={!addingSizeName.trim() || addingSizeLoading}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddSize(false);
                    setAddingSizeName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddSize(true)}
                className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Mailbox Size
              </button>
            )}
          </div>
        )}

        {!isSuperAdmin && sizes.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500 pt-1">
            <Shield className="h-3 w-3" />
            Only Super-Admin users can modify sizes and ranges
          </div>
        )}
      </div>

      {/* ── Edit Range Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!editingRange}
        onClose={() => setEditingRange(null)}
        title={editingRange?.rangeId ? 'Edit Range' : 'Add Range'}
        description="Define the mailbox number range. Ranges cannot overlap with existing ranges."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingRange(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRange}
              loading={rangeLoading}
              disabled={
                rangeLoading ||
                !editingRange ||
                editingRange.rangeStart >= editingRange.rangeEnd ||
                editingRange.rangeStart < 0
              }
            >
              {editingRange?.rangeId ? 'Update' : 'Add'} Range
            </Button>
          </>
        }
      >
        {editingRange && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-surface-500 mb-1.5 block">Range Start</label>
              <input
                type="number"
                value={editingRange.rangeStart || ''}
                onChange={(e) =>
                  setEditingRange((prev) =>
                    prev ? { ...prev, rangeStart: parseInt(e.target.value) || 0 } : null,
                  )
                }
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                min={0}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1.5 block">Range End</label>
              <input
                type="number"
                value={editingRange.rangeEnd || ''}
                onChange={(e) =>
                  setEditingRange((prev) =>
                    prev ? { ...prev, rangeEnd: parseInt(e.target.value) || 0 } : null,
                  )
                }
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                min={0}
              />
            </div>
            {editingRange.rangeStart >= editingRange.rangeEnd &&
              editingRange.rangeEnd > 0 && (
                <p className="col-span-2 text-xs text-status-error-400">
                  Start must be less than end
                </p>
              )}
          </div>
        )}
      </Modal>

      {/* ── Active Mailbox Warning Modal ─────────────────────────────── */}
      <Modal
        open={!!activeMailboxModal}
        onClose={() => setActiveMailboxModal(null)}
        title={activeMailboxModal?.label || 'Active Mailboxes'}
        description="The following active mailboxes must be individually closed before this action can proceed."
        size="md"
        footer={
          <Button variant="ghost" size="sm" onClick={() => setActiveMailboxModal(null)}>
            Close
          </Button>
        }
      >
        {activeMailboxModal && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {activeMailboxModal.mailboxes.map((mb) => (
              <div
                key={mb.id}
                className="flex items-center justify-between bg-surface-800/50 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-primary-400">
                    PMB {mb.pmbNumber}
                  </span>
                  <span className="text-sm text-surface-300">
                    {mb.firstName} {mb.lastName}
                  </span>
                </div>
                <Badge
                  dot={false}
                  className="text-[10px] bg-status-success-500/20 text-status-success-400 border-status-success-500/30"
                >
                  Active
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  Main MailboxTab Component                                           */
/* ══════════════════════════════════════════════════════════════════════ */

export function MailboxTab({
  platformEnabled,
  setPlatformEnabled,
  carrierProgramEnabled,
  setCarrierProgramEnabled,
  templateContent,
  setTemplateContent,
  templateFileName,
  templateFileRef,
  showEditTemplateModal,
  setShowEditTemplateModal,
  templateSaving,
  templateSaved,
  handleSaveTemplate,
  handleUploadTemplate,
  mailboxRanges,
  setMailboxRanges,
  handleSaveRanges,
  rangeSaving,
  rangeSaved,
  rangeError,
  mailboxSizes,
  setMailboxSizes,
  isSuperAdmin,
}: MailboxTabProps) {
  /* Live overlap warning (client-side, non-physical only) */
  const overlapWarning = detectOverlaps(mailboxRanges, platformEnabled);

  /* Helper to update a single non-physical platform's range field */
  const updateRange = (platform: string, field: 'rangeStart' | 'rangeEnd', value: number) => {
    setMailboxRanges((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  return (
    <>
  <Card>
    <CardHeader>
      <CardTitle>Mailbox Ranges</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-surface-400 mb-6">
        Define your PMB number ranges for each mailbox platform. Physical mailboxes support
        multiple sizes with independent number ranges.
      </p>

      {/* Overlap warning (non-physical) */}
      {overlapWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-warning-500/30 bg-status-warning-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-status-warning-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-status-warning-300">
            <span className="font-medium">Overlapping ranges:</span> {overlapWarning}
          </p>
        </div>
      )}

      {/* API error */}
      {rangeError && !overlapWarning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-error-500/30 bg-status-error-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-status-error-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-status-error-300">{rangeError}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* ── Physical / Store Mailboxes (BAR-424: sizes + multi-range) ── */}
        <div className={`glass-card p-4 ${!platformEnabled.store ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-surface-600/30 flex items-center justify-center">
                <Mail className="h-4 w-4 text-surface-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">Store (Physical) Mailboxes</p>
                <p className="text-xs text-surface-500">
                  Organized by size — each size has its own number ranges
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.store ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.store ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.store}
                onChange={(val) => setPlatformEnabled((prev) => ({ ...prev, store: val }))}
              />
            </div>
          </div>

          {platformEnabled.store && (
            <PhysicalMailboxSizes
              sizes={mailboxSizes}
              setSizes={setMailboxSizes}
              isSuperAdmin={isSuperAdmin}
              storeEnabled={platformEnabled.store}
            />
          )}
        </div>

        {/* ── Anytime Mailbox ─────────────────────────────────────────── */}
        <div className={`glass-card p-4 ${!platformEnabled.anytime ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-status-success-500/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-status-success-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">Anytime Mailbox</p>
                <p className="text-xs text-surface-500">Digital mailbox platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.anytime ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.anytime ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.anytime}
                onChange={(val) => setPlatformEnabled((prev) => ({ ...prev, anytime: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input
                type="number"
                value={mailboxRanges.anytime?.rangeStart ?? 700}
                onChange={(e) => updateRange('anytime', 'rangeStart', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input
                type="number"
                value={mailboxRanges.anytime?.rangeEnd ?? 999}
                onChange={(e) => updateRange('anytime', 'rangeEnd', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* ── iPostal1 ────────────────────────────────────────────────── */}
        <div className={`glass-card p-4 ${!platformEnabled.ipostal1 ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-status-info-500/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-status-info-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">iPostal1</p>
                <p className="text-xs text-surface-500">Digital mailbox platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.ipostal1 ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.ipostal1 ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.ipostal1}
                onChange={(val) => setPlatformEnabled((prev) => ({ ...prev, ipostal1: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input
                type="number"
                value={mailboxRanges.ipostal1?.rangeStart ?? 1000}
                onChange={(e) => updateRange('ipostal1', 'rangeStart', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input
                type="number"
                value={mailboxRanges.ipostal1?.rangeEnd ?? 1200}
                onChange={(e) => updateRange('ipostal1', 'rangeEnd', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* ── PostScan Mail ───────────────────────────────────────────── */}
        <div className={`glass-card p-4 ${!platformEnabled.postscan ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">PostScan Mail</p>
                <p className="text-xs text-surface-500">Digital mailbox platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.postscan ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.postscan ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.postscan}
                onChange={(val) => setPlatformEnabled((prev) => ({ ...prev, postscan: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input
                type="number"
                value={mailboxRanges.postscan?.rangeStart ?? 2000}
                onChange={(e) => updateRange('postscan', 'rangeStart', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input
                type="number"
                value={mailboxRanges.postscan?.rangeEnd ?? 2999}
                onChange={(e) => updateRange('postscan', 'rangeEnd', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <Button
          variant="default"
          size="sm"
          leftIcon={rangeSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          onClick={handleSaveRanges}
          loading={rangeSaving}
          disabled={rangeSaving || !!overlapWarning}
        >
          {rangeSaved ? 'Saved!' : 'Save Ranges'}
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* Carrier Programs (BAR-266) */}
  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Carrier Programs</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-surface-400 mb-6">
        Enable carrier receiving programs your store participates in. Enabled programs appear as options during package check-in.
      </p>

      <div className="space-y-4">
        {/* UPS Access Point */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.ups_ap ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-900/30 flex items-center justify-center">
                <Package className="h-4 w-4 text-status-warning-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">UPS Access Point</p>
                <p className="text-xs text-surface-500">Receive and hold UPS-redirected packages for pickup</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.ups_ap ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.ups_ap ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.ups_ap}
                onChange={(val) => setCarrierProgramEnabled((prev) => ({ ...prev, ups_ap: val }))}
              />
            </div>
          </div>
        </div>

        {/* FedEx HAL */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.fedex_hal ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">FedEx Hold At Location</p>
                <p className="text-xs text-surface-500">Receive and hold FedEx-redirected packages (FASC required)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.fedex_hal ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.fedex_hal ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.fedex_hal}
                onChange={(val) => setCarrierProgramEnabled((prev) => ({ ...prev, fedex_hal: val }))}
              />
            </div>
          </div>
        </div>

        {/* KINEK */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.kinek ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent-teal/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">KINEK</p>
                <p className="text-xs text-surface-500">Third-party package receiving network — recipients identified by 7-digit KINEK number</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.kinek ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.kinek ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.kinek}
                onChange={(val) => setCarrierProgramEnabled((prev) => ({ ...prev, kinek: val }))}
              />
            </div>
          </div>
        </div>

        {/* Amazon */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.amazon ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-status-warning-alt/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-status-warning-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">Amazon</p>
                <p className="text-xs text-surface-500">Receive and hold Amazon packages for pickup</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.amazon ? 'bg-status-success-500/20 text-status-success-400 border-status-success-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.amazon ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.amazon}
                onChange={(val) => setCarrierProgramEnabled((prev) => ({ ...prev, amazon: val }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <Button variant="default" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />}>Save Programs</Button>
      </div>
    </CardContent>
  </Card>

  {/* Hold Period */}
  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Box Hold Policy</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-surface-300 mb-1.5 block">Hold Period After Closure</label>
          <div className="flex items-center gap-3">
            <input type="number" defaultValue={90} className="w-24 bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            <span className="text-sm text-surface-400">days</span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Recently closed boxes will be unavailable for this period to prevent address conflicts.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Agreement Template */}
  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Service Agreement Template</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-surface-400 mb-4">
        Customize the mailbox service agreement template used during customer setup.
        Use placeholders like <code className="text-primary-400 text-xs">{'{'}customerName{'}'}</code>, <code className="text-primary-400 text-xs">{'{'}pmbNumber{'}'}</code>, <code className="text-primary-400 text-xs">{'{'}storeName{'}'}</code> for auto-population.
      </p>
      <div className="rounded-lg border border-surface-700 bg-surface-950 p-4 max-h-48 overflow-y-auto">
        <pre className="text-xs text-surface-300 font-mono whitespace-pre-wrap">{templateContent.slice(0, 200)}…</pre>
        {templateFileName && (
          <p className="text-xs text-primary-400 mt-2 flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Loaded from: {templateFileName}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" leftIcon={<Edit3 className="h-3.5 w-3.5" />} onClick={() => setShowEditTemplateModal(true)}>Edit Template</Button>
        <Button variant="ghost" size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => templateFileRef.current?.click()}>Upload New Template</Button>
        <input
          ref={templateFileRef}
          type="file"
          accept=".txt,.md,.html,.doc,.docx"
          className="hidden"
          onChange={handleUploadTemplate}
        />
      </div>
    </CardContent>
  </Card>

  {/* Edit Template Modal */}
  <Modal
    open={showEditTemplateModal}
    onClose={() => setShowEditTemplateModal(false)}
    title="Edit Service Agreement Template"
    description="Use placeholders like {customerName}, {pmbNumber}, {storeName}, {startDate}, {billingCycle} — they will be auto-filled during customer setup."
    size="lg"
    footer={
      <>
        <Button variant="ghost" size="sm" onClick={() => setShowEditTemplateModal(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          leftIcon={templateSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          onClick={handleSaveTemplate}
          loading={templateSaving}
          disabled={templateSaving}
        >
          {templateSaved ? 'Saved!' : 'Save Template'}
        </Button>
      </>
    }
  >
    <Textarea
      value={templateContent}
      onChange={(e) => setTemplateContent(e.target.value)}
      className="min-h-[340px] font-mono text-xs leading-relaxed"
      placeholder="Enter your service agreement template here…"
    />
  </Modal>
    </>
  );
}
