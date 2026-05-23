'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Camera, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';

export const REPORT_CATEGORIES = [
  { id: 'nudity',      label: 'Nudity / Sexual content', color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/40    border-red-200 dark:border-red-800/60' },
  { id: 'harassment',  label: 'Harassment / Abuse',      color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60' },
  { id: 'underage',    label: 'Underage user',           color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-950/40   border-rose-200 dark:border-rose-800/60' },
  { id: 'spam',        label: 'Spam / Bot',              color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40  border-amber-200 dark:border-amber-800/60' },
  { id: 'violence',    label: 'Violence / Threats',      color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60' },
  { id: 'other',       label: 'Other',                   color: 'text-slate-500',  bg: 'bg-slate-50 dark:bg-slate-800/60  border-slate-200 dark:border-slate-700' },
] as const;

async function captureFrame(stream: MediaStream | null): Promise<string | null> {
  if (!stream || !stream.getVideoTracks().length) return null;
  return new Promise(resolve => {
    const video   = document.createElement('video');
    const timeout = setTimeout(() => { video.srcObject = null; resolve(null); }, 3000);
    video.onloadeddata = () => {
      clearTimeout(timeout);
      try {
        const W = Math.min(video.videoWidth || 480, 480);
        const H = Math.round(W * (video.videoHeight || 360) / (video.videoWidth || 480));
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.getContext('2d')?.drawImage(video, 0, 0, W, H);
        video.srcObject = null;
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } catch { resolve(null); }
    };
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
  });
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { category: string; description: string; screenshot: string | null; chatLog: string[] }) => void;
  remoteStream: MediaStream | null;
  /** Stranger chat messages (converted to chatLog automatically) */
  messages?: Message[];
  /** Pre-computed chat log strings (used instead of messages when provided) */
  chatLog?: string[];
  loading?: boolean;
}

export function ReportModal({ isOpen, onClose, onSubmit, remoteStream, messages = [], chatLog: chatLogProp, loading }: Props) {
  const [category,    setCategory]    = useState('');
  const [description, setDescription] = useState('');
  const [screenshot,  setScreenshot]  = useState<string | null>(null);
  const [capturing,   setCapturing]   = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const didCapture = useRef(false);

  // Auto-capture screenshot when modal opens
  useEffect(() => {
    if (!isOpen || didCapture.current) return;
    didCapture.current = true;
    setCapturing(true);
    captureFrame(remoteStream).then(frame => {
      setScreenshot(frame);
      setCapturing(false);
    });
  }, [isOpen, remoteStream]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCategory(''); setDescription(''); setScreenshot(null);
        setSubmitted(false); setCapturing(false); didCapture.current = false;
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!category) return;
    const chatLog = chatLogProp ?? messages.slice(-30).map(m => `[${m.sender === 'me' ? 'You' : 'Stranger'}] ${m.text}`);
    onSubmit({ category, description: description.trim(), screenshot, chatLog });
    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-full sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[92dvh] flex flex-col">

              {submitted ? (
                /* ── Success state ────────────────── */
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">Report submitted</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                    Thanks for keeping the community safe. We&apos;re reviewing this report.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors"
                  >
                    Finding next person…
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                        <Flag className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-heading text-sm font-bold text-slate-900 dark:text-white">Report this person</p>
                        <p className="text-[11px] text-slate-400">Your report is anonymous and helps keep VibeLink safe</p>
                      </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

                    {/* Screenshot preview */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        {capturing ? (
                          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        ) : screenshot ? (
                          <img src={screenshot} alt="Screenshot" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {capturing ? 'Capturing evidence…' : screenshot ? 'Screenshot captured' : 'No screenshot'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {messages.length > 0 ? `${Math.min(messages.length, 30)} chat messages included` : 'No chat messages'} · Sent automatically
                        </p>
                      </div>
                    </div>

                    {/* Categories */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2.5">
                        What&apos;s happening? <span className="text-red-400 normal-case font-normal tracking-normal">(required)</span>
                      </p>
                      <div className="flex flex-col gap-2">
                        {REPORT_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-sm font-medium text-left transition-all cursor-pointer ${
                              category === cat.id
                                ? `${cat.bg} ${cat.color} border-current ring-2 ring-current/20`
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${category === cat.id ? 'bg-current' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional description */}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                        Additional details <span className="text-slate-400 normal-case font-normal tracking-normal">(optional)</span>
                      </p>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value.slice(0, 500))}
                        placeholder="Describe what happened…"
                        rows={2}
                        className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Underage warning */}
                    {category === 'underage' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="flex gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 dark:text-red-400">
                          Underage reports are treated as highest priority and reviewed immediately. This person will be removed and investigated.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="shrink-0 px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-2.5">
                    <button
                      onClick={onClose}
                      className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!category || !!loading}
                      className="flex-1 h-11 bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : 'Submit Report'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
