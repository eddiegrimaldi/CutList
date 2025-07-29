// CutList - Stable 3D Application with 2D Sketching

class CutListApp {
    constructor() {
        
        // Application state
        this.currentMode = 'sketch'; // Start in sketch mode
        this.currentTool = 'select';
        this.gridVisible = true;
        
        // Drawing state
        this.drawnObjects = [];
        this.selectedObjects = [];
        this.isDrawing = false;
        this.drawingStartPoint = null;
        this.tempDrawingObject = null;
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.grid = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        
        // Face manipulation state
        this.isDraggingGizmo = false;
        this.selectedGizmo = null;
        this.dragStartPosition = { x: 0, y: 0 };
        this.lastExtrusionAmount = 0;
        
        // Mode-specific objects
        this.sketchObjects = [];
        this.modelingObjects = [];
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

        // Extrude button - only works in modeling mode
        document.getElementById('extrude-btn')?.addEventListener('click', () => {
            if (this.currentMode === 'modeling') {
                this.createNewCube();
            } else {
            }
        });

        // Clear canvas
        document.getElementById('clear-btn')?.addEventListener('click', () => {
            this.clearCanvas();
        });

        // Reset camera
        document.getElementById('reset-camera')?.addEventListener('click', () => {
            this.resetCamera();
        });
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
        this.raycaster = new THREE.Raycaster();

        // Setup controls
        this.setupControls();

        // Create grid
        this.createGrid();

        // Setup lighting
        this.setupLighting();

        // Start in sketch mode with drawing enabled
        this.switchMode('sketch');

        // Start render loop
        this.animate();

    }

    /**
     * Setup camera for current mode
     */
    setupCamera(width, height) {
        const aspect = width / height;
        
        if (this.currentMode === 'sketch') {
            // Orthographic camera for 2D sketch mode
            const size = 10;
            this.camera = new THREE.OrthographicCamera(
                -size * aspect, size * aspect,
                size, -size,
                0.1, 1000
            );
            this.camera.position.set(0, 0, 10);
            this.camera.lookAt(0, 0, 0);
        } else {
            // Perspective camera for 3D modeling mode
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
            this.camera.position.set(5, 5, 5);
            this.camera.lookAt(0, 0, 0);
        }
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
        this.updateObjectVisibility();

        // Update grid for mode
        this.updateGridForMode();

        // Setup appropriate interaction mode
        if (mode === 'sketch') {
            this.setup2DDrawing();
        } else {
            this.setupGizmoInteractions();
        }

        // Update instructions
        this.updateInstructions();
    }

    /**
     * Setup 2D drawing for sketch mode
     */
    setup2DDrawing() {
        const canvas = this.renderer.domElement;
        
        // Remove any existing gizmo listeners
        this.removeGizmoListeners();
        
        // Add drawing listeners
        this.setupDrawingListeners();
        
    }

    /**
     * Setup drawing event listeners
     */
    setupDrawingListeners() {
        const canvas = this.renderer.domElement;
        
        // Remove existing listeners
        this.removeDrawingListeners();
        
        // Add new listeners
        this.drawMouseDown = (e) => this.handleDrawMouseDown(e);
        this.drawMouseMove = (e) => this.handleDrawMouseMove(e);
        this.drawMouseUp = (e) => this.handleDrawMouseUp(e);
        
        canvas.addEventListener('mousedown', this.drawMouseDown);
        canvas.addEventListener('mousemove', this.drawMouseMove);
        canvas.addEventListener('mouseup', this.drawMouseUp);
    }

    /**
     * Remove drawing listeners
     */
    removeDrawingListeners() {
        const canvas = this.renderer.domElement;
        if (this.drawMouseDown) canvas.removeEventListener('mousedown', this.drawMouseDown);
        if (this.drawMouseMove) canvas.removeEventListener('mousemove', this.drawMouseMove);
        if (this.drawMouseUp) canvas.removeEventListener('mouseup', this.drawMouseUp);
    }

    /**
     * Handle drawing mouse down
     */
    handleDrawMouseDown(e) {
        if (this.currentMode !== 'sketch' || e.button !== 0) return;
        
        if (this.currentTool === 'rectangle' || this.currentTool === 'line') {
            this.isDrawing = true;
            this.drawingStartPoint = this.screenToWorld2D(e);
            
            this.createTempDrawingObject();
            
            e.preventDefault();
        }
    }

