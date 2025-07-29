// CutList CAD - Main Application Entry Point

import { CameraController } from './modules/camera.js';
import { GridRenderer } from './modules/grid.js';
import { DrawingEngine } from './modules/drawing.js';
import { ToolManager } from './modules/tools.js';
import { EventManager } from './modules/events.js';

class CutListCAD {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentMode = 'sketch';
        this.currentTool = 'select';
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        this.camera = null;
        this.grid = null;
        this.drawing = null;
        this.tools = null;
        this.events = null;
        
        // Application state
        this.isDrawing = false;
        this.gridVisible = true;
        this.objects = [];
        this.selectedObjects = [];
        this.renderRequested = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showPage('dashboard');
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.showPage(page);
            });
        });
        
        // Dashboard cards
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (card.textContent.includes('New Project')) {
                    this.showPage('workspace');
                }
            });
        });
    }
    
    showPage(pageId) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageId);
        });
        
        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.toggle('active', page.id === pageId);
        });
        
        this.currentPage = pageId;
        
        // Initialize workspace when entering
        if (pageId === 'workspace') {
            // Use a small delay to ensure DOM is ready
            setTimeout(() => {
                this.initWorkspace();
            }, 50);
        }
    }
    
    initWorkspace() {
        
        // Get canvas
        this.canvas = document.getElementById('drawingCanvas');
        if (!this.canvas) {
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize modules
        
        this.camera = new CameraController(this.canvas, () => {
            // Camera render callback - throttled for smooth movement
            if (this.currentMode === 'sketch' && this.gridVisible && this.grid) {
                // Use requestAnimationFrame to throttle renders
                if (!this.renderRequested) {
                    this.renderRequested = true;
                    requestAnimationFrame(() => {
                        this.renderRequested = false;
                        this.render2D();
                    });
                }
            }
        });
        
        this.grid = new GridRenderer(this.ctx, this.camera);
        this.grid.currentMode = this.currentMode; // Pass current mode to grid
        
        this.drawing = new DrawingEngine(this.ctx, this.camera);
        this.tools = new ToolManager(this);
        this.events = new EventManager(this);
        
        // Setup workspace event listeners
        this.setupWorkspaceEvents();
        
        // Resize canvas after a short delay to ensure layout is complete
        setTimeout(() => {
            this.resizeCanvas();
            // Trigger an initial render after everything is set up
            this.render2D();
        }, 100);
        
        // Start render loop
        this.startRenderLoop();
    }
    
    setupWorkspaceEvents() {
        // Mode buttons
        const modeButtons = document.querySelectorAll('.mode-btn');
        
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });
        
        // Tool buttons
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.dataset.tool;
                this.selectTool(tool);
            });
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Fallback dimensions if container has no size
        let width = rect.width || 800;
        let height = rect.height || 600;
        
        // Set display size
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Set actual size in memory (handle device pixel ratio for crisp rendering)
        const scale = window.devicePixelRatio || 1;
        this.canvas.width = width * scale;
        this.canvas.height = height * scale;
        
        // Update camera viewport with display size (not scaled size)
        if (this.camera) {
            this.camera.updateViewport(width, height);
        }
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        document.getElementById('current-mode').textContent = 
            mode === 'sketch' ? '2D Sketch' : '3D Model';
        
        // Update camera mode
        if (this.camera) {
            this.camera.setMode(mode);
        }
        
        // Switch grid rendering mode
        if (mode === 'modeling') {
            // Dispose of any existing 3D scene first
            if (this.grid && this.grid.scene) {
                this.grid.scene.dispose();
                this.grid.scene = null;
                if (this.grid.engine) {
                    this.grid.engine.dispose();
                    this.grid.engine = null;
                }
            }
            
            // Pass the current mode to grid and initialize 3D
            if (this.grid) {
                this.grid.currentMode = mode;
                
                try {
                    // Instead of calling renderPerspectiveGrid directly, call render
                    // which will then call renderPerspectiveGrid based on currentMode
                    this.grid.render();
                } catch (error) {
                }
            } else {
            }
        } else {
            // Destroy any existing 3D scene when switching back to 2D
            if (this.grid && this.grid.scene) {
                this.grid.scene.dispose();
                this.grid.scene = null;
                if (this.grid.engine) {
                    this.grid.engine.dispose();
                    this.grid.engine = null;
                }
            }

            // Pass the current mode to grid and trigger 2D render
            if (this.grid) {
                this.grid.currentMode = mode;
                // Force a 2D render to show the full grid
                this.render2D();
            }
        }
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        document.getElementById('current-tool').textContent = 
            tool.charAt(0).toUpperCase() + tool.slice(1);
        
        // Update cursor
        if (this.canvas) {
            this.canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
        }
        
        // Notify tools manager
        if (this.tools) {
            this.tools.setActiveTool(tool);
        }
    }
    
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
    }
    
    addObject(object) {
        this.objects.push(object);
        this.updateObjectCount();
    }
    
    updateObjectCount() {
        document.getElementById('object-count').textContent = this.objects.length;
    }
    
    startRenderLoop() {
        // Simple, reliable render loop that just works
        const render = () => {
            this.render();
            requestAnimationFrame(render);
        };
        render();
        
    }
    
    render() {
        if (!this.ctx || !this.canvas) return;
        
        // Don't render 2D when in modeling mode (Babylon.js handles rendering)
        if (this.currentMode === 'modeling') {
            return;
        }
        
        // Let the grid handle its own rendering completely
        if (this.gridVisible && this.grid && this.currentMode !== 'modeling') {
            // Grid renders on the raw, untransformed context
            this.grid.ctx = this.ctx;
            this.grid.render();
        }
        
        // Only if we have objects to draw, then apply transformations
        if (this.drawing && this.objects.length > 0) {
            // Save context state
            this.ctx.save();
            
            // Apply device pixel ratio scaling
            const scale = window.devicePixelRatio || 1;
            this.ctx.scale(scale, scale);
            
            // Apply camera transformations
            this.ctx.translate(this.camera.width / 2, this.camera.height / 2);
            this.ctx.rotate(this.camera.rotation);
            this.ctx.scale(this.camera.zoom, this.camera.zoom);
            this.ctx.translate(-this.camera.x, -this.camera.y);
            
            // Render objects
            this.drawing.renderObjects(this.objects);
            
            // Restore context state
            this.ctx.restore();
        }
        
        // Update status
        this.updateStatus();
    }
    
    render2D() {
        if (!this.ctx || !this.canvas || this.currentMode !== 'sketch') return;
        
        
        // Clear the entire canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render grid if visible
        if (this.gridVisible && this.grid) {
            this.grid.render();
        }
        
        // Render objects if any exist
        if (this.drawing && this.objects.length > 0) {
            // Save context state
            this.ctx.save();
            
            // Apply device pixel ratio scaling
            const scale = window.devicePixelRatio || 1;
            this.ctx.scale(scale, scale);
            
            // Apply camera transformations
            this.ctx.translate(this.camera.width / 2, this.camera.height / 2);
            this.ctx.rotate(this.camera.rotation);
            this.ctx.scale(this.camera.zoom, this.camera.zoom);
            this.ctx.translate(-this.camera.x, -this.camera.y);
            
            // Render objects
            this.drawing.renderObjects(this.objects);
            
            // Restore context state
            this.ctx.restore();
        }
        
        // Update status
        this.updateStatus();
    }
    
    updateStatus() {
        if (this.camera) {
            const zoom = Math.round(this.camera.zoom * 100);
            document.getElementById('zoom-level').textContent = `${zoom}%`;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cutlistCAD = new CutListCAD();
    // Make showPage function available globally for HTML onclick handlers
    window.showPage = (pageId) => window.cutlistCAD.showPage(pageId);
});

export default CutListCAD;
