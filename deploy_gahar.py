# -*- coding: utf-8 -*-
import requests
import os
import time
import zipfile

# --- Configuration ---
USERNAME = 'gahar'
TOKEN = '637c821966bbe74968fc29ba67726ecf8920cc7e'
DOMAIN = f'{USERNAME}.pythonanywhere.com'
API_BASE = f'https://www.pythonanywhere.com/api/v0/user/{USERNAME}/'
HEADERS = {'Authorization': f'Token {TOKEN}'}

LOCAL_DIR = r"C:\xampp\htdocs\gis\python_app"
ZIP_NAME = "python_app.zip"
REMOTE_PATH = f"/home/{USERNAME}/python_app.zip"
PROJECT_PATH = f"/home/{USERNAME}/python_app"

def create_zip():
    print(f"Creating zip file {ZIP_NAME}...")
    with zipfile.ZipFile(ZIP_NAME, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(LOCAL_DIR):
            # Skip git and cache folders
            if '.git' in root or '__pycache__' in root:
                continue
            for file in files:
                if file == ZIP_NAME or file.endswith('.pyc'):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, LOCAL_DIR)
                zipf.write(file_path, arcname)
    print("Zip created.")

def upload_file(local_path, remote_path):
    print(f"Uploading {local_path} -> {remote_path}...")
    url = f"{API_BASE}files/path{remote_path}"
    with open(local_path, 'rb') as f:
        r = requests.post(url, headers=HEADERS, files={'content': f})
    if r.status_code in [200, 201]:
        print(f"Success! Uploaded {os.path.basename(local_path)}")
        return True
    print(f"Error uploading: {r.status_code} {r.text}")
    return False

def run_bash(command):
    print(f"Running bash command: {command}...")
    url = f"{API_BASE}consoles/"
    r = requests.post(url, headers=HEADERS, data={'executable': '/bin/bash'})
    if r.status_code != 201:
        print(f"Error creating console: {r.text}")
        return False
    console_id = r.json()['id']
    time.sleep(5)
    
    url = f"{API_BASE}consoles/{console_id}/send_input/"
    requests.post(url, headers=HEADERS, data={'input': f"{command}\nexit\n"})
    time.sleep(10)
    
    try:
        requests.delete(f"{API_BASE}consoles/{console_id}/", headers=HEADERS)
    except:
        pass
    return True

def update_wsgi():
    print("Updating WSGI configuration...")
    wsgi_path = f"/var/www/{USERNAME.replace('.', '_')}_pythonanywhere_com_wsgi.py"
    url = f"{API_BASE}files/path{wsgi_path}"
    content = f"""import sys
import os

path = '{PROJECT_PATH}'
if path not in sys.path:
    sys.path.append(path)

from app import app as application
"""
    r = requests.post(url, headers=HEADERS, files={'content': content})
    if r.status_code in [200, 201]:
        print("WSGI updated.")
        return True
    print(f"WSGI update failed: {r.text}")
    return False

def reload_webapp():
    print("Reloading web app...")
    url = f"{API_BASE}webapps/{DOMAIN}/reload/"
    r = requests.post(url, headers=HEADERS)
    if r.status_code == 200:
        print(f"SUCCESS! App reloaded at http://{DOMAIN}")
        return True
    print(f"Reload failed: {r.text}")
    return False

if __name__ == "__main__":
    create_zip()
    if upload_file(ZIP_NAME, REMOTE_PATH):
        run_bash(f"mkdir -p {PROJECT_PATH} && unzip -o {REMOTE_PATH} -d {PROJECT_PATH}")
        update_wsgi()
        reload_webapp()
        # Cleanup
        if os.path.exists(ZIP_NAME):
            os.remove(ZIP_NAME)
