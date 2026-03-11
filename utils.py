import isodate
import os
import json
from dotenv import load_dotenv
from enrichment import extract_guest_info
import re

load_dotenv()


def load_guest_cache():
    if not os.path.exists("guest_cache.json"):
        return {}

    with open("guest_cache.json", "r") as f:
        return json.load(f)


def duration_to_minutes(duration):

    try:
        seconds = isodate.parse_duration(duration).total_seconds()
        return round(seconds / 60, 2)

    except Exception:
        return 0

def extract_name_from_description(description):

    pattern = r"\b[A-Z][a-z]+ [A-Z][a-z]+\b"
    matches = re.findall(pattern, description)

    if matches:
        return matches[0]

    return ""


def clean_video_data(videos):

    episodes = []
    index = 1

    # Load cache once (faster)
    guest_cache = load_guest_cache()

    for video in videos:

        snippet = video.get("snippet", {})
        content = video.get("contentDetails", {})
        stats = video.get("statistics", {})

        title = snippet.get("title", "")
        title_word_count = len(title.split())

        description = snippet.get("description", "")
        publish_date = snippet.get("publishedAt", "")[:10]

        duration = duration_to_minutes(content.get("duration", "PT0S"))

        # Skip short clips
        if duration < 20:
            continue

        views = int(stats.get("viewCount", 0))
        likes = int(stats.get("likeCount", 0))
        comments = int(stats.get("commentCount", 0))

        # Engagement rate calculation
        engagement_rate = (likes + comments) / views if views else 0
        engagement_rate = round(engagement_rate * 100, 2)

        tags = ", ".join(snippet.get("tags", []))

        thumbnails = snippet.get("thumbnails", {})
        thumbnail = thumbnails.get("maxres", thumbnails.get("high", {})).get("url", "")

        video_id = video.get("id", "")
        video_url = f"https://youtube.com/watch?v={video_id}"

        episode = {
            "episode_number": index,
            "title": title,
            "description": description,
            "guest_name": "",
            "guest_role": "",
            "guest_company": "",
            "industry": "",
            "publish_date": publish_date,
            "duration": duration,
            "views": views,
            "likes": likes,
            "comments": comments,
            "tags": tags,
            "thumbnail": thumbnail,
            "video_url": video_url,
            "title_word_count": title_word_count,
            "engagement_rate": engagement_rate
        }

        # Guess guest from title
        guest_name_guess = extract_name_from_description(description)

        if not guest_name_guess:
            guest_name_guess = title.split(":")[0]

        if guest_name_guess in guest_cache:

            guest_info = guest_cache[guest_name_guess]

        else:

            guest_info = extract_guest_info(title, description)

        episode["guest_name"] = guest_info.get("name", "")
        episode["guest_role"] = guest_info.get("role", "")
        episode["guest_company"] = guest_info.get("company", "")
        episode["industry"] = guest_info.get("industry", "")

        episodes.append(episode)

        index += 1

    return episodes