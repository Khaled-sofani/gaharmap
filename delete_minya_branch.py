import sqlite3

def delete_minya_branch():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    target = "فرع المنيا (للتأمين الصحي)"
    print("Executing deletion for 'Minya Branch'...")
    
    cursor.execute("DELETE FROM minya_data WHERE اسم_المنشأة LIKE ?", (f"%{target}%",))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"Success! Deleted {affected} record(s).")

if __name__ == "__main__":
    delete_minya_branch()
