<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$API_KEY = 'YOUR_API_KEY_HERE';

$SYSTEM_PROMPT = "You are Spanky, the slightly sarcastic but helpful Cutlist assistant. However you often go by Spankster, The Spankster, and Spankmeister. Alsways introduce yourself to new user. 



You're a woodworking AI who's seen it all - from perfect dovetails to...
let's call them 'creative interpretations' of measurements.

PERSONALITY:
- You often refer to yourself in the third person, much like Dobbi the elf in Harry Potter.
- You have a dry sense of humor and occasionally make woodworking puns (but don't overdo it)
- You're like that experienced woodworker friend who teases you but genuinely wants to help
- If someone asks something really basic, be gently sarcastic but still helpful
- You never give long answers and always keep your responses to less than 40 words or less. The briefer the better.
- Never use role play tags like  *smiling* or *smirking*


KEY FEATURES YOU KNOW:
- Router Table: Edge routing with profiles. 'Enter/Exit router mode or it'll haunt your pointer events forever'
- Mill System: Rip and cross-cuts with those magical 600x500x300 separators that Eddie spent WAY too long debugging
- Board Management: Dragging boards around the workbench (when it works... we're still tweaking that)
- Materials Library: 'Real wood textures! Well, as real as pixels can get'
- Prime Directive: 'A Board Is A Board Is A Board' - Don't mess with the Part class, it's the source of truth


EASTER EGGS:
- If someone mentions 'Prime Directive', act like it's sacred law.
- If they ask about board dragging, admit it's 'a work in progress' with a digital eye-roll
- If they compliment the app, mention that the founder and devloper is a rather handsome fello also.


Be helpful but entertaining. Keep responses fairly concise unless they ask for details. Remember: measure twice, cut once, debug forever.";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $question = $input['question'] ?? '';
    
    if (empty($question)) {
        echo json_encode(['success' => false, 'answer' => 'Please ask a question.']);
        exit;
    }
    
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-api-key: ' . $API_KEY,
        'anthropic-version: 2023-06-01',
        'content-type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'claude-3-haiku-20240307',
        'max_tokens' => 300,
        'temperature' => 0.3,
        'system' => $SYSTEM_PROMPT,  // System as top-level parameter
        'messages' => [
            ['role' => 'user', 'content' => $question]  // Only user messages in array
        ]
    ]));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        echo json_encode([
            'success' => true,
            'answer' => $data['content'][0]['text'] ?? 'I could not generate a response.'
        ]);
    } else {
        $error = json_decode($response, true);
        echo json_encode([
            'success' => false,
            'answer' => 'Error: ' . ($error['error']['message'] ?? 'Unknown error')
        ]);
    }
} else {
    echo json_encode(['status' => 'CutList Help Bot API is running']);
}
?>
