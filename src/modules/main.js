// CutList CAD - Main Application Entry Point
// Cache-busting version: cache_bust_v5

import { CameraController, switchTo2D, switchTo3D, getCurrentCamera } from 'camera';
import { GridRenderer } from 'grid';
import { DrawingEngine } from 'drawing';
import { ToolManager } from 'tools';
import { EventManager } from 'events';
import ExtrusionGizmo from 'extrusionGizmo';
import { SketchPlanesManager } from 'sketchPlanes';
import { ViewCube } from 'viewCube';
import { ProjectExplorer } from 'projectExplorer';

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
        this.sketchPlanes = null;  // Sketch planes manager
        this.viewCube = null;      // ViewCube navigation widget
        this.projectExplorer = null; // Project management system
        
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
      // New function to handle all UI updates when switching modes
    updateUIForMode(mode) {

        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update status bar
        const currentModeEl = document.getElementById('current-mode');
        if (currentModeEl) {
            currentModeEl.textContent = mode === 'modeling' ? '3D Modeling' : '2D Sketch';
        }

        // Enable/disable extrude button
        const extrudeBtn = document.getElementById('extrude-btn');
        if (extrudeBtn) {
            // Disable extrude button on any mode switch. It will be enabled elsewhere when a valid selection is made.
            extrudeBtn.disabled = true;
        }
    }

    // Method to switch between 2D sketch and 3D modeling modes
    switchMode(mode) { // REMOVED ASYNC
        this.mode = mode;
        this.updateUIForMode(mode);

        if (this.mode === 'modeling') {
            if (this.grid) {
                this.grid.setMode('modeling'); // Explicitly set the grid's mode
                this.grid.render();      // REMOVED AWAIT - now synchronous
            } else {
            }
        } else { // Switching to sketch mode
            if (this.grid && this.grid.engine) { // Check if engine exists
                this.grid.engine.stopRenderLoop();
            }
            if (this.grid) {
                this.grid.setMode('sketch');
                this.grid.render(); // 2D render is synchronous
            }
            // No need to re-initialize the 2D context, just show the canvas
            this.canvas.style.display = 'block';
            if (this.grid.babylonCanvas) {
                this.grid.babylonCanvas.style.display = 'none';
            }
            this.render2D(); // Initial render for 2D mode
        }
    }

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
        
    }
    
    create3DMeshFrom2D(object) {
        
        if (!this.grid || !this.grid.scene) {
            return null;
        }
        
        let mesh = null;
          try {
            switch (object.type) {
                case 'rectangle':
                    // CAD Standard: X=side-to-side, Y=front/back, Z=up/down
                    mesh = BABYLON.MeshBuilder.CreateBox(`rect_${object.id}`, {
                        width: object.width,   // 2D width becomes 3D width (X dimension)
                        depth: object.height,  // 2D height becomes 3D depth (Y dimension)  
                        height: 1.0,          // Z dimension (extrusion/vertical direction)
                        updatable: true       // Make mesh updatable for real-time scaling
                    // CAD Standard: X=side-to-side, Y=front/back, Z=up/down
                    mesh.position.x = object.x + object.width / 2;   // X stays X (side to side)
                    mesh.position.z = object.y + object.height / 2;  // Z for depth (was Y - this was the mismatch!)
                    mesh.position.y = 0.5; // Y for height - center the mesh vertically
                    break;
                
                case 'circle':
                    // Create a cylinder from circle with reasonable initial height
                    mesh = BABYLON.MeshBuilder.CreateCylinder(`circle_${object.id}`, {
                        diameter: object.radius * 2,
                        height: 1.0, // Start with 1 unit height instead of 0.1
                        updatable: true // Make mesh updatable for real-time scaling
                    // Position at circle center using proper CAD coordinates
                    // CAD Standard: X=side-to-side, Y=front/back, Z=up/down
                    mesh.position.x = object.center.x;               // X stays X (side to side)
                    mesh.position.z = object.center.y;               // Z for depth (consistency fix!)
                    mesh.position.y = 0.5; // Y for height - center the mesh vertically
                    // No rotation needed - cylinder should stand upright by default
                    break;
                
            default:
                return null;
            }
        } catch (error) {
            return null;
        }
        
        if (mesh) {
            // Create material for the mesh
            const material = new BABYLON.StandardMaterial(`mat_${object.id}`, this.grid.scene);
            material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.9); // Light blue
            material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            mesh.material = material;
            
            // Store mesh reference
            this.active3DMeshes[object.id] = mesh;
              // Add metadata to link back to 2D object
            mesh.metadata = {
                originalObject: object,
                originalObjectId: object.id,
                extrusionNormal: BABYLON.Vector3.Up() // Default extrusion direction
            };
            
        } else {
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
        
        switch (this.extrudingObject.type) {            case 'rectangle':
                
                // Recreate box with EXACT same parameter order as original
                newMesh = BABYLON.MeshBuilder.CreateBox(meshName, {
                    width: this.extrudingObject.width,   // X dimension - same order as original
                    depth: this.extrudingObject.height,  // Z dimension - same order as original  
                    height: newHeight,                   // Y dimension - same order as original
                    updatable: true
                }, this.grid.scene);
                    // Position using the same logic as original creation for consistency
                const calcX = this.extrudingObject.x + this.extrudingObject.width / 2;
                const calcZ = -(this.extrudingObject.y + this.extrudingObject.height / 2); // Flip Z to match grid.js coordinate fix
                const calcY = newHeight / 2;
                
                // Position using the STORED original position (not recalculated)
                newMesh.position.x = originalXPos;   // Use exact original X position
                newMesh.position.z = originalZPos;   // Use exact original Z position  
                newMesh.position.y = calcY;          // Only Y changes for height
                
                break;
                
            case 'circle':
                // Recreate cylinder with new height
                newMesh = BABYLON.MeshBuilder.CreateCylinder(meshName, {
                    diameter: this.extrudingObject.radius * 2,
                    height: newHeight,
                    updatable: true
                }, this.grid.scene);
                  // Position using the same logic as original creation for consistency
                newMesh.position.x = this.extrudingObject.center.x;    // Same as original
                newMesh.position.z = -this.extrudingObject.center.y;   // Flip Z to match grid.js coordinate fix  
                newMesh.position.y = newHeight / 2;  // Y for height in Babylon
                break;
        }
        
        if (newMesh) {
            // Restore material and metadata
            newMesh.material = meshMaterial;
            newMesh.metadata = meshMetadata;
            
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
            this.extrusionGizmo.dispose();
            this.extrusionGizmo = null;
        }
        this.isExtruding = false;
        this.extrudingObject = null;
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
            return;
        }
        
        
        // Create sketch planes manager
        this.sketchPlanes = new SketchPlanesManager(this.grid.scene, this);
          // Set up callback for plane selection
        this.onPlaneSelected = (plane) => {
            this.currentSketchPlane = plane;
            
            // Switch to sketch mode on the selected plane
            this.switchMode('sketch');
            
            // Configure camera for the specific plane
            this.alignCameraToPlane(plane);
        };
          // Initialize default origin planes
        this.sketchPlanes.initializeDefaultPlanes();
        
        // Hide plane selectors initially - they should only show when user clicks "New Project"
        this.sketchPlanes.hidePlaneSelectionPrompt();
        
    }initializeViewCube() {
        
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
        
    }    handleProjectCreated(projectName) {
        
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
            this.camera.setOrthographicMode();
        }
    }    // Align camera to sketch plane (simplified for top view only)
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
    }
}

