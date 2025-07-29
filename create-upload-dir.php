<?php
header('Content-Type: text/plain');

echo "=== CREATING UPLOAD DIRECTORY ===\n";

// Try different directory names
$testDirs = ['uploads', 'files', 'assets', 'data'];

foreach ($testDirs as $dirName) {
    echo "Testing directory: $dirName\n";
    
    if (!is_dir($dirName)) {
        if (mkdir($dirName, 0777)) {
            echo "  SUCCESS: Created directory $dirName\n";
            
            // Test if we can write to it
            $testFile = "$dirName/test.txt";
            if (file_put_contents($testFile, 'test content')) {
                echo "  SUCCESS: Can write to $dirName\n";
                unlink($testFile);
                
                // Try creating a subdirectory
                $subDir = "$dirName/materials";
                if (mkdir($subDir, 0777)) {
                    echo "  SUCCESS: Created subdirectory $subDir\n";
                    
                    $testFile2 = "$subDir/test2.txt";
                    if (file_put_contents($testFile2, 'test content 2')) {
                        echo "  SUCCESS: Can write to subdirectory $subDir\n";
                        unlink($testFile2);
                        
                        echo "  >>> USING DIRECTORY: $subDir <<<\n";
                        break;
                    } else {
                        echo "  FAILED: Cannot write to subdirectory $subDir\n";
                    }
                } else {
                    echo "  FAILED: Cannot create subdirectory $subDir\n";
                }
            } else {
                echo "  FAILED: Cannot write to $dirName\n";
            }
        } else {
            echo "  FAILED: Cannot create directory $dirName\n";
        }
    } else {
        echo "  Directory $dirName already exists\n";
    }
    echo "\n";
}

echo "=== DIRECTORY CREATION COMPLETE ===\n";
?>