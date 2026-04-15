'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, Video, Shield, Zap } from 'lucide-react';
import { PeopleGrid } from '@/components/ui/PeopleGrid';
import { VCollage } from '@/components/ui/VCollage';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Faded people grid background — sits behind everything */}
      <PeopleGrid />

      {/* V collage — left side decoration, lg screens only */}
      <div className="hidden lg:flex absolute left-6 xl:left-12 top-1/2 -translate-y-1/2 z-10">
        <VCollage />
      </div>

      {/* All foreground content in a single z-10 container */}
      <div className="relative z-10 flex flex-col items-center w-full">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 mb-3"
        >
          <div className="w-11 h-11 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <Zap className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            VibeLink
          </span>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 dark:text-slate-500 text-base mb-12 text-center"
        >
          Talk to strangers. Stay anonymous.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
        >
          <button
            onClick={() => router.push('/chat?mode=text')}
            className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-base rounded-2xl transition-colors cursor-pointer shadow-md shadow-violet-100 dark:shadow-violet-900/30 min-h-[56px]"
            aria-label="Start text chat"
          >
            <MessageSquare className="w-5 h-5" aria-hidden="true" />
            Text Chat
          </button>

          <button
            onClick={() => router.push('/chat?mode=video')}
            className="flex-1 flex items-center justify-center gap-2.5 py-4 bg-slate-900 hover:bg-slate-700 active:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-semibold text-base rounded-2xl transition-colors cursor-pointer shadow-md shadow-slate-100 dark:shadow-slate-800/30 min-h-[56px]"
            aria-label="Start video chat"
          >
            <Video className="w-5 h-5" aria-hidden="true" />
            Video Chat
          </button>
        </motion.div>

        {/* Safety notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-600"
        >
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          Anonymous · No sign-up · Be respectful
        </motion.p>

      </div>
    </div>
  );
}
