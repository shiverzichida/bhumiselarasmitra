<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

// Database connection check
if (!$pdo) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Database connection failed: " . $pdo_error
    ]);
    exit();
}

// Authentication check (replicated from api.php)
$is_authenticated = false;
if (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
    if ($_SERVER['PHP_AUTH_USER'] === 'Nahel' && $_SERVER['PHP_AUTH_PW'] === 'Nahel@26') {
        $is_authenticated = true;
    }
}

if (!$is_authenticated) {
    $headers = getallheaders();
    $auth_header = '';
    if (isset($headers['Authorization'])) {
        $auth_header = $headers['Authorization'];
    } elseif (isset($headers['X-Authorization'])) {
        $auth_header = $headers['X-Authorization'];
    }
    if (!empty($auth_header) && strpos(strtolower($auth_header), 'basic ') === 0) {
        $creds = explode(':', base64_decode(substr($auth_header, 6)), 2);
        if (count($creds) === 2 && $creds[0] === 'Nahel' && $creds[1] === 'Nahel@26') {
            $is_authenticated = true;
        }
    }
}

if (!$is_authenticated) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized"]);
    exit();
}

// Helper to sanitize numeric values from IDR format (e.g. 102.091 -> 102091)
function sanitize_idr_number($val) {
    if (empty($val)) return 0.00;
    $val = trim($val);
    // Strip thousands separator dots
    $val = str_replace('.', '', $val);
    // Replace decimals comma with dot
    $val = str_replace(',', '.', $val);
    return (float)$val;
}

// Helper to format date DD/MM/YYYY to YYYY-MM-DD
function format_date_to_db($date_str) {
    if (empty($date_str)) return null;
    $parts = explode('/', trim($date_str));
    if (count($parts) === 3) {
        return "{$parts[2]}-{$parts[1]}-{$parts[0]}";
    }
    return null;
}

// Helper to format datetime DD/MM/YYYY HH:MM to YYYY-MM-DD HH:MM:SS
function format_datetime_to_db($datetime_str) {
    if (empty($datetime_str)) return null;
    $datetime_str = trim($datetime_str);
    $parts = explode(' ', $datetime_str);
    if (count($parts) === 2) {
        $date_db = format_date_to_db($parts[0]);
        if ($date_db) {
            return "{$date_db} {$parts[1]}:00";
        }
    }
    return null;
}

// Handler for image OCR parsing
function perform_ocr($file_path) {
    $api_key = 'helloworld'; // Default free key, user can replace this in config
    $post_fields = [
        'apikey' => $api_key,
        'language' => 'eng',
        'isOverlayRequired' => 'false',
        'OCREngine' => '2',
        'file' => new CURLFile($file_path)
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.ocr.space/parse/image');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_fields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        return ['success' => false, 'error' => $err];
    }

    $result = json_decode($response, true);
    if (isset($result['OCRExitCode']) && $result['OCRExitCode'] == 1) {
        $text = '';
        if (isset($result['ParsedResults'][0]['ParsedText'])) {
            $text = $result['ParsedResults'][0]['ParsedText'];
        }
        return ['success' => true, 'text' => $text];
    } else {
        $error_msg = isset($result['ErrorMessage']) ? implode(', ', (array)$result['ErrorMessage']) : 'Unknown OCR error';
        return ['success' => false, 'error' => $error_msg];
    }
}

