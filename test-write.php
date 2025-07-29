<?php
header('Content-Type: text/plain');

echo "=== WRITE PERMISSION TEST ===\n";

// Test 1: Can we write to the current directory?
echo "1. Testing write to current directory:\n";
$testFile1 = 'test_write_' . time() . '.txt';
$success1 = file_put_contents($testFile1, 'test content');
if ($success1) {
    echo "   SUCCESS: Can write to current directory\n";
    unlink($testFile1);
} else {
    echo "   FAILED: Cannot write to current directory\n";
}

// Test 2: Check detailed directory info
echo "\n2. Directory information:\n";
echo "   Current directory: " . getcwd() . "\n";
echo "   Directory writable: " . (is_writable('.') ? 'YES' : 'NO') . "\n";
echo "   Directory permissions: " . substr(sprintf('%o', fileperms('.')), -4) . "\n";

// Test 3: Check what user we're running as
echo "\n3. Process information:\n";
echo "   PHP user: " . get_current_user() . "\n";
if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
    echo "   Process owner: " . posix_getpwuid(posix_geteuid())['name'] . "\n";
}

// Test 4: Check temp directory access
echo "\n4. Temp directory test:\n";
$tempDir = sys_get_temp_dir();
echo "   Temp directory: $tempDir\n";
$tempFile = $tempDir . '/test_cutlist_' . time() . '.txt';
$success4 = file_put_contents($tempFile, 'test content');
if ($success4) {
    echo "   SUCCESS: Can write to temp directory\n";
    unlink($tempFile);
} else {
    echo "   FAILED: Cannot write to temp directory\n";
}

// Test 5: PHP upload configuration
echo "\n5. PHP Upload Configuration:\n";
echo "   file_uploads: " . (ini_get('file_uploads') ? 'ON' : 'OFF') . "\n";
echo "   upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "   post_max_size: " . ini_get('post_max_size') . "\n";
echo "   max_file_uploads: " . ini_get('max_file_uploads') . "\n";
echo "   upload_tmp_dir: " . (ini_get('upload_tmp_dir') ?: 'system default') . "\n";

// Test 6: Try to receive a file upload
echo "\n6. File upload test:\n";
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['test_upload'])) {
    $uploadedFile = $_FILES['test_upload'];
    echo "   File received: " . $uploadedFile['name'] . "\n";
    echo "   File size: " . $uploadedFile['size'] . "\n";
    echo "   Upload error: " . $uploadedFile['error'] . "\n";
    echo "   Temp file: " . $uploadedFile['tmp_name'] . "\n";
    echo "   Temp file exists: " . (file_exists($uploadedFile['tmp_name']) ? 'YES' : 'NO') . "\n";
    
    if ($uploadedFile['error'] === UPLOAD_ERR_OK) {
        $targetFile = 'uploaded_test_' . time() . '.txt';
        if (move_uploaded_file($uploadedFile['tmp_name'], $targetFile)) {
            echo "   SUCCESS: File upload and move successful\n";
            unlink($targetFile);
        } else {
            echo "   FAILED: Could not move uploaded file\n";
        }
    }
} else {
    echo "   No file upload to test. Send POST with 'test_upload' file to test.\n";
}
?>