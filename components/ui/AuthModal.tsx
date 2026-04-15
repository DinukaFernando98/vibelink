'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import { filterMessage } from '@/lib/profanity';
import { apiRegister, apiLogin, type UserSession } from '@/lib/auth';
import { AnimalPicker } from '@/components/ui/AnimalAvatars';

interface AuthModalProps {
  onSuccess: (session: UserSession) => void;
  onClose: () => void;
}

type Tab = 'signin' | 'signup';

function isOver18(dob: string): boolean {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(SIZE / img.width, SIZE / img.height);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [tab, setTab]           = useState<Tab>('signup');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const fileRef                 = useRef<HTMLInputElement>(null);

  // Sign-up fields
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [dob, setDob]             = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [photo, setPhoto]         = useState<string | null>(null);
  const [ageConsent, setAgeCons]  = useState(false);
  const [terms, setTerms]         = useState(false);

  // Sign-in fields
  const [siEmail, setSiEmail]     = useState('');
  const [siPassword, setSiPass]   = useState('');
  const [showSiPass, setShowSiPass] = useState(false);

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPhoto(await resizeImage(file)); } catch { /* ignore */ }
    // clear any selected animal avatar implicitly — resizeImage result overwrites photo state
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim())  return setError('Name is required.');
    const { flagged } = filterMessage(name);
    if (flagged)       return setError('Name contains inappropriate language.');
    if (!email.trim()) return setError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    if (!dob)          return setError('Date of birth is required.');
    if (!isOver18(dob)) return setError('You must be 18 or older to use VibeLink.');
    if (!password)     return setError('Password is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!ageConsent)   return setError('Please confirm you are 18+.');
    if (!terms)        return setError('Please accept the Terms & Conditions.');

    setLoading(true);
    try {
      const session = await apiRegister({ name: name.trim(), email, dob, password, profilePhoto: photo });
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!siEmail.trim()) return setError('Email is required.');
    if (!siPassword)     return setError('Password is required.');
    setLoading(true);
    try {
      const session = await apiLogin(siEmail.trim(), siPassword);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {tab === 'signup' ? 'Join VibeLink to start chatting.' : 'Sign in with your email.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1 mb-4">
          {(['signup', 'signin'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={[
                'flex-1 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer',
                tab === t
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {t === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-6 mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Forms */}
        <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === 'signup' ? (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSignUp}
                className="flex flex-col gap-3"
              >
                {/* Photo / avatar picker */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-violet-400 transition-colors shrink-0"
                    >
                      {photo
                        ? <img src={photo} alt="preview" className="w-full h-full object-cover" />
                        : <Camera className="w-6 h-6 text-slate-300" />}
                    </button>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Profile photo</p>
                      <p className="text-[11px] text-slate-400">Optional · JPG, PNG</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[11px] text-slate-400">Or choose an avatar</p>
                    <AnimalPicker
                      selected={photo}
                      onSelect={(url) => {
                        setPhoto(url);
                        if (url && fileRef.current) fileRef.current.value = '';
                      }}
                    />
                  </div>
                </div>

                <Field label="Display name *">
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="How you'll appear to others"
                    maxLength={40}
                    className={inputCls}
                  />
                </Field>

                <Field label="Email address *">
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </Field>

                <Field label="Date of birth *">
                  <input
                    type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                    max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
                    className={inputCls}
                  />
                </Field>

                <Field label="Password *">
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={inputCls + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox" checked={ageConsent} onChange={(e) => setAgeCons(e.target.checked)}
                    className="mt-0.5 accent-violet-600"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    I confirm I am <strong>18 years or older</strong>
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 accent-violet-600"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    I accept the <span className="text-violet-600 underline cursor-pointer">Terms &amp; Conditions</span> and <span className="text-violet-600 underline cursor-pointer">Privacy Policy</span>
                  </span>
                </label>

                <SubmitBtn loading={loading} label="Create account & start chatting" />
              </motion.form>
            ) : (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSignIn}
                className="flex flex-col gap-3"
              >
                <Field label="Email address *">
                  <input
                    type="email" value={siEmail} onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="The email you registered with"
                    className={inputCls}
                  />
                </Field>
                <Field label="Password *">
                  <div className="relative">
                    <input
                      type={showSiPass ? 'text' : 'password'}
                      value={siPassword}
                      onChange={(e) => setSiPass(e.target.value)}
                      placeholder="Your password"
                      className={inputCls + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSiPass((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showSiPass ? 'Hide password' : 'Show password'}
                    >
                      {showSiPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <SubmitBtn loading={loading} label="Sign in & start chatting" />
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 h-11 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}
