# 🎬 Video Rendering Status - Complete Solution

## Overview

This repository now includes a complete solution for checking the status of your 5000+ rendered videos from GitHub Actions workflows and downloading them.

## 📋 What Was Added

### 1. Status Checking Scripts

**Two equivalent scripts to check video status:**

- **`check-video-status.js`** (Node.js version)
  - Requires Node.js installed
  - Run with: `node check-video-status.js`

- **`check-video-status.py`** (Python version)
  - Requires Python 3.6+
  - Run with: `python3 check-video-status.py`

**What they do:**
- ✅ Fetch all render workflow runs from GitHub
- 📊 Show completion statistics
- 🔍 Check which batches have downloadable artifacts
- ⚠️ Identify expired artifacts (>7 days)
- 💾 Generate detailed JSON report
- 🎨 Generate visual HTML dashboard

### 2. Bulk Download Script

**`download-all-videos.sh`** - Automated batch downloader

```bash
./download-all-videos.sh
```

**Features:**
- Downloads all available video artifacts automatically
- Extracts zip files automatically
- Shows progress and summary
- Handles errors gracefully
- Avoids re-downloading existing batches

### 3. HTML Dashboard

**`generate-dashboard.py`** - Creates visual status dashboard

Generates `status-dashboard.html` with:
- 📊 Visual progress bars
- 📈 Statistics cards
- 📦 List of downloadable batches
- ⚠️ Expired artifacts list
- ❌ Failed runs overview
- 📥 Download instructions

**Auto-generated** when you run the status checkers.

### 4. GitHub Actions Workflow

**`.github/workflows/check-status.yml`** - Automated status checking

- Can be triggered manually from Actions tab
- Optionally runs daily at midnight (scheduled)
- Generates status report
- Uploads report as artifact
- Creates GitHub Actions summary

### 5. Documentation

Three comprehensive guides:

1. **`VIDEO_STATUS_GUIDE.md`** - Complete guide with examples
   - Prerequisites and setup
   - All download methods
   - Troubleshooting tips
   - Best practices

2. **`QUICK_REFERENCE.md`** - Quick command reference
   - Common commands
   - One-liners
   - Typical workflows

3. **`REMOTE_RENDERING_GUIDE.md`** - (Existing) How to render videos

## 🚀 Quick Start

### Step 1: Prerequisites

Install GitHub CLI if you haven't already:

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install GitHub.cli

# Authenticate
gh auth login
```

### Step 2: Check Status

Run one of the status checkers:

```bash
# Python (recommended)
python3 check-video-status.py

# Or Node.js
node check-video-status.js
```

**Output:**
- Console report showing statistics
- `video-status-report.json` - Detailed JSON data
- `status-dashboard.html` - Visual dashboard (open in browser)

### Step 3: View Dashboard

Open the generated HTML dashboard:

```bash
# macOS
open status-dashboard.html

# Linux
xdg-open status-dashboard.html

# Windows
start status-dashboard.html
```

### Step 4: Download Videos

```bash
# Download all available videos
./download-all-videos.sh

# Or download specific batch
gh run download RUN_ID --dir ./downloads
```

## 📊 What You'll See

### Console Output Example

```
🎬 Video Rendering Status Checker
================================================================================

🔍 Fetching workflow runs from GitHub...

================================================================================
📊 VIDEO RENDERING STATUS REPORT
================================================================================

Total Videos: 5792
Batch Size: 100
Total Batches Expected: 58

✅ Completed: 50
❌ Failed: 3
⏳ In Progress: 5
📦 Total Runs: 58

📦 Checking artifact availability...

✅ Batches with Available Artifacts:

  Videos 0-99 (100 videos) - 2 artifacts
    Run ID: 21363499780
    Download: gh run download 21363499780
  
  Videos 100-199 (100 videos) - 2 artifacts
    Run ID: 21363495539
    Download: gh run download 21363495539

[... more batches ...]

================================================================================
📥 DOWNLOAD INSTRUCTIONS
================================================================================

Option 1: Download all available artifacts at once:
```bash
gh run download 21363499780 --dir ./downloads/batch-21363499780
gh run download 21363495539 --dir ./downloads/batch-21363495539
[... more commands ...]
```

💾 Detailed report saved to: video-status-report.json

✅ Status check complete!
```

### HTML Dashboard

Beautiful visual dashboard showing:
- Color-coded statistics
- Progress bars
- Downloadable batches with commands
- Expired artifacts
- Failed runs

## 🎯 Common Use Cases

### Use Case 1: Daily Status Check

```bash
# Check status
python3 check-video-status.py

# Open dashboard
open status-dashboard.html

