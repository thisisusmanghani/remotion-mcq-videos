#!/usr/bin/env python3
"""
Generate HTML dashboard from video status report
"""

import json
import os
from datetime import datetime

def generate_dashboard(report_path='video-status-report.json', output_path='status-dashboard.html'):
    """Generate HTML dashboard from status report."""
    
    # Check if report exists
    if not os.path.exists(report_path):
        print(f"❌ Report file not found: {report_path}")
        print("Run check-video-status.py first to generate the report.")
        return
    
    # Load report
    with open(report_path, 'r') as f:
        report = json.load(f)
    
    summary = report.get('summary', {})
    batches_with = report.get('batchesWithArtifacts', [])
    batches_without = report.get('batchesWithoutArtifacts', [])
    completed_runs = report.get('completedRuns', [])
    failed_runs = report.get('failedRuns', [])
    
    # Calculate percentages
    total_runs = summary.get('totalRuns', 0)
    completed = summary.get('completed', 0)
    failed = summary.get('failed', 0)
    in_progress = summary.get('inProgress', 0)
    
    completed_pct = (completed / total_runs * 100) if total_runs > 0 else 0
    failed_pct = (failed / total_runs * 100) if total_runs > 0 else 0
    progress_pct = (in_progress / total_runs * 100) if total_runs > 0 else 0
    
    # Generate HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Rendering Status Dashboard</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        h1 {{
            color: white;
            text-align: center;
            margin-bottom: 0.5rem;
            font-size: 2.5rem;
        }}
        
        .subtitle {{
            color: rgba(255,255,255,0.9);
            text-align: center;
            margin-bottom: 2rem;
        }}
        
        .card {{
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }}
        
        .stat-card {{
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .stat-value {{
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }}
        
        .stat-label {{
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .completed {{ color: #10b981; }}
        .failed {{ color: #ef4444; }}
        .progress {{ color: #f59e0b; }}
        .total {{ color: #3b82f6; }}
        
        .progress-bar {{
            height: 30px;
            background: #e5e7eb;
            border-radius: 15px;
            overflow: hidden;
            margin-bottom: 1rem;
        }}
        
        .progress-fill {{
            height: 100%;
            display: flex;
            transition: width 0.3s ease;
        }}
        
        .progress-segment {{
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
        }}
        
        .progress-completed {{ background: #10b981; }}
        .progress-failed {{ background: #ef4444; }}
        .progress-in-progress {{ background: #f59e0b; }}
        
        .batch-list {{
            max-height: 400px;
            overflow-y: auto;
        }}
        
        .batch-item {{
            border-left: 4px solid #10b981;
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: #f9fafb;
            border-radius: 4px;
        }}
        
        .batch-item.expired {{
            border-left-color: #f59e0b;
            opacity: 0.7;
        }}
        
        .batch-header {{
            font-weight: bold;
            margin-bottom: 0.5rem;
        }}
        
        .batch-info {{
            font-size: 0.85rem;
            color: #666;
        }}
        
        .download-btn {{
            display: inline-block;
            margin-top: 0.5rem;
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.85rem;
            transition: background 0.2s;
        }}
        
        .download-btn:hover {{
            background: #5568d3;
        }}
        
        code {{
            background: #f3f4f6;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
        }}
        
        .alert {{
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }}
        
        .alert-warning {{
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            color: #92400e;
        }}
        
        .alert-info {{
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            color: #1e40af;
        }}
        
        .timestamp {{
            text-align: center;
            color: rgba(255,255,255,0.8);
            margin-top: 2rem;
            font-size: 0.9rem;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Video Rendering Status</h1>
        <p class="subtitle">Remotion MCQ Videos Project</p>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value total">{total_runs}</div>
                <div class="stat-label">Total Runs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value completed">{completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed">{failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value progress">{in_progress}</div>
                <div class="stat-label">In Progress</div>
            </div>
        </div>
        
        <div class="card">
            <h2 style="margin-bottom: 1rem;">Progress Overview</h2>
            <div class="progress-bar">
                <div class="progress-fill">
                    <div class="progress-segment progress-completed" style="width: {completed_pct}%;">
                        {completed_pct:.1f}%
                    </div>
                    <div class="progress-segment progress-failed" style="width: {failed_pct}%;">
                        {failed_pct:.1f}%
                    </div>
                    <div class="progress-segment progress-in-progress" style="width: {progress_pct}%;">
                        {progress_pct:.1f}%
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-around; font-size: 0.9rem;">
                <span><span class="completed">●</span> Completed ({completed})</span>
                <span><span class="failed">●</span> Failed ({failed})</span>
                <span><span class="progress">●</span> In Progress ({in_progress})</span>
            </div>
        </div>
        
        <div class="card">
            <h2 style="margin-bottom: 1rem;">📦 Available Artifacts ({len(batches_with)})</h2>
"""
    
    if batches_with:
        html += """
            <div class="alert alert-info">
                <strong>✅ Great!</strong> You have downloadable video batches. Use the commands below to download them.
            </div>
            <div class="batch-list">
"""
        for batch_info in batches_with:
            batch = batch_info['batch']
            run_id = batch_info['runId']
            video_count = batch['end'] - batch['start'] + 1
            html += f"""
                <div class="batch-item">
                    <div class="batch-header">Videos {batch['start']}-{batch['end']} ({video_count} videos)</div>
                    <div class="batch-info">
                        Run ID: {run_id} | Artifacts: {batch_info['artifactCount']}
                    </div>
                    <code>gh run download {run_id}</code>
                </div>
"""
        html += """
            </div>
"""
    else:
        html += """
            <div class="alert alert-warning">
                <strong>⚠️ No artifacts available.</strong> Artifacts may have expired (7-day retention). 
                Consider re-running the rendering workflows.
            </div>
"""
    
    html += """
        </div>
"""
    
    if batches_without:
        html += f"""
        <div class="card">
            <h2 style="margin-bottom: 1rem;">⚠️ Expired Batches ({len(batches_without)})</h2>
            <div class="alert alert-warning">
                These batches completed successfully but their artifacts have expired (>7 days).
            </div>
            <div class="batch-list">
"""
        for batch_info in batches_without[:10]:  # Show first 10
            batch = batch_info['batch']
            run_id = batch_info['runId']
            video_count = batch['end'] - batch['start'] + 1
            html += f"""
                <div class="batch-item expired">
                    <div class="batch-header">Videos {batch['start']}-{batch['end']} ({video_count} videos)</div>
                    <div class="batch-info">Run ID: {run_id} | Artifacts expired</div>
                </div>
"""
        if len(batches_without) > 10:
            html += f"""
                <div style="text-align: center; padding: 1rem; color: #666;">
                    ... and {len(batches_without) - 10} more
                </div>
"""
        html += """
            </div>
        </div>
"""
    
    if failed_runs:
        html += f"""
        <div class="card">
            <h2 style="margin-bottom: 1rem;">❌ Failed Runs ({len(failed_runs)})</h2>
            <div class="alert alert-warning">
                These workflow runs failed. Check the logs and consider re-running them.
            </div>
            <div class="batch-list">
"""
        for run_info in failed_runs[:5]:  # Show first 5
            run_id = run_info['id']
            html += f"""
                <div class="batch-item" style="border-left-color: #ef4444;">
                    <div class="batch-header">Run {run_id}</div>
                    <div class="batch-info">Created: {run_info.get('createdAt', 'N/A')}</div>
                    <code>gh run view {run_id} --log</code>
                </div>
"""
        if len(failed_runs) > 5:
            html += f"""
                <div style="text-align: center; padding: 1rem; color: #666;">
                    ... and {len(failed_runs) - 5} more
                </div>
"""
        html += """
            </div>
        </div>
"""
    
    timestamp = report.get('timestamp', datetime.utcnow().isoformat())
    html += f"""
        <div class="card">
            <h2 style="margin-bottom: 1rem;">📥 Download Instructions</h2>
            <p style="margin-bottom: 1rem;">To download all available videos:</p>
            <code>./download-all-videos.sh</code>
            
            <p style="margin: 1.5rem 0 1rem;">Or download specific batches:</p>
            <code>gh run download RUN_ID --dir ./downloads</code>
            
            <p style="margin: 1.5rem 0 1rem;">Check GitHub Actions web interface:</p>
            <code>https://github.com/USERNAME/REPO/actions</code>
            <p style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">
                (Replace USERNAME/REPO with your repository details)
            </p>
        </div>
        
        <p class="timestamp">
            Last updated: {timestamp}<br>
            Generated by check-video-status.py
        </p>
    </div>
</body>
</html>
"""
    
    # Write HTML file
    with open(output_path, 'w') as f:
        f.write(html)
    
    print(f"✅ Dashboard generated: {output_path}")
    print(f"   Open it in your browser to view the status")

if __name__ == '__main__':
    generate_dashboard()
