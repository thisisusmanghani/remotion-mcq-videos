# Fix OAuth redirect_uri_mismatch Error

## Problem
n8n's redirect URI is not authorized in your Google Cloud Console.

## Solution

### Step 1: Add n8n Redirect URI to Google Cloud Console

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Select your project** (the one with your OAuth client)
3. Find your OAuth 2.0 Client ID: **422414474597-l8q5dm99uo7j5k857u3h9mrg1iu9q9oq**
4. Click on it to edit
5. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**
6. Add these URIs:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   https://localhost:5678/rest/oauth2-credential/callback
   ```
7. Click **"SAVE"**

### Step 2: Enable Required APIs

Make sure these APIs are enabled:
1. **YouTube Data API v3**
2. **Google Drive API**

Go to: https://console.cloud.google.com/apis/library
- Search for each API
- Click "Enable" if not already enabled

### Step 3: OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Make sure these scopes are added:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
3. Add test user: **pcinfobro@gmail.com**
4. Save

### Step 4: Try n8n Authentication Again

1. Go back to n8n: http://localhost:5678
2. Try connecting credentials again
3. It should work now!

---

## Alternative: Use Python Script Instead

If OAuth is too complicated, I can create a direct Python script that:
- Uses your existing credentials
- Monitors Google Drive
- Uploads to YouTube
- No n8n needed

**Want me to create the Python alternative?**
