import sqlite3
import os
import sys

# UTF-8 for Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def add_military_hospital():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Prepare data
        data = {
            'اسم_المنشأة': 'مستشفى المنيا العسكرى',
            'المحافظة': 'المنيا',
            'نوع_المنشأة': 'مستشفى',
            'المركز': 'المنيا',
            'الادارة': 'المنيا',
            'الجهة_التابعة': 'القوات المسلحة',
            'عدد_الاسرة': '50',
            'اجمالى_عدد_الاسرة': '50',
            'عدد_الاطباء_البشريين': '13',
            'عدد_الممرضين': '25',
            'اجمالى_المهن_الطبية': '38',
            'خط_العرض__Y___Latitude_': '28.0935',
            'خط_الطول__X___Longitude_': '30.7513',
            'نوع_الأصل': 'ارض ومبانى',
            'الملكية': 'ملك'
        }
        
        # Columns in DB
        cursor.execute("PRAGMA table_info(minya_data)")
        all_cols = [c[1] for c in cursor.fetchall()]
        
        # Build query
        cols = []
        vals = []
        for k, v in data.items():
            if k in all_cols:
                cols.append(k)
                vals.append(v)
        
        placeholders = ", ".join(["?"] * len(vals))
        col_string = ", ".join([f"`{c}`" for c in cols])
        
        query = f"INSERT INTO minya_data ({col_string}) VALUES ({placeholders})"
        
        cursor.execute(query, vals)
        conn.commit()
        print(f"Successfully added '{data['اسم_المنشأة']}' to the database.")
        
        conn.close()
    except Exception as e:
        print(f"Error adding hospital: {e}")

if __name__ == "__main__":
    add_military_hospital()
