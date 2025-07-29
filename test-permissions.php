<?php
// Test file permissions and upload directory
header('Content-Type: text/plain');

echo "=== DIRECTORY PERMISSIONS TEST ===\n";
echo "Current working directory: " . getcwd() . "\n";
echo "Materials directory exists: " . (is_dir('materials') ? 'YES' : 'NO') . "\n";
echo "Materials directory writable: " . (is_writable('materials') ? 'YES' : 'NO') . "\n";
echo "Materials directory permissions: " . (file_exists('materials') ? substr(sprintf('%o', fileperms('materials')), -4) : 'N/A') . "\n";

echo "\nWalnut directory exists: " . (is_dir('materials/walnut_001') ? 'YES' : 'NO') . "\n";
echo "Walnut directory writable: " . (is_writable('materials/walnut_001') ? 'YES' : 'NO') . "\n";
echo "Walnut directory permissions: " . (file_exists('materials/walnut_001') ? substr(sprintf('%o', fileperms('materials/walnut_001')), -4) : 'N/A') . "\n";

echo "\nPHP upload settings:\n";
echo "file_uploads: " . (ini_get('file_uploads') ? 'ON' : 'OFF') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_tmp_dir: " . ini_get('upload_tmp_dir') . "\n";

echo "\nTrying to create test file...\n";
$testFile = 'materials/walnut_001/test.txt';
$success = file_put_contents($testFile, 'test content');
if ($success) {
    echo "SUCCESS: Created test file\n";
    unlink($testFile);
} else {
    echo "FAILED: Could not create test file\n";
}

echo "\nWeb server user: " . get_current_user() . "\n";
echo "Web server process owner: " . posix_getpwuid(posix_geteuid())['name'] . "\n";
?>