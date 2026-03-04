import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/settings/printer/detect
 *
 * Detects printers installed on the host machine via OS-level commands.
 * Works on macOS (lpstat), Linux (lpstat), and Windows (wmic / powershell).
 *
 * BAR-385: Most clients have printers connected via USB or Wi-Fi to the host
 * machine, so we discover them from the OS rather than requiring manual setup.
 */
export const GET = withApiHandler(async (_request, { user }) => {
  if (!user.tenantId) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
  }

  try {
    const printers = await detectSystemPrinters();
    return NextResponse.json({ printers });
  } catch (err) {
    console.error('[GET /api/settings/printer/detect]', err);
    return NextResponse.json({ printers: [], error: 'Could not detect printers' });
  }
});

interface DetectedPrinter {
  name: string;
  driver: string;
  uri: string;
  isDefault: boolean;
  status: 'idle' | 'busy' | 'unknown';
}

async function detectSystemPrinters(): Promise<DetectedPrinter[]> {
  const platform = process.platform;

  if (platform === 'darwin' || platform === 'linux') {
    return detectUnixPrinters();
  } else if (platform === 'win32') {
    return detectWindowsPrinters();
  }

  return [];
}

/**
 * Detect printers on macOS / Linux using lpstat (CUPS).
 */
async function detectUnixPrinters(): Promise<DetectedPrinter[]> {
  const printers: DetectedPrinter[] = [];

  try {
    // Get list of printers and their status
    const { stdout: lpstatOutput } = await execAsync('lpstat -p 2>/dev/null || true', {
      timeout: 5000,
    });

    // Get the default printer
    let defaultPrinter = '';
    try {
      const { stdout: defaultOutput } = await execAsync('lpstat -d 2>/dev/null || true', {
        timeout: 3000,
      });
      const defaultMatch = defaultOutput.match(/system default destination:\s*(.+)/);
      if (defaultMatch) {
        defaultPrinter = defaultMatch[1].trim();
      }
    } catch {
      // No default printer set
    }

    // Get detailed printer info via lpoptions
    let printerDetails: Record<string, string> = {};
    try {
      const { stdout: lpoptionsOutput } = await execAsync('lpstat -v 2>/dev/null || true', {
        timeout: 5000,
      });
      // Parse lines like: "device for MyPrinter: usb://Brother/..."
      for (const line of lpoptionsOutput.split('\n')) {
        const match = line.match(/device for\s+(.+?):\s*(.+)/);
        if (match) {
          printerDetails[match[1].trim()] = match[2].trim();
        }
      }
    } catch {
      // Couldn't get details
    }

    // Parse lpstat -p output
    // Lines like: "printer MyPrinter is idle. ..."  or  "printer MyPrinter disabled since ..."
    for (const line of lpstatOutput.split('\n')) {
      const match = line.match(/^printer\s+(\S+)\s+(is\s+idle|disabled|is\s+busy|enabled)/i);
      if (match) {
        const name = match[1];
        const statusRaw = match[2].toLowerCase();
        let status: 'idle' | 'busy' | 'unknown' = 'unknown';
        if (statusRaw.includes('idle') || statusRaw.includes('enabled')) status = 'idle';
        else if (statusRaw.includes('busy')) status = 'busy';

        const uri = printerDetails[name] || '';

        // Infer driver type from name/URI
        let driver = 'unknown';
        const combined = (name + ' ' + uri).toLowerCase();
        if (combined.includes('zpl') || combined.includes('zebra')) driver = 'zpl';
        else if (combined.includes('dymo')) driver = 'thermal';
        else if (combined.includes('brother') || combined.includes('hp') || combined.includes('canon') || combined.includes('epson')) driver = 'laser';
        else if (combined.includes('thermal') || combined.includes('esc')) driver = 'thermal';
        else if (combined.includes('ipp') || combined.includes('airprint')) driver = 'ipp';

        printers.push({
          name,
          driver,
          uri,
          isDefault: name === defaultPrinter,
          status,
        });
      }
    }
  } catch (err) {
    console.error('Failed to detect Unix printers:', err);
  }

  return printers;
}

/**
 * Detect printers on Windows using PowerShell Get-Printer.
 */
async function detectWindowsPrinters(): Promise<DetectedPrinter[]> {
  const printers: DetectedPrinter[] = [];

  try {
    const { stdout } = await execAsync(
      'powershell -NoProfile -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"',
      { timeout: 10000 },
    );

    const parsed = JSON.parse(stdout);
    const printerList = Array.isArray(parsed) ? parsed : [parsed];

    // Get default printer
    let defaultName = '';
    try {
      const { stdout: defaultOutput } = await execAsync(
        'powershell -NoProfile -Command "(Get-WmiObject -Query \\"SELECT * FROM Win32_Printer WHERE Default=True\\").Name"',
        { timeout: 5000 },
      );
      defaultName = defaultOutput.trim();
    } catch {
      // No default
    }

    for (const p of printerList) {
      if (!p?.Name) continue;
      const driverLower = (p.DriverName || '').toLowerCase();
      let driver = 'unknown';
      if (driverLower.includes('zpl') || driverLower.includes('zebra')) driver = 'zpl';
      else if (driverLower.includes('dymo') || driverLower.includes('thermal')) driver = 'thermal';
      else if (driverLower.includes('brother') || driverLower.includes('hp') || driverLower.includes('canon') || driverLower.includes('epson')) driver = 'laser';

      printers.push({
        name: p.Name,
        driver,
        uri: p.PortName || '',
        isDefault: p.Name === defaultName,
        status: p.PrinterStatus === 0 || p.PrinterStatus === 3 ? 'idle' : 'busy',
      });
    }
  } catch (err) {
    console.error('Failed to detect Windows printers:', err);
  }

  return printers;
}
