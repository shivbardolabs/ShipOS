#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== Building v0.25.0 — 5 Bugs + 4 Features ==="

########################################################################
# BUG 1: BAR-257 — Demo page headings invisible on dark theme
########################################################################
echo "[1/9] BAR-257: Fix demo page dark theme headings..."

# Replace text-surface-900 with text-foreground in demo page
sed -i 's/text-surface-900/text-foreground/g' src/app/dashboard/demo/page.tsx
# Replace text-surface-800 with text-foreground in demo page
sed -i 's/text-surface-800/text-foreground/g' src/app/dashboard/demo/page.tsx

echo "  ✓ Demo page heading colors fixed"

########################################################################
# BUG 2: BAR-252 — PostalMate Migration hardcoded carrier/department counts
########################################################################
echo "[2/9] BAR-252: Fix hardcoded carrier/department counts in migration analyze..."

# Replace hardcoded carriers: 52 and departments: 88 with proportional estimates
sed -i 's/carriers: 52,/carriers: Math.round(52 * sizeRatio),/' src/app/api/migration/analyze/route.ts
sed -i 's/departments: 88,/departments: Math.round(88 * sizeRatio),/' src/app/api/migration/analyze/route.ts

echo "  ✓ Carrier/department counts now scale with file size"

echo "  Done with simple fixes. Building complex changes..."
