import os
import sys

# UTF-8 for Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

SEARCH_TEXT = "القوى العاملة"
REPLACE_TEXT = "عدد المهن الطبية"
DIRS_TO_SEARCH = ["templates", "static"]

def global_replace():
    count = 0
    for d in DIRS_TO_SEARCH:
        path = os.path.join(os.getcwd(), d)
        if not os.path.exists(path):
            continue
            
        for root, _, files in os.walk(path):
            for f in files:
                if f.endswith(('.html', '.js', '.css')):
                    file_path = os.path.join(root, f)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as file:
                            content = file.read()
                        
                        if SEARCH_TEXT in content:
                            new_content = content.replace(SEARCH_TEXT, REPLACE_TEXT)
                            with open(file_path, 'w', encoding='utf-8') as file:
                                file.write(new_content)
                            print(f"Updated: {file_path}")
                            count += 1
                    except Exception as e:
                        print(f"Error processing {file_path}: {e}")
    
    print(f"\nFinished. Updated {count} files.")

if __name__ == "__main__":
    global_replace()
