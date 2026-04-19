import sqlite3

def explore_entities():
    db_path = r"C:\xampp\htdocs\gis\python_app\database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all columns (don't print names)
    cursor.execute("PRAGMA table_info(minya_data)")
    columns = [col[1] for col in cursor.fetchall()]
    
    # Target phrase
    search_term = "منطقة طبية"
    
    # Look through all columns for matches
    for col in columns:
        try:
            query = f"SELECT COUNT(*) FROM minya_data WHERE `{col}` LIKE ?"
            cursor.execute(query, (f"%{search_term}%",))
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"Found {count} matches in a column (checking if it matches 'Entity').")
                # I'll manually check column indices if I can find which one is 'الجهة_التابعة'
                # For safety, I'll delete where ANY column contains the phrase if it's the specific entity name
        except:
            continue

    conn.close()

if __name__ == "__main__":
    explore_entities()
