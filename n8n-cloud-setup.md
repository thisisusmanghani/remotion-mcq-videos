# N8N Cloud Setup for YouTube Automation

This guide helps you set up n8n on a cloud server to automatically download rendered videos from GitHub and upload them to YouTube.

## 🎯 Architecture

```
GitHub Actions (Render Videos) 
    ↓
GitHub Releases (Store Videos)
    ↓
N8N on Cloud Server (Download & Process)
    ↓
YouTube (Auto Upload)
```

## 📋 Options for Hosting N8N

### Option 1: GitHub Codespaces (Recommended - FREE with Student Pack)

**Pros:**
- Free with Student Pack (60 hours/month)
- Direct access to GitHub
- No additional setup needed

**Cons:**
- Limited to 60 hours/month
- Needs to stay running

### Option 2: n8n Cloud (Easiest)

**Pros:**
- Managed service
- Always running
- Free tier available

**Cons:**
- Limited executions on free tier
- May need paid plan for 5792 videos

### Option 3: VPS (Best for this scale)

**Recommended:** Use a cheap VPS (Digital Ocean, Hetzner, etc.)
- Cost: ~$5-10/month
- Unlimited executions
- Always running

## 🚀 Setup Guide

### Method 1: Using GitHub Codespaces (Simplest)

#### Step 1: Start Codespace

```bash
# Open your repo in Codespaces
# Go to: https://github.com/thisisusmanghani/remotion-mcq-videos
# Click: Code → Codespaces → Create codespace on main
```

#### Step 2: Install n8n in Codespace

```bash
# In Codespace terminal
npm install -g n8n

# Start n8n (with tunnel for external access)
n8n start --tunnel
```

This will give you a public URL like: `https://n8n-xxxxx.n8n.cloud`

#### Step 3: Import Your Workflow

1. Open the n8n URL from above
2. Click "Workflows" → "Import"
3. Upload your `temp/youtube-automation-workflow.json`

#### Step 4: Configure the Workflow

Update your workflow to:
1. **Download from GitHub Releases** instead of local files
2. **Upload to YouTube** (reuse your existing YouTube credentials)

### Method 2: Using a VPS (For Production)

#### Recommended VPS Providers:

1. **Hetzner** (Cheapest): €4.15/month (~$4.50)
2. **Digital Ocean**: $6/month
3. **Linode**: $5/month

#### Quick Setup Script:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Run this setup script
curl -o- https://raw.githubusercontent.com/n8n-io/n8n/master/docker/compose/withPostgres/install.sh | bash

# Or manual setup:
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g n8n pm2

# Start n8n with PM2 (keeps it running)
pm2 start n8n
pm2 save
pm2 startup
```

## 🔧 N8N Workflow Configuration

### Required Nodes:

1. **Trigger Node**: Webhook or Schedule
2. **HTTP Request Node**: Download from GitHub Releases
3. **File System Node**: Save video temporarily
4. **YouTube Upload Node**: Upload to YouTube
5. **Delete File Node**: Clean up

### Sample Workflow JSON Structure:

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.scheduleTrigger",
      "name": "Every 10 minutes",
      "parameters": {
        "rule": {
          "interval": [{ "field": "minutes", "minutesInterval": 10 }]
        }
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Get GitHub Releases",
      "parameters": {
        "url": "https://api.github.com/repos/thisisusmanghani/remotion-mcq-videos/releases",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      }
    },
    {
      "type": "n8n-nodes-base.splitInBatches",
      "name": "Process Videos One by One",
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Download Video",
      "parameters": {
        "url": "={{$json.browser_download_url}}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "file"
            }
          }
        }
      }
    },
    {
      "type": "n8n-nodes-base.googleDrive",
      "name": "Upload to YouTube",
      "parameters": {
        "resource": "file",
        "operation": "upload"
      }
    }
  ]
}
```

## 🔐 Required Credentials

### 1. GitHub Token (to download from releases)

```bash
# Create token at: https://github.com/settings/tokens
# Scopes needed: repo
```

Add to n8n:
- Credentials → Add Credential → Header Auth
- Name: `Authorization`
- Value: `token YOUR_GITHUB_TOKEN`

### 2. YouTube API Credentials

You already have these! Just add them to n8n:
- Credentials → Add Credential → Google OAuth2
- Upload your `client_secret_*.json`
- Authorize

## 📊 Automation Script for N8N

Create this workflow to:
1. Check for new GitHub releases every 10 minutes
2. Download videos one by one
3. Upload to YouTube with metadata from JSON
4. Mark release as processed
5. Delete release after upload

## 💡 Complete Solution: Download Script

Create a script that runs on your cloud server:

```bash
#!/bin/bash
# download-and-upload.sh

REPO="thisisusmanghani/remotion-mcq-videos"
BATCH_DIR="/tmp/video-batches"

# Get all releases
releases=$(gh release list --repo $REPO --limit 100 --json tagName,assets)

# Process each release
echo "$releases" | jq -c '.[]' | while read release; do
  tag=$(echo "$release" | jq -r '.tagName')
  echo "Processing $tag..."
  
  # Download release assets
  gh release download $tag --repo $REPO --dir "$BATCH_DIR/$tag"
  
  # Trigger n8n workflow to upload
  curl -X POST http://localhost:5678/webhook/youtube-upload \
    -H "Content-Type: application/json" \
    -d "{\"batch_dir\": \"$BATCH_DIR/$tag\"}"
  
  # Clean up after successful upload
  rm -rf "$BATCH_DIR/$tag"
  
  # Optional: delete release after processing
  # gh release delete $tag --repo $REPO --yes
done
```

## 🎬 Step-by-Step Execution

### For Codespaces:

1. **Start Codespace** from your repo
2. **Install n8n**: `npm install -g n8n`
3. **Start n8n**: `n8n start --tunnel`
4. **Import workflow** from your local JSON
5. **Add credentials** (GitHub, YouTube)
6. **Activate workflow**
7. **Let it run!** (Keep Codespace open)

### For VPS:

1. **Get a VPS** ($5/month)
2. **Install n8n** (see script above)
3. **Configure domain** (optional): `n8n.yourdomain.com`
4. **Import workflow**
5. **Run 24/7** with PM2

## 📈 Estimated Costs

| Solution | Cost | Pros | Cons |
|----------|------|------|------|
| GitHub Codespaces | FREE | Easy, integrated | 60h/month limit |
| n8n Cloud | $20/month | Managed | Limited executions |
| VPS | $5/month | Unlimited | Need to manage |

## 🔄 Recommended Workflow

1. **Videos render** on GitHub Actions (FREE)
2. **Stored as releases** on GitHub (FREE, unlimited for public repos)
3. **N8N on Codespaces** downloads and uploads (FREE, 60h/month)
4. Upload to **YouTube** automatically

**Total Cost: $0** using Student Pack!

## ⚡ Quick Start Command

```bash
# In Codespaces or VPS
npx n8n import:workflow --input=temp/youtube-automation-workflow.json
n8n start
```

## 🆘 Troubleshooting

### Codespace timeout?
Use keepalive: `while true; do echo "alive"; sleep 300; done &`

### Out of space?
Delete videos after upload: Add cleanup node in n8n

### Too slow?
Increase batch processing in n8n workflow settings

---

Need help setting up? Let me know which method you prefer!
