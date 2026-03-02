export type ViewMode = 'chat' | 'terminal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  status?: 'sending' | 'success' | 'error';
}

export interface TerminalSession {
  ws: WebSocket | null;
  isConnected: boolean;
  isReady: boolean;
}
