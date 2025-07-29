<?php
header('Content-Type: application/json');

// Try to fix permissions from PHP
$results = [];

// Create data directory with proper permissions
$dataDir = 'data';
if (!is_dir($dataDir)) {
    $results['create_data_dir'] = mkdir($dataDir, 0755, true);
    if ($results['create_data_dir']) {
        chmod($dataDir, 0755);
    }
} else {
    $results['data_dir_exists'] = true;
}

// Try to set permissions on current directory
$results['chmod_current_dir'] = chmod('.', 0755);

// Try to set permissions on data directory
if (is_dir($dataDir)) {
    $results['chmod_data_dir'] = chmod($dataDir, 0755);
}

// Try to create a test file
$testFile = 'php-write-test.txt';
$testContent = 'PHP write test - ' . date('Y-m-d H:i:s');

try {
    $writeResult = file_put_contents($testFile, $testContent);
    if ($writeResult !== false) {
        $results['write_test'] = [
            'success' => true,
            'bytes_written' => $writeResult,
            'file_exists' => file_exists($testFile),
            'file_readable' => is_readable($testFile),
            'file_writable' => is_writable($testFile)
        ];
        
        // Clean up test file
        if (file_exists($testFile)) {
            unlink($testFile);
        }
    } else {
        $results['write_test'] = [
            'success' => false,
            'error' => 'file_put_contents returned false'
        ];
    }
} catch (Exception $e) {
    $results['write_test'] = [
        'success' => false,
        'error' => $e->getMessage()
    ];
}

// Try Windows-specific commands if available
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    $results['windows_detected'] = true;
    
    // Try to execute icacls command
    $currentDir = getcwd();
    $icaclsCommand = 'icacls "' . $currentDir . '" /grant IIS_IUSRS:(OI)(CI)F /T 2>&1';
    
    $output = [];
    $returnCode = null;
    
    exec($icaclsCommand, $output, $returnCode);
    
    $results['icacls_attempt'] = [
        'command' => $icaclsCommand,
        'return_code' => $returnCode,
        'output' => implode('\n', $output)
    ];
}

// Check current permissions after attempts
$finalCheck = [
    'current_dir_writable' => is_writable('.'),
    'data_dir_writable' => is_dir($dataDir) ? is_writable($dataDir) : false,
    'current_dir_permissions' => substr(sprintf('%o', fileperms('.')), -4),
    'data_dir_permissions' => is_dir($dataDir) ? substr(sprintf('%o', fileperms($dataDir)), -4) : 'N/A'
];

echo json_encode([
    'timestamp' => date('Y-m-d H:i:s'),
    'server_info' => [
        'os' => PHP_OS,
        'user' => get_current_user(),
        'current_dir' => getcwd()
    ],
    'permission_fix_attempts' => $results,
    'final_check' => $finalCheck
], JSON_PRETTY_PRINT);
?>