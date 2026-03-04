'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ToggleSwitch } from './toggle-switch';
import { Check, Edit3, FileText, Mail, Package, Plus, Save, Upload } from 'lucide-react';

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
}

export function MailboxTab({ platformEnabled, setPlatformEnabled, carrierProgramEnabled, setCarrierProgramEnabled, templateContent, setTemplateContent, templateFileName, templateFileRef, showEditTemplateModal, setShowEditTemplateModal, templateSaving, templateSaved, handleSaveTemplate, handleUploadTemplate }: MailboxTabProps) {
  return (
    <>
  <Card>
    <CardHeader>
      <CardTitle>Mailbox Ranges</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-surface-400 mb-6">
        Define your PMB number ranges for each mailbox platform. These ranges determine which box numbers
        are available when setting up new customers.
      </p>

      <div className="space-y-4">
        {/* Physical / Store boxes */}
        <div className={`glass-card p-4 ${!platformEnabled.store ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-surface-600/30 flex items-center justify-center">
                <Mail className="h-4 w-4 text-surface-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">Store (Physical) Mailboxes</p>
                <p className="text-xs text-surface-500">Traditional in-store mailboxes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.store ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.store ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.store}
                onChange={(val) => setPlatformEnabled(prev => ({ ...prev, store: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input type="number" defaultValue={1} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input type="number" defaultValue={550} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* Anytime Mailbox */}
        <div className={`glass-card p-4 ${!platformEnabled.anytime ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">Anytime Mailbox</p>
                <p className="text-xs text-surface-500">Digital mailbox platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.anytime ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.anytime ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.anytime}
                onChange={(val) => setPlatformEnabled(prev => ({ ...prev, anytime: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input type="number" defaultValue={700} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input type="number" defaultValue={999} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* iPostal1 */}
        <div className={`glass-card p-4 ${!platformEnabled.ipostal1 ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">iPostal1</p>
                <p className="text-xs text-surface-500">Digital mailbox platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.ipostal1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.ipostal1 ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.ipostal1}
                onChange={(val) => setPlatformEnabled(prev => ({ ...prev, ipostal1: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input type="number" defaultValue={1000} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input type="number" defaultValue={1200} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* PostScan Mail */}
        <div className={`glass-card p-4 ${!platformEnabled.postscan ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Mail className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">PostScan Mail</p>
                <p className="text-xs text-surface-500">Digital mailbox platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${platformEnabled.postscan ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {platformEnabled.postscan ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={platformEnabled.postscan}
                onChange={(val) => setPlatformEnabled(prev => ({ ...prev, postscan: val }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range Start</label>
              <input type="number" defaultValue={2000} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="text-xs text-surface-500 mb-1 block">Range End</label>
              <input type="number" defaultValue={2999} className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Add Custom Range</Button>
        <Button variant="default" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />}>Save Ranges</Button>
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
                <Package className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">UPS Access Point</p>
                <p className="text-xs text-surface-500">Receive and hold UPS-redirected packages for pickup</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.ups_ap ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.ups_ap ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.ups_ap}
                onChange={(val) => setCarrierProgramEnabled(prev => ({ ...prev, ups_ap: val }))}
              />
            </div>
          </div>
        </div>

        {/* FedEx HAL */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.fedex_hal ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">FedEx Hold At Location</p>
                <p className="text-xs text-surface-500">Receive and hold FedEx-redirected packages (FASC required)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.fedex_hal ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.fedex_hal ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.fedex_hal}
                onChange={(val) => setCarrierProgramEnabled(prev => ({ ...prev, fedex_hal: val }))}
              />
            </div>
          </div>
        </div>

        {/* KINEK */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.kinek ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">KINEK</p>
                <p className="text-xs text-surface-500">Third-party package receiving network — recipients identified by 7-digit KINEK number</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.kinek ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.kinek ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.kinek}
                onChange={(val) => setCarrierProgramEnabled(prev => ({ ...prev, kinek: val }))}
              />
            </div>
          </div>
        </div>

        {/* Amazon */}
        <div className={`glass-card p-4 ${!carrierProgramEnabled.amazon ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">Amazon</p>
                <p className="text-xs text-surface-500">Receive and hold Amazon packages for pickup</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge dot={false} className={`text-xs ${carrierProgramEnabled.amazon ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-surface-700 text-surface-400 border-surface-600'}`}>
                {carrierProgramEnabled.amazon ? 'Active' : 'Disabled'}
              </Badge>
              <ToggleSwitch
                checked={carrierProgramEnabled.amazon}
                onChange={(val) => setCarrierProgramEnabled(prev => ({ ...prev, amazon: val }))}
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
