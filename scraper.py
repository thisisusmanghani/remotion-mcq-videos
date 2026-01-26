import requests
from bs4 import BeautifulSoup
import json
import time
import re

def extract_mcqs_from_page(soup):
    """Extract MCQs from BeautifulSoup object"""
    mcqs = []
    
    # Find all article blocks
    articles = soup.find_all('article')
    
    for article in articles:
        try:
            # Extract question from h2.post-title
            question_elem = article.find('h2', class_='post-title')
            if not question_elem:
                continue
            question_text = question_elem.get_text(strip=True)
            
            # Extract options from excerpt div
            excerpt = article.find('div', class_='excerpt')
            if not excerpt:
                continue
            
            # Get all text and split by <br>
            options_text = excerpt.find('p')
            if not options_text:
                continue
            
            # Parse options
            options = []
            correct_index = -1
            option_lines = str(options_text).split('<br/>')
            
            for idx, line in enumerate(option_lines):
                # Clean HTML tags
                clean_line = BeautifulSoup(line, 'html.parser').get_text(strip=True)
                
                # Check if it's an option (starts with A., B., C., or D.)
                match = re.match(r'^([A-D])\.\s*(.+)$', clean_line)
                if match:
                    letter, option_text = match.groups()
                    options.append(option_text)
                    
                    # Check if this option was in <strong> tag (correct answer)
                    if '<strong>' in line and letter in line:
                        correct_index = len(options) - 1
            
            # Only add if we have exactly 4 options and found correct answer
            if len(options) == 4 and correct_index >= 0:
                mcqs.append({
                    "question": question_text,
                    "options": options,
                    "correctAnswer": correct_index
                })
        except Exception as e:
            # Skip problematic entries
            continue
    
    return mcqs

def scrape_page(page_num):
    """Scrape a single page"""
    if page_num == 1:
        url = "https://pakmcqs.com/category/general_knowledge_mcqs"
    else:
        url = f"https://pakmcqs.com/category/general_knowledge_mcqs/page/{page_num}"
    
    try:
        print(f"Page {page_num:3d}...", end=" ")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            mcqs = extract_mcqs_from_page(soup)
            print(f"✓ {len(mcqs):2d} MCQs")
            return mcqs
        else:
            print(f"✗ HTTP {response.status_code}")
            return []
    except Exception as e:
        print(f"✗ {str(e)[:30]}")
        return []

def main():
    # Load existing data if available
    output_file = 'mcqs_data/gk/gk_mcqs.json'
    try:
        with open(output_file, 'r', encoding='utf-8') as f:
            all_mcqs = json.load(f)
        print(f"Loaded {len(all_mcqs)} existing MCQs")
    except FileNotFoundError:
        all_mcqs = []
    
    start_page = 54  # Resume from page 54 (stopped at 53)
    end_page = 590  # All pages
    
    print("=" * 60)
    print(f"Scraping PakMcqs.com: Pages {start_page} to {end_page}")
    print(f"Starting with {len(all_mcqs)} existing MCQs")
    print("=" * 60)
    
    for page_num in range(start_page, end_page + 1):
        try:
            mcqs = scrape_page(page_num)
            all_mcqs.extend(mcqs)
            
            # Save progress every 50 pages
            if page_num % 50 == 0:
                with open('mcqs_data/gk/mcqs_progress.json', 'w', encoding='utf-8') as f:
                    json.dump(all_mcqs, f, ensure_ascii=False, indent=2)
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(all_mcqs, f, ensure_ascii=False, indent=2)
                print(f"\n>>> Progress saved: {len(all_mcqs)} total MCQs <<<\n")
            
            # Don't hammer the server
            time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n\n>>> Stopped by user <<<")
            break
        except Exception as e:
            print(f"✗ Error on page {page_num}: {str(e)[:50]}")
            continue
    
    # Save final data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_mcqs, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print(f"✓ COMPLETE! Total MCQs: {len(all_mcqs)}")
    print(f"✓ Saved to: {output_file}")
    print("=" * 60)
    
    # Show sample
    if all_mcqs:
        print("\nSample MCQ:")
        sample = all_mcqs[0]
        print(f"Q: {sample['question']}")
        for i, opt in enumerate(sample['options']):
            marker = "✓" if i == sample['correctAnswer'] else " "
            print(f"  {chr(65+i)}. {opt} {marker}")
    
    return all_mcqs

if __name__ == "__main__":
    main()
