<?php
// Verify local server API
$url = "http://localhost:8000/movement/api.php";
echo "Fetching from $url ...\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// Session cookie might be needed for check_auth but default list is public or not?
// Let's see: GET default list is protected?
// Let's check api.php:
// "Protect API access with the same session as the container admin panel"
// Yes, it is protected unless action is check_auth or login.
// Let's request action=check_auth
curl_setopt($ch, CURLOPT_URL, $url . "?action=check_auth");

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code\n";
echo "Response: $response\n\n";

// Let's log in to verify
echo "Testing login endpoint...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . "?action=login");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "username" => "nahel",
    "password" => "Nahel@26"
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_COOKIEJAR, __DIR__ . '/cookie.txt');

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code\n";
echo "Response: $response\n\n";

// Now request with cookie to list voyages
echo "Testing fetching voyages with session cookie...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIEFILE, __DIR__ . '/cookie.txt');

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code\n";
echo "Response: " . substr($response, 0, 500) . "...\n";
unlink(__DIR__ . '/cookie.txt');
