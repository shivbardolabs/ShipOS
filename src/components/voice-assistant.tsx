'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  X,
  Check,
  Loader2,
  MessageSquare,
  Volume2,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Web Speech API type shims (not in all TS libs)                            */
/* -------------------------------------------------------------------------- */
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type VoiceState = 'idle' | 'listening' | 'processing' | 'response';

interface VoiceResponse {
  success: boolean;
  mode: 'ai' | 'demo';
  intent: string;
  response: string;
  data?: Record<string, unknown>;
  requiresConfirmation: boolean;
}

/* -------------------------------------------------------------------------- */
/*  VoiceAssistant                                                            */
/* -------------------------------------------------------------------------- */
export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Check Speech API availability ──────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  /* ── Keyboard shortcut: Ctrl+Shift+V ───────────────────────────────── */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /* ── Click-outside to dismiss ──────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    }
    // Delay so the open-click doesn't immediately close
    const timer = setTimeout(
      () => document.addEventListener('mousedown', handleClick),
      100
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── Focus text input when opened in fallback mode ─────────────────── */
  useEffect(() => {
    if (open && !speechSupported) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, speechSupported]);

  /* ── Helpers ────────────────────────────────────────────────────────── */
  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
    setOpen(false);
    setState('idle');
    setTranscript('');
    setResult(null);
    setError(null);
    setTextInput('');
    setConfirmed(false);
  }, []);

  const sendTranscript = useCallback(async (text: string) => {
    setState('processing');
    setError(null);
    try {
      const res = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      const data: VoiceResponse = await res.json();
      if (!res.ok) {
        setError(data.response || 'Something went wrong');
        setState('response');
        return;
      }
      setResult(data);
      setState('response');
    } catch {
      setError('Failed to reach the server. Please try again.');
      setState('response');
    }
  }, []);

  const startListening = useCallback(() => {
    setTranscript('');
    setResult(null);
    setError(null);
    setConfirmed(false);

    if (!speechSupported) {
      setState('listening');
      return;
    }

    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      setState('listening');
      return;
    }

    const recognition = new (SR as new () => SpeechRecognitionInstance)();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      setTranscript(finalText || interim);
    };

    recognition.onend = () => {
      // On natural end, grab the final transcript and send
      setTranscript((prev) => {
        if (prev.trim()) {
          sendTranscript(prev.trim());
        } else {
          setState('idle');
        }
        return prev;
      });
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setState('idle');
      } else if (event.error === 'not-allowed') {
        setSpeechSupported(false);
        setState('listening'); // switch to text input
      } else {
        setError(`Speech error: ${event.error}`);
        setState('response');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('listening');
  }, [speechSupported, sendTranscript]);

  const handleTextSubmit = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTranscript(text);
    setTextInput('');
    sendTranscript(text);
  }, [textInput, sendTranscript]);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    // In a real app, this would trigger the actual action
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */

  // Floating button (always visible)
  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          // Auto-start listening after a brief delay for the panel to render
          setTimeout(() => startListening(), 300);
        }}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'h-12 w-12 rounded-full',
          'bg-gradient-to-r from-violet-600 to-purple-600',
          'flex items-center justify-center',
          'shadow-lg shadow-violet-900/40',
          'hover:shadow-xl hover:shadow-violet-900/50',
          'hover:scale-105 active:scale-95',
          'transition-all duration-200',
          'group'
        )}
        aria-label="Voice assistant"
        title="Voice Assistant (Ctrl+Shift+V)"
      >
        <Mic className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Expanded voice panel ──────────────────────────────────────── */}
      <div
        className={cn(
          'w-80 rounded-2xl overflow-hidden',
          'bg-surface-900 border border-surface-700',
          'shadow-2xl shadow-black/40',
          'animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
              <Volume2 className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100">Voice Assistant</p>
              <p className="text-[10px] text-surface-500">
                {result?.mode === 'demo' ? 'Demo Mode' : result?.mode === 'ai' ? 'AI Mode' : 'Speak or type'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 min-h-[160px] flex flex-col">
          {/* ── Listening state ──────────────────────────────────────── */}
          {state === 'listening' && speechSupported && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              {/* Pulsing mic ring */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
                  <Mic className="h-7 w-7 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-violet-400">Listening…</p>
              {transcript && (
                <p className="text-xs text-surface-300 text-center leading-relaxed max-w-[260px]">
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
              <button
                onClick={() => {
                  if (recognitionRef.current) {
                    try {
                      recognitionRef.current.stop();
                    } catch {
                      // already stopped
                    }
                  }
                }}
                className="mt-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
              >
                Tap to stop
              </button>
            </div>
          )}

          {/* ── Text input fallback (no speech API or denied) ────────── */}
          {state === 'listening' && !speechSupported && (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-surface-400 mb-1">
                <Keyboard className="h-4 w-4" />
                <p className="text-xs">Speech not available — type your command</p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  placeholder="e.g. How many packages today?"
                  className={cn(
                    'flex-1 h-9 px-3 rounded-lg text-sm',
                    'bg-surface-800 border border-surface-700',
                    'text-surface-100 placeholder:text-surface-500',
                    'focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500',
                    'transition-colors'
                  )}
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    'bg-gradient-to-r from-violet-600 to-purple-600',
                    'text-white transition-opacity',
                    !textInput.trim() && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 space-y-1">
                <p className="text-[10px] text-surface-600 font-medium uppercase tracking-wider">Try saying</p>
                {[
                  'Check in a FedEx package for PMB 0003',
                  'How many packages today?',
                  'Send reminder to PMB 0005',
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => {
                      setTextInput(ex);
                      setTranscript(ex);
                      sendTranscript(ex);
                    }}
                    className="block w-full text-left text-[11px] text-surface-400 hover:text-violet-400 transition-colors truncate"
                  >
                    &ldquo;{ex}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Processing state ─────────────────────────────────────── */}
          {state === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="relative h-14 w-14 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-violet-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-spin border-t-violet-500" />
              </div>
              <p className="text-sm font-medium text-violet-400">Thinking…</p>
              {transcript && (
                <p className="text-xs text-surface-500 text-center">
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* ── Response state ───────────────────────────────────────── */}
          {state === 'response' && (
            <div className="flex-1 flex flex-col gap-3">
              {/* Transcript echo */}
              {transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-violet-600/20 border border-violet-500/30">
                    <p className="text-xs text-violet-300">{transcript}</p>
                  </div>
                </div>
              )}

              {/* AI bubble */}
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="h-3 w-3 text-white" />
                </div>
                <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md bg-surface-800 border border-surface-700">
                  {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : (
                    <p className="text-xs text-surface-200 whitespace-pre-line leading-relaxed">
                      {result?.response}
                    </p>
                  )}
                </div>
              </div>

              {/* Confirmation buttons */}
              {result?.requiresConfirmation && !error && !confirmed && (
                <div className="flex gap-2 ml-8">
                  <button
                    onClick={handleConfirm}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                      'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
                      'hover:bg-emerald-600/30 transition-colors'
                    )}
                  >
                    <Check className="h-3 w-3" />
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                      startListening();
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                      'bg-surface-800 text-surface-400 border border-surface-700',
                      'hover:bg-surface-700 transition-colors'
                    )}
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              )}

              {/* Confirmed state */}
              {confirmed && (
                <div className="flex items-center gap-2 ml-8 px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <p className="text-xs text-emerald-400 font-medium">Done!</p>
                </div>
              )}
            </div>
          )}

          {/* ── Idle state (just opened, not yet listening) ──────────── */}
          {state === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="h-14 w-14 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center">
                <Mic className="h-6 w-6 text-surface-400" />
              </div>
              <p className="text-xs text-surface-400">Tap the mic to start</p>
            </div>
          )}
        </div>

        {/* Footer — always show "new command" action when in response state */}
        <div className="px-4 py-3 border-t border-surface-800 flex items-center justify-between">
          {state === 'response' ? (
            <>
              <button
                onClick={startListening}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
                  'hover:opacity-90 transition-opacity'
                )}
              >
                <Mic className="h-3 w-3" />
                New command
              </button>
              {result?.intent && (
                <span className="text-[10px] text-surface-600 font-mono">
                  {result.intent}
                </span>
              )}
            </>
          ) : state === 'idle' ? (
            <button
              onClick={startListening}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-gradient-to-r from-violet-600 to-purple-600 text-white',
                'hover:opacity-90 transition-opacity'
              )}
            >
              {speechSupported ? (
                <>
                  <Mic className="h-3 w-3" />
                  Start listening
                </>
              ) : (
                <>
                  <Keyboard className="h-3 w-3" />
                  Type a command
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-surface-500">
              {state === 'listening' ? (
                <>
                  <MicOff className="h-3 w-3" />
                  <span className="text-[10px]">Press Esc to cancel</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px]">Processing…</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating button (active state) ────────────────────────────── */}
      <button
        onClick={() => {
          if (state === 'listening' && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {
              // already stopped
            }
          } else if (state === 'idle' || state === 'response') {
            startListening();
          }
        }}
        className={cn(
          'h-12 w-12 rounded-full',
          'flex items-center justify-center',
          'shadow-lg transition-all duration-200',
          state === 'listening'
            ? 'bg-red-500 hover:bg-red-400 shadow-red-900/40'
            : 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-900/40 hover:shadow-xl'
        )}
        aria-label={state === 'listening' ? 'Stop listening' : 'Voice assistant'}
      >
        {state === 'listening' ? (
          <MicOff className="h-5 w-5 text-white" />
        ) : state === 'processing' ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Mic className="h-5 w-5 text-white" />
        )}
      </button>
    </div>
  );
}
