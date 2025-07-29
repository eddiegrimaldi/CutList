// Camera Controller - Handles viewport, zoom, and camera operations

export class CameraController {
    constructor(canvas, renderCallback = null) {
        this.canvas = canvas;
        this.renderCallback = renderCallback;
          // Camera properties
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.rotation = 0; // Rotation in radians
        this.mode = 'sketch'; // 'sketch' or 'modeling'
        
        // Viewport
        this.width = 0;
        this.height = 0;
        
        // Limits
        this.minZoom = 0.1;
        this.maxZoom = 10;
          // Interaction state
        this.isPanning = false;
        this.isRotating = false;
        this.rightMouseDown = false; // Track right mouse state
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.lastRotateAngle = 0;
        
        this.setupEventListeners();
    }
      setupEventListeners() {        // Mouse wheel for zooming
        this.canvas.addEventListener('wheel', (e) => {
            // Don't zoom if right mouse is down (might be trying to rotate)
            if (this.rightMouseDown || this.isRotating) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            this.handleZoom(e);
        });        // Mouse events for panning and rotating
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+Left
                e.preventDefault();
                this.startPan(e);            } else if (e.button === 2) { // Right mouse button
                e.preventDefault();
                this.rightMouseDown = true;
                this.startRotate(e);
            }
        });
          this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                e.preventDefault();
                this.updatePan(e);
            } else if (this.isRotating) {
                e.preventDefault();
                this.updateRotate(e);
            }
        });        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1 || e.button === 0) {
                this.endPan();
            } else if (e.button === 2) {
                e.preventDefault();
                this.rightMouseDown = false;
                this.endRotate();
            }
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    updateViewport(width, height) {
        this.width = width;
        this.height = height;
    }    setMode(mode) {
        this.mode = mode;
        
        if (mode === 'modeling') {
            this.rotation = Math.PI / 4; // Example rotation for perspective
            this.zoom = 0.5; // Adjust zoom for perspective
            this.x = 0;
            this.y = 0;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            // Don't call renderCallback in 3D mode - let Babylon.js handle rendering
        } else {
            this.reset();
        }
    }handleZoom(e) {
        // Don't zoom if we're currently rotating
        if (this.isRotating) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert mouse position to world coordinates
        const worldX = this.screenToWorldX(mouseX);
        const worldY = this.screenToWorldY(mouseY);
        
        // Calculate zoom delta
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
          if (newZoom !== this.zoom) {            // Adjust camera position to zoom towards mouse
            const zoomRatio = newZoom / this.zoom;
            this.x = worldX - (worldX - this.x) * zoomRatio;
            this.y = worldY - (worldY - this.y) * zoomRatio;
            this.zoom = newZoom;
            
            // Trigger render
            if (this.renderCallback) {
                this.renderCallback();
            }
        }
    }
    
    startPan(e) {
        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }
      updatePan(e) {
        if (!this.isPanning) return;
        
        const deltaX = (e.clientX - this.lastPanX) / this.zoom;
        const deltaY = (e.clientY - this.lastPanY) / this.zoom;
        
        this.x -= deltaX;
        this.y -= deltaY;
        
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        
        // Trigger render
        if (this.renderCallback) {
            this.renderCallback();
        }
    }
      endPan() {
        this.isPanning = false;
        this.canvas.style.cursor = '';
    }    startRotate(e) {
        this.isRotating = true;        this.lastPanX = e.clientX; // Reuse lastPanX for rotation
        this.canvas.style.cursor = 'crosshair';
    }updateRotate(e) {
        if (!this.isRotating) return;
        
        // Simple horizontal rotation - mouse movement left/right rotates the view        const deltaX = e.clientX - this.lastPanX;
        const rotationSpeed = 0.01; // Adjust this to control rotation sensitivity
        
        this.rotation += deltaX * rotationSpeed;
        
        this.lastPanX = e.clientX;
        
        // Trigger render
        if (this.renderCallback) {
            this.renderCallback();
        }
    }
    
    endRotate() {
        this.isRotating = false;
        this.canvas.style.cursor = '';
    }    // Coordinate conversion methods (with rotation support)
    screenToWorldX(screenX) {
        const relX = (screenX - this.width / 2) / this.zoom;
        const relY = 0;
        
        // Apply inverse rotation
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rotatedX = relX * cos - relY * sin;
        
        return rotatedX + this.x;
    }
    
    screenToWorldY(screenY) {
        const relX = 0;
        const relY = (screenY - this.height / 2) / this.zoom;
        
        // Apply inverse rotation
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rotatedY = relX * sin + relY * cos;
        
        return rotatedY + this.y;
    }
    
    screenToWorld(screenX, screenY) {
        const relX = (screenX - this.width / 2) / this.zoom;
        const relY = (screenY - this.height / 2) / this.zoom;
        
        // Apply inverse rotation
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rotatedX = relX * cos - relY * sin;
        const rotatedY = relX * sin + relY * cos;
        
        return {
            x: rotatedX + this.x,
            y: rotatedY + this.y
        };
    }
    
    worldToScreenX(worldX) {
        const relX = worldX - this.x;
        const relY = 0;
        
        // Apply rotation
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const rotatedX = relX * cos - relY * sin;
        
        return rotatedX * this.zoom + this.width / 2;
    }
    
    worldToScreenY(worldY) {
        const relX = 0;
        const relY = worldY - this.y;
        
        // Apply rotation
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const rotatedY = relX * sin + relY * cos;
        
        return rotatedY * this.zoom + this.height / 2;
    }
    
    worldToScreen(worldX, worldY) {
        const relX = worldX - this.x;
        const relY = worldY - this.y;
        
        // Apply rotation
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const rotatedX = relX * cos - relY * sin;
        const rotatedY = relX * sin + relY * cos;
          return {
            x: rotatedX * this.zoom + this.width / 2,
            y: rotatedY * this.zoom + this.height / 2
        };
    }
  
    // View operations
    reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.rotation = 0;
        
        // Trigger render
        if (this.renderCallback) {
            this.renderCallback();
        }
    }
    
    zoomToFit() {
        // TODO: Implement zoom to fit based on objects
        this.reset();
    }
    
    // Get visible world bounds
    getVisibleBounds() {
        const halfWidth = this.width / (2 * this.zoom);
        const halfHeight = this.height / (2 * this.zoom);
        
        return {
            left: this.x - halfWidth,
            right: this.x + halfWidth,
            top: this.y - halfHeight,
            bottom: this.y + halfHeight,
            width: halfWidth * 2,
            height: halfHeight * 2
        };
    }
}
