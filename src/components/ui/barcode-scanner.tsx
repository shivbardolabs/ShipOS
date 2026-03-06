'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, ScanBarcode, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  BAR-36: Barcode Scanner — Camera-based tracking number scan               */
/*  Uses the BarcodeDetector API (Chrome/Edge/Safari) with a video fallback.  */
/* -------------------------------------------------------------------------- */

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScan, className }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const startingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    startingRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setError(null);
  }, [stopCamera]);

  // Clean up on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const startScanning = useCallback(async () => {
    // Guard: prevent double-clicks while getUserMedia is pending
    if (startingRef.current) return;
    startingRef.current = true;

    setIsOpen(true);
    setError(null);
    setScanning(true);

    // Check for BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setError('Barcode scanning is not supported in this browser. Please use Chrome, Edge, or Safari, or enter the tracking number manually.');
      setScanning(false);
      startingRef.current = false;
      return;
    }

    try {
      // Clean up any leaked stream from a previous attempt
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      // Validate the stream has a live video track
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks.length || videoTracks[0].readyState === 'ended') {
        stream.getTracks().forEach((t) => t.stop());
        setError('Camera returned an empty stream. Close other apps using the camera and try again.');
        setScanning(false);
        return;
      }

      // Listen for track ending unexpectedly
      videoTracks[0].addEventListener('ended', () => {
        setError('Camera stream ended unexpectedly. Try scanning again.');
        setScanning(false);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = 0;
        }
        streamRef.current = null;
      }, { once: true });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      // BAR-11: 'itf' covers ITF-14 (shipping barcodes). Added 'upc_a', 'upc_e' for retail barcodes.
      const detector = new BarcodeDetectorClass({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'itf', 'codabar'],
      });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const value = barcodes[0].rawValue;
            if (value && value.length >= 6) {
              onScan(value);
              handleClose();
              return;
            }
          }
        } catch {
          // Detection frame error — continue scanning
        }
        animFrameRef.current = requestAnimationFrame(scan);
      };

      animFrameRef.current = requestAnimationFrame(scan);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('denied')) {
        setError('Camera access was blocked. Enable camera in your browser settings and reload, or enter the tracking number manually.');
      } else if (msg.includes('NotReadable') || msg.includes('TrackStartError')) {
        setError('Camera is in use by another app. Close it and try again.');
      } else {
        setError(`Camera not available: ${msg}. Enter the tracking number manually.`);
      }
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  }, [onScan, handleClose]);

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<Camera className="h-4 w-4" />}
        onClick={startScanning}
        className={className}
      >
        Scan Barcode
      </Button>
    );
  }

  return (
    <div className={cn('relative rounded-xl border border-surface-700 bg-surface-900 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-800/80">
        <div className="flex items-center gap-2 text-sm text-surface-300">
          <ScanBarcode className="h-4 w-4" />
          <span>Point camera at barcode</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Video feed */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scan line animation */}
        {scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-px bg-gradient-to-r from-transparent via-status-success-400 to-transparent animate-pulse" />
          </div>
        )}

        {/* Loading */}
        {scanning && !error && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin" />
            Scanning…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-surface-900/90">
            <p className="text-sm text-surface-400 text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
