// CutList CAD - Main Application Entry Point  
// Cache-busting version: Timestamp-based to ensure fresh loads

// Dynamic version for reporting
const DYNAMIC_VERSION = `spanky_modules_${Date.now()}`;

// ES6 imports with timestamp cache-busting (updated each deployment)
import { CameraController } from './modules/camera.js?cb=20250630_002';
import { GridRenderer } from './modules/grid.js?cb=20250630_002';
import { DrawingEngine } from './modules/drawing.js?cb=20250630_002';
import { ToolManager } from './modules/tools.js?cb=20250630_002';
import { EventManager } from './modules/events.js?cb=20250630_002';
import { switchTo2D, switchTo3D, getCurrentCamera } from './modules/camera.js?cb=20250630_002';
import ExtrusionGizmo from './modules/extrusionGizmo.js?cb=20250630_002';
import RotationGizmo from './modules/rotationGizmo.js?cb=20250630_002';
import { SketchPlanesManager } from './modules/sketchPlanes.js?cb=20250630_002';
import { ViewCube } from './modules/viewCube.js?cb=20250630_002';
import { ProjectExplorer } from './modules/projectExplorer_clean.js?cb=20250630_002';
import { BottomToolbarController } from './modules/bottom-toolbar.js?cb=20250630_002';

class CutListCAD {
    constructor() {
        // ... V6 logging will be updated to V7 by search/replace later ...
        this.currentPage = 'dashboard';
        this.currentMode = 'modeling'; // Start in 3D modeling mode as per Shapr3D workflow
        this.currentTool = 'select';
        this.unitSystem = 'imperial'; // Added unit system, defaulting to imperial
        
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

        this.partCounters = { // NEW: Counters for default part names
            line: 0,
            rectangle: 0,
            circle: 0,
            // Add other types as needed
        };        this.active3DMeshes = {}; // NEW: To store references to 3D meshes created from 2D objects
        this.selected3DMesh = null; // NEW: To store the currently selected 3D mesh
        this.gizmoManager = null; // NEW: For Babylon.js GizmoManager
        this.highlightLayer = null; // NEW: For highlighting selected 3D meshes        // Extrusion workflow properties
        this.extrusionGizmo = null; // Custom extrusion gizmo
        this.rotationGizmo = null; // Custom rotation gizmo for 3D objects        this.sketchPlanes = null;  // Sketch planes manager
        this.viewCube = null;      // ViewCube navigation widget
        this.projectExplorer = null; // Project management system
        this.bottomToolbar = null; // Bottom status toolbar
        
        // Sketch plane state
        this.currentSketchPlane = null;
        this.isExtruding = false; // Flag to track extrusion state
        this.extrudingObject = null; // The 2D object being extruded
        
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
                if (card.textContent.includes('Workspace')) {
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
        
        // Perform initial resize BEFORE initializing modules that depend on canvas size
        this.resizeCanvas(); 

        // Initialize modules
        
        this.camera = new CameraController(this.canvas, () => {
            if (this.currentMode === 'sketch' && this.gridVisible && this.grid) {
                if (!this.renderRequested) {
                    this.renderRequested = true;
                    requestAnimationFrame(() => {
                        this.renderRequested = false;
                        this.render2D();
                    });
                } else {
                }
            }
        });
        // Report camera.js version immediately after instantiation
        VersionReporter.report('camera.js', DYNAMIC_VERSION, 'success');
        
        this.grid = new GridRenderer(this.ctx, this.camera);
        this.grid.currentMode = this.currentMode; 
        // Report grid.js version immediately after instantiation
        VersionReporter.report('grid.js', DYNAMIC_VERSION, 'success');
        
          this.drawing = new DrawingEngine(this.ctx, this.camera, this); // Pass app instance
        this.tools = new ToolManager(this);
        this.events = new EventManager(this);
        // Report module versions immediately after instantiation
        VersionReporter.report('drawing.js', DYNAMIC_VERSION, 'success');
        VersionReporter.report('tools.js', DYNAMIC_VERSION, 'success');
        VersionReporter.report('events.js', DYNAMIC_VERSION, 'success');
        
        // Initialize Project Explorer
        this.initializeProjectExplorer();

        // Initialize Bottom Toolbar
        this.bottomToolbar = new BottomToolbarController();
        VersionReporter.report('bottom-toolbar.js', DYNAMIC_VERSION, 'success');
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
            if (this.bottomToolbar.initialize()) {
                this.bottomToolbar.updateMode(this.currentMode);
                this.bottomToolbar.updateGridStatus(this.gridVisible);
            } else {
                // Retry after a longer delay
                setTimeout(() => {
                    this.bottomToolbar.initialize();
                }, 500);
            }
        }, 100);

        this.setupWorkspaceEvents();
        
        // Initialize in 3D modeling mode (Shapr3D-style workflow)
        this.switchMode('modeling'); // This will trigger the appropriate rendering

        // Ensure the 3D grid is visible immediately when entering workspace
        // Use multiple timing approaches to ensure grid appears
        
        // Immediate attempt
        if (this.currentMode === 'modeling' && this.grid) {
            this.grid.render(this.gridVisible);
            if (this.grid.babylonCanvas) {
                this.grid.babylonCanvas.style.display = 'block';
                this.grid.babylonCanvas.style.visibility = 'visible';
            }
        }
        
        // RequestAnimationFrame attempt
        requestAnimationFrame(() => {
            if (this.currentMode === 'modeling' && this.grid) {
                this.grid.render(this.gridVisible);
                
                if (this.grid.babylonCanvas) {
                    this.grid.babylonCanvas.style.display = 'block';
                    this.grid.babylonCanvas.style.visibility = 'visible';
                }
            }
        });
        
        // Delayed attempt as backup
        setTimeout(() => {
            if (this.currentMode === 'modeling' && this.grid) {
                this.grid.render(this.gridVisible);
                
                if (this.grid.babylonCanvas) {
                    this.grid.babylonCanvas.style.display = 'block';
                    this.grid.babylonCanvas.style.visibility = 'visible';
                }
            }
        }, 200);

