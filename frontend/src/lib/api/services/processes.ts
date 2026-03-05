/**
 * API client for Claude Code process management.
 */

import { apiClient } from '../client';

export interface ProcessStatus {
  RUNNING: 'running';
  IDLE: 'idle';
  HIGH_LOAD: 'high_load';
  STOPPED: 'stopped';
}

export interface ClaudeProcessInfo {
  pid: number;
  name: string;
  agent_name?: string;
  working_directory?: string;
  command_line: string;
  start_time: string;
  cpu_percent: number;
  memory_percent: number;
  memory_mb: number;
  status: 'running' | 'idle' | 'high_load' | 'stopped';
  is_managed: boolean;
}

export interface ProcessListResponse {
  processes: ClaudeProcessInfo[];
  total: number;
}

export interface ProcessStopRequest {
  force?: boolean;
}

export interface ProcessStopResponse {
  success: boolean;
  message: string;
}

export interface ProcessUpdateMessage {
  type: 'process_update' | 'error';
  processes?: ClaudeProcessInfo[];
  total?: number;
  new_pids?: number[];
  removed_pids?: number[];
  message?: string;
}

/**
 * Get all running Claude Code processes.
 */
export async function getRunningProcesses(): Promise<ProcessListResponse> {
  const response = await apiClient.get<ProcessListResponse>('/processes/running');
  return response.data;
}

/**
 * Get detailed information about a specific process.
 */
export async function getProcessDetails(pid: number): Promise<ClaudeProcessInfo> {
  const response = await apiClient.get<ClaudeProcessInfo>(`/processes/${pid}`);
  return response.data;
}

/**
 * Stop a Claude Code process.
 */
export async function stopProcess(
  pid: number,
  force: boolean = false
): Promise<ProcessStopResponse> {
  const response = await apiClient.post<ProcessStopResponse>(`/processes/${pid}/stop`, {
    force,
  });
  return response.data;
}

/**
 * Create a WebSocket connection for real-time process updates.
 */
export function createProcessWebSocket(
  onMessage: (data: ProcessUpdateMessage) => void,
  onError?: (error: Event) => void,
  onClose?: () => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/processes/ws`;

  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as ProcessUpdateMessage;
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (onError) {
      onError(error);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
    if (onClose) {
      onClose();
    }
  };

  return ws;
}
