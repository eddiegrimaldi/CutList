<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['name']) || !isset($data['meshData'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: name and meshData']);
    exit;
}

$routerBitsFile = 'data/router-bits.json';
$routerBitsDir = dirname($routerBitsFile);

// Create data directory if it doesn't exist
if (!is_dir($routerBitsDir)) {
    mkdir($routerBitsDir, 0755, true);
}

// Load existing router bits
$routerBits = [];
if (file_exists($routerBitsFile)) {
    $existingData = file_get_contents($routerBitsFile);
    $routerBits = json_decode($existingData, true) ?: [];
}

// Add timestamp and version info
$data['timestamp'] = date('c');
$data['version'] = '1.0';

// Store the router bit data
$routerBits[$data['name']] = $data;

// Save back to file
$jsonData = json_encode($routerBits, JSON_PRETTY_PRINT);
if (file_put_contents($routerBitsFile, $jsonData) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save router bit data']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Router bit saved successfully',
    'name' => $data['name']
]);
?>