import re
import os

# 1. Parse index.html to get all IDs
html_content = open('index.html', 'r', encoding='utf-8').read()
all_ids = set(re.findall(r'id=["\'](.*?)["\']', html_content))

# 2. Parse app.js to find all document.getElementById("...") calls
js_content = open('app.js', 'r', encoding='utf-8').read()
get_el_calls = re.findall(r'document\.getElementById\([\'"](.*?)[\'"]\)', js_content)

print("Checking DOM element usage in app.js against index.html...")
print("-" * 50)

# We want to find calls where we chain addEventListener directly, e.g.:
# document.getElementById('...').addEventListener
# or where we do not check for nullness.
# Let's inspect each unique ID fetched from getElementById
unique_ids = sorted(list(set(get_el_calls)))
for el_id in unique_ids:
    # Find all lines in app.js containing this ID
    lines_with_id = []
    for i, line in enumerate(js_content.split('\n')):
        if el_id in line and 'document.getElementById' in line:
            lines_with_id.append((i + 1, line.strip()))
            
    # Check if the ID exists in index.html
    exists = el_id in all_ids
    
    # Check if any line chains addEventListener directly
    direct_chain = False
    for line_num, line in lines_with_id:
        if ').addEventListener' in line:
            direct_chain = True
            
    if not exists:
        if direct_chain:
            print(f"[CRITICAL ERROR] ID '{el_id}' NOT FOUND in index.html, but addEventListener is chained directly:")
            for line_num, line in lines_with_id:
                print(f"   Line {line_num}: {line}")
        else:
            # Check if there is a null check in the code
            print(f"[WARNING] ID '{el_id}' not found in index.html. Checking if code handles null:")
            for line_num, line in lines_with_id:
                print(f"   Line {line_num}: {line}")
                
print("-" * 50)
print("Check complete.")
