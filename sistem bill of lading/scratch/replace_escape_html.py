with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Replace escapeHtml with escapeHTML
new_content = content.replace("escapeHtml", "escapeHTML")

# Count how many replacements were made
count = content.count("escapeHtml")
print(f"Replacing {count} occurrences of escapeHtml with escapeHTML...")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Replacement complete!")
