with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the string "setupEventListeners" and print 50 lines after it
idx = content.find("function setupEventListeners")
if idx != -1:
    print("Found setupEventListeners at index:", idx)
    print(content[idx:idx+1500])
else:
    print("setupEventListeners function not found.")
