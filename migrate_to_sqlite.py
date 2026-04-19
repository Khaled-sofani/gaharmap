import mysql.connector
import sqlite3
import pandas as pd
import os

# --- Configuration ---
MYSQL_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "gis",
    "charset": "utf8mb4"
}
SQLITE_DB_NAME = "database.db"

def migrate():
    print("Starting Migration: MySQL -> SQLite")
    
    try:
        # 1. Connect to MySQL
        print("Connecting to MySQL (gis)...")
        mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
        
        # 2. Read table into Pandas
        print("Reading 'minya_data' table...")
        df = pd.read_sql("SELECT * FROM minya_data", mysql_conn)
        
        # 3. Connect to SQLite
        print("Creating/Connecting to SQLite (database.db)...")
        sqlite_conn = sqlite3.connect(SQLITE_DB_NAME)
        
        # 4. Write data to SQLite
        print("Writing data to SQLite...")
        df.to_sql("minya_data", sqlite_conn, if_exists="replace", index=False)
        
        # 5. Verify
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM minya_data")
        count = cursor.fetchone()[0]
        
        print(f"Success! Migrated {count} rows into {SQLITE_DB_NAME}")
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
    finally:
        if 'mysql_conn' in locals(): mysql_conn.close()
        if 'sqlite_conn' in locals(): sqlite_conn.close()

if __name__ == "__main__":
    migrate()
    # No input() here so it doesn't hang in background
