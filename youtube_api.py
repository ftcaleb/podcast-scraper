from googleapiclient.discovery import build
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")

youtube = build("youtube", "v3", developerKey=API_KEY)


def get_upload_playlist(channel_id):

    request = youtube.channels().list(
        part="contentDetails",
        id=channel_id
    )

    response = request.execute()

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