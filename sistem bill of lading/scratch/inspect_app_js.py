with open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "nav-kas-btn" in line or "view-kas" in line or "showView" in line or "switchView" in line:
        print(f"Line {i+1}: {line.strip()}")
