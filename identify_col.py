import sqlite3

def identify_column():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    search_term = "منطقة طبية"
    
    cursor.execute("PRAGMA table_info(minya_data)")
    columns = [col[1] for col in cursor.fetchall()]
    
    for col in columns:
        cursor.execute(f"SELECT COUNT(*) FROM minya_data WHERE `{col}` LIKE ?", (f"%{search_term}%",))
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"Column '{col}' has {count} matches.")

    conn.close()

if __name__ == "__main__":
    identify_column()
