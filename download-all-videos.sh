#!/bin/bash

# Bulk Download Script for Rendered Videos
# This script downloads all available artifacts from completed render workflows

set -e

# Configuration
WORKFLOW="render-videos.yml"
OUTPUT_DIR="./downloaded-videos"
MAX_RUNS=50  # Maximum number of runs to process

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🎬 Video Artifact Downloader${NC}"
echo -e "${CYAN}================================${NC}\n"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo -e "${YELLOW}Install it from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI.${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Fetching completed workflow runs...${NC}"

# Get completed runs
RUN_IDS=$(gh run list --workflow=$WORKFLOW --status completed --json databaseId -q '.[].databaseId' --limit $MAX_RUNS)

if [ -z "$RUN_IDS" ]; then
    echo -e "${YELLOW}⚠️  No completed runs found.${NC}"
    exit 0
fi

RUN_COUNT=$(echo "$RUN_IDS" | wc -l | tr -d ' ')
echo -e "${GREEN}Found ${RUN_COUNT} completed runs${NC}\n"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Download counter
DOWNLOADED=0
SKIPPED=0
FAILED=0

# Download each run
echo "$RUN_IDS" | while IFS= read -r run_id; do
    if [ -z "$run_id" ]; then
        continue
    fi
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 Processing Run ID: ${run_id}${NC}"
    
    # Check if already downloaded
    if [ -d "$OUTPUT_DIR/run-$run_id" ] && [ "$(ls -A $OUTPUT_DIR/run-$run_id)" ]; then
        echo -e "${YELLOW}⏭️  Already downloaded, skipping...${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    # Get artifact info
    ARTIFACTS=$(gh run view $run_id --json artifacts -q '.artifacts | length')
    
    if [ "$ARTIFACTS" -eq "0" ]; then
        echo -e "${YELLOW}⚠️  No artifacts available (may have expired)${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    echo -e "${GREEN}Found ${ARTIFACTS} artifact(s)${NC}"
    
    # Download artifacts
    if gh run download "$run_id" --dir "$OUTPUT_DIR/run-$run_id" 2>&1; then
        echo -e "${GREEN}✅ Downloaded successfully${NC}"
        DOWNLOADED=$((DOWNLOADED + 1))
        
        # Extract any zip files
        if ls "$OUTPUT_DIR/run-$run_id"/*.zip 1> /dev/null 2>&1; then
            echo -e "${BLUE}📂 Extracting archives...${NC}"
            cd "$OUTPUT_DIR/run-$run_id"
            for zip_file in *.zip; do
                if [ -f "$zip_file" ]; then
                    unzip -q -o "$zip_file" && rm "$zip_file"
                fi
            done
            cd - > /dev/null
            echo -e "${GREEN}✅ Extracted${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to download${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📊 Download Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Downloaded: ${DOWNLOADED}${NC}"
echo -e "${YELLOW}⏭️  Skipped: ${SKIPPED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo -e "\n${BLUE}📁 Videos saved to: ${OUTPUT_DIR}${NC}"

# Count total video files
if [ -d "$OUTPUT_DIR" ]; then
    VIDEO_COUNT=$(find "$OUTPUT_DIR" -name "*.mp4" | wc -l | tr -d ' ')
    JSON_COUNT=$(find "$OUTPUT_DIR" -name "*.json" | wc -l | tr -d ' ')
    echo -e "${GREEN}📹 Total videos: ${VIDEO_COUNT}${NC}"
    echo -e "${GREEN}📄 Total metadata files: ${JSON_COUNT}${NC}"
fi

echo -e "\n${CYAN}✨ Download complete!${NC}\n"
