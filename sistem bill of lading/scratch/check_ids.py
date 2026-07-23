import os

ids = [
    'nav-dashboard-btn', 
    'nav-create-btn', 
    'nav-history-btn', 
    'btn-create-new', 
    'btn-back-to-dashboard', 
    'btn-preview-back', 
    'btn-save-bl', 
    'btn-load-sample', 
    'btn-build-cargo', 
    'btn-preview-print', 
    'btn-trigger-print', 
    'search-input'
]

html_path = 'index.html'
if os.path.exists(html_path):
    content = open(html_path, 'r', encoding='utf-8').read()
    for el_id in ids:
        found = (f'id="{el_id}"' in content) or (f"id='{el_id}'" in content)
        print(f"{el_id}: {'FOUND' if found else 'NOT FOUND'}")
else:
    print("index.html not found")
