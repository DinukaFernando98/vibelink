'use client';

import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-3 py-2 self-start"
    >
      <div className="flex items-center gap-1 px-3 py-2 glass rounded-2xl rounded-bl-sm">
        <span className="text-xs text-slate-500 mr-1">Stranger is typing</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={[
                'w-1.5 h-1.5 rounded-full bg-slate-400',
                i === 0 ? 'animate-dot1' : i === 1 ? 'animate-dot2' : 'animate-dot3',
              ].join(' ')}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
