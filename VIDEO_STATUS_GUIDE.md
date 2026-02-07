# Video Rendering Status Guide

This guide explains how to check the status of your rendered videos and download them from GitHub Actions.

## 🎯 Quick Status Check

### Option 1: Using the Automated Status Checker (Recommended)

We've created automated scripts that check the status of all your video rendering workflows:

**Using Node.js:**
```bash
node check-video-status.js
```

**Using Python:**
```bash
python3 check-video-status.py
```

Both scripts will:
- ✅ Show how many videos have been rendered successfully
- ❌ Show which batches failed
- ⏳ Show which batches are still in progress
- 📦 List all available artifacts (videos ready to download)
- 💾 Save a detailed report to `video-status-report.json`

### Option 2: Manual GitHub CLI Commands

If you prefer to check manually:

```bash
# List all render workflow runs
gh run list --workflow=render-videos.yml --limit 50

# Check status of a specific run
gh run view RUN_ID

# List artifacts for a run
gh run view RUN_ID --json artifacts
```

### Option 3: GitHub Web Interface

1. Go to your repository on GitHub
2. Click the "Actions" tab
3. Look for "Render MCQ Videos" workflows
4. Green checkmark ✅ = completed successfully
5. Red X ❌ = failed
6. Yellow dot 🟡 = in progress

## 📥 Downloading Rendered Videos

### Prerequisites

Make sure you have GitHub CLI installed and authenticated:

```bash
# Install GitHub CLI
# For macOS/Linux: https://cli.github.com/
# For Windows: https://cli.github.com/

# Authenticate
gh auth login
```

### Download Methods

#### Method 1: Download All Available Artifacts

```bash
# Get list of completed runs
gh run list --workflow=render-videos.yml --status completed --json databaseId -q '.[].databaseId' | head -10 > run_ids.txt

# Download each run's artifacts
while read run_id; do
  gh run download "$run_id" --dir "./downloads/batch-$run_id"
done < run_ids.txt
```

#### Method 2: Download Specific Batch

If you know the run ID of a specific batch:

```bash
# Download all artifacts from a run
gh run download RUN_ID --dir ./downloads

# Download only video artifacts
gh run download RUN_ID --name "videos-0-99" --dir ./downloads
```

#### Method 3: Download from Web Interface

1. Visit: `https://github.com/YOUR_USERNAME/remotion-mcq-videos/actions`
2. Click on a completed "Render MCQ Videos" workflow
3. Scroll down to the "Artifacts" section
4. Click the artifact name to download as .zip file

### Bulk Download Script

Create a script to download all available artifacts:

```bash
#!/bin/bash
# download-all-videos.sh

WORKFLOW="render-videos.yml"
OUTPUT_DIR="./all-videos"

echo "📥 Downloading all available video artifacts..."

# Get all successful run IDs
gh run list --workflow=$WORKFLOW --status completed --json databaseId -q '.[].databaseId' | while read -r run_id; do
  echo "Downloading run: $run_id"
  gh run download "$run_id" --dir "$OUTPUT_DIR/batch-$run_id"
  
  # Extract .zip files if needed
  cd "$OUTPUT_DIR/batch-$run_id"
  for zip_file in *.zip; do
    if [ -f "$zip_file" ]; then
      unzip -o "$zip_file"
      rm "$zip_file"
    fi
  done
  cd - > /dev/null
done

echo "✅ Download complete! Videos are in: $OUTPUT_DIR"
```

Make it executable and run:

```bash
chmod +x download-all-videos.sh
./download-all-videos.sh
```

## ⚠️ Important Notes

### Artifact Retention

- **Default retention**: 7 days
- Artifacts older than 7 days are automatically deleted by GitHub
- Download your videos before they expire!

### Storage Considerations

- Each video is approximately 5-10 MB
- 5,792 videos × 5 MB = ~29 GB total
- Make sure you have enough disk space

