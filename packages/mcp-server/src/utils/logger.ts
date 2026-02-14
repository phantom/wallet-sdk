/**
 * Logger utility for MCP server
 *
 * CRITICAL: All logging MUST go to stderr because stdout is reserved for JSON-RPC protocol messages.
 * Using console.log() or process.stdout.write() will break the MCP protocol.
 */

export type LogLevel = "INFO" | "ERROR" | "WARN" | "DEBUG";

export class Logger {
  private context: string;

  constructor(context: string = "MCP") {
    this.context = context;
  }

  /**
   * Private method to write to stderr with proper formatting
   */
  private log(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}\n`;
    process.stderr.write(logMessage);
  }

  /**
   * Log info message
   */
  info(message: string): void {
    this.log("INFO", message);
  }

  /**
   * Log error message
   */
  error(message: string): void {
    this.log("ERROR", message);
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    this.log("WARN", message);
  }

  /**
   * Log debug message (only if DEBUG or PHANTOM_MCP_DEBUG env var is set)
   */
  debug(message: string): void {
    if (process.env.DEBUG || process.env.PHANTOM_MCP_DEBUG) {
      this.log("DEBUG", message);
    }
  }

  /**
   * Create a child logger with combined context
   * Example: parent context "MCP" + child "Transport" = "MCP:Transport"
   */
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`);
  }
}

/**
 * Singleton logger instance for convenience
 */
export const logger = new Logger();
