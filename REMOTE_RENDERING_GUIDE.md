# Remote Video Rendering Guide for 5792 MCQ Videos

This guide will help you render all 5,792 quiz videos remotely using GitHub Actions (free for students with GitHub Student Developer Pack).

## 🎯 Overview

- **Total Videos**: 5,792
- **Batch Size**: 100 videos per job
- **Total Batches**: 58 batches
- **Estimated Time**: ~6-8 hours total (batches run in parallel)
- **Cost**: FREE with GitHub Student Pack

## 📋 Prerequisites

1. **GitHub Account** with Student Developer Pack activated
2. **GitHub CLI** installed (`gh` command)
3. Your code pushed to a GitHub repository

## 🚀 Setup Instructions

### Step 1: Install GitHub CLI (if not already installed)

**Windows (PowerShell):**
```powershell
winget install --id GitHub.cli
```

**Or download from:** https://cli.github.com/

### Step 2: Authenticate GitHub CLI

```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

### Step 3: Create a GitHub Repository

If you haven't already:

```bash
cd "C:\Users\ghani\Desktop\Test\remotion"
git init
git add .
git commit -m "Initial commit with MCQ videos project"
gh repo create remotion-mcq-videos --private --source=. --push
```

### Step 4: Update the Trigger Scripts

Edit these files and replace the placeholders:

**In `trigger-all-batches.ps1` (for Windows):**
- Replace `YOUR_GITHUB_USERNAME` with your GitHub username
- Replace `YOUR_REPO_NAME` with `remotion-mcq-videos` (or your repo name)

**In `trigger-all-batches.sh` (for Linux/Mac):**
- Same replacements as above

### Step 5: Start Remote Rendering

**Windows (PowerShell):**
```powershell
.\trigger-all-batches.ps1
```

**Linux/Mac:**
```bash
chmod +x trigger-all-batches.sh
./trigger-all-batches.sh
```

This will trigger all 58 batch jobs to run in parallel on GitHub Actions!

## 📊 Monitor Progress

Visit your GitHub repository and go to the "Actions" tab:
```
https://github.com/YOUR_USERNAME/remotion-mcq-videos/actions
```

You'll see all batch jobs running. Each job will:
1. Set up Node.js environment
2. Install dependencies
3. Render 100 videos
4. Upload videos as artifacts

## 📥 Download Rendered Videos

### Option 1: GitHub Web Interface

1. Go to Actions tab
2. Click on a completed workflow run
3. Scroll down to "Artifacts" section
4. Download the video artifacts (will be .zip files)

### Option 2: GitHub CLI

Download all artifacts at once:

```bash
# List all workflow runs
gh run list --workflow=render-videos.yml

# Download artifacts from a specific run
gh run download RUN_ID --dir ./downloads

# Or download all recent artifacts
gh run list --workflow=render-videos.yml --json databaseId --limit 58 | \
  jq -r '.[].databaseId' | \
  xargs -I {} gh run download {} --dir ./downloads/batch-{}
```

## 💡 Alternative: Manual Batch Triggering

If you want more control, trigger batches manually:

```bash
# Trigger first batch (videos 0-99)
gh workflow run render-videos.yml -f start_index=0 -f end_index=99

# Trigger second batch (videos 100-199)
gh workflow run render-videos.yml -f start_index=100 -f end_index=199

# And so on...
```

## 🔧 Customization Options

### Change Batch Size

Edit `.github/workflows/render-videos.yml` and update the default batch_size:

```yaml
batch_size:
  description: 'Batch size per job'
  required: true
  default: '50'  # Change from 100 to 50 for smaller batches
```

### Adjust Timeout

If renders take longer, increase timeout in the workflow:

```yaml
timeout-minutes: 720  # Change from 360 (6 hours) to 720 (12 hours)
```

## 📝 Cost Analysis

With GitHub Student Developer Pack:
- GitHub Actions: **FREE** (unlimited minutes for public repos, 3000 min/month for private)
- Storage: **FREE** (artifacts retained for 7 days by default)
- Total Cost: **$0.00**

## ⚠️ Important Notes

1. **Artifacts Retention**: Videos are kept for 7 days by default. Download them before they expire!
2. **Parallel Limits**: GitHub allows ~20 concurrent jobs. Extra jobs will queue automatically.
3. **Time Estimate**: Each batch of 100 videos takes ~30-60 minutes depending on video complexity.
4. **Storage Needed**: 5,792 videos × ~5MB each = ~29GB total (download space required)

## 🎓 Using GitHub Codespaces (Alternative)

If you prefer a single continuous render:

1. Open your repo in GitHub Codespaces
2. Run:
```bash
npm install
START_INDEX=0 END_INDEX=5791 node render-batch.js
```

This will render all videos in one go (takes ~12-24 hours).

## 🆘 Troubleshooting

### Job Fails
- Check the job logs in Actions tab
- Common issues: memory limits, timeout
- Solution: Reduce batch size or increase timeout

### Too Many Jobs Queued
- GitHub queues jobs automatically
- Wait for current batches to complete
- Or cancel and reduce parallel batches

### Download Issues
- Use `gh run download` command
- Or use a download manager for large artifacts

## ✅ Success Checklist

- [ ] GitHub CLI installed and authenticated
- [ ] Repository created and code pushed
- [ ] Trigger scripts updated with your username/repo
- [ ] All batches triggered successfully
- [ ] Jobs monitored in Actions tab
- [ ] Videos downloaded before 7-day expiration
- [ ] Videos organized and ready for upload

Happy rendering! 🎬🚀
