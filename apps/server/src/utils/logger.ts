/**
 * Logger utility for Jarvis Backend
 */

import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  showTimestamp: boolean;
  colorized: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig = {
    level: 'info',
    showTimestamp: true,
    colorized: true,
  };

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private getTimestamp(): string {
    if (!this.config.showTimestamp) return '';
    const now = new Date();
    return `[${now.toLocaleTimeString()}]`;
  }

  private formatMessage(level: string, icon: string, message: string, color: (s: string) => string): string {
    const timestamp = this.getTimestamp();
    const prefix = this.config.colorized
      ? `${chalk.gray(timestamp)} ${color(icon)} ${color(level.toUpperCase())}`
      : `${timestamp} ${icon} ${level.toUpperCase()}`;
    return `${prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    console.log(this.formatMessage('debug', '🔍', message, chalk.gray), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    console.log(this.formatMessage('info', 'ℹ️ ', message, chalk.blue), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    console.warn(this.formatMessage('warn', '⚠️ ', message, chalk.yellow), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    console.error(this.formatMessage('error', '❌', message, chalk.red), ...args);
  }

  success(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    console.log(this.formatMessage('success', '✅', message, chalk.green), ...args);
  }

  // Special formatters for assistant events
  assistant(message: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = this.config.colorized
      ? `${chalk.gray(this.getTimestamp())} ${chalk.cyan('🤖 JARVIS:')} ${chalk.white(message)}`
      : `${this.getTimestamp()} 🤖 JARVIS: ${message}`;
    console.log(formatted);
  }

  user(message: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = this.config.colorized
      ? `${chalk.gray(this.getTimestamp())} ${chalk.magenta('👤 USER:')} ${chalk.white(message)}`
      : `${this.getTimestamp()} 👤 USER: ${message}`;
    console.log(formatted);
  }

  state(state: string): void {
    if (!this.shouldLog('debug')) return;
    const formatted = this.config.colorized
      ? `${chalk.gray(this.getTimestamp())} ${chalk.yellow('📊 STATE:')} ${chalk.cyan(state)}`
      : `${this.getTimestamp()} 📊 STATE: ${state}`;
    console.log(formatted);
  }

  socket(event: string, direction: 'in' | 'out', data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    const arrow = direction === 'in' ? '←' : '→';
    const color = direction === 'in' ? chalk.green : chalk.blue;
    const formatted = this.config.colorized
      ? `${chalk.gray(this.getTimestamp())} ${color(`🔌 ${arrow}`)} ${color(event)}`
      : `${this.getTimestamp()} 🔌 ${arrow} ${event}`;
    console.log(formatted, data ? JSON.stringify(data).slice(0, 100) : '');
  }

  timing(label: string, startTime: number): void {
    if (!this.shouldLog('debug')) return;
    const duration = Date.now() - startTime;
    const formatted = this.config.colorized
      ? `${chalk.gray(this.getTimestamp())} ${chalk.cyan('⏱️  TIMING:')} ${chalk.white(label)} ${chalk.yellow(`${duration}ms`)}`
      : `${this.getTimestamp()} ⏱️  TIMING: ${label} ${duration}ms`;
    console.log(formatted);
  }
}

// Export singleton instance
export const logger = new Logger();

