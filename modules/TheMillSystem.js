// The Mill System - A 2D workspace for cutting operations
// Simulates real workshop tools in an orthographic view

class TheMillSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.engine = drawingWorld.engine;
        this.canvas = drawingWorld.canvas;
        
        // Mill state
        this.isActive = false;
        this.currentMaterial = null;
        this.currentOperation = null; // 'cut', 'route', 'drill'
        
        // UI elements
        this.millUI = null;
        this.millCanvas = null;
        this.millScene = null;
        this.millCamera = null;
        
        // Cutting elements
        this.cuttingLine = null;
        this.kerfWidth = 0.125 * 2.54; // 1/8 inch kerf in cm
        this.cutDirection = null; // 'horizontal' or 'vertical'
        
        // Mouse tracking
        this.isDrawingCut = false;
        this.cutStartPoint = null;
        this.cutEndPoint = null;
    }
    
    // Open The Mill with a selected material
    openMill(material, operation = 'cut') {
        if (!material) {
            console.error('No material provided to The Mill');
            return;
        }
        
        console.log('Opening The Mill with material:', material.name);
        
        this.currentMaterial = material;
        this.currentOperation = operation;
        this.isActive = true;
        
        // Hide main 3D view
        this.drawingWorld.canvas.style.display = 'none';
        
        // Create mill interface
        this.createMillInterface();
        
        // Setup 2D scene with material
        this.setupMillScene();
        
        // Add event listeners
        this.setupEventListeners();
    }
    
    // Create the mill UI interface
    createMillInterface() {
        // Create container
        this.millUI = document.createElement('div');
        this.millUI.id = 'the-mill-interface';
        this.millUI.style.position = 'fixed';
        this.millUI.style.top = '0';
        this.millUI.style.left = '0';
        this.millUI.style.width = '100%';
        this.millUI.style.height = '100%';
        this.millUI.style.background = '#f5f5f5';
        this.millUI.style.zIndex = '10000';
        
        // Create header
        const header = document.createElement('div');
        header.style.position = 'absolute';
        header.style.top = '0';
        header.style.left = '0';
        header.style.right = '0';
        header.style.height = '60px';
        header.style.background = '#2c3e50';
        header.style.color = 'white';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.padding = '0 20px';
        header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'The Mill - ' + this.getOperationName();
        title.style.margin = '0';
        title.style.flex = '1';
        header.appendChild(title);
        
        // Tool selector
        const toolSelector = document.createElement('select');
        toolSelector.style.marginRight = '20px';
        toolSelector.style.padding = '8px 12px';
        toolSelector.style.background = 'white';
        toolSelector.style.border = 'none';
        toolSelector.style.borderRadius = '4px';
        toolSelector.style.cursor = 'pointer';
        
        const cutOption = document.createElement('option');
        cutOption.value = 'cut';
        cutOption.textContent = 'Table Saw';
        toolSelector.appendChild(cutOption);
        
        const routeOption = document.createElement('option');
        routeOption.value = 'route';
        routeOption.textContent = 'Router';
        toolSelector.appendChild(routeOption);
        
        const drillOption = document.createElement('option');
        drillOption.value = 'drill';
        drillOption.textContent = 'Drill Press';
        toolSelector.appendChild(drillOption);
        
        toolSelector.value = this.currentOperation;
        toolSelector.addEventListener('change', (e) => {
            this.currentOperation = e.target.value;
            title.textContent = 'The Mill - ' + this.getOperationName();
        });
        header.appendChild(toolSelector);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Exit Mill';
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.background = '#e74c3c';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.addEventListener('click', () => this.closeMill());
        header.appendChild(closeBtn);
        
        this.millUI.appendChild(header);
        
        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.style.position = 'absolute';
        canvasContainer.style.top = '60px';
        canvasContainer.style.left = '0';
        canvasContainer.style.right = '0';
        canvasContainer.style.bottom = '100px';
        canvasContainer.style.background = 'white';
        canvasContainer.style.margin = '20px';
        canvasContainer.style.borderRadius = '8px';
        canvasContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        canvasContainer.style.overflow = 'hidden';
        
        // Create canvas
        this.millCanvas = document.createElement('canvas');
        this.millCanvas.id = 'mill-canvas';
        this.millCanvas.style.width = '100%';
        this.millCanvas.style.height = '100%';
        this.millCanvas.style.display = 'block';
        canvasContainer.appendChild(this.millCanvas);
        this.millUI.appendChild(canvasContainer);
        
        // Create bottom toolbar
        const toolbar = document.createElement('div');
        toolbar.style.position = 'absolute';
        toolbar.style.bottom = '0';
        toolbar.style.left = '0';
        toolbar.style.right = '0';
        toolbar.style.height = '80px';
        toolbar.style.background = 'white';
        toolbar.style.borderTop = '1px solid #ddd';
        toolbar.style.display = 'flex';
        toolbar.style.alignItems = 'center';
        toolbar.style.padding = '0 20px';
        toolbar.style.gap = '20px';
        
        // Add instructions
        const instructions = document.createElement('div');
        instructions.style.flex = '1';
        instructions.style.color = '#666';
        const kerfInInches = (this.kerfWidth / 2.54).toFixed(3);
        instructions.innerHTML = '<strong>Instructions:</strong> Click and drag to draw a cutting line. The material will be split along this line with a ' + kerfInInches + ' inch kerf.';
        toolbar.appendChild(instructions);
        
        // Add execute button
        const executeBtn = document.createElement('button');
        executeBtn.textContent = 'Execute Cut';
        executeBtn.style.padding = '12px 24px';
        executeBtn.style.background = '#27ae60';
        executeBtn.style.color = 'white';
        executeBtn.style.border = 'none';
        executeBtn.style.borderRadius = '4px';
        executeBtn.style.cursor = 'pointer';
        executeBtn.style.fontWeight = 'bold';
        executeBtn.style.fontSize = '16px';
        executeBtn.addEventListener('click', () => this.executeCut());
        toolbar.appendChild(executeBtn);
        
        this.millUI.appendChild(toolbar);
        
        // Add to document
        document.body.appendChild(this.millUI);
    }
    
    // Setup the 2D Babylon scene
    setupMillScene() {
        // Create new engine for mill canvas
        const millEngine = new BABYLON.Engine(this.millCanvas, true);
        
        // Create scene
        this.millScene = new BABYLON.Scene(millEngine);
        this.millScene.clearColor = new BABYLON.Color3(0.98, 0.98, 0.98);
        
        // Create orthographic camera
        this.millCamera = new BABYLON.UniversalCamera('millCamera', 
            new BABYLON.Vector3(0, 100, 0), this.millScene);
        this.millCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.millCamera.setTarget(BABYLON.Vector3.Zero());
        
        // Set orthographic size based on material
        const bounds = this.currentMaterial.getBoundingInfo().boundingBox;
        const width = bounds.maximum.x - bounds.minimum.x;
        const depth = bounds.maximum.z - bounds.minimum.z;
        const maxDim = Math.max(width, depth) * 1.2; // Add 20% padding
        
        this.millCamera.orthoLeft = -maxDim / 2;
        this.millCamera.orthoRight = maxDim / 2;
        this.millCamera.orthoTop = maxDim / 2;
        this.millCamera.orthoBottom = -maxDim / 2;
        
        // Create light
        const light = new BABYLON.HemisphericLight('millLight', 
            new BABYLON.Vector3(0, 1, 0), this.millScene);
        light.intensity = 1.2;
        
        // Clone material to mill scene
        const materialClone = this.currentMaterial.clone('millMaterial');
        materialClone.parent = null;
        materialClone.position = BABYLON.Vector3.Zero();
        materialClone.rotation = BABYLON.Vector3.Zero();
        
        // Ensure it's viewed from top
        materialClone.rotation.y = 0;
        
        // Add grid for reference
        this.createGrid();
        
        // Setup cutting line
        this.setupCuttingLine();
        
        // Start render loop
        millEngine.runRenderLoop(() => {
            this.millScene.render();
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            millEngine.resize();
        });
    }
    
    // Create reference grid
    createGrid() {
        const gridSize = 200; // 200cm grid
        const gridStep = 10; // 10cm steps
        const gridLines = [];
        
        for (let i = -gridSize/2; i <= gridSize/2; i += gridStep) {
            // Vertical lines
            gridLines.push([
                new BABYLON.Vector3(i, 0, -gridSize/2),
                new BABYLON.Vector3(i, 0, gridSize/2)
            ]);
            
            // Horizontal lines
            gridLines.push([
                new BABYLON.Vector3(-gridSize/2, 0, i),
                new BABYLON.Vector3(gridSize/2, 0, i)
            ]);
        }
        
        const gridMesh = BABYLON.MeshBuilder.CreateLineSystem('grid', {
            lines: gridLines
        }, this.millScene);
        
        gridMesh.color = new BABYLON.Color3(0.9, 0.9, 0.9);
        gridMesh.position.y = -0.1; // Slightly below material
    }
    
    // Setup cutting line visualization
    setupCuttingLine() {
        // Create cutting line mesh (initially hidden)
        this.cuttingLine = BABYLON.MeshBuilder.CreateLines('cuttingLine', {
            points: [BABYLON.Vector3.Zero(), BABYLON.Vector3.Zero()],
            updatable: true
        }, this.millScene);
        
        this.cuttingLine.color = new BABYLON.Color3(1, 0, 0);
        this.cuttingLine.isVisible = false;
    }
    
    // Setup event listeners for cutting
    setupEventListeners() {
        this.millCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.millCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.millCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    
    // Mouse down - start drawing cut line
    onMouseDown(e) {
        const pickResult = this.millScene.pick(e.clientX, e.clientY);
        
        if (pickResult.hit && pickResult.pickedMesh.name === 'millMaterial') {
            this.isDrawingCut = true;
            this.cutStartPoint = pickResult.pickedPoint.clone();
            this.cutStartPoint.y = 0; // Keep on XZ plane
            
            // Show cutting line
            this.cuttingLine.isVisible = true;
        }
    }
    
    // Mouse move - update cut line
    onMouseMove(e) {
        if (!this.isDrawingCut) return;
        
        const pickResult = this.millScene.pick(e.clientX, e.clientY);
        
        if (pickResult.hit) {
            this.cutEndPoint = pickResult.pickedPoint.clone();
            this.cutEndPoint.y = 0; // Keep on XZ plane
            
            // Update cutting line
            this.cuttingLine = BABYLON.MeshBuilder.CreateLines('cuttingLine', {
                points: [this.cutStartPoint, this.cutEndPoint],
                instance: this.cuttingLine
            }, this.millScene);
            
            this.cuttingLine.color = new BABYLON.Color3(1, 0, 0);
        }
    }
    
    // Mouse up - finish drawing cut line
    onMouseUp(e) {
        if (!this.isDrawingCut) return;
        
        this.isDrawingCut = false;
        
        // Determine cut direction
        if (this.cutStartPoint && this.cutEndPoint) {
            const deltaX = Math.abs(this.cutEndPoint.x - this.cutStartPoint.x);
            const deltaZ = Math.abs(this.cutEndPoint.z - this.cutStartPoint.z);
            
            if (deltaX > deltaZ) {
                this.cutDirection = 'horizontal';
            } else {
                this.cutDirection = 'vertical';
            }
            
            console.log('Cut line drawn:', this.cutDirection);
        }
    }
    
    // Execute the cut
    executeCut() {
        if (!this.cutStartPoint || !this.cutEndPoint) {
            alert('Please draw a cutting line first');
            return;
        }
        
        console.log('Executing cut in The Mill');
        
        // Calculate cut position (middle of the line)
        const cutPosition = BABYLON.Vector3.Center(this.cutStartPoint, this.cutEndPoint);
        
        // Return to 3D view with cut information
        const cutData = {
            position: cutPosition,
            direction: this.cutDirection,
            kerf: this.kerfWidth
        };
        
        // Close mill and execute cut in main scene
        this.closeMill(cutData);
    }
    
    // Get operation display name
    getOperationName() {
        switch(this.currentOperation) {
            case 'cut': return 'Table Saw';
            case 'route': return 'Router';
            case 'drill': return 'Drill Press';
            default: return 'Unknown Tool';
        }
    }
    
    // Close The Mill
    closeMill(cutData = null) {
        console.log('Closing The Mill');
        
        // Clean up mill scene
        if (this.millScene) {
            this.millScene.dispose();
        }
        
        // Remove UI
        if (this.millUI) {
            this.millUI.remove();
        }
        
        // Show main canvas again
        this.drawingWorld.canvas.style.display = 'block';
        
        // Reset state
        this.isActive = false;
        this.currentMaterial = null;
        this.currentOperation = null;
        
        // If we have cut data, execute the cut in the main scene
        if (cutData) {
            // This would trigger the actual cut in the main scene
            // For now, we'll just log it
            console.log('Would execute cut with data:', cutData);
            
            // TODO: Call back to main scene to execute the cut
            // this.drawingWorld.executeCutFromMill(this.currentMaterial, cutData);
        }
    }
}

// Export for use in drawing-world.js
export { TheMillSystem };
