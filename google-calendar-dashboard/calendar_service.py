"""Google Calendar API service module.

Setup:
1. Go to https://console.cloud.google.com/
2. Create a project (or select existing)
3. Enable "Google Calendar API"
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Application type: "Desktop app"
6. Download the JSON and save it as "credentials.json" in this directory
"""

import os
import datetime
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
BASE_DIR = Path(__file__).parent
TOKEN_PATH = BASE_DIR / "token.json"
CREDENTIALS_PATH = BASE_DIR / "credentials.json"


def get_credentials():
    """Get valid Google API credentials, refreshing or prompting login as needed."""
    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_PATH.exists():
                raise FileNotFoundError(
                    "credentials.json not found. Download it from Google Cloud Console "
                    "and place it in the google-calendar-dashboard/ directory."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_PATH), SCOPES
            )
            creds = flow.run_local_server(port=0)

        TOKEN_PATH.write_text(creds.to_json())

    return creds


def get_calendar_service():
    """Build and return a Google Calendar API service object."""
    creds = get_credentials()
    return build("calendar", "v3", credentials=creds)


def fetch_events(days_ahead=7, max_results=50):
    """Fetch upcoming calendar events.

    Args:
        days_ahead: Number of days into the future to fetch.
        max_results: Maximum number of events to return.

    Returns:
        List of event dicts with normalized fields.
    """
    service = get_calendar_service()

    now = datetime.datetime.utcnow()
    time_min = now.isoformat() + "Z"
    time_max = (now + datetime.timedelta(days=days_ahead)).isoformat() + "Z"

    # Get all calendars the user has access to
    calendars_result = service.calendarList().list().execute()
    calendars = calendars_result.get("items", [])

    all_events = []

    for cal in calendars:
        cal_id = cal["id"]
        cal_color = cal.get("backgroundColor", "#4285f4")
        cal_name = cal.get("summary", "Unknown")

        try:
            events_result = (
                service.events()
                .list(
                    calendarId=cal_id,
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=max_results,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
        except Exception:
            continue

        for event in events_result.get("items", []):
            start = event["start"].get("dateTime", event["start"].get("date"))
            end = event["end"].get("dateTime", event["end"].get("date"))

            all_events.append(
                {
                    "id": event.get("id", ""),
                    "summary": event.get("summary", "(No title)"),
                    "description": event.get("description", ""),
                    "location": event.get("location", ""),
                    "start": start,
                    "end": end,
                    "all_day": "date" in event["start"],
                    "calendar_name": cal_name,
                    "calendar_color": cal_color,
                    "html_link": event.get("htmlLink", ""),
                }
            )

    all_events.sort(key=lambda e: e["start"])
    return all_events
