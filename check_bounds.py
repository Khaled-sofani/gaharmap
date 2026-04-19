import sqlite3
import pandas as pd
conn = sqlite3.connect('database.db')
df = pd.read_sql('SELECT `خط_العرض__Y___Latitude_`, `خط_الطول__X___Longitude_`, `اسم_المنشأة`, `المحافظة` FROM minya_data', conn)
df["lat"] = pd.to_numeric(df["خط_العرض__Y___Latitude_"], errors="coerce")
df["lng"] = pd.to_numeric(df["خط_الطول__X___Longitude_"], errors="coerce")

out_of_bounds = df[((df.lat < 27.5) | (df.lat > 28.8) | (df.lng < 28.0) | (df.lng > 31.5))]

with open('bounds_report.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total rows: {len(df)}\n")
    f.write(f"Null coords: {df.lat.isna().sum()}\n")
    f.write(f"Out of Minya bounds (>28.8 or <27.5 Lat, >31.5 or <28.0 Lng): {len(out_of_bounds)}\n")
    for _, row in out_of_bounds.iterrows():
        f.write(f"{row['اسم_المنشأة']} ({row['المحافظة']}) - {row['lat']}, {row['lng']}\n")
