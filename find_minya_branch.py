import sqlite3

def find_target():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    target = "فرع المنيا (للتأمين الصحي)"
    print("Searching for matches...")
    
    # Check both name and affiliation
    cursor.execute("SELECT COUNT(*) FROM minya_data WHERE اسم_المنشأة LIKE ?", (f"%{target}%",))
    count = cursor.fetchone()[0]
    print(f"Matches for facility name: {count}")
    
    cursor.execute("SELECT COUNT(*) FROM minya_data WHERE الجهة_التابعة LIKE ?", (f"%{target}%",))
    count2 = cursor.fetchone()[0]
    print(f"Matches for affiliation: {count2}")

    conn.close()

if __name__ == "__main__":
    find_target()
