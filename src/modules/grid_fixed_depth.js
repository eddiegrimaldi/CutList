// src/modules/grid_fixed_depth.js - Fixed Grid System with Proper Depth Buffer
// Author: Eddie Joiner, Master of Reality and CGI
// FIXED: Proper depth buffer rendering for 3D objects


// Note: BABYLON is loaded globally via CDN script tags in babylon.html
// No ES6 imports needed - use global BABYLON object

// GridMaterial and updateGrid would need to be available globally or imported differently
// For now, we'll create a simple grid material using standard Babylon.js

// FIXED: Remove ES6 export and use global class declaration
class GridModule {
    constructor(canvas) {
        // STEP 1: Initialize Properties and Objects
        this.canvas = canvas;
        this.engine = null;
        this.scene = null;
        this.grid = null;
        this.highlightLayer = null;
        this.camera = null;
        this.light = null;
        this.material = null;
        this.occlusionRay = null;
        this.xrHelper = null;
        this.webGLSupported = false;
        
        // STEP 2: Create Babylon Engine and Scene
        this._createEngine();
        this._createScene();
        
        // STEP 3: Initialize GridMaterial and Occulsion System
        this._createGridMaterial();
        this._createOcclusionRay();
        
        // STEP 4: Create Scene Objects - Lights, Camera, Grid
        this._createLights();
        this._createCamera();
        this._createGrid();

        // STEP 5: Handle XR
        // this._createXRHelper();
        
        // STEP 6: Render the Scene and Handle Events
        this._render();
        this._handleEvents();
        
    }
    
