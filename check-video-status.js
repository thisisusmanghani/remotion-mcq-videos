#!/usr/bin/env node

/**
 * Video Rendering Status Checker
 * 
 * This script checks the status of all video rendering workflows
 * and provides a comprehensive report of which videos are ready,
 * failed, or still in progress.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TOTAL_VIDEOS = 5792;
const BATCH_SIZE = 100;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

async function getWorkflowRuns() {
  log('\n🔍 Fetching workflow runs from GitHub...', 'cyan');
  
  // Get workflow runs using gh CLI
  const command = `gh run list --workflow=render-videos.yml --limit 100 --json databaseId,status,conclusion,createdAt,displayTitle,name`;
  const output = execCommand(command);
  
  if (!output) {
    log('❌ Failed to fetch workflow runs. Make sure GitHub CLI is installed and authenticated.', 'red');
    return [];
  }
  
  return JSON.parse(output);
}

async function getArtifacts(runId) {
  const command = `gh run view ${runId} --json artifacts`;
  const output = execCommand(command);
  
  if (!output) {
    return [];
  }
  
  const data = JSON.parse(output);
  return data.artifacts || [];
}

function parseBatchFromTitle(title) {
  // Extract start and end indices from display title
  // Example: "Render MCQ Videos" or workflow name with parameters
  return null;
}

function parseBatchFromArtifacts(artifacts) {
  // Parse batch info from artifact names like "videos-0-99"
  const videoArtifact = artifacts.find(a => a.name && a.name.startsWith('videos-'));
  if (!videoArtifact) return null;
  
  const match = videoArtifact.name.match(/videos-(\d+)-(\d+)/);
  if (match) {
    return {
      start: parseInt(match[1]),
      end: parseInt(match[2]),
    };
  }
  return null;
}

function generateStatusReport(runs) {
  log('\n' + '='.repeat(80), 'bright');
  log('📊 VIDEO RENDERING STATUS REPORT', 'bright');
  log('='.repeat(80) + '\n', 'bright');
  
  log(`Total Videos: ${TOTAL_VIDEOS}`, 'cyan');
  log(`Batch Size: ${BATCH_SIZE}`, 'cyan');
  log(`Total Batches Expected: ${Math.ceil(TOTAL_VIDEOS / BATCH_SIZE)}\n`, 'cyan');
  
  const completed = runs.filter(r => r.conclusion === 'success');
  const failed = runs.filter(r => r.conclusion === 'failure');
  const inProgress = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');
  const cancelled = runs.filter(r => r.conclusion === 'cancelled');
  
  log(`✅ Completed: ${completed.length}`, 'green');
  log(`❌ Failed: ${failed.length}`, 'red');
  log(`⏳ In Progress: ${inProgress.length}`, 'yellow');
  log(`⏹️  Cancelled: ${cancelled.length}`, 'yellow');
  log(`📦 Total Runs: ${runs.length}\n`, 'cyan');
  
  return { completed, failed, inProgress, cancelled };
}

async function checkArtifactAvailability(completedRuns) {
  log('📦 Checking artifact availability...\n', 'cyan');
  
  const batchesWithArtifacts = [];
  const batchesWithoutArtifacts = [];
  
  for (const run of completedRuns.slice(0, 30)) { // Check first 30 to avoid rate limits
    const artifacts = await getArtifacts(run.databaseId);
    const batch = parseBatchFromArtifacts(artifacts);
    
    if (artifacts.length > 0 && batch) {
      batchesWithArtifacts.push({
        runId: run.databaseId,
        batch,
        artifactCount: artifacts.length,
        createdAt: run.createdAt,
      });
    } else if (batch) {
      batchesWithoutArtifacts.push({
        runId: run.databaseId,
        batch,
        createdAt: run.createdAt,
      });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { batchesWithArtifacts, batchesWithoutArtifacts };
}

function displayBatchInfo(batchesWithArtifacts) {
  if (batchesWithArtifacts.length === 0) {
    log('⚠️  No batches with artifacts found (may be expired after 7 days)', 'yellow');
    return;
  }
  
  log('✅ Batches with Available Artifacts:\n', 'green');
  
  batchesWithArtifacts.forEach(({ batch, artifactCount, runId }) => {
    const videosInBatch = batch.end - batch.start + 1;
    log(`  Videos ${batch.start}-${batch.end} (${videosInBatch} videos) - ${artifactCount} artifacts`, 'green');
    log(`    Run ID: ${runId}`, 'cyan');
    log(`    Download: gh run download ${runId}`, 'blue');
  });
}

function generateDownloadInstructions(batchesWithArtifacts) {
  log('\n' + '='.repeat(80), 'bright');
  log('📥 DOWNLOAD INSTRUCTIONS', 'bright');
  log('='.repeat(80) + '\n', 'bright');
  
  if (batchesWithArtifacts.length === 0) {
    log('⚠️  No artifacts available for download.', 'yellow');
    log('   Artifacts expire after 7 days by default.', 'yellow');
    log('   You may need to re-run the rendering workflows.\n', 'yellow');
    return;
  }
  
  log('Option 1: Download all available artifacts at once:', 'cyan');
  log('```bash', 'blue');
  batchesWithArtifacts.forEach(({ runId }) => {
    log(`gh run download ${runId} --dir ./downloads/batch-${runId}`, 'blue');
  });
  log('```\n', 'blue');
  
  log('Option 2: Download from GitHub web interface:', 'cyan');
  const repoUrl = execCommand('gh repo view --json url -q .url')?.trim();
  if (repoUrl) {
    log(`1. Visit: ${repoUrl}/actions`, 'blue');
    log('2. Click on a completed "Render MCQ Videos" workflow', 'blue');
    log('3. Scroll to "Artifacts" section at the bottom', 'blue');
    log('4. Click to download the .zip files\n', 'blue');
  }
  
  log('Option 3: Download specific batch:', 'cyan');
  log('```bash', 'blue');
  if (batchesWithArtifacts.length > 0) {
    const example = batchesWithArtifacts[0];
    log(`gh run download ${example.runId} --name videos-${example.batch.start}-${example.batch.end}`, 'blue');
  }
  log('```\n', 'blue');
}

function saveReportToFile(data) {
  const reportPath = path.join(process.cwd(), 'video-status-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
  log(`\n💾 Detailed report saved to: ${reportPath}`, 'green');
}

async function main() {
  log('\n🎬 Video Rendering Status Checker', 'bright');
  log('='.repeat(80) + '\n', 'bright');
  
  // Check if gh CLI is installed
  const ghVersion = execCommand('gh --version');
  if (!ghVersion) {
    log('❌ GitHub CLI (gh) is not installed or not in PATH.', 'red');
    log('Install it from: https://cli.github.com/', 'yellow');
    process.exit(1);
  }
  
  // Fetch workflow runs
  const runs = await getWorkflowRuns();
  if (runs.length === 0) {
    log('❌ No workflow runs found.', 'red');
    log('Make sure you have triggered the render-videos.yml workflow.', 'yellow');
    return;
  }
  
  // Generate status report
  const { completed, failed, inProgress } = generateStatusReport(runs);
  
  // Check artifact availability for completed runs
  const { batchesWithArtifacts, batchesWithoutArtifacts } = await checkArtifactAvailability(completed);
  
  // Display batch information
  log('\n' + '-'.repeat(80) + '\n', 'bright');
  displayBatchInfo(batchesWithArtifacts);
  
  if (batchesWithoutArtifacts.length > 0) {
    log(`\n⚠️  ${batchesWithoutArtifacts.length} completed batches have no artifacts (likely expired)`, 'yellow');
  }
  
  // Generate download instructions
  generateDownloadInstructions(batchesWithArtifacts);
  
  // Display failed runs info
  if (failed.length > 0) {
    log('='.repeat(80), 'bright');
    log('❌ FAILED RUNS', 'red');
    log('='.repeat(80) + '\n', 'bright');
    failed.slice(0, 10).forEach(run => {
      log(`Run ${run.databaseId} - Created: ${run.createdAt}`, 'red');
      log(`  View logs: gh run view ${run.databaseId}`, 'yellow');
    });
  }
  
  // Display in-progress runs
  if (inProgress.length > 0) {
    log('\n' + '='.repeat(80), 'bright');
    log('⏳ IN PROGRESS RUNS', 'yellow');
    log('='.repeat(80) + '\n', 'bright');
    inProgress.forEach(run => {
      log(`Run ${run.databaseId} - Status: ${run.status}`, 'yellow');
      log(`  Watch: gh run watch ${run.databaseId}`, 'cyan');
    });
  }
  
  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalVideos: TOTAL_VIDEOS,
      batchSize: BATCH_SIZE,
      totalRuns: runs.length,
      completed: completed.length,
      failed: failed.length,
      inProgress: inProgress.length,
    },
    batchesWithArtifacts,
    batchesWithoutArtifacts,
    completedRuns: completed.map(r => ({
      id: r.databaseId,
      createdAt: r.createdAt,
    })),
    failedRuns: failed.map(r => ({
      id: r.databaseId,
      createdAt: r.createdAt,
    })),
  };
  saveReportToFile(reportData);
  
  log('\n✅ Status check complete!\n', 'green');
  
  // Generate HTML dashboard
  log('📊 Generating HTML dashboard...', 'cyan');
  try {
    execSync('python3 generate-dashboard.py', { stdio: 'inherit' });
  } catch (error) {
    log('⚠️  Failed to generate HTML dashboard', 'yellow');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
