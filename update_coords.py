import pandas as pd
import re
import math

file_path = 'C:/xampp/htdocs/gis/python_app/تحديث.xlsx'
df = pd.read_excel(file_path)

# Columns to update
lat_col = [c for c in df.columns if 'العرض' in c or 'Y' in c or 'Latitude' in c][0]
lon_col = [c for c in df.columns if 'الطول' in c or 'X' in c or 'Longitude' in c][0]
geo_col = [c for c in df.columns if 'موقع' in c and 'جغراف' in c][0]

updated_count = 0

for idx, row in df.iterrows():
    geo_val = str(row[geo_col]).strip()
    if pd.notna(geo_val) and ',' in geo_val:
        try:
            # Clean non-printable characters like \xa0
            geo_val = geo_val.replace('\xa0', ' ').replace('\u200b', '')
            parts = [p.strip() for p in geo_val.split(',')]
            
            lat_val = float(parts[0])
            lon_val = float(parts[1])
            
            df.at[idx, lat_col] = lat_val
            df.at[idx, lon_col] = lon_val
            updated_count += 1
        except Exception as e:
            print(f"Error parsing row {idx}: {geo_val} -> {e}")

# Save back to excel
df.to_excel(file_path, index=False)
print(f"Successfully updated {updated_count} locations in Excel.")

# Re-import to DB
import sqlite3
conn = sqlite3.connect('C:/xampp/htdocs/gis/python_app/database.db')
df.to_sql('minya_data', conn, if_exists='replace', index=False)
conn.close()
print("Successfully imported to database.db")
