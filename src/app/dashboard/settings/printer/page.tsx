'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { generateZplLabel, printZplLabel } from '@/lib/zpl';
import {
  Printer,
  Plus,
  Save,
  TestTube2,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface PrinterConfigData {
  id: string;
  name: string;
  type: string;
  ipAddress: string | null;
  port: number;
  isDefault: boolean;
  isActive: boolean;
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<PrinterConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // New printer form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('ZPL Printer');
  const [formType, setFormType] = useState('zpl');
  const [formIp, setFormIp] = useState('');
  const [formPort, setFormPort] = useState('9100');

  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    try {
      const res = await fetch('/api/settings/printer');
      if (res.ok) {
        const data = await res.json();
        setPrinters(data.printers || []);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const savePrinter = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: formType,
          ipAddress: formIp || null,
          port: parseInt(formPort) || 9100,
          isDefault: printers.length === 0,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormName('ZPL Printer');
        setFormIp('');
        setFormPort('9100');
        await fetchPrinters();
      }
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  const testPrint = async (printer: PrinterConfigData) => {
    setTestResult(null);
    const testLabel = generateZplLabel({
      customerName: 'Test Customer',
      pmbNumber: 'PMB-0001',
      trackingNumber: '1Z999AA10123456784',
      carrier: 'UPS',
      date: new Date().toLocaleDateString(),
      storeName: 'ShipOS Pro',
      packageType: 'Test Label',
    });

    const result = await printZplLabel(
      testLabel,
      printer.ipAddress || undefined,
      printer.port
    );

    setTestResult(
      result.success
        ? `✅ Print sent via ${result.method}`
        : `❌ Failed: ${result.error || 'Unknown error'}`
    );

    setTimeout(() => setTestResult(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-surface-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Printer Configuration"
        description="Set up ZPL label printers for package labels"
        icon={<Printer className="h-6 w-6" />}
        actions={
          <Button onClick={() => setShowForm(!showForm)} leftIcon={<Plus className="h-4 w-4" />}>
            Add Printer
          </Button>
        }
      />

      {/* Test Result */}
      {testResult && (
        <div className={`p-3 rounded-lg text-sm ${
          testResult.startsWith('✅')
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {testResult}
        </div>
      )}

      {/* Add Printer Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Printer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Printer Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Front Desk ZPL"
              />
              <Select
                label="Printer Type"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                options={[
                  { value: 'zpl', label: 'Zebra ZPL' },
                  { value: 'thermal', label: 'Generic Thermal' },
                  { value: 'laser', label: 'Laser (PDF)' },
                ]}
              />
              <Input
                label="IP Address"
                value={formIp}
                onChange={(e) => setFormIp(e.target.value)}
                placeholder="192.168.1.100"
                helperText="Leave blank for browser print fallback"
              />
              <Input
                label="Port"
                value={formPort}
                onChange={(e) => setFormPort(e.target.value)}
                placeholder="9100"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={savePrinter} loading={saving} leftIcon={<Save className="h-4 w-4" />}>
                Save Printer
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Printer List */}
      {printers.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <Printer className="h-12 w-12 text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400">No printers configured</p>
              <p className="text-sm text-surface-500 mt-1">
                Add a ZPL printer to enable label printing for packages
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((printer) => (
            <Card key={printer.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-surface-800 flex items-center justify-center">
                      <Printer className="h-5 w-5 text-surface-400" />
                    </div>
                    <div>
                      <div className="font-medium text-surface-200">{printer.name}</div>
                      <div className="text-xs text-surface-500">
                        {printer.type.toUpperCase()} • Port {printer.port}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {printer.isDefault && <Badge variant="default" dot={false}>Default</Badge>}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-surface-400">
                  {printer.ipAddress ? (
                    <>
                      <Wifi className="h-4 w-4 text-emerald-400" />
                      <span className="font-mono">{printer.ipAddress}:{printer.port}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-surface-600" />
                      <span>Browser print (no IP configured)</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => testPrint(printer)}
                    leftIcon={<TestTube2 className="h-3.5 w-3.5" />}
                  >
                    Test Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
