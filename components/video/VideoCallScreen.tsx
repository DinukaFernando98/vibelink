'use client';

import { useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Columns2, PictureInPicture2, Flag, User,
} from 'lucide-react';
import { VideoPanel } from '@/components/video/VideoPanel';
import { toFlag } from '@/lib/countries';

interface Friend {
  name: string;
  profilePhoto?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
}

interface Props {
  localStream:  MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted:      boolean;
  isCameraOff:  boolean;
  friend:       Friend | null;
  onToggleMute:   () => void;
  onToggleCamera: () => void;
  onEndCall:      () => void;
  onReport?:      () => void;
}

function CtrlBtn({
  onClick, label, active, danger, children,
}: { onClick: () => void; label: string; active?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        'flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl cursor-pointer',
        'min-w-[60px] min-h-[56px] transition-colors duration-150 select-none',
        danger  ? 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 text-red-500 border border-red-100 dark:border-red-900/50'
        : active ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                 : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400',
      ].join(' ')}
    >
      <span className="w-5 h-5 flex items-center justify-center">{children}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

export function VideoCallScreen({
  localStream, remoteStream, isMuted, isCameraOff,
  friend, onToggleMute, onToggleCamera, onEndCall, onReport,
}: Props) {
  const [splitView, setSplitView] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col overflow-hidden">
      {/* ── Video area ─────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Layout toggle — top left (matches chat page) */}
        <button
          onClick={() => setSplitView(v => !v)}
          title={splitView ? 'PIP View' : 'Split View'}
          aria-label={splitView ? 'PIP View' : 'Split View'}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-colors cursor-pointer select-none"
        >
          {splitView
            ? <><PictureInPicture2 className="w-3.5 h-3.5" /><span>PIP View</span></>
            : <><Columns2 className="w-3.5 h-3.5" /><span>Split View</span></>}
        </button>

        {/* Report — top right */}
        {onReport && (
          <button
            onClick={onReport}
            title="Report"
            aria-label="Report this user"
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 hover:bg-red-600/70 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-colors cursor-pointer select-none"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        )}

        {splitView ? (
          /* Split view — same as chat page */
          <div className="absolute inset-0 flex">
            <div className="flex-1 relative border-r border-slate-700/50">
              <VideoPanel
                stream={remoteStream}
                label={friend?.name ?? 'Friend'}
                status={remoteStream ? 'connected' : 'searching'}
                className="absolute inset-0 w-full h-full"
              />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full pointer-events-none select-none">
                {friend?.name ?? 'Friend'}
              </span>
            </div>
            <div className="flex-1 relative">
              <VideoPanel
                stream={localStream}
                muted mirror
                isCameraOff={isCameraOff}
                status="idle"
                className="absolute inset-0 w-full h-full"
              />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full pointer-events-none select-none">
                You
              </span>
            </div>
          </div>
        ) : (
          /* PIP view — same sizing as chat page */
          <>
            <VideoPanel
              stream={remoteStream}
              label={friend?.name ?? 'Friend'}
              status={remoteStream ? 'connected' : 'searching'}
              className="absolute inset-0 w-full h-full"
            />
            {/* Local PIP — identical sizing to chat page */}
            <div className="absolute bottom-2 right-2 z-10
                            w-[30vw] max-w-[160px] aspect-video
                            sm:w-56 sm:max-w-none
                            rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
              <VideoPanel
                stream={localStream}
                muted mirror
                isCameraOff={isCameraOff}
                status="idle"
                className="w-full h-full"
              />
            </div>

            {/* Friend info overlay */}
            {friend && (
              <div className="absolute top-12 left-3 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-1.5">
                {friend.profilePhoto
                  ? <img src={friend.profilePhoto} className="w-6 h-6 rounded-full object-cover" alt="" />
                  : <div className="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center"><User className="w-3 h-3 text-white" /></div>}
                <span className="text-xs font-medium text-white">
                  {friend.name}
                  {friend.countryCode && <span className="ml-1">{toFlag(friend.countryCode)}</span>}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Controls — identical style to chat page ─────────────── */}
      <div className="shrink-0 flex items-center justify-center gap-2.5 px-4 py-3
                      border-t border-slate-100 dark:border-slate-800
                      bg-white dark:bg-slate-950">
        <CtrlBtn onClick={onToggleMute} label={isMuted ? 'Unmute' : 'Mute'} active={isMuted}>
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </CtrlBtn>
        <CtrlBtn onClick={onToggleCamera} label={isCameraOff ? 'Cam on' : 'Cam off'} active={isCameraOff}>
          {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </CtrlBtn>
        <CtrlBtn onClick={onEndCall} label="End" danger>
          <PhoneOff className="w-4 h-4" />
        </CtrlBtn>
      </div>
    </div>
  );
}
