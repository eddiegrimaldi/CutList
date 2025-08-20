import { ViewCube } from './ViewCube.js';

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
        
        // Turntable and laser elements
        this.turntable = null;
        this.laserLine = null;
        this.kerfWidth = 0.125 * 2.54; // 1/8 inch kerf in cm
        this.bladeAngle = 0; // Angle of the blade in radians
        
        // Turntable interaction
        this.isDraggingTurntable = false;
        this.dragStartAngle = 0;
        
        // Transform gizmos for lumber
        this.gizmoManager = null;
        
        // ViewCube for navigation
        this.viewCube = null;
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
        instructions.innerHTML = '<strong>Instructions:</strong> Right-click to enter perspective mode for manipulation. Press T to return to top view. ' +
                                'Drag turntable to rotate laser. Position lumber under laser. Kerf: ' + kerfInInches + ' inch.';
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
        
        // Create arc rotate camera for proper manipulation
        this.millCamera = new BABYLON.ArcRotateCamera('millCamera',
            -Math.PI / 2,  // Alpha
            Math.PI / 2,   // Beta - 90 degrees from vertical (looking straight down)
            100,           // Radius
            BABYLON.Vector3.Zero(),
            this.millScene
        );
        
        // Start in orthographic mode for top-down view
        this.millCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        
        // Attach camera controls
        this.millCamera.attachControl(this.millCanvas, true);
        
        // Set camera limits similar to main drawing world
        this.millCamera.lowerRadiusLimit = 10;
        this.millCamera.upperRadiusLimit = 500;
        this.millCamera.lowerBetaLimit = 0.001;  // Nearly straight down (avoid gimbal lock)
        this.millCamera.upperBetaLimit = Math.PI / 2 - 0.01;  // Not quite horizontal
        
        // Configure mouse controls
        this.millCamera.wheelPrecision = 50;
        this.millCamera.pinchPrecision = 50;
        
        // Allow switching between ortho and perspective
        this.setupCameraControls();
        
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
        
        // Clone material mesh to mill scene - create a box with same dimensions
        console.log('Creating material in Mill scene:', this.currentMaterial.name);
        
        // Get dimensions from the original mesh (already calculated above)
        const height = bounds.maximum.y - bounds.minimum.y;
        
        console.log('Material dimensions:', { width, height, depth });
        
        // Create a box in the Mill scene with the same dimensions
        const materialClone = BABYLON.MeshBuilder.CreateBox('millMaterial', {
            width: width,
            height: height,
            depth: depth,
            wrap: true  // Ensure proper UV mapping for textures
        }, this.millScene);
        
        // Position at origin, viewed from top
        materialClone.position = BABYLON.Vector3.Zero();
        materialClone.rotation = BABYLON.Vector3.Zero();
        
        // Create a material with texture for visualization
        const mat = new BABYLON.StandardMaterial('millMat', this.millScene);
        
        // Try to copy the texture from the original material
        if (this.currentMaterial.material && this.currentMaterial.material.diffuseTexture) {
            // Clone the texture to the new scene
            const originalTexture = this.currentMaterial.material.diffuseTexture;
            if (originalTexture && originalTexture.url) {
                console.log('Copying texture from original:', originalTexture.url);
                const texture = new BABYLON.Texture(originalTexture.url, this.millScene);
                
                // Copy texture properties
                texture.uScale = originalTexture.uScale || 1;
                texture.vScale = originalTexture.vScale || 1;
                texture.hasAlpha = originalTexture.hasAlpha || false;
                
                mat.diffuseTexture = texture;
            }
        }
        
        // Also try to copy the color
        if (this.currentMaterial.material && this.currentMaterial.material.diffuseColor) {
            mat.diffuseColor = this.currentMaterial.material.diffuseColor.clone();
        } else if (!mat.diffuseTexture) {
            // Only use default color if no texture was found
            mat.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
        }
        
        // Set material properties for wood-like appearance
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        mat.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        materialClone.material = mat;
        
        // Make sure it's visible and pickable
        materialClone.isVisible = true;
        materialClone.isPickable = true;
        
        console.log('Material created in Mill:', materialClone);
        
        // Add transform gizmos for the lumber
        this.setupGizmos(materialClone);
        
        // Add grid for reference
        this.createGrid();
        
        // Setup cutting line
        this.setupTurntableAndLaser();
        
        // Add ViewCube for navigation
        this.setupViewCube(millEngine);
        
        // Start render loop
        millEngine.runRenderLoop(() => {
            this.millScene.render();
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            millEngine.resize();
        });
    }
    
    // Setup camera mode switching
    setupCameraControls() {
        // Listen for right-click to switch to perspective (like main drawing world)
        this.millScene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN && 
                pointerInfo.event.button === 2) {
                // Right-click switches to perspective mode
                if (this.millCamera.mode === BABYLON.Camera.ORTHOGRAPHIC_CAMERA) {
                    this.millCamera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
                    // Enable rotation gizmo in perspective
                    if (this.gizmoManager) {
                        this.gizmoManager.rotationGizmoEnabled = true;
                    }
                    console.log('Switched to perspective mode for manipulation');
                }
            }
        });
        
        // Add keyboard shortcut to return to ortho top view
        this.millCanvas.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                // T for Top view - return to orthographic
                this.millCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
                this.millCamera.alpha = -Math.PI / 2;
                this.millCamera.beta = Math.PI / 2;  // 90 degrees = looking straight down
                this.millCamera.radius = 100;
                
                // Hide rotation gizmo in ortho view
                if (this.gizmoManager) {
                    this.gizmoManager.rotationGizmoEnabled = false;
                }
                
                console.log('Returned to top orthographic view');
            }
        });
    }
    
    // Setup ViewCube for navigation
    setupViewCube(millEngine) {
        // Create ViewCube container
        const viewCubeContainer = document.createElement('div');
        viewCubeContainer.id = 'mill-viewcube-container';
        viewCubeContainer.style.position = 'absolute';
        viewCubeContainer.style.top = '80px';
        viewCubeContainer.style.right = '20px';
        viewCubeContainer.style.width = '100px';
        viewCubeContainer.style.height = '100px';
        viewCubeContainer.style.zIndex = '100';
        this.millUI.appendChild(viewCubeContainer);
        
        // Initialize ViewCube
        this.viewCube = new ViewCube(
            this.millScene,
            this.millCamera,
            viewCubeContainer,
            {
                size: 100,
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
        );
        
        console.log('ViewCube added to The Mill');
    }
    
    // Setup transform gizmos for lumber manipulation
    setupGizmos(mesh) {
        // Create gizmo manager if not exists
        if (!this.gizmoManager) {
            this.gizmoManager = new BABYLON.GizmoManager(this.millScene);
            this.gizmoManager.positionGizmoEnabled = true;
            this.gizmoManager.rotationGizmoEnabled = true;  // Enable rotation for perspective mode
            this.gizmoManager.scaleGizmoEnabled = false;
            this.gizmoManager.boundingBoxGizmoEnabled = false;
            
            // Ensure gizmos only attach to lumber, not turntable
            this.gizmoManager.attachableMeshes = [mesh];
            
            // Customize gizmo appearance
            if (this.gizmoManager.gizmos.positionGizmo) {
                this.gizmoManager.gizmos.positionGizmo.xGizmo.dragBehavior.dragDeltaRatio = 1;
                this.gizmoManager.gizmos.positionGizmo.yGizmo.isVisible = false; // Hide Y axis in top view
                this.gizmoManager.gizmos.positionGizmo.zGizmo.dragBehavior.dragDeltaRatio = 1;
            }
        }
        
        // Attach gizmos to the lumber mesh only
        this.gizmoManager.attachToMesh(mesh);
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
    
    // Setup turntable and laser visualization
    setupTurntableAndLaser() {
        // Create turntable circle (radius = 30cm)
        const turntableRadius = 30;
        this.turntable = BABYLON.MeshBuilder.CreateDisc('turntable', {
            radius: turntableRadius,
            tessellation: 64
        }, this.millScene);
        
        this.turntable.position.y = 0.01; // Slightly above grid
        this.turntable.rotation.x = Math.PI / 2; // Lay flat
        this.turntable.isPickable = true;  // For rotation interaction
        
        // Create turntable material
        const turntableMat = new BABYLON.StandardMaterial('turntableMat', this.millScene);
        turntableMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        turntableMat.alpha = 0.5;
        this.turntable.material = turntableMat;
        
        // Create laser line - bright red, extends across entire table
        const tableSize = 200; // Match grid size
        this.laserLine = BABYLON.MeshBuilder.CreateLines('laserLine', {
            points: [
                new BABYLON.Vector3(-tableSize/2, 0.1, 0),
                new BABYLON.Vector3(tableSize/2, 0.1, 0)
            ],
            updatable: true
        }, this.millScene);
        
        // Bright red laser appearance
        this.laserLine.color = new BABYLON.Color3(1, 0, 0);
        this.laserLine.alpha = 1;
        
        // Make laser line thicker by using a tube instead
        const laserPath = [
            new BABYLON.Vector3(-tableSize/2, 0.1, 0),
            new BABYLON.Vector3(tableSize/2, 0.1, 0)
        ];
        
        const laserTube = BABYLON.MeshBuilder.CreateTube('laserTube', {
            path: laserPath,
            radius: 0.2, // 2mm thick laser
            tessellation: 8,
            updatable: true
        }, this.millScene);
        
        const laserMat = new BABYLON.StandardMaterial('laserMat', this.millScene);
        laserMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
        laserMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        laserTube.material = laserMat;
        
        // Store reference for rotation
        this.laserTube = laserTube;
    }
    
    // Setup event listeners for cutting
    setupEventListeners() {
        this.millCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.millCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.millCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    
    // Mouse down - handle based on button
    onMouseDown(e) {
        // Only handle left click (button 0) for selection
        if (e.button !== 0) return;
        
        const pickResult = this.millScene.pick(e.clientX, e.clientY);
        
        if (!pickResult.hit) return;
        
        // Check if clicking on lumber first (priority over turntable)
        if (pickResult.pickedMesh.name === 'millMaterial') {
            // Let gizmo handle the lumber
            console.log('Clicked on lumber - gizmo will handle movement');
            return;
        }
        
        // Check if clicking on turntable (only with left button)
        if (pickResult.pickedMesh.name === 'turntable') {
            this.isDraggingTurntable = true;
            
            // Calculate starting angle from click position
            const clickPoint = pickResult.pickedPoint;
            this.dragStartAngle = Math.atan2(clickPoint.z, clickPoint.x);
            
            console.log('Started dragging turntable for rotation');
        }
    }
    
    // Mouse move - rotate turntable and laser if dragging
    onMouseMove(e) {
        if (!this.isDraggingTurntable) return;
        
        const pickResult = this.millScene.pick(e.clientX, e.clientY);
        
        if (pickResult.hit) {
            const currentPoint = pickResult.pickedPoint;
            const currentAngle = Math.atan2(currentPoint.z, currentPoint.x);
            
            // Calculate angle difference
            const angleDiff = currentAngle - this.dragStartAngle;
            this.bladeAngle += angleDiff;
            
            // Rotate the laser line
            if (this.laserTube) {
                this.laserTube.rotation.y = this.bladeAngle;
            }
            if (this.laserLine) {
                this.laserLine.rotation.y = this.bladeAngle;
            }
            
            // Update start angle for next frame
            this.dragStartAngle = currentAngle;
            
            // Show angle in degrees for user feedback
            const degrees = (this.bladeAngle * 180 / Math.PI) % 360;
            console.log('Blade angle:', degrees.toFixed(1) + '°');
        }
    }
    
    // Mouse up - stop dragging turntable
    onMouseUp(e) {
        if (this.isDraggingTurntable) {
            this.isDraggingTurntable = false;
            console.log('Stopped dragging turntable');
        }
    }
    
    // Execute the cut
    executeCut() {
        console.log('Executing cut in The Mill with blade angle:', this.bladeAngle);
        
        // Get the lumber position
        const lumberMesh = this.millScene.getMeshByName('millMaterial');
        if (!lumberMesh) {
            alert('No material to cut');
            return;
        }
        
        // Calculate cut based on laser line intersection with lumber
        const cutData = {
            position: lumberMesh.position.clone(),
            angle: this.bladeAngle,
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
