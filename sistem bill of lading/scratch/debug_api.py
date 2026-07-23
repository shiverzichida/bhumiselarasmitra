import urllib.request
import base64

url = "http://localhost:8000/movement/api.php"
# Let's try check_auth first, then try the main GET request
req = urllib.request.Request(url)
# Add auth header
auth_str = "Nahel:Nahel@26"
auth_b64 = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
req.add_header("Authorization", f"Basic {auth_b64}")

print("Sending request with Authorization: Basic Nahel:Nahel@26 ...")
try:
    with urllib.request.urlopen(req) as response:
        print("Status code:", response.status)
        print("Headers:")
        for k, v in response.headers.items():
            print(f"  {k}: {v}")
        body = response.read().decode('utf-8')
        print("Body:")
        print(body)
except urllib.error.HTTPError as e:
    print("HTTPError Status:", e.code)
    print("HTTPError Headers:")
    for k, v in e.headers.items():
        print(f"  {k}: {v}")
    body = e.read().decode('utf-8')
    print("HTTPError Body:")
    print(body)
except Exception as e:
    print("Error:", e)
