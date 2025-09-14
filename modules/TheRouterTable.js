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
        this.routerBit = 'ogee';
        this.bitDepth = 0.25;
        this.highlightedEdges = [];
        this.routerCutters = []; // Store all cutters to show what was removed
        this.init();
    }
    
    init() {
        // Load router bit library
        if (window.RouterBitLibrary) {
            this.routerBitLibrary = window.RouterBitLibrary;
            console.log('RouterBitLibrary loaded with', Object.keys(this.routerBitLibrary.bits).length, 'bits');
        } else {
            console.error('RouterBitLibrary not found - make sure it is loaded');
        }
        
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
        
        this.routerCamera.lowerRadiusLimit = 50;   // Don't allow too close
        this.routerCamera.upperRadiusLimit = 600;  // Allow farther out
        this.routerCamera.wheelPrecision = 15;
        this.routerCamera.minZ = 0.1;
        this.routerCamera.maxZ = 10000;
        this.routerCamera.attachControl(this.routerCanvas, true);
        
        // Fix mouse controls: middle button (1) for pan, right button (2) for rotate
        this.routerCamera.inputs.attached.pointers.buttons = [2, 0, 1]; // right=rotate, left=none, middle=pan
        
        // Add light
        const light = new BABYLON.HemisphericLight('light1', 
            new BABYLON.Vector3(0, 1, 0), this.routerScene);
        light.intensity = 0.9;
        
        // Add ViewCube like in workbench
        this.createViewCube();
        
        console.log('Router scene ready with ViewCube');
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
                    <div style="display: flex; gap: 5px;">
                        <button onclick="window.drawingWorld.theRouterTable.selectBit('roundover_quarter_inch_precise')" 
                                title="1/4 inch Roundover"
                                style="width: 40px; height: 40px; padding: 2px; border: 2px solid #666; background: white; cursor: pointer; border-radius: 4px;">
                            <img src="/router-bits/Roundover - Quarter Inch.png" style="width: 100%; height: 100%; transform: rotate(-90deg);" alt="1/4 Roundover" />
                        </button>
                        <button onclick="window.drawingWorld.theRouterTable.selectBit('roundover_half_inch_precise')" 
                                title="1/2 inch Roundover"
                                style="width: 40px; height: 40px; padding: 2px; border: 2px solid #666; background: white; cursor: pointer; border-radius: 4px;">
                            <img src="/router-bits/Roundover - Half Inch.png" style="width: 100%; height: 100%; transform: rotate(-90deg);" alt="1/2 Roundover" />
                        </button>
                        <button onclick="window.drawingWorld.theRouterTable.selectBit('chamfer_quarter_inch_precise')" 
                                title="1/4 inch Chamfer"
                                style="width: 40px; height: 40px; padding: 2px; border: 2px solid #666; background: white; cursor: pointer; border-radius: 4px;">
                            <img src="/router-bits/Chamfer - Quarter Inch.png" style="width: 100%; height: 100%; transform: rotate(-90deg);" alt="1/4 Chamfer" />
                        </button>
                        <button onclick="window.drawingWorld.theRouterTable.selectBit('chamfer_half_inch_precise')" 
                                title="1/2 inch Chamfer"
                                style="width: 40px; height: 40px; padding: 2px; border: 2px solid #666; background: white; cursor: pointer; border-radius: 4px;">
                            <img src="/router-bits/Chamfer - Half Inch.png" style="width: 100%; height: 100%; transform: rotate(-90deg);" alt="1/2 Chamfer" />
                        </button>
                    </div>
                    <span id="selectedBitDisplay" style="color: white; font-weight: bold;"></span>
                    
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
                    " onclick="window.drawingWorld.theRouterTable.routeSelectedEdge()">Route Edge</button>
                    
                    <button onclick="window.drawingWorld.theRouterTable.keepRoutedBoard()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 5px 15px;
                        cursor: pointer;
                    ">KEEP</button>
                    
                    <button onclick="window.drawingWorld.theRouterTable.toggleOrtho()" style="
                        background: #9b59b6;
                        color: white;
                        border: none;
                        padding: 5px 15px;
                        cursor: pointer;
                    ">Ortho View</button>
                    
                    <button onclick="window.drawingWorld.theRouterTable.closeRouterTable()" style="
                        background: #555;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        cursor: pointer;
                    ">Close</button>
                
                    
                    <div style="display: flex; gap: 10px; align-items: center; border-left: 1px solid #666; padding-left: 20px;">
                        <label style="color: white; font-size: 12px;">Custom Bit:</label>
                        <input type="file" id="customBitFile" accept=".stl,.obj" style="
                            max-width: 150px;
                            font-size: 12px;
                        ">
                        <button onclick="window.drawingWorld.theRouterTable.uploadCustomBit()" style="
                            padding: 5px 10px;
                            background: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                        ">Upload</button>
                    </div></div>
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
        
        // Add keyboard listener for blade toggle
        this.routerScene.actionManager = new BABYLON.ActionManager(this.routerScene);
        this.routerScene.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnKeyDownTrigger,
                (evt) => {
                    // H key toggles blade visibility
                    if (evt.sourceEvent.key === 'h' || evt.sourceEvent.key === 'H') {
                        this.toggleBladeVisibility();
                    }
                    // C key clears all blades
                    if (evt.sourceEvent.key === 'c' || evt.sourceEvent.key === 'C') {
                        this.clearAllBlades();
                    }
                }
            )
        );
        
        // Display help text
        const helpDiv = document.createElement('div');
        helpDiv.style.position = 'absolute';
        helpDiv.style.bottom = '10px';
        helpDiv.style.left = '10px';
        helpDiv.style.color = '#666';
        helpDiv.style.fontFamily = 'Arial, sans-serif';
        helpDiv.style.fontSize = '12px';
        helpDiv.style.zIndex = '1000';
        helpDiv.innerHTML = 'Press H to toggle blade visibility | Press C to clear all blades';
        helpDiv.id = 'router-help-text';
        
        // Append to the router container which we know exists
        if (this.routerContainer) {
            // Remove old help text if exists
            const oldHelp = document.getElementById('router-help-text');
            if (oldHelp) {
                oldHelp.remove();
            }
            this.routerContainer.appendChild(helpDiv);
        }
        
                // Start render loop
        if (this.routerEngine) {
            this.routerEngine.runRenderLoop(() => {
                this.routerScene.render();
            });
            this.routerEngine.resize();
        }
        
        console.log('Router table opened');
    }

    selectBit(bitName) {
        console.log('Selecting router bit:', bitName);
        console.log('routerBitLibrary exists?', !!this.routerBitLibrary);
        console.log('routerBitLibrary.bits exists?', !!(this.routerBitLibrary && this.routerBitLibrary.bits));
        console.log('Bit in library?', !!(this.routerBitLibrary && this.routerBitLibrary.bits && this.routerBitLibrary.bits[bitName]));
        console.log('Available bits:', this.routerBitLibrary ? Object.keys(this.routerBitLibrary.bits) : 'No library');
        
        // Load from RouterBitLibrary if available
        if (this.routerBitLibrary && this.routerBitLibrary.bits[bitName]) {
            this.selectedBit = this.routerBitLibrary.bits[bitName];
            this.routerBit = bitName;
            console.log('Loaded custom bit:', this.selectedBit);
            
            // Update UI feedback
            const display = document.getElementById('selectedBitDisplay');
            if (display) {
                display.textContent = this.selectedBit.name;
            }
            return true;
        }
        
        // Fallback to standard bits
        this.routerBit = bitName;
        this.selectedBit = null;
        return false;
    }

 
    
    toggleBladeVisibility() {
        // Toggle visibility of all router cutters
        if (this.routerCutters && this.routerCutters.length > 0) {
            this.routerCutters.forEach(cutter => {
                if (cutter && !cutter.isDisposed()) {
                    cutter.isVisible = !cutter.isVisible;
                }
            });
            
            const state = this.routerCutters[0]?.isVisible ? 'visible' : 'hidden';
            console.log(`Router blades are now ${state}`);
        } else {
            console.log('No router blades to toggle');
        }
    }
    
    clearAllBlades() {
        // Dispose all router cutters
        if (this.routerCutters && this.routerCutters.length > 0) {
            this.routerCutters.forEach(cutter => {
                if (cutter && !cutter.isDisposed()) {
                    cutter.dispose();
                }
            });
            this.routerCutters = [];
            console.log('All router blades cleared');
        } else {
            console.log('No router blades to clear');
        }
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
    
    setBitDepth(depth) {
        this.bitDepth = parseFloat(depth);
        document.getElementById('depthValue').textContent = depth + '"';
        console.log('Set bit depth:', this.bitDepth);
    }
    
    createViewCube() {
        console.log('Creating ViewCube for router...');
        
        // Create ViewCube container
        const viewCubeContainer = document.createElement('div');
        viewCubeContainer.id = 'routerViewCube';
        viewCubeContainer.style.cssText = `
            position: absolute;
            top: 70px;
            right: 20px;
            width: 120px;
            height: 120px;
            z-index: 100;
        `;
        
        // Create ViewCube canvas
        const viewCubeCanvas = document.createElement('canvas');
        viewCubeCanvas.width = 120;
        viewCubeCanvas.height = 120;
        viewCubeCanvas.style.cssText = `
            width: 100%;
            height: 100%;
            cursor: pointer;
        `;
        viewCubeContainer.appendChild(viewCubeCanvas);
        
        // Add to router container
        if (this.routerContainer) {
            this.routerContainer.appendChild(viewCubeContainer);
        }
        
        // Create ViewCube scene
        const vcEngine = new BABYLON.Engine(viewCubeCanvas, true);
        const vcScene = new BABYLON.Scene(vcEngine);
        vcScene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
        
        // Create ViewCube camera
        const vcCamera = new BABYLON.ArcRotateCamera('vcCamera', 
            this.routerCamera.alpha, 
            this.routerCamera.beta, 
            5, 
            BABYLON.Vector3.Zero(), 
            vcScene
        );
        vcCamera.wheelPrecision = 50;
        vcCamera.panningSensibility = 0;
        
        // Create the cube
        const cube = BABYLON.MeshBuilder.CreateBox('viewCube', {size: 2}, vcScene);
        
        // Create face materials with labels
        const faceTextures = [];
        const faceLabels = ['FRONT', 'BACK', 'TOP', 'BOTTOM', 'RIGHT', 'LEFT'];
        const faceColors = [
            new BABYLON.Color3(0.8, 0.8, 0.9),
            new BABYLON.Color3(0.8, 0.8, 0.9),
            new BABYLON.Color3(0.9, 0.9, 1),
            new BABYLON.Color3(0.7, 0.7, 0.8),
            new BABYLON.Color3(0.85, 0.85, 0.95),
            new BABYLON.Color3(0.85, 0.85, 0.95)
        ];
        
        // Create multi-material
        const multiMat = new BABYLON.MultiMaterial('viewCubeMat', vcScene);
        
        for (let i = 0; i < 6; i++) {
            const mat = new BABYLON.StandardMaterial(`face${i}`, vcScene);
            mat.diffuseColor = faceColors[i];
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.emissiveColor = faceColors[i].scale(0.3);
            multiMat.subMaterials.push(mat);
        }
        
        cube.material = multiMat;
        cube.subMeshes = [];
        
        const verticesCount = cube.getTotalVertices();
        cube.subMeshes.push(new BABYLON.SubMesh(0, 0, verticesCount, 0, 6, cube));
        cube.subMeshes.push(new BABYLON.SubMesh(1, 0, verticesCount, 6, 6, cube));
        cube.subMeshes.push(new BABYLON.SubMesh(2, 0, verticesCount, 12, 6, cube));
        cube.subMeshes.push(new BABYLON.SubMesh(3, 0, verticesCount, 18, 6, cube));
        cube.subMeshes.push(new BABYLON.SubMesh(4, 0, verticesCount, 24, 6, cube));
        cube.subMeshes.push(new BABYLON.SubMesh(5, 0, verticesCount, 30, 6, cube));
        
        // Add lighting
        new BABYLON.HemisphericLight('vcLight', new BABYLON.Vector3(0, 1, 0), vcScene);
        
        // Sync ViewCube with main camera
        this.routerScene.registerBeforeRender(() => {
            if (vcCamera && this.routerCamera) {
                vcCamera.alpha = this.routerCamera.alpha;
                vcCamera.beta = this.routerCamera.beta;
            }
        });
        
        // Handle ViewCube clicks
        viewCubeCanvas.addEventListener('click', (evt) => {
            const pickResult = vcScene.pick(evt.offsetX, evt.offsetY);
            if (pickResult.hit && pickResult.pickedMesh === cube) {
                const faceId = pickResult.subMeshId;
                this.snapToFace(faceId);
            }
        });
        
        // Handle double-click for orthographic toggle
        viewCubeCanvas.addEventListener('dblclick', (evt) => {
            this.toggleOrthographic();
            evt.preventDefault();
        });
        
        // Start ViewCube render loop
        vcEngine.runRenderLoop(() => {
            vcScene.render();
        });
        
        // Store references
        this.viewCubeEngine = vcEngine;
        this.viewCubeScene = vcScene;
        this.viewCubeCamera = vcCamera;
        this.isOrthographic = false;
        
        console.log('ViewCube created');
    }
    
    snapToFace(faceId) {
        console.log('Snapping to face:', faceId);
        
        let alpha = this.routerCamera.alpha;
        let beta = this.routerCamera.beta;
        
        // Define camera positions for each face
        switch(faceId) {
            case 0: // Front
                alpha = -Math.PI / 2;
                beta = Math.PI / 2;
                break;
            case 1: // Back
                alpha = Math.PI / 2;
                beta = Math.PI / 2;
                break;
            case 2: // Top
                alpha = 0;
                beta = 0;
                break;
            case 3: // Bottom
                alpha = 0;
                beta = Math.PI;
                break;
            case 4: // Right
                alpha = 0;
                beta = Math.PI / 2;
                break;
            case 5: // Left
                alpha = Math.PI;
                beta = Math.PI / 2;
                break;
        }
        
        // Animate camera to position
        BABYLON.Animation.CreateAndStartAnimation('snapCamera', this.routerCamera, 'alpha',
            30, 15, this.routerCamera.alpha, alpha, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        BABYLON.Animation.CreateAndStartAnimation('snapCameraBeta', this.routerCamera, 'beta',
            30, 15, this.routerCamera.beta, beta, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            
        // Set orthographic mode
        this.setOrthographic(true);
    }
    
    toggleOrthographic() {
        this.isOrthographic = !this.isOrthographic;
        this.setOrthographic(this.isOrthographic);
    }
    
    setOrthographic(ortho) {
        this.isOrthographic = ortho;
        
        if (ortho) {
            // Switch to orthographic
            this.routerCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            
            const bounds = this.currentBoard ? 
                this.currentBoard.getBoundingInfo().boundingBox : 
                {maximumWorld: new BABYLON.Vector3(50, 50, 50), minimumWorld: new BABYLON.Vector3(-50, -50, -50)};
            
            const size = bounds.maximumWorld.subtract(bounds.minimumWorld);
        
            const maxDim = Math.max(size.x, size.y, size.z) * 1.5;
            
            const aspect = this.routerEngine.getRenderWidth() / this.routerEngine.getRenderHeight();
            this.routerCamera.orthoLeft = -maxDim * aspect;
            this.routerCamera.orthoRight = maxDim * aspect;
            this.routerCamera.orthoTop = maxDim;
            this.routerCamera.orthoBottom = -maxDim;
            
            console.log('Switched to orthographic mode');
        } else {
            // Switch to perspective
            this.routerCamera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
            console.log('Switched to perspective mode');
        }
    }
    
    setupEdgeSelection() {
        if (!this.currentBoard) return;
        
        console.log('Setting up edge highlighting...');
        
        // Clear old highlights
        if (this.highlightedEdges) {
            this.highlightedEdges.forEach(e => e.dispose());
        }
        this.highlightedEdges = [];
        this.selectedEdges = new Set();
        
        // Get board bounds
        this.currentBoard.computeWorldMatrix(true);
        const bounds = this.currentBoard.getBoundingInfo().boundingBox;
        const min = bounds.minimumWorld;
        const max = bounds.maximumWorld;
        
        const width = max.x - min.x;
        const height = max.y - min.y;
        const depth = max.z - min.z;
        
        // Visual edge thickness (what you see when highlighted)
        const edgeThickness = Math.min(width, height, depth) * 0.1; // 10% for visual
        // Collider thickness (invisible hit zone)
        const colliderThickness = edgeThickness * 3; // 3x bigger for easier targeting
        
        // Define all 12 edges
        const edges = [
            // Top edges (4)
            {name: 'top-front', pos: new BABYLON.Vector3(0, max.y, max.z), 
             size: new BABYLON.Vector3(width + colliderThickness, colliderThickness, colliderThickness)},
            {name: 'top-back', pos: new BABYLON.Vector3(0, max.y, min.z), 
             size: new BABYLON.Vector3(width + colliderThickness, colliderThickness, colliderThickness)},
            {name: 'top-left', pos: new BABYLON.Vector3(min.x, max.y, 0), 
             size: new BABYLON.Vector3(colliderThickness, colliderThickness, depth + colliderThickness)},
            {name: 'top-right', pos: new BABYLON.Vector3(max.x, max.y, 0), 
             size: new BABYLON.Vector3(colliderThickness, colliderThickness, depth + colliderThickness)},
            
            // Bottom edges (4)
            {name: 'bottom-front', pos: new BABYLON.Vector3(0, min.y, max.z), 
             size: new BABYLON.Vector3(width + colliderThickness, colliderThickness, colliderThickness)},
            {name: 'bottom-back', pos: new BABYLON.Vector3(0, min.y, min.z), 
             size: new BABYLON.Vector3(width + colliderThickness, colliderThickness, colliderThickness)},
            {name: 'bottom-left', pos: new BABYLON.Vector3(min.x, min.y, 0), 
             size: new BABYLON.Vector3(colliderThickness, colliderThickness, depth + colliderThickness)},
            {name: 'bottom-right', pos: new BABYLON.Vector3(max.x, min.y, 0), 
             size: new BABYLON.Vector3(colliderThickness, colliderThickness, depth + colliderThickness)},
            
            // Vertical edges (4)
            {name: 'vert-front-left', pos: new BABYLON.Vector3(min.x, 0, max.z), 
             size: new BABYLON.Vector3(colliderThickness, height + colliderThickness, colliderThickness)},
            {name: 'vert-front-right', pos: new BABYLON.Vector3(max.x, 0, max.z), 
             size: new BABYLON.Vector3(colliderThickness, height + colliderThickness, colliderThickness)},
            {name: 'vert-back-left', pos: new BABYLON.Vector3(min.x, 0, min.z), 
             size: new BABYLON.Vector3(colliderThickness, height + colliderThickness, colliderThickness)},
            {name: 'vert-back-right', pos: new BABYLON.Vector3(max.x, 0, min.z), 
             size: new BABYLON.Vector3(colliderThickness, height + colliderThickness, colliderThickness)}
        ];
        
        // Create edge meshes
        edges.forEach(edge => {
            const edgeMesh = BABYLON.MeshBuilder.CreateBox(edge.name, {
                width: edge.size.x,
                height: edge.size.y,
                depth: edge.size.z
            }, this.routerScene);
            
            edgeMesh.position = edge.pos;
            
            // Create material - starts invisible
            const mat = new BABYLON.StandardMaterial(edge.name + '_mat', this.routerScene);
            mat.diffuseColor = new BABYLON.Color3(0, 0.5, 1);
            mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.alpha = 0; // Invisible initially
            edgeMesh.material = mat;
            
            edgeMesh.isPickable = true;
            edgeMesh.isVisible = true; // Mesh exists but alpha makes it invisible
            edgeMesh.metadata = {
                edgeName: edge.name,
                isSelected: false
            };
            
            // Setup action manager
            edgeMesh.actionManager = new BABYLON.ActionManager(this.routerScene);
            
            // Hover on - show with glow
            edgeMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOverTrigger,
                    () => {
                        console.log('Hovering:', edge.name);
                        if (!edgeMesh.metadata.isSelected) {
                            mat.emissiveColor = new BABYLON.Color3(0, 0.7, 1);
                            mat.alpha = 0.8;
                        }
                    }
                )
            );
            
            // Hover out - hide unless selected
            edgeMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPointerOutTrigger,
                    () => {
                        if (!edgeMesh.metadata.isSelected) {
                            mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
                            mat.alpha = 0;
                        }
                    }
                )
            );
            
            // Click - toggle selection
            edgeMesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(
                    BABYLON.ActionManager.OnPickTrigger,
                    () => {
                        console.log('Clicked:', edge.name);
                        if (edgeMesh.metadata.isSelected) {
                            // Deselect
                            mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
                            mat.alpha = 0;
                            edgeMesh.metadata.isSelected = false;
                            this.selectedEdges.delete(edge.name);
                        } else {
                            // Select - bright neon blue glow
                            mat.emissiveColor = new BABYLON.Color3(0, 0.9, 1);
                            mat.alpha = 1;
                            edgeMesh.metadata.isSelected = true;
                            this.selectedEdges.add(edge.name);
                        }
                        this.updateEdgeDisplay();
                    }
                )
            );
            
            this.highlightedEdges.push(edgeMesh);
        });
        
        // Add instruction
        const instruction = document.getElementById('edgeInstruction') || document.createElement('div');
        instruction.id = 'edgeInstruction';
        instruction.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
        `;
        instruction.innerHTML = 'Hover near board edges to highlight them. Click to select for routing.';
        if (!instruction.parentElement) {
            this.routerContainer.appendChild(instruction);
        }
        
        console.log('Edge selection ready - 12 edges with 3x bigger hit zones');
    }
    
    updateEdgeDisplay() {
        const instruction = document.getElementById('edgeInstruction');
        if (instruction) {
            if (this.selectedEdges.size > 0) {
                instruction.innerHTML = `Selected ${this.selectedEdges.size} edge(s): ${Array.from(this.selectedEdges).join(', ')}`;
                instruction.style.background = 'rgba(0,100,200,0.9)';
            } else {
                instruction.innerHTML = 'Hover over board edges to see them glow blue. Click to select/deselect edges for routing.';
                instruction.style.background = 'rgba(0,0,0,0.8)';
            }
        }
    }
    
    toggleOrtho() {
        if (!this.routerCamera || !this.routerEngine) return;
        
        // Store current radius
        const currentRadius = this.routerCamera.radius;
        
        if (this.routerCamera.mode === BABYLON.Camera.PERSPECTIVE_CAMERA) {
            // Switch to orthographic
            this.routerCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            
            // Get canvas dimensions
            const aspect = this.routerCanvas.width / this.routerCanvas.height;
            
            // Use current radius to set ortho size (like in mill)
            const halfSize = currentRadius * 0.4; // Adjust multiplier for good framing
            
            // Set orthographic bounds
            if (aspect >= 1) {
                this.routerCamera.orthoLeft = -halfSize * aspect;
                this.routerCamera.orthoRight = halfSize * aspect;
                this.routerCamera.orthoTop = halfSize;
                this.routerCamera.orthoBottom = -halfSize;
            } else {
                this.routerCamera.orthoLeft = -halfSize;
                this.routerCamera.orthoRight = halfSize;
                this.routerCamera.orthoTop = halfSize / aspect;
                this.routerCamera.orthoBottom = -halfSize / aspect;
            }
            
            // Adjust camera limits for orthographic
            this.routerCamera.minZ = 0.1;
            this.routerCamera.maxZ = currentRadius * 10;
            
            console.log('Switched to orthographic');
            
            // Update button
            const btn = document.querySelector('button[onclick*="toggleOrtho"]');
            if (btn) btn.textContent = 'Perspective';
            
        } else {
            // Switch back to perspective
            this.routerCamera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
            
            // Reset camera limits
            this.routerCamera.minZ = 0.1;
            this.routerCamera.maxZ = 10000;
            
            console.log('Switched to perspective');
            
            // Update button
            const btn = document.querySelector('button[onclick*="toggleOrtho"]');
            if (btn) btn.textContent = 'Ortho View';
        }
    }
    
    
    routeSelectedEdge() {
        if ((!this.selectedEdge && (!this.selectedEdges || this.selectedEdges.size === 0)) || !this.currentBoard) {
            alert('Please select an edge first by clicking on the board');
            return;
        }
        
        const edgesToRoute = this.selectedEdges || new Set([this.selectedEdge]);
        console.log('Routing edges:', Array.from(edgesToRoute), 'with bit:', this.routerBit, 'depth:', this.bitDepth);
        console.log('Selected bit object:', this.selectedBit);
        
        // Get the current board as CSG BEFORE creating cutter
        let boardCSG;
        try {
            boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
        } catch (error) {
            console.error('Failed to create CSG from board:', error);
            alert('Failed to prepare board for cutting');
            return;
        }
        
        // Create router bit profile based on selection
        let routerPath;
        const depth = this.bitDepth;
        
        // Create the cutting profile based on bit type
        // The profile defines what to REMOVE from the edge
        let cutterMesh;
        
        // Get board dimensions
        const bounds = this.currentBoard.getBoundingInfo().boundingBox;
        const size = bounds.maximumWorld.subtract(bounds.minimumWorld);
        
        // Determine which edges are selected and create appropriate cutter
        
        // Get the selected edge
        let selectedEdge;
        if (this.selectedEdge) {
            selectedEdge = this.selectedEdge;
        } else if (this.selectedEdges && this.selectedEdges.size > 0) {
            selectedEdge = Array.from(this.selectedEdges)[0];
        } else {
            console.log('No edge selected');
            alert('Please select an edge to route');
            return;
        }
        
        // Check for custom bit profile
        if (this.selectedBit && this.selectedBit.profilePoints) {
            console.log('Using custom bit profile:', this.selectedBit.name);
            
            // Convert profile points to Babylon vectors
            // Parse profilePoints if it's a string (from JSON)
            let profilePointsArray = this.selectedBit.profilePoints;
            if (typeof profilePointsArray === 'string') {
                profilePointsArray = JSON.parse(profilePointsArray);
            }
            const profile = profilePointsArray.map(p => 
                new BABYLON.Vector3(p[0], -p[1], 0)
            );
            
            // Create extrusion path
            let path;
            if (selectedEdge.includes('front') || selectedEdge.includes('back')) {
                path = [
                    new BABYLON.Vector3(-size.x/2 - 10, 0, 0),
                    new BABYLON.Vector3(size.x/2 + 10, 0, 0)
                ];
            } else {
                path = [
                    new BABYLON.Vector3(0, 0, -size.z/2 - 10),
                    new BABYLON.Vector3(0, 0, size.z/2 + 10)
                ];
            }
            
            // Create a simple box cutter to test positioning
            try {
                console.log('Creating simple test cutter for edge:', selectedEdge);
                
                // All router bit images are 1 x 1
                // The actual cutting profile is defined by the black pixels in the image
                let cutterDepth = 2.54; // 1 inch converted to cm for Babylon
                let cutterHeight = 2.54; // 1 inch converted to cm for Babylon
                
                // Parse the profile points to understand the actual cutting shape
                if (this.selectedBit && this.selectedBit.profilePoints) {
                    try {
                        const points = JSON.parse(this.selectedBit.profilePoints);
                        // The profile points define the shape within the 1 x 1 space
                        // Find max X (depth into board) and max Y (height down from top)
                        let maxX = 0;
                        let maxY = 0;
                        for (const point of points) {
                            maxX = Math.max(maxX, Math.abs(point[0]));
                            maxY = Math.max(maxY, Math.abs(point[1]));
                        }
                        console.log('Profile extends to - X:', maxX, 'inches, Y:', maxY, 'inches within 1"x1" image');
                        // For now use the full 1 x 1 for the cutter box
                        // Later we'll create the actual profile shape from these points
                    } catch (e) {
                        console.error('Failed to parse profile points:', e);
                    }
                }
                
                // Create different shaped cutters based on the edge
                if (selectedEdge === 'top-front') {
                    // Cutter that runs along the entire top-front edge
                    cutterMesh = BABYLON.MeshBuilder.CreateBox('testCutter', {
                        width: size.x + 2,  // Full width of board plus overlap
                        height: cutterHeight,
                        depth: cutterDepth
                    }, this.routerScene);
                    
                    // Position so TOP REAR edge aligns with board's top-front edge
                    // Top of cutter should be at board's top surface
                    // Rear of cutter should be at board's front edge
                    cutterMesh.position = new BABYLON.Vector3(
                        0,                                    // Centered on X
                        size.y/2 - cutterHeight/2,            // Top of cutter at top of board
                        size.z/2 - cutterDepth/2              // Rear at front edge
                    );
                } else if (selectedEdge === 'top-back') {
                    cutterMesh = BABYLON.MeshBuilder.CreateBox('testCutter', {
                        width: size.x + 2,
                        height: cutterHeight,
                        depth: cutterDepth
                    }, this.routerScene);
                    
                    cutterMesh.position = new BABYLON.Vector3(
                        0,
                        size.y/2 - cutterHeight/2,  // Top of cutter at top of board
                        -size.z/2                    // At back edge, not offset
                    );
                } else if (selectedEdge === 'top-left') {
                    cutterMesh = BABYLON.MeshBuilder.CreateBox('testCutter', {
                        width: cutterDepth,
                        height: cutterHeight,
                        depth: size.z + 2
                    }, this.routerScene);
                    
                    cutterMesh.position = new BABYLON.Vector3(
                        -size.x/2 + cutterDepth/2,   // Blade center at board edge (half blade overlaps)
                        size.y/2 - cutterHeight/2,    // Top of cutter at top of board
                        0
                    );
                } else if (selectedEdge === 'top-right') {
                    cutterMesh = BABYLON.MeshBuilder.CreateBox('testCutter', {
                        width: cutterDepth,
                        height: cutterHeight,
                        depth: size.z + 2
                    }, this.routerScene);
                    
                    cutterMesh.position = new BABYLON.Vector3(
                        size.x/2,                    // Blade at right edge
                        size.y/2 - cutterHeight/2,   // Top of cutter at top of board
                        0
                    );
                }
                
                console.log('Test cutter created');
                
                console.log('Cutter positioned at:', cutterMesh.position);
                
            } catch (error) {
                console.error('Failed to create test cutter:', error);
                alert('Failed to create test cutter: ' + error.message);
                return;
            }
            
            console.log('Custom profile cutter created');
            console.log('cutterMesh defined?', cutterMesh ? 'yes' : 'no');
        }
        
        console.log('After custom profile block, cutterMesh:', cutterMesh ? cutterMesh.name : 'undefined');
        console.log("FORCE: Execution continues after line 992");
        console.log("FORCE: cutterMesh exists?", !!cutterMesh);

        // DIRECT CSG OPERATION
        console.log('ATTEMPTING DIRECT CSG OPERATION');
        
        if (cutterMesh) {
            // Set cutter material
            const cutterMat = new BABYLON.StandardMaterial('cutterMat_' + Date.now(), this.routerScene);
            cutterMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            cutterMat.alpha = 0.5;
            cutterMesh.material = cutterMat;
            cutterMesh.isVisible = true;
            
            console.log('Cutter visible in red, attempting CSG...');
            
            try {
                // Get boardCSG (should exist from openRouterTable)
                if (!this.boardCSG) {
                    console.log('Creating boardCSG...');
                    this.boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
                }
                
                console.log('Creating cutterCSG...');
                const cutterCSG = BABYLON.CSG.FromMesh(cutterMesh);
                
                console.log('Performing subtraction...');
                // Simple subtraction - board minus cutter
                const resultCSG = this.boardCSG.subtract(cutterCSG);
                
                console.log('Creating result mesh...');
                const resultMesh = resultCSG.toMesh('routed_board', this.currentBoard.material, this.routerScene);
                
                // Ensure result mesh is visible
                resultMesh.isVisible = true;
                
                // Log board dimensions for debugging
                console.log('Result mesh bounds:', resultMesh.getBoundingInfo().boundingBox);
                console.log('Result mesh visibility:', resultMesh.isVisible);
                
                // Replace board
                this.currentBoard.dispose();
                this.currentBoard = resultMesh;
                this.boardCSG = BABYLON.CSG.FromMesh(resultMesh);
                
                console.log('CSG SUCCESSFUL! Board updated with', resultMesh.getTotalVertices(), 'vertices');
                
                // Keep cutter visible for debugging
                // cutterMesh.dispose();
                console.log('Cutter kept visible at position:', cutterMesh.position);
                
                // Hide edge highlights after cutting
                if (this.highlightedEdges) {
                    this.highlightedEdges.forEach(edge => {
                        if (edge.material) {
                            edge.material.alpha = 0;
                        }
                    });
                }
                
                // Clear selected edges
                if (this.selectedEdges) {
                    this.selectedEdges.clear();
                }
                
            } catch (e) {
                console.error('CSG FAILED:', e);
                alert('CSG operation failed: ' + e.message);
            }
        } else {
            console.error('No cutterMesh to perform CSG!');
        }
        
        return; // Exit function here
        
        // Default cutter if no custom profile
        // Create default cutter if no custom profile was used
        if (!cutterMesh) {
            console.log('Creating cutter for edge:', selectedEdge);
            
    
            
            // Create a simple chamfer cutter for testing
            // Check for custom bits first
            if (this.customBits && this.customBits[this.routerBit]) {
            console.log("Using custom bit:", this.routerBit);
            cutterMesh = this.customBits[this.routerBit].clone("custom_cutter");
            cutterMesh.isVisible = true;
            
            // Scale based on depth setting
            const scaleFactor = this.bitDepth * 4;
            cutterMesh.scaling = new BABYLON.Vector3(scaleFactor, 1, scaleFactor);
            cutterMesh.bakeCurrentTransformIntoVertices();
            
            // Calculate inset from bit bounds
            const bounds = cutterMesh.getBoundingInfo();
            inset = Math.abs(bounds.boundingBox.maximum.z - bounds.boundingBox.minimum.z) / 2;
            
            } else
            if (this.routerBit === 'chamfer') {
            // Create a triangular prism to cut a 45-degree chamfer
            const chamferSize = this.bitDepth * 4; // Scale up the depth
            
            if (selectedEdge.includes('top')) {
                // For top edges, create a triangular prism
                const positions = [];
                const indices = [];
                
                // Define the triangular cross-section
                const crossSection = [
                    new BABYLON.Vector3(0, 0, 0),
                    new BABYLON.Vector3(chamferSize, 0, 0),
                    new BABYLON.Vector3(0, -chamferSize, 0)
                ];
                
                // Extrude along the edge
                let extrudeLength = selectedEdge.includes('front') || selectedEdge.includes('back') ? size.x : size.z;
                extrudeLength += 10; // Extend beyond board edges
                
                // Create the vertices for the prism
                for (let i = 0; i < 2; i++) {
                    const z = i * extrudeLength - extrudeLength/2;
                    crossSection.forEach(point => {
                        positions.push(point.x, point.y, z);
                    });
                }
                
                // Create triangular faces
                indices.push(0, 1, 2); // Front triangle
                indices.push(3, 5, 4); // Back triangle
                // Side rectangles
                indices.push(0, 3, 4, 0, 4, 1); // Bottom
                indices.push(1, 4, 5, 1, 5, 2); // Slope
                indices.push(2, 5, 3, 2, 3, 0); // Vertical
                
                // Create custom mesh
                const customMesh = new BABYLON.Mesh("chamferCutter", this.routerScene);
                const vertexData = new BABYLON.VertexData();
                vertexData.positions = positions;
                vertexData.indices = indices;
                
                // Compute normals for proper CSG
                const normals = [];
                BABYLON.VertexData.ComputeNormals(positions, indices, normals);
                vertexData.normals = normals;
                
                vertexData.applyToMesh(customMesh);
                customMesh.computeWorldMatrix(true);
                customMesh.refreshBoundingInfo();
                
                cutterMesh = customMesh;
                
                // CORNER TO CORNER - chamfer triangle must be INSIDE board
                const chamferInset = chamferSize / 2;
                if (selectedEdge === 'top-front') {
                    cutterMesh.position = new BABYLON.Vector3(0, size.y/2 - chamferInset, size.z/2 - chamferInset);
                } else if (selectedEdge === 'top-back') {
                    cutterMesh.position = new BABYLON.Vector3(0, size.y/2 - chamferInset, -size.z/2 + chamferInset);
                    cutterMesh.rotation.y = Math.PI;
                } else if (selectedEdge === 'top-left') {
                    cutterMesh.position = new BABYLON.Vector3(-size.x/2 + chamferInset, size.y/2 - chamferInset, 0);
                    cutterMesh.rotation.y = Math.PI/2;
                } else if (selectedEdge === 'top-right') {
                    cutterMesh.position = new BABYLON.Vector3(size.x/2 - chamferInset, size.y/2 - chamferInset, 0);
                    cutterMesh.rotation.y = -Math.PI/2;
                // Force update world matrix after rotation
                cutterMesh.computeWorldMatrix(true);
                }
            }
            } else if (this.routerBit && this.routerBit.includes('roundover')) {
            // Create a roundover profile using box minus cylinder
            const radius = this.bitDepth * 2; // Roundover radius
            
            // Create red semi-transparent material for the cutter
            const cutterMaterial = new BABYLON.StandardMaterial('cutterMat', this.routerScene);
            cutterMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);  // Red
            cutterMaterial.alpha = 0.5;  // Semi-transparent
            cutterMaterial.backFaceCulling = false;
            let length = selectedEdge.includes('front') || selectedEdge.includes('back') ? size.x : size.z;
            length += 20; // Extend beyond board
            
            // Create main box for the cutter
            const boxSize = radius * 2;
            
            // ALWAYS create blade extending along X axis initially
            cutterMesh = BABYLON.MeshBuilder.CreateBox('roundoverBase', {
                width: length,    // Always extend along width (X)
                height: boxSize,  // Height
                depth: boxSize    // Depth (Z)
            }, this.routerScene);
            
            console.log('Created cutter mesh with length:', length);
            
            // Create cylinder to subtract (creates the round profile)
            const cylinder = BABYLON.MeshBuilder.CreateCylinder('roundoverCyl', {
                diameter: radius * 2,
                height: length,
                tessellation: 16
            }, this.routerScene);
            
            // CRITICAL: For left/right edges, rotate BOTH meshes BEFORE CSG
            if (selectedEdge.includes('left') || selectedEdge.includes('right')) {
                console.log('Rotating blade and cylinder for left/right edge BEFORE CSG');
                
                // Rotate the box 90 degrees around Y
                cutterMesh.rotation.y = Math.PI/2;
                cutterMesh.computeWorldMatrix(true);
                
                // Position and rotate cylinder for Z-axis orientation
                cylinder.rotation.x = Math.PI/2;  // Lay cylinder horizontal along Z
                cylinder.position = new BABYLON.Vector3(-boxSize/2, -boxSize/2, 0);
                cylinder.computeWorldMatrix(true);
            } else {
                // For front/back edges, cylinder runs along X axis
                cylinder.rotation.z = Math.PI/2;  // Lay cylinder horizontal along X
                cylinder.position = new BABYLON.Vector3(0, -boxSize/2, -boxSize/2);
                cylinder.computeWorldMatrix(true);
            }
            
            // Use CSG to create the roundover cutter shape
            try {
                const boxCSG = BABYLON.CSG.FromMesh(cutterMesh);
                const cylCSG = BABYLON.CSG.FromMesh(cylinder);
                const resultCSG = boxCSG.subtract(cylCSG);
                
                // Clean up temp meshes
                cutterMesh.dispose();
                cylinder.dispose();
                
                // Create the final cutter mesh
                cutterMesh = resultCSG.toMesh('roundoverCutter', cutterMaterial, this.routerScene);
                
                // Ensure material is applied
                cutterMesh.material = cutterMaterial;
                
                // Update mesh for CSG
                cutterMesh.computeWorldMatrix(true);
                cutterMesh.refreshBoundingInfo();
            } catch (e) {
                console.error('Failed to create roundover profile, using simple box:', e);
                // Fallback to simple box if CSG fails
                cylinder.dispose();
                // cutterMesh already has the box
            }
            
            // Position based on ACTUAL world-space edge position, not hardcoded names
            const inset = boxSize / 2;
            
            // Get the actual edge position from the highlight
            let actualEdgePos = null;
            if (this.highlightedEdges && this.highlightedEdges.length > 0) {
                const edgeHighlight = this.highlightedEdges.find(h => h.name && h.name.includes(selectedEdge));
                if (edgeHighlight) {
                    actualEdgePos = edgeHighlight.getAbsolutePosition();
                    console.log('Using actual edge position:', actualEdgePos, 'for edge:', selectedEdge);
                }
            }
            
            if (!actualEdgePos) {
                // Fallback to hardcoded if no highlight found
                console.warn('No highlight found, using hardcoded position for:', selectedEdge);
                actualEdgePos = new BABYLON.Vector3(0, size.y/2, 0);
            }
            
            // Determine blade orientation based on ACTUAL position relative to board center
            const boardCenter = bounds.centerWorld;
            const edgeVector = actualEdgePos.subtract(boardCenter);
            
            // Determine which axis the edge runs along and position blade accordingly
            const absX = Math.abs(edgeVector.x);
            const absZ = Math.abs(edgeVector.z);
            
            // Get the edge highlight's actual geometry to find the edge endpoints
            let edgeDir = new BABYLON.Vector3(0, 0, 0);
            let edgeNormal = new BABYLON.Vector3(0, 0, 0);
            
            // The highlight tube shows us the edge direction
            if (this.highlightedEdges && this.highlightedEdges.length > 0) {
                const edgeHighlight = this.highlightedEdges.find(h => h.name && h.name.includes(selectedEdge));
                if (edgeHighlight && edgeHighlight.getBoundingInfo) {
                    // Get the edge endpoints from the highlight tube bounds
                    const highlightBounds = edgeHighlight.getBoundingInfo().boundingBox;
                    const highlightMin = highlightBounds.minimumWorld;
                    const highlightMax = highlightBounds.maximumWorld;
                    
                    // Determine which axis the edge runs along by checking the extent
                    const xExtent = Math.abs(highlightMax.x - highlightMin.x);
                    const zExtent = Math.abs(highlightMax.z - highlightMin.z);
                    
                    if (xExtent > zExtent) {
                        // Edge runs along X axis
                        edgeDir.x = 1;
                        // Normal points in Z direction - determine which way
                        edgeNormal.z = (actualEdgePos.z > boardCenter.z) ? 1 : -1;
                    } else {
                        // Edge runs along Z axis  
                        edgeDir.z = 1;
                        // Normal points in X direction - determine which way
                        edgeNormal.x = (actualEdgePos.x > boardCenter.x) ? 1 : -1;
                    }
                }
            }
            
            console.log('Edge direction:', edgeDir, 'Edge normal:', edgeNormal);
            
            // Position the cutter so its REAR edge aligns with the board edge
            // The blade needs to be positioned INSIDE the board
            // Since edgeNormal points AWAY from the board, we move OPPOSITE to it (negative)
            // This positions the blade's center inside the board with rear edge at the board edge
            cutterMesh.position = new BABYLON.Vector3(
                actualEdgePos.x + (-edgeNormal.x * inset),  // Move INWARD (opposite to outward normal) - PERFECT
                actualEdgePos.y - 0.5,  // Move blade DOWN so its TOP aligns with board top
                actualEdgePos.z + (-edgeNormal.z * inset)   // Move INWARD (opposite to outward normal) - PERFECT
            );
            
            // Determine rotation based on edge normal direction
            // The blade needs to face OPPOSITE to the normal (toward the board)
            if (Math.abs(edgeNormal.x) > 0.5) {
                // Edge normal points in X direction
                if (edgeNormal.x > 0) {
                    // Normal points +X, blade should face -X
                    cutterMesh.rotation.y = Math.PI/2;  // 90 degrees
                    console.log('Edge normal +X: blade faces -X (inward)');
                } else {
                    // Normal points -X, blade should face +X
                    cutterMesh.rotation.y = -Math.PI/2;  // -90 degrees
                    console.log('Edge normal -X: blade faces +X (inward)');
                }
            } else if (Math.abs(edgeNormal.z) > 0.5) {
                // Edge normal points in Z direction
                if (edgeNormal.z > 0) {
                    // Normal points +Z, blade should face -Z
                    cutterMesh.rotation.y = 0;  // No rotation
                    console.log('Edge normal +Z: blade faces -Z (inward)');
                } else {
                    // Normal points -Z, blade should face +Z
                    cutterMesh.rotation.y = Math.PI;  // 180 degrees
                    console.log('Edge normal -Z: blade faces +Z (inward)');
                }
            }
            
            cutterMesh.computeWorldMatrix(true); // Force matrix update
            console.log('Positioned cutter at:', cutterMesh.position, 'with rotation:', cutterMesh.rotation.y);
                
            
            // Force update world matrix after rotation
            cutterMesh.computeWorldMatrix(true);
            
            console.log('Ogee cutter created with profile');
            } else if (this.routerBit === 'cove') {
            // For cove, we DO want to subtract a cylinder to create a concave profile
            const radius = this.bitDepth * 4; // Reduced scale for more realistic size
            let length = selectedEdge.includes('front') || selectedEdge.includes('back') ? size.x : size.z;
            length += 10;
            
            cutterMesh = BABYLON.MeshBuilder.CreateCylinder('coveCutter', {
                diameter: radius * 2,
                height: length,
                tessellation: 32
            }, this.routerScene);
            
            // CORNER TO CORNER - for cove, position cylinder so it cuts into the corner
            // The cylinder edge should align with the board corner
            if (selectedEdge === 'top-front') {
                cutterMesh.rotation.z = Math.PI/2;
                cutterMesh.position = new BABYLON.Vector3(0, size.y/2, size.z/2);
            } else if (selectedEdge === 'top-back') {
                cutterMesh.rotation.z = Math.PI/2;
                cutterMesh.position = new BABYLON.Vector3(0, size.y/2, -size.z/2);
            } else if (selectedEdge === 'top-left') {
                cutterMesh.rotation.x = Math.PI/2;
                cutterMesh.position = new BABYLON.Vector3(-size.x/2, size.y/2, 0);
            } else if (selectedEdge === 'top-right') {
                cutterMesh.rotation.x = Math.PI/2;
                cutterMesh.position = new BABYLON.Vector3(size.x/2, size.y/2, 0);
            }
            } else {
            // Default to simple box cutter for other profiles
            const cutSize = this.bitDepth * 4;
            cutterMesh = BABYLON.MeshBuilder.CreateBox('defaultCutter', {
                width: selectedEdge.includes('front') || selectedEdge.includes('back') ? size.x + 10 : cutSize,
                height: cutSize,
                depth: selectedEdge.includes('left') || selectedEdge.includes('right') ? size.z + 10 : cutSize
            }, this.routerScene);
            
            // Position based on edge
            if (selectedEdge === 'top-front') {
                cutterMesh.position = new BABYLON.Vector3(0, size.y/2, size.z/2 + cutSize/2);
            } else if (selectedEdge === 'top-back') {
                cutterMesh.position = new BABYLON.Vector3(0, size.y/2, -size.z/2 - cutSize/2);
            } else if (selectedEdge === 'top-left') {
                cutterMesh.position = new BABYLON.Vector3(-size.x/2 - cutSize/2, size.y/2, 0);
            } else if (selectedEdge === 'top-right') {
                cutterMesh.position = new BABYLON.Vector3(size.x/2 + cutSize/2, size.y/2, 0);
            }
        }
        

        console.log('About to set cutter material, cutterMesh:', cutterMesh ? cutterMesh.name : 'UNDEFINED');
        if (!cutterMesh) {
            console.error('CRITICAL: cutterMesh is undefined before material assignment!');
            alert('No cutter mesh created - cannot perform cut');
            return;
        }
        
        const cutterMat = new BABYLON.StandardMaterial('cutterMat_' + Date.now(), this.routerScene);
        cutterMat.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        cutterMat.emissiveColor = new BABYLON.Color3(0.3, 0, 0); // Slight red glow
        cutterMat.alpha = 0.5; // Semi-transparent
        cutterMesh.material = cutterMat;
        
        } else {
            // Default fallback for any undefined bit type
            console.log('Using default cutter for bit type:', this.routerBit);
            const defaultSize = this.bitDepth * 2;
            cutterMesh = BABYLON.MeshBuilder.CreateBox('defaultCutter', {
                width: selectedEdge.includes('front') || selectedEdge.includes('back') ? size.x + 10 : defaultSize,
                height: defaultSize,
                depth: selectedEdge.includes('left') || selectedEdge.includes('right') ? size.z + 10 : defaultSize
            }, this.routerScene);
            
            // Position based on edge
            if (selectedEdge === 'top-front') {
                cutterMesh.position = new BABYLON.Vector3(0, size.y/2, size.z/2);
            } else if (selectedEdge === 'top-back') {
                cutterMesh.position = new BABYLON.Vector3(0, size.y/2, -size.z/2);
            } else if (selectedEdge === 'top-left') {
                cutterMesh.position = new BABYLON.Vector3(-size.x/2, size.y/2, 0);
            } else if (selectedEdge === 'top-right') {
                cutterMesh.position = new BABYLON.Vector3(size.x/2, size.y/2, 0);
            }
        }
        
        // Store the cutter for later reference
        this.routerCutters.push(cutterMesh);

        // AUDIT FUNCTION - Verify router bit positioning rules
        const auditRouterBitPosition = () => {
            console.log('\n=== ROUTER BIT POSITION AUDIT ===');
            console.log('\n=== ROUTER BIT POSITION AUDIT ===');
            // Get the selected edge highlight geometry to find actual edge coordinates
            let edgeHighlight = null;
            if (this.highlightedEdges && this.highlightedEdges.length > 0) {
                // Find the highlight for the selected edge
                edgeHighlight = this.highlightedEdges.find(h => h.name && h.name.includes(selectedEdge));
            }
            
            if (!edgeHighlight) {
                console.error('AUDIT FAILED: No edge highlight found for', selectedEdge);
                return false;
            }
            
            // Get the actual world-space position of the edge from the highlight
            const edgeWorldPos = edgeHighlight.getAbsolutePosition();
            const edgeDirection = new BABYLON.Vector3(0, 0, 0);
            
            // Determine edge direction based on edge name
            if (selectedEdge.includes('front') || selectedEdge.includes('back')) {
                edgeDirection.x = 1; // Edge runs along X axis
            } else if (selectedEdge.includes('left') || selectedEdge.includes('right')) {
                edgeDirection.z = 1; // Edge runs along Z axis
            }
            
            console.log('Selected Edge:', selectedEdge);
            console.log('Edge Highlight Position:', edgeWorldPos);
            console.log('Edge Direction:', edgeDirection);
            
            // Get cutter mesh bounds and position
            const cutterBounds = cutterMesh.getBoundingInfo().boundingBox;
            const cutterPos = cutterMesh.getAbsolutePosition();
            const cutterWorldMin = cutterBounds.minimumWorld;
            const cutterWorldMax = cutterBounds.maximumWorld;
            
            console.log('Cutter Position:', cutterPos);
            console.log('Cutter World Min:', cutterWorldMin);
            console.log('Cutter World Max:', cutterWorldMax);
            
            // Get board bounds for reference
            const boardBounds = this.currentBoard.getBoundingInfo().boundingBox;
            const boardMin = boardBounds.minimumWorld;
            const boardMax = boardBounds.maximumWorld;
            const boardCenter = boardMin.add(boardMax).scale(0.5);
            
            console.log('Board Center:', boardCenter);
            console.log('Board Min:', boardMin);
            console.log('Board Max:', boardMax);
            
            // RULE 1: Verify flat back face is away from the board center (orientation check)
            // The cutter should be positioned with its cutting face toward the board
            let backFaceAwayFromBoard = false;
            const tolerance = 0.5; // Allow some tolerance for positioning
            
            if (selectedEdge.includes('top')) {
                // For top edges, check that cutter is positioned correctly relative to board center
                if (selectedEdge.includes('front')) {
                    // For front edge, cutter should be at or slightly outside the edge (Z >= edge Z)
                    backFaceAwayFromBoard = cutterWorldMax.z >= edgeWorldPos.z - tolerance;
                    console.log('RULE 1 (top-front): Back face Z', cutterWorldMax.z, 'should be >= edge Z', edgeWorldPos.z, '=', backFaceAwayFromBoard);
                } else if (selectedEdge.includes('back')) {
                    // For back edge, cutter should be at or slightly outside the edge (Z <= edge Z)
                    backFaceAwayFromBoard = cutterWorldMin.z <= edgeWorldPos.z + tolerance;
                    console.log('RULE 1 (top-back): Back face Z', cutterWorldMin.z, 'should be <= edge Z', edgeWorldPos.z, '=', backFaceAwayFromBoard);
                } else if (selectedEdge.includes('left')) {
                    // For left edge, cutter should be at or slightly outside the edge (X <= edge X)
                    backFaceAwayFromBoard = cutterWorldMin.x <= edgeWorldPos.x + tolerance;
                    console.log('RULE 1 (top-left): Back face X', cutterWorldMin.x, 'should be <= edge X', edgeWorldPos.x, '=', backFaceAwayFromBoard);
                } else if (selectedEdge.includes('right')) {
                    // For right edge, cutter should be at or slightly outside the edge (X >= edge X)
                    backFaceAwayFromBoard = cutterWorldMax.x >= edgeWorldPos.x - tolerance;
                    console.log('RULE 1 (top-right): Back face X', cutterWorldMax.x, 'should be >= edge X', edgeWorldPos.x, '=', backFaceAwayFromBoard);
                }
            }
            
            // RULE 2: Verify top rear edge aligns with selected board edge
            // The top-rear edge is where the back face meets the top face
            let topRearEdgeAligned = false;
            const alignmentTolerance = 0.1; // Allow small tolerance for floating point comparison
            
            if (selectedEdge.includes('top')) {
                // Check Y alignment (top of cutter should align with top of board edge)
                const yAligned = Math.abs(cutterWorldMax.y - edgeWorldPos.y) < alignmentTolerance;
                
                // Check horizontal alignment based on edge
                let horizontalAligned = false;
                if (selectedEdge.includes('front')) {
                    horizontalAligned = Math.abs(cutterWorldMax.z - edgeWorldPos.z) < alignmentTolerance;
                    console.log('RULE 2 (top-front): Y alignment:', yAligned, 'Z alignment:', horizontalAligned);
                } else if (selectedEdge.includes('back')) {
                    horizontalAligned = Math.abs(cutterWorldMin.z - edgeWorldPos.z) < alignmentTolerance;
                    console.log('RULE 2 (top-back): Y alignment:', yAligned, 'Z alignment:', horizontalAligned);
                } else if (selectedEdge.includes('left')) {
                    horizontalAligned = Math.abs(cutterWorldMin.x - edgeWorldPos.x) < alignmentTolerance;
                    console.log('RULE 2 (top-left): Y alignment:', yAligned, 'X alignment:', horizontalAligned);
                } else if (selectedEdge.includes('right')) {
                    horizontalAligned = Math.abs(cutterWorldMax.x - edgeWorldPos.x) < alignmentTolerance;
                    console.log('RULE 2 (top-right): Y alignment:', yAligned, 'X alignment:', horizontalAligned);
                }
                
                topRearEdgeAligned = yAligned && horizontalAligned;
            }
            
            // Final audit results
            console.log('\\n=== AUDIT RESULTS ===');
            console.log('RULE 1 - Back face away from board:', backFaceAwayFromBoard ? 'PASS ✓' : 'FAIL ✗');
            console.log('RULE 2 - Top rear edge aligned:', topRearEdgeAligned ? 'PASS ✓' : 'FAIL ✗');
            
            if (!backFaceAwayFromBoard || !topRearEdgeAligned) {
                console.error('\\n⚠️ ROUTER BIT POSITIONING FAILED AUDIT ⚠️');
                console.error('The router bit is NOT correctly positioned according to the rules.');
                
                // Highlight the cutter in bright red to show the problem
                const errorMat = new BABYLON.StandardMaterial('errorMat', this.routerScene);
                errorMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
                errorMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
                errorMat.alpha = 0.8;
                cutterMesh.material = errorMat;
            } else {
                console.log('\\n✅ ROUTER BIT POSITIONING PASSED AUDIT ✅');
                console.log('The router bit is correctly positioned according to both rules.');
            }
            
            console.log('=== END AUDIT ===\\n');
            console.log('=== END AUDIT ===\\n');
            return backFaceAwayFromBoard && topRearEdgeAligned;
        };
        
        // Run the audit BEFORE hiding highlights
        auditRouterBitPosition();


        
                // Store the original material before CSG operations
        const originalMat = this.currentBoard.material;
        
        // Perform CSG subtraction with error handling
                // Hide edge highlights before cutting so we can see the result
        if (this.highlightedEdges) {
            this.highlightedEdges.forEach(e => {
                e.isVisible = false;
            });
        }
        
        console.log('Performing CSG subtraction...');
        console.log('Board bounds before:', this.currentBoard.getBoundingInfo().boundingBox);
        console.log('Cutter bounds:', cutterMesh.getBoundingInfo().boundingBox);
        
        // Ensure boardCSG exists
        if (!boardCSG) {
            console.error('boardCSG not defined - creating now');
            try {
                boardCSG = BABYLON.CSG.FromMesh(this.currentBoard);
            } catch (error) {
                console.error('Failed to create boardCSG:', error);
                alert('Failed to create CSG from board');
                return;
            }
        }
        
        let resultCSG;
        try {
            // Ensure meshes are ready for CSG
            console.log('Computing world matrices...');
            this.currentBoard.computeWorldMatrix(true);
            cutterMesh.computeWorldMatrix(true);
            console.log('World matrices computed');
            
            // Check if cutter intersects with board
            if (!this.currentBoard.intersectsMesh(cutterMesh, false)) {
                console.warn('WARNING: Cutter does not intersect with board - no cut will occur');
                alert('Cutter is not touching the board. Adjusting position...');
                
                // Try to adjust position to ensure intersection
                const boardBounds = this.currentBoard.getBoundingInfo().boundingBox;
                const cutterBounds = cutterMesh.getBoundingInfo().boundingBox;
                console.log('Board max:', boardBounds.maximumWorld);
                console.log('Cutter min:', cutterBounds.minimumWorld);
            }
            
            console.log('Creating CSG from cutter mesh...');
            let cutterCSG;
            try {
                cutterCSG = BABYLON.CSG.FromMesh(cutterMesh);
                console.log('Cutter CSG created successfully');
            } catch (e) {
                console.error('Failed to create CSG from cutter:', e);
                console.error('Cutter details:', {
                    name: cutterMesh.name,
                    vertices: cutterMesh.getTotalVertices(),
                    position: cutterMesh.position
                });
                throw e;
            }
            
            console.log('Performing subtraction...');
            try {
                // Try the subtraction
                resultCSG = boardCSG.subtract(cutterCSG);
                
                if (!resultCSG) {
                    throw new Error('CSG subtraction returned null');
                }
                
                console.log('Subtraction complete');
            } catch (e) {
                console.error('CSG subtraction failed:', e);
                console.error('Error details:', e.message, e.stack);
                
                // Try a different approach - just hide part of the board for visual feedback
                console.log('Falling back to visual-only cutting');
                
                // Keep the cutter visible to show what would be cut
                cutterMesh.material.alpha = 0.8;
                cutterMesh.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green to show success
                
                // Don't throw, just return
                alert('CSG operation failed - showing cut area in green');
                return;
            }
            
            console.log('CSG operation complete');
            
        } catch (error) {
            console.error('CSG Error:', error);
            alert('Error performing cut: ' + error.message);
            
            // Keep the cutter visible to debug
            cutterMesh.material.alpha = 0.8;
            return;
        }
        
        // Dispose of old board mesh
        this.currentBoard.dispose();
        
        // Create new routed board
        this.currentBoard = resultCSG.toMesh('routedBoard', null, this.routerScene);
        
        // Ensure new board is properly set up
        this.currentBoard.computeWorldMatrix(true);
        this.currentBoard.refreshBoundingInfo();
        
        console.log('New board created, vertices:', this.currentBoard.getTotalVertices());
        console.log('New board bounds:', this.currentBoard.getBoundingInfo().boundingBox);
        
        // Reapply the material properly
        if (originalMat) {
            // Clone the original material
            const mat = new BABYLON.StandardMaterial('routedMat_' + Date.now(), this.routerScene);
            
            // Copy all material properties
            if (originalMat.diffuseColor) {
                mat.diffuseColor = originalMat.diffuseColor.clone();
            } else {
                mat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1); // Wood color
            }
            
            // Copy texture if it exists
            if (originalMat.diffuseTexture) {
                try {
                    const texUrl = originalMat.diffuseTexture.url || originalMat.diffuseTexture._texture?.url;
                    if (texUrl) {
                        mat.diffuseTexture = new BABYLON.Texture(texUrl, this.routerScene);
                    }
                } catch (e) {
                    console.log('Could not copy texture:', e);
                }
            }
            
            // Set wood-like properties
            mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            mat.specularPower = 32;
            
            this.currentBoard.material = mat;
            console.log('Material reapplied to routed board');
        } else {
            // Fallback material if none exists
            const mat = new BABYLON.StandardMaterial('routedMat_fallback', this.routerScene);
            mat.diffuseColor = new BABYLON.Color3(0.6, 0.3, 0.1); // Wood brown
            mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            this.currentBoard.material = mat;
            console.log('Fallback material applied');
        }
        
        // Ensure the board is visible
        this.currentBoard.isVisible = true;
        this.currentBoard.position = BABYLON.Vector3.Zero();
        
        // Clean up edges but keep cutter visible
        // cutterMesh.dispose(); // DON'T dispose - keep it visible to show the cut
        
        // Don't dispose edge highlights, just hide them and clear selection
        if (this.highlightedEdges) {
            this.highlightedEdges.forEach(e => {
                e.material.alpha = 0.3;
                e.material.emissiveColor = new BABYLON.Color3(0, 0, 0);
                e.isVisible = false;
                if (e.metadata) {
                    e.metadata.isSelected = false;
                }
            });
        }
        
        this.selectedEdge = null;
        if (this.selectedEdges) {
            this.selectedEdges.clear();
        }
        
        // Recreate edge selection for the new board
        // Dispose old edges first
        if (this.highlightedEdges) {
            this.highlightedEdges.forEach(e => e.dispose());
            this.highlightedEdges = [];
        }
        this.setupEdgeSelection();
        
        // Update display to show success
        const instruction = document.getElementById('edgeInstruction');
        if (instruction) {
            instruction.innerHTML = `✓ Edge routed with ${this.routerBit} profile! Select more edges or click KEEP to save.`;
            instruction.style.background = 'rgba(0,128,0,0.9)';
            setTimeout(() => {
                instruction.innerHTML = 'Hover near board edges to highlight them. Click to select for routing.';
                instruction.style.background = 'rgba(0,0,0,0.8)';
            }, 3000);
        }
        
        console.log('Edge routed successfully - material preserved!');
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


    // Update the bit selection dropdown with custom bits  
    // Update the bit selection dropdown with custom bits
    updateBitDropdown() {

    // Handle custom bit file upload


        const select = document.getElementById('routerBitSelect');
        if (!select) return;
        
        // Remove existing custom options
        const customOptions = select.querySelectorAll('option[data-custom="true"]');
        customOptions.forEach(opt => opt.remove());
        
        // Add custom bits to dropdown
        this.customBitNames.forEach(bitName => {
            const option = document.createElement('option');
            option.value = bitName;
            option.textContent = bitName.charAt(0).toUpperCase() + bitName.slice(1) + ' (Custom)';
            option.setAttribute('data-custom', 'true');
            select.appendChild(option);
        });
    }

    uploadCustomBit() {
        console.log('uploadCustomBit called');
        const fileInput = document.getElementById('customBitFile');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Please select a file to upload');
            return;
        }
        
        const file = fileInput.files[0];
        const fileName = file.name;
        const bitName = prompt('Enter a name for this router bit:', fileName.split('.')[0]);
        
        if (!bitName) return;
        
        // Initialize storage if needed
        if (!this.customBits) this.customBits = {};
        if (!this.customBitNames) this.customBitNames = [];
        
        console.log('Loading file:', fileName, 'as', bitName);
        alert('Custom bit loading is not yet fully implemented. File selected: ' + fileName);
        
        // For now, just clear the input
        fileInput.value = '';
    }

}

export { TheRouterTable };
