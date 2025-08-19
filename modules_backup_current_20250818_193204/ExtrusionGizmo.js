// ExtrusionGizmo.js - 3D extrusion gizmo system
// Handles visual gizmos for extruding 2D shapes into 3D

export class ExtrusionGizmo {
    constructor(scene, camera, extrusionSystem) {
        this.scene = scene;
        this.camera = camera;
        this.extrusionSystem = extrusionSystem;
        
        // Gizmo state
        this.gizmo = null;
        this.selectedFace = null;
        this.isActive = false;
        this.activeComponent = null;
        this.startMousePosition = null;
        this.currentDistance = 0;
        this.originalPosition = null;
    }
    
    // ==================== GIZMO CREATION ====================
    
    createGizmo(face) {
        if (!face) return;
        
        // Dispose existing gizmo
        this.disposeGizmo();
        
        this.selectedFace = face;
        
        // Initialize gizmo components
        this.gizmo = {
            root: null,
            positiveArrow: null,
            negativeArrow: null,
            centerSphere: null,
            isActive: false,
            activeComponent: null,
            originalPosition: null
        };
        
        // Get face center and normal
        const faceCenter = this.getFaceCenter(face);
        const faceNormal = this.getFaceNormal(face);
        
        // Create gizmo root
        this.gizmo.root = new BABYLON.TransformNode("extrusionGizmoRoot", this.scene);
        this.gizmo.root.position = faceCenter;
        this.gizmo.originalPosition = faceCenter.clone();
        
        // Create positive direction arrow (green, for adding material)
        this.gizmo.positiveArrow = this.createExtrusionArrow(faceNormal, 1, new BABYLON.Color3(0, 1, 0));
        this.gizmo.positiveArrow.parent = this.gizmo.root;
        
        // Create negative direction arrow (red, for removing material/holes)
        this.gizmo.negativeArrow = this.createExtrusionArrow(faceNormal, -1, new BABYLON.Color3(1, 0, 0));
        this.gizmo.negativeArrow.parent = this.gizmo.root;
        
        // Create center sphere for face identification
        this.gizmo.centerSphere = BABYLON.MeshBuilder.CreateSphere("extrusionCenter", {diameter: 0.3}, this.scene);
        this.gizmo.centerSphere.material = this.createGizmoMaterial(new BABYLON.Color3(1, 1, 0)); // Yellow
        this.gizmo.centerSphere.parent = this.gizmo.root;
        this.gizmo.centerSphere.isPickable = false;
        
        // Setup gizmo interaction
        this.setupGizmoInteraction();
        
        // Scale gizmo based on camera distance
        this.updateGizmoScale();
    }
    