        // Schedule another resize after next browser paint,
        // to ensure layout is stable if anything else shifts it.
        requestAnimationFrame(() => {
            this.resizeCanvas();
            // Don't call render2D in 3D mode - Babylon.js handles its own rendering
        });
        
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
        });        // Tool buttons
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool; 
                // SPANKY: Added log to see if this event listener fires
                
                if (tool) { 
                    this.selectTool(tool);
                } else {
            });
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
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
        
        // Perform initial resize BEFORE initializing modules that depend on canvas size
        this.resizeCanvas(); 

        // Initialize modules
        
        this.camera = new CameraController(this.canvas, () => {
            if (this.currentMode === 'sketch' && this.gridVisible && this.grid) {
                if (!this.renderRequested) {
                    this.renderRequested = true;
                    requestAnimationFrame(() => {
                        this.renderRequested = false;
                        this.render2D();
                    });
                } else {
                }
            }
        });
        // Report camera.js version immediately after instantiation
        VersionReporter.report('camera.js', DYNAMIC_VERSION, 'success');
        
        this.grid = new GridRenderer(this.ctx, this.camera);
        this.grid.currentMode = this.currentMode; 
        // Report grid.js version immediately after instantiation
        VersionReporter.report('grid.js', DYNAMIC_VERSION, 'success');
        
          this.drawing = new DrawingEngine(this.ctx, this.camera, this); // Pass app instance
        this.tools = new ToolManager(this);
        this.events = new EventManager(this);
        // Report module versions immediately after instantiation
        VersionReporter.report('drawing.js', DYNAMIC_VERSION, 'success');
        VersionReporter.report('tools.js', DYNAMIC_VERSION, 'success');
        VersionReporter.report('events.js', DYNAMIC_VERSION, 'success');
        
        // Initialize Project Explorer
        this.initializeProjectExplorer();

        // Initialize Bottom Toolbar
        this.bottomToolbar = new BottomToolbarController();
        VersionReporter.report('bottom-toolbar.js', DYNAMIC_VERSION, 'success');
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
            if (this.bottomToolbar.initialize()) {
                this.bottomToolbar.updateMode(this.currentMode);
                this.bottomToolbar.updateGridStatus(this.gridVisible);
            } else {
                // Retry after a longer delay
                setTimeout(() => {
                    this.bottomToolbar.initialize();
                }, 500);
            }
        }, 100);

        this.setupWorkspaceEvents();
        
        // Initialize in 3D modeling mode (Shapr3D-style workflow)
        this.switchMode('modeling'); // This will trigger the appropriate rendering

        // Ensure the 3D grid is visible immediately when entering workspace
        // Use multiple timing approaches to ensure grid appears
        
        // Immediate attempt
        if (this.currentMode === 'modeling' && this.grid) {
            this.grid.render(this.gridVisible);
            if (this.grid.babylonCanvas) {
                this.grid.babylonCanvas.style.display = 'block';
                this.grid.babylonCanvas.style.visibility = 'visible';
            }
        }
        
        // RequestAnimationFrame attempt
        requestAnimationFrame(() => {
            if (this.currentMode === 'modeling' && this.grid) {
                this.grid.render(this.gridVisible);
                
                if (this.grid.babylonCanvas) {
                    this.grid.babylonCanvas.style.display = 'block';
                    this.grid.babylonCanvas.style.visibility = 'visible';
                }
            }
        });
        
        // Delayed attempt as backup
        setTimeout(() => {
            if (this.currentMode === 'modeling' && this.grid) {
                this.grid.render(this.gridVisible);
                
                if (this.grid.babylonCanvas) {
                    this.grid.babylonCanvas.style.display = 'block';
                    this.grid.babylonCanvas.style.visibility = 'visible';
                }
            }
        }, 200);

        // Schedule another resize after next browser paint,
        // to ensure layout is stable if anything else shifts it.
        requestAnimationFrame(() => {
            this.resizeCanvas();
            // Don't call render2D in 3D mode - Babylon.js handles its own rendering
        });
        
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
        });        // Tool buttons
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool; 
                // SPANKY: Added log to see if this event listener fires
                
                if (tool) { 
                    this.selectTool(tool);
                } else {
            });
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    resizeCanvas() {
        // SPANKY: Using clientWidth/clientHeight for CSS dimensions
        const cssWidth = this.canvas.clientWidth;
        const cssHeight = this.canvas.clientHeight;


        let width = cssWidth;
        let height = cssHeight;

        if (width === 0 || height === 0) {
            width = 800; // Fallback width
            height = 600; // Fallback height
        }
        
        const scale = window.devicePixelRatio || 1;
        // Set the actual backing store size (drawingbuffer size)
        this.canvas.width = Math.floor(width * scale);
        this.canvas.height = Math.floor(height * scale);
        
        // Set the CSS display size of the canvas element if it's not already handled by CSS.
        // If CSS (e.g., width: 100%) is meant to control the display size, clientWidth/Height will reflect that.
        // Explicitly setting style.width/height can sometimes override CSS or be redundant.
        // For now, we assume CSS handles the display size, and clientWidth/Height are correct.
        // this.canvas.style.width = width + 'px'; 
        // this.canvas.style.height = height + 'px';

        
        if (this.ctx) { 
            // Reset the transformation matrix to identity
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            // Scale the context by the device pixel ratio.
            // All drawing operations will now be scaled up, and then the browser scales the canvas element down to CSS size,
            // resulting in crisp rendering on HiDPI displays.
            this.ctx.scale(scale, scale);
        }        if (this.camera) {
            // The camera's viewport should be based on the CSS dimensions (unscaled by DPR).
            this.camera.updateViewport(width, height);
        }
        
        // Update ViewCube viewport on canvas resize
        if (this.viewCube) {
            this.viewCube.updateViewport();
        }
        
        // SPANKY: After resizing, if in 2D sketch mode, a re-render is needed.
        if (this.currentMode === 'sketch') {
            this.render2D();
        }
    }
      switchMode(mode, options = {}) {
        // Save current camera state before switching
        if (this.camera && this.grid && this.grid.getBabylonCamera) {
            const babylonCamera = this.grid.getBabylonCamera();
            if (this.currentMode === 'sketch') {
                this.camera.saveCurrent2DState();
            } else if (this.currentMode === 'modeling' && babylonCamera) {
                this.camera.saveCurrent3DState(babylonCamera);
            }
        }        this.currentMode = mode;
        
        // Update camera mode to prevent unnecessary render callbacks in 3D mode
        if (this.camera) {
            this.camera.setMode(mode);
        }
        
        // Update bottom toolbar
        if (this.bottomToolbar) {
            this.bottomToolbar.updateMode(mode);
        }
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        document.getElementById('current-mode').textContent = 
            mode === 'sketch' ? '2D Sketch' : '3D Model';
        
        // SPANKY: Log UI button state after mode switch
        const activeButton = document.querySelector('.mode-btn.active');
        
        // Update extrude button availability
        this.updateExtrudeButtonState();
        this.updateRotateButtonState();
        
        if (this.camera) {
            this.camera.setMode(mode);
        }        if (mode === 'modeling') {
            
            // When switching to modeling mode FROM sketch mode, clear the active sketch plane 
            // and return to default XY grid (Shapr3D workflow)
            // BUT don't clear if we're preserving the sketch plane (e.g., during plane selection workflow)
            const previousMode = this.currentMode;
            if (this.currentSketchPlane && this.grid && previousMode === 'sketch' && !options.preserveSketchPlane) {
                this.grid.clearActiveSketchPlane();
                this.currentSketchPlane = null;
            } else if (this.currentSketchPlane && previousMode !== 'sketch') {
            }
            
            // Hide plane selectors when entering 3D mode - unless explicitly told not to
            if (this.sketchPlanes && !options.keepPlaneSelectors) {
                this.sketchPlanes.hidePlaneSelectionPrompt();
                // IMPORTANT: Actually remove the plane selector meshes from the scene
                this.sketchPlanes.removeAllPlaneSelectors();
            }
            
            if (this.grid) {
                this.grid.currentMode = mode;
                try {
                    this.grid.render(this.gridVisible); // Pass visibility state to ensure grid is rendered when visible
                    
                    // Ensure grid visibility is properly set
                    if (this.gridVisible && this.grid.babylonCanvas) {
                        this.grid.babylonCanvas.style.display = 'block';
                        this.grid.babylonCanvas.style.visibility = 'visible';
                    }
                    if (this.grid.scene && this.grid.engine) {
                        // Ensure render loop is running for the 3D scene
                        if (!this.grid.engine._activeRenderLoops || this.grid.engine._activeRenderLoops.length === 0) {
                            this.grid.engine.runRenderLoop(() => {
                                if (this.grid.scene && !this.grid.scene.isDisposed) {
                                    this.grid.scene.render();
                                }
                            });
                        }                        this.synchronize2DObjectsTo3D(); 
                        
                        // Initialize sketch planes system
                        this.initializeSketchPlanes();                        // Initialize ViewCube navigation widget
                        this.initializeViewCube();
                        
                        if (this.camera && this.grid.getBabylonCamera) {
                            const babylonCamera = this.grid.getBabylonCamera();
                            if (babylonCamera) {
                                // Check if this is the first time switching from 2D to 3D
                                const isFirstTimeFrom2D = previousMode === 'sketch' && 
                                                         !this.camera.has3DSavedState();
                                
                                if (isFirstTimeFrom2D) {
                                    // Don't restore any state, let setInitialCameraPosition handle it
                                } else if (this.camera.stored3DState) {
                                    this.camera.restore3DState(babylonCamera);
                                } else {
                                    this.camera.sync3DCameraTo2DView(babylonCamera);
                                }
                            } else {
                            }
                        } else {
                        }
                        
                        // SET INITIAL CAMERA POSITION - only if first time from 2D or no saved state
                        const isFirstTimeFrom2D = previousMode === 'sketch' && 
                                                 (!this.camera || !this.camera.has3DSavedState());
                        if (isFirstTimeFrom2D) {
                            this.grid.setInitialCameraPosition();
                        }
                    } else {
                    }
                } catch (error) {
                }
            } else {
            }
        } else { // Switching to 2D 'sketch' mode
            this.dispose3DGizmos(); 
            this.clear3DMeshes(); 

            if (this.grid) {
                if (this.camera && this.grid.getBabylonCamera) {
                    const babylonCamera = this.grid.getBabylonCamera();
                    if (babylonCamera && this.grid.scene && this.grid.engine && !this.grid.engine.isDisposed) { 
                        this.camera.sync2DCameraTo3DView(babylonCamera);
                    } else {
                    }
                }

                // Stop the Babylon.js render loop if it's running
                // if (this.grid.engine && this.grid.engine._activeRenderLoops && this.grid.engine._activeRenderLoops.length > 0) {
                //     this.grid.engine.stopRenderLoop(); // This is handled by grid.render() or canvas display none
                // }

                // Hide Babylon canvas, show 2D canvas
                if (this.grid.babylonCanvas) {
                    this.grid.babylonCanvas.style.display = 'none';
                }
                const mainCanvas = document.getElementById('drawingCanvas');
                if (mainCanvas) {
                    mainCanvas.style.display = 'block';
                }
                
                this.grid.currentMode = mode; 
                this.resizeCanvas(); // Ensure 2D canvas is correctly sized
                this.render2D(); // Render the 2D scene
            } else {
            }
        }
    }
    
    selectTool(tool) {
        if (typeof tool !== 'string' || tool.length === 0) { // ADDED CHECK
            return;
        }
        // SPANKY_LOG_START
        if (tool === 'circle') {
        }
        // SPANKY_LOG_END
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
        }        // SPANKY: Added log to confirm this method is called and with what toolName
        
        // SPANKY V19: Handle sketch tool selection - show plane selectors
        if (tool === 'sketch') {
            if (this.currentMode !== 'modeling') {
                this.switchMode('modeling', { keepPlaneSelectors: true });
            }
            
            // Show plane selectors for user to choose sketch plane
            if (this.sketchPlanes) {
                this.sketchPlanes.showPlaneSelectionPrompt();
            }
            return; // Don't proceed with normal tool selection for sketch tool
        }
        
        // Hide extrusion gizmo when switching away from extrude tool
        if (tool !== 'extrude' && this.extrusionGizmo) {
            this.extrusionGizmo.hide();
            this.extrusionGizmo = null;
            this.isExtruding = false;
            this.extrudingObject = null;
        }
        
        // Hide rotation gizmo when switching away from rotate tool
        if (tool !== 'rotate' && this.rotationGizmo) {
            this.disposeRotationGizmo();
        }
        
        // Update UI
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        document.getElementById('current-tool').textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
        
        this.render2D(); // Render to update tool-specific UI if any
    }
    
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        
        // Update bottom toolbar
        if (this.bottomToolbar) {
            this.bottomToolbar.updateGridStatus(this.gridVisible);
        }
        
        // Trigger re-render based on current mode
        if (this.currentMode === 'modeling') {
            // In 3D mode, call grid render with visibility state
            if (this.grid) {
                this.grid.render(this.gridVisible);
            }
        } else {
            // In 2D mode, trigger full re-render
            this.render2D();
        }
    }
      clearSelection() {
        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(obj => {
                obj.selected = false;
            });
            this.selectedObjects = [];
            this.updateExtrudeButtonState(); // Update extrude button when selection changes
            this.updateRotateButtonState(); // Update rotate button when selection changes
            if (this.currentMode === 'sketch') { // Corrected: Added parentheses
                 this.render2D();
            }
        }
    }
      addObject(obj) {
        if (!obj || !obj.type) {
            return;
        }
        // SPANKY_LOG_START
        if (obj.type === 'circle') {
        }
        // SPANKY_LOG_END

        this.clearSelection(); // Deselect any currently selected object(s)
          // SPANKY V36: Store sketch plane information and add to persistent plane
        if (this.currentSketchPlane) {
            obj.sketchPlane = {
                id: this.currentSketchPlane.id,
                name: this.currentSketchPlane.name,
                gridType: this.currentSketchPlane.gridType,
                normal: this.currentSketchPlane.normal,
                uAxis: this.currentSketchPlane.uAxis,
                vAxis: this.currentSketchPlane.vAxis
            };
            
            // Add this object to the persistent sketch plane's 2D children
            this.currentSketchPlane.children2D.push(obj);
            
        } else {
            // Default to XY plane if no current sketch plane
            obj.sketchPlane = {
                id: 'default_xy',
                name: 'XY Plane (Default)',
                gridType: 'xy',
                normal: { x: 0, y: 0, z: 1 },
                uAxis: { x: 1, y: 0, z: 0 },
                vAxis: { x: 0, y: 1, z: 0 }
            };
        }

        obj.selected = true; // Select the new object by default
        // obj.filled = true; // This is now handled in tools.js at creation time
        
        this.objects.push(obj);
        this.selectedObjects = [obj]; // Set the new object as the only selected one
        this.updateExtrudeButtonState(); // Update extrude button when selection changes
        this.updateRotateButtonState(); // Update rotate button when selection changes

        this.updateObjectCount();
        if (this.currentMode === 'sketch') { // CORRECTED SYNTAX
            this.render2D();
        } else {
            // For 3D mode, or if render() handles other UI, call it.
            // For now, 3D doesn't use this object list directly for rendering.
            this.render(); 
        }
    }
    
    updateObjectCount() {
        document.getElementById('object-count').textContent = this.objects.length;
    }
    
    // NEW METHODS START
    getNextPartId(baseType) { // baseType is not strictly needed for Date.now() but good for consistency
        return Date.now(); // Simple unique ID generator
    }

    getNextPartName(baseType) {
        if (this.partCounters[baseType] === undefined) {
            this.partCounters[baseType] = 0; 
        }
        this.partCounters[baseType]++;
        const name = `${baseType.charAt(0).toUpperCase() + baseType.slice(1)} ${this.partCounters[baseType]}`;
        return name;
    }

    // NEW METHODS FOR 3D SYNCHRONIZATION AND GIZMOS
    synchronize2DObjectsTo3D() {
        if (this.currentMode !== 'modeling' || !this.grid || !this.grid.scene) {
            return;
        }

        // Reverse the objects array before creating meshes to fix stacking order (Claude's fix)
        [...this.objects].reverse().forEach(obj => {
            const mesh = this.create3DMeshFrom2D(obj); // Use our new flat mesh creation method
            if (mesh) {
                // Mesh is already stored in active3DMeshes by create3DMeshFrom2D
            } else {
            }
        });
    }

    clear3DMeshes() {
        for (const id in this.active3DMeshes) {
            if (this.active3DMeshes[id]) {
                this.active3DMeshes[id].dispose();
            }
        }
        this.active3DMeshes = {};
        this.selected3DMesh = null; // Also clear selection
        if (this.gizmoManager && this.gizmoManager.attachedMesh) {
            this.gizmoManager.attachToMesh(null);
        }
    }

    setup3DGizmos() {
        if (this.currentMode !== 'modeling' || !this.grid || !this.grid.scene || !this.grid.getBabylonCamera()) {
            return;
        }

        // Dispose existing gizmo manager if any
        if (this.gizmoManager) {
            this.gizmoManager.dispose();
        }
        // Dispose existing highlight layer if any
        if (this.highlightLayer) {
            this.highlightLayer.dispose();
        }

        const scene = this.grid.scene;
        const utilLayer = new BABYLON.UtilityLayerRenderer(scene);
        
        this.gizmoManager = new BABYLON.GizmoManager(scene, utilLayer);
        // Configure gizmos as needed - initially, let's keep them simple or off
        this.gizmoManager.positionGizmoEnabled = false; 
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false; 
        this.gizmoManager.boundingBoxGizmoEnabled = false; // Keep this false for now, highlight layer will do the job
        this.gizmoManager.attachToMesh(null);

        // Setup HighlightLayer
        this.highlightLayer = new BABYLON.HighlightLayer("hl1", scene);
        this.highlightLayer.innerGlow = false; // Optional: disable inner glow
        this.highlightLayer.outerGlow = true; // Optional: enable outer glow
        // You can customize the highlight color:
        this.highlightLayer.blurHorizontalSize = 1;
        this.highlightLayer.blurVerticalSize = 1;
        this.highlightLayer.neutralColor = new BABYLON.Color4(0,0,0,0); // Transparent when not highlighting        
        
        // Setup pointer tracking for 3D picking
        this.setupPointerTracking();
        
        // Handle clicks in 3D to select meshes
        scene.onPointerObservable.add((pointerInfo) => {
            if (this.currentMode !== 'modeling') return; // Only active in modeling mode

            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {                const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
                    // Ignore gizmo components - let the gizmo handle its own interactions
                    if (mesh.name && (mesh.name.includes("extrusionGizmo") || mesh.name.includes("gizmo"))) {
                        return false;
                    }
                    
                    // Allow plane selectors to be picked
                    if (mesh.metadata && mesh.metadata.isPlaneSelector) {
                        return true;
                    }
                    
                    // Allow ViewCube to be picked
                    if (mesh.metadata && mesh.metadata.isViewCube) {
                        return true;
                    }
                    
                    // Only pick meshes that are part of our active3DMeshes and are pickable
                    return mesh.isPickable && this.active3DMeshes[mesh.metadata?.originalObjectId] === mesh;
                });if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
                    const pickedMesh = pickInfo.pickedMesh;
                    if (this.sketchPlanes && this.sketchPlanes.handlePlaneClick(pickedMesh)) {
                        return;
                    }

                    // Check if clicked on ViewCube
                    if (this.viewCube && this.viewCube.handleFaceClick(pickedMesh, pickInfo)) {
                        return;
                    }

                    // Special handling for extrude tool
                    if (this.tools && this.tools.activeTool === 'extrude') {
                        const originalObjectId = pickedMesh.metadata?.originalObjectId;
                        const originalObject = this.objects.find(obj => obj.id === originalObjectId);
                        
                        if (originalObject && ['rectangle', 'circle'].includes(originalObject.type)) {
                            this.startExtrusion(originalObject, pickInfo);
                        } else {
                        }
                        return;
                    }

                    if (this.selected3DMesh === pickedMesh) {
                        // Clicked on already selected mesh - potentially deselect or cycle behavior later
                        // For now, do nothing, or deselect:
                        // this.deselect3DMesh(); 
                        return;
                    }
                    
                    // Pass the full pickInfo to help position gizmos correctly using Opus's strategy
                    
                    // Pass the full pickInfo object instead of just click position
                    this.select3DMesh(pickedMesh, false, pickInfo);                } else {
                    // Before treating as empty space, check if we clicked on the gizmo
                    let clickedOnGizmo = false;
                    if (this.extrusionGizmo && this.extrusionGizmo.gizmoContainer && this.extrusionGizmo.gizmoContainer.isEnabled()) {
                        // Use the gizmo's own custom picking to check if we hit gizmo components
                        const gizmoPickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
                            return this.extrusionGizmo._isGizmoMesh(mesh);
                        });
                        if (gizmoPickInfo && gizmoPickInfo.hit && gizmoPickInfo.pickedMesh) {
                            clickedOnGizmo = true;
                        }
                    }
                    
                    if (!clickedOnGizmo) {
                        // Clicked on empty space or non-selectable mesh (and NOT on gizmo)
                        this.deselect3DMesh();
                        
                        // Hide extrusion gizmo when clicking empty space (but not when clicking gizmo)
                        if (this.extrusionGizmo) {
                            this.extrusionGizmo.hide();
                            this.extrusionGizmo = null;
                            this.isExtruding = false;
                            this.extrudingObject = null;
                        }
                    } else {
                    }
                }
            }
    }

    select3DMesh(meshToSelect, skipRotationStart = false, clickInfo = null) {
        if (!meshToSelect || !this.highlightLayer) return;

        // If rotate tool is active, start rotation immediately
        if (this.tools && this.tools.activeTool === 'rotate' && !skipRotationStart) {
            this.startRotation(meshToSelect, clickInfo);
            return;
        }

        // Deselect previous mesh if any
        this.deselect3DMesh();        this.selected3DMesh = meshToSelect;
        
        // Add visual feedback for selected mesh
        // 1. Add highlight layer (yellow outline)
        this.highlightLayer.addMesh(this.selected3DMesh, BABYLON.Color3.Yellow());
        
        // 2. Make mesh semi-transparent so we can see gizmo inside
        if (this.selected3DMesh.material) {
            // Store original alpha and alpha mode for restoration
            if (!this.selected3DMesh.metadata.originalAlpha) {
                this.selected3DMesh.metadata.originalAlpha = this.selected3DMesh.material.alpha || 1.0;
                this.selected3DMesh.metadata.originalAlphaMode = this.selected3DMesh.material.alphaMode || BABYLON.Engine.ALPHA_DISABLE;
            }
            
            // CLAUDE'S RECOMMENDED TRANSPARENCY SETTINGS FOR SELECTED SHAPES
            this.selected3DMesh.material.alpha = 0.4; // Semi-transparent
            this.selected3DMesh.material.alphaMode = BABYLON.Engine.ALPHA_BLEND; // Enable alpha blending for transparency
            this.selected3DMesh.material.disableDepthWrite = false; // Keep depth writing enabled for proper sorting
            this.selected3DMesh.material.needDepthPrePass = true; // Enable depth pre-pass for transparent objects
            
        }
        
        // Attach gizmo (if needed in future, for now just highlighting)
        // this.gizmoManager.attachToMesh(this.selected3DMesh);

        
        // TODO: Show extrude gizmo here
    }    deselect3DMesh() {
        if (this.selected3DMesh && this.highlightLayer) {
            // Remove highlight
            this.highlightLayer.removeMesh(this.selected3DMesh);
            
            // Restore original transparency and alpha mode
            if (this.selected3DMesh.material && this.selected3DMesh.metadata.originalAlpha !== undefined) {
                this.selected3DMesh.material.alpha = this.selected3DMesh.metadata.originalAlpha;
                
                // Restore original alpha mode if stored
                if (this.selected3DMesh.metadata.originalAlphaMode !== undefined) {
                    this.selected3DMesh.material.alphaMode = this.selected3DMesh.metadata.originalAlphaMode;
                    
                    // Reset depth settings for opaque objects
                    if (this.selected3DMesh.metadata.originalAlphaMode === BABYLON.Engine.ALPHA_DISABLE) {
                        this.selected3DMesh.material.disableDepthWrite = false;
                        this.selected3DMesh.material.needDepthPrePass = false;
                    }
                }
                
            }
            
        }
        this.selected3DMesh = null;
        // this.gizmoManager.attachToMesh(null); // Detach gizmo if it was attached
    }    dispose3DGizmos() {
        if (this.gizmoManager) {
            this.gizmoManager.dispose();
            this.gizmoManager = null;
        }
        if (this.highlightLayer) { // Also dispose highlight layer
            this.highlightLayer.dispose();
            this.highlightLayer = null;
        }
        
        // Dispose ViewCube
        if (this.viewCube) {
            this.viewCube.dispose();
            this.viewCube = null;
        }
        
        // Dispose custom extrusion gizmo
        this.disposeExtrusionGizmo();
        
        this.selected3DMesh = null; // Clear selection when gizmos are disposed
    }

    // END NEW METHODS
    
    startRenderLoop() {
        const render = () => {
            this.render(); 
            requestAnimationFrame(render);
        };
        render();
    }
      render() {
        if (!this.ctx || !this.canvas) return;
    
        if (this.currentMode === 'modeling') {
            // Babylon.js handles its own rendering loop
            // Update ViewCube rotation to match main camera
            if (this.viewCube) {
                this.viewCube.updateCubeRotation();
            }
            
            // Update the status bar for 3D mode
            this.updateStatusBar(); 
            return;
        }
    
        // In 2D sketch mode, rendering is primarily driven by camera interactions
        // (via render2D in the camera callback) and tool interactions.
        // The grid itself is drawn by render2D().
        // This continuous loop is now only for things like UI updates or future animations.
    
        // Example: if (this.animations.length > 0) this.drawing.renderAnimations();
    
        this.updateStatusBar(); // Status bar can update continuously
    }
      render2D() {
        if (this.currentMode !== 'sketch') {
            return;
        }
        if (!this.ctx || !this.camera || !this.grid || !this.drawing) {
                ctx: !!this.ctx, camera: !!this.camera, grid: !!this.grid, drawing: !!this.drawing
            });
            return;
        }

        // Update bottom toolbar with current zoom and grid info
        if (this.bottomToolbar && this.camera) {
            this.bottomToolbar.updateZoom(this.camera.zoom);
            if (this.grid) {
                this.bottomToolbar.updateGridSpacing(this.grid.minorSpacing);
            }
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gridVisible) {
            this.grid.render(this.gridVisible);
        }

        if (this.objects.length > 0) {
        }
        this.drawing.renderObjects(this.objects);

        if (this.tools && this.tools.tempObject) {
            this.drawing.renderTemporary(this.tools.tempObject);
        } else {
        }
        
        this.updateStatusBar();
    }
    
    updateStatusBar() {
        // Assclown, Spanky is updating the status bar for you.
        const currentModeEl = document.getElementById('current-mode');
        const currentGridSizeEl = document.getElementById('current-grid-size');
        // const currentZoomLevelEl = document.getElementById('current-zoom-level'); // Old ID
        const currentVisibleHeightEl = document.getElementById('current-visible-height'); // New ID

        if (currentModeEl) {
            currentModeEl.textContent = this.currentMode === 'sketch' ? '2D Sketch' : '3D Model';
        }

        // if (this.camera && currentZoomLevelEl) { // Old logic
        //     const zoomPercentage = Math.round(this.camera.zoom * 100);
        //     currentZoomLevelEl.textContent = `${zoomPercentage}%`;
        // }

        if (this.camera && currentVisibleHeightEl) {
            if (this.currentMode === 'sketch') {
                const visibleHeight = this.camera.getVisibleWorldHeight();
                currentVisibleHeightEl.textContent = `View H: ${visibleHeight.toFixed(1)}\"`;
            } else {
                // For 3D mode, this metric might need a different calculation (e.g., camera distance to target)
                // For now, let's clear it or show N/A for 3D to avoid confusion.
                currentVisibleHeightEl.textContent = 'View H: N/A'; 
            }
        }

        if (this.grid && currentGridSizeEl) {
            let gridSizeText = 'N/A';
            if (this.currentMode === 'sketch' && this.grid.minorSpacing) {
                // Display minorSpacing for 2D mode
                gridSizeText = this.grid.getFormattedSpacing(this.grid.minorSpacing);
            } else if (this.currentMode === 'modeling' && this.grid.babylonGrid && this.grid.babylonGrid.getMinorLineSpacing) {
                // Display minorSpacing for 3D mode (if available)
                // This assumes your BabylonGrid class has a way to get current minor spacing
                const babylonMinorSpacing = this.grid.babylonGrid.getMinorLineSpacing(); // You'll need to implement this
                gridSizeText = this.grid.getFormattedSpacing(babylonMinorSpacing);
            } else if (this.grid.minorSpacing) { // Fallback for initial state or if 3D doesn't have specific getter
                 gridSizeText = this.grid.getFormattedSpacing(this.grid.minorSpacing);
            }
            currentGridSizeEl.textContent = gridSizeText;
        }
    }

    // Helper to get current mouse position in world coordinates
    getMouseWorldPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;        return this.camera.screenToWorld(x, y);
    }
    
    // Store last pointer position for 3D picking
    setupPointerTracking() {
        if (!this.grid || !this.grid.babylonCanvas) return;

        this.grid.babylonCanvas.addEventListener('pointermove', (e) => {
            const rect = this.grid.babylonCanvas.getBoundingClientRect();
            this.lastPointerX = e.clientX - rect.left;
            this.lastPointerY = e.clientY - rect.top;
        });
    }
      // Extrusion Workflow Methods - Master's custom extrusion system
    startExtrusion(object, clickInfo = null) {
        
        if (this.currentMode !== 'modeling') {
            return;
        }
        
        if (!this.grid || !this.grid.scene) {
            return;
        
        // Always dispose existing gizmo first to ensure clean state
        if (this.extrusionGizmo) {
            this.extrusionGizmo.dispose();
            this.extrusionGizmo = null;
        }
          // Check if object already has a 3D mesh
        let mesh3D = this.active3DMeshes[object.id];
        
        // If mesh exists but it's not the right type for extrusion, recreate it
        // Accept both old naming (shape2D_rect_) and new naming (rect_)
        const isExtrusionReadyMesh = mesh3D && (
            mesh3D.name.includes('rect_') || 
            mesh3D.name.includes('circle_') ||
            mesh3D.name.includes('shape2D_rect_') ||
            mesh3D.name.includes('shape2D_circle_')
        );
        
        if (mesh3D && !isExtrusionReadyMesh) {
            mesh3D.dispose();
            delete this.active3DMeshes[object.id];
            mesh3D = null;
        } else if (mesh3D) {
        }
        
        if (!mesh3D) {
            // Create initial 3D mesh from 2D object
            mesh3D = this.create3DMeshFrom2D(object);
            if (!mesh3D) {
                return;
            }
        }        // Set up extrusion state
        this.isExtruding = true;
        this.extrudingObject = object;
        
        // Restore mesh to full opacity during extrusion for better visibility
        if (mesh3D.material && mesh3D.metadata.originalAlpha !== undefined) {
            mesh3D.material.alpha = mesh3D.metadata.originalAlpha;
            
            // Restore original alpha mode if stored
            if (mesh3D.metadata.originalAlphaMode !== undefined) {
                mesh3D.material.alphaMode = mesh3D.metadata.originalAlphaMode;
                
                // Reset depth settings for opaque objects
                if (mesh3D.metadata.originalAlphaMode === BABYLON.Engine.ALPHA_DISABLE) {
                    mesh3D.material.disableDepthWrite = false;
                    mesh3D.material.needDepthPrePass = false;
                }
            }
            
        } else if (mesh3D.material) {
            // Set proper opaque material settings
            mesh3D.material.alpha = 1.0; // Ensure full opacity
            mesh3D.material.alphaMode = BABYLON.Engine.ALPHA_DISABLE; // Disable alpha blending
            mesh3D.material.disableDepthWrite = false; // Enable depth writing
            mesh3D.material.needDepthPrePass = false; // No depth pre-pass needed for opaque
        }
        
        
        // Create and show the custom extrusion gizmo with click info
        this.extrusionGizmo = new ExtrusionGizmo(mesh3D, this.grid.scene, clickInfo);
        VersionReporter.report('extrusionGizmo.js', DYNAMIC_VERSION, 'success');
        
        // Subscribe to extrusion events
        this.extrusionGizmo.onExtrude.add((eventData) => {
            this.handleExtrusionUpdate(eventData);
        });
        
    }    create3DMeshFrom2D(object) {
        if (!this.grid || !this.grid.scene) {
            return null;
        }
        let mesh = null;
        const sketchPlane = object.sketchPlane || {
            gridType: 'xy',
            normal: { x: 0, y: 0, z: 1 },
            uAxis: { x: 1, y: 0, z: 0 },
            vAxis: { x: 0, y: 1, z: 0 },
            origin: { x: 0, y: 0, z: 0 }
        };
        if (!sketchPlane.origin) sketchPlane.origin = { x: 0, y: 0, z: 0 };
        try {
            // PROPER 3D GEOMETRY: Create visible thickness for proper 3D behavior (Opus's fix)
            const MINIMUM_THICKNESS = 0.1; // Opus suggests 0.1 units minimum, not 0.001!
            
            switch (object.type) {
                case 'rectangle':
                    // Create proper thickness box instead of ultra-thin plane (Opus's fix)
                    mesh = BABYLON.MeshBuilder.CreateBox(`rect_${object.id}`, {
                        width: object.width,
                        height: object.height,
                        depth: MINIMUM_THICKNESS, // Proper 3D thickness for depth testing
                        updatable: true
                    }, this.grid.scene);
                    break;
                    
                case 'circle':
                    // FIXED: Create proper thickness cylinder - orientation will be handled by transformation matrix
                    mesh = BABYLON.MeshBuilder.CreateCylinder(`circle_${object.id}`, {
                        diameter: object.radius * 2,
                        height: MINIMUM_THICKNESS, // Proper 3D thickness for depth testing
                        updatable: true
                    }, this.grid.scene);
                    
                    break;
                    
                default:
                    return null;
            }
            if (mesh) {
                // UNIFIED COORDINATE TRANSFORMATION: Calculate local position consistently for all object types
                let localPos = { x: 0, y: 0, z: 0 };
                
                // Use consistent center-point calculation for ALL object types
                if (object.type === 'rectangle') {
                    // Rectangle: center point is object position + half dimensions
                    localPos.x = object.x + object.width / 2;
                    localPos.y = object.y + object.height / 2;
                    localPos.z = 0; // Always on the sketch plane surface
                } else if (object.type === 'circle') {
                    // Circle: center point is already stored in object.center
                    localPos.x = object.center.x;
                    localPos.y = object.center.y;
                    localPos.z = 0; // Always on the sketch plane surface
                }
                
                // Debug logging for coordinate transformation
                    { x: object.x, y: object.y, width: object.width, height: object.height } : 
                    { x: object.center.x, y: object.center.y, radius: object.radius });
                
                // Create transformation vectors from sketch plane
                const u = new BABYLON.Vector3(sketchPlane.uAxis.x, sketchPlane.uAxis.y, sketchPlane.uAxis.z);
                const v = new BABYLON.Vector3(sketchPlane.vAxis.x, sketchPlane.vAxis.y, sketchPlane.vAxis.z);
                const n = new BABYLON.Vector3(sketchPlane.normal.x, sketchPlane.normal.y, sketchPlane.normal.z);
                const origin = new BABYLON.Vector3(sketchPlane.origin.x, sketchPlane.origin.y, sketchPlane.origin.z);
                
                
                // UNIFIED TRANSFORMATION: Use the same approach for both rectangles and circles
                const worldPos = origin.clone()
                    .add(u.scale(localPos.x))
                    .add(v.scale(localPos.y))
                    .add(n.scale(localPos.z));
                mesh.position = worldPos;
                
                // CRITICAL FIX: For cylinders, we need to account for the fact that Babylon creates them
                // with height along the Y-axis, but we want the height along the sketch plane normal
                if (object.type === 'circle') {
                    
                    // Create a transformation that maps the cylinder's Y-axis to the sketch plane normal
                    // The cylinder's default orientation is height along Y-axis
                    // We need to rotate it so the height aligns with the sketch plane normal
                    
                    // Default cylinder Y-axis (height direction)
                    const cylinderY = new BABYLON.Vector3(0, 1, 0);
                    
                    // Calculate rotation needed to align cylinder Y-axis with sketch plane normal
                    const rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(cylinderY, n, new BABYLON.Quaternion());
                    
                    mesh.rotationQuaternion = rotationQuaternion;
                    
                } else {
                    // For rectangles, use the full transformation matrix as before
                    const rotMat = BABYLON.Matrix.FromValues(
                        u.x, v.x, n.x, 0,  // Local X = sketch U, Local Y = sketch V, Local Z = sketch normal
                        u.y, v.y, n.y, 0,  
                        u.z, v.z, n.z, 0,  
                        0,   0,   0,   1   
                    );
                    mesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotMat);
                }
                
                // Create enhanced material for proper 3D depth testing (Opus's guidance)
                const material = new BABYLON.StandardMaterial(`mat_${object.id}`, this.grid.scene);
                material.diffuseColor = new BABYLON.Color3(0.2, 0.7, 1.0); // Blue
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                material.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.2);
                material.backFaceCulling = false; // Babylon equivalent of THREE.DoubleSide
                
                // OPUS'S DEPTH TESTING REQUIREMENTS (Babylon.js equivalents):
                material.alpha = 0.8; // Slight transparency for better depth perception (Opus's recommendation)
                material.alphaMode = BABYLON.Engine.ALPHA_COMBINE; // Better transparency handling
                material.disableDepthWrite = false; // material.depthWrite = true
                material.needDepthPrePass = false; // Standard depth testing
                material.separateCullingPass = true; // Better transparency handling (Opus's recommendation)
                material.zOffset = -1; // Helps with z-fighting (Opus's recommendation)
                // Note: Babylon.js has depthTest enabled by default (no explicit setting needed)
                
                mesh.material = material;
                
                // Enable ALL edge rendering for better visibility and selection (Master's request)
                this.grid.enableAllEdgesRendering(mesh);
                
                // OPUS'S CRITICAL FIX: Remove renderingGroupId to allow natural depth sorting
                // mesh.renderingGroupId = 1; // REMOVED - this forces shapes on top regardless of depth!
                
                // Instead, let Babylon.js handle natural depth buffer sorting
                mesh.isPickable = true;
                mesh.material.backFaceCulling = false; // Render both sides for thin meshes
                mesh.material.separateCullingPass = true; // Better transparency handling (Opus's fix)
                mesh.hasVertexAlpha = true; // Better transparency support (Opus's recommendation)
                
                // Store mesh reference
                this.active3DMeshes[object.id] = mesh;
                // Add metadata to link back to 2D object
                mesh.metadata = {
                    originalObject: object,
                    originalObjectId: object.id,
                    sketchPlane: sketchPlane,
                    extrusionNormal: this.getExtrusionNormalForPlane(sketchPlane),
                    originalPosition: mesh.position.clone() // Store original position for base-anchored scaling
                };
            } else {
            }
        } catch (error) {
            return null;
        }
        return mesh;
    }
    
    handleExtrusionUpdate(eventData) {
        
        if (!this.extrudingObject || !this.active3DMeshes[this.extrudingObject.id]) {
            return;
        }        // PROPER BASE-ANCHORED EXTRUSION: Scale mesh and adjust position to keep base fixed
        // When scaling in Babylon.js, mesh grows from center - we must compensate!
        
        const mesh = this.active3DMeshes[this.extrudingObject.id];
        const distance = eventData.distance;
        
        // Get the current extrusion height (or 0.1 if not previously extruded)
        const currentHeight = this.extrudingObject.extrusionHeight || 0.1;
        let newHeight = currentHeight + distance;
        
        // Prevent the mesh from going below minimum height
        if (newHeight < 0.1) {
            newHeight = 0.1;
        }
        
        
        // Store the original mesh metadata to get extrusion direction
        const sketchPlane = mesh.metadata ? mesh.metadata.sketchPlane : null;
        const originalPos = mesh.metadata ? mesh.metadata.originalPosition : mesh.position.clone();
        
        // Calculate scale factor
        const scaleFactor = newHeight / 0.1;
        
        if (this.extrudingObject.type === 'circle') {
            // Scale cylinder along its height axis (Y in Babylon's coordinate system)
            mesh.scaling.y = scaleFactor;
            
            // Compensate position: when scaling from center, we need to move the mesh
            // by half the growth amount in the extrusion direction to keep base anchored
            if (sketchPlane) {
                const extrusionNormal = new BABYLON.Vector3(sketchPlane.normal.x, sketchPlane.normal.y, sketchPlane.normal.z);
                const heightGrowth = newHeight - 0.1; // Total growth from original thickness
                const positionOffset = heightGrowth / 2; // Move by half the growth to keep base fixed
                
                mesh.position = originalPos.add(extrusionNormal.scale(positionOffset));
            }
            
        } else if (this.extrudingObject.type === 'rectangle') {
            // Scale box along its depth axis (Z in Babylon's coordinate system)  
            mesh.scaling.z = scaleFactor;
            
            // Compensate position for rectangle scaling
            if (sketchPlane) {
                const extrusionNormal = new BABYLON.Vector3(sketchPlane.normal.x, sketchPlane.normal.y, sketchPlane.normal.z);
                const heightGrowth = newHeight - 0.1; // Total growth from original thickness
                const positionOffset = heightGrowth / 2; // Move by half the growth to keep base fixed
                
                mesh.position = originalPos.add(extrusionNormal.scale(positionOffset));
            }
        }
        
        // Update gizmo position to stay above the growing mesh
        if (this.extrusionGizmo && eventData.isPreview) {
            // Update gizmo to track the new mesh if it was recreated
            const currentMesh = this.active3DMeshes[this.extrudingObject.id];
            if (currentMesh && currentMesh !== this.extrusionGizmo.attachedMesh) {
                this.extrusionGizmo.attachedMesh = currentMesh;
            }
            this.extrusionGizmo.updatePosition(newHeight);
        }
        
        // If this is not a preview (final extrusion), finalize the object
        if (!eventData.isPreview) {
            this.finalizeExtrusion(distance);
        }
    }
    
    finalizeExtrusion(finalDistance) {
        
        if (!this.extrudingObject) {
            return;
        }        // Update the 2D object to mark it as extruded with cumulative height
        this.extrudingObject.isExtruded = true;
        const currentHeight = this.extrudingObject.extrusionHeight || 1.0;
        let newCumulativeHeight = currentHeight + finalDistance; // FIXED: Allow negative distances
        
        // Ensure minimum height
        if (newCumulativeHeight < 0.1) {
            newCumulativeHeight = 0.1;
        }
        
        this.extrudingObject.extrusionHeight = newCumulativeHeight;
        
        // SPANKY V36: Move object from 2D children to 3D children in persistent sketch plane
        if (this.extrudingObject.sketchPlane && this.currentSketchPlane) {
            // Remove from 2D children
            const index2D = this.currentSketchPlane.children2D.findIndex(obj => obj.id === this.extrudingObject.id);
            if (index2D !== -1) {
                this.currentSketchPlane.children2D.splice(index2D, 1);
            }
            
            // Add to 3D children
            this.currentSketchPlane.children3D.push(this.extrudingObject);
        }
        
          // Don't hide the gizmo - keep it visible for potential re-extrusion
        // The gizmo will only be hidden when clicking empty space or selecting another tool
        if (this.extrusionGizmo) {
            // Update gizmo position to final height
            this.extrusionGizmo.updatePosition(newCumulativeHeight);
        }
        
        // Reset extrusion state but keep the extrude tool active and gizmo visible
        this.isExtruding = false;
        this.extrudingObject = null;
        
        // Update UI button states now that we have a new 3D mesh
        this.updateRotateButtonState();
        
        // Don't switch back to select tool - keep extrude tool active for multiple extrusions
        // this.selectTool('select'); // Commented out to allow multiple extrusions
    }
    
    // Clean up extrusion resources
    disposeExtrusionGizmo() {
        if (this.extrusionGizmo) {
            this.extrusionGizmo.dispose();            this.extrusionGizmo = null;
        }
        this.isExtruding = false;
        this.extrudingObject = null;    }
    
    // Rotation Workflow Methods - Local coordinate system rotation for 3D objects
    startRotation(mesh3D, clickInfo = null) {
        
        if (this.currentMode !== 'modeling') {
            return;
        }
        
        if (!this.grid || !this.grid.scene) {
            return;
        }
        
        // Dispose existing rotation gizmo first
        if (this.rotationGizmo) {
            this.rotationGizmo.dispose();
            this.rotationGizmo = null;
        }
        
        // Create new rotation gizmo attached to the mesh with click position
        this.rotationGizmo = new RotationGizmo(mesh3D, this.grid.scene, clickInfo);
        VersionReporter.report('rotationGizmo.js', DYNAMIC_VERSION, 'success');
        
        // Subscribe to rotation events
        this.rotationGizmo.onRotate.add((eventData) => {
            this.handleRotationUpdate(eventData);
        });
        
               
        // Make sure the mesh is selected visually
        this.select3DMesh(mesh3D, true); // Skip rotation start to avoid circular call
        
    }
    
    handleRotationUpdate(eventData) {
        
        // The rotation is already applied to the mesh by the gizmo
        // This handler can be used for additional processing, logging, or undo/redo
        
        if (!eventData.isPreview) {
            // Final rotation completed - could save state for undo/redo here
        }
    }
    
    disposeRotationGizmo() {
        if (this.rotationGizmo) {
            this.rotationGizmo.dispose();
            this.rotationGizmo = null;
        }
    }
    
    // Position and orient a mesh based on its original sketch plane    // Position and orient a mesh based on its original sketch plane using mathematical transformation
    positionMeshForSketchPlane(mesh, object, sketchPlane) {
        
        // Create transformation matrix from sketch plane coordinate system to world coordinates
        const transform = this.createPlaneTransformMatrix(sketchPlane);
        
        // Calculate 2D position in sketch plane coordinates
        let localPos = { x: 0, y: 0, z: 0 };
        
        if (object.type === 'rectangle') {
            // Center of rectangle in sketch plane local coordinates
            localPos.x = object.x + object.width / 2;
            localPos.y = object.y + object.height / 2;
            localPos.z = 0; // Always on the plane surface
        } else if (object.type === 'circle') {
            // Center of circle in sketch plane local coordinates
            localPos.x = object.center.x;
            localPos.y = object.center.y;
            localPos.z = 0; // Always on the plane surface
        }
        
        // Transform from sketch plane local coordinates to world coordinates
        const worldPos = this.transformPointToWorld(localPos, transform);
        
        // Apply world position to mesh
        mesh.position.x = worldPos.x;
        mesh.position.y = worldPos.y;
        mesh.position.z = worldPos.z;
        
        // Apply rotation to align mesh with sketch plane orientation
        this.alignMeshWithPlane(mesh, sketchPlane);
        
    }
    // Helper function to cleanup wireframe overlays when disposing meshes (Master's request)
    disposeWithWireframeOverlay(mesh) {
        try {
            if (mesh.wireframeOverlay) {
                mesh.wireframeOverlay.dispose();
                mesh.wireframeOverlay = null;
            }
            mesh.dispose();
        } catch (error) {
            // Fallback to standard disposal
            if (mesh.dispose) {
                mesh.dispose();
            }
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // SPANKY'S FIX: Initialize VersionReporter FIRST before creating CutListCAD
    VersionReporter.init();
    
    // Report main.js version with enhanced detection
    const mainVersion = VersionReporter.getVersionFromQueryString();
    VersionReporter.report('main.js', mainVersion, 'success');
    
    // Report cache version
    VersionReporter.report('Cache Version', DYNAMIC_VERSION, 'success');
    
    // NOW create the CutListCAD instance (which will create modules that can report versions)
    window.cutlistCAD = new CutListCAD();
    // Make showPage function available globally for HTML onclick handlers
    window.showPage = (pageId) => window.cutlistCAD.showPage(pageId);
});

