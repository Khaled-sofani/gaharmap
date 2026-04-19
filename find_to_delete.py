import sqlite3

def find_record():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Use LIKE for flexibility
    query = "SELECT * FROM minya_data WHERE اسم_المنشأة LIKE '%مخزن المطبوعات الرئيسى%'"
    cursor.execute(query)
    rows = cursor.fetchall()
    
    if not rows:
        print("No record found matching: مخزن المطبوعات الرئيسى")
    else:
        print(f"Found {len(rows)} record(s):")
        for row in rows:
            print(row)
            
    conn.close()

if __name__ == "__main__":
    find_record()
