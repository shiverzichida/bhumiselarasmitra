<?php
echo "=== SPA INTEGRATION VERIFICATION ===\n\n";

// 1. Fetch index.html and verify contents
$index_url = "http://localhost:8000/index.html";
echo "Fetching $index_url...\n";
$html = file_get_contents($index_url);

if ($html === false) {
    echo "❌ Failed to fetch index.html. Make sure the server is running on port 8000.\n";
    exit(1);
}

$checks = [
    'Sidebar button container-list' => 'id="nav-container-list-btn"',
    'Sidebar button movement'       => 'id="nav-movement-btn"',
    'View container-list'           => 'id="view-container-list"',
    'View movement-dashboard'       => 'id="view-movement-dashboard"',
    'View movement-editor'          => 'id="view-movement-editor"',
    'Modal create voyage'           => 'id="modal-create-voyage"',
    'Modal edit voyage'             => 'id="modal-edit-voyage"',
];

$all_ok = true;
foreach ($checks as $name => $pattern) {
    if (strpos($html, $pattern) !== false) {
        echo "✔ $name is present.\n";
    } else {
        echo "❌ $name is MISSING! (pattern: $pattern)\n";
        $all_ok = false;
    }
}

// 2. Verify redirect for kontainer/admin.php
echo "\nVerifying kontainer/admin.php redirect...\n";
$ch = curl_init("http://localhost:8000/kontainer/admin.php");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
$res = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code == 302 && strpos($res, "Location: ../index.html") !== false) {
    echo "✔ kontainer/admin.php correctly redirects to ../index.html (HTTP $http_code).\n";
} else {
    echo "❌ kontainer/admin.php redirect FAILED! HTTP code: $http_code. Response header:\n$res\n";
    $all_ok = false;
}

// 3. Verify redirect for movement/index.php
echo "\nVerifying movement/index.php redirect...\n";
$ch = curl_init("http://localhost:8000/movement/index.php");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
$res = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code == 302 && strpos($res, "Location: ../index.html") !== false) {
    echo "✔ movement/index.php correctly redirects to ../index.html (HTTP $http_code).\n";
} else {
    echo "❌ movement/index.php redirect FAILED! HTTP code: $http_code. Response header:\n$res\n";
    $all_ok = false;
}

if ($all_ok) {
    echo "\n🎉 ALL VERIFICATION CHECKS PASSED!\n";
} else {
    echo "\n❌ SOME VERIFICATION CHECKS FAILED!\n";
}
