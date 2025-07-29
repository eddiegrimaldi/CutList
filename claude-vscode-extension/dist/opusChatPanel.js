"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpusChatPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// --- CONFIGURATION ---
const CLAUDE_MODEL = 'claude-3-opus-20240229';
const SYSTEM_PROMPT = `You are a world-class software developer AI. Your role is to help the user with their software development tasks. Provide expert advice, code snippets, and solutions. Be concise and accurate.`;
// --- FILE PATHS ---
const UI_STATE_PATH = path.join(os.homedir(), '.opus_ui_state.json');
const CHAT_LOG_PATH = path.join(os.homedir(), '.opus_chat_log.txt');
const TOKEN_STATE_PATH = path.join(os.homedir(), '.opus_token_state.json');
// --- STATE MANAGEMENT ---
function saveUiState(state) {
    try {
        // JSON.stringify will handle escaping characters within the strings.
        // The previous custom sanitization was incorrect and causing JSON corruption.
        const jsonString = JSON.stringify(state, null, 2);
        fs.writeFileSync(UI_STATE_PATH, jsonString, 'utf8');
    }
    catch (e) {
    }
}
function loadUiState() {
    try {
        if (fs.existsSync(UI_STATE_PATH)) {
            return JSON.parse(fs.readFileSync(UI_STATE_PATH, 'utf8'));
        }
    }
    catch (e) {
    }
    return { vision: '', task: '', prompt: '' };
}
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function saveTokenState(state) {
    try {
        fs.writeFileSync(TOKEN_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    }
    catch (e) {
    }
}
function loadTokenState() {
    const defaultState = {
        date: getTodayDateString(),
        lastReplyTokens: 0,
        totalOutboundTokens: 0,
        totalInboundTokens: 0,
        grandTotalTokens: 0,
    };
    try {
        if (fs.existsSync(TOKEN_STATE_PATH)) {
            const state = JSON.parse(fs.readFileSync(TOKEN_STATE_PATH, 'utf8'));
            // If the saved date is not today, reset the daily counters
            if (state.date !== getTodayDateString()) {
                return defaultState; // Reset to default for the new day
            }
            return state;
        }
    }
    catch (e) {
    }
    return defaultState;
}
// --- LOGGING ---
function appendToChatLog(prompt, reply) {
    try {
        // Extract text from the prompt structure for logging
        const promptText = prompt.map(p => p.text || '').join('\n\n');
        const logEntry = `[${new Date().toISOString()}]\n--- PROMPT ---\n${promptText}\n--- REPLY ---\n${reply}\n\n====================\n\n`;
        fs.appendFileSync(CHAT_LOG_PATH, logEntry, 'utf8');
    }
    catch (e) {
    }
}
class OpusChatPanel {
    static createOrShow(extensionUri) {
        const column = vscode.ViewColumn.Beside;
        if (OpusChatPanel.currentPanel) {
            OpusChatPanel.currentPanel._panel.reveal(column);
            return;
        }
        // The localResourceRoots option MUST point to the root directory that contains the files you want to load.
        // By setting it to the extension's root URI, we are allowing the webview to load any file from within our extension's directory.
        const panel = vscode.window.createWebviewPanel('opusChat', 'Opus Chat', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri] // Allow access to the entire extension's directory
        });
        OpusChatPanel.currentPanel = new OpusChatPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._stitchedReplies = new Map();
        this._lastPromptId = null;
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._tokenState = loadTokenState();
        // Set the webview's initial html content
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);
        // Listen for messages from the webview
        this._panel.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
            switch (message.command) {
                case 'webviewReady':
                    // Webview is ready to receive the saved state and token counts
                    this._panel.webview.postMessage({ command: 'hydrate', state: loadUiState() });
                    this._panel.webview.postMessage({ command: 'updateTokenCounts', counts: this._tokenState });
                    return;
                case 'saveState':
                    saveUiState(message.state);
                    return;
                case 'sendToOpus':
                    this.handleSendToOpus(message);
                    return;
                case 'resetTokenCounts':
                    this.resetTokenCounts();
                    return;
                case 'debug':
                    return;
            }
        }), null, this._disposables);
    }
    _getHtmlForWebview(webview, extensionUri) {
        try {
            const panelHtmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'panel.html');
            let html = fs.readFileSync(panelHtmlPath.fsPath, 'utf8');
            const nonce = getNonce();
            const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
            const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));
            // Detailed logging
            // Replace placeholders with properly generated URIs and the nonce
            html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
            html = html.replace(/\{\{nonce\}\}/g, nonce);
            html = html.replace(/\{\{styleUri\}\}/g, styleUri.toString(true));
            html = html.replace(/\{\{scriptUri\}\}/g, scriptUri.toString(true));
            return html;
        }
        catch (e) {
            return `<html><body><h1>Error loading webview</h1><p>${e}</p></body></html>`;
        }
    }
    resetTokenCounts() {
        this._tokenState = {
            date: getTodayDateString(),
            lastReplyTokens: 0,
            totalOutboundTokens: 0,
            totalInboundTokens: 0,
            grandTotalTokens: 0,
        };
        saveTokenState(this._tokenState);
        this._panel.webview.postMessage({ command: 'updateTokenCounts', counts: this._tokenState });
    }
    handleSendToOpus(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const apiKey = vscode.workspace.getConfiguration('opusChat').get('apiKey');
            if (!apiKey) {
                this._panel.webview.postMessage({ command: 'opusReply', reply: 'API key not set. Please configure it in the settings.' });
                return;
            }
            const { mode, vision, task, prompt, files, lastReply } = message;
            const fullPrompt = this.buildFullPrompt(mode, vision, task, prompt, files, lastReply);
            // For new, non-continue prompts, generate a new ID for tracking stitched replies
            if (mode !== 'continue') {
                this._lastPromptId = `prompt_${Date.now()}`;
            }
            const promptId = this._lastPromptId;
            if (promptId) {
                this._stitchedReplies.set(promptId, ""); // Initialize or clear previous reply
            }
            let currentReplyOutputTokens = 0; // Tracker for the current reply's output tokens
            try {
                const response = yield (0, node_fetch_1.default)('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: CLAUDE_MODEL,
                        max_tokens: 4096,
                        system: SYSTEM_PROMPT,
                        messages: [{ role: "user", content: fullPrompt }],
                        stream: true
                    })
                });
                if (!response.ok || !response.body) {
                    const errorData = yield response.json();
                    const errorMessage = ((_a = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _a === void 0 ? void 0 : _a.message) || `API Error: ${response.statusText}`;
                    this._panel.webview.postMessage({ command: 'opusReply', reply: errorMessage });
                    return;
                }
                // Process the stream
                const stream = response.body;
                let buffer = '';
                stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                    let boundary;
                    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                        const rawMessage = buffer.substring(0, boundary);
                        buffer = buffer.substring(boundary + 2); // Consume the message and the delimiter
                        // Messages are composed of lines, the one we care about starts with 'data: '
                        const lines = rawMessage.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonStr = line.substring(6);
                                    const data = JSON.parse(jsonStr);
                                    if (data.type === 'content_block_delta' && data.delta.type === 'text_delta') {
                                        const textChunk = data.delta.text;
                                        if (textChunk) {
                                            this._panel.webview.postMessage({ command: 'opusReplyPart', reply: textChunk });
                                            if (promptId) {
                                                let currentReply = this._stitchedReplies.get(promptId) || "";
                                                this._stitchedReplies.set(promptId, currentReply + textChunk);
                                            }
                                        }
                                    }
                                    else if (data.type === 'message_start') {
                                        if (data.message && data.message.usage) {
                                            const inputTokens = data.message.usage.input_tokens || 0;
                                            this._tokenState.totalOutboundTokens += inputTokens;
                                            this._tokenState.grandTotalTokens += inputTokens;
                                        }
                                    }
                                    else if (data.type === 'message_delta') {
                                        if (data.usage && data.usage.output_tokens) {
                                            const newTotalOutput = data.usage.output_tokens;
                                            const increase = newTotalOutput - currentReplyOutputTokens;
                                            currentReplyOutputTokens = newTotalOutput; // update tracker
                                            this._tokenState.totalInboundTokens += increase;
                                            this._tokenState.grandTotalTokens += increase;
                                        }
                                    }
                                    else if (data.type === 'message_stop') {
                                        // Message is complete. Finalize token counts for this reply.
                                        this._tokenState.lastReplyTokens = currentReplyOutputTokens;
                                        saveTokenState(this._tokenState);
                                        this._panel.webview.postMessage({ command: 'updateTokenCounts', counts: this._tokenState });
                                        if (promptId) {
                                            const finalReply = this._stitchedReplies.get(promptId) || "";
                                            appendToChatLog(fullPrompt, finalReply);
                                            this._panel.webview.postMessage({ command: 'opusReplyDone' }); // Signal completion
                                        }
                                    }
                                }
                                catch (e) {
                                }
                            }
                        }
                    }
                });
                stream.on('end', () => {
                    // The 'message_stop' event is the definitive end, but we can log here if needed.
                });
                stream.on('error', (err) => {
                    this._panel.webview.postMessage({ command: 'opusReply', reply: 'API STREAM ERROR: ' + err.message });
                });
                // After sending a message with files, tell the UI to clear them.
                if (mode === 'chatWithFiles') {
                    this._panel.webview.postMessage({ command: 'clearFiles' });
                }
            }
            catch (e) {
                this._panel.webview.postMessage({ command: 'opusReply', reply: 'API ERROR: ' + e.message });
            }
        });
    }
    buildFullPrompt(mode, vision, task, prompt, files, lastReply) {
        let content = [];
        // Always add text parts first.
        let textParts = [];
        switch (mode) {
            case 'sendAll':
                if (vision)
                    textParts.push(`VISION:\n${vision}`);
                if (task)
                    textParts.push(`TASK:\n${task}`);
                if (prompt)
                    textParts.push(`PROMPT:\n${prompt}`);
                break;
            case 'chat':
            case 'chatWithFiles':
                textParts.push(prompt);
                break;
            case 'continue':
                textParts.push(`The previous response ended with:\n...${lastReply.slice(-300)}\n\nPlease continue from where you left off, without repeating the provided text.`);
                break;
        }
        if (textParts.length > 0) {
            // Use escaped newlines to ensure the string is valid
            content.push({ type: 'text', text: textParts.join('\n\n') });
        }
        // Then, add file parts
        if (files && (mode === 'sendAll' || mode === 'chatWithFiles')) {
            let fileTextParts = [];
            files.forEach(file => {
                fileTextParts.push(`--- FILE: ${file.name} ---\n\n\`\`\`\n${file.content}\n\`\`\``);
            });
            if (fileTextParts.length > 0) {
                let mainText = (content.length > 0 && content[0].type === 'text') ? content[0].text : '';
                const combinedText = [mainText, ...fileTextParts].join('\n\n');
                content = [{ type: 'text', text: combinedText }];
            }
        }
        return content;
    }
    dispose() {
        OpusChatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d)
                d.dispose();
        }
    }
}
exports.OpusChatPanel = OpusChatPanel;
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
