from youtube_api import (
    get_upload_playlist,
    get_all_video_ids,
    get_video_metadata
)

from utils import clean_video_data
from excel_writer import write_to_excel

CHANNEL_ID = "UCGq-a57w-aPwyi3pW7XLiHw"
PODCAST_NAME = "Diary of a CEO"

print("Starting scraper...")

playlist_id = get_upload_playlist(CHANNEL_ID)

print("Uploads Playlist ID:", playlist_id)

video_ids = get_all_video_ids(playlist_id)

print("Total videos found:", len(video_ids))

print("Fetching video metadata...")

videos = get_video_metadata(video_ids)

print("Total metadata records:", len(videos))

# --- TEST MODE ---
TEST_MODE = False  # set True to only process a few videos
 # only process the first 5 videos

print(f"Total videos to process: {len(videos)}")

episodes = clean_video_data(videos)

print("Episodes formatted:", len(episodes))

print("Writing to Excel...")

write_to_excel(episodes, PODCAST_NAME)

print("Excel file updated successfully.")