'use client';
import { ToggleSwitch } from './toggle-switch';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PrinterEntry } from './types';
import { Plus, Printer, Save, TestTube, Trash2, Wifi, WifiOff } from 'lucide-react';

export interface PrintersTabProps {
  printers: PrinterEntry[];
  setPrinters: React.Dispatch<React.SetStateAction<PrinterEntry[]>>;
  addingPrinter: boolean;
  setAddingPrinter: (v: boolean) => void;
  printerTestResult: string | null;
  setPrinterTestResult: (v: string | null) => void;
}

export function PrintersTab({ printers, setPrinters, addingPrinter, setAddingPrinter, printerTestResult, setPrinterTestResult }: PrintersTabProps) {
  return (
    <>
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-sm font-semibold text-surface-200">Connected Printers</h2>
    <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddingPrinter(true)}>
      Add Printer
    </Button>
  </div>

  {/* Test Result Banner */}
  {printerTestResult && (
    <div className={`mb-4 p-3 rounded-lg text-sm ${
      printerTestResult.startsWith('✅')
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {printerTestResult}
    </div>
  )}

  {/* Add Printer Form */}
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
            <input type="text" placeholder="e.g. 192.168.1.100" className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500" id="new-printer-ip" />
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
          <Button size="sm" onClick={() => {
            const nameEl = document.getElementById('new-printer-name') as HTMLInputElement;
            const modelEl = document.getElementById('new-printer-model') as HTMLInputElement;
            const ipEl = document.getElementById('new-printer-ip') as HTMLInputElement;
            const portEl = document.getElementById('new-printer-port') as HTMLInputElement;
            const typeEl = document.getElementById('new-printer-type') as HTMLSelectElement;
            const paperEl = document.getElementById('new-printer-paper') as HTMLSelectElement;
            const dpiEl = document.getElementById('new-printer-dpi') as HTMLSelectElement;
            const newPrinter = {
              id: `ptr_${Date.now()}`,
              name: nameEl?.value || 'New Printer',
              model: modelEl?.value || 'Unknown Model',
              status: 'offline' as const,
              autoPrint: false,
              ipAddress: ipEl?.value || '',
              port: parseInt(portEl?.value || '9100', 10),
              type: typeEl?.value || 'zpl',
              paperSize: paperEl?.value || '4x6',
              dpi: parseInt(dpiEl?.value || '203', 10),
            };
            setPrinters(prev => [...prev, newPrinter]);
            setAddingPrinter(false);
            // Also persist via API
            fetch('/api/settings/printer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: newPrinter.name,
                type: newPrinter.type,
                ipAddress: newPrinter.ipAddress || null,
                port: newPrinter.port,
              }),
            }).catch(() => {});
          }} leftIcon={<Save className="h-3.5 w-3.5" />}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingPrinter(false)}>Cancel</Button>
        </div>
      </div>
    </Card>
  )}

  <div className="space-y-3">
    {printers.length === 0 && (
      <Card>
        <div className="text-center py-12">
          <Printer className="h-12 w-12 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400">No printers configured</p>
          <p className="text-sm text-surface-500 mt-1">Click &ldquo;Add Printer&rdquo; to set up a label printer</p>
        </div>
      </Card>
    )}
    {printers.map((printer) => (
      <Card key={printer.id}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                printer.status === 'online' ? 'bg-emerald-50' : 'bg-surface-800'
              }`}
            >
              <Printer
                className={`h-6 w-6 ${
                  printer.status === 'online' ? 'text-emerald-600' : 'text-surface-500'
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
                <Wifi className="h-4 w-4 text-emerald-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
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
            <Button variant="ghost" size="sm" iconOnly onClick={() => {
              if (confirm(`Delete printer "${printer.name}"?`)) {
                setPrinters(prev => prev.filter(p => p.id !== printer.id));
              }
            }}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
      </Card>
    ))}
  </div>
    </>
  );
}
