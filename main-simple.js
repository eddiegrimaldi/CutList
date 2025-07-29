class CutListApp {
    constructor() {
        this.selectedObjects = [];
        this.drawnObjects = [];
        this.currentMode = 'modeling';
        // Initialize scene, camera, renderer, etc.
        // Mouse interaction state for face manipulation
        this.isDraggingGizmo = false;
        this.selectedGizmo = null;
        this.dragStartPoint = new THREE.Vector3();
        this.originalGizmoPosition = new THREE.Vector3();
    }

    /**
     * Initialize Three.js and setup all interactions
     */
    initThreeJS() {
        // ...existing Three.js setup code...
        
        // Setup gizmo interactions after Three.js is initialized
        this.setupGizmoInteractions();
    }

    /**
     * Extrude selected 2D object(s) into 3D and make all 6 faces manipulatable
     */
    extrudeSelected() {
        if (this.selectedObjects.length === 0 || this.currentMode !== 'modeling') return;

        this.selectedObjects.forEach(obj => {
            const extrudedObject = this.createExtrudedObject(obj);
            if (extrudedObject) {
                this.scene.add(extrudedObject);
                this.drawnObjects.push(extrudedObject);
                
                // Add manipulatable face handles to all 6 sides
                this.addFaceGizmos(extrudedObject);
                
                // Remove original 2D object
                this.scene.remove(obj);
                const index = this.drawnObjects.indexOf(obj);
                if (index > -1) {
                    this.drawnObjects.splice(index, 1);
                }
            }
        });
        
        this.selectedObjects = [];
        this.updateSelectionStatus();
        
        // Show notification about face manipulation
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
        const geometry = new THREE.PlaneGeometry(
            Math.max(size.x * 0.8, 0.5), 
            Math.max(size.y * 0.8, 0.5)
        );
        const material = new THREE.MeshBasicMaterial({
            color: 0x90caf9,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const gizmo = new THREE.Mesh(geometry, material);
        
        // Position the gizmo on the face
        gizmo.position.copy(normal.clone().multiply(size.clone().multiplyScalar(0.51)));
        gizmo.lookAt(gizmo.position.clone().add(normal));
        
        // Store metadata for interaction
        gizmo.userData.isFaceGizmo = true;
        gizmo.userData.faceIndex = faceIndex;
        gizmo.userData.parentMesh = parentMesh;
        gizmo.userData.faceNormal = normal.clone();
        
        // Make gizmo slightly larger when hovered
        gizmo.userData.originalScale = gizmo.scale.clone();
        
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
            this.dragStartPoint.copy(intersect.point);
            this.originalGizmoPosition.copy(this.selectedGizmo.position);
            
            // Highlight the selected gizmo
            this.selectedGizmo.material.opacity = 0.5;
            e.preventDefault();
        }
    }

    /**
     * Handle mouse move for gizmo dragging
     */
    handleGizmoMouseMove(e) {
        if (!this.isDraggingGizmo || !this.selectedGizmo) return;

        const intersect = this.getGizmoIntersection(e);
        if (intersect) {
            const dragDistance = intersect.point.distanceTo(this.dragStartPoint);
            const normal = this.getFaceNormal(this.selectedGizmo.userData.faceIndex);
            
            // Calculate extrusion distance based on drag
            const extrusionAmount = dragDistance * 0.1; // Scale factor for sensitivity
            
            // Extrude the face in real-time
            this.extrudeFace(this.selectedGizmo.parent, this.selectedGizmo.userData.faceIndex, extrusionAmount);
        }
    }

    /**
     * Handle mouse up for gizmo interaction
     */
    handleGizmoMouseUp(e) {
        if (this.isDraggingGizmo && this.selectedGizmo) {
            // Reset gizmo appearance
            this.selectedGizmo.material.opacity = 0.15;
            
            // Finalize the extrusion
            this.finalizeFaceExtrusion();
            
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
    }

    /**
     * Enhanced face extrusion with better sensitivity and visual feedback
     */
    extrudeFace(parentMesh, faceIndex, amount) {
        if (!parentMesh.geometry || parentMesh.geometry.type !== 'BoxGeometry') return;

        const geometry = parentMesh.geometry;
        const parameters = geometry.parameters;
        
        // Clamp extrusion amount to reasonable values
        amount = Math.max(0.1, Math.min(amount, 5.0));
        
        // Create new geometry with modified dimensions
        let newWidth = parameters.width;
        let newHeight = parameters.height;
        let newDepth = parameters.depth;
        let positionOffset = new THREE.Vector3();
        
        switch (faceIndex) {
            case 0: // +X face
                newWidth += amount;
                positionOffset.x = amount / 2;
                break;
            case 1: // -X face
                newWidth += amount;
                positionOffset.x = -amount / 2;
                break;
            case 2: // +Y face
                newHeight += amount;
                positionOffset.y = amount / 2;
                break;
            case 3: // -Y face
                newHeight += amount;
                positionOffset.y = -amount / 2;
                break;
            case 4: // +Z face
                newDepth += amount;
                positionOffset.z = amount / 2;
                break;
            case 5: // -Z face
                newDepth += amount;
                positionOffset.z = -amount / 2;
                break;
        }

        // Update mesh position to keep it centered
        parentMesh.position.add(positionOffset);

        // Create new geometry and update the mesh
        const newGeometry = new THREE.BoxGeometry(
            Math.max(0.1, newWidth), 
            Math.max(0.1, newHeight), 
            Math.max(0.1, newDepth)
        );
        parentMesh.geometry.dispose();
        parentMesh.geometry = newGeometry;

        // Update gizmo positions
        this.updateGizmoPositions(parentMesh);
    }

    /**
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
            gizmo.position.copy(normal.clone().multiply(size.clone().multiplyScalar(0.5)));
            
            // Update gizmo size to match face
            gizmo.geometry.dispose();
            gizmo.geometry = new THREE.PlaneGeometry(size.x * 0.9, size.y * 0.9);
        });
    }

    /**
     * Finalize face extrusion operation
     */
    finalizeFaceExtrusion() {
        // Add any cleanup or finalization logic here
    }

    // Placeholder for createExtrudedObject method
    createExtrudedObject(obj) {
        // Implementation for creating an extruded object from the 2D shape
    }

    // Placeholder for updateSelectionStatus method
    updateSelectionStatus() {
        // Implementation for updating the selection status of objects
    }

    // Other methods and properties of CutListApp
}