export default CutListCAD;

// Additional global functions for mode switching (if not part of the class)

function switchTo3DMode() {
    if (is2DMode) {
        const previousCameraState = camera; // Keep a reference to the 2D camera for state transfer
        camera = switchTo3D(scene, canvas, previousCameraState); 
        is2DMode = false;
        modeButton.textContent = "2D Mode";

        // Attempt to remove existing testBox if any (robustness)
        const existingBox = scene.getMeshByName("testBox");
        if (existingBox) {
            existingBox.dispose();
        }

        try {
            const testBox = BABYLON.MeshBuilder.CreateBox("testBox", { size: 20 }, scene); // Increased size further
            testBox.position = BABYLON.Vector3.Zero();
            const boxMaterial = new BABYLON.StandardMaterial("boxMat", scene);
            boxMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Bright Red
            boxMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0); // Make it glow a bit
            testBox.material = boxMaterial;
            
            // Enable ALL edge rendering for test box too
            this.grid.enableAllEdgesRendering(testBox);
            
        } catch (e) {
        }

        // Log camera state again AFTER creating the box, in case something changed it

    } else {
    }
}

function switchTo2DMode() {
    if (!is2DMode) {
        const previousCameraState = camera; // Keep a reference to the 3D camera for state transfer
        camera = switchTo2D(scene, canvas, previousCameraState); 
        is2DMode = true;
        modeButton.textContent = "3D Mode";

        const testBox = scene.getMeshByName("testBox");
        if (testBox) {
            testBox.dispose();        } else {
    } else {
    }
}

// ===============================================
// VERSION REPORTING SYSTEM - Master's brilliant idea!
// ===============================================

// SPANKY'S FIX: Capture the script URL IMMEDIATELY at file load time
const MAIN_JS_SCRIPT_URL = (function() {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
        return currentScript.src;
    }
    return null;
})();

