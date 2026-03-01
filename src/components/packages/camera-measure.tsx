'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Camera,
  Upload,
  Ruler,
  RotateCcw,
  Loader2,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Edit3,
  Box,
  Maximize2,
} from 'lucide-react';
import type { MeasureDimensionsResult, MeasureDimensionsResponse } from '@/app/api/packages/measure-dimensions/route';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
export interface PackageDimensions {
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  weightLbs: number | null;
  source: 'manual' | 'camera_ai' | null;
}

interface CameraMeasureProps {
  /** Current dimension values */
  dimensions: PackageDimensions;
  /** Callback when dimensions change */
  onChange: (dims: PackageDimensions) => void;
  /** Callback when AI suggests a package type */
  onSuggestPackageType?: (type: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Confidence badge                                                          */
/* -------------------------------------------------------------------------- */
function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : pct >= 60
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        : 'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
      <Sparkles className="h-3 w-3" />
      {pct}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Volume / DIM weight helpers                                               */
/* -------------------------------------------------------------------------- */
function calcCubicInches(l: number | null, w: number | null, h: number | null) {
  if (!l || !w || !h) return null;
  return l * w * h;
}

function calcDimWeight(l: number | null, w: number | null, h: number | null) {
  const cubic = calcCubicInches(l, w, h);
  if (!cubic) return null;
  return Math.ceil(cubic / 139); // Standard DIM factor
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */
export function CameraMeasure({ dimensions, onChange, onSuggestPackageType, disabled }: CameraMeasureProps) {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<MeasureDimensionsResult | null>(null);
  const [responseMode, setResponseMode] = useState<'ai' | 'demo'>('ai');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hasDimensions = dimensions.lengthIn || dimensions.widthIn || dimensions.heightIn;

  /* ── Camera controls ─────────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setCameraReady(false);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // IMPORTANT: Set cameraActive FIRST so the <video> element renders in the DOM.
      // The useEffect below will attach the stream once videoRef becomes available.
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setCameraError('Camera permission denied. Allow camera access in browser settings.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setCameraError('No camera found. Use photo upload instead.');
      } else {
        setCameraError(`Camera not available: ${msg}`);
      }
    }
  }, []);

  // Attach stream to <video> element AFTER it renders in the DOM.
  // Avoids race condition: videoRef.current is null until cameraActive renders <video>.
  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = streamRef.current;

    const handleMetadata = () => {
      video.play().then(() => setCameraReady(true)).catch(() => {
        setCameraError('Could not start video playback.');
      });
    };

    if (video.readyState >= 1) {
      handleMetadata();
    } else {
      video.onloadedmetadata = handleMetadata;
    }

    return () => { video.onloadedmetadata = null; };
  }, [cameraActive]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      setCameraError('Camera still loading. Please wait.');
      return;
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (!dataUrl || dataUrl.length < 1000) {
      setCameraError('Could not capture image. Please try again.');
      return;
    }
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCameraError('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── AI Analysis ─────────────────────────────────────────────────── */
  const analyzeImage = useCallback(async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiResult(null);

    try {
      const resp = await fetch('/api/packages/measure-dimensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage }),
      });

      const data: MeasureDimensionsResponse = await resp.json();

      if (!data.success || !data.result) {
        setAnalysisError(data.error ?? 'Analysis failed');
        return;
      }

      setResponseMode(data.mode);
      setAiResult(data.result);

      // Auto-apply dimensions
      onChange({
        lengthIn: data.result.lengthIn,
        widthIn: data.result.widthIn,
        heightIn: data.result.heightIn,
        weightLbs: data.result.estimatedWeightLbs ?? null,
        source: 'camera_ai',
      });

      // Suggest package type
      if (onSuggestPackageType && data.result.suggestedPackageType) {
        onSuggestPackageType(data.result.suggestedPackageType);
      }
    } catch {
      setAnalysisError('Network error. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedImage, onChange, onSuggestPackageType]);

  /* ── Reset ───────────────────────────────────────────────────────── */
  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    setAiResult(null);
    setAnalysisError(null);
    setIsEditing(false);
    setCameraError(null);
  }, []);

  const closeModal = useCallback(() => {
    stopCamera();
    setShowCameraModal(false);
    // Keep results if we have them
    if (!aiResult) {
      resetCapture();
    }
  }, [stopCamera, aiResult, resetCapture]);

  /* ── Manual dimension change ─────────────────────────────────────── */
  const updateDimension = (field: keyof PackageDimensions, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    onChange({
      ...dimensions,
      [field]: num,
      source: dimensions.source || 'manual',
    });
  };

  const dimWeight = calcDimWeight(dimensions.lengthIn, dimensions.widthIn, dimensions.heightIn);
  const cubicIn = calcCubicInches(dimensions.lengthIn, dimensions.widthIn, dimensions.heightIn);

  return (
    <div className="space-y-4">
      {/* ── Header with Measure Button ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-surface-300">
          Package Dimensions
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetCapture();
            setShowCameraModal(true);
          }}
          disabled={disabled}
          className="gap-1.5 text-xs border-primary-500/30 text-primary-400 hover:bg-primary-500/10"
        >
          <Camera className="h-3.5 w-3.5" />
          📐 Measure with Camera
        </Button>
      </div>

      {/* ── Dimension Input Fields ────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-surface-500 mb-1 block">Length (in)</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="L"
            value={dimensions.lengthIn ?? ''}
            onChange={(e) => updateDimension('lengthIn', e.target.value)}
            disabled={disabled}
            className="text-center"
          />
        </div>
        <div>
          <label className="text-xs text-surface-500 mb-1 block">Width (in)</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="W"
            value={dimensions.widthIn ?? ''}
            onChange={(e) => updateDimension('widthIn', e.target.value)}
            disabled={disabled}
            className="text-center"
          />
        </div>
        <div>
          <label className="text-xs text-surface-500 mb-1 block">Height (in)</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="H"
            value={dimensions.heightIn ?? ''}
            onChange={(e) => updateDimension('heightIn', e.target.value)}
            disabled={disabled}
            className="text-center"
          />
        </div>
      </div>

      {/* ── Weight Field ──────────────────────────────────────── */}
      <div className="max-w-[200px]">
        <label className="text-xs text-surface-500 mb-1 block">Weight (lbs)</label>
        <Input
          type="number"
          step="0.1"
          min="0"
          placeholder="lbs"
          value={dimensions.weightLbs ?? ''}
          onChange={(e) => updateDimension('weightLbs', e.target.value)}
          disabled={disabled}
          className="text-center"
        />
      </div>

      {/* ── Summary badges (shown when dimensions exist) ──────── */}
      {hasDimensions && (
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge variant="muted" className="gap-1 text-xs">
            <Maximize2 className="h-3 w-3" />
            {dimensions.lengthIn} × {dimensions.widthIn} × {dimensions.heightIn} in
          </Badge>
          {cubicIn && (
            <Badge variant="muted" className="gap-1 text-xs">
              <Box className="h-3 w-3" />
              {cubicIn.toLocaleString()} cu in
            </Badge>
          )}
          {dimWeight && (
            <Badge variant="muted" className="gap-1 text-xs">
              <Ruler className="h-3 w-3" />
              DIM: {dimWeight} lbs
            </Badge>
          )}
          {dimensions.source === 'camera_ai' && (
            <Badge variant="muted" className="gap-1 text-xs bg-primary-500/10 text-primary-400 border-primary-500/30">
              <Sparkles className="h-3 w-3" />
              AI measured
            </Badge>
          )}
        </div>
      )}

      {/* ── Camera Modal ──────────────────────────────────────── */}
      <Modal
        open={showCameraModal}
        onClose={closeModal}
        title="📐 Measure Package"
        size="lg"
      >
        <div className="space-y-4">
          {/* Guidance */}
          <div className="p-3 rounded-lg bg-primary-500/5 border border-primary-500/20 text-sm text-surface-300">
            <p className="font-medium text-primary-400 mb-1">Tips for best results:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5 text-surface-400">
              <li>Place package on a flat surface with good lighting</li>
              <li>Capture the full package in frame from an angle (show 3 sides)</li>
              <li>Include a reference object if available (tape measure, ruler, credit card)</li>
              <li>Stand 2-3 feet away from the package</li>
            </ul>
          </div>

          {/* Camera / Image Area */}
          {!capturedImage ? (
            <div className="space-y-3">
              {/* Live Camera Feed */}
              {cameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay guides */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner brackets */}
                    <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-primary-400/60 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-primary-400/60 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-primary-400/60 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-primary-400/60 rounded-br-lg" />
                    {/* Center guide text */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 rounded-full text-xs text-white/80">
                      Position package in frame
                    </div>
                  </div>
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-surface-600 bg-surface-900/50 aspect-[4/3] flex flex-col items-center justify-center gap-4 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-primary-400" />
                  </div>
                  <p className="text-sm text-surface-400 text-center">
                    Take a photo of the package or upload an image
                  </p>
                </div>
              )}

              {cameraError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {cameraError}
                </div>
              )}

              {/* Camera Action Buttons */}
              <div className="flex gap-2">
                {cameraActive ? (
                  <>
                    <Button
                      onClick={capturePhoto}
                      disabled={!cameraReady}
                      className="flex-1 gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={stopCamera}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={startCamera}
                      className="flex-1 gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Open Camera
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* ── Captured Image + Results ──────────────────────── */
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative rounded-xl overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Captured package"
                  className="w-full max-h-[300px] object-contain"
                />
                {/* Dimension overlay when results exist */}
                {aiResult && !isEditing && (
                  <div className="absolute bottom-3 left-3 right-3 flex justify-center">
                    <div className="px-4 py-2 bg-black/80 backdrop-blur-sm rounded-xl border border-primary-500/40 flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-[10px] text-primary-400 font-medium">L</div>
                        <div className="text-lg font-bold text-white">{aiResult.lengthIn}</div>
                        <div className="text-[10px] text-surface-500">in</div>
                      </div>
                      <div className="text-surface-600 text-lg">×</div>
                      <div className="text-center">
                        <div className="text-[10px] text-primary-400 font-medium">W</div>
                        <div className="text-lg font-bold text-white">{aiResult.widthIn}</div>
                        <div className="text-[10px] text-surface-500">in</div>
                      </div>
                      <div className="text-surface-600 text-lg">×</div>
                      <div className="text-center">
                        <div className="text-[10px] text-primary-400 font-medium">H</div>
                        <div className="text-lg font-bold text-white">{aiResult.heightIn}</div>
                        <div className="text-[10px] text-surface-500">in</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyzing state */}
              {isAnalyzing && (
                <div className="flex items-center justify-center gap-3 p-6 rounded-xl bg-surface-900/80 border border-surface-700">
                  <Loader2 className="h-5 w-5 text-primary-400 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-surface-200">Analyzing dimensions…</p>
                    <p className="text-xs text-surface-500">AI is estimating package measurements</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {analysisError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {analysisError}
                </div>
              )}

              {/* Results */}
              {aiResult && (
                <div className="space-y-3">
                  {/* Confidence & mode badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <ConfidenceBadge score={aiResult.confidence} />
                    {responseMode === 'demo' && (
                      <Badge variant="muted" className="text-[10px]">
                        Demo mode
                      </Badge>
                    )}
                    {aiResult.suggestedPackageType && (
                      <Badge variant="muted" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                        Suggested: {aiResult.suggestedPackageType}
                      </Badge>
                    )}
                    {aiResult.estimatedWeightLbs && (
                      <Badge variant="muted" className="text-[10px]">
                        ~{aiResult.estimatedWeightLbs} lbs
                      </Badge>
                    )}
                  </div>

                  {/* AI notes */}
                  {aiResult.notes && (
                    <p className="text-xs text-surface-500 italic">{aiResult.notes}</p>
                  )}

                  {/* Editable dimensions */}
                  {isEditing && (
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-surface-900/60 border border-surface-700">
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">L (in)</label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={dimensions.lengthIn ?? ''}
                          onChange={(e) => updateDimension('lengthIn', e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">W (in)</label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={dimensions.widthIn ?? ''}
                          onChange={(e) => updateDimension('widthIn', e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">H (in)</label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={dimensions.heightIn ?? ''}
                          onChange={(e) => updateDimension('heightIn', e.target.value)}
                          className="text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!aiResult && !isAnalyzing && (
                  <Button onClick={analyzeImage} className="flex-1 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Analyze Dimensions
                  </Button>
                )}
                {aiResult && (
                  <>
                    <Button
                      onClick={() => {
                        setShowCameraModal(false);
                      }}
                      className="flex-1 gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Apply Dimensions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                      className={cn('gap-2', isEditing && 'border-primary-500/30 bg-primary-500/10')}
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? 'Done' : 'Adjust'}
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={resetCapture} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden elements */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </Modal>
    </div>
  );
}
