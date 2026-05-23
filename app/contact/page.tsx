'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle, Mail, MessageSquare, ChevronDown } from 'lucide-react';
import { PageShell } from '@/components/ui/PageShell';

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
    <PageShell>
      <div className="max-w-2xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-5">
            <MessageSquare className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">Support</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">Get in Touch</h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md">
            Have a question, feedback, or partnership enquiry? Fill in the form and we&apos;ll get back to you.
            No account needed.
          </p>
        </div>

        {sent ? (
          <div className="glass border border-green-500/20 rounded-2xl p-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white">Message sent!</h2>
            <p className="text-sm text-slate-400 max-w-sm">
              Thanks for reaching out. We&apos;ve received your message and will respond to{' '}
              <strong className="text-white">{email}</strong> within 2–3 business days.
            </p>
            <button
              onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
              className="mt-2 px-5 py-2 text-sm text-violet-400 hover:text-violet-300 glass border border-white/10 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-white/3 border border-slate-100 dark:border-white/8 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
            {/* Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className={lbl}>Full name <span className="text-violet-400">*</span></label>
                <input
                  required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className={inp}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={lbl}>Email address <span className="text-violet-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inp} pl-10`}
                  />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-2">
              <label className={lbl}>Subject <span className="text-violet-400">*</span></label>
              <div className="relative">
                <select
                  required value={subject} onChange={e => setSubject(e.target.value)}
                  className={`${inp} appearance-none pr-10 cursor-pointer`}
                >
                  <option value="">Select a subject…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-2">
              <label className={`${lbl} flex items-center justify-between`}>
                <span>Message <span className="text-violet-400">*</span></span>
                <span className="text-slate-600 font-normal normal-case tracking-normal">{message.length}/2000</span>
              </label>
              <textarea
                required value={message} onChange={e => setMessage(e.target.value.slice(0, 2000))}
                placeholder="Tell us how we can help…"
                rows={6}
                className={`${inp} resize-none leading-relaxed`}
              />
              {message.length > 0 && message.trim().length < 10 && (
                <p className="text-xs text-amber-400">Please provide at least 10 characters.</p>
              )}
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || message.trim().length < 10}
              className="h-12 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg glow-violet"
            >
              {loading
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending…</>
                : <><Send className="w-4 h-4" />Send Message</>}
            </button>

            <p className="text-xs text-slate-600 text-center">
              By submitting you agree to our{' '}
              <Link href="/terms" className="text-violet-500 hover:text-violet-400 underline transition-colors">Terms and Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-violet-500 hover:text-violet-400 underline transition-colors">Privacy Policy</Link>.
            </p>
          </form>
        )}
      </div>
    </PageShell>
  );
}

const inp = 'w-full h-12 px-3.5 text-sm rounded-xl bg-slate-50 dark:bg-white/4 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-white/6 transition-all';
const lbl = 'text-xs font-semibold text-slate-400 uppercase tracking-wide';
