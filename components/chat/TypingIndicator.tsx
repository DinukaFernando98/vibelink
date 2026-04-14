'use client';

import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm">
        <span className="text-xs text-slate-400 dark:text-slate-500">Stranger is typing</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={[
                'w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500',
                i === 0 ? 'animate-dot1' : i === 1 ? 'animate-dot2' : 'animate-dot3',
              ].join(' ')}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
