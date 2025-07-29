export class SketchMode {
    constructor(scene, camera, shape2D, drawingWorld) {
        this.scene = scene;
        this.camera = camera;
        this.shape2D = shape2D;
        this.drawingWorld = drawingWorld;
        this.sketchToolSelected = false;
        this.waitingForSurface = false;
        this.isSketchMode = false;
        this.isSketchEnabled = false; // DISABLED: Sketch functionality is currently disabled
        this.currentSketch = null;
        this.sketchForward = null;
        this.sketchRight = null;
        this.sketchUp = null;
        this.sketchOrigin = null;
        this.currentSketchSurface = null;
        this.currentSketchPlane = null;
        this.closedShapes = [];
        this.defaultSketchTarget = null;
        this.sketchGrid = null;
        
        // Mouse handler references
        this.sketchMouseDownHandler = null;
        this.sketchMouseUpHandler = null;
        this.sketchMoveHandler = null;
        this.sketchEscapeHandler = null;
        
        // Mouse tracking for drag detection
        this.mouseDownTime = 0;
        this.mouseDownPos = null;
        this.isDragging = false;
        
        // Camera state for sketch mode
        this.sketchCameraState = {
            isPanning: false,
            lastX: 0,
            lastY: 0
        };
    }

    enterSketchMode(mesh, pickPoint, surfaceNormal) {
        // DISABLED: Sketch functionality is currently disabled
        if (!this.isSketchEnabled) {
            console.log('SketchMode: Sketch functionality is disabled');
            return;
        }
        
        this.currentSketchSurface = {
            mesh: mesh,
            point: pickPoint,
            normal: surfaceNormal.normalize()
        };
        this.isSketchMode = true;
        
        // Update UI
        this.drawingWorld.setMode('sketch');
        
        // STEP 1: Create coordinate system for the surface
        this.createSketchCoordinateSystem(surfaceNormal);
        
        // STEP 2: Animate camera to surface position
        this.drawingWorld.animateCameraToSurface(pickPoint, surfaceNormal, () => {
            // STEP 3: After camera animation completes, create grid and enable tools
            this.createSketchEnvironment();
        });
    }

    exitSketchMode() {
        // Check for closed geometry before exiting
        if (this.currentSketch && this.currentSketch.elements) {
            this.drawingWorld.processSketchGeometry();
            // Preserve shapes for next sketch session
            this.closedShapes = this.currentSketch.elements;
        }
        
        this.isSketchMode = false;
        this.currentSketchPlane = null;
        this.currentSketch = null;
        
        // Return to modeling mode - this will restore the Sketch tool button
        this.drawingWorld.setMode('model');
        
        // Reset sketch tool selection state
        this.sketchToolSelected = false;
        this.waitingForSurface = false;
        
        // Hide any sketch targets that might still be visible
        this.hideSketchTargets();
        
        // Remove sketch mouse handlers
        if (this.sketchMouseDownHandler) {
            this.drawingWorld.canvas.removeEventListener('mousedown', this.sketchMouseDownHandler, true);
            this.sketchMouseDownHandler = null;
        }
        
        if (this.sketchMouseUpHandler) {
            this.drawingWorld.canvas.removeEventListener('mouseup', this.sketchMouseUpHandler, true);
            this.sketchMouseUpHandler = null;
        }
        
        if (this.sketchMoveHandler) {
            this.drawingWorld.canvas.removeEventListener('mousemove', this.sketchMoveHandler, true);
            this.sketchMoveHandler = null;
        }
        
        // Remove escape key handler
        if (this.sketchEscapeHandler) {
            document.removeEventListener('keydown', this.sketchEscapeHandler);
            this.sketchEscapeHandler = null;
        }
        
        // Re-enable camera controls
        this.camera.attachControl(this.drawingWorld.canvas, true);
        
        // Show main grid again
        if (this.drawingWorld.gridSystem && this.drawingWorld.gridSystem.gridGround) {
            this.drawingWorld.gridSystem.gridGround.setEnabled(true);
        }
        
        // Clean up sketch plane grid
        if (this.sketchGrid) {
            this.sketchGrid.dispose();
            this.sketchGrid = null;
        }
        
        // Restore mesh visibility
        this.scene.meshes.forEach(mesh => {
            if (mesh.material && mesh.material.alpha !== undefined) {
                mesh.material.alpha = 1.0;
            }
        });
    }

    createSketchEnvironment() {
        // Initialize sketching system - preserve existing elements if any
        this.currentSketch = {
            surface: this.currentSketchSurface,
            elements: this.closedShapes || [], // Preserve existing shapes
            isDrawing: false,
            currentTool: 'line',
            // Reset tool-specific state
            startPoint: null,
            trianglePoints: []
        };
        
        // Create sketch plane grid with fade-in effect
        this.createSketchPlaneGrid();
        
        // Add sketch drawing toolbar
        this.showSketchToolbar();
        
        // Set up mouse handlers for sketching
        this.setupSketchingMouseHandlers();
    }

    showSketchToolbar() {
        // Add sketch tools to the toolbar
        const toolbar = document.querySelector('.toolbar');
        
        // Clear existing tools
        toolbar.innerHTML = '';
        
        // Add sketch tools
        const tools = [
            { name: 'line', label: 'Line', icon: '📏' },
            { name: 'rectangle', label: 'Rectangle', icon: '▭' },
            { name: 'circle', label: 'Circle', icon: '○' },
            { name: 'ellipse', label: 'Ellipse', icon: '⬭' },
            { name: 'triangle', label: 'Triangle', icon: '△' },
            { name: 'exit', label: 'Exit Sketch', icon: '✓' }
        ];
        
        tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn';
            btn.id = `${tool.name}-tool`;
            btn.innerHTML = `${tool.icon} ${tool.label}`;
            
            if (tool.name === 'line') {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                if (tool.name === 'exit') {
                    this.exitSketchMode();
                } else {
                    this.selectSketchTool(tool.name);
                }
            });
            
            toolbar.appendChild(btn);
        });
    }

    selectSketchTool(toolName) {
        console.log('selectSketchTool called with toolName:', toolName);
        
        if (toolName === 'sketch') {
            // Sketch tool selected - enter surface selection mode
            this.sketchToolSelected = true;
            this.waitingForSurface = true;
            
            // Show the 3 default sketch planes
            this.showSketchTargets();
            
            // Update mode indicator
            const modeIndicator = document.getElementById('mode-indicator');
            if (modeIndicator) {
                modeIndicator.textContent = 'Select a surface for sketching';
            }
            
            // Update properties panel
            const selectionInfo = document.getElementById('selection-info');
            if (selectionInfo) {
                selectionInfo.textContent = 'Click on a flat surface to create a sketch';
            }
            
        } else if (toolName === 'exit-sketch') {
            // Exit sketch mode
            this.exitSketchMode();
            
        } else if (toolName === 'extrude') {
            // Activate extrude tool
            console.log('EXTRUDE TOOL ACTIVATED! selectedFace:', this.drawingWorld.selectedFace?.name);
            this.drawingWorld.activeTool = 'extrude';
            
            // Update button visual state
            this.drawingWorld.updateToolButtonStates();
            
            if (this.drawingWorld.selectedFace) {
                console.log('Starting extrusion for face:', this.drawingWorld.selectedFace.name);
                this.drawingWorld.startBidirectionalExtrusion(this.drawingWorld.selectedFace);
            }
            
        } else {
            // Deselect sketch tool - this exits surface selection mode
            if (this.sketchToolSelected) {
                this.sketchToolSelected = false;
                this.waitingForSurface = false;
                
                // Hide sketch targets
                this.hideSketchTargets();
                
                // Reset mode indicator
                const modeIndicator = document.getElementById('mode-indicator');
                if (modeIndicator) {
                    modeIndicator.textContent = '3D Modeling';
                }
                
                // Reset properties panel
                const selectionInfo = document.getElementById('selection-info');
                if (selectionInfo) {
                    selectionInfo.textContent = 'Nothing selected';
                }
                
                // Handle regular sketch drawing tools if in sketch mode
                if (this.drawingWorld.currentMode === 'sketch' && this.currentSketch) {
                    this.currentSketch.currentTool = toolName;
                }
            }
        }
    }

    enterSketchModeOnSurface(mesh, pickPoint, normal) {
        // Clear sketch tool selection state
        this.sketchToolSelected = false;
        this.waitingForSurface = false;
        
        // Hide the sketch targets
        this.hideSketchTargets();
        
        // Deselect the sketch tool button
        document.querySelectorAll('[data-tool="sketch"]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // For the cube, just use the position + half size in the normal direction
        const cubePosition = mesh.position;
        const cubeSize = 4; // 8cm cube = 4cm from center to face
        
        const faceCenter = cubePosition.add(normal.scale(cubeSize));
        
        this.drawingWorld.setMode('sketch');
        this.enterSketchMode(mesh, faceCenter, normal);
    }

    createDefaultSketchTarget() {
        // UNITS: 1 unit = 1 cm
        const cubeSize = 8; // 8cm cube for easy selection
        
        // Force dispose any existing cube first
        const existingCube = this.scene.getMeshByName('sketchTarget');
        if (existingCube) {
            existingCube.dispose();
        }
        
        // Create completely solid target material with new name
        const targetMaterial = new BABYLON.StandardMaterial('solidCubeMaterial_' + Date.now(), this.scene);
        targetMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8); // Solid dark blue
        targetMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        targetMaterial.backFaceCulling = false;
        targetMaterial.disableLighting = false;
        
        // Create the cube - this is just the default target, any geometry can be used
        const sketchTarget = BABYLON.MeshBuilder.CreateBox('sketchTarget', {
            size: cubeSize
        }, this.scene);
        
        sketchTarget.material = targetMaterial;
        sketchTarget.position = new BABYLON.Vector3(0, cubeSize / 2, 0); // Rest on ground
        sketchTarget.isPickable = true;
        
        // Start disabled - will be enabled when showing targets
        sketchTarget.setEnabled(false);
        
        this.defaultSketchTarget = sketchTarget;
        
        return sketchTarget;
    }

    showSketchTargets() {
        // Show default sketch target if no other geometry exists
        if (!this.defaultSketchTarget) {
            this.createDefaultSketchTarget();
        }
        
        // Enable and animate the target to fade in
        this.defaultSketchTarget.setEnabled(true);
        
        // Start with alpha 0 and animate to solid
        const material = this.defaultSketchTarget.material;
        const targetAlpha = 1.0; // Solid opacity
        material.alpha = 0;
        
        // Animate fade in
        BABYLON.Animation.CreateAndStartAnimation(
            'fadeInSketchTarget',
            material,
            'alpha',
            60, // 60 fps
            30, // 0.5 seconds
            0,  // start alpha
            targetAlpha, // end alpha
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            null,
            null
        );
    }

    hideSketchTargets() {
        // Hide default sketch target
        if (this.defaultSketchTarget && this.defaultSketchTarget.isEnabled()) {
            const material = this.defaultSketchTarget.material;
            
            // Animate fade out
            BABYLON.Animation.CreateAndStartAnimation(
                'fadeOutSketchTarget',
                material,
                'alpha',
                60, // 60 fps
                15, // 0.25 seconds (faster fade out)
                material.alpha, // current alpha
                0,  // end alpha
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                null,
                () => {
                    // Disable the target after animation
                    this.defaultSketchTarget.setEnabled(false);
                }
            );
        }
    }

    isMeshSketchable(mesh) {
        // Basic requirements for any sketchable surface
        if (!mesh || !mesh.isPickable || !mesh.isEnabled()) {
            return false;
        }
        
        // Exclude system meshes (grid, axes, etc.)
        const systemMeshNames = ['sketchGround', 'gridGround', 'gridGroundBelow', 'xAxis', 'yAxis', 'zAxis'];
        if (systemMeshNames.includes(mesh.name)) {
            return false;
        }
        
        // Exclude sketch preview meshes
        if (mesh.name.includes('Preview') || mesh.name.includes('preview')) {
            return false;
        }
        
        // Any other mesh with proper geometry is sketchable
        // This includes: default sketch targets, user-created geometry, imported models, etc.
        return true;
    }

    setupSketchingMouseHandlers() {
        // Track mouse down/up for drag detection
        this.mouseDownTime = 0;
        this.mouseDownPos = null;
        this.isDragging = false;
        
        // Unified mouse down handler for both drawing and camera
        this.sketchMouseDownHandler = (e) => {
            if (!this.isSketchMode) return;
            
            // Prevent Babylon.js from handling this event
            e.preventDefault();
            e.stopPropagation();
            
            if (e.button === 0) {
                // Left click - drawing
                this.mouseDownTime = Date.now();
                this.mouseDownPos = { x: e.clientX, y: e.clientY };
                this.isDragging = false;
            } else if (e.button === 2) {
                // Right click - start camera panning
                this.sketchCameraState.isPanning = true;
                this.sketchCameraState.lastX = e.clientX;
                this.sketchCameraState.lastY = e.clientY;
                
                // Disable default camera controls during sketch mode
                this.camera.detachControl(this.drawingWorld.canvas);
            }
        };
        
        // Add the event listener with capture=true to intercept before Babylon.js
        this.drawingWorld.canvas.addEventListener('mousedown', this.sketchMouseDownHandler, true);
        
        // Set up other mouse handlers...
        this.setupSketchMouseUpHandler();
        this.setupSketchMouseMoveHandler();
        this.setupSketchEscapeHandler();
    }

    handleBabylonPointerDown(pointerInfo) {
        try {
            const event = pointerInfo.event;
            
            // Handle surface selection for sketch tool
            if (this.waitingForSurface && event.button === 0) {
                const rect = this.drawingWorld.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // Pick any surface in the scene
                const pickInfo = this.scene.pick(x, y, (mesh) => {
                    // Accept any pickable mesh that could be a surface, including default sketch planes
                    const isValid = mesh.isPickable && mesh.name !== 'sketchGround';
                    return isValid;
                });
                
                if (pickInfo.hit && this.isMeshSketchable(pickInfo.pickedMesh)) {
                    this.enterSketchModeOnSurface(pickInfo.pickedMesh, pickInfo.pickedPoint, pickInfo.getNormal());
                    return; // Stop processing - we handled the surface selection
                }
            }
            
            // Handle regular sketch drawing if in sketch mode
            if (this.isSketchMode && this.currentSketch && event.button === 0) {
                console.log('LEFT CLICK - sketch mode:', this.isSketchMode, 'current tool:', this.currentSketch?.currentTool);
                
                const rect = this.drawingWorld.canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // Convert screen coordinates to sketch plane coordinates
                const pickInfo = this.scene.pick(x, y);
                if (pickInfo.hit) {
                    this.handleSketchClick(pickInfo.pickedPoint);
                }
            }
            
        } catch (error) {
            console.error('Error in handleBabylonPointerDown:', error);
        }
    }

    handleBabylonPointerUp(pointerInfo) {
        const event = pointerInfo.event;
        
        if (event.button === 0) {
            // Left click - drawing
            const timeDiff = Date.now() - this.mouseDownTime;
            const posDiff = this.mouseDownPos ? 
                Math.sqrt(Math.pow(event.clientX - this.mouseDownPos.x, 2) + 
                         Math.pow(event.clientY - this.mouseDownPos.y, 2)) : 0;
            
            // Reset drag state
            this.isDragging = false;
            
        } else if (event.button === 2) {
            // Right click - stop camera panning
            this.sketchCameraState.isPanning = false;
        }
    }

    handleBabylonPointerMove(pointerInfo) {
        const event = pointerInfo.event;
        
        // Handle camera panning
        if (this.sketchCameraState.isPanning) {
            const deltaX = event.clientX - this.sketchCameraState.lastX;
            const deltaY = event.clientY - this.sketchCameraState.lastY;
            
            // Pan along the sketch plane
            const panSensitivity = 0.01;
            const panVector = this.sketchRight.scale(-deltaX * panSensitivity)
                .add(this.sketchUp.scale(deltaY * panSensitivity));
            
            this.camera.position = this.camera.position.add(panVector);
            this.camera.setTarget(this.camera.getTarget().add(panVector));
            
            this.sketchCameraState.lastX = event.clientX;
            this.sketchCameraState.lastY = event.clientY;
        }
    }

    getSketchElements() {
        if (this.currentSketch) {
            return this.currentSketch.elements;
        }
        return [];
    }

    // Helper methods for setting up mouse handlers
    setupSketchMouseUpHandler() {
        this.sketchMouseUpHandler = (e) => {
            if (!this.isSketchMode) return;
            
            if (e.button === 2) {
                // Right click - stop camera panning
                this.sketchCameraState.isPanning = false;
            }
        };
        
        this.drawingWorld.canvas.addEventListener('mouseup', this.sketchMouseUpHandler, true);
    }
    
    setupSketchMouseMoveHandler() {
        this.sketchMoveHandler = (e) => {
            if (!this.isSketchMode) return;
            
            // Handle camera panning
            if (this.sketchCameraState.isPanning) {
                const deltaX = e.clientX - this.sketchCameraState.lastX;
                const deltaY = e.clientY - this.sketchCameraState.lastY;
                
                // Pan along the sketch plane if coordinates are established
                if (this.sketchRight && this.sketchUp) {
                    const panSensitivity = 0.01;
                    const panVector = this.sketchRight.scale(-deltaX * panSensitivity)
                        .add(this.sketchUp.scale(deltaY * panSensitivity));
                    
                    this.camera.position = this.camera.position.add(panVector);
                    this.camera.setTarget(this.camera.getTarget().add(panVector));
                }
                
                this.sketchCameraState.lastX = e.clientX;
                this.sketchCameraState.lastY = e.clientY;
            }
        };
        
        this.drawingWorld.canvas.addEventListener('mousemove', this.sketchMoveHandler, true);
    }
    
    setupSketchEscapeHandler() {
        this.sketchEscapeHandler = (e) => {
            if (e.key === 'Escape' && this.isSketchMode) {
                e.preventDefault();
                e.stopPropagation();
                
                if (this.currentSketch && this.currentSketch.isDrawing) {
                    // Cancel current drawing operation
                    this.currentSketch.isDrawing = false;
                } else {
                    this.exitSketchMode();
                }
            }
        };
        document.addEventListener('keydown', this.sketchEscapeHandler);
    }
    
    createSketchCoordinateSystem(surfaceNormal) {
        // Create a robust coordinate system for any surface orientation
        const normal = surfaceNormal.normalize();
        
        // Choose the most stable reference vector based on the normal
        let up = new BABYLON.Vector3(0, 1, 0); // World up
        
        // If surface normal is nearly vertical, use a different reference
        const dotProduct = Math.abs(BABYLON.Vector3.Dot(normal, up));
        
        if (dotProduct > 0.9) {
            up = new BABYLON.Vector3(1, 0, 0); // World X if normal is too close to Y
        }
        
        // Create orthonormal basis using Gram-Schmidt process
        this.sketchForward = normal.clone(); // Surface normal points "out" from surface
        this.sketchRight = BABYLON.Vector3.Cross(up, this.sketchForward);
        this.sketchRight.normalize();
        this.sketchUp = BABYLON.Vector3.Cross(this.sketchForward, this.sketchRight);
        this.sketchUp.normalize();
        
        // Set sketch origin to the picked point
        this.sketchOrigin = this.currentSketchSurface.point.clone();
    }
    
    createSketchPlaneGrid() {
        // DISABLED: Sketch functionality is currently disabled - don't hide main grid
        if (!this.isSketchEnabled) {
            return;
        }
        
        // Remove existing sketch grid if it exists
        if (this.sketchGrid) {
            this.sketchGrid.dispose();
            this.sketchGrid = null;
        }
        
        // Hide the main grid when in sketch mode
        if (this.drawingWorld.gridSystem && this.drawingWorld.gridSystem.gridGround) {
            this.drawingWorld.gridSystem.gridGround.setEnabled(false);
        }
        
        // DIM NON-SKETCH MESHES BUT KEEP THEM VISIBLE FOR REFERENCE
        this.scene.meshes.forEach(mesh => {
            // Keep sketch shapes visible (rectangles, circles, etc.)
            const isSketchShape = mesh.name.includes('sketch') || mesh.name.includes('Sketch');
            
            if (!isSketchShape && mesh.material && mesh.name !== 'sketchTarget') {
                // Dim other meshes to 30% opacity for reference
                mesh.material.alpha = 0.3;
            }
        });
    }
    
    handleSketchClick(worldPoint) {
        // Convert world point to sketch plane coordinates and handle drawing
        if (!this.currentSketch || !this.sketchOrigin) return;
        
        // This would contain the actual sketch drawing logic
        // For now, just log the click
        console.log('Sketch click at world point:', worldPoint);
    }
    
    dispose() {
        // Clean up all resources
        if (this.defaultSketchTarget) {
            this.defaultSketchTarget.dispose();
            this.defaultSketchTarget = null;
        }
        
        if (this.sketchGrid) {
            this.sketchGrid.dispose();
            this.sketchGrid = null;
        }
        
        // Remove event listeners
        if (this.sketchMouseDownHandler) {
            this.drawingWorld.canvas.removeEventListener('mousedown', this.sketchMouseDownHandler, true);
        }
        if (this.sketchMouseUpHandler) {
            this.drawingWorld.canvas.removeEventListener('mouseup', this.sketchMouseUpHandler, true);
        }
        if (this.sketchMoveHandler) {
            this.drawingWorld.canvas.removeEventListener('mousemove', this.sketchMoveHandler, true);
        }
        if (this.sketchEscapeHandler) {
            document.removeEventListener('keydown', this.sketchEscapeHandler);
        }
    }
}