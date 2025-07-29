// CutList - Stable 3D Application with Fixed Face Manipulation

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
        // Mode switching with proper functionality
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

        // Start in sketch mode
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

        // Update instructions
        this.updateInstructions();
    }

    /**
     * Update object visibility based on current mode
     */
    updateObjectVisibility() {
        this.drawnObjects.forEach(obj => {
            if (this.currentMode === 'sketch') {
                // In sketch mode, hide 3D objects and gizmos
                if (obj.userData.is3D) {
                    obj.visible = false;
                } else {
                    obj.visible = true;
                }
                // Hide all gizmos in sketch mode
                if (obj.userData.faceGizmos) {
                    obj.userData.faceGizmos.forEach(gizmo => {
                        gizmo.visible = false;
                    });
                }
            } else {
                // In modeling mode, show 3D objects and gizmos
                if (obj.userData.is3D) {
                    obj.visible = true;
                    // Show gizmos for 3D objects
                    if (obj.userData.faceGizmos) {
                        obj.userData.faceGizmos.forEach(gizmo => {
                            gizmo.visible = true;
                        });
                    }
                } else {
                    obj.visible = false;
                }
            }
        });
    }

    /**
     * Update grid appearance for current mode
     */
    updateGridForMode() {
        if (this.grid) {
            this.scene.remove(this.grid);
        }

        if (this.currentMode === 'sketch') {
            // 2D grid (just a simple reference)
            this.grid = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
            this.grid.rotation.x = Math.PI / 2;
        } else {
            // 3D grid
            this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x888888);
        }
        
        this.scene.add(this.grid);
    }

    /**
     * Update status instructions
     */
    updateInstructions() {
        const instruction = document.querySelector('.status-bar div:last-child');
        if (instruction) {
            if (this.currentMode === 'sketch') {
                instruction.innerHTML = '<strong>SKETCH MODE:</strong> Draw 2D shapes | Switch to Modeling to create 3D objects';
            } else {
                instruction.innerHTML = '<strong>MODELING MODE:</strong> Click Extrude for new cubes | Drag blue gizmos to extrude faces | Right-drag: Camera';
            }
        }
    }

    /**
     * Create a new cube (only in modeling mode)
     */
    createNewCube() {
        if (this.currentMode !== 'modeling') return;

        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.6, 0.5)
        });
        const cube = new THREE.Mesh(geometry, material);
        
        // Position randomly
        cube.position.set(
            (Math.random() - 0.5) * 6,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 6
        );
        
        cube.userData.is3D = true;
        
        this.scene.add(cube);
        this.drawnObjects.push(cube);
        
        // Add STABLE face gizmos
        this.addStableFaceGizmos(cube);
        
    }

    /**
     * Add stable, non-chaotic face gizmos
     */
    addStableFaceGizmos(mesh) {
        if (!mesh.geometry || mesh.geometry.type !== 'BoxGeometry') return;
        
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        
        const facePositions = [
            { pos: [size.x/2 + 0.3, 0, 0], normal: [1, 0, 0], index: 0 },  // +X
            { pos: [-size.x/2 - 0.3, 0, 0], normal: [-1, 0, 0], index: 1 }, // -X
            { pos: [0, size.y/2 + 0.3, 0], normal: [0, 1, 0], index: 2 },  // +Y
            { pos: [0, -size.y/2 - 0.3, 0], normal: [0, -1, 0], index: 3 }, // -Y
            { pos: [0, 0, size.z/2 + 0.3], normal: [0, 0, 1], index: 4 },  // +Z
            { pos: [0, 0, -size.z/2 - 0.3], normal: [0, 0, -1], index: 5 }  // -Z
        ];
        
        mesh.userData.faceGizmos = [];
        
        facePositions.forEach(face => {
            const gizmo = this.createStableGizmo(mesh, face);
            mesh.add(gizmo);
            mesh.userData.faceGizmos.push(gizmo);
        });

        // Setup gizmo interactions for this mesh
        this.setupGizmoInteractions();
    }

    /**
     * Create a stable gizmo that won't cause chaos
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
        
        // Store metadata
        gizmo.userData.isFaceGizmo = true;
        gizmo.userData.faceIndex = faceData.index;
        gizmo.userData.parentMesh = parentMesh;
        gizmo.userData.faceNormal = new THREE.Vector3(...faceData.normal);
        gizmo.userData.originalColor = 0x4CAF50;
        gizmo.userData.isBeingDragged = false;
        
        return gizmo;
    }

    /**
     * Setup stable gizmo interactions
     */
    setupGizmoInteractions() {
        const canvas = this.renderer.domElement;
        
        // Remove existing listeners to prevent duplicates
        canvas.removeEventListener('mousedown', this.boundMouseDown);
        canvas.removeEventListener('mousemove', this.boundMouseMove);
        canvas.removeEventListener('mouseup', this.boundMouseUp);
        
        // Bind methods to preserve 'this' context
        this.boundMouseDown = (e) => this.handleMouseDown(e);
        this.boundMouseMove = (e) => this.handleMouseMove(e);
        this.boundMouseUp = (e) => this.handleMouseUp(e);
        
        canvas.addEventListener('mousedown', this.boundMouseDown);
        canvas.addEventListener('mousemove', this.boundMouseMove);
        canvas.addEventListener('mouseup', this.boundMouseUp);
    }

    /**
     * Handle mouse down - STABLE version
     */
    handleMouseDown(e) {
        if (this.currentMode !== 'modeling') return;
        
        if (e.button === 0) { // Left click for gizmos
            const intersect = this.getGizmoIntersection(e);
            if (intersect && intersect.object.userData.isFaceGizmo) {
                
                this.isDraggingGizmo = true;
                this.selectedGizmo = intersect.object;
                this.dragStartPosition = { x: e.clientX, y: e.clientY };
                this.lastExtrusionAmount = 0;
                
                // Visual feedback
                this.selectedGizmo.material.color.setHex(0xFF5722);
                this.selectedGizmo.userData.isBeingDragged = true;
                
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }

    /**
     * Handle mouse move - STABLE version with controlled sensitivity
     */
    handleMouseMove(e) {
        if (this.currentMode !== 'modeling') return;
        
        if (this.isDraggingGizmo && this.selectedGizmo) {
            // Calculate drag distance with MUCH reduced sensitivity
            const deltaY = (e.clientY - this.dragStartPosition.y) * 0.01; // Very small multiplier
            
            // Only extrude if there's significant movement (prevents jitter)
            if (Math.abs(deltaY) > 0.05) {
                const extrusionAmount = deltaY - this.lastExtrusionAmount;
                
                // Clamp to prevent extreme changes
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
            // Handle hover effects
            this.updateHoverEffects(e);
        }
    }

    /**
     * Handle mouse up - STABLE version
     */
    handleMouseUp(e) {
        if (this.isDraggingGizmo && this.selectedGizmo) {
            // Reset gizmo appearance
            this.selectedGizmo.material.color.setHex(this.selectedGizmo.userData.originalColor);
            this.selectedGizmo.userData.isBeingDragged = false;
            
            
            this.isDraggingGizmo = false;
            this.selectedGizmo = null;
            this.lastExtrusionAmount = 0;
        }
    }

    /**
     * Perform stable extrusion without chaos
     */
    performStableExtrusion(parentMesh, faceIndex, amount) {
        if (!parentMesh.geometry || parentMesh.geometry.type !== 'BoxGeometry') return;
        
        const params = parentMesh.geometry.parameters;
        let newWidth = params.width;
        let newHeight = params.height;
        let newDepth = params.depth;
        
        // Apply extrusion based on face
        switch (faceIndex) {
            case 0: // +X
            case 1: // -X
                newWidth = Math.max(0.1, newWidth + Math.abs(amount));
                break;
            case 2: // +Y
            case 3: // -Y
                newHeight = Math.max(0.1, newHeight + Math.abs(amount));
                break;
            case 4: // +Z
            case 5: // -Z
                newDepth = Math.max(0.1, newDepth + Math.abs(amount));
                break;
        }
        
        // Update geometry
        const newGeometry = new THREE.BoxGeometry(newWidth, newHeight, newDepth);
        parentMesh.geometry.dispose();
        parentMesh.geometry = newGeometry;
        
        // Update gizmo positions
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
            [size.x/2 + 0.3, 0, 0],     // +X
            [-size.x/2 - 0.3, 0, 0],    // -X
            [0, size.y/2 + 0.3, 0],     // +Y
            [0, -size.y/2 - 0.3, 0],    // -Y
            [0, 0, size.z/2 + 0.3],     // +Z
            [0, 0, -size.z/2 - 0.3]     // -Z
        ];
        
        mesh.userData.faceGizmos.forEach((gizmo, i) => {
            gizmo.position.set(...positions[i]);
        });
    }

    /**
     * Update hover effects
     */
    updateHoverEffects(e) {
        if (this.currentMode !== 'modeling') return;
        
        // Reset all gizmos
        this.drawnObjects.forEach(obj => {
            if (obj.userData.faceGizmos) {
                obj.userData.faceGizmos.forEach(gizmo => {
                    if (!gizmo.userData.isBeingDragged) {
                        gizmo.material.color.setHex(gizmo.userData.originalColor);
                        gizmo.scale.set(1, 1, 1);
                    }
                });
            }
        });
        
        // Highlight hovered gizmo
        const intersect = this.getGizmoIntersection(e);
        if (intersect && intersect.object.userData.isFaceGizmo && !intersect.object.userData.isBeingDragged) {
            intersect.object.material.color.setHex(0x2196F3);
            intersect.object.scale.set(1.3, 1.3, 1.3);
        }
    }

    /**
     * Get gizmo intersection
     */
    getGizmoIntersection(e) {
        if (!this.camera || !this.raycaster) return null;

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
     * Setup camera controls
     */
    setupControls() {
        const canvas = this.renderer.domElement;
        let isRightMouseDown = false;
        let mouseX = 0, mouseY = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right mouse for camera
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
                
                // Orbit controls for 3D mode
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
     * Select drawing tool
     */
    selectTool(tool) {
        this.currentTool = tool;
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    }    /**
     * Clear all objects
     */
    clearCanvas() {
        this.drawnObjects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        this.drawnObjects = [];
        this.selectedObjects = [];
    }

    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        if (this.grid) {
            this.grid.visible = !this.grid.visible;
            this.gridVisible = this.grid.visible;
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

// Initialize when DOM is loaded
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
