from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os
import re
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")

youtube = build("youtube", "v3", developerKey=API_KEY)


def resolve_channel_id_from_url(user_input):
    """
    Parse any YouTube channel URL format and resolve to channel ID.
    
    Accepts:
    - https://youtube.com/@ChannelHandle
    - https://youtube.com/channel/UCxxxxxxxxxx
    - https://youtube.com/c/ChannelName
    - https://youtube.com/user/Username
    - @ChannelHandle (just the handle)
    - UCxxxxxxxxxx (channel ID directly)
    
    Returns:
        channel_id (str) or None if not found
    """
    
    if not user_input:
        return None
    
    user_input = user_input.strip()
    
    # If it already looks like a channel ID (starts with UC), return it
    if re.match(r'^UC[\w-]{21}[AQww]$', user_input):
        return user_input
    
    # Extract from @handle format
    handle_match = re.search(r'@([\w-]+)', user_input)
    if handle_match:
        handle = handle_match.group(1)
        return search_channel_by_handle(handle)
    
    # Extract from /channel/ID format
    channel_match = re.search(r'/channel/([\w-]+)', user_input)
    if channel_match:
        return channel_match.group(1)
    
    # Extract from /c/name or /user/name format
    custom_url = re.search(r'/(c|user)/([\w-]+)', user_input)
    if custom_url:
        url_type, url_name = custom_url.groups()
        return search_channel_by_custom_url(url_type, url_name)
    
    # If user just typed a channel name or handle without @
    return search_channel_by_handle(user_input)


def search_channel_by_handle(handle):
    """Search for channel by @handle and return channel ID"""
    try:
        request = youtube.search().list(
            part="snippet",
            q=f"@{handle}",
            type="channel",
            maxResults=1
        )
        response = request.execute()
        
        if response.get("items"):
            return response["items"][0]["snippet"]["channelId"]
    except HttpError as e:
        print(f"Error searching for handle {handle}: {e}")
    
    return None


def search_channel_by_custom_url(url_type, url_name):
    """Search for channel by custom URL and return channel ID"""
    try:
        # Try searching for the channel
        request = youtube.search().list(
            part="snippet",
            q=url_name,
            type="channel",
            maxResults=10
        )
        response = request.execute()
        
        if response.get("items"):
            # Return first match (user should be more specific if needed)
            return response["items"][0]["snippet"]["channelId"]
    except HttpError as e:
        print(f"Error searching for custom URL {url_name}: {e}")
    
    return None


def get_channel_info(channel_id):
    """Get channel title and description"""
    try:
        request = youtube.channels().list(
            part="snippet",
            id=channel_id
        )
        response = request.execute()
        
        if response.get("items"):
            snippet = response["items"][0].get("snippet", {})
            return {
                "id": channel_id,
                "title": snippet.get("title", "Unknown"),
                "description": snippet.get("description", "")
            }
    except HttpError as e:
        print(f"Error getting channel info: {e}")
    
    return {"id": channel_id, "title": "Unknown", "description": ""}


def get_upload_playlist(channel_id):
    request = youtube.channels().list(
        part="contentDetails",
        id=channel_id
    )

    response = request.execute()
    
    if not response.get("items"):
        raise ValueError(f"Channel ID not found: {channel_id}")

    uploads_playlist = response["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    return uploads_playlist

def get_all_video_ids(playlist_id):

    video_ids = []
    next_page = None

    while True:

        request = youtube.playlistItems().list(
            part="snippet",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page
        )

        response = request.execute()

        for item in response["items"]:
            video_id = item["snippet"]["resourceId"]["videoId"]
            video_ids.append(video_id)

        next_page = response.get("nextPageToken")

        if not next_page:
            break

    return video_ids


def stream_video_ids(playlist_id):
    """Yield video IDs one by one and provide periodic progress counts.

    This generator is intended for use in streaming progress scenarios.
    It yields tuples of (video_id, count) where count is the total number
    of videos seen so far.
    """
    count = 0
    next_page = None

    while True:
        request = youtube.playlistItems().list(
            part="snippet",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page
        )
        response = request.execute()

        for item in response.get("items", []):
            count += 1
            video_id = item["snippet"]["resourceId"]["videoId"]
            yield video_id, count

        next_page = response.get("nextPageToken")
        if not next_page:
            break

def get_video_metadata(video_ids):

    videos = []

    for i in range(0, len(video_ids), 50):

        batch = ",".join(video_ids[i:i+50])

        request = youtube.videos().list(
            part="snippet,statistics,contentDetails",
            id=batch
        )

        response = request.execute()

        videos.extend(response["items"])

    return videos