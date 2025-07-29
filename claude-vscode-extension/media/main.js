(function () {
    try {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'debug', text: 'main.js script started' });

        document.addEventListener('DOMContentLoaded', function () {
            vscode.postMessage({ command: 'debug', text: 'DOM fully loaded.' });

            // Get DOM elements
            const visionTab = document.getElementById('vision-tab');
            const taskTab = document.getElementById('task-tab');
            const promptTab = document.getElementById('prompt-tab');

            const modeTitle = document.getElementById('mode-title');
            const modeDescription = document.getElementById('mode-description');

            if (!visionTab) {
                vscode.postMessage({ command: 'debug', text: 'CRITICAL: visionTab element not found after DOMContentLoaded.' });
                return;
            }

            const visionContent = document.getElementById('vision-content');
            const taskContent = document.getElementById('task-content');
            const promptContent = document.getElementById('prompt-content');

            const visionText = document.getElementById('vision-text');
            const taskText = document.getElementById('task-text');
            const promptText = document.getElementById('prompt-text');

            const sendAllButton = document.getElementById('send-all-btn');
            const sendChatButton = document.getElementById('send-chat-btn');
            const sendWithFilesButton = document.getElementById('send-with-files-btn');
            const continueButton = document.getElementById('continue-btn');
            const copyButton = document.getElementById('copy-btn');
            const clearButton = document.getElementById('clear-btn');

            const fileInput = document.getElementById('file-input');
            const fileList = document.getElementById('file-list');
            const chatContainer = document.getElementById('chat-container');

            // Token Status Bar Elements
            const promptTokensValue = document.getElementById('prompt-tokens-value');
            const lastReplyTokensValue = document.getElementById('last-reply-tokens-value');
            const totalOutboundValue = document.getElementById('total-outbound-value');
            const totalInboundValue = document.getElementById('total-inbound-value');
            const grandTotalValue = document.getElementById('grand-total-value');
            const resetTokensButton = document.getElementById('reset-tokens-btn');

            let attachedFiles = [];
            let lastReply = "";

            // --- STATE MANAGEMENT ---
            function saveState() {
                const state = {
                    vision: visionText.value,
                    task: taskText.value,
                    prompt: promptText.value,
                    chatLog: chatContainer.innerHTML
                };
                vscode.postMessage({ command: 'saveState', state: state });
            }

            // Debounce saveState to avoid excessive messages
            let saveTimeout;
            function debouncedSaveState() {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveState, 300); // Save after 300ms of inactivity
            }

            // --- TOKEN CALCULATION ---
            // Basic token estimation function (can be improved)
            function estimateTokens(text) {
                if (!text) return 0;
                // A common rough estimate is 1 token ~ 4 characters
                return Math.ceil(text.length / 4);
            }

            function updatePromptTokens() {
                const vision = visionText.value;
                const task = taskText.value;
                const prompt = promptText.value;

                // This logic should mirror the prompt construction in the backend
                // to give an accurate estimate of what will be sent.
                const fullPromptText = `--- VISION ---\n${vision}\n\n--- TASK ---\n${task}\n\n--- PROMPT ---\n${prompt}`;
                
                const totalTokens = estimateTokens(fullPromptText);
                promptTokensValue.textContent = totalTokens;
            }

            // --- TAB HANDLING ---
            function openTab(evt, tabName) {
                Array.from(document.getElementsByClassName('tab-content')).forEach(tc => tc.style.display = 'none');
                Array.from(document.getElementsByClassName('tab')).forEach(t => t.classList.remove('active'));
                document.getElementById(tabName + '-content').style.display = 'flex';
                evt.currentTarget.classList.add('active');

                // Update the mode header based on the active tab
                if (tabName === 'vision') {
                    modeTitle.textContent = 'Vision';
                    modeDescription.textContent = 'High-level goals, concepts, and ideas...';
                } else if (tabName === 'task') {
                    modeTitle.textContent = 'Task';
                    modeDescription.textContent = 'The specific task you are currently working on...';
                } else { // prompt
                    modeTitle.textContent = 'Prompt';
                    modeDescription.textContent = 'Your message to Opus...';
                }
            }

            visionTab.addEventListener('click', (e) => openTab(e, 'vision'));
            taskTab.addEventListener('click', (e) => openTab(e, 'task'));
            promptTab.addEventListener('click', (e) => openTab(e, 'prompt'));

            // --- EVENT LISTENERS ---
            visionText.addEventListener('input', () => { debouncedSaveState(); updatePromptTokens(); });
            taskText.addEventListener('input', () => { debouncedSaveState(); updatePromptTokens(); });
            promptText.addEventListener('input', () => { debouncedSaveState(); updatePromptTokens(); });

            sendAllButton.addEventListener('click', () => sendToOpus('sendAll'));
            sendChatButton.addEventListener('click', () => sendToOpus('chat'));
            sendWithFilesButton.addEventListener('click', () => sendToOpus('chatWithFiles'));
            continueButton.addEventListener('click', () => sendToOpus('continue'));

            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(lastReply).then(() => {
                    // Optional: show a confirmation
                });
            });

            clearButton.addEventListener('click', () => {
                // Only clear the chat container and the last reply memory.
                chatContainer.innerHTML = "";
                lastReply = "";
                // The other text areas (vision, task, prompt) are NOT cleared.
                saveState(); // Save the cleared chat state.
            });

            resetTokensButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'resetTokenCounts' });
            });

            const attachFilesButton = document.getElementById('attach-files-btn');
            attachFilesButton.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileSelection);

            // --- MESSAGE HANDLING FROM EXTENSION ---
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'hydrate':
                        hydrateUI(message.state);
                        break;
                    case 'opusReplyPart':
                        appendAssistantMessageChunk(message.reply);
                        break;
                    case 'opusReplyDone':
                        finalizeAssistantMessage();
                        break;
                    case 'updateTokenCounts':
                        updateTokenDisplay(message.counts);
                        break;
                    case 'opusReply': // For single, non-streamed messages
                        appendAssistantMessage(message.reply);
                        break;
                    case 'clearFiles':
                        clearFiles();
                        break;
                }
            });

            // --- FUNCTIONS ---
            function sendToOpus(mode) {
                let userMessageContent = "";

                if (mode === 'sendAll') {
                    const vision = visionText.value.trim();
                    const task = taskText.value.trim();
                    const prompt = promptText.value.trim();
                    
                    let parts = [];
                    if (vision) parts.push("--- VISION ---\n" + vision);
                    if (task) parts.push("--- TASK ---\n" + task);
                    if (prompt) parts.push("--- PROMPT ---\n" + prompt);

                    userMessageContent = parts.join("\n\n");
                } else if (mode === 'chat' || mode === 'chatWithFiles') {
                    userMessageContent = promptText.value;
                } else if (mode === 'continue') {
                    // For 'continue', we don't add a new user message.
                    // The prompt is constructed on the backend.
                }

                if (userMessageContent) {
                    appendUserMessage(userMessageContent);
                }

                vscode.postMessage({
                    command: 'sendToOpus',
                    mode: mode,
                    vision: visionText.value,
                    task: taskText.value,
                    prompt: promptText.value,
                    files: attachedFiles,
                    lastReply: lastReply
                });

                // Only start a new assistant message bubble if it's not a continuation.
                if (mode !== 'continue') {
                    startNewAssistantMessage();
                }
                if (mode === 'chat' || mode === 'chatWithFiles' || mode === 'sendAll') {
                    promptText.value = ""; // Clear prompt input after sending
                }
                // Do not save state here, wait for the reply to be complete.
            }

            function handleFileSelection(event) {
                const files = event.target.files;
                fileList.innerHTML = 'Reading files...';
                attachedFiles = [];
                let readPromises = [];

                for (const file of files) {
                    let promise = new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            attachedFiles.push({ name: file.name, content: e.target.result });
                            resolve();
                        };
                        reader.readAsText(file);
                    });
                    readPromises.push(promise);
                }

                Promise.all(readPromises).then(() => {
                    fileList.innerHTML = `${attachedFiles.length} file(s) attached: ${attachedFiles.map(f => f.name).join(', ')}`;
                });
            }

            function clearFiles() {
                attachedFiles = [];
                fileInput.value = "";
                fileList.innerHTML = "";
            }

            function hydrateUI(state) {
                vscode.postMessage({ command: 'debug', text: 'Hydrating UI with state: ' + JSON.stringify(state) });
                if (!state) return;
                visionText.value = state.vision || '';
                taskText.value = state.task || '';
                promptText.value = state.prompt || '';
                if (state.chatLog) {
                    chatContainer.innerHTML = state.chatLog;
                    // Find the last reply to enable the "Continue" button
                    const lastMessage = chatContainer.querySelector('.assistant-message:last-child pre');
                    if (lastMessage) {
                        lastReply = lastMessage.textContent;
                    }
                    // Scroll to the bottom of the chat container after hydrating
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
                // Also hydrate token counts
                updatePromptTokens();
            }

            function updateTokenDisplay(counts) {
                if (!counts) return;
                lastReplyTokensValue.textContent = counts.lastReplyTokens || 0;
                totalOutboundValue.textContent = counts.totalOutboundTokens || 0;
                totalInboundValue.textContent = counts.totalInboundTokens || 0;
                grandTotalValue.textContent = counts.grandTotalTokens || 0;
            }

            function appendUserMessage(text) {
                const messageWrapper = document.createElement('div');
                messageWrapper.className = 'chat-message user-message';

                const timestamp = document.createElement('div');
                timestamp.className = 'chat-timestamp';
                timestamp.textContent = new Date().toLocaleString();
                messageWrapper.appendChild(timestamp);

                const messageDiv = document.createElement('div');
                messageDiv.textContent = text;
                messageWrapper.appendChild(messageDiv);

                chatContainer.appendChild(messageWrapper);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            function startNewAssistantMessage() {
                // When starting a new message, reset the lastReply variable.
                lastReply = ""; 
                const messageWrapper = document.createElement('div');
                messageWrapper.className = 'chat-message assistant-message';

                const timestamp = document.createElement('div');
                timestamp.className = 'chat-timestamp';
                timestamp.textContent = new Date().toLocaleString();
                messageWrapper.appendChild(timestamp);

                const pre = document.createElement('pre');
                messageWrapper.appendChild(pre);
                chatContainer.appendChild(messageWrapper);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            function appendAssistantMessageChunk(chunk) {
                const lastMessageWrapper = chatContainer.querySelector('.assistant-message:last-child');
                if (lastMessageWrapper) {
                    const pre = lastMessageWrapper.querySelector('pre');
                    if (pre) {
                        pre.textContent += chunk;
                        lastReply += chunk; // Append to the full reply string
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                }
            }

            function finalizeAssistantMessage() {
                // The message is complete, save the state with the full chat log.
                saveState();
            }

            function appendAssistantMessage(fullReply) {
                startNewAssistantMessage();
                appendAssistantMessageChunk(fullReply);
                finalizeAssistantMessage();
            }


            // --- INITIALIZATION ---
            // Set default tab
            promptTab.click();

            // Inform the extension that the webview is ready
            vscode.postMessage({ command: 'webviewReady' });
            vscode.postMessage({ command: 'debug', text: 'Webview sent webviewReady.' });
        });
    } catch (e) {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'debug', text: 'FATAL ERROR in main.js: ' + e.message + ' Stack: ' + e.stack });
    }
}());
