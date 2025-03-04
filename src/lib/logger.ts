// Browser-friendly logger implementation
declare global {
  interface Window {
    Cypress?: unknown;
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  minLevel?: LogLevel;
  maxObjectDepth?: number;
  maxArrayLength?: number;
  redactedKeys?: string[];
}

const DEFAULT_OPTIONS: LoggerOptions = {
  minLevel: 'debug',
  maxObjectDepth: 3,
  maxArrayLength: 50,
  redactedKeys: ['password', 'token', 'secret', 'key']
};

const LOG_COLORS = {
  debug: '#808080', // gray
  info: '#00ff00',  // green
  warn: '#ffa500',  // orange
  error: '#ff0000'  // red
};

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function getLogLevel(): LogLevel {
  // Check if running in Cypress test environment
  if (typeof window !== 'undefined' && (window as any).Cypress) {
    return 'info';
  }
  return window.location.hostname === 'localhost' ? 'info' : 'warn';
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function safeStringify(obj: unknown, options: LoggerOptions, depth = 0): string {
  if (depth > (options.maxObjectDepth || DEFAULT_OPTIONS.maxObjectDepth!)) {
    return '[Max Depth Exceeded]';
  }

  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'string') {
    // Try to parse stringified JSON before returning
    try {
      const parsed = JSON.parse(obj);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return obj;
    }
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj.toString();
  if (obj instanceof Error) {
    const error = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      cause: obj.cause ? safeStringify(obj.cause, options, depth + 1) : undefined
    };
    return JSON.stringify(error, null, 2);
  }
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    const maxLength = options.maxArrayLength || DEFAULT_OPTIONS.maxArrayLength!;
    const items = obj.slice(0, maxLength).map(item => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return item;
    });
    if (obj.length > maxLength) {
      items.push(`... ${obj.length - maxLength} more items`);
    }
    return JSON.stringify(items, null, 2);
  }
  if (typeof obj === 'object') {
    const redactedKeys = options.redactedKeys || DEFAULT_OPTIONS.redactedKeys!;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (redactedKeys.includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    }
    return JSON.stringify(result, null, 2);
  }
  return String(obj);
}

class Logger {
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    const currentLogLevel = getLogLevel();
    return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLogLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = formatTimestamp();
    const metaString = meta ? ` ${safeStringify(meta, this.options)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaString}`;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    const style = `color: ${LOG_COLORS[level]}`;

    switch (level) {
      case 'debug':
        console.debug(`%c${formattedMessage}`, style);
        break;
      case 'info':
        console.info(`%c${formattedMessage}`, style);
        break;
      case 'warn':
        console.warn(`%c${formattedMessage}`, style);
        break;
      case 'error':
        console.error(`%c${formattedMessage}`, style);
        break;
    }
  }

  methodEntry(methodName: string, args?: Record<string, unknown>): void {
    this.debug(`Entering ${methodName}`, args);
  }

  methodExit(methodName: string, result?: unknown): void {
    this.debug(`Exiting ${methodName}`, result ? { result } : undefined);
  }

  error(error: Error | string, context?: string | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.log('error', `Error${context ? ` in ${context}` : ''}: ${error.message}`, {
        name: error.name,
        stack: error.stack,
        cause: error.cause,
        context
      });
    } else {
      // Try to parse if it's a stringified error object
      try {
        const parsedError = JSON.parse(error);
        if (parsedError && typeof parsedError === 'object' && 'name' in parsedError && 'message' in parsedError) {
          this.log('error', `Error${context ? ` in ${context}` : ''}: ${parsedError.message}`, parsedError);
          return;
        }
      } catch {
        // Not a JSON string, continue with normal handling
      }
      this.log('error', error, typeof context === 'object' ? context : { context });
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }
}

// Export a singleton instance with default options
export const logger = new Logger();

// Also export the class for custom instances
export { Logger };