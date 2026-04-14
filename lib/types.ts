export type ChatMode = 'text' | 'video';

export type ConnectionStatus =
  | 'idle'
  | 'searching'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'stranger';
  timestamp: number;
}

export interface QueueOptions {
  mode: ChatMode;
  interests: string[];
}

export interface MatchFoundPayload {
  roomId: string;
  isInitiator: boolean;
  mode: ChatMode;
  partnerInterests: string[];
}
