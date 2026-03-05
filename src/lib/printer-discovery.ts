/**
 * Client-side network printer discovery for ShipOS.
 *
 * Problem: ShipOS is deployed on Vercel, so the server-side `lpstat` / PowerShell
 * detection (GET /api/settings/printer/detect) always returns empty — there are
 * no printers attached to Vercel's servers.
 *
 * Solution: Scan from the browser. The browser IS on the local network with the
 * printers — proven by `printZplLabel` in zpl.ts already working via HTTP POST
 * to printerIp:9100.
 *
 * Discovery methods (run in order):
 * 1. Zebra Browser Print — check for Zebra's local print service on localhost
 * 2. Network probe — scan common subnets for port 9100 (raw/ZPL) listeners
 * 3. Server API fallback — for self-hosted deployments where lpstat works
 *
 * @module printer-discovery
 * @see {@link file://src/lib/zpl.ts} — existing print logic via HTTP to IP:9100
 */

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface DiscoveredPrinter {
  /** Display name (e.g. "Printer at 192.168.1.100" or Zebra model name) */
  name: string;
  /** IP address of the printer */
  ip: string;
  /** Port number (usually 9100 for ZPL raw) */
  port: number;
  /** Detected driver/protocol type */
  driver: string;
  /** How this printer was discovered */
  source: 'zebra-browser-print' | 'network-scan' | 'server-api';
}

export interface ScanProgress {
  /** Human-readable description of current phase */
  phase: string;
  /** Number of IPs probed so far in current phase */
  current: number;
  /** Total IPs to probe in current phase */
  total: number;
  /** Running count of printers found across all phases */
  foundCount: number;
}

export type ProgressCallback = (progress: ScanProgress) => void;

/* ── Constants ───────────────────────────────────────────────────────────── */

const PRINTER_PORT = 9100;
const PROBE_TIMEOUT_MS = 1200;
const BATCH_SIZE = 30;

/** Common office/warehouse subnets — scanned in order, stop on first hit. */
const DEFAULT_SUBNETS = ['192.168.1', '192.168.0', '10.0.0', '10.0.1', '172.16.0'];

/**
 * Last octets where printers are commonly assigned.
 * Covers static-IP conventions, common DHCP ranges, and low-range defaults.
 */
const PRIORITY_OCTETS = [
  // Typical static printer IPs
  100, 101, 102, 103, 104, 105, 110, 150, 200, 201, 202, 250,
  // Mid DHCP range
  50, 51, 52, 53, 54, 55, 60, 70, 75, 80,
  // Low range & gateway-adjacent
  1, 2, 3, 10, 11, 15, 20, 21, 25, 30,
];

/* ── Probing ─────────────────────────────────────────────────────────────── */

/**
 * Probe a single IP:port to check if something is listening.
 *
 * Uses `fetch` with `mode: "no-cors"` — the browser opens a TCP connection.
 * If the promise resolves (even with an opaque response), something is there.
 * If it rejects (TypeError = connection refused, AbortError = timeout), nothing is.
 */
async function probePort(ip: string, port: number): Promise<boolean> {
  try {
    await fetch(`http://${ip}:${port}/`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
}

/* ── Phase 1: Zebra Browser Print ────────────────────────────────────────── */

/**
 * Try to detect Zebra Browser Print service running on localhost.
 * Zebra Browser Print is a local agent that exposes a REST API for printer discovery.
 * Commonly installed on mail-center workstations with Zebra label printers.
 */
async function detectZebraBrowserPrint(
  onProgress: ProgressCallback,
): Promise<DiscoveredPrinter[]> {
  const printers: DiscoveredPrinter[] = [];

  onProgress({
    phase: 'Checking for Zebra Browser Print…',
    current: 0,
    total: 1,
    foundCount: 0,
  });

  // Zebra Browser Print runs a local API — try known ports
  const endpoints = [
    { url: 'http://localhost:9100/available', port: 9100 },
    { url: 'http://localhost:9101/available', port: 9101 },
    { url: 'https://localhost:9102/available', port: 9102 },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data: unknown = await res.json();
        const list: Array<{ name?: string; deviceType?: string }> = Array.isArray(data)
          ? data
          : data && typeof data === 'object' && 'printer' in data
            ? [data.printer as { name?: string; deviceType?: string }]
            : [];

        for (const p of list) {
          printers.push({
            name: p.name || p.deviceType || 'Zebra Printer',
            ip: 'localhost',
            port: ep.port,
            driver: 'zpl',
            source: 'zebra-browser-print',
          });
        }
        break; // Found the service, no need to try other ports
      }
    } catch {
      // Service not running on this port — try next
    }
  }

  onProgress({
    phase: 'Checking for Zebra Browser Print…',
    current: 1,
    total: 1,
    foundCount: printers.length,
  });

  return printers;
}

/* ── Phase 2: Network Scan ───────────────────────────────────────────────── */

/**
 * Quick-scan a set of priority IPs across common subnets.
 * Probes ~30 common printer IPs per subnet (static IP conventions, DHCP ranges).
 * Stops scanning further subnets once printers are found.
 */
