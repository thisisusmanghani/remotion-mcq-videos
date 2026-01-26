#!/usr/bin/env python3
"""
YouTube Shorts Auto-Upload Automation
- Monitors Google Drive folder for new videos
- Uses Gemini Pro for SEO optimization
- Uploads to YouTube with optimized metadata
"""

import os
import json
import time
import google.generativeai as genai
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import pickle

# ============= CONFIGURATION =============
DRIVE_FOLDER_ID = "1dQCg_4N5J3_Rr5N9Q1FWYYpIEU7jjG9F"
YOUTUBE_CHANNEL_ID = "UC7JqrO3uDX2UONUF0J81lhw"
GEMINI_API_KEY = "AIzaSyCm553WDcaIYiDYW79X7K1rE6q1ka-Ztmw"
CLIENT_SECRET_FILE = "temp/client_secret_422414474597-l8q5dm99uo7j5k857u3h9mrg1iu9q9oq.apps.googleusercontent.com.json"
TOKEN_FILE = "temp/youtube_tokens.json"
SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 
          'https://www.googleapis.com/auth/drive.readonly']

# Video metadata defaults
BASE_CATEGORY = "27"  # Education
DEFAULT_LANGUAGE = "en"
PRIVACY_STATUS = "public"  # or "private", "unlisted"

# ============= GEMINI PRO SETUP =============
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

def generate_seo_metadata(video_number, mcq_question=None):
    """Generate optimized title, description, and tags using Gemini Pro"""
    
    prompt = f"""
Create highly engaging YouTube Shorts metadata for a PPSC/FPSC exam preparation quiz video #{video_number}.

Requirements:
- Title: Catchy, under 60 characters, includes keywords like "PPSC", "MCQ", "Quiz"
- Description: 2-3 lines, SEO optimized, includes exam preparation keywords
- Tags: 15-20 relevant tags for Pakistani competitive exams, general knowledge, education
- Make it appealing for students, job seekers, and exam candidates
- Include trending education hashtags

{f"Question preview: {mcq_question}" if mcq_question else ""}

Return ONLY valid JSON in this format:
{{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}}
"""
    
    try:
        response = gemini_model.generate_content(prompt)
        # Extract JSON from response
        response_text = response.text.strip()
        
        # Try to parse JSON
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            json_str = response_text
            
        metadata = json.loads(json_str)
        
        # Add default tags if not enough
        base_tags = ["PPSC", "FPSC", "MCQs", "Pakistan", "Jobs", "Exams", "Quiz", 
                     "General Knowledge", "Competitive Exams", "CSS", "PMS"]
        all_tags = list(set(metadata.get("tags", []) + base_tags))[:30]
        
        return {
            "title": metadata.get("title", f"PPSC MCQ #{video_number}"),
            "description": metadata.get("description", ""),
            "tags": all_tags
        }
        
    except Exception as e:
        print(f"⚠️ Gemini error: {e}, using fallback metadata")
        return {
            "title": f"PPSC General Knowledge MCQ #{video_number} | Exam Preparation",
            "description": f"Test your knowledge with this PPSC/FPSC exam MCQ! Perfect for competitive exam preparation. #PPSC #FPSC #MCQs #{video_number}",
            "tags": ["PPSC", "FPSC", "MCQs", "Pakistan Jobs", "Exams", "Quiz", "CSS", "PMS", "General Knowledge"]
        }

def get_youtube_service():
    """Authenticate and return YouTube API service"""
    creds = None
    token_pickle = 'temp/youtube_token.pickle'
    
    # Load from pickle if exists
    if os.path.exists(token_pickle):
        with open(token_pickle, 'rb') as token:
            creds = pickle.load(token)
    
    # Refresh or re-authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing access token...")
            creds.refresh(Request())
        else:
            print("🔐 Starting OAuth authentication...")
            print("   A browser window will open for authorization.")
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Save credentials to pickle
        with open(token_pickle, 'wb') as token:
            pickle.dump(creds, token)
        print("✅ Authentication successful!")
    
    return build('youtube', 'v3', credentials=creds)

def upload_to_youtube(video_path, metadata):
    """Upload video to YouTube"""
    youtube = get_youtube_service()
    
    body = {
        'snippet': {
            'title': metadata['title'],
            'description': metadata['description'],
            'tags': metadata['tags'],
            'categoryId': BASE_CATEGORY,
            'defaultLanguage': DEFAULT_LANGUAGE,
        },
        'status': {
            'privacyStatus': PRIVACY_STATUS,
            'selfDeclaredMadeForKids': False,
        }
    }
    
    # Add #Shorts to description for YouTube Shorts
    if '#Shorts' not in body['snippet']['description']:
        body['snippet']['description'] += '\n\n#Shorts'
    
    media = MediaFileUpload(video_path, chunksize=-1, resumable=True, mimetype='video/mp4')
    
    print(f"📤 Uploading: {metadata['title']}")
    
    request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )
    
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"   Upload progress: {int(status.progress() * 100)}%")
    
    video_id = response['id']
    print(f"✅ Uploaded! Video ID: {video_id}")
    print(f"   URL: https://youtube.com/shorts/{video_id}")
    
    return video_id

def get_uploaded_videos_log():
    """Get list of already uploaded videos"""
    log_file = "temp/uploaded_videos.json"
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            return json.load(f)
    return []

def log_uploaded_video(video_name, video_id, metadata):
    """Log uploaded video"""
    log_file = "temp/uploaded_videos.json"
    uploaded = get_uploaded_videos_log()
    
    uploaded.append({
        'filename': video_name,
        'video_id': video_id,
        'url': f'https://youtube.com/shorts/{video_id}',
        'title': metadata['title'],
        'uploaded_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    })
    
    with open(log_file, 'w') as f:
        json.dump(uploaded, f, indent=2)

def process_local_videos(video_folder="output"):
    """Process videos from local folder"""
    if not os.path.exists(video_folder):
        print(f"❌ Video folder not found: {video_folder}")
        return
    
    videos = [f for f in os.listdir(video_folder) if f.endswith('.mp4')]
    uploaded_log = get_uploaded_videos_log()
    uploaded_names = [v['filename'] for v in uploaded_log]
    
    print(f"📁 Found {len(videos)} videos in {video_folder}/")
    print(f"✅ Already uploaded: {len(uploaded_names)}")
    
    for video_file in sorted(videos):
        if video_file in uploaded_names:
            print(f"⏭️  Skipping (already uploaded): {video_file}")
            continue
        
        video_path = os.path.join(video_folder, video_file)
        video_number = video_file.replace('Quiz', '').replace('.mp4', '')
        
        print(f"\n🎬 Processing: {video_file}")
        
        # Generate SEO metadata
        metadata = generate_seo_metadata(video_number)
        print(f"   Title: {metadata['title']}")
        print(f"   Tags: {', '.join(metadata['tags'][:5])}...")
        
        # Upload to YouTube
        try:
            video_id = upload_to_youtube(video_path, metadata)
            log_uploaded_video(video_file, video_id, metadata)
            
            # Wait between uploads to avoid rate limits
            print("   ⏳ Waiting 10 seconds before next upload...")
            time.sleep(10)
            
        except Exception as e:
            print(f"❌ Upload failed: {e}")
            continue

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 YouTube Shorts Auto-Upload Starting...")
    print("=" * 60)
    
    # Process local videos first
    process_local_videos("output")
    
    print("\n" + "=" * 60)
    print("✅ Upload session complete!")
    print("=" * 60)