    _createEngine() {
        
        // Check if canvas exists
        if (!this.canvas) {
            throw new Error('Canvas not found for GridModule');
        }
        

        // Create the engine - WebGL is supported, so this should work
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true
        });
        
        this.webGLSupported = true;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.engine && !this.engine.isDisposed) {
                this.engine.resize();
            }
        });
    }

    _createScene() {
        if (!this.engine) {
            throw new Error('Engine not initialized');
        }

        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // White background for professional CAD look
        this.highlightLayer = new BABYLON.HighlightLayer("hl1", this.scene);

    }

    _createGridMaterial() {
        // Create a simple GridMaterial using standard Babylon.js
        this.material = new BABYLON.GridMaterial("gridMaterial", this.scene);
        
        // FIXED: Configure for proper depth buffer participation
        this.material.majorUnitFrequency = 10; // Major lines every 10 units
        this.material.minorUnitVisibility = 0.7; // Minor line visibility
        this.material.gridRatio = 1; // 1 unit grid spacing
        this.material.backFaceCulling = false;
        this.material.mainColor = new BABYLON.Color3(1, 1, 1); // White background
        this.material.lineColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark grid lines
        this.material.opacity = 1.0; // FIXED: Fully opaque to eliminate transparency depth issues

        // CRITICAL FIX: Enable depth writing so grid participates in depth buffer properly
        this.material.disableDepthWrite = false; // FIXED: Allow grid to write to depth buffer
        this.material.depthFunction = BABYLON.Engine.LEQUAL; // FIXED: Standard depth test
        this.material.needDepthPrePass = false; // FIXED: No pre-pass needed for opaque grid
        this.material.separateCullingPass = false; // FIXED: Standard culling
        

        // DEBUG: Log material properties
    }

    _createLights() {
        this.light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), this.scene);
        this.light.groundColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    }

    _createCamera() {
        const cameraPositionStart = new BABYLON.Vector3(0, 10, -3);
        const cameraPositionEnd = new BABYLON.Vector3(0, 10, -6);
        this.camera = new BABYLON.ArcRotateCamera('camera1', 1.5, 1.4, 10, new BABYLON.Vector3(0, 0, 0), this.scene);
        this.camera.setPosition(cameraPositionStart);
        this.camera.attachControl(this.canvas, true);

        // Smooth camera transition on start
        const cameraAnimation = new BABYLON.Animation(
            'cameraAnimation',
            'position',
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        const keys = [
            { frame: 0, value: cameraPositionStart },
            { frame: 30, value: cameraPositionEnd }
        ];
        cameraAnimation.setKeys(keys);
        this.camera.animations.push(cameraAnimation);
        this.scene.beginAnimation(this.camera, 0, 30, false);
    }

    _createGrid() {
        this.grid = BABYLON.Mesh.CreateGround('grid', 100, 100, 2, this.scene);
        
        // CRITICAL FIX: Set grid to render in background layer but with proper depth participation
        this.grid.renderingGroupId = 0; // Background layer
        this.grid.position.y = -0.01; // FIXED: Position slightly below y=0 to act as background plane
        this.grid.material = this.material;
        this.grid.isPickable = false; // FIXED: Prevent interference with object selection
        this.grid.infiniteDistance = false; // FIXED: Allow normal depth testing
        this.grid.alphaIndex = 0; // FIXED: Ensure proper alpha sorting if needed
        
        // Add extra lines to material - REMOVED: Not available with standard GridMaterial
        // this._addRandomLines();

        // DEBUG: Log grid properties
    }
    
    // REMOVED: _addRandomLines method since it used custom GridMaterial API not available in standard Babylon.js

    _handleEvents() {
        // Hook pointer events for occlusion
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.pickInfo.hit) {
                        this._startOcclusionRay(pointerInfo.pickInfo.pickedPoint);
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                case BABYLON.PointerEventTypes.POINTEROUT:
                    this._endOcclusionRay();
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if (this.occlusionRay) {
                        this._moveOcclusionRay(pointerInfo.pickInfo.pickedPoint);
                    }
                    break;
            }
        });

        // Update grid aspect on canvas resize
        window.addEventListener('resize', () => {
            this._updateGridAspect();
        });
    }

    _createOcclusionRay() {
        this.occlusionRay = null;
    }

    _startOcclusionRay(point) {
        this.occlusionRay = new BABYLON.Ray(point, new BABYLON.Vector3(0, -1, 0), 0.5);

        // Perform occlusion ray cast on the grid
        const pickInfo = this.scene.pickWithRay(this.occlusionRay);
        if (pickInfo.hit) {
            this.highlightLayer.addMesh(pickInfo.pickedMesh, BABYLON.Color3.White());
        }
    }

    _moveOcclusionRay(point) {
        if (!this.occlusionRay) return;
        this.occlusionRay.origin = point;

        // Perform occlusion ray cast on the grid
        const pickInfo = this.scene.pickWithRay(this.occlusionRay);
        if (pickInfo.hit) {
            this.highlightLayer.removeMesh(this.highlightLayer.hasMesh(pickInfo.pickedMesh) ? pickInfo.pickedMesh : undefined);
            this.highlightLayer.addMesh(pickInfo.pickedMesh, BABYLON.Color3.White());
        }
    }

    _endOcclusionRay() {
        if (!this.occlusionRay) return;
        this.highlightLayer.removeAllMeshes();
        this.occlusionRay = null;
    }

    _updateGridAspect() {
        const gridSize = Math.min(this.engine.getRenderWidth(), this.engine.getRenderHeight()) * 0.9;
        this.grid.scaling = new BABYLON.Vector3(gridSize, gridSize, gridSize);
    }

    _render() {
        this.scene.onBeforeRenderObservable.add(() => {
            // Update grid material aspect uniform - REMOVED: updateGrid not available with standard GridMaterial
            // updateGrid(this.grid.material, this.engine);
        });

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    // NEW METHOD: Configure 3D objects with proper depth settings
    configure3DObject(mesh) {
        
        // Ensure 3D objects render in foreground with proper depth testing
        mesh.renderingGroupId = 1; // Foreground layer (after grid)
        mesh.material.disableDepthWrite = false; // Allow depth writing
        mesh.material.depthFunction = BABYLON.Engine.LEQUAL; // Standard depth test
        mesh.material.needDepthPrePass = false; // No pre-pass needed
        mesh.material.separateCullingPass = false; // Standard culling
        
        // Ensure proper material setup for opaque objects
        if (mesh.material.alphaMode !== undefined) {
            mesh.material.alphaMode = BABYLON.Engine.ALPHA_DISABLE; // Fully opaque
        }
        
        
        return mesh;
    }

    debug(debugObject) {
    }

    // COMPATIBILITY METHODS FOR MAIN.JS INTEGRATION
    
    // Add currentMode property for compatibility
    get currentMode() {
        return this._currentMode || 'sketch';
    }
    
    set currentMode(mode) {
        this._currentMode = mode;
    }
    
    // Add render method for compatibility 
    render(forceRender = false) {
        // The render loop is already running, so this is mainly for compatibility
        if (this.scene && forceRender) {
            this.scene.render();
        }
    }
    
    // Add babylonGrid property for compatibility
    get babylonGrid() {
        return {
            gridMesh: this.grid
        };
    }
    
    // Add getBabylonCamera method for compatibility
    getBabylonCamera() {
        return this.camera;
    }
    
    // Add clearActiveSketchPlane method for compatibility
    clearActiveSketchPlane() {
        // This GridModule doesn't use sketch planes the same way, so this is a no-op
    }
    
    // Add getScene method for compatibility
    getScene() {
        return this.scene;
    }
    
    // Add getEngine method for compatibility  
    getEngine() {
        return this.engine;
    }
}

// Make GridModule available globally
window.GridModule = GridModule;