### Rate Limits

- GitHub CLI may rate limit if you make too many requests
- Add delays between downloads if needed
- Use the automated status checker which includes rate limiting

## 📊 Understanding the Status Report

When you run the status checker, you'll get:

### Summary Section
```
Total Videos: 5792
Batch Size: 100
Total Batches Expected: 58

✅ Completed: 45
❌ Failed: 2
⏳ In Progress: 5
📦 Total Runs: 52
```

### Batches with Available Artifacts
```
✅ Batches with Available Artifacts:

  Videos 0-99 (100 videos) - 2 artifacts
    Run ID: 12345678
    Download: gh run download 12345678
  
  Videos 100-199 (100 videos) - 2 artifacts
    Run ID: 12345679
    Download: gh run download 12345679
```

### Download Instructions

The report provides three options:

1. **Bulk download** - Downloads all available artifacts
2. **Web interface** - Manual download from GitHub
3. **Specific batch** - Download individual batches

## 🔧 Troubleshooting

### "No artifacts available"

**Reason**: Artifacts have expired (>7 days old)

**Solution**: Re-run the rendering workflows:
```bash
# Re-trigger a specific batch
gh workflow run render-videos.yml -f start_index=0 -f end_index=99

# Or use the trigger-all-batches script
./trigger-all-batches.sh
```

### "Failed to authenticate"

**Reason**: GitHub CLI not authenticated

**Solution**:
```bash
gh auth login
# Follow the prompts
```

### "Rate limit exceeded"

**Reason**: Too many API requests

**Solution**: Wait a few minutes and try again. The status checker includes rate limiting.

### Download is slow

**Solution**: 
- Download batches in parallel (be careful with rate limits)
- Use a faster internet connection
- Download during off-peak hours

## 📈 Monitoring Active Renders

To watch renders in real-time:

```bash
# List in-progress runs
gh run list --workflow=render-videos.yml --status in_progress

# Watch a specific run
gh run watch RUN_ID

# View logs of a running job
gh run view RUN_ID --log
```

## 🎓 Best Practices

1. **Check status regularly**: Run the status checker daily to track progress
2. **Download promptly**: Don't wait until day 7 to download artifacts
3. **Organize downloads**: Use the batch directories to keep videos organized
4. **Backup important videos**: Copy to external storage or cloud backup
5. **Monitor failures**: Check failed runs and re-trigger if needed

## 📋 Example Workflow

Here's a complete workflow for checking and downloading videos:

```bash
# 1. Check status
python3 check-video-status.py

# 2. Review the report
cat video-status-report.json

# 3. Download available artifacts
gh run list --workflow=render-videos.yml --status completed --json databaseId -q '.[].databaseId' | head -5 | while read run_id; do
  gh run download "$run_id" --dir "./downloads/batch-$run_id"
done

# 4. Verify downloads
ls -lh downloads/*/

# 5. Extract and organize
find downloads/ -name "*.zip" -exec unzip -o {} -d videos/ \;
```

## 🆘 Getting Help

If you encounter issues:

1. Check the workflow logs:
   ```bash
   gh run view RUN_ID --log
   ```

2. View the status report:
   ```bash
   cat video-status-report.json | jq
   ```

3. Check GitHub Actions quotas:
   ```bash
   gh api /user -q '.plan'
   ```

## 📚 Additional Resources

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Artifact Retention Documentation](https://docs.github.com/en/actions/managing-workflow-runs/removing-workflow-artifacts)

## 🎬 Video Organization Tips

After downloading, organize your videos:

```bash
# Create organized structure
mkdir -p organized-videos/{batch-00..batch-57}

# Move videos to batch folders
# (Adjust based on your batch naming)
find downloads/ -name "Quiz*.mp4" | sort | awk '{print "mv", $0, "organized-videos/batch-" int((NR-1)/100) "/" }' | sh
```

---

Happy video downloading! 🎉
