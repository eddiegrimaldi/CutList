// GridSystem.js - Modular grid rendering and management
// Handles 3D grid display with LOD (Level of Detail) optimization

export class GridSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Grid state
        this.isVisible = true;
        this.gridGround = null;
        this.gridMaterial = null;
        
        // Dual grid system for visibility from both sides
        this.gridGroundBelow = null;
        this.gridMaterialBelow = null;
        
        // LOD throttling
        this.lastGridLODUpdate = null;
        this.isUpdatingGrid = false;
        
        // Grid observer
        this.gridUpdateObserver = null;
        
        this.initialize();
    }
    
    initialize() {
        // Create the grid system
        this.createGridMaterialSystem();
        
        // Set up camera observer for dynamic LOD
        this.setupGridObserver();
    }
    
    createLineBasedGrid() {
        // Create actual line geometry instead of GridMaterial for true transparency
        this.gridLines = [];
        this.gridLinesBelow = [];
        
        // Grid parameters
        const gridSize = 100; // 100 units in each direction
        const spacing = 1.0; // 1 unit spacing
        const majorSpacing = 10; // Every 10th line is major
        
        // Create lines parallel to X axis (horizontal lines)
        for (let z = -gridSize; z <= gridSize; z += spacing) {
            const isMajor = (z % majorSpacing === 0);
            const color = isMajor ? new BABYLON.Color3(0.4, 0.4, 0.4) : new BABYLON.Color3(0.7, 0.7, 0.7);
            
            // Top grid lines
            const points = [
                new BABYLON.Vector3(-gridSize, 0, z),
                new BABYLON.Vector3(gridSize, 0, z)
            ];
            
            const line = BABYLON.MeshBuilder.CreateLines(`gridLine_x_${z}`, {points}, this.scene);
            line.color = color;
            line.isPickable = false;
            line.renderingGroupId = -1; // Render behind everything
            this.gridLines.push(line);
            
            // Bottom grid lines (flipped)
            const lineBelow = BABYLON.MeshBuilder.CreateLines(`gridLineBelow_x_${z}`, {points}, this.scene);
            lineBelow.color = color;
            lineBelow.isPickable = false;
            lineBelow.renderingGroupId = -1;
            lineBelow.rotation.x = Math.PI; // Flip to face downward
            this.gridLinesBelow.push(lineBelow);
        }
        
        // Create lines parallel to Z axis (vertical lines)
        for (let x = -gridSize; x <= gridSize; x += spacing) {
            const isMajor = (x % majorSpacing === 0);
            const color = isMajor ? new BABYLON.Color3(0.4, 0.4, 0.4) : new BABYLON.Color3(0.7, 0.7, 0.7);
            
            // Top grid lines
            const points = [
                new BABYLON.Vector3(x, 0, -gridSize),
                new BABYLON.Vector3(x, 0, gridSize)
            ];
            
            const line = BABYLON.MeshBuilder.CreateLines(`gridLine_z_${x}`, {points}, this.scene);
            line.color = color;
            line.isPickable = false;
            line.renderingGroupId = -1;
            this.gridLines.push(line);
            
            // Bottom grid lines (flipped)
            const lineBelow = BABYLON.MeshBuilder.CreateLines(`gridLineBelow_z_${x}`, {points}, this.scene);
            lineBelow.color = color;
            lineBelow.isPickable = false;
            lineBelow.renderingGroupId = -1;
            lineBelow.rotation.x = Math.PI;
            this.gridLinesBelow.push(lineBelow);
        }
    }
    
    createGridMaterialSystem() {
        // Create large ground plane for grid (facing up)
        const groundSize = 2000;
        this.gridGround = BABYLON.MeshBuilder.CreateGround("gridGround", { 
            width: groundSize, 
            height: groundSize 
        }, this.scene);
        this.gridGround.position.y = 0;
        
        // Create GridMaterial for top grid
        this.gridMaterial = new BABYLON.GridMaterial("gridMaterial", this.scene);
        this.gridMaterial.mainColor = new BABYLON.Color3(0.95, 0.95, 0.95); // Light gray background
        this.gridMaterial.lineColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Major lines - medium gray
        this.gridMaterial.minorLineColor = new BABYLON.Color3(0.7, 0.7, 0.7); // Minor lines - light gray
        this.gridMaterial.gridRatio = 1.0; // 1 inch minor lines
        this.gridMaterial.majorUnitFrequency = 10; // Major lines every 10 minor lines
        this.gridMaterial.minorUnitVisibility = 0.7; // Minor line opacity
        this.gridMaterial.majorUnitVisibility = 1.0; // Major line opacity
        this.gridMaterial.opacity = 0.5; // Overall grid opacity
        this.gridMaterial.backFaceCulling = false; // Make it double-sided
        
        // Apply material to ground
        this.gridGround.material = this.gridMaterial;
        this.gridGround.isPickable = false;
        
        // Create second ground plane for grid (facing down)
        this.gridGroundBelow = BABYLON.MeshBuilder.CreateGround("gridGroundBelow", { 
            width: groundSize, 
            height: groundSize 
        }, this.scene);
        this.gridGroundBelow.position.y = 0;
        
        // Flip the bottom grid to face downward
        this.gridGroundBelow.rotation.x = Math.PI;
        
        // Create GridMaterial for bottom grid (identical settings)
        this.gridMaterialBelow = new BABYLON.GridMaterial("gridMaterialBelow", this.scene);
        this.gridMaterialBelow.mainColor = new BABYLON.Color3(0.95, 0.95, 0.95); // Light gray background
        this.gridMaterialBelow.lineColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        this.gridMaterialBelow.minorLineColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        this.gridMaterialBelow.gridRatio = 1.0;
        this.gridMaterialBelow.majorUnitFrequency = 10;
        this.gridMaterialBelow.minorUnitVisibility = 0.7; // Minor line opacity
        this.gridMaterialBelow.majorUnitVisibility = 1.0; // Major line opacity
        this.gridMaterialBelow.opacity = 0.5; // Overall grid opacity
        this.gridMaterialBelow.backFaceCulling = false; // Make it double-sided
        
        // Apply material to bottom grid
        this.gridGroundBelow.material = this.gridMaterialBelow;
        this.gridGroundBelow.isPickable = false;
    }
    
    setupGridObserver() {
        // Add observer for camera changes to update LOD
        this.gridUpdateObserver = this.camera.onViewMatrixChangedObservable.add(() => {
            if (this.isVisible) {
                this.updateDynamicGrid();
            }
        });
    }
    
    updateDynamicGrid() {
        // Don't update if not visible or if currently updating
        if (!this.isVisible || this.isUpdatingGrid) {
            return;
        }
        
        this.isUpdatingGrid = true;
        
        // Create grid if it doesn't exist
        if (!this.gridGround) {
            this.createGridMaterialSystem();
        }
        
        // Determine which grid to show based on camera position
        const cameraY = this.camera.position.y;
        const isAboveGrid = cameraY > 0;
        
        // Show/hide grids based on camera position
        if (this.gridGround && this.gridGroundBelow) {
            this.gridGround.setEnabled(isAboveGrid);
            this.gridGroundBelow.setEnabled(!isAboveGrid);
        }
        
        // Update grid LOD based on camera distance
        this.updateGridMaterialLOD();
        
        this.isUpdatingGrid = false;
    }
    
    updateGridMaterialLOD() {
        if (!this.gridMaterial) return;
        
        const camDistance = this.camera.radius;
        
        // Throttle LOD updates to prevent sluggishness
        if (this.lastGridLODUpdate && Date.now() - this.lastGridLODUpdate < 500) {
            return;
        }
        this.lastGridLODUpdate = Date.now();
        
        // Determine new LOD level - always 10 minor lines per major line
        let newGridRatio, newMajorFreq;
        if (camDistance < 5) {
            newGridRatio = 0.1; // 1/10 inch minor lines
            newMajorFreq = 10; // Major lines every 10 minor lines (1 inch)
        } else if (camDistance < 15) {
            newGridRatio = 0.25; // 1/4 inch minor lines
            newMajorFreq = 10; // Major lines every 10 minor lines (2.5 inches)
        } else if (camDistance < 30) {
            newGridRatio = 0.5; // 1/2 inch minor lines
            newMajorFreq = 10; // Major lines every 10 minor lines (5 inches)
        } else if (camDistance < 60) {
            newGridRatio = 1.0; // 1 inch minor lines
            newMajorFreq = 10; // Major lines every 10 minor lines (10 inches)
        } else {
            newGridRatio = 2.0; // 2 inch minor lines
            newMajorFreq = 10; // Major lines every 10 minor lines (20 inches)
        }
        
        // Update both grid materials with same LOD settings
        if (this.gridMaterial.gridRatio !== newGridRatio || this.gridMaterial.majorUnitFrequency !== newMajorFreq) {
            // Update top grid
            this.gridMaterial.gridRatio = newGridRatio;
            this.gridMaterial.majorUnitFrequency = newMajorFreq;
            
            // Update bottom grid with same settings
            if (this.gridMaterialBelow) {
                this.gridMaterialBelow.gridRatio = newGridRatio;
                this.gridMaterialBelow.majorUnitFrequency = newMajorFreq;
            }
        }
    }
    
    setVisible(visible) {
        this.isVisible = visible;
        
        if (visible) {
            // When showing, use updateDynamicGrid to show the correct grid
            this.updateDynamicGrid();
        } else {
            // When hiding, hide both grids
            if (this.gridGround) {
                this.gridGround.setEnabled(false);
            }
            if (this.gridGroundBelow) {
                this.gridGroundBelow.setEnabled(false);
            }
        }
    }
    
    hide() {
        if (this.gridGround) {
            this.gridGround.setEnabled(false);
        }
        if (this.gridGroundBelow) {
            this.gridGroundBelow.setEnabled(false);
        }
    }
    
    show() {
        if (this.gridGround && this.gridGroundBelow) {
            // Use updateDynamicGrid to show the correct grid based on camera position
            this.updateDynamicGrid();
        } else {
            this.updateDynamicGrid();
        }
    }
    
    recreate() {
        // Dispose existing grids completely and recreate
        if (this.gridGround) {
            this.gridGround.dispose();
        }
        if (this.gridGroundBelow) {
            this.gridGroundBelow.dispose();
        }
        if (this.gridMaterial) {
            this.gridMaterial.dispose();
        }
        if (this.gridMaterialBelow) {
            this.gridMaterialBelow.dispose();
        }
        
        this.createGridMaterialSystem();
    }
    
    dispose() {
        // Clean up resources
        if (this.gridUpdateObserver) {
            this.camera.onViewMatrixChangedObservable.remove(this.gridUpdateObserver);
            this.gridUpdateObserver = null;
        }
        
        if (this.gridGround) {
            this.gridGround.dispose();
            this.gridGround = null;
        }
        
        if (this.gridGroundBelow) {
            this.gridGroundBelow.dispose();
            this.gridGroundBelow = null;
        }
        
        if (this.gridMaterial) {
            this.gridMaterial.dispose();
            this.gridMaterial = null;
        }
        
        if (this.gridMaterialBelow) {
            this.gridMaterialBelow.dispose();
            this.gridMaterialBelow = null;
        }
    }
}