    createExtrusionArrow(faceNormal, direction, color) {
        // Create arrow shaft
        const shaft = BABYLON.MeshBuilder.CreateCylinder("extrusionShaft", {
            diameter: 0.1,
            height: 2.0
        }, this.scene);
        
        // Create arrow head
        const head = BABYLON.MeshBuilder.CreateCylinder("extrusionHead", {
            diameterTop: 0,
            diameterBottom: 0.25,
            height: 0.5
        }, this.scene);
        
        // Position head at end of shaft
        head.position = new BABYLON.Vector3(0, 1.25, 0);
        
        // Create arrow parent
        const arrow = new BABYLON.TransformNode("extrusionArrow", this.scene);
        shaft.parent = arrow;
        head.parent = arrow;
        
        // Orient arrow along face normal
        const upVector = new BABYLON.Vector3(0, 1, 0);
        const rotationAxis = BABYLON.Vector3.Cross(upVector, faceNormal.scale(direction));
        const rotationAngle = Math.acos(BABYLON.Vector3.Dot(upVector, faceNormal.scale(direction)));
        
        if (rotationAxis.length() > 0.001) {
            arrow.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis.normalize(), rotationAngle);
        } else if (direction < 0) {
            arrow.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(1, 0, 0), Math.PI);
        }
        
        // Apply materials
        const material = this.createGizmoMaterial(color);
        shaft.material = material;
        head.material = material;
        
        // Store references for interaction
        arrow.gizmoType = direction > 0 ? 'positive' : 'negative';
        arrow.gizmoShaft = shaft;
        arrow.gizmoHead = head;
        
        return arrow;
    }
    
    createGizmoMaterial(color) {
        const material = new BABYLON.StandardMaterial("gizmoMaterial", this.scene);
        material.diffuseColor = color;
        material.emissiveColor = color.scale(0.3);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.alpha = 0.8;
        return material;
    }
    
    // ==================== GIZMO INTERACTION ====================
    
    setupGizmoInteraction() {
        // Add pointer event handlers for gizmo interaction
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.gizmo || !this.gizmo.root) return;
            
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handleGizmoDown(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.handleGizmoMove(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    this.handleGizmoUp(pointerInfo);
                    break;
            }
        });
    }
    
    handleGizmoDown(pointerInfo) {
        if (pointerInfo.event.button !== 0) return; // Only left click
        
        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => {
            return mesh === this.gizmo.positiveArrow?.gizmoShaft ||
                   mesh === this.gizmo.positiveArrow?.gizmoHead ||
                   mesh === this.gizmo.negativeArrow?.gizmoShaft ||
                   mesh === this.gizmo.negativeArrow?.gizmoHead;
        });
        
        if (pickInfo.hit) {
            this.gizmo.isActive = true;
            this.gizmo.activeComponent = this.getGizmoComponent(pickInfo.pickedMesh);
            this.gizmo.startMousePosition = {
                x: this.scene.pointerX,
                y: this.scene.pointerY
            };
            this.gizmo.startDistance = 0;
            
            // Disable camera controls during extrusion
            this.camera.inputs.attached.pointers.detachControl();
            
            // Highlight active component
            this.highlightGizmoComponent(this.gizmo.activeComponent, true);
        }
    }
    
    handleGizmoMove(pointerInfo) {
        if (!this.gizmo.isActive || !this.gizmo.activeComponent) return;
        
        // Calculate mouse delta
        const deltaX = this.scene.pointerX - this.gizmo.startMousePosition.x;
        const deltaY = this.scene.pointerY - this.gizmo.startMousePosition.y;
        
        // Convert mouse movement to extrusion distance
        const sensitivity = 0.01;
        const distance = deltaY * sensitivity;
        
        // Apply direction multiplier
        const direction = this.gizmo.activeComponent === this.gizmo.positiveArrow ? 1 : -1;
        const extrusionDistance = distance * direction;
        
        // Update visual feedback
        this.updateExtrusionPreview(extrusionDistance);
        
        // Store current distance
        this.gizmo.currentDistance = extrusionDistance;
    }
    
    handleGizmoUp(pointerInfo) {
        if (!this.gizmo.isActive) return;
        
        // Re-enable camera controls
        this.camera.inputs.attached.pointers.attachControl();
        
        // Apply the extrusion
        if (this.gizmo.currentDistance && Math.abs(this.gizmo.currentDistance) > 0.01) {
            this.applyExtrusion(this.gizmo.currentDistance);
        }
        
        // Reset gizmo state
        this.gizmo.isActive = false;
        this.gizmo.activeComponent = null;
        this.gizmo.currentDistance = 0;
        
        // Reset gizmo position
        if (this.gizmo.root) {
            this.gizmo.root.position = this.gizmo.originalPosition.clone();
        }
        
        // Remove highlight
        this.highlightGizmoComponent(this.gizmo.positiveArrow, false);
        this.highlightGizmoComponent(this.gizmo.negativeArrow, false);
    }
    
    getGizmoComponent(mesh) {
        if (mesh === this.gizmo.positiveArrow?.gizmoShaft || 
            mesh === this.gizmo.positiveArrow?.gizmoHead) {
            return this.gizmo.positiveArrow;
        }
        if (mesh === this.gizmo.negativeArrow?.gizmoShaft || 
            mesh === this.gizmo.negativeArrow?.gizmoHead) {
            return this.gizmo.negativeArrow;
        }
        return null;
    }
    
    highlightGizmoComponent(component, isHighlighted) {
        if (!component) return;
        
        const highlightColor = isHighlighted ? new BABYLON.Color3(1, 1, 0) : null;
        
        if (component.gizmoShaft && component.gizmoShaft.material) {
            if (isHighlighted) {
                component.gizmoShaft.material.emissiveColor = highlightColor;
            } else {
                // Restore original emissive color
                const originalColor = component.gizmoType === 'positive' ? 
                    new BABYLON.Color3(0, 1, 0) : new BABYLON.Color3(1, 0, 0);
                component.gizmoShaft.material.emissiveColor = originalColor.scale(0.3);
            }
        }
        
        if (component.gizmoHead && component.gizmoHead.material) {
            if (isHighlighted) {
                component.gizmoHead.material.emissiveColor = highlightColor;
            } else {
                // Restore original emissive color
                const originalColor = component.gizmoType === 'positive' ? 
                    new BABYLON.Color3(0, 1, 0) : new BABYLON.Color3(1, 0, 0);
                component.gizmoHead.material.emissiveColor = originalColor.scale(0.3);
            }
        }
    }
    
    updateExtrusionPreview(distance) {
        // Move the gizmo to show the extrusion distance
        if (this.gizmo.root) {
            const faceNormal = this.getFaceNormal(this.selectedFace);
            const offset = faceNormal.scale(distance);
            this.gizmo.root.position = this.gizmo.originalPosition.add(offset);
        }
    }
    
    applyExtrusion(distance) {
        if (!this.selectedFace || !this.extrusionSystem) return;
        
        const isPositive = distance > 0;
        const extrusionHeight = Math.abs(distance);
        
        
        // Call the extrusion system
        this.extrusionSystem.extrudeFace(this.selectedFace, extrusionHeight, isPositive);
    }
    
    // ==================== HELPER METHODS ====================
    
    getFaceCenter(face) {
        // Get the center point of the face
        const positions = face.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (!positions) return BABYLON.Vector3.Zero();
        
        let center = BABYLON.Vector3.Zero();
        const vertexCount = positions.length / 3;
        
        for (let i = 0; i < vertexCount; i++) {
            center.x += positions[i * 3];
            center.y += positions[i * 3 + 1];
            center.z += positions[i * 3 + 2];
        }
        
        center = center.scale(1 / vertexCount);
        return center;
    }
    
    getFaceNormal(face) {
        // Get the face normal - for our 2D shapes, this should be the Z-axis
        // For now, return a default normal
        return new BABYLON.Vector3(0, 0, 1);
    }
    
    updateGizmoScale() {
        if (!this.gizmo || !this.gizmo.root) return;
        
        // Scale gizmo based on camera distance to keep consistent size
        const distance = BABYLON.Vector3.Distance(this.camera.position, this.gizmo.root.position);
        const scale = Math.max(0.1, Math.min(2.0, distance * 0.1));
        
        this.gizmo.root.scaling = new BABYLON.Vector3(scale, scale, scale);
    }
    
    // ==================== PUBLIC METHODS ====================
    
    showGizmo(face) {
        this.createGizmo(face);
    }
    
    hideGizmo() {
        this.disposeGizmo();
    }
    
    updateScale() {
        this.updateGizmoScale();
    }
    
    disposeGizmo() {
        if (this.gizmo) {
            if (this.gizmo.root) {
                this.gizmo.root.dispose();
            }
            this.gizmo = null;
        }
        
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        this.selectedFace = null;
    }
    
    dispose() {
        this.disposeGizmo();
    }
}