import sqlite3
import os
import sys

# UTF-8 for Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def inspect_schema():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Columns
    cursor.execute("PRAGMA table_info(minya_data)")
    cols = cursor.fetchall()
    print("Columns in 'minya_data':")
    for c in cols:
        print(f"- {c[1]} ({c[2]})")
        
    # 2. Sample row
    cursor.execute("SELECT * FROM minya_data LIMIT 1")
    row = cursor.fetchone()
    if row:
        print("\nSample Row Data:")
        col_names = [c[1] for c in cols]
        for name, val in zip(col_names, row):
            print(f"  {name}: {val}")
            
    conn.close()

if __name__ == "__main__":
    inspect_schema()