// SPANKY V38: Wait for the DOM to be fully loaded AND for the GreasedLine script to be ready.
// This is the most robust way to ensure all scripts are available before the app starts.
window.addEventListener('DOMContentLoaded', () => {

    // Function to start the application
    const startApp = () => {
        window.cutlistCAD = new CutListCAD();
        // Make showPage function available globally for HTML onclick handlers
        window.showPage = (pageId) => window.cutlistCAD.showPage(pageId);
    };

    // Check if GreasedLine is already there (it should be, as it's not a module)
    if (window.BABYLON && window.BABYLON.GreasedLineBuilder) {
        startApp();
    } else {
        // If not, it might still be loading. Poll for a short time.
        let attempts = 0;
        const maxAttempts = 50; // Poll for up to 2.5 seconds
        const pollInterval = 50; // Check every 50ms

        const pollForLibrary = setInterval(() => {
            attempts++;
            if (window.BABYLON && window.BABYLON.GreasedLineBuilder) {
                clearInterval(pollForLibrary);
                startApp();
            } else if (attempts >= maxAttempts) {
                clearInterval(pollForLibrary);
                // Optionally, show an error message to the user on the page
                const body = document.querySelector('body');
                if (body) {
                    body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Error: A required 3D library failed to load. Please check your internet connection and try refreshing the page.</h1>';
                }
            }
        }, pollInterval);
    }
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
        }
    } else {
    }
}
