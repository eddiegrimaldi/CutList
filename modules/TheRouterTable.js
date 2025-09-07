class TheRouterTable {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.isActive = false;
        this.routerContainer = null;
        this.routerCanvas = null;
        this.routerEngine = null;
        this.routerScene = null;
        this.routerCamera = null;
        this.currentBoard = null;
        this.currentPartId = null;
        this.originalMesh = null;
        this.selectedEdge = null;
        this.routerBit = 'roundover';
        this.bitDepth = 0.25;
        this.highlightedEdges = [];
        this.init();
    }
    
    init() {
        console.log('TheRouterTable initialized');
    }
    
    setupRouterScene() {
        console.log('Setting up router scene...');
        
        if (!this.routerCanvas) {
            console.error('Router canvas not found!');
            return;
        }
        
        // Make sure canvas has size
        if (this.routerCanvas.width === 0 || this.routerCanvas.height === 0) {
            this.routerCanvas.width = this.routerCanvas.offsetWidth || 800;
            this.routerCanvas.height = this.routerCanvas.offsetHeight || 600;
        }
        
        // Create engine
        this.routerEngine = new BABYLON.Engine(this.routerCanvas, true);
        
        // Create scene
        this.routerScene = new BABYLON.Scene(this.routerEngine);
        this.routerScene.clearColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        
        // Create camera
        this.routerCamera = new BABYLON.ArcRotateCamera(
            'routerCamera',
            Math.PI / 4,
            Math.PI / 3,
            100,
            BABYLON.Vector3.Zero(),
            this.routerScene
        );
        
        this.routerCamera.lowerRadiusLimit = 20;
        this.routerCamera.upperRadiusLimit = 300;
        this.routerCamera.wheelPrecision = 15;
        this.routerCamera.attachControl(this.routerCanvas, true);
        
        // Fix mouse controls: middle button (1) for pan, right button (2) for rotate
        this.routerCamera.inputs.attached.pointers.buttons = [2, 0, 1]; // right=rotate, left=none, middle=pan
        
        // Add light
        const light = new BABYLON.HemisphericLight('light1', 
            new BABYLON.Vector3(0, 1, 0), this.routerScene);
        light.intensity = 0.9;
        
        console.log('Router scene ready');
    }
    
    openRouterTable(boardMesh, operation = 'route') {
        console.log('Opening router table with board:', boardMesh?.name);
        
        // Hide the board in workbench
        if (boardMesh && boardMesh.isVisible !== undefined) {
            boardMesh.isVisible = false;
        }
        
        // Create container if it doesn't exist
        if (!this.routerContainer) {
            this.routerContainer = document.createElement('div');
            this.routerContainer.id = 'routerTableContainer';
            this.routerContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #f0f0f0;
                z-index: 1000;
                display: none;
                flex-direction: column;
            `;
            
            // Add header
            const header = document.createElement('div');
            header.style.cssText = `
                background: #333;
                color: white;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            header.innerHTML = `
                <h2>Router Table</h2>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <select id="routerBitSelect" onchange="window.drawingWorld.theRouterTable.selectBit(this.value)" style="
                        padding: 5px;
                        background: white;
                        border: 1px solid #ccc;
                    ">
                        <option value="roundover">Roundover</option>
                        <option value="chamfer">Chamfer</option>
                        <option value="ogee">Ogee</option>
                        <option value="cove">Cove</option>
                    </select>
                    
                    <label style="color: white;">
                        Depth:
                        <input type="range" id="bitDepth" min="0.1" max="0.5" step="0.05" value="0.25" 
                               onchange="window.drawingWorld.theRouterTable.setBitDepth(this.value)"
                               style="width: 100px;">
                        <span id="depthValue">0.25"</span>
                    </label>
                    
                    <button onclick="window.drawingWorld.theRouterTable.routeSelectedEdge()" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 5px 15px;
                        cursor: pointer;
                    ">Route Edge</button>
                    
                    <button onclick="window.drawingWorld.theRouterTable.keepRoutedBoard()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 5px 15px;
                        cursor: pointer;
                    ">KEEP</button>
                    
                    <button onclick="window.drawingWorld.theRouterTable.closeRouterTable()" style="
                        background: #555;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        cursor: pointer;
                    ">Close</button>
                </div>
            `;
            
            // Canvas container
            const canvasContainer = document.createElement('div');
            canvasContainer.style.cssText = `
                flex: 1;
                position: relative;
            `;
            
            // Create canvas
            this.routerCanvas = document.createElement('canvas');
            this.routerCanvas.id = 'routerCanvas';
            this.routerCanvas.style.cssText = `
                width: 100%;
                height: 100%;
                display: block;
            `;
            
            canvasContainer.appendChild(this.routerCanvas);
            this.routerContainer.appendChild(header);
            this.routerContainer.appendChild(canvasContainer);
            document.body.appendChild(this.routerContainer);
        }
        
        // Show router
        this.routerContainer.style.display = 'flex';
        
        // Setup scene
        this.setupRouterScene();
        
        // Transfer the actual board
        if (boardMesh && boardMesh.name) {
            console.log('Transferring board to router:', boardMesh.name);
            console.log('Board vertices:', boardMesh.getTotalVertices());
            
            // Use CSG to preserve exact geometry
            let boardCSG;
            if (boardMesh.getCSG) {
                boardCSG = boardMesh.getCSG();
                console.log('Got existing CSG');
            } else {
                boardCSG = BABYLON.CSG.FromMesh(boardMesh);
                console.log('Created new CSG from mesh');
            }
            
            // Create mesh in router scene
            this.currentBoard = boardCSG.toMesh('routerBoard', null, this.routerScene);
            
            // Copy material
            if (boardMesh.material) {
                const mat = new BABYLON.StandardMaterial('routerBoardMat', this.routerScene);
                
                // Copy color
                if (boardMesh.material.diffuseColor) {
                    mat.diffuseColor = boardMesh.material.diffuseColor.clone();
                } else {
                    mat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1); // Default wood color
                }
                
                // Copy texture if exists
                if (boardMesh.material.diffuseTexture) {
                    try {
                        const texUrl = boardMesh.material.diffuseTexture.url || 
                                      boardMesh.material.diffuseTexture._texture?.url;
                        if (texUrl) {
                            mat.diffuseTexture = new BABYLON.Texture(texUrl, this.routerScene);
                        }
                    } catch (e) {
                        console.log('Could not copy texture:', e);
                    }
                }
                
                mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                this.currentBoard.material = mat;
            } else {
                // Default material if none exists
                const mat = new BABYLON.StandardMaterial('routerBoardMat', this.routerScene);
                mat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1);
                this.currentBoard.material = mat;
            }
            
            // Position at origin
            this.currentBoard.position = BABYLON.Vector3.Zero();
            this.currentBoard.rotation = BABYLON.Vector3.Zero();
            
            console.log('Board transferred successfully');
            console.log('Router board vertices:', this.currentBoard.getTotalVertices());
            
            // Store reference to original
            this.originalMesh = boardMesh;
            
            // Setup edge selection
            this.setupEdgeSelection();
            
        } else {
            console.log('No board mesh provided, creating test board');
            // Fallback to test board
            const box = BABYLON.MeshBuilder.CreateBox('board', {
                width: 48,
                height: 2,
                depth: 8
            }, this.routerScene);
            
            box.position = BABYLON.Vector3.Zero();
            
            const mat = new BABYLON.StandardMaterial('boardMat', this.routerScene);
            mat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1);
            box.material = mat;
            
            this.currentBoard = box;
        }
        
        // Set camera
        this.routerCamera.radius = 100;
        this.routerCamera.setTarget(BABYLON.Vector3.Zero());
        
        // Start render loop
        if (this.routerEngine) {
            this.routerEngine.runRenderLoop(() => {
                this.routerScene.render();
            });
            this.routerEngine.resize();
        }
        
        console.log('Router table opened');
    }
    
    closeRouterTable() {
        console.log('Closing router table...');
        
        if (this.routerContainer) {
            this.routerContainer.style.display = 'none';
        }
        
        if (this.routerEngine) {
            this.routerEngine.stopRenderLoop();
        }
        
        this.currentBoard = null;
    }
