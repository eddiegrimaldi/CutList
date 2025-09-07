// The Router Table System - Edge profiling workspace
// Handles roundovers, chamfers, and other edge treatments

export class TheRouterTable {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.isActive = false;
        this.routerScene = null;
        this.routerEngine = null;
        this.routerCanvas = null;
        this.routerCamera = null;
        this.routerUI = null;
        
        // Current state
        this.currentBoard = null;
        this.selectedEdge = null;
        this.currentBit = 'roundover_1_4'; // Default bit
        this.bitDepth = 0.25; // inches
        
        // Available router bits
        this.routerBits = {
            'roundover_1_4': { name: '1/4" Roundover', radius: 0.25 },
            'roundover_1_2': { name: '1/2" Roundover', radius: 0.5 },
            'roundover_3_4': { name: '3/4" Roundover', radius: 0.75 },
            'chamfer_45': { name: '45° Chamfer', angle: 45 },
            'ogee': { name: 'Ogee', type: 'complex' },
            'cove': { name: 'Cove', radius: 0.5 },
            'rabbet': { name: 'Rabbet', width: 0.5, depth: 0.25 }
        };
        
        // Track what we've done
        this.routedEdges = [];
        this.hasRoutedEdge = false;
        
        console.log('🪵 Router Table System initialized');
    }
    
    openRouterTable(mesh, operation = 'route') {
        console.log('openRouterTable called');
        
        if (!mesh) {
            console.error('No mesh provided to Router Table');
            return;
        }
        
        console.log('Opening Router Table with mesh:', mesh.name);
        console.log('Mesh details:', {
            name: mesh.name,
            hasGeometry: !!mesh.geometry,
            hasMaterial: !!mesh.material,
            position: mesh.position
        });
        
        this.currentMaterial = mesh;
        this.originalMesh = mesh;
        console.log('Stored currentMaterial:', this.currentMaterial);
        console.log('Mesh properties:', {
            name: mesh.name,
            isVisible: mesh.isVisible,
            isEnabled: mesh.isEnabled(),
            vertices: mesh.getTotalVertices()
        });
        this.currentOperation = operation;
        this.isActive = true;
        this.hasRoutedEdge = false;
        
        // Hide main 3D view
        this.drawingWorld.canvas.style.display = 'none';
        
        // Create router interface
        this.createRouterInterface();
        
        // Setup router scene
        this.setupRouterScene();
    }

    setupRouterScene() {
        console.log('Setting up simplified router scene...');
        
        if (!this.routerCanvas) {
            console.error('Router canvas not found!');
            return;
        }
        
        // Create engine
        this.routerEngine = new BABYLON.Engine(this.routerCanvas, true);
        
        // Create scene
        this.routerScene = new BABYLON.Scene(this.routerEngine);
        this.routerScene.clearColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        
        // Create ArcRotateCamera for ViewCube-style control
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
        
        // Simple lighting
        const light = new BABYLON.HemisphericLight('light1', 
            new BABYLON.Vector3(0, 1, 0), this.routerScene);
        light.intensity = 0.9;
        
        // Create board from source mesh
        if (this.currentMaterial) {
            console.log('Creating ACTUAL board from:', this.currentMaterial.name);
            console.log('Source vertices:', this.currentMaterial.getTotalVertices());
            
            try {
                // Method 1: Try CSG first for exact geometry preservation
                const csg = BABYLON.CSG.FromMesh(this.currentMaterial);
                this.currentBoard = csg.toMesh('routerBoard', null, this.routerScene);
                console.log('CSG successful - board created with vertices:', this.currentBoard.getTotalVertices());
            } catch (csgError) {
                console.warn('CSG failed, trying serialization:', csgError);
                
                try {
                    // Method 2: Serialize and recreate
                    const serialized = BABYLON.SceneSerializer.SerializeMesh(this.currentMaterial, false, false);
                    
                    // Create new mesh in router scene from serialized data
                    this.currentBoard = BABYLON.Mesh.Parse(serialized, this.routerScene, '');
                    console.log('Serialization successful - board created');
                } catch (serError) {
                    console.warn('Serialization failed, using direct clone:', serError);
                    
                    // Method 3: Direct clone with manual scene transfer
                    this.currentBoard = this.currentMaterial.clone('routerBoard', null, false, true);
                    
                    // Force transfer to router scene
                    if (this.currentBoard._scene !== this.routerScene) {
                        this.currentBoard._scene = this.routerScene;
                        this.routerScene.addMesh(this.currentBoard);
                    }
                    console.log('Clone successful - board created');
                }
            }
            
            // Apply material
            const mat = new BABYLON.StandardMaterial('routerMat', this.routerScene);
            
            // Copy material properties from source
            if (this.currentMaterial.material) {
                // Copy diffuse color
                if (this.currentMaterial.material.diffuseColor) {
                    mat.diffuseColor = this.currentMaterial.material.diffuseColor.clone();
                } else {
                    mat.diffuseColor = new BABYLON.Color3(0.7, 0.5, 0.3);
                }
                
                // Try to copy texture
                if (this.currentMaterial.material.diffuseTexture) {
                    try {
                        const textureUrl = this.currentMaterial.material.diffuseTexture.url || 
                                          this.currentMaterial.material.diffuseTexture._texture?.url ||
                                          'data/materials/walnut_001/walnut_001_texture.jpg';
                        console.log('Loading texture from:', textureUrl);
                        mat.diffuseTexture = new BABYLON.Texture(textureUrl, this.routerScene);
                    } catch (e) {
                        console.warn('Could not load texture:', e);
                    }
                }
            } else {
                mat.diffuseColor = new BABYLON.Color3(0.7, 0.5, 0.3);
            }
            
            mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            mat.backFaceCulling = false;
            this.currentBoard.material = mat;
            
            // Position at origin
            this.currentBoard.position = BABYLON.Vector3.Zero();
            this.currentBoard.rotation = new BABYLON.Vector3(0, 0, 0);
            this.currentBoard.scaling = new BABYLON.Vector3(1, 1, 1);
            this.currentBoard.isVisible = true;
            this.currentBoard.isPickable = true;
            
            // Force update
            this.currentBoard.computeWorldMatrix(true);
            this.currentBoard.refreshBoundingInfo();
            
            // Auto-frame camera
            const bounds = this.currentBoard.getBoundingInfo();
            if (bounds && this.routerCamera) {
                const size = bounds.boundingBox.extendSize;
                const maxDim = Math.max(size.x, size.y, size.z);
                this.routerCamera.radius = maxDim * 2.5;
                this.routerCamera.setTarget(BABYLON.Vector3.Zero());
                console.log('Camera framed to board size:', maxDim);
            }
            
            console.log('ACTUAL board ready! Vertices:', this.currentBoard.getTotalVertices());
        }
        
        // Start render loop
        this.routerEngine.runRenderLoop(() => {
            this.routerScene.render();
        });
        
        console.log('Router scene ready');
    }

    
    createRouterInterface() {
        // Create container for router UI
        this.routerUI = document.createElement('div');
        this.routerUI.id = 'router-interface';
        this.routerUI.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f5f5f5;
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;
        
        // Create header with title and controls
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #8B4513 0%, #654321 100%);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        const title = document.createElement('h2');
        title.textContent = '🪵 Router Table';
        title.style.margin = '0';
        title.style.fontFamily = 'Arial, sans-serif';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Exit Router';
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.addEventListener('click', () => this.closeRouterTable());
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create main content area
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            display: flex;
            position: relative;
        `;
        
        // Create left panel for router controls
        const controlPanel = document.createElement('div');
        controlPanel.style.cssText = `
            width: 300px;
            background: white;
            padding: 20px;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            overflow-y: auto;
        `;
        
        // Router bit selection
        const bitSection = document.createElement('div');
        bitSection.innerHTML = `
            <h3 style="margin-top: 0;">Router Bit</h3>
            <select id="router-bit-select" style="width: 100%; padding: 8px; margin-bottom: 15px;">
                ${Object.entries(this.routerBits).map(([key, bit]) => 
                    `<option value="${key}">${bit.name}</option>`
                ).join('')}
            </select>
            
            <h3>Bit Depth</h3>
            <input type="range" id="bit-depth" min="0" max="100" value="50" style="width: 100%;">
            <div id="depth-display" style="text-align: center; margin-top: 5px;">0.25"</div>
            
            <h3 style="margin-top: 20px;">Instructions</h3>
            <ol style="font-size: 14px; line-height: 1.6;">
                <li>Select a router bit</li>
                <li>Click on an edge to route</li>
                <li>Right-click for options</li>
                <li>Click "Apply & Keep" when done</li>
            </ol>
        `;
        controlPanel.appendChild(bitSection);
        
        // Canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = `
            flex: 1;
            position: relative;
        `;
        
        // Create canvas for router scene
        this.routerCanvas = document.createElement('canvas');
        this.routerCanvas.id = 'routerCanvas';
        this.routerCanvas.style.cssText = `
            width: 100%;
            height: 100%;
            display: block;
        `;
        canvasContainer.appendChild(this.routerCanvas);
        
        // Edge highlight overlay
        const edgeInfo = document.createElement('div');
        edgeInfo.id = 'edge-info';
        edgeInfo.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            display: none;
        `;
        canvasContainer.appendChild(edgeInfo);
        
        // Assemble UI
        content.appendChild(controlPanel);
        content.appendChild(canvasContainer);
        
        this.routerUI.appendChild(header);
        this.routerUI.appendChild(content);
        
        document.body.appendChild(this.routerUI);
    }
    
    
    setupEventListeners() {
        // Router bit selection
        const bitSelect = document.getElementById('router-bit-select');
        if (bitSelect) {
            bitSelect.addEventListener('change', (e) => {
                this.currentBit = e.target.value;
                console.log('Selected router bit:', this.currentBit);
            });
        }
        
        // Depth control
        const depthSlider = document.getElementById('bit-depth');
        const depthDisplay = document.getElementById('depth-display');
        if (depthSlider) {
            depthSlider.addEventListener('input', (e) => {
                this.bitDepth = (e.target.value / 100) * 0.5; // 0 to 0.5 inches
                depthDisplay.textContent = this.bitDepth.toFixed(3) + '"';
            });
        }
        
        // Edge selection
        this.routerScene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERPICK:
                    if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh === this.currentBoard) {
                        this.selectEdge(pointerInfo.pickInfo);
                    }
                    break;
                    
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 2) { // Right click
                        this.showContextMenu(pointerInfo.event);
                    }
                    break;
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            if (this.routerEngine) {
                this.routerEngine.resize();
            }
        });
    }
    
    selectEdge(pickInfo) {
        // This is simplified - in reality we'd need edge detection
        console.log('Edge selected at:', pickInfo.pickedPoint);
        
        // Highlight the edge
        const edgeInfo = document.getElementById('edge-info');
        if (edgeInfo) {
            edgeInfo.style.display = 'block';
            edgeInfo.innerHTML = `
                <strong>Selected Edge</strong><br>
                Bit: ${this.routerBits[this.currentBit].name}<br>
                Depth: ${this.bitDepth.toFixed(3)}"<br>
                <button onclick="window.currentRouterTable.applyRoute()">Apply Route</button>
            `;
        }
        
        this.selectedEdge = pickInfo.pickedPoint;
        
        // Store reference for button click
        window.currentRouterTable = this;
    }
    
    applyRoute() {
        if (!this.selectedEdge || !this.currentBoard) {
            console.warn('No edge selected');
            return;
        }
        
        console.log('Applying router profile:', this.currentBit, 'at depth:', this.bitDepth);
        
        // This is where we'd use CSG to modify the edge
        // For now, just track it
        this.routedEdges.push({
            edge: this.selectedEdge,
            bit: this.currentBit,
            depth: this.bitDepth,
            timestamp: Date.now()
        });
        
        this.hasRoutedEdge = true;
        
        // Visual feedback
        const edgeInfo = document.getElementById('edge-info');
        if (edgeInfo) {
            edgeInfo.innerHTML += '<br><span style="color: #4CAF50;">✓ Route Applied</span>';
        }
    }
    
    showContextMenu(event) {
        event.preventDefault();
        
        // Remove existing menu
        const existingMenu = document.getElementById('router-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'router-context-menu';
        menu.style.cssText = `
            position: absolute;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 5px 0;
            box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
            z-index: 10001;
        `;
        
        const menuItems = [
            { text: 'Apply & Keep', action: () => this.keepRoutedPiece() },
            { text: 'Send to Mill', action: () => this.sendToMill() },
            { text: 'Send to Workbench', action: () => this.sendToWorkbench() },
            { text: 'Reset Edges', action: () => this.resetEdges() }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.cssText = `
                padding: 8px 20px;
                cursor: pointer;
                hover: background: #f0f0f0;
            `;
            menuItem.onmouseover = () => menuItem.style.background = '#f0f0f0';
            menuItem.onmouseout = () => menuItem.style.background = 'white';
            menuItem.onclick = () => {
                item.action();
                menu.remove();
            };
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Remove menu on click outside
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 100);
    }
    
    keepRoutedPiece() {
        if (!this.currentBoard) return;
        
        console.log('Keeping routed piece with', this.routedEdges.length, 'routed edges');
        
        // Use CSG to get exact geometry
        const csg = BABYLON.CSG.FromMesh(this.currentBoard);
        const routedMesh = csg.toMesh('routed_' + Date.now(), null, this.drawingWorld.scene);
        
        // Position on workbench
        routedMesh.position = new BABYLON.Vector3(0, 0, 0);
        routedMesh.rotation = new BABYLON.Vector3(0, 0, 0);
        
        // Apply material
        if (this.currentBoard.material) {
            const mat = this.currentBoard.material.clone('routedMat');
            mat._scene = this.drawingWorld.scene;
            if (mat.diffuseTexture) {
                const texUrl = mat.diffuseTexture.url || mat.diffuseTexture._texture.url;
                if (texUrl) {
                    mat.diffuseTexture = new BABYLON.Texture(texUrl, this.drawingWorld.scene);
                }
            }
            routedMesh.material = mat;
        }
        
        // Add to workbench
        routedMesh.isWorkBenchPart = true;
        if (this.drawingWorld.workBenchParts) {
            this.drawingWorld.workBenchParts.push(routedMesh);
        }
        
        // Hide original
        if (this.originalMesh) {
            this.originalMesh.isVisible = false;
        }
        
        console.log('Routed piece sent to workbench');
        
        // Close router table
        this.closeRouterTable();
    }
    
    sendToMill() {
        console.log('Sending routed piece to mill...');
        // Would send current board with routed edges to mill
        // Location would change to 'mill'
    }
    
    sendToWorkbench() {
        console.log('Sending to workbench...');
        // Similar to keep but doesn't close router
    }
    
    resetEdges() {
        console.log('Resetting all routed edges');
        this.routedEdges = [];
        this.hasRoutedEdge = false;
        
        // Would restore original geometry
    }
    
    closeRouterTable() {
        console.log('Closing Router Table');
        
        // Clean up scene
        if (this.routerScene) {
            this.routerScene.dispose();
        }
        
        if (this.routerEngine) {
            this.routerEngine.dispose();
        }
        
        // Remove UI
        if (this.routerUI) {
            this.routerUI.remove();
        }
        
        // Show main canvas
        this.drawingWorld.canvas.style.display = 'block';
        
        // Reset state
        this.isActive = false;
        this.currentBoard = null;
        this.selectedEdge = null;
        this.routedEdges = [];
        
        // Remove global reference
        if (window.currentRouterTable === this) {
            delete window.currentRouterTable;
        }
    }
}

