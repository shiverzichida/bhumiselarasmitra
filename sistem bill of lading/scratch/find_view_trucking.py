with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if 'id="view-trucking"' in line:
        start = i
    if start != -1 and '</section>' in line:
        end = i
        break

print(f"view-trucking starts at line {start+1} and first section close is at line {end+1}")
for line_idx in range(start, min(start+30, len(lines))):
    print(f"{line_idx+1}: {lines[line_idx].strip()}")
