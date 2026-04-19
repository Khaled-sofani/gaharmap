import requests

# --- Configuration ---
USERNAME = 'gaharmap'
TOKEN = '5f881df3120221462a895e5c344a532ec5c91820'
API_BASE = f'https://www.pythonanywhere.com/api/v0/user/{USERNAME}/'
HEADERS = {'Authorization': f'Token {TOKEN}'}

def kill_all_consoles():
    print("Fetching active consoles...")
    r = requests.get(f"{API_BASE}consoles/", headers=HEADERS)
    if r.status_code == 200:
        consoles = r.json()
        print(f"Found {len(consoles)} console(s). Killing them...")
        for c in consoles:
            cid = c['id']
            r_del = requests.delete(f"{API_BASE}consoles/{cid}/", headers=HEADERS)
            if r_del.status_code == 204:
                print(f"Killed console {cid}")
            else:
                print(f"Failed to kill console {cid}: {r_del.text}")
    else:
        print(f"Failed to fetch consoles: {r.status_code} {r.text}")

if __name__ == "__main__":
    kill_all_consoles()
