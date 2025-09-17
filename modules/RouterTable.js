/**
 * RouterTable Module for CutList - Version 2
 * Single-click edge routing with visual selection
 * 
 * Core Rules:
 * - Only topmost edges can be routed
 * - Board must be flipped to route other edges  
 * - Click on an edge to route it instantly
 * - Router bits loaded dynamically from shapes folder
 */

class RouterTable {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.board = null;
        this.originalBoard = null;
        this.routerBit = null;
        this.camera = null;
        this.isActive = false;
        this.availableBits = [];
        this.selectedBitName = null;
        
        // Edge highlighting
        this.edgeHighlights = [];
        this.hoveredEdge = null;
        this.routedEdges = new Set(); // Track which edges have been routed
        
        // Initialize UI elements
        this.uiContainer = null;
        this.setupUI();
    }
    
    /**
     * Activate router table mode with selected board
     */
    activate(boardPart) {
        this.isActive = true;
        
        // Store the original Part
        this.originalBoard = boardPart;
        
        // Get the mesh - either from Part or find it by ID
        let mesh = boardPart.mesh;
        if (!mesh) {
            // Try to find mesh by Part ID
            mesh = this.scene.getMeshByName(boardPart.id);
            if (!mesh) {
                console.error('Cannot find mesh for part:', boardPart.id);
                alert('Cannot find board mesh. Please try again.');
                return;
            }
            // Link mesh back to Part
            boardPart.mesh = mesh;
        }
        
        // Clone the board to work with
        this.board = mesh.clone('routerBoard');
        
        // Hide original, show working copy
        mesh.isVisible = false;
        
        // Setup camera to focus on board
        this.setupCamera();
        
        // Load available router bits
        this.loadAvailableBits();
        
        // Setup edge selection
        this.setupEdgeSelection();
        
        // Show UI
        this.showUI();
    }
    
    /**
     * Setup camera for router table view
     */
    setupCamera() {
        // Store main camera and create router camera
        this.mainCamera = this.scene.activeCamera;
        
        // Calculate board center and size
        const boundingInfo = this.board.getBoundingInfo();
        const center = boundingInfo.boundingBox.centerWorld;
        const size = boundingInfo.boundingBox.extendSizeWorld;
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Create arc rotate camera focused on board
        this.camera = new BABYLON.ArcRotateCamera(
            'routerCamera',
            -Math.PI/4,
            Math.PI/3,
            maxDim * 3,
            center,
            this.scene
        );
        
        this.camera.attachControl(this.canvas, true);
        this.camera.wheelPrecision = 50;
        this.camera.lowerRadiusLimit = maxDim * 1.5;
        this.camera.upperRadiusLimit = maxDim * 5;
        
        // Switch to router camera
        this.scene.activeCamera = this.camera;
    }
    
    /**
     * Setup UI for router table
     */
    setupUI() {
        // Create main UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'routerTableUI';
        this.uiContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; width: 300px; background: rgba(255, 255, 255, 0.95); border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 20px; font-family: Arial, sans-serif; display: none; z-index: 1000;';
        
        this.uiContainer.innerHTML = '<h2 style="margin-top: 0; color: #333;">Router Table</h2>' +
            '<div style="margin-bottom: 20px;">' +
            '<label style="display: block; margin-bottom: 5px; font-weight: bold;">Select Router Bit:</label>' +
            '<select id="routerBitSelect" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">' +
            '<option value="">-- Select a bit --</option>' +
            '</select>' +
            '</div>' +
            '<div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">' +
            '<p style="margin: 0 0 10px 0; font-weight: bold;">Instructions:</p>' +
            '<ol style="margin: 0; padding-left: 20px; font-size: 14px;">' +
            '<li>Select a router bit above</li>' +
            '<li>Click on any TOP edge to route it</li>' +
            '<li>Use flip controls to access other edges</li>' +
            '</ol>' +
            '</div>' +
            '<div style="margin-bottom: 20px;">' +
            '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Flip Board:</label>' +
            '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">' +
            '<button onclick="routerTable.flipBoard(\'x\', 1)" style="padding: 10px; border: none; background: #4CAF50; color: white; border-radius: 4px; cursor: pointer;">Flip →</button>' +
            '<button onclick="routerTable.flipBoard(\'y\', 1)" style="padding: 10px; border: none; background: #2196F3; color: white; border-radius: 4px; cursor: pointer;">Flip ↑</button>' +
            '<button onclick="routerTable.flipBoard(\'z\', 1)" style="padding: 10px; border: none; background: #FF9800; color: white; border-radius: 4px; cursor: pointer;">Flip ↻</button>' +
            '<button onclick="routerTable.flipBoard(\'x\', -1)" style="padding: 10px; border: none; background: #4CAF50; color: white; border-radius: 4px; cursor: pointer;">Flip ←</button>' +
            '<button onclick="routerTable.flipBoard(\'y\', -1)" style="padding: 10px; border: none; background: #2196F3; color: white; border-radius: 4px; cursor: pointer;">Flip ↓</button>' +
            '<button onclick="routerTable.flipBoard(\'z\', -1)" style="padding: 10px; border: none; background: #FF9800; color: white; border-radius: 4px; cursor: pointer;">Flip ↺</button>' +
            '</div>' +
            '</div>' +
            '<div style="margin-bottom: 15px; padding: 10px; background: #e8f5e9; border-radius: 6px;">' +
            '<p style="margin: 0; font-size: 14px;"><strong>Routed Edges:</strong> <span id="routedCount">0</span> of 4</p>' +
            '</div>' +
            '<hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">' +
            '<div style="display: flex; flex-direction: column; gap: 10px;">' +
            '<button onclick="window.drawingWorld.routerTable.accept()" style="padding: 12px; border: none; background: #4CAF50; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">Accept & Return</button>' +
            '<button onclick="window.drawingWorld.routerTable.cancel()" style="padding: 12px; border: none; background: #757575; color: white; border-radius: 4px; cursor: pointer;">Cancel</button>' +
            '</div>';
        
        document.body.appendChild(this.uiContainer);
    }
    
    /**
     * Setup edge selection and highlighting
     */
    setupEdgeSelection() {
        // Create edge highlight meshes
        this.createEdgeHighlights();
        
        // Add click handler
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.handleMouseMove(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERTAP:
                    this.handleEdgeClick(pointerInfo);
                    break;
            }
        });
    }
    
    /**
     * Create visual highlights for edges
     */
    createEdgeHighlights() {
        const boundingInfo = this.board.getBoundingInfo();
        const boardTop = boundingInfo.boundingBox.maximumWorld.y;
        const boardRight = boundingInfo.boundingBox.maximumWorld.x;
        const boardLeft = boundingInfo.boundingBox.minimumWorld.x;
        const boardFront = boundingInfo.boundingBox.maximumWorld.z;
        const boardBack = boundingInfo.boundingBox.minimumWorld.z;
        
        const edgeThickness = 0.2;
        const edgeHeight = 0.1;
        
        // Create invisible click zones (larger, forgiving areas)
        const clickZoneThickness = 1.0;  // Much larger for easier clicking
        const clickZoneHeight = 0.5;
        
        // Right edge click zone (invisible)
        const rightClickZone = BABYLON.MeshBuilder.CreateBox('rightClickZone', {
            width: clickZoneThickness,
            height: clickZoneHeight,
            depth: (boardFront - boardBack) * 1.2  // Extend beyond edges
        }, this.scene);
        rightClickZone.position.set(boardRight, boardTop + clickZoneHeight/2, (boardFront + boardBack) / 2);
        rightClickZone.edgeType = 'right';
        rightClickZone.isVisible = false;  // Invisible
        rightClickZone.isPickable = true;
        rightClickZone.parent = this.board;
        
        // Right edge highlight (visible on hover only)
        const rightEdge = BABYLON.MeshBuilder.CreateBox('rightEdgeHighlight', {
            width: edgeThickness,
            height: edgeHeight,
            depth: boardFront - boardBack
        }, this.scene);
        rightEdge.position.set(boardRight, boardTop + edgeHeight/2, (boardFront + boardBack) / 2);
        rightEdge.isPickable = false;
        rightEdge.isVisible = false;  // Start invisible
        rightClickZone.highlight = rightEdge;
        
        // Left edge click zone (invisible)
        const leftClickZone = BABYLON.MeshBuilder.CreateBox('leftClickZone', {
            width: clickZoneThickness,
            height: clickZoneHeight,
            depth: (boardFront - boardBack) * 1.2
        }, this.scene);
        leftClickZone.position.set(boardLeft, boardTop + clickZoneHeight/2, (boardFront + boardBack) / 2);
        leftClickZone.edgeType = 'left';
        leftClickZone.isVisible = false;
        leftClickZone.isPickable = true;
        leftClickZone.parent = this.board;
        
        // Left edge highlight
        const leftEdge = BABYLON.MeshBuilder.CreateBox('leftEdgeHighlight', {
            width: edgeThickness,
            height: edgeHeight,
            depth: boardFront - boardBack
        }, this.scene);
        leftEdge.position.set(boardLeft, boardTop + edgeHeight/2, (boardFront + boardBack) / 2);
        leftEdge.isPickable = false;
        leftEdge.isVisible = false;
        leftClickZone.highlight = leftEdge;
        
        // Front edge click zone (invisible)
        const frontClickZone = BABYLON.MeshBuilder.CreateBox('frontClickZone', {
            width: (boardRight - boardLeft) * 1.2,
            height: clickZoneHeight,
            depth: clickZoneThickness
        }, this.scene);
        frontClickZone.position.set((boardRight + boardLeft) / 2, boardTop + clickZoneHeight/2, boardFront);
        frontClickZone.edgeType = 'front';
        frontClickZone.isVisible = false;
        frontClickZone.isPickable = true;
        frontClickZone.parent = this.board;
        
        // Front edge highlight
        const frontEdge = BABYLON.MeshBuilder.CreateBox('frontEdgeHighlight', {
            width: boardRight - boardLeft,
            height: edgeHeight,
            depth: edgeThickness
        }, this.scene);
        frontEdge.position.set((boardRight + boardLeft) / 2, boardTop + edgeHeight/2, boardFront);
        frontEdge.isPickable = false;
        frontEdge.isVisible = false;
        frontClickZone.highlight = frontEdge;
        
        // Back edge click zone (invisible)
        const backClickZone = BABYLON.MeshBuilder.CreateBox('backClickZone', {
            width: (boardRight - boardLeft) * 1.2,
            height: clickZoneHeight,
            depth: clickZoneThickness
        }, this.scene);
        backClickZone.position.set((boardRight + boardLeft) / 2, boardTop + clickZoneHeight/2, boardBack);
        backClickZone.edgeType = 'back';
        backClickZone.isVisible = false;
        backClickZone.isPickable = true;
        backClickZone.parent = this.board;
        
        // Back edge highlight
        const backEdge = BABYLON.MeshBuilder.CreateBox('backEdgeHighlight', {
            width: boardRight - boardLeft,
            height: edgeHeight,
            depth: edgeThickness
        }, this.scene);
        backEdge.position.set((boardRight + boardLeft) / 2, boardTop + edgeHeight/2, boardBack);
        backEdge.isPickable = false;
        backEdge.isVisible = false;
        backClickZone.highlight = backEdge;
        
        // Check for 45-degree edges by examining mesh geometry
        // This is a hack but will work for common miter cuts
        const positions = this.board.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (positions) {
            const vertices = [];
            for (let i = 0; i < positions.length; i += 3) {
                vertices.push({
                    x: positions[i],
                    y: positions[i + 1],
                    z: positions[i + 2]
                });
            }
            
            // Look for diagonal edges in the XZ plane (common for miters)
            // Check if we have vertices that suggest 45-degree cuts
            const uniqueX = [...new Set(vertices.map(v => Math.round(v.x * 100) / 100))].sort((a,b) => a-b);
            const uniqueZ = [...new Set(vertices.map(v => Math.round(v.z * 100) / 100))].sort((a,b) => a-b);
            
            // Northeast miter (45 degree from front-right corner)  
            const neMiterCheck = vertices.filter(v => 
                Math.abs(v.y - boardTop) < 0.01 && 
                (v.x + v.z) > ((boardRight + boardFront) * 0.9)
            );
            
            if (neMiterCheck.length >= 2) {
                const neMiterClickZone = BABYLON.MeshBuilder.CreateBox('neMiterClickZone', {
                    width: Math.sqrt(2) * clickZoneThickness * 2,
                    height: clickZoneHeight,
                    depth: Math.sqrt(2) * clickZoneThickness * 2
                }, this.scene);
                
                neMiterClickZone.position.set(
                    boardRight - clickZoneThickness,
                    boardTop + clickZoneHeight/2,
                    boardFront - clickZoneThickness
                );
                neMiterClickZone.rotation.y = Math.PI/4; // 45 degrees
                neMiterClickZone.edgeType = 'neMiter';
                neMiterClickZone.isVisible = false;
                neMiterClickZone.isPickable = true;
                neMiterClickZone.parent = this.board;
                
                const neMiterEdge = BABYLON.MeshBuilder.CreateBox('neMiterEdgeHighlight', {
                    width: Math.sqrt(Math.pow(boardRight - boardLeft, 2) + Math.pow(boardFront - boardBack, 2)) * 0.5,
                    height: edgeHeight,
                    depth: edgeThickness
                }, this.scene);
                
                neMiterEdge.position.set(
                    (boardRight * 0.75 + boardLeft * 0.25),
                    boardTop + edgeHeight/2,
                    (boardFront * 0.75 + boardBack * 0.25)
                );
                neMiterEdge.rotation.y = Math.PI/4;
                neMiterEdge.isPickable = false;
                neMiterEdge.isVisible = false;
                neMiterEdge.parent = this.board;
                neMiterClickZone.highlight = neMiterEdge;
                
                this.edgeClickZones.push(neMiterClickZone);
                this.edgeHighlights.push(neMiterEdge);
            }
        }
        
        // Store click zones (these are what we interact with)
        this.edgeHighlights = [rightClickZone, leftClickZone, frontClickZone, backClickZone];
        
        // Set up materials for highlights
        this.edgeHighlights.forEach(clickZone => {
            const highlight = clickZone.highlight;
            
            // Default material (blue) - but starts invisible
            const mat = new BABYLON.StandardMaterial(highlight.name + 'Mat', this.scene);
            mat.diffuseColor = new BABYLON.Color3(0.2, 0.7, 1);
            mat.alpha = 0.3;
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            highlight.material = mat;
            highlight.defaultMaterial = mat;
            
            // Hover material (yellow)
            const hoverMat = mat.clone(highlight.name + 'HoverMat');
            hoverMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
            hoverMat.alpha = 0.6;
            highlight.hoverMaterial = hoverMat;
            
            // Routed material (green)
            const routedMat = mat.clone(highlight.name + 'RoutedMat');
            routedMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
            routedMat.alpha = 0.5;
            highlight.routedMaterial = routedMat;
        });
    }
    
    /**
     * Handle mouse movement for edge highlighting
     */
    handleMouseMove(pointerInfo) {
        if (!this.isActive) return;
        
        const pickResult = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => this.edgeHighlights.includes(mesh)
        );
        
        // Reset previous hover
        if (this.hoveredEdge) {
            const prevHighlight = this.hoveredEdge.highlight;
            if (!this.routedEdges.has(this.hoveredEdge.edgeType)) {
                prevHighlight.isVisible = false;  // Hide when not hovering
            } else {
                // Also hide routed edges when not hovering
                prevHighlight.isVisible = false;
            }
            this.hoveredEdge = null;
        }
        
        // Set new hover
        if (pickResult.hit && pickResult.pickedMesh) {
            const clickZone = pickResult.pickedMesh;
            const highlight = clickZone.highlight;
            
            if (!this.routedEdges.has(clickZone.edgeType)) {
                // Show hover highlight for unrouted edges
                highlight.material = highlight.hoverMaterial;
                highlight.isVisible = true;
                this.hoveredEdge = clickZone;
                this.canvas.style.cursor = 'pointer';
            } else {
                // Don't show anything for routed edges
                this.canvas.style.cursor = 'default';
            }
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle edge click to route
     */
    handleEdgeClick(pointerInfo) {
        if (!this.isActive || !this.routerBit) return;
        
        const pickResult = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => this.edgeHighlights.includes(mesh)
        );
        
        if (pickResult.hit && pickResult.pickedMesh) {
            const clickZone = pickResult.pickedMesh;
            const highlight = clickZone.highlight;
            
            // Check if already routed
            if (this.routedEdges.has(clickZone.edgeType)) {
                console.log('Edge already routed:', clickZone.edgeType);
                return;
            }
            
            // Check if router bit is selected
            if (!this.routerBit) {
                alert('Please select a router bit first!');
                return;
            }
            
            // Route this specific edge
            this.routeSingleEdge(clickZone.edgeType);
            
            // Mark as routed
            this.routedEdges.add(clickZone.edgeType);
            
            // Hide the highlight immediately after routing
            highlight.isVisible = false;
            
            // Update UI counter
            document.getElementById('routedCount').textContent = this.routedEdges.size;
            
            console.log('Routed edge:', clickZone.edgeType);
        }
    }
    
    /**
     * Route a single edge
     */
    routeSingleEdge(edgeType) {
        console.log('Routing edge:', edgeType);
        
        // Calculate board edges from actual mesh
        const boundingInfo = this.board.getBoundingInfo();
        const boardTop = boundingInfo.boundingBox.maximumWorld.y;
        const boardRight = boundingInfo.boundingBox.maximumWorld.x;
        const boardLeft = boundingInfo.boundingBox.minimumWorld.x;
        const boardFront = boundingInfo.boundingBox.maximumWorld.z;
        const boardBack = boundingInfo.boundingBox.minimumWorld.z;
        
        // Get bit dimensions (approximate - would be better from metadata)
        const bitLength = 0.039;  // Will be scaled anyway
        
        // Position blade slightly above board top and offset outward for full coverage
        const bladeY = boardTop + 0.01;
        
        // Calculate edge lengths
        const xLength = (boardRight - boardLeft) * 1.1;  // 10% longer
        const zLength = (boardFront - boardBack) * 1.1;  // 10% longer
        
        let blade = null;
        
        switch(edgeType) {
            case 'right':
                blade = this.routerBit.clone('rightBlade');
                blade.scaling.z = zLength / bitLength;
                blade.position.set(boardRight + 0.01, bladeY, (boardFront + boardBack) / 2);
                break;
                
            case 'left':
                blade = this.routerBit.clone('leftBlade');
                blade.rotation.y = Math.PI;
                blade.scaling.z = zLength / bitLength;
                blade.position.set(boardLeft - 0.01, bladeY, (boardFront + boardBack) / 2);
                break;
                
            case 'front':
                blade = this.routerBit.clone('frontBlade');
                blade.rotation.y = -Math.PI/2;
                blade.scaling.z = xLength / bitLength;
                blade.position.set((boardRight + boardLeft) / 2, bladeY, boardFront + 0.01);
                break;
                
            case 'back':
                blade = this.routerBit.clone('backBlade');
                blade.rotation.y = Math.PI/2;
                blade.scaling.z = xLength / bitLength;
                blade.position.set((boardRight + boardLeft) / 2, bladeY, boardBack - 0.01);
                break;
        }
        
        if (blade) {
            // Make blade invisible for CSG operation
            blade.isVisible = false;
            
            // Perform CSG subtraction
            console.log('Performing CSG subtraction for', edgeType, 'edge');
            let boardCSG = BABYLON.CSG.FromMesh(this.board);
            const bladeCSG = BABYLON.CSG.FromMesh(blade);
            boardCSG = boardCSG.subtract(bladeCSG);
            
            // Create new mesh from CSG result
            const routedBoard = boardCSG.toMesh('routedBoard_' + edgeType, this.board.material, this.scene);
            
            // Replace board with routed version
            this.board.dispose();
            this.board = routedBoard;
            
            // Re-parent all click zones and highlights to the new board
            this.edgeClickZones.forEach(zone => {
                if (zone && !zone.isDisposed()) {
                    zone.parent = this.board;
                }
            });
            this.edgeHighlights.forEach(highlight => {
                if (highlight && !highlight.isDisposed()) {
                    highlight.parent = this.board;
                }
            });
            
            // Dispose of blade
            blade.dispose();
            
            // Update edge highlights positions since board may have changed
            this.updateEdgeHighlights();
            
            console.log('Edge routed successfully:', edgeType);
        }
    }
    
    /**
     * Update edge highlight positions after routing
     */
    updateEdgeHighlights() {
        const boundingInfo = this.board.getBoundingInfo();
        const boardTop = boundingInfo.boundingBox.maximumWorld.y;
        const boardRight = boundingInfo.boundingBox.maximumWorld.x;
        const boardLeft = boundingInfo.boundingBox.minimumWorld.x;
        const boardFront = boundingInfo.boundingBox.maximumWorld.z;
        const boardBack = boundingInfo.boundingBox.minimumWorld.z;
        
        const edgeHeight = 0.1;
        
        this.edgeHighlights.forEach(edge => {
            switch(edge.edgeType) {
                case 'right':
                    edge.position.set(boardRight, boardTop + edgeHeight/2, (boardFront + boardBack) / 2);
                    break;
                case 'left':
                    edge.position.set(boardLeft, boardTop + edgeHeight/2, (boardFront + boardBack) / 2);
                    break;
                case 'front':
                    edge.position.set((boardRight + boardLeft) / 2, boardTop + edgeHeight/2, boardFront);
                    break;
                case 'back':
                    edge.position.set((boardRight + boardLeft) / 2, boardTop + edgeHeight/2, boardBack);
                    break;
            }
        });
    }
    
    /**
     * Load available router bits from shapes folder
     */
    async loadAvailableBits() {
        try {
            // Hardcoded list - will be updated dynamically
            this.availableBits = ["Chamfer 1 Inch.stl", "Chamfer 3 Quarter Inch.stl", "Chamfer Half Inch.stl", "Chamfer Quarter Inch.stl", "Colonial Scroll.stl", "Round Over - Half Inch.stl", "Round Over - Quarter Inch.stl"];
            
            // Populate dropdown
            const select = document.getElementById('routerBitSelect');
            select.innerHTML = '<option value="">-- Select a bit --</option>';
            
            this.availableBits.forEach(filename => {
                const option = document.createElement('option');
                option.value = filename;
                // Remove .stl and format name
                option.textContent = filename.replace('.stl', '').replace(/_/g, ' ');
                select.appendChild(option);
            });
            
            // Add change handler
            select.onchange = (e) => this.loadRouterBit(e.target.value);
            
        } catch (error) {
            console.error('Error loading router bits:', error);
        }
    }
    
    /**
     * Load selected router bit
     */
    loadRouterBit(filename) {
        if (!filename) return;
        
        console.log('Loading router bit:', filename);
        
        BABYLON.SceneLoader.LoadAssetContainer(
            '/shapes/',
            filename,
            this.scene,
            (container) => {
                // Dispose previous bit if exists
                if (this.routerBit) {
                    this.routerBit.dispose();
                }
                
                // Store the loaded bit
                this.routerBit = container.meshes[0];
                container.addAllToScene();
                this.routerBit.isVisible = false;
                
                this.selectedBitName = filename;
                console.log('Router bit loaded successfully:', filename);
            },
            null,
            (scene, message) => {
                console.error('Failed to load router bit:', message);
                alert('Error loading router bit: ' + message);
            }
        );
    }
    
    /**
     * Flip board 90 degrees in specified direction
     */
    flipBoard(axis, direction) {
        const rotation = Math.PI / 2 * direction;
        
        switch(axis) {
            case 'x':
                this.board.rotate(BABYLON.Axis.X, rotation, BABYLON.Space.WORLD);
                break;
            case 'y':
                this.board.rotate(BABYLON.Axis.Y, rotation, BABYLON.Space.WORLD);
                break;
            case 'z':
                this.board.rotate(BABYLON.Axis.Z, rotation, BABYLON.Space.WORLD);
                break;
        }
        
        // Update camera target to new board center
        const boundingInfo = this.board.getBoundingInfo();
        this.camera.target = boundingInfo.boundingBox.centerWorld;
        
        // Clear routed edges tracking for new orientation
        this.routedEdges.clear();
        document.getElementById('routedCount').textContent = '0';
        
        // Reset edge highlights
        this.clearEdgeHighlights();
        this.createEdgeHighlights();
    }
    
    /**
     * Clear edge highlights
     */
    clearEdgeHighlights() {
        this.edgeHighlights.forEach(edge => edge.dispose());
        this.edgeHighlights = [];
        this.hoveredEdge = null;
    }
    
    /**
     * Accept changes and return to main view
     */
    accept() {
        // Apply the routed mesh back to the original part
        this.originalBoard.mesh.dispose();
        this.originalBoard.mesh = this.board.clone();
        this.originalBoard.mesh.isVisible = true;
        
        this.cleanup();
    }
    
    /**
     * Cancel and return without changes
     */
    cancel() {
        // Just restore original visibility
        this.originalBoard.mesh.isVisible = true;
        this.cleanup();
    }
    
    /**
     * Cleanup router table mode
     */
    cleanup() {
        // Clear edge highlights
        this.clearEdgeHighlights();
        
        // Dispose of working board if different from original
        if (this.board && this.board !== this.originalBoard.mesh) {
            this.board.dispose();
        }
        
        // Restore main camera
        if (this.mainCamera) {
            this.scene.activeCamera = this.mainCamera;
        }
        
        // Dispose router camera
        if (this.camera) {
            this.camera.dispose();
        }
        
        // Hide UI
        this.hideUI();
        
        // Remove event handlers
        // Remove only our pointer observer, not all of them!
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        // Reset state
        this.isActive = false;
        this.board = null;
        this.originalBoard = null;
        this.routerBit = null;
        this.routedEdges.clear();
    }
    
    /**
     * Show UI
     */
    showUI() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'block';
        }
    }
    
    /**
     * Hide UI  
     */
    hideUI() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
        }
    }
}

// Make available globally
window.RouterTable = RouterTable;

// Auto-initialize if scene exists
if (window.scene && window.canvas) {
    window.routerTable = new RouterTable(window.scene, window.canvas);
}

console.log('RouterTable v2 module loaded - Click edges to route!');
