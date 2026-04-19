import sqlite3

def final_bulk_delete():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List of exact names to delete as identified in list_targets.py
    targets = [
        "إداره مغاغه",
        "إداره العدوه",
        "إداره بنى مزار",
        "إداره المنيا",
        "المنطقه الاولي (للتأمين الصحي)",
        "إداره سمالوط",
        "المنطقه الثانيه (للتأمين الصحي)",
        "إداره الفكريه",
        "المنطقه الثالثه (للتأمين الصحي)",
        "إداره مطاى",
        "إداره ملوى"
    ]
    
    print("Executing final bulk deletion...")
    
    count = 0
    for name in targets:
        # Search for exact name in 'اسم_المنشأة' or 'الجهة_التابعة'
        cursor.execute("DELETE FROM minya_data WHERE اسم_المنشأة LIKE ?", (f"%{name}%",))
        count += cursor.rowcount
    
    conn.commit()
    conn.close()
    print(f"Final Success! Deleted {count} record(s).")

if __name__ == "__main__":
    final_bulk_delete()