    /**
     * Handle drawing mouse move
     */
    handleDrawMouseMove(e) {
        if (this.currentMode !== 'sketch' || !this.isDrawing) return;
        
        const currentPoint = this.screenToWorld2D(e);
        this.updateTempDrawingObject(currentPoint);
    }

    /**
     * Handle drawing mouse up
     */
    handleDrawMouseUp(e) {
        if (this.currentMode !== 'sketch' || !this.isDrawing) return;
        
        const endPoint = this.screenToWorld2D(e);
        this.finalizeTempDrawingObject(endPoint);
        
        this.isDrawing = false;
        this.drawingStartPoint = null;
        this.tempDrawingObject = null;
    }

    /**
     * Convert screen to world coordinates for 2D drawing
     */
    screenToWorld2D(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        
        // Normalized device coordinates
        const ndc = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1
        };
        
        // Convert to world coordinates using orthographic camera
        const worldX = ndc.x * this.camera.right / this.camera.zoom;
        const worldY = ndc.y * this.camera.top / this.camera.zoom;
        
        return { x: worldX, y: worldY, z: 0 };
    }

    /**
     * Create temporary drawing object
     */
    createTempDrawingObject() {
        if (!this.drawingStartPoint) return;
        
        let geometry, material, mesh;
        
        if (this.currentTool === 'rectangle') {
            geometry = new THREE.PlaneGeometry(0.1, 0.1);
            material = new THREE.MeshBasicMaterial({ 
                color: 0x2196F3, 
                transparent: true, 
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(this.drawingStartPoint.x, this.drawingStartPoint.y, 0);
            
        } else if (this.currentTool === 'line') {
            const points = [
                new THREE.Vector3(this.drawingStartPoint.x, this.drawingStartPoint.y, 0),
                new THREE.Vector3(this.drawingStartPoint.x, this.drawingStartPoint.y, 0)
            ];
            geometry = new THREE.BufferGeometry().setFromPoints(points);
            material = new THREE.LineBasicMaterial({ color: 0x2196F3, linewidth: 2 });
            mesh = new THREE.Line(geometry, material);
        }
        
        if (mesh) {
            mesh.userData.isSketch = true;
            mesh.userData.isTemp = true;
            
            this.scene.add(mesh);
            this.tempDrawingObject = mesh;
        }
    }

    /**
     * Update temporary drawing object
     */
    updateTempDrawingObject(currentPoint) {
        if (!this.tempDrawingObject || !this.drawingStartPoint) return;
        
        const start = this.drawingStartPoint;
        const width = Math.abs(currentPoint.x - start.x);
        const height = Math.abs(currentPoint.y - start.y);
        
        if (this.currentTool === 'rectangle') {
            // Update rectangle
            const centerX = (start.x + currentPoint.x) / 2;
            const centerY = (start.y + currentPoint.y) / 2;
            
            this.tempDrawingObject.position.set(centerX, centerY, 0);
            this.tempDrawingObject.scale.set(width / 0.1, height / 0.1, 1);
            
        } else if (this.currentTool === 'line') {
            // Update line
            const points = [
                new THREE.Vector3(start.x, start.y, 0),
                new THREE.Vector3(currentPoint.x, currentPoint.y, 0)
            ];
            this.tempDrawingObject.geometry.setFromPoints(points);
        }
    }

    /**
     * Finalize temporary drawing object
     */
    finalizeTempDrawingObject(endPoint) {
        if (!this.tempDrawingObject || !this.drawingStartPoint) return;
        
        const start = this.drawingStartPoint;
        const width = Math.abs(endPoint.x - start.x);
        const height = Math.abs(endPoint.y - start.y);
        
        // Only keep if significant size
        if (width > 0.1 || height > 0.1) {
            // Finalize the object
            this.tempDrawingObject.userData.isTemp = false;
            this.tempDrawingObject.userData.endPoint = endPoint;
            
            // Change color to green when finalized
            if (this.tempDrawingObject.material.color) {
                this.tempDrawingObject.material.color.setHex(0x4CAF50);
                this.tempDrawingObject.material.opacity = 1.0;
            }
            
            this.sketchObjects.push(this.tempDrawingObject);
            this.drawnObjects.push(this.tempDrawingObject);
            
        } else {
            // Remove if too small
            this.scene.remove(this.tempDrawingObject);
            this.tempDrawingObject.geometry?.dispose();
            this.tempDrawingObject.material?.dispose();
        }
    }

    /**
     * Update object visibility based on mode
     */
    updateObjectVisibility() {
        this.drawnObjects.forEach(obj => {
            if (this.currentMode === 'sketch') {
                // Show sketch objects, hide 3D objects and gizmos
                obj.visible = obj.userData.isSketch || false;
                if (obj.userData.faceGizmos) {
                    obj.userData.faceGizmos.forEach(gizmo => gizmo.visible = false);
                }
            } else {
                // Show 3D objects and gizmos, hide sketch objects
                obj.visible = obj.userData.is3D || false;
                if (obj.userData.faceGizmos) {
                    obj.userData.faceGizmos.forEach(gizmo => gizmo.visible = true);
                }
            }
        });
    }

    /**
     * Update grid for current mode
     */
    updateGridForMode() {
        if (this.grid) {
            this.scene.remove(this.grid);
        }

        if (this.currentMode === 'sketch') {
            // 2D grid for sketch mode
            this.grid = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
            this.grid.rotation.x = Math.PI / 2; // Rotate to be flat
        } else {
            // 3D grid for modeling mode
            this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x888888);
        }
        
        this.scene.add(this.grid);
    }

    /**
     * Update instructions
     */
    updateInstructions() {
        const instruction = document.querySelector('.status-bar div:last-child');
        if (instruction) {
            if (this.currentMode === 'sketch') {
                instruction.innerHTML = '<strong>SKETCH MODE:</strong> Select Rectangle/Line tools and click-drag to draw 2D shapes';
            } else {
                instruction.innerHTML = '<strong>MODELING MODE:</strong> Click Extrude for cubes | Drag green spheres to modify faces';
            }
        }
    }

    // ============ 3D MODELING METHODS ============

    /**
     * Create new cube for modeling mode
     */
    createNewCube() {
        if (this.currentMode !== 'modeling') return;

        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5)
        });
        const cube = new THREE.Mesh(geometry, material);
        
        cube.position.set(
            (Math.random() - 0.5) * 6,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 6
        );
        
        cube.userData.is3D = true;
        
        this.scene.add(cube);
        this.drawnObjects.push(cube);
        this.addStableFaceGizmos(cube);
        
    }

    /**
     * Add face gizmos for 3D manipulation
     */
    addStableFaceGizmos(mesh) {
        if (!mesh.geometry || mesh.geometry.type !== 'BoxGeometry') return;
        
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        
        const facePositions = [
            { pos: [size.x/2 + 0.3, 0, 0], normal: [1, 0, 0], index: 0 },
            { pos: [-size.x/2 - 0.3, 0, 0], normal: [-1, 0, 0], index: 1 },
            { pos: [0, size.y/2 + 0.3, 0], normal: [0, 1, 0], index: 2 },
            { pos: [0, -size.y/2 - 0.3, 0], normal: [0, -1, 0], index: 3 },
            { pos: [0, 0, size.z/2 + 0.3], normal: [0, 0, 1], index: 4 },
            { pos: [0, 0, -size.z/2 - 0.3], normal: [0, 0, -1], index: 5 }
        ];
        
        mesh.userData.faceGizmos = [];
        
        facePositions.forEach(face => {
            const gizmo = this.createStableGizmo(mesh, face);
            mesh.add(gizmo);
            mesh.userData.faceGizmos.push(gizmo);
        });

        if (this.currentMode === 'modeling') {
            this.setupGizmoInteractions();
        }
    }

    /**
     * Create stable gizmo
     */
    createStableGizmo(parentMesh, faceData) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.8
        });
        const gizmo = new THREE.Mesh(geometry, material);
        
        gizmo.position.set(...faceData.pos);
        
        gizmo.userData.isFaceGizmo = true;
        gizmo.userData.faceIndex = faceData.index;
        gizmo.userData.parentMesh = parentMesh;
        gizmo.userData.faceNormal = new THREE.Vector3(...faceData.normal);
        gizmo.userData.originalColor = 0x4CAF50;
        
        return gizmo;
    }

    /**
     * Setup gizmo interactions for 3D mode
     */
    setupGizmoInteractions() {
        const canvas = this.renderer.domElement;
        
        // Remove drawing listeners
        this.removeDrawingListeners();
        this.removeGizmoListeners();
        
        // Add gizmo listeners
        this.gizmoMouseDown = (e) => this.handleGizmoMouseDown(e);
        this.gizmoMouseMove = (e) => this.handleGizmoMouseMove(e);
        this.gizmoMouseUp = (e) => this.handleGizmoMouseUp(e);
        
        canvas.addEventListener('mousedown', this.gizmoMouseDown);
        canvas.addEventListener('mousemove', this.gizmoMouseMove);
        canvas.addEventListener('mouseup', this.gizmoMouseUp);
        
    }

    /**
     * Remove gizmo listeners
     */
    removeGizmoListeners() {
        const canvas = this.renderer.domElement;
        if (this.gizmoMouseDown) canvas.removeEventListener('mousedown', this.gizmoMouseDown);
        if (this.gizmoMouseMove) canvas.removeEventListener('mousemove', this.gizmoMouseMove);
        if (this.gizmoMouseUp) canvas.removeEventListener('mouseup', this.gizmoMouseUp);
    }

    /**
     * Handle gizmo mouse down
     */
    handleGizmoMouseDown(e) {
        if (this.currentMode !== 'modeling' || e.button !== 0) return;
        
        const intersect = this.getGizmoIntersection(e);
        if (intersect && intersect.object.userData.isFaceGizmo) {
            this.isDraggingGizmo = true;
            this.selectedGizmo = intersect.object;
            this.dragStartPosition = { x: e.clientX, y: e.clientY };
            this.lastExtrusionAmount = 0;
            
            this.selectedGizmo.material.color.setHex(0xFF5722);
            
            e.preventDefault();
        }
    }

    /**
     * Handle gizmo mouse move  
     */
    handleGizmoMouseMove(e) {
        if (this.currentMode !== 'modeling') return;
        
        if (this.isDraggingGizmo && this.selectedGizmo) {
            const deltaY = (e.clientY - this.dragStartPosition.y) * 0.01;
            
            if (Math.abs(deltaY) > 0.05) {
                const extrusionAmount = deltaY - this.lastExtrusionAmount;
                const clampedAmount = Math.max(-0.2, Math.min(0.2, extrusionAmount));
                
                if (Math.abs(clampedAmount) > 0.01) {
                    this.performStableExtrusion(
                        this.selectedGizmo.userData.parentMesh,
                        this.selectedGizmo.userData.faceIndex,
                        clampedAmount
                    );
                    this.lastExtrusionAmount = deltaY;
                }
            }
        } else {
            this.updateHoverEffects(e);
        }
    }

    /**
     * Handle gizmo mouse up
     */
    handleGizmoMouseUp(e) {
        if (this.isDraggingGizmo && this.selectedGizmo) {
            this.selectedGizmo.material.color.setHex(this.selectedGizmo.userData.originalColor);
            
            this.isDraggingGizmo = false;
            this.selectedGizmo = null;
            this.lastExtrusionAmount = 0;
        }
    }

    /**
     * Get gizmo intersection
     */
    getGizmoIntersection(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const gizmos = [];
        this.drawnObjects.forEach(obj => {
            if (obj.userData.faceGizmos && obj.visible) {
                gizmos.push(...obj.userData.faceGizmos.filter(g => g.visible));
            }
        });

        const intersects = this.raycaster.intersectObjects(gizmos);
        return intersects.length > 0 ? intersects[0] : null;
    }

    /**
     * Update hover effects for gizmos
     */
    updateHoverEffects(e) {
        // Reset all gizmos
        this.drawnObjects.forEach(obj => {
            if (obj.userData.faceGizmos) {
                obj.userData.faceGizmos.forEach(gizmo => {
                    if (!this.isDraggingGizmo || gizmo !== this.selectedGizmo) {
                        gizmo.material.color.setHex(gizmo.userData.originalColor);
                        gizmo.scale.set(1, 1, 1);
                    }
                });
            }
        });
        
        // Highlight hovered gizmo
        const intersect = this.getGizmoIntersection(e);
        if (intersect && intersect.object.userData.isFaceGizmo) {
            intersect.object.material.color.setHex(0x2196F3);
            intersect.object.scale.set(1.3, 1.3, 1.3);
        }
    }

    /**
     * Perform stable extrusion
     */
    performStableExtrusion(parentMesh, faceIndex, amount) {
        if (!parentMesh.geometry || parentMesh.geometry.type !== 'BoxGeometry') return;
        
        const params = parentMesh.geometry.parameters;
        let newWidth = params.width;
        let newHeight = params.height;
        let newDepth = params.depth;
        
        switch (faceIndex) {
            case 0: case 1:
                newWidth = Math.max(0.1, newWidth + Math.abs(amount));
                break;
            case 2: case 3:
                newHeight = Math.max(0.1, newHeight + Math.abs(amount));
                break;
            case 4: case 5:
                newDepth = Math.max(0.1, newDepth + Math.abs(amount));
                break;
        }
        
        const newGeometry = new THREE.BoxGeometry(newWidth, newHeight, newDepth);
        parentMesh.geometry.dispose();
        parentMesh.geometry = newGeometry;
        
        this.updateGizmoPositions(parentMesh);
    }

    /**
     * Update gizmo positions after extrusion
     */
    updateGizmoPositions(mesh) {
        if (!mesh.userData.faceGizmos) return;
        
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        
        const positions = [
            [size.x/2 + 0.3, 0, 0],
            [-size.x/2 - 0.3, 0, 0],
            [0, size.y/2 + 0.3, 0],
            [0, -size.y/2 - 0.3, 0],
            [0, 0, size.z/2 + 0.3],
            [0, 0, -size.z/2 - 0.3]
        ];
        
        mesh.userData.faceGizmos.forEach((gizmo, i) => {
            gizmo.position.set(...positions[i]);
        });
    }

    // ============ COMMON METHODS ============

    /**
     * Setup camera controls
     */
    setupControls() {
        const canvas = this.renderer.domElement;
        let isRightMouseDown = false;
        let mouseX = 0, mouseY = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                isRightMouseDown = true;
                mouseX = e.clientX;
                mouseY = e.clientY;
                e.preventDefault();
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                isRightMouseDown = false;
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isRightMouseDown && this.currentMode === 'modeling') {
                const deltaX = e.clientX - mouseX;
                const deltaY = e.clientY - mouseY;
                
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaX * 0.01;
                spherical.phi += deltaY * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);
                
                mouseX = e.clientX;
                mouseY = e.clientY;
            }
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 1.1 : 0.9;
            
            if (this.currentMode === 'modeling') {
                this.camera.position.multiplyScalar(scale);
            } else {
                this.camera.zoom *= scale;
                this.camera.updateProjectionMatrix();
            }
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Create grid
     */
    createGrid() {
        this.updateGridForMode();
    }

    /**
     * Setup lighting
     */
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Select tool
     */
    selectTool(tool) {
        this.currentTool = tool;
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    }

    /**
     * Clear canvas
     */
    clearCanvas() {
        this.drawnObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.drawnObjects = [];
        this.sketchObjects = [];
        this.modelingObjects = [];
    }

    /**
     * Toggle grid
     */
    toggleGrid() {
        if (this.grid) {
            this.grid.visible = !this.grid.visible;
        }
    }

    /**
     * Reset camera
     */
    resetCamera() {
        if (this.currentMode === 'sketch') {
            this.camera.position.set(0, 0, 10);
            this.camera.lookAt(0, 0, 0);
            this.camera.zoom = 1;
            this.camera.updateProjectionMatrix();
        } else {
            this.camera.position.set(5, 5, 5);
            this.camera.lookAt(0, 0, 0);
        }
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    
    if (typeof THREE === 'undefined') {
        return;
    }
    
    try {
        const app = new CutListApp();
        app.init();
        
        window.cutListApp = app;
    } catch (error) {
    }
});
