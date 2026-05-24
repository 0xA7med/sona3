type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
  timestamp: string;
  url?: string;
  userId?: string;
}

const MAX_LOG_ENTRIES = 100;
const STORAGE_KEY = 'sona3-error-log';

class ErrorLogger {
  private entries: LogEntry[] = [];
  private userId: string | null = null;

  constructor() {
    this.load();
  }

  setUserId(id: string | null) {
    this.userId = id;
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries.slice(-MAX_LOG_ENTRIES)));
    } catch {
      // ignore (quota exceeded, etc.)
    }
  }

  private add(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 10),
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userId: this.userId || undefined,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    this.entries.push(entry);
    this.save();

    // Always console for dev visibility
    if (level === 'error') {
      console.error(`[${entry.id}] ${message}`, data);
    } else if (level === 'warn') {
      console.warn(`[${entry.id}] ${message}`, data);
    } else {
      console.info(`[${entry.id}] ${message}`, data);
    }
  }

  info(message: string, data?: unknown) {
    this.add('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.add('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.add('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.entries];
  }

  getErrors(): LogEntry[] {
    return this.entries.filter(e => e.level === 'error');
  }

  clear() {
    this.entries = [];
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const logger = new ErrorLogger();
