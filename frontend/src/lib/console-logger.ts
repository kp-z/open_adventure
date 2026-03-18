/**
 * Console Logger - 拦截 console 输出并发送到后端
 */

interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  page: string;
  message: string;
  stack?: string;
  context?: {
    userAgent: string;
    sessionId: string;
  };
}

class ConsoleLogger {
  private ws: WebSocket | null = null;
  private buffer: LogEntry[] = [];
  private enabled = false;
  private reconnectTimer: number | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  init() {
    // 拦截 console 方法
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      this.capture('log', args);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.capture('error', args);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.capture('warn', args);
      originalWarn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.capture('info', args);
      originalInfo.apply(console, args);
    };

    // 监听来自测试页面的消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'enable-logging') {
        this.enable();
      } else if (event.data.type === 'disable-logging') {
        this.disable();
      }
    });
  }

  private capture(level: string, args: any[]) {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source: 'main-app',
      page: window.location.pathname,
      message: args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      stack: level === 'error' ? new Error().stack : undefined,
      context: {
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
      },
    };

    this.sendLog(entry);
  }

  private connectWebSocket() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket('ws://localhost:38080/api/logs/stream');

      this.ws.onopen = () => {
        console.info('[ConsoleLogger] WebSocket connected');
        // 发送缓冲的日志
        while (this.buffer.length > 0) {
          const entry = this.buffer.shift();
          if (entry) {
            this.ws?.send(JSON.stringify(entry));
          }
        }
      };

      this.ws.onclose = () => {
        console.info('[ConsoleLogger] WebSocket closed');
        this.ws = null;
        // 5 秒后重连
        if (this.enabled) {
          this.reconnectTimer = window.setTimeout(() => {
            this.connectWebSocket();
          }, 5000);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[ConsoleLogger] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[ConsoleLogger] Failed to connect WebSocket:', error);
    }
  }

  private sendLog(entry: LogEntry) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(entry));
    } else {
      // 缓冲日志，最多保留 100 条
      this.buffer.push(entry);
      if (this.buffer.length > 100) {
        this.buffer.shift();
      }
    }
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.connectWebSocket();
    console.info('[ConsoleLogger] Logging enabled');
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.buffer = [];
    console.info('[ConsoleLogger] Logging disabled');
  }
}

export const consoleLogger = new ConsoleLogger();
