// CutList 3D Drawing Application with Face Manipulation

class CutListApp {
    constructor() {
        
        // Application state
        this.currentPage = 'dashboard';
        this.currentMode = 'modeling';
        this.currentTool = 'select';
        this.currentPlane = 'xy';
        this.gridVisible = true;
        
        // Drawing state
        this.selectedObjects = [];
        this.drawnObjects = [];
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
        
        // Sketch planes
        this.sketchPlanes = {
            xy: null,
            xz: null,
            yz: null
        };
        
        // Mouse interaction state for face manipulation
        this.isDraggingGizmo = false;
        this.selectedGizmo = null;
        this.dragStartPoint = new THREE.Vector3();
        this.originalGizmoPosition = new THREE.Vector3();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.initThreeJS();
        this.showPage('world'); // Start directly in the world
    }

    /**
     * Setup event listeners for UI interactions
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
    }

    /**
     * Initialize Three.js and setup all interactions
     */
    initThreeJS() {
        
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            return;
        }

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f9fa);

        // Camera
        const width = canvas.clientWidth || 800;
        const height = canvas.clientHeight || 600;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Raycaster for mouse interactions
        this.raycaster = new THREE.Raycaster();

        // Setup controls
        this.setupControls();

        // Create grid
        this.createGrid();

        // Setup lighting
        this.setupLighting();

        // Setup gizmo interactions
        this.setupGizmoInteractions();

        // Create a test cube for demonstration
        this.createTestCube();

        // Start render loop
        this.animate();

    }    /**
     * Create a test cube to demonstrate face manipulation
     */
    createTestCube() {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
        const cube = new THREE.Mesh(geometry, material);
        
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        this.scene.add(cube);
        this.drawnObjects.push(cube);
        
        // Add face gizmos to the cube
        this.addFaceGizmos(cube);
        
    }

    /**
     * Setup basic camera controls
     */
    setupControls() {
        const canvas = this.renderer.domElement;
        let isMouseDown = false;
        let mouseX = 0, mouseY = 0;
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right mouse button for camera
                isMouseDown = true;
                mouseX = e.clientX;
                mouseY = e.clientY;
                e.preventDefault();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            // Simple orbit controls
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(this.camera.position);
            spherical.theta -= deltaX * 0.01;
            spherical.phi += deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
            
            this.camera.position.setFromSpherical(spherical);
            this.camera.lookAt(0, 0, 0);
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(scale);
        });

        // Disable context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Create 3D grid
     */
    createGrid() {
        if (this.grid) {
            this.scene.remove(this.grid);
        }
        
        this.grid = new THREE.GridHelper(20, 20, 0x444444, 0x888888);
        this.scene.add(this.grid);
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
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
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
     * Show different pages/views
     */
    showPage(pageId) {
        // This is simplified - in full app would handle page switching
    }

    /**
     * Switch between sketch and modeling modes
     */
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update UI to reflect mode change
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-mode`)?.classList.add('active');
    }

    /**
     * Select drawing tool
     */
    selectTool(tool) {
        this.currentTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    }

    /**
     * Clear all objects from the scene
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
     * Reset camera to default position
     */
    resetCamera() {
        if (this.camera) {
            this.camera.position.set(5, 5, 5);
            this.camera.lookAt(0, 0, 0);
        }
    }

    /**
     * Create an extruded object from a 2D shape (implementation needed)
     */
    createExtrudedObject(obj) {
        // For now, create a simple box as placeholder
        const geometry = new THREE.BoxGeometry(2, 2, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
        const extrudedMesh = new THREE.Mesh(geometry, material);
        
        extrudedMesh.castShadow = true;
        extrudedMesh.receiveShadow = true;
        
        return extrudedMesh;
    }

    /**
     * Update selection status (placeholder)
     */
    updateSelectionStatus() {
    }

    /**
     * Add manipulatable gizmos to all 6 faces of a box/cube
     */
    addFaceGizmos(mesh) {
        if (!mesh.geometry || mesh.geometry.type !== 'BoxGeometry') return;
        const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        const faceNormals = [
            new THREE.Vector3(1, 0, 0),  // +X
            new THREE.Vector3(-1, 0, 0), // -X
            new THREE.Vector3(0, 1, 0),  // +Y
            new THREE.Vector3(0, -1, 0), // -Y
            new THREE.Vector3(0, 0, 1),  // +Z
            new THREE.Vector3(0, 0, -1)  // -Z
        ];
        mesh.userData.faceGizmos = [];
        faceNormals.forEach((normal, i) => {
            const gizmo = this.createFaceGizmo(mesh, normal, size, i);
            mesh.add(gizmo);
            mesh.userData.faceGizmos.push(gizmo);
        });
    }    /**
     * Create a draggable gizmo for a face
     */
    createFaceGizmo(parentMesh, normal, size, faceIndex) {
        // Create a small cube gizmo instead of a plane for better visibility
        const gizmoSize = Math.min(size.x, size.y, size.z) * 0.15;
        const geometry = new THREE.BoxGeometry(gizmoSize, gizmoSize, gizmoSize);
        const material = new THREE.MeshBasicMaterial({
            color: 0x90caf9,
            transparent: true,
            opacity: 0.7
        });
        const gizmo = new THREE.Mesh(geometry, material);
        
        // Position the gizmo on the face center, slightly outward
        const offset = 0.6; // Push gizmo outside the face
        gizmo.position.copy(normal.clone().multiplyScalar((Math.max(size.x, size.y, size.z) / 2) + offset));
        
        // Store metadata for interaction
        gizmo.userData.isFaceGizmo = true;
        gizmo.userData.faceIndex = faceIndex;
        gizmo.userData.parentMesh = parentMesh;
        gizmo.userData.faceNormal = normal.clone();
        gizmo.userData.originalScale = gizmo.scale.clone();
        gizmo.userData.originalColor = 0x90caf9;
        
        return gizmo;
    }

    /**
     * Setup mouse event handling for face gizmo interactions
     */
    setupGizmoInteractions() {
        const canvas = this.renderer?.domElement;
        if (!canvas) return;

        canvas.addEventListener('mousedown', (e) => this.handleGizmoMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleGizmoMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleGizmoMouseUp(e));
    }    /**
     * Handle mouse down for gizmo interaction
     */
    handleGizmoMouseDown(e) {
        if (e.button !== 0) return; // Only left mouse button

        const intersect = this.getGizmoIntersection(e);
        if (intersect && intersect.object.userData.isFaceGizmo) {
            
            this.isDraggingGizmo = true;
            this.selectedGizmo = intersect.object;
            this.dragStartPoint.copy(intersect.point);
            this.originalGizmoPosition.copy(this.selectedGizmo.position);
            
            // Highlight the selected gizmo
            this.selectedGizmo.material.color.setHex(0xff6b6b);
            this.selectedGizmo.material.opacity = 1.0;
            
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Handle mouse move for gizmo dragging
     */
    handleGizmoMouseMove(e) {
        if (!this.isDraggingGizmo || !this.selectedGizmo) {
            // Check for gizmo hover effects
            const intersect = this.getGizmoIntersection(e);
            this.updateGizmoHoverEffects(intersect);
            return;
        }

        // Calculate drag distance using screen coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const currentMouse = {
            x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((e.clientY - rect.top) / rect.height) * 2 + 1
        };
        
        // Simple distance calculation for extrusion
        const mouseDelta = Math.sqrt(
            Math.pow(currentMouse.x - this.dragStartPoint.x, 2) + 
            Math.pow(currentMouse.y - this.dragStartPoint.y, 2)
        );
        
        // Determine drag direction (positive or negative)
        const dragDirection = currentMouse.y > this.dragStartPoint.y ? 1 : -1;
        const extrusionAmount = mouseDelta * dragDirection * 5; // Scale factor
        
        // Extrude the face
        if (Math.abs(extrusionAmount) > 0.01) {
            this.extrudeFace(
                this.selectedGizmo.userData.parentMesh, 
                this.selectedGizmo.userData.faceIndex, 
                extrusionAmount
            );
        }
    }

    /**
     * Update gizmo hover effects
     */
    updateGizmoHoverEffects(intersect) {
        // Reset all gizmos to normal state
        this.drawnObjects.forEach(obj => {
            if (obj.userData.faceGizmos) {
                obj.userData.faceGizmos.forEach(gizmo => {
                    if (!this.isDraggingGizmo || gizmo !== this.selectedGizmo) {
                        gizmo.material.color.setHex(gizmo.userData.originalColor);
                        gizmo.material.opacity = 0.7;
                        gizmo.scale.copy(gizmo.userData.originalScale);
                    }
                });
            }
        });
        
        // Highlight hovered gizmo
        if (intersect && intersect.object.userData.isFaceGizmo) {
            const gizmo = intersect.object;
            gizmo.material.color.setHex(0x4fc3f7);
            gizmo.material.opacity = 0.9;
            gizmo.scale.multiplyScalar(1.2);
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
        if (!this.camera || !this.raycaster) return null;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get all gizmos from all objects
        const gizmos = [];
        this.drawnObjects.forEach(obj => {
            if (obj.userData.faceGizmos) {
                gizmos.push(...obj.userData.faceGizmos);
            }
        });

        const intersects = this.raycaster.intersectObjects(gizmos);
        return intersects.length > 0 ? intersects[0] : null;
    }

    /**
     * Get face normal vector by face index
     */
    getFaceNormal(faceIndex) {
        const normals = [
            new THREE.Vector3(1, 0, 0),  // +X
            new THREE.Vector3(-1, 0, 0), // -X
            new THREE.Vector3(0, 1, 0),  // +Y
            new THREE.Vector3(0, -1, 0), // -Y
            new THREE.Vector3(0, 0, 1),  // +Z
            new THREE.Vector3(0, 0, -1)  // -Z
        ];
        return normals[faceIndex] || new THREE.Vector3(0, 0, 1);
    }    /**
     * Enhanced face extrusion with better sensitivity and visual feedback
     */
    extrudeFace(parentMesh, faceIndex, amount) {
        if (!parentMesh.geometry || parentMesh.geometry.type !== 'BoxGeometry') return;

        const geometry = parentMesh.geometry;
        const parameters = geometry.parameters;
        
        // Clamp extrusion amount to reasonable values
        amount = Math.max(-2, Math.min(amount, 5.0));
        
        // Prevent negative dimensions
        let newWidth = Math.max(0.1, parameters.width);
        let newHeight = Math.max(0.1, parameters.height);
        let newDepth = Math.max(0.1, parameters.depth);
        let positionOffset = new THREE.Vector3();
        
        switch (faceIndex) {
            case 0: // +X face
                newWidth = Math.max(0.1, parameters.width + amount);
                positionOffset.x = amount / 2;
                break;
            case 1: // -X face
                newWidth = Math.max(0.1, parameters.width + amount);
                positionOffset.x = -amount / 2;
                break;
            case 2: // +Y face
                newHeight = Math.max(0.1, parameters.height + amount);
                positionOffset.y = amount / 2;
                break;
            case 3: // -Y face
                newHeight = Math.max(0.1, parameters.height + amount);
                positionOffset.y = -amount / 2;
                break;
            case 4: // +Z face
                newDepth = Math.max(0.1, parameters.depth + amount);
                positionOffset.z = amount / 2;
                break;
            case 5: // -Z face
                newDepth = Math.max(0.1, parameters.depth + amount);
                positionOffset.z = -amount / 2;
                break;
        }

        // Update mesh position to keep it centered
        parentMesh.position.add(positionOffset);

        // Create new geometry and update the mesh
        const newGeometry = new THREE.BoxGeometry(newWidth, newHeight, newDepth);
        parentMesh.geometry.dispose();
        parentMesh.geometry = newGeometry;

        // Update gizmo positions
        this.updateGizmoPositions(parentMesh);
    }/**
     * Update gizmo positions after mesh modification
     */
    updateGizmoPositions(mesh) {
        if (!mesh.userData.faceGizmos) return;

        const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        const faceNormals = [
            new THREE.Vector3(1, 0, 0),  // +X
            new THREE.Vector3(-1, 0, 0), // -X
            new THREE.Vector3(0, 1, 0),  // +Y
            new THREE.Vector3(0, -1, 0), // -Y
            new THREE.Vector3(0, 0, 1),  // +Z
            new THREE.Vector3(0, 0, -1)  // -Z
        ];

        mesh.userData.faceGizmos.forEach((gizmo, i) => {
            const normal = faceNormals[i];
            const offset = 0.6;
            gizmo.position.copy(normal.clone().multiplyScalar((Math.max(size.x, size.y, size.z) / 2) + offset));
            
            // Update gizmo size based on face size
            const newGizmoSize = Math.min(size.x, size.y, size.z) * 0.15;
            gizmo.scale.setScalar(newGizmoSize / gizmo.geometry.parameters.width);
        });
    }

    /**
     * Finalize face extrusion operation
     */
    finalizeFaceExtrusion() {
        // Add any cleanup or finalization logic here
    }    /**
     * Extrude selected 2D object(s) into 3D and make all 6 faces manipulatable
     */
    extrudeSelected() {
        
        // For demo purposes, create a new cube that can be face-manipulated
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const material = new THREE.MeshLambertMaterial({ color: 0xFF5722 });
        const cube = new THREE.Mesh(geometry, material);
        
        // Position it randomly
        cube.position.set(
            (Math.random() - 0.5) * 4,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 4
        );
        
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        this.scene.add(cube);
        this.drawnObjects.push(cube);
        
        // Add face gizmos
        this.addFaceGizmos(cube);
        
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    if (typeof THREE === 'undefined') {
        return;
    }
    
    try {
        const app = new CutListApp();
        app.init();
        
        // Make app globally accessible for debugging
        window.cutListApp = app;
        
    } catch (error) {
    }
});