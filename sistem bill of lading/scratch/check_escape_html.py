with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer("escapeHtml", content)]
print(f"Found {len(matches)} occurrences of escapeHtml:")
for idx, pos in enumerate(matches):
    start = max(0, pos - 100)
    end = min(len(content), pos + 100)
    print(f"Match {idx+1}:\n{content[start:end]}\n{'-'*40}")
