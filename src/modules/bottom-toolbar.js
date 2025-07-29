// Bottom Toolbar Controller - Manages professional CAD status display

export class BottomToolbarController {
    constructor() {
        this.modeIndicator = null;
        this.modeText = null;
        this.cursorCoordinates = null;
        this.gridSpacing = null;
        this.zoomLevel = null;
        this.snapStatus = null;
        this.gridStatus = null;
        this.fpsCounter = null;
        
        this.currentMode = 'sketch';
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.currentFps = 60;
        
    }
    
    initialize() {
        // Get DOM elements
        this.modeIndicator = document.getElementById('mode-indicator');
        this.modeText = document.getElementById('mode-text');
        this.cursorCoordinates = document.getElementById('cursor-coordinates');
        this.gridSpacing = document.getElementById('grid-spacing');
        this.zoomLevel = document.getElementById('zoom-level');
        this.snapStatus = document.getElementById('snap-status');
        this.gridStatus = document.getElementById('grid-status');
        this.fpsCounter = document.getElementById('fps-counter');
        
        if (!this.modeIndicator) {
            return false;
        }
        
        this.startFpsMonitoring();
        return true;
    }
    
    updateMode(newMode) {
        if (this.currentMode === newMode) return;
        
        this.currentMode = newMode;
        
        if (!this.modeIndicator || !this.modeText) return;
        
        // Update mode indicator
        this.modeIndicator.className = `mode-indicator ${newMode}`;
        
        if (newMode === 'sketch') {
            this.modeText.textContent = 'Sketch Mode';
        } else if (newMode === 'modeling') {
            this.modeText.textContent = 'Modeling Mode';
        }
        
    }
    
    updateCursorPosition(worldX, worldY) {
        if (!this.cursorCoordinates) return;
        
        // Format coordinates with proper precision for woodworking
        const xFormatted = this.formatInches(worldX);
        const yFormatted = this.formatInches(worldY);
        
        this.cursorCoordinates.textContent = `X: ${xFormatted} Y: ${yFormatted}`;
    }
    
    updateGridSpacing(spacing) {
        if (!this.gridSpacing) return;
        
        const formatted = this.formatInches(spacing);
        this.gridSpacing.textContent = `Grid: ${formatted}`;
    }
    
    updateZoom(zoomValue) {
        if (!this.zoomLevel) return;
        
        const percentage = Math.round(zoomValue * 100);
        this.zoomLevel.textContent = `${percentage}%`;
    }
    
    updateSnapStatus(isEnabled) {
        if (!this.snapStatus) return;
        
        if (isEnabled) {
            this.snapStatus.classList.add('active');
            this.snapStatus.innerHTML = '<span>🔒 Snap: ON</span>';
        } else {
            this.snapStatus.classList.remove('active');
            this.snapStatus.innerHTML = '<span>🔓 Snap: OFF</span>';
        }
    }
    
    updateGridStatus(isVisible) {
        if (!this.gridStatus) return;
        
        if (isVisible) {
            this.gridStatus.classList.add('active');
            this.gridStatus.innerHTML = '<span>⊞ Grid: ON</span>';
        } else {
            this.gridStatus.classList.remove('active');
            this.gridStatus.innerHTML = '<span>⊞ Grid: OFF</span>';
        }
    }
    
    startFpsMonitoring() {
        const updateFps = () => {
            this.frameCount++;
            const currentTime = performance.now();
            
            if (currentTime >= this.lastFpsUpdate + 1000) {
                this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
                this.frameCount = 0;
                this.lastFpsUpdate = currentTime;
                
                if (this.fpsCounter) {
                    let fpsIcon = '⚡';
                    if (this.currentFps < 30) {
                        fpsIcon = '🐌'; // Slow
                    } else if (this.currentFps < 50) {
                        fpsIcon = '⚠️'; // Warning
                    }
                    
                    this.fpsCounter.innerHTML = `<span>${fpsIcon} ${this.currentFps} FPS</span>`;
                }
            }
            
            requestAnimationFrame(updateFps);
        };
        
        requestAnimationFrame(updateFps);
    }
    
    formatInches(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            return '0.00"';
        }
        
        // Format with 2 decimal places for precise woodworking measurements
        return `${value.toFixed(2)}"`;
    }
    
    // Method to show/hide toolbar
    setVisible(visible) {
        const toolbar = document.querySelector('.bottom-toolbar');
        if (toolbar) {
            toolbar.style.display = visible ? 'flex' : 'none';
        }
    }
}
