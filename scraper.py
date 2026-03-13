"""
YouTube Podcast Scraper - Core Scraping Logic
Refactored to support ANY YouTube channel via dynamically resolved channel ID
"""

from youtube_api import (
    get_upload_playlist,
    get_all_video_ids,
    get_video_metadata,
    resolve_channel_id_from_url
)
from utils import clean_video_data
from excel_writer import write_to_excel


def scrape_channel(channel_url_or_id, callback=None):
    """
    Scrape a YouTube channel and write episodes to Excel.
    
    Args:
        channel_url_or_id: Can be any format:
            - https://youtube.com/@ChannelHandle
            - https://youtube.com/channel/UCxxxxxxxxxx
            - https://youtube.com/c/ChannelName
            - https://youtube.com/user/Username
            - Just a handle like @ChannelHandle
        callback: Optional function(step_name, progress) for progress tracking
    
    Returns:
        dict with status, channel_name, episodes_count
    """
    
    def progress(step, percent):
        if callback:
            callback(step, percent)
    
    try:
        progress("Resolving channel ID...", 10)
        channel_id = resolve_channel_id_from_url(channel_url_or_id)
        
        if not channel_id:
            raise ValueError(f"Could not resolve channel ID from: {channel_url_or_id}")
        
        progress("Fetching channel info...", 15)
        from youtube_api import get_channel_info
        channel_info = get_channel_info(channel_id)
        channel_name = channel_info.get("title", "Unknown Channel")
        
        progress("Fetching upload playlist...", 20)
        playlist_id = get_upload_playlist(channel_id)
        
        progress("Collecting video IDs...", 30)
        video_ids = get_all_video_ids(playlist_id)
        
        if not video_ids:
            return {
                "status": "error",
                "message": f"No videos found in channel",
                "channel_name": channel_name,
                "episodes_count": 0
            }
        
        progress(f"Fetching metadata for {len(video_ids)} videos...", 50)
        videos = get_video_metadata(video_ids)
        
        progress("Cleaning and enriching data...", 70)
        episodes = clean_video_data(videos)
        
        progress("Writing to Excel...", 90)
        write_to_excel(episodes, channel_name)
        
        progress("Complete", 100)
        
        return {
            "status": "success",
            "message": f"Scraped {len(episodes)} episodes",
            "channel_name": channel_name,
            "episodes_count": len(episodes)
        }
    
    except Exception as e:
        print(f"ERROR in scrape_channel: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error", 
            "message": str(e),
            "channel_name": "Unknown",
            "episodes_count": 0
        }


# Allow CLI execution for testing
if __name__ == '__main__':
    result = scrape_channel("@DiaryOfACEO", callback=lambda s, p: print(f"[{p}%] {s}"))
    print(f"\nResult: {result}")