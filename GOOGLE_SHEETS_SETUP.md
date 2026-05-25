# Google Sheets Setup Guide

The issue you're experiencing is that your Google Sheets isn't syncing because the app needs **Service Account credentials** (not just OAuth credentials) to write to Google Sheets.

## Quick Fix Steps:

### 1. Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Name it "OSREN Inventory App" and click **Create**

### 2. Generate Service Account Key

1. Click on the service account email you just created
2. Go to **Keys** tab > **Add Key** > **Create New Key**
3. Choose **JSON** format and download
4. **Keep this file secure** - don't commit it to git!

### 3. Configure Your Sheet

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1EzXFasyQxlhhDUCwTbhSc_Zxdm077xNNVvzznw0gwgk/edit
2. Create a tab named "Inventory" with these headers:
   ```
   ID | Name | SKU | Category | Brand | Quantity | MinLevel | UnitCost | SellingPrice | Supplier | LastMovement
   ```
3. Click **Share** and add the service account email (from step 1)
4. Give it **Editor** permissions

### 4. Update Environment Variables

Add these to your `.env` file (from the downloaded JSON):

```env
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1EzXFasyQxlhhDUCwTbhSc_Zxdm077xNNVvzznw0gwgk
```

### 5. Restart Your Backend

```bash
cd backend
npm run dev
```

## Alternative: Use Mock Data Mode

If you want to test without Google Sheets, you can use mock data mode:

```env
USE_MOCK_DATA=true
```

This will use sample data instead of connecting to Google Sheets.

## Current Issues Fixed

✅ **Icon files created** - Fixed manifest icon errors
✅ **Environment template updated** - Better setup instructions  
✅ **Chart sizing** - Will be fixed in next commit
✅ **Tailwind setup** - Needs proper PostCSS configuration (production warning only)

## Test Your Setup

After configuration, test the connection:
```bash
cd backend
node test-connection.js
```