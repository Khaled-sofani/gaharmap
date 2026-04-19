import sqlite3

def list_facilities():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Target phrase
    search_term = "منطقة طبية"
    
    # Search in columns likely to have the affiliation or name
    # We'll check all columns for matches to be comprehensive
    cursor.execute("PRAGMA table_info(minya_data)")
    columns = [col[1] for col in cursor.fetchall()]
    
    found_rows = []
    for col in columns:
        query = f"SELECT * FROM minya_data WHERE `{col}` LIKE ?"
        cursor.execute(query, (f"%{search_term}%",))
        matches = cursor.fetchall()
        for m in matches:
            if m not in found_rows:
                found_rows.append(m)
    
    print(f"Total Matches: {len(found_rows)}")
    print("-" * 50)
    for i, row in enumerate(found_rows, 1):
        # We'll print 'اسم_المنشأة' and 'الجهة_التابعة'
        name = row['اسم_المنشأة']
        entity = row['الجهة_التابعة']
        # To avoid Unicode error in Windows terminal, 
        # I'll write to a text file and tell the user to check it, 
        # OR I can just return the names in the response if I find them.
        # Actually, let's write to a report file.
        with open("delete_preview.txt", "a", encoding="utf-8") as f:
            f.write(f"{i}. {name} ({entity})\n")

    conn.close()

if __name__ == "__main__":
    import os
    if os.path.exists("delete_preview.txt"): os.remove("delete_preview.txt")
    list_facilities()
