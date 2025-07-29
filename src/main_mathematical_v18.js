// CutList CAD - Main Application Entry Point  
// Cache-busting version: cache_bust_v13_EMBEDDED_ON_GRID_SURFACE

import { CameraController } from './modules/camera.js?v=cb_v5';
import { GridRenderer } from './modules/grid.js?v=cb_v5';
import { DrawingEngine } from './modules/drawing.js?v=cb_v5';
import { ToolManager } from './modules/tools.js?v=cb_v5';
import { EventManager } from './modules/events.js?v=cb_v5';
import { switchTo2D, switchTo3D, getCurrentCamera } from './modules/camera.js?v=cb_v5';
import ExtrusionGizmo from './modules/extrusionGizmo.js?v=cb_v5';
import { SketchPlanesManager } from './modules/sketchPlanes.js?v=cb_v5';
import { ViewCube } from './modules/viewCube.js?v=cb_v5';
import { ProjectExplorer } from './modules/projectExplorer_clean.js?v=cb_v5';
import { BottomToolbarController } from './modules/bottom-toolbar.js?v=cb_v5';

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
        this.extrusionGizmo = null; // Custom extrusion gizmo        this.sketchPlanes = null;  // Sketch planes manager
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
        
        this.grid = new GridRenderer(this.ctx, this.camera);
        this.grid.currentMode = this.currentMode; 
          this.drawing = new DrawingEngine(this.ctx, this.camera, this); // Pass app instance
        this.tools = new ToolManager(this);
        this.events = new EventManager(this);        // Initialize Project Explorer
        this.initializeProjectExplorer();

        // Initialize Bottom Toolbar
        this.bottomToolbar = new BottomToolbarController();
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

        // Schedule another resize and render after next browser paint,
        // to ensure layout is stable if anything else shifts it.
        requestAnimationFrame(() => {
            this.resizeCanvas();
            this.render2D();
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
        
        // Update bottom toolbar
        if (this.bottomToolbar) {
            this.bottomToolbar.updateMode(mode);
        }
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });document.getElementById('current-mode').textContent = 
            mode === 'sketch' ? '2D Sketch' : '3D Model';
        
        // Update extrude button availability
        this.updateExtrudeButtonState();
        
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
                    this.grid.render(); // This ensures the Babylon canvas and scene are ready or created.
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
                                // Restore 3D camera state directly if available
                                if (this.camera.stored3DState) {
                                    this.camera.restore3DState(babylonCamera);
                                } else {
                                    this.camera.sync3DCameraTo2DView(babylonCamera);
                                }
                            } else {
                            }
                        } else {
                        }
                        
                        // SET INITIAL CAMERA POSITION AFTER ALL OTHER CAMERA OPERATIONS (Master's requirement)
                        this.grid.setInitialCameraPosition();
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
        
        // Update UI
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        document.getElementById('current-tool').textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
        
        this.render2D(); // Render to update tool-specific UI if any
    }
    
    toggleGrid() {
        this.gridVisible = !this.gridVisible;
    }
      clearSelection() {
        if (this.selectedObjects.length > 0) {
            this.selectedObjects.forEach(obj => {
                obj.selected = false;
            });
            this.selectedObjects = [];
            this.updateExtrudeButtonState(); // Update extrude button when selection changes
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

        this.objects.forEach(obj => {
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
        this.highlightLayer.neutralColor = new BABYLON.Color4(0,0,0,0); // Transparent when not highlighting        // Handle clicks in 3D to select meshes
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
                            this.startExtrusion(originalObject);
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
                    
                    this.select3DMesh(pickedMesh);                } else {
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

    select3DMesh(meshToSelect) {
        if (!meshToSelect || !this.highlightLayer) return;

        // Deselect previous mesh if any
        this.deselect3DMesh();        this.selected3DMesh = meshToSelect;
        
        // Add visual feedback for selected mesh
        // 1. Add highlight layer (yellow outline)
        this.highlightLayer.addMesh(this.selected3DMesh, BABYLON.Color3.Yellow());
        
        // 2. Make mesh semi-transparent so we can see gizmo inside
        if (this.selected3DMesh.material) {
            // Store original alpha for restoration
            if (!this.selected3DMesh.metadata.originalAlpha) {
                this.selected3DMesh.metadata.originalAlpha = this.selected3DMesh.material.alpha || 1.0;
            }
            this.selected3DMesh.material.alpha = 0.4; // Semi-transparent
        }
        
        // Attach gizmo (if needed in future, for now just highlighting)
        // this.gizmoManager.attachToMesh(this.selected3DMesh);

        
        // TODO: Show extrude gizmo here
    }    deselect3DMesh() {
        if (this.selected3DMesh && this.highlightLayer) {
            // Remove highlight
            this.highlightLayer.removeMesh(this.selected3DMesh);
            
            // Restore original transparency
            if (this.selected3DMesh.material && this.selected3DMesh.metadata.originalAlpha !== undefined) {
                this.selected3DMesh.material.alpha = this.selected3DMesh.metadata.originalAlpha;
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
            this.grid.render();
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
      // Extrusion Workflow Methods - Master's custom extrusion system
    startExtrusion(object) {
        
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
        } else if (mesh3D.material) {
            mesh3D.material.alpha = 1.0; // Ensure full opacity
        }
        
        
        // Create and show the custom extrusion gizmo - removed redundant disposal since we do it above
        this.extrusionGizmo = new ExtrusionGizmo(mesh3D, this.grid.scene, null);
        
        // Subscribe to extrusion events
        this.extrusionGizmo.onExtrude.add((eventData) => {
            this.handleExtrusionUpdate(eventData);
        });
        
    }    create3DMeshFrom2D(object) {
        
        if (!this.grid || !this.grid.scene) {
            return null;
        }
        
        let mesh = null;
        
        // Determine the sketch plane for positioning and orientation
        const sketchPlane = object.sketchPlane || {
            gridType: 'xy',
            normal: { x: 0, y: 0, z: 1 },
            uAxis: { x: 1, y: 0, z: 0 },
            vAxis: { x: 0, y: 1, z: 0 }
        };
        
        
        try {
            // Create a TransformNode as the parent for proper coordinate transformation
            const transformNode = new BABYLON.TransformNode(`transform_${object.id}`, this.grid.scene);
              switch (object.type) {
                case 'rectangle':
                    
                    // SPANKY V40: Create ULTRA-THIN BOX for precision anchoring - NOT a plane
                    mesh = BABYLON.MeshBuilder.CreateBox(`rect_${object.id}`, {
                        width: object.width,
                        height: object.height,
                        depth: 0.01, // Ultra-thin but visible box for precision
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                        updatable: true
                    }, this.grid.scene);
                    break;                case 'circle':
                    
                    // SPANKY V43: Create ULTRA-THIN CYLINDER - let plane transformation handle ALL orientation
                    // NO mesh-specific rotations - the plane transformation will orient everything consistently
                    mesh = BABYLON.MeshBuilder.CreateCylinder(`circle_${object.id}`, {
                        diameter: object.radius * 2,
                        height: 0.01, // Ultra-thin but visible cylinder for precision
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                        updatable: true
                    }, this.grid.scene);
                    
                    // NO ROTATION HERE - plane transformation handles all orientation consistently
                    break;
                    
                default:
                    return null;
            }
              if (mesh) {
                // Parent the mesh to the transform node
                mesh.parent = transformNode;
                  // CRITICAL FIX: Position mesh so its BOTTOM surface sits exactly on the plane
                // For ultra-thin shapes, offset by half the thickness in the plane's normal direction
                mesh.position = BABYLON.Vector3.Zero();
                
                // Calculate offset in the plane's normal direction
                const thicknessOffset = 0.005; // Half of 0.01 thickness
                const normalOffset = new BABYLON.Vector3(
                    sketchPlane.normal.x * thicknessOffset,
                    sketchPlane.normal.y * thicknessOffset,
                    sketchPlane.normal.z * thicknessOffset
                );
                
                // Apply the normal offset so bottom surface sits exactly on the plane
                mesh.position = normalOffset;
                
                // Create transformation matrix from sketch plane coordinate system
                const transform = this.createPlaneTransformMatrix(sketchPlane);
                  // Calculate local position in sketch plane coordinates
                let localPos = { x: 0, y: 0, z: 0 };
                if (object.type === 'rectangle') {
                    localPos.x = object.x + object.width / 2;
                    localPos.y = object.y + object.height / 2;
                    localPos.z = 0; // Always ON the sketch plane surface
                } else if (object.type === 'circle') {
                    localPos.x = object.center.x;
                    localPos.y = object.center.y;
                    localPos.z = 0; // Always ON the sketch plane surface
                }
                
                // FIXED: Apply rotation FIRST to orient the transform node properly
                this.applySketchPlaneTransformation(transformNode, sketchPlane);
                
                // FIXED: Position the transform node to anchor it to the sketch plane
                // Instead of transforming coordinates, position directly on the plane
                this.positionTransformNodeOnSketchPlane(transformNode, localPos, sketchPlane);
                
                // Create enhanced material for visibility (no transparency to avoid flickering)
                const material = new BABYLON.StandardMaterial(`mat_${object.id}`, this.grid.scene);
                material.diffuseColor = new BABYLON.Color3(0.2, 0.7, 1.0); // Blue instead of red
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                material.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.2); // Slight blue glow
                material.backFaceCulling = false;
                material.alpha = 1.0; // Fully opaque to prevent flickering
                mesh.material = material;
                  // Set mesh to render in the same group as the grid (not above it)
                mesh.renderingGroupId = 0; // Same as grid - objects embedded in grid surface
                
                // Store mesh reference (store the actual mesh, not the transform node)
                this.active3DMeshes[object.id] = mesh;
                
                // Add metadata to link back to 2D object
                mesh.metadata = {
                    originalObject: object,
                    originalObjectId: object.id,
                    sketchPlane: sketchPlane,
                    transformNode: transformNode, // Store reference to transform node
                    extrusionNormal: this.getExtrusionNormalForPlane(sketchPlane)
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
        }        const mesh = this.active3DMeshes[this.extrudingObject.id];
        const distance = eventData.distance; // FIXED: Don't use Math.abs - allow negative for downward extrusion
        
        // Get the current extrusion height (or 1.0 if not previously extruded)
        const currentHeight = this.extrudingObject.extrusionHeight || 1.0;
        let newHeight = currentHeight + distance; // Additive extrusion
        
        // Prevent the mesh from going below minimum height of 0.1 units
        if (newHeight < 0.1) {
            newHeight = 0.1;
        }
        
        const originalXPos = mesh.position.x;
        const originalYPos = mesh.position.y;  // Added for proper CAD coordinates
        const originalZPos = mesh.position.z;
        
        // Dispose the old mesh and create a new one with updated dimensions
        const meshName = mesh.name;
        const meshMaterial = mesh.material;
        const meshMetadata = mesh.metadata;
        
        // Remove old mesh
        mesh.dispose();
          // Create new mesh with updated height
        let newMesh = null;
        let newTransformNode = null;
        
        // Get the original transform node for proper positioning
        const originalTransformNode = meshMetadata.transformNode;
        
        switch (this.extrudingObject.type) {
            case 'rectangle':
                
                // Create new transform node for the extruded object
                newTransformNode = new BABYLON.TransformNode(`transform_extruded_${this.extrudingObject.id}`, this.grid.scene);
                
                // Create extruded box (not flat plane)
                newMesh = BABYLON.MeshBuilder.CreateBox(meshName, {
                    width: this.extrudingObject.width,
                    height: this.extrudingObject.height,
                    depth: newHeight, // Extrusion depth in local Z direction
                    updatable: true
                }, this.grid.scene);
                
                // Parent to transform node and position at origin
                newMesh.parent = newTransformNode;
                newMesh.position = BABYLON.Vector3.Zero();
                
                // CRITICAL: Position the extruded object at half-height offset
                // so it grows from the original plane surface
                newMesh.position.z = newHeight / 2;
                
                // Copy the original transform node's position and rotation
                if (originalTransformNode) {
                    newTransformNode.position = originalTransformNode.position.clone();
                    newTransformNode.rotation = originalTransformNode.rotation.clone();
                }
                
                break;
                
            case 'circle':
                
                // Create new transform node for the extruded object  
                newTransformNode = new BABYLON.TransformNode(`transform_extruded_${this.extrudingObject.id}`, this.grid.scene);
                
                // Create extruded cylinder
                newMesh = BABYLON.MeshBuilder.CreateCylinder(meshName, {
                    diameter: this.extrudingObject.radius * 2,
                    height: newHeight, // Extrusion height
                    updatable: true
                }, this.grid.scene);
                
                // Parent to transform node and position at origin
                newMesh.parent = newTransformNode;
                newMesh.position = BABYLON.Vector3.Zero();
                
                // CRITICAL: Position the extruded object at half-height offset
                newMesh.position.z = newHeight / 2;
                
                // Copy the original transform node's position and rotation
                if (originalTransformNode) {
                    newTransformNode.position = originalTransformNode.position.clone();
                    newTransformNode.rotation = originalTransformNode.rotation.clone();
                }
                
                break;
        }
        
        if (newMesh && newTransformNode) {
            // Restore material and metadata
            newMesh.material = meshMaterial;
            newMesh.metadata = {
                ...meshMetadata,
                transformNode: newTransformNode // Update to point to new transform node
            };
            
              // CRITICAL: Put extruded objects in same rendering group as grid
            newMesh.renderingGroupId = 0; // Same as grid - not floating above
            
            // Update the mesh reference
            this.active3DMeshes[this.extrudingObject.id] = newMesh;
        }// AGGRESSIVE mesh update for real-time feedback
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo();
        
        // Mark all related systems as dirty for immediate update
        mesh._isDirty = true;
        mesh.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.PositionKind, true);
        mesh.markVerticesDataAsUpdatable(BABYLON.VertexBuffer.NormalKind, true);
        
        if (mesh.geometry) {
            mesh.geometry._boundingInfo = null;
            // FIXED: Don't call computeWorldMatrix on geometry - only on mesh
        }
        
        // CRITICAL: Directly force scene render and bypass render loop delays
        if (this.grid && this.grid.scene) {
            // Force immediate update
            this.grid.scene.render();
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
      // Get the extrusion normal vector for a given sketch plane using mathematical approach
    getExtrusionNormalForPlane(sketchPlane) {
        // The extrusion normal is simply the sketch plane's normal vector
        return new BABYLON.Vector3(sketchPlane.normal.x, sketchPlane.normal.y, sketchPlane.normal.z);
    }
    
    // Create transformation matrix from sketch plane coordinates to world coordinates
    createPlaneTransformMatrix(sketchPlane) {
        
        // Sketch plane coordinate system vectors
        const uAxis = new BABYLON.Vector3(sketchPlane.uAxis.x, sketchPlane.uAxis.y, sketchPlane.uAxis.z);
        const vAxis = new BABYLON.Vector3(sketchPlane.vAxis.x, sketchPlane.vAxis.y, sketchPlane.vAxis.z);
        const normal = new BABYLON.Vector3(sketchPlane.normal.x, sketchPlane.normal.y, sketchPlane.normal.z);
        
        // Create transformation matrix
        // This matrix transforms from sketch plane local coordinates (u, v, n) to world coordinates (x, y, z)
        const transform = {
            uAxis: uAxis,
            vAxis: vAxis,
            normal: normal,
            origin: new BABYLON.Vector3(0, 0, 0) // For now, assume sketch plane passes through origin
        };
        
        return transform;
    }
    
    // Transform a point from sketch plane local coordinates to world coordinates
    transformPointToWorld(localPoint, transform) {
        // Transform: worldPoint = origin + u*uAxis + v*vAxis + n*normal
        const worldPoint = transform.origin.clone()
            .add(transform.uAxis.scale(localPoint.x))
            .add(transform.vAxis.scale(localPoint.y))
            .add(transform.normal.scale(localPoint.z));
            
        return worldPoint;
    }
      // Align mesh rotation with sketch plane orientation
    alignMeshWithPlane(mesh, sketchPlane) {
        
        // Calculate rotation matrix to align mesh with sketch plane
        const normal = new BABYLON.Vector3(sketchPlane.normal.x, sketchPlane.normal.y, sketchPlane.normal.z);
        const uAxis = new BABYLON.Vector3(sketchPlane.uAxis.x, sketchPlane.uAxis.y, sketchPlane.uAxis.z);
        const vAxis = new BABYLON.Vector3(sketchPlane.vAxis.x, sketchPlane.vAxis.y, sketchPlane.vAxis.z);
        
        // Create rotation matrix from plane coordinate system
        const rotationMatrix = BABYLON.Matrix.FromValues(
            uAxis.x, uAxis.y, uAxis.z, 0,
            vAxis.x, vAxis.y, vAxis.z, 0,
            normal.x, normal.y, normal.z, 0,
            0, 0, 0, 1
        );
        
        // Convert matrix to Euler angles for mesh rotation
        const rotation = rotationMatrix.toEulerAngles();
        mesh.rotation.x = rotation.x;
        mesh.rotation.y = rotation.y;
    
    // Apply sketch plane transformation using proper Babylon.js methods
    applySketchPlaneTransformation(transformNode, sketchPlane) {
        
        // CRITICAL: Use the SAME orientation logic as the plane selectors to ensure perfect alignment
        // This matches the positionPlanSelector logic from sketchPlanes.js
        
        if (sketchPlane.gridType === 'xy') {
            // XY plane - default orientation (facing forward)
            transformNode.rotation.x = 0;
            transformNode.rotation.y = 0;
            transformNode.rotation.z = 0;
            
        } else if (sketchPlane.gridType === 'yz') {
            // YZ plane - rotate to face YZ plane (same as plane selector)
            transformNode.rotation.x = 0;
            transformNode.rotation.y = Math.PI / 2; // Rotate to face YZ plane
            transformNode.rotation.z = 0;
            
        } else if (sketchPlane.gridType === 'xz') {
            // XZ plane - rotate to lie flat on XZ plane (same as plane selector)
            transformNode.rotation.x = Math.PI / 2; // Rotate to lie flat on XZ plane
            transformNode.rotation.y = 0;
            transformNode.rotation.z = 0;
        }
        
    }
    
    // Get the origin point for a sketch plane in world coordinates
    getSketchPlaneOrigin(sketchPlane) {
        // For orthographic planes, the origin is typically at (0,0,0) relative to the plane
        // but we need to account for the plane's position in 3D space
        
        if (sketchPlane.gridType === 'xy') {
            return new BABYLON.Vector3(0, 0, 0); // XY plane origin
        } else if (sketchPlane.gridType === 'yz') {
            return new BABYLON.Vector3(0, 0, 0); // YZ plane origin  
        } else if (sketchPlane.gridType === 'xz') {
            return new BABYLON.Vector3(0, 0, 0); // XZ plane origin
        }
        
        // Default to world origin
        return new BABYLON.Vector3(0, 0, 0);    }
      // SPANKY V44: EXACT PLANE MAPPING - Position transform node at the EXACT 3D location of the sketch plane
    positionTransformNodeOnSketchPlane(transformNode, localPos, sketchPlane) {
        
        // CRITICAL: Use the same positioning logic as the plane selectors to ensure objects appear
        // exactly where the user sees the sketch plane targets in 3D space
        const offset = 8; // Same offset as plane selectors
        const selectorCenter = 4 / 2; // Same selectorSize as plane selectors
        
        // Calculate the EXACT 3D base position where the sketch plane exists
        let planeOrigin = new BABYLON.Vector3(0, 0, 0);
        
        if (sketchPlane.gridType === 'xy') {
            // XY plane - positioned in front (positive Z)
            planeOrigin.x = -(offset + selectorCenter);
            planeOrigin.y = offset + selectorCenter;
            planeOrigin.z = 0.1;
            
        } else if (sketchPlane.gridType === 'yz') {
            // YZ plane - positioned to the right (positive X) 
            planeOrigin.x = 0.1;
            planeOrigin.y = offset + selectorCenter;
            planeOrigin.z = -(offset + selectorCenter);
            
        } else if (sketchPlane.gridType === 'xz') {
            // XZ plane - positioned above (positive Y)
            planeOrigin.x = offset + selectorCenter;
            planeOrigin.y = 0.1;
            planeOrigin.z = -(offset + selectorCenter);
        }
        
        // Transform the local 2D position to 3D using the plane's coordinate system
        // This maps sketch coordinates to the exact 3D plane location
        const transformedPos = new BABYLON.Vector3();
        
        if (sketchPlane.gridType === 'xy') {
            // XY plane: Local (u,v) maps to plane-relative (X,Y) with Z=0
            transformedPos.x = planeOrigin.x + localPos.x;
            transformedPos.y = planeOrigin.y + localPos.y; 
            transformedPos.z = planeOrigin.z; // On the plane surface
            
        } else if (sketchPlane.gridType === 'yz') {
            // YZ plane: Local (u,v) maps to plane-relative (Y,Z) with X=constant
            transformedPos.x = planeOrigin.x; // On the plane surface
            transformedPos.y = planeOrigin.y + localPos.x; // Local U → Plane Y
            transformedPos.z = planeOrigin.z + localPos.y; // Local V → Plane Z
            
        } else if (sketchPlane.gridType === 'xz') {
            // XZ plane: Local (u,v) maps to plane-relative (X,Z) with Y=constant
            transformedPos.x = planeOrigin.x + localPos.x; // Local U → Plane X
            transformedPos.y = planeOrigin.y; // On the plane surface
            transformedPos.z = planeOrigin.z + localPos.y; // Local V → Plane Z
        }
        
        // Apply the exact transformed position
        transformNode.position = transformedPos;
        
    }

    updateExtrudeButtonState() {
        const extrudeBtn = document.getElementById('extrude-btn');
        if (!extrudeBtn) return;
        
        // Enable extrude button only in 3D mode and when there's a selected 2D shape
        const canExtrude = this.currentMode === 'modeling' && 
                          this.selectedObjects.length === 1 && 
                          ['rectangle', 'circle'].includes(this.selectedObjects[0].type);
        
        extrudeBtn.disabled = !canExtrude;
        extrudeBtn.classList.toggle('disabled', !canExtrude);
        
        if (canExtrude) {
            extrudeBtn.title = 'Extrude selected 2D shape into 3D';
        } else if (this.currentMode !== 'modeling') {
            extrudeBtn.title = 'Switch to 3D Mode to extrude shapes';
        } else {
            extrudeBtn.title = 'Select a rectangle or circle to extrude';        }
        
    }
    
    // Initialize sketch planes system
    initializeSketchPlanes() {
        if (!this.grid || !this.grid.scene) {
            return;        }
        
        
        // Create sketch planes manager
        this.sketchPlanes = new SketchPlanesManager(this.grid.scene, this);        // Set up callback for plane selection
        this.onPlaneSelected = (plane) => {
            
            // Create persistent sketch plane object that will live in the scene
            const persistentSketchPlane = this.createPersistentSketchPlane(plane);
            this.currentSketchPlane = persistentSketchPlane;
            
            
            // Add sketch plane to project explorer as a selectable item
            if (this.projectExplorer) {
                const explorerSketch = this.projectExplorer.addSketchPlane(persistentSketchPlane);
            }
            
            // Now switch to sketch mode for drawing on the selected plane
            this.switchMode('sketch', { preserveSketchPlane: true });
            
            // Update grid to show only the selected plane's grid AFTER switching to sketch mode
            this.grid.setActiveSketchPlane(persistentSketchPlane);
              
            // IMPORTANT: Remove the plane selectors since we're now in sketch mode
            if (this.sketchPlanes) {
                this.sketchPlanes.removeAllPlaneSelectors();
            }
            
            // Configure camera for the specific plane
            this.alignCameraToPlane(persistentSketchPlane);
            
            // Force a 2D render to show the grid
            this.render2D();
        };
        
        // Initialize default origin planes
        this.sketchPlanes.initializeDefaultPlanes();
        
        // Hide plane selectors initially - they should only show when user clicks "New Project"
        this.sketchPlanes.hidePlaneSelectionPrompt();
        
    }
    
    initializeViewCube() {
        
        if (typeof ViewCube === 'undefined') {
            return;
        }
        
        if (!this.grid || !this.grid.scene) {
            return;
        }
        
        
        // Get the Babylon camera from grid
        const babylonCamera = this.grid.getBabylonCamera();
        if (!babylonCamera) {
            return;
        }
        
        
        // Create ViewCube instance
        try {
            this.viewCube = new ViewCube(this.grid.scene, babylonCamera, this.grid.babylonCanvas);
        } catch (error) {
            return;
        }
          // Create and position the ViewCube
        try {
            const cube = this.viewCube.createViewCube();
            
            if (cube) {
            }
        } catch (error) {
            return;
        }
        
        try {
            this.viewCube.positionInScreenCorner();
        } catch (error) {
        
        // Force a scene render to make sure everything is visible
            this.grid.scene.render();
        }
   }    // Project Explorer Methods
    initializeProjectExplorer() {
        
        // Get the project explorer container
        const explorerContainer = document.getElementById('project-explorer');
        
        if (!explorerContainer) {
            return;
        }
        
        
        // Initialize the clean HTML-based ProjectExplorer
        this.projectExplorer = new ProjectExplorer(explorerContainer, this);
        
        // Set up event handlers for project management
        this.projectExplorer.onProjectCreated = (projectName) => {
            this.handleProjectCreated(projectName);
        };
        
        this.projectExplorer.onProjectRenamed = (oldName, newName) => {
            this.handleProjectRenamed(oldName, newName);
        };
          this.projectExplorer.onSketchDoubleClick = (sketchName) => {
            this.handleSketchDoubleClick(sketchName);
        };
        
        // SPANKY V36: Add handler for sketch plane selection
        this.projectExplorer.onSketchPlaneSelected = (sketchPlaneId) => {
            this.handleSketchPlaneSelected(sketchPlaneId);
        };
    }
    
    handleProjectCreated(projectName) {
        
        // Ensure we're in modeling mode for new projects, but keep plane selectors visible
        this.switchMode('modeling', { keepPlaneSelectors: true });
        
        // Show plane selectors for new project - user needs to pick a sketch plane
        if (this.sketchPlanes) {
            this.sketchPlanes.showPlaneSelectionPrompt();
        }
    }
    
    handleProjectRenamed(oldName, newName) {
        // Add any additional logic needed when projects are renamed
    }
      handleSketchDoubleClick(sketchName) {
        
        // Switch to sketch mode and align with the sketch plane
        this.switchMode('sketch');
        
        // TODO: Align camera with the specific sketch plane
        // For now, just switch to orthographic mode
        if (this.camera) {
            this.camera.setOrthographicMode();        }
    }
    
    // SPANKY V36: Handle sketch plane selection from project explorer
    handleSketchPlaneSelected(sketchPlaneId) {
        
        // Find the persistent sketch plane
        const persistentPlane = this.persistentSketchPlanes?.find(plane => plane.id === sketchPlaneId);
        
        if (persistentPlane) {
            this.editSketchPlane(persistentPlane);
        } else {
        }
    }
    
    // Align camera to sketch plane (simplified for top view only)
    alignCameraToPlane(plane) {
        
        if (!this.camera) {
            return;
        }
        
        // Set standard top-down orthographic view for sketching
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.rotation = 0;
        this.camera.zoom = 30; // Good zoom level for sketching
        
        // Force a render to show the clean sketch view
        this.render2D();
    }    // Create a persistent sketch plane that lives in the scene as a parent transform
    createPersistentSketchPlane(planeInfo) {
        
        if (!this.grid || !this.grid.scene) {
            return null;
        }
        
        try {
            // Create a transform node that will be the parent for all shapes on this plane
            const planeTransform = new BABYLON.TransformNode(`SketchPlane_${Date.now()}`, this.grid.scene);
            
            // Get next sketch plane name
            const planeNumber = this.getNextSketchPlaneNumber();
            
            // Create the persistent sketch plane object
            const persistentPlane = {
                id: `sketch_plane_${Date.now()}`,
                name: `Sketch ${planeNumber}`,
                transformNode: planeTransform,
                gridType: planeInfo.gridType,
                normal: planeInfo.normal,
                uAxis: planeInfo.uAxis,
                vAxis: planeInfo.vAxis,
                children2D: [], // 2D shapes that can still be edited
                children3D: [], // 3D objects that were extruded from this plane
                isActive: false // Whether this plane is currently being edited
            };
            
            // Apply the plane's transformation to the transform node (with error handling)
            try {
                this.applySketchPlaneTransformation(planeTransform, persistentPlane);
            } catch (transformError) {
            }
            
            // Store reference to persistent plane
            if (!this.persistentSketchPlanes) {
                this.persistentSketchPlanes = [];
            }
            this.persistentSketchPlanes.push(persistentPlane);
            
            return persistentPlane;
            
        } catch (error) {
            return null;
        }
    }
    
    // Get next sketch plane number for naming
    getNextSketchPlaneNumber() {
        if (!this.sketchPlaneCounter) {
            this.sketchPlaneCounter = 0;
        }
        this.sketchPlaneCounter++;
        return this.sketchPlaneCounter;
    }
      // Switch to 2D editing mode on a specific persistent sketch plane
    editSketchPlane(persistentPlane) {
        
        // Set this as the current sketch plane
        this.currentSketchPlane = persistentPlane;
        
        // Mark this plane as active
        this.persistentSketchPlanes.forEach(plane => {
            plane.isActive = (plane.id === persistentPlane.id);
        });
        
        // IMPORTANT: Switch to sketch mode FIRST, before setting active plane
        this.switchMode('sketch', { preserveSketchPlane: true });
        
        // Then update grid to show this plane's coordinate system
        this.grid.setActiveSketchPlane(persistentPlane);
        
        // Align camera to this plane
        this.alignCameraToPlane(persistentPlane);
        
        // Filter objects to only show 2D shapes from this plane
        this.filterObjectsForSketchPlane(persistentPlane);
        
        // Force a 2D render to show the plane
        this.render2D();
        
    }
    
    // Filter objects to show only editable 2D shapes from the current sketch plane
    filterObjectsForSketchPlane(persistentPlane) {
        
        // Show only 2D shapes that belong to this plane and haven't been extruded
        this.objects = this.objects.filter(obj => {
            const belongsToPlane = obj.sketchPlane && obj.sketchPlane.id === persistentPlane.id;
            const isStill2D = !obj.isExtruded;
            return belongsToPlane && isStill2D;
        });
        
        // Add placeholder objects for extruded shapes (visual indicators)
        persistentPlane.children3D.forEach(extrudedObj => {
            const placeholder = {
                ...extrudedObj,
                isPlaceholder: true,
                isExtruded: true,
                type: extrudedObj.type + '_extruded',
                filled: false, // Show as outline only
                selectable: false // Cannot be selected for editing
            };
            this.objects.push(placeholder);
        });
        
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
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
