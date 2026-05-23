'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import { filterMessage } from '@/lib/profanity';
import { apiRegister, apiLogin, saveSession, type UserSession } from '@/lib/auth';
import { AnimalPicker } from '@/components/ui/AnimalAvatars';
import { CountryPicker } from '@/components/ui/CountryPicker';
import { type Country } from '@/lib/countries';

const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

interface AuthModalProps {
  onSuccess: (session: UserSession) => void;
  onClose: () => void;
}

type Tab   = 'signin' | 'signup';
type GStep = 'idle' | 'needs_dob';

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

// ── Google sign-in button ─────────────────────────────────────────────────
function GoogleButton({ onCredential, label }: { onCredential: (c: string) => void; label: string }) {
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const init = useCallback(() => {
    const g = (window as any).google?.accounts?.id;
    if (!g) {
      retryRef.current = setTimeout(init, 600);
      return;
    }
    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res: any) => { if (res.credential) onCredential(res.credential); },
      ux_mode: 'popup',
    });
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    init();
    return () => { if (retryRef.current) clearTimeout(retryRef.current); };
  }, [init]);

  const handleClick = () => {
    const g = (window as any).google?.accounts?.id;
    if (!g) return;
    g.prompt();
  };

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full h-11 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-xl transition-colors cursor-pointer shadow-sm"
    >
      {/* Official Google G icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
      <span className="text-[11px] text-slate-400 uppercase tracking-wider">or</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [tab,     setTab]     = useState<Tab>('signup');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const fileRef               = useRef<HTMLInputElement>(null);

  // Google flow
  const [gStep,     setGStep]    = useState<GStep>('idle');
  const [gTempToken, setGTemp]   = useState('');
  const [gName,     setGName]    = useState('');
  const [gEmail,    setGEmail]   = useState('');
  const [gPicture,  setGPicture] = useState('');
  const [gDob,      setGDob]     = useState('');
  const [gCountry,  setGCountry] = useState<Country | null>(null);

  // Sign-up fields
  const [name,       setName]     = useState('');
  const [email,      setEmail]    = useState('');
  const [dob,        setDob]      = useState('');
  const [password,   setPassword] = useState('');
  const [showPass,   setShowPass] = useState(false);
  const [country,    setCountry]  = useState<Country | null>(null);
  const [photo,      setPhoto]    = useState<string | null>(null);
  const [ageConsent, setAgeCons]  = useState(false);
  const [terms,      setTerms]    = useState(false);

  // Sign-in fields
  const [siEmail,   setSiEmail]   = useState('');
  const [siPassword, setSiPass]   = useState('');
  const [showSiPass, setShowSiPass] = useState(false);

  const handlePhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPhoto(await resizeImage(file)); } catch { /* ignore */ }
  }, []);

  // ── Google credential handler ─────────────────────────────────────────
  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API()}/api/auth/google`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Google sign-in failed.');

      if (data.type === 'login') {
        const session = { ...data.user, sessionToken: data.sessionToken };
        saveSession(session);
        onSuccess(session);
      } else if (data.type === 'needs_dob') {
        // New Google user — ask for DOB only
        setGTemp(data.tempToken);
        setGName(data.name || '');
        setGEmail(data.email || '');
        setGPicture(data.picture || '');
        setGStep('needs_dob');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Google profile completion ─────────────────────────────────────────
  const handleGoogleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!gDob) return setError('Date of birth is required.');
    if (!isOver18(gDob)) return setError('You must be 18 or older to use VibeLink.');
    setLoading(true);
    try {
      const res  = await fetch(`${API()}/api/auth/google/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: gTempToken, dob: gDob, displayName: gName, countryCode: gCountry?.code ?? null, countryName: gCountry?.name ?? null }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to create account.');
      const session = { ...data.user, sessionToken: data.sessionToken };
      saveSession(session);
      onSuccess(session);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Standard sign-up ─────────────────────────────────────────────────
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
      const session = await apiRegister({ name: name.trim(), email, dob, password, profilePhoto: photo, countryCode: country?.code ?? null, countryName: country?.name ?? null });
      onSuccess(session);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  // ── Standard sign-in ─────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!siEmail.trim()) return setError('Email is required.');
    if (!siPassword)     return setError('Password is required.');
    setLoading(true);
    try {
      const session = await apiLogin(siEmail.trim(), siPassword);
      onSuccess(session);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Google profile completion (DOB only) ── */}
        {gStep === 'needs_dob' ? (
          <div className="px-5 pt-6 pb-6">
            <div className="flex items-center gap-3 mb-5">
              {gPicture
                ? <img src={gPicture} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-violet-200 dark:border-violet-800" />
                : <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-lg font-bold text-violet-600">{gName[0]}</div>}
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{gName}</p>
                <p className="text-xs text-slate-500">{gEmail}</p>
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">One last step</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">We need your date of birth to verify you&apos;re 18+.</p>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleGoogleComplete} className="flex flex-col gap-3">
              <Field label="Date of birth *">
                <input type="date" value={gDob} onChange={e => setGDob(e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]}
                  className={inputCls} />
              </Field>
              <Field label="Country (optional)">
                <CountryPicker value={gCountry} onChange={setGCountry} />
              </Field>
              <SubmitBtn loading={loading} label="Complete sign-up" />
              <button type="button" onClick={() => { setGStep('idle'); setError(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-center">
                Cancel
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-6 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {tab === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {tab === 'signup' ? 'Join VibeLink to start chatting.' : 'Sign in to your account.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="px-5 flex gap-1 mb-4">
              {(['signup', 'signin'] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); }}
                  className={['flex-1 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer', tab === t ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'].join(' ')}>
                  {t === 'signup' ? 'Sign Up' : 'Sign In'}
                </button>
              ))}
            </div>

            {/* Google button */}
            <div className="px-5 mb-3">
              <GoogleButton
                label={tab === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
                onCredential={handleGoogleCredential}
              />
              {loading && <div className="flex justify-center mt-2"><Loader2 className="w-4 h-4 animate-spin text-violet-500" /></div>}
            </div>

            {GOOGLE_CLIENT_ID && <Divider />}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mb-3 px-3 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Forms */}
            <div className="px-5 pb-6 max-h-[60dvh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {tab === 'signup' ? (
                  <motion.form key="signup" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }} onSubmit={handleSignUp} className="flex flex-col gap-3">

                    {/* Photo / avatar */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => fileRef.current?.click()}
                          className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-violet-400 transition-colors shrink-0">
                          {photo ? <img src={photo} alt="preview" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-slate-300" />}
                        </button>
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Profile photo <span className="text-slate-400 font-normal">(optional)</span></p>
                          <p className="text-[11px] text-slate-400">JPG, PNG</p>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 mb-1">Or choose an avatar</p>
                        <AnimalPicker selected={photo} onSelect={(url) => { setPhoto(url); if (url && fileRef.current) fileRef.current.value = ''; }} />
                      </div>
                    </div>

                    <Field label="Display name *">
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="How you'll appear to others" maxLength={40} className={inputCls} />
                    </Field>
                    <Field label="Email address *">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                    </Field>
                    <Field label="Date of birth *">
                      <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                        max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]} className={inputCls} />
                    </Field>
                    <Field label="Password *">
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="Min. 8 characters" className={inputCls + ' pr-10'} />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1" aria-label={showPass ? 'Hide' : 'Show'}>
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Country (optional)">
                      <CountryPicker value={country} onChange={setCountry} />
                    </Field>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={ageConsent} onChange={e => setAgeCons(e.target.checked)} className="mt-0.5 accent-violet-600 shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">I confirm I am <strong>18 years or older</strong></span>
                    </label>
                    <div className="flex items-start gap-2.5">
                      <input id="terms-cb" type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="mt-0.5 accent-violet-600 cursor-pointer shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        <label htmlFor="terms-cb" className="cursor-pointer">I accept the </label>
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline hover:text-violet-500" onClick={e => e.stopPropagation()}>Terms &amp; Conditions</a>
                        <label htmlFor="terms-cb" className="cursor-pointer"> and </label>
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline hover:text-violet-500" onClick={e => e.stopPropagation()}>Privacy Policy</a>
                      </span>
                    </div>
                    <SubmitBtn loading={loading} label="Create account" />
                  </motion.form>
                ) : (
                  <motion.form key="signin" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }} onSubmit={handleSignIn} className="flex flex-col gap-3">
                    <Field label="Email address *">
                      <input type="email" value={siEmail} onChange={e => setSiEmail(e.target.value)} placeholder="The email you registered with" className={inputCls} />
                    </Field>
                    <Field label="Password *">
                      <div className="relative">
                        <input type={showSiPass ? 'text' : 'password'} value={siPassword} onChange={e => setSiPass(e.target.value)}
                          placeholder="Your password" className={inputCls + ' pr-10'} />
                        <button type="button" onClick={() => setShowSiPass(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1" aria-label={showSiPass ? 'Hide' : 'Show'}>
                          {showSiPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                    <SubmitBtn loading={loading} label="Sign in" />
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

const inputCls = 'w-full h-11 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="mt-1 h-11 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer">
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}
