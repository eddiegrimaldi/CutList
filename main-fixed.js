// CutList - Fixed Version with All Working Features + Sketching

class CutListApp {
    constructor() {
        
        // Application state
        this.currentMode = 'sketch'; // Start in sketch mode
        this.currentTool = 'select';
        this.gridVisible = true;
        
        // Drawing state
        this.drawnObjects = [];
        this.selectedObjects = [];
          // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.grid = null;
        this.dynamicGrid = null; // New dynamic grid system        this.raycaster = null;
        this.mouse = new THREE.Vector2();
          // Input state tracking
        this.isCtrlPressed = false;
        this.isMouseDown = false;
        this.isRightMouseDown = false;
        this.isMiddleMouseDown = false;
        this.isPanning = false;
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Face manipulation state
        this.isDraggingGizmo = false;
        this.selectedGizmo = null;
        this.dragStartPosition = { x: 0, y: 0 };
        this.lastExtrusionAmount = 0;
        this.originalGizmoPosition = new THREE.Vector3();
        this.dragStartPoint = new THREE.Vector3();        // 2D Drawing state
        this.isDrawing = false;
        this.drawingStartPoint = null;
        this.tempDrawingObject = null;
        this.currentSketchPlane = null;        // Blueprint-style dimension lines
        this.persistentDimensionLines = [];
        this.tempDimensionLines = [];
        
        // Line width management for consistent pixel appearance
        this.baseLineWidth = 0.15; // Base line width for shapes
        this.baseDimensionLineWidth = 0.05; // Base line width for dimensions
        
        // Mode-specific objects
        this.sketchObjects = [];
        this.modelingObjects = [];
        
        // Rulers and crosshairs state
        this.rulersVisible = true;
        this.crosshairsVisible = true;
        
        // Handle interaction state for shape resizing
        this.isDraggingHandle = false;
        this.selectedHandle = null;
        this.selectedShape = null;
        this.handleStartPosition = new THREE.Vector2();
        this.shapeStartBounds = null;
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.initThreeJS();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        
        // Mode switching
        document.getElementById('sketch-mode')?.addEventListener('click', () => {
            this.switchMode('sketch');
        });

        document.getElementById('modeling-mode')?.addEventListener('click', () => {
            this.switchMode('modeling');
        });

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.dataset.tool;
                if (tool) this.selectTool(tool);
            });
        });

        // Extrude button
        document.getElementById('extrude-btn')?.addEventListener('click', () => {
            this.extrudeSelected();
        });

        // Clear canvas
        document.getElementById('clear-btn')?.addEventListener('click', () => {
            this.clearCanvas();
        });

        // Reset camera
        document.getElementById('reset-camera')?.addEventListener('click', () => {
            this.resetCamera();
        });
        
        // Restore rulers and crosshair buttons
        const rulersBtn = document.querySelector('button[onclick*="Rulers"]');
        if (rulersBtn) {
            rulersBtn.onclick = () => this.toggleRulers();
            rulersBtn.textContent = 'Rulers';
        }
        
        const crosshairsBtn = document.querySelector('button[onclick*="Crosshairs"]');
        if (crosshairsBtn) {
            crosshairsBtn.onclick = () => this.toggleCrosshairs();
            crosshairsBtn.textContent = 'Crosshairs';
        }
    }

    /**
     * Initialize Three.js
     */
    initThreeJS() {
        
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            return;
        }

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);

        // Camera setup for sketch mode initially
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 600;
        this.setupCamera(width, height);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Raycaster
        this.raycaster = new THREE.Raycaster();        // Setup controls
        this.setupControls();

        // Create dynamic grid system
        this.createDynamicGrid();

        // Setup lighting
        this.setupLighting();

        // Setup gizmo interactions
        this.setupGizmoInteractions();

        // Start in sketch mode
        this.switchMode('sketch');

        // Start render loop
        this.animate();

    }    /**
     * Setup camera for current mode
     */
    setupCamera(width, height) {
        const aspect = width / height;
          if (this.currentMode === 'sketch') {
            // Orthographic camera for 2D sketch mode - looking down at XZ plane
            // Set camera size to show a good working area (about 2-3 feet on each side)
            const size = 20; // Increased from 10 to 20 for better view
            this.camera = new THREE.OrthographicCamera(
                -size * aspect, size * aspect,
                size, -size,
                0.1, 1000
            );            // Position camera above the XZ plane looking down
            // Set distance to show 1/4" grid by default (between 8-25 range)
            this.camera.position.set(0, 15, 0); // Changed from 10 to 15 for 1/4" grid
            this.camera.zoom = 1.9; // Set initial zoom to give 18" height
            this.camera.updateProjectionMatrix();
            this.camera.lookAt(0, 0, 0); // Look at origin on XZ plane
        } else {
            // Perspective camera for 3D modeling mode
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
            this.camera.position.set(5, 5, 5);
            this.camera.lookAt(0, 0, 0);
        }
    }

    /**
     * Setup basic camera controls with RIGHT-CLICK MODE SWITCHING
     */    setupControls() {        
        const canvas = this.renderer.domElement;
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                if (e.ctrlKey) {
                    // Ctrl+Left mouse = panning
                    this.isPanning = true;
                    this.isMouseDown = true;
                    canvas.style.cursor = 'grab';
                } else {
                    // Normal left click
                    this.isMouseDown = true;
                    this.handleLeftMouseDown(e);
                }
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            } else if (e.button === 1) { // Middle mouse button - panning
                this.isMiddleMouseDown = true;
                this.isPanning = true;
                this.isMouseDown = true;
                canvas.style.cursor = 'grab';
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
                e.preventDefault();
            } else if (e.button === 2) { // Right mouse button
                this.isRightMouseDown = true;
                this.isMouseDown = true;
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
                
                // RESTORE RIGHT-CLICK MODE SWITCHING
                if (this.currentMode === 'sketch') {
                    this.switchMode('modeling');
                }
                
                e.preventDefault();
            }
        });        // Mouse up handler
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                if (!this.isPanning) {
                    this.handleLeftMouseUp(e);
                }
                this.isMouseDown = false;
                this.isPanning = false;
                // Reset cursor
                this.updateCursor();
            } else if (e.button === 1) { // Middle mouse button
                this.isMiddleMouseDown = false;
                this.isPanning = false;
                this.isMouseDown = false;
                // Reset cursor
                this.updateCursor();
            } else if (e.button === 2) {
                this.isRightMouseDown = false;
                this.isMouseDown = false;
            }
        });        // Mouse move handler
        canvas.addEventListener('mousemove', (e) => {
            // Update mouse coordinates for UI
            this.updateMouseCoordinates(e);
            
            if (!this.isMouseDown) return;
              const deltaX = e.clientX - this.mouseX;
            const deltaY = e.clientY - this.mouseY;              if (this.isPanning) {
                // Panning in both sketch and modeling modes
                canvas.style.cursor = 'grabbing'; // Show dragging cursor during pan
                this.panCamera(deltaX, deltaY);
            } else if (this.isRightMouseDown && this.currentMode === 'modeling') {
                // 3D camera rotation
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaX * 0.01;
                spherical.phi += deltaY * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);
                
                // Update line widths when camera moves
                this.updateAllLineWidths();
            } else if (this.isMouseDown && this.currentMode === 'sketch') {
                // Handle 2D drawing or selection
                this.handleSketchMouseMove(e);
            }
            
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });// Wheel handler
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 1.1 : 0.9;            if (this.camera.isOrthographicCamera) {
                this.camera.zoom *= scale;
                this.camera.updateProjectionMatrix();
            } else {
                this.camera.position.multiplyScalar(scale);
            }
            
            // Update line widths when zoom changes
            this.updateAllLineWidths();
            
            // Update dynamic grid immediately when zoom changes
            if (this.dynamicGrid) {
                this.dynamicGrid.forceUpdate();
            }
            
            // Update camera height display after zoom
            this.updateCameraHeightDisplay();
        });

        // Disable context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
          // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
          // Keyboard shortcuts for panning
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control' && !this.isCtrlPressed) {
                this.isCtrlPressed = true;
                this.updateCursor();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                this.isCtrlPressed = false;
                this.updateCursor();
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            // Space toggles between sketch and modeling modes
            this.switchMode(this.currentMode === 'sketch' ? 'modeling' : 'sketch');
        } else if (e.code === 'KeyG') {
            e.preventDefault();
            this.toggleGrid();
        } else if (e.code === 'KeyR') {
            e.preventDefault();
            this.selectTool('rectangle');
        } else if (e.code === 'KeyL') {
            e.preventDefault();
            this.selectTool('line');
        } else if (e.code === 'KeyC') {
            e.preventDefault();
            this.selectTool('circle');
        } else if (e.code === 'KeyS') {
            e.preventDefault();
            this.selectTool('select');
        } else if (e.code === 'Escape') {
            e.preventDefault();
            this.cancelCurrentOperation();
        }
    }    /**
     * Handle left mouse down
     */
    handleLeftMouseDown(e) {
        // Don't override mouse coordinates here - let individual handlers compute them properly
        if (this.currentMode === 'sketch') {
            this.handleSketchMouseDown(e);
        } else {
            this.handleModelingMouseDown(e);
        }
    }

    /**
     * Handle left mouse up
     */
    handleLeftMouseUp(e) {
        if (this.currentMode === 'sketch') {
            this.handleSketchMouseUp(e);
        } else {
            this.handleModelingMouseUp(e);
        }
    }    /**
     * Handle sketch mode mouse down
     */
    handleSketchMouseDown(e) {
        // Always check for handle interaction first
        if (this.checkHandleInteraction(e)) {
            // If a handle was clicked, do NOT start a new drawing
            return;
        }
        // If select tool is active or no drawing tool is active, allow selection
        if (this.currentTool === 'select' || !['line', 'rectangle', 'circle'].includes(this.currentTool)) {
            this.selectObjectAt(e);
            return;
        }
        // Only start drawing if not interacting with a handle
        if (['line', 'rectangle', 'circle'].includes(this.currentTool)) {
            this.startDrawing(e);
        }
    }    /**
     * Handle sketch mode mouse up
     */
    handleSketchMouseUp(e) {
        // Handle resize handle release
        if (this.isDraggingHandle) {
            this.finishHandleDrag();
            return;
        }
        
        if (this.isDrawing) {
            this.finishDrawing(e);
        }
    }/**
     * Handle sketch mode mouse move
     */
    handleSketchMouseMove(e) {
        // Handle resize handle dragging
        if (this.isDraggingHandle) {
            this.updateHandleDrag(e);
            return;
        }
        // Enhanced: Always allow handle hover and interaction, regardless of tool
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(mouse, this.camera);
        let handleHovered = false;
        for (const obj of this.drawnObjects) {
            if (obj.userData.selectionVisuals) {
                const handles = [];
                obj.userData.selectionVisuals.traverse((child) => {
                    if (child.userData.isResizeHandle) {
                        handles.push(child);
                    }
                });
                if (handles.length > 0) {
                    const intersects = this.raycaster.intersectObjects(handles, false);
                    if (intersects.length > 0) {
                        this.renderer.domElement.style.cursor = this.getHandleCursor(intersects[0].object.userData.handleType);
                        handleHovered = true;
                        break;
                    }
                }
            }
        }
        if (!handleHovered && !this.isDraggingHandle) {
            this.renderer.domElement.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair';
        }
        if (this.isDrawing) {
            this.updateDrawingPreview(e);
        }
    }

    /**
     * Handle modeling mode mouse down
     */
    handleModelingMouseDown(e) {
        // Check for gizmo interaction first
        const intersect = this.getGizmoIntersection(e);
        if (intersect && intersect.object.userData.isFaceGizmo) {
            this.handleGizmoMouseDown(e);
            return;
        }
        
        // Otherwise handle object selection
        this.selectObjectAt(e);
    }

    /**
     * Handle modeling mode mouse up
     */
    handleModelingMouseUp(e) {
        this.handleGizmoMouseUp(e);
    }    /**
     * Start drawing in sketch mode
     */
    startDrawing(e) {
        this.isDrawing = true;
          // Clear any existing persistent dimension lines when starting a new rectangle
        if (this.currentTool === 'rectangle') {
            this.clearPersistentDimensionLines();
        }
          // Get world coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Convert to world space
        const vector = new THREE.Vector3(x, y, 0);
        vector.unproject(this.camera);
        
        // Apply grid snapping
        const snappedPoint = this.snapToGrid(vector.x, vector.z); // Use Z instead of Y for XZ plane        
        this.drawingStartPoint = snappedPoint;
        
        // Create temporary drawing object for preview
        this.createTempDrawingObject();
    }    /**
     * Calculate line width that maintains consistent pixel appearance
     */
    getScaledLineWidth(baseWidth) {
        if (!this.camera) return baseWidth;
        
        if (this.camera.isOrthographicCamera) {
            // For orthographic camera, scale inversely with zoom
            // Higher zoom = closer view = need thinner lines
            const scale = 1 / Math.max(this.camera.zoom, 0.1);
            return baseWidth * scale;
        } else {
            // For perspective camera, scale with distance from origin
            const distance = this.camera.position.length();
            const scale = distance / 10; // Normalize to distance of 10 units
            return baseWidth * Math.max(scale, 0.1);
        }
    }

    /**
     * Update all line widths when camera changes
     */
    updateAllLineWidths() {
        // Update drawn objects (rectangles, lines, circles)
        this.drawnObjects.forEach(obj => {
            if (obj.userData.is2D) {
                this.updateObjectLineWidth(obj);
            }
        });
        
        // Update dimension lines
        this.persistentDimensionLines.forEach(group => {
            this.updateDimensionLineWidth(group);
        });
        
        this.tempDimensionLines.forEach(group => {
            this.updateDimensionLineWidth(group);
        });
    }

    /**
     * Update line width for a drawn object
     */
    updateObjectLineWidth(obj) {
        if (!obj || !obj.children) return;
        
        const newWidth = this.getScaledLineWidth(this.baseLineWidth);
        
        obj.traverse((child) => {
            if (child.geometry && (child.geometry.type === 'CylinderGeometry' || child.geometry.type === 'SphereGeometry')) {
                // Update cylinder radius for lines or sphere radius for connectors
                const oldGeometry = child.geometry;
                let newGeometry;
                
                if (child.geometry.type === 'CylinderGeometry') {
                    const params = child.geometry.parameters;
                    newGeometry = new THREE.CylinderGeometry(
                        newWidth / 2, 
                        newWidth / 2, 
                        params.height, 
                        params.radialSegments
                    );
                } else if (child.geometry.type === 'SphereGeometry') {
                    const params = child.geometry.parameters;
                    newGeometry = new THREE.SphereGeometry(
                        newWidth / 2, 
                        params.widthSegments, 
                        params.heightSegments
                    );
                }
                
                if (newGeometry) {
                    child.geometry = newGeometry;
                    oldGeometry.dispose();
                }
            }
        });
    }

    /**
     * Update line width for dimension lines
     */
    updateDimensionLineWidth(group) {
        if (!group || !group.children) return;
        
        const newWidth = this.getScaledLineWidth(this.baseDimensionLineWidth);
        
        group.traverse((child) => {
            if (child.geometry) {
                if (child.geometry.type === 'CylinderGeometry') {
                    // Update dimension line width
                    const params = child.geometry.parameters;
                    const oldGeometry = child.geometry;
                    const newGeometry = new THREE.CylinderGeometry(
                        newWidth / 2, 
                        newWidth / 2, 
                        params.height, 
                        params.radialSegments
                    );
                    child.geometry = newGeometry;
                    oldGeometry.dispose();
                } else if (child.geometry.type === 'ConeGeometry') {
                    // Update arrow head size
                    const scaledArrowSize = this.getScaledLineWidth(0.15);
                    const oldGeometry = child.geometry;
                    const newGeometry = new THREE.ConeGeometry(
                        scaledArrowSize / 3, 
                        scaledArrowSize, 
                        6
                    );
                    child.geometry = newGeometry;
                    oldGeometry.dispose();
                }
            }
        });
    }
    snapToGrid(x, y) {
        if (this.dynamicGrid) {
            return this.dynamicGrid.snapToGrid(x, y);
        }
        
        // Fallback to 12" grid if dynamic grid not available
        const gridSize = 12;
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    }    /**
     * Create temporary drawing object for preview
     */
    createTempDrawingObject() {
        if (this.tempDrawingObject) {
            this.scene.remove(this.tempDrawingObject);
        }
        
        // Use black color for preview lines
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,  // Black
            transparent: false,
            opacity: 1.0
        });
        
        // We'll create the actual thick geometry in updatePreviewGeometry
        this.tempDrawingObject = new THREE.Group(); // Use group to hold multiple thick line segments
        this.tempDrawingObject.renderOrder = 1000;
        this.scene.add(this.tempDrawingObject);
    }/**
     * Update drawing preview
     */
    updateDrawingPreview(e) {
        if (!this.isDrawing || !this.tempDrawingObject) return;
        
        // Get current mouse world coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        const vector = new THREE.Vector3(x, y, 0);
        vector.unproject(this.camera);
          
        // Apply grid snapping- use Z coordinate for XZ plane
        const currentPoint = this.snapToGrid(vector.x, vector.z);
        
        // Update preview based on tool
        this.updatePreviewGeometry(this.drawingStartPoint, currentPoint);
    }    /**
     * Update preview geometry based on tool
     */
    updatePreviewGeometry(start, end) {
        // Clear previous preview geometry
        while (this.tempDrawingObject.children.length > 0) {
            const child = this.tempDrawingObject.children[0];
            this.tempDrawingObject.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
        
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,  // Black
            transparent: false,
            opacity: 1.0
        });
        
        const lineWidth = this.getScaledLineWidth(0.2); // Use scaled line width
          switch (this.currentTool) {
            case 'line':
                this.createThickLine(start.x, 0, start.y, end.x, 0, end.y, lineWidth, material);
                // Add end caps for clean line ends
                this.createPreviewCornerConnector(start.x, 0, start.y, lineWidth, material); // Start point
                this.createPreviewCornerConnector(end.x, 0, end.y, lineWidth, material);     // End point
                break;            case 'rectangle':
                // Create 4 thick lines for rectangle
                this.createThickLine(start.x, 0, start.y, end.x, 0, start.y, lineWidth, material); // Top
                this.createThickLine(end.x, 0, start.y, end.x, 0, end.y, lineWidth, material);   // Right
                this.createThickLine(end.x, 0, end.y, start.x, 0, end.y, lineWidth, material);   // Bottom
                this.createThickLine(start.x, 0, end.y, start.x, 0, start.y, lineWidth, material); // Left
                  // Add corner connectors for clean joints in preview
                this.createPreviewCornerConnector(start.x, 0, start.y, lineWidth, material); // Top-left
                this.createPreviewCornerConnector(end.x, 0, start.y, lineWidth, material);   // Top-right
                this.createPreviewCornerConnector(end.x, 0, end.y, lineWidth, material);     // Bottom-right
                this.createPreviewCornerConnector(start.x, 0, end.y, lineWidth, material);   // Bottom-left
                
                // Add blueprint-style dimension lines
                this.createBlueprintDimensionLines(start, end);
                break;
                
            case 'circle':
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                this.createThickCircle(start.x, 0, start.y, radius, lineWidth, material);
                break;
        }
    }
    
    /**
     * Create a thick line using cylinder geometry
     */
    createThickLine(x1, y1, z1, x2, y2, z2, width, material) {
        const start = new THREE.Vector3(x1, y1, z1);
        const end = new THREE.Vector3(x2, y2, z2);
        const length = start.distanceTo(end);
        
        if (length < 0.001) return; // Skip very short lines
        
        const geometry = new THREE.CylinderGeometry(width / 2, width / 2, length, 8);
        const cylinder = new THREE.Mesh(geometry, material);
        
        // Position and orient the cylinder
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        
        // Orient cylinder to point from start to end
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(direction.dot(up)) > 0.99) {
            // Line is vertical, use different up vector
            up.set(1, 0, 0);
        }
        cylinder.lookAt(midpoint.clone().add(direction));
        cylinder.rotateX(Math.PI / 2); // Cylinder is initially along Y axis
        
        this.tempDrawingObject.add(cylinder);
    }
      /**
     * Create a thick circle using torus geometry
     */
    createThickCircle(centerX, centerY, centerZ, radius, width, material) {
        if (radius < 0.001) return; // Skip very small circles
        
        const geometry = new THREE.TorusGeometry(radius, width / 2, 8, 32);
        const torus = new THREE.Mesh(geometry, material);
        torus.position.set(centerX, centerY, centerZ);
        torus.rotation.x = Math.PI / 2; // Rotate to lie flat on XZ plane
        
        this.tempDrawingObject.add(torus);
    }
      /**
     * Create a corner connector sphere for preview objects
     */
    createPreviewCornerConnector(x, y, z, width, material) {
        const geometry = new THREE.SphereGeometry(width / 2, 8, 8);
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        
        this.tempDrawingObject.add(sphere);
    }    /**
     * Create blueprint-style dimension lines for rectangles
     */
    createBlueprintDimensionLines(start, end) {
        // Clear any existing temp dimension lines
        this.clearTempDimensionLines();
        
        // Calculate dimensions
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        // Don't create dimension lines for tiny rectangles
        if (width < 0.1 || height < 0.1) return;
        
        // Calculate rectangle bounds
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);        // Get current grid scale to match major grid line thickness
        const dimensionLineWidth = this.getScaledLineWidth(0.1); // 2x thicker than normal lines (0.05 * 2)
        
        // Calculate proper spacing based on arrow barb size
        const arrowSize = dimensionLineWidth * 24; // Same calculation as in createBlueprintDimension
        const extensionOffset = arrowSize * 2; // 2x the barb width for proper spacing
        
        // Width dimension (bottom of rectangle)
        this.createBlueprintDimension(
            { x: minX, y: maxY }, // Shape edge start
            { x: maxX, y: maxY }, // Shape edge end
            width.toFixed(2) + '"',
            'horizontal',
            extensionOffset,
            dimensionLineWidth
        );
        
        // Height dimension (right of rectangle)
        this.createBlueprintDimension(
            { x: maxX, y: minY }, // Shape edge start
            { x: maxX, y: maxY }, // Shape edge end
            height.toFixed(2) + '"',
            'vertical',
            extensionOffset,
            dimensionLineWidth
        );
    }    /**
     * Convert pixels to world units based on current camera zoom
     */
    convertPixelsToWorldUnits(pixels) {
        // For orthographic camera, world units per pixel depend on zoom and canvas size
        const canvas = this.renderer.domElement;
        const canvasHeight = canvas.clientHeight;
        
        if (this.camera.isOrthographicCamera) {
            // Camera shows -size to +size vertically (total of 2*size)
            const cameraSize = (this.camera.top - this.camera.bottom) / this.camera.zoom;
            const worldUnitsPerPixel = cameraSize / canvasHeight;
            return pixels * worldUnitsPerPixel;
        } else {
            // Rough approximation for perspective camera
            return pixels * 0.01;
        }
    }

    /**
     * Create a complete blueprint-style dimension with extension lines, dimension line, arrows, and text
     */
    createBlueprintDimension(shapeStart, shapeEnd, text, orientation, extensionOffset, lineWidth) {
        const group = new THREE.Group();
        
        // Material for dimension lines (darker than major grid lines)
        const lineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x1a1a1a,  // Very dark grey, almost black
            transparent: false,
            opacity: 1.0
        });
          // Calculate extension line positioning
        const stopBeforeShape = this.convertPixelsToWorldUnits(20); // Stop 20px before shape
        const extensionBeyondDim = extensionOffset * 0.2; // Small extension beyond dimension line
        
        // Calculate dimension line position and extension line positions
        let dimLineStart, dimLineEnd, extLine1Start, extLine1End, extLine2Start, extLine2End;
          if (orientation === 'horizontal') {
            // Horizontal dimension (measuring width)
            const dimY = shapeStart.y + extensionOffset;
            
            dimLineStart = { x: shapeStart.x, y: dimY };
            dimLineEnd = { x: shapeEnd.x, y: dimY };
            
            // Extension lines (vertical) - stop 20px before shape
            extLine1Start = { x: shapeStart.x, y: shapeStart.y + stopBeforeShape }; // Start 20px away from shape
            extLine1End = { x: shapeStart.x, y: dimY + extensionBeyondDim };
            
            extLine2Start = { x: shapeEnd.x, y: shapeEnd.y + stopBeforeShape }; // Start 20px away from shape
            extLine2End = { x: shapeEnd.x, y: dimY + extensionBeyondDim };
        } else {
            // Vertical dimension (measuring height)
            const dimX = shapeStart.x + extensionOffset;
            
            dimLineStart = { x: dimX, y: shapeStart.y };
            dimLineEnd = { x: dimX, y: shapeEnd.y };
            
            // Extension lines (horizontal) - stop 20px before shape
            extLine1Start = { x: shapeStart.x + stopBeforeShape, y: shapeStart.y }; // Start 20px away from shape
            extLine1End = { x: dimX + extensionBeyondDim, y: shapeStart.y };
            
            extLine2Start = { x: shapeEnd.x + stopBeforeShape, y: shapeEnd.y }; // Start 20px away from shape
            extLine2End = { x: dimX + extensionBeyondDim, y: shapeEnd.y };
        }
          // Create extension lines
        const extLine1 = this.createThinLine(
            extLine1Start.x, 0.01, extLine1Start.y,
            extLine1End.x, 0.01, extLine1End.y,
            lineWidth, lineMaterial, group
        );
        if (extLine1) extLine1.renderOrder = 1000;
        
        const extLine2 = this.createThinLine(
            extLine2Start.x, 0.01, extLine2Start.y,
            extLine2End.x, 0.01, extLine2End.y,
            lineWidth, lineMaterial, group
        );
        if (extLine2) extLine2.renderOrder = 1000;
          // Create main dimension line
        const mainLine = this.createThinLine(
            dimLineStart.x, 0.01, dimLineStart.y,
            dimLineEnd.x, 0.01, dimLineEnd.y,
            lineWidth, lineMaterial, group
        );
        if (mainLine) mainLine.renderOrder = 1000; // Lower than text
          // Create curved arrow barbs at each end
        const arrowSize = lineWidth * 24; // Make arrows 3x bigger (was 8, now 24)
        this.createCurvedArrowBarb(dimLineStart, dimLineEnd, arrowSize, lineWidth, lineMaterial, group);
        this.createCurvedArrowBarb(dimLineEnd, dimLineStart, arrowSize, lineWidth, lineMaterial, group);
          // Create dimension text in the middle (render AFTER dimension line so it's on top)
        const midX = (dimLineStart.x + dimLineEnd.x) / 2;
        const midY = (dimLineStart.y + dimLineEnd.y) / 2;
        this.createDimensionText(text, midX, 0.03, midY, group); // Higher Y to be above the line        // Add to temp dimension lines
        this.tempDimensionLines.push(group);
        this.tempDrawingObject.add(group);
    }/**
     * Create a thin line for dimension lines
     */
    createThinLine(x1, y1, z1, x2, y2, z2, width, material, parent) {
        const start = new THREE.Vector3(x1, y1, z1);
        const end = new THREE.Vector3(x2, y2, z2);
        const length = start.distanceTo(end);
        
        if (length < 0.001) return null; // Skip very short lines
        
        const geometry = new THREE.CylinderGeometry(width / 2, width / 2, length, 6);
        const cylinder = new THREE.Mesh(geometry, material);
        
        // Position and orient the cylinder
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        
        // Orient cylinder to point from start to end
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(direction.dot(up)) > 0.99) {
            up.set(1, 0, 0);
        }
        cylinder.lookAt(midpoint.clone().add(direction));
        cylinder.rotateX(Math.PI / 2);
        
        parent.add(cylinder);
        return cylinder; // Return the created cylinder for render order setting
    }/**
     * Create curved arrow barb for dimension lines (blueprint style)
     */
    createCurvedArrowBarb(fromPoint, toPoint, arrowSize, lineWidth, material, parent) {
        // Calculate direction vector (from arrow point toward dimension line)
        const direction = new THREE.Vector3(
            toPoint.x - fromPoint.x,
            0,
            toPoint.y - fromPoint.y
        ).normalize();
        
        // Calculate perpendicular vector for the barb arms
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        // Create single curved barb that hooks BACKWARD like a fishhook
        // Start at the arrow point, curve back AWAY from the dimension line
        const startPoint = new THREE.Vector3(fromPoint.x, 0.01, fromPoint.y);
        
        // Control point: back AWAY from the dimension line direction
        const controlPoint = new THREE.Vector3(
            fromPoint.x + direction.x * arrowSize * 0.6, // FLIPPED: + instead of -
            0.01,
            fromPoint.y + direction.z * arrowSize * 0.6  // FLIPPED: + instead of -
        );
        
        // End point: further back and curved to the side (fishhook shape pointing backward)
        const endPoint = new THREE.Vector3(
            fromPoint.x + direction.x * arrowSize * 0.8 + perpendicular.x * arrowSize * 0.4, // FLIPPED: + instead of -
            0.01,
            fromPoint.y + direction.z * arrowSize * 0.8 + perpendicular.z * arrowSize * 0.4  // FLIPPED: + instead of -
        );
        
        // Create the curved barb using quadratic bezier
        const curve = new THREE.QuadraticBezierCurve3(startPoint, controlPoint, endPoint);
        
        // Create tube geometry - thickness matches dimension line thickness
        const geometry = new THREE.TubeGeometry(curve, 8, lineWidth / 2, 4, false);
        const barb = new THREE.Mesh(geometry, material);
        
        parent.add(barb);
    }    /**
     * Create dimension text for blueprint lines
     */
    createDimensionText(text, x, y, z, parent) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
          // Set canvas size for crisp text (higher resolution)
        const scale = 2; // Higher DPI for crisp text
        canvas.width = 512 * scale;
        canvas.height = 128 * scale;
        context.scale(scale, scale);
        
        // Clear canvas
        context.clearRect(0, 0, 512, 128);        // Set text properties - match button font size (14px) but make it very visible
        context.font = 'bold 14px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'; // Match button font size
        context.fillStyle = '#000000'; // Pure black text for maximum visibility
        context.textAlign = 'center';
        context.textBaseline = 'middle';
          // Measure text for background sizing
        const textMetrics = context.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 14; // Font size matches button
        const padding = 8; // Padding to match button spacing
        
        // Draw solid white background rectangle
        context.fillStyle = 'rgba(255, 255, 255, 1.0)'; // Completely opaque white
        context.fillRect(
            (512 - textWidth) / 2 - padding,
            (128 - textHeight) / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
          // Draw text on top of white background
        context.fillStyle = '#000000'; // Pure black text for maximum visibility
        context.fillText(text, 256, 64); // Center of canvas
          // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.flipY = false; // Prevent texture flipping
        
        // Create material with proper rendering order
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false // Allow proper layering
        });        // Create plane geometry for the text - size to match button font
        const textWidth3D = 1.8; // Smaller width for 14px font
        const textHeight3D = 0.4; // Smaller height for 14px font
        const geometry = new THREE.PlaneGeometry(textWidth3D, textHeight3D);
        const textMesh = new THREE.Mesh(geometry, material);
          // Position and orient the text
        textMesh.position.set(x, y, z);
        textMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat on XZ plane
        textMesh.renderOrder = 1002; // Higher render order to be on top of everything
        
        parent.add(textMesh);
    }

    /**
     * Clear temporary dimension lines
     */
    clearTempDimensionLines() {
        this.tempDimensionLines.forEach(group => {
            if (this.tempDrawingObject) {
                this.tempDrawingObject.remove(group);
            }
            this.disposeDimensionGroup(group);
        });
        this.tempDimensionLines = [];
    }

    /**
     * Create persistent dimension lines for completed rectangles
     */
    createPersistentDimensionLines(start, end) {
        // Clear any existing persistent dimension lines
        this.clearPersistentDimensionLines();
        
        // Calculate dimensions
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        // Don't create dimension lines for tiny rectangles
        if (width < 0.1 || height < 0.1) return;
        
        // Calculate rectangle bounds
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        // Create dimension lines with proper offset from rectangle
        const offset = 1.5;
        
        // Width dimension (bottom of rectangle)
        const widthGroup = this.createPersistentDimensionLine(
            { x: minX, y: maxY + offset },
            { x: maxX, y: maxY + offset },
            width.toFixed(2) + '"',
            'horizontal'
        );
        
        // Height dimension (right of rectangle)
        const heightGroup = this.createPersistentDimensionLine(
            { x: maxX + offset, y: minY },
            { x: maxX + offset, y: maxY },
            height.toFixed(2) + '"',
            'vertical'
        );
        
        this.persistentDimensionLines.push(widthGroup, heightGroup);
    }

    /**
     * Create a single persistent dimension line
     */    createPersistentDimensionLine(startPoint, endPoint, text, orientation) {
        const group = new THREE.Group();
        
        // Material for dimension lines (dark grey/black)
        const lineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x333333,  // Dark grey
            transparent: false,
            opacity: 1.0
        });
        
        const lineWidth = 0.05;
        
        // Main dimension line
        this.createThinLine(
            startPoint.x, 0.01, startPoint.y,
            endPoint.x, 0.01, endPoint.y,
            lineWidth, lineMaterial, group
        );
          // Extension lines
        const extensionLength = this.getScaledLineWidth(0.3);
        
        if (orientation === 'horizontal') {
            this.createThinLine(
                startPoint.x, 0.01, startPoint.y - extensionLength,
                startPoint.x, 0.01, startPoint.y + extensionLength,
                lineWidth, lineMaterial, group
            );
            
            this.createThinLine(
                endPoint.x, 0.01, endPoint.y - extensionLength,
                endPoint.x, 0.01, endPoint.y + extensionLength,
                lineWidth, lineMaterial, group
            );
        } else {
            this.createThinLine(
                startPoint.x - extensionLength, 0.01, startPoint.y,
                startPoint.x + extensionLength, 0.01, startPoint.y,
                lineWidth, lineMaterial, group
            );
            
            this.createThinLine(
                endPoint.x - extensionLength, 0.01, endPoint.y,
                endPoint.x + extensionLength, 0.01, endPoint.y,
                lineWidth, lineMaterial, group
            );
        }
        
        // Arrow heads
        this.createArrowHead(startPoint, endPoint, orientation, lineMaterial, group);
        this.createArrowHead(endPoint, startPoint, orientation, lineMaterial, group);
        
        // Dimension text
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        this.createDimensionText(text, midX, 0.02, midY, group);
        
        // Mark as persistent dimension line
        group.userData = {
            isPersistentDimensionLine: true,
            is2D: true,
            createdInMode: 'sketch'
        };
        
        this.scene.add(group);
        return group;
    }

    /**
     * Clear persistent dimension lines
     */
    clearPersistentDimensionLines() {
        this.persistentDimensionLines.forEach(group => {
            this.scene.remove(group);
            this.disposeDimensionGroup(group);
        });
        this.persistentDimensionLines = [];
    }

    /**
     * Dispose of dimension group resources
     */
    disposeDimensionGroup(group) {
        group.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (child.material.map) {
                    child.material.map.dispose();
                }
                child.material.dispose();
            }
        });
    }    /**
     * Finish drawing
     */
    finishDrawing(e) {
        if (!this.isDrawing) return;
          this.isDrawing = false;
        
        // Get final coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        const vector = new THREE.Vector3(x, y, 0);
        vector.unproject(this.camera);
            // Apply grid snapping- use Z coordinate for XZ plane
        const endPoint = this.snapToGrid(vector.x, vector.z);
        
        // Create final object
        this.createFinalDrawingObject(this.drawingStartPoint, endPoint);
          // For rectangles, create persistent dimension lines
        if (this.currentTool === 'rectangle') {
            this.createPersistentDimensionLines(this.drawingStartPoint, endPoint);
        }
          // Clean up temporary objects
        this.clearTempDimensionLines();
        if (this.tempDrawingObject) {
            this.scene.remove(this.tempDrawingObject);
            this.tempDrawingObject = null;
        }
        
        this.drawingStartPoint = null;
    }    /**
     * Create final drawing object
     */
    createFinalDrawingObject(start, end) {
        // Use black material for final objects (thick and clearly visible)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,  // Black for maximum visibility
            transparent: false,
            opacity: 1.0
        });
        
        const lineWidth = this.getScaledLineWidth(this.baseLineWidth); // Use scaled line width for final objects
        const finalObject = new THREE.Group();
          switch (this.currentTool) {
            case 'line':
                this.createFinalThickLine(start.x, 0, start.y, end.x, 0, end.y, lineWidth, material, finalObject);
                // Add end caps for clean line ends
                this.createCornerConnector(start.x, 0, start.y, lineWidth, material, finalObject); // Start point
                this.createCornerConnector(end.x, 0, end.y, lineWidth, material, finalObject);     // End point
                break;
                  case 'rectangle':
                // Create 4 thick lines for rectangle
                this.createFinalThickLine(start.x, 0, start.y, end.x, 0, start.y, lineWidth, material, finalObject); // Top
                this.createFinalThickLine(end.x, 0, start.y, end.x, 0, end.y, lineWidth, material, finalObject);   // Right
                this.createFinalThickLine(end.x, 0, end.y, start.x, 0, end.y, lineWidth, material, finalObject);   // Bottom
                this.createFinalThickLine(start.x, 0, end.y, start.x, 0, start.y, lineWidth, material, finalObject); // Left
                
                // Add corner connectors for clean joints
                this.createCornerConnector(start.x, 0, start.y, lineWidth, material, finalObject); // Top-left
                this.createCornerConnector(end.x, 0, start.y, lineWidth, material, finalObject);   // Top-right
                this.createCornerConnector(end.x, 0, end.y, lineWidth, material, finalObject);     // Bottom-right
                this.createCornerConnector(start.x, 0, end.y, lineWidth, material, finalObject);   // Bottom-left
                break;
                
            case 'circle':
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                this.createFinalThickCircle(start.x, 0, start.y, radius, lineWidth, material, finalObject);
                break;
        }
        
        // Make sure drawing lines render on top of grid
        finalObject.renderOrder = 998;
        
        // Store metadata
        finalObject.userData = {
            type: this.currentTool,
            is2D: true,
            startPoint: start,
            endPoint: end,
            createdInMode: 'sketch'
        };
        
        this.scene.add(finalObject);
        this.drawnObjects.push(finalObject);
        this.sketchObjects.push(finalObject);
        // Enforce single selection unless Shift is held
        if (!window.event || !window.event.shiftKey) {
            this.selectedObjects = [finalObject];
            this.clearSelectionVisuals();
        } else {
            this.selectedObjects.push(finalObject);
        }        this.createSelectionVisuals(finalObject);
    }
    
    /**
     * Create a thick line for final objects
     */
    createFinalThickLine(x1, y1, z1, x2, y2, z2, width, material, parent) {
        const start = new THREE.Vector3(x1, y1, z1);
        const end = new THREE.Vector3(x2, y2, z2);
        const length = start.distanceTo(end);
        
        if (length < 0.001) return; // Skip very short lines
        
        const geometry = new THREE.CylinderGeometry(width / 2, width / 2, length, 8);
        const cylinder = new THREE.Mesh(geometry, material);
        
        // Position and orient the cylinder
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        
        // Orient cylinder to point from start to end
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        if (Math.abs(direction.dot(up)) > 0.99) {
            // Line is vertical, use different up vector
            up.set(1, 0, 0);
        }
        cylinder.lookAt(midpoint.clone().add(direction));
        cylinder.rotateX(Math.PI / 2); // Cylinder is initially along Y axis
        
        parent.add(cylinder);
    }
      /**
     * Create a thick circle for final objects
     */
    createFinalThickCircle(centerX, centerY, centerZ, radius, width, material, parent) {
        if (radius < 0.001) return; // Skip very small circles
        
        const geometry = new THREE.TorusGeometry(radius, width / 2, 8, 32);
        const torus = new THREE.Mesh(geometry, material);
        torus.position.set(centerX, centerY, centerZ);
        torus.rotation.x = Math.PI / 2; // Rotate to lie flat on XZ plane
        
        parent.add(torus);
    }
    
    /**
     * Create a corner connector sphere for clean line joints
     */
    createCornerConnector(x, y, z, width, material, parent) {
        const geometry = new THREE.SphereGeometry(width / 2, 8, 8);
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        
        parent.add(sphere);
    }

    /**
     * Switch between sketch and modeling modes
     */
    switchMode(mode) {
        this.currentMode = mode;

        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-mode`)?.classList.add('active');

        // Setup appropriate camera
        const canvas = this.renderer.domElement;
        this.setupCamera(canvas.clientWidth, canvas.clientHeight);

        // Show/hide objects based on mode
        this.updateObjectVisibility();        // Update grid for mode
        this.updateGridForMode();
        
        // Update grid camera reference after camera change
        if (this.dynamicGrid) {
            this.dynamicGrid.camera = this.camera;
            this.dynamicGrid.forceUpdate();
        }

        // Update instructions
        this.updateInstructions();
          // Update line widths after mode switch (camera changes)
        this.updateAllLineWidths();
    }/**
     * Update object visibility based on current mode
     */
    updateObjectVisibility() {
        this.drawnObjects.forEach(obj => {
            if (this.currentMode === 'sketch') {
                // In sketch mode, show 2D objects, hide 3D objects and gizmos
                if (obj.userData.is2D) {
                    obj.visible = true;
                } else if (obj.userData.is3D) {
                    obj.visible = false;
                    // Hide gizmos too
                    if (obj.userData.faceGizmos) {
                        obj.userData.faceGizmos.forEach(gizmo => gizmo.visible = false);
                    }
                }
            } else {
                // In modeling mode, show all objects
                obj.visible = true;
                if (obj.userData.faceGizmos) {
                    obj.userData.faceGizmos.forEach(gizmo => gizmo.visible = true);
                }
            }
        });
        
        // Handle dimension lines visibility
        this.persistentDimensionLines.forEach(group => {
            if (this.currentMode === 'sketch') {
                group.visible = true;
            } else {
                group.visible = false; // Hide dimension lines in modeling mode
            }
        });
    }

    /**
     * Select drawing tool
     */    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
          // Update cursor
        const canvas = this.renderer.domElement;
        canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    }

    /**
     * Update cursor based on current state
     */
    updateCursor() {
        const canvas = this.renderer.domElement;
        
        // Check if Ctrl is currently pressed for panning
        if (this.isCtrlPressed) {
            canvas.style.cursor = 'grab';
        } else {
            // Default cursor based on current tool
            canvas.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair';
        }
    }

    /**
     * Clear all objects from the scene
     */    clearCanvas() {
        this.drawnObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            
            // Clean up gizmos
            if (obj.userData.faceGizmos) {
                obj.userData.faceGizmos.forEach(gizmo => {
                    this.scene.remove(gizmo);
                    if (gizmo.geometry) gizmo.geometry.dispose();
                    if (gizmo.material) gizmo.material.dispose();
                });
            }
        });
        
        // Clear dimension lines
        this.clearPersistentDimensionLines();
        this.clearTempDimensionLines();
        
        this.drawnObjects = [];        this.sketchObjects = [];
        this.modelingObjects = [];
        this.selectedObjects = [];
    }/**
     * Reset camera to default position
     */
    resetCamera() {        if (this.currentMode === 'sketch') {
            // Position camera above XZ plane looking down (matches setupCamera)
            this.camera.position.set(0, 15, 0); // Changed from 10 to 15
            this.camera.lookAt(0, 0, 0);
            this.camera.zoom = 1;
            this.camera.updateProjectionMatrix();
        } else {
            this.camera.position.set(5, 5, 5);
            this.camera.lookAt(0, 0, 0);
        }
        
        // Update line widths after camera reset
        this.updateAllLineWidths();
        
    }

    /**
     * Extrude selected 2D objects into 3D
     */
    extrudeSelected() {
        if (this.currentMode !== 'modeling') {
            return;
        }
        
        const selectedSketchObjects = this.selectedObjects.filter(obj => obj.userData.is2D);
        
        if (selectedSketchObjects.length === 0) {
            // Create a new cube if nothing is selected
            this.createNewCube();
            return;
        }
        
        selectedSketchObjects.forEach(obj => {
            if (obj.userData.type === 'rectangle') {
                this.extrudeRectangle(obj);
            }
            // Add other shape extrusions as needed
        });
    }

    /**
     * Create a new cube for demonstration
     */
    createNewCube() {
        
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ color: 0x8e24aa });
        const cube = new THREE.Mesh(geometry, material);
        
        // Position randomly
        cube.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        
        // Store metadata
        cube.userData = {
            type: 'cube',
            is3D: true,
            createdInMode: 'modeling'
        };
        
        this.scene.add(cube);
        this.drawnObjects.push(cube);
        this.modelingObjects.push(cube);
        
        // Add face gizmos for manipulation
        this.addFaceGizmos(cube);
        
    }

    /**
     * Extrude rectangle into a box
     */
    extrudeRectangle(rectObj) {
        if (!rectObj.userData.startPoint || !rectObj.userData.endPoint) return;
        
        const start = rectObj.userData.startPoint;
        const end = rectObj.userData.endPoint;
        
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        const depth = Math.min(width, height) * 0.5; // Default depth
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({ color: 0x8e24aa });
        const box = new THREE.Mesh(geometry, material);
        
        // Position at the center of the rectangle
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        box.position.set(centerX, centerY, depth / 2);
        
        // Store metadata
        box.userData = {
            type: 'extruded_rectangle',
            is3D: true,
            originalSketchObject: rectObj,
            createdInMode: 'modeling'
        };
        
        this.scene.add(box);
        this.drawnObjects.push(box);
        this.modelingObjects.push(box);
        
        // Add face gizmos
        this.addFaceGizmos(box);
        
    }

    /**
     * Add manipulatable gizmos to all 6 faces of a box/cube
     */
    addFaceGizmos(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Face gizmos for each face
        const faceGizmos = [];
        const faceNormals = [
            new THREE.Vector3(1, 0, 0),   // Right face
            new THREE.Vector3(-1, 0, 0),  // Left face
            new THREE.Vector3(0, 1, 0),   // Top face
            new THREE.Vector3(0, -1, 0),  // Bottom face
            new THREE.Vector3(0, 0, 1),   // Front face
            new THREE.Vector3(0, 0, -1)   // Back face
        ];
        
        faceNormals.forEach((normal, index) => {
            const gizmo = this.createFaceGizmo(mesh, normal, size, index);
            faceGizmos.push(gizmo);
            this.scene.add(gizmo);
        });
        
        mesh.userData.faceGizmos = faceGizmos;
    }

    /**
     * Create a draggable gizmo for a face
     */
    createFaceGizmo(parentMesh, normal, size, faceIndex) {
        const gizmoGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const gizmoMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.7
        });
        
        const gizmo = new THREE.Mesh(gizmoGeometry, gizmoMaterial);
        
        // Position gizmo on face center
        const box = new THREE.Box3().setFromObject(parentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const faceCenter = center.clone().add(normal.clone().multiply(size.clone().multiplyScalar(0.5)));
        gizmo.position.copy(faceCenter);
        
        // Store metadata
        gizmo.userData = {
            isFaceGizmo: true,
            parentMesh: parentMesh,
            faceIndex: faceIndex,
            normal: normal.clone(),
            originalColor: 0x4fc3f7,
            originalScale: gizmo.scale.clone()
        };
        
        return gizmo;
    }

    /**
     * Setup mouse event handling for face gizmo interactions
     */
    setupGizmoInteractions() {
        const canvas = this.renderer?.domElement;
        if (!canvas) return;

        // Note: Mouse events are already handled in setupControls()
        // The gizmo-specific handling is done in handleModelingMouseDown()
    }

    /**
     * Handle mouse down for gizmo interaction
     */
    handleGizmoMouseDown(e) {
        if (e.button !== 0) return; // Only left mouse button

        const intersect = this.getGizmoIntersection(e);
        if (intersect && intersect.object.userData.isFaceGizmo) {
            
            this.isDraggingGizmo = true;
            this.selectedGizmo = intersect.object;
            
            // Store drag start position
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.dragStartPosition = {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1
            };
            
            // Highlight the selected gizmo
            this.selectedGizmo.material.color.setHex(0xff6b6b);
            this.selectedGizmo.material.opacity = 1.0;
            
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Handle mouse up for gizmo interaction
     */
    handleGizmoMouseUp(e) {
        if (this.isDraggingGizmo && this.selectedGizmo) {
            
            // Reset gizmo appearance
            this.selectedGizmo.material.color.setHex(this.selectedGizmo.userData.originalColor);
            this.selectedGizmo.material.opacity = 0.7;
            
            this.isDraggingGizmo = false;
            this.selectedGizmo = null;
        }
    }

    /**
     * Get intersection with gizmos using raycaster
     */
    getGizmoIntersection(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Get all gizmos
        const gizmos = [];
        this.drawnObjects.forEach(obj => {
            if (obj.userData.faceGizmos) {
                gizmos.push(...obj.userData.faceGizmos);
            }
        });
        
        const intersects = this.raycaster.intersectObjects(gizmos);
        return intersects.length > 0 ? intersects[0] : null;
    }    /**
     * Create dynamic grid system
     */    createDynamicGrid() {
        if (typeof DynamicGrid === 'undefined') {
            return;
        }
        this.dynamicGrid = new DynamicGrid(this.scene, this.camera);
    }

    /**
     * Update grid for current mode
     */
    updateGridForMode() {
        if (this.dynamicGrid) {
            this.dynamicGrid.forceUpdate();
        }
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        if (this.dynamicGrid) {
            this.dynamicGrid.toggle();
        }
        
        // Update status display
        this.updateGridStatusDisplay();
    }

    /**
     * Toggle rulers visibility
     */
    toggleRulers() {
        this.rulersVisible = !this.rulersVisible;
        // TODO: Implement rulers rendering
    }

    /**
     * Toggle crosshairs visibility
     */
    toggleCrosshairs() {
        this.crosshairsVisible = !this.crosshairsVisible;
        // TODO: Implement crosshairs rendering
    }

    /**
     * Setup lighting
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }    /**
     * Update mouse coordinates display
     */
    updateMouseCoordinates(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to world coordinates for display
        const worldX = ((x / rect.width) * 2 - 1) * 10; // Rough conversion
        const worldY = -((y / rect.height) * 2 - 1) * 10;
        
        const coordsSpan = document.getElementById('mouseCoords');
        if (coordsSpan) {
            coordsSpan.textContent = `${Math.round(worldX)}, ${Math.round(worldY)}`;
        }
        
        // Update camera height display
        this.updateCameraHeightDisplay();
        
        // Update grid status display
        this.updateGridStatusDisplay();
    }    /**
     * Update camera height display in inches
     */
    updateCameraHeightDisplay() {
        const heightSpan = document.getElementById('cameraHeight');
        if (heightSpan && this.camera) {
            let heightInches;
            
            if (this.camera.isOrthographicCamera) {
                // For orthographic camera, calculate realistic viewing height
                // Based on the visible area and typical human viewing angles
                const baseSize = 20; // Base orthographic camera size (units)
                const visibleWidth = (baseSize * 2) / this.camera.zoom; // Total visible width in inches
                
                // Convert to realistic height using human vision geometry
                // Assume ~60 degree field of view for comfortable viewing
                // For a person to see 'visibleWidth' from edge to edge, they need height:
                const fieldOfViewRadians = Math.PI / 3; // 60 degrees
                const realisticHeight = (visibleWidth / 2) / Math.tan(fieldOfViewRadians / 2);
                
                heightInches = realisticHeight; // Already in inches (1 world unit = 1 inch)
            } else {
                // For perspective camera in modeling mode, use actual Y position
                heightInches = this.camera.position.y;
            }
            
            heightSpan.textContent = `${heightInches.toFixed(1)}"`;
        }
    }

    /**
     * Update instructions
     */
    updateInstructions() {
        const toolSpan = document.getElementById('currentTool');
        if (toolSpan) {
            const modeText = this.currentMode === 'sketch' ? '2D Sketch Mode' : '3D Modeling Mode';
            const controls = this.currentMode === 'sketch' ? 
                'Right-click: 3D Mode | Space: Toggle Mode' : 
                'Right-drag: Rotate | Space: Sketch Mode';
            toolSpan.textContent = `${this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1)} - ${modeText} | ${controls}`;
        }
    }

    /**
     * Cancel current operation
     */
    cancelCurrentOperation() {
        if (this.isDrawing) {
            this.isDrawing = false;
            if (this.tempDrawingObject) {
                this.scene.remove(this.tempDrawingObject);
                this.tempDrawingObject = null;
            }
            this.drawingStartPoint = null;
        }
    }

    /**
     * Select object at mouse position
     */    /**
     * Select object at mouse position with enhanced interior selection
     */
    selectObjectAt(e) {
        this.clearSelectionVisuals();
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0);
        vector.unproject(this.camera);
        let selectedShape = null;
        for (let i = this.drawnObjects.length - 1; i >= 0; i--) {
            const obj = this.drawnObjects[i];
            if (this.currentMode === 'sketch' && obj.userData.is2D) {
                if (this.isPointInsideShape(vector.x, vector.z, obj)) {
                    selectedShape = obj;
                    break;
                }
            } else if (this.currentMode !== 'sketch' && !obj.userData.isFaceGizmo) {
                this.raycaster.setFromCamera(mouse, this.camera);
                const intersects = this.raycaster.intersectObjects([obj], true);
                if (intersects.length > 0) {
                    selectedShape = obj;
                    break;
                }
            }
        }
        if (selectedShape) {
            if (!e.shiftKey) {
                this.selectedObjects = [];
                this.clearSelectionVisuals();
            }
            this.selectedObjects = [selectedShape];
            this.createSelectionVisuals(selectedShape);
        } else {
            this.selectedObjects = [];
            this.clearSelectionVisuals();
        }
    }    /**
     * Check if a point is inside a 2D shape
     */
    isPointInsideShape(x, z, shapeObject) {
        const userData = shapeObject.userData;
        const start = userData.startPoint;
        const end = userData.endPoint;
        if (!start || !end) return false;
        const tolerance = this.getScaledLineWidth(0.5); // Selection tolerance
        switch (userData.type) {
            case 'line':
                return this.distanceToLineSegment(x, z, start.x, start.y, end.x, end.y) <= tolerance;
            case 'rectangle':
                // Check if point is inside rectangle bounds
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                const minZ = Math.min(start.y, end.y);
                const maxZ = Math.max(start.y, end.y);
                return (x >= minX && x <= maxX && z >= minZ && z <= maxZ);
            case 'circle':
                const centerX = start.x;
                const centerZ = start.y;
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
                return distance <= radius;
            default:
                return false;
        }
    }
    
    /**
     * Calculate distance from point to line segment
     */
    distanceToLineSegment(px, pz, x1, z1, x2, z2) {
        const A = px - x1;
        const B = pz - z1;
        const C = x2 - x1;
        const D = z2 - z1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
        
        const xx = x1 + param * C;
        const zz = z1 + param * D;
        
        const dx = px - xx;
        const dz = pz - zz;
        return Math.sqrt(dx * dx + dz * dz);
    }    /**
     * Create visual selection feedback for selected shape
     */
    createSelectionVisuals(shapeObject) {
        const userData = shapeObject.userData;
        const start = userData.startPoint;
        const end = userData.endPoint;
        
        if (!start || !end) return;
        
        // Store original material colors before changing them
        if (!userData.originalMaterials) {
            userData.originalMaterials = [];
            shapeObject.traverse((child) => {
                if (child.material) {
                    userData.originalMaterials.push({
                        mesh: child,
                        color: child.material.color.getHex()
                    });
                }
            });
        }
        
        // Change shape color to blue
        const blueColor = 0x4169E1; // Royal blue
        shapeObject.traverse((child) => {
            if (child.material) {
                child.material.color.setHex(blueColor);
            }
        });
        
        // Create selection group
        const selectionGroup = new THREE.Group();
        selectionGroup.userData.isSelectionVisual = true;
        selectionGroup.renderOrder = 999; // Render on top
        
        // Selection fill material (blue with transparency)
        const fillMaterial = new THREE.MeshBasicMaterial({ 
            color: blueColor,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        switch (userData.type) {
            case 'rectangle':
                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                const minZ = Math.min(start.y, end.y);
                const maxZ = Math.max(start.y, end.y);
                
                // Create fill plane only (no border)
                const fillGeometry = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
                const fillPlane = new THREE.Mesh(fillGeometry, fillMaterial);
                fillPlane.position.set((minX + maxX) / 2, 0.001, (minZ + maxZ) / 2);
                fillPlane.rotation.x = -Math.PI / 2; // Rotate to lie flat on XZ plane
                selectionGroup.add(fillPlane);
                
                // Create resize handles
                this.createResizeHandles(selectionGroup, minX, maxX, minZ, maxZ);
                break;
                
            case 'circle':
                const centerX = start.x;
                const centerZ = start.y;
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                
                // Create fill circle only (no border)
                const fillCircleGeometry = new THREE.CircleGeometry(radius, 32);
                const fillCircle = new THREE.Mesh(fillCircleGeometry, fillMaterial);
                fillCircle.position.set(centerX, 0.001, centerZ);
                fillCircle.rotation.x = -Math.PI / 2;
                selectionGroup.add(fillCircle);
                
                // Create resize handles for circle (4 cardinal points)
                this.createCircleResizeHandles(selectionGroup, centerX, centerZ, radius);
                break;
                
            case 'line':
                // For lines, no fill needed, just handles at endpoints
                this.createLineHandles(selectionGroup, start.x, start.y, end.x, end.y);
                break;
        }
        
        // Store reference to selection visuals
        shapeObject.userData.selectionVisuals = selectionGroup;
        this.scene.add(selectionGroup);
    }
    
    /**
     * Create resize handles for rectangles
     */
    createResizeHandles(parent, minX, maxX, minZ, maxZ) {
        // Increase handle size for easier grabbing
        const handleSize = this.getScaledLineWidth(1.2); // was 0.4
        const handleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4169E1, // Royal blue
            transparent: true,
            opacity: 0.8
        });
        
        // Corner handles
        const corners = [
            { x: minX, z: minZ, type: 'corner-tl' },
            { x: maxX, z: minZ, type: 'corner-tr' },
            { x: maxX, z: maxZ, type: 'corner-br' },
            { x: minX, z: maxZ, type: 'corner-bl' }
        ];
        
        corners.forEach(corner => {
            const handleGeometry = new THREE.BoxGeometry(handleSize, handleSize, handleSize);
            const handle = new THREE.Mesh(handleGeometry, handleMaterial);
            handle.position.set(corner.x, 0.002, corner.z);
            handle.userData.isResizeHandle = true;
            handle.userData.handleType = corner.type;
            parent.add(handle);
        });
        
        // Edge handles
        const edges = [
            { x: (minX + maxX) / 2, z: minZ, type: 'edge-top' },
            { x: maxX, z: (minZ + maxZ) / 2, type: 'edge-right' },
            { x: (minX + maxX) / 2, z: maxZ, type: 'edge-bottom' },
            { x: minX, z: (minZ + maxZ) / 2, type: 'edge-left' }
        ];
        
        edges.forEach(edge => {
            const handleGeometry = new THREE.BoxGeometry(handleSize * 0.7, handleSize * 0.7, handleSize * 0.7);
            const handle = new THREE.Mesh(handleGeometry, handleMaterial);
            handle.position.set(edge.x, 0.002, edge.z);
            handle.userData.isResizeHandle = true;
            handle.userData.handleType = edge.type;
            parent.add(handle);
        });
    }
    
    /**

     * Create resize handles for circles
     */
    createCircleResizeHandles(parent, centerX, centerZ, radius) {
        const handleSize = this.getScaledLineWidth(0.4);
        const handleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4169E1, // Royal blue
            transparent: true,
            opacity: 0.8
        });
        
        // Create 4 handles at cardinal points
        const handles = [
            { x: centerX + radius, z: centerZ, type: 'circle-right' },
            { x: centerX, z: centerZ + radius, type: 'circle-bottom' },
            { x: centerX - radius, z: centerZ, type: 'circle-left' },
            { x: centerX, z: centerZ - radius, type: 'circle-top' }
        ];
        
        handles.forEach(handle => {
            const handleGeometry = new THREE.SphereGeometry(handleSize / 2, 8, 8);
            const handleMesh = new THREE.Mesh(handleGeometry, handleMaterial);
            handleMesh.position.set(handle.x, 0.002, handle.z);
            handleMesh.userData.isResizeHandle = true;
            handleMesh.userData.handleType = handle.type;
            parent.add(handleMesh);
        });
    }
    
    /**
     * Create move handles for lines
     */
    createLineHandles(parent, x1, z1, x2, z2) {
        const handleSize = this.getScaledLineWidth(0.4);
        const handleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x4169E1, // Royal blue
            transparent: true,
            opacity: 0.8
        });
        
        // Start point handle
        const startHandleGeometry = new THREE.SphereGeometry(handleSize / 2, 8, 8);
        const startHandle = new THREE.Mesh(startHandleGeometry, handleMaterial);
        startHandle.position.set(x1, 0.002, z1);
        startHandle.userData.isResizeHandle = true;
        startHandle.userData.handleType = 'line-start';
        parent.add(startHandle);
        
        // End point handle
        const endHandleGeometry = new THREE.SphereGeometry(handleSize / 2, 8, 8);
        const endHandle = new THREE.Mesh(endHandleGeometry, handleMaterial);
        endHandle.position.set(x2, 0.002, z2);
        endHandle.userData.isResizeHandle = true;
        endHandle.userData.handleType = 'line-end';
        parent.add(endHandle);
        
        // Middle handle for moving the entire line
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const moveHandleGeometry = new THREE.BoxGeometry(handleSize, handleSize * 0.5, handleSize);
        const moveHandle = new THREE.Mesh(moveHandleGeometry, handleMaterial);
        moveHandle.position.set(midX, 0.002, midZ);
        moveHandle.userData.isResizeHandle = true;
        moveHandle.userData.handleType = 'line-move';
        parent.add(moveHandle);
    }
    
    /**
     * Clear all selection visuals
     */    clearSelectionVisuals() {
        // Remove selection visuals from all objects
        this.drawnObjects.forEach(obj => {
            if (obj.userData.selectionVisuals) {
                this.scene.remove(obj.userData.selectionVisuals);
                
                // Dispose of selection visual resources
                obj.userData.selectionVisuals.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                  delete obj.userData.selectionVisuals;
            }
            
            // Restore original material colors
            if (obj.userData.originalMaterials) {
                obj.userData.originalMaterials.forEach(({ mesh, color }) => {
                    mesh.material.color.setHex(color);
                });
                delete obj.userData.originalMaterials;
            }
        });
        
        // Clear persistent dimension lines when deselecting
        this.clearPersistentDimensionLines();
    }

    /**
     * Create rectangle geometry for a shape object
     */
    createRectangleGeometry(shapeObject, startX, startY, endX, endY, lineWidth) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minZ = Math.min(startY, endY);
        const maxZ = Math.max(startY, endY);
        
        // Create rectangle lines
        this.createThinLine(minX, 0, minZ, maxX, 0, minZ, lineWidth, this.sketchMaterial, shapeObject); // Top
        this.createThinLine(maxX, 0, minZ, maxX, 0, maxZ, lineWidth, this.sketchMaterial, shapeObject); // Right
        this.createThinLine(maxX, 0, maxZ, minX, 0, maxZ, lineWidth, this.sketchMaterial, shapeObject); // Bottom
        this.createThinLine(minX, 0, maxZ, minX, 0, minZ, lineWidth, this.sketchMaterial, shapeObject); // Left
    }
    
    /**
     * Create circle geometry for a shape object
     */
    createCircleGeometry(shapeObject, centerX, centerY, endX, endY, lineWidth) {
        const radius = Math.sqrt(Math.pow(endX - centerX, 2) + Math.pow(endY - centerY, 2));
        
        // Create circle using torus geometry
        const geometry = new THREE.TorusGeometry(radius, lineWidth / 2, 8, 32);
        const mesh = new THREE.Mesh(geometry, this.sketchMaterial);
        mesh.position.set(centerX, 0, centerY);
        mesh.rotation.x = Math.PI / 2; // Rotate to lie flat on XZ plane
        shapeObject.add(mesh);
    }
    
    /**
     * Create line geometry for a shape object
     */
    createLineGeometry(shapeObject, startX, startY, endX, endY, lineWidth) {
        this.createThinLine(startX, 0, startY, endX, 0, endY, lineWidth, this.sketchMaterial, shapeObject);
    }

    /**
     * Check if mouse is over a resize handle
     */
    checkHandleInteraction(e) {
        if (!this.drawnObjects.length) return false;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // Check all selection visuals for handle interaction
        for (const obj of this.drawnObjects) {
            if (obj.userData.selectionVisuals) {
                const handles = [];
                obj.userData.selectionVisuals.traverse((child) => {
                    if (child.userData.isResizeHandle) {
                        handles.push(child);
                    }
                });
                
                if (handles.length > 0) {
                    const intersects = this.raycaster.intersectObjects(handles, false);
                    if (intersects.length > 0) {
                        this.startHandleInteraction(intersects[0], obj, e);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Start handle interaction
     */
    startHandleInteraction(intersect, shapeObject, e) {
        this.isDraggingHandle = true;
        this.selectedHandle = intersect.object;
        this.selectedShape = shapeObject;
        
        // Store initial positions for reference
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.handleStartPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Store initial shape bounds
        const userData = shapeObject.userData;
        this.shapeStartBounds = {
            startX: userData.startPoint.x,
            startY: userData.startPoint.y,
            endX: userData.endPoint.x,
            endY: userData.endPoint.y,
            type: userData.type
        };
        
        // Change cursor to indicate resize mode
        this.renderer.domElement.style.cursor = this.getHandleCursor(this.selectedHandle.userData.handleType);
    }
    
    /**
     * Update handle drag
     */
    updateHandleDrag(e) {
        if (!this.isDraggingHandle || !this.selectedHandle || !this.selectedShape) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const currentMouse = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        const deltaX = currentMouse.x - this.handleStartPosition.x;
        const deltaY = currentMouse.y - this.handleStartPosition.y;
        
        // Convert screen delta to world coordinates
        const worldDelta = this.screenToWorldDelta(deltaX, deltaY);
        
        // Update shape based on handle type
        this.updateShapeFromHandle(worldDelta);
    }
    
    /**
     * Finish handle drag
     */
    finishHandleDrag() {
        this.isDraggingHandle = false;
        this.selectedHandle = null;
        this.selectedShape = null;
        this.handleStartPosition = null;
        this.shapeStartBounds = null;
        
        // Reset cursor
        this.renderer.domElement.style.cursor = 'default';
    }
    
    /**
     * Get appropriate cursor for handle type
     */
    getHandleCursor(handleType) {
        switch (handleType) {
            case 'corner-tl':
            case 'corner-br':
                return 'nw-resize';
            case 'corner-tr':
            case 'corner-bl':
                return 'ne-resize';
            case 'edge-top':
            case 'edge-bottom':
                return 'n-resize';
            case 'edge-left':
            case 'edge-right':
                return 'e-resize';
            case 'circle-right':
            case 'circle-left':
                return 'e-resize';
            case 'circle-top':
            case 'circle-bottom':
                return 'n-resize';
            case 'line-start':
            case 'line-end':
            case 'line-move':
                return 'move';
            default:
                return 'default';
        }
    }
    
    /**
     * Convert screen delta to world coordinates
     */    screenToWorldDelta(deltaX, deltaY) {
        const vector = new THREE.Vector3();
        
        if (this.camera.isOrthographicCamera) {
            // For orthographic camera, use simple scaling
            const factor = (this.camera.right - this.camera.left) / this.renderer.domElement.clientWidth;            const result = {
                x: deltaX * factor,
                y: -deltaY * factor // Invert Y for screen coordinates
            };
            return result;
        } else {
            // For perspective camera, project to world plane
            const rect = this.renderer.domElement.getBoundingClientRect();
            const startMouse = new THREE.Vector2(
                ((this.handleStartPosition.x) / rect.width) * 2 - 1,
                -((this.handleStartPosition.y) / rect.height) * 2 + 1
            );
            const endMouse = new THREE.Vector2(
                ((this.handleStartPosition.x + deltaX) / rect.width) * 2 - 1,
                -((this.handleStartPosition.y + deltaY) / rect.height) * 2 + 1
            );
            
            // Project to XZ plane (Y = 0)
            const startWorld = this.screenToWorldPoint(startMouse);
            const endWorld = this.screenToWorldPoint(endMouse);
            
            return {
                x: endWorld.x - startWorld.x,
                y: endWorld.z - startWorld.z // Use Z as Y for 2D drawing
            };
        }
    }
    
    /**
     * Project screen coordinates to world XZ plane
     */
    screenToWorldPoint(screenCoords) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(screenCoords, this.camera);
        
        // Intersect with XZ plane (Y = 0)
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        
        return intersection;
    }
    
    /**
     * Update shape geometry based on handle drag
     */
    updateShapeFromHandle(worldDelta) {
        if (!this.selectedShape || !this.selectedHandle) return;
        
        const handleType = this.selectedHandle.userData.handleType;
        const bounds = this.shapeStartBounds;
        const newBounds = { ...bounds };
        
        switch (this.shapeStartBounds.type) {
            case 'rectangle':
                this.updateRectangleFromHandle(newBounds, handleType, worldDelta);
                break;
            case 'circle':
                this.updateCircleFromHandle(newBounds, handleType, worldDelta);
                break;
            case 'line':
                this.updateLineFromHandle(newBounds, handleType, worldDelta);
                break;
        }
        
        // Apply the new bounds to the shape
        this.updateShapeGeometry(this.selectedShape, newBounds);
    }
    
    /**
     * Update rectangle bounds from handle drag
     */    updateRectangleFromHandle(bounds, handleType, delta) {
            case 'corner-tl':
                bounds.startX += delta.x;
                bounds.startY += -delta.y; // Invert Y
                break;
            case 'corner-tr':
                bounds.endX += delta.x;
                bounds.startY += -delta.y; // Invert Y
                break;
            case 'corner-br':
                bounds.endX += delta.x;
                bounds.endY += -delta.y; // Invert Y
                break;
            case 'corner-bl':
                bounds.startX += delta.x;
                bounds.endY += -delta.y; // Invert Y
                break;
            case 'edge-top':
                bounds.startY += -delta.y; // Invert Y
                break;
            case 'edge-right':
                bounds.endX += delta.x;
                break;
            case 'edge-bottom':
                bounds.endY += -delta.y; // Invert Y
                break;
            case 'edge-left':
                bounds.startX += delta.x;
                break;
        }
        if (bounds.startY > bounds.endY) {
            const temp = bounds.startY;
            bounds.startY = bounds.endY;
            bounds.endY = temp;
        }
        if (bounds.startX > bounds.endX) {
            const temp = bounds.startX;
            bounds.startX = bounds.endX;
            bounds.endX = temp;
        }
    }
    
    /**
     * Update circle bounds from handle drag
     */
    updateCircleFromHandle(bounds, handleType, delta) {
        const centerX = bounds.startX;
        const centerY = bounds.startY;
        const currentRadius = Math.sqrt(
            Math.pow(bounds.endX - bounds.startX, 2) + 
            Math.pow(bounds.endY - bounds.startY, 2)
        );
        
        let newRadius = currentRadius;
        
        switch (handleType) {
            case 'circle-right':
                newRadius = Math.abs(bounds.endX + delta.x - centerX);
                bounds.endX = centerX + newRadius;
                bounds.endY = centerY;
                break;
            case 'circle-left':
                newRadius = Math.abs(bounds.endX + delta.x - centerX);
                bounds.endX = centerX - newRadius;
                bounds.endY = centerY;
                break;
            case 'circle-top':
                newRadius = Math.abs(bounds.endY + delta.y - centerY);
                bounds.endX = centerX;
                bounds.endY = centerY - newRadius;
                break;
            case 'circle-bottom':
                newRadius = Math.abs(bounds.endY + delta.y - centerY);
                bounds.endX = centerX;
                bounds.endY = centerY + newRadius;
                break;
        }
    }
    
    /**
     * Update line bounds from handle drag
     */
    updateLineFromHandle(bounds, handleType, delta) {
        switch (handleType) {
            case 'line-start':
                bounds.startX += delta.x;
                bounds.startY += delta.y;
                break;
            case 'line-end':
                bounds.endX += delta.x;
                bounds.endY += delta.y;
                break;
            case 'line-move':
                bounds.startX += delta.x;
                bounds.startY += delta.y;
                bounds.endX += delta.x;
                bounds.endY += delta.y;
                break;
        }
    }
    
    /**
     * Update the actual shape geometry with new bounds
     */
    updateShapeGeometry(shapeObject, newBounds) {
        // Update userData
        shapeObject.userData.startPoint = { x: newBounds.startX, y: newBounds.startY };
        shapeObject.userData.endPoint = { x: newBounds.endX, y: newBounds.endY };
        
        // Remove old geometry
        shapeObject.children.forEach(child => {
            child.geometry?.dispose();
            child.material?.dispose();
        });
        shapeObject.clear();
        
        // Recreate geometry based on type
        const lineWidth = this.getScaledLineWidth(0.2);
        
        switch (newBounds.type) {
            case 'rectangle':
                this.createRectangleGeometry(shapeObject, newBounds.startX, newBounds.startY, 
                                           newBounds.endX, newBounds.endY, lineWidth);
                break;
            case 'circle':
                this.createCircleGeometry(shapeObject, newBounds.startX, newBounds.startY, 
                                        newBounds.endX, newBounds.endY, lineWidth);
                break;
            case 'line':
                this.createLineGeometry(shapeObject, newBounds.startX, newBounds.startY, 
                                      newBounds.endX, newBounds.endY, lineWidth);
                break;
        }
        
        // Update selection visuals if they exist
        if (shapeObject.userData.selectionVisuals) {
            this.scene.remove(shapeObject.userData.selectionVisuals);
            // Dispose of old selection visuals
            shapeObject.userData.selectionVisuals.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            delete shapeObject.userData.selectionVisuals;
            
            // Recreate selection visuals
            this.createSelectionVisuals(shapeObject);
        }
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());        // Update dynamic grid system (less frequently)
        if (this.dynamicGrid) {
            this.dynamicGrid.update();
        }
        
        // Frame counter for occasional updates
        this.frameCount = (this.frameCount || 0) + 1;
        
        // Update camera height display
        this.updateCameraHeightDisplay();
        
        // Handle gizmo dragging
        if (this.isDraggingGizmo && this.selectedGizmo) {
            // Gizmo dragging would be handled here with mouse movement
            // For now, we'll keep it simple
        }
        
        this.renderer.render(this.scene, this.camera);
    }    /**
     * Update grid status display in UI
     */
    updateGridStatusDisplay() {
        const gridSizeSpan = document.getElementById('gridSize');
        if (gridSizeSpan && this.dynamicGrid) {
            const gridInfo = this.dynamicGrid.getGridInfo();
            gridSizeSpan.textContent = gridInfo;
        }
    }

    /**
     * Pan the camera based on mouse movement
     */    panCamera(deltaX, deltaY) {
        if (this.currentMode === 'sketch') {
            // For orthographic camera in sketch mode, pan along X and Z axes
            const factor = 0.01 * (1 / this.camera.zoom); // Scale pan speed with zoom level
            
            // Get camera's right and up vectors
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // For top-down view, right is -X and up is -Z
            const right = new THREE.Vector3(-1, 0, 0);
            const up = new THREE.Vector3(0, 0, -1);
            
            // Calculate pan offset
            const panOffset = new THREE.Vector3();
            panOffset.addScaledVector(right, -deltaX * factor);
            panOffset.addScaledVector(up, deltaY * factor);
            
            // Apply pan to camera position
            this.camera.position.add(panOffset);
            
        } else if (this.currentMode === 'modeling') {
            // For perspective camera in modeling mode, pan relative to the current view
            const factor = 0.005;
            
            // Get camera's right and up vectors
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            
            this.camera.getWorldDirection(new THREE.Vector3()); // Update matrix
            right.setFromMatrixColumn(this.camera.matrixWorld, 0);
            up.setFromMatrixColumn(this.camera.matrixWorld, 1);
            
            // Calculate pan offset
            const panOffset = new THREE.Vector3();
            panOffset.addScaledVector(right, -deltaX * factor);
            panOffset.addScaledVector(up, deltaY * factor);
            
            // Apply pan to camera position
            this.camera.position.add(panOffset);
        }
        
        // Update line widths after camera movement
        this.updateAllLineWidths();
        
        // Update camera height display
        this.updateCameraHeightDisplay();
    }
}

/**
 * Update cursor based on current state
 */
function updateCursor() {
    const canvas = window.cutListApp.renderer.domElement;
    
    // Check if Ctrl is pressed for panning
    if (event && event.ctrlKey) {
        canvas.style.cursor = 'grab';
    } else {
        // Default cursor based on current tool
        canvas.style.cursor = window.cutListApp.currentTool === 'select' ? 'default' : 'crosshair';
    }
}

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    window.cutListApp = new CutListApp();
    window.cutListApp.init();
});

// Expose toggle functions for buttons
window.toggleGrid = () => window.cutListApp?.toggleGrid();
window.toggleRulers = () => window.cutListApp?.toggleRulers();
window.toggleCrosshairs = () => window.cutListApp?.toggleCrosshairs();
