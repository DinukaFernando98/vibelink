'use client';

import { motion } from 'framer-motion';
import type { Message } from '@/lib/types';

export function ChatMessage({ message }: { message: Message }) {
  const isMe = message.sender === 'me';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
          {message.text}
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">{time}</span>
      </div>
    </motion.div>
  );
}
