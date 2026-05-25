/**
 * Request validation middleware
 */

/**
 * Validate required fields in request body
 */
function validateBody(requiredFields) {
  return (req, res, next) => {
    const missingFields = [];

    requiredFields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: missingFields
      });
    }

    next();
  };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email in request body
 */
function validateEmailField(field = 'email') {
  return (req, res, next) => {
    const email = req.body[field];

    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        field
      });
    }

    next();
  };
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validate password in request body
 */
function validatePasswordField(field = 'password') {
  return (req, res, next) => {
    const password = req.body[field];

    if (password && !validatePassword(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number',
        field
      });
    }

    next();
  };
}

/**
 * Validate document status
 */
function validateDocumentStatus(status) {
  const validStatuses = [
    'draft',
    'internal_review',
    'customer_acknowledgement',
    'approved',
    'completed',
    'rejected',
    'cancelled'
  ];

  return validStatuses.includes(status);
}

/**
 * Validate document status in request
 */
function validateStatus(field = 'status') {
  return (req, res, next) => {
    const status = req.body[field];

    if (status && !validateDocumentStatus(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document status',
        field
      });
    }

    next();
  };
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(obj) {
  const sanitized = {};

  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      // Remove HTML tags and escape special characters
      sanitized[key] = obj[key]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeInput(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  });

  return sanitized;
}

/**
 * Sanitize request body
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
}

module.exports = {
  validateBody,
  validateEmailField,
  validatePasswordField,
  validateStatus,
  sanitizeBody,
  validateEmail,
  validatePassword,
  validateDocumentStatus
};
