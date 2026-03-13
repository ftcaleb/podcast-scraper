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
from scraper import scrape_channel
from excel_writer import ensure_excel_exists

# ============================================================================
# FLASK APP SETUP
# ============================================================================

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "data", "Podcast_Scraper_Database.xlsx")

# Ensure Excel file exists on startup
ensure_excel_exists()

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "PodScrape API is running"}), 200


# ============================================================================
# MAIN SCRAPE ENDPOINT (Server-Sent Events)
# ============================================================================

@app.route('/api/scrape', methods=['POST', 'GET'])
def scrape():
    """
    Scrape endpoint supporting both POST and GET for SSE.
    
    POST /api/scrape
    Request body: {"url": "https://youtube.com/@ChannelHandle"}
    
    GET /api/scrape?url=https://youtube.com/@ChannelHandle
    
    Returns: Server-Sent Events stream with progress updates
    """
    
    # Handle both POST body and GET query parameter
    if request.method == 'POST':
        data = request.get_json() or {}
        url = data.get('url', '').strip()
    else:  # GET
        url = request.args.get('url', '').strip()
    
    if not url:
        return jsonify({"status": "error", "message": "URL is required"}), 400
    
    # Define generator function for streaming
    def generate():
        """Yield progress updates as SSE messages"""
        
        def progress_callback(step_name, progress_percent):
            """Called by scraper with progress updates"""
            try:
                message = {
                    "type": "progress",
                    "step": step_name,
                    "progress": progress_percent
                }
                yield f"data: {json.dumps(message)}\n\n"
            except Exception as e:
                print(f"Error in progress_callback: {e}")
        
        try:
            # Run the scraper with progress callback
            result = scrape_channel(url, callback=progress_callback)
            
            # Send final result
            final_message = {
                "type": "complete",
                "status": result["status"],
                "message": result["message"],
                "channel_name": result["channel_name"],
                "episodes_count": result["episodes_count"],
                "download_url": "/api/download" if result["status"] == "success" else None
            }
            yield f"data: {json.dumps(final_message)}\n\n"
            
        except Exception as e:
            print(f"Scrape error: {e}")
            import traceback
            traceback.print_exc()
            error_message = {
                "type": "error",
                "status": "error",
                "message": str(e)
            }
            yield f"data: {json.dumps(error_message)}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


# ============================================================================
# DOWNLOAD ENDPOINT
# ============================================================================

@app.route('/api/download', methods=['GET'])
def download_excel():
    """
    GET /api/download
    
    Returns the Excel file for download
    """
    try:
        if not os.path.exists(EXCEL_PATH):
            return jsonify({"status": "error", "message": "Excel file not found"}), 404
        
        return send_file(
            EXCEL_PATH,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='Podcast_Scraper_Database.xlsx'
        )
    
    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({
            "status": "error",
            "message": f"Download failed: {str(e)}"
        }), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({"status": "error", "message": "Internal server error"}), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("=" * 70)
    print("PodScrape Backend API Server")
    print("=" * 70)
    print("✓ API running on: http://localhost:5000")
    print("✓ POST /api/scrape    — Scrape any YouTube channel (SSE streaming)")
    print("✓ GET  /api/download  — Download the Excel file")
    print("✓ GET  /health        — Health check")
    print("=" * 70)
    
    app.run(debug=True, host='localhost', port=5000)
