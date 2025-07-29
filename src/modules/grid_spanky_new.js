// Grid Renderer - Handles grid drawing and visualization

export class GridRenderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;

        // LOD settings
        this.lodWorldSpacings = [1/32, 1/16, 1/8, 1/4, 1/2, 1, 2]; // inches, from finest to coarsest
        // this.lodThresholdScreenPixels = 50; // No longer used directly for switching logic

        // Dynamic grid settings, will be updated by LOD logic
        // Initialize with the coarsest, updateGridSpacingForLOD will refine it.
        this.minorSpacing = this.lodWorldSpacings[this.lodWorldSpacings.length - 1]; 
        this.majorSpacing = this.minorSpacing * 4; // Initial major, will also be updated
        
        // Colors
        this.majorColor = '#9ca3af';      // Gray-400 (major lines)
        this.minorColor = '#d1d5db';      // Gray-300 (minor lines)  
        
        // Line widths
        this.majorWidth = 1.5;
        this.minorWidth = 1;
        
        // 3D scene reference
        this.scene = null;
        this.engine = null;
        this.babylonCanvas = null;
        this.babylonGridMaterial = null; // To store GridMaterial instance
        this.babylonCamera = null; // To store 3D camera instance
        this.current3DLodState = null; // To track current 3D LOD state
        
        // Current mode
        this.currentMode = 'sketch';
    }
    
    render() {
        if (this.currentMode === 'modeling') {
            this.renderPerspectiveGrid();
        } else {
            this.renderOrthographicGrid();
        }
    }

    updateGridSpacingForLOD() {
        const camZoom = this.camera.zoom;
        const dpr = this.camera.dpr || window.devicePixelRatio || 1;

        const OPTIMAL_SCREEN_PX = 50; // Changed from 150
        const SWITCH_THRESHOLD_ZOOM_OUT = OPTIMAL_SCREEN_PX / 2; // Becomes 25px
        const SWITCH_THRESHOLD_ZOOM_IN = OPTIMAL_SCREEN_PX;     // Becomes 50px

        let currentLodIndex = this.lodWorldSpacings.indexOf(this.minorSpacing);
        
        // If minorSpacing is not in the list (e.g. first run with a different default), find a best fit or start fresh.
        // Starting with coarsest and letting it refine inwards is robust.
        if (currentLodIndex === -1) {
            currentLodIndex = this.lodWorldSpacings.length - 1; // Start with coarsest
            this.minorSpacing = this.lodWorldSpacings[currentLodIndex];
        }
        

        // Attempt to switch to a COARSER LOD if current lines are too small
        let madeChangeCoarserLoop = true; // Control for the loop
        while(madeChangeCoarserLoop) {
            madeChangeCoarserLoop = false;
            if (currentLodIndex < this.lodWorldSpacings.length - 1) { // If not already at the coarsest LOD
                const projectedScreenSize = this.minorSpacing * camZoom * dpr;
                if (projectedScreenSize < SWITCH_THRESHOLD_ZOOM_OUT) {
                    currentLodIndex++;
                    this.minorSpacing = this.lodWorldSpacings[currentLodIndex];
                    madeChangeCoarserLoop = true; // Indicate a change was made, loop again
                }
            }
        }

        // Attempt to switch to a FINER LOD if current lines are too large
        // This runs after coarsening attempts, to settle on the best fit.
        let madeChangeFinerLoop = true; // Control for the loop
        while(madeChangeFinerLoop) {
            madeChangeFinerLoop = false;
            if (currentLodIndex > 0) { // If not already at the finest LOD
                const projectedScreenSize = this.minorSpacing * camZoom * dpr;
                // Allow the finest LOD to stay if it's between 50px and 300px (as per camera max zoom)
                // For other LODs, switch if larger than OPTIMAL_SCREEN_PX (50px)
                const thresholdForFinerSwitch = (currentLodIndex === 1) ? (this.camera.OPTIMAL_PX_PER_UNIT_FINEST_LOD || SWITCH_THRESHOLD_ZOOM_IN) : SWITCH_THRESHOLD_ZOOM_IN;
                
                if (projectedScreenSize > thresholdForFinerSwitch && this.lodWorldSpacings[currentLodIndex-1] * camZoom * dpr > SWITCH_THRESHOLD_ZOOM_OUT) {
                     // Check if switching to finer would make it too small immediately
                    if (this.lodWorldSpacings[currentLodIndex-1] * camZoom * dpr >= SWITCH_THRESHOLD_ZOOM_OUT) {
                        currentLodIndex--;
                        this.minorSpacing = this.lodWorldSpacings[currentLodIndex];
                        madeChangeFinerLoop = true; // Indicate a change was made, loop again
                    }
                } else if (projectedScreenSize > SWITCH_THRESHOLD_ZOOM_IN) { // General case for switching finer
                     if (this.lodWorldSpacings[currentLodIndex-1] * camZoom * dpr >= SWITCH_THRESHOLD_ZOOM_OUT) {
                        currentLodIndex--;
                        this.minorSpacing = this.lodWorldSpacings[currentLodIndex];
                        madeChangeFinerLoop = true; // Indicate a change was made, loop again
                    }
                }
            }
        }
        
        // Determine major spacing based on the final minor spacing
        this.majorSpacing = this.minorSpacing * 10;
    }

    renderOrthographicGrid() {
        this.updateGridSpacingForLOD(); // Update spacing based on zoom
        
        const mainCanvas = document.getElementById('drawingCanvas');
        const babylonCanvas = document.getElementById('babylonCanvas');

        if (mainCanvas) mainCanvas.style.display = 'block';
        if (babylonCanvas) babylonCanvas.style.display = 'none';

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.ctx.save(); // Save current context state

        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr); // Apply DPR scaling first

        // Camera properties
        const camX = this.camera.x;
        const camY = this.camera.y;
        const camZoom = this.camera.zoom;
        const camRotation = this.camera.rotation; // Should be 0 in sketch mode, but let's include it
        const viewportCssWidth = this.camera.width; // CSS pixel width of canvas
        const viewportCssHeight = this.camera.height; // CSS pixel height of canvas

        // Apply camera transformations to the context
        this.ctx.translate(viewportCssWidth / 2, viewportCssHeight / 2); // Move origin to center of CSS pixel viewport
        this.ctx.scale(camZoom, camZoom);
        this.ctx.rotate(camRotation); // Apply rotation
        this.ctx.translate(-camX, -camY); // Pan to camera's world position

        // Now, the context is set up so that drawing at (worldX, worldY) will appear correctly.
        
        try {
            const bounds = this.camera.getVisibleBounds(); // World coordinates

            const padding = Math.max(this.majorSpacing, 10); // World units
            const viewLeft = Math.floor((bounds.left - padding) / this.minorSpacing) * this.minorSpacing;
            const viewRight = Math.ceil((bounds.right + padding) / this.minorSpacing) * this.minorSpacing;
            const viewTop = Math.floor((bounds.top - padding) / this.minorSpacing) * this.minorSpacing;
            const viewBottom = Math.ceil((bounds.bottom + padding) / this.minorSpacing) * this.minorSpacing;

            // Draw ALL minor grid lines first
            this.ctx.strokeStyle = this.minorColor;
            // Set line width to be constant in screen pixels, adjust for zoom
            this.ctx.lineWidth = this.minorWidth / camZoom;
            this.ctx.beginPath();
            
            for (let x = viewLeft; x <= viewRight; x += this.minorSpacing) {
                // Draw all minor lines. Major lines will be drawn over them if they coincide.
                this.ctx.moveTo(x, viewTop); // World coordinates
                this.ctx.lineTo(x, viewBottom); // World coordinates
            }
            for (let y = viewTop; y <= viewBottom; y += this.minorSpacing) {
                this.ctx.moveTo(viewLeft, y); // World coordinates
                this.ctx.lineTo(viewRight, y); // World coordinates
            }
            this.ctx.stroke();

            // Draw major grid lines ON TOP
            this.ctx.strokeStyle = this.majorColor;
            this.ctx.lineWidth = this.majorWidth / camZoom;
            this.ctx.beginPath();
            
            // Calculate starting points for major lines aligned to majorSpacing
            const startMajorX = Math.ceil(viewLeft / this.majorSpacing) * this.majorSpacing;
            const startMajorY = Math.ceil(viewTop / this.majorSpacing) * this.majorSpacing;

            for (let x = startMajorX; x <= viewRight; x += this.majorSpacing) {
                this.ctx.moveTo(x, viewTop); // World coordinates
                this.ctx.lineTo(x, viewBottom); // World coordinates
            }
            for (let y = startMajorY; y <= viewBottom; y += this.majorSpacing) {
                this.ctx.moveTo(viewLeft, y); // World coordinates
                this.ctx.lineTo(viewRight, y); // World coordinates
            }
            this.ctx.stroke();
            
        } catch (error) {
        } finally {
            this.ctx.restore(); // Restore context state (removes camera transforms and DPR scale)
        }
    }

    renderPerspectiveGrid() {
        
        const mainCanvas = document.getElementById('drawingCanvas');
        if (mainCanvas) {
            mainCanvas.style.display = 'none';
        }
        
        if (!this.scene) {
            this.create3DScene();
        } else {
            if (this.babylonCanvas) {
                this.babylonCanvas.style.display = 'block';
                if (this.engine && !this.engine.isDisposed && this.scene) {
                     if (!this.engine._activeRenderLoops || this.engine._activeRenderLoops.length === 0) { 
                        this.engine.runRenderLoop(() => {
                            if (this.scene && !this.scene.isDisposed) {
                                this.scene.render();
                            }
                        });
                    }
                }
            } else {
            }
        }
    }

    create3DScene() {
        
        const mainCanvas = document.getElementById('drawingCanvas');
        if (!mainCanvas) {
            return;
        }

        const canvasContainer = mainCanvas.parentNode;
        if (!canvasContainer) {
            return;
        }

        if (typeof BABYLON === 'undefined') {
            return;
        }

        try {
            
            this.babylonCanvas = document.createElement('canvas');
            this.babylonCanvas.id = 'babylonCanvas';
            
            const containerRect = canvasContainer.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            if (containerRect.width === 0 || containerRect.height === 0) {
                return;
            }
            
            this.babylonCanvas.style.width = containerRect.width + 'px';
            this.babylonCanvas.style.height = containerRect.height + 'px';
            this.babylonCanvas.width = Math.floor(containerRect.width * dpr);
            this.babylonCanvas.height = Math.floor(containerRect.height * dpr);
              this.babylonCanvas.style.position = 'absolute';
            this.babylonCanvas.style.top = '0px'; // Position relative to container
            this.babylonCanvas.style.left = '0px';// Position relative to container
            this.babylonCanvas.style.zIndex = '999'; // Much higher z-index
            this.babylonCanvas.style.pointerEvents = 'auto';
            this.babylonCanvas.style.display = 'block'; // Force display
            this.babylonCanvas.style.visibility = 'visible'; // Force visibility
            this.babylonCanvas.style.opacity = '1'; // Force opacity
            this.babylonCanvas.style.border = '5px solid red'; // Red border for visibility test
            
            canvasContainer.appendChild(this.babylonCanvas);

            this.engine = new BABYLON.Engine(this.babylonCanvas, true, { 
                antialias: true,
                preserveDrawingBuffer: true,
                stencil: true 
            });
            
            this.scene = new BABYLON.Scene(this.engine);


            this.setupScene(); 
            
            this.engine.runRenderLoop(() => {
                if (this.scene && !this.scene.isDisposed) { // Ensure scene exists and is not disposed
                    this.scene.render();
                }
            });
            
            window.addEventListener('resize', () => {
                if (this.engine && !this.engine.isDisposed) {
                    this.engine.resize();
                }
            });
        } catch (error) {
            if (this.engine) this.engine.dispose();
            if (this.babylonCanvas && this.babylonCanvas.parentNode) {
                this.babylonCanvas.parentNode.removeChild(this.babylonCanvas);
            }
            this.scene = null;
            this.engine = null;
            this.babylonCanvas = null;
        }
    }

    setupScene() {

        if (!this.scene || !this.engine) {
            return;
        }

        this.scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); 
        
        // Create ArcRotateCamera with default values first
        this.babylonCamera = new BABYLON.ArcRotateCamera("camera3D", 
                                                        0, 
                                                        0, 
                                                        10, 
                                                        new BABYLON.Vector3(0, 0, 0), 
                                                        this.scene);
        
        // Now set the exact position Master specified: X=30", Y=16", Z=-90"
        const targetPosition = new BABYLON.Vector3(0, 0, 0); // Origin
        const cameraPosition = new BABYLON.Vector3(30, 16, -90); // Master's position
        
        // Set the camera to look at origin from the specified position
        this.babylonCamera.setTarget(targetPosition);
        this.babylonCamera.position = cameraPosition;
        
        // Force the camera to update its internal state
        this.babylonCamera.rebuildAnglesAndRadius();
        
        
        this.babylonCamera.attachControl(this.babylonCanvas, true);
        this.babylonCamera.wheelPrecision = 5; // More zoom sensitivity
        this.babylonCamera.lowerRadiusLimit = 0.1; // Allow closer zoom for detail 
        this.babylonCamera.upperRadiusLimit = 2000; // Allow further zoom out for larger scenes
        this.scene.activeCamera = this.babylonCamera; 
        new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
        new BABYLON.HemisphericLight("light2", new BABYLON.Vector3(-1, -1, 0), this.scene).intensity = 0.5;
          // Add directional light for better shadows and 3D depth perception
        const directionalLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -1, -1), this.scene);
        directionalLight.intensity = 0.3;
        directionalLight.position = new BABYLON.Vector3(20, 20, 20);

        // Create Shapr3D-style colored axis lines emanating from origin
        this.createOriginAxisLines();

        const groundSize = 2000; // Increased ground size for larger potential views
        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: groundSize, height: groundSize }, this.scene);
        ground.position.y = 0;        // Store GridMaterial reference
        this.babylonGridMaterial = new BABYLON.GridMaterial("gridMaterial3D", this.scene);
        // Adjust mainColor to be very light gray, complementing the white scene background
        this.babylonGridMaterial.mainColor = new BABYLON.Color3(0.92, 0.92, 0.92); 
        this.babylonGridMaterial.lineColor = BABYLON.Color3.FromHexString(this.majorColor || '#9ca3af'); 
        this.babylonGridMaterial.minorLineColor = BABYLON.Color3.FromHexString(this.minorColor || '#d1d5db');
        
        // Make grid background transparent to avoid obstruction when camera moves below
        this.babylonGridMaterial.alpha = 0.0; // Transparent background surface
        this.babylonGridMaterial.backFaceCulling = false; // Show grid from both sides
        
        this.current3DLodState = null; 
        this.update3DGridLOD(); 
        ground.material = this.babylonGridMaterial;
        
        // Add observer for camera changes
        this.babylonCamera.onViewMatrixChangedObservable.add(() => {
            this.update3DGridLOD();

    }

    update3DGridLOD() {
        if (!this.babylonGridMaterial || !this.babylonCamera) {
            return;
        }

        const radius = this.babylonCamera.radius;
        let newLodState = null;

        // New 7-state LOD system
        if (radius < 25) {
            newLodState = 'LOD1_R_LT_25'; 
        } else if (radius < 50) {
            newLodState = 'LOD2_R_25_50';
        } else if (radius < 100) {
            newLodState = 'LOD3_R_50_100';
        } else if (radius < 200) {
            newLodState = 'LOD4_R_100_200';
        } else if (radius < 400) {
            newLodState = 'LOD5_R_200_400';
        } else if (radius < 800) {
            newLodState = 'LOD6_R_400_800';
        } else { // radius >= 800
            newLodState = 'LOD7_R_GT_800';
        }

        if (newLodState !== this.current3DLodState) {
            this.current3DLodState = newLodState;

            const majorFreq = 4; // Consistent major unit frequency

            switch (this.current3DLodState) {
                case 'LOD1_R_LT_25': // Very Close Up
                    this.babylonGridMaterial.gridRatio = 0.25; // Minor lines: 0.25 inch
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 1 inch
                    this.babylonGridMaterial.minorUnitVisibility = 0.85;
                    break;
                case 'LOD2_R_25_50': // Close Up
                    this.babylonGridMaterial.gridRatio = 0.5;  // Minor lines: 0.5 inch
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 2 inches
                    this.babylonGridMaterial.minorUnitVisibility = 0.75;
                    break;
                case 'LOD3_R_50_100': // Standard View
                    this.babylonGridMaterial.gridRatio = 1.0;  // Minor lines: 1 inch
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 4 inches
                    this.babylonGridMaterial.minorUnitVisibility = 0.65;
                    break;
                case 'LOD4_R_100_200': // Medium Zoom Out
                    this.babylonGridMaterial.gridRatio = 3.0;  // Minor lines: 3 inches
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 1 foot (12 inches)
                    this.babylonGridMaterial.minorUnitVisibility = 0.55;
                    break;
                case 'LOD5_R_200_400': // Zoomed Out
                    this.babylonGridMaterial.gridRatio = 12.0; // Minor lines: 1 foot (12 inches)
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 4 feet
                    this.babylonGridMaterial.minorUnitVisibility = 0.45;
                    break;
                case 'LOD6_R_400_800': // Far Zoomed Out
                    this.babylonGridMaterial.gridRatio = 36.0; // Minor lines: 3 feet (36 inches)
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 12 feet
                    this.babylonGridMaterial.minorUnitVisibility = 0.35;
                    break;
                case 'LOD7_R_GT_800': // Very Far Zoomed Out
                    this.babylonGridMaterial.gridRatio = 120.0; // Minor lines: 10 feet (120 inches)
                    this.babylonGridMaterial.majorUnitFrequency = majorFreq; // Major lines: 40 feet
                    this.babylonGridMaterial.minorUnitVisibility = 0.25;
                    break;
            }
        }
    }

    // NEW GETTER for the Babylon.js camera
    getBabylonCamera() {
        return this.babylonCamera;
    }

    // NEW METHOD: Create a flat 3D mesh from a 2D shape object
    createFlatMeshFrom2DShape(shapeObject, scene) {
        if (!scene) {
            return null;
        }
        if (!shapeObject) {
            return null;
        }


        let mesh = null;
        const defaultFillColor = new BABYLON.Color3(0.85, 0.85, 0.85); // Light gray fill
        const materialAlpha = 1.0; // Solid fill

        switch (shapeObject.type) {
            case 'rectangle':
                const rectExtrusionDepth = 0.1; 
                const originalRectCenterX = shapeObject.x + shapeObject.width / 2;
                const originalRectCenterY_2D = shapeObject.y + shapeObject.height / 2; // This is 2D Y coordinate
                const extrusionCenterY_3D = rectExtrusionDepth / 2; // Mesh center along Y-axis

                // SPANKY: V23 - Based on "flipped vertically, then flipped horizontally" from V22 (-Y_2D, -X_2D)
                // If V22 (-Y_2D, -X_2D) was (-TargetX, -TargetZ), then TargetX = Y_2D and TargetZ = X_2D.
                const finalMeshPositionX_3D = originalRectCenterY_2D; // Was -originalRectCenterY_2D in V22
                const finalMeshPositionZ_3D = originalRectCenterX;  // Was -originalRectCenterX in V22


                mesh = BABYLON.MeshBuilder.CreateBox(`shape2D_rect_${shapeObject.id}`, {
                    width: shapeObject.width,
                    height: rectExtrusionDepth, 
                    depth: shapeObject.height,
                }, scene);
                // Set the calculated 3D position
                mesh.position = new BABYLON.Vector3(finalMeshPositionX_3D, extrusionCenterY_3D, finalMeshPositionZ_3D);
                
                // SPANKY: Local orientation (from previous step, assumed correct)
                // 1. "Turned over face down" - 180 deg around local X-axis
                const qFlipAroundX = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, Math.PI);
                // 2. "rotated 90 CLOCKWISE" - -90 deg around local Y-axis
                const qRotateAroundY = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -Math.PI / 2);

                // Apply flip first, then rotation: R_final = R_Y * R_X
                mesh.rotationQuaternion = qRotateAroundY.multiply(qFlipAroundX);
                
                const rectMaterial = new BABYLON.StandardMaterial(`mat_rect_${shapeObject.id}`, scene);
                rectMaterial.diffuseColor = defaultFillColor; 
                rectMaterial.alpha = materialAlpha;
                // rectMaterial.wireframe = true; // REMOVED - No longer full wireframe
                mesh.material = rectMaterial;

                // Add black outline
                mesh.enableEdgesRendering();
                mesh.edgesWidth = 4.0; // Adjust this value as needed for outline thickness
                mesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1); // Black color for edges
                
                break;

            case 'circle':
                const circleExtrusionDepth = 0.1; 
                // Ensure shapeObject.center and shapeObject.radius are valid numbers
                if (typeof shapeObject.center?.x !== 'number' || isNaN(shapeObject.center.x) ||
                    typeof shapeObject.center?.y !== 'number' || isNaN(shapeObject.center.y) ||
                    typeof shapeObject.radius !== 'number' || isNaN(shapeObject.radius) || shapeObject.radius <= 0) {
                    return null;
                }

                const circleCenterX = shapeObject.center.x;
                const circleCenterZ = shapeObject.center.y; // Map 2D Y to 3D Z
                const circleCenterY = circleExtrusionDepth / 2; // Mesh origin is at its center, so lift half its height

                // SPANKY V25: Apply V23 positional logic to circles for consistency with rectangles
                const finalCirclePosX_3D = shapeObject.center.y; // Map 2D Y to 3D X
                const finalCirclePosZ_3D = shapeObject.center.x; // Map 2D X to 3D Z


                mesh = BABYLON.MeshBuilder.CreateCylinder(`shape2D_circle_${shapeObject.id}`, {
                    diameter: shapeObject.radius * 2,
                    height: circleExtrusionDepth, 
                    tessellation: 32 
                }, scene);

                mesh.position = new BABYLON.Vector3(finalCirclePosX_3D, circleCenterY, finalCirclePosZ_3D);

                // SPANKY V25: Apply the same combined rotation as V23 rectangles
                // This assumes cylinders are oriented by default such that this makes sense.
                // Cylinders are created with height along their local Y axis.
                // Rectangles (boxes) are created aligned with world axes.
                // 1. "Turned over face down" - 180 deg around local X-axis
                const qCircleFlipAroundX = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, Math.PI);
                // 2. "rotated 90 CLOCKWISE" - -90 deg around local Y-axis
                const qCircleRotateAroundY = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, -Math.PI / 2);

                // Apply flip first, then rotation: R_final = R_Y * R_X
                // This is local rotation order. If cylinder is upright, Y rotation spins it, X rotation tumbles it.
                mesh.rotationQuaternion = qCircleRotateAroundY.multiply(qCircleFlipAroundX);
                
                const circleMaterial = new BABYLON.StandardMaterial(`mat_circle_${shapeObject.id}`, scene);
                circleMaterial.diffuseColor = defaultFillColor; 
                circleMaterial.alpha = materialAlpha;
                // circleMaterial.wireframe = true; // REMOVED - No longer full wireframe
                mesh.material = circleMaterial;

                // Add black outline
                mesh.enableEdgesRendering();
                mesh.edgesWidth = 4.0; // Adjust this value as needed
                mesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1); // Black color for edges

                break;

            case 'line':
                // Do not create a mesh for lines in 3D view.
                return null; 

            default:
                break;
        }
        return mesh;
    }

    createWoodworkingGrid() {
        // Create multiple grid planes for woodworking reference
        const gridSize = 50;
        const gridSpacing = 1; // 1 unit = 1 inch in woodworking
        
        // Main ground plane (XZ plane)
        const groundGrid = this.createGridPlane("ground", gridSize, gridSpacing, 
            new BABYLON.Vector3(0, 0, 0), 
            new BABYLON.Color3(0.4, 0.4, 0.6), 0.8);
        
        // Vertical reference plane (XY plane) - like a wall
        const wallGrid = this.createGridPlane("wall", gridSize, gridSpacing,
            new BABYLON.Vector3(0, gridSize/2, gridSize/2),
            new BABYLON.Color3(0.6, 0.4, 0.4), 0.3);
        wallGrid.rotation.x = Math.PI/2;
        
        // Side reference plane (YZ plane)
        const sideGrid = this.createGridPlane("side", gridSize, gridSpacing,
            new BABYLON.Vector3(gridSize/2, gridSize/2, 0),
            new BABYLON.Color3(0.4, 0.6, 0.4), 0.3);
        sideGrid.rotation.z = Math.PI/2;
        
        // Add reference objects for scale
        this.addWoodworkingReferences();
    }

    createGridPlane(name, size, spacing, position, color, opacity) {
        // Create a plane
        const plane = BABYLON.MeshBuilder.CreateGround(name, { width: size, height: size }, this.scene);
        plane.position = position;
        
        // Create grid material
        const material = new BABYLON.GridMaterial(name + "Mat", this.scene);
        material.gridRatio = spacing;
        material.majorUnitFrequency = 12; // Major lines every 12 units (1 foot)
        material.minorUnitVisibility = 0.7;
        material.lineColor = color;
        material.opacity = opacity;
        material.backFaceCulling = false;
        
        plane.material = material;
        return plane;
    }

    addWoodworkingReferences() {
        // Add a reference 2x4 lumber piece (1.5\\" x 3.5\\" x 8')
        const lumber = BABYLON.MeshBuilder.CreateBox("lumber", { 
            width: 1.5, 
            height: 3.5, 
            depth: 96 // 8 feet in inches
        }, this.scene);
        lumber.position = new BABYLON.Vector3(5, 1.75, 0);
        
        const lumberMaterial = new BABYLON.StandardMaterial("lumberMat", this.scene);
        lumberMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.4); // Wood color
        lumber.material = lumberMaterial;
        
        // Add a reference sheet of plywood (4' x 8' x 0.75\\")
        const plywood = BABYLON.MeshBuilder.CreateBox("plywood", {
            width: 48,
            height: 0.75,
            depth: 96
        }, this.scene);
        plywood.position = new BABYLON.Vector3(-10, 0.375, 0);
        
        const plywoodMaterial = new BABYLON.StandardMaterial("plywoodMat", this.scene);
        plywoodMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.5, 0.3);
        plywood.material = plywoodMaterial;
    }

    getFormattedSpacing(spacingInInches) {
        // Assclown, Spanky is formatting this spacing nicely for you!
        if (spacingInInches === undefined || spacingInInches === null || isNaN(spacingInInches)) {
            return "N/A";
        }

        const tolerance = 1e-5; // Tolerance for floating point comparisons

        // Check for common whole numbers first
        if (Math.abs(spacingInInches - Math.round(spacingInInches)) < tolerance && spacingInInches >= 1) {
            return `${Math.round(spacingInInches)}\\"`;
        }

        // Handle fractions (common woodworking sizes)
        const fractions = {
            "1/32": 1/32,
            "1/16": 1/16,
            "3/32": 3/32,
            "1/8": 1/8,
            "5/32": 5/32,
            "3/16": 3/16,
            "7/32": 7/32,
            "1/4": 1/4,
            "5/16": 5/16,
            "3/8": 3/8,
            "7/16": 7/16,
            "1/2": 1/2,
            "9/16": 9/16,
            "5/8": 5/8,
            "11/16": 11/16,
            "3/4": 3/4,
            "13/16": 13/16,
            "7/8": 7/8,
            "15/16": 15/16
        };

        for (const [fractionStr, decimalVal] of Object.entries(fractions)) {
            if (Math.abs(spacingInInches - decimalVal) < tolerance) {
                return `${fractionStr}\\"`;
            }
        }
        
        // Fallback for other decimal values (e.g., if it's not a standard fraction)
        // Show up to 3 decimal places if it's not a recognized fraction or whole number
        if (spacingInInches < 1) {
            return `${parseFloat(spacingInInches.toFixed(3))}\\"`;
        }
        
        // If it's a larger number not caught by whole number check (e.g. 2.5)
        return `${parseFloat(spacingInInches.toFixed(2))}\\"`;
    }

    snapToGrid(worldX, worldY) {
        if (!this.minorSpacing || this.minorSpacing <= 0) {
            return { x: worldX, y: worldY };
        }
        const snappedX = Math.round(worldX / this.minorSpacing) * this.minorSpacing;
        const snappedY = Math.round(worldY / this.minorSpacing) * this.minorSpacing;
        return { x: snappedX, y: snappedY };
    }    // Create Shapr3D-style colored axis lines emanating from origin
    createOriginAxisLines() {
        if (!this.scene) {
            return;
        }

        const axisLength = 200; // Much longer axis lines - extend far in each direction
        const lineWidth = 3;    // Slightly thicker for better visibility
        
        // X-axis line (Red) - extends along positive X direction
        const xAxisPoints = [
            new BABYLON.Vector3(0, 0, 0),           // Origin
            new BABYLON.Vector3(axisLength, 0, 0)   // Positive X direction
        ];
        const xAxisLine = BABYLON.MeshBuilder.CreateLines("xAxis", {
            points: xAxisPoints,
            width: lineWidth
        }, this.scene);
        
        // Create red material for X-axis
        const xAxisMaterial = new BABYLON.StandardMaterial("xAxisMat", this.scene);
        xAxisMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Dim red
        xAxisMaterial.disableLighting = true; // Make it always visible
        xAxisLine.material = xAxisMaterial;
        xAxisLine.color = new BABYLON.Color3(0.8, 0.2, 0.2); // Fallback color for lines
        

        // Y-axis line (Green) - extends along positive Y direction  
        const yAxisPoints = [
            new BABYLON.Vector3(0, 0, 0),           // Origin
            new BABYLON.Vector3(0, axisLength, 0)   // Positive Y direction
        ];
        const yAxisLine = BABYLON.MeshBuilder.CreateLines("yAxis", {
            points: yAxisPoints,
            width: lineWidth
        }, this.scene);
        
        // Create green material for Y-axis
        const yAxisMaterial = new BABYLON.StandardMaterial("yAxisMat", this.scene);
        yAxisMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Dim green
        yAxisMaterial.disableLighting = true;
        yAxisLine.material = yAxisMaterial;
        yAxisLine.color = new BABYLON.Color3(0.2, 0.8, 0.2); // Fallback color for lines
        

        // Z-axis line (Blue) - extends along positive Z direction
        const zAxisPoints = [
            new BABYLON.Vector3(0, 0, 0),           // Origin
            new BABYLON.Vector3(0, 0, axisLength)   // Positive Z direction
        ];
        const zAxisLine = BABYLON.MeshBuilder.CreateLines("zAxis", {
            points: zAxisPoints,
            width: lineWidth
        }, this.scene);
        
        // Create blue material for Z-axis
        const zAxisMaterial = new BABYLON.StandardMaterial("zAxisMat", this.scene);
        zAxisMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.8); // Dim blue
        zAxisMaterial.disableLighting = true;
        zAxisLine.material = zAxisMaterial;
        zAxisLine.color = new BABYLON.Color3(0.2, 0.2, 0.8); // Fallback color for lines
        
        
        // Store references for potential future use
        this.xAxisLine = xAxisLine;
        this.yAxisLine = yAxisLine;
        this.zAxisLine = zAxisLine;
        
    }

    // Method to set initial camera position (called after setup to override any restoration)
    setInitialCameraPosition() {
        if (!this.babylonCamera) {
            return;
        }
        
        
        // Set Master's specified position: X=30", Y=16", Z=-90"
        const targetPosition = new BABYLON.Vector3(0, 0, 0); // Origin
        const cameraPosition = new BABYLON.Vector3(30, 16, -90); // Master's position
        
        // Set the camera to look at origin from the specified position
        this.babylonCamera.setTarget(targetPosition);
        this.babylonCamera.position = cameraPosition;
        
        // Force the camera to update its internal state
        this.babylonCamera.rebuildAnglesAndRadius();
        
    }
}
