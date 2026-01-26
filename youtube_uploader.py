#!/usr/bin/env python3
"""
YouTube Shorts Auto-Uploader with Gemini AI SEO Optimization
"""

import os
import json
import pickle
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import google.generativeai as genai

# YouTube API scopes
SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 
          'https://www.googleapis.com/auth/youtube.force-ssl']

class YouTubeUploader:
    def __init__(self, client_secrets_file, gemini_api_key):
        self.client_secrets_file = client_secrets_file
        self.youtube = None
        self.gemini_model = None
        
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        
    def authenticate(self):
        """Authenticate with YouTube API"""
        creds = None
        token_file = 'temp/youtube_token.pickle'
        
        # Load existing credentials
        if os.path.exists(token_file):
            with open(token_file, 'rb') as token:
                creds = pickle.load(token)
        
        # Refresh or create new credentials
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.client_secrets_file, SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save credentials
            with open(token_file, 'wb') as token:
                pickle.dump(creds, token)
        
        self.youtube = build('youtube', 'v3', credentials=creds)
        print("✓ Authenticated with YouTube")
        return True
    
    def generate_metadata(self, mcq_data):
        """Generate SEO-optimized metadata using Gemini"""
        prompt = f"""Generate YouTube Shorts metadata for this educational MCQ:

Question: {mcq_data['question']}
Options: {', '.join(mcq_data['options'])}
Correct Answer: {mcq_data['options'][mcq_data['correctAnswer']]}

Generate:
1. A catchy title (max 100 chars) for YouTube Shorts - make it engaging for kids and adults
2. A description (max 500 chars) with relevant emojis
3. 10 relevant tags (comma-separated)

Format as JSON:
{{
  "title": "...",
  "description": "...",
  "tags": "tag1, tag2, tag3..."
}}
"""
        
        try:
            response = self.gemini_model.generate_content(prompt)
            # Extract JSON from response
            text = response.text
            # Find JSON in response
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != 0:
                metadata = json.loads(text[start:end])
                return metadata
        except Exception as e:
            print(f"⚠ Gemini error: {e}, using default metadata")
        
        # Fallback metadata
        return {
            "title": f"🧠 Quiz Challenge: {mcq_data['question'][:60]}",
            "description": f"Test your knowledge! Can you answer this? #quiz #education #shorts",
            "tags": "quiz, education, general knowledge, mcq, test, shorts, learning"
        }
    
    def upload_video(self, video_file, mcq_data):
        """Upload video to YouTube"""
        if not self.youtube:
            print("✗ Not authenticated. Call authenticate() first.")
            return None
        
        # Generate metadata
        print(f"\n📝 Generating SEO metadata...")
        metadata = self.generate_metadata(mcq_data)
        
        print(f"Title: {metadata['title']}")
        print(f"Tags: {metadata['tags'][:80]}...")
        
        # Prepare video metadata
        body = {
            'snippet': {
                'title': metadata['title'],
                'description': metadata['description'],
                'tags': [tag.strip() for tag in metadata['tags'].split(',')],
                'categoryId': '27'  # Education
            },
            'status': {
                'privacyStatus': 'public',  # Change to 'private' or 'unlisted' if needed
                'selfDeclaredMadeForKids': False
            }
        }
        
        # Upload video
        media = MediaFileUpload(video_file, 
                               chunksize=-1, 
                               resumable=True,
                               mimetype='video/mp4')
        
        print(f"📤 Uploading: {os.path.basename(video_file)}")
        
        request = self.youtube.videos().insert(
            part='snippet,status',
            body=body,
            media_body=media
        )
        
        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                print(f"  Progress: {int(status.progress() * 100)}%")
        
        video_id = response['id']
        print(f"✓ Uploaded! Video ID: {video_id}")
        print(f"  URL: https://youtube.com/shorts/{video_id}")
        
        return video_id


def main():
    """Main upload workflow"""
    # Load credentials
    client_secrets = r'temp\client_secret_422414474597-l8q5dm99uo7j5k857u3h9mrg1iu9q9oq.apps.googleusercontent.com.json'
    gemini_key = 'AIzaSyCm553WDcaIYiDYW79X7K1rE6q1ka-Ztmw'
    
    # Initialize uploader
    uploader = YouTubeUploader(client_secrets, gemini_key)
    
    # Authenticate
    if not uploader.authenticate():
        print("✗ Authentication failed")
        return
    
    # Load MCQ data
    with open('mcqs_data/gk/gk_mcqs.json', 'r', encoding='utf-8') as f:
        mcqs = json.load(f)
    
    print(f"\n📚 Loaded {len(mcqs)} MCQs")
    
    # Test with first video
    test_video = 'output/Quiz1.mp4'
    if os.path.exists(test_video):
        print(f"\n🎬 Testing with: {test_video}")
        mcq_data = mcqs[0]
        
        video_id = uploader.upload_video(test_video, mcq_data)
        
        if video_id:
            print("\n✅ SUCCESS! Ready to upload more videos.")
            print("\nTo upload all videos, modify this script's main() function.")
    else:
        print(f"✗ Test video not found: {test_video}")


if __name__ == '__main__':
    main()
