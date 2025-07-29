// src/modules/extrusionGizmo.js - v20250704_ABSOLUTELY_MASSIVE FACE EXTRUSION INTEGRATION


// Report version to the global version reporter
const reportVersion = () => {
    if (window.VersionReporter) {
        window.VersionReporter.report('extrusionGizmo.js', 'v20250704_ABSOLUTELY_MASSIVE', 'success');
        return true;
    }
    return false;
};

// Try to report immediately, or wait for VersionReporter to be ready
if (!reportVersion()) {
    const checkInterval = setInterval(() => {
        if (reportVersion()) {
            clearInterval(checkInterval);
        }
    }, 50);
    setTimeout(() => clearInterval(checkInterval), 5000);
}

export default class ExtrusionGizmo {
    // Constants - Smaller and more refined for better appearance
    SHAFT_DIAMETER = 0.8;      // Reduced from 2.0 for cleaner look
    SHAFT_LENGTH = 3.0;        // Reduced from 6.0  
    CONE_DIAMETER = 1.5;       // Reduced from 3.0 for better proportions
    CONE_HEIGHT = 1.5;         // Reduced from 3.0
    
    // Invisible collision helpers for easier picking - INCREASED for better grabability
    COLLISION_DIAMETER = 4.0;  // Increased back for easier clicking
    COLLISION_HEIGHT = 4.0;    // Increased back for easier clicking
    GIZMO_COLOR = new BABYLON.Color3(0.2, 0.4, 1.0); // Blue color as requested
    HOVER_COLOR = new BABYLON.Color3(0.4, 0.8, 1.0);   // Light blue for hover

    scene;
    attachedMesh;
    gizmoManager; 
    gizmoContainer; 

    onExtrude; // BABYLON.Observable

    // Pointer interaction state
    _pointerObserver = null;
    _isDragging = false;
    _currentPickedCone = null; 
    _initialPointerScreenY = 0;
    _initialPointerScreenX = 0; // Store initial X coordinate for proper projection
    _gizmoMaterial;

    // === SPANKY'S FACE EXTRUSION ENHANCEMENT ===
    _faceExtrusionMode = false;
    _extrusionStartInfo = null;
    _initialMouseY = 0;
    _initialMouseX = 0;
    // === END FACE EXTRUSION VARS ===

