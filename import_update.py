import sqlite3
import pandas as pd
import sys

def main():
    file_path = 'تحديث.xlsx'
    db_path = 'database.db'
    table_name = 'minya_data'
    
    print("Reading file...")
    df = pd.read_excel(file_path)
    
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    
    print(f"Writing {len(df)} rows to {table_name} table...")
    df.to_sql(table_name, conn, if_exists='replace', index=False)
    
    print("Update successful!")
    conn.close()

if __name__ == '__main__':
    main()
