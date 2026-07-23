with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer("nav-movement-btn", content)]
print(f"Found {len(matches)} occurrences of nav-movement-btn:")
for idx, pos in enumerate(matches):
    start = max(0, pos - 150)
    end = min(len(content), pos + 150)
    print(f"Match {idx+1}:\n{content[start:end]}\n{'-'*40}")
