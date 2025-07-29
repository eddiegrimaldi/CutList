// CutList CAD - Main Application Entry Point  
// Cache-busting version: Updated manually when needed

// Cache version for manual cache-busting
const CACHE_VERSION = 'v20250627_017'; // Added rotation gizmo integration

import { CameraController } from './modules/camera.js?v20250627_017';
import { GridRenderer } from './modules/grid.js?v20250627_017';
import { DrawingEngine } from './modules/drawing.js?v20250627_017';
import { ToolManager } from './modules/tools.js?v20250627_017';
import { EventManager } from './modules/events.js?v20250627_017';
import { switchTo2D, switchTo3D, getCurrentCamera } from './modules/camera.js?v20250627_017';
import ExtrusionGizmo from './modules/extrusionGizmo.js?v20250627_023';
import RotationGizmo from './modules/rotationGizmo.js?v20250627_031';
import { SketchPlanesManager } from './modules/sketchPlanes.js?v20250627_017';
import { ViewCube } from './modules/viewCube.js?v20250627_017';
import { ProjectExplorer } from './modules/projectExplorer_clean.js?v20250627_017';
import { BottomToolbarController } from './modules/bottom-toolbar.js?v20250627_017';

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
                if (card.textContent.includes('New Project')) {
                    this.showPage('workspace');
                    // After workspace is initialized, create a new project and show plane selectors
                    setTimeout(() => {
                        this.handleProjectCreated('Untitled Project');
                    }, 100);
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
        VersionReporter.report('camera.js', 'v20250627_017', 'success');
        
        this.grid = new GridRenderer(this.ctx, this.camera);
        this.grid.currentMode = this.currentMode; 
        // Report grid.js version immediately after instantiation
        VersionReporter.report('grid.js', 'v20250627_017', 'success');
        
          this.drawing = new DrawingEngine(this.ctx, this.camera, this); // Pass app instance
        this.tools = new ToolManager(this);
        this.events = new EventManager(this);
        // Report module versions immediately after instantiation
        VersionReporter.report('drawing.js', 'v20250627_017', 'success');
        VersionReporter.report('tools.js', 'v20250627_017', 'success');
        VersionReporter.report('events.js', 'v20250627_017', 'success');
        
        // Initialize Project Explorer
        this.initializeProjectExplorer();

        // Initialize Bottom Toolbar
        this.bottomToolbar = new BottomToolbarController();
        VersionReporter.report('bottom-toolbar.js', 'v20250627_017', 'success');
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

        // OPUS FIX: Ensure grid visibility on workspace init with longer delay
        setTimeout(() => {
            if (this.currentMode === 'modeling' && this.grid && this.gridVisible) {

                // Force grid render
                this.grid.render(true);

                // Double-check grid mesh visibility
                if (this.grid.babylonGrid && this.grid.babylonGrid.gridMesh) {
                    this.grid.babylonGrid.gridMesh.isVisible = true;
                    this.grid.babylonGrid.gridMesh.setEnabled(true);
                }

                // Force scene render
                if (this.grid.scene) {
                    this.grid.scene.render();
                }
            }
        }, 200); // Slightly longer delay to ensure everything is initialized

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
                    this.grid.render(); // This ensures the Babylon canvas and scene are ready or created.
                    
                    // OPUS FIX: Force grid visibility check after render
                    if (this.gridVisible && this.grid) {

                        // Check if the grid mesh exists and is visible
                        if (this.grid.babylonGrid && this.grid.babylonGrid.gridMesh) {
                            const gridMesh = this.grid.babylonGrid.gridMesh;

                            // Force visibility
                            gridMesh.isVisible = true;
                            gridMesh.setEnabled(true);
                        }

                        // Force a scene render
                        if (this.grid.scene) {
                            this.grid.scene.render();
                        }
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

            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {                // DUAL PICKING STRATEGY: Try normal picking first, then enhanced picking for thin meshes
                let pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
                    // Ignore gizmo components - let the gizmo handle its own interactions
                    if (mesh.name && (mesh.name.includes("extrusionGizmo") || mesh.name.includes("gizmo"))) {
                        return false;
                    }
                    
                    // Allow plane selectors to be picked - PRIORITY PICKING
                    if (mesh.metadata && mesh.metadata.isPlaneSelector) {
                        return true;
                    }
                    
                    // Allow ViewCube to be picked - PRIORITY PICKING
                    if (mesh.metadata && mesh.metadata.isViewCube) {
                        return true;
                    }
                    
                    // Only pick meshes that are part of our active3DMeshes and are pickable
                    return mesh.isPickable && this.active3DMeshes[mesh.metadata?.originalObjectId] === mesh;
                });
                
                // If normal picking failed and we didn't hit priority targets, try enhanced picking for thin meshes
                if (!pickInfo.hit || !pickInfo.pickedMesh) {
                    
                    // Use pickWithRay for better thin mesh detection
                    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), scene.activeCamera);
                    pickInfo = scene.pickWithRay(ray, (mesh) => {
                        // Only try enhanced picking on our 3D meshes (not plane selectors or ViewCube)
                        return mesh.isPickable && this.active3DMeshes[mesh.metadata?.originalObjectId] === mesh;
                    }, false);
                    
                    // If that still fails, try multi-pick to catch any thin geometry
                    if (!pickInfo.hit) {
                        const multiPickResults = scene.multiPick(scene.pointerX, scene.pointerY, (mesh) => {
                            return mesh.isPickable && this.active3DMeshes[mesh.metadata?.originalObjectId] === mesh;
                        });
                        
                        if (multiPickResults && multiPickResults.length > 0) {
                            pickInfo = multiPickResults[0]; // Take the first valid hit
                        }
                    }
                }if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
                    const pickedMesh = pickInfo.pickedMesh;
                    
                    // DEBUG: Create small sphere at picked point for debugging
                    if (pickInfo.pickedPoint) {
                        const debugSphere = BABYLON.MeshBuilder.CreateSphere("debugPick", {
                            diameter: 0.2
                        }, this.grid.scene);
                        debugSphere.position = pickInfo.pickedPoint.clone();
                        debugSphere.material = new BABYLON.StandardMaterial("debugMat", this.grid.scene);
                        debugSphere.material.emissiveColor = new BABYLON.Color3(1, 0, 0); // Red sphere
                        
                        // Remove after 3 seconds
                        setTimeout(() => debugSphere.dispose(), 3000);
                        
                    }                    // Check if clicked on plane selector first
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
        
        
        // FACE-BASED EXTRUSION: Calculate extrusion normal based on clicked face
        if (clickInfo && clickInfo.hit && clickInfo.faceId !== undefined) {
            
            // Get the face normal in world space
            const faceNormal = this.getFaceNormalFromPickInfo(mesh3D, clickInfo);
            
            // Store the extrusion normal in mesh metadata
            if (mesh3D.metadata) {
                mesh3D.metadata.extrusionNormal = faceNormal;
                mesh3D.metadata.clickedFaceId = clickInfo.faceId;
                mesh3D.metadata.clickedPoint = clickInfo.pickedPoint.clone();
                mesh3D.metadata.originalCenter = mesh3D.position.clone(); // CRITICAL: Store original center
            }
        } else {
            // Use default normal from sketch plane if no face was clicked
            if (mesh3D.metadata && mesh3D.metadata.sketchPlane) {
                const sketchPlane = mesh3D.metadata.sketchPlane;
                mesh3D.metadata.extrusionNormal = new BABYLON.Vector3(
                    sketchPlane.normal.x, 
                    sketchPlane.normal.y, 
                    sketchPlane.normal.z
                );
                mesh3D.metadata.originalCenter = mesh3D.position.clone(); // CRITICAL: Store original center
            }
        }
        
        // Create and show the custom extrusion gizmo with click info
        this.extrusionGizmo = new ExtrusionGizmo(mesh3D, this.grid.scene, clickInfo);
        VersionReporter.report('extrusionGizmo.js', 'v20250630_003', 'success');
        
        // Subscribe to extrusion events
        this.extrusionGizmo.onExtrude.add((eventData) => {
            this.handleExtrusionUpdate(eventData);
        });
        
    }

    create3DMeshFrom2D(object) {
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
            // PROPER 3D GEOMETRY: Create minimal thickness for proper face detection but visually flat
            const MINIMUM_THICKNESS = 0.01; // ULTRA-THIN for truly flat appearance but still pickable
            
            switch (object.type) {
                case 'rectangle':
                    // Create proper thickness box with DOUBLESIDE orientation for face-based extrusion
                    mesh = BABYLON.MeshBuilder.CreateBox(`rect_${object.id}`, {
                        width: object.width,
                        height: object.height,
                        depth: MINIMUM_THICKNESS, // Proper 3D thickness for depth testing
                        updatable: true,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE // Ensure both sides are visible for face picking
                    }, this.grid.scene);
                    break;
                    
                case 'circle':
                    // Create proper thickness cylinder with DOUBLESIDE orientation for face-based extrusion
                    mesh = BABYLON.MeshBuilder.CreateCylinder(`circle_${object.id}`, {
                        diameter: object.radius * 2,
                        height: MINIMUM_THICKNESS, // Proper 3D thickness for depth testing
                        updatable: true,
                        sideOrientation: BABYLON.Mesh.DOUBLESIDE // Ensure both sides are visible for face picking
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
                
                // OPUS FIX: Enable edge rendering for better visibility using proper Babylon.js method
                if (this.grid && this.grid.scene) {
                    mesh.enableEdgesRendering();
                    mesh.edgesWidth = 16; // DOUBLE THICK borders for Master's ultimate visibility
                    mesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1); // Black edges
                }
                
                // OPUS'S CRITICAL FIX: Remove renderingGroupId to allow natural depth sorting
                // mesh.renderingGroupId = 1; // REMOVED - this forces shapes on top regardless of depth!
                
                // IMPORTANT: Ensure mesh is pickable and has proper normals for face-based extrusion
                mesh.isPickable = true;
                mesh.computeWorldMatrix(true); // Force computation of world matrix
                mesh.material.backFaceCulling = false; // Render both sides for thin meshes
                mesh.material.separateCullingPass = true; // Better transparency handling (Opus's fix)
                mesh.hasVertexAlpha = true; // Better transparency support (Opus's recommendation)
                
                // CRITICAL FIX: Force normals computation and enable pick precision for thin meshes
                mesh.createNormals(true); // Force normal calculation
                mesh.refreshBoundingInfo(); // Update bounding box for better picking
                mesh.setBoundingInfo(new BABYLON.BoundingInfo(mesh.getBoundingInfo().minimum, mesh.getBoundingInfo().maximum));
                
                // Store mesh reference
                this.active3DMeshes[object.id] = mesh;
                
                // FACE-BASED EXTRUSION: Store comprehensive metadata for any-face extrusion
                mesh.metadata = {
                    originalObject: object,
                    originalObjectId: object.id,
                    sketchPlane: sketchPlane,
                    originalPosition: mesh.position.clone(),
                    originalRotation: mesh.rotationQuaternion ? mesh.rotationQuaternion.clone() : null,
                    // Store the local coordinate system for face-based extrusion
                    localUp: new BABYLON.Vector3(0, 1, 0), // Local Y-axis (for box height)
                    localForward: new BABYLON.Vector3(0, 0, 1), // Local Z-axis (for box depth)
                    localRight: new BABYLON.Vector3(1, 0, 0), // Local X-axis (for box width)
                    // This will be populated when a face is clicked for extrusion
                    extrusionNormal: null,
                    clickedFaceId: null
                };
            } else {
            }
        } catch (error) {
            return null;
        }
        return mesh;
    }
    
    // OPUS SOLUTION: Clean extrusion mathematics with proper scaling and positioning
    handleExtrusionUpdate(eventData) {
        
        if (!this.extrudingObject || !this.active3DMeshes[this.extrudingObject.id]) {
            return;
        }

        const mesh = this.active3DMeshes[this.extrudingObject.id];
        const distance = eventData.distance;
        
        // Get current dimensions
        const baseThickness = 0.01;
        const currentHeight = this.extrudingObject.extrusionHeight || baseThickness;
        
        // SPANKY'S UNLIMITED EXTRUSION FIX: Remove artificial limitation
        const newHeight = currentHeight + distance; // Allow unlimited extrusion
        const effectiveHeight = Math.max(0.001, Math.abs(newHeight)); // Only prevent zero/negative dimensions
        
        
        // Get stored extrusion data
        const extrusionNormal = mesh.metadata?.extrusionNormal || new BABYLON.Vector3(0, 1, 0);
        const clickedFaceId = mesh.metadata?.clickedFaceId;
        const originalCenter = mesh.metadata?.originalCenter || mesh.position.clone();
        
        // Determine which axis to scale based on face normal
        const localNormal = BABYLON.Vector3.TransformNormal(
            extrusionNormal, 
            mesh.getWorldMatrix().invert()
        ).normalize();
        
        // Find dominant axis
        const absX = Math.abs(localNormal.x);
        const absY = Math.abs(localNormal.y);
        const absZ = Math.abs(localNormal.z);
        
        // Reset scaling to 1 first
        mesh.scaling.x = 1;
        mesh.scaling.y = 1;
        mesh.scaling.z = 1;
        
        // Apply scaling to the appropriate axis
        const scaleFactor = effectiveHeight / baseThickness; // Use effectiveHeight instead of newHeight
        
        if (absX > absY && absX > absZ) {
            mesh.scaling.x = scaleFactor;
        } else if (absY > absZ) {
            mesh.scaling.y = scaleFactor;
        } else {
            mesh.scaling.z = scaleFactor;
        }
        
        // Calculate position offset to keep clicked face stationary
        // The mesh grows from its center, so we need to offset by half the growth
        const growth = newHeight - baseThickness; // Keep using newHeight for offset calculation
        const offset = extrusionNormal.scale(growth / 2);

        // OPUS ROBUST SOLUTION: Determine offset direction by checking normal component sign
        let offsetDirection = 1;
        if (clickedFaceId !== undefined && mesh.metadata?.extrusionNormal) {
            // Get the sign of the normal component that matches the scaling axis
            if (absX > absY && absX > absZ) {
                // Scaling X axis - check X component of normal
                offsetDirection = Math.sign(extrusionNormal.x);
            } else if (absY > absZ) {
                // Scaling Y axis - check Y component of normal
                offsetDirection = Math.sign(extrusionNormal.y);
            } else {
                // Scaling Z axis - check Z component of normal
                offsetDirection = Math.sign(extrusionNormal.z);
            }
        }

        // Enhanced debug logging for offset calculation

        // Apply position offset
        mesh.position = originalCenter.add(offset.scale(offsetDirection));
        
        // Update gizmo position
        if (this.extrusionGizmo && eventData.isPreview) {
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
        
        // SPANKY'S UNLIMITED EXTRUSION: Only ensure absolute minimum to prevent zero dimensions
        if (Math.abs(newCumulativeHeight) < 0.001) {
            newCumulativeHeight = Math.sign(newCumulativeHeight) * 0.001; // Preserve direction
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
        VersionReporter.report('rotationGizmo.js', 'v20250627_031', 'success');
        
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
        // Use the actual origin of the sketch plane, not always (0,0,0)
        const origin = new BABYLON.Vector3(sketchPlane.origin.x, sketchPlane.origin.y, sketchPlane.origin.z);
        // This matrix transforms from sketch plane local coordinates (u, v, n) to world coordinates (x, y, z)
        const transform = {
            uAxis: uAxis,
            vAxis: vAxis,
            normal: normal,
            origin: origin
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
        mesh.rotation.z = rotation.z;
        
    }    // Apply sketch plane transformation using proper Babylon.js methods
    applySketchPlaneTransformation(transformNode, sketchPlane) {
        
        // For now, use a simplified approach based on the plane type
        // We'll enhance this later with proper matrix transformation
        const gridType = sketchPlane.gridType;
        
        if (gridType === 'xy') {
            // XY plane (Front view) - default orientation, no rotation needed
            transformNode.rotation.x = 0;
            transformNode.rotation.y = 0;
            transformNode.rotation.z = 0;
        } else if (gridType === 'yz') {
            // YZ plane (Right view) - rotate 90 degrees around Y axis
            transformNode.rotation.x = 0;
            transformNode.rotation.y = Math.PI / 2;
            transformNode.rotation.z = 0;
        } else if (gridType === 'xz') {
            // XZ plane (Top view) - rotate 90 degrees around X axis
            transformNode.rotation.x = Math.PI / 2;
            transformNode.rotation.y = 0;
            transformNode.rotation.z = 0;
        }
        
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
    
    updateRotateButtonState() {
        const rotateBtn = document.getElementById('rotate-btn');
        if (!rotateBtn) {
            return;
        }
        
        
        // Enable rotate button only in 3D mode and when there are 3D meshes available
        const canRotate = this.currentMode === 'modeling' && 
                         Object.keys(this.active3DMeshes).length > 0;
        
        
        // TEMP: Force enable for testing
        rotateBtn.disabled = false;
        rotateBtn.classList.remove('disabled');
        
        // Original logic
        // rotateBtn.disabled = !canRotate;
        // rotateBtn.classList.toggle('disabled', !canRotate);
        
        
        if (canRotate) {
            rotateBtn.title = 'Click to activate rotation tool, then click on 3D objects to rotate';
        } else if (this.currentMode !== 'modeling') {
            rotateBtn.title = 'Switch to 3D Mode to rotate objects';
        } else {
            rotateBtn.title = 'No 3D objects available for rotation';
        }
        
        
    }

    // OPUS SOLUTION: Robust face normal calculation using face indices
    getFaceNormalFromPickInfo(mesh, pickInfo) {
        if (!mesh || !pickInfo || !pickInfo.hit) {
            return new BABYLON.Vector3(0, 1, 0);
        }
        
        
        // For box meshes, use face ID to determine exact normal
        if (mesh.name.includes('rect_') && pickInfo.faceId !== undefined) {
            // Box faces in Babylon.js: 0-1 = front/back, 2-3 = right/left, 4-5 = top/bottom
            const faceId = pickInfo.faceId;
            const faceIndex = Math.floor(faceId / 2); // Each face has 2 triangles
            
            // Get local face normal based on face index
            let localNormal;
            switch (faceIndex) {
                case 0: localNormal = new BABYLON.Vector3(0, 0, -1); break; // Back
                case 1: localNormal = new BABYLON.Vector3(0, 0, 1); break;  // Front
                case 2: localNormal = new BABYLON.Vector3(1, 0, 0); break;  // Right
                case 3: localNormal = new BABYLON.Vector3(-1, 0, 0); break; // Left
                case 4: localNormal = new BABYLON.Vector3(0, 1, 0); break;  // Top
                case 5: localNormal = new BABYLON.Vector3(0, -1, 0); break; // Bottom
                default: localNormal = new BABYLON.Vector3(0, 1, 0);
            }
            
            // Transform local normal to world space
            const worldMatrix = mesh.getWorldMatrix();
            const worldNormal = BABYLON.Vector3.TransformNormal(localNormal, worldMatrix);
            worldNormal.normalize();
            
            
            // OPUS DEBUG: Add visual debug marker for face normal
            if (pickInfo.pickedPoint && this.grid && this.grid.scene) {
                const debugArrow = BABYLON.MeshBuilder.CreateLines("debugNormal", {
                    points: [
                        pickInfo.pickedPoint,
                        pickInfo.pickedPoint.add(worldNormal.scale(2))
                    ]
                }, this.grid.scene);
                debugArrow.color = new BABYLON.Color3(0, 1, 0); // Green arrow
                
                // Remove after 5 seconds
                setTimeout(() => {
                    if (debugArrow && !debugArrow.isDisposed()) {
                        debugArrow.dispose();
                    }
                }, 5000);
                
            }
            
            return worldNormal;
        }
        
        // For cylinders, use radial calculation
        if (mesh.name.includes('circle_') && pickInfo.pickedPoint) {
            const meshCenter = mesh.getAbsolutePosition();
            const clickPoint = pickInfo.pickedPoint;
            
            // Get cylinder's local Y-axis (height direction) in world space
            const cylinderUp = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 1, 0), mesh.getWorldMatrix());
            cylinderUp.normalize();
            
            // Project click point onto cylinder's base plane
            const toClick = clickPoint.subtract(meshCenter);
            const heightProjection = BABYLON.Vector3.Dot(toClick, cylinderUp);
            const projectedPoint = clickPoint.subtract(cylinderUp.scale(heightProjection));
            
            // Calculate radial direction
            const radialDirection = projectedPoint.subtract(meshCenter);
            
            // Check if we clicked on top/bottom cap
            const radialDistance = radialDirection.length();
            const cylinderRadius = mesh.getBoundingInfo().boundingBox.extendSize.x;
            
            if (radialDistance < cylinderRadius * 0.8) {
                // Clicked on cap - return cylinder up/down based on height
                return heightProjection > 0 ? cylinderUp : cylinderUp.negate();
            } else {
                // Clicked on side - return radial normal
                radialDirection.normalize();
                return radialDirection;
            }
        }
        
        // Fallback: Use sketch plane normal
        if (mesh.metadata && mesh.metadata.sketchPlane) {
            const normal = new BABYLON.Vector3(
                mesh.metadata.sketchPlane.normal.x,
                mesh.metadata.sketchPlane.normal.y,
                mesh.metadata.sketchPlane.normal.z
            );
            return normal;
        }
        
        return new BABYLON.Vector3(0, 1, 0);
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
        VersionReporter.report('projectExplorer_clean.js', 'v20250627_017', 'success');
        
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
    // SPANKY'S FIX: Initialize VersionReporter FIRST before creating CutListCAD
    VersionReporter.init();
    
    // Report main.js version with enhanced detection
    const mainVersion = VersionReporter.getVersionFromQueryString();
    VersionReporter.report('main.js', mainVersion, 'success');
    
    // Report cache version
    VersionReporter.report('Cache Version', CACHE_VERSION, 'success');
    
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
