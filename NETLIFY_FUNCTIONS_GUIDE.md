# Netlify Functions Setup Guide

Your backend has been converted to Netlify Functions! This guide will help you use and deploy them.

## 🚀 What's Changed

### Before (Express Backend)
- Separate backend running on `localhost:5000`
- Frontend connects to `http://localhost:5000/api`
- Needed separate deployment (Render, Railway, etc.)

### After (Netlify Functions)
- Serverless functions run on Netlify
- Frontend connects to `/.netlify/functions` in production
- Single deployment for both frontend and backend
- No separate backend service needed!

## 📁 File Structure

```
netlify/
└── functions/
    ├── netlify-helpers.js    # Helper utilities for all functions
    ├── inventory.js          # Inventory management functions
    ├── orders.js             # Order management functions
    └── health.js             # Health check endpoint
```

## 🔧 How It Works

### Automatic Routing
Netlify automatically routes requests to functions based on the file name:

- `/.netlify/functions/inventory` → `inventory.js`
- `/.netlify/functions/orders` → `orders.js`
- `/.netlify/functions/health` → `health.js`

### Frontend Configuration
The frontend automatically detects the environment:
- **Development (localhost):** Uses `http://localhost:5000/api`
- **Production (Netlify):** Uses `/.netlify/functions`

## 🧪 Testing Locally

### Method 1: Using Netlify Dev (Recommended)

```bash
# Install Netlify CLI globally (if not installed)
npm install -g netlify-cli

# Start Netlify Dev server
npm run netlify

# Or using npx
npx netlify dev
```

This starts both your Vite frontend AND Netlify Functions on the same port.

### Method 2: Using Vite + Functions separately

```bash
# Terminal 1: Start Vite frontend
npm run dev

# Terminal 2: Start Netlify Functions
netlify functions serve
```

### Testing the Functions

Once Netlify Dev is running, you can test the functions:

**Inventory Endpoints:**
```bash
# Get all inventory
curl http://localhost:8888/.netlify/functions/inventory

# Search inventory
curl "http://localhost:8888/.netlify/functions/inventory/search?q=mouse"

# Add item (POST)
curl -X POST http://localhost:8888/.netlify/functions/inventory/add \
  -H "Content-Type: application/json" \
  -d '{"name":"New Item","sku":"TEST-001","quantity":10}'
```

**Orders Endpoints:**
```bash
# Get all orders
curl http://localhost:8888/.netlify/functions/orders

# Create order (POST)
curl -X POST http://localhost:8888/.netlify/functions/orders \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test Client","items":[{"name":"Item","quantity":1}]}'

# Get order stats
curl http://localhost:8888/.netlify/functions/orders/stats
```

**Health Check:**
```bash
curl http://localhost:8888/.netlify/functions/health
```

## 🚢 Deploying to Netlify

### Automatic Deployment (Git-based)

1. **Push your changes to Git**
   ```bash
   git add .
   git commit -m "Convert backend to Netlify Functions"
   git push
   ```

2. **Netlify auto-deploys** from your Git repository

3. **Set environment variables** in Netlify Dashboard:
   - Go to: Site Settings → Environment Variables
   - Add any needed variables (Google Sheets credentials, etc.)

### Manual Deployment

```bash
# Deploy to Netlify
netlify deploy --prod

# Or use the build command
netlify build
```

## 🔐 Environment Variables

Set these in Netlify Dashboard (Site Settings → Environment Variables):

```bash
# For Google Sheets integration (optional)
GOOGLE_CLIENT_EMAIL=your-service-account@...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY..."
GOOGLE_SPREADSHEET_ID=your-sheet-id

# For AI features (optional)
VITE_GEMINI_API_KEY=your-gemini-key
VITE_GROQ_API_KEY=your-groq-key
```

## 🎯 Current Implementation

### ✅ Completed
- **Inventory Functions:** list, add, update, delete, adjust, search
- **Orders Functions:** create, list, get, update, delete, stats
- **Health Check:** API health endpoint
- **Frontend Integration:** Auto-detects environment
- **CORS Handling:** Proper CORS headers configured
- **Error Handling:** Consistent error responses

### 🔄 To Be Added (Optional)
- Calendar functions (`calendar.js`)
- Drive functions (`drive.js`)
- Maps functions (`maps.js`)
- Payment functions (`payment.js`)
- Auth functions (`auth.js`, `oauth.js`)
- Document functions (`documents.js`)
- Notification functions (`notifications.js`)
- Audit functions (`audit.js`)

## 🐛 Troubleshooting

### Functions not found
- Make sure files are in `netlify/functions/` directory
- Check that each file exports `handler` function

### CORS errors
- Check that `handleOptions()` is called in each function
- Verify CORS headers are set correctly

### Environment variables not working
- Set them in Netlify Dashboard, not `.env` file
- For local testing, use `.env` file
- Redeploy after changing environment variables

### Functions timing out
- Netlify Functions have 10-second timeout
- Optimize heavy operations
- Consider using background jobs for long tasks

## 📊 Monitoring

Netlify provides built-in monitoring:

1. **Function Logs:** Netlify Dashboard → Functions
2. **Analytics:** Site Analytics → Function usage
3. **Error Tracking:** Automatically captured in logs

## 🎉 Benefits

1. **Single Deployment:** Frontend + backend together
2. **No Backend Management:** No server to maintain
3. **Auto-scaling:** Handles traffic automatically
4. **Cost Effective:** Free tier includes 125K function calls/month
5. **Fast Performance:** Functions run close to users
6. **Easy Development:** Test locally with `netlify dev`

## 📚 Next Steps

1. **Test locally** using `npm run netlify`
2. **Deploy** to Netlify (push to Git or manual deploy)
3. **Monitor** function performance in Netlify Dashboard
4. **Add more functions** as needed (calendar, auth, etc.)
5. **Optimize** based on usage patterns

---

**Need help?** Check the [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
