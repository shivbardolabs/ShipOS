/**
 * BAR-331: Recipient Name Parsing Rules
 *
 * Extracts and normalizes recipient names from the Ship To / Deliver To block.
 *
 * Handles:
 * - ATTN: / ATTENTION: prefix stripping
 * - C/O / CARE OF prefix stripping
 * - Business vs personal name detection
 * - Noise stripping (PMB/Suite numbers, address fragments, phone numbers)
 * - Name normalization (Title Case, trim, collapse whitespace)
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface RecipientParseResult {
  /** Cleaned recipient name */
  name: string;
  /** Whether this appears to be a business name */
  isBusiness: boolean;
  /** The raw input before any processing */
  rawInput: string;
  /** What transformations were applied */
  transformations: string[];
}

/* ── Business name indicators ───────────────────────────────────────────── */

const BUSINESS_SUFFIXES = [
  /\b(LLC|L\.L\.C\.?)\b/i,
  /\b(INC\.?|INCORPORATED)\b/i,
  /\b(CORP\.?|CORPORATION)\b/i,
  /\b(CO\.?|COMPANY)\b/i,
  /\b(LTD\.?|LIMITED)\b/i,
  /\b(LP|L\.P\.)\b/i,
  /\b(LLP|L\.L\.P\.)\b/i,
  /\b(PLLC|P\.L\.L\.C\.?)\b/i,
  /\b(PC|P\.C\.)\b/i,
  /\b(DBA|D\/B\/A)\b/i,
  /\b(ASSOC\.?|ASSOCIATES?|ASSOCIATION)\b/i,
  /\b(GROUP|HOLDINGS?|ENTERPRISES?|VENTURES?)\b/i,
  /\b(PARTNERS?|PARTNERSHIP)\b/i,
  /\b(SERVICES?|SOLUTIONS?|SYSTEMS?)\b/i,
  /\b(FOUNDATION|INSTITUTE|AGENCY)\b/i,
  /\b(INTERNATIONAL|GLOBAL|WORLDWIDE)\b/i,
  /\b(STUDIO|STUDIOS)\b/i,
  /\b(DEPT\.?|DEPARTMENT)\b/i,
];

const BUSINESS_PREFIXES = [
  /^THE\s+/i, // Only when combined with business suffixes
];

/* ── Noise patterns to strip ────────────────────────────────────────────── */

