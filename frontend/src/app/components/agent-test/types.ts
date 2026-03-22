export type ViewMode = 'chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  status?: 'sending' | 'success' | 'error';
  content_type?: 'plan' | 'report' | 'conversation';
  streaming_logs?: string[];
}

export interface TerminalSession {
  ws: WebSocket | null;
  isConnected: boolean;
  isReady: boolean;
}

export interface UnifiedSessionState {
  ws: WebSocket | null;
  isConnected: boolean;
  isReady: boolean;
  sessionId: string | null;
  executionId: number | null;
  mode: ViewMode;
}

export interface ProcessStatus {
  agent_id: number;
  session_id: string;
  pid: number;
  is_alive: boolean;
  created_at: string;
  last_activity_at: string;
  chat_history_count: number;
  raw_output_size: number;
}
