import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('spanky.openChat', () => {
    const panel = vscode.window.createWebviewPanel(
      'spankyChat',
      'Spanky Chat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'))]
      }
    );

    const webviewPath = path.join(context.extensionPath, 'src', 'webview', 'index.html');
    const html = fs.readFileSync(webviewPath, 'utf8');
    panel.webview.html = html;
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
