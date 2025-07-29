<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$projectsDir = 'projects';
$usersFile = 'users.json';

// Create projects directory if it doesn't exist
if (!is_dir($projectsDir)) {
    mkdir($projectsDir, 0777, true);
}

// Initialize users file if it doesn't exist
if (!file_exists($usersFile)) {
    $defaultUsers = [
        'user_001' => [
            'userID' => 'user_001',
            'name' => 'Eddie Grimaldi',
            'email' => 'eddie@kettlebread.com',
            'phone' => '413-262-1435',
            'createdAt' => date('c'),
            'isActive' => true,
            'role' => 'admin'
        ]
    ];
    file_put_contents($usersFile, json_encode($defaultUsers, JSON_PRETTY_PRINT));
}

if ($method === 'POST') {
    // Save project
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['userID']) || !isset($input['projectData'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid input data']);
        exit;
    }
    
    $userID = $input['userID'];
    $projectData = $input['projectData'];
    
    // Check if user exists
    $users = json_decode(file_get_contents($usersFile), true);
    if (!isset($users[$userID])) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    // Generate project ID if not provided
    $projectID = $projectData['projectID'] ?? 'project_' . time() . '_' . mt_rand(1000, 9999);
    
    // Prepare project data
    $projectFile = $projectsDir . '/' . $userID . '_' . $projectID . '.json';
    $projectInfo = [
        'projectID' => $projectID,
        'userID' => $userID,
        'projectName' => $projectData['projectName'] ?? 'Untitled Project',
        'description' => $projectData['description'] ?? '',
        'workBenchParts' => $projectData['workBenchParts'] ?? [],
        'assemblyParts' => $projectData['assemblyParts'] ?? [],
        'currentBench' => $projectData['currentBench'] ?? 'work',
        'createdAt' => date('c'),
        'modifiedAt' => date('c'),
        'isActive' => true
    ];
    
    // Save project to individual file
    if (file_put_contents($projectFile, json_encode($projectInfo, JSON_PRETTY_PRINT))) {
        echo json_encode([
            'success' => true,
            'projectID' => $projectID,
            'action' => 'created'
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to save project']);
    }
    
} else if ($method === 'GET') {
    // Load projects for user
    $userID = $_GET['userID'] ?? '';
    $projectID = $_GET['projectID'] ?? '';
    
    if (!$userID) {
        echo json_encode(['success' => false, 'error' => 'User ID required']);
        exit;
    }
    
    if ($projectID) {
        // Load specific project
        $projectFile = $projectsDir . '/' . $userID . '_' . $projectID . '.json';
        if (file_exists($projectFile)) {
            $project = json_decode(file_get_contents($projectFile), true);
            echo json_encode(['success' => true, 'project' => $project]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Project not found']);
        }
    } else {
        // Load all projects for user
        $userProjects = [];
        $files = glob($projectsDir . '/' . $userID . '_*.json');
        
        foreach ($files as $file) {
            $project = json_decode(file_get_contents($file), true);
            if ($project && $project['isActive']) {
                $userProjects[] = [
                    'projectID' => $project['projectID'],
                    'projectName' => $project['projectName'],
                    'description' => $project['description'],
                    'createdAt' => $project['createdAt'],
                    'modifiedAt' => $project['modifiedAt']
                ];
            }
        }
        
        echo json_encode(['success' => true, 'projects' => $userProjects]);
    }
    
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}
?>