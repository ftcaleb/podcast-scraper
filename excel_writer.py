from openpyxl import load_workbook

EXCEL_PATH = "data/Podcast_Scraper_Database.xlsx"


def write_to_excel(episodes, podcast_name):

    wb = load_workbook(EXCEL_PATH)
    ws = wb["Episode Database"]

    # ---------------------------------------
    # Load existing URLs to avoid duplicates
    # ---------------------------------------
    existing_urls = set()

    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[15]:
            existing_urls.add(row[15])

    # ---------------------------------------
    # Find next available row
    # ---------------------------------------
    next_row = ws.max_row + 1

    if next_row < 2:
        next_row = 2

    # ---------------------------------------
    # Insert episode data
    # ---------------------------------------
    for episode in episodes:

        if episode["video_url"] in existing_urls:
            continue

        ws.cell(row=next_row, column=1).value = episode["episode_number"]
        ws.cell(row=next_row, column=2).value = podcast_name
        ws.cell(row=next_row, column=3).value = episode["title"]

        ws.cell(row=next_row, column=4).value = episode["guest_name"]
        ws.cell(row=next_row, column=5).value = episode["guest_role"]
        ws.cell(row=next_row, column=6).value = episode["guest_company"]
        ws.cell(row=next_row, column=7).value = episode["industry"]

        ws.cell(row=next_row, column=8).value = episode["description"]

        ws.cell(row=next_row, column=9).value = episode["publish_date"]
        ws.cell(row=next_row, column=10).value = episode["duration"]

        ws.cell(row=next_row, column=11).value = episode["views"]
        ws.cell(row=next_row, column=12).value = episode["likes"]
        ws.cell(row=next_row, column=13).value = episode["comments"]

        ws.cell(row=next_row, column=14).value = episode["thumbnail"]
        ws.cell(row=next_row, column=15).value = episode["title_word_count"]

        ws.cell(row=next_row, column=16).value = episode["video_url"]
        ws.cell(row=next_row, column=17).value = episode["tags"]

        ws.cell(row=next_row, column=18).value = episode["engagement_rate"]

        next_row += 1

    wb.save(EXCEL_PATH)