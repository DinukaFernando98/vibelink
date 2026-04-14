'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Video,
  Shield,
  Zap,
  Globe,
  Users,
  X,
  Plus,
  ChevronRight,
} from 'lucide-react';

const SUGGESTED_INTERESTS = ['gaming', 'music', 'art', 'movies', 'anime', 'sports', 'coding', 'travel'];

export default function LandingPage() {
  const router = useRouter();
  const [interests,      setInterests]      = useState<string[]>([]);
  const [inputValue,     setInputValue]     = useState('');

  function addInterest(tag: string) {
    const t = tag.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (t && !interests.includes(t) && interests.length < 6) {
      setInterests((p) => [...p, t]);
    }
    setInputValue('');
  }

  function removeInterest(tag: string) {
    setInterests((p) => p.filter((i) => i !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && interests.length > 0) {
      setInterests((p) => p.slice(0, -1));
    }
  }

  function startChat(mode: 'text' | 'video') {
    const params = new URLSearchParams({ mode });
    if (interests.length > 0) params.set('interests', interests.join(','));
    router.push(`/chat?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden relative">

      {/* ── Background orbs ───────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-5%]  w-[600px] h-[600px] bg-violet-900/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[500px] h-[500px] bg-cyan-900/15  rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-[40%] left-[30%]  w-[400px] h-[400px] bg-purple-900/10  rounded-full blur-[100px] animate-pulse-slow" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-100" />
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold gradient-text">VibeLink</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-4 text-xs text-slate-500"
        >
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>2,341 online</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Globe className="w-3 h-3" aria-hidden="true" />
            <span>150+ countries</span>
          </div>
        </motion.div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-4">
            <span className="gradient-text">Talk to</span>
            <br />
            <span className="text-white">strangers.</span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-md mx-auto">
            Instant anonymous connections — text or video. No sign-up, no trace.
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="glass-strong rounded-3xl p-7 shadow-2xl shadow-black/60">

            {/* Interest input */}
            <div className="mb-6">
              <label htmlFor="interests-input" className="block text-sm font-medium text-slate-300 mb-2.5">
                Topics you&apos;re into{' '}
                <span className="text-slate-600 font-normal">(optional · match faster)</span>
              </label>

              {/* Tag chips */}
              <AnimatePresence>
                {interests.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1.5 mb-2"
                  >
                    {interests.map((tag) => (
                      <motion.span
                        key={tag}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-violet-500/20 border border-violet-500/30 rounded-full text-xs text-violet-300"
                      >
                        {tag}
                        <button
                          onClick={() => removeInterest(tag)}
                          aria-label={`Remove ${tag}`}
                          className="hover:text-white transition-colors cursor-pointer ml-0.5"
                        >
                          <X className="w-2.5 h-2.5" aria-hidden="true" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="flex gap-2">
                <input
                  id="interests-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="gaming, music, travel…"
                  maxLength={30}
                  disabled={interests.length >= 6}
                  className={[
                    'flex-1 h-10 px-4 text-sm rounded-xl',
                    'bg-white/5 border border-white/10 text-white placeholder-slate-600',
                    'focus:outline-none focus:border-violet-500/50 focus:bg-white/8',
                    'transition-all duration-200',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  ].join(' ')}
                />
                <button
                  onClick={() => addInterest(inputValue)}
                  disabled={!inputValue.trim() || interests.length >= 6}
                  aria-label="Add interest"
                  className={[
                    'h-10 w-10 rounded-xl flex items-center justify-center cursor-pointer',
                    'border border-white/10 text-slate-400 hover:text-white hover:bg-white/8',
                    'transition-all duration-200',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Suggestion pills */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {SUGGESTED_INTERESTS.filter((s) => !interests.includes(s)).slice(0, 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => addInterest(s)}
                    disabled={interests.length >= 6}
                    className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-300 border border-white/5 hover:border-white/15 rounded-full transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Text chat */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => startChat('text')}
                className={[
                  'group relative flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer',
                  'bg-gradient-to-br from-violet-600/15 to-violet-900/15',
                  'border border-violet-500/25 hover:border-violet-400/50',
                  'hover:from-violet-600/25 hover:to-violet-900/25',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60',
                ].join(' ')}
                aria-label="Start text chat"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-violet-400" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white text-sm">Text Chat</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Instant messages</p>
                </div>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500/40 group-hover:text-violet-400/70 transition-colors" aria-hidden="true" />
              </motion.button>

              {/* Video chat */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
                onClick={() => startChat('video')}
                className={[
                  'group relative flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer',
                  'bg-gradient-to-br from-cyan-600/15 to-cyan-900/15',
                  'border border-cyan-500/25 hover:border-cyan-400/50',
                  'hover:from-cyan-600/25 hover:to-cyan-900/25',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60',
                ].join(' ')}
                aria-label="Start video chat"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors flex items-center justify-center">
                  <Video className="w-6 h-6 text-cyan-400" aria-hidden="true" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white text-sm">Video Chat</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Face-to-face</p>
                </div>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-hover:text-cyan-400/70 transition-colors" aria-hidden="true" />
              </motion.button>
            </div>

            {/* Safety notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 flex items-start gap-2 px-3 py-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl"
              role="alert"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500/70 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Never share personal info. Be respectful — abusive users are auto-banned.
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center gap-6 mt-8 text-xs text-slate-600"
        >
          {[
            { icon: Users, text: 'Fully anonymous' },
            { icon: Zap,   text: 'Sub-second matching' },
            { icon: Globe, text: '150+ countries' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-4 text-[11px] text-slate-700">
        By using VibeLink you agree to our{' '}
        <span className="text-slate-500 cursor-pointer hover:text-violet-400 transition-colors">Terms</span>
        {' '}and{' '}
        <span className="text-slate-500 cursor-pointer hover:text-violet-400 transition-colors">Privacy Policy</span>
      </footer>
    </div>
  );
}
