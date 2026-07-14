/**
 * Logging utility untuk development & production
 * Menghindari console.log di production dan menyediakan format yang konsisten
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';

interface LogContext {
  module?: string;
  action?: string;
  userId?: string | number;
  [key: string]: any;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.info(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatMessage('warn', message, context));
  },

  error(message: string, error?: any, context?: LogContext) {
    // Selalu log error untuk debugging
    console.error(formatMessage('error', message, context));
    
    if (error) {
      console.error('Error details:', error);
    }

    // TODO: Di production, kirim ke error tracking service (Sentry, etc)
    // if (!isDevelopment) {
    //   await fetch('/api/log-error', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ message, error, context, timestamp: new Date().toISOString() })
    //   });
    // }
  }
};

// Error handler wrapper untuk async operations
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: LogContext
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logger.error(errorMessage, error, context);
    return null;
  }
}
