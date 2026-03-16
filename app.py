"""
PodScrape Backend Flask Server
Provides REST API endpoints with Server-Sent Events (SSE) for real-time progress streaming
"""

import os
import json
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, stream_with_context, send_file
from flask_cors import CORS

# Load environment variables at startup
load_dotenv()

# Import scraper modules
from scraper import scrape_channel, scrape_channel_stream
from excel_writer import ensure_excel_exists

# ============================================================================
# FLASK APP SETUP
# ============================================================================

app = Flask(__name__)
CORS(app)

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "data", "Podcast_Scraper_Database.xlsx")

# Ensure Excel file exists on startup
ensure_excel_exists()

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "message": "PodScrape API is running"
    }), 200


# ============================================================================
# MAIN SCRAPE ENDPOINT (Server-Sent Events)
# ============================================================================

@app.route('/api/scrape', methods=['POST', 'GET'])
def scrape():

    if request.method == 'POST':
        data = request.get_json() or {}
        url = data.get('url', '').strip()
    else:
        url = request.args.get('url', '').strip()

    if not url:
        return jsonify({
            "status": "error",
            "message": "URL is required"
        }), 400

    def generate():

        def sse_payload(payload):
            return f"data: {json.dumps(payload)}\n\n"

        try:
            for event in scrape_channel_stream(url):
                # Ensure payload is a dict; ignore unexpected yields
                if not isinstance(event, dict):
                    continue

                yield sse_payload(event)

        except Exception as e:
            import traceback
            traceback.print_exc()

            error_message = {
                "stage": "Error",
                "progress": 0,
                "status": "error",
                "detail": str(e)
            }
            yield sse_payload(error_message)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


# ============================================================================
# DOWNLOAD ENDPOINT
# ============================================================================

@app.route('/api/download', methods=['GET'])
def download_excel():

    try:
        if not os.path.exists(EXCEL_PATH):
            return jsonify({
                "status": "error",
                "message": "Excel file not found"
            }), 404

        return send_file(
            EXCEL_PATH,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='Podcast_Scraper_Database.xlsx'
        )

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Download failed: {str(e)}"
        }), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "status": "error",
        "message": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({
        "status": "error",
        "message": "Internal server error"
    }), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":

    print("=" * 70)
    print("PodScrape Backend API Server")
    print("=" * 70)
    print("✓ POST /api/scrape    — Scrape any YouTube channel (SSE streaming)")
    print("✓ GET  /api/download  — Download the Excel file")
    print("✓ GET  /health        — Health check")
    print("=" * 70)

    # Render provides the PORT environment variable
    # Default to 5000 so it matches the frontend dev setup
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )