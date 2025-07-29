// Event Manager - Handles all user input events

// Report version to the global version reporter (wait for it to be available)
const reportVersion = () => {
    if (window.VersionReporter) {
        window.VersionReporter.report('events.js', 'v20250627_017', 'success');
        return true;
    }
    return false;
};

// Try to report immediately, or wait for VersionReporter to be ready
if (!reportVersion()) {
    // If VersionReporter isn't ready, wait for it
    const checkInterval = setInterval(() => {
        if (reportVersion()) {
            clearInterval(checkInterval);
        }
    }, 50); // Check every 50ms
    
    // Give up after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
}

export class EventManager {
    constructor(app) {
        this.app = app;
        this.setupCanvasEvents();
        this.setupKeyboardEvents();
    }
    
    setupCanvasEvents() {
        const canvas = this.app.canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const worldPos = this.getWorldPosition(e);
            
            // Don't interfere with camera panning
            if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
                return; // Let camera handle panning
            }
            
            if (e.button === 0 && this.app.tools) { // Left mouse button
                this.app.tools.handleMouseDown(e, worldPos);
            }
        });
          canvas.addEventListener('mousemove', (e) => {
            const worldPos = this.getWorldPosition(e);
            
            // Update bottom toolbar with cursor position
            if (this.app.bottomToolbar) {
                this.app.bottomToolbar.updateCursorPosition(worldPos.x, worldPos.y);
            }
            
            if (this.app.tools) {
                this.app.tools.handleMouseMove(e, worldPos);
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            const worldPos = this.getWorldPosition(e);
            
            if (e.button === 0 && this.app.tools) { // Left mouse button
                this.app.tools.handleMouseUp(e, worldPos);
            }
        });
        
        // Touch events for mobile support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0
                });
                canvas.dispatchEvent(mouseEvent);
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            }
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {
                button: 0
            });
            canvas.dispatchEvent(mouseEvent);
        });
    }
    
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }
    
    handleKeyDown(e) {
        // Only handle shortcuts when workspace is active
        if (this.app.currentPage !== 'workspace') return;
        
        // Prevent default for our shortcuts
        const shortcuts = ['Delete', 'Escape', 'KeyL', 'KeyR', 'KeyC', 'KeyS', 'KeyG'];
        if (shortcuts.includes(e.code)) {
            e.preventDefault();
        }
        
        switch (e.code) {
            case 'Delete':
            case 'Backspace':
                if (this.app.tools) {
                    this.app.tools.deleteSelected();
                }
                break;
                
            case 'Escape':
                if (this.app.tools) {
                    this.app.tools.cancelCurrentOperation();
                }
                break;
                
            case 'KeyL':
                this.app.selectTool('line');
                break;
                
            case 'KeyR':
                this.app.selectTool('rectangle');
                break;
                
            case 'KeyC':
                this.app.selectTool('circle');
                break;
                
            case 'KeyS':
                this.app.selectTool('select');
                break;
                
            case 'KeyG':
                this.app.toggleGrid();
                break;
                
            case 'Space':
                e.preventDefault();
                // Toggle between sketch and modeling modes
                const newMode = this.app.currentMode === 'sketch' ? 'modeling' : 'sketch';
                this.app.switchMode(newMode);
                break;
                  case 'KeyZ':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // TODO: Implement undo
                }
                break;
                
            case 'KeyY':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // TODO: Implement redo
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        // Handle key releases if needed
    }
    
    getWorldPosition(e) {
        const rect = this.app.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        return this.app.camera.screenToWorld(screenX, screenY);
    }
    
    // Utility methods for event handling
    isLeftClick(e) {
        return e.button === 0;
    }
    
    isRightClick(e) {
        return e.button === 2;
    }
    
    isMiddleClick(e) {
        return e.button === 1;
    }
    
    hasModifier(e, modifier) {
        switch (modifier) {
            case 'ctrl':
                return e.ctrlKey || e.metaKey;
            case 'shift':
                return e.shiftKey;
            case 'alt':
                return e.altKey;
            default:
                return false;
        }
    }
}
