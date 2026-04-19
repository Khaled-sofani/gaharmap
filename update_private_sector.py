import sqlite3
import os
import sys

# Ensure output is UTF-8 for Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for Python versions that don't support reconfigure
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# --- Configuration ---
DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def update_private_sector():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Count before
        cursor.execute("SELECT COUNT(*) FROM minya_data WHERE نوع_المنشأة = 'مستشفى علاج حر'")
        count_target = cursor.fetchone()[0]
        print(f"Found {count_target} facilities of type 'مستشفى علاج حر'.")
        
        if count_target == 0:
            print("No records to update.")
            return

        # 2. Update
        print("Updating affiliation to 'قطاع خاص'...")
        cursor.execute("""
            UPDATE minya_data 
            SET الجهة_التابعة = 'قطاع خاص'
            WHERE نوع_المنشأة = 'مستشفى علاج حر'
        """)
        
        updated_count = cursor.rowcount
        conn.commit()
        print(f"Successfully updated {updated_count} records.")
        
        # 3. Final verification (Printing ASCII only identifiers if Arabic fails)
        cursor.execute("SELECT COUNT(*) FROM minya_data WHERE نوع_المنشأة = 'مستشفى علاج حر' AND الجهة_التابعة = 'قطاع خاص'")
        verified_count = cursor.fetchone()[0]
        print(f"Verified: {verified_count} records now have 'قطاع خاص' as affiliation.")
            
        conn.close()
    except Exception as e:
        print(f"Error during update: {e}")

if __name__ == "__main__":
    update_private_sector()
