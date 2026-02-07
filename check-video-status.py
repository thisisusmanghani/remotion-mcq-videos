#!/usr/bin/env python3
"""
Video Rendering Status Checker (Python version)

This script checks the status of all video rendering workflows
and provides a comprehensive report of which videos are ready,
failed, or still in progress.

Requirements:
    - GitHub CLI (gh) installed and authenticated
    - Python 3.6+

Usage:
    python3 check-video-status.py
    
    Or in GitHub Actions:
    GH_TOKEN=${{ github.token }} python3 check-video-status.py
"""

import json
import subprocess
import sys
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Configuration
TOTAL_VIDEOS = 5792
BATCH_SIZE = 100

# ANSI color codes
class Colors:
    RESET = '\033[0m'
    BRIGHT = '\033[1m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'


def log(message: str, color: str = 'RESET') -> None:
    """Print colored log message."""
    color_code = getattr(Colors, color, Colors.RESET)
    print(f"{color_code}{message}{Colors.RESET}")


def exec_command(command: str) -> Optional[str]:
    """Execute shell command and return output."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        log(f"Error executing command: {command}", 'RED')
        log(f"Error: {e.stderr}", 'RED')
        return None


def get_workflow_runs() -> List[Dict]:
    """Fetch workflow runs from GitHub."""
    log('\n🔍 Fetching workflow runs from GitHub...', 'CYAN')
    
    command = 'gh run list --workflow=render-videos.yml --limit 100 --json databaseId,status,conclusion,createdAt,displayTitle,name'
    output = exec_command(command)
    
    if not output:
        log('❌ Failed to fetch workflow runs. Make sure GitHub CLI is installed and authenticated.', 'RED')
        return []
    
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        log('❌ Failed to parse workflow runs JSON.', 'RED')
        return []


def get_artifacts(run_id: int) -> List[Dict]:
    """Get artifacts for a specific run."""
    command = f'gh run view {run_id} --json artifacts'
    output = exec_command(command)
    
    if not output:
        return []
    
    try:
        data = json.loads(output)
        return data.get('artifacts', [])
    except json.JSONDecodeError:
        return []


def parse_batch_from_artifacts(artifacts: List[Dict]) -> Optional[Dict[str, int]]:
    """Parse batch info from artifact names."""
    for artifact in artifacts:
        if artifact.get('name', '').startswith('videos-'):
            parts = artifact['name'].replace('videos-', '').split('-')
            if len(parts) == 2:
                try:
                    return {
                        'start': int(parts[0]),
                        'end': int(parts[1])
                    }
                except ValueError:
                    continue
    return None


def generate_status_report(runs: List[Dict]) -> Dict:
    """Generate and display status report."""
    log('\n' + '=' * 80, 'BRIGHT')
    log('📊 VIDEO RENDERING STATUS REPORT', 'BRIGHT')
    log('=' * 80 + '\n', 'BRIGHT')
    
    log(f'Total Videos: {TOTAL_VIDEOS}', 'CYAN')
    log(f'Batch Size: {BATCH_SIZE}', 'CYAN')
    log(f'Total Batches Expected: {(TOTAL_VIDEOS + BATCH_SIZE - 1) // BATCH_SIZE}\n', 'CYAN')
    
    completed = [r for r in runs if r.get('conclusion') == 'success']
    failed = [r for r in runs if r.get('conclusion') == 'failure']
    in_progress = [r for r in runs if r.get('status') in ['in_progress', 'queued']]
    cancelled = [r for r in runs if r.get('conclusion') == 'cancelled']
    
    log(f'✅ Completed: {len(completed)}', 'GREEN')
    log(f'❌ Failed: {len(failed)}', 'RED')
    log(f'⏳ In Progress: {len(in_progress)}', 'YELLOW')
    log(f'⏹️  Cancelled: {len(cancelled)}', 'YELLOW')
    log(f'📦 Total Runs: {len(runs)}\n', 'CYAN')
    
    return {
        'completed': completed,
        'failed': failed,
        'in_progress': in_progress,
        'cancelled': cancelled
    }


def check_artifact_availability(completed_runs: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """Check which completed runs have available artifacts."""
    log('📦 Checking artifact availability...\n', 'CYAN')
    
    batches_with_artifacts = []
    batches_without_artifacts = []
    
    # Check first 30 runs to avoid rate limits
    for run in completed_runs[:30]:
        run_id = run['databaseId']
        artifacts = get_artifacts(run_id)
        batch = parse_batch_from_artifacts(artifacts)
        
        if artifacts and batch:
            batches_with_artifacts.append({
                'runId': run_id,
                'batch': batch,
                'artifactCount': len(artifacts),
                'createdAt': run.get('createdAt')
            })
        elif batch:
            batches_without_artifacts.append({
                'runId': run_id,
                'batch': batch,
                'createdAt': run.get('createdAt')
            })
        
        # Small delay to avoid rate limiting
        import time
        time.sleep(0.1)
    
    return batches_with_artifacts, batches_without_artifacts


def display_batch_info(batches_with_artifacts: List[Dict]) -> None:
    """Display information about batches with artifacts."""
    if not batches_with_artifacts:
        log('⚠️  No batches with artifacts found (may be expired after 7 days)', 'YELLOW')
        return
    
    log('✅ Batches with Available Artifacts:\n', 'GREEN')
    
    for batch_info in batches_with_artifacts:
        batch = batch_info['batch']
        videos_in_batch = batch['end'] - batch['start'] + 1
        log(f"  Videos {batch['start']}-{batch['end']} ({videos_in_batch} videos) - {batch_info['artifactCount']} artifacts", 'GREEN')
        log(f"    Run ID: {batch_info['runId']}", 'CYAN')
        log(f"    Download: gh run download {batch_info['runId']}", 'BLUE')


def generate_download_instructions(batches_with_artifacts: List[Dict]) -> None:
    """Generate download instructions."""
    log('\n' + '=' * 80, 'BRIGHT')
    log('📥 DOWNLOAD INSTRUCTIONS', 'BRIGHT')
    log('=' * 80 + '\n', 'BRIGHT')
    
    if not batches_with_artifacts:
        log('⚠️  No artifacts available for download.', 'YELLOW')
        log('   Artifacts expire after 7 days by default.', 'YELLOW')
        log('   You may need to re-run the rendering workflows.\n', 'YELLOW')
        return
    
    log('Option 1: Download all available artifacts at once:', 'CYAN')
    log('```bash', 'BLUE')
    for batch_info in batches_with_artifacts:
        log(f"gh run download {batch_info['runId']} --dir ./downloads/batch-{batch_info['runId']}", 'BLUE')
    log('```\n', 'BLUE')
    
    log('Option 2: Download from GitHub web interface:', 'CYAN')
    repo_url = exec_command('gh repo view --json url -q .url')
    if repo_url:
        log(f'1. Visit: {repo_url}/actions', 'BLUE')
        log('2. Click on a completed "Render MCQ Videos" workflow', 'BLUE')
        log('3. Scroll to "Artifacts" section at the bottom', 'BLUE')
        log('4. Click to download the .zip files\n', 'BLUE')
    
    log('Option 3: Download specific batch:', 'CYAN')
    log('```bash', 'BLUE')
    if batches_with_artifacts:
        example = batches_with_artifacts[0]
        batch = example['batch']
        log(f"gh run download {example['runId']} --name videos-{batch['start']}-{batch['end']}", 'BLUE')
    log('```\n', 'BLUE')


def save_report_to_file(data: Dict) -> None:
    """Save detailed report to JSON file."""
    report_path = 'video-status-report.json'
    with open(report_path, 'w') as f:
        json.dump(data, f, indent=2)
    log(f'\n💾 Detailed report saved to: {report_path}', 'GREEN')


def main():
    """Main function."""
    log('\n🎬 Video Rendering Status Checker', 'BRIGHT')
    log('=' * 80 + '\n', 'BRIGHT')
    
    # Check if gh CLI is installed
    gh_version = exec_command('gh --version')
    if not gh_version:
        log('❌ GitHub CLI (gh) is not installed or not in PATH.', 'RED')
        log('Install it from: https://cli.github.com/', 'YELLOW')
        sys.exit(1)
    
    # Check if GH_TOKEN is set (for GitHub Actions) or if authenticated
    if 'GH_TOKEN' not in os.environ:
        auth_check = exec_command('gh auth status 2>&1')
        if not auth_check or 'Logged in' not in auth_check:
            log('❌ GitHub CLI is not authenticated.', 'RED')
            log('Please run: gh auth login', 'YELLOW')
            log('Or set GH_TOKEN environment variable in GitHub Actions', 'YELLOW')
            sys.exit(1)
    
    # Fetch workflow runs
    runs = get_workflow_runs()
    if not runs:
        log('❌ No workflow runs found.', 'RED')
        log('Make sure you have triggered the render-videos.yml workflow.', 'YELLOW')
        return
    
    # Generate status report
    status = generate_status_report(runs)
    
    # Check artifact availability
    batches_with_artifacts, batches_without_artifacts = check_artifact_availability(
        status['completed']
    )
    
    # Display batch information
    log('\n' + '-' * 80 + '\n', 'BRIGHT')
    display_batch_info(batches_with_artifacts)
    
    if batches_without_artifacts:
        log(f'\n⚠️  {len(batches_without_artifacts)} completed batches have no artifacts (likely expired)', 'YELLOW')
    
    # Generate download instructions
    generate_download_instructions(batches_with_artifacts)
    
    # Display failed runs info
    if status['failed']:
        log('=' * 80, 'BRIGHT')
        log('❌ FAILED RUNS', 'RED')
        log('=' * 80 + '\n', 'BRIGHT')
        for run in status['failed'][:10]:
            log(f"Run {run['databaseId']} - Created: {run.get('createdAt', 'N/A')}", 'RED')
            log(f"  View logs: gh run view {run['databaseId']}", 'YELLOW')
    
    # Display in-progress runs
    if status['in_progress']:
        log('\n' + '=' * 80, 'BRIGHT')
        log('⏳ IN PROGRESS RUNS', 'YELLOW')
        log('=' * 80 + '\n', 'BRIGHT')
        for run in status['in_progress']:
            log(f"Run {run['databaseId']} - Status: {run.get('status', 'N/A')}", 'YELLOW')
            log(f"  Watch: gh run watch {run['databaseId']}", 'CYAN')
    
    # Save detailed report
    report_data = {
        'timestamp': datetime.utcnow().isoformat(),
        'summary': {
            'totalVideos': TOTAL_VIDEOS,
            'batchSize': BATCH_SIZE,
            'totalRuns': len(runs),
            'completed': len(status['completed']),
            'failed': len(status['failed']),
            'inProgress': len(status['in_progress']),
        },
        'batchesWithArtifacts': batches_with_artifacts,
        'batchesWithoutArtifacts': batches_without_artifacts,
        'completedRuns': [{'id': r['databaseId'], 'createdAt': r.get('createdAt')} 
                          for r in status['completed']],
        'failedRuns': [{'id': r['databaseId'], 'createdAt': r.get('createdAt')} 
                       for r in status['failed']],
    }
    save_report_to_file(report_data)
    
    log('\n✅ Status check complete!\n', 'GREEN')
    
    # Generate HTML dashboard
    log('📊 Generating HTML dashboard...', 'CYAN')
    try:
        import subprocess
        result = subprocess.run(['python3', 'generate-dashboard.py'], 
                              capture_output=True, text=True, check=True)
        log(result.stdout.strip(), 'GREEN')
    except subprocess.CalledProcessError:
        log('⚠️  Failed to generate HTML dashboard', 'YELLOW')
    except FileNotFoundError:
        log('⚠️  generate-dashboard.py not found', 'YELLOW')


if __name__ == '__main__':
    main()
