import requests

url = "http://127.0.0.1:5000/api/data"
response = requests.get(url)
data = response.json().get('data', [])

others_list = []
def parse_val(v):
    if not v: return 0
    try: return float(v)
    except: return 0

for fac in data:
    hd = parse_val(fac.get('عدد_الاطباء_البشريين', 0))
    de = parse_val(fac.get('عدد_أطباء_الأسنان', 0))
    ph = parse_val(fac.get('عدد_الصيادلة', 0))
    pt = parse_val(fac.get('عدد_أطباء_العلاج_الطبيعي', 0))
    nur = parse_val(fac.get('عدد_الممرضين', 0))
    tot = parse_val(fac.get('اجمالى_المهن_الطبية', 0))
    
    known = hd + de + ph + pt + nur
    other = max(0, tot - known)
    
    if other > 0:
        others_list.append({
            'name': fac.get('اسم_المنشأة', 'بدون اسم'),
            'gov': fac.get('المحافظة', ''),
            'tot': tot,
            'known': known,
            'other': other
        })

with open('C:/xampp/htdocs/gis/python_app/others_report.txt', 'w', encoding='utf-8') as f:
    if not others_list:
        f.write("لا توجد منشآت بها تخصصات أخرى.\n")
    else:
        for item in others_list:
            f.write(f"المنشأة: {item['name']}\n")
            f.write(f"إجمالي المهن: {item['tot']} | المجموع المعروف: {item['known']}\n")
            f.write(f"الفرق (مهن أخرى): {item['other']}\n")
            f.write("-" * 30 + "\n")