class VersionReporter {
    static logElement = null;
    static versions = new Map();
    
    static init() {
        // Initialize the version reporting system
        this.logElement = document.getElementById('version-log');
        if (this.logElement) {
            this.logElement.innerHTML = ''; // Clear loading message
        }
    }
    
    static report(scriptName, versionInfo, status = 'success') {
        if (!this.logElement) {
            this.versions.set(scriptName, { versionInfo, status });
            return;
        }
        
        // Store the version
        this.versions.set(scriptName, { versionInfo, status });
        
        // Create version entry
        const entry = document.createElement('div');
        entry.className = `version-entry ${status}`;
        
        const scriptSpan = document.createElement('span');
        scriptSpan.className = 'version-script';
        scriptSpan.textContent = scriptName;
        
        const statusSpan = document.createElement('span');
        statusSpan.className = 'version-status';
        
        if (status === 'success') {
            statusSpan.innerHTML = `<span class="version-number">${versionInfo}</span> ✅`;
        } else if (status === 'loading') {
            statusSpan.textContent = 'Loading...';
        } else if (status === 'error') {
            statusSpan.textContent = `Error: ${versionInfo} ❌`;
        }
        
        entry.appendChild(scriptSpan);
        entry.appendChild(statusSpan);
        
        // Add to log (newest at top)
        this.logElement.insertBefore(entry, this.logElement.firstChild);
        
    }
    
