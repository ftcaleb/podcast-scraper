"""
YouTube Podcast Scraper - Core Scraping Logic
Refactored to support ANY YouTube channel via dynamically resolved channel ID
"""

from youtube_api import (
    get_upload_playlist,
    get_all_video_ids,
    get_video_metadata,
    resolve_channel_id_from_url,
    stream_video_ids
)
from utils import clean_video_data
from excel_writer import write_to_excel


def scrape_channel_stream(channel_url_or_id):
    """Generator that yields progress events for each stage of the scrape.

    Each yielded dict matches the frontend contract:
      {
        "stage": "Stage Name",
        "progress": 12,
        "status": "active" | "done" | "error",
        "detail": "Optional detail text",
        "download_url": "/api/download" (on completion)
      }
    """

    try:
        # Stage 1: Connecting to backend
        yield {"stage": "Connecting to backend", "progress": 5, "status": "active"}
        yield {"stage": "Connecting to backend", "progress": 5, "status": "done"}

        # Stage 2: Resolving channel identity
        yield {"stage": "Resolving channel identity", "progress": 12, "status": "active"}
        channel_id = resolve_channel_id_from_url(channel_url_or_id)

        if not channel_id:
            raise ValueError(f"Could not resolve channel ID from: {channel_url_or_id}")

        yield {"stage": "Resolving channel identity", "progress": 12, "status": "done", "detail": f"Resolved: {channel_id}"}

        # Stage 3: Fetching upload playlist
        yield {"stage": "Fetching upload playlist", "progress": 22, "status": "active"}
        playlist_id = get_upload_playlist(channel_id)
        yield {"stage": "Fetching upload playlist", "progress": 22, "status": "done"}

        # Stage 4: Collecting all video IDs
        yield {"stage": "Collecting all video IDs", "progress": 35, "status": "active"}

        video_ids = []
        for video_id, count in stream_video_ids(playlist_id):
            video_ids.append(video_id)

            # Emit count updates every 50 videos
            if count % 50 == 0:
                yield {
                    "stage": "Collecting all video IDs",
                    "progress": 35,
                    "status": "active",
                    "detail": f"Found {count} videos so far..."
                }

        if not video_ids:
            yield {
                "stage": "Collecting all video IDs",
                "progress": 35,
                "status": "error",
                "detail": "No videos found in channel"
            }
            return

        yield {
            "stage": "Collecting all video IDs",
            "progress": 35,
            "status": "done",
            "detail": f"Found {len(video_ids)} videos"
        }

        # Stage 5: Fetching video metadata
        yield {"stage": "Fetching video metadata", "progress": 52, "status": "active", "detail": f"Fetching metadata for {len(video_ids)} videos..."}
        videos = get_video_metadata(video_ids)
        yield {"stage": "Fetching video metadata", "progress": 52, "status": "done", "detail": f"Received metadata for {len(videos)} videos"}

        # Stage 6: Running AI enrichment pass
        yield {"stage": "Running AI enrichment pass", "progress": 70, "status": "active"}
        episodes = clean_video_data(videos)
        yield {"stage": "Running AI enrichment pass", "progress": 70, "status": "done", "detail": f"Enriched {len(episodes)} episodes"}

        # Stage 7: Writing to spreadsheet
        from youtube_api import get_channel_info
        channel_info = get_channel_info(channel_id)
        channel_name = channel_info.get("title", "Unknown Channel")

        yield {"stage": "Writing to spreadsheet", "progress": 88, "status": "active"}
        write_to_excel(episodes, channel_name)
        yield {"stage": "Writing to spreadsheet", "progress": 88, "status": "done"}

        # Stage 8: Finalising your download
        yield {"stage": "Finalising your download", "progress": 95, "status": "active"}
        yield {"stage": "Finalising your download", "progress": 95, "status": "done"}

        # Stage 9: Complete
        yield {
            "stage": "Complete",
            "progress": 100,
            "status": "done",
            "download_url": "/api/download",
            "channel_name": channel_name,
            "episodes_count": len(episodes)
        }

    except Exception as e:
        yield {
            "stage": "Error",
            "progress": 0,
            "status": "error",
            "detail": str(e)
        }


def scrape_channel(channel_url_or_id, callback=None):
    """Scrape a YouTube channel and write episodes to Excel.

    This helper consumes the streaming scraper and optionally reports
    progress via a callback.
    """

    result = {
        "status": "error",
        "message": "Unknown error",
        "channel_name": "Unknown",
        "episodes_count": 0
    }

    for event in scrape_channel_stream(channel_url_or_id):
        # Translate streaming events into callback invocations
        if callback and isinstance(event, dict):
            stage = event.get("stage")
            progress = event.get("progress")
            if stage and progress is not None:
                callback(stage, progress)

        # Capture completion / error for return value
        if event.get("stage") == "Complete" and event.get("status") == "done":
            result = {
                "status": "success",
                "message": f"Scraped {event.get('episodes_count', 0)} episodes",
                "channel_name": event.get("channel_name", "Unknown"),
                "episodes_count": event.get("episodes_count", 0)
            }

        if event.get("status") == "error":
            result = {
                "status": "error",
                "message": event.get("detail", "An error occurred"),
                "channel_name": "Unknown",
                "episodes_count": 0
            }

    return result


# Allow CLI execution for testing
if __name__ == '__main__':
    result = scrape_channel("@DiaryOfACEO", callback=lambda s, p: print(f"[{p}%] {s}"))
    print(f"\nResult: {result}")