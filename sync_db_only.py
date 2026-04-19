import requests
import os

# --- Configuration ---
USERNAME = 'gaharmap'
TOKEN = '5f881df3120221462a895e5c344a532ec5c91820'
DOMAIN = 'gaharmap.pythonanywhere.com'
API_BASE = f'https://www.pythonanywhere.com/api/v0/user/{USERNAME}/'
REMOTE_PATH = '/home/gaharmap/python_app/database.db'
LOCAL_PATH = r'C:\xampp\htdocs\gis\python_app\database.db'

HEADERS = {'Authorization': f'Token {TOKEN}'}

def sync_db():
    print(f"Syncing {LOCAL_PATH} to {REMOTE_PATH}...")
    
    # Check local file size
    size = os.path.getsize(LOCAL_PATH)
    print(f"Local file size: {size} bytes")
    
    # Upload via API
    url = f"{API_BASE}files/path{REMOTE_PATH}"
    with open(LOCAL_PATH, 'rb') as f:
        r = requests.post(url, headers=HEADERS, files={'content': f})
    
    if r.status_code in [200, 201]:
        print("SUCCESS! Database file uploaded.")
        
        # Reload webapp
        print("Reloading web app...")
        reload_url = f"{API_BASE}webapps/{DOMAIN}/reload/"
        r_reload = requests.post(reload_url, headers=HEADERS)
        if r_reload.status_code == 200:
            print(f"Live at http://{DOMAIN}")
        else:
            print(f"Reload failed: {r_reload.text}")
    else:
        print(f"Upload failed: {r.status_code} {r.text}")

if __name__ == "__main__":
    sync_db()
