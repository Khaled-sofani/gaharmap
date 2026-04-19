import pandas as pd

df = pd.read_excel('C:/xampp/htdocs/gis/python_app/تحديث.xlsx')

cols = [c for c in df.columns if 'موقع' in c or 'جغراف' in c or 'lat' in c.lower() or 'lon' in c.lower() or 'طول' in c or 'عرض' in c or 'x' in c.lower() or 'y' in c.lower()]

with open('C:/xampp/htdocs/gis/python_app/check_excel.txt', 'w', encoding='utf-8') as f:
    f.write("All columns:\n")
    f.write("\n".join(df.columns) + "\n\n")
    f.write("Target columns:\n")
    f.write(", ".join(cols) + "\n\n")
    if cols:
        f.write(df[cols].dropna().head().to_string())
