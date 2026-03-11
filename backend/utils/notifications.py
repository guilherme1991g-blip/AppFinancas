import os
import firebase_admin
from firebase_admin import credentials, messaging
from typing import List, Optional

# Path to your Firebase service account key JSON file
# You should set this in your .env file
CRED_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "./config/firebase-service-account.json")

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        if os.path.exists(CRED_PATH):
            cred = credentials.Certificate(CRED_PATH)
            firebase_admin.initialize_app(cred)
        else:
            print(f"⚠️ Firebase credentials not found at {CRED_PATH}. Push notifications will not be sent.")
except Exception as e:
    print(f"❌ Error initializing Firebase Admin: {e}")

def send_push_notification(token: str, title: str, body: str, data: Optional[dict] = None):
    """
    Sends a push notification to a specific FCM device token.
    """
    if not token or token.startswith("ExponentPushToken"):
        # We skip Expo tokens now as we are migrating to native FCM tokens
        return

    try:
        # Construct the message
        # Convert all data values to strings as required by FCM
        formatted_data = {k: str(v) for k, v in data.items()} if data else None
        
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=formatted_data,
            token=token,
        )

        # Send the message
        response = messaging.send(message)
        print(f"Successfully sent message: {response}")
        return response
    except Exception as e:
        print(f"❌ Error sending Firebase notification: {e}")
        return None

def send_multiple_notifications(tokens: List[str], title: str, body: str, data: Optional[dict] = None):
    """
    Sends a multicast message to multiple FCM device tokens.
    """
    if not tokens:
        return

    try:
        formatted_data = {k: str(v) for k, v in data.items()} if data else None
        
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=formatted_data,
            tokens=tokens,
        )
        
        response = messaging.send_multicast(message)
        print(f"Successfully sent {response.success_count} messages; {response.failure_count} errors.")
        return response
    except Exception as e:
        print(f"❌ Error sending multicast Firebase notification: {e}")
        return None
