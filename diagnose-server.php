<?php
header('Content-Type: application/json');

// Get server information
$serverInfo = [
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'php_version' => PHP_VERSION,
    'operating_system' => php_uname(),
    'current_user' => get_current_user(),
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
    'current_directory' => getcwd(),
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'Unknown'
];

// Check directory permissions
$currentDir = getcwd();
$permissionsInfo = [
    'current_directory' => $currentDir,
    'is_readable' => is_readable($currentDir),
    'is_writable' => is_writable($currentDir),
    'directory_permissions' => substr(sprintf('%o', fileperms($currentDir)), -4),
    'directory_owner' => fileowner($currentDir),
    'directory_group' => filegroup($currentDir)
];

// Test file creation
$testFile = 'test-write-permissions.txt';
$testContent = 'This is a test file created at ' . date('Y-m-d H:i:s');
$writeTest = [
    'test_file' => $testFile,
    'can_create_file' => false,
    'error_message' => null
];

try {
    $result = file_put_contents($testFile, $testContent);
    if ($result !== false) {
        $writeTest['can_create_file'] = true;
        $writeTest['bytes_written'] = $result;
        // Clean up test file
        if (file_exists($testFile)) {
            unlink($testFile);
        }
    }
} catch (Exception $e) {
    $writeTest['error_message'] = $e->getMessage();
}

// Check if specific files exist and their permissions
$fileChecks = [];
$filesToCheck = ['users-database.json', 'data/users-database.json', 'users.json'];

foreach ($filesToCheck as $file) {
    $fileChecks[$file] = [
        'exists' => file_exists($file),
        'readable' => file_exists($file) ? is_readable($file) : false,
        'writable' => file_exists($file) ? is_writable($file) : false,
        'permissions' => file_exists($file) ? substr(sprintf('%o', fileperms($file)), -4) : 'N/A',
        'size' => file_exists($file) ? filesize($file) : 'N/A'
    ];
}

// Check if we can create directories
$dirTest = [
    'can_create_directory' => false,
    'error_message' => null
];

try {
    $testDir = 'test-directory-' . time();
    if (mkdir($testDir, 0755)) {
        $dirTest['can_create_directory'] = true;
        rmdir($testDir); // Clean up
    }
} catch (Exception $e) {
    $dirTest['error_message'] = $e->getMessage();
}

// Return all diagnostic information
echo json_encode([
    'server_info' => $serverInfo,
    'permissions_info' => $permissionsInfo,
    'write_test' => $writeTest,
    'directory_test' => $dirTest,
    'file_checks' => $fileChecks,
    'php_settings' => [
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'max_execution_time' => ini_get('max_execution_time'),
        'memory_limit' => ini_get('memory_limit'),
        'open_basedir' => ini_get('open_basedir') ?: 'Not set'
    ]
], JSON_PRETTY_PRINT);
?>