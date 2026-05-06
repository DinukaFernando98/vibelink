'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Send, CheckCircle, Mail, MessageSquare, ChevronDown } from 'lucide-react';

const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const SUBJECTS = [
  'General Enquiry',
  'Partnership / Business',
  'Report an Issue',
  'Privacy Request',
  'Press / Media',
  'Feature Suggestion',
  'Other',
];

export default function ContactPage() {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API()}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setSent(true);
    } catch {
      setError('Could not reach the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">VibeLink</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <Link href="/terms"   className="hover:text-violet-600 transition-colors">Terms and Conditions</Link>
          <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40 mb-4">
            <MessageSquare className="w-6 h-6 text-violet-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Get in touch</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Have a question, feedback, or partnership enquiry? Fill in the form below and we&apos;ll get back to you as soon as possible.
            You don&apos;t need an account to reach us.
          </p>
        </div>

        {sent ? (
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl p-8 flex flex-col items-center text-center gap-3">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Message sent!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Thanks for reaching out. We&apos;ve received your message and will respond to <strong>{email}</strong> within 2–3 business days.
            </p>
            <button
              onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
              className="mt-2 px-4 py-2 text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-xl transition-colors cursor-pointer"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={label}>Full name <span className="text-red-400">*</span></label>
                <input
                  required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className={inp}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={label}>Email address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inp} pl-9`}
                  />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className={label}>Subject <span className="text-red-400">*</span></label>
              <div className="relative">
                <select
                  required value={subject} onChange={e => setSubject(e.target.value)}
                  className={`${inp} appearance-none pr-9 cursor-pointer`}
                >
                  <option value="">Select a subject…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <label className={label}>
                Message <span className="text-red-400">*</span>
                <span className="ml-auto text-slate-400 font-normal">{message.length}/2000</span>
              </label>
              <textarea
                required value={message} onChange={e => setMessage(e.target.value.slice(0, 2000))}
                placeholder="Tell us how we can help…"
                rows={6}
                className={`${inp} resize-none leading-relaxed`}
              />
              {message.length > 0 && message.trim().length < 10 && (
                <p className="text-xs text-amber-500">Please provide at least 10 characters.</p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || message.trim().length < 10}
              className="h-11 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send message</>}
            </button>

            <p className="text-xs text-slate-400 text-center">
              By submitting this form you agree to our{' '}
              <Link href="/terms" className="text-violet-500 hover:underline">Terms and Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-violet-500 hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        )}

      </main>

      <footer className="border-t border-slate-100 dark:border-slate-800 mt-8 py-8 px-6">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} VibeLink. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-slate-400">
            <Link href="/terms"   className="hover:text-violet-600 transition-colors">Terms and Conditions</Link>
            <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-violet-600 transition-colors">Get in Touch</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const inp   = 'w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors';
const label = 'flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide';
