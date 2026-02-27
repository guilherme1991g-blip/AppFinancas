from exponent_server_sdk import (
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
import httpx
from typing import List, Optional

def send_push_notification(token: str, title: str, body: str, data: Optional[dict] = None):
    """
    Sends a push notification to a specific Expo Push Token.
    """
    if not token or not token.startswith("ExponentPushToken"):
        return

    try:
        response = PushClient().publish(
            PushMessage(to=token, title=title, body=body, data=data)
        )
    except PushServerError as exc:
        print(f"Notification Error: {exc.errors}")
        print(f"Response Data: {exc.response_data}")
    except (httpx.HTTPError, Exception) as exc:
        print(f"Connection Error: {exc}")

def send_multiple_notifications(messages: List[PushMessage]):
    """
    Sends a batch of notifications.
    """
    try:
        responses = PushClient().publish_multiple(messages)
        return responses
    except PushServerError as exc:
        print(f"Batch Notification Error: {exc.errors}")
    except Exception as exc:
        print(f"Unexpected Error: {exc}")
