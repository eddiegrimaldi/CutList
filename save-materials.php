<?php
/**
 * Save Materials Database - Server-side JSON storage
 * Handles CRUD operations for materials data with proper error handling
 */

// Set content type and enable error reporting
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Database file path
$database_file = 'materials-database.json';

// Handle CORS for local development
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

/**
 * Log errors to a file for debugging
 */
function logError($message) {
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[$timestamp] $message\n";
    file_put_contents('materials-errors.log', $log_message, FILE_APPEND | LOCK_EX);
}

/**
 * Validate materials data structure
 */
function validateMaterialsData($data) {
    if (!isset($data['materials']) || !is_array($data['materials'])) {
        return "Missing or invalid 'materials' array";
    }
    
    if (!isset($data['version'])) {
        return "Missing version information";
    }
    
    if (!isset($data['categories']) || !is_array($data['categories'])) {
        return "Missing or invalid 'categories' array";
    }
    
    // Validate each material has required fields
    foreach ($data['materials'] as $material_id => $material) {
        if (!isset($material['material_id']) || $material['material_id'] !== $material_id) {
            return "Material ID mismatch for material: $material_id";
        }
        
        if (!isset($material['category'])) {
            return "Missing category for material: $material_id";
        }
        
        if (!isset($material['basic_info']['common_name'])) {
            return "Missing common name for material: $material_id";
        }
        
        if (!isset($material['physical_properties'])) {
            return "Missing physical properties for material: $material_id";
        }
        
        if (!isset($material['economic_properties'])) {
            return "Missing economic properties for material: $material_id";
        }
    }
    
    return null; // Valid
}

/**
 * Create backup of existing database
 */
function createBackup($database_file) {
    if (file_exists($database_file)) {
        $backup_file = 'materials-database-backup-' . date('Y-m-d-H-i-s') . '.json';
        if (!copy($database_file, $backup_file)) {
            logError("Failed to create backup: $backup_file");
            return false;
        }
        
        // Keep only last 10 backups
        $backup_files = glob('materials-database-backup-*.json');
        if (count($backup_files) > 10) {
            // Sort by creation time and remove oldest
            usort($backup_files, function($a, $b) {
                return filemtime($a) - filemtime($b);
            });
            
            for ($i = 0; $i < count($backup_files) - 10; $i++) {
                unlink($backup_files[$i]);
            }
        }
    }
    return true;
}

/**
 * Handle GET request - return current materials database
 */
function handleGetRequest($database_file) {
    if (!file_exists($database_file)) {
        // Return empty database structure if file doesn't exist
        return [
            'success' => true,
            'data' => [
                'materials' => [],
                'version' => '1.0',
                'last_updated' => date('c'),
                'categories' => [
                    'hardwood' => ['name' => 'Hardwood', 'description' => 'Deciduous trees with dense wood'],
                    'softwood' => ['name' => 'Softwood', 'description' => 'Coniferous trees with lighter wood'],
                    'sheet_goods' => ['name' => 'Sheet Goods', 'description' => 'Manufactured wood products']
                ]
            ]
        ];
    }
    
    $json_data = file_get_contents($database_file);
    if ($json_data === false) {
        logError("Failed to read database file: $database_file");
        return [
            'success' => false,
            'message' => 'Failed to read database file'
        ];
    }
    
    $data = json_decode($json_data, true);
    if ($data === null) {
        logError("Invalid JSON in database file: $database_file");
        return [
            'success' => false,
            'message' => 'Invalid JSON in database file'
        ];
    }
    
    return [
        'success' => true,
        'data' => $data
    ];
}

/**
 * Handle POST request - save materials database
 */
function handlePostRequest($database_file) {
    // Get POST data
    $input = file_get_contents('php://input');
    if (empty($input)) {
        return [
            'success' => false,
            'message' => 'No data received'
        ];
    }
    
    // Decode JSON
    $data = json_decode($input, true);
    if ($data === null) {
        logError("Invalid JSON received: " . json_last_error_msg());
        return [
            'success' => false,
            'message' => 'Invalid JSON data: ' . json_last_error_msg()
        ];
    }
    
    // Validate data structure
    $validation_error = validateMaterialsData($data);
    if ($validation_error) {
        logError("Data validation failed: $validation_error");
        return [
            'success' => false,
            'message' => "Data validation failed: $validation_error"
        ];
    }
    
    // Create backup before saving
    if (!createBackup($database_file)) {
        return [
            'success' => false,
            'message' => 'Failed to create backup before saving'
        ];
    }
    
    // Add server-side metadata
    $data['last_updated'] = date('c');
    $data['server_info'] = [
        'saved_at' => date('c'),
        'server_version' => PHP_VERSION,
        'material_count' => count($data['materials'])
    ];
    
    // Write to file with atomic operation
    $temp_file = $database_file . '.tmp';
    $json_output = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    if (file_put_contents($temp_file, $json_output, LOCK_EX) === false) {
        logError("Failed to write temporary file: $temp_file");
        return [
            'success' => false,
            'message' => 'Failed to write temporary file'
        ];
    }
    
    // Atomic move
    if (!rename($temp_file, $database_file)) {
        logError("Failed to move temporary file to database file");
        unlink($temp_file); // Clean up
        return [
            'success' => false,
            'message' => 'Failed to finalize save operation'
        ];
    }
    
    // Log success
    $material_count = count($data['materials']);
    logError("Successfully saved $material_count materials to database");
    
    return [
        'success' => true,
        'message' => 'Materials database saved successfully',
        'material_count' => $material_count,
        'file_size' => filesize($database_file),
        'last_updated' => $data['last_updated']
    ];
}

// Main request handling
try {
    $response = [];
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $response = handleGetRequest($database_file);
            break;
            
        case 'POST':
            $response = handlePostRequest($database_file);
            break;
            
        default:
            $response = [
                'success' => false,
                'message' => 'Method not allowed. Use GET or POST.'
            ];
            http_response_code(405);
            break;
    }
    
    // Add debug info in development
    if (isset($_GET['debug'])) {
        $response['debug'] = [
            'method' => $_SERVER['REQUEST_METHOD'],
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
            'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set',
            'database_exists' => file_exists($database_file),
            'database_writable' => is_writable(dirname($database_file)),
            'php_version' => PHP_VERSION,
            'timestamp' => date('c')
        ];
    }
    
} catch (Exception $e) {
    logError("Unexpected error: " . $e->getMessage());
    $response = [
        'success' => false,
        'message' => 'An unexpected error occurred',
        'error_code' => 'INTERNAL_ERROR'
    ];
    http_response_code(500);
}

// Output response
echo json_encode($response, JSON_PRETTY_PRINT);
?>