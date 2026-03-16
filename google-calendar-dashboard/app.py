"""Flask app serving the Google Calendar dashboard."""

import os
from flask import Flask, jsonify, render_template
from calendar_service import fetch_events

app = Flask(__name__)


@app.route("/")
def dashboard():
    """Serve the main dashboard page."""
    return render_template("dashboard.html")


@app.route("/api/events")
def api_events():
    """Return upcoming events as JSON for the frontend to consume."""
    try:
        days = int(os.environ.get("CALENDAR_DAYS_AHEAD", 7))
        events = fetch_events(days_ahead=days)
        return jsonify({"events": events, "error": None})
    except FileNotFoundError as e:
        return jsonify({"events": [], "error": str(e)}), 500
    except Exception as e:
        return jsonify({"events": [], "error": f"Failed to fetch events: {e}"}), 500


if __name__ == "__main__":
    host = os.environ.get("DASHBOARD_HOST", "0.0.0.0")
    port = int(os.environ.get("DASHBOARD_PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host=host, port=port, debug=debug)
