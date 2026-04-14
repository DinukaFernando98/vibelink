'use client';

import { useRef, useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  disabled?: boolean;
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export function ChatInput({ disabled, onSend, onTyping }: ChatInputProps) {
  const [value, setValue]       = useState('');
  const typingRef               = useRef(false);
  const typingTimeoutRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (text: string) => {
    setValue(text);

    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 1500);
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingRef.current = false;
    onTyping(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        maxLength={500}
        placeholder={disabled ? 'Waiting for connection…' : 'Type a message…'}
        aria-label="Chat message"
        className={[
          'flex-1 h-10 px-4 text-sm rounded-xl',
          'bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600',
          'focus:outline-none focus:border-violet-500/50 focus:bg-white/8',
          'transition-all duration-200',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        ].join(' ')}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className={[
          'h-10 w-10 rounded-xl flex items-center justify-center cursor-pointer',
          'bg-violet-600 hover:bg-violet-500 text-white',
          'transition-all duration-200',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60',
        ].join(' ')}
      >
        <Send className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
