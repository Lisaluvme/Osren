const express = require('express');
const router = express.Router();
const googleOAuthService = require('../services/googleOAuthService');

// GET /api/auth/google - Start OAuth flow
router.get('/google', (req, res) => {
  try {
    const { authUrl, state } = googleOAuthService.getAuthUrl();
    res.json({ authUrl, state });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// GET /api/auth/google/callback - Handle OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokens = await googleOAuthService.getToken(code);

    // Redirect back to frontend with token in hash
    res.redirect(`http://localhost:3000/#auth=success&token=${tokens.token_key}`);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.redirect(`http://localhost:3000/#auth=error`);
  }
});

// POST /api/auth/verify - Verify token is still valid
router.post('/verify', async (req, res) => {
  try {
    const { token_key } = req.body;

    if (!token_key) {
      return res.status(400).json({ error: 'Token key is required' });
    }

    const isValid = await googleOAuthService.verifyToken(token_key);

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

module.exports = router;
