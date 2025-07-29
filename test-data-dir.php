<?php
header('Content-Type: text/plain');

echo "=== TESTING EXISTING DATA DIRECTORY ===\n";

// Test the existing data directory
$dataDir = 'data';

echo "Testing data directory: $dataDir\n";
echo "Directory exists: " . (is_dir($dataDir) ? 'YES' : 'NO') . "\n";
echo "Directory writable: " . (is_writable($dataDir) ? 'YES' : 'NO') . "\n";
echo "Directory permissions: " . (file_exists($dataDir) ? substr(sprintf('%o', fileperms($dataDir)), -4) : 'N/A') . "\n";

// Try to write a test file
$testFile = "$dataDir/test_write.txt";
$success = file_put_contents($testFile, 'test content from PHP');
if ($success) {
    echo "SUCCESS: Can write to data directory!\n";
    unlink($testFile);
    
    // Try to create a materials subdirectory
    $materialsDir = "$dataDir/materials";
    if (!is_dir($materialsDir)) {
        if (mkdir($materialsDir, 0777)) {
            echo "SUCCESS: Created materials subdirectory\n";
        } else {
            echo "FAILED: Cannot create materials subdirectory\n";
        }
    } else {
        echo "Materials subdirectory already exists\n";
    }
    
    // Test writing to materials subdirectory
    if (is_dir($materialsDir)) {
        $testFile2 = "$materialsDir/test_material.txt";
        $success2 = file_put_contents($testFile2, 'test material content');
        if ($success2) {
            echo "SUCCESS: Can write to materials subdirectory!\n";
            unlink($testFile2);
            
            // Try creating a specific material directory
            $walnutDir = "$materialsDir/walnut_001";
            if (!is_dir($walnutDir)) {
                if (mkdir($walnutDir, 0777)) {
                    echo "SUCCESS: Created walnut_001 directory\n";
                } else {
                    echo "FAILED: Cannot create walnut_001 directory\n";
                }
            } else {
                echo "Walnut directory already exists\n";
            }
            
            // Test final write location
            if (is_dir($walnutDir)) {
                $testFile3 = "$walnutDir/test_image.jpg";
                $success3 = file_put_contents($testFile3, 'fake image data');
                if ($success3) {
                    echo "SUCCESS: Can write images to $walnutDir\n";
                    unlink($testFile3);
                    echo "\n>>> PERFECT! Use directory: $walnutDir <<<\n";
                } else {
                    echo "FAILED: Cannot write to walnut directory\n";
                }
            }
        } else {
            echo "FAILED: Cannot write to materials subdirectory\n";
        }
    }
} else {
    echo "FAILED: Cannot write to data directory\n";
}

echo "\n=== TEST COMPLETE ===\n";
?>