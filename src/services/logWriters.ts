/**
 * Abstract interface for log output destinations
 */
export interface LogWriter {
  write(level: string, formattedLog: string): void;
}

/**
 * Console-based log writer for production use
 */
export class ConsoleWriter implements LogWriter {
  write(level: string, formattedLog: string): void {
    switch (level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'debug':
        console.debug(formattedLog);
        break;
      default:
        console.log(formattedLog);
        break;
    }
  }
}

/**
 * In-memory log writer for testing
 */
export class InMemoryWriter implements LogWriter {
  private logs: { level: string; formatted: string }[] = [];

  write(level: string, formattedLog: string): void {
    this.logs.push({ level, formatted: formattedLog });
  }

  getLogs(): { level: string; formatted: string }[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
