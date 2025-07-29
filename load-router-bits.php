<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$routerBitsFile = 'data/router-bits.json';

// Check if router bits file exists
if (!file_exists($routerBitsFile)) {
    echo json_encode([
        'success' => true,
        'routerBits' => [],
        'message' => 'No router bits found'
    ]);
    exit;
}

// Load router bits data
$routerBitsData = file_get_contents($routerBitsFile);
$routerBits = json_decode($routerBitsData, true);

if ($routerBits === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to parse router bits data']);
    exit;
}

echo json_encode([
    'success' => true,
    'routerBits' => $routerBits,
    'count' => count($routerBits)
]);
?>