import winston from 'winston';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';

/**
 * Creates and configures Winston logger with console and file transports
 * @returns {winston.Logger} Configured logger instance
 */
function createLogger() {
  // Ensure logs directory exists
  const logsDir = 'logs';
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      if (stack) {
        return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
      }
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  );

  // Console format (simpler, no timestamp)
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message }) => {
      return `${level}: ${message}`;
    })
  );

  // Create logger
  const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
        level: 'info'
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logsDir, 'app.log'),
        level: 'debug',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      
      // Separate file for errors
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true
      })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log')
      })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log')
      })
    ]
  });

  return logger;
}

/**
 * Logger instance
 */
const logger = createLogger();

/**
 * Log follow action with progress information
 * @param {string} username - Username that was followed
 * @param {number} current - Current follow count
 * @param {number} total - Total session limit
 * @param {number} pageProgress - Progress on current page
 * @param {number} pageTotal - Total users on current page
 * @param {number} currentPage - Current page number
 */
logger.logFollow = function(username, current, total, pageProgress, pageTotal, currentPage) {
  const message = `✅ Followed ${username} (${current}/${total}) - Page ${currentPage}: ${pageProgress}/${pageTotal}`;
  this.info(message);
};

/**
 * Log skip action
 * @param {string} username - Username that was skipped
 * @param {string} reason - Reason for skipping
 */
logger.logSkip = function(username, reason = 'random') {
  const message = `⏭️  Skipped ${username} (${reason})`;
  this.debug(message);
};

/**
 * Log pause/break
 * @param {number} duration - Duration in milliseconds
 * @param {string} reason - Reason for pause
 */
logger.logPause = function(duration, reason = 'random delay') {
  const seconds = Math.round(duration / 1000);
  const message = `⏸️  Pausing for ${seconds}s (${reason})`;
  this.info(message);
};

/**
 * Log rate limit information
 * @param {number} remaining - Remaining API calls
 * @param {Date} resetTime - When rate limit resets
 */
logger.logRateLimit = function(remaining, resetTime) {
  const message = `📊 Rate limit: ${remaining} calls remaining, resets at ${resetTime.toLocaleTimeString()}`;
  this.debug(message);
};

/**
 * Log session start
 * @param {string} username - Target username
 * @param {string} mode - Mode (followers/following)
 * @param {number} sessionLimit - Session follow limit
 */
logger.logSessionStart = function(username, mode, sessionLimit) {
  const message = `🚀 Starting session: ${username}/${mode} (limit: ${sessionLimit})`;
  this.info(message);
};

/**
 * Log session completion
 * @param {number} totalFollowed - Total users followed
 * @param {number} pagesProcessed - Number of pages processed
 */
logger.logSessionComplete = function(totalFollowed, pagesProcessed) {
  const message = `🎉 Session complete! Followed ${totalFollowed} users across ${pagesProcessed} pages`;
  this.info(message);
};

/**
 * Log page completion
 * @param {number} pageNumber - Page number
 * @param {number} followed - Users followed on this page
 * @param {number} total - Total users on this page
 */
logger.logPageComplete = function(pageNumber, followed, total) {
  const message = `📄 Page ${pageNumber} complete: followed ${followed}/${total} users (${Math.round(followed/total*100)}%)`;
  this.info(message);
};

export default logger;
