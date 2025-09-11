<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// For handling AJAX file upload
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if it's a file upload or just bit data
    if (isset($_FILES['bitFile'])) {
        // Handle actual file upload
        $uploadedFile = $_FILES['bitFile'];
        $bitName = $_POST['bitName'] ?? 'custom_bit';
        
        // Validate file extension
        $allowedExtensions = ['stl', 'obj'];
        $fileExtension = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));
        
        if (!in_array($fileExtension, $allowedExtensions)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid file type. Only STL and OBJ files are allowed.']);
            exit;
        }
        
        // Set upload directory
        $uploadDir = __DIR__ . '/data/router-bits/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate safe filename
        $safeFileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $bitName) . '.' . $fileExtension;
        $targetPath = $uploadDir . $safeFileName;
        
        // Move uploaded file
        if (move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
            // Update the bits list JSON
            $listFile = $uploadDir . 'list.json';
            $bitsList = [];
            
            if (file_exists($listFile)) {
                $bitsList = json_decode(file_get_contents($listFile), true) ?? [];
            }
            
            // Add or update bit in list
            $found = false;
            foreach ($bitsList as &$bit) {
                if ($bit['name'] === $bitName) {
                    $bit['file'] = $safeFileName;
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                $bitsList[] = ['name' => $bitName, 'file' => $safeFileName];
            }
            
            // Save updated list
            file_put_contents($listFile, json_encode($bitsList, JSON_PRETTY_PRINT));
            
            echo json_encode([
                'success' => true,
                'message' => 'Router bit uploaded successfully',
                'fileName' => $safeFileName,
                'bitName' => $bitName
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save uploaded file']);
        }
    } else if (isset($_POST['action']) && $_POST['action'] === 'saveBit') {
        // Save bit data from browser (base64 encoded)
        $bitName = $_POST['bitName'];
        $fileData = $_POST['fileData'];
        $fileName = $_POST['fileName'];
        
        $uploadDir = __DIR__ . '/data/router-bits/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Decode base64 data
        $fileContent = base64_decode($fileData);
        
        // Save file
        $safeFileName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $bitName) . '.' . pathinfo($fileName, PATHINFO_EXTENSION);
        $targetPath = $uploadDir . $safeFileName;
        
        if (file_put_contents($targetPath, $fileContent)) {
            // Update list
            $listFile = $uploadDir . 'list.json';
            $bitsList = [];
            
            if (file_exists($listFile)) {
                $bitsList = json_decode(file_get_contents($listFile), true) ?? [];
            }
            
            $found = false;
            foreach ($bitsList as &$bit) {
                if ($bit['name'] === $bitName) {
                    $bit['file'] = $safeFileName;
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                $bitsList[] = ['name' => $bitName, 'file' => $safeFileName];
            }
            
            file_put_contents($listFile, json_encode($bitsList, JSON_PRETTY_PRINT));
            
            echo json_encode(['success' => true, 'fileName' => $safeFileName]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save file']);
        }
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return list of available bits
    $listFile = __DIR__ . '/data/router-bits/list.json';
    if (file_exists($listFile)) {
        echo file_get_contents($listFile);
    } else {
        echo json_encode([]);
    }
}
?>
