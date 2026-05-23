'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AnimatePresence, motion,
  useInView, useMotionValue, useScroll, useSpring, useTransform,
} from 'framer-motion';
import {
  MessageSquare, Video, Shield, Zap, LogOut, User,
  Users, Mail, Globe, Lock, Sparkles, ArrowRight,
  Heart, Play, ChevronDown, CheckCircle,
  UserPlus, Flag, Smile,
} from 'lucide-react';
import { PeopleGrid }   from '@/components/ui/PeopleGrid';
import { VCollage }     from '@/components/ui/VCollage';
import { AuthModal }    from '@/components/ui/AuthModal';
import { FriendsDrawer } from '@/components/friends/FriendsDrawer';
import { getSession, clearSession, type UserSession } from '@/lib/auth';

const API = () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function toFlag(code: string) {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

// ── Ease curve shared across all reveals ─────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;

// ── Scroll-triggered reveal ───────────────────────────────────────────────
function Reveal({
  children, className = '', delay = 0,
  y = 40, direction = 'up',
}: {
  children: React.ReactNode; className?: string; delay?: number;
  y?: number; direction?: 'up' | 'left' | 'right';
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: direction === 'up' ? y : 0, x: direction === 'left' ? -y : direction === 'right' ? y : 0 }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Magnetic CTA button ───────────────────────────────────────────────────
function MagneticButton({
  children, onClick, className,
}: { children: React.ReactNode; onClick: () => void; className: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x   = useMotionValue(0);
  const y   = useMotionValue(0);
  const sx  = useSpring(x, { stiffness: 300, damping: 20 });
  const sy  = useSpring(y, { stiffness: 300, damping: 20 });

  const move = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width  / 2) * 0.3);
    y.set((e.clientY - r.top  - r.height / 2) * 0.3);
  };
  const leave = () => { x.set(0); y.set(0); };

  return (
    <motion.button
      ref={ref} style={{ x: sx, y: sy }}
      onMouseMove={move} onMouseLeave={leave}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// ── Animated stat card (owns its own useInView — no hook-in-map) ──────────
function StatCard({ to, suffix, label, delay }: { to: number; suffix: string; label: string; delay: number }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val,  setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const dur = 1800, steps = 55;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + to / steps, to);
      setVal(Math.round(cur));
      if (cur >= to) clearInterval(t);
    }, dur / steps);
    return () => clearInterval(t);
  }, [inView, to]);

  return (
    <Reveal delay={delay} className="text-center">
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.04, borderColor: 'rgba(124,58,237,0.5)' }}
        transition={{ duration: 0.2 }}
        className="bg-white/5 border border-white/10 rounded-3xl px-4 py-8 cursor-default"
      >
        <p className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 text-gradient-warm">
          {val.toLocaleString()}{suffix}
        </p>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      </motion.div>
    </Reveal>
  );
}

// ── Background orbs ───────────────────────────────────────────────────────
function OrbBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-grid opacity-40 dark:opacity-100" />
      <div className="orb-1 absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-400/10 dark:bg-violet-600/20 blur-[120px]" />
      <div className="orb-2 absolute -bottom-60 -right-40 w-[700px] h-[700px] rounded-full bg-purple-400/8 dark:bg-purple-700/15 blur-[140px]" />
      <div className="orb-3 absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-400/6 dark:bg-indigo-600/12 blur-[100px]" />
    </div>
  );
}

// ── Live online badge ─────────────────────────────────────────────────────
function OnlineBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const load = async () => {
      try { const r = await fetch(`${API()}/health`); const d = await r.json(); setCount(d.activeConnections ?? 0); }
      catch { setCount(null); }
    };
    load(); const id = setInterval(load, 10000); return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: EASE }}
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 mb-6"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      {count !== null
        ? <span><strong className="text-slate-900 dark:text-white font-semibold">{count.toLocaleString()}</strong> people online now</span>
        : <span>Live — connecting you now</span>}
    </motion.div>
  );
}

// ── Static data ───────────────────────────────────────────────────────────
const FEATURE_PILLS = [
  { icon: Lock,     label: 'Anonymous by default' },
  { icon: Users,    label: 'Add friends optionally' },
  { icon: Globe,    label: '190+ Countries' },
  { icon: Sparkles, label: 'Free to get started' },
];

