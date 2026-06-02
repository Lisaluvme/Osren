// Netlify Functions helper utilities
// Common utilities for converting Express routes to Netlify Functions

/**
 * Parse the HTTP event from Netlify Functions format to Express-like request
 * @param {Object} event - Netlify event object
 * @returns {Object} Express-like request object
 */
function parseRequest(event) {
  const { httpMethod, headers, path, queryStringParameters, body } = event;

  return {
    method: httpMethod,
    headers: headers || {},
    path,
    query: queryStringParameters || {},
    body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : null,
    // Express-like params
    params: {}
  };
}

/**
 * Convert a response to Netlify Functions format
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response body
 * @returns {Object} Netlify response object
 */
function createResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

/**
 * Handle OPTIONS requests for CORS
 * @returns {Object} Netlify response for OPTIONS
 */
function handleOptions() {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: ''
  };
}

/**
 * Error response helper
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {Object} Netlify error response
 */
function createErrorResponse(statusCode, message) {
  return createResponse(statusCode, {
    success: false,
    error: message
  });
}

/**
 * Success response helper
 * @param {Object} data - Response data
 * @returns {Object} Netlify success response
 */
function createSuccessResponse(data) {
  return createResponse(200, {
    success: true,
    data
  });
}

/**
 * Route handler based on HTTP method
 * @param {Object} event - Netlify event
 * @param {Object} handlers - Object containing handlers for each HTTP method
 * @returns {Object} Netlify response
 */
async function routeByMethod(event, handlers) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const method = event.httpMethod.toLowerCase();
  const handler = handlers[method];

  if (!handler) {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    return await handler(event);
  } catch (error) {
    console.error('Error in handler:', error);
    return createErrorResponse(500, error.message || 'Internal server error');
  }
}

module.exports = {
  parseRequest,
  createResponse,
  createErrorResponse,
  createSuccessResponse,
  handleOptions,
  routeByMethod
};