const NOISE_PATTERNS: { pattern: RegExp; label: string }[] = [
  // ATTN: / ATTENTION: prefix
  { pattern: /^(ATTN:?\s*|ATTENTION:?\s*)/i, label: 'Stripped ATTN prefix' },

  // C/O / CARE OF prefix
  { pattern: /^(C\/O\s+|CARE\s+OF\s+)/i, label: 'Stripped C/O prefix' },

  // PMB / Suite / Unit / Box / Apt numbers (at end of line)
  { pattern: /\s*(PMB|Suite|STE|Unit|Box|Apt|#)\s*[\-#:]?\s*\d+\s*$/i, label: 'Stripped PMB/Suite/Unit number' },

  // Phone numbers at end
  { pattern: /\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\s*$/i, label: 'Stripped phone number' },

  // "SHIP TO" / "DELIVER TO" label
  { pattern: /^(SHIP\s*TO:?\s*|DELIVER\s*TO:?\s*|TO:?\s*)/i, label: 'Stripped address label prefix' },

  // Email addresses
  { pattern: /\s*\S+@\S+\.\S+\s*$/i, label: 'Stripped email address' },

  // Address fragments that might leak in (number + street pattern)
  { pattern: /\s*\d+\s+[A-Z][A-Za-z]+\s+(ST|AVE|BLVD|RD|DR|LN|CT|PL|WAY|CIR|HWY|PKWY|TERR?)\b.*$/i, label: 'Stripped street address fragment' },

  // City, State ZIP at end
  { pattern: /,?\s+[A-Z]{2}\s+\d{5}(-\d{4})?\s*$/i, label: 'Stripped city/state/zip' },
];

/* ── Main parser ────────────────────────────────────────────────────────── */

/**
 * Parse a raw recipient name/block from a shipping label.
 *
 * The AI vision might return the entire "Ship To" block, so we need to:
 * 1. Strip prefixes (ATTN, C/O, SHIP TO)
 * 2. Remove address fragments, phone numbers, emails
 * 3. Extract just the person or business name
 * 4. Determine if it's a business or personal name
 * 5. Normalize casing
 */
export function parseRecipientName(raw: string | undefined): RecipientParseResult {
  if (!raw || !raw.trim()) {
    return { name: '', isBusiness: false, rawInput: raw || '', transformations: [] };
  }

  const rawInput = raw;
  let name = raw.trim();
  const transformations: string[] = [];

  // If the input contains newlines, take the first meaningful line
  // (usually the name is on the first line of the Ship To block)
  if (name.includes('\n')) {
    const lines = name.split('\n').map((l) => l.trim()).filter(Boolean);
    // Skip lines that look like labels ("SHIP TO:", "DELIVER TO:")
    const meaningfulLine = lines.find(
      (l) => !/^(ship\s*to|deliver\s*to|to):?\s*$/i.test(l)
    );
    if (meaningfulLine) {
      name = meaningfulLine;
      transformations.push('Extracted first meaningful line from multi-line block');
    }
  }

  // Apply noise pattern stripping (iterate to catch nested patterns)
  let prevName = '';
  let iterations = 0;
  while (prevName !== name && iterations < 5) {
    prevName = name;
    iterations++;
    for (const { pattern, label } of NOISE_PATTERNS) {
      const before = name;
      name = name.replace(pattern, '').trim();
      if (name !== before) {
        transformations.push(label);
      }
    }
  }

  // If we have something like "ATTN: John Smith C/O Acme Corp",
  // the ATTN prefix is already stripped, but we might have C/O remaining
  // Try to handle "Name C/O Business" — keep the name part
  const coMatch = name.match(/^(.+?)\s+C\/O\s+(.+)$/i);
  if (coMatch) {
    // Keep the person's name (before C/O), note the business
    name = coMatch[1].trim();
    transformations.push(`Separated from C/O (business: ${coMatch[2].trim()})`);
  }

  // Collapse multiple spaces
  name = name.replace(/\s+/g, ' ').trim();

  // Detect business name
  const isBusiness = detectBusinessName(name);

  // Normalize casing — only if the name is ALL CAPS or all lowercase
  if (name === name.toUpperCase() || name === name.toLowerCase()) {
    name = toTitleCase(name);
    transformations.push('Normalized to Title Case');
  }

  // Final cleanup: remove trailing commas, periods
  name = name.replace(/[,.\s]+$/, '').trim();

  return { name, isBusiness, rawInput, transformations };
}

/* ── Business name detection ────────────────────────────────────────────── */

/**
 * Heuristic: does this name look like a business rather than a person?
 */
function detectBusinessName(name: string): boolean {
  // Check business suffixes
  for (const suffix of BUSINESS_SUFFIXES) {
    if (suffix.test(name)) return true;
  }

  // Names with numbers (e.g. "Store #123") are likely businesses
  if (/\b(store|shop|office|dept)\s*#?\d/i.test(name)) return true;

  // Single word names over 15 chars are likely businesses
  if (!name.includes(' ') && name.length > 15) return true;

  // Names with "THE" prefix + business suffix
  for (const prefix of BUSINESS_PREFIXES) {
    if (prefix.test(name)) {
      // Only count as business if also has a business-like suffix
      for (const suffix of BUSINESS_SUFFIXES) {
        if (suffix.test(name)) return true;
      }
    }
  }

  return false;
}

/* ── Title Case conversion ──────────────────────────────────────────────── */

const LOWERCASE_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of',
  'on', 'or', 'so', 'the', 'to', 'up', 'yet',
]);

const UPPERCASE_WORDS = new Set([
  'llc', 'inc', 'co', 'ltd', 'lp', 'llp', 'pc', 'pllc', 'dba',
  'ii', 'iii', 'iv', 'jr', 'sr',
]);

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) return capitalize(word);

      // Check if it should stay uppercase (acronyms, etc.)
      if (UPPERCASE_WORDS.has(word)) return word.toUpperCase();

      // Keep small words lowercase (unless first)
      if (LOWERCASE_WORDS.has(word)) return word;

      return capitalize(word);
    })
    .join(' ');
}

function capitalize(word: string): string {
  if (!word) return word;
  // Handle hyphenated names (e.g. "Smith-Jones")
  if (word.includes('-')) {
    return word.split('-').map(capitalize).join('-');
  }
  // Handle O'Brien, McDonald, etc.
  if (word.startsWith("mc") && word.length > 2) {
    return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3);
  }
  if (word.startsWith("o'") && word.length > 2) {
    return "O'" + word.charAt(2).toUpperCase() + word.slice(3);
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}