selectBit(bitType) {
        this.routerBit = bitType;
        console.log('Selected router bit:', bitType);
    }
    
    setBitDepth(depth) {
        this.bitDepth = parseFloat(depth);
        document.getElementById('depthValue').textContent = depth + '"';
        console.log('Set bit depth:', this.bitDepth);
    }
    
    setupEdgeSelection() {
        if (!this.currentBoard) return;
        
        console.log('Setting up edge selection...');
        
        // Create edge highlight meshes for the 4 top edges
        const bounds = this.currentBoard.getBoundingInfo().boundingBox;
        const size = bounds.maximumWorld.subtract(bounds.minimumWorld);
        
        // Top edges (assuming board is flat on XZ plane)
        const edgeThickness = 0.5;
        const edgeColor = new BABYLON.Color3(1, 1, 0); // Yellow for highlighting
        
        // Create edge highlight boxes
        const edges = [
            { name: 'front', width: size.x, height: edgeThickness, depth: edgeThickness, 
              position: new BABYLON.Vector3(0, size.y/2, size.z/2) },
            { name: 'back', width: size.x, height: edgeThickness, depth: edgeThickness,
              position: new BABYLON.Vector3(0, size.y/2, -size.z/2) },
            { name: 'left', width: edgeThickness, height: edgeThickness, depth: size.z,
              position: new BABYLON.Vector3(-size.x/2, size.y/2, 0) },
            { name: 'right', width: edgeThickness, height: edgeThickness, depth: size.z,
              position: new BABYLON.Vector3(size.x/2, size.y/2, 0) }
        ];
        
        edges.forEach(edge => {
            const highlight = BABYLON.MeshBuilder.CreateBox(edge.name + '_highlight', {
                width: edge.width,
                height: edge.height,
                depth: edge.depth
            }, this.routerScene);
            
            highlight.position = edge.position;
            highlight.isVisible = false;
            highlight.isPickable = true;
            highlight.metadata = { edgeName: edge.name }
            
            const mat = new BABYLON.StandardMaterial(edge.name + '_mat', this.routerScene);
            mat.diffuseColor = edgeColor;
            mat.emissiveColor = edgeColor.scale(0.5);
            highlight.material = mat;
            
            this.highlightedEdges.push(highlight);
        });
        
        // Set up click handler
        this.routerScene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK) {
                const pickedMesh = pointerInfo.pickInfo.pickedMesh;
                
                if (pickedMesh && pickedMesh.metadata?.edgeName) {
                    // Hide all edge highlights
                    this.highlightedEdges.forEach(e => e.isVisible = false);
                    
                    // Show selected edge
                    pickedMesh.isVisible = true;
                    this.selectedEdge = pickedMesh.metadata.edgeName;
                    console.log('Selected edge:', this.selectedEdge);
                } else if (pickedMesh === this.currentBoard) {
                    // Clicking on board shows all edges
                    this.highlightedEdges.forEach(e => e.isVisible = true);
                    setTimeout(() => {
                        this.highlightedEdges.forEach(e => e.isVisible = false);
                    }, 2000);
                }
            }
        });
        
        console.log('Edge selection ready - click on board to see edges');
    }
    
    routeSelectedEdge() {
        if (!this.selectedEdge || !this.currentBoard) {
            alert('Please select an edge first by clicking on the board');
            return;
        }
        
        console.log('Routing edge:', this.selectedEdge, 'with bit:', this.routerBit, 'depth:', this.bitDepth);
        
        // Get the current board as CSG
        const boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
        
        // Create router bit profile based on selection
        let routerPath;
        const depth = this.bitDepth;
        
        // Create the cutting profile based on bit type
        switch(this.routerBit) {
            case 'roundover':
                // Quarter circle profile
                routerPath = [];
                for (let i = 0; i <= 8; i++) {
                    const angle = (Math.PI / 2) * (i / 8);
                    routerPath.push(new BABYLON.Vector3(
                        Math.cos(angle) * depth,
                        Math.sin(angle) * depth,
                        0
                    ));
                }
                break;
                
            case 'chamfer':
                // 45 degree angle
                routerPath = [
                    new BABYLON.Vector3(0, 0, 0),
                    new BABYLON.Vector3(depth, depth, 0)
                ];
                break;
                
            case 'ogee':
                // S-curve profile
                routerPath = [];
                for (let i = 0; i <= 8; i++) {
                    const t = i / 8;
                    const x = depth * t;
                    const y = depth * (Math.sin(t * Math.PI) * 0.5 + t * 0.5);
                    routerPath.push(new BABYLON.Vector3(x, y, 0));
                }
                break;
                
            case 'cove':
                // Concave quarter circle
                routerPath = [];
                for (let i = 0; i <= 8; i++) {
                    const angle = (Math.PI / 2) * (1 - i / 8);
                    routerPath.push(new BABYLON.Vector3(
                        depth - Math.cos(angle) * depth,
                        Math.sin(angle) * depth,
                        0
                    ));
                }
                break;
        }
        
        // Get board dimensions
        const bounds = this.currentBoard.getBoundingInfo().boundingBox;
        const size = bounds.maximumWorld.subtract(bounds.minimumWorld);
        
        // Create cutting geometry based on selected edge
        let cutterMesh;
        
        if (this.selectedEdge === 'front' || this.selectedEdge === 'back') {
            // Extrude along X axis
            const shape = routerPath;
            cutterMesh = BABYLON.MeshBuilder.ExtrudeShape('cutter', {
                shape: shape,
                path: [
                    new BABYLON.Vector3(-size.x/2 - 1, 0, 0),
                    new BABYLON.Vector3(size.x/2 + 1, 0, 0)
                ],
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.routerScene);
            
            // Position for front or back edge
            const zPos = this.selectedEdge === 'front' ? size.z/2 : -size.z/2;
            cutterMesh.position = new BABYLON.Vector3(0, size.y/2 - depth/2, zPos);
            
        } else {
            // Left or right edge - extrude along Z axis
            const shape = routerPath;
            cutterMesh = BABYLON.MeshBuilder.ExtrudeShape('cutter', {
                shape: shape,
                path: [
                    new BABYLON.Vector3(0, 0, -size.z/2 - 1),
                    new BABYLON.Vector3(0, 0, size.z/2 + 1)
                ],
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.routerScene);
            
            // Position for left or right edge
            const xPos = this.selectedEdge === 'right' ? size.x/2 : -size.x/2;
            cutterMesh.position = new BABYLON.Vector3(xPos, size.y/2 - depth/2, 0);
            
            // Rotate for side edges
            cutterMesh.rotation.y = this.selectedEdge === 'right' ? -Math.PI/2 : Math.PI/2;
        }
        
        // Perform CSG subtraction
        const cutterCSG = BABYLON.CSG.FromMesh(cutterMesh);
        const resultCSG = boardCSG.subtract(cutterCSG);
        
        // Dispose of old board mesh
        this.currentBoard.dispose();
        
        // Create new routed board
        this.currentBoard = resultCSG.toMesh('routedBoard', null, this.routerScene);
        
        // Reapply material
        if (this.originalMesh && this.originalMesh.material) {
            const mat = new BABYLON.StandardMaterial('routedMat', this.routerScene);
            mat.diffuseColor = this.originalMesh.material.diffuseColor ? 
                              this.originalMesh.material.diffuseColor.clone() :
                              new BABYLON.Color3(0.6, 0.3, 0.1);
            this.currentBoard.material = mat;
        }
        
        // Clean up
        cutterMesh.dispose();
        this.highlightedEdges.forEach(e => e.dispose());
        this.highlightedEdges = [];
        this.selectedEdge = null;
        
        // Recreate edge selection for the new board
        this.setupEdgeSelection();
        
        console.log('Edge routed successfully!');
    }
    
    keepRoutedBoard() {
        if (!this.currentBoard) return;
        
        console.log('Keeping routed board...');
        
        // Transfer back to workbench
        const boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
        const routedMesh = boardCSG.toMesh('routed_' + Date.now(), null, this.drawingWorld.scene);
        
        // Position in workbench
        if (this.originalMesh) {
            routedMesh.position = this.originalMesh.position.clone();
            routedMesh.rotation = this.originalMesh.rotation.clone();
            
            // Hide original
            this.originalMesh.isVisible = false;
            
            // Copy material
            if (this.originalMesh.material) {
                routedMesh.material = this.originalMesh.material.clone();
            }
        }
        
        // Make it pickable and add to workbench
        routedMesh.isPickable = true;
        routedMesh.isWorkBenchPart = true;
        
        // Close router
        this.closeRouterTable();
        
        console.log('Routed board returned to workbench');
    }
}

export { TheRouterTable };