    static getVersionFromQueryString() {
        
        // SPANKY'S NEW APPROACH: Look for the main.js script element in the DOM
        const scriptElements = document.querySelectorAll('script[src*="main.js"]');
        
        for (let script of scriptElements) {
            if (script.src && script.src.includes('main.js')) {
                try {
                    const url = new URL(script.src);
                    const versionParam = url.searchParams.get('v');
                    if (versionParam) {
                        return versionParam;
                    }
                } catch (e) {
                }
            }
        }
        
        // SPANKY'S FIX: First try the captured script URL from file load time
        if (MAIN_JS_SCRIPT_URL) {
            try {
                const url = new URL(MAIN_JS_SCRIPT_URL);
                const versionParam = url.searchParams.get('v');
                if (versionParam) {
                    return versionParam;
                }
            } catch (e) {
            }
        }
        
        // Fallback: Extract version from current script's query string
        const currentScript = document.currentScript;
        if (currentScript && currentScript.src) {
            const url = new URL(currentScript.src);
            const versionParam = url.searchParams.get('v');
            if (versionParam) {
                return versionParam;
            }
        }
        
        // Fallback: try to get from window location if it's the main script
        const url = new URL(window.location.href);
        const versionParam = url.searchParams.get('v');
        if (versionParam) {
            return versionParam;
        }
        
        // Ultimate fallback
        return 'unknown';
    }
}

// Make VersionReporter globally available for all scripts
window.VersionReporter = VersionReporter;
