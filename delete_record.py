import sqlite3

def delete_record():
    db_path = "database.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Exact name from user
    target = "مخزن المطبوعات الرئيسى"
    print("Executing deletion for the specified record...")
    
    # Use exact match first
    query = "DELETE FROM minya_data WHERE اسم_المنشأة = ?"
    cursor.execute(query, (target,))
    affected = cursor.rowcount
    
    if affected == 0:
        # Fallback to LIKE if exact match fails
        query = "DELETE FROM minya_data WHERE اسم_المنشأة LIKE ?"
        cursor.execute(query, (f"%{target}%",))
        affected = cursor.rowcount
    
    conn.commit()
    conn.close()
    
    print(f"Success! Deleted {affected} record(s).")

if __name__ == "__main__":
    delete_record()
