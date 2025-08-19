/**
 * CutToolSystem Module - Professional Lumber Cutting Tools
 * 
 * Handles rip cuts (along grain/length) and cross cuts (across grain/width)
 * with real-time cut line preview and precision cutting execution.
 * 
 * Features:
 * - Real-time cut line preview on mouse hover
 * - Proximity detection for boards under cursor
 * - Rip cut (long dimension) and cross cut (short dimension) modes
 * - Click-to-cut execution with automatic part splitting
 * - Professional visual feedback and UI integration
 */

export class CutToolSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        
        // User-definable kerf width (blade thickness) in inches
        this.kerfWidth = 0.0625; // 1/16 inch default, matching SawToolSystem
        
        // Cut tool state
        this.activeCutDirection = null; // 'rip' or 'cross'
        this.cutPreviewLine = null;
        this.hoveredPart = null;
        this.cutPreviewActive = false;
        this.cutPosition = 0; // Position along the cut axis (0-1)
        
        // Visual elements
        this.cutPreviewMaterial = null;
        this.cutIndicators = [];
        
        // Pending cut data for editable measurements
        this.pendingCutMesh = null;
        this.pendingCutPosition = null;
        this.currentCutLine = null;
        
        // Mouse tracking
        this.isMouseOverPart = false;
        this.lastMousePosition = null;
        this.pointerObserver = null;
        
        // Waste selection system
        this.wasteSelectionActive = false;
        this.wasteCandidateMeshes = null;
        this.wasteCandidateData = null;
        this.originalMaterials = null;
        this.hashMaterial = null;
        
        // Cut line storage
        this.storedCutLine = null;
        
        // Real-time measurement display
        this.measurementDisplay = null;
        this.leftMeasurementText = null;
        this.rightMeasurementText = null;
        
        // Colored preview pieces
        this.leftPreviewPiece = null;
        this.rightPreviewPiece = null;
        
        // Camera animation
        this.cameraAnimation = null;
        
        this.init();
    }

    /**
     * Determine which routed edges should be inherited by cut pieces
     * @param {Array} routedEdges - Array of edge types that were routed on original piece
     * @param {string} pieceType - 'piece1' or 'piece2' 
     * @param {string} cutDirection - 'cross' or 'rip'
     * @returns {Array} Edge types that should be preserved on this cut piece
     */
    determineInheritedEdges(routedEdges, pieceType, cutDirection) {
        const inheritedEdges = [];
        
        for (const edgeType of routedEdges) {
            let shouldInherit = false;
            
            if (cutDirection === 'cross') {
                // Cross cut: cutting along length, pieces are shorter
                // Long edges (left/right) are preserved on both pieces
                // Short edges (front/back) are only preserved on appropriate piece
                if (edgeType.includes('left_edge') || edgeType.includes('right_edge')) {
                    shouldInherit = true; // Both pieces inherit left/right edges
                } else if (edgeType.includes('front_edge') && pieceType === 'piece1') {
                    shouldInherit = true; // Only piece1 (front piece) inherits front edges
                } else if (edgeType.includes('back_edge') && pieceType === 'piece2') {
                    shouldInherit = true; // Only piece2 (back piece) inherits back edges
                }
            } else if (cutDirection === 'rip') {
                // Rip cut: cutting along width, pieces are narrower
                // Short edges (front/back) are preserved on both pieces
                // Long edges (left/right) are only preserved on appropriate piece
                if (edgeType.includes('front_edge') || edgeType.includes('back_edge')) {
                    shouldInherit = true; // Both pieces inherit front/back edges
                } else if (edgeType.includes('left_edge') && pieceType === 'piece1') {
                    shouldInherit = true; // Only piece1 (left piece) inherits left edges
                } else if (edgeType.includes('right_edge') && pieceType === 'piece2') {
                    shouldInherit = true; // Only piece2 (right piece) inherits right edges
                }
            }
            
            if (shouldInherit) {
                inheritedEdges.push(edgeType);
            }
        }
        
        return inheritedEdges;
    }

    /**
     * Execute CSG-based cutting for routed geometry
     */
    executeCsgCut(originalMesh, partData, cutPosition) {
        
        // Get cut information
        const cutDimension = this.activeCutDirection === 'cross' ? partData.dimensions.length : partData.dimensions.width;
        const cutPositionInches = cutDimension * cutPosition;
        
        // Calculate piece dimensions
        const piece1Size = cutPositionInches;
        const piece2Size = cutDimension - cutPositionInches;
        
        
        try {
            // Create cutting planes
            const { cuttingPlane1, cuttingPlane2 } = this.createCuttingPlanes(originalMesh, cutPosition);
            
            // Perform CSG intersections to create actual cut pieces
            const piece1Mesh = this.performCsgIntersection(originalMesh, cuttingPlane1, `${partData.id}_A`);
            const piece2Mesh = this.performCsgIntersection(originalMesh, cuttingPlane2, `${partData.id}_B`);
            
            if (!piece1Mesh || !piece2Mesh) {
                
                // Clean up any created meshes
                if (piece1Mesh) piece1Mesh.dispose();
                if (piece2Mesh) piece2Mesh.dispose();
                
                return this.executeDimensionBasedCut(originalMesh, partData, cutPosition);
            }
            
            // Create part data for pieces
            const timestamp = Date.now();
            const piece1Data = this.createCutPieceData(partData, piece1Size, 'A', timestamp);
            const piece2Data = this.createCutPieceData(partData, piece2Size, 'B', timestamp + 1);
            
            // Serialize the actual cut geometry
            piece1Data.meshGeometry = this.drawingWorld.serializeMeshGeometry(piece1Mesh);
            piece2Data.meshGeometry = this.drawingWorld.serializeMeshGeometry(piece2Mesh);
            
            // Configure meshes as workbench parts
            this.configureMeshAsWorkbenchPart(piece1Mesh, piece1Data);
            this.configureMeshAsWorkbenchPart(piece2Mesh, piece2Data);
            
            
            // Remove original mesh
            this.removeOriginalMesh(originalMesh, partData);
            
            // Add cut pieces to workbench
            this.drawingWorld.workBenchParts.push(piece1Data);
            this.drawingWorld.workBenchParts.push(piece2Data);
            
            // Position pieces
            this.positionCutPieces(piece1Mesh, piece2Mesh, originalMesh.position, cutPosition);
            
            
            // Properly deactivate tools to prevent conflicts
            this.deactivate();
            if (this.drawingWorld.routerBitSystem) {
                this.drawingWorld.routerBitSystem.deactivate();
            }
            
            // Show waste selection modal
            this.showWasteSelectionModal([piece1Data, piece2Data]);
            
            return true;
            
        } catch (error) {
            return this.executeDimensionBasedCut(originalMesh, partData, cutPosition);
        }
    }

    /**
     * Create cutting planes for CSG operations
     */
    createCuttingPlanes(originalMesh, cutPosition) {
        const bounds = originalMesh.getBoundingInfo();
        const size = bounds.maximum.subtract(bounds.minimum);
        const center = originalMesh.position;
        
        // Create large cutting planes
        const planeSize = Math.max(size.x, size.y, size.z) * 2;
        
        let cutPositionWorld, normal;
        
        if (this.activeCutDirection === 'cross') {
            // Cross cut: cutting along Z axis (length)
            const cutOffsetZ = (cutPosition - 0.5) * size.z;
            cutPositionWorld = center.z + cutOffsetZ;
            normal = new BABYLON.Vector3(0, 0, 1);
        } else {
            // Rip cut: cutting along X axis (width) 
            const cutOffsetX = (cutPosition - 0.5) * size.x;
            cutPositionWorld = center.x + cutOffsetX;
            normal = new BABYLON.Vector3(1, 0, 0);
        }
        
        // Create plane 1 (piece 1 side) - everything BEFORE cut position
        const plane1 = BABYLON.MeshBuilder.CreateBox(`cuttingPlane1_${Date.now()}`, {
            width: planeSize,
            height: planeSize, 
            depth: planeSize
        }, this.drawingWorld.scene);
        
        // Create plane 2 (piece 2 side) - everything AFTER cut position
        const plane2 = BABYLON.MeshBuilder.CreateBox(`cuttingPlane2_${Date.now()}`, {
            width: planeSize,
            height: planeSize,
            depth: planeSize  
        }, this.drawingWorld.scene);
        
        // Position planes to create proper cutting volumes
        if (this.activeCutDirection === 'cross') {
            // Cross cut: piece1 gets front portion, piece2 gets back portion
            const frontBound = bounds.minimum.z;
            const backBound = bounds.maximum.z;
            
            // Plane1 covers from front edge to cut position
            const plane1CenterZ = (frontBound + cutPositionWorld) / 2;
            const plane1DepthZ = cutPositionWorld - frontBound + 1; // +1 for overlap
            plane1.scaling.z = plane1DepthZ / planeSize;
            plane1.position = new BABYLON.Vector3(center.x, center.y, plane1CenterZ);
            
            // Plane2 covers from cut position to back edge  
            const plane2CenterZ = (cutPositionWorld + backBound) / 2;
            const plane2DepthZ = backBound - cutPositionWorld + 1; // +1 for overlap
            plane2.scaling.z = plane2DepthZ / planeSize;
            plane2.position = new BABYLON.Vector3(center.x, center.y, plane2CenterZ);
            
        } else {
            // Rip cut: piece1 gets left portion, piece2 gets right portion
            const leftBound = bounds.minimum.x;
            const rightBound = bounds.maximum.x;
            
            // Plane1 covers from left edge to cut position
            const plane1CenterX = (leftBound + cutPositionWorld) / 2;
            const plane1WidthX = cutPositionWorld - leftBound + 1;
            plane1.scaling.x = plane1WidthX / planeSize;
            plane1.position = new BABYLON.Vector3(plane1CenterX, center.y, center.z);
            
            // Plane2 covers from cut position to right edge
            const plane2CenterX = (cutPositionWorld + rightBound) / 2;
            const plane2WidthX = rightBound - cutPositionWorld + 1;
            plane2.scaling.x = plane2WidthX / planeSize;
            plane2.position = new BABYLON.Vector3(plane2CenterX, center.y, center.z);
            
        }
        
        // Make planes invisible
        plane1.isVisible = false;
        plane2.isVisible = false;
        
        return { cuttingPlane1: plane1, cuttingPlane2: plane2 };
    }

    /**
     * Perform CSG intersection to create cut piece
     */
    performCsgIntersection(originalMesh, cuttingPlane, newMeshId) {
        try {
            
            const csg1 = BABYLON.CSG.FromMesh(originalMesh);
            const csg2 = BABYLON.CSG.FromMesh(cuttingPlane);
            
            const intersectionCSG = csg1.intersect(csg2);
            
            const resultMesh = intersectionCSG.toMesh(newMeshId, originalMesh.material, this.drawingWorld.scene);
            
            
            // Ensure the mesh is visible and has proper material
            resultMesh.isVisible = true;
            resultMesh.setEnabled(true);
            if (!resultMesh.material && originalMesh.material) {
                resultMesh.material = originalMesh.material;
            }
            
            
            // CRITICAL: Fix CSG mesh center and bounding box for proper dragging
            this.fixCsgMeshGeometry(resultMesh);
            
            // Clean up cutting plane
            cuttingPlane.dispose();
            
            return resultMesh;
        } catch (error) {
            if (cuttingPlane) cuttingPlane.dispose();
            return null;
        }
    }

    /**
     * Create part data for cut piece
     */
    createCutPieceData(originalPartData, pieceSize, suffix, timestamp) {
        return {
            id: `workpart_${timestamp}_${suffix}`,
            materialId: originalPartData.materialId,
            materialName: `${originalPartData.materialName} (${suffix})`,
            dimensions: {
                length: this.activeCutDirection === 'cross' ? pieceSize : originalPartData.dimensions.length,
                width: this.activeCutDirection === 'rip' ? pieceSize : originalPartData.dimensions.width,
                thickness: originalPartData.dimensions.thickness
            },
            grade: originalPartData.grade,
            status: 'Cut from parent',
            parentId: originalPartData.id,
            cutHistory: (originalPartData.cutHistory || []).concat([{
                type: this.activeCutDirection,
                timestamp: timestamp,
                fromParent: originalPartData.id
            }])
        };
    }

    /**
     * Configure mesh as workbench part
     */
    configureMeshAsWorkbenchPart(mesh, partData) {
        mesh.partData = partData;
        mesh.name = partData.id;
        mesh.id = partData.id;
    }

    /**
     * Remove original mesh
     */
    removeOriginalMesh(originalMesh, partData) {
        
        // Remove from workBenchParts array
        const partIndex = this.drawingWorld.workBenchParts.findIndex(p => p.id === partData.id);
        if (partIndex !== -1) {
            this.drawingWorld.workBenchParts.splice(partIndex, 1);
        } else {
        }
        
        // Clear any selection references
        if (this.drawingWorld.selectedPart && this.drawingWorld.selectedPart.id === partData.id) {
            this.drawingWorld.selectedPart = null;
        }
        
        // Remove from scene and dispose
        if (this.drawingWorld.scene.meshes.includes(originalMesh)) {
            this.drawingWorld.scene.removeMesh(originalMesh);
        }
        originalMesh.dispose();
        
    }

    /**
     * Position cut pieces appropriately
     */
    positionCutPieces(piece1Mesh, piece2Mesh, originalPosition, cutPosition) {
        
        // Position pieces with proper spacing like the dimension-based cutting
        const originalBounds = piece1Mesh.getBoundingInfo ? piece1Mesh.getBoundingInfo() : null;
        let spacing = 10; // Default spacing in cm
        
        if (originalBounds) {
            const size = originalBounds.maximum.subtract(originalBounds.minimum);
            spacing = Math.max(size.x, size.y, size.z) * 0.2; // 20% of largest dimension
        }
        
        // Position piece 1 to the left, piece 2 to the right
        piece1Mesh.position = new BABYLON.Vector3(
            originalPosition.x - spacing,
            originalPosition.y,
            originalPosition.z
        );
        
        piece2Mesh.position = new BABYLON.Vector3(
            originalPosition.x + spacing,
            originalPosition.y,
            originalPosition.z
        );
        
        
        // Ensure pieces are visible and enabled
        piece1Mesh.isVisible = true;
        piece1Mesh.setEnabled(true);
        piece2Mesh.isVisible = true;
        piece2Mesh.setEnabled(true);
        
    }

    /**
     * Show waste selection modal
     */
    showWasteSelectionModal(pieces) {
        // Use existing waste selection modal
        this.wasteModalPieces = pieces;
        const modal = document.getElementById('waste-selection-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Fallback to dimension-based cutting
     */
    executeDimensionBasedCut(mesh, partData, cutPosition) {
        
        // Clear any router tool state that might be interfering
        if (this.drawingWorld.routerBitSystem) {
            this.drawingWorld.routerBitSystem.clearAll();
        }
        
        // Use the existing cutting logic but call the full method
        const cutDimension = this.activeCutDirection === 'cross' ? partData.dimensions.length : partData.dimensions.width;
        const cutPositionInches = cutDimension * cutPosition;
        const piece1Size = cutPositionInches;
        const piece2Size = cutDimension - cutPositionInches;
        
        
        return this.createCutPieceMesh(partData, mesh.position, mesh.rotation);
    }

    /**
     * Fix CSG mesh geometry to have correct center and bounding box for dragging
     */
    fixCsgMeshGeometry(mesh) {
        
        // Get the actual vertex positions
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (!positions || positions.length === 0) {
            return;
        }
        
        // Calculate the actual geometric center from vertices
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let sumX = 0, sumY = 0, sumZ = 0;
        const vertexCount = positions.length / 3;
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
            
            sumX += x;
            sumY += y;
            sumZ += z;
        }
        
        // Calculate actual center
        const actualCenterX = sumX / vertexCount;
        const actualCenterY = sumY / vertexCount;
        const actualCenterZ = sumZ / vertexCount;
        
        // Calculate bounds center
        const boundsCenterX = (minX + maxX) / 2;
        const boundsCenterY = (minY + maxY) / 2;
        const boundsCenterZ = (minZ + maxZ) / 2;
        
        
        // Force refresh the bounding info to match actual geometry
        mesh._boundingInfo = null;
        mesh.refreshBoundingInfo(true);
        
        // Use bounds center as the new position reference
        const newPosition = new BABYLON.Vector3(
            mesh.position.x + boundsCenterX,
            mesh.position.y + boundsCenterY,
            mesh.position.z + boundsCenterZ
        );
        
        // Translate vertices to center the mesh at origin relative to its actual geometry
        const translatedPositions = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i += 3) {
            translatedPositions[i] = positions[i] - boundsCenterX;
            translatedPositions[i + 1] = positions[i + 1] - boundsCenterY;
            translatedPositions[i + 2] = positions[i + 2] - boundsCenterZ;
        }
        
        // Update the mesh with centered geometry
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, translatedPositions);
        mesh.position = newPosition;
        
        // Force refresh bounding info again
        mesh._boundingInfo = null;
        mesh.refreshBoundingInfo(true);
        
    }
    
    init() {
        this.setupCutPreviewMaterial();
        this.setupMouseTracking();
        this.setupMeasurementDisplay();
    }
    
    /**
     * Setup the visual material for cut preview lines
     */
    setupCutPreviewMaterial() {
        this.cutPreviewMaterial = new BABYLON.StandardMaterial("cutPreviewMaterial", this.scene);
        this.cutPreviewMaterial.diffuseColor = new BABYLON.Color3(1, 0.1, 0.1); // Bright red
        this.cutPreviewMaterial.emissiveColor = new BABYLON.Color3(0.9, 0.0, 0.0); // Bright glowing red
        this.cutPreviewMaterial.backFaceCulling = false;
        this.cutPreviewMaterial.wireframe = false;
        this.cutPreviewMaterial.alpha = 0.9;
        this.cutPreviewMaterial.disableLighting = true; // Prevents shadow interference
        
        // Disable depth write to avoid z-fighting
        this.cutPreviewMaterial.disableDepthWrite = true;
        
    }
    
    /**
     * Setup mouse tracking for cut preview
     */
    setupMouseTracking() {
        // Mouse move event for cut preview
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.cutPreviewActive) return;
            
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.onMouseMove(pointerInfo);
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                // Prevent other handlers from processing this click when cut tool is active
                if (this.onMouseDown(pointerInfo)) {
                    pointerInfo.skipOnPointerObservable = true;
                }
            }
        });
        
    }
    
    /**
     * Setup real-time measurement display overlay
     */
    setupMeasurementDisplay() {
        
        // Create HTML overlay for measurements
        this.createMeasurementOverlay();
    }
    
    /**
     * Create HTML overlay for real-time measurements
     */
    createMeasurementOverlay() {
        // Create container div
        this.measurementDisplay = document.createElement('div');
        this.measurementDisplay.id = 'cut-measurement-display';
        this.measurementDisplay.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            font-family: 'Arial', sans-serif;
            font-size: 24px;
            font-weight: bold;
            z-index: 1000;
            display: none;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        // Create left measurement text
        this.leftMeasurementText = document.createElement('div');
        this.leftMeasurementText.style.cssText = `
            display: inline-block;
            margin: 0 20px;
            color: #4CAF50;
        `;
        
        // Create right measurement text  
        this.rightMeasurementText = document.createElement('div');
        this.rightMeasurementText.style.cssText = `
            display: inline-block;
            margin: 0 20px;
            color: #2196F3;
        `;
        
        // Add to container
        this.measurementDisplay.appendChild(this.leftMeasurementText);
        this.measurementDisplay.appendChild(this.rightMeasurementText);
        
        // Add to page
        document.body.appendChild(this.measurementDisplay);
        
    }
    
    /**
     * Show measurement display
     */
    showMeasurementDisplay() {
        if (this.measurementDisplay) {
            this.measurementDisplay.style.display = 'block';
        }
    }
    
    /**
     * Hide measurement display
     */
    hideMeasurementDisplay() {
        if (this.measurementDisplay) {
            this.measurementDisplay.style.display = 'none';
        }
    }
    
    /**
     * Update measurement display with current values
     */
    updateMeasurementDisplay(leftMeasurement, rightMeasurement, cutDirection) {
        if (!this.leftMeasurementText || !this.rightMeasurementText) return;
        
        // Determine labels based on cut direction
        let leftLabel, rightLabel;
        if (cutDirection === 'rip') {
            leftLabel = 'Left Side';
            rightLabel = 'Right Side';
        } else {
            leftLabel = 'Front Side';
            rightLabel = 'Back Side'; 
        }
        
        this.leftMeasurementText.textContent = `${leftLabel}: ${leftMeasurement.toFixed(1)}"`;
        this.rightMeasurementText.textContent = `${rightLabel}: ${rightMeasurement.toFixed(1)}"`;
        
    }
    
    /**
     * Update measurements from cut line data
     */
    updateMeasurementsFromCutLine(cutLine) {
        if (!cutLine) return;
        
        // Calculate measurements on each side of the cut
        const cutPos = cutLine.normalizedPosition;
        const totalDimension = cutLine.cutDimension;
        const leftMeasurement = totalDimension * cutPos;
        const rightMeasurement = totalDimension * (1 - cutPos);
        
        // Update the display
        this.updateMeasurementDisplay(leftMeasurement, rightMeasurement, this.activeCutDirection);
    }
    
    /**
     * Create colored preview pieces showing left (green) and right (blue) sides
     */
    createColoredPreviewPieces(mesh, cutLine) {
        // Clear existing preview pieces
        this.clearColoredPreviewPieces();
        
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = mesh.position;
        
        // Calculate cut position
        const cutAxis = cutLine.cutAxis;
        const cutPos = cutLine.position[cutAxis];
        const kerfWidth = 0.125 * 2.54; // 1/8" in cm
        const halfKerf = kerfWidth / 2;
        
        // Debug bounds (reduced logging)
        
        // Create left piece (green)
        const leftSize = meshSize.clone();
        const leftCenter = meshCenter.clone();
        
        // Create right piece (blue)  
        const rightSize = meshSize.clone();
        const rightCenter = meshCenter.clone();
        
        if (cutAxis === 'x') {
            // Cut along X axis
            // MAJOR FIX: Calculate positions relative to WORLD coordinates, not local bounds
            const worldMinX = meshCenter.x + meshBounds.minimum.x;
            const worldMaxX = meshCenter.x + meshBounds.maximum.x;
            
            const leftWidth = Math.abs(cutPos - worldMinX) - halfKerf;
            const rightWidth = Math.abs(worldMaxX - cutPos) - halfKerf;
            
            leftSize.x = leftWidth;
            rightSize.x = rightWidth;
            
            // CORRECTED: Position pieces using world coordinates
            leftCenter.x = worldMinX + leftWidth / 2;
            rightCenter.x = worldMaxX - rightWidth / 2;
            
            
        } else if (cutAxis === 'y') {
            // Cut along Y axis
            // MAJOR FIX: Calculate positions relative to WORLD coordinates, not local bounds
            const worldMinY = meshCenter.y + meshBounds.minimum.y;
            const worldMaxY = meshCenter.y + meshBounds.maximum.y;
            
            const leftDepth = Math.abs(cutPos - worldMinY) - halfKerf;
            const rightDepth = Math.abs(worldMaxY - cutPos) - halfKerf;
            
            leftSize.y = leftDepth;
            rightSize.y = rightDepth;
            
            // CORRECTED: Position pieces using world coordinates
            leftCenter.y = worldMinY + leftDepth / 2;
            rightCenter.y = worldMaxY - rightDepth / 2;
            
            
        } else { // z axis
            // Cut along Z axis
            // MAJOR FIX: Calculate positions relative to WORLD coordinates, not local bounds
            const worldMinZ = meshCenter.z + meshBounds.minimum.z;
            const worldMaxZ = meshCenter.z + meshBounds.maximum.z;
            
            const leftHeight = Math.abs(cutPos - worldMinZ) - halfKerf;
            const rightHeight = Math.abs(worldMaxZ - cutPos) - halfKerf;
            
            leftSize.z = leftHeight;
            rightSize.z = rightHeight;
            
            // CORRECTED: Position pieces using world coordinates
            leftCenter.z = worldMinZ + leftHeight / 2;
            rightCenter.z = worldMaxZ - rightHeight / 2;
            
            // Reduced Z-axis debug logging
        }
        
        // Create left preview piece (green) - slightly larger to avoid z-fighting
        this.leftPreviewPiece = BABYLON.MeshBuilder.CreateBox("leftPreview", {
            width: leftSize.x * 1.001,
            height: leftSize.y * 1.001, 
            depth: leftSize.z * 1.001
        }, this.scene);
        this.leftPreviewPiece.position = leftCenter;
        this.leftPreviewPiece.position.y += 0.2; // Slightly above surface
        
        const leftMaterial = new BABYLON.StandardMaterial("leftPreviewMaterial", this.scene);
        leftMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        leftMaterial.alpha = 0.3;
        leftMaterial.wireframe = false;
        this.leftPreviewPiece.material = leftMaterial;
        this.leftPreviewPiece.isPickable = false;
        
        // Create right preview piece (blue) - slightly larger to avoid z-fighting
        this.rightPreviewPiece = BABYLON.MeshBuilder.CreateBox("rightPreview", {
            width: rightSize.x * 1.001,
            height: rightSize.y * 1.001,
            depth: rightSize.z * 1.001
        }, this.scene);
        this.rightPreviewPiece.position = rightCenter;
        this.rightPreviewPiece.position.y += 0.2; // Slightly above surface
        
        const rightMaterial = new BABYLON.StandardMaterial("rightPreviewMaterial", this.scene);
        rightMaterial.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue
        rightMaterial.alpha = 0.3;
        rightMaterial.wireframe = false;
        this.rightPreviewPiece.material = rightMaterial;
        this.rightPreviewPiece.isPickable = false;
        
    }
    
    /**
     * Clear colored preview pieces
     */
    clearColoredPreviewPieces() {
        if (this.leftPreviewPiece) {
            this.leftPreviewPiece.dispose();
            this.leftPreviewPiece = null;
        }
        if (this.rightPreviewPiece) {
            this.rightPreviewPiece.dispose();
            this.rightPreviewPiece = null;
        }
    }
    
    /**
     * Activate cut tool with specified direction
     */
    activate(cutDirection) {
        this.activeCutDirection = cutDirection; // 'rip' or 'cross'
        this.cutPreviewActive = true;
        
        
        // Animate camera to optimal cutting position
        this.animateCameraForCutting(cutDirection);
        
        // Clear any existing preview
        this.clearCutPreview();
    }
    
    /**
     * Deactivate cut tool
     */
    deactivate() {
        this.activeCutDirection = null;
        this.cutPreviewActive = false;
        this.clearCutPreview();
        this.hideMeasurementDisplay();
        
    }
    
    /**
     * Handle mouse movement for cut preview
     */
    onMouseMove(pointerInfo) {
        // Handle waste selection mode first
        if (this.wasteSelectionActive) {
            this.handleWasteSelectionHover(pointerInfo);
            return;
        }
        
        if (!this.cutPreviewActive) return;
        
        // Use scene picking to find what's under the mouse
        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        this.lastMousePosition = { x: pointerInfo.event.offsetX, y: pointerInfo.event.offsetY };
        
        // Check if mouse is over a lumber part
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const mesh = pickInfo.pickedMesh;
            const partData = this.getPartData(mesh);
            
            
            if (partData && this.isLumberPart(partData)) {
                this.onMouseEnterPart(mesh, partData, pickInfo);
            } else {
                this.onMouseLeavePart();
            }
        } else {
            this.onMouseLeavePart();
        }
    }
    
    /**
     * Handle mouse entering a lumber part
     */
    onMouseEnterPart(mesh, partData, pickInfo) {
        // ALWAYS recalculate - fresh decision every hover
        this.hoveredPart = mesh;
        this.isMouseOverPart = true;
        
        // Always create fresh cut preview to recalculate direction
        this.createCutPreview(mesh, partData, pickInfo);
    }
    
    /**
     * Handle mouse leaving a lumber part
     */
    onMouseLeavePart() {
        if (this.isMouseOverPart) {
            this.isMouseOverPart = false;
            this.hoveredPart = null;
            this.clearCutPreview();
        }
    }
    
    /**
     * Create cut preview line on lumber part
     */
    createCutPreview(mesh, partData, pickInfo) {
        // Clear existing preview
        this.clearCutPreview();
        
        // Get lumber dimensions
        const dimensions = this.getLumberDimensions(mesh, partData);
        if (!dimensions) return;
        
        // Calculate cut line position and orientation
        const cutLine = this.calculateCutLine(mesh, dimensions, pickInfo);
        if (!cutLine) return;
        
        // Store current cut line for measurements modal
        this.currentCutLine = cutLine;
        
        // Create visual cut line
        this.cutPreviewLine = BABYLON.MeshBuilder.CreateBox("cutPreviewLine", {
            width: cutLine.width,
            height: cutLine.height, 
            depth: cutLine.depth
        }, this.scene);
        
        this.cutPreviewLine.position = cutLine.position.clone();
        this.cutPreviewLine.rotation = cutLine.rotation;
        this.cutPreviewLine.material = this.cutPreviewMaterial;
        this.cutPreviewLine.isPickable = false;
        
        // Slightly offset cut line above surface to avoid z-fighting
        this.cutPreviewLine.position.y += 0.1;
        
        // Show and update real-time measurement display
        this.showMeasurementDisplay();
        this.updateMeasurementsFromCutLine(cutLine);
        
        // Create colored preview pieces
        this.createColoredPreviewPieces(mesh, cutLine);
        
        // Store cut line for later use in execution
        this.storedCutLine = cutLine;
        
    }
    
    /**
     * Update cut position based on mouse movement
     */
    updateCutPosition(mesh, partData, pickInfo) {
        if (!this.cutPreviewLine) return;
        
        // Get lumber dimensions
        const dimensions = this.getLumberDimensions(mesh, partData);
        if (!dimensions) return;
        
        // Calculate new cut line position
        const cutLine = this.calculateCutLine(mesh, dimensions, pickInfo);
        if (!cutLine) return;
        
        // Update preview position
        this.cutPreviewLine.position = cutLine.position.clone();
        this.cutPreviewLine.position.y += 0.1; // Keep offset to avoid z-fighting
        this.cutPosition = cutLine.normalizedPosition;
        
        // Update real-time measurements
        this.updateMeasurementsFromCutLine(cutLine);
        
        // Update colored preview pieces
        this.createColoredPreviewPieces(mesh, cutLine);
        
        // Store updated cut line
        this.storedCutLine = cutLine;
    }
    
    /**
     * Calculate cut line geometry based on cut direction and mouse position
     */
    calculateCutLine(mesh, dimensions, pickInfo) {
        // FRESH calculation every time - no cached values
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = mesh.position;
        
        // Project mouse onto the mesh to get cut position
        const hitPoint = pickInfo.pickedPoint;
        if (!hitPoint) return null;
        
        // Create completely fresh cut line object
        let cutLine = {
            position: meshCenter.clone(),
            rotation: mesh.rotation.clone(),
            normalizedPosition: 0.5
        };
        
        // Use the dimensions parameter passed in
        if (!dimensions) return null;
        
        // Get the actual lumber dimensions from the part data
        const lengthInches = dimensions.length_inches;
        const widthInches = dimensions.width_inches;
        const thicknessInches = dimensions.thickness_inches;
        
        
        // DETERMINE CUT DIRECTION BASED ON CURRENT BOARD DIMENSIONS
        // Now that partData.dimensions are kept current, we can use them reliably
        
        let cutDimension, cutAxis;
        
        // Get current mesh dimensions for axis mapping
        const meshDimX = meshSize.x / 2.54;
        const meshDimY = meshSize.y / 2.54;  
        const meshDimZ = meshSize.z / 2.54;
        
        // Determine which physical dimension to cut based on tool selection
        if (this.activeCutDirection === 'rip') {
            // RIP CUT: Cut across the SHORTER dimension (width)
            // This makes pieces shorter while maintaining the original width
            cutDimension = Math.min(lengthInches, widthInches);
        } else {
            // CROSS CUT: Cut along the LONGER dimension (length)
            // This makes pieces narrower while maintaining the original length
            cutDimension = Math.max(lengthInches, widthInches);
        }
        
        // Find matching axis
        const xDiff = Math.abs(meshDimX - cutDimension);
        const yDiff = Math.abs(meshDimY - cutDimension);
        const zDiff = Math.abs(meshDimZ - cutDimension);
        
        if (xDiff <= yDiff && xDiff <= zDiff) {
            cutAxis = 'x';
        } else if (yDiff <= xDiff && yDiff <= zDiff) {
            cutAxis = 'y';
        } else {
            cutAxis = 'z';
        }
        
        
        // Get the object's local coordinate system
        const worldMatrix = mesh.getWorldMatrix();
        const localToWorld = worldMatrix.clone();
        const worldToLocal = localToWorld.clone().invert();
        
        // Transform hit point to local coordinates
        const localHitPoint = BABYLON.Vector3.TransformCoordinates(hitPoint, worldToLocal);
        
        // Create cut line perpendicular to cut axis (simplified - use hit point directly)
        if (cutAxis === 'x') {
            cutLine.width = 0.3;
            cutLine.height = meshSize.y + 1;
            cutLine.depth = meshSize.z + 1;
            
            // Position blade at hit point but constrain to mesh bounds
            const xPos = Math.max(meshCenter.x - meshSize.x/2, Math.min(meshCenter.x + meshSize.x/2, hitPoint.x));
            cutLine.position = new BABYLON.Vector3(xPos, meshCenter.y, meshCenter.z);
            cutLine.normalizedPosition = (xPos - (meshCenter.x - meshSize.x/2)) / meshSize.x;
            
        } else if (cutAxis === 'y') {
            cutLine.width = meshSize.x + 1;
            cutLine.height = 0.3;
            cutLine.depth = meshSize.z + 1;
            
            // Position blade at hit point but constrain to mesh bounds
            const yPos = Math.max(meshCenter.y - meshSize.y/2, Math.min(meshCenter.y + meshSize.y/2, hitPoint.y));
            cutLine.position = new BABYLON.Vector3(meshCenter.x, yPos, meshCenter.z);
            cutLine.normalizedPosition = (yPos - (meshCenter.y - meshSize.y/2)) / meshSize.y;
            
        } else { // z axis
            cutLine.width = meshSize.x + 1;
            cutLine.height = meshSize.y + 1;
            cutLine.depth = 0.3;
            
            // Position blade at hit point but constrain to mesh bounds
            const zPos = Math.max(meshCenter.z - meshSize.z/2, Math.min(meshCenter.z + meshSize.z/2, hitPoint.z));
            cutLine.position = new BABYLON.Vector3(meshCenter.x, meshCenter.y, zPos);
            cutLine.normalizedPosition = (zPos - (meshCenter.z - meshSize.z/2)) / meshSize.z;
        }
        
        // Store cut info
        cutLine.cutAxis = cutAxis;
        cutLine.cutDimension = cutDimension;
        cutLine.dimensions = dimensions;
        
        return cutLine;
    }
    
    /**
     * Handle mouse click to execute cut
     */
    onMouseDown(pointerInfo) {
        // Handle waste selection clicks first
        if (this.wasteSelectionActive) {
            return this.handleWasteSelectionClick(pointerInfo);
        }
        
        if (!this.cutPreviewActive || !this.isMouseOverPart || !this.hoveredPart) return false;
        
        // Only handle left click
        if (pointerInfo.event.button !== 0) return false;
        
        
        // Show editable measurements modal instead of immediate execution
        this.showEditMeasurementsModal(this.hoveredPart, this.cutPosition);
        
        // Return true to indicate we handled this event
        return true;
    }
    
    /**
     * Show editable measurements modal for precision cutting
     */
    showEditMeasurementsModal(mesh, cutPosition) {
        // Store cut parameters for later execution
        this.pendingCutMesh = mesh;
        this.pendingCutPosition = cutPosition;
        
        // ALSO store the part data directly as backup
        this.pendingPartData = this.getPartData(mesh);
        
        // Get part data and cut line information
        const partData = this.getPartData(mesh);
        if (!partData) return;
        
        const cutLine = this.currentCutLine;
        if (!cutLine) return;
        
        // Calculate current piece dimensions using the same method as real-time display
        const dimensions = cutLine.dimensions;
        const cutDimension = cutLine.cutDimension;
        const cutPos = cutLine.normalizedPosition;
        const totalDimension = cutDimension;
        const piece1Size = totalDimension * cutPos;
        const piece2Size = totalDimension * (1 - cutPos);
        
        // Create and show modal
        this.createCutMeasurementsModal(partData, dimensions, piece1Size, piece2Size);
    }
    
    /**
     * Create the cutting measurements modal
     */
    createCutMeasurementsModal(partData, dimensions, piece1Size, piece2Size) {
        // Remove existing modal if any
        const existingModal = document.getElementById('cut-measurements-modal');
        if (existingModal) existingModal.remove();
        
        const cutTypeName = this.activeCutDirection === 'rip' ? 'Rip Cut' : 'Cross Cut';
        const cutDimension = this.activeCutDirection === 'rip' ? 'Width' : 'Length';
        
        const modalHTML = `
            <div id="cut-measurements-modal" class="modal-overlay" style="display: flex;">
                <div class="modal-content preferences-modal">
                    <div class="modal-header">
                        <h2>⚙️ ${cutTypeName} - Fine-Tune Measurements</h2>
                        <button id="close-cut-measurements-modal" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="edit-measurements-interface">
                            <h3>Adjust Cut Measurements</h3>
                            <p>Cut ${partData.materialName} (${dimensions.length_inches}" × ${dimensions.width_inches}" × ${dimensions.thickness_inches}")</p>
                            
                            <div class="measurement-edit-row">
                                <label>Piece 1 ${cutDimension}:</label>
                                <input type="text" id="piece1-size-input" value="${this.formatMeasurement(piece1Size)}">
                                <span class="unit">inches</span>
                            </div>
                            
                            <div class="measurement-edit-row">
                                <label>Piece 2 ${cutDimension}:</label>
                                <input type="text" id="piece2-size-input" value="${this.formatMeasurement(piece2Size)}">
                                <span class="unit">inches</span>
                            </div>
                            
                            <div class="measurement-edit-row">
                                <label>Original ${cutDimension}:</label>
                                <span class="readonly-value">${this.formatMeasurement(this.activeCutDirection === 'rip' ? dimensions.width_inches : dimensions.length_inches)}"</span>
                            </div>
                            
                            <div class="measurement-notes">
                                <p><strong>Tip:</strong> You can enter fractions like "2 15/16" or decimals like "2.9375"</p>
                                <p><strong>Note:</strong> Piece sizes must add up to the original dimension</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-cut-measurements" class="btn-secondary">Cancel</button>
                        <button id="apply-precise-cut" class="btn-primary">Apply Precise Cut</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup event listeners
        this.setupCutMeasurementsListeners();
    }
    
    /**
     * Setup event listeners for cut measurements modal
     */
    setupCutMeasurementsListeners() {
        const piece1Input = document.getElementById('piece1-size-input');
        const piece2Input = document.getElementById('piece2-size-input');
        const closeBtn = document.getElementById('close-cut-measurements-modal');
        const cancelBtn = document.getElementById('cancel-cut-measurements');
        const applyBtn = document.getElementById('apply-precise-cut');
        
        // Auto-calculate other piece when one changes
        piece1Input.addEventListener('input', (e) => {
            const piece1Size = this.parseMeasurement(e.target.value);
            if (piece1Size !== null && piece1Size > 0) {
                const cutDimension = this.currentCutLine.cutDimension;
                const piece2Size = cutDimension - piece1Size;
                if (piece2Size > 0) {
                    piece2Input.value = this.formatMeasurement(piece2Size);
                }
            }
        });
        
        piece2Input.addEventListener('input', (e) => {
            const piece2Size = this.parseMeasurement(e.target.value);
            if (piece2Size !== null && piece2Size > 0) {
                const cutDimension = this.currentCutLine.cutDimension;
                const piece1Size = cutDimension - piece2Size;
                if (piece1Size > 0) {
                    piece1Input.value = this.formatMeasurement(piece1Size);
                }
            }
        });
        
        // Close modal
        closeBtn.addEventListener('click', () => {
            this.closeCutMeasurementsModal();
        });
        
        cancelBtn.addEventListener('click', () => {
            this.closeCutMeasurementsModal();
        });
        
        // Apply precise cut
        applyBtn.addEventListener('click', () => {
            this.applyPreciseCut();
        });
        
        // Close on outside click
        document.getElementById('cut-measurements-modal').addEventListener('click', (e) => {
            if (e.target.id === 'cut-measurements-modal') {
                this.closeCutMeasurementsModal();
            }
        });
    }
    
    /**
     * Apply the precise cut with edited measurements
     */
    applyPreciseCut() {
        
        const piece1Input = document.getElementById('piece1-size-input');
        const piece1Size = this.parseMeasurement(piece1Input.value);
        
        if (piece1Size === null || piece1Size <= 0) {
            // alert('Please enter a valid measurement for piece 1');
            return;
        }
        
        if (!this.currentCutLine) {
            // alert('Error: No cut line data found');
            return;
        }
        
        const cutDimension = this.currentCutLine.cutDimension;
        const piece2Size = cutDimension - piece1Size;
        
        if (piece2Size <= 0) {
            // alert('Piece 2 size must be greater than 0');
            return;
        }
        
        // Calculate new cut position based on piece 1 size
        const newCutPosition = piece1Size / cutDimension;
        
        
        // Execute cut with new position BEFORE closing modal (to preserve pending data)
        try {
            this.executeCut(this.pendingCutMesh, newCutPosition);
        } catch (error) {
        }
        
        // Close modal AFTER executing cut
        this.closeCutMeasurementsModal();
    }
    
    /**
     * Close the cut measurements modal
     */
    closeCutMeasurementsModal() {
        const modal = document.getElementById('cut-measurements-modal');
        if (modal) {
            modal.remove();
        }
        
        // Clear pending cut data
        this.pendingCutMesh = null;
        this.pendingCutPosition = null;
        this.pendingPartData = null;
    }
    
    /**
     * Parse measurement input (handles fractions and decimals) - copied from PlaneToolSystem
     */
    parseMeasurement(input) {
        if (!input || input.trim() === '') return null;
        
        const trimmed = input.trim();
        
        // Handle fractions like "2 15/16" or "15/16"
        const fractionMatch = trimmed.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
        if (fractionMatch) {
            const whole = parseInt(fractionMatch[1]) || 0;
            const numerator = parseInt(fractionMatch[2]);
            const denominator = parseInt(fractionMatch[3]);
            return whole + (numerator / denominator);
        }
        
        // Handle whole numbers with fractions like "2 15/16"
        const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
            const whole = parseInt(mixedMatch[1]);
            const numerator = parseInt(mixedMatch[2]);
            const denominator = parseInt(mixedMatch[3]);
            return whole + (numerator / denominator);
        }
        
        // Handle decimals
        const decimal = parseFloat(trimmed);
        if (!isNaN(decimal)) {
            return decimal;
        }
        
        return null;
    }
    
    /**
     * Format measurement for display (convert to fractions when appropriate) - copied from PlaneToolSystem
     */
    formatMeasurement(decimal) {
        if (decimal === null || decimal === undefined) return '0.000';
        
        const whole = Math.floor(decimal);
        const remainder = decimal - whole;
        
        // Common fractions (in 32nds for woodworking)
        const fractions = [
            { decimal: 1/32, display: '1/32' },
            { decimal: 1/16, display: '1/16' },
            { decimal: 3/32, display: '3/32' },
            { decimal: 1/8, display: '1/8' },
            { decimal: 5/32, display: '5/32' },
            { decimal: 3/16, display: '3/16' },
            { decimal: 7/32, display: '7/32' },
            { decimal: 1/4, display: '1/4' },
            { decimal: 9/32, display: '9/32' },
            { decimal: 5/16, display: '5/16' },
            { decimal: 11/32, display: '11/32' },
            { decimal: 3/8, display: '3/8' },
            { decimal: 13/32, display: '13/32' },
            { decimal: 7/16, display: '7/16' },
            { decimal: 15/32, display: '15/32' },
            { decimal: 1/2, display: '1/2' },
            { decimal: 17/32, display: '17/32' },
            { decimal: 9/16, display: '9/16' },
            { decimal: 19/32, display: '19/32' },
            { decimal: 5/8, display: '5/8' },
            { decimal: 21/32, display: '21/32' },
            { decimal: 11/16, display: '11/16' },
            { decimal: 23/32, display: '23/32' },
            { decimal: 3/4, display: '3/4' },
            { decimal: 25/32, display: '25/32' },
            { decimal: 13/16, display: '13/16' },
            { decimal: 27/32, display: '27/32' },
            { decimal: 7/8, display: '7/8' },
            { decimal: 29/32, display: '29/32' },
            { decimal: 15/16, display: '15/16' },
            { decimal: 31/32, display: '31/32' }
        ];
        
        // Find closest fraction (within 0.005 tolerance)
        for (const fraction of fractions) {
            if (Math.abs(remainder - fraction.decimal) < 0.005) {
                return whole > 0 ? `${whole} ${fraction.display}` : fraction.display;
            }
        }
        
        // Fall back to decimal
        return decimal.toFixed(3);
    }
    
    /**
     * Execute the actual cut operation - CSG-BASED METHOD FOR ROUTED GEOMETRY
     */
    executeCut(mesh, cutPosition) {
        try {
            let partData = null;
            let originalMeshGeometry = null;
        
        // If mesh is null, use stored partData directly
        if (!mesh) {
            partData = this.pendingPartData;
        } else {
            partData = this.getPartData(mesh);
            
            // Check if this is a routed mesh that needs CSG cutting
            if (partData.meshGeometry && partData.meshGeometry.hasCustomGeometry) {
                const result = this.executeCsgCut(mesh, partData, cutPosition);
                return result;
            }
            
            // CRITICAL: Serialize the original mesh geometry BEFORE cutting to preserve router modifications
            if (this.drawingWorld.serializeMeshGeometry) {
                originalMeshGeometry = this.drawingWorld.serializeMeshGeometry(mesh);
            }
            
            // If we can't get partData from mesh, try our stored backup
            if (!partData && this.pendingPartData) {
                partData = this.pendingPartData;
            }
        }
        
        if (!partData) {
            this.closeCutMeasurementsModal();
            return;
        }
        
        
        // If mesh is null, try to find the mesh by partData ID
        if (!mesh) {
            
            // Try different ways to find the mesh
            let foundMesh = this.scene.meshes.find(m => m.name === partData.id);
            
            if (!foundMesh) {
                // Try to find by isWorkBenchPart and matching partData
                foundMesh = this.scene.meshes.find(m => m.isWorkBenchPart && m.partData && m.partData.id === partData.id);
            }
            
            if (!foundMesh) {
                // Try to find any mesh with matching partData id
                foundMesh = this.scene.meshes.find(m => m.partData && m.partData.id === partData.id);
            }
            
            if (foundMesh) {
                mesh = foundMesh;
            } else {
                return;
            }
        }
        
        // Get original mesh properties
        const originalPosition = mesh.position.clone();
        const originalRotation = mesh.rotation.clone();
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Get cut line info
        const cutLine = this.getStoredCutLine();
        if (!cutLine || !cutLine.cutAxis || typeof cutLine.normalizedPosition === 'undefined') {
            return;
        }
        
        const cutAxis = cutLine.cutAxis;
        const cutPos = cutLine.normalizedPosition; // 0 to 1
        const kerfWidth = this.kerfWidth * 2.54; // User-defined kerf in cm
        
        // Use the actual cut dimensions from the modal, not mesh calculations
        const cutDimension = this.currentCutLine.cutDimension;
        
        // Get actual dimensions from the modal inputs if available
        const piece1Input = document.getElementById('piece1-size-input');
        const piece2Input = document.getElementById('piece2-size-input');
        
        let piece1SizeInches, piece2SizeInches;
        
        if (piece1Input && piece1Input.value) {
            // Use the modal input values
            piece1SizeInches = this.parseMeasurement(piece1Input.value);
            piece2SizeInches = this.parseMeasurement(piece2Input.value);
        } else {
            // Fallback to calculated values
            piece1SizeInches = cutDimension * cutPos;
            piece2SizeInches = cutDimension * (1 - cutPos);
        }
        
        
        // Create piece 1 - completely independent new board with correct dimensions
        const timestamp = Date.now();
        const piece1Data = {
            id: `workpart_${timestamp}_A`,
            materialId: partData.materialId,
            materialName: `${partData.materialName} (A)`,
            dimensions: {
                length: this.activeCutDirection === 'cross' ? piece1SizeInches : partData.dimensions.length,
                width: this.activeCutDirection === 'rip' ? piece1SizeInches : partData.dimensions.width,
                thickness: partData.dimensions.thickness
            },
            grade: partData.grade,
            status: 'Cut from parent',
            parentId: partData.id,
            cutHistory: (partData.cutHistory || []).concat([{
                type: this.activeCutDirection,
                timestamp: timestamp,
                fromParent: partData.id
            }])
            // Cut pieces get fresh geometry - routed features only preserved if they're on the actual cut piece edges
        };

        // Determine which routed edges should be preserved on piece 1
        if (partData.meshGeometry && partData.meshGeometry.routedEdges) {
            const inheritedEdges = this.determineInheritedEdges(partData.meshGeometry.routedEdges, 'piece1', this.activeCutDirection);
            if (inheritedEdges.length > 0) {
                piece1Data.meshGeometry = {
                    ...partData.meshGeometry,
                    routedEdges: inheritedEdges
                };
            }
        }
        
        // Create piece 2 - completely independent new board with correct dimensions
        const piece2Data = {
            id: `workpart_${timestamp + 1}_B`,
            materialId: partData.materialId,
            materialName: `${partData.materialName} (B)`,
            dimensions: {
                length: this.activeCutDirection === 'cross' ? piece2SizeInches : partData.dimensions.length,
                width: this.activeCutDirection === 'rip' ? piece2SizeInches : partData.dimensions.width,
                thickness: partData.dimensions.thickness
            },
            grade: partData.grade,
            status: 'Cut from parent',
            parentId: partData.id,
            cutHistory: (partData.cutHistory || []).concat([{
                type: this.activeCutDirection,
                timestamp: timestamp + 1,
                fromParent: partData.id
            }])
            // Cut pieces get fresh geometry - routed features only preserved if they're on the actual cut piece edges
        };

        // Determine which routed edges should be preserved on piece 2
        if (partData.meshGeometry && partData.meshGeometry.routedEdges) {
            const inheritedEdges = this.determineInheritedEdges(partData.meshGeometry.routedEdges, 'piece2', this.activeCutDirection);
            if (inheritedEdges.length > 0) {
                piece2Data.meshGeometry = {
                    ...partData.meshGeometry,
                    routedEdges: inheritedEdges
                };
            }
        }
        
        
        // Validate dimensions - check for zero or negative dimensions
        const validateDimensions = (data, name) => {
            if (data.dimensions.length <= 0 || data.dimensions.width <= 0 || data.dimensions.thickness <= 0) {
                return false;
            }
            return true;
        };
        
        if (!validateDimensions(piece1Data, 'Piece 1') || !validateDimensions(piece2Data, 'Piece 2')) {
            return;
        }
        
        // Remove original
        const partIndex = this.drawingWorld.workBenchParts.findIndex(p => p.id === partData.id);
        if (partIndex !== -1) {
            this.drawingWorld.workBenchParts.splice(partIndex, 1);
        }
        mesh.dispose();
        
        // Add cut pieces to workBenchParts array first
        this.drawingWorld.workBenchParts.push(piece1Data);
        this.drawingWorld.workBenchParts.push(piece2Data);
        
        // Create piece 1 - LEFT side of cut
        
        // Check dimensions in cm to see if they're valid for mesh creation
        const piece1LengthCm = piece1Data.dimensions.length * 2.54;
        const piece1WidthCm = piece1Data.dimensions.width * 2.54;
        const piece1ThicknessCm = piece1Data.dimensions.thickness * 2.54;
        
        const mesh1 = this.drawingWorld.createWorkBenchMaterial(piece1Data);
        if (!mesh1) {
            return;
        }
        mesh1.position = originalPosition.clone();
        mesh1.rotation = originalRotation.clone();
        
        // No scaling needed - mesh created with correct dimensions
        
        // Position piece 1 
        const originalAxisValue = cutAxis === 'x' ? originalPosition.x : (cutAxis === 'y' ? originalPosition.y : originalPosition.z);
        const totalSize = cutDimension * 2.54; // Convert total dimension from inches to cm
        const originalStart = originalAxisValue - (totalSize / 2);
        const piece1SizeCm = piece1SizeInches * 2.54;
        const piece1Center = originalStart + (piece1SizeCm / 2);
        
        if (cutAxis === 'x') {
            mesh1.position.x = piece1Center;
        } else if (cutAxis === 'y') {
            mesh1.position.y = piece1Center;
        } else {
            mesh1.position.z = piece1Center;
        }
        
        // Create piece 2 - RIGHT side of cut
        
        // Check dimensions in cm to see if they're valid for mesh creation
        const piece2LengthCm = piece2Data.dimensions.length * 2.54;
        const piece2WidthCm = piece2Data.dimensions.width * 2.54;
        const piece2ThicknessCm = piece2Data.dimensions.thickness * 2.54;
        
        const mesh2 = this.drawingWorld.createWorkBenchMaterial(piece2Data);
        if (!mesh2) {
            return;
        }
        mesh2.position = originalPosition.clone();
        mesh2.rotation = originalRotation.clone();
        
        // No scaling needed - mesh created with correct dimensions
        
        // Position piece 2
        const piece2SizeCm = piece2SizeInches * 2.54;
        const piece2Start = originalStart + piece1SizeCm + kerfWidth;
        const piece2Center = piece2Start + (piece2SizeCm / 2);
        
        if (cutAxis === 'x') {
            mesh2.position.x = piece2Center;
        } else if (cutAxis === 'y') {
            mesh2.position.y = piece2Center;
        } else {
            mesh2.position.z = piece2Center;
        }
        
        const piece1Pos = cutAxis === 'x' ? mesh1.position.x : (cutAxis === 'y' ? mesh1.position.y : mesh1.position.z);
        const piece2Pos = cutAxis === 'x' ? mesh2.position.x : (cutAxis === 'y' ? mesh2.position.y : mesh2.position.z);
        
        // Check if mesh2 is visible
        const mesh2Size = mesh2.getBoundingInfo().boundingBox.extendSize.scale(2);
        
        // Check if mesh2 is too far away from camera
        const cameraPosition = this.scene.activeCamera.position;
        const distanceToMesh2 = BABYLON.Vector3.Distance(cameraPosition, mesh2.position);
        
        // Force mesh2 to be visible and enabled
        mesh2.isVisible = true;
        mesh2.setEnabled(true);
        
        // Ensure both pieces are properly configured as workbench parts
        mesh1.isWorkBenchPart = true;
        mesh1.partData = piece1Data;
        mesh1.name = piece1Data.id; // Ensure mesh name matches part ID
        mesh2.isWorkBenchPart = true;
        mesh2.partData = piece2Data;
        mesh2.name = piece2Data.id; // Ensure mesh name matches part ID
        
        
        // IMMEDIATELY release tool and return to pointer mode
        
        // Force deactivation
        this.activeCutDirection = null;
        this.cutPreviewActive = false;
        this.clearCutPreview();
        this.hideMeasurementDisplay();
        
        // Clear any pending cut data
        this.currentCutLine = null;
        this.hoveredPart = null;
        this.isMouseOverPart = false;
        
        // Force switch to pointer tool
        if (this.drawingWorld && this.drawingWorld.selectSketchTool) {
            this.drawingWorld.selectSketchTool('pointer');
        } else {
        }
        
        
        // Update project explorer to show new pieces
        this.drawingWorld.updateWorkBenchDisplay();
        
        // ONLY show waste selection if we have two valid pieces
        if (mesh1 && mesh2) {
            this.showWasteSelectionModal([mesh1, mesh2], [piece1Data, piece2Data]);
        } else {
        }
        
        
        } catch (error) {
            this.closeCutMeasurementsModal();
            throw error;
        }
    }
    
    /**
     * Animate camera to optimal cutting position
     */
    animateCameraForCutting(cutDirection) {
        
        // Find the selected object or first work bench part
        let targetMesh = this.drawingWorld.selectedPart;
        if (!targetMesh) {
            // Find first work bench part
            const workBenchParts = this.scene.meshes.filter(m => m.isWorkBenchPart);
            if (workBenchParts.length > 0) {
                targetMesh = workBenchParts[0];
            }
        }
        
        if (!targetMesh) {
            return;
        }
        
        const meshBounds = targetMesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = targetMesh.position;
        
        // Stop any existing animation
        if (this.cameraAnimation) {
            this.scene.stopAnimation(this.drawingWorld.camera);
        }
        
        let targetPosition, targetTarget;
        
        if (cutDirection === 'cross') {
            // CROSS CUT: Position camera like looking down at patient on table
            // Camera above and to the side, looking down perpendicular to width
            // ZOOMED IN CLOSE so board fills entire screen
            const distance = Math.max(meshSize.x, meshSize.z) * 1.2; // Much closer for full screen
            targetPosition = new BABYLON.Vector3(
                meshCenter.x + distance * 0.7, // Closer to the side
                meshCenter.y + distance, // Above for perfect perpendicular view
                meshCenter.z // Aligned with center
            );
            targetTarget = meshCenter.clone();
            
        } else {
            // RIP CUT: Position camera at foot of board looking lengthwise
            // Camera at one end looking along the length
            const distance = meshSize.y * 3; // Distance from board
            const maxDimension = Math.max(meshSize.x, meshSize.z);
            
            if (meshSize.x >= meshSize.z) {
                // Length is along X axis - camera at X end
                targetPosition = new BABYLON.Vector3(
                    meshCenter.x - maxDimension * 0.7, // At foot of board
                    meshCenter.y + distance, // Above for good view
                    meshCenter.z // Centered on width
                );
            } else {
                // Length is along Z axis - camera at Z end  
                targetPosition = new BABYLON.Vector3(
                    meshCenter.x, // Centered on width
                    meshCenter.y + distance, // Above for good view
                    meshCenter.z - maxDimension * 0.7 // At foot of board
                );
            }
            targetTarget = meshCenter.clone();
        }
        
        // Create smooth camera animation
        this.createCameraAnimation(targetPosition, targetTarget);
    }
    
    /**
     * Create smooth camera animation to target position
     */
    createCameraAnimation(targetPosition, targetTarget) {
        const camera = this.drawingWorld.camera;
        const animationTime = 60; // frames at 60fps = 1 second
        
        // Position animation
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraPosition",
            camera,
            "position",
            60, // 60 fps
            animationTime,
            camera.position.clone(),
            targetPosition,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase()
        );
        
        // Target animation
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraTarget", 
            camera,
            "target",
            60,
            animationTime,
            camera.target.clone(),
            targetTarget,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase()
        );
        
    }
    
    /**
     * Create data for a cut piece
     */
    createCutPiece(originalPartData, cutPosition, piece) {
        const newPartData = JSON.parse(JSON.stringify(originalPartData)); // Deep clone
        
        // Generate new unique ID
        newPartData.id = `workpart_${Date.now()}_${piece === 'first' ? 'A' : 'B'}`;
        
        // Update dimensions based on cut
        const dimensions = this.getLumberDimensions(null, originalPartData);
        if (!dimensions) return newPartData;
        
        if (this.activeCutDirection === 'rip') {
            // Rip cut - divide the longest dimension
            if (dimensions.length_inches >= dimensions.width_inches) {
                newPartData.dimensions.length = piece === 'first' ?
                    dimensions.length_inches * cutPosition :
                    dimensions.length_inches * (1 - cutPosition);
            } else {
                newPartData.dimensions.width = piece === 'first' ?
                    dimensions.width_inches * cutPosition :
                    dimensions.width_inches * (1 - cutPosition);
            }
        } else {
            // Cross cut - divide the shortest dimension  
            if (dimensions.width_inches <= dimensions.length_inches) {
                newPartData.dimensions.width = piece === 'first' ?
                    dimensions.width_inches * cutPosition :
                    dimensions.width_inches * (1 - cutPosition);
            } else {
                newPartData.dimensions.length = piece === 'first' ?
                    dimensions.length_inches * cutPosition :
                    dimensions.length_inches * (1 - cutPosition);
            }
        }
        
        // Update the material name to show it's a cut piece
        const baseName = originalPartData.materialName || 'Part';
        newPartData.materialName = `${baseName} (${piece === 'first' ? 'A' : 'B'})`;
        
        return newPartData;
    }
    
    /**
     * Create mesh for cut piece
     */
    createCutPieceMesh(partData, originalPosition, originalRotation) {
        // Add the part data to the work bench parts array
        this.drawingWorld.workBenchParts.push(partData);
        
        // Create the 3D mesh directly
        const mesh = BABYLON.MeshBuilder.CreateBox(partData.id, {
            width: partData.dimensions.length * 2.54,  // Convert inches to cm
            height: partData.dimensions.thickness * 2.54,
            depth: partData.dimensions.width * 2.54
        }, this.scene);
        
        // Set part data reference
        mesh.partData = partData;
        mesh.isWorkBenchPart = true;
        
        // Apply material color
        const material = new BABYLON.StandardMaterial(`${partData.id}_material`, this.scene);
        material.diffuseColor = this.drawingWorld.getMaterialColor(partData.materialId);
        mesh.material = material;
        
        // Position the mesh
        mesh.position = originalPosition.clone();
        mesh.rotation = originalRotation.clone();
        
        // Keep on bench surface
        this.drawingWorld.keepOnBenchSurface(mesh);
        
        return mesh;
    }
    
    /**
     * Create dimension lines showing exact cut measurements
     */
    createDimensionLines(mesh, cutLine) {
        
        // Clear existing dimension lines
        this.clearDimensionLines();
        
        const meshBounds = mesh.getBoundingInfo();
        const meshCenter = mesh.position;
        
        
        // Calculate dimensions on each side of the cut
        const cutPos = cutLine.normalizedPosition;
        const totalDimension = cutLine.cutDimension;
        const piece1Dimension = totalDimension * cutPos;
        const piece2Dimension = totalDimension * (1 - cutPos);
        
        
        // Create actual dimension lines based on cut axis
        if (cutLine.cutAxis === 'x') {
            this.createHorizontalDimensionLine(meshCenter, meshBounds, cutLine.position.x, piece1Dimension, piece2Dimension, 'left');
        } else if (cutLine.cutAxis === 'y') {
            this.createVerticalDimensionLine(meshCenter, meshBounds, cutLine.position.y, piece1Dimension, piece2Dimension, 'front');
        } else { // z axis
            this.createDepthDimensionLine(meshCenter, meshBounds, cutLine.position.z, piece1Dimension, piece2Dimension, 'depth');
        }
        
    }
    
    /**
     * Create simple test dimension line to verify visibility
     */
    createTestDimensionLine(meshCenter, cutAxis) {
        
        // Create a simple green line above the mesh
        const start = meshCenter.clone();
        const end = meshCenter.clone();
        
        start.y += 5; // 5cm above
        end.y += 5;
        
        if (cutAxis === 'x') {
            start.x -= 10;
            end.x += 10;
        } else {
            start.z -= 10;
            end.z += 10;
        }
        
        const line = BABYLON.MeshBuilder.CreateLines("testDimensionLine", {
            points: [start, end]
        }, this.scene);
        
        line.color = new BABYLON.Color3(0, 1, 0); // Bright green
        line.isPickable = false;
        
        
        // Store for cleanup
        this.cutIndicators.push(line);
    }
    
    /**
     * Create horizontal dimension line (X axis)
     */
    createHorizontalDimensionLine(meshCenter, meshBounds, cutPosX, dim1, dim2, side) {
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const leftEdge = meshCenter.x - meshSize.x / 2;
        const rightEdge = meshCenter.x + meshSize.x / 2;
        const offsetZ = meshCenter.z - meshSize.z / 2 - 4; // To the front side of lumber
        
        
        // Left dimension line (piece 1)
        this.createBlueprintDimensionLine(
            new BABYLON.Vector3(leftEdge, meshCenter.y, offsetZ),
            new BABYLON.Vector3(cutPosX, meshCenter.y, offsetZ),
            `${dim1.toFixed(1)}"`
        );
        
        // Right dimension line (piece 2)  
        this.createBlueprintDimensionLine(
            new BABYLON.Vector3(cutPosX, meshCenter.y, offsetZ),
            new BABYLON.Vector3(rightEdge, meshCenter.y, offsetZ),
            `${dim2.toFixed(1)}"`
        );
    }
    
    /**
     * Create vertical dimension line (Y axis)
     */
    createVerticalDimensionLine(meshCenter, meshBounds, cutPosY, dim1, dim2, side) {
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const frontEdge = meshCenter.y - meshSize.y / 2;
        const backEdge = meshCenter.y + meshSize.y / 2;
        const offsetX = meshCenter.x + meshSize.x / 2 + 4; // To the side of lumber
        
        // Front dimension line (piece 1)
        this.createBlueprintDimensionLine(
            new BABYLON.Vector3(offsetX, frontEdge, meshCenter.z),
            new BABYLON.Vector3(offsetX, cutPosY, meshCenter.z),
            `${dim1.toFixed(1)}"`
        );
        
        // Back dimension line (piece 2)
        this.createBlueprintDimensionLine(
            new BABYLON.Vector3(offsetX, cutPosY, meshCenter.z),
            new BABYLON.Vector3(offsetX, backEdge, meshCenter.z),
            `${dim2.toFixed(1)}"`
        );
    }
    
    /**
     * Create depth dimension line (Z axis)
     */
    createDepthDimensionLine(meshCenter, meshBounds, cutPosZ, dim1, dim2, side) {
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const nearEdge = meshCenter.z - meshSize.z / 2;
        const farEdge = meshCenter.z + meshSize.z / 2;
        const offsetX = meshCenter.x + meshSize.x / 2 + 4; // To the side of lumber
        
        // Near dimension line (piece 1)
        this.createBlueprintDimensionLine(
            new BABYLON.Vector3(offsetX, meshCenter.y, nearEdge),
            new BABYLON.Vector3(offsetX, meshCenter.y, cutPosZ),
            `${dim1.toFixed(1)}"`
        );
        
        // Far dimension line (piece 2)
        this.createBlueprintDimensionLine(
            new BABYLON.Vector3(offsetX, meshCenter.y, cutPosZ),
            new BABYLON.Vector3(offsetX, meshCenter.y, farEdge),
            `${dim2.toFixed(1)}"`
        );
    }
    
    /**
     * Create professional blueprint-style dimension line with terminators
     */
    createBlueprintDimensionLine(start, end, text) {
        
        // Create main dimension line - black like blueprints
        const line = BABYLON.MeshBuilder.CreateLines("dimensionLine", {
            points: [start, end]
        }, this.scene);
        line.color = new BABYLON.Color3(0, 0, 0); // Black lines for professional look
        line.isPickable = false;
        
        // Calculate direction vector for terminators
        const direction = end.subtract(start).normalize();
        const perpendicular = new BABYLON.Vector3(-direction.z, direction.y, direction.x).normalize().scale(2.0); // Much larger terminators
        
        // Create arrow terminators at both ends
        const startTerminator1 = start.add(perpendicular);
        const startTerminator2 = start.subtract(perpendicular);
        const endTerminator1 = end.add(perpendicular);
        const endTerminator2 = end.subtract(perpendicular);
        
        // Start terminator
        const startTerm = BABYLON.MeshBuilder.CreateLines("dimensionTerminator", {
            points: [startTerminator1, startTerminator2]
        }, this.scene);
        startTerm.color = new BABYLON.Color3(0, 0, 0);
        startTerm.isPickable = false;
        
        // End terminator  
        const endTerm = BABYLON.MeshBuilder.CreateLines("dimensionTerminator", {
            points: [endTerminator1, endTerminator2]
        }, this.scene);
        endTerm.color = new BABYLON.Color3(0, 0, 0);
        endTerm.isPickable = false;
        
        // Create dimension text - positioned to face camera
        const midPoint = start.add(end).scale(0.5);
        
        const textPlane = BABYLON.MeshBuilder.CreatePlane("dimensionText", { size: 3 }, this.scene);
        textPlane.position = midPoint;
        textPlane.billboardMode = BABYLON.AbstractMesh.BILLBOARD_ALL; // Always face camera
        
        // Create text texture - black text on white background like blueprints
        const textTexture = new BABYLON.DynamicTexture("dimensionTextTexture", { width: 256, height: 128 }, this.scene);
        textTexture.hasAlpha = true;
        textTexture.drawText(text, null, null, "bold 48px Arial", "black", "white", true);
        
        const textMaterial = new BABYLON.StandardMaterial("dimensionTextMaterial", this.scene);
        textMaterial.diffuseTexture = textTexture;
        textMaterial.hasAlpha = true;
        textMaterial.backFaceCulling = false;
        textPlane.material = textMaterial;
        textPlane.isPickable = false;
        
        
        // Store all components for cleanup
        this.cutIndicators.push(line, startTerm, endTerm, textPlane);
    }
    
    /**
     * Update dimension lines when cut position changes
     */
    updateDimensionLines(mesh, cutLine) {
        // Clear and recreate dimension lines
        this.clearDimensionLines();
        this.createDimensionLines(mesh, cutLine);
    }
    
    /**
     * Clear dimension lines
     */
    clearDimensionLines() {
        // Clear only dimension lines, not cut preview
        this.cutIndicators.forEach(indicator => {
            if (indicator.name.includes('dimension')) {
                indicator.dispose();
            }
        });
        this.cutIndicators = this.cutIndicators.filter(indicator => !indicator.name.includes('dimension'));
    }
    
    /**
     * Clear cut preview visuals
     */
    clearCutPreview() {
        if (this.cutPreviewLine) {
            this.cutPreviewLine.dispose();
            this.cutPreviewLine = null;
        }
        
        // Clear all indicators including dimension lines
        this.cutIndicators.forEach(indicator => indicator.dispose());
        this.cutIndicators = [];
        
        // Clear colored preview pieces
        this.clearColoredPreviewPieces();
        
        // Hide measurement display
        this.hideMeasurementDisplay();
    }
    
    /**
     * Get part data from mesh
     */
    getPartData(mesh) {
        if (!mesh) {
            return null;
        }
        
        if (!mesh.partData) {
            
            // Try to find the part data in the workBenchParts array by matching mesh name/ID
            if (mesh.name && this.drawingWorld.workBenchParts) {
                const partData = this.drawingWorld.workBenchParts.find(p => p.id === mesh.name);
                if (partData) {
                    return partData;
                }
            }
        }
        
        return mesh.partData || null;
    }
    
    /**
     * Check if part data represents lumber
     */
    isLumberPart(partData) {
        // Check for work bench parts with dimensions
        const hasWorkBenchData = partData && partData.materialId && partData.dimensions;
        return hasWorkBenchData;
    }
    
    /**
     * Get lumber dimensions from part data
     */
    getLumberDimensions(mesh, partData) {
        if (!partData) return null;
        
        // Check for dimensions in the part data structure
        if (partData.dimensions) {
            return {
                length_inches: partData.dimensions.length || 0,
                width_inches: partData.dimensions.width || 0,
                thickness_inches: partData.dimensions.thickness || 0
            };
        }
        
        // Fallback to physical_properties if available
        if (partData.physical_properties) {
            return {
                length_inches: partData.physical_properties.length_inches || 0,
                width_inches: partData.physical_properties.width_inches || 0,
                thickness_inches: partData.physical_properties.thickness_inches || 0
            };
        }
        
        return null;
    }
    
    /**
     * Handle waste selection hover effects
     */
    handleWasteSelectionHover(pointerInfo) {
        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const mesh = pickInfo.pickedMesh;
            
            // Check if this is one of our waste candidate meshes
            const meshIndex = this.wasteCandidateMeshes.findIndex(m => m === mesh);
            if (meshIndex !== -1) {
                // Apply hash pattern to hovered mesh
                mesh.material = this.hashMaterial;
                
                // Restore original materials to other meshes
                this.wasteCandidateMeshes.forEach((otherMesh, index) => {
                    if (index !== meshIndex && this.originalMaterials) {
                        otherMesh.material = this.originalMaterials[index];
                    }
                });
            }
        } else {
            // No mesh hit - restore all original materials
            if (this.originalMaterials && this.wasteCandidateMeshes) {
                this.wasteCandidateMeshes.forEach((mesh, index) => {
                    mesh.material = this.originalMaterials[index];
                });
            }
        }
    }
    
    /**
     * Handle waste selection clicks
     */
    handleWasteSelectionClick(pointerInfo) {
        if (pointerInfo.event.button !== 0) return false; // Only left click
        
        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const mesh = pickInfo.pickedMesh;
            const meshIndex = this.wasteCandidateMeshes.findIndex(m => m === mesh);
            
            if (meshIndex !== -1) {
                // Send this piece to scrap bin
                this.sendToScrapBin(mesh, this.wasteCandidateData[meshIndex]);
                
                // Clean up waste selection
                this.finishWasteSelection();
                
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Send piece to scrap bin
     */
    sendToScrapBin(mesh, partData) {
        // Remove from work bench parts
        const partIndex = this.drawingWorld.workBenchParts.findIndex(p => p.id === partData.id);
        if (partIndex !== -1) {
            this.drawingWorld.workBenchParts.splice(partIndex, 1);
        }
        
        // Remove mesh from scene
        mesh.dispose();
        
        // TODO: Add to scrap bin/library category
        // For now, just log it
    }
    
    /**
     * Finish waste selection and clean up
     */
    finishWasteSelection() {
        this.wasteSelectionActive = false;
        
        // Restore materials for remaining pieces
        if (this.originalMaterials && this.wasteCandidateMeshes) {
            this.wasteCandidateMeshes.forEach((mesh, index) => {
                if (!mesh.isDisposed() && this.originalMaterials[index]) {
                    mesh.material = this.originalMaterials[index];
                }
            });
        }
        
        // Remove instruction UI
        const instruction = document.getElementById('waste-instruction');
        if (instruction) {
            instruction.remove();
        }
        
        // Clean up references
        this.wasteCandidateMeshes = null;
        this.wasteCandidateData = null;
        this.originalMaterials = null;
        
        // Update project explorer
        this.updateProjectExplorer();
        
        // Auto-deactivate cut tool and return to pointer mode
        this.deactivate();
        
        // Switch back to pointer tool in the main drawing world
        if (this.drawingWorld && this.drawingWorld.selectSketchTool) {
            this.drawingWorld.selectSketchTool('pointer');
        }
    }
    
    /**
     * Calculate realistic cut positions - PIECES STAY WHERE THEY ARE
     */
    calculateCutPositions(originalPosition, meshSize, cutPosition, kerfWidth, cutLine) {
        const halfKerf = kerfWidth / 2;
        
        // CRITICAL: Keep all corners in place, only adjust the cut pieces
        let cutInfo = {
            position1: originalPosition.clone(),
            position2: originalPosition.clone(), 
            kerfPosition: originalPosition.clone(),
            kerfDimensions: { width: 0, height: 0, depth: 0 }
        };
        
        // Use the cut axis from the cut line calculation
        const cutAxis = cutLine.cutAxis;
        const cutPointPos = cutLine.position[cutAxis];
        
        if (cutAxis === 'x') {
            // Cut perpendicular to X axis
            const leftEdge = originalPosition.x - meshSize.x / 2;
            const rightEdge = originalPosition.x + meshSize.x / 2;
            
            // Piece 1: From left edge to cut point
            const piece1Size = (cutPointPos - halfKerf) - leftEdge;
            cutInfo.position1.x = leftEdge + piece1Size / 2;
            
            // Piece 2: From cut point to right edge  
            const piece2Size = rightEdge - (cutPointPos + halfKerf);
            cutInfo.position2.x = rightEdge - piece2Size / 2;
            
            cutInfo.kerfPosition.x = cutPointPos;
            cutInfo.kerfDimensions = { width: kerfWidth, height: meshSize.y, depth: meshSize.z };
            
        } else if (cutAxis === 'y') {
            // Cut perpendicular to Y axis
            const frontEdge = originalPosition.y - meshSize.y / 2;
            const backEdge = originalPosition.y + meshSize.y / 2;
            
            // Piece 1: From front edge to cut point
            const piece1Size = (cutPointPos - halfKerf) - frontEdge;
            cutInfo.position1.y = frontEdge + piece1Size / 2;
            
            // Piece 2: From cut point to back edge
            const piece2Size = backEdge - (cutPointPos + halfKerf);
            cutInfo.position2.y = backEdge - piece2Size / 2;
            
            cutInfo.kerfPosition.y = cutPointPos;
            cutInfo.kerfDimensions = { width: meshSize.x, height: kerfWidth, depth: meshSize.z };
            
        } else { // z axis
            // Cut perpendicular to Z axis
            const nearEdge = originalPosition.z - meshSize.z / 2;
            const farEdge = originalPosition.z + meshSize.z / 2;
            
            // Piece 1: From near edge to cut point
            const piece1Size = (cutPointPos - halfKerf) - nearEdge;
            cutInfo.position1.z = nearEdge + piece1Size / 2;
            
            // Piece 2: From cut point to far edge
            const piece2Size = farEdge - (cutPointPos + halfKerf);
            cutInfo.position2.z = farEdge - piece2Size / 2;
            
            cutInfo.kerfPosition.z = cutPointPos;
            cutInfo.kerfDimensions = { width: meshSize.x, height: meshSize.y, depth: kerfWidth };
        }
        
        return cutInfo;
    }
    
    /**
     * Create visual kerf line (cut line between pieces)
     */
    createKerfLine(position, dimensions, rotation) {
        const kerfLine = BABYLON.MeshBuilder.CreateBox("kerf_line", {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, this.scene);
        
        kerfLine.position = position;
        kerfLine.rotation = rotation;
        
        // Create dark kerf material
        const kerfMaterial = new BABYLON.StandardMaterial("kerf_material", this.scene);
        kerfMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Dark grey
        kerfMaterial.alpha = 0.8;
        kerfLine.material = kerfMaterial;
        kerfLine.isPickable = false;
        
    }
    
    /**
     * Show waste selection modal after cutting
     */
    showWasteSelectionModal(meshes, partDataArray) {
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'waste-selection-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>Cut Complete - Waste Selection</h3>
                    <p>Is one of the cut pieces waste material?</p>
                    <div class="modal-buttons">
                        <button id="no-waste-btn" class="btn-primary">Both pieces are good</button>
                        <button id="select-waste-btn" class="btn-secondary">Select waste piece</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            #waste-selection-modal .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            #waste-selection-modal .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                max-width: 400px;
                text-align: center;
            }
            #waste-selection-modal .modal-buttons {
                margin-top: 1rem;
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
            #waste-selection-modal button {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            #waste-selection-modal .btn-primary {
                background: #007bff;
                color: white;
            }
            #waste-selection-modal .btn-secondary {
                background: #6c757d;
                color: white;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Handle modal buttons
        document.getElementById('no-waste-btn').addEventListener('click', () => {
            this.closeWasteModal();
        });
        
        document.getElementById('select-waste-btn').addEventListener('click', () => {
            this.closeWasteModal();
            this.startWasteSelection(meshes, partDataArray);
        });
    }
    
    /**
     * Close waste selection modal
     */
    closeWasteModal() {
        const modal = document.getElementById('waste-selection-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Start waste piece selection with hover preview
     */
    startWasteSelection(meshes, partDataArray) {
        
        // Create hash pattern material for waste preview
        this.createHashPatternMaterial();
        
        // Store original materials
        this.originalMaterials = meshes.map(mesh => mesh.material);
        
        // Add hover listeners for waste selection
        this.wasteSelectionActive = true;
        this.wasteCandidateMeshes = meshes;
        this.wasteCandidateData = partDataArray;
        
        // Add UI instruction
        const instruction = document.createElement('div');
        instruction.id = 'waste-instruction';
        instruction.innerHTML = `
            <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                        background: rgba(255, 255, 255, 0.9); padding: 1rem; border-radius: 4px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 999;">
                <strong>Waste Selection:</strong> Hover over a piece to preview, click to send to scrap bin
                <button id="cancel-waste" style="margin-left: 1rem; padding: 0.25rem 0.5rem;">Cancel</button>
            </div>
        `;
        document.body.appendChild(instruction);
        
        document.getElementById('cancel-waste').addEventListener('click', () => {
            this.cancelWasteSelection();
        });
    }
    
    /**
     * Create hash pattern material for waste preview
     */
    createHashPatternMaterial() {
        this.hashMaterial = new BABYLON.StandardMaterial("hashPattern", this.scene);
        this.hashMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.3, 0.3); // Red tint
        this.hashMaterial.alpha = 0.7;
        this.hashMaterial.wireframe = true; // Creates hash-like appearance
    }
    
    /**
     * Cancel waste selection
     */
    cancelWasteSelection() {
        this.wasteSelectionActive = false;
        
        // Restore original materials
        if (this.originalMaterials && this.wasteCandidateMeshes) {
            this.wasteCandidateMeshes.forEach((mesh, index) => {
                mesh.material = this.originalMaterials[index];
            });
        }
        
        // Remove instruction
        const instruction = document.getElementById('waste-instruction');
        if (instruction) {
            instruction.remove();
        }
        
    }
    
    /**
     * Get stored cut line from preview
     */
    getStoredCutLine() {
        if (!this.storedCutLine) {
            return { cutAxis: 'x', position: { x: 0, y: 0, z: 0 }, normalizedPosition: 0.5 };
        }
        return this.storedCutLine;
    }
    
    /**
     * Create kerf corners at cut position
     */
    createKerfCorners(corners, cutAxis, cutPos, halfKerf) {
        const kerfCorners = [];
        
        if (cutAxis === 'x') {
            // Create 4 corners at cut position along X axis
            kerfCorners.push(
                new BABYLON.Vector3(cutPos - halfKerf, corners[0].y, corners[0].z), // left-front-bottom
                new BABYLON.Vector3(cutPos + halfKerf, corners[0].y, corners[0].z), // right-front-bottom
                new BABYLON.Vector3(cutPos + halfKerf, corners[3].y, corners[0].z), // right-back-bottom
                new BABYLON.Vector3(cutPos - halfKerf, corners[3].y, corners[0].z), // left-back-bottom
                new BABYLON.Vector3(cutPos - halfKerf, corners[0].y, corners[4].z), // left-front-top
                new BABYLON.Vector3(cutPos + halfKerf, corners[0].y, corners[4].z), // right-front-top
                new BABYLON.Vector3(cutPos + halfKerf, corners[3].y, corners[4].z), // right-back-top
                new BABYLON.Vector3(cutPos - halfKerf, corners[3].y, corners[4].z)  // left-back-top
            );
        } else if (cutAxis === 'y') {
            // Create 4 corners at cut position along Y axis
            kerfCorners.push(
                new BABYLON.Vector3(corners[0].x, cutPos - halfKerf, corners[0].z),
                new BABYLON.Vector3(corners[1].x, cutPos - halfKerf, corners[0].z),
                new BABYLON.Vector3(corners[1].x, cutPos + halfKerf, corners[0].z),
                new BABYLON.Vector3(corners[0].x, cutPos + halfKerf, corners[0].z),
                new BABYLON.Vector3(corners[0].x, cutPos - halfKerf, corners[4].z),
                new BABYLON.Vector3(corners[1].x, cutPos - halfKerf, corners[4].z),
                new BABYLON.Vector3(corners[1].x, cutPos + halfKerf, corners[4].z),
                new BABYLON.Vector3(corners[0].x, cutPos + halfKerf, corners[4].z)
            );
        } else { // z axis
            // Create 4 corners at cut position along Z axis
            kerfCorners.push(
                new BABYLON.Vector3(corners[0].x, corners[0].y, cutPos - halfKerf),
                new BABYLON.Vector3(corners[1].x, corners[0].y, cutPos - halfKerf),
                new BABYLON.Vector3(corners[2].x, corners[2].y, cutPos - halfKerf),
                new BABYLON.Vector3(corners[3].x, corners[3].y, cutPos - halfKerf),
                new BABYLON.Vector3(corners[0].x, corners[0].y, cutPos + halfKerf),
                new BABYLON.Vector3(corners[1].x, corners[0].y, cutPos + halfKerf),
                new BABYLON.Vector3(corners[2].x, corners[2].y, cutPos + halfKerf),
                new BABYLON.Vector3(corners[3].x, corners[3].y, cutPos + halfKerf)
            );
        }
        
        return kerfCorners;
    }
    
    /**
     * Split corners into two pieces
     */
    splitCorners(corners, kerfCorners, cutAxis, cutPos, halfKerf) {
        const piece1Corners = [];
        const piece2Corners = [];
        
        if (cutAxis === 'x') {
            // Piece 1: Left side + left kerf corners
            piece1Corners.push(
                corners[0], corners[3], corners[7], corners[4], // Original left face
                kerfCorners[0], kerfCorners[3], kerfCorners[7], kerfCorners[4] // Left kerf face
            );
            
            // Piece 2: Right kerf corners + right side
            piece2Corners.push(
                kerfCorners[1], kerfCorners[2], kerfCorners[6], kerfCorners[5], // Right kerf face
                corners[1], corners[2], corners[6], corners[5] // Original right face
            );
        } else if (cutAxis === 'y') {
            // Piece 1: Front side + front kerf corners
            piece1Corners.push(
                corners[0], corners[1], corners[5], corners[4], // Original front face
                kerfCorners[0], kerfCorners[1], kerfCorners[5], kerfCorners[4] // Front kerf face
            );
            
            // Piece 2: Back kerf corners + back side
            piece2Corners.push(
                kerfCorners[3], kerfCorners[2], kerfCorners[6], kerfCorners[7], // Back kerf face
                corners[3], corners[2], corners[6], corners[7] // Original back face
            );
        } else { // z axis
            // Piece 1: Bottom side + bottom kerf corners
            piece1Corners.push(
                corners[0], corners[1], corners[2], corners[3], // Original bottom face
                kerfCorners[0], kerfCorners[1], kerfCorners[2], kerfCorners[3] // Bottom kerf face
            );
            
            // Piece 2: Top kerf corners + top side
            piece2Corners.push(
                kerfCorners[4], kerfCorners[5], kerfCorners[6], kerfCorners[7], // Top kerf face
                corners[4], corners[5], corners[6], corners[7] // Original top face
            );
        }
        
        return { piece1Corners, piece2Corners };
    }
    
    /**
     * Create piece data from corners with exact dimensions
     */
    createPieceFromCorners(originalData, corners, suffix) {
        const newData = JSON.parse(JSON.stringify(originalData));
        newData.id = `workpart_${Date.now()}_${suffix}`;
        newData.materialName = `${originalData.materialName} (${suffix})`;
        
        // Calculate exact dimensions from corners
        const min = corners[0].clone();
        const max = corners[0].clone();
        
        corners.forEach(corner => {
            if (corner.x < min.x) min.x = corner.x;
            if (corner.y < min.y) min.y = corner.y;
            if (corner.z < min.z) min.z = corner.z;
            if (corner.x > max.x) max.x = corner.x;
            if (corner.y > max.y) max.y = corner.y;
            if (corner.z > max.z) max.z = corner.z;
        });
        
        // Convert cm back to inches for dimensions
        newData.dimensions = {
            length: Math.abs(max.x - min.x) / 2.54,
            width: Math.abs(max.y - min.y) / 2.54,
            thickness: Math.abs(max.z - min.z) / 2.54
        };
        
        return newData;
    }
    
    /**
     * Create mesh from corners
     */
    createMeshFromCorners(partData, corners) {
        // Calculate center and size from corners
        const min = corners[0].clone();
        const max = corners[0].clone();
        
        corners.forEach(corner => {
            if (corner.x < min.x) min.x = corner.x;
            if (corner.y < min.y) min.y = corner.y;
            if (corner.z < min.z) min.z = corner.z;
            if (corner.x > max.x) max.x = corner.x;
            if (corner.y > max.y) max.y = corner.y;
            if (corner.z > max.z) max.z = corner.z;
        });
        
        const size = max.subtract(min);
        const center = min.add(max).scale(0.5);
        
        // Create mesh
        const mesh = BABYLON.MeshBuilder.CreateBox(partData.id, {
            width: size.x,
            height: size.z, // Z is height in our system
            depth: size.y
        }, this.scene);
        
        mesh.position = center;
        mesh.partData = partData;
        mesh.isWorkBenchPart = true;
        
        // Apply material
        const material = new BABYLON.StandardMaterial(`${partData.id}_material`, this.scene);
        material.diffuseColor = this.drawingWorld.getMaterialColor(partData.materialId);
        mesh.material = material;
        
        // Add to work bench
        this.drawingWorld.workBenchParts.push(partData);
        
        return mesh;
    }
    
    /**
     * Create kerf gap visualization
     */
    createKerfGap(kerfCorners, cutAxis) {
        // Create a thin visual gap between pieces
        if (kerfCorners.length >= 8) {
            const min = kerfCorners[0].clone();
            const max = kerfCorners[6].clone();
            const center = min.add(max).scale(0.5);
            const size = max.subtract(min);
            
            const kerfMesh = BABYLON.MeshBuilder.CreateBox("kerf_gap", {
                width: size.x,
                height: size.z,
                depth: size.y
            }, this.scene);
            
            kerfMesh.position = center;
            
            const kerfMaterial = new BABYLON.StandardMaterial("kerf_material", this.scene);
            kerfMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            kerfMaterial.alpha = 0.5;
            kerfMesh.material = kerfMaterial;
            kerfMesh.isPickable = false;
        }
    }
    
    /**
     * Update project explorer to show cut pieces
     */
    updateProjectExplorer() {
        // Delegate to main drawing world
        if (this.drawingWorld.updateWorkBenchDisplay) {
            this.drawingWorld.updateWorkBenchDisplay();
        }
    }
    
    /**
     * Cleanup when tool is destroyed
     */
    dispose() {
        this.clearCutPreview();
        
        if (this.cutPreviewMaterial) {
            this.cutPreviewMaterial.dispose();
        }
        
        // Remove pointer observer
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
    }
}