const HOW_STEPS = [
  { num: '01', icon: UserPlus, title: 'Create your account',   desc: 'Sign up in seconds. Your identity stays anonymous during chats — share only what you choose.', grad: 'from-violet-500 to-purple-600' },
  { num: '02', icon: Zap,      title: 'Match instantly',        desc: 'Choose text or video chat. Our system connects you with someone worldwide in seconds.',          grad: 'from-blue-500 to-cyan-500' },
  { num: '03', icon: Heart,    title: 'Vibe together',          desc: 'Talk, laugh, explore. If the connection is real, add them as a friend and keep the vibe going.', grad: 'from-pink-500 to-rose-500' },
];

const BENTO = [
  { icon: Shield,       title: 'Anonymous First',   desc: 'Your identity is never revealed. Chat freely, share on your terms.',                      span: 'col-span-1', dark: true  },
  { icon: Video,        title: 'HD Video Calls',    desc: 'WebRTC peer-to-peer — crystal-clear video with zero server recording.',                    span: 'col-span-2', dark: false },
  { icon: MessageSquare,title: 'Text Chat',         desc: 'Instant, real-time messaging. No delays, no queues.',                                       span: 'col-span-1', dark: false },
  { icon: Globe,        title: '190+ Countries',    desc: 'Your next conversation could be from anywhere on Earth.',                                   span: 'col-span-1', dark: false },
  { icon: Users,        title: 'Add as Friends',    desc: 'Found someone special? Add them and keep the conversation going.',                          span: 'col-span-1', dark: true  },
  { icon: Flag,         title: 'Safe & Moderated',  desc: 'One-tap reporting, auto-moderation and a dedicated trust & safety team.',                   span: 'col-span-2', dark: false },
];

const STATS = [
  { to: 2400000, suffix: '+', label: 'Conversations daily' },
  { to: 190,     suffix: '+', label: 'Countries connected'  },
  { to: 97,      suffix: '%', label: 'Users feel safe'      },
];

