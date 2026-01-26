# n8n Credentials Setup Guide

## Open n8n: http://localhost:5678

---

## 1. Google Drive OAuth2 Setup

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **"Google Drive OAuth2 API"**
3. Click on it and fill in:
   - **Client ID**: `422414474597-l8q5dm99uo7j5k857u3h9mrg1iu9q9oq.apps.googleusercontent.com`
   - **Client Secret**: `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`
4. Click **"Connect my account"** → Sign in with your Google account
5. Grant permissions
6. Save as **"Google Drive Account"**

---

## 2. YouTube OAuth2 Setup

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **"YouTube OAuth2 API"**
3. Click on it and fill in:
   - **Client ID**: `422414474597-l8q5dm99uo7j5k857u3h9mrg1iu9q9oq.apps.googleusercontent.com`
   - **Client Secret**: `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`
4. Click **"Connect my account"** → Sign in with your Google account
5. **IMPORTANT**: Grant YouTube upload permissions
6. Save as **"YouTube Account"**

---

## 3. Import Workflow

1. Go to **Workflows** → Click **"+"** → **"Import from File"**
2. Select: `C:\Users\ghani\Desktop\Test\remotion\temp\youtube-automation-workflow.json`
3. The workflow will open

---

## 4. Configure Workflow Nodes

### Google Drive Trigger Node:
- Click on the node
- Select credential: **"Google Drive Account"**
- Folder ID is already set: `1dQCg_4N5J3_Rr5N9Q1FWYYpIEU7jjG9F`

### Download Video Node:
- Click on the node
- Select credential: **"Google Drive Account"**

### Upload to YouTube Node:
- Click on the node
- Select credential: **"YouTube Account"**

### Log to Google Sheets (Optional):
- Create a Google Sheet to track uploads
- Get the Sheet ID from URL
- Update the node with Sheet ID
- Select credential: **"Google Drive Account"**

---

## 5. Activate Workflow

1. Click **"Active"** toggle at top right
2. Workflow will now monitor your Google Drive folder
3. Upload a video to test!

---

## ✅ Ready!

Upload any .mp4 file to your Google Drive folder and it will:
1. Auto-download
2. Generate SEO with Gemini AI
3. Upload to YouTube as a Short
4. Log the result

**Gemini API is already configured** ✓
