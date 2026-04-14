'use client';

import { useRef, useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export function ChatInput({ disabled, onSend, onTyping }: ChatInputProps) {
  const [value, setValue]    = useState('');
  const typingRef            = useRef(false);
  const timeoutRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (text: string) => {
    setValue(text);
    if (!typingRef.current) { typingRef.current = true; onTyping(true); }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { typingRef.current = false; onTyping(false); }, 1500);
  };

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    typingRef.current = false;
    onTyping(false);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
        disabled={disabled}
        maxLength={500}
        placeholder={disabled ? 'Waiting for connection…' : 'Type a message…'}
        aria-label="Chat message"
        className="flex-1 h-11 px-4 text-sm rounded-xl
                   bg-slate-100 dark:bg-slate-800
                   border border-slate-200 dark:border-slate-700
                   text-slate-900 dark:text-slate-100
                   placeholder-slate-400 dark:placeholder-slate-500
                   focus:outline-none focus:border-violet-400 dark:focus:border-violet-500
                   focus:bg-white dark:focus:bg-slate-900
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="h-11 w-11 rounded-xl flex items-center justify-center
                   bg-violet-600 hover:bg-violet-500 active:bg-violet-700
                   text-white transition-colors cursor-pointer
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
