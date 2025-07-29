import express from 'express';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { encode } from 'gpt-3-encoder';
import ftp from 'basic-ftp';

const app = express();

// --- Custom JSON body parser with sanitizing for /spanky ---
app.post('/spanky', (req, res, next) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', async () => {
        data = data.replace(/\t/g, '  ').replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '');
        let body;
        try {
            body = JSON.parse(data);
        } catch (err) {
            return res.status(400).json({ error: "Malformed JSON after sanitizing.", details: err.message });
        }
        req.body = body;
        await handleSpankyRequest(req, res);
    });
});

app.use('/spanky-raw', express.text({ type: '*/*' }));
app.post('/spanky-raw', async (req, res) => {
    const text = req.body || '';
    let lines = text.split(/\r?\n/);
    let file = null;
    if (lines[0].toLowerCase().startsWith('file:')) {
        file = lines[0].slice(5).trim();
        lines.shift();
    }
    const message = lines.join('\n').trim();
    req.body = { message, file };
    await handleSpankyRequest(req, res);
});

const API_KEY = process.env.ANTHROPIC_API_KEY || 'your-api-key-here'; // Set via environment variable

function readFileRecursive(filePath, seen = new Set()) {
    if (seen.has(filePath)) return '';
    seen.add(filePath);

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); }
    catch { return ''; }

    let output = `\n=== ${filePath} ===\n` + content + '\n';

    const jsRegex = /(import\s+.*?from\s+['"](.*?)['"])|(require\(['"](.*?)['"]\))/g;
    const phpRegex = /(include|require)(_once)?\s*\(?\s*['"](.+?)['"]\s*\)?\s*;/g;
    const htmlRegex = /<(script|link|img)[^>]+(?:src|href)=["'](.+?)["']/gi;

    let dir = path.dirname(filePath);
    let match;

    while ((match = jsRegex.exec(content)) !== null) {
        let relPath = match[2] || match[4];
        if (!relPath || relPath.startsWith('http')) continue;
        if (!relPath.startsWith('.')) continue;
        let ext = path.extname(relPath) ? '' : '.js';
        let absPath = path.resolve(dir, relPath + ext);
        output += readFileRecursive(absPath, seen);
    }

    while ((match = phpRegex.exec(content)) !== null) {
        let relPath = match[3];
        if (!relPath || relPath.startsWith('http')) continue;
        let absPath = path.resolve(dir, relPath);
        output += readFileRecursive(absPath, seen);
    }

    while ((match = htmlRegex.exec(content)) !== null) {
        let relPath = match[2];
        if (!relPath || relPath.startsWith('http')) continue;
        let absPath = path.resolve(dir, relPath);
        output += readFileRecursive(absPath, seen);
    }

    return output;
}

async function uploadToFTP(localPath, remoteFileName) {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: "www.kettlebread.com",
            port: 21,
            user: "Administrator",
            password: "@aJ8231997",
            secure: false
        });
        await client.cd("/cutlist");
        await client.uploadFrom(localPath, remoteFileName);
        return `Uploaded ${localPath} as ${remoteFileName} to /cutlist`;
    }
    catch (err) {
        return `FTP upload failed: ${err.message}`;
    }
    finally {
        client.close();
    }
}

function backupFile(originalPath) {
    try {
        if (!fs.existsSync(originalPath)) return null;
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

        const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12);
        const baseName = path.basename(originalPath);
        const backupName = `${baseName}.${ts}.bak`;
        const backupPath = path.join(backupDir, backupName);

        fs.copyFileSync(originalPath, backupPath);
        return backupPath;
    } catch (e) {
        return null;
    }
}

function extractCodeBlocks(text) {
    const codeBlockRegex = /```(\w+)?(?:\s+([\w./\\-]+))?\n([\s\S]*?)```/g;
    let match;
    let files = [];
    while ((match = codeBlockRegex.exec(text)) !== null) {
        const language = match[1] || 'text';
        const filename = match[2] || null;
        const code = match[3];
        files.push({ language, filename, code });
    }
    return files;
}

