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
  /**
   * @description Writes a formatted log entry to the console at the appropriate level
   * @param {string} level - The log level (error, warn, debug, info)
   * @param {string} formattedLog - The JSON-formatted log entry string
   * @returns {void}
   */
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

  /**
   * @description Stores a log entry in memory for later retrieval
   * @param {string} level - The log level
   * @param {string} formattedLog - The JSON-formatted log entry string
   * @returns {void}
   */
  write(level: string, formattedLog: string): void {
    this.logs.push({ level, formatted: formattedLog });
  }

  /**
   * @description Retrieves all stored log entries from memory
   * @returns {{ level: string; formatted: string }[]} An array of all logged entries
   */
  getLogs(): { level: string; formatted: string }[] {
    return [...this.logs];
  }

  /**
   * @description Clears all stored log entries from memory
   * @returns {void}
   */
  clearLogs(): void {
    this.logs = [];
  }
}
