with open("index.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "</section>" in line:
        # print the line number and a bit of surrounding context from lines list
        # we can search backward for the nearest section start to know which section is closing
        sect_start = "unknown"
        for j in range(i, -1, -1):
            if "<section" in lines[j]:
                sect_start = lines[j].strip()
                break
        print(f"Line {i+1}: Closing tag </section> for start: {sect_start}")
