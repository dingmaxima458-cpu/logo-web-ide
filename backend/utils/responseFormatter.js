/**
 * Response Formatter - Standardize API responses
 * Format: { data: T | null, error: { message, code, details } | null }
 */

/**
 * Format success response
 * @param {any} data - Response data
 * @param {number} count - Optional count for arrays
 * @returns {object} Formatted response
 */
export function successResponse(data, count = null) {
  const response = {
    data,
    error: null
  };
  
  if (count !== null && Array.isArray(data)) {
    response.count = count;
  }
  
  return response;
}

/**
 * Format error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {any} details - Optional error details
 * @returns {object} Formatted error response
 */
export function errorResponse(message, code = 'ERROR', details = null) {
  const response = {
    data: null,
    error: {
      message,
      code
    }
  };
  
  if (details !== null) {
    response.error.details = details;
  }
  
  return response;
}

/**
 * Error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Create error handler middleware
 */
export function createErrorHandler() {
  return (err, req, res, next) => {
    console.error('[API Error]', err);
    
    // Handle known errors
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json(errorResponse(err.message, ErrorCodes.NOT_FOUND));
    }
    
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json(errorResponse(err.message, ErrorCodes.VALIDATION_ERROR, err.details));
    }
    
    // Default error
    res.status(500).json(
      errorResponse(
        err.message || 'Internal server error',
        ErrorCodes.INTERNAL_ERROR
      )
    );
  };
}

