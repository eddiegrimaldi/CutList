<?php
/**
 * Upload Material Image - Handle image file uploads for materials
 * Saves images to materials/[material_id]/ directory and returns file path
 */

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Handle CORS
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

/**
 * Log errors for debugging
 */
function logError($message) {
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[$timestamp] IMAGE UPLOAD: $message\n";
    file_put_contents('materials-errors.log', $log_message, FILE_APPEND | LOCK_EX);
}

/**
 * Create directory if it doesn't exist
 */
function createDirectory($path) {
    if (!is_dir($path)) {
        if (!mkdir($path, 0755, true)) {
            logError("Failed to create directory: $path - parent dir writable: " . (is_writable(dirname($path)) ? 'yes' : 'no'));
            return false;
        }
        logError("Created directory: $path");
    } else {
        logError("Directory already exists: $path");
    }
    return true;
}

/**
 * Validate image file
 */
function validateImageFile($file) {
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return 'No file uploaded or invalid upload';
    }
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return 'Upload error: ' . $file['error'];
    }
    
    if ($file['size'] > $maxSize) {
        return 'File too large. Maximum size is 5MB';
    }
    
    // Use alternative method if finfo is not available
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
    } else {
        // Fallback to checking file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $extensionToMime = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg', 
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp'
        ];
        
        if (!isset($extensionToMime[$extension])) {
            return 'Invalid file extension. Allowed: jpg, jpeg, png, gif, webp';
        }
        
        $mimeType = $extensionToMime[$extension];
    }
    
    if (!in_array($mimeType, $allowedTypes)) {
        return 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP';
    }
    
    return null; // Valid
}

/**
 * Generate safe filename
 */
function generateFilename($originalName, $materialId, $imageType) {
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $safeMaterialId = preg_replace('/[^a-zA-Z0-9_-]/', '', $materialId);
    $safeImageType = preg_replace('/[^a-zA-Z0-9_-]/', '', $imageType);
    
    return $safeMaterialId . '_' . $safeImageType . '.' . $extension;
}

// Main upload handling
try {
    logError("Upload script started");
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed');
    }
    
    if (!isset($_FILES['image']) || !isset($_POST['materialId']) || !isset($_POST['imageType'])) {
        logError("Missing parameters - FILES: " . print_r($_FILES, true) . " POST: " . print_r($_POST, true));
        throw new Exception('Missing required parameters');
    }
    
    $file = $_FILES['image'];
    $materialId = $_POST['materialId'];
    $imageType = $_POST['imageType'];
    
    logError("Processing upload - Material: $materialId, Type: $imageType, File: " . $file['name']);
    
    // Validate file
    $validationError = validateImageFile($file);
    if ($validationError) {
        logError("Validation failed: $validationError");
        throw new Exception($validationError);
    }
    
    // Create directory structure in data/materials/
    $baseDir = 'data/materials';
    $materialDir = $baseDir . '/' . $materialId;
    
    logError("Creating directories: $baseDir, $materialDir");
    
    if (!createDirectory($baseDir) || !createDirectory($materialDir)) {
        logError("Failed to create directories");
        throw new Exception('Failed to create upload directory');
    }
    
    // Generate filename and path
    $filename = generateFilename($file['name'], $materialId, $imageType);
    $targetPath = $materialDir . '/' . $filename;
    $relativePath = $targetPath; // Path relative to web root
    
    logError("Target path: $targetPath");
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        logError("Failed to move file from " . $file['tmp_name'] . " to $targetPath");
        throw new Exception('Failed to move uploaded file');
    }
    
    // Log success
    logError("Successfully uploaded image: $relativePath");
    
    // Return success response
    echo json_encode([
        'success' => true,
        'filePath' => $relativePath,
        'filename' => $filename,
        'materialId' => $materialId,
        'imageType' => $imageType,
        'fileSize' => filesize($targetPath)
    ]);
    
} catch (Exception $e) {
    logError("Upload error: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (Error $e) {
    logError("PHP Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>