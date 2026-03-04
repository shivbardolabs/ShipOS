/**
 * BAR-386: Label Roll Usage Tracking Hook
 *
 * Client-side hook to track label roll usage per printer.
 * Records prints, resets rolls, and computes low-supply status.
 */

import { useCallback } from 'react';

export interface RollStatus {
  labelsPrinted: number;
  rollCapacity: number;
  lowSupplyThreshold: number;
  remaining: number;
  percentUsed: number;
  isLow: boolean;
  rollLoadedAt: string | null;
}

/**
 * Compute roll status from printer data.
 */
export function computeRollStatus(printer: {
  labelsPrinted?: number;
  rollCapacity?: number;
  lowSupplyThreshold?: number;
  rollLoadedAt?: string | null;
}): RollStatus {
  const labelsPrinted = printer.labelsPrinted ?? 0;
  const rollCapacity = printer.rollCapacity ?? 500;
  const lowSupplyThreshold = printer.lowSupplyThreshold ?? 50;
  const remaining = Math.max(0, rollCapacity - labelsPrinted);
  const percentUsed =
    rollCapacity > 0
      ? Math.min(100, Math.round((labelsPrinted / rollCapacity) * 100))
      : 0;
  const isLow = remaining <= lowSupplyThreshold;

  return {
    labelsPrinted,
    rollCapacity,
    lowSupplyThreshold,
    remaining,
    percentUsed,
    isLow,
    rollLoadedAt: printer.rollLoadedAt ?? null,
  };
}

/**
 * Hook providing label roll tracking actions.
 */
export function useLabelRollTracking() {
  /**
   * Record that labels were printed on a specific printer.
   */
  const recordPrint = useCallback(
    async (printerId: string, count: number = 1) => {
      try {
        const res = await fetch('/api/settings/printer/roll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printerId,
            action: 'increment',
            count,
          }),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    []
  );

  /**
   * Reset the roll counter (new roll loaded).
   */
  const resetRoll = useCallback(async (printerId: string) => {
    try {
      const res = await fetch('/api/settings/printer/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId,
          action: 'reset',
        }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  /**
   * Update roll configuration (capacity and threshold).
   */
  const configureRoll = useCallback(
    async (
      printerId: string,
      rollCapacity?: number,
      lowSupplyThreshold?: number
    ) => {
      try {
        const res = await fetch('/api/settings/printer/roll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printerId,
            action: 'configure',
            rollCapacity,
            lowSupplyThreshold,
          }),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    []
  );

  return { recordPrint, resetRoll, configureRoll };
}