async function quickScan(
  onProgress: ProgressCallback,
  existingCount: number,
): Promise<DiscoveredPrinter[]> {
  const found: DiscoveredPrinter[] = [];

  for (const subnet of DEFAULT_SUBNETS) {
    const ipsToScan = PRIORITY_OCTETS.map((octet) => `${subnet}.${octet}`);
    const total = ipsToScan.length;
    let completed = 0;

    onProgress({
      phase: `Scanning ${subnet}.x…`,
      current: 0,
      total,
      foundCount: existingCount + found.length,
    });

    // Scan in concurrent batches
    for (let i = 0; i < ipsToScan.length; i += BATCH_SIZE) {
      const batch = ipsToScan.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (ip) => {
          const alive = await probePort(ip, PRINTER_PORT);
          completed++;
          onProgress({
            phase: `Scanning ${subnet}.x…`,
            current: completed,
            total,
            foundCount: existingCount + found.length,
          });
          return { ip, alive };
        }),
      );

      for (const { ip, alive } of results) {
        if (alive) {
          found.push({
            name: `Printer at ${ip}`,
            ip,
            port: PRINTER_PORT,
            driver: 'zpl',
            source: 'network-scan',
          });
        }
      }
    }

    // If we found printers on this subnet, don't scan others
    if (found.length > 0) break;
  }

  return found;
}

/**
 * Full subnet scan — probes all 254 IPs on a specific subnet.
 * Used when the quick scan found nothing and the user specifies their subnet.
 */
export async function scanSubnet(
  subnet: string,
  onProgress: ProgressCallback,
  port: number = PRINTER_PORT,
): Promise<DiscoveredPrinter[]> {
  const found: DiscoveredPrinter[] = [];
  const total = 254;
  let completed = 0;

  for (let i = 1; i <= 254; i += BATCH_SIZE) {
    const batch: Promise<{ ip: string; alive: boolean }>[] = [];

    for (let j = i; j < Math.min(i + BATCH_SIZE, 255); j++) {
      const ip = `${subnet}.${j}`;
      batch.push(
        probePort(ip, port).then((alive) => {
          completed++;
          onProgress({
            phase: `Scanning ${subnet}.x…`,
            current: completed,
            total,
            foundCount: found.length,
          });
          return { ip, alive };
        }),
      );
    }

    const results = await Promise.all(batch);
    for (const { ip, alive } of results) {
      if (alive) {
        found.push({
          name: `Printer at ${ip}`,
          ip,
          port,
          driver: 'zpl',
          source: 'network-scan',
        });
      }
    }
  }

  return found;
}

/* ── Phase 3: Server API Fallback ────────────────────────────────────────── */

/**
 * Fall back to the server-side detection API.
 * Only useful for self-hosted ShipOS deployments where the server has access to
 * local printers via lpstat / CUPS / PowerShell.
 */
async function serverApiDetect(
  onProgress: ProgressCallback,
  existingCount: number,
): Promise<DiscoveredPrinter[]> {
  const found: DiscoveredPrinter[] = [];

  onProgress({
    phase: 'Trying server-side detection…',
    current: 0,
    total: 1,
    foundCount: existingCount,
  });

  try {
    const res = await fetch('/api/settings/printer/detect', {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.printers?.length) {
        for (const p of data.printers) {
          // Extract IP from URI (e.g. "socket://192.168.1.50:9100")
          let ip = '';
          let port = PRINTER_PORT;
          const ipMatch = p.uri?.match(
            /(?:socket|ipp|http|https):\/\/([^:/]+)(?::(\d+))?/,
          );
          if (ipMatch) {
            ip = ipMatch[1];
            if (ipMatch[2]) port = parseInt(ipMatch[2], 10);
          }
          found.push({
            name: p.name || 'Unknown Printer',
            ip,
            port,
            driver: p.driver || 'zpl',
            source: 'server-api',
          });
        }
      }
    }
  } catch {
    // Server API not available — expected on Vercel
  }

  onProgress({
    phase: 'Trying server-side detection…',
    current: 1,
    total: 1,
    foundCount: existingCount + found.length,
  });

  return found;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Probe a single printer IP to verify reachability.
 * Used for manual IP entry validation ("is this printer reachable?").
 */
export async function probePrinter(
  ip: string,
  port: number = PRINTER_PORT,
): Promise<boolean> {
  return probePort(ip, port);
}

/**
 * Main discovery entry point.
 *
 * Runs all detection methods in sequence:
 * 1. Zebra Browser Print check (fast, <2s)
 * 2. Quick network scan of common IPs (~5–10s)
 * 3. Server API fallback if nothing found yet
 *
 * Reports progress via the callback so the UI can show a progress bar.
 * Returns deduplicated list of discovered printers.
 */
export async function discoverPrinters(
  onProgress: ProgressCallback,
): Promise<DiscoveredPrinter[]> {
  const allFound: DiscoveredPrinter[] = [];

  // Phase 1: Zebra Browser Print (instant if running)
  const zbpPrinters = await detectZebraBrowserPrint(onProgress);
  allFound.push(...zbpPrinters);

  // Phase 2: Quick scan of common subnet IPs
  const networkPrinters = await quickScan(onProgress, allFound.length);
  allFound.push(...networkPrinters);

  // Phase 3: Server API fallback (only if nothing found yet)
  if (allFound.length === 0) {
    const serverPrinters = await serverApiDetect(onProgress, allFound.length);
    allFound.push(...serverPrinters);
  }

  // Deduplicate by ip:port
  const seen = new Set<string>();
  const unique: DiscoveredPrinter[] = [];
  for (const p of allFound) {
    const key = `${p.ip}:${p.port}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  onProgress({
    phase: unique.length > 0 ? `Found ${unique.length} printer(s)` : 'Scan complete',
    current: 1,
    total: 1,
    foundCount: unique.length,
  });

  return unique;
}
