import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

views = re.findall(r'<section\s+id="([^"]+)"', content)
print("Views in index.html:")
for v in views:
    print(" -", v)
