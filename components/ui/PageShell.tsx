import Link from 'next/link';
import { Zap, Mail } from 'lucide-react';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a1a] text-slate-900 dark:text-white relative overflow-hidden">
      {/* Subtle background orbs */}
      <div className="absolute -top-60 -left-60 w-[500px] h-[500px] rounded-full bg-violet-400/6 dark:bg-violet-600/10 blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="absolute -bottom-60 -right-60 w-[500px] h-[500px] rounded-full bg-purple-400/5 dark:bg-purple-700/8 blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid opacity-30 dark:opacity-60 pointer-events-none" aria-hidden="true" />

      {/* Nav */}
      <header className="relative z-10 sticky top-0 bg-white/90 dark:bg-[#0a0a1a]/90 backdrop-blur-md border-b border-slate-100 dark:border-white/6 px-4 sm:px-6 py-3 flex items-center justify-between min-h-[56px]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-bold text-slate-900 dark:text-white text-sm">VibeLink</span>
        </Link>
        <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-500">
          <Link href="/terms"   className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors hidden sm:block">Terms and Conditions</Link>
          <Link href="/privacy" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors hidden sm:block">Privacy Policy</Link>
          <Link href="/contact" className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-white hover:border-violet-300 dark:hover:border-violet-500/50 transition-all">
            <Mail className="w-3 h-3" />
            Get in Touch
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {children}
      </main>

      <footer className="relative z-10 border-t border-slate-100 dark:border-white/6 py-6 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-600">&copy; {new Date().getFullYear()} VibeLink. All rights reserved.</p>
          <div className="flex gap-5 text-xs">
            <Link href="/terms"   className="text-slate-400 dark:text-slate-600 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Terms and Conditions</Link>
            <Link href="/privacy" className="text-slate-400 dark:text-slate-600 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="text-slate-400 dark:text-slate-600 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Get in Touch</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