    constructor(attachedMesh, scene, clickInfo = null) {
        this.scene = scene;
        this.attachedMesh = attachedMesh;
        this.clickInfo = clickInfo;
        this.onExtrude = new BABYLON.Observable();

        // Enhanced material setup for better visual feedback
        this._gizmoMaterial = new BABYLON.StandardMaterial("extrusionGizmoMat", this.scene);
        this._gizmoMaterial.diffuseColor = this.GIZMO_COLOR;
        this._gizmoMaterial.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4); // More reflective
        this._gizmoMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.5); // Slight glow
        this._gizmoMaterial.disableLighting = false; // Allow lighting for better 3D appearance
        
        // Create hover material for visual feedback
        this._hoverMaterial = new BABYLON.StandardMaterial("extrusionGizmoHoverMat", this.scene);
        this._hoverMaterial.diffuseColor = this.HOVER_COLOR;
        this._hoverMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        this._hoverMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.6); // Brighter glow on hover
        this._hoverMaterial.disableLighting = false;

        this._createGizmoVisuals();
        this._setupPointerInteractions();
        
        // SPANKY FIX: Don't automatically show the gizmo in constructor
        // Let startFaceExtrusion() or other methods handle the initial positioning
        if (this.gizmoContainer) {
            this.gizmoContainer.setEnabled(false); 
        }

    }

    // === SPANKY'S FACE EXTRUSION METHODS ===
    
    /**
     * Determines face normal from face ID for box meshes
     */
    _getFaceNormalFromFaceId(faceId) {
        
        if (faceId === undefined || faceId === null) {
            return new BABYLON.Vector3(0, 1, 0);
        }
        
        // Box face normal mapping (standard Babylon.js box)
        const boxNormals = [
            new BABYLON.Vector3(0, 0, 1),   // Front (faces 0-1)
            new BABYLON.Vector3(0, 0, -1),  // Back (faces 2-3)
            new BABYLON.Vector3(1, 0, 0),   // Right (faces 4-5)
            new BABYLON.Vector3(-1, 0, 0),  // Left (faces 6-7)
            new BABYLON.Vector3(0, 1, 0),   // Top (faces 8-9)
            new BABYLON.Vector3(0, -1, 0)   // Bottom (faces 10-11)
        ];
        
        const normalIndex = Math.floor(faceId / 2);
        const normal = boxNormals[normalIndex] || new BABYLON.Vector3(0, 1, 0);
        
        return normal;
    }

    /**
     * Starts face-based extrusion mode - SPANKY'S WORKING PROTOTYPE LOGIC
     */
    startFaceExtrusion(pickInfo) {
        if (!pickInfo || !pickInfo.hit || !pickInfo.pickedMesh) {
            return false;
        }

        this._faceExtrusionMode = true;
        
        // MASTER - Use the exact same face normal logic from our working prototype
        const faceNormal = this._getFaceNormalFromFaceId(pickInfo.faceId);
        
        // Store extrusion info exactly like the working prototype
        this._extrusionStartInfo = {
            mesh: this.attachedMesh,
            faceNormal: faceNormal.clone(),
            initialScale: this.attachedMesh.scaling.clone(),
            initialPosition: this.attachedMesh.position.clone(),
            initialPointerPos: pickInfo.pickedPoint.clone(),
            initialMouseX: this.scene.pointerX,  // SPANKY FIX: Store initial mouse position
            initialMouseY: this.scene.pointerY   // SPANKY FIX: Store initial mouse position
        };

        // SPANKY FIX: Use the show() method which has all the enhanced positioning logic
        // This will properly use this.clickInfo to position the gizmo
        this.show();

        return true;
    }

    /**
     * Handles face extrusion drag logic - SPANKY'S WORKING PROTOTYPE LOGIC
     * Master, this is the exact logic from our perfectly working prototype!
     */
    _handleFaceExtrusionDrag(pointerX, pointerY) {
        if (!this._extrusionStartInfo) return;

        const { mesh, faceNormal, initialScale, initialPosition } = this._extrusionStartInfo;

        // Calculate the mouse movement in both X and Y - EXACT PROTOTYPE LOGIC
        const mouseDeltaX = pointerX - this._initialMouseX;
        const mouseDeltaY = pointerY - this._initialMouseY;
        
        // Get camera's right and up vectors in world space - EXACT PROTOTYPE LOGIC
        const camera = this.scene.activeCamera;
        const cameraMatrix = camera.getWorldMatrix();
        const cameraRight = new BABYLON.Vector3(cameraMatrix.m[0], cameraMatrix.m[1], cameraMatrix.m[2]);
        const cameraUp = new BABYLON.Vector3(cameraMatrix.m[4], cameraMatrix.m[5], cameraMatrix.m[6]);
        
        // Project the face normal onto the camera's right and up vectors - EXACT PROTOTYPE LOGIC
        const rightProjection = Math.abs(BABYLON.Vector3.Dot(faceNormal, cameraRight));
        const upProjection = Math.abs(BABYLON.Vector3.Dot(faceNormal, cameraUp));
        
        // Use the dominant direction for mouse input - EXACT PROTOTYPE LOGIC
        let effectiveMouseDelta;
        if (rightProjection > upProjection) {
            // Face is more aligned with camera right, use X movement
            effectiveMouseDelta = mouseDeltaX;
        } else {
            // Face is more aligned with camera up, use Y movement
            effectiveMouseDelta = mouseDeltaY;
        }
        
        // Get the camera's forward direction and up direction for direction calculation - EXACT PROTOTYPE LOGIC
        const cameraForward = camera.getForwardRay().direction;
        const normalCameraForwardDot = BABYLON.Vector3.Dot(faceNormal, cameraForward);
        const normalCameraUpDot = BABYLON.Vector3.Dot(faceNormal, cameraUp);
        
        // Determine direction multiplier - EXACT PROTOTYPE LOGIC
        let directionMultiplier;
        if (rightProjection > upProjection) {
            // For X movement, check if we need to flip based on normal direction
            const rightDot = BABYLON.Vector3.Dot(faceNormal, cameraRight);
            directionMultiplier = rightDot > 0 ? -1 : 1;  // Flipped
        } else {
            // For Y movement, use dot product with camera up vector
            // Special handling: top and bottom faces (Y=±1) need to be flipped
            if (Math.abs(faceNormal.y) > 0.9) {
                // This is top or bottom face - both need flipped logic
                directionMultiplier = normalCameraUpDot > 0 ? 1 : -1;  // Flipped for top/bottom faces
            } else {
                // All other faces using Y movement (front/back)
                directionMultiplier = normalCameraUpDot > 0 ? -1 : 1;
            }
        }
        
        const extrusionAmount = -effectiveMouseDelta * 0.01 * directionMultiplier;

        // Determine which axis to scale based on the normal - EXACT PROTOTYPE LOGIC
        const absNormal = new BABYLON.Vector3(Math.abs(faceNormal.x), Math.abs(faceNormal.y), Math.abs(faceNormal.z));
        
        let scaleAxis;
        if (absNormal.x > 0.9) scaleAxis = 'x';
        else if (absNormal.y > 0.9) scaleAxis = 'y';
        else scaleAxis = 'z';

        // Apply scaling (box size is 2, so we divide by 2 to get the scale factor) - EXACT PROTOTYPE LOGIC
        const newScale = Math.max(0.1, initialScale[scaleAxis] + extrusionAmount / 2.0); // Prevent negative scaling
        mesh.scaling[scaleAxis] = newScale;

        // Move the box to keep the opposite face anchored - EXACT PROTOTYPE LOGIC
        const positionOffset = faceNormal.scale(extrusionAmount / 2.0);
        mesh.position.copyFrom(initialPosition).addInPlace(positionOffset);

        // Notify observers of extrusion
        this.onExtrude.notifyObservers({
            mesh: mesh,
            amount: extrusionAmount,
            faceNormal: faceNormal
        });
    }

    // === MASTER'S DYNAMIC GIZMO POSITIONING ===
    
    /**
     * Updates gizmo position during extrusion to stay with the extruding face
     */
    _updateGizmoPosition(extrusionAmount) {
        if (!this.gizmoContainer || !this._extrusionStartInfo || !this.clickInfo) return;
        
        const { faceNormal } = this._extrusionStartInfo;
        
        // Calculate new position: original clicked point + extrusion movement + gizmo offset
        const extrusionOffset = faceNormal.scale(extrusionAmount / 2.0);  // Half because we move the mesh center
        const gizmoOffset = faceNormal.scale(10.0);  // Keep gizmo 10 units off the face
        
        const newGizmoPosition = this.clickInfo.pickedPoint
            .add(extrusionOffset)  // Move with the extruding face
            .add(gizmoOffset);     // Stay offset from the surface
        
        this.gizmoContainer.position = newGizmoPosition;
    }
    
    // === END DYNAMIC POSITIONING ===

    // === END FACE EXTRUSION METHODS ===

    _createGizmoVisuals() {
        // MASTER - USE EXACT WORKING LOGIC FROM Tool_Extrude.html!
        this.gizmoContainer = new BABYLON.TransformNode("extrusionGizmoContainer", this.scene);
        this.gizmoContainer.isPickable = false;

        // MASTER - ABSOLUTELY MASSIVE GIZMO - NO WAY TO MISS IT!
        const shaft = BABYLON.MeshBuilder.CreateCylinder("gizmoShaft", {
            diameter: 2.0,  // ABSOLUTELY MASSIVE: was 0.8
            height: 15.0    // ABSOLUTELY MASSIVE: was 8.0
        }, this.scene);
        shaft.parent = this.gizmoContainer;
        shaft.position.y = 7.5;  // ABSOLUTELY MASSIVE: was 4.0
        shaft.material = this._gizmoMaterial;
        shaft.isPickable = true;
        shaft.name = "extrusionGizmo_shaft";
        
        // MASTER - ABSOLUTELY MASSIVE CONE - IMPOSSIBLE TO MISS!
        const topCone = BABYLON.MeshBuilder.CreateCylinder("gizmoCone", {
            diameterTop: 0,
            diameterBottom: 4.0,  // ABSOLUTELY MASSIVE: was 2.5
            height: 6.0           // ABSOLUTELY MASSIVE: was 4.0
        }, this.scene);
        topCone.parent = this.gizmoContainer;
        topCone.position.y = 18.0;  // ABSOLUTELY MASSIVE: was 10.0
        topCone.material = this._gizmoMaterial;
        topCone.isPickable = true;
        topCone.metadata = { isGizmoCone: true };
        topCone.name = "extrusionGizmo_topCone";
        
        // Store references for hover effects
        this._shaft = shaft;
        this._topCone = topCone;
        this._bottomCone = null; // No bottom cone in working prototype!
        this._mainCollision = topCone; // Use the cone itself for collision
        
        // Store all pickable components for custom picking
        this._allPickableComponents = [shaft, topCone];
        
        // Ensure it's disabled by default
        this.gizmoContainer.setEnabled(false); 
        
    }

    show() {
        if (!this.gizmoContainer || !this.attachedMesh) {
            if (this.gizmoContainer) this.gizmoContainer.setEnabled(false);
            return;
        }

        this.gizmoContainer.setEnabled(true);

        // MASTER - USE EXACT WORKING POSITIONING FROM Tool_Extrude.html!
        let gizmoPosition;
        let faceNormal = null;
        
        if (this.clickInfo && this.clickInfo.hit && this.clickInfo.pickedPoint) {
            faceNormal = this._getFaceNormalFromFaceId(this.clickInfo.faceId);
            
            // MASTER - ABSOLUTELY MASSIVE OFFSET - GIZMO FAR FROM SURFACE!
            gizmoPosition = this.clickInfo.pickedPoint.add(faceNormal.scale(10.0));  // ABSOLUTELY MASSIVE: was 5.0
            
        } else {
            // Fallback to mesh center if no click info
            gizmoPosition = this.attachedMesh.getAbsolutePosition();
            faceNormal = new BABYLON.Vector3(0, 1, 0);
        }
        
        this.gizmoContainer.position = gizmoPosition;
        
        // EXACT WORKING ORIENTATION FROM PROTOTYPE
        if (faceNormal) {
            const up = new BABYLON.Vector3(0, 1, 0);
            if (!faceNormal.equals(up)) {
                const rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(up, faceNormal, new BABYLON.Quaternion());
                this.gizmoContainer.rotationQuaternion = rotationQuaternion;
            }
        }
        
    }    hide() {
        if (this.gizmoContainer) {
            this.gizmoContainer.setEnabled(false);
        }
    }    updatePosition(extrusionHeight) {
        if (!this.gizmoContainer || !this.attachedMesh) return;
        
        // FIXED: Update position along sketch plane normal, not just world Y
        const meshPosition = this.attachedMesh.getAbsolutePosition();
        
        // Get extrusion normal from mesh metadata
        let extrusionNormal = new BABYLON.Vector3(0, 1, 0); // Default to world Y
        if (this.attachedMesh.metadata && this.attachedMesh.metadata.extrusionNormal) {
            extrusionNormal = new BABYLON.Vector3(
                this.attachedMesh.metadata.extrusionNormal.x,
                this.attachedMesh.metadata.extrusionNormal.y,
                this.attachedMesh.metadata.extrusionNormal.z
            );
        }
        
        // Position gizmo at mesh center + offset along extrusion normal
        const gizmoOffset = 2.5; // Distance above the extruded surface
        const totalOffset = (extrusionHeight / 2) + gizmoOffset;
        
        this.gizmoContainer.position = meshPosition.add(extrusionNormal.scale(totalOffset));
        
    }

    // Helper method to check if a mesh is part of this gizmo
    _isGizmoMesh(mesh) {
        if (!mesh || !this.gizmoContainer) return false;
        
        // Check if the mesh name contains "extrusionGizmo"
        const isGizmoByName = mesh.name && mesh.name.includes("extrusionGizmo");
        
        // Check if the mesh is a child of the gizmo container
        let parent = mesh.parent;
        while (parent) {
            if (parent === this.gizmoContainer) return true;
            parent = parent.parent;
        }
          return isGizmoByName;
    }

    // Custom picking method that prioritizes gizmo components
    _customPick(pointerInfo) {
        const x = pointerInfo.event.clientX;
        const y = pointerInfo.event.clientY;
        
        // First, try to pick only gizmo components
        const gizmoPickInfo = this.scene.pick(x, y, (mesh) => {
            return this._isGizmoMesh(mesh);
        });
        
        if (gizmoPickInfo && gizmoPickInfo.hit && gizmoPickInfo.pickedMesh) {
            return gizmoPickInfo.pickedMesh;
        }
        
        // Fallback to standard picking
        const standardPickInfo = pointerInfo.pickInfo;
        return standardPickInfo && standardPickInfo.pickedMesh ? standardPickInfo.pickedMesh : null;
    }

    attachToMesh(mesh) {
        this.attachedMesh = mesh;
        if (mesh) {
            this.show(); // This will position and enable the gizmo
        } else {
            this.hide();
        }
    }

    _setupPointerInteractions() {
        // MASTER - DON'T override scene events! Use pointer observer but make it work like prototype
        // The main app already handles face clicking, we just need to handle gizmo dragging
        
        this._pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.gizmoContainer || !this.gizmoContainer.isEnabled()) {
                return;
            }

            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && 
                        pointerInfo.pickInfo.pickedMesh.metadata && 
                        pointerInfo.pickInfo.pickedMesh.metadata.isGizmoCone) {
                        
                        
                        // Only proceed if we have extrusion info already set up
                        if (!this._extrusionStartInfo) {
                            return;
                        }
                        
                        this._isDragging = true;
                        this._initialMouseX = this._extrusionStartInfo.initialMouseX; // SPANKY FIX: Use stored initial position
                        this._initialMouseY = this._extrusionStartInfo.initialMouseY; // SPANKY FIX: Use stored initial position

                        // Detach camera to prevent rotation during drag - EXACT PROTOTYPE LOGIC
                        this.scene.activeCamera.detachControl(this.scene.getEngine().getRenderingCanvas());
                        
                        // Prevent event from bubbling to main app
                        pointerInfo.event.preventDefault();
                        pointerInfo.event.stopPropagation();
                    }
                    break;

                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if (this._isDragging && this._extrusionStartInfo) {
                        // EXACT PROTOTYPE LOGIC - Use scene.pointerX/Y directly
                        const { mesh, faceNormal, initialScale, initialPosition } = this._extrusionStartInfo;

                        // Calculate the mouse movement in both X and Y - EXACT PROTOTYPE LOGIC
                        const mouseDeltaX = this.scene.pointerX - this._extrusionStartInfo.initialMouseX;
                        const mouseDeltaY = this.scene.pointerY - this._extrusionStartInfo.initialMouseY;
                        
                        // EXACT PROTOTYPE CAMERA PROJECTION LOGIC
                        const camera = this.scene.activeCamera;
                        const cameraMatrix = camera.getWorldMatrix();
                        const cameraRight = new BABYLON.Vector3(cameraMatrix.m[0], cameraMatrix.m[1], cameraMatrix.m[2]);
                        const cameraUp = new BABYLON.Vector3(cameraMatrix.m[4], cameraMatrix.m[5], cameraMatrix.m[6]);
                        
                        const rightProjection = Math.abs(BABYLON.Vector3.Dot(faceNormal, cameraRight));
                        const upProjection = Math.abs(BABYLON.Vector3.Dot(faceNormal, cameraUp));
                        
                        let effectiveMouseDelta;
                        if (rightProjection > upProjection) {
                            effectiveMouseDelta = mouseDeltaX;
                        } else {
                            effectiveMouseDelta = mouseDeltaY;
                        }
                        
                        const normalCameraUpDot = BABYLON.Vector3.Dot(faceNormal, cameraUp);
                        
                        let directionMultiplier;
                        if (rightProjection > upProjection) {
                            const rightDot = BABYLON.Vector3.Dot(faceNormal, cameraRight);
                            directionMultiplier = rightDot > 0 ? -1 : 1;
                        } else {
                            if (Math.abs(faceNormal.y) > 0.9) {
                                directionMultiplier = normalCameraUpDot > 0 ? 1 : -1;
                            } else {
                                directionMultiplier = normalCameraUpDot > 0 ? -1 : 1;
                            }
                        }
                        
                        const extrusionAmount = -effectiveMouseDelta * 0.01 * directionMultiplier;

                        // EXACT PROTOTYPE SCALING LOGIC
                        const absNormal = new BABYLON.Vector3(Math.abs(faceNormal.x), Math.abs(faceNormal.y), Math.abs(faceNormal.z));
                        
                        let scaleAxis;
                        if (absNormal.x > 0.9) scaleAxis = 'x';
                        else if (absNormal.y > 0.9) scaleAxis = 'y';
                        else scaleAxis = 'z';

                        const newScale = Math.max(0.1, initialScale[scaleAxis] + extrusionAmount / 2.0);
                        mesh.scaling[scaleAxis] = newScale;

                        const positionOffset = faceNormal.scale(extrusionAmount / 2.0);
                        mesh.position.copyFrom(initialPosition).addInPlace(positionOffset);
                        
                        // MASTER - UPDATE GIZMO POSITION TO STAY WITH THE EXTRUDING FACE!
                        this._updateGizmoPosition(extrusionAmount);
                        
                        // Prevent event from bubbling to main app
                        pointerInfo.event.preventDefault();
                        pointerInfo.event.stopPropagation();
                    }
                    break;

                case BABYLON.PointerEventTypes.POINTERUP:
                    if (this._isDragging) {
                        this._isDragging = false;
                        this._extrusionStartInfo = null;
                        
                        // Re-attach camera controls - EXACT PROTOTYPE LOGIC
                        this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
                        
                        // Prevent event from bubbling to main app
                        pointerInfo.event.preventDefault();
                        pointerInfo.event.stopPropagation();
                    }
                    break;
            }
        });
        
    }

    dispose() {
        this.hide(); 

        // Remove pointer observer
        if (this._pointerObserver) {
            this.scene.onPointerObservable.remove(this._pointerObserver);
            this._pointerObserver = null;
        }

        // Clean up debug spheres
        if (this._debugSphere) {
            this._debugSphere.dispose();
            this._debugSphere = null;
        }
        if (this._debugCenterSphere) {
            this._debugCenterSphere.dispose();
            this._debugCenterSphere = null;
        }

        if (this._gizmoMaterial) {
            this._gizmoMaterial.dispose();
        }
        if (this._hoverMaterial) {
            this._hoverMaterial.dispose();
        }
        if (this.gizmoContainer) {
            // Dispose the container and its children (shaft, cones)
            this.gizmoContainer.dispose(false, true); 
            this.gizmoContainer = null;
        }
        if (this.onExtrude) {
            this.onExtrude.clear();
        }
    }
}
