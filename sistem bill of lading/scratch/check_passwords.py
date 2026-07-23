import glob
import re

php_files = glob.glob("*.php") + glob.glob("**/*.php", recursive=True)

for filepath in php_files:
    if "scratch" in filepath:
        continue
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        
        # Search for patterns like === '...' or === "..." containing password or login
        matches = re.finditer(r"(username|password|pass|user|auth|login).*?===.*?['\"](.*?)['\"]", content, re.IGNORECASE)
        found = False
        for m in matches:
            if not found:
                print(f"\nFile: {filepath}")
                found = True
            print(f"  Match: {m.group(0)}")
            
        # Also search for 'Nahel' or 'Nahel@26' specifically
        if "Nahel" in content:
            print(f"\nFile: {filepath} contains 'Nahel'")
            for line_idx, line in enumerate(content.split('\n')):
                if "Nahel" in line:
                    print(f"  Line {line_idx+1}: {line.strip()}")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
