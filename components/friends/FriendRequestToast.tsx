'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X } from 'lucide-react';
import type { IncomingFriendRequest } from '@/hooks/useFriendSocket';

interface Props {
  request: IncomingFriendRequest | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function FriendRequestToast({ request, onAccept, onDecline }: Props) {
  return (
    <AnimatePresence>
      {request && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.22 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-3"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
            {request.from.profilePhoto
              ? <img src={request.from.profilePhoto} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
              : <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4 text-violet-600" />
                </div>}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{request.from.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">wants to add you as a friend</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onAccept}
                className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Accept"
              >
                <Check className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={onDecline}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Decline"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