// Text parsing logic
function parse_proforma_text($text) {
    $data = [
        'tgl_cetak' => null,
        'no_proforma' => '',
        'kode_bayar' => '',
        'kapal' => '',
        'nama_tertagih' => '',
        'keterangan' => '',
        'no_count' => '',
        'debit' => 0.00,
        'kredit' => 0.00,
        'keterangan_tambahan' => '',
        'valuta' => 'IDR',
        'total_petikemas' => 0,
        'sub_total' => 0.00,
        'ppn' => 0.00,
        'materai' => 0.00,
        'grand_total' => 0.00,
        'is_ho' => 0,
        'items' => [],
        'containers' => []
    ];

    $lines = explode("\n", $text);
    $line_count = count($lines);

    // 1. Extract No. Proforma using regex
    if (preg_match('/([A-Z]{3}[0-9]{12})/i', $text, $pm)) {
        $data['no_proforma'] = strtoupper($pm[1]);
    }

    // 2. Extract Kode Bayar using regex
    if (preg_match('/\b(126[0-9]{11})\b/', $text, $km)) {
        $data['kode_bayar'] = $km[1];
    }

    // Helper to find value on the same line or next line
    $find_next_value = function($keyword_pattern, $lines, $line_count) {
        for ($i = 0; $i < $line_count; $i++) {
            if (preg_match($keyword_pattern, $lines[$i])) {
                if (strpos($lines[$i], ':') !== false) {
                    $parts = explode(':', $lines[$i], 2);
                    if (count($parts) === 2 && trim($parts[1]) !== '') {
                        return trim($parts[1]);
                    }
                }
                if ($i + 1 < $line_count) {
                    $next = trim($lines[$i + 1]);
                    if ($next !== '' && !preg_match('/cetak|pmh|proforma|bayar|kapal|tertagih|tertagiv|rangan/i', $next)) {
                        return $next;
                    }
                }
                if ($i + 2 < $line_count) {
                    $next_next = trim($lines[$i + 2]);
                    if ($next_next !== '' && !preg_match('/cetak|pmh|proforma|bayar|kapal|tertagih|tertagiv|rangan/i', $next_next)) {
                        return $next_next;
                    }
                }
            }
        }
        return '';
    };

    // 3. Extract Kapal
    for ($i = 0; $i < $line_count; $i++) {
        if (preg_match('/Kapal/i', $lines[$i])) {
            if (strpos($lines[$i], ':') !== false) {
                $parts = explode(':', $lines[$i], 2);
                $val = trim($parts[1]);
                if ($val !== '' && !preg_match('/^[0-9]{14}$/', preg_replace('/[^0-9]/', '', $val))) {
                    $data['kapal'] = $val;
                    break;
                }
            }
            if ($i + 1 < $line_count) {
                $val = trim($lines[$i+1]);
                $val = ltrim($val, ': ');
                if ($val !== '' && !preg_match('/^[0-9]{14}$/', preg_replace('/[^0-9]/', '', $val)) && !preg_match('/Nama|Keterangan|Valuta/i', $val)) {
                    $data['kapal'] = $val;
                    break;
                }
            }
            if ($i + 2 < $line_count) {
                $val = trim($lines[$i+2]);
                $val = ltrim($val, ': ');
                if ($val !== '' && !preg_match('/^[0-9]{14}$/', preg_replace('/[^0-9]/', '', $val)) && !preg_match('/Nama|Keterangan|Valuta/i', $val)) {
                    $data['kapal'] = $val;
                    break;
                }
            }
        }
    }

    // 4. Extract Nama Tertagih
    for ($i = 0; $i < $line_count; $i++) {
        if (preg_match('/Tertagih|Tertagiv/i', $lines[$i])) {
            if (strpos($lines[$i], ':') !== false) {
                $data['nama_tertagih'] = trim(explode(':', $lines[$i], 2)[1]);
                break;
            }
            if ($i + 1 < $line_count) {
                $val = trim($lines[$i+1]);
                $val = ltrim($val, ': ');
                if ($val !== '' && !preg_match('/Keterangan|Valuta/i', $val)) {
                    $data['nama_tertagih'] = $val;
                    break;
                }
            }
        }
    }

    // 5. Extract Tanggal Cetak
    for ($i = 0; $i < $line_count; $i++) {
        if (preg_match('/Tgl\.?\s*(?:Cetak|Pmh)/i', $lines[$i])) {
            $check_lines = [$lines[$i]];
            if ($i + 1 < $line_count) $check_lines[] = $lines[$i+1];
            if ($i + 2 < $line_count) $check_lines[] = $lines[$i+2];
            
            foreach ($check_lines as $cl) {
                $cl = preg_replace('/\s+/', ' ', $cl);
                $cl = ltrim($cl, ': ');
                if (preg_match('/([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*([0-9]{2}:[0-9]{2})/', $cl, $matches)) {
                    $data['tgl_cetak'] = format_datetime_to_db($matches[1] . ' ' . $matches[2]);
                    break 2;
                }
            }
        }
    }

    // 6. Extract Totals from the bottom of the document using value pattern matching
    $bottom_numbers = [];
    for ($i = $line_count - 1; $i >= 0; $i--) {
        $l = trim($lines[$i]);
        if (empty($l)) continue;
        
        if (preg_match('/DETIL PETIKEMAS|Estimasi/i', $l)) {
            break;
        }
        
        $clean_l = ltrim($l, ': ');
        if (preg_match('/^[0-9.,]+$/', $clean_l)) {
            $num = sanitize_idr_number($clean_l);
            $bottom_numbers[] = $num;
        }
    }
    $bottom_numbers = array_reverse($bottom_numbers);
    
    $decimal_vals = [];
    foreach ($bottom_numbers as $n) {
        if ($n > 100) {
            $decimal_vals[] = $n;
        }
    }
    
    if (count($decimal_vals) >= 2) {
        $data['grand_total'] = max($decimal_vals);
        $sorted_vals = $decimal_vals;
        rsort($sorted_vals);
        $data['sub_total'] = $sorted_vals[1];
        $data['ppn'] = $data['grand_total'] - $data['sub_total'];
    }

    // 7. Parse DETIL PETIKEMAS section
    $parts = explode("DETIL PETIKEMAS:", $text, 2);
    if (count($parts) === 2) {
        $detil_section = $parts[1];
        $detil_lines = explode("\n", $detil_section);
        
        $names = [];
        $stses = [];
        $dates = [];
        $totals = [];
        
        $mode = '';
        foreach ($detil_lines as $dl) {
            $dl = trim($dl);
            if (empty($dl)) continue;
            
            if (preg_match('/No\.\s*Petikemas/i', $dl)) {
                $mode = 'NAME';
                continue;
            } elseif (preg_match('/S\/T\/S|STS|SIT\/\s*s/i', $dl)) {
                $mode = 'STS';
                continue;
            } elseif (preg_match('/Estimasi/i', $dl)) {
                $mode = 'ESTIMASI';
                continue;
            } elseif (preg_match('/^Total$/i', $dl)) {
                $mode = 'TOTAL';
                continue;
            } elseif (preg_match('/Total\s*Petikemas|Sub\s*-\s*Total|PERHATIAN/i', $dl)) {
                $mode = '';
                break;
            }
            
            if ($mode === 'NAME') {
                if ($dl === 'ADMIN_NOTA' || preg_match('/^[A-Z]{4}[0-9]{7}$/', $dl)) {
                    $names[] = $dl;
                }
            } elseif ($mode === 'STS') {
                if ($dl === '0/-/-' || $dl === '01-1-' || $dl === '0/-1-' || preg_match('/^(?:20|40)\/[A-Z0-9,\/\-\']+/i', $dl)) {
                    $stses[] = $dl;
                }
            } elseif ($mode === 'ESTIMASI') {
                if (preg_match('/^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/', $dl)) {
                    $dates[] = $dl;
                }
            } elseif ($mode === 'TOTAL') {
                if (preg_match('/^[0-9.,]+$/', $dl)) {
                    $totals[] = sanitize_idr_number($dl);
                }
            }
        }
        
        $container_count = count($names);
        $containers = [];
        $valid_container_nos = [];
        $sizes_found = [];
        
        for ($i = 0; $i < $container_count; $i++) {
            $name = $names[$i];
            if ($name === 'ADMIN_NOTA') continue;
            
            $sts = $stses[$i] ?? '20/DRY/E';
            $est = isset($dates[$i]) ? format_date_to_db($dates[$i]) : null;
            $tot = $totals[$i] ?? 0;
            
            $containers[] = [
                'no_petikemas' => $name,
                'sts' => $sts,
                'estimasi' => $est,
                'total' => $tot
            ];
            
            $valid_container_nos[] = $name;
            
            if (preg_match('/^([0-9]{2})/', $sts, $sm)) {
                $sizes_found[] = $sm[1];
            } else {
                $sizes_found[] = '20';
            }
        }
        
        $data['containers'] = $containers;
        $data['total_petikemas'] = count($containers);
        $data['no_count'] = implode(', ', $valid_container_nos);
        
        // 8. Auto construct Keterangan
        $raw_keterangan_layanan = '';
        for ($i = 0; $i < $line_count; $i++) {
            if (preg_match('/Keterangan/i', $lines[$i])) {
                if (strpos($lines[$i], ':') !== false) {
                    $raw_keterangan_layanan = trim(explode(':', $lines[$i], 2)[1]);
                } else if ($i + 1 < $line_count) {
                    $raw_keterangan_layanan = trim($lines[$i+1]);
                }
                break;
            }
        }
        
        $layanan = 'Receiving';
        if (stripos($raw_keterangan_layanan, 'DELIVERY') !== false) {
            $layanan = 'Delivery';
        } elseif (stripos($raw_keterangan_layanan, 'STORAGE') !== false) {
            $layanan = 'Storage';
        }
        
        $size_summary = '';
        if (count($sizes_found) > 0) {
            $counts_by_size = array_count_values($sizes_found);
            $summary_parts = [];
            foreach ($counts_by_size as $size => $count) {
                $summary_parts[] = "{$count}x{$size}'";
            }
            $size_summary = implode(', ', $summary_parts);
        }
        
        $tertagih = $data['nama_tertagih'] ? $data['nama_tertagih'] : 'PT. Putera Utama Lautan';
        $data['keterangan'] = "Pembayaran {$layanan} {$size_summary} ({$tertagih})";
    }

    $data['kredit'] = $data['grand_total'];
    $data['debit'] = 0.00;

    // Parse activities for the sub-items table in UI (compatibility)
    $activity_keywords = ['ADMIN NOTA', 'ADMINISTRASI', 'LIFT OFF', 'LIFT ON', 'MASA 1A', 'MASA IA', 'MASA 1B', 'PAS TRUK'];
    for ($i = 0; $i < $line_count; $i++) {
        $line = trim($lines[$i]);
        foreach ($activity_keywords as $kw) {
            if (stripos($line, $kw) !== false) {
                $sts = '20/DRY/E';
                if (preg_match('/(?:20|40)\/[A-Z0-9,\/\-\']+|\b0\/-\/-\b/i', $line, $m_sts)) {
                    $sts = $m_sts[0];
                }
                
                $total_val = 0;
                if (preg_match('/([0-9.,]+)$/', $line, $m)) {
                    $total_val = sanitize_idr_number($m[1]);
                }
                
                $data['items'][] = [
                    'aktifitas' => $kw,
                    'sts' => $sts,
                    'box' => 1,
                    'itm' => 1,
                    'tarif' => $total_val,
                    'total' => $total_val
                ];
            }
        }
    }

    return $data;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if ($action === 'get') {
            $id = isset($_GET['id']) ? $_GET['id'] : '';
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "ID is required."]);
                exit();
            }
            try {
                $stmt = $pdo->prepare("SELECT * FROM kas_operasional WHERE id = :id");
                $stmt->execute(['id' => $id]);
                $row = $stmt->fetch();
                if ($row) {
                    $row['items'] = json_decode($row['items_json'], true);
                    $row['containers'] = json_decode($row['containers_json'], true);
                    echo json_encode(["success" => true, "data" => $row]);
                } else {
                    http_response_code(404);
                    echo json_encode(["success" => false, "error" => "Record not found."]);
                }
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        } else {
            // Get all records
            try {
                $stmt = $pdo->query("SELECT * FROM kas_operasional ORDER BY tgl_cetak DESC, created_at DESC");
                $results = $stmt->fetchAll();
                foreach ($results as &$row) {
                    $row['items'] = json_decode($row['items_json'], true);
                    $row['containers'] = json_decode($row['containers_json'], true);
                }
                echo json_encode(["success" => true, "data" => $results]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => $e->getMessage()]);
            }
        }
        break;

    case 'POST':
        if ($action === 'upload') {
            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "No file uploaded."]);
                exit();
            }

            $file = $_FILES['file'];
            $allowed_types = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!in_array($file['type'], $allowed_types)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Only PDF, JPG, and PNG files are allowed."]);
                exit();
            }

            $upload_dir = __DIR__ . '/uploads';
            if (!file_exists($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }

            $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'proforma_' . time() . '_' . rand(100, 999) . '.' . $file_ext;
            $dest_path = $upload_dir . '/' . $filename;

            if (move_uploaded_file($file['tmp_name'], $dest_path)) {
                // Call OCR
                $ocr_res = perform_ocr($dest_path);
                if ($ocr_res['success']) {
                    $parsed_data = parse_proforma_text($ocr_res['text']);
                    $parsed_data['file_path'] = 'uploads/' . $filename;
                    echo json_encode([
                        "success" => true,
                        "data" => $parsed_data,
                        "raw_ocr_text" => $ocr_res['text']
                    ]);
                } else {
                    echo json_encode([
                        "success" => false,
                        "error" => "OCR failed: " . $ocr_res['error'],
                        "file_path" => 'uploads/' . $filename
                    ]);
                }
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Failed to save uploaded file."]);
            }
        } else {
            // Save or Update Record
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);

            if (!$data || (empty($data['no_proforma']) && empty($data['keterangan']))) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid input data. Keterangan or No. Proforma is required."]);
                exit();
            }

            $id = isset($data['id']) ? (int)$data['id'] : 0;

            $params = [
                'tgl_cetak' => !empty($data['tgl_cetak']) ? $data['tgl_cetak'] : null,
                'no_proforma' => !empty($data['no_proforma']) ? $data['no_proforma'] : null,
                'kode_bayar' => isset($data['kode_bayar']) ? $data['kode_bayar'] : null,
                'kapal' => isset($data['kapal']) ? $data['kapal'] : null,
                'nama_tertagih' => isset($data['nama_tertagih']) ? $data['nama_tertagih'] : null,
                'keterangan' => isset($data['keterangan']) ? $data['keterangan'] : null,
                'keterangan_tambahan' => isset($data['keterangan_tambahan']) ? $data['keterangan_tambahan'] : null,
                'no_count' => isset($data['no_count']) ? $data['no_count'] : null,
                'valuta' => isset($data['valuta']) ? $data['valuta'] : 'IDR',
                'debit' => isset($data['debit']) ? (float)$data['debit'] : 0.00,
                'kredit' => isset($data['kredit']) ? (float)$data['kredit'] : 0.00,
                'total_petikemas' => isset($data['total_petikemas']) ? (int)$data['total_petikemas'] : 0,
                'sub_total' => isset($data['sub_total']) ? (float)$data['sub_total'] : 0.00,
                'ppn' => isset($data['ppn']) ? (float)$data['ppn'] : 0.00,
                'materai' => isset($data['materai']) ? (float)$data['materai'] : 0.00,
                'grand_total' => isset($data['grand_total']) ? (float)$data['grand_total'] : 0.00,
                'items_json' => isset($data['items']) ? json_encode($data['items']) : '[]',
                'containers_json' => isset($data['containers']) ? json_encode($data['containers']) : '[]',
                'file_path' => isset($data['file_path']) ? $data['file_path'] : null,
                'is_ho' => isset($data['is_ho']) ? (int)$data['is_ho'] : 0
            ];

            try {
                if ($id > 0) {
                    // Update
                    $params['id'] = $id;
                    $sql = "UPDATE kas_operasional SET 
                                tgl_cetak = :tgl_cetak,
                                no_proforma = :no_proforma,
                                kode_bayar = :kode_bayar,
                                kapal = :kapal,
                                nama_tertagih = :nama_tertagih,
                                keterangan = :keterangan,
                                keterangan_tambahan = :keterangan_tambahan,
                                no_count = :no_count,
                                valuta = :valuta,
                                debit = :debit,
                                kredit = :kredit,
                                total_petikemas = :total_petikemas,
                                sub_total = :sub_total,
                                ppn = :ppn,
                                materai = :materai,
                                grand_total = :grand_total,
                                items_json = :items_json,
                                containers_json = :containers_json,
                                file_path = :file_path,
                                is_ho = :is_ho
                            WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    echo json_encode(["success" => true, "message" => "Record updated successfully.", "id" => $id]);
                } else {
                    // Insert
                    $sql = "INSERT INTO kas_operasional 
                                (tgl_cetak, no_proforma, kode_bayar, kapal, nama_tertagih, keterangan, keterangan_tambahan, no_count, valuta, debit, kredit, total_petikemas, sub_total, ppn, materai, grand_total, items_json, containers_json, file_path, is_ho) 
                            VALUES 
                                (:tgl_cetak, :no_proforma, :kode_bayar, :kapal, :nama_tertagih, :keterangan, :keterangan_tambahan, :no_count, :valuta, :debit, :kredit, :total_petikemas, :sub_total, :ppn, :materai, :grand_total, :items_json, :containers_json, :file_path, :is_ho)";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $new_id = $pdo->lastInsertId();
                    echo json_encode(["success" => true, "message" => "Record created successfully.", "id" => $new_id]);
                }
            } catch (PDOException $e) {
                // Handle duplicate entry error
                if ($e->errorInfo[1] == 1062) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "error" => "No. Proforma '{$data['no_proforma']}' already exists in the system."]);
                } else {
                    http_response_code(500);
                    echo json_encode(["success" => false, "error" => $e->getMessage()]);
                }
            }
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid ID parameter."]);
            exit();
        }

        try {
            // Delete file if exists
            $stmt_file = $pdo->prepare("SELECT file_path FROM kas_operasional WHERE id = :id");
            $stmt_file->execute(['id' => $id]);
            $file_path = $stmt_file->fetchColumn();
            if (!empty($file_path) && file_exists(__DIR__ . '/' . $file_path)) {
                @unlink(__DIR__ . '/' . $file_path);
            }

            $stmt = $pdo->prepare("DELETE FROM kas_operasional WHERE id = :id");
            $stmt->execute(['id' => $id]);

            if ($stmt->rowCount() > 0) {
                echo json_encode(["success" => true, "message" => "Record deleted successfully."]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "Record not found or already deleted."]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed."]);
        break;
}
