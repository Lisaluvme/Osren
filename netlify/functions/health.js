// Netlify Function for Health Check
// Simple health check endpoint

const { createSuccessResponse, handleOptions } = require('./netlify-helpers');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    return createSuccessResponse({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      service: 'osren-integrated-ops-manager',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Error in health function:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Health check failed'
      })
    };
  }
};
