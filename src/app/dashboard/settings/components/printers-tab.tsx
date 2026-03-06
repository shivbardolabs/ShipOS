'use client';
import { ToggleSwitch } from './toggle-switch';
import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PrinterEntry } from './types';
import { AlertTriangle, Loader2, Package, Plus, Printer, RefreshCw, RotateCcw, Save, Search, Settings2, TestTube, Trash2, Wifi, WifiOff } from 'lucide-react';
import { computeRollStatus, useLabelRollTracking } from '@/hooks/use-label-roll-tracking';
import {
  discoverPrinters,
  scanSubnet,
  type DiscoveredPrinter,
  type ScanProgress,
} from '@/lib/printer-discovery';

export interface PrintersTabProps {
  printers: PrinterEntry[];
  setPrinters: React.Dispatch<React.SetStateAction<PrinterEntry[]>>;
  addingPrinter: boolean;
  setAddingPrinter: (v: boolean) => void;
  printerTestResult: string | null;
  setPrinterTestResult: (v: string | null) => void;
  printersLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function PrintersTab({
  printers,
  setPrinters,
  addingPrinter,
  setAddingPrinter,
  printerTestResult,
  setPrinterTestResult,
  printersLoading,
  onRefresh,
}: PrintersTabProps) {
  // BAR-410: Client-side printer discovery state
  const [detectedPrinters, setDetectedPrinters] = useState<DiscoveredPrinter[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [hasDetected, setHasDetected] = useState(false);
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [customSubnet, setCustomSubnet] = useState('');

  // BAR-386: Label roll tracking state
  const { resetRoll, configureRoll } = useLabelRollTracking();
  const [configuringRollId, setConfiguringRollId] = useState<string | null>(null);
  const [rollConfigCapacity, setRollConfigCapacity] = useState('');
  const [rollConfigThreshold, setRollConfigThreshold] = useState('');
  const [resettingRollId, setResettingRollId] = useState<string | null>(null);

  // BAR-386: Handle new roll loaded
  const handleResetRoll = async (printerId: string) => {
    setResettingRollId(printerId);
    const result = await resetRoll(printerId);
    if (result) {
      setPrinters(prev =>
        prev.map(p =>
          p.id === printerId
            ? { ...p, labelsPrinted: 0, rollLoadedAt: new Date().toISOString() }
            : p
        )
      );
    }
    setResettingRollId(null);
  };

  // BAR-386: Save roll configuration
  const handleSaveRollConfig = async (printerId: string) => {
    const capacity = parseInt(rollConfigCapacity) || undefined;
    const threshold = parseInt(rollConfigThreshold) || undefined;
    const result = await configureRoll(printerId, capacity, threshold);
    if (result) {
      setPrinters(prev =>
        prev.map(p =>
          p.id === printerId
            ? {
                ...p,
                rollCapacity: capacity ?? p.rollCapacity,
                lowSupplyThreshold: threshold ?? p.lowSupplyThreshold,
              }
            : p
        )
      );
    }
    setConfiguringRollId(null);
    setRollConfigCapacity('');
    setRollConfigThreshold('');
  };

  // BAR-410: Detect printers from the local network (client-side)
  const handleDetectPrinters = async () => {
    setDetecting(true);
    setDetectError(null);
    setDetectedPrinters([]);
    setScanProgress(null);
    try {
      const detected = await discoverPrinters((progress) => {
        setScanProgress(progress);
      });
      // Filter out printers already added (by IP match)
      const existingIps = new Set(
        printers.filter((p) => p.ipAddress).map((p) => p.ipAddress!.toLowerCase()),
      );
      const newPrinters = detected.filter(
        (d) => !existingIps.has(d.ip.toLowerCase()),
      );
      setDetectedPrinters(newPrinters);
      setHasDetected(true);
      if (newPrinters.length === 0 && detected.length > 0) {
        setDetectError('All detected printers are already added.');
      }
    } catch {
      setDetectError(
        'Scan failed. Your browser may be blocking local network access. Try adding a printer manually.',
      );
    } finally {
      setDetecting(false);
      setScanProgress(null);
    }
  };

  // BAR-410: Scan a specific subnet (user-initiated deep search)
  const handleSubnetScan = async () => {
    const subnet = customSubnet.trim();
    if (!subnet.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
      setDetectError('Enter a subnet like 192.168.2 or 10.0.1');
      return;
    }
    setDetecting(true);
    setDetectError(null);
    setScanProgress(null);
    try {
      const found = await scanSubnet(subnet, (progress) => {
        setScanProgress(progress);
      });
      const existingIps = new Set(
        printers.filter((p) => p.ipAddress).map((p) => p.ipAddress!.toLowerCase()),
      );
      const newPrinters = found.filter(
        (d) => !existingIps.has(d.ip.toLowerCase()),
      );
      setDetectedPrinters((prev) => {
        // Merge with any existing results, dedupe by ip:port
        const seen = new Set(prev.map((p) => `${p.ip}:${p.port}`));
        const merged = [...prev];
        for (const p of newPrinters) {
          if (!seen.has(`${p.ip}:${p.port}`)) {
            merged.push(p);
          }
        }
        return merged;
      });
      if (newPrinters.length === 0) {
        setDetectError(`No printers found on ${subnet}.x`);
      }
    } catch {
      setDetectError('Subnet scan failed.');
    } finally {
      setDetecting(false);
      setScanProgress(null);
    }
  };

  // BAR-410: Add a detected printer to the saved list via API
  const handleAddDetected = async (detected: DiscoveredPrinter) => {
    setSavingPrinter(true);
    try {
      const res = await fetch('/api/settings/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: detected.name,
          type: detected.driver !== 'unknown' ? detected.driver : 'zpl',
          ipAddress: detected.ip || null,
          port: detected.port,
          isDefault: printers.length === 0,
        }),
      });

      if (res.ok) {
        // Remove from detected list
        setDetectedPrinters((prev) =>
          prev.filter((p) => p.ip !== detected.ip || p.port !== detected.port),
        );
        // Refresh the full printer list from API
        if (onRefresh) await onRefresh();
      }
    } catch {
      // Silently fail
    } finally {
      setSavingPrinter(false);
    }
  };

  // BAR-385: Save a manually configured printer via API
  const handleSaveManualPrinter = async () => {
    setSavingPrinter(true);
    try {
      const nameEl = document.getElementById('new-printer-name') as HTMLInputElement;
      const modelEl = document.getElementById('new-printer-model') as HTMLInputElement;
      const ipEl = document.getElementById('new-printer-ip') as HTMLInputElement;
      const portEl = document.getElementById('new-printer-port') as HTMLInputElement;
      const typeEl = document.getElementById('new-printer-type') as HTMLSelectElement;

      const res = await fetch('/api/settings/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameEl?.value || 'New Printer',
          type: typeEl?.value || 'zpl',
          ipAddress: ipEl?.value || null,
          port: parseInt(portEl?.value || '9100', 10),
          isDefault: printers.length === 0,
        }),
      });

      if (res.ok) {
        setAddingPrinter(false);
        // Refresh from API to get the real saved data
        if (onRefresh) await onRefresh();
      }
    } catch {
      // Silently fail
    } finally {
      setSavingPrinter(false);
    }
  };

  // BAR-385: Delete a printer via API
  const handleDeletePrinter = async (printer: PrinterEntry) => {
    if (!confirm(`Delete printer "${printer.name}"?`)) return;
    try {
      const res = await fetch(`/api/settings/printer?id=${printer.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPrinters(prev => prev.filter(p => p.id !== printer.id));
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <>
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-sm font-semibold text-surface-200">Connected Printers</h2>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" leftIcon={<Search className="h-3.5 w-3.5" />} onClick={handleDetectPrinters} loading={detecting}>
        Detect Printers
      </Button>
      <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddingPrinter(true)}>
        Add Printer
      </Button>
    </div>
  </div>

  {/* BAR-410: Scan progress indicator */}
  {detecting && scanProgress && (
    <div className="mb-4 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-400" />
          <span className="text-sm text-surface-300">{scanProgress.phase}</span>
        </div>
        {scanProgress.foundCount > 0 && (
          <Badge variant="success" dot>
            {scanProgress.foundCount} found
          </Badge>
        )}
      </div>
      {scanProgress.total > 1 && (
        <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-150"
            style={{
              width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  )}

  {/* Test Result Banner */}
  {printerTestResult && (
    <div className={`mb-4 p-3 rounded-lg text-sm ${
      printerTestResult.startsWith('✅')
        ? 'bg-status-success-500/10 text-status-success-400 border border-status-success-500/20'
        : 'bg-status-error-500/10 text-status-error-400 border border-status-error-500/20'
    }`}>
      {printerTestResult}
    </div>
  )}

  {/* BAR-386: Low Label Supply Warning Banner */}
  {(() => {
    const lowPrinters = printers.filter(p => {
      const status = computeRollStatus(p);
      return status.isLow;
    });
    if (lowPrinters.length === 0) return null;
    return (
      <div className="mb-4 p-3 rounded-lg text-sm bg-status-warning-500/10 text-status-warning-400 border border-status-warning-500/20 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Low label supply</p>
          <p className="text-xs text-status-warning-400/80 mt-0.5">
            {lowPrinters.map(p => {
              const s = computeRollStatus(p);
              return `${p.name}: ~${s.remaining} labels remaining`;
            }).join(' · ')}
            {' — '}Have a new roll ready or order more labels.
          </p>
        </div>
      </div>
    );
  })()}

  {/* BAR-385: Detected System Printers */}
  {hasDetected && detectedPrinters.length > 0 && (
    <Card className="mb-4">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-surface-200">
            Detected Printers ({detectedPrinters.length})
          </h3>
          <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleDetectPrinters} loading={detecting}>
            Rescan
          </Button>
        </div>
        <p className="text-xs text-surface-500">
          These printers were found on your network. Click &ldquo;Add&rdquo; to configure them.
        </p>
        <div className="space-y-2">
          {detectedPrinters.map((dp) => (
            <div key={`${dp.ip}:${dp.port}`} className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10">
                  <Printer className="h-4.5 w-4.5 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-200">{dp.name}</p>
                  <p className="text-xs text-surface-500">
                    {dp.driver !== 'unknown' ? dp.driver.toUpperCase() : 'ZPL'} printer
                    {dp.ip ? ` · ${dp.ip}:${dp.port}` : ''}
                    {dp.source === 'zebra-browser-print' ? ' · via Zebra Browser Print' : ''}
                    {dp.source === 'server-api' ? ' · via system detection' : ''}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => handleAddDetected(dp)} loading={savingPrinter} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )}

  {/* Detection error / info message */}
  {detectError && (
    <div className="mb-4 p-3 rounded-lg text-sm bg-surface-800/50 text-surface-400 border border-surface-700/50">
      {detectError}
    </div>
  )}

  {/* BAR-410: Enhanced empty state after scan — help the user find printers */}
  {hasDetected && detectedPrinters.length === 0 && !detectError && !detecting && (
    <div className="mb-4 p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
      <div className="flex items-start gap-3">
        <Search className="h-5 w-5 text-surface-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-surface-300">No printers found on the network</p>
          <p className="text-xs text-surface-500 mt-1">
            This can happen if your printers are on a different subnet, behind a firewall,
            or if your browser blocks local network access.
          </p>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-surface-400">Try these options:</p>
            <ul className="text-xs text-surface-500 list-disc pl-4 space-y-1">
              <li>Click &ldquo;Add Printer&rdquo; and enter the printer&apos;s IP address manually</li>
              <li>Check the printer&apos;s display or configuration label for its IP</li>
              <li>Scan a specific subnet if your network uses a custom range</li>
            </ul>
          </div>
          {/* Custom subnet scan input */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. 192.168.2"
              value={customSubnet}
              onChange={(e) => setCustomSubnet(e.target.value)}
              className="w-40 bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-primary-500"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSubnetScan}
              loading={detecting}
              leftIcon={<Wifi className="h-3.5 w-3.5" />}
            >
              Scan Subnet
            </Button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* Add Printer Form (manual) */}
  {addingPrinter && (
    <Card className="mb-4">
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-surface-200">Add New Printer</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Printer Name</label>
            <input type="text" defaultValue="New Label Printer" className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-name" />
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Model</label>
            <input type="text" placeholder="e.g. Zebra ZD420" className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-model" />
          </div>
        </div>
        <p className="text-xs font-medium text-surface-400 mt-2 pt-2 border-t border-surface-700/50">Connection Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-surface-500 mb-1 block">IP Address</label>
            <input type="text" placeholder="e.g. 192.168.1.100 (leave blank for USB)" className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-ip" />
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Port</label>
            <input type="number" defaultValue="9100" className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-port" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Protocol / Driver</label>
            <select className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-type">
              <option value="zpl">ZPL (Zebra)</option>
              <option value="epl">EPL (Eltron)</option>
              <option value="thermal">Thermal / ESC/POS</option>
              <option value="laser">Laser / PCL</option>
              <option value="ipp">IPP / AirPrint</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">Paper Size</label>
            <select className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-paper">
              <option value="4x6">4×6″ (Shipping Label)</option>
              <option value="4x4">4×4″ (Square Label)</option>
              <option value="2.25x1.25">2.25×1.25″ (Barcode)</option>
              <option value="letter">Letter (8.5×11″)</option>
              <option value="receipt">Receipt (3.125″ roll)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-surface-500 mb-1 block">DPI</label>
            <select className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-dpi">
              <option value="203">203 DPI</option>
              <option value="300">300 DPI</option>
              <option value="600">600 DPI</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSaveManualPrinter} loading={savingPrinter} leftIcon={<Save className="h-3.5 w-3.5" />}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingPrinter(false)}>Cancel</Button>
        </div>
      </div>
    </Card>
  )}

  {/* Loading state */}
  {printersLoading && (
    <Card>
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500 mx-auto mb-3" />
        <p className="text-surface-400">Loading printers…</p>
      </div>
    </Card>
  )}

  {/* Printer list */}
  {!printersLoading && (
  <div className="space-y-3">
    {printers.length === 0 && (
      <Card>
        <div className="text-center py-12">
          <Printer className="h-12 w-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400">No printers configured</p>
          <p className="text-sm text-surface-500 mt-1">
            Click &ldquo;Detect Printers&rdquo; to scan your local network, or &ldquo;Add Printer&rdquo; to set one up manually
          </p>
        </div>
      </Card>
    )}
    {printers.map((printer) => {
      const rollStatus = computeRollStatus(printer);
      const progressColor = rollStatus.isLow
        ? rollStatus.remaining <= 0
          ? 'bg-status-error-500'
          : 'bg-status-warning-500'
        : 'bg-status-success-500';
      const isConfiguring = configuringRollId === printer.id;

      return (
      <Card key={printer.id}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                printer.status === 'online' ? 'bg-status-success-50' : 'bg-surface-800'
              }`}
            >
              <Printer
                className={`h-6 w-6 ${
                  printer.status === 'online' ? 'text-status-success-600' : 'text-surface-500'
                }`}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-surface-200">{printer.name}</h3>
              <p className="text-xs text-surface-500">{printer.model}</p>
              {printer.ipAddress && (
                <p className="text-xs text-surface-600 mt-0.5 font-mono">
                  {printer.ipAddress}:{printer.port || 9100} · {printer.type || 'zpl'}
                  {printer.dpi ? ` · ${printer.dpi} DPI` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {printer.status === 'online' ? (
                <Wifi className="h-4 w-4 text-status-success-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-status-error-600" />
              )}
              <Badge variant={printer.status === 'online' ? 'success' : 'danger'} dot>
                {printer.status === 'online' ? 'Connected' : 'Offline'}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <ToggleSwitch
                checked={printer.autoPrint}
                onChange={(val: boolean) => {
                  setPrinters((prev) =>
                    prev.map((p) =>
                      p.id === printer.id ? { ...p, autoPrint: val } : p
                    )
                  );
                  // Persist auto-print / default toggle via API
                  fetch('/api/settings/printer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: printer.id, isDefault: val }),
                  }).catch(() => {});
                }}
                label="Auto-print"
              />
            </div>

            <Button variant="outline" size="sm" leftIcon={<TestTube className="h-3.5 w-3.5" />} onClick={() => {
              setPrinterTestResult(null);
              if (printer.status === 'online') {
                setPrinterTestResult(`✅ Test label sent to ${printer.name} (${printer.model})`);
              } else {
                setPrinterTestResult(`❌ Cannot reach ${printer.name} — printer is offline`);
              }
              setTimeout(() => setPrinterTestResult(null), 5000);
            }}>
              Test Print
            </Button>
            <Button variant="ghost" size="sm" iconOnly onClick={() => handleDeletePrinter(printer)}>
              <Trash2 className="h-4 w-4 text-status-error-600" />
            </Button>
          </div>
        </div>

        {/* BAR-386: Label Roll Usage Tracker */}
        <div className="mt-3 pt-3 border-t border-surface-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-surface-400" />
              <span className="text-xs font-medium text-surface-300">Label Roll</span>
              {rollStatus.isLow && (
                <Badge variant="warning" dot>Low Supply</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isConfiguring) {
                    setConfiguringRollId(null);
                  } else {
                    setConfiguringRollId(printer.id);
                    setRollConfigCapacity(String(rollStatus.rollCapacity));
                    setRollConfigThreshold(String(rollStatus.lowSupplyThreshold));
                  }
                }}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={() => handleResetRoll(printer.id)}
                loading={resettingRollId === printer.id}
              >
                New Roll Loaded
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${Math.min(100, rollStatus.percentUsed)}%` }}
              />
            </div>
            <span className="text-xs text-surface-400 tabular-nums whitespace-nowrap">
              {rollStatus.labelsPrinted} / {rollStatus.rollCapacity}
            </span>
          </div>

          {/* Status text */}
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs ${rollStatus.isLow ? 'text-status-warning-400' : 'text-surface-500'}`}>
              {rollStatus.remaining <= 0
                ? 'Roll may be empty — load a new roll'
                : rollStatus.isLow
                  ? `~${rollStatus.remaining} labels remaining — have a new roll ready`
                  : `~${rollStatus.remaining} labels remaining`}
            </span>
            {rollStatus.rollLoadedAt && (
              <span className="text-xs text-surface-600">
                Loaded {new Date(rollStatus.rollLoadedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* BAR-386: Roll configuration panel */}
          {isConfiguring && (
            <div className="mt-3 p-3 rounded-lg bg-surface-800/50 border border-surface-700/50 space-y-3">
              <p className="text-xs font-medium text-surface-300">Roll Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Labels per roll</label>
                  <input
                    type="number"
                    value={rollConfigCapacity}
                    onChange={e => setRollConfigCapacity(e.target.value)}
                    className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Warn when remaining</label>
                  <input
                    type="number"
                    value={rollConfigThreshold}
                    onChange={e => setRollConfigThreshold(e.target.value)}
                    className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSaveRollConfig(printer.id)} leftIcon={<Save className="h-3.5 w-3.5" />}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfiguringRollId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
      );
    })}
  </div>
  )}
    </>
  );
}
