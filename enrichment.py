import os
import json
import time
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CACHE_FILE = "guest_cache.json"


def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def extract_json(text):
    """
    Extract JSON from model response safely
    """

    match = re.search(r"\{.*\}", text, re.DOTALL)

    if match:
        return match.group(0)

    return None


def extract_guest_info(title, description, retries=0):

    MAX_RETRIES = 3

    cache = load_cache()

    prompt = f"""
Identify the main podcast guest.

Return ONLY valid JSON.

Title:
{title}

Description:
{description[:400]}

JSON format:

{{
"name": "",
"role": "",
"company": "",
"industry": ""
}}
"""

    try:

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        text = response.choices[0].message.content.strip()

        json_text = extract_json(text)

        if not json_text:
            raise ValueError("No JSON found in response")

        data = json.loads(json_text)

        guest_name = data.get("name", "")

        if guest_name:
            cache[guest_name] = data
            save_cache(cache)

        return data

    except Exception as e:

        print("OpenAI ERROR:", e)

        if retries >= MAX_RETRIES:
            return {"name": "", "role": "", "company": "", "industry": ""}

        time.sleep(3)
        return extract_guest_info(title, description, retries + 1)