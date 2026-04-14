'use client';

import { motion } from 'framer-motion';
import type { Message } from '@/lib/types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isMe = message.sender === 'me';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {!isMe && (
          <span className="text-[10px] text-slate-500 px-1">Stranger</span>
        )}
        <div
          className={[
            'px-3.5 py-2.5 text-sm leading-relaxed break-words',
            isMe
              ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-2xl rounded-br-sm shadow-lg shadow-violet-500/20'
              : 'glass text-slate-200 rounded-2xl rounded-bl-sm',
          ].join(' ')}
        >
          {message.text}
        </div>
        <span className="text-[10px] text-slate-600 px-1">{time}</span>
      </div>
    </motion.div>
  );
}
