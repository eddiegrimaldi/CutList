<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = 'data';
$databaseFile = $dataDir . '/users-database.json';

// Create data directory if it doesn't exist
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Read existing database
function readDatabase($file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        return json_decode($content, true);
    }
    return ['users' => [], 'projects' => []];
}

// Write database
function writeDatabase($file, $data) {
    $jsonData = json_encode($data, JSON_PRETTY_PRINT);
    return file_put_contents($file, $jsonData) !== false;
}

// Generate unique project ID
function generateProjectID() {
    return 'project_' . time() . '_' . mt_rand(1000, 9999);
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
    $projectName = $projectData['projectName'] ?? 'Untitled Project';
    $description = $projectData['description'] ?? '';
    $workBenchParts = $projectData['workBenchParts'] ?? [];
    $assemblyParts = $projectData['assemblyParts'] ?? [];
    $currentBench = $projectData['currentBench'] ?? 'work';
    
    $database = readDatabase($databaseFile);
    
    // Check if user exists
    $userExists = false;
    foreach ($database['users'] as $user) {
        if ($user['userID'] === $userID) {
            $userExists = true;
            break;
        }
    }
    
    if (!$userExists) {
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }
    
    // Check if project already exists (update) or create new
    $projectID = $projectData['projectID'] ?? generateProjectID();
    $isUpdate = false;
    
    for ($i = 0; $i < count($database['projects']); $i++) {
        if ($database['projects'][$i]['projectID'] === $projectID) {
            // Update existing project
            $database['projects'][$i] = [
                'projectID' => $projectID,
                'userID' => $userID,
                'projectName' => $projectName,
                'description' => $description,
                'workBenchParts' => $workBenchParts,
                'assemblyParts' => $assemblyParts,
                'currentBench' => $currentBench,
                'createdAt' => $database['projects'][$i]['createdAt'],
                'modifiedAt' => date('c'),
                'isActive' => true
            ];
            $isUpdate = true;
            break;
        }
    }
    
    if (!$isUpdate) {
        // Create new project
        $newProject = [
            'projectID' => $projectID,
            'userID' => $userID,
            'projectName' => $projectName,
            'description' => $description,
            'workBenchParts' => $workBenchParts,
            'assemblyParts' => $assemblyParts,
            'currentBench' => $currentBench,
            'createdAt' => date('c'),
            'modifiedAt' => date('c'),
            'isActive' => true
        ];
        $database['projects'][] = $newProject;
    }
    
    $writeResult = writeDatabase($databaseFile, $database);
    if ($writeResult) {
        echo json_encode([
            'success' => true,
            'projectID' => $projectID,
            'action' => $isUpdate ? 'updated' : 'created'
        ]);
    } else {
        $error = error_get_last();
        echo json_encode([
            'success' => false, 
            'error' => 'Failed to save project',
            'debug' => [
                'file' => $databaseFile,
                'file_exists' => file_exists($databaseFile),
                'is_writable' => is_writable(dirname($databaseFile)),
                'last_error' => $error ? $error['message'] : 'No error details'
            ]
        ]);
    }
    
} else if ($method === 'GET') {
    // Load projects for user
    $userID = $_GET['userID'] ?? '';
    $projectID = $_GET['projectID'] ?? '';
    
    if (!$userID) {
        echo json_encode(['success' => false, 'error' => 'User ID required']);
        exit;
    }
    
    $database = readDatabase($databaseFile);
    
    if ($projectID) {
        // Load specific project
        foreach ($database['projects'] as $project) {
            if ($project['projectID'] === $projectID && $project['userID'] === $userID && $project['isActive']) {
                echo json_encode(['success' => true, 'project' => $project]);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Project not found']);
    } else {
        // Load all projects for user
        $userProjects = [];
        foreach ($database['projects'] as $project) {
            if ($project['userID'] === $userID && $project['isActive']) {
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