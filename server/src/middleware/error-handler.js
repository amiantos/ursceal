/**
 * Error Handling Middleware
 */

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {Object|null} [details] - Extra fields merged into the JSON error body,
   *   for cases where the client needs more than a message (e.g. a duplicate
   *   import returning the id of the character it collided with).
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, _next) {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Streaming routes (SSE) commit their headers as soon as the first event is
  // written. Setting a status and JSON body afterwards throws
  // ERR_HTTP_HEADERS_SENT, masking the real error and leaving the client with
  // a truncated stream and no terminal event. Emit an error event instead so
  // the client always sees a terminator, then close.
  if (res.headersSent) {
    if (res.getHeader('Content-Type')?.toString().includes('text/event-stream')) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    }
    res.end();
    return;
  }

  res.status(statusCode).json({
    error: message,
    ...(err.details && typeof err.details === 'object' ? err.details : {}),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// Async handler wrapper to catch promise rejections
export function asyncHandler(fn) {
  return (req, res, next) => {
    // oxlint-disable-next-line promise/no-callback-in-promise -- canonical Express async wrapper
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
