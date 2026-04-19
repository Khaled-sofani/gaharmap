import sqlite3
import pandas as pd
import os

db_path = "database.db"
export_path = "GAHAR_Minya_Full_Export.xlsx"

try:
    conn = sqlite3.connect(db_path)
    
    # Read the main data table
    df = pd.read_sql_query("SELECT * FROM minya_data", conn)
    
    # Optional: rename columns to remove underscores for better readability in Excel
    df.columns = [col.replace('_', ' ') for col in df.columns]
    
    # Save to Excel
    df.to_excel(export_path, index=False, engine='openpyxl')
    
    print(f"تم تصدير البيانات بنجاح إلى: {os.path.abspath(export_path)}")
except Exception as e:
    print(f"حدث خطأ: {e}")
finally:
    if 'conn' in locals():
        conn.close()
