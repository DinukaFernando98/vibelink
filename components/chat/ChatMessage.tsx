'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { filterMessage } from '@/lib/profanity';
import type { Message } from '@/lib/types';

export function ChatMessage({ message }: { message: Message }) {
  const isMe   = message.sender === 'me';
  const time   = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { text, flagged } = filterMessage(message.text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">Stranger</span>
        )}
        <div className={[
          'px-3.5 py-2.5 text-sm leading-relaxed break-words',
          isMe
            ? 'bg-violet-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-sm',
        ].join(' ')}>
          {text}
        </div>

        {/* Warning shown below the bubble when profanity was detected */}
        {flagged && (
          <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="text-[10px] text-amber-500">Inappropriate language filtered</span>
          </div>
        )}

        <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">{time}</span>
      </div>
    </motion.div>
  );
}