# Download new videos
./download-all-videos.sh
```

### Use Case 2: Find Specific Video

```bash
# Search for video in batch 5 (videos 400-499)
# Check the report
cat video-status-report.json | jq '.batchesWithArtifacts[] | select(.batch.start == 400)'

# Download that batch
gh run download <RUN_ID>
```

### Use Case 3: Re-run Failed Batches

```bash
# Check failed runs
python3 check-video-status.py

# View logs of failed run
gh run view <FAILED_RUN_ID> --log

# Re-trigger if needed
gh workflow run render-videos.yml -f start_index=200 -f end_index=299
```

### Use Case 4: Monitor from GitHub Actions

Go to Actions tab → Run "Check Video Rendering Status" workflow

The workflow will:
1. Check status automatically
2. Generate report
3. Upload report as artifact
4. Show summary in workflow page

## 📁 File Structure

```
remotion-mcq-videos/
├── .github/
│   └── workflows/
│       ├── render-videos.yml         # Original render workflow
│       ├── render-and-store.yml      # Render with release
│       └── check-status.yml          # NEW: Status checker workflow
├── check-video-status.js             # NEW: Node.js status checker
├── check-video-status.py             # NEW: Python status checker
├── generate-dashboard.py             # NEW: HTML dashboard generator
├── download-all-videos.sh            # NEW: Bulk download script
├── VIDEO_STATUS_GUIDE.md             # NEW: Complete guide
├── QUICK_REFERENCE.md                # NEW: Quick commands
├── REMOTE_RENDERING_GUIDE.md         # Existing: Render guide
└── README.md                         # Updated with status info
```

## 🔄 Typical Workflow

```
1. Videos rendered via GitHub Actions
   ↓
2. Run status checker (daily/weekly)
   ↓
3. Review HTML dashboard
   ↓
4. Download available artifacts
   ↓
5. Organize videos locally
   ↓
6. Upload to final destination
```

## ⚠️ Important Notes

### Artifact Retention
- **Default**: 7 days
- **Action**: Download before expiry
- **Solution**: Re-run workflows if expired

### Rate Limits
- GitHub API has rate limits
- Scripts include delays to avoid issues
- Download batches gradually if needed

### Storage
- 5792 videos × ~5MB = ~29GB total
- Ensure adequate disk space
- Consider cloud storage backup

## 🛠️ Troubleshooting

### Problem: "No artifacts available"
**Solution**: Artifacts expired. Re-run workflows:
```bash
./trigger-all-batches.sh
```

### Problem: "Not authenticated"
**Solution**: Authenticate GitHub CLI:
```bash
gh auth login
```

### Problem: Status checker fails
**Solution**: Check prerequisites:
```bash
gh --version  # Should show version
python3 --version  # Should be 3.6+
```

## 📈 Monitoring Best Practices

1. **Run status check daily** during rendering period
2. **Download artifacts within 3-4 days** (don't wait until day 7)
3. **Keep dashboard open** to monitor progress visually
4. **Check failed runs immediately** and re-trigger
5. **Backup downloaded videos** to prevent loss

## 🎓 Advanced Tips

### Parallel Downloads
```bash
# Download multiple batches simultaneously
cat run_ids.txt | xargs -P 3 -I {} gh run download {} --dir downloads/batch-{}
```

### Filter by Date
```bash
# Get runs from last week
gh run list --workflow=render-videos.yml --json databaseId,createdAt -q '.[] | select(.createdAt > "2026-02-01")'
```

### Automated Daily Check
```bash
# Add to crontab (runs daily at 9 AM)
0 9 * * * cd /path/to/repo && python3 check-video-status.py
```

## 📞 Support

- **Documentation**: Check all `.md` files in the repo
- **Issues**: Open a GitHub issue with status report attached
- **Logs**: Include output from `gh run view <RUN_ID> --log`

## ✅ Success Checklist

Before considering the project complete:

- [ ] All workflows triggered successfully
- [ ] Status checker runs without errors
- [ ] Dashboard displays correctly
- [ ] Can download artifacts successfully
- [ ] Videos play correctly
- [ ] All videos accounted for (5792 total)
- [ ] Backups created
- [ ] Ready for final use (YouTube upload, etc.)

## 🎉 Summary

You now have a complete solution to:
- ✅ Check video rendering status
- ✅ View progress visually
- ✅ Download videos in bulk
- ✅ Monitor from GitHub Actions
- ✅ Handle failures gracefully

**All tools are ready to use!** Start with `python3 check-video-status.py` and open the generated dashboard.

---

**Happy video managing! 🎬📹🚀**
