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

export interface PartnerCountry {
  code: string;  // ISO 3166-1 alpha-2, e.g. "IN"
  name: string;  // e.g. "India"
}

export interface MatchFoundPayload {
  roomId: string;
  isInitiator: boolean;
  mode: ChatMode;
  partnerInterests: string[];
  partnerCountry?: PartnerCountry;
  partnerUserId?: string | null;
}
