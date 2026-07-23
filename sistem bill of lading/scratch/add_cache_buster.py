with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace index.css
content = content.replace('href="index.css"', 'href="index.css?v=2"')
content = content.replace("href='index.css'", "href='index.css?v=2'")

# Replace app.js
content = content.replace('src="app.js"', 'src="app.js?v=2"')
content = content.replace("src='app.js'", "src='app.js?v=2'")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Cache busters added successfully to index.html!")
