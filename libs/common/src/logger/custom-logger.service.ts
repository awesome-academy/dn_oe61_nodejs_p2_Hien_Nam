import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    this.write('LOG', message, context);
  }
  error(message: string, trace?: string, context?: string) {
    this.write('ERROR', `${message} ${trace || ''}`, context);
  }
  warn(message: string, context?: string) {
    this.write('WARN', message, context);
  }
  debug(message: string, context?: string) {
    this.write('DEBUG', message, context);
  }
  verbose(message: string, context?: string) {
    this.write('VERBOSE', message, context);
  }
  private write(level: string, message: string, context?: string) {
    console.log(`[${level}] [${context || 'App'}] ${message}`);
  }
}
