// toolbar.js - Toolbar logic for CutList
// Spanky modularized this for Assclown!
import { Appearance } from '../appearance.js';

export class Toolbar {
    constructor(toolbarSelector = '.toolbar') {
        this.toolbar = document.querySelector(toolbarSelector);
        this.activeTool = 'select';
        this.setupListeners();
    }

    setupListeners() {
        if (!this.toolbar) return;
        this.toolbar.querySelectorAll('.button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveTool(e.target.innerText.toLowerCase());
            });
        });
    }

    setActiveTool(tool) {
        this.activeTool = tool;
        this.toolbar.querySelectorAll('.button').forEach(btn => {
            btn.classList.toggle('active', btn.innerText.toLowerCase() === tool);
        });
    }

    getActiveTool() {
        return this.activeTool;
    }
}
