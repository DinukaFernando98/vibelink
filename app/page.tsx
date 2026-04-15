'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Video, Shield, Zap, LogOut, User, Users } from 'lucide-react';
import { PeopleGrid } from '@/components/ui/PeopleGrid';
import { VCollage } from '@/components/ui/VCollage';
import { AuthModal } from '@/components/ui/AuthModal';
import { FriendsDrawer } from '@/components/friends/FriendsDrawer';
import { getSession, clearSession, type UserSession } from '@/lib/auth';

function toFlag(code: string) {
  if (!code || code.length !== 2) return '';
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export default function LandingPage() {
  const router = useRouter();
  const [myCountry, setMyCountry] = useState<{ code: string; name: string } | null>(null);
  const [session, setSession]     = useState<UserSession | null>(null);
  const [authTarget, setAuthTarget] = useState<'text' | 'video' | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);

  useEffect(() => {
    setSession(getSession());
    fetch('https://freeipapi.com/api/json')
      .then((r) => r.json())
      .then((d) => { if (d.countryCode) setMyCountry({ code: d.countryCode, name: d.countryName }); })
      .catch(() => {});
  }, []);

  const handleChat = (mode: 'text' | 'video') => {
    if (session) {
      router.push(`/chat?mode=${mode}`);
    } else {
      setAuthTarget(mode);
    }
  };

  const handleAuthSuccess = (s: UserSession) => {
    setSession(s);
    setAuthTarget(null);
    if (authTarget) router.push(`/chat?mode=${authTarget}`);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">

      <PeopleGrid />

      {/* Top-right: user info / country */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {myCountry && !session && (
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 shadow-sm select-none">
            <span aria-hidden="true">{toFlag(myCountry.code)}</span>
            <span>{myCountry.name}</span>
          </div>
        )}
        {session && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFriendsOpen(true)}
              className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors cursor-pointer shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              Friends
            </button>
            <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full pl-2 pr-3 py-1.5 shadow-sm">
              {session.profilePhoto
                ? <img src={session.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-600" /></div>}
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[100px] truncate">{session.name}</span>
              {myCountry && <span className="text-xs" aria-hidden="true">{toFlag(myCountry.code)}</span>}
              <button
                onClick={handleLogout}
                className="ml-1 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* V collage — left side, lg screens only */}
      <div className="hidden lg:flex absolute left-6 xl:left-12 top-1/2 -translate-y-1/2 z-10">
        <VCollage />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full">

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 mb-3"
        >
          <div className="w-11 h-11 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <Zap className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">VibeLink</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="text-slate-400 dark:text-slate-500 text-base mb-12 text-center"
        >
          Talk to strangers. Stay anonymous.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
        >
          <button
            onClick={() => handleChat('text')}
            className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-base rounded-2xl transition-colors cursor-pointer shadow-md shadow-violet-100 dark:shadow-violet-900/30 min-h-[56px]"
          >
            <MessageSquare className="w-5 h-5" aria-hidden="true" />
            Text Chat
          </button>
          <button
            onClick={() => handleChat('video')}
            className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-slate-900 hover:bg-slate-700 active:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-semibold text-base rounded-2xl transition-colors cursor-pointer shadow-md shadow-slate-100 dark:shadow-slate-800/30 min-h-[56px]"
          >
            <Video className="w-5 h-5" aria-hidden="true" />
            Video Chat
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-10 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600"
        >
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          {session ? 'Chatting as ' + session.name : 'Anonymous unless you add someone as friends'}
        </motion.p>
      </div>

      {/* Auth modal */}
      <AnimatePresence>
        {authTarget && (
          <AuthModal
            onSuccess={handleAuthSuccess}
            onClose={() => setAuthTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Friends drawer */}
      <FriendsDrawer
        isOpen={friendsOpen}
        onClose={() => setFriendsOpen(false)}
      />
    </div>
  );
}
