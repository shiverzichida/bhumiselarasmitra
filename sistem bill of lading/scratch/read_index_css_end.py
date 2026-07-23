with open("index.css", "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines in index.css: {len(lines)}")
print("Last 25 lines:")
for i in range(max(0, len(lines) - 25), len(lines)):
    print(f"{i+1}: {lines[i]}", end="")
