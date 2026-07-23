with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r"(escape|html|safe|clean)", content, re.IGNORECASE)]
print(f"Found {len(matches)} occurrences of escape/html/safe/clean:")
for idx, pos in enumerate(matches[:15]):
    start = max(0, pos - 50)
    end = min(len(content), pos + 50)
    print(f"Match {idx+1}:\n{content[start:end]}\n{'-'*40}")
