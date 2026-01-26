# Export and Deploy Your N8N Workflow to Cloud

## 🎯 Your Working Setup

You have a working n8n workflow at: `http://localhost:5678/workflow/amYLfuphxu-gmywrSqQ_X`

It works by:
1. Detecting new videos uploaded to Google Drive (quiz1.mp4 + quiz1.json)
2. Automatically uploading to YouTube

## 📤 Step 1: Export Your Workflow

1. Open your local n8n: http://localhost:5678
2. Go to your workflow
3. Click the **"..."** menu (top right)
4. Click **"Download"**
5. Save as `my-youtube-workflow.json`

## ☁️ Step 2: Deploy to GitHub Codespaces (FREE)

### Option A: Use GitHub Codespaces

1. **Open Codespace**:
   ```bash
   # Go to: https://github.com/thisisusmanghani/remotion-mcq-videos
   # Click: Code → Codespaces → Create codespace on main
   ```

2. **Install n8n in Codespace**:
   ```bash
   npm install -g n8n
   ```

3. **Start n8n with tunnel**:
   ```bash
   n8n start --tunnel
   ```
   
   This gives you a public URL like: `https://n8n-xxxxx.n8n.cloud`

4. **Import your workflow**:
   - Upload `my-youtube-workflow.json` to the Codespace
   - In n8n UI, click "Import" and select the file
   - Reconnect your Google Drive and YouTube credentials

5. **Activate and let it run!**

### Option B: Use a VPS ($5/month - recommended for 24/7)

If you want it running 24/7 without keeping Codespace open:

```bash
# Get a VPS from Hetzner ($4.50/month) or Digital Ocean ($6/month)
# SSH into it
ssh root@your-vps-ip

# Install n8n
npm install -g n8n pm2

# Start n8n with PM2 (keeps it running forever)
pm2 start n8n
pm2 save
pm2 startup
```

## 🔄 Modified Workflow for GitHub Releases

Since local disk is full, here's the cloud-only flow:

1. **Videos render** on GitHub Actions → Store as **GitHub Releases**
2. **n8n** (in Codespaces/VPS) downloads from GitHub  
3. **Uploads to Google Drive**
4. **Your existing workflow** detects new file → Uploads to YouTube

## ⚡ Quick Fix for GitHub Actions

The workflows failed because:
1. Disk space issues (not on GitHub Actions - plenty there!)
2. Root.tsx was wrong (now fixed!)

Let's commit the fixes and try with 2 videos:

```bash
cd "C:/Users/ghani/Desktop/Test/remotion"
git add .
git commit -m "Fix Root.tsx for dynamic quiz rendering"
git push origin main

# Trigger just 2 videos as a test
gh workflow run render-videos.yml -f start_index=0 -f end_index=1
```

## 🎬 Complete Cloud Workflow

```
GitHub Actions (Render 2 videos)
    ↓
GitHub Releases (Store videos)
    ↓  
N8N in Codespaces (Download)
    ↓
Upload to Google Drive
    ↓
Your Existing N8N Workflow (Auto-detect)
    ↓
YouTube (Published!)
```

## 📝 Next Steps

1. **Export your local n8n workflow** (Download button in n8n)
2. **Fix and push changes**:
   ```bash
   git add . && git commit -m "Fix composition" && git push
   ```
3. **Test with 2 videos**:
   ```bash
   gh workflow run render-videos.yml -f start_index=0 -f end_index=1
   ```
4. **Check if it works**: https://github.com/thisisusmanghani/remotion-mcq-videos/actions
5. **Deploy n8n to Codespaces** and import your workflow

Want me to help with any specific step?