// --- The Magic Handler ---
async function handleSpankyRequest(req, res) {
    let { message, file } = req.body;
    let context = '';

    if (file) {
        let fullPath = path.resolve(process.cwd(), file);
        context = readFileRecursive(fullPath);
    }

    let prompt = `You are Spanky, an aggressive, no-nonsense, dirty-minded senior developer. 
Do whatever is asked: create/edit files as needed. If you output code, use \`\`\`language filename\\n ... \`\`\` format when possible. 
Here is the project context:\n\n${context}\n\nUser's request: ${message}`;

    const inputTokens = encode(prompt).length;

    let body = {
        model: "claude-3-opus-20240229",
        max_tokens: 1800,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }]
    };

    let response, data;
    try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        data = await response.json();
    } catch (err) {
        res.status(500).type('text').send('Fetch to Claude failed:\n' + String(err));
        return;
    }

    let outputTokens = data?.usage?.output_tokens ?? 0;
    const pricePerMillionInput = 15;
    const pricePerMillionOutput = 75;
    const inputCost = (inputTokens / 1_000_000) * pricePerMillionInput;
    const outputCost = (outputTokens / 1_000_000) * pricePerMillionOutput;
    const totalCost = inputCost + outputCost;

    let report = [];
    let backupReport = [];
    let uploadReport = [];
    let codeblocks = [];

    if (data && data.content && data.content[0] && data.content[0].text) {
        let output = data.content[0].text;
        codeblocks = extractCodeBlocks(output);

        for (const { filename, code } of codeblocks) {
            if (!filename) continue;
            const outPath = path.resolve(process.cwd(), filename);
            const backupPath = backupFile(outPath);
            if (backupPath) {
                backupReport.push({ file: filename, backup: backupPath });
            }
            try {
                fs.writeFileSync(outPath, code, 'utf8');
                report.push(`Wrote ${filename}`);
                const ftpResult = await uploadToFTP(outPath, path.basename(filename));
                uploadReport.push({ file: filename, ftp: ftpResult });
            } catch (err) {
                report.push(`Failed to write/upload ${filename}: ${err.message}`);
            }
        }

        // ----- THIS IS THE PAYOFF -----
        if (req.headers.accept && req.headers.accept.includes('text/plain')) {
            res.type('text').send(output.trim());
        } else {
            res.json({
                reply: output.trim(),
                files_written: report,
                backups: backupReport,
                uploads: uploadReport,
                tokens: {
                    input: inputTokens,
                    output: outputTokens,
                    total: inputTokens + outputTokens
                },
                cost: {
                    input: `$${inputCost.toFixed(6)}`,
                    output: `$${outputCost.toFixed(6)}`,
                    total: `$${totalCost.toFixed(6)}`
                }
            });
        }
        // ----- END PAYOFF -----
    } else {
        let errMsg = "Spanky got nothing from Claude. Blame Anthropic.";
        if (req.headers.accept && req.headers.accept.includes('text/plain')) {
            res.type('text').send(errMsg);
        } else {
            res.json({
                reply: errMsg,
                tokens: {
                    input: inputTokens,
                    output: outputTokens,
                    total: inputTokens + outputTokens
                },
                cost: {
                    input: `$${inputCost.toFixed(6)}`,
                    output: `$${outputCost.toFixed(6)}`,
                    total: `$${totalCost.toFixed(6)}`
                },
                debug: data
            });
        }
    }
}

app.post('/spanky-upload', async (req, res) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', async () => {
        data = data.replace(/\t/g, '  ').replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F]/g, '');
        let body;
        try {
            body = JSON.parse(data);
        } catch (err) {
            return res.status(400).json({ error: "Malformed JSON after sanitizing.", details: err.message });
        }
        const { localPath, remoteFileName } = body;
        if (!localPath || !remoteFileName) {
            return res.status(400).json({ error: "You must provide localPath and remoteFileName in the body." });
        }
        const msg = await uploadToFTP(localPath, remoteFileName);
        res.json({ result: msg });
    });
});

app.listen(9001, () => {
});
