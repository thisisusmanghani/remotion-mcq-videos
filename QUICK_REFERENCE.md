# Quick Reference: Video Status & Download

## 🚀 Quick Start

### Check Status (Choose one method)

```bash
# Method 1: Node.js
node check-video-status.js

# Method 2: Python
python3 check-video-status.py

# Method 3: GitHub Actions (automated)
# Go to Actions tab → Run "Check Video Rendering Status" workflow
```

### Download Videos

```bash
# Download all available videos
./download-all-videos.sh

# Download specific batch
gh run download RUN_ID --dir ./videos
```

## 📋 Common Commands

### List Workflows
```bash
# List all render workflows
gh run list --workflow=render-videos.yml

# List only completed
gh run list --workflow=render-videos.yml --status completed

# List only failed
gh run list --workflow=render-videos.yml --status failed

# List in progress
gh run list --workflow=render-videos.yml --status in_progress
```

### Check Specific Run
```bash
# View run details
gh run view RUN_ID

# View logs
gh run view RUN_ID --log

# Watch live
gh run watch RUN_ID

# List artifacts
gh run view RUN_ID --json artifacts
```

### Download Artifacts
```bash
# Download all artifacts from a run
gh run download RUN_ID

# Download to specific directory
gh run download RUN_ID --dir ./my-videos

# Download specific artifact
gh run download RUN_ID --name videos-0-99
```

### Bulk Operations
```bash
# Download first 10 completed runs
gh run list --workflow=render-videos.yml --status completed --json databaseId -q '.[].databaseId' | head -10 | while read id; do gh run download "$id" --dir "./downloads/batch-$id"; done

# Count total runs
gh run list --workflow=render-videos.yml --json databaseId -q '. | length'

# Get run IDs to file
gh run list --workflow=render-videos.yml --status completed --json databaseId -q '.[].databaseId' > run_ids.txt
```

## 🔍 Status Report Contents

The status checker creates `video-status-report.json` with:

```json
{
  "timestamp": "2026-02-07T12:00:00.000Z",
  "summary": {
    "totalVideos": 5792,
    "batchSize": 100,
    "totalRuns": 58,
    "completed": 50,
    "failed": 3,
    "inProgress": 5
  },
  "batchesWithArtifacts": [
    {
      "runId": 12345678,
      "batch": { "start": 0, "end": 99 },
      "artifactCount": 2,
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ]
}
```

## 📊 Understanding Status

| Symbol | Meaning | Action |
|--------|---------|--------|
| ✅ | Completed successfully | Ready to download |
| ❌ | Failed | Check logs, retry if needed |
| ⏳ | In progress | Wait for completion |
| ⏹️ | Cancelled | Retry if needed |
| 📦 | Artifacts available | Download before expiry (7 days) |
| ⚠️ | Artifacts expired | Re-run workflow |

## 🎯 Typical Workflow

```bash
# 1. Check status
python3 check-video-status.py

# 2. Review report
cat video-status-report.json | jq '.summary'

# 3. Download available batches
./download-all-videos.sh

# 4. Verify downloads
find downloaded-videos -name "*.mp4" | wc -l

# 5. Check failed runs (if any)
gh run list --workflow=render-videos.yml --status failed --json databaseId -q '.[0].databaseId' | xargs gh run view --log
```

## ⚡ One-Liners

```bash
# Quick status check
gh run list --workflow=render-videos.yml --json status,conclusion -q 'group_by(.conclusion) | map({conclusion: .[0].conclusion, count: length})'

# Count successful runs
gh run list --workflow=render-videos.yml --status completed --json databaseId -q '. | length'

# Download latest completed run
gh run list --workflow=render-videos.yml --status completed --limit 1 --json databaseId -q '.[0].databaseId' | xargs -I {} gh run download {}

# Find runs with artifacts
gh run list --workflow=render-videos.yml --limit 20 --json databaseId | jq -r '.[].databaseId' | while read id; do echo "Run $id:"; gh run view $id --json artifacts -q '.artifacts | length'; done
```

## 🛠️ Troubleshooting

### "gh: command not found"
```bash
# Install GitHub CLI
# macOS: brew install gh
# Ubuntu/Debian: apt install gh
# Windows: winget install GitHub.cli
```

### "Not authenticated"
```bash
gh auth login
# Follow prompts
```

### "No artifacts found"
Artifacts expire after 7 days. Re-run workflows:
```bash
gh workflow run render-videos.yml -f start_index=0 -f end_index=99
```

### "Rate limited"
Wait a few minutes or add delays:
```bash
for id in $(cat run_ids.txt); do
  gh run download $id
  sleep 5  # 5 second delay
done
```

## 📚 More Information

- Full guide: [VIDEO_STATUS_GUIDE.md](./VIDEO_STATUS_GUIDE.md)
- Rendering guide: [REMOTE_RENDERING_GUIDE.md](./REMOTE_RENDERING_GUIDE.md)
- GitHub CLI docs: https://cli.github.com/manual/

## 💡 Tips

1. **Run status check daily** to track progress
2. **Download artifacts within 7 days** before expiry
3. **Use bulk download script** for efficiency
4. **Check logs of failed runs** to diagnose issues
5. **Organize downloads** by batch for easier management

---

For help: Check the logs, review documentation, or open an issue.
