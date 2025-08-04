/**
 * JoinToolSystem Module - Precision Part Joining for Assembly Bench
 * 
 * Provides professional woodworking-style precision joining with snap points,
 * collision detection, and visual feedback for accurate part alignment.
 * 
 * Features:
 * - Two-piece selection workflow
 * - Snap points system (corners, edges, face centers)
 * - Collision detection and prevention
 * - Visual feedback and ghost previews
 * - Professional joinery alignment
 */

export class JoinToolSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        
        // Join tool state
        this.joinToolActive = false;
        this.currentStep = 'select_first'; // 'select_first', 'select_second', 'select_snap1', 'select_snap2'
        this.selectedPiece1 = null;
        this.selectedPiece2 = null;
        this.selectedMesh1 = null;
        this.selectedMesh2 = null;
        this.snapPoint1 = null;
        this.snapPoint2 = null;
        
        // Visual elements
        this.snapPoints = []; // Array of snap point meshes
        this.highlightMaterials = {};
        this.ghostMesh = null;
        this.instructionDisplay = null;
        
        // Snap point types
        this.snapTypes = {
            CORNER: 'corner',
            EDGE: 'edge', 
            FACE: 'face'
        };
        
        // Mouse interaction
        this.pointerObserver = null;
        
        this.init();
    }
    
    /**
     * Initialize the join tool system
     */
    init() {
        this.setupMaterials();
        this.setupMouseTracking();
        this.setupInstructionDisplay();
    }
    
    /**
     * Setup materials for visual feedback
     */
    setupMaterials() {
        // Highlight material for selected piece 1 (blue)
        this.highlightMaterials.piece1 = new BABYLON.StandardMaterial('piece1Highlight', this.scene);
        this.highlightMaterials.piece1.diffuseColor = new BABYLON.Color3(0.0, 0.5, 1.0);
        this.highlightMaterials.piece1.alpha = 0.3;
        this.highlightMaterials.piece1.backFaceCulling = false;
        
        // Highlight material for selected piece 2 (green)
        this.highlightMaterials.piece2 = new BABYLON.StandardMaterial('piece2Highlight', this.scene);
        this.highlightMaterials.piece2.diffuseColor = new BABYLON.Color3(0.0, 1.0, 0.5);
        this.highlightMaterials.piece2.alpha = 0.3;
        this.highlightMaterials.piece2.backFaceCulling = false;
        
        // Snap point materials
        this.highlightMaterials.cornerSnap = new BABYLON.StandardMaterial('cornerSnap', this.scene);
        this.highlightMaterials.cornerSnap.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0); // Red
        this.highlightMaterials.cornerSnap.emissiveColor = new BABYLON.Color3(0.3, 0.0, 0.0);
        
        this.highlightMaterials.edgeSnap = new BABYLON.StandardMaterial('edgeSnap', this.scene);
        this.highlightMaterials.edgeSnap.diffuseColor = new BABYLON.Color3(1.0, 1.0, 0.0); // Yellow
        this.highlightMaterials.edgeSnap.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.0);
        
        this.highlightMaterials.faceSnap = new BABYLON.StandardMaterial('faceSnap', this.scene);
        this.highlightMaterials.faceSnap.diffuseColor = new BABYLON.Color3(0.0, 1.0, 0.0); // Green
        this.highlightMaterials.faceSnap.emissiveColor = new BABYLON.Color3(0.0, 0.3, 0.0);
        
        // Ghost preview material
        this.highlightMaterials.ghost = new BABYLON.StandardMaterial('ghostPreview', this.scene);
        this.highlightMaterials.ghost.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1.0);
        this.highlightMaterials.ghost.alpha = 0.5;
        this.highlightMaterials.ghost.backFaceCulling = false;
    }
    
    /**
     * Setup mouse tracking for join tool
     */
    setupMouseTracking() {
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.joinToolActive) return;
            
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
                this.onMouseClick(pointerInfo);
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.onMouseMove(pointerInfo);
            }
        });
    }
    
    /**
     * Setup instruction display
     */
    setupInstructionDisplay() {
        // Create GUI for instructions
        this.instructionDisplay = new BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('joinInstructions');
        
        this.instructionText = new BABYLON.GUI.TextBlock();
        this.instructionText.text = '';
        this.instructionText.color = '#ffffff';
        this.instructionText.fontSize = 20;
        this.instructionText.fontWeight = 'bold';
        this.instructionText.shadowColor = 'black';
        this.instructionText.shadowBlur = 3;
        this.instructionText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.instructionText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.instructionText.topInPixels = 50;
        this.instructionText.isVisible = false;
        
        this.instructionDisplay.addControl(this.instructionText);
    }
    
    /**
     * Activate join tool
     */
    activate() {
        this.joinToolActive = true;
        this.currentStep = 'select_first';
        
        // Check if we have parts to join
        const availableParts = this.drawingWorld.currentBench === 'work' 
            ? this.scene.meshes.filter(m => m.isWorkBenchPart)
            : this.scene.meshes.filter(m => m.isProjectPart);
            
        if (availableParts.length < 2) {
            this.showInstructions('Need at least 2 parts to join. Add more parts first.');
            return;
        }
        
        this.showInstructions('Click first piece to join');
        this.resetSelection();
    }
    
    /**
     * Deactivate join tool
     */
    deactivate() {
        this.joinToolActive = false;
        this.hideInstructions();
        this.clearAllHighlights();
        this.clearSnapPoints();
        this.clearGhostPreview();
        this.resetSelection();
    }
    
    /**
     * Reset selection state
     */
    resetSelection() {
        this.currentStep = 'select_first';
        this.selectedPiece1 = null;
        this.selectedPiece2 = null;
        this.selectedMesh1 = null;
        this.selectedMesh2 = null;
        this.snapPoint1 = null;
        this.snapPoint2 = null;
    }
    
    /**
     * Show instructions to user
     */
    showInstructions(message) {
        if (this.instructionText) {
            this.instructionText.text = message;
            this.instructionText.isVisible = true;
        }
    }
    
    /**
     * Hide instructions
     */
    hideInstructions() {
        if (this.instructionText) {
            this.instructionText.isVisible = false;
        }
    }
    
    /**
     * Handle mouse click for join workflow
     */
    onMouseClick(pointerInfo) {
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => {
                return (mesh.isProjectPart || mesh.isWorkBenchPart || this.isSnapPoint(mesh));
            }
        );
        
        if (!pickInfo.hit) return;
        
        const pickedMesh = pickInfo.pickedMesh;
        
        // Handle snap point selection
        if (this.isSnapPoint(pickedMesh)) {
            this.handleSnapPointSelection(pickedMesh);
            return;
        }
        
        // Handle piece selection
        if (pickedMesh.isProjectPart || pickedMesh.isWorkBenchPart) {
            this.handlePieceSelection(pickedMesh);
        }
    }
    
    /**
     * Handle mouse movement for hover effects
     */
    onMouseMove(pointerInfo) {
        if (!this.joinToolActive) return;
        
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => {
                return (mesh.isProjectPart || mesh.isWorkBenchPart || this.isSnapPoint(mesh));
            }
        );
        
        // Reset all snap point scales
        this.snapPoints.forEach(snap => {
            snap.scaling = new BABYLON.Vector3(1, 1, 1);
        });
        
        if (pickInfo.hit && this.isSnapPoint(pickInfo.pickedMesh)) {
            // Enlarge hovered snap point
            pickInfo.pickedMesh.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
        }
    }
    
    /**
     * Handle piece selection based on current step
     */
    handlePieceSelection(mesh) {
        if (this.currentStep === 'select_first') {
            this.selectedMesh1 = mesh;
            this.selectedPiece1 = mesh.partData;
            this.highlightPiece(mesh, 'piece1');
            this.currentStep = 'select_second';
            this.showInstructions('Click second piece to join');
            
        } else if (this.currentStep === 'select_second') {
            if (mesh === this.selectedMesh1) {
                return;
            }
            
            this.selectedMesh2 = mesh;
            this.selectedPiece2 = mesh.partData;
            this.highlightPiece(mesh, 'piece2');
            
            this.currentStep = 'select_snap1';
            this.showCornerPoints(this.selectedMesh1);
            this.showInstructions('Click corner point on first piece (blue) to join');
        }
    }
    
    /**
     * Handle snap point selection
     */
    handleSnapPointSelection(snapMesh) {
        if (this.currentStep === 'select_snap1') {
            this.snapPoint1 = snapMesh.snapData;
            this.highlightSnapPoint(snapMesh);
            this.clearSnapPoints();
            this.showCornerPoints(this.selectedMesh2);
            this.currentStep = 'select_snap2';
            this.showInstructions('Click corner point on second piece (green) to join to');
            
        } else if (this.currentStep === 'select_snap2') {
            this.snapPoint2 = snapMesh.snapData;
            this.highlightSnapPoint(snapMesh);
            this.clearSnapPoints();
            this.executeJoin();
        }
    }
    
    /**
     * Check if mesh is a snap point
     */
    isSnapPoint(mesh) {
        return mesh.snapData !== undefined;
    }
    
    /**
     * Highlight selected piece
     */
    highlightPiece(mesh, type) {
        const highlightMesh = mesh.clone(mesh.name + '_highlight');
        highlightMesh.material = this.highlightMaterials[type];
        highlightMesh.position = mesh.position.clone();
        highlightMesh.scaling = mesh.scaling.clone();
        highlightMesh.rotation = mesh.rotation.clone();
        highlightMesh.isHighlight = true;
        highlightMesh.originalMesh = mesh;
    }
    
    /**
     * Highlight selected snap point
     */
    highlightSnapPoint(snapMesh) {
        snapMesh.material = this.highlightMaterials.cornerSnap;
        snapMesh.scaling = new BABYLON.Vector3(2, 2, 2);
    }
    
    
    /**
     * Show only corner points for a mesh (most common join points)
     */
    showCornerPoints(mesh) {
        this.clearSnapPoints();
        
        // Get the world-space bounding box
        const boundingInfo = mesh.getBoundingInfo();
        const worldMin = boundingInfo.boundingBox.minimumWorld;
        const worldMax = boundingInfo.boundingBox.maximumWorld;
        
        console.log("Creating snap points for mesh:", mesh.name);
        console.log("World bounds - min:", worldMin.toString(), "max:", worldMax.toString());
        
        // Create corner points directly in world space
        const worldCorners = [
            new BABYLON.Vector3(worldMin.x, worldMin.y, worldMin.z),
            new BABYLON.Vector3(worldMax.x, worldMin.y, worldMin.z),
            new BABYLON.Vector3(worldMin.x, worldMax.y, worldMin.z),
            new BABYLON.Vector3(worldMax.x, worldMax.y, worldMin.z),
            new BABYLON.Vector3(worldMin.x, worldMin.y, worldMax.z),
            new BABYLON.Vector3(worldMax.x, worldMin.y, worldMax.z),
            new BABYLON.Vector3(worldMin.x, worldMax.y, worldMax.z),
            new BABYLON.Vector3(worldMax.x, worldMax.y, worldMax.z)
        ];
        
        worldCorners.forEach((worldCorner, index) => {
            this.createSnapPoint(worldCorner, this.snapTypes.CORNER, `corner_${index}`, mesh);
        });
        
    }
    
    /**
     * Show snap points for a mesh
     */
    showSnapPoints(mesh) {
        this.clearSnapPoints();
        
        const boundingInfo = mesh.getBoundingInfo();
        const min = boundingInfo.boundingBox.minimum;
        const max = boundingInfo.boundingBox.maximum;
        const center = boundingInfo.boundingBox.center;
        
        // Corner points (8 corners)
        const corners = [
            new BABYLON.Vector3(min.x, min.y, min.z),
            new BABYLON.Vector3(max.x, min.y, min.z),
            new BABYLON.Vector3(min.x, max.y, min.z),
            new BABYLON.Vector3(max.x, max.y, min.z),
            new BABYLON.Vector3(min.x, min.y, max.z),
            new BABYLON.Vector3(max.x, min.y, max.z),
            new BABYLON.Vector3(min.x, max.y, max.z),
            new BABYLON.Vector3(max.x, max.y, max.z)
        ];
        
        corners.forEach((corner, index) => {
            this.createSnapPoint(corner, this.snapTypes.CORNER, `corner_${index}`, mesh);
        });
        
        // Edge midpoints (12 edges)
        const edges = [
            // Bottom edges
            new BABYLON.Vector3((min.x + max.x) / 2, min.y, min.z),
            new BABYLON.Vector3((min.x + max.x) / 2, min.y, max.z),
            new BABYLON.Vector3(min.x, min.y, (min.z + max.z) / 2),
            new BABYLON.Vector3(max.x, min.y, (min.z + max.z) / 2),
            // Top edges
            new BABYLON.Vector3((min.x + max.x) / 2, max.y, min.z),
            new BABYLON.Vector3((min.x + max.x) / 2, max.y, max.z),
            new BABYLON.Vector3(min.x, max.y, (min.z + max.z) / 2),
            new BABYLON.Vector3(max.x, max.y, (min.z + max.z) / 2),
            // Vertical edges
            new BABYLON.Vector3(min.x, (min.y + max.y) / 2, min.z),
            new BABYLON.Vector3(max.x, (min.y + max.y) / 2, min.z),
            new BABYLON.Vector3(min.x, (min.y + max.y) / 2, max.z),
            new BABYLON.Vector3(max.x, (min.y + max.y) / 2, max.z)
        ];
        
        edges.forEach((edge, index) => {
            this.createSnapPoint(edge, this.snapTypes.EDGE, `edge_${index}`, mesh);
        });
        
        // Face centers (6 faces)
        // For face snap points, we want them ON the surface, not at the center
        // This is crucial for butt joints
        const faces = [
            new BABYLON.Vector3(min.x, center.y, center.z), // Left face surface
            new BABYLON.Vector3(max.x, center.y, center.z), // Right face surface
            new BABYLON.Vector3(center.x, min.y, center.z), // Bottom face surface
            new BABYLON.Vector3(center.x, max.y, center.z), // Top face surface
            new BABYLON.Vector3(center.x, center.y, min.z), // Front face surface
            new BABYLON.Vector3(center.x, center.y, max.z)  // Back face surface
        ];
        
        faces.forEach((face, index) => {
            this.createSnapPoint(face, this.snapTypes.FACE, `face_${index}`, mesh);
        });
    }
    
    /**
     * Create a snap point at given position
     */
    createSnapPoint(position, type, id, parentMesh) {
        const size = type === this.snapTypes.CORNER ? 1.0 : 
                    type === this.snapTypes.EDGE ? 0.8 : 0.6;
        
        const snapPoint = BABYLON.MeshBuilder.CreateSphere(`snap_${id}`, {
            diameter: size
        }, this.scene);
        
        snapPoint.position = position.clone();
        snapPoint.material = this.highlightMaterials[type + 'Snap'];
        snapPoint.snapData = {
            type: type,
            id: id,
            position: position.clone(),
            parentMesh: parentMesh
        };
        
        // Make sure it's always visible
        snapPoint.renderingGroupId = 1;
        snapPoint.isPickable = true;
        
        this.snapPoints.push(snapPoint);
        
    }
    
    /**
     * Clear all snap points
     */
    clearSnapPoints() {
        this.snapPoints.forEach(snap => {
            snap.dispose();
        });
        this.snapPoints = [];
    }
    
    /**
     * Execute the join operation
     */
    executeJoin() {
        if (!this.snapPoint1 || !this.snapPoint2) return;
        
        console.log("=== EXECUTE JOIN DEBUG ===");
        console.log("Snap1 position:", this.snapPoint1.position.toString());
        console.log("Snap2 position:", this.snapPoint2.position.toString());
        
        // Calculate translation vector
        const translation = this.snapPoint1.position.subtract(this.snapPoint2.position);
        console.log("Translation vector:", translation.toString());
        
        // Store original position
        const originalPosition = this.selectedMesh2.position.clone();
        console.log("Mesh2 original position:", originalPosition.toString());
        
        // Temporarily move piece 2 to check for collision
        this.selectedMesh2.position = this.selectedMesh2.position.add(translation);
        console.log("Mesh2 new position:", this.selectedMesh2.position.toString());
        
        // Check for collisions at the new position
        const hasCollision = this.checkCollision(this.selectedMesh1, this.selectedMesh2);
        
        if (hasCollision) {
            // Collision detected - restore original position
            this.selectedMesh2.position = originalPosition;
            this.showInstructions('Collision detected! Choose different snap points.');
            console.log("JOIN BLOCKED BY COLLISION");
            return;
        }
        
        // No collision - the move is already done, update Board transform if needed
        console.log("Updating board transforms...");
        
        if (this.selectedMesh2.board) {
            console.log("Updating via mesh.board");
            // Update Board transform to match new position
            this.selectedMesh2.board.transform.position = {
                x: this.selectedMesh2.position.x / 2.54,
                y: this.selectedMesh2.position.y / 2.54,
                z: this.selectedMesh2.position.z / 2.54
            };
        }
        if (this.selectedMesh2.partData && this.selectedMesh2.partData._board) {
            console.log("Updating via partData._board");
            // Update Board transform via partData
            this.selectedMesh2.partData._board.transform.position = {
                x: this.selectedMesh2.position.x / 2.54,
                y: this.selectedMesh2.position.y / 2.54,
                z: this.selectedMesh2.position.z / 2.54
            };
        }
        
        // Also update the partData meshGeometry for persistence
        if (this.selectedMesh2.partData) {
            console.log("Updating partData.meshGeometry");
            this.selectedMesh2.partData.meshGeometry = {
                position: {
                    x: this.selectedMesh2.position.x,
                    y: this.selectedMesh2.position.y,
                    z: this.selectedMesh2.position.z
                }
            };
        }
        
        // Success - finalize join
        console.log("JOIN SUCCESSFUL - Boards should be joined!");
        this.showInstructions('Parts joined successfully!');
        this.clearAllHighlights();
        this.clearSnapPoints();
        
        // Reset selection state
        this.resetSelection();
        
        // Auto-deactivate after success
        setTimeout(() => {
            this.deactivate();
            this.drawingWorld.activeTool = 'pointer';
            this.drawingWorld.updateToolButtonStates();
        }, 2000);
        
    }
    
    /**
     * Check for collision between two meshes
     */
    checkCollision(mesh1, mesh2) {
        // Force refresh bounding info in case it's stale
        mesh1.refreshBoundingInfo();
        mesh2.refreshBoundingInfo();
        
        // Get WORLD space bounding boxes
        const boundingInfo1 = mesh1.getBoundingInfo();
        const boundingInfo2 = mesh2.getBoundingInfo();
        
        const worldMin1 = boundingInfo1.boundingBox.minimumWorld;
        const worldMax1 = boundingInfo1.boundingBox.maximumWorld;
        const worldMin2 = boundingInfo2.boundingBox.minimumWorld;
        const worldMax2 = boundingInfo2.boundingBox.maximumWorld;
        
        console.log("=== COLLISION CHECK DEBUG ===");
        console.log("Mesh1 world bounds:", worldMin1.toString(), "to", worldMax1.toString());
        console.log("Mesh2 world bounds:", worldMin2.toString(), "to", worldMax2.toString());
        
        // Check if boxes intersect at all using world coordinates
        const intersects = !(worldMax1.x < worldMin2.x || worldMin1.x > worldMax2.x ||
                           worldMax1.y < worldMin2.y || worldMin1.y > worldMax2.y ||
                           worldMax1.z < worldMin2.z || worldMin1.z > worldMax2.z);
        console.log("Boxes intersect:", intersects);
        
        if (!intersects) {
            // No intersection at all - boards aren't touching
            console.log("No intersection - allowing join");
            return false;
        }
        
        // Calculate the overlap amount in each dimension using world coordinates
        const overlapX = Math.min(worldMax1.x, worldMax2.x) - Math.max(worldMin1.x, worldMin2.x);
        const overlapY = Math.min(worldMax1.y, worldMax2.y) - Math.max(worldMin1.y, worldMin2.y);
        const overlapZ = Math.min(worldMax1.z, worldMax2.z) - Math.max(worldMin1.z, worldMin2.z);
        
        console.log("Overlap amounts - X:", overlapX, "Y:", overlapY, "Z:", overlapZ);
        
        // For butt joints, we expect one dimension to have minimal overlap (just touching)
        // and the other two dimensions to have significant overlap
        const tolerance = 0.5; // 5mm tolerance for "touching" in cm units
        
        // Count how many dimensions have minimal overlap
        let minimalOverlapCount = 0;
        if (overlapX < tolerance) minimalOverlapCount++;
        if (overlapY < tolerance) minimalOverlapCount++;
        if (overlapZ < tolerance) minimalOverlapCount++;
        
        console.log("Minimal overlap count:", minimalOverlapCount, "(tolerance:", tolerance, ")");
        
        // For a valid butt joint, exactly one dimension should have minimal overlap
        if (minimalOverlapCount === 1) {
            console.log("Valid butt joint - allowing join");
            return false; // No collision, this is a valid butt joint
        }
        
        // If all dimensions have significant overlap, it's a real collision
        if (minimalOverlapCount === 0) {
            console.log("Real collision - blocking join");
            return true;
        }
        
        // If 2 or 3 dimensions have minimal overlap, boards are barely touching at edge/corner
        console.log("Edge/corner touch - allowing join");
        return false;
    }
    
    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        this.scene.meshes.forEach(mesh => {
            if (mesh.isHighlight) {
                mesh.dispose();
            }
        });
    }
    
    /**
     * Clear ghost preview
     */
    clearGhostPreview() {
        if (this.ghostMesh) {
            this.ghostMesh.dispose();
            this.ghostMesh = null;
        }
    }
    
    /**
     * Cleanup when tool system is destroyed
     */
    destroy() {
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
        }
        
        this.clearAllHighlights();
        this.clearSnapPoints();
        this.clearGhostPreview();
        
        if (this.instructionDisplay) {
            this.instructionDisplay.dispose();
        }
        
        // Dispose materials
        Object.values(this.highlightMaterials).forEach(material => {
            material.dispose();
        });
    }
}