'use client';

/**
 * BAR-291 — Customer-Facing Signature Box
 * Check-Out Signature Capture
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CarrierLogo } from '@/components/carriers/carrier-logos';
import {
  Eraser,
  Check,
  ArrowLeft,
  Package,
  AlertCircle,
  Timer,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface ParcelInfo {
  id: string;
  trackingNumber: string;
  carrier: string;
}

interface SignatureScreenProps {
  customerName: string;
  parcels: ParcelInfo[];
  onSign: (signatureDataUrl: string) => void;
  onBack: () => void;
  timeoutSeconds?: number;
}

/* -------------------------------------------------------------------------- */
/*  Signature Screen                                                          */
/* -------------------------------------------------------------------------- */
export function SignatureScreen({
  customerName,
  parcels,
  onSign,
  onBack,
  timeoutSeconds = 60,
}: SignatureScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showError, setShowError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [submitted, setSubmitted] = useState(false);

  // Timeout countdown
  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onBack();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onBack, submitted]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasSignature(true);
      setShowError(false);
    },
    [getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getPos]
  );

  const endDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setShowError(false);
  }, []);

  const validateAndSubmit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Simple validation: check if enough pixels have been drawn
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let filledPixels = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) filledPixels++;
    }

    // Reject too-small signatures (less than 0.5% of canvas)
    const minPixels = (canvas.width * canvas.height) * 0.005;
    if (filledPixels < minPixels) {
      setShowError(true);
      return;
    }

    setSubmitted(true);
    onSign(canvas.toDataURL('image/png'));
  }, [onSign]);

  const showIndividualParcels = parcels.length <= 5;

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Sign for Package Release
          </h1>
          <p className="text-surface-400">
            <span className="text-surface-200 font-medium">{customerName}</span>
            {' — '}
            You are picking up{' '}
            <span className="text-white font-bold">{parcels.length}</span>{' '}
            package{parcels.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Parcel List (≤5) or Summary (>5) */}
        {showIndividualParcels ? (
          <div className="space-y-2">
            {parcels.map((parcel) => (
              <div
                key={parcel.id}
                className="flex items-center gap-3 rounded-xl bg-surface-800/50 px-4 py-3 ring-1 ring-surface-700"
              >
                <CarrierLogo carrier={parcel.carrier} size={24} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-surface-200 truncate">
                    {parcel.trackingNumber}
                  </p>
                </div>
                <Package className="h-4 w-4 text-surface-500" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-800/50 px-6 py-4 ring-1 ring-surface-700 text-center">
            <Package className="h-8 w-8 text-primary-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-white">{parcels.length} packages</p>
            <p className="text-xs text-surface-500 mt-1">
              Multiple parcels from various carriers
            </p>
          </div>
        )}

        {/* Signature Canvas — High contrast */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-surface-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Sign below to confirm release
          </p>
          <div className="relative rounded-2xl border-2 border-surface-600 bg-surface-900 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={700}
              height={250}
              className="w-full cursor-crosshair touch-none"
              style={{ height: '200px' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
            {/* Sign-here line */}
            <div className="absolute bottom-10 left-8 right-8 border-b-2 border-dashed border-surface-600" />
            {!hasSignature && (
              <p className="absolute bottom-12 left-1/2 -translate-x-1/2 text-sm text-surface-600 pointer-events-none">
                Sign above the line
              </p>
            )}
          </div>

          {/* Error */}
          {showError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Signature is too small. Please sign again.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl bg-surface-800 px-6 py-4 text-surface-300 font-semibold hover:bg-surface-700 transition-colors min-h-[56px]"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <button
            onClick={clearSignature}
            disabled={!hasSignature}
            className="flex items-center gap-2 rounded-xl bg-surface-800 px-6 py-4 text-surface-300 font-semibold hover:bg-surface-700 transition-colors disabled:opacity-40 min-h-[56px]"
          >
            <Eraser className="h-5 w-5" />
            Clear
          </button>
          <button
            onClick={validateAndSubmit}
            disabled={!hasSignature || submitted}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-lg transition-all min-h-[56px]',
              hasSignature && !submitted
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
                : 'bg-surface-700 text-surface-500 cursor-not-allowed'
            )}
          >
            <Check className="h-6 w-6" />
            Confirm & Sign
          </button>
        </div>

        {/* Timeout indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-surface-600">
          <Timer className="h-3.5 w-3.5" />
          <span>Session expires in {timeLeft}s</span>
          {/* Progress bar */}
          <div className="w-20 h-1 rounded-full bg-surface-800 overflow-hidden">
            <div
              className="h-full bg-surface-600 transition-all duration-1000"
              style={{ width: `${(timeLeft / timeoutSeconds) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
