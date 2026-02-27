'use client';

/**
 * BAR-39: Package Condition Notes & Annotations
 *
 * Two-tier notes system:
 * 1. Customer-facing notes — visible in notifications and at pickup
 * 2. Internal/staff-only notes — visible only in back-office
 *
 * Quick-note buttons for common conditions, photo attachment support.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConditionTag } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Quick-note tag configuration                                              */
/* -------------------------------------------------------------------------- */

interface TagConfig {
  id: ConditionTag;
  label: string;
  emoji: string;
  variant: 'danger' | 'warning' | 'info' | 'muted';
}

const CONDITION_TAGS: TagConfig[] = [
  { id: 'damaged', label: 'Damaged', emoji: '💥', variant: 'danger' },
  { id: 'open_resealed', label: 'Open/Resealed', emoji: '📭', variant: 'warning' },
  { id: 'wet', label: 'Wet', emoji: '💧', variant: 'warning' },
  { id: 'leaking', label: 'Leaking', emoji: '🚰', variant: 'danger' },
  { id: 'oversized', label: 'Oversized', emoji: '📐', variant: 'info' },
  { id: 'perishable', label: 'Perishable', emoji: '🧊', variant: 'warning' },
  { id: 'fragile', label: 'Fragile', emoji: '⚠️', variant: 'warning' },
  { id: 'must_pickup_asap', label: 'Must Pick Up ASAP', emoji: '🚨', variant: 'danger' },
];

/* -------------------------------------------------------------------------- */
/*  Component Props                                                           */
/* -------------------------------------------------------------------------- */

interface ConditionNotesProps {
  /** Currently selected condition tags */
  selectedTags: ConditionTag[];
  /** Customer-facing note text */
  customerNote: string;
  /** Internal/staff-only note text */
  internalNote: string;
  /** Photo URLs for condition documentation */
  photos: string[];
  /** Callback when tags change */
  onTagsChange: (tags: ConditionTag[]) => void;
  /** Callback when customer note changes */
  onCustomerNoteChange: (note: string) => void;
  /** Callback when internal note changes */
  onInternalNoteChange: (note: string) => void;
  /** Callback when photos change */
  onPhotosChange: (photos: string[]) => void;
  /** Whether in read-only mode (for detail view) */
  readOnly?: boolean;
  /** Compact layout for inline use */
  compact?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Condition Notes Component                                                 */
/* -------------------------------------------------------------------------- */

export function ConditionNotes({
  selectedTags,
  customerNote,
  internalNote,
  photos,
  onTagsChange,
  onCustomerNoteChange,
  onInternalNoteChange,
  onPhotosChange,
  readOnly = false,
  compact = false,
}: ConditionNotesProps) {
  const [showInternal, setShowInternal] = useState(!!internalNote);

  const toggleTag = useCallback(
    (tag: ConditionTag) => {
      if (readOnly) return;
      const exists = selectedTags.includes(tag);
      onTagsChange(
        exists
          ? selectedTags.filter((t) => t !== tag)
          : [...selectedTags, tag]
      );
    },
    [selectedTags, onTagsChange, readOnly]
  );

  const handlePhotoCapture = useCallback(() => {
    // In production: open camera or file picker
    // For now, simulate with a placeholder
    const placeholder = `https://placehold.co/400x300/1a1a2e/e0e0e0?text=Damage+Photo+${photos.length + 1}`;
    onPhotosChange([...photos, placeholder]);
  }, [photos, onPhotosChange]);

  const removePhoto = useCallback(
    (index: number) => {
      onPhotosChange(photos.filter((_, i) => i !== index));
    },
    [photos, onPhotosChange]
  );

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* ── Condition Tags ── */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2 block">
          Condition Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {CONDITION_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                disabled={readOnly}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  isSelected
                    ? 'border-primary-500/50 bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30'
                    : 'border-surface-700 bg-surface-800/50 text-surface-400 hover:bg-surface-700/50',
                  readOnly && 'cursor-default opacity-70'
                )}
              >
                <span>{tag.emoji}</span>
                <span>{tag.label}</span>
                {isSelected && !readOnly && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Customer-Facing Note ── */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5 flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Customer Note
          <span className="text-surface-600 font-normal normal-case">(visible to customer)</span>
        </label>
        {readOnly ? (
          <p className="text-sm text-surface-300 bg-surface-800/50 rounded-lg px-3 py-2 min-h-[2rem]">
            {customerNote || '—'}
          </p>
        ) : (
          <Textarea
            value={customerNote}
            onChange={(e) => onCustomerNoteChange(e.target.value)}
            placeholder="Note visible to customer in notifications and at pickup..."
            rows={compact ? 2 : 3}
          />
        )}
      </div>

      {/* ── Internal Note ── */}
      {(showInternal || readOnly) && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5 flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />
            Internal Note
            <Badge variant="muted" className="text-[10px]">Staff Only</Badge>
          </label>
          {readOnly ? (
            <p className="text-sm text-surface-300 bg-surface-800/50 rounded-lg px-3 py-2 min-h-[2rem]">
              {internalNote || '—'}
            </p>
          ) : (
            <Textarea
              value={internalNote}
              onChange={(e) => onInternalNoteChange(e.target.value)}
              placeholder="Staff-only note (not visible to customer)..."
              rows={compact ? 2 : 3}
            />
          )}
        </div>
      )}

      {!showInternal && !readOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInternal(true)}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add Internal Note
        </Button>
      )}

      {/* ── Photos ── */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2 flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" />
          Condition Photos
        </label>
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="relative w-20 h-20 rounded-lg border border-surface-700 overflow-hidden bg-surface-800 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Condition photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              onClick={handlePhotoCapture}
              className="flex items-center justify-center w-20 h-20 rounded-lg border border-dashed border-surface-600 bg-surface-800/30 text-surface-500 hover:text-surface-300 hover:border-surface-500 transition-colors"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Damage Warning ── */}
      {selectedTags.some((t) => ['damaged', 'leaking', 'wet'].includes(t)) && !readOnly && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-400">
            <p className="font-semibold mb-0.5">Damage Detected</p>
            <p className="text-amber-400/70">
              Consider taking photos of the damage for carrier claims and dispute resolution.
              Photos are stored with the package record.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inline Tag Display (for table rows)                                       */
/* -------------------------------------------------------------------------- */

export function ConditionTagBadges({ tags }: { tags: ConditionTag[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tagId) => {
        const tag = CONDITION_TAGS.find((t) => t.id === tagId);
        if (!tag) return null;
        return (
          <Badge key={tagId} variant={tag.variant} className="text-[10px] px-1.5 py-0">
            {tag.emoji} {tag.label}
          </Badge>
        );
      })}
      {tags.length > 3 && (
        <Badge variant="muted" className="text-[10px] px-1.5 py-0">
          +{tags.length - 3}
        </Badge>
      )}
    </div>
  );
}
