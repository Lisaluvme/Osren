const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes with error handling
try {
  app.use('/api/inventory', require('./routes/inventory'));
  console.log('✅ Inventory routes loaded');
} catch (error) {
  console.error('❌ Error loading inventory routes:', error.message);
}

try {
  app.use('/api/calendar', require('./routes/calendar'));
  console.log('✅ Calendar routes loaded');
} catch (error) {
  console.error('❌ Error loading calendar routes:', error.message);
}

try {
  app.use('/api/drive', require('./routes/drive'));
  console.log('✅ Drive routes loaded');
} catch (error) {
  console.error('❌ Error loading drive routes:', error.message);
}

try {
  app.use('/api/maps', require('./routes/maps'));
  console.log('✅ Maps routes loaded');
} catch (error) {
  console.error('❌ Error loading maps routes:', error.message);
}

try {
  app.use('/api/payment', require('./routes/payment'));
  console.log('✅ Payment routes loaded');
} catch (error) {
  console.error('❌ Error loading payment routes:', error.message);
}

try {
  app.use('/api/auth', require('./routes/authRoutes'));
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  app.use('/api/oauth', require('./routes/oauth'));
  console.log('✅ OAuth routes loaded');
} catch (error) {
  console.error('❌ Error loading OAuth routes:', error.message);
}

try {
  app.use('/api/documents', require('./routes/documentRoutes'));
  console.log('✅ Document routes loaded');
} catch (error) {
  console.error('❌ Error loading document routes:', error.message);
}

try {
  app.use('/api/notifications', require('./routes/notificationRoutes'));
  console.log('✅ Notification routes loaded');
} catch (error) {
  console.error('❌ Error loading notification routes:', error.message);
}

try {
  app.use('/api/audit', require('./routes/auditRoutes'));
  console.log('✅ Audit routes loaded');
} catch (error) {
  console.error('❌ Error loading audit routes:', error.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes); // OAuth routes for Google Sheets
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
