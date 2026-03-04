'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import type { StorageLocationItem } from './types';
import { Check, ChevronDown, ChevronUp, Edit3, GripVertical, Loader2, MapPin, Plus, Star, Trash2 } from 'lucide-react';

export interface StorageLocationsTabProps {
  isViewOnly: boolean;
  storageLocations: StorageLocationItem[];
  storageLocLoading: boolean;
  showStorageLocModal: boolean;
  setShowStorageLocModal: (v: boolean) => void;
  editingStorageLoc: StorageLocationItem | null;
  storageLocName: string;
  setStorageLocName: (v: string) => void;
  storageLocDefault: boolean;
  setStorageLocDefault: (v: boolean) => void;
  storageLocSaving: boolean;
  handleOpenNewStorageLoc: () => void;
  handleOpenEditStorageLoc: (loc: StorageLocationItem) => void;
  handleSaveStorageLoc: () => void;
  handleDeleteStorageLoc: (id: string) => void;
  handleMoveStorageLoc: (index: number, direction: 'up' | 'down') => void;
}

export function StorageLocationsTab({ isViewOnly, storageLocations, storageLocLoading, showStorageLocModal, setShowStorageLocModal, editingStorageLoc, storageLocName, setStorageLocName, storageLocDefault, setStorageLocDefault, storageLocSaving, handleOpenNewStorageLoc, handleOpenEditStorageLoc, handleSaveStorageLoc, handleDeleteStorageLoc, handleMoveStorageLoc }: StorageLocationsTabProps) {
  return (
    <>
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            Storage Locations
          </CardTitle>
          {!isViewOnly && (
            <Button onClick={handleOpenNewStorageLoc} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-surface-400 mb-4">
          Pre-define storage locations (shelves, bins, racks) so staff can quickly select them during
          package check-in instead of typing each time.
        </p>

        {storageLocLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-surface-500" />
          </div>
        ) : storageLocations.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-surface-700 rounded-lg">
            <MapPin className="h-10 w-10 text-surface-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-surface-300 mb-1">No Storage Locations</h3>
            <p className="text-xs text-surface-500 mb-4">
              Add locations like &quot;Shelf A1&quot; or &quot;Back Room Bin 3&quot; to speed up check-in.
            </p>
            {!isViewOnly && (
              <Button size="sm" onClick={handleOpenNewStorageLoc}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Location
              </Button>
            )}
          </div>
        ) : (
          <div className="border border-surface-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-800/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-400 uppercase tracking-wider w-10">Order</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-surface-400 uppercase tracking-wider w-24">Default</th>
                  {!isViewOnly && (
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-surface-400 uppercase tracking-wider w-40">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {storageLocations.map((loc, idx) => (
                  <tr key={loc.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3">
                      {!isViewOnly && (
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveStorageLoc(idx, 'up')}
                            disabled={idx === 0}
                            className="text-surface-500 hover:text-surface-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveStorageLoc(idx, 'down')}
                            disabled={idx === storageLocations.length - 1}
                            className="text-surface-500 hover:text-surface-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-surface-600" />
                        <span className="text-surface-200 font-medium">{loc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {loc.isDefault && (
                        <Badge variant="default" className="text-[10px]">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </td>
                    {!isViewOnly && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEditStorageLoc(loc)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteStorageLoc(loc.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  </div>

  {/* Add/Edit Storage Location Modal */}
  <Modal
    open={showStorageLocModal}
    onClose={() => setShowStorageLocModal(false)}
    title={editingStorageLoc ? 'Edit Storage Location' : 'Add Storage Location'}
  >
    <div className="space-y-4 py-2">
      <Input
        label="Location Name"
        value={storageLocName}
        onChange={(e) => setStorageLocName(e.target.value)}
        placeholder='e.g. "Shelf A1", "Back Room Bin 3"'
        required
      />

      <button
        type="button"
        onClick={() => setStorageLocDefault(!storageLocDefault)}
        className="flex items-center gap-3 w-full text-left"
      >
        <div
          className={`relative flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            storageLocDefault ? 'bg-primary-600' : 'bg-surface-700'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
              storageLocDefault ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
        <div>
          <span className="text-sm text-surface-200">Set as default</span>
          <p className="text-xs text-surface-500">Automatically selected during package check-in</p>
        </div>
      </button>

      <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
        <Button variant="secondary" onClick={() => setShowStorageLocModal(false)}>
          Cancel
        </Button>
        <Button onClick={handleSaveStorageLoc} disabled={storageLocSaving || !storageLocName.trim()}>
          {storageLocSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          {editingStorageLoc ? 'Update' : 'Add'} Location
        </Button>
      </div>
    </div>
  </Modal>
    </>
  );
}