// ─────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [myCountry,   setMyCountry]   = useState<{ code: string; name: string } | null>(null);
  const [session,     setSession]     = useState<UserSession | null>(null);
  const [authTarget,  setAuthTarget]  = useState<'text' | 'video' | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);

  // Parallax: hero orbs drift upward as user scrolls away
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const orbY        = useTransform(scrollYProgress, [0, 1], ['0%',  '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    setSession(getSession());
    fetch('https://freeipapi.com/api/json').then(r => r.json())
      .then(d => { if (d.countryCode) setMyCountry({ code: d.countryCode, name: d.countryName }); })
      .catch(() => {});
  }, []);

  const handleChat         = (mode: 'text' | 'video') => { if (session) router.push(`/chat?mode=${mode}`); else setAuthTarget(mode); };
  const handleAuthSuccess  = (s: UserSession)          => { setSession(s); setAuthTarget(null); if (authTarget) router.push(`/chat?mode=${authTarget}`); };
  const handleLogout       = ()                        => { clearSession(); setSession(null); };

  // Stagger delays for hero entrance
  const heroItems = [0.15, 0.25, 0.35, 0.45, 0.55];

  return (
    <div className="bg-white dark:bg-[#0a0a1a] relative">

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Parallax layer */}
        <motion.div style={{ y: orbY }} className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <OrbBackground />
          <PeopleGrid />
        </motion.div>

        {/* ── Nav ── */}
        <nav className="relative z-20 flex items-center justify-between px-5 sm:px-8 pt-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-2.5">
            <motion.div whileHover={{ rotate: 15, scale: 1.1 }} transition={{ duration: 0.2 }}
              className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg glow-violet-sm cursor-pointer">
              <Zap className="w-4 h-4 text-white" />
            </motion.div>
            <span className="font-heading text-lg font-bold text-slate-900 dark:text-white tracking-tight">VibeLink</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-2.5">
            {myCountry && !session && (
              <div className="hidden sm:flex items-center gap-1.5 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 select-none backdrop-blur-sm">
                <span>{toFlag(myCountry.code)}</span><span>{myCountry.name}</span>
              </div>
            )}
            <Link href="/contact"
              className="hidden sm:flex items-center gap-1.5 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-white hover:border-violet-300 dark:hover:border-violet-500/50 transition-all duration-200 backdrop-blur-sm">
              <Mail className="w-3.5 h-3.5" />Get in Touch
            </Link>
            {session ? (
              <div className="flex items-center gap-2">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setFriendsOpen(true)}
                  className="flex items-center gap-1.5 bg-white/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 hover:border-violet-300 dark:hover:border-violet-500/50 transition-all cursor-pointer backdrop-blur-sm">
                  <Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Friends</span>
                </motion.button>
                <div className="flex items-center gap-2 bg-white/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full pl-2 pr-3 py-1.5 backdrop-blur-sm">
                  {session.profilePhoto
                    ? <img src={session.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover" />
                    : <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-700 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300" /></div>}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate hidden sm:block">{session.name}</span>
                  {myCountry && <span className="text-xs">{toFlag(myCountry.code)}</span>}
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                    onClick={handleLogout}
                    className="ml-0.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer" aria-label="Log out">
                    <LogOut className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                onClick={() => setAuthTarget('text')}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer shadow-md">
                Sign in
              </motion.button>
            )}
          </motion.div>
        </nav>

        {/* ── Hero content ── */}
        <motion.div style={{ opacity: heroOpacity }}
          className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-20 text-center">
          <div className="hidden lg:flex absolute left-6 xl:left-16 top-1/2 -translate-y-1/2 z-10 opacity-90">
            <VCollage />
          </div>

          <OnlineBadge />

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: heroItems[0], duration: 0.7, ease: EASE }}
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-5 max-w-2xl"
          >
            <span className="text-slate-900 dark:text-white">Meet </span>
            <span className="text-gradient inline-block">Strangers.</span>
            <br />
            <span className="text-slate-900 dark:text-white">Connect </span>
            <span className="text-slate-700 dark:text-white/70">Instantly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: heroItems[1], duration: 0.6, ease: EASE }}
            className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl max-w-md leading-relaxed mb-10"
          >
            Real conversations with real people worldwide.
            Anonymous by default — add friends only when you choose to.
          </motion.p>

          {/* CTA buttons with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: heroItems[2], duration: 0.6, ease: EASE }}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
          >
            <MagneticButton
              onClick={() => handleChat('text')}
              className="group flex-1 flex items-center justify-center gap-2.5 py-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base rounded-2xl transition-colors cursor-pointer shadow-xl glow-violet relative overflow-hidden"
            >
              {/* Shimmer sweep on hover */}
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                whileHover={{ translateX: '200%' }}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              />
              <MessageSquare className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Text Chat</span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 absolute right-4 z-10" />
            </MagneticButton>

            <MagneticButton
              onClick={() => handleChat('video')}
              className="group flex-1 flex items-center justify-center gap-2.5 py-4 bg-slate-900 hover:bg-slate-700 dark:bg-white/5 dark:border dark:border-white/15 dark:hover:border-violet-500/50 text-white font-semibold text-base rounded-2xl transition-all cursor-pointer shadow-md relative overflow-hidden"
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                whileHover={{ translateX: '200%' }}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              />
              <Video className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Video Chat</span>
            </MagneticButton>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: heroItems[3] }}
            className="flex flex-wrap items-center justify-center gap-2.5 mt-8"
          >
            {FEATURE_PILLS.map(({ icon: Icon, label }, i) => (
              <motion.div key={label}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: heroItems[3] + i * 0.07, ease: EASE }}
                whileHover={{ scale: 1.06, y: -2 }}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 rounded-full px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/8 cursor-default"
              >
                <Icon className="w-3.5 h-3.5 text-violet-400" />{label}
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 dark:text-slate-600"
          >
            <span className="text-[10px] uppercase tracking-widest">Scroll to explore</span>
            <div className="bounce-y">
              <ChevronDown className="w-4 h-4" />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════ HOW IT WORKS ═══════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-50 dark:bg-[#0d0d20]" />
        <div className="absolute inset-0 bg-grid opacity-20 dark:opacity-30 pointer-events-none" />
        <div className="orb-3 absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-violet-400/8 dark:bg-violet-600/12 blur-[100px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Start chatting in <span className="text-gradient">3 steps</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              No complicated setup. No long profiles. Just connect with someone new, right now.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {HOW_STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02, boxShadow: '0 24px 48px rgba(124,58,237,0.12)' }}
                  transition={{ duration: 0.25 }}
                  className="relative bg-white dark:bg-white/4 border border-slate-100 dark:border-white/8 rounded-3xl p-7 cursor-default overflow-hidden group"
                >
                  {/* Ghost number */}
                  <div className="absolute top-2 right-3 text-[80px] font-black text-slate-100 dark:text-white/4 leading-none select-none group-hover:text-violet-100/60 dark:group-hover:text-violet-500/10 transition-colors duration-300">
                    {step.num}
                  </div>
                  {/* Gradient shimmer on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, transparent 60%)' }}
                  />
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.grad} flex items-center justify-center mb-5 shadow-lg`}>
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          {/* Lifestyle image */}
          <Reveal delay={0.3} className="mt-16">
            <motion.div
              whileHover={{ scale: 1.01 }} transition={{ duration: 0.4 }}
              className="relative rounded-3xl overflow-hidden h-52 sm:h-64 cursor-default"
            >
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80&auto=format&fit=crop"
                alt="Friends connecting and laughing together"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-700/75 to-transparent flex items-center px-8 sm:px-12">
                <div>
                  <p className="font-heading text-2xl sm:text-3xl font-bold text-white max-w-xs leading-tight">
                    Every great friendship starts with a conversation.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05, x: 4 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setAuthTarget('text')}
                    className="mt-4 flex items-center gap-2 bg-white text-violet-700 font-semibold text-sm px-5 py-2.5 rounded-full cursor-pointer hover:bg-violet-50 transition-colors shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />Start now — it&apos;s free
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════ FEATURES BENTO ═════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-white dark:bg-[#0a0a1a]" />
        <div className="orb-1 absolute -left-20 top-1/3 w-[500px] h-[500px] rounded-full bg-violet-400/6 dark:bg-violet-600/14 blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Built for <span className="text-gradient">real connections</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Every piece of VibeLink is designed so you can focus on the conversation, not the platform.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENTO.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.07} className={item.span}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  transition={{ duration: 0.22 }}
                  className={[
                    'rounded-3xl p-6 h-full min-h-[140px] flex flex-col justify-between border cursor-default transition-shadow hover:shadow-2xl group relative overflow-hidden',
                    item.dark
                      ? 'bg-slate-900 dark:bg-violet-950/30 border-slate-700 dark:border-violet-800/30'
                      : 'bg-white dark:bg-white/4 border-slate-100 dark:border-white/8',
                  ].join(' ')}
                >
                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl"
                    style={{ background: item.dark ? 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.15), transparent 70%)' : 'radial-gradient(circle at 30% 30%, rgba(124,58,237,0.06), transparent 70%)' }}
                  />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.dark ? 'bg-white/10' : 'bg-violet-50 dark:bg-violet-900/30'}`}>
                    <item.icon className={`w-5 h-5 ${item.dark ? 'text-violet-300' : 'text-violet-600 dark:text-violet-400'}`} />
                  </div>
                  <div>
                    <h3 className={`font-heading text-base font-bold mb-1.5 ${item.dark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.title}</h3>
                    <p className={`text-xs leading-relaxed ${item.dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{item.desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[
              { src: 'https://images.unsplash.com/photo-1609921205586-7e8a57516512?w=800&q=80&auto=format&fit=crop', alt: 'Person on video call', caption: 'Video that feels real' },
              { src: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80&auto=format&fit=crop',  alt: 'Global team connecting', caption: 'A world of conversations' },
            ].map((img, i) => (
              <Reveal key={img.caption} delay={i * 0.1}>
                <motion.div
                  whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}
                  className="relative rounded-3xl overflow-hidden h-48 sm:h-56 cursor-default"
                >
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-5">
                    <p className="text-white font-heading font-bold text-lg">{img.caption}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ STATS ══════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950 dark:bg-[#07071a]" />
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="orb-2 absolute right-0 bottom-0 w-[600px] h-[600px] rounded-full bg-violet-700/20 blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">By the numbers</p>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Millions already <span className="text-gradient">vibing</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every day, real people across the world are making genuine connections on VibeLink.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STATS.map((s, i) => (
              <StatCard key={s.label} to={s.to} suffix={s.suffix} label={s.label} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ SAFETY ═════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-slate-50 dark:bg-[#0d0d20]" />
        <div className="absolute inset-0 bg-grid opacity-20 dark:opacity-30 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal direction="left">
              <div>
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3">Safe by design</p>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-5">
                  Your privacy is not<br />an afterthought
                </h2>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                  VibeLink was built with privacy at its core. WebRTC means your video never touches our servers. Your identity stays yours until you choose otherwise.
                </p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { icon: Shield,       text: 'End-to-end encrypted video via WebRTC DTLS-SRTP' },
                    { icon: Lock,         text: 'Anonymous by default — no real name required' },
                    { icon: Flag,         text: 'One-tap reporting with auto-moderation' },
                    { icon: CheckCircle,  text: 'Zero video recording or storage on our servers' },
                  ].map(({ icon: Icon, text }, i) => (
                    <motion.div key={text}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, ease: EASE }}
                      whileHover={{ x: 6 }}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-white/4 transition-all cursor-default"
                    >
                      <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal direction="right" delay={0.15}>
              <div className="relative rounded-3xl overflow-hidden h-80 lg:h-auto lg:aspect-square">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format&fit=crop"
                  alt="Person feeling safe and confident"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Floating badges */}
                <div className="float-badge-up absolute top-5 right-5 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Privacy Protected</p>
                    <p className="text-[10px] text-slate-400">WebRTC peer-to-peer</p>
                  </div>
                </div>
                <div className="float-badge-down absolute bottom-5 left-5 bg-violet-600 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2.5">
                  <Smile className="w-5 h-5 text-white" />
                  <div>
                    <p className="text-xs font-bold text-white">Anonymous &amp; Safe</p>
                    <p className="text-[10px] text-violet-200">No identity revealed</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FINAL CTA ══════════════════════════════ */}
      <section className="relative py-28 sm:py-36 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700" />
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-white/8 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-purple-900/40 blur-[100px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <Reveal>
            <div className="zap-pulse inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/15 backdrop-blur-sm mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-5 leading-[1.08] tracking-tight">
              Ready to find<br />your vibe?
            </h2>
            <p className="text-violet-100 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
              Join thousands of people having real conversations, making real friends, and building real connections every single day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton
                onClick={() => handleChat('text')}
                className="flex items-center gap-2.5 bg-white text-violet-700 font-bold text-base px-8 py-4 rounded-2xl cursor-pointer transition-all shadow-xl hover:shadow-2xl relative overflow-hidden group"
              >
                <motion.span className="absolute inset-0 bg-violet-50 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-2xl" />
                <MessageSquare className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Start Text Chat</span>
              </MagneticButton>
              <MagneticButton
                onClick={() => handleChat('video')}
                className="flex items-center gap-2.5 bg-white/10 border border-white/30 text-white font-bold text-base px-8 py-4 rounded-2xl cursor-pointer transition-all backdrop-blur-sm hover:bg-white/20 hover:border-white/50 relative overflow-hidden"
              >
                <Video className="w-5 h-5" />
                Start Video Chat
              </MagneticButton>
            </div>
            <motion.p
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-violet-200 text-sm flex items-center justify-center gap-2"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              Free to get started · Anonymous by default · No awkward sign-ups
            </motion.p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════ FOOTER ═════════════════════════════════ */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-700 py-5 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} VibeLink. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/contact" className="text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1">
                <Mail className="w-3 h-3" />Get in Touch
              </Link>
              <Link href="/terms"   className="text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Terms and Conditions</Link>
              <Link href="/privacy" className="text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Privacy Policy</Link>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Developed &amp; powered by{' '}
            <a href="https://zerakicreative.com" target="_blank" rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Zeraki Creative
            </a>
          </p>
        </div>
      </footer>

      {/* ── Modals ── */}
      <AnimatePresence>
        {authTarget && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setAuthTarget(null)} />}
      </AnimatePresence>
      <FriendsDrawer isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} />
    </div>
  );
}
