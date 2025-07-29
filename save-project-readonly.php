<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

// Since we can't write files, let's return the data to be stored client-side
// but provide a server-side API structure for when permissions are fixed

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['userID']) || !isset($input['projectData'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid input data']);
        exit;
    }
    
    $userID = $input['userID'];
    $projectData = $input['projectData'];
    
    // Validate user (hardcoded for now until file permissions are fixed)
    if ($userID !== 'user_001') {
        echo json_encode(['success' => false, 'error' => 'Invalid user']);
        exit;
    }
    
    // Generate project ID
    $projectID = 'project_' . time() . '_' . mt_rand(1000, 9999);
    
    // Return success with project data for client-side storage
    echo json_encode([
        'success' => true,
        'projectID' => $projectID,
        'action' => 'validated',
        'message' => 'Project validated. Currently using client-side storage until server permissions are configured.',
        'server_storage_ready' => false,
        'project_data' => [
            'projectID' => $projectID,
            'userID' => $userID,
            'projectName' => $projectData['projectName'] ?? 'Untitled Project',
            'description' => $projectData['description'] ?? '',
            'workBenchParts' => $projectData['workBenchParts'] ?? [],
            'assemblyParts' => $projectData['assemblyParts'] ?? [],
            'currentBench' => $projectData['currentBench'] ?? 'work',
            'cameraState' => $projectData['cameraState'] ?? null,
            'savedAt' => $projectData['savedAt'] ?? date('c'),
            'createdAt' => date('c'),
            'modifiedAt' => date('c'),
            'isActive' => true
        ]
    ]);
    
} else if ($method === 'GET') {
    // For now, return empty projects array since we can't read from files
    $userID = $_GET['userID'] ?? '';
    $projectID = $_GET['projectID'] ?? '';
    
    if (!$userID) {
        echo json_encode(['success' => false, 'error' => 'User ID required']);
        exit;
    }
    
    if ($userID !== 'user_001') {
        echo json_encode(['success' => false, 'error' => 'Invalid user']);
        exit;
    }
    
    if ($projectID) {
        echo json_encode([
            'success' => false, 
            'error' => 'Server-side project storage not available yet',
            'message' => 'Please configure server permissions first'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'projects' => [],
            'message' => 'Server-side project storage not available yet. Using client-side storage.',
            'server_storage_ready' => false
        ]);
    }
    
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}
?>