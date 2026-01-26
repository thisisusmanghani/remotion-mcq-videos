# PowerShell script to trigger all batch rendering jobs via GitHub Actions
# Total videos: 5792
# Batch size: 100 videos per job
# Total batches needed: 58 batches

$TOTAL_VIDEOS = 5792
$BATCH_SIZE = 100
$REPO_OWNER = "YOUR_GITHUB_USERNAME"  # Update this with your GitHub username
$REPO_NAME = "YOUR_REPO_NAME"         # Update this with your repository name

Write-Host "🚀 Triggering GitHub Actions to render all $TOTAL_VIDEOS videos" -ForegroundColor Green
Write-Host "Using batch size of $BATCH_SIZE videos per job" -ForegroundColor Green
Write-Host ""

# Calculate number of batches
$TOTAL_BATCHES = [Math]::Ceiling($TOTAL_VIDEOS / $BATCH_SIZE)

Write-Host "Total batches to trigger: $TOTAL_BATCHES" -ForegroundColor Cyan
Write-Host ""

for ($batch = 0; $batch -lt $TOTAL_BATCHES; $batch++) {
    $START_INDEX = $batch * $BATCH_SIZE
    $END_INDEX = $START_INDEX + $BATCH_SIZE - 1
    
    # Don't exceed total videos
    if ($END_INDEX -ge $TOTAL_VIDEOS) {
        $END_INDEX = $TOTAL_VIDEOS - 1
    }
    
    Write-Host "Triggering batch $($batch + 1)/$TOTAL_BATCHES : Videos $START_INDEX to $END_INDEX" -ForegroundColor Yellow
    
    # Trigger GitHub Actions workflow
    gh workflow run render-videos.yml `
        -f start_index=$START_INDEX `
        -f end_index=$END_INDEX `
        -f batch_size=$BATCH_SIZE
    
    # Small delay to avoid rate limiting
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "✓ All batches triggered!" -ForegroundColor Green
Write-Host "Monitor progress at: https://github.com/$REPO_OWNER/$REPO_NAME/actions" -ForegroundColor Cyan
