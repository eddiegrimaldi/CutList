/**
 * SawToolSystem Module - Professional Straight-Line Cutting Tool
 * 
 * Handles straight-line cutting between two user-defined points
 * with real-time line preview and precise cut execution.
 * 
 * Features:
 * - Two-point click system for defining cut line
 * - Real-time cut line preview
 * - Straight line cutting through any part
 * - Proper two-piece separation with tracking
 * - Professional visual feedback and measurements
 */

export class SawToolSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        
        // User-definable kerf width (blade thickness) in inches
        this.kerfWidth = 0.0625; // 1/16 inch default
        
        // Saw tool state
        this.sawToolActive = false;
        this.cutPoints = []; // Array to store the two cut points
        this.hoveredPart = null;
        this.targetMesh = null;
        this.currentStep = 'first_point'; // 'first_point', 'second_point', 'ready_to_cut'
        
        // Visual elements
        this.cutLine = null;
        this.cutLineMaterial = null;
        this.pointIndicators = [];
        this.measurementDisplay = null;
        this.measurementText = null;
        
        // Mouse tracking
        this.pointerObserver = null;
        this.tempPoint = null;
        
        this.init();
    }
    
    /**
     * Initialize the saw tool system
     */
    init() {
        this.setupCutLineMaterial();
        this.setupMouseTracking();
        this.setupMeasurementDisplay();
    }
    
    /**
     * Setup material for cut line preview
     */
    setupCutLineMaterial() {
        this.cutLineMaterial = new BABYLON.StandardMaterial('sawCutLineMaterial', this.scene);
        this.cutLineMaterial.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.0); // Red
        this.cutLineMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.0, 0.0);
        this.cutLineMaterial.backFaceCulling = false;
    }
    
    /**
     * Setup mouse tracking for saw tool
     */
    setupMouseTracking() {
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.onMouseMove(pointerInfo);
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
                this.onMouseClick(pointerInfo);
            }
        });
    }
    
    /**
     * Setup measurement display for cut line length
     */
    setupMeasurementDisplay() {
        this.measurementDisplay = new BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('SawMeasurement');
        this.measurementDisplay.idealWidth = 1920;
        this.measurementDisplay.idealHeight = 1080;
        this.measurementDisplay.renderAtIdealSize = true;
        
        // Cut length measurement text
        this.measurementText = new BABYLON.GUI.TextBlock();
        this.measurementText.text = '';
        this.measurementText.color = '#ff0000';
        this.measurementText.fontSize = 16;
        this.measurementText.fontWeight = 'bold';
        this.measurementText.shadowColor = 'black';
        this.measurementText.shadowBlur = 2;
        this.measurementText.shadowOffsetX = 1;
        this.measurementText.shadowOffsetY = 1;
        this.measurementText.isVisible = false;
        
        this.measurementDisplay.addControl(this.measurementText);
        
    }
    
    /**
     * Show measurement display with cut line length
     */
    showMeasurementDisplay(screenX, screenY, distance) {
        if (!this.measurementText) return;
        
        const distanceText = `Cut Length: ${distance.toFixed(2)}"`;
        this.measurementText.text = distanceText;
        
        // Position at midpoint of cut line
        this.measurementText.leftInPixels = screenX;
        this.measurementText.topInPixels = screenY - 30;
        this.measurementText.isVisible = true;
    }
    
    /**
     * Hide measurement display
     */
    hideMeasurementDisplay() {
        if (this.measurementText) {
            this.measurementText.isVisible = false;
        }
    }
    
    /**
     * Activate saw tool
     */
    activate() {
        // Check if a workbench piece is selected
        if (!this.drawingWorld.selectedPart) {
            this.showInstructions('Please select a board first before using the saw tool.');
            return false; // Don't activate the tool
        }
        
        // Find the corresponding mesh in the scene
        const selectedMesh = this.scene.meshes.find(mesh => 
            mesh.partData && mesh.partData.id === this.drawingWorld.selectedPart.id
        );
        
        if (!selectedMesh || !selectedMesh.partData || !selectedMesh.isWorkBenchPart) {
            this.showInstructions('Please select a workbench board first before using the saw tool.');
            return false; // Don't activate the tool
        }
        
        // Store the selected part data before it gets cleared
        this.selectedPartForCutting = selectedMesh.partData;
        
        this.sawToolActive = true;
        this.currentStep = 'first_point';
        this.cutPoints = [];
        
        // Set cursor to crosshair
        this.canvas.style.cursor = 'crosshair';
        
        // Position camera above lumber pieces for optimal saw tool view
        this.positionCameraForSawTool();
        
        // Dim unselected pieces to show which will be cut
        this.dimUnselectedPieces();
        
        // Clear any existing preview
        this.clearCutPreview();
        
        // Show instructions
        this.showInstructions('Click first point for cut line');
    }
    
    /**
     * Deactivate saw tool
     */
    deactivate() {
        this.sawToolActive = false;
        this.currentStep = 'first_point';
        this.cutPoints = [];
        this.clearCutPreview();
        this.hideMeasurementDisplay();
        this.hideInstructions();
        this.hideCrosshairMeasurements();
        
        // Reset cursor
        this.canvas.style.cursor = 'default';
        
        // Restore normal opacity to all pieces
        this.restoreNormalOpacity();
        
    }
    
    /**
     * Handle mouse movement for saw tool
     */
    onMouseMove(pointerInfo) {
        if (!this.sawToolActive) return;
        
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => {
                return mesh.partData && mesh.partData.bench === 'work';
            }
        );
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const mesh = pickInfo.pickedMesh;
            const part = mesh.partData;
            
            if (part) {
                this.hoveredPart = part;
                this.targetMesh = mesh;
                
                // Store temporary point for preview
                this.tempPoint = pickInfo.pickedPoint;
                
                // Show crosshair and distance measurements
                this.showCrosshairMeasurements(pickInfo.pickedPoint, mesh);
                
                // Update cut line preview based on current step
                if (this.currentStep === 'second_point' && this.cutPoints.length === 1) {
                    this.updateCutLinePreview();
                }
            }
        } else {
            // Not hovering over lumber - show persistent measurements if we have a target
            if (this.targetMesh && this.currentStep === 'second_point') {
                // Project mouse to the lumber plane to show where cut would go
                this.showOffBoardMeasurements();
            } else {
                // No target lumber - hide measurements
                this.hideCrosshairMeasurements();
            }
        }
    }
    
    /**
     * Handle mouse click for saw tool
     */
    onMouseClick(pointerInfo) {
        if (!this.sawToolActive) return;
        
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => {
                return mesh.partData && mesh.partData.bench === 'work';
            }
        );
        
        let clickPoint = null;
        let targetMesh = null;
        
        if (pickInfo.hit && pickInfo.pickedMesh && pickInfo.pickedMesh.partData) {
            // Direct hit on lumber
            clickPoint = pickInfo.pickedPoint;
            targetMesh = pickInfo.pickedMesh;
        } else {
            // Off-board click - find the closest lumber piece or use current target
            if (this.targetMesh && this.currentStep === 'second_point') {
                // Second point off-board - use existing target
                clickPoint = this.projectMouseToLumberPlane();
                targetMesh = this.targetMesh;
            } else if (this.currentStep === 'first_point') {
                // First point off-board - use selected lumber piece
                const selectedLumber = this.findSelectedLumberPiece();
                if (selectedLumber) {
                    this.targetMesh = selectedLumber;
                    clickPoint = this.projectMouseToLumberPlane();
                    targetMesh = selectedLumber;
                }
            }
        }
        
        if (this.currentStep === 'first_point') {
            // First point clicked - can be on lumber or off-board if targeting a lumber piece
            if (clickPoint && targetMesh) {
                this.cutPoints.push(clickPoint.clone());
                this.targetMesh = targetMesh;
                this.hoveredPart = targetMesh.partData;
                this.currentStep = 'second_point';
                
                // Create first point indicator
                this.createPointIndicator(clickPoint, 1);
                
                this.showInstructions('Click second point for cut line (can be off-board)');
            }
            
        } else if (this.currentStep === 'second_point') {
            // Second point clicked - can be on lumber OR off-board
            if (clickPoint && targetMesh && targetMesh === this.targetMesh) {
                this.cutPoints.push(clickPoint.clone());
                this.currentStep = 'ready_to_cut';
                
                // Create second point indicator
                this.createPointIndicator(clickPoint, 2);
                
                this.executeCut();
            } else if (!clickPoint) {
            } else if (!targetMesh || targetMesh !== this.targetMesh) {
            }
        }
    }
    
    /**
     * Find the selected lumber piece to project onto for off-board cuts
     */
    findSelectedLumberPiece() {
        // Look for selected mesh in the drawing world
        if (this.drawingWorld.selectedMesh && 
            this.drawingWorld.selectedMesh.partData && 
            this.drawingWorld.selectedMesh.partData.bench === 'work') {
            return this.drawingWorld.selectedMesh;
        }
        
        // Fallback: find any work bench mesh
        const workBenchMeshes = this.scene.meshes.filter(mesh => 
            mesh.partData && mesh.partData.bench === 'work'
        );
        
        return workBenchMeshes.length > 0 ? workBenchMeshes[0] : null;
    }
    
    /**
     * Project mouse position to lumber plane for off-board cuts
     */
    projectMouseToLumberPlane() {
        if (!this.targetMesh) return null;
        
        // Create ray from camera through mouse position
        const camera = this.scene.activeCamera;
        const ray = this.scene.createPickingRay(
            this.scene.pointerX, 
            this.scene.pointerY, 
            BABYLON.Matrix.Identity(), 
            camera
        );
        
        // Get lumber bounds to determine the plane
        const bounds = this.targetMesh.getBoundingInfo().boundingBox;
        const center = bounds.center;
        
        // Create a plane at the lumber's Y level (assuming lumber lies flat)
        const planeNormal = new BABYLON.Vector3(0, 1, 0);
        const plane = BABYLON.Plane.FromPositionAndNormal(center, planeNormal);
        
        // Find intersection of ray with plane
        const distance = ray.intersectsPlane(plane);
        if (distance !== null) {
            const intersectionPoint = ray.origin.add(ray.direction.scale(distance));
            return intersectionPoint;
        }
        
        return null;
    }
    
    /**
     * Create visual indicator for cut points
     */
    createPointIndicator(point, number) {
        const indicator = BABYLON.MeshBuilder.CreateSphere(`sawPoint${number}`, {
            diameter: 0.1
        }, this.scene);
        
        indicator.position = point.clone();
        indicator.material = this.cutLineMaterial;
        
        this.pointIndicators.push(indicator);
    }
    
    /**
     * Update cut line preview while moving mouse
     */
    updateCutLinePreview() {
        if (!this.tempPoint || this.cutPoints.length !== 1) return;
        
        this.clearCutLine();
        
        const startPoint = this.cutPoints[0];
        const endPoint = this.tempPoint;
        
        // Create line mesh
        const points = [startPoint, endPoint];
        this.cutLine = BABYLON.MeshBuilder.CreateLines('sawCutLine', {
            points: points,
            colors: [
                new BABYLON.Color4(1, 0, 0, 1),
                new BABYLON.Color4(1, 0, 0, 1)
            ]
        }, this.scene);
        
        // Calculate distance and show measurement
        const distance = BABYLON.Vector3.Distance(startPoint, endPoint);
        const midPoint = BABYLON.Vector3.Lerp(startPoint, endPoint, 0.5);
        const screenPos = BABYLON.Vector3.Project(
            midPoint,
            BABYLON.Matrix.Identity(),
            this.scene.getTransformMatrix(),
            this.scene.activeCamera.viewport
        );
        
        const canvas = this.scene.getEngine().getRenderingCanvas();
        const screenX = screenPos.x * canvas.width;
        const screenY = screenPos.y * canvas.height;
        
        this.showMeasurementDisplay(screenX, screenY, distance);
    }
    
    /**
     * Clear cut line preview
     */
    clearCutLine() {
        if (this.cutLine) {
            this.cutLine.dispose();
            this.cutLine = null;
        }
    }
    
    /**
     * Clear all cut preview elements
     */
    clearCutPreview() {
        this.clearCutLine();
        
        // Clear point indicators
        this.pointIndicators.forEach(indicator => {
            indicator.dispose();
        });
        this.pointIndicators = [];
    }
    
    /**
     * Execute the cutting operation
     */
    executeCut() {
        if (this.cutPoints.length !== 2 || !this.targetMesh) return;
        
        
        const startPoint = this.cutPoints[0];
        const endPoint = this.cutPoints[1];
        // Use the stored selected part for cutting
        const originalPart = this.selectedPartForCutting;
        
        // Create cutting plane
        const cutDirection = endPoint.subtract(startPoint).normalize();
        const cutNormal = new BABYLON.Vector3(-cutDirection.z, 0, cutDirection.x).normalize();
        const cutPlane = BABYLON.Plane.FromPositionAndNormal(startPoint, cutNormal);
        
        // Create two new parts by cutting the original
        this.createCutParts(originalPart, cutPlane);
        
        // Remove original part
        this.removeOriginalPart(originalPart);
        
        // Clear tool state and return to pointer
        this.clearCutPreview();
        this.hideMeasurementDisplay();
        this.hideInstructions();
        
        // Auto-deactivate and return to pointer mode
        this.drawingWorld.activeTool = 'pointer';
        this.drawingWorld.updateToolButtonStates();
        
    }
    
    /**
     * Create two new parts from the cut operation using CSG
     */
    createCutParts(originalPart, cutPlane) {
        // Create cutting mesh (straight line blade)
        const cuttingMesh = this.createStraightLineCutter(originalPart);
        if (!cuttingMesh) {
            return;
        }
        
        // Perform CSG cutting
        const originalMesh = this.scene.meshes.find(m => m.partData && m.partData.id === originalPart.id);
        if (!originalMesh) {
            return;
        }
        
        // Use CSG operations to create actual cut pieces
        const cutPieces = this.performCSGCutting(originalMesh, cuttingMesh, originalPart);
        
        // Clean up cutting mesh
        cuttingMesh.dispose();
        
    }
    
    /**
     * Create straight line cutting mesh (like scroll saw blade but straight)
     */
    createStraightLineCutter(originalPart) {
        const originalMesh = this.scene.meshes.find(m => m.partData && m.partData.id === originalPart.id);
        if (!originalMesh) return null;
        
        // Get board dimensions for cutter sizing
        const bounds = originalMesh.getBoundingInfo();
        const boardHeight = bounds.maximum.y - bounds.minimum.y;
        const boardTop = bounds.maximum.y + originalMesh.position.y;
        const boardBottom = bounds.minimum.y + originalMesh.position.y;
        
        // Calculate cut line length and direction
        const cutStart = this.cutPoints[0];
        const cutEnd = this.cutPoints[1];
        const cutDirection = cutEnd.subtract(cutStart).normalize();
        const cutLength = BABYLON.Vector3.Distance(cutStart, cutEnd);
        const cutCenter = cutStart.add(cutEnd).scale(0.5);
        
        // Create blade geometry - thin box along cut line
        const kerfWidthCm = this.kerfWidth * 2.54; // Convert inches to cm
        const cuttingBox = BABYLON.MeshBuilder.CreateBox('sawBlade', {
            width: kerfWidthCm,
            height: boardHeight + 2, // Extend beyond board
            depth: cutLength + 1 // Extend beyond cut line
        }, this.scene);
        
        // Position and orient the cutter
        cuttingBox.position = cutCenter.clone();
        cuttingBox.position.y = (boardTop + boardBottom) / 2; // Center vertically
        
        // Rotate cutter to align with cut line
        const angle = Math.atan2(cutDirection.x, cutDirection.z);
        cuttingBox.rotation.y = angle;
        
        // Hide the cutting blade from view
        cuttingBox.isVisible = false;
        
        return cuttingBox;
    }
    
    /**
     * Create a large cutting plane for CSG operations
     */
    createCuttingPlane(center, normal, referenceMesh) {
        // Get reference mesh bounds to size the cutting plane appropriately
        const bounds = referenceMesh.getBoundingInfo();
        const size = bounds.maximum.subtract(bounds.minimum);
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        // Create a large box that will act as a cutting plane
        const cuttingPlane = BABYLON.MeshBuilder.CreateBox('cuttingPlane', {
            width: maxDimension * 2,
            height: maxDimension * 2, 
            depth: maxDimension * 2
        }, this.scene);
        
        // Position the cutting plane
        cuttingPlane.position = center.clone();
        
        // Orient cutting plane along the normal direction
        // The cutting plane will remove everything on the side it extends toward
        cuttingPlane.position = cuttingPlane.position.add(normal.scale(maxDimension));
        
        cuttingPlane.isVisible = false;
        return cuttingPlane;
    }
    
    /**
     * Scale a mesh to match new dimensions
     */
    scaleMeshToDimensions(mesh, newDims, originalDims) {
        // Calculate scale factors for each dimension
        const scaleX = newDims.width / originalDims.width;
        const scaleY = newDims.thickness / originalDims.thickness;
        const scaleZ = newDims.length / originalDims.length;
        
        // Apply scaling
        mesh.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
        
        // Force baking of the scaling into the geometry
        mesh.bakeCurrentTransformIntoVertices();
        mesh.scaling = new BABYLON.Vector3(1, 1, 1);
    }
    
    /**
     * Perform CSG cutting operation (adapted from scroll saw)
     */
    performCSGCutting(originalMesh, cuttingMesh, originalPart) {
        try {
            // Calculate proper cut line intersection with board edges
            const cutStart = this.cutPoints[0];
            const cutEnd = this.cutPoints[1];
            
            // Get original board bounds (without adding position)
            const bounds = originalMesh.getBoundingInfo();
            const min = bounds.minimum;
            const max = bounds.maximum;
            
            // Calculate where the angled cut line intersects the board edges
            // Cut line equation: point + t * direction
            const cutDirection = cutEnd.subtract(cutStart);
            
            // Find intersections with left edge (x = min.x) and right edge (x = max.x)
            const leftT = (min.x - cutStart.x) / cutDirection.x;
            const rightT = (max.x - cutStart.x) / cutDirection.x;
            
            const leftCutZ = cutStart.z + leftT * cutDirection.z;
            const rightCutZ = cutStart.z + rightT * cutDirection.z;
            
            // Create piece 1: from board front to angled cut line
            const piece1Vertices = [
                min.x, min.y, min.z,        // front-left-bottom
                max.x, min.y, min.z,        // front-right-bottom  
                max.x, max.y, min.z,        // front-right-top
                min.x, max.y, min.z,        // front-left-top
                min.x, min.y, leftCutZ,     // cut-left-bottom
                max.x, min.y, rightCutZ,    // cut-right-bottom
                max.x, max.y, rightCutZ,    // cut-right-top
                min.x, max.y, leftCutZ      // cut-left-top
            ];
            
            // Create piece 2: from angled cut line to board back
            const piece2Vertices = [
                min.x, min.y, leftCutZ,     // cut-left-bottom
                max.x, min.y, rightCutZ,    // cut-right-bottom
                max.x, max.y, rightCutZ,    // cut-right-top
                min.x, max.y, leftCutZ,     // cut-left-top
                min.x, min.y, max.z,        // back-left-bottom
                max.x, min.y, max.z,        // back-right-bottom
                max.x, max.y, max.z,        // back-right-top
                min.x, max.y, max.z         // back-left-top
            ];
            
            // Create indices for box faces
            const indices = [
                0,1,2, 0,2,3,   // front
                4,7,6, 4,6,5,   // back  
                0,4,5, 0,5,1,   // bottom
                2,6,7, 2,7,3,   // top
                0,3,7, 0,7,4,   // left
                1,5,6, 1,6,2    // right
            ];
            
            // Create custom meshes with proper centering
            const piece1Temp = new BABYLON.Mesh('piece1', this.scene);
            const piece1Data = new BABYLON.VertexData();
            piece1Data.positions = piece1Vertices;
            piece1Data.indices = indices;
            piece1Data.normals = [];
            BABYLON.VertexData.ComputeNormals(piece1Vertices, indices, piece1Data.normals);
            piece1Data.applyToMesh(piece1Temp);
            piece1Temp.material = originalMesh.material;
            
            const piece2Temp = new BABYLON.Mesh('piece2', this.scene);
            const piece2Data = new BABYLON.VertexData();
            piece2Data.positions = piece2Vertices;
            piece2Data.indices = indices;
            piece2Data.normals = [];
            BABYLON.VertexData.ComputeNormals(piece2Vertices, indices, piece2Data.normals);
            piece2Data.applyToMesh(piece2Temp);
            piece2Temp.material = originalMesh.material;
            
            // Create part data
            const part1Data = this.createNewPartData(originalPart, 'Main');
            const part2Data = this.createNewPartData(originalPart, 'Cutoff');
            
            // Create completely fresh meshes from the CSG results
            const piece1 = this.createFreshMeshFromCSG(piece1Temp, part1Data.id + '_mesh');
            const piece2 = this.createFreshMeshFromCSG(piece2Temp, part2Data.id + '_mesh');
            
            // Dispose temporary CSG meshes
            piece1Temp.dispose();
            piece2Temp.dispose();
            
            // Assign part data and cleanup flags to meshes
            piece1.partData = part1Data;
            piece1.isWorkBenchPart = true;
            piece1.parent = null;
            piece1.id = part1Data.id;
            
            piece2.partData = part2Data;
            piece2.isWorkBenchPart = true;
            piece2.parent = null;
            piece2.id = part2Data.id;
            
            // Position pieces with kerf gap - simple Z-axis separation
            const kerfCm = this.kerfWidth * 2.54; // Convert kerf to cm
            
            // Position piece1 at original location
            piece1.position = originalMesh.position.clone();
            piece1.rotation = originalMesh.rotation.clone();
            
            // Position piece2 offset by kerf width in Z direction
            piece2.position = originalMesh.position.clone();
            piece2.position.z -= kerfCm; // Move piece2 back by kerf width
            piece2.rotation = originalMesh.rotation.clone();
            
            // Remove original mesh from scene
            originalMesh.dispose();
            
            // Update the original part data with main piece
            const originalIndex = this.drawingWorld.workBenchParts.findIndex(p => p.id === originalPart.id);
            if (originalIndex !== -1) {
                this.drawingWorld.workBenchParts[originalIndex] = part1Data;
            }
            
            // Add cutoff piece to workbench
            this.drawingWorld.workBenchParts.push(part2Data);
            
            return [piece1, piece2];
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Create a completely fresh mesh from CSG result to break any internal links
     */
    createFreshMeshFromCSG(csgMesh, newName) {
        // Extract geometry data
        const positions = csgMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = csgMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        const uvs = csgMesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
        const indices = csgMesh.getIndices();
        
        // Create completely new mesh
        const freshMesh = new BABYLON.Mesh(newName, this.scene);
        
        // Create new vertex data
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.normals = normals;
        vertexData.uvs = uvs;
        vertexData.indices = indices;
        
        // Apply to fresh mesh
        vertexData.applyToMesh(freshMesh);
        
        // Clone material to ensure independence
        freshMesh.material = csgMesh.material.clone(newName + '_material');
        
        
        return freshMesh;
    }
    
    /**
     * Calculate dimensions for cut piece
     * Note: This approximates angled cuts with rectangular pieces
     * For true geometry following cut lines, CSG operations would be needed
     */
    calculateCutDimensions(originalPart, side) {
        // Get original dimensions
        const originalDims = originalPart.dimensions;
        
        // Calculate cut position relative to lumber
        const originalMesh = this.scene.meshes.find(m => m.partData && m.partData.id === originalPart.id);
        if (!originalMesh) return null;
        
        // Get cut line in local coordinates
        const cutStart = this.cutPoints[0];
        const cutEnd = this.cutPoints[1];
        
        // For angled cuts, we need to calculate where the cut line intersects the lumber edges
        const bounds = originalMesh.getBoundingInfo();
        const lumberCenter = originalMesh.position;
        
        // Get lumber bounds in world coordinates
        const lumberLength = originalDims.length * 2.54; // Convert to cm
        const lumberWidth = originalDims.width * 2.54; // Convert to cm
        const lumberLeft = lumberCenter.x - lumberWidth / 2;
        const lumberRight = lumberCenter.x + lumberWidth / 2;
        const lumberFront = lumberCenter.z - lumberLength / 2;
        const lumberBack = lumberCenter.z + lumberLength / 2;
        
        // Calculate cut line direction and create line equation
        const cutDirection = cutEnd.subtract(cutStart);
        const cutLength = cutDirection.length();
        
        // For simplicity, project cut center onto lumber length axis (Z)
        // This approximates where the cut divides the lumber
        const cutCenter = cutStart.add(cutEnd).scale(0.5);
        let cutPositionZ = cutCenter.z;
        
        // Clamp to lumber bounds
        cutPositionZ = Math.max(lumberFront, Math.min(lumberBack, cutPositionZ));
        
        // Calculate distance from lumber start to cut position
        const cutDistance = Math.max(0, (cutPositionZ - lumberFront) / 2.54); // Convert cm to inches
        
        
        if (side === 'positive') {
            // Left/Top piece - gets accurate dimension (no kerf deduction)
            const finalLength = Math.max(0.1, cutDistance);
            return {
                length: finalLength,
                width: originalDims.width,
                thickness: originalDims.thickness
            };
        } else {
            // Right/Bottom piece - absorbs the kerf loss
            const remainingLength = originalDims.length - cutDistance;
            const finalLength = Math.max(0.1, remainingLength - this.kerfWidth);
            return {
                length: finalLength,
                width: originalDims.width,
                thickness: originalDims.thickness
            };
        }
    }
    
    /**
     * Position cut pieces naturally with kerf gap
     */
    positionCutPieces(originalPart, mesh1, mesh2, dims1, dims2) {
        const originalMesh = this.scene.meshes.find(m => m.partData && m.partData.id === originalPart.id);
        if (!originalMesh) return;
        
        // Calculate cut direction and separation
        const cutStart = this.cutPoints[0];
        const cutEnd = this.cutPoints[1];
        const cutDirection = cutEnd.subtract(cutStart).normalize();
        
        // Get board's primary axis (length direction)
        const bounds = originalMesh.getBoundingInfo();
        const size = bounds.maximum.subtract(bounds.minimum);
        const isLengthwiseZ = size.z > size.x; // True if length runs along Z axis
        
        // Position piece1 at original location
        mesh1.position = originalMesh.position.clone();
        mesh1.rotation = originalMesh.rotation.clone();
        
        // Position piece2 separated along the primary axis
        mesh2.position = originalMesh.position.clone();
        mesh2.rotation = originalMesh.rotation.clone();
        
        // Separate pieces by their combined length plus a visible gap
        const separationDistance = (dims1.length + dims2.length) / 2 + 10; // 10cm gap for visibility
        
        if (isLengthwiseZ) {
            mesh2.position.z += separationDistance;
        } else {
            mesh2.position.x += separationDistance;
        }
    }
    
    /**
     * Create new part data from original part
     */
    createNewPartData(originalPart, suffix) {
        const newPart = {
            ...originalPart,
            id: 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            materialName: originalPart.materialName + ` (Cut ${suffix})`,
            status: 'cut',
            // Clear meshGeometry so new geometry is created with updated dimensions
            meshGeometry: null,
            processingHistory: [
                ...(originalPart.processingHistory || []),
                {
                    operation: 'saw_cut',
                    timestamp: new Date().toISOString(),
                    details: `Straight line cut - piece ${suffix}`
                }
            ]
        };
        
        return newPart;
    }
    
    
    /**
     * Remove original part from scene and arrays
     */
    removeOriginalPart(originalPart) {
        // Find and remove mesh
        const originalMesh = this.scene.meshes.find(m => m.partData && m.partData.id === originalPart.id);
        if (originalMesh) {
            originalMesh.dispose();
        }
        
        // Remove from work bench parts array
        this.drawingWorld.workBenchParts = this.drawingWorld.workBenchParts.filter(
            p => p.id !== originalPart.id
        );
        
        // Update project explorer
        this.drawingWorld.updateWorkBenchDisplay();
    }
    
    /**
     * Show instructions to user
     */
    showInstructions(message) {
        // This would integrate with the notification system
    }
    
    /**
     * Hide instructions
     */
    hideInstructions() {
        // Clear any instruction displays
    }
    
    /**
     * Show measurements when cursor is off the board but still relevant
     */
    showOffBoardMeasurements() {
        if (!this.targetMesh) return;
        
        // Project mouse position onto the lumber plane
        const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, BABYLON.Matrix.Identity(), this.scene.activeCamera);
        
        // Get lumber plane (assuming Y is up)
        const lumberY = this.targetMesh.position.y + this.targetMesh.getBoundingInfo().maximum.y;
        const lumberPlane = new BABYLON.Plane(0, 1, 0, -lumberY);
        
        // Find intersection with lumber plane
        const distance = ray.intersectsPlane(lumberPlane);
        if (distance !== null) {
            const projectedPoint = ray.origin.add(ray.direction.scale(distance));
            
            // Show persistent measurements even when off board
            this.showCrosshairMeasurements(projectedPoint, this.targetMesh, true);
        }
    }
    
    /**
     * Show crosshair cursor with distance measurements in 4 quadrants
     */
    showCrosshairMeasurements(worldPoint, mesh, isOffBoard = false) {
        // Clear existing crosshair
        this.hideCrosshairMeasurements();
        
        // Get lumber dimensions in inches
        const partData = mesh.partData;
        const lumberLength = partData.dimensions.length;
        const lumberWidth = partData.dimensions.width;
        
        
        // Get mesh bounds and position
        const bounds = mesh.getBoundingInfo();
        const meshCenter = mesh.position;
        const meshSize = bounds.maximum.subtract(bounds.minimum);
        
        
        // Use actual mesh bounds instead of calculated dimensions to handle scaling
        const minX = meshCenter.x + bounds.minimum.x;
        const maxX = meshCenter.x + bounds.maximum.x;
        const minZ = meshCenter.z + bounds.minimum.z;
        const maxZ = meshCenter.z + bounds.maximum.z;
        
        
        // Calculate distances from cursor to each edge (convert cm to inches)
        const distanceFromLeftEdge = (worldPoint.x - minX) / 2.54;   // Distance from left edge
        const distanceFromRightEdge = (maxX - worldPoint.x) / 2.54;  // Distance from right edge
        const distanceFromFrontEdge = (worldPoint.z - minZ) / 2.54;  // Distance from front edge
        const distanceFromBackEdge = (maxZ - worldPoint.z) / 2.54;   // Distance from back edge
        
        // For off-board measurements, allow negative distances (cursor is past the edge)
        const leftDist = isOffBoard ? distanceFromLeftEdge : Math.max(0, distanceFromLeftEdge);
        const rightDist = isOffBoard ? distanceFromRightEdge : Math.max(0, distanceFromRightEdge);
        const frontDist = isOffBoard ? distanceFromFrontEdge : Math.max(0, distanceFromFrontEdge);
        const backDist = isOffBoard ? distanceFromBackEdge : Math.max(0, distanceFromBackEdge);
        
        // Determine which measurements to show based on cursor position
        let showLeft, showRight, showFront, showBack;
        
        if (!isOffBoard) {
            // On board - show all measurements
            showLeft = showRight = showFront = showBack = true;
        } else {
            // Off board - show persistent measurements based on which edge cursor is off
            const isOffLeftEdge = worldPoint.x < minX;
            const isOffRightEdge = worldPoint.x > maxX;
            const isOffFrontEdge = worldPoint.z < minZ;
            const isOffBackEdge = worldPoint.z > maxZ;
            
            // Show top/bottom measurements when off left/right edges
            if (isOffLeftEdge || isOffRightEdge) {
                showLeft = showRight = false;
                showFront = showBack = true;
            }
            // Show left/right measurements when off front/back edges  
            else if (isOffFrontEdge || isOffBackEdge) {
                showLeft = showRight = true;
                showFront = showBack = false;
            }
            // Default to showing all if unclear
            else {
                showLeft = showRight = showFront = showBack = true;
            }
        }
        
        
        // Verify calculations make sense
        const totalX = leftDist + rightDist;
        const totalZ = frontDist + backDist;
        
        // Create crosshair visual elements and distance labels
        this.createCrosshairVisuals(worldPoint, {
            left: leftDist,
            right: rightDist,
            front: frontDist,
            back: backDist
        }, {
            showLeft,
            showRight,
            showFront,
            showBack,
            isOffBoard
        });
    }
    
    /**
     * Create visual crosshair with distance measurements
     */
    createCrosshairVisuals(worldPoint, distances, visibility = {}) {
        // Store crosshair elements for cleanup
        if (!this.crosshairElements) {
            this.crosshairElements = [];
        }
        
        // Create crosshair lines - make them larger and higher above surface
        const crosshairSize = 25; // Smaller, more precise crosshair
        const heightOffset = 2; // Higher above surface to avoid Z-fighting
        
        // Horizontal line
        const horizontalPoints = [
            new BABYLON.Vector3(worldPoint.x - crosshairSize, worldPoint.y + heightOffset, worldPoint.z),
            new BABYLON.Vector3(worldPoint.x + crosshairSize, worldPoint.y + heightOffset, worldPoint.z)
        ];
        
        // Vertical line  
        const verticalPoints = [
            new BABYLON.Vector3(worldPoint.x, worldPoint.y + heightOffset, worldPoint.z - crosshairSize),
            new BABYLON.Vector3(worldPoint.x, worldPoint.y + heightOffset, worldPoint.z + crosshairSize)
        ];
        
        // Create line meshes with custom material for better visibility
        const horizontalLine = BABYLON.MeshBuilder.CreateLines("crosshairH", {
            points: horizontalPoints,
            updatable: true
        }, this.scene);
        
        const verticalLine = BABYLON.MeshBuilder.CreateLines("crosshairV", {
            points: verticalPoints,
            updatable: true
        }, this.scene);
        
        // Create custom material for better control
        const crosshairMaterial = new BABYLON.StandardMaterial("crosshairMaterial", this.scene);
        crosshairMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // White
        crosshairMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Slight glow
        crosshairMaterial.disableLighting = true;
        
        // Style the lines with better visibility
        horizontalLine.color = new BABYLON.Color3(1, 1, 1); // White
        verticalLine.color = new BABYLON.Color3(1, 1, 1); // White
        horizontalLine.material = crosshairMaterial;
        verticalLine.material = crosshairMaterial;
        
        // Ensure they render on top
        horizontalLine.renderingGroupId = 1;
        verticalLine.renderingGroupId = 1;
        
        this.crosshairElements.push(horizontalLine, verticalLine, crosshairMaterial);
        
        
        // Create distance text labels in 4 quadrants
        this.createDistanceLabels(worldPoint, distances, visibility);
    }
    
    /**
     * Create distance labels in 4 quadrants around crosshair
     */
    createDistanceLabels(worldPoint, distances, visibility = { showLeft: true, showRight: true, showFront: true, showBack: true }) {
        
        // Create GUI for text labels if it doesn't exist
        if (!this.crosshairGUI) {
            this.crosshairGUI = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("CrosshairGUI");
        }
        
        // Convert world point to screen coordinates
        const camera = this.scene.activeCamera;
        const engine = this.scene.getEngine();
        const viewport = camera.viewport;
        
        const screenPoint = BABYLON.Vector3.Project(
            worldPoint,
            BABYLON.Matrix.Identity(),
            this.scene.getTransformMatrix(),
            viewport
        );
        
        
        // Convert to pixel coordinates
        const screenX = screenPoint.x * this.canvas.width;
        const screenY = screenPoint.y * this.canvas.height;
        
        
        // Format distances as fractions with directional labels - show final piece dimensions after kerf
        // Apply kerf rule: leftward/upper piece gets accurate cut, rightward/lower piece absorbs kerf
        const leftPieceSize = distances.left; // Left piece gets accurate dimension
        const rightPieceSize = Math.max(0.1, distances.right - this.kerfWidth); // Right piece absorbs kerf
        const frontPieceSize = distances.front; // Front piece gets accurate dimension  
        const backPieceSize = Math.max(0.1, distances.back - this.kerfWidth); // Back piece absorbs kerf
        
        const leftText = `←${this.formatInchesAsFraction(leftPieceSize)}`;
        const rightText = `${this.formatInchesAsFraction(rightPieceSize)}→`;
        const frontText = `↑${this.formatInchesAsFraction(frontPieceSize)}`;
        const backText = `${this.formatInchesAsFraction(backPieceSize)}↓`;
        
        
        // Create 4 distance labels positioned logically around crosshair - only show visible ones
        const labelOffset = 60;
        const labels = [];
        
        if (visibility.showLeft) {
            labels.push({ text: leftText, x: screenX - labelOffset, y: screenY - 10, name: "left", desc: "left piece size (full)" });
        }
        if (visibility.showRight) {
            labels.push({ text: rightText, x: screenX + labelOffset, y: screenY - 10, name: "right", desc: "right piece size (minus kerf)" });
        }
        if (visibility.showBack) {
            labels.push({ text: backText, x: screenX - 10, y: screenY - labelOffset, name: "back", desc: "back piece size (minus kerf)" });
        }
        if (visibility.showFront) {
            labels.push({ text: frontText, x: screenX - 10, y: screenY + labelOffset, name: "front", desc: "front piece size (full)" });
        }
        
        labels.forEach((labelData, index) => {
            const textBlock = new BABYLON.GUI.TextBlock(`distanceLabel${index}_${labelData.name}`, labelData.text);
            textBlock.fontSize = "18px";
            textBlock.color = "yellow"; // Bright color for visibility
            textBlock.fontWeight = "bold";
            textBlock.outlineWidth = 2;
            textBlock.outlineColor = "black";
            
            // Position relative to center of screen
            textBlock.leftInPixels = labelData.x - (this.canvas.width / 2);
            textBlock.topInPixels = labelData.y - (this.canvas.height / 2);
            
            
            this.crosshairGUI.addControl(textBlock);
            this.crosshairElements.push(textBlock);
        });
        
    }
    
    /**
     * Hide crosshair measurements
     */
    hideCrosshairMeasurements() {
        if (this.crosshairElements) {
            this.crosshairElements.forEach(element => {
                if (element.dispose) {
                    element.dispose();
                } else if (this.crosshairGUI && element.parent === this.crosshairGUI) {
                    this.crosshairGUI.removeControl(element);
                }
            });
            this.crosshairElements = [];
        }
    }
    
    /**
     * Format decimal inches as fractions (e.g., 2.5 becomes "2 1/2"", 3.75 becomes "3 3/4"")
     */
    formatInchesAsFraction(decimalInches) {
        if (decimalInches < 0) return "0\"";
        
        const wholeInches = Math.floor(decimalInches);
        const fractionalPart = decimalInches - wholeInches;
        
        // Common woodworking fractions (1/16th precision)
        const fractions = [
            { decimal: 0, fraction: "" },
            { decimal: 1/16, fraction: "1/16" },
            { decimal: 1/8, fraction: "1/8" },
            { decimal: 3/16, fraction: "3/16" },
            { decimal: 1/4, fraction: "1/4" },
            { decimal: 5/16, fraction: "5/16" },
            { decimal: 3/8, fraction: "3/8" },
            { decimal: 7/16, fraction: "7/16" },
            { decimal: 1/2, fraction: "1/2" },
            { decimal: 9/16, fraction: "9/16" },
            { decimal: 5/8, fraction: "5/8" },
            { decimal: 11/16, fraction: "11/16" },
            { decimal: 3/4, fraction: "3/4" },
            { decimal: 13/16, fraction: "13/16" },
            { decimal: 7/8, fraction: "7/8" },
            { decimal: 15/16, fraction: "15/16" }
        ];
        
        // Find closest fraction
        let closestFraction = fractions[0];
        let minDifference = Math.abs(fractionalPart - closestFraction.decimal);
        
        for (const frac of fractions) {
            const difference = Math.abs(fractionalPart - frac.decimal);
            if (difference < minDifference) {
                minDifference = difference;
                closestFraction = frac;
            }
        }
        
        // Handle rounding up to next whole inch
        if (closestFraction.decimal === 0 && fractionalPart > 0.03) {
            // If we're very close to a whole number, round appropriately
            const roundedFractional = Math.round(fractionalPart * 16) / 16;
            if (roundedFractional >= 1) {
                return `${wholeInches + 1}"`;
            }
        }
        
        // Build result string
        let result = "";
        if (wholeInches > 0) {
            result += wholeInches;
            if (closestFraction.fraction) {
                result += " " + closestFraction.fraction;
            }
        } else if (closestFraction.fraction) {
            result = closestFraction.fraction;
        } else {
            result = "0";
        }
        
        return result + '"';
    }
    
    /**
     * Position camera directly above lumber pieces for optimal saw tool operation
     * Camera will be positioned looking straight down at the workbench pieces
     */
    positionCameraForSawTool() {
        
        // Stop any existing camera animations
        this.scene.stopAnimation(this.drawingWorld.camera);
        
        // Get all workbench parts
        const workbenchParts = this.scene.meshes.filter(m => m.isWorkBenchPart);
        
        if (workbenchParts.length === 0) {
            return;
        }
        
        // Calculate the bounding box of all workbench parts
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let maxY = -Infinity;
        
        workbenchParts.forEach(mesh => {
            const bounds = mesh.getBoundingInfo();
            const min = bounds.minimum;
            const max = bounds.maximum;
            
            minX = Math.min(minX, mesh.position.x + min.x);
            maxX = Math.max(maxX, mesh.position.x + max.x);
            minZ = Math.min(minZ, mesh.position.z + min.z);
            maxZ = Math.max(maxZ, mesh.position.z + max.z);
            maxY = Math.max(maxY, mesh.position.y + max.y);
        });
        
        // Calculate center point of all parts
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const centerY = maxY; // Top of the tallest part
        
        // Calculate workbench dimensions
        const workbenchWidth = maxX - minX;   // X dimension
        const workbenchDepth = maxZ - minZ;   // Z dimension
        
        // Determine which dimension is longer
        const isWidthLonger = workbenchWidth > workbenchDepth;
        
        // Calculate camera distance - balance between too tight and too far
        const maxDimension = Math.max(workbenchWidth, workbenchDepth);
        const cameraDistance = Math.max(maxDimension * 1.1, 120); // Sweet spot for framing
        
        
        // Target position (center of workbench parts)
        const targetPosition = new BABYLON.Vector3(centerX, centerY, centerZ);
        
        // Camera setup for optimal lumber orientation
        let cameraPosition;
        let cameraRotation = null;
        
        if (isWidthLonger) {
            // Width (X) is longer - lumber is already landscape in world coordinates
            cameraPosition = new BABYLON.Vector3(centerX, centerY + cameraDistance, centerZ);
        } else {
            // Depth (Z) is longer - need to rotate camera view so Z-axis appears horizontal
            cameraPosition = new BABYLON.Vector3(centerX, centerY + cameraDistance, centerZ);
            // We'll set camera alpha rotation to make Z-axis appear horizontal
            cameraRotation = Math.PI / 2; // 90 degree rotation
        }
        
        
        // Animate camera to top-down position
        const animationDuration = 60; // 1 second at 60fps
        
        // Animate camera position
        BABYLON.Animation.CreateAndStartAnimation(
            "sawToolCameraPosition",
            this.drawingWorld.camera,
            "position",
            60,
            animationDuration,
            this.drawingWorld.camera.position,
            cameraPosition,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase(),
            () => {
            }
        );
        
        // Animate camera target
        BABYLON.Animation.CreateAndStartAnimation(
            "sawToolCameraTarget",
            this.drawingWorld.camera,
            "target",
            60,
            animationDuration,
            this.drawingWorld.camera.target,
            targetPosition,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase()
        );
        
        // Animate camera rotation if needed (for landscape orientation)
        if (cameraRotation !== null) {
            BABYLON.Animation.CreateAndStartAnimation(
                "sawToolCameraRotation",
                this.drawingWorld.camera,
                "alpha",
                60,
                animationDuration,
                this.drawingWorld.camera.alpha,
                cameraRotation,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase()
            );
        }
    }
    
    /**
     * Cleanup when tool system is destroyed
     */
    destroy() {
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
        }
        
        this.clearCutPreview();
        
        if (this.measurementDisplay) {
            this.measurementDisplay.dispose();
        }
        
        if (this.cutLineMaterial) {
            this.cutLineMaterial.dispose();
        }
    }
    
    /**
     * Dim unselected pieces to show which board will be cut
     */
    dimUnselectedPieces() {
        // Use stored part data since selection may have been cleared
        if (!this.selectedPartForCutting) {
            return;
        }
        
        const selectedPartId = this.selectedPartForCutting.id;
        
        // Find all workbench meshes (remove bench check since it's not in the data)
        const workbenchMeshes = this.scene.meshes.filter(mesh => 
            mesh.isWorkBenchPart && mesh.partData
        );
        
        let dimmedCount = 0;
        workbenchMeshes.forEach(mesh => {
            if (mesh.partData && mesh.partData.id === selectedPartId) {
                // Keep selected piece at full brightness
                if (mesh.material) {
                    mesh.material.alpha = 1.0;
                }
            } else {
                // Dim unselected pieces
                if (mesh.material) {
                    mesh.material.alpha = 0.3;
                    dimmedCount++;
                }
            }
        });
        
    }
    
    /**
     * Restore normal opacity to all pieces
     */
    restoreNormalOpacity() {
        const workbenchMeshes = this.scene.meshes.filter(mesh => 
            mesh.isWorkBenchPart && mesh.partData && mesh.partData.bench === 'work'
        );
        
        workbenchMeshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.alpha = 1.0;
            }
        });
        
    }
    
    /**
     * Minimal deactivate method - only called when switching tools
     */
    deactivate() {
        // Only reset cursor and restore opacity - don't interfere with cutting process
        this.canvas.style.cursor = 'default';
        this.restoreNormalOpacity();
    }
}