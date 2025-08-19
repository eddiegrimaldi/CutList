// SelectionSystem.js - Object and face selection management
// Handles selection highlighting, hover effects, and selection state management

export class SelectionSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Selection state
        this.selectedObject = null;
        this.selectedFace = null;
        this.hoveredFace = null;
        
        // Materials
        this.selectionOutlineMaterial = null;
        this.hoverOutlineMaterial = null;
        
        // Shape tracking
        this.closedShapes = [];
        this.currentSketch = null;
        
        // Callbacks
        this.onFaceSelected = null;
        this.onFaceDeselected = null;
        this.onObjectSelected = null;
        this.onObjectDeselected = null;
        
        this.initialize();
    }
    
    initialize() {
        // Create outline materials
        this.createOutlineMaterials();
        
        // Setup selection event handlers
        this.setupSelectionEventHandlers();
    }
    
    // ==================== MATERIAL SETUP ====================
    
    createOutlineMaterials() {
        // Create hover outline material (yellow)
        this.hoverOutlineMaterial = new BABYLON.StandardMaterial('hoverOutline', this.scene);
        this.hoverOutlineMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow
        this.hoverOutlineMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0);
        this.hoverOutlineMaterial.wireframe = true;
        this.hoverOutlineMaterial.alpha = 0.8;
        
        // Create selection outline material (orange)
        this.selectionOutlineMaterial = new BABYLON.StandardMaterial('selectionOutline', this.scene);
        this.selectionOutlineMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
        this.selectionOutlineMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0);
        this.selectionOutlineMaterial.wireframe = true;
        this.selectionOutlineMaterial.alpha = 1.0;
    }
    
    // ==================== EVENT HANDLERS ====================
    
    setupSelectionEventHandlers() {
        // Mouse move for hover detection
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.handleFaceHover(pointerInfo);
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 0) { // Left click
                    this.handleFaceSelection(pointerInfo);
                }
            }
        });
    }
    
    handleFaceHover(pointerInfo) {
        const pickInfo = this.scene.pick(
            this.scene.pointerX, 
            this.scene.pointerY, 
            (mesh) => this.isSelectableFace(mesh)
        );
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const face = pickInfo.pickedMesh;
            
            // If hovering over a new face
            if (this.hoveredFace !== face) {
                // Clear previous hover
                this.clearHover();
                
                // Set new hover
                this.hoveredFace = face;
                this.setFaceHover(face, true);
            }
        } else {
            // Clear hover if not over any face
            this.clearHover();
        }
    }
    
    handleFaceSelection(pointerInfo) {
        const pickInfo = this.scene.pick(
            this.scene.pointerX, 
            this.scene.pointerY, 
            (mesh) => this.isSelectableFace(mesh)
        );
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const face = pickInfo.pickedMesh;
            
            // Toggle selection
            if (this.selectedFace === face) {
                this.deselectFace();
            } else {
                this.selectFace(face);
            }
        } else {
            // Deselect if clicking on empty space
            this.deselectFace();
        }
    }
    
    // ==================== SELECTION METHODS ====================
    
    selectFace(face) {
        // Clear previous selection
        this.deselectFace();
        
        // Set new selection
        this.selectedFace = face;
        this.setFaceSelection(face, true);
        
        // Clear hover since we've selected
        this.clearHover();
        
        // Update UI
        this.updateSelectionUI();
        
        // Notify callbacks
        if (this.onFaceSelected) {
            this.onFaceSelected(face);
        }
    }
    
    deselectFace() {
        if (this.selectedFace) {
            this.setFaceSelection(this.selectedFace, false);
            const previousFace = this.selectedFace;
            this.selectedFace = null;
            this.updateSelectionUI();
            
            // Notify callbacks
            if (this.onFaceDeselected) {
                this.onFaceDeselected(previousFace);
            }
        }
    }
    
    selectObject(object) {
        // Clear previous selection
        this.deselectObject();
        
        // Set new selection
        this.selectedObject = object;
        
        // Update UI
        this.updateSelectionUI();
        
        // Notify callbacks
        if (this.onObjectSelected) {
            this.onObjectSelected(object);
        }
    }
    
    deselectObject() {
        if (this.selectedObject) {
            const previousObject = this.selectedObject;
            this.selectedObject = null;
            this.updateSelectionUI();
            
            // Notify callbacks
            if (this.onObjectDeselected) {
                this.onObjectDeselected(previousObject);
            }
        }
    }
    
    // ==================== VISUAL FEEDBACK ====================
    
    setFaceHover(face, isHovered) {
        if (isHovered) {
            // Store original material
            if (!face.originalMaterial) {
                face.originalMaterial = face.material;
            }
            // Apply hover material
            face.material = this.hoverOutlineMaterial;
        } else {
            // Restore original material
            if (face.originalMaterial) {
                face.material = face.originalMaterial;
            }
        }
    }
    
    setFaceSelection(face, isSelected) {
        if (isSelected) {
            // Store original material
            if (!face.originalMaterial) {
                face.originalMaterial = face.material;
            }
            // Apply selection material
            face.material = this.selectionOutlineMaterial;
        } else {
            // Restore original material
            if (face.originalMaterial) {
                face.material = face.originalMaterial;
                face.originalMaterial = null;
            }
        }
    }
    
    clearHover() {
        if (this.hoveredFace) {
            this.setFaceHover(this.hoveredFace, false);
            this.hoveredFace = null;
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    isSelectableFace(mesh) {
        // Check if mesh is a completed shape that can be selected
        if (!mesh || !mesh.name) return false;
        
        // Check if it's one of our closed shapes
        for (const shape of this.closedShapes) {
            if (shape.mesh === mesh) {
                return true;
            }
        }
        
        // Also check current sketch elements if we just finished drawing
        if (this.currentSketch && this.currentSketch.elements) {
            for (const element of this.currentSketch.elements) {
                if (element.mesh === mesh && element.closed) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    getShapeType(mesh) {
        // Find the shape type from our stored shapes
        for (const shape of this.closedShapes) {
            if (shape.mesh === mesh) {
                return shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
            }
        }
        
        if (this.currentSketch && this.currentSketch.elements) {
            for (const element of this.currentSketch.elements) {
                if (element.mesh === mesh) {
                    return element.type.charAt(0).toUpperCase() + element.type.slice(1);
                }
            }
        }
        
        return 'Shape';
    }
    
    getShapeData(mesh) {
        // Find the shape data from our stored shapes
        for (const shape of this.closedShapes) {
            if (shape.mesh === mesh) {
                return shape;
            }
        }
        
        if (this.currentSketch && this.currentSketch.elements) {
            for (const element of this.currentSketch.elements) {
                if (element.mesh === mesh) {
                    return element;
                }
            }
        }
        
        return null;
    }
    
    updateSelectionUI() {
        // Update UI to show selection info
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            if (this.selectedFace) {
                const shapeType = this.getShapeType(this.selectedFace);
                selectionInfo.textContent = `${shapeType} selected`;
            } else if (this.selectedObject) {
                selectionInfo.textContent = `${this.selectedObject.name} selected`;
            } else {
                selectionInfo.textContent = 'Nothing selected';
            }
        }
    }
    
    // ==================== PUBLIC METHODS ====================
    
    setShapeList(shapes) {
        this.closedShapes = shapes;
    }
    
    setCurrentSketch(sketch) {
        this.currentSketch = sketch;
    }
    
    getSelectedFace() {
        return this.selectedFace;
    }
    
    getSelectedObject() {
        return this.selectedObject;
    }
    
    clearSelection() {
        this.deselectFace();
        this.deselectObject();
        this.clearHover();
    }
    
    // ==================== CALLBACK SETTERS ====================
    
    setFaceSelectionCallback(onSelected, onDeselected) {
        this.onFaceSelected = onSelected;
        this.onFaceDeselected = onDeselected;
    }
    
    setObjectSelectionCallback(onSelected, onDeselected) {
        this.onObjectSelected = onSelected;
        this.onObjectDeselected = onDeselected;
    }
    
    // ==================== DISPOSAL ====================
    
    dispose() {
        // Clean up observers
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        // Clean up materials
        if (this.hoverOutlineMaterial) {
            this.hoverOutlineMaterial.dispose();
            this.hoverOutlineMaterial = null;
        }
        
        if (this.selectionOutlineMaterial) {
            this.selectionOutlineMaterial.dispose();
            this.selectionOutlineMaterial = null;
        }
        
        // Clear selection state
        this.clearSelection();
        
        // Clear callbacks
        this.onFaceSelected = null;
        this.onFaceDeselected = null;
        this.onObjectSelected = null;
        this.onObjectDeselected = null;
    }
}