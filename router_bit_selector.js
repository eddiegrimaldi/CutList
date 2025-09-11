/**
 * Router Bit Selector Interface
 * Handles bit selection and profile preview
 */

class RouterBitSelector {
    constructor() {
        this.selectedBit = null;
        this.canvas = null;
        this.ctx = null;
        this.panel = null;
        
        // Initialize after DOM loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        // Get DOM elements
        this.panel = document.getElementById('router-bit-selector-panel');
        this.canvas = document.getElementById('router-profile-canvas');
        
        if (!this.panel || !this.canvas) {
            console.warn('Router bit selector elements not found');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Draw initial empty preview
        this.drawEmptyPreview();
    }
    
    setupEventListeners() {
        // Radio button selection
        const radioButtons = document.querySelectorAll('input[name="router-bit"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectBit(e.target.value, e.target.dataset.name);
            });
        });
        
        // Close button
        const closeBtn = document.getElementById('close-router-selector');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancel-router-bit');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hide());
        }
        
        // Apply button
        const applyBtn = document.getElementById('apply-router-bit');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySelectedBit());
        }
    }
    
    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
            // Reset selection
            this.selectedBit = null;
            const radios = document.querySelectorAll('input[name="router-bit"]');
            radios.forEach(r => r.checked = false);
            document.getElementById('apply-router-bit').disabled = true;
            this.drawEmptyPreview();
        }
    }
    
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }
    
    selectBit(bitKey, bitName) {
        this.selectedBit = bitKey;
        
        // Enable apply button
        document.getElementById('apply-router-bit').disabled = false;
        
        // Update display
        document.getElementById('bit-name-display').textContent = bitName;
        
        // Get bit profile from library
        if (window.RouterBitLibrary && window.RouterBitLibrary.bits[bitKey]) {
            const bit = window.RouterBitLibrary.bits[bitKey];
            document.getElementById('bit-description').textContent = bit.description;
            
            // Draw the profile
            this.drawProfile(bit.profilePoints);
        }
    }
    
    drawEmptyPreview() {
        const canvas = this.canvas;
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw board cross-section
        ctx.fillStyle = '#f5deb3'; // Wood color
        ctx.fillRect(40, 40, 120, 70);
        
        // Draw wood grain
        ctx.strokeStyle = '#d2a679';
        ctx.lineWidth = 0.5;
        for (let i = 45; i < 160; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, 40);
            ctx.lineTo(i + 5, 110);
            ctx.stroke();
        }
        
        // Draw edge highlight
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(160, 40);
        ctx.lineTo(160, 110);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add text
        ctx.fillStyle = '#999';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Select a bit to see profile', canvas.width / 2, 130);
    }
    
    drawProfile(profilePoints) {
        const canvas = this.canvas;
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale
        const boardWidth = 120;
        const boardHeight = 70;
        const boardX = 40;
        const boardY = 40;
        
        // Draw board
        ctx.fillStyle = '#f5deb3'; // Wood color
        ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
        
        // Draw wood grain
        ctx.strokeStyle = '#d2a679';
        ctx.lineWidth = 0.5;
        for (let i = boardX + 5; i < boardX + boardWidth; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, boardY);
            ctx.lineTo(i + 5, boardY + boardHeight);
            ctx.stroke();
        }
        
        // Find profile bounds
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        profilePoints.forEach(point => {
            minX = Math.min(minX, point[0]);
            maxX = Math.max(maxX, point[0]);
            minY = Math.min(minY, point[1]);
            maxY = Math.max(maxY, point[1]);
        });
        
        // Scale factor (profile is in inches, we need pixels)
        const scale = 100; // 100 pixels per inch
        
        // Draw the cut profile (what gets removed)
        ctx.save();
        ctx.translate(boardX + boardWidth, boardY); // Move to upper-right corner
        
        // Create clipping region for the board
        ctx.beginPath();
        ctx.rect(-boardWidth, 0, boardWidth, boardHeight);
        ctx.clip();
        
        // Draw the cut area (what the bit removes)
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)'; // Light red for removed material
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        let firstPoint = true;
        profilePoints.forEach(point => {
            const x = point[0] * scale; // Negative X goes left
            const y = point[1] * scale; // Positive Y goes down
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw the resulting edge profile (what remains)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        // Draw the profile line showing the new edge shape
        firstPoint = true;
        profilePoints.forEach(point => {
            const x = point[0] * scale;
            const y = point[1] * scale;
            
            // Skip the closing lines, only draw the actual profile curve
            if (point[0] < 0 || point[1] > 0) {
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        });
        ctx.stroke();
        
        ctx.restore();
        
        // Add dimension lines
        const depthInches = Math.abs(minX);
        const heightInches = maxY;
        
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Depth: ${depthInches}"`, 10, 130);
        ctx.fillText(`Height: ${heightInches}"`, 10, 145);
    }
    
    applySelectedBit() {
        if (!this.selectedBit) {
            console.warn('No bit selected');
            return;
        }
        
        // Apply the selected bit to the router system
        if (window.drawingWorld && window.drawingWorld.routerBitSystem) {
            console.log('Applying router bit:', this.selectedBit);
            
            // Update the router bit system to use the selected profile
            window.drawingWorld.routerBitSystem.currentProfile = this.selectedBit;
            
            // Get the bit data
            const bit = window.RouterBitLibrary.bits[this.selectedBit];
            if (bit) {
                window.drawingWorld.routerBitSystem.currentBitData = bit;
                console.log('Router bit set to:', bit.name);
            }
            
            // Hide the panel
            this.hide();
            
            // Show confirmation
            const selectionInfo = document.getElementById('selection-info');
            if (selectionInfo) {
                selectionInfo.textContent = `Router tool active with ${bit.name} - Click edges to apply`;
            }
        } else {
            console.error('Router bit system not available');
        }
    }
}

// Create global instance
window.routerBitSelector = new RouterBitSelector();

// Hook into router tool activation
document.addEventListener('DOMContentLoaded', () => {
    // Override router tool activation
    const originalActivateTool = window.drawingWorld?.activateTool;
    if (window.drawingWorld && originalActivateTool) {
        window.drawingWorld.activateTool = function(tool) {
            // Call original function
            originalActivateTool.call(this, tool);
            
            // Show selector when router tool is activated
            if (tool === 'router') {
                window.routerBitSelector.show();
            }
        };
    }
});