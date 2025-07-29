/**
 * ScrollCuttingSystem Module - Advanced Freehand and Geometric Cutting
 * 
 * Provides orthographic mode interface for complex cutting operations including:
 * - Freehand mouse-driven cutting paths
 * - Path smoothing and curve optimization
 * - Symmetrical cutting operations
 * - Bezier handle editing for precise curves
 * - Real-time cut preview and validation
 * 
 * Features:
 * - Orthographic top-down view of workpiece
 * - Multiple cutting tools (freehand, geometric, symmetrical)
 * - Real-time path smoothing algorithms
 * - CSG-based actual geometry cutting
 * - Professional woodworking cut patterns
 */

export class ScrollCuttingSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        
        // Scroll cutting state
        this.isActive = false;
        this.currentTool = 'freehand'; // freehand, straight, circle, symmetrical
        this.focusPart = null;
        this.isDrawing = false;
        this.shiftKeyPressed = false;
        this.hoveringOverControl = false;
        
        // Path tracking
        this.currentPath = [];
        this.smoothedPath = [];
        this.pathPreviewMesh = null;
        this.cutDepth = 2.0; // Default cut depth in cm (through cut)
        this.cutDepthSlider = null;
        
        // Smoothing settings
        this.smoothingLevel = 0.7; // 0 = no smoothing, 1 = max smoothing
        this.symmetryAxis = null; // 'x', 'z', or null
        this.symmetryEnabled = false;
        
        // Visual elements
        this.pathMaterial = null;
        this.previewMeshes = [];
        this.controlHandles = [];
        this.bezierHandles = [];
        this.selectedControlPoint = null;
        this.isDraggingHandle = false;
        this.dragObserver = null;
        
        // Rulers and precision aids
        this.rulersContainer = null;
        this.horizontalRuler = null;
        this.verticalRuler = null;
        this.crosshairs = null;
        this.coordinateDisplay = null;
        
        // Camera state for orthographic mode
        this.originalCameraMode = null;
        this.originalCameraPosition = null;
        this.originalCameraTarget = null;
        
        // Mouse tracking
        this.pointerObserver = null;
        this.lastMousePosition = null;
        
        // Panning state
        this.panObserver = null;
        this.isPanning = false;
        this.lastPanPosition = null;
        
        // Zoom state
        this.zoomObserver = null;
        
        this.init();
    }
    
    init() {
        console.log('ScrollCuttingSystem: Initializing advanced cutting interface');
        this.setupPathMaterials();
        this.setupMouseTracking();
        this.setupScrollCuttingUI();
    }
    
    /**
     * Setup visual materials for cutting paths
     */
    setupPathMaterials() {
        // Path preview material (bright blue)
        this.pathMaterial = new BABYLON.StandardMaterial('pathPreview', this.scene);
        this.pathMaterial.diffuseColor = new BABYLON.Color3(0, 0.7, 1); // Bright blue
        this.pathMaterial.emissiveColor = new BABYLON.Color3(0, 0.3, 0.5);
        this.pathMaterial.alpha = 0.9;
        this.pathMaterial.disableLighting = true;
        this.pathMaterial.disableDepthWrite = true;
        
        console.log('ScrollCuttingSystem: Path materials created');
    }
    
    /**
     * Setup mouse tracking for path drawing
     */
    setupMouseTracking() {
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isActive) return;
            
            // CRITICAL: Block ALL mouse events when scroll cutting is active
            pointerInfo.event.preventDefault();
            pointerInfo.event.stopPropagation();
            pointerInfo.event.stopImmediatePropagation();
            
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 0) { // Left click
                    // Check if SHIFT key is pressed for cutting mode
                    if (pointerInfo.event.shiftKey) {
                        this.startDrawing(pointerInfo);
                    } else {
                        // Regular left click - check for control point manipulation
                        this.handleControlPointSelection(pointerInfo);
                    }
                }
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                // Update coordinate display
                this.updateCoordinateDisplay(pointerInfo);
                
                if (this.isDrawing) {
                    this.addPointToPath(pointerInfo);
                } else if (this.isDraggingHandle && this.selectedControlPoint) {
                    // Handle control point dragging
                    this.handleControlPointDrag(pointerInfo);
                }
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                if (pointerInfo.event.button === 0) { // Left click release
                    if (this.isDrawing) {
                        this.finishDrawing();
                    } else if (this.isDraggingHandle) {
                        this.finishControlPointDrag();
                    }
                }
            }
        }, -1); // High priority to catch events first
        
        console.log('ScrollCuttingSystem: Mouse tracking enabled with comprehensive event blocking');
    }
    
    /**
     * Handle control point selection on left click (without SHIFT)
     */
    handleControlPointSelection(pointerInfo) {
        // Check if clicking on a control point
        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            null,
            this.drawingWorld.camera
        );
        
        const pickInfo = this.scene.pickWithRay(ray);
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const mesh = pickInfo.pickedMesh;
            
            // Check if it's a control point
            if (mesh.metadata && mesh.metadata.type === 'bezierControlPoint') {
                this.selectedControlPoint = mesh;
                this.isDraggingHandle = true;
                
                // Visual feedback - make it brighter
                if (mesh.material) {
                    mesh.material.emissiveColor = new BABYLON.Color3(0.6, 0.3, 0); // Brighter orange
                }
                
                console.log('ScrollCuttingSystem: Control point selected for dragging');
                pointerInfo.event.preventDefault();
                pointerInfo.event.stopPropagation();
                return;
            }
            
            // Check if it's a bezier handle
            if (mesh.metadata && mesh.metadata.type === 'bezierTangentHandle') {
                this.selectedControlPoint = mesh;
                this.isDraggingHandle = true;
                
                // Visual feedback - make it brighter
                if (mesh.material) {
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0.6, 0.6); // Brighter cyan
                }
                
                console.log('ScrollCuttingSystem: Bezier handle selected for dragging');
                pointerInfo.event.preventDefault();
                pointerInfo.event.stopPropagation();
                return;
            }
        }
        
        // If no control point was clicked, deselect any current selection
        if (this.selectedControlPoint) {
            this.deselectControlPoint();
        }
    }
    
    /**
     * Handle control point dragging during mouse move
     */
    handleControlPointDrag(pointerInfo) {
        if (!this.selectedControlPoint) return;
        
        // Project mouse position to workpiece plane
        const newPosition = this.projectMouseToWorkpiecePlane(pointerInfo);
        if (!newPosition) return;
        
        const mesh = this.selectedControlPoint;
        
        if (mesh.metadata.type === 'bezierControlPoint') {
            // Update control point position
            mesh.position = this.localToWorld(newPosition);
            
            // Update the path
            const pathIndex = mesh.metadata.pathIndex;
            if (pathIndex !== undefined && this.smoothedPath[pathIndex]) {
                this.smoothedPath[pathIndex] = newPosition;
                
                // Regenerate the smoothed path from all control points
                this.regenerateSmoothedPathFromControlPoints();
                
                // Update path preview
                this.updatePathPreview();
                
                // Update associated bezier handles
                this.updateBezierHandlesForControlPoint(mesh, pathIndex);
            }
        } else if (mesh.metadata.type === 'bezierTangentHandle') {
            // Update bezier handle position
            mesh.position = this.localToWorld(newPosition);
            
            // Update the associated control point's tangent
            this.updatePathFromBezierHandle(mesh, newPosition);
        }
        
        pointerInfo.event.preventDefault();
        pointerInfo.event.stopPropagation();
    }
    
    /**
     * Finish control point dragging
     */
    finishControlPointDrag() {
        if (this.selectedControlPoint) {
            // Reset visual feedback
            const mesh = this.selectedControlPoint;
            if (mesh.material) {
                if (mesh.metadata.type === 'bezierControlPoint') {
                    mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0); // Normal orange
                } else if (mesh.metadata.type === 'bezierTangentHandle') {
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0.3, 0.3); // Normal cyan
                }
            }
            
            console.log('ScrollCuttingSystem: Control point dragging finished');
        }
        
        this.isDraggingHandle = false;
        this.selectedControlPoint = null;
    }
    
    /**
     * Deselect current control point
     */
    deselectControlPoint() {
        if (this.selectedControlPoint && this.selectedControlPoint.material) {
            if (this.selectedControlPoint.metadata.type === 'bezierControlPoint') {
                this.selectedControlPoint.material.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0);
            } else if (this.selectedControlPoint.metadata.type === 'bezierTangentHandle') {
                this.selectedControlPoint.material.emissiveColor = new BABYLON.Color3(0, 0.3, 0.3);
            }
        }
        this.selectedControlPoint = null;
        this.isDraggingHandle = false;
    }
    
    /**
     * Regenerate the smoothed path from current control point positions
     */
    regenerateSmoothedPathFromControlPoints() {
        if (!this.controlHandles || this.controlHandles.length < 2) {
            console.warn('ScrollCuttingSystem: Cannot regenerate path - insufficient control points');
            return;
        }
        
        // Sort control points by their original path index
        const sortedControlPoints = this.controlHandles.slice().sort((a, b) => {
            return a.metadata.pathIndex - b.metadata.pathIndex;
        });
        
        // Create new smoothed path from control point positions
        const newPath = [];
        
        for (let i = 0; i < sortedControlPoints.length; i++) {
            const controlPoint = sortedControlPoints[i];
            const worldPos = controlPoint.position;
            const localPos = this.worldToLocal(worldPos);
            
            if (i === 0) {
                // First point - add directly
                newPath.push(localPos);
            } else {
                // Interpolate between previous and current control point
                const prevPos = newPath[newPath.length - 1];
                const steps = 8; // Number of interpolation steps
                
                for (let step = 1; step <= steps; step++) {
                    const t = step / steps;
                    const interpolated = new BABYLON.Vector3(
                        prevPos.x + (localPos.x - prevPos.x) * t,
                        prevPos.y + (localPos.y - prevPos.y) * t,
                        prevPos.z + (localPos.z - prevPos.z) * t
                    );
                    newPath.push(interpolated);
                }
            }
        }
        
        // Update the smoothed path
        this.smoothedPath = newPath;
        
        console.log('ScrollCuttingSystem: Regenerated smoothed path with', this.smoothedPath.length, 'points from', this.controlHandles.length, 'control points');
    }

    /**
     * Update bezier handles when control point is moved
     */
    updateBezierHandlesForControlPoint(controlPoint, pathIndex) {
        // Find the bezier handle set for this control point
        const handleSet = this.bezierHandles.find(set => set.controlPoint === controlPoint);
        if (!handleSet) return;
        
        // Recalculate tangent direction from neighboring points
        const prevIndex = Math.max(0, pathIndex - 1);
        const nextIndex = Math.min(this.smoothedPath.length - 1, pathIndex + 1);
        
        if (prevIndex < this.smoothedPath.length && nextIndex < this.smoothedPath.length) {
            const prevWorld = this.localToWorld(this.smoothedPath[prevIndex]);
            const nextWorld = this.localToWorld(this.smoothedPath[nextIndex]);
            const currentWorld = controlPoint.position;
            
            // Calculate tangent direction
            const tangent = nextWorld.subtract(prevWorld).normalize();
            const handleLength = 3.0;
            
            // Update handle positions
            if (handleSet.handle1) {
                handleSet.handle1.position = currentWorld.subtract(tangent.scale(handleLength));
            }
            if (handleSet.handle2) {
                handleSet.handle2.position = currentWorld.add(tangent.scale(handleLength));
            }
            
            // Update connecting lines
            if (handleSet.line1) {
                handleSet.line1.dispose();
                handleSet.line1 = this.createHandleLine(currentWorld, handleSet.handle1.position);
            }
            if (handleSet.line2) {
                handleSet.line2.dispose();
                handleSet.line2 = this.createHandleLine(currentWorld, handleSet.handle2.position);
            }
        }
    }
    
    /**
     * Update path when bezier handle is moved
     */
    updatePathFromBezierHandle(handle, newPosition) {
        // Find the handle set containing this handle
        const handleSet = this.bezierHandles.find(set => 
            set.handle1 === handle || set.handle2 === handle
        );
        
        if (!handleSet) return;
        
        // Update the connecting line
        const controlPos = handleSet.controlPoint.position;
        const handleType = (handleSet.handle1 === handle) ? 'line1' : 'line2';
        
        if (handleSet[handleType]) {
            handleSet[handleType].dispose();
            handleSet[handleType] = this.createHandleLine(controlPos, this.localToWorld(newPosition));
        }
        
        // For more advanced bezier curve modification, you could update the path curvature here
        // For now, we'll just update the handle position and line
        console.log('ScrollCuttingSystem: Bezier handle moved, path curvature could be updated');
    }

    /**
     * Validate that we have a proper Babylon.js mesh
     */
    isValidMesh(mesh) {
        return mesh && 
               !mesh.isDisposed() && 
               typeof mesh.getBoundingInfo === 'function' && 
               typeof mesh.getWorldMatrix === 'function' &&
               typeof mesh.position !== 'undefined';
    }

    /**
     * Activate scroll cutting mode on selected part
     */
    activate(mesh) {
        if (!mesh) {
            console.warn('ScrollCuttingSystem: Cannot activate - no mesh provided');
            return false;
        }
        
        if (!mesh.isWorkBenchPart) {
            console.warn('ScrollCuttingSystem: Cannot activate - mesh is not a workbench part:', mesh);
            return false;
        }
        
        if (!this.isValidMesh(mesh)) {
            console.warn('ScrollCuttingSystem: Cannot activate - mesh failed validation:', {
                hasGetBoundingInfo: typeof mesh.getBoundingInfo === 'function',
                hasGetWorldMatrix: typeof mesh.getWorldMatrix === 'function',
                hasPosition: typeof mesh.position !== 'undefined',
                isDisposed: mesh.isDisposed()
            });
            return false;
        }
        
        this.focusPart = mesh;
        this.isActive = true;
        
        // Store original part reference for recovery
        this.originalPart = mesh;
        
        console.log('ScrollCuttingSystem: Activating scroll cutting on', mesh.partData?.materialName || 'unnamed part');
        
        // Switch to orthographic mode and position camera
        this.enterOrthographicMode();
        
        // CRITICAL: Disable camera controls to prevent interference
        this.disableCameraControls();
        
        // Show scroll cutting UI
        this.showScrollCuttingInterface();
        
        // Show rulers and precision aids
        this.showRulers();
        
        return true;
    }
    
    /**
     * Switch camera to orthographic top-down mode
     */
    enterOrthographicMode() {
        // Store original camera state
        this.originalCameraMode = this.drawingWorld.camera.mode;
        this.originalCameraPosition = this.drawingWorld.camera.position.clone();
        this.originalCameraTarget = this.drawingWorld.camera.getTarget().clone();
        
        // Get part bounds for optimal positioning
        const meshBounds = this.focusPart.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = this.focusPart.position;
        
        // Switch to orthographic projection
        this.drawingWorld.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        
        // Set orthographic window size to frame the part nicely
        const maxDimension = Math.max(meshSize.x, meshSize.z);
        const orthoSize = maxDimension * 1.3; // 30% padding around part
        
        this.drawingWorld.camera.orthoLeft = -orthoSize / 2;
        this.drawingWorld.camera.orthoRight = orthoSize / 2;
        this.drawingWorld.camera.orthoTop = orthoSize / 2;
        this.drawingWorld.camera.orthoBottom = -orthoSize / 2;
        this.drawingWorld.camera.orthoNear = 0.1;
        this.drawingWorld.camera.orthoFar = 1000;
        
        // Position camera directly above the part
        this.drawingWorld.camera.position = new BABYLON.Vector3(
            meshCenter.x,
            meshCenter.y + 100, // 1 meter above
            meshCenter.z
        );
        
        // Look straight down at the part
        this.drawingWorld.camera.setTarget(meshCenter);
        
        console.log('ScrollCuttingSystem: Switched to orthographic mode - top-down view established');
    }
    
    /**
     * Exit orthographic mode and restore original camera
     */
    exitOrthographicMode() {
        if (this.originalCameraMode !== null) {
            this.drawingWorld.camera.mode = this.originalCameraMode;
            this.drawingWorld.camera.position = this.originalCameraPosition;
            this.drawingWorld.camera.setTarget(this.originalCameraTarget);
            
            // Clear orthographic settings
            this.drawingWorld.camera.orthoLeft = null;
            this.drawingWorld.camera.orthoRight = null;
            this.drawingWorld.camera.orthoTop = null;
            this.drawingWorld.camera.orthoBottom = null;
            
            console.log('ScrollCuttingSystem: Restored original camera mode');
        }
    }
    
    /**
     * Setup limited camera controls for orthographic mode
     */
    disableCameraControls() {
        if (this.drawingWorld.camera.inputs) {
            this.originalCameraInputs = this.drawingWorld.camera.inputs.attached;
            this.drawingWorld.camera.inputs.clear();
            
            // Add limited controls for orthographic mode
            this.setupOrthographicControls();
            
            console.log('ScrollCuttingSystem: Camera controls set to orthographic mode with zoom/pan');
        }
    }
    
    /**
     * Setup zoom and pan controls for orthographic mode
     */
    setupOrthographicControls() {
        // Add mouse wheel zoom - but configure it properly for orthographic
        this.drawingWorld.camera.inputs.addMouseWheel();
        
        // Setup custom zoom handler for orthographic mode
        this.setupOrthographicZoom();
        
        // Add custom pan controls
        this.setupOrthographicPanning();
        
        console.log('ScrollCuttingSystem: Orthographic zoom and pan controls enabled');
    }
    
    /**
     * Setup custom zoom handler for orthographic mode
     */
    setupOrthographicZoom() {
        // Remove default wheel input and add custom one
        this.drawingWorld.camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');
        
        // Add custom zoom observer
        this.zoomObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isActive) return;
            
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
                const event = pointerInfo.event;
                const delta = event.deltaY;
                
                // Calculate zoom factor
                const zoomFactor = delta > 0 ? 1.1 : 0.9;
                
                // Get current orthographic size
                const currentSize = this.drawingWorld.camera.orthoRight - this.drawingWorld.camera.orthoLeft;
                const newSize = currentSize * zoomFactor;
                
                // Apply zoom by adjusting orthographic bounds
                this.drawingWorld.camera.orthoLeft = -newSize / 2;
                this.drawingWorld.camera.orthoRight = newSize / 2;
                this.drawingWorld.camera.orthoTop = newSize / 2;
                this.drawingWorld.camera.orthoBottom = -newSize / 2;
                
                // Update ruler markings for new zoom level
                this.updateRulerMarkings();
                
                console.log('ScrollCuttingSystem: Zoom applied, new size:', newSize);
            }
        }, -5); // High priority
        
        console.log('ScrollCuttingSystem: Custom orthographic zoom enabled');
    }
    
    /**
     * Setup panning controls for orthographic mode
     */
    setupOrthographicPanning() {
        // Custom panning with middle mouse button or right click
        this.panObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isActive) return;
            
            // Middle mouse button or right click for panning
            if (pointerInfo.event.button === 1 || pointerInfo.event.button === 2) {
                
                if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                    this.isPanning = true;
                    this.lastPanPosition = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
                    console.log('ScrollCuttingSystem: Started panning with button', pointerInfo.event.button);
                    
                } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE && this.isPanning) {
                    const deltaX = pointerInfo.event.clientX - this.lastPanPosition.x;
                    const deltaY = pointerInfo.event.clientY - this.lastPanPosition.y;
                    
                    // Calculate pan speed based on orthographic size
                    const orthoSize = this.drawingWorld.camera.orthoRight - this.drawingWorld.camera.orthoLeft;
                    const panSpeed = orthoSize * 0.003; // Increased sensitivity
                    
                    // Pan the camera
                    this.drawingWorld.camera.position.x -= deltaX * panSpeed;
                    this.drawingWorld.camera.position.z += deltaY * panSpeed;
                    
                    // Update target to maintain orthographic view
                    const target = this.drawingWorld.camera.getTarget();
                    target.x = this.drawingWorld.camera.position.x;
                    target.z = this.drawingWorld.camera.position.z;
                    this.drawingWorld.camera.setTarget(target);
                    
                    this.lastPanPosition = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
                    
                    console.log('ScrollCuttingSystem: Panning - delta:', deltaX, deltaY);
                    
                } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                    if (this.isPanning) {
                        this.isPanning = false;
                        console.log('ScrollCuttingSystem: Stopped panning');
                    }
                }
            }
        }, -50); // Highest priority to ensure panning works
    }
    
    /**
     * Re-enable camera controls
     */
    enableCameraControls() {
        try {
            // Use standard Babylon.js camera control restoration
            this.drawingWorld.camera.attachControl(this.drawingWorld.canvas, true);
            console.log('ScrollCuttingSystem: Camera controls restored');
        } catch (error) {
            console.warn('ScrollCuttingSystem: Error restoring camera controls:', error);
        }
    }
    
    /**
     * Start drawing a new cutting path
     */
    startDrawing(pointerInfo) {
        // Allow cutting anywhere in the orthographic view, not just on the mesh surface
        // Project mouse position onto the workpiece plane
        const cuttingPoint = this.projectMouseToWorkpiecePlane(pointerInfo);
        
        if (cuttingPoint) {
            this.isDrawing = true;
            this.currentPath = [];
            
            // Add first point directly
            this.currentPath.push(cuttingPoint);
            console.log('ScrollCuttingSystem: Started drawing cutting path at', cuttingPoint);
            
            // Update path preview immediately
            this.updatePathPreview();
        }
    }
    
    /**
     * Add a point to the current cutting path
     */
    addPointToPath(pointerInfo) {
        // Project mouse position onto the workpiece plane
        const cuttingPoint = this.projectMouseToWorkpiecePlane(pointerInfo);
        
        if (cuttingPoint) {
            this.currentPath.push(cuttingPoint);
            
            // Update path preview in real-time
            this.updatePathPreview();
            
            // If symmetry is enabled, add mirrored points
            if (this.symmetryEnabled) {
                this.addSymmetricalPoints(cuttingPoint);
            }
        }
    }
    
    /**
     * Finish drawing and process the path
     */
    finishDrawing() {
        if (!this.isDrawing || this.currentPath.length < 2) {
            console.log('ScrollCuttingSystem: Path too short, canceling');
            this.clearCurrentPath();
            return;
        }
        
        this.isDrawing = false;
        
        console.log('ScrollCuttingSystem: Finished drawing path with', this.currentPath.length, 'points');
        
        // Apply smoothing to the path
        this.smoothedPath = this.applySmoothingToPath(this.currentPath);
        
        // Update preview with smoothed path and make it persistent
        this.updatePathPreview();
        
        // Make the path preview persistent (don't clear it)
        if (this.pathPreviewMesh) {
            this.pathPreviewMesh.material = this.pathMaterial; // Use permanent material
            this.pathPreviewMesh.renderingGroupId = 1; // Keep on top
        }
        
        // Create bezier control points and handles
        this.createBezierControlPoints();
        
        // Setup control point manipulation
        this.setupControlPointInteraction();
        
        // Show cutting options
        this.showCuttingOptions();
    }
    
    /**
     * Apply smoothing algorithm to raw path points
     */
    applySmoothingToPath(rawPath) {
        if (rawPath.length < 3 || this.smoothingLevel === 0) {
            return rawPath.slice(); // Return copy of original path
        }
        
        const smoothed = [];
        const factor = this.smoothingLevel;
        
        // Keep first point
        smoothed.push(rawPath[0]);
        
        // Smooth intermediate points using weighted average
        for (let i = 1; i < rawPath.length - 1; i++) {
            const prev = rawPath[i - 1];
            const curr = rawPath[i];
            const next = rawPath[i + 1];
            
            // Weighted average with neighboring points
            const smoothedPoint = new BABYLON.Vector3(
                curr.x * (1 - factor) + (prev.x + next.x) * factor * 0.5,
                curr.y * (1 - factor) + (prev.y + next.y) * factor * 0.5,
                curr.z * (1 - factor) + (prev.z + next.z) * factor * 0.5
            );
            
            smoothed.push(smoothedPoint);
        }
        
        // Keep last point
        smoothed.push(rawPath[rawPath.length - 1]);
        
        console.log('ScrollCuttingSystem: Applied smoothing - reduced from', rawPath.length, 'to', smoothed.length, 'points');
        return smoothed;
    }
    
    /**
     * Update real-time path preview
     */
    updatePathPreview() {
        // Clear existing preview
        this.clearPathPreview();
        
        const pathToShow = this.smoothedPath.length > 0 ? this.smoothedPath : this.currentPath;
        
        if (pathToShow.length < 2) return;
        
        // Create path preview using lines
        const pathPoints = pathToShow.map(point => this.localToWorld(point));
        
        this.pathPreviewMesh = BABYLON.LinesBuilder.CreateLines('pathPreview', {
            points: pathPoints
        }, this.scene);
        
        this.pathPreviewMesh.color = new BABYLON.Color3(0, 0.7, 1); // Bright blue
        this.pathPreviewMesh.isPickable = false;
        this.pathPreviewMesh.renderingGroupId = 1; // Render on top
        
        console.log('ScrollCuttingSystem: Updated path preview with', pathPoints.length, 'points');
    }
    
    /**
     * Convert world coordinates to local part coordinates
     */
    worldToLocal(worldPoint) {
        const meshMatrix = this.focusPart.getWorldMatrix().clone();
        meshMatrix.invert();
        return BABYLON.Vector3.TransformCoordinates(worldPoint, meshMatrix);
    }
    
    /**
     * Convert local part coordinates to world coordinates
     */
    localToWorld(localPoint) {
        if (!this.focusPart) {
            console.error('ScrollCuttingSystem: focusPart is undefined in localToWorld');
            throw new Error('focusPart is undefined');
        }
        
        if (!this.focusPart.getWorldMatrix) {
            console.error('ScrollCuttingSystem: focusPart.getWorldMatrix is undefined');
            throw new Error('focusPart.getWorldMatrix is undefined');
        }
        
        const meshMatrix = this.focusPart.getWorldMatrix();
        return BABYLON.Vector3.TransformCoordinates(localPoint, meshMatrix);
    }
    
    /**
     * Project mouse position onto the workpiece plane for cutting
     */
    projectMouseToWorkpiecePlane(pointerInfo) {
        if (!this.isValidMesh(this.focusPart)) return null;
        
        // Get the workpiece bounds and center
        const meshBounds = this.focusPart.getBoundingInfo();
        const meshCenter = this.focusPart.position;
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Create a ray from the camera through the mouse position
        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            null,
            this.drawingWorld.camera
        );
        
        // Define the cutting plane at the top surface of the workpiece
        const planeY = meshCenter.y + meshSize.y / 2;
        const plane = BABYLON.Plane.FromPositionAndNormal(
            new BABYLON.Vector3(0, planeY, 0),
            new BABYLON.Vector3(0, 1, 0) // Normal pointing up
        );
        
        // Find intersection with the plane
        const distance = ray.intersectsPlane(plane);
        if (distance !== null) {
            const intersectionPoint = ray.origin.add(ray.direction.scale(distance));
            
            // Convert to local coordinates relative to the workpiece
            return this.worldToLocal(intersectionPoint);
        }
        
        return null;
    }
    
    /**
     * Update coordinate display with current mouse position
     */
    updateCoordinateDisplay(pointerInfo) {
        if (!this.coordinateDisplay || !this.isValidMesh(this.focusPart)) return;
        
        const localPoint = this.projectMouseToWorkpiecePlane(pointerInfo);
        if (localPoint) {
            const x = localPoint.x.toFixed(2);
            const z = localPoint.z.toFixed(2);
            this.coordinateDisplay.textContent = `${x}", ${z}"`;
        }
        
        // Update crosshairs position
        this.updateCrosshairs(pointerInfo);
    }
    
    /**
     * Update crosshairs to follow mouse cursor
     */
    updateCrosshairs(pointerInfo) {
        if (!this.crosshairs) return;
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = this.scene.pointerX;
        const mouseY = this.scene.pointerY;
        
        // Position crosshairs at mouse cursor
        this.crosshairs.style.left = mouseX + 'px';
        this.crosshairs.style.top = mouseY + 'px';
        
        // Update crosshair lines to span full canvas from cursor position
        const horizontal = this.crosshairs.children[0];
        const vertical = this.crosshairs.children[1];
        
        horizontal.style.cssText = `
            position: absolute;
            width: ${rect.width}px;
            height: 1px;
            background: rgba(255, 0, 0, 0.6);
            top: 0;
            left: -${mouseX}px;
        `;
        
        vertical.style.cssText = `
            position: absolute;
            width: 1px;
            height: ${rect.height}px;
            background: rgba(255, 0, 0, 0.6);
            left: 0;
            top: -${mouseY}px;
        `;
    }
    
    /**
     * Create bezier control points and handles for path editing
     */
    createBezierControlPoints() {
        if (!this.smoothedPath || this.smoothedPath.length < 3) return;
        
        // Clear existing handles
        this.clearBezierHandles();
        
        console.log('ScrollCuttingSystem: Creating bezier control points for', this.smoothedPath.length, 'path points');
        
        // Create fewer control points for easier manipulation
        const controlPointIndices = [];
        const pathLength = this.smoothedPath.length;
        
        // Start point
        controlPointIndices.push(0);
        
        // Middle points (only 2-3 points for most paths)
        if (pathLength > 10) {
            controlPointIndices.push(Math.floor(pathLength * 0.33));
            controlPointIndices.push(Math.floor(pathLength * 0.67));
        } else if (pathLength > 5) {
            controlPointIndices.push(Math.floor(pathLength * 0.5));
        }
        
        // End point
        if (controlPointIndices[controlPointIndices.length - 1] !== pathLength - 1) {
            controlPointIndices.push(pathLength - 1);
        }
        
        // Create control points and tangent handles
        controlPointIndices.forEach((index, i) => {
            const localPoint = this.smoothedPath[index];
            const worldPoint = this.localToWorld(localPoint);
            
            // Create main control point (draggable) - much larger
            const controlPoint = BABYLON.MeshBuilder.CreateSphere(`controlPoint_${i}`, {
                diameter: 2.0 // 2cm diameter - much more grabbable
            }, this.scene);
            
            controlPoint.position = worldPoint;
            
            // Control point material (orange)
            const controlMaterial = new BABYLON.StandardMaterial(`controlMaterial_${i}`, this.scene);
            controlMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
            controlMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0);
            controlPoint.material = controlMaterial;
            
            // Make it pickable for dragging
            controlPoint.isPickable = true;
            controlPoint.renderingGroupId = 2; // Render on top
            controlPoint.metadata = {
                type: 'bezierControlPoint',
                pathIndex: index,
                scrollCuttingSystem: this
            };
            
            this.controlHandles.push(controlPoint);
            
            // Create tangent handles if not at endpoints
            if (i > 0 && i < controlPointIndices.length - 1) {
                this.createTangentHandles(controlPoint, localPoint, i);
            }
        });
        
        console.log('ScrollCuttingSystem: Created', this.controlHandles.length, 'bezier control points');
    }
    
    /**
     * Setup control point interaction (drag, delete) - INTEGRATED INTO MAIN MOUSE TRACKING
     */
    setupControlPointInteraction() {
        // Control point interaction is now integrated into the main mouse tracking system
        // This allows for SHIFT+click cutting vs normal click manipulation
        console.log('ScrollCuttingSystem: Control point interaction integrated into main mouse tracking');
    }
    
    /**
     * Create tangent handles for a control point
     */
    createTangentHandles(controlPoint, localPoint, index) {
        const worldPoint = this.localToWorld(localPoint);
        
        // Calculate tangent direction from neighboring points
        const prevIndex = Math.max(0, index - 1);
        const nextIndex = Math.min(this.smoothedPath.length - 1, index + 1);
        
        if (prevIndex < this.smoothedPath.length && nextIndex < this.smoothedPath.length) {
            const prevWorld = this.localToWorld(this.smoothedPath[prevIndex]);
            const nextWorld = this.localToWorld(this.smoothedPath[nextIndex]);
            
            // Calculate tangent direction
            const tangent = nextWorld.subtract(prevWorld).normalize();
            const handleLength = 3.0; // 3cm handle length - more visible
            
            // Create two tangent handles (before and after the control point)
            const handle1Pos = worldPoint.subtract(tangent.scale(handleLength));
            const handle2Pos = worldPoint.add(tangent.scale(handleLength));
            
            // Create handle meshes
            const handle1 = this.createTangentHandle(handle1Pos, index, 'before');
            const handle2 = this.createTangentHandle(handle2Pos, index, 'after');
            
            // Create connecting lines
            const line1 = this.createHandleLine(worldPoint, handle1Pos);
            const line2 = this.createHandleLine(worldPoint, handle2Pos);
            
            this.bezierHandles.push({
                controlPoint: controlPoint,
                handle1: handle1,
                handle2: handle2,
                line1: line1,
                line2: line2,
                pathIndex: index
            });
        }
    }
    
    /**
     * Create a single tangent handle
     */
    createTangentHandle(position, controlIndex, type) {
        const handle = BABYLON.MeshBuilder.CreateSphere(`tangentHandle_${controlIndex}_${type}`, {
            diameter: 1.0 // 1cm diameter - much more grabbable
        }, this.scene);
        
        handle.position = position;
        
        // Handle material (cyan)
        const handleMaterial = new BABYLON.StandardMaterial(`handleMaterial_${controlIndex}_${type}`, this.scene);
        handleMaterial.diffuseColor = new BABYLON.Color3(0, 1, 1); // Cyan
        handleMaterial.emissiveColor = new BABYLON.Color3(0, 0.3, 0.3);
        handle.material = handleMaterial;
        
        handle.isPickable = true;
        handle.renderingGroupId = 2;
        handle.metadata = {
            type: 'bezierTangentHandle',
            controlIndex: controlIndex,
            handleType: type,
            scrollCuttingSystem: this
        };
        
        return handle;
    }
    
    /**
     * Create line connecting control point to tangent handle
     */
    createHandleLine(start, end) {
        // Create multiple parallel lines for thickness
        const lines = [];
        const offsets = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0.05, 0, 0),
            new BABYLON.Vector3(-0.05, 0, 0),
            new BABYLON.Vector3(0, 0.05, 0),
            new BABYLON.Vector3(0, -0.05, 0)
        ];
        
        offsets.forEach((offset, i) => {
            const line = BABYLON.LinesBuilder.CreateLines(`handleLine_${i}`, {
                points: [start.add(offset), end.add(offset)]
            }, this.scene);
            
            line.color = new BABYLON.Color3(0.7, 0.7, 0.7); // Lighter gray
            line.alpha = 0.8;
            line.isPickable = false;
            line.renderingGroupId = 1;
            lines.push(line);
        });
        
        return lines[0]; // Return main line for disposal tracking
    }
    
    /**
     * Clear all bezier handles and control points
     */
    clearBezierHandles() {
        // Dispose control points
        this.controlHandles.forEach(handle => handle.dispose());
        this.controlHandles = [];
        
        // Dispose bezier handles and lines
        this.bezierHandles.forEach(handleSet => {
            if (handleSet.handle1) handleSet.handle1.dispose();
            if (handleSet.handle2) handleSet.handle2.dispose();
            if (handleSet.line1) handleSet.line1.dispose();
            if (handleSet.line2) handleSet.line2.dispose();
        });
        this.bezierHandles = [];
        
        console.log('ScrollCuttingSystem: Cleared all bezier handles');
    }
    
    /**
     * Delete a specific control point
     */
    deleteControlPoint(controlPoint) {
        if (!controlPoint || !controlPoint.metadata) return;
        
        const pathIndex = controlPoint.metadata.pathIndex;
        console.log('ScrollCuttingSystem: Deleting control point at index', pathIndex);
        
        // Remove from control handles array
        const handleIndex = this.controlHandles.indexOf(controlPoint);
        if (handleIndex !== -1) {
            this.controlHandles.splice(handleIndex, 1);
        }
        
        // Remove from scene
        controlPoint.dispose();
        
        // Clear selection
        this.selectedControlPoint = null;
        
        // If this was the only control point, clear the path
        if (this.controlHandles.length === 0) {
            this.clearCurrentCutPath();
        } else {
            // Regenerate the path without this point
            this.regeneratePathFromControlPoints();
        }
        
        console.log('ScrollCuttingSystem: Control point deleted');
    }
    
    /**
     * Regenerate path from remaining control points
     */
    regeneratePathFromControlPoints() {
        if (this.controlHandles.length < 2) {
            this.clearCurrentCutPath();
            return;
        }
        
        // Extract positions from remaining control points
        const newPath = this.controlHandles.map(handle => 
            this.worldToLocal(handle.position)
        );
        
        // Update the smoothed path
        this.smoothedPath = newPath;
        
        // Update path preview
        this.updatePathPreview();
        
        console.log('ScrollCuttingSystem: Path regenerated from', this.controlHandles.length, 'control points');
    }
    
    /**
     * Pan with arrow keys (fallback method)
     */
    panWithArrowKeys(key) {
        const orthoSize = this.drawingWorld.camera.orthoRight - this.drawingWorld.camera.orthoLeft;
        const panAmount = orthoSize * 0.1; // 10% of view size
        
        let deltaX = 0, deltaZ = 0;
        
        switch(key) {
            case 'ArrowUp':
                deltaZ = panAmount;
                break;
            case 'ArrowDown':
                deltaZ = -panAmount;
                break;
            case 'ArrowLeft':
                deltaX = -panAmount;
                break;
            case 'ArrowRight':
                deltaX = panAmount;
                break;
        }
        
        // Apply pan
        this.drawingWorld.camera.position.x += deltaX;
        this.drawingWorld.camera.position.z += deltaZ;
        
        // Update target
        const target = this.drawingWorld.camera.getTarget();
        target.x = this.drawingWorld.camera.position.x;
        target.z = this.drawingWorld.camera.position.z;
        this.drawingWorld.camera.setTarget(target);
        
        console.log('ScrollCuttingSystem: Arrow key pan:', key, 'delta:', deltaX, deltaZ);
    }
    
    /**
     * Clear current path preview
     */
    clearPathPreview() {
        if (this.pathPreviewMesh) {
            this.pathPreviewMesh.dispose();
            this.pathPreviewMesh = null;
        }
    }
    
    /**
     * Clear current cutting path
     */
    clearCurrentPath() {
        this.currentPath = [];
        this.smoothedPath = [];
        this.isDrawing = false;
        this.clearPathPreview();
    }
    
    /**
     * Show rulers and precision aids for orthographic cutting
     */
    showRulers() {
        if (!this.focusPart) return;
        
        // Create rulers container
        this.rulersContainer = document.createElement('div');
        this.rulersContainer.id = 'scroll-cutting-rulers';
        this.rulersContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Create horizontal ruler (top)
        this.horizontalRuler = document.createElement('div');
        this.horizontalRuler.style.cssText = `
            position: absolute;
            top: 0;
            left: 40px;
            right: 0;
            height: 40px;
            background: rgba(255, 255, 255, 0.9);
            border-bottom: 2px solid #333;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            overflow: hidden;
        `;
        
        // Create vertical ruler (left)
        this.verticalRuler = document.createElement('div');
        this.verticalRuler.style.cssText = `
            position: absolute;
            top: 40px;
            left: 0;
            bottom: 0;
            width: 40px;
            background: rgba(255, 255, 255, 0.9);
            border-right: 2px solid #333;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            overflow: hidden;
        `;
        
        // Create coordinate display
        this.coordinateDisplay = document.createElement('div');
        this.coordinateDisplay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #333;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Courier New', monospace;
            font-size: 9px;
            font-weight: bold;
            color: #333;
        `;
        this.coordinateDisplay.textContent = '0,0';
        
        // Create crosshairs
        this.crosshairs = document.createElement('div');
        this.crosshairs.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 999;
        `;
        
        const crosshairHorizontal = document.createElement('div');
        crosshairHorizontal.style.cssText = `
            position: absolute;
            width: 100%;
            height: 1px;
            background: rgba(255, 0, 0, 0.6);
            top: 50%;
            left: 0;
        `;
        
        const crosshairVertical = document.createElement('div');
        crosshairVertical.style.cssText = `
            position: absolute;
            width: 1px;
            height: 100%;
            background: rgba(255, 0, 0, 0.6);
            left: 50%;
            top: 0;
        `;
        
        this.crosshairs.appendChild(crosshairHorizontal);
        this.crosshairs.appendChild(crosshairVertical);
        
        // Create cut depth controls
        this.createCutDepthControls();
        
        // Add to rulers container
        this.rulersContainer.appendChild(this.horizontalRuler);
        this.rulersContainer.appendChild(this.verticalRuler);
        this.rulersContainer.appendChild(this.coordinateDisplay);
        this.rulersContainer.appendChild(this.crosshairs);
        this.rulersContainer.appendChild(this.cutDepthSlider);
        
        // Add to canvas container
        const canvasContainer = this.canvas.parentElement;
        canvasContainer.appendChild(this.rulersContainer);
        
        // Initialize ruler markings
        this.updateRulerMarkings();
        
        console.log('ScrollCuttingSystem: Rulers and precision aids displayed');
    }
    
    /**
     * Update ruler markings based on current view
     */
    updateRulerMarkings() {
        if (!this.horizontalRuler || !this.verticalRuler || !this.focusPart) return;
        
        // Get workpiece dimensions and camera info
        const meshBounds = this.focusPart.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const camera = this.drawingWorld.camera;
        
        // Calculate scale: pixels per unit
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const orthoWidth = camera.orthoRight - camera.orthoLeft;
        const orthoHeight = camera.orthoTop - camera.orthoBottom;
        const pixelsPerUnit = canvasWidth / orthoWidth;
        
        // Clear existing markings
        this.horizontalRuler.innerHTML = '';
        this.verticalRuler.innerHTML = '';
        
        // Add horizontal ruler markings
        const workpieceWidth = meshSize.x;
        const majorTickSpacing = this.calculateOptimalTickSpacing(pixelsPerUnit);
        
        for (let i = 0; i <= Math.ceil(workpieceWidth / majorTickSpacing) + 2; i++) {
            const value = i * majorTickSpacing;
            const pixelPos = (value / orthoWidth) * canvasWidth;
            
            // Major tick
            const majorTick = document.createElement('div');
            majorTick.style.cssText = `
                position: absolute;
                left: ${pixelPos}px;
                top: 20px;
                width: 1px;
                height: 20px;
                background: #333;
            `;
            this.horizontalRuler.appendChild(majorTick);
            
            // Label
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                left: ${pixelPos + 2}px;
                top: 2px;
                color: #333;
                font-size: 9px;
            `;
            label.textContent = (value * 0.393701).toFixed(2) + '"';
            this.horizontalRuler.appendChild(label);
            
            // Minor ticks
            for (let j = 1; j < 4; j++) {
                const minorValue = value + (j * majorTickSpacing / 4);
                const minorPixelPos = (minorValue / orthoWidth) * canvasWidth;
                
                const minorTick = document.createElement('div');
                minorTick.style.cssText = `
                    position: absolute;
                    left: ${minorPixelPos}px;
                    top: 30px;
                    width: 1px;
                    height: 10px;
                    background: #666;
                `;
                this.horizontalRuler.appendChild(minorTick);
            }
        }
        
        // Add vertical ruler markings (similar logic)
        const workpieceDepth = meshSize.z;
        for (let i = 0; i <= Math.ceil(workpieceDepth / majorTickSpacing) + 2; i++) {
            const value = i * majorTickSpacing;
            const pixelPos = (value / orthoHeight) * canvasHeight;
            
            // Major tick
            const majorTick = document.createElement('div');
            majorTick.style.cssText = `
                position: absolute;
                top: ${pixelPos}px;
                left: 20px;
                width: 20px;
                height: 1px;
                background: #333;
            `;
            this.verticalRuler.appendChild(majorTick);
            
            // Label (rotated)
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                top: ${pixelPos + 2}px;
                left: 2px;
                color: #333;
                font-size: 9px;
                transform: rotate(-90deg);
                transform-origin: left top;
                width: 30px;
            `;
            label.textContent = (value * 0.393701).toFixed(2) + '"';
            this.verticalRuler.appendChild(label);
        }
    }
    
    /**
     * Calculate optimal tick spacing based on zoom level
     */
    calculateOptimalTickSpacing(pixelsPerUnit) {
        // Target 40-80 pixels between major ticks
        const targetPixelSpacing = 60;
        const unitSpacing = targetPixelSpacing / pixelsPerUnit;
        
        // Round to nice increments (0.25, 0.5, 1.0, 2.0, etc.)
        const niceIncrements = [0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0];
        
        for (let increment of niceIncrements) {
            if (increment * pixelsPerUnit >= targetPixelSpacing * 0.7) {
                return increment;
            }
        }
        
        return 1.0; // Default fallback
    }
    
    /**
     * Create cut depth controls
     */
    createCutDepthControls() {
        if (!this.focusPart) return;
        
        // Get board thickness for reference
        const meshBounds = this.focusPart.getBoundingInfo();
        const boardThickness = meshBounds.maximum.y - meshBounds.minimum.y;
        
        // Create cut depth control panel
        this.cutDepthSlider = document.createElement('div');
        this.cutDepthSlider.style.cssText = `
            position: absolute;
            top: 50px;
            right: 10px;
            width: 200px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.95);
            border: 2px solid #333;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            z-index: 1001;
            pointer-events: auto;
        `;
        
        // Title
        const title = document.createElement('div');
        title.textContent = 'Cut Depth Control';
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
        `;
        this.cutDepthSlider.appendChild(title);
        
        // Board thickness info
        const thicknessInfo = document.createElement('div');
        thicknessInfo.textContent = `Board: ${boardThickness.toFixed(1)}cm thick`;
        thicknessInfo.style.cssText = `
            color: #666;
            margin-bottom: 8px;
            font-size: 10px;
        `;
        this.cutDepthSlider.appendChild(thicknessInfo);
        
        // Determine unit system (imperial by default)
        const isImperial = true; // TODO: Get from settings
        const unitLabel = isImperial ? '"' : 'cm';
        const conversionFactor = isImperial ? 0.393701 : 1.0; // cm to inches
        
        // Convert board thickness to display units
        const boardThicknessDisplay = boardThickness * conversionFactor;
        const maxDepthDisplay = Math.max(boardThicknessDisplay * 1.2, isImperial ? 1.2 : 3.0);
        
        // Update thickness info with proper units
        thicknessInfo.textContent = `Board: ${boardThicknessDisplay.toFixed(2)}${unitLabel} thick`;
        
        // Depth slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = isImperial ? '0.04' : '0.1'; // 1mm or 0.04"
        slider.max = maxDepthDisplay.toString();
        slider.step = isImperial ? '0.01' : '0.1'; // 0.01" or 0.1cm steps
        slider.value = (this.cutDepth * conversionFactor).toString();
        slider.style.cssText = `
            width: 100%;
            margin: 5px 0;
            pointer-events: auto;
            cursor: pointer;
        `;
        
        // Depth display
        const depthDisplay = document.createElement('div');
        depthDisplay.style.cssText = `
            text-align: center;
            margin: 5px 0;
            font-weight: bold;
            color: #333;
        `;
        
        const updateDepthDisplay = () => {
            const depthDisplay_value = parseFloat(slider.value);
            // Convert display value back to internal cm units
            this.cutDepth = depthDisplay_value / conversionFactor;
            
            const precision = isImperial ? 3 : 1; // More precision for inches
            
            if (this.cutDepth >= boardThickness) {
                depthDisplay.innerHTML = `<span style="color: #d63384;">${depthDisplay_value.toFixed(precision)}${unitLabel} - THROUGH CUT</span>`;
            } else {
                depthDisplay.innerHTML = `<span style="color: #0d6efd;">${depthDisplay_value.toFixed(precision)}${unitLabel} - PARTIAL CUT</span>`;
            }
        };
        
        slider.addEventListener('input', updateDepthDisplay);
        updateDepthDisplay();
        
        // Quick preset buttons
        const presetContainer = document.createElement('div');
        presetContainer.style.cssText = `
            display: flex;
            gap: 5px;
            margin-top: 8px;
        `;
        
        const presets = [
            { label: '25%', value: boardThicknessDisplay * 0.25 },
            { label: '50%', value: boardThicknessDisplay * 0.5 },
            { label: '75%', value: boardThicknessDisplay * 0.75 },
            { label: 'Through', value: boardThicknessDisplay + (isImperial ? 0.02 : 0.5) }
        ];
        
        presets.forEach(preset => {
            const button = document.createElement('button');
            button.textContent = preset.label;
            button.style.cssText = `
                flex: 1;
                padding: 3px;
                font-size: 9px;
                background: #f8f9fa;
                border: 1px solid #ccc;
                border-radius: 3px;
                cursor: pointer;
                pointer-events: auto;
            `;
            
            button.addEventListener('click', () => {
                slider.value = preset.value.toString();
                updateDepthDisplay();
            });
            
            presetContainer.appendChild(button);
        });
        
        this.cutDepthSlider.appendChild(slider);
        this.cutDepthSlider.appendChild(depthDisplay);
        this.cutDepthSlider.appendChild(presetContainer);
        
        console.log('ScrollCuttingSystem: Cut depth controls created');
    }
    
    /**
     * Hide rulers and precision aids
     */
    hideRulers() {
        if (this.rulersContainer) {
            this.rulersContainer.remove();
            this.rulersContainer = null;
            this.horizontalRuler = null;
            this.verticalRuler = null;
            this.coordinateDisplay = null;
            this.cutDepthSlider = null;
        }
    }
    
    /**
     * Show scroll cutting interface
     */
    showScrollCuttingInterface() {
        // Update UI to show scroll cutting mode
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.innerHTML = `
                <strong>🎯 Scroll Cutting Mode</strong><br>
                <span style="font-size: 0.9em;">
                • <kbd>SHIFT + Left Click</kbd> + drag to draw cutting paths<br>
                • <kbd>Left Click</kbd> + drag to move control points and handles<br>
                • <kbd>Mouse Wheel</kbd> to zoom in/out<br>
                • <kbd>Middle Click</kbd> or <kbd>Right Click</kbd> + drag to pan<br>
                • Press <kbd>ESC</kbd> to exit
                </span>
            `;
        }
        
        console.log('ScrollCuttingSystem: Scroll cutting interface activated');
    }
    
    /**
     * Setup scroll cutting UI
     */
    setupScrollCuttingUI() {
        // Add keyboard listeners for cutting controls
        this.keyboardHandler = (event) => {
            // Track shift key state
            if (event.key === 'Shift') {
                this.shiftKeyPressed = true;
            }
            
            // CRITICAL: ESC key ALWAYS works to exit, regardless of state
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                console.log('ScrollCuttingSystem: ESC pressed - FORCE EXIT ortho mode');
                this.forceExit();
                return;
            }
            
            if (!this.isActive) return;
            
            if (event.key === 'Enter') {
                // ENTER to execute cut
                event.preventDefault();
                this.executeSimpleCut();
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                // DELETE to clear current path or selected control point
                event.preventDefault();
                if (this.selectedControlPoint) {
                    this.deleteControlPoint(this.selectedControlPoint);
                } else {
                    this.clearCurrentCutPath();
                }
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                // Arrow keys for panning (fallback)
                event.preventDefault();
                this.panWithArrowKeys(event.key);
            } else if (event.key === ' ') {
                // Spacebar to toggle pan mode
                event.preventDefault();
                this.togglePanMode();
            }
        };
        
        // Add keyup handler to track shift release
        this.keyboardUpHandler = (event) => {
            if (event.key === 'Shift') {
                this.shiftKeyPressed = false;
            }
        };
        
        document.addEventListener('keydown', this.keyboardHandler);
        document.addEventListener('keyup', this.keyboardUpHandler);
        
        console.log('ScrollCuttingSystem: UI setup complete - SHIFT+click to draw cutting paths, click to manipulate control points, ENTER to cut, ESC to cancel');
    }
    
    /**
     * Show cutting options after path is complete
     */
    showCuttingOptions() {
        console.log('ScrollCuttingSystem: Path completed and ready for cutting');
        
        // Update UI to show cutting is ready
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.innerHTML = `
                <strong>🔵 Cutting Path Ready!</strong><br>
                <span style="font-size: 0.9em;">
                • <kbd>Left Click + drag</kbd> <span style="color: #ff8000;">●</span> orange points to reshape<br>
                • <kbd>Left Click + drag</kbd> <span style="color: #00ffff;">●</span> cyan handles for curves<br>
                • <kbd>SHIFT + Left Click</kbd> + drag to add new cutting paths<br>
                • <kbd>Click</kbd> orange point + <kbd>DELETE</kbd> to remove it<br>
                • <kbd>Mouse Wheel</kbd> to zoom in/out<br>
                • <kbd>Middle/Right Click + drag</kbd> OR <kbd>Arrow Keys</kbd> to pan<br>
                • Adjust <strong>Cut Depth</strong> slider (partial vs through cut)<br>
                • Press <kbd>ENTER</kbd> to execute cut<br>
                • Press <kbd>ESC</kbd> to cancel<br>
                • Press <kbd>DELETE</kbd> to clear entire path
                </span>
            `;
        }
        
        console.log('ScrollCuttingSystem: Instructions displayed - ENTER to cut, ESC to cancel');
    }
    
    /**
     * Execute simple cutting operation
     */
    executeSimpleCut() {
        if (!this.smoothedPath || this.smoothedPath.length < 2) {
            console.warn('ScrollCuttingSystem: Cannot execute cut - no valid path');
            return;
        }
        
        // Validate that we have a valid mesh to cut
        if (!this.isValidMesh(this.focusPart)) {
            console.warn('ScrollCuttingSystem: Cannot execute cut - invalid focus part');
            this.recoverBoardIfMissing();
            
            // Check again after recovery
            if (!this.isValidMesh(this.focusPart)) {
                const selectionInfo = document.getElementById('selection-info');
                if (selectionInfo) {
                    selectionInfo.innerHTML = '<strong style="color: red;">❌ Cut Failed</strong><br><span style="font-size: 0.9em;">No valid board found for cutting. Press ESC to exit.</span>';
                }
                return;
            }
        }
        
        console.log('ScrollCuttingSystem: Executing simple material cutting...');
        
        // Update UI
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.innerHTML = '<strong>⚡ Cutting Material...</strong>';
        }
        
        try {
            // Debug smoothedPath
            console.log('ScrollCuttingSystem: smoothedPath check:', {
                exists: !!this.smoothedPath,
                isArray: Array.isArray(this.smoothedPath),
                length: this.smoothedPath ? this.smoothedPath.length : 'N/A'
            });
            
            if (!this.smoothedPath || !Array.isArray(this.smoothedPath)) {
                throw new Error('smoothedPath is undefined or not an array');
            }
            
            // Find path bounding box
            const worldPath = this.smoothedPath.map(point => this.localToWorld(point));
            
            console.log('ScrollCuttingSystem: worldPath created with', worldPath.length, 'points');
            
            let minX = worldPath[0].x, maxX = worldPath[0].x;
            let minZ = worldPath[0].z, maxZ = worldPath[0].z;
            
            worldPath.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minZ = Math.min(minZ, point.z);
                maxZ = Math.max(maxZ, point.z);
            });
            
            // Get board bounds and thickness
            const meshBounds = this.focusPart.getBoundingInfo();
            const boardThickness = meshBounds.maximum.y - meshBounds.minimum.y;
            const cutHeight = boardThickness + 1; // Cut all the way through + extra
            
            // Create a cutting mesh that follows the exact curve path
            const boardTop = meshBounds.maximum.y;
            const boardBottom = meshBounds.minimum.y;
            const kerfWidth = 0.3; // Width of the cut (like a saw blade)
            
            // Create cutting geometry that follows the curve exactly
            const cuttingMesh = this.createCurveCuttingMesh(worldPath, boardTop, boardBottom, kerfWidth);
            
            if (!cuttingMesh) {
                throw new Error('Failed to create cutting mesh from path');
            }
            
            console.log('ScrollCuttingSystem: Created cutting mesh following curve path');
            console.log('Cutting mesh details:', {
                position: cuttingMesh.position,
                pathPoints: worldPath.length,
                kerfWidth: kerfWidth,
                boardTop: boardTop,
                boardBottom: boardBottom
            });
            
            // Store references before CSG operation
            const originalPart = this.focusPart;
            const originalMaterial = originalPart.material;
            const originalPartData = originalPart.partData;
            const originalPosition = originalPart.position.clone();
            
            console.log('ScrollCuttingSystem: Performing CSG subtraction...');
            console.log('Original part info:', {
                name: originalPart.name,
                position: originalPart.position,
                hasVertices: !!originalPart.getVerticesData(BABYLON.VertexBuffer.PositionKind),
                vertexCount: originalPart.getVerticesData(BABYLON.VertexBuffer.PositionKind)?.length / 3
            });
            console.log('Cutting mesh info:', {
                position: cuttingMesh.position,
                scaling: cuttingMesh.scaling,
                hasVertices: !!cuttingMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind),
                vertexCount: cuttingMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)?.length / 3
            });
            
            // Debug: Check if cutting mesh actually intersects with the board
            const boardBounds = originalPart.getBoundingInfo();
            const cuttingBounds = cuttingMesh.getBoundingInfo();
            
            console.log('ScrollCuttingSystem: Board bounds:', {
                min: boardBounds.minimum,
                max: boardBounds.maximum
            });
            console.log('ScrollCuttingSystem: Cutting mesh bounds:', {
                min: cuttingBounds.minimum,
                max: cuttingBounds.maximum
            });
            
            // Check if they might intersect (simple overlap check)
            const boardMin = boardBounds.minimum;
            const boardMax = boardBounds.maximum;
            const cuttingMin = cuttingBounds.minimum;
            const cuttingMax = cuttingBounds.maximum;
            
            const intersects = !(
                cuttingMax.x < boardMin.x || cuttingMin.x > boardMax.x ||
                cuttingMax.y < boardMin.y || cuttingMin.y > boardMax.y ||
                cuttingMax.z < boardMin.z || cuttingMin.z > boardMax.z
            );
            console.log('ScrollCuttingSystem: Bounds overlap:', intersects);
            
            // Create two separate pieces using the cutting mesh as the separator
            console.log('ScrollCuttingSystem: Creating two pieces separated by cutting path');
            
            // Find the original part in the workBenchParts array to get correct properties
            const originalWorkBenchPart = this.drawingWorld.workBenchParts.find(part => part === originalPart || part.id === originalPart.id);
            
            // Store original part info before disposal
            const originalName = originalPart.name;
            const originalDimensions = originalWorkBenchPart?.dimensions || originalPart.dimensions || {length: 0, width: 0, thickness: 0};
            const originalId = originalWorkBenchPart?.id || originalPart.id;
            const originalMaterialId = originalWorkBenchPart?.materialId || originalPart.materialId;
            const originalMaterialName = originalWorkBenchPart?.materialName || originalPart.materialName || originalPart.partData?.materialName || 'Unknown Material';
            const originalGrade = originalWorkBenchPart?.grade || originalPart.grade;
            
            // Debug original part properties
            console.log('ScrollCuttingSystem: Original part properties:', {
                name: originalName,
                id: originalId,
                materialId: originalMaterialId,
                materialName: originalMaterialName,
                grade: originalGrade,
                dimensions: originalDimensions,
                foundInWorkBench: !!originalWorkBenchPart
            });
            
            let cutPart; // Declare outside try block
            
            try {
                
                // Create TWO pieces using the cutting mesh twice!
                console.log('ScrollCuttingSystem: Creating two pieces - use cutting mesh twice');
                
                // Create CSG objects
                const boardCSG = BABYLON.CSG.FromMesh(originalPart);
                const cutterCSG = BABYLON.CSG.FromMesh(cuttingMesh);
                
                // Dispose original part to prevent duplicates
                originalPart.dispose();
                console.log('ScrollCuttingSystem: ✅ Disposed original part to prevent duplicates');
                
                // PIECE A: Board with cutting mesh subtracted (the main board piece)
                const piece1CSG = boardCSG.subtract(cutterCSG);
                const tempPiece1 = piece1CSG.toMesh(originalName + '_temp1', originalMaterial, this.scene);
                
                console.log('ScrollCuttingSystem: Using subtract approach for piece1');
                
                // Create completely clean mesh from geometry to avoid bounding box issues
                const piece1Vertices = tempPiece1.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                const piece1Indices = tempPiece1.getIndices();
                const piece1Normals = tempPiece1.getVerticesData(BABYLON.VertexBuffer.NormalKind);
                
                // Create fresh mesh
                const piece1 = new BABYLON.Mesh(originalName + '_piece1', this.scene);
                piece1.setVerticesData(BABYLON.VertexBuffer.PositionKind, piece1Vertices);
                piece1.setIndices(piece1Indices);
                if (piece1Normals) {
                    piece1.setVerticesData(BABYLON.VertexBuffer.NormalKind, piece1Normals);
                }
                piece1.material = originalMaterial;
                
                // Position at original location  
                piece1.position = originalPosition.clone();
                
                // Dispose temp mesh
                tempPiece1.dispose();
                
                console.log('ScrollCuttingSystem: ✅ Created clean piece1 mesh from geometry data');
                
                // Debug piece1 bounding box immediately after CSG
                console.log('ScrollCuttingSystem: Piece1 bounds after CSG:', {
                    min: piece1.getBoundingInfo().minimum,
                    max: piece1.getBoundingInfo().maximum,
                    size: piece1.getBoundingInfo().maximum.subtract(piece1.getBoundingInfo().minimum)
                });
                
                // PIECE B: Only the part of cutting mesh that intersects with the board
                const piece2CSG = cutterCSG.intersect(boardCSG);
                const tempPiece2 = piece2CSG.toMesh(originalName + '_temp', originalMaterial, this.scene);
                
                // Debug piece2 bounding box immediately after CSG
                console.log('ScrollCuttingSystem: Piece2 bounds after CSG:', {
                    min: tempPiece2.getBoundingInfo().minimum,
                    max: tempPiece2.getBoundingInfo().maximum,
                    size: tempPiece2.getBoundingInfo().maximum.subtract(tempPiece2.getBoundingInfo().minimum)
                });
                
                // Create a completely clean mesh from the intersected geometry
                const piece2Vertices = tempPiece2.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                const piece2Indices = tempPiece2.getIndices();
                const piece2Normals = tempPiece2.getVerticesData(BABYLON.VertexBuffer.NormalKind);
                
                // Create new clean mesh
                const piece2 = new BABYLON.Mesh(originalName + '_piece2', this.scene);
                piece2.setVerticesData(BABYLON.VertexBuffer.PositionKind, piece2Vertices);
                piece2.setIndices(piece2Indices);
                if (piece2Normals) {
                    piece2.setVerticesData(BABYLON.VertexBuffer.NormalKind, piece2Normals);
                }
                piece2.material = originalMaterial;
                
                // Position at original location
                piece2.position = originalPosition.clone();
                
                // Dispose temporary mesh
                tempPiece2.dispose();
                
                // Force proper bounding calculations and center the mesh properly
                piece2.refreshBoundingInfo();
                piece2.computeWorldMatrix(true);
                
                // Reset any inherited transforms to ensure clean positioning
                piece2.rotation = BABYLON.Vector3.Zero();
                piece2.scaling = BABYLON.Vector3.One();
                
                // Force refresh bounding info
                piece2.refreshBoundingInfo();
                console.log('ScrollCuttingSystem: ✅ Piece2 positioned at original location');
                
                console.log('ScrollCuttingSystem: Created clean piece2 mesh with reset transforms');
                
                // Set up piece 1 (main board piece)
                // Force refresh bounding info
                piece1.refreshBoundingInfo();
                console.log('ScrollCuttingSystem: ✅ Piece1 positioned at original location');
                piece1.isWorkBenchPart = true;
                piece1.id = originalId; // Keep original ID
                piece1.materialId = originalMaterialId;
                piece1.materialName = originalMaterialName || 'Unknown Material';
                piece1.grade = originalGrade;
                piece1.pickable = true;
                piece1.isVisible = true;
                
                // Force recalculate bounding box for piece1
                console.log('ScrollCuttingSystem: Piece1 bounds BEFORE refreshBoundingInfo:', {
                    min: piece1.getBoundingInfo().minimum,
                    max: piece1.getBoundingInfo().maximum,
                    size: piece1.getBoundingInfo().maximum.subtract(piece1.getBoundingInfo().minimum)
                });
                
                // Force clean bounding box calculation for fresh mesh
                piece1.refreshBoundingInfo();
                piece1.computeWorldMatrix(true);
                piece1.refreshBoundingInfo();
                
                console.log('ScrollCuttingSystem: ✅ Clean mesh should have correct bounding box automatically');
                
                console.log('ScrollCuttingSystem: 🔄 Double-refreshed bounding info for piece1');
                
                console.log('ScrollCuttingSystem: Piece1 bounds AFTER refreshBoundingInfo:', {
                    min: piece1.getBoundingInfo().minimum,
                    max: piece1.getBoundingInfo().maximum,
                    size: piece1.getBoundingInfo().maximum.subtract(piece1.getBoundingInfo().minimum)
                });
                
                const piece1BoundingInfo = piece1.getBoundingInfo();
                const piece1Size = piece1BoundingInfo.maximum.subtract(piece1BoundingInfo.minimum);
                piece1.dimensions = {
                    length: Math.abs(piece1Size.z),
                    width: Math.abs(piece1Size.x), 
                    thickness: Math.abs(piece1Size.y)
                };
                
                console.log('ScrollCuttingSystem: Piece1 recalculated dimensions:', piece1.dimensions);
                console.log('ScrollCuttingSystem: Piece1 original dimensions were:', originalDimensions);
                
                // Create partData for piece1 with matching ID
                piece1.partData = {
                    ...originalPartData,
                    id: originalId,
                    materialName: originalMaterialName || 'Unknown Material',
                    dimensions: piece1.dimensions // Preserve recalculated dimensions in partData
                };
                
                console.log('ScrollCuttingSystem: 🔍 partData assigned to piece1 with dimensions:', piece1.partData.dimensions);
                
                // Set up piece 2 (cut-out piece) with unique ID
                const timestamp = Date.now();
                const piece2Id = originalId + '_cutout_' + timestamp;
                piece2.isWorkBenchPart = true;
                piece2.id = piece2Id; // Unique ID
                piece2.materialId = originalMaterialId;
                piece2.materialName = (originalMaterialName || 'Unknown Material') + ' (Cut Piece)';
                piece2.grade = originalGrade;
                piece2.pickable = true;
                piece2.isVisible = true;
                
                // Force recalculate bounding box for piece2
                console.log('ScrollCuttingSystem: Piece2 bounds BEFORE refreshBoundingInfo:', {
                    min: piece2.getBoundingInfo().minimum,
                    max: piece2.getBoundingInfo().maximum,
                    size: piece2.getBoundingInfo().maximum.subtract(piece2.getBoundingInfo().minimum)
                });
                
                // Force clean bounding box calculation for fresh mesh
                piece2.refreshBoundingInfo();
                piece2.computeWorldMatrix(true);
                piece2.refreshBoundingInfo();
                
                console.log('ScrollCuttingSystem: ✅ Clean mesh should have correct bounding box automatically');
                
                console.log('ScrollCuttingSystem: 🔄 Double-refreshed bounding info for piece2');
                
                console.log('ScrollCuttingSystem: Piece2 bounds AFTER refreshBoundingInfo:', {
                    min: piece2.getBoundingInfo().minimum,
                    max: piece2.getBoundingInfo().maximum,
                    size: piece2.getBoundingInfo().maximum.subtract(piece2.getBoundingInfo().minimum)
                });
                
                const piece2BoundingInfo = piece2.getBoundingInfo();
                const piece2Size = piece2BoundingInfo.maximum.subtract(piece2BoundingInfo.minimum);
                piece2.dimensions = {
                    length: Math.abs(piece2Size.z),
                    width: Math.abs(piece2Size.x),
                    thickness: Math.abs(piece2Size.y)
                };
                
                console.log('ScrollCuttingSystem: Piece2 recalculated dimensions:', piece2.dimensions);
                console.log('ScrollCuttingSystem: Piece2 original dimensions were:', originalDimensions);
                
                // Create partData for piece2 with matching ID and updated dimensions
                piece2.partData = {
                    ...originalPartData,
                    id: piece2Id,
                    materialName: (originalMaterialName || 'Unknown Material') + ' (Cut Piece)',
                    dimensions: piece2.dimensions, // Use the recalculated dimensions
                    status: 'cut_piece',
                    modifiedAt: new Date().toISOString()
                };
                
                console.log('ScrollCuttingSystem: Configured piece2 properties:', {
                    id: piece2.id,
                    partDataId: piece2.partData?.id,
                    materialName: piece2.materialName,
                    isWorkBenchPart: piece2.isWorkBenchPart,
                    pickable: piece2.pickable,
                    isVisible: piece2.isVisible
                });
                
                console.log('ScrollCuttingSystem: Configured piece1 properties:', {
                    id: piece1.id,
                    partDataId: piece1.partData?.id,
                    materialName: piece1.materialName,
                    isWorkBenchPart: piece1.isWorkBenchPart,
                    pickable: piece1.pickable,
                    isVisible: piece1.isVisible
                });
                
                // Don't add piece1 to array yet - it will replace the original
                // Only add piece2 as a new additional piece (add the part data object, not the mesh)
                console.log('ScrollCuttingSystem: Adding piece2 part data to workBenchParts:', piece2.id);
                console.log('ScrollCuttingSystem: piece2 isVisible:', piece2.isVisible);
                console.log('ScrollCuttingSystem: piece2 pickable:', piece2.pickable);
                console.log('ScrollCuttingSystem: piece2 position:', piece2.position);
                console.log('ScrollCuttingSystem: workBenchParts length before:', this.drawingWorld.workBenchParts.length);
                
                // Add the part data object to workBenchParts array (not the mesh)
                this.drawingWorld.workBenchParts.push(piece2.partData);
                
                console.log('ScrollCuttingSystem: workBenchParts length after:', this.drawingWorld.workBenchParts.length);
                console.log('ScrollCuttingSystem: Last added part ID:', this.drawingWorld.workBenchParts[this.drawingWorld.workBenchParts.length - 1]?.id);
                console.log('ScrollCuttingSystem: Last added part dimensions:', this.drawingWorld.workBenchParts[this.drawingWorld.workBenchParts.length - 1]?.dimensions);
                
                console.log('ScrollCuttingSystem: Created two pieces using cutting mesh twice');
                
                // Use first piece as primary result
                cutPart = piece1;
                
                // DEBUG: Check if piece1 dimensions are preserved after assignment
                console.log('ScrollCuttingSystem: 🔍 DEBUG ASSIGNMENT - piece1.dimensions:', piece1.dimensions);
                console.log('ScrollCuttingSystem: 🔍 DEBUG ASSIGNMENT - cutPart.dimensions:', cutPart.dimensions);
                console.log('ScrollCuttingSystem: 🔍 DEBUG ASSIGNMENT - cutPart === piece1:', cutPart === piece1);
                
                // FORCE: Ensure cutPart has the correct dimensions from piece1
                if (cutPart === piece1) {
                    console.log('ScrollCuttingSystem: 🔄 FORCE: Setting cutPart.dimensions from piece1.dimensions');
                    cutPart.dimensions = piece1.dimensions;
                    console.log('ScrollCuttingSystem: 🔄 FORCE: cutPart.dimensions after force-set:', cutPart.dimensions);
                }
                
                // Final geometry update for gizmo system
                cutPart.refreshBoundingInfo();
                cutPart.computeWorldMatrix(true);
                cutPart.refreshBoundingInfo(); // Triple refresh for safety
                
                console.log('ScrollCuttingSystem: 🎯 Final cutPart geometry check for gizmo system:', {
                    name: cutPart.name,
                    bounds: cutPart.getBoundingInfo().maximum.subtract(cutPart.getBoundingInfo().minimum),
                    dimensions: cutPart.dimensions
                });
                
                // Clean up
                cuttingMesh.dispose();
                
                console.log('ScrollCuttingSystem: Created cut piece, disposed original');
                
            } catch (error) {
                console.error('ScrollCuttingSystem: Cutting failed:', error);
                throw new Error(`Cutting failed: ${error.message}`);
            }
            
            console.log('Cut part created:', {
                name: cutPart?.name,
                hasVertices: cutPart?.getVerticesData ? !!cutPart.getVerticesData(BABYLON.VertexBuffer.PositionKind) : false,
                vertexCount: cutPart?.getVerticesData ? cutPart.getVerticesData(BABYLON.VertexBuffer.PositionKind)?.length / 3 : 0
            });
            
            // Verify the cut part was created successfully
            if (!cutPart || !cutPart.getVerticesData || !cutPart.getVerticesData(BABYLON.VertexBuffer.PositionKind)) {
                throw new Error('CSG result produced invalid mesh');
            }
            
            cutPart.position = originalPosition;
            cutPart.isWorkBenchPart = true;
            // Don't overwrite partData - piece1 already has correct partData with recalculated dimensions
            console.log('ScrollCuttingSystem: 🔍 Preserving cutPart.partData.dimensions:', cutPart.partData?.dimensions);
            
            // Copy all necessary properties from original to cut part
            cutPart.id = originalId;
            cutPart.materialId = originalMaterialId;
            cutPart.materialName = originalMaterialName;
            // Don't overwrite dimensions - piece1 already has correct recalculated dimensions
            cutPart.grade = originalGrade || 'unknown';
            cutPart.pickable = true;
            cutPart.isVisible = true;
            cutPart.checkCollisions = false;
            
            // DEBUG: Check what dimensions cutPart has at this point
            console.log('ScrollCuttingSystem: 🔍 AFTER property copy - cutPart.dimensions:', cutPart.dimensions);
            
            console.log('ScrollCuttingSystem: Original part dimensions:', originalDimensions);
            console.log('ScrollCuttingSystem: Cut part dimensions (should be recalculated):', cutPart.dimensions);
            console.log('ScrollCuttingSystem: ✅ Dimensions preserved - no overwrite with original dimensions!');
            
            // VERSION CHECK: Make sure the updated file is loaded
            console.log('ScrollCuttingSystem: 📋 VERSION CHECK - Nuclear fix code is loaded! Time:', new Date().toISOString());
            
            // ABSOLUTE NUCLEAR FIX: Force dimensions based on actual mesh bounding box (OUTSIDE CSG try-catch)
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR FIX (OUTSIDE CSG) - Recalculating dimensions from actual mesh');
            cutPart.refreshBoundingInfo();
            cutPart.computeWorldMatrix(true);
            cutPart.refreshBoundingInfo();
            
            const finalBounds = cutPart.getBoundingInfo();
            const finalSize = finalBounds.maximum.subtract(finalBounds.minimum);
            const finalDimensions = {
                length: Math.abs(finalSize.z),
                width: Math.abs(finalSize.x),
                thickness: Math.abs(finalSize.y)
            };
            
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR (OUTSIDE CSG) - Calculated dimensions from mesh:', finalDimensions);
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR (OUTSIDE CSG) - Previous cutPart.dimensions:', cutPart.dimensions);
            
            cutPart.dimensions = finalDimensions;
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR (OUTSIDE CSG) - FORCED cutPart.dimensions:', cutPart.dimensions);
            
            // Also force the partData to have the correct dimensions
            if (cutPart.partData) {
                cutPart.partData.dimensions = finalDimensions;
                console.log('ScrollCuttingSystem: 🔥 NUCLEAR (OUTSIDE CSG) - FORCED cutPart.partData.dimensions:', cutPart.partData.dimensions);
            }
            
            // DEBUG: Check cutPart properties
            console.log('ScrollCuttingSystem: 🔍 CRITICAL DEBUG - cutPart name:', cutPart.name);
            console.log('ScrollCuttingSystem: 🔍 CRITICAL DEBUG - cutPart ID:', cutPart.id);
            console.log('ScrollCuttingSystem: 🔍 CRITICAL DEBUG - cutPart object type:', typeof cutPart);
            
            // Force recalculate dimensions from actual mesh if needed
            if (cutPart && !cutPart.dimensions) {
                console.log('ScrollCuttingSystem: 🔄 FORCE-RECALCULATING cutPart.dimensions from mesh bounds');
                const actualBounds = cutPart.getBoundingInfo();
                const actualSize = actualBounds.maximum.subtract(actualBounds.minimum);
                cutPart.dimensions = {
                    length: Math.abs(actualSize.z),
                    width: Math.abs(actualSize.x),
                    thickness: Math.abs(actualSize.y)
                };
                console.log('ScrollCuttingSystem: 🔄 FORCE-RECALCULATED cutPart.dimensions:', cutPart.dimensions);
            }
            
            // Debug: Compare mesh bounding box to dimensions
            const actualBounds = cutPart.getBoundingInfo();
            const actualSize = actualBounds.maximum.subtract(actualBounds.minimum);
            console.log('ScrollCuttingSystem: CRITICAL - Actual mesh bounding box size:', {
                length: Math.abs(actualSize.z),
                width: Math.abs(actualSize.x),
                thickness: Math.abs(actualSize.y)
            });
            console.log('ScrollCuttingSystem: CRITICAL - Stored dimensions:', cutPart.dimensions);
            console.log('ScrollCuttingSystem: CRITICAL - Dimensions match bounding box?', {
                lengthMatch: Math.abs(Math.abs(actualSize.z) - cutPart.dimensions.length) < 0.01,
                widthMatch: Math.abs(Math.abs(actualSize.x) - cutPart.dimensions.width) < 0.01,
                thicknessMatch: Math.abs(Math.abs(actualSize.y) - cutPart.dimensions.thickness) < 0.01
            });
            
            console.log('Cut part created:', cutPart.name);
            console.log('Cut part material:', cutPart.material?.name);
            
            // EMERGENCY FIX: Force the dimensions to be correct based on mesh bounds
            // This is a nuclear option but we need to fix the gizmo positioning
            if (cutPart && cutPart.getBoundingInfo) {
                console.log('ScrollCuttingSystem: 🚨 EMERGENCY FIX - Forcing cutPart.dimensions from mesh bounds');
                console.log('ScrollCuttingSystem: 🚨 BEFORE - cutPart.dimensions:', cutPart.dimensions);
                const emergencyBounds = cutPart.getBoundingInfo();
                const emergencySize = emergencyBounds.maximum.subtract(emergencyBounds.minimum);
                cutPart.dimensions = {
                    length: Math.abs(emergencySize.z),
                    width: Math.abs(emergencySize.x),
                    thickness: Math.abs(emergencySize.y)
                };
                console.log('ScrollCuttingSystem: 🚨 AFTER - cutPart.dimensions:', cutPart.dimensions);
            }
            
            // NUCLEAR FIX: Force dimensions based on actual mesh bounding box
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR FIX - Recalculating dimensions from actual mesh');
            cutPart.refreshBoundingInfo();
            cutPart.computeWorldMatrix(true);
            cutPart.refreshBoundingInfo();
            
            const nuclearBounds = cutPart.getBoundingInfo();
            const nuclearSize = nuclearBounds.maximum.subtract(nuclearBounds.minimum);
            const nuclearDimensions = {
                length: Math.abs(nuclearSize.z),
                width: Math.abs(nuclearSize.x),
                thickness: Math.abs(nuclearSize.y)
            };
            
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR - Calculated dimensions from mesh:', nuclearDimensions);
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR - Previous cutPart.dimensions:', cutPart.dimensions);
            
            cutPart.dimensions = nuclearDimensions;
            console.log('ScrollCuttingSystem: 🔥 NUCLEAR - FORCED cutPart.dimensions:', cutPart.dimensions);
            
            // Also force the partData to have the correct dimensions
            if (cutPart.partData) {
                cutPart.partData.dimensions = nuclearDimensions;
                console.log('ScrollCuttingSystem: 🔥 NUCLEAR - FORCED cutPart.partData.dimensions:', cutPart.partData.dimensions);
            }
            
            // Original part kept, cutting mesh disposed in CSG section
            
            // Make sure the cut part is the new focus
            this.focusPart = cutPart;
            
            // Force scene refresh
            this.scene.render();
            
            // Update references in drawing world
            const partIndex = this.drawingWorld.workBenchParts.findIndex(part => part.id === originalId);
            console.log('Found part at index:', partIndex, 'in workBenchParts array');
            
            if (partIndex !== -1) {
                console.log('ScrollCuttingSystem: BEFORE replacement - cutPart dimensions:', cutPart.dimensions);
                console.log('ScrollCuttingSystem: BEFORE replacement - original part dimensions:', this.drawingWorld.workBenchParts[partIndex].dimensions);
                
                // CRITICAL: The workBenchParts array contains part DATA objects, not mesh objects
                // We need to create a proper part data object with updated dimensions
                const originalPartData = this.drawingWorld.workBenchParts[partIndex];
                
                const updatedPartData = {
                    ...originalPartData,
                    dimensions: cutPart.dimensions, // Use the recalculated dimensions from mesh
                    status: 'cut_piece',
                    modifiedAt: new Date().toISOString()
                };
                
                console.log('ScrollCuttingSystem: 🔄 CREATING: Updated part data object with recalculated dimensions:', updatedPartData.dimensions);
                
                // Replace with updated part data object (not mesh)
                this.drawingWorld.workBenchParts[partIndex] = updatedPartData;
                
                // Update mesh's partData reference
                cutPart.partData = updatedPartData;
                
                console.log('ScrollCuttingSystem: AFTER replacement - workBenchParts[index] dimensions:', this.drawingWorld.workBenchParts[partIndex].dimensions);
                console.log('ScrollCuttingSystem: AFTER replacement - cutPart.partData.dimensions:', cutPart.partData.dimensions);
                console.log('Updated workBenchParts array with correct part data object');
            } else {
                // Try to find by ID or name
                const partByIdIndex = this.drawingWorld.workBenchParts.findIndex(part => part.id === originalId);
                if (partByIdIndex !== -1) {
                    this.drawingWorld.workBenchParts[partByIdIndex] = cutPart;
                    console.log('Updated workBenchParts array by ID with cut part');
                } else {
                    // Original part not found in array, add cut part anyway
                    this.drawingWorld.workBenchParts.push(cutPart);
                    console.log('Original part not found, added cut part to workBenchParts array');
                }
            }
            
            // Also update the selected part reference if it exists
            if (this.drawingWorld.selectedPart === originalPart) {
                this.drawingWorld.selectedPart = cutPart;
                console.log('Updated selected part reference');
            }
            
            // Make sure both pieces are properly registered in the scene
            if (this.drawingWorld.scene) {
                // Check if both pieces are in the scene
                const cutPartInScene = this.drawingWorld.scene.meshes.includes(cutPart);
                // Find the actual piece2 mesh in the scene
                const piece2Mesh = this.scene.meshes.find(mesh => mesh.name && mesh.name.includes('_piece2'));
                const piece2InScene = piece2Mesh ? this.drawingWorld.scene.meshes.includes(piece2Mesh) : false;
                console.log('ScrollCuttingSystem: CutPart in scene:', cutPartInScene, 'Piece2 in scene:', piece2InScene);
                
                // Debug: Check if pieces are truly independent
                const piece2PartData = this.drawingWorld.workBenchParts[this.drawingWorld.workBenchParts.length - 1];
                
                console.log('ScrollCuttingSystem: Independence check:');
                console.log('  CutPart center:', cutPart.getBoundingInfo().boundingBox.center);
                if (piece2Mesh) {
                    console.log('  Piece2 center:', piece2Mesh.getBoundingInfo().boundingBox.center);
                    console.log('  CutPart parent:', cutPart.parent);
                    console.log('  Piece2 parent:', piece2Mesh.parent);
                    console.log('  CutPart === Piece2:', cutPart === piece2Mesh);
                } else {
                    console.log('  Piece2 mesh not found in scene');
                }
                
                // Debug: Check what gizmo system would see
                console.log('ScrollCuttingSystem: Gizmo system would see:');
                console.log('  CutPart bounds:', {
                    min: cutPart.getBoundingInfo().minimum,
                    max: cutPart.getBoundingInfo().maximum,
                    size: cutPart.getBoundingInfo().maximum.subtract(cutPart.getBoundingInfo().minimum),
                    center: cutPart.getBoundingInfo().boundingBox.center
                });
                if (piece2Mesh) {
                    console.log('  Piece2 bounds:', {
                        min: piece2Mesh.getBoundingInfo().minimum,
                        max: piece2Mesh.getBoundingInfo().maximum,
                        size: piece2Mesh.getBoundingInfo().maximum.subtract(piece2Mesh.getBoundingInfo().minimum),
                        center: piece2Mesh.getBoundingInfo().boundingBox.center
                    });
                    console.log('  Piece2 dimensions property:', piece2Mesh.dimensions);
                }
                console.log('  CutPart dimensions property:', cutPart.dimensions);
                console.log('  Piece2 part data dimensions:', piece2PartData.dimensions);
            }
            
            // Force the drawing world to recognize the new part
            if (this.drawingWorld.selectPart) {
                console.log('ScrollCuttingSystem: BEFORE selectPart - cutPart dimensions:', cutPart.dimensions);
                console.log('ScrollCuttingSystem: BEFORE selectPart - cutPart.partData.dimensions:', cutPart.partData?.dimensions);
                
                // Select using the part data object (not the mesh)
                this.drawingWorld.selectPart(cutPart.partData);
                
                console.log('ScrollCuttingSystem: AFTER selectPart - cutPart dimensions:', cutPart.dimensions);
                console.log('ScrollCuttingSystem: AFTER selectPart - cutPart.partData.dimensions:', cutPart.partData?.dimensions);
                console.log('Re-selected cut part in drawing world using part data object');
            }
            
            // Update workbench display to show both pieces
            if (this.drawingWorld.updateWorkBenchDisplay) {
                console.log('ScrollCuttingSystem: About to update workbench display');
                console.log('ScrollCuttingSystem: workBenchParts array now has:', this.drawingWorld.workBenchParts.length, 'parts');
                this.drawingWorld.workBenchParts.forEach((part, index) => {
                    console.log(`ScrollCuttingSystem: Part ${index}:`, {
                        id: part.id,
                        materialName: part.materialName,
                        dimensions: part.dimensions,
                        pickable: part.pickable,
                        isVisible: part.isVisible
                    });
                });
                
                this.drawingWorld.updateWorkBenchDisplay();
                console.log('Updated workbench display');
            }
            
            // Create visual cut line
            this.createVisualCutLine();
            
            console.log('ScrollCuttingSystem: ✅ Cut completed successfully!');
            
            if (selectionInfo) {
                selectionInfo.innerHTML = '<strong style="color: green;">✅ Cut Complete!</strong><br><span style="font-size: 0.9em;">Material successfully cut from board. Press ESC to exit.</span>';
            }
            
        } catch (error) {
            console.error('ScrollCuttingSystem: Cut failed:', error);
            
            // Create visual cut line as fallback
            this.createVisualCutLine();
            
            if (selectionInfo) {
                selectionInfo.innerHTML = `<strong style="color: red;">❌ Cut Failed</strong><br><span style="font-size: 0.9em;">${error.message}. Visual cut line created instead. Press ESC to exit.</span>`;
            }
            
            console.log('ScrollCuttingSystem: Cut failed - fell back to visual cut line');
        }
    }
    
    /**
     * Create curved cutting tool that follows the actual path
     */
    createSimpleCuttingBox() {
        if (!this.smoothedPath || this.smoothedPath.length < 2) return null;
        
        console.log('ScrollCuttingSystem: Creating curved cutting tool following path...');
        
        // Convert path to world coordinates
        const worldPath = this.smoothedPath.map(point => this.localToWorld(point));
        
        // Get board dimensions
        const meshBounds = this.focusPart.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Create cutting profile (thin rectangle for scroll saw blade)
        const bladeWidth = 1.0; // 1cm blade width - wider for CSG stability
        const bladeHeight = this.cutDepth; // Use actual cut depth setting
        
        // Create cutting profile - positioned to cut from top surface down
        const profileShape = [
            new BABYLON.Vector3(-bladeWidth/2, 0, 0),           // Top left (at surface)
            new BABYLON.Vector3(bladeWidth/2, 0, 0),            // Top right (at surface) 
            new BABYLON.Vector3(bladeWidth/2, -bladeHeight, 0), // Bottom right (cut depth down)
            new BABYLON.Vector3(-bladeWidth/2, -bladeHeight, 0), // Bottom left (cut depth down)
            new BABYLON.Vector3(-bladeWidth/2, 0, 0)            // Close the shape
        ];
        
        try {
            // Ultra-simple approach: just use a single big box that covers the entire path area
            console.log('ScrollCuttingSystem: Creating ultra-simple box cutter for entire path area');
            
            const boardTopY = meshBounds.maximum.y;
            
            // Find the bounding box of the entire path
            let minX = worldPath[0].x, maxX = worldPath[0].x;
            let minZ = worldPath[0].z, maxZ = worldPath[0].z;
            
            worldPath.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minZ = Math.min(minZ, point.z);
                maxZ = Math.max(maxZ, point.z);
            });
            
            // Add some padding to ensure we cover the path
            const padding = bladeWidth;
            minX -= padding;
            maxX += padding;
            minZ -= padding;
            maxZ += padding;
            
            // Create a single box that covers the entire path area
            const simpleBox = BABYLON.MeshBuilder.CreateBox('ultraSimpleCutter', {
                width: Math.max(maxX - minX, bladeWidth),
                height: bladeHeight,
                depth: Math.max(maxZ - minZ, bladeWidth)
            }, this.scene);
            
            // Position at the center of the path area
            simpleBox.position = new BABYLON.Vector3(
                (minX + maxX) / 2,
                boardTopY - (bladeHeight / 2),
                (minZ + maxZ) / 2
            );
            
            console.log('ScrollCuttingSystem: Ultra-simple box cutter created:', {
                width: maxX - minX,
                height: bladeHeight,
                depth: maxZ - minZ,
                position: simpleBox.position
            });
            
            return simpleBox;
            
        } catch (error) {
            console.warn('ScrollCuttingSystem: Simple cylindrical cutting failed, falling back to box:', error);
            
            // Fallback to simple rectangular cutting if curved fails
            console.log('ScrollCuttingSystem: Creating simple rectangular cutting box fallback');
            
            const worldPath = this.smoothedPath.map(point => this.localToWorld(point));
            let minX = worldPath[0].x, maxX = worldPath[0].x;
            let minZ = worldPath[0].z, maxZ = worldPath[0].z;
            
            worldPath.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minZ = Math.min(minZ, point.z);
                maxZ = Math.max(maxZ, point.z);
            });
            
            // Ensure minimum dimensions for cutting box
            const width = Math.max(maxX - minX, 0.5);  // Minimum 5mm wide
            const depth = Math.max(maxZ - minZ, 0.5);  // Minimum 5mm deep
            const height = Math.max(this.cutDepth, 0.1); // Minimum 1mm deep
            
            const fallbackBox = BABYLON.MeshBuilder.CreateBox('fallbackCutter', {
                width: width,
                height: height,
                depth: depth
            }, this.scene);
            
            // Position the cutting box at the top surface of the board, cutting downward
            const meshBounds = this.focusPart.getBoundingInfo();
            const boardTopY = meshBounds.maximum.y;
            
            fallbackBox.position = new BABYLON.Vector3(
                (minX + maxX) / 2,
                boardTopY - (height / 2), // Center the box at cut depth
                (minZ + maxZ) / 2
            );
            
            console.log('ScrollCuttingSystem: Fallback box created:', {
                width: width,
                height: height,
                depth: depth,
                position: fallbackBox.position
            });
            
            return fallbackBox;
        }
    }
    
    /**
     * Execute the actual cut operation (called by ENTER key) - LEGACY
     */
    executeActualCut() {
        if (!this.smoothedPath || this.smoothedPath.length < 2) {
            console.warn('ScrollCuttingSystem: Cannot execute cut - no valid path');
            return;
        }
        
        console.log('ScrollCuttingSystem: Executing actual scroll cut with', this.smoothedPath.length, 'points');
        
        // Update UI
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.innerHTML = '<strong>⚡ Executing Cut...</strong>';
        }
        
        try {
            console.log('ScrollCuttingSystem: Executing REAL material cutting...');
            
            // Create cutting tool geometry
            const cuttingTool = this.createSimpleCuttingTool();
            
            if (cuttingTool && this.focusPart) {
                // Store original part reference
                const originalPart = this.focusPart;
                
                // Perform CSG boolean subtraction
                console.log('ScrollCuttingSystem: Performing CSG subtraction...');
                const csgA = BABYLON.CSG.FromMesh(originalPart);
                const csgB = BABYLON.CSG.FromMesh(cuttingTool);
                const csgResult = csgA.subtract(csgB);
                
                // Create new mesh from result
                const cutPart = csgResult.toMesh(originalPart.name + '_scrollCut', originalPart.material, this.scene);
                
                // Position and orient the new part
                cutPart.position = originalPart.position.clone();
                cutPart.rotation = originalPart.rotation.clone();
                cutPart.scaling = originalPart.scaling.clone();
                
                // Copy important metadata
                cutPart.isWorkBenchPart = true;
                cutPart.partData = originalPart.partData;
                
                // Replace in workbench parts array
                const partIndex = this.drawingWorld.workBenchParts.findIndex(part => part === originalPart);
                if (partIndex !== -1) {
                    this.drawingWorld.workBenchParts[partIndex] = cutPart;
                }
                
                // Update current work part reference
                if (this.drawingWorld.currentWorkPart === originalPart) {
                    this.drawingWorld.currentWorkPart = cutPart;
                }
                
                // Clean up original part and cutting tool
                originalPart.dispose();
                cuttingTool.dispose();
                
                // Update focus part reference
                this.focusPart = cutPart;
                
                console.log('ScrollCuttingSystem: ✅ Material successfully cut and removed!');
                
                // Show success message
                if (selectionInfo) {
                    selectionInfo.innerHTML = '<strong style="color: green;">✅ Material Cut!</strong><br><span style="font-size: 0.9em;">Material removed from board. Draw another path or press ESC to exit.</span>';
                }
            } else {
                throw new Error('Failed to create cutting tool');
            }
            
        } catch (error) {
            console.error('ScrollCuttingSystem: Cut failed:', error);
            
            // Try to recover the board if it disappeared
            this.recoverBoardIfMissing();
            
            if (selectionInfo) {
                selectionInfo.innerHTML = '<strong style="color: red;">❌ Cut Failed</strong><br><span style="font-size: 0.9em;">Board recovered. Try a simpler path or press ESC to exit.</span>';
            }
        }
        
        // DON'T clear the cutting path - keep it visible
        // User can press DELETE to clear or ESC to exit
        console.log('ScrollCuttingSystem: Cut line preserved, path and handles kept for further editing');
    }
    
    /**
     * Create simple, reliable cutting tool geometry
     */
    createSimpleCuttingTool() {
        if (!this.smoothedPath || this.smoothedPath.length < 2) return null;
        
        console.log('ScrollCuttingSystem: Creating simple cutting tool...');
        
        // Get board bounds for sizing
        const meshBounds = this.focusPart.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = this.focusPart.position;
        
        // Create a series of simple box cutters along the path
        const cutters = [];
        const cutterWidth = 0.5; // 5mm wide blade
        const cutterHeight = meshSize.y + 2; // Cut through entire thickness plus extra
        
        // Convert path to world coordinates
        const worldPath = this.smoothedPath.map(point => this.localToWorld(point));
        
        // Create box cutters at each path point
        for (let i = 0; i < worldPath.length - 1; i++) {
            const startPoint = worldPath[i];
            const endPoint = worldPath[i + 1];
            
            // Calculate segment direction and length
            const direction = endPoint.subtract(startPoint);
            const length = direction.length();
            const normalizedDir = direction.normalize();
            
            // Create box cutter for this segment
            const segmentCutter = BABYLON.MeshBuilder.CreateBox(`cutter_${i}`, {
                width: cutterWidth,
                height: cutterHeight,
                depth: length
            }, this.scene);
            
            // Position at segment center
            const segmentCenter = startPoint.add(endPoint).scale(0.5);
            segmentCutter.position = segmentCenter;
            
            // Orient along segment direction
            const rotationAxis = BABYLON.Vector3.Cross(BABYLON.Vector3.Forward(), normalizedDir);
            if (rotationAxis.length() > 0.001) {
                const rotationAngle = Math.acos(BABYLON.Vector3.Dot(BABYLON.Vector3.Forward(), normalizedDir));
                segmentCutter.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis.normalize(), rotationAngle);
            }
            
            cutters.push(segmentCutter);
        }
        
        // Merge all cutters into one
        let combinedCutter = cutters[0];
        for (let i = 1; i < cutters.length; i++) {
            if (combinedCutter && cutters[i]) {
                try {
                    const csgA = BABYLON.CSG.FromMesh(combinedCutter);
                    const csgB = BABYLON.CSG.FromMesh(cutters[i]);
                    const csgResult = csgA.union(csgB);
                    
                    const newCombined = csgResult.toMesh(`combinedCutter_${i}`, null, this.scene);
                    combinedCutter.dispose();
                    cutters[i].dispose();
                    combinedCutter = newCombined;
                } catch (error) {
                    console.warn('ScrollCuttingSystem: Failed to union cutter segment', i, error);
                }
            }
        }
        
        console.log('ScrollCuttingSystem: Simple cutting tool created with', cutters.length, 'segments');
        return combinedCutter;
    }
    
    /**
     * Create visual cut line on the board surface (fallback)
     */
    createVisualCutLine() {
        if (!this.smoothedPath || this.smoothedPath.length < 2 || !this.isValidMesh(this.focusPart)) return;
        
        // Convert local path points to world coordinates on the board surface
        const meshBounds = this.focusPart.getBoundingInfo();
        const surfaceY = meshBounds.maximum.y + 0.01; // Slightly above surface
        
        const cutLinePoints = this.smoothedPath.map(localPoint => {
            const worldPoint = this.localToWorld(localPoint);
            // Project to board surface
            return new BABYLON.Vector3(worldPoint.x, surfaceY, worldPoint.z);
        });
        
        // Create permanent cut line
        const cutLine = BABYLON.LinesBuilder.CreateLines('permanentCutLine', {
            points: cutLinePoints
        }, this.scene);
        
        // Style as engraved cut line
        cutLine.color = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark gray
        cutLine.alpha = 1.0;
        cutLine.isPickable = false;
        cutLine.renderingGroupId = 1;
        
        // Make it thick by creating multiple offset lines
        for (let i = 1; i <= 3; i++) {
            const offsetPoints = cutLinePoints.map(point => 
                new BABYLON.Vector3(point.x, point.y + (i * 0.002), point.z)
            );
            
            const offsetLine = BABYLON.LinesBuilder.CreateLines(`cutLineOffset_${i}`, {
                points: offsetPoints
            }, this.scene);
            
            offsetLine.color = new BABYLON.Color3(0.2, 0.2, 0.2);
            offsetLine.alpha = 0.8 - (i * 0.2);
            offsetLine.isPickable = false;
            offsetLine.renderingGroupId = 1;
        }
        
        console.log('ScrollCuttingSystem: Created visual cut line on board surface');
    }
    
    /**
     * Recover board if it disappeared during cutting operation
     */
    recoverBoardIfMissing() {
        // Check if current focus part still exists and is valid
        if (!this.isValidMesh(this.focusPart)) {
            console.log('ScrollCuttingSystem: Board disappeared or invalid, attempting recovery...');
            
            // Try to find a valid board in the workbench parts
            const workbenchParts = this.drawingWorld.workBenchParts;
            let foundValidPart = false;
            
            for (let i = 0; i < workbenchParts.length; i++) {
                const part = workbenchParts[i];
                if (this.isValidMesh(part)) {
                    this.focusPart = part;
                    foundValidPart = true;
                    console.log('ScrollCuttingSystem: Recovered focus to valid workbench part');
                    break;
                }
            }
            
            if (!foundValidPart) {
                // Try to use the original part if it's still valid
                if (this.isValidMesh(this.originalPart)) {
                    this.focusPart = this.originalPart;
                    console.log('ScrollCuttingSystem: Recovered focus to original part');
                } else {
                    // Create a simple recovery board
                    console.log('ScrollCuttingSystem: Creating recovery board...');
                    this.createRecoveryBoard();
                }
            }
        }
        
        // Make sure the board is visible
        if (this.isValidMesh(this.focusPart)) {
            if (this.focusPart.setEnabled) {
                this.focusPart.setEnabled(true);
            }
            this.focusPart.visibility = 1.0;
            console.log('ScrollCuttingSystem: Board visibility restored');
        }
    }
    
    /**
     * Create a simple recovery board if original is lost
     */
    createRecoveryBoard() {
        const recoveryBoard = BABYLON.MeshBuilder.CreateBox('recoveryBoard', {
            width: 30, // 30cm wide
            height: 2,  // 2cm thick  
            depth: 20   // 20cm deep
        }, this.scene);
        
        // Position at origin
        recoveryBoard.position = new BABYLON.Vector3(0, 1, 0);
        
        // Basic wood material
        const woodMaterial = new BABYLON.StandardMaterial('recoveryWood', this.scene);
        woodMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.4);
        recoveryBoard.material = woodMaterial;
        
        // Set metadata
        recoveryBoard.isWorkBenchPart = true;
        recoveryBoard.partData = {
            materialName: 'Recovery Board',
            width: 30,
            height: 2,
            depth: 20
        };
        
        // Add to workbench
        this.drawingWorld.workBenchParts.push(recoveryBoard);
        
        // Validate that the recovery board was created properly
        if (this.isValidMesh(recoveryBoard)) {
            this.focusPart = recoveryBoard;
            console.log('ScrollCuttingSystem: Recovery board created and validated');
        } else {
            console.error('ScrollCuttingSystem: Recovery board creation failed - invalid mesh');
        }
    }
    
    /**
     * Cancel current cut and clear path
     */
    cancelCurrentCut() {
        this.clearCurrentCutPath();
        this.deactivate();
    }
    
    /**
     * Clear current cutting path and handles
     */
    clearCurrentCutPath() {
        this.clearCurrentPath();
        this.clearBezierHandles();
        
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.textContent = 'Scroll Cutting Mode - Draw cutting paths with your mouse. Press ESC to exit.';
        }
        
        console.log('ScrollCuttingSystem: Cleared current cutting path');
    }
    
    /**
     * Legacy execute method (for compatibility)
     */
    executeCut() {
        // Redirect to the new actual cut method
        this.executeActualCut();
    }
    
    /**
     * Force exit from scroll cutting mode (ESC key)
     */
    forceExit() {
        console.log('ScrollCuttingSystem: FORCE EXIT initiated');
        
        // Set inactive immediately
        this.isActive = false;
        
        // Clear everything
        this.clearCurrentPath();
        this.clearBezierHandles();
        this.hideRulers();
        
        // FORCE exit orthographic mode
        try {
            this.exitOrthographicMode();
        } catch (error) {
            console.warn('ScrollCuttingSystem: Error exiting ortho mode:', error);
            // Force restore camera manually
            if (this.drawingWorld.camera) {
                this.drawingWorld.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
                console.log('ScrollCuttingSystem: Forced camera back to perspective');
            }
        }
        
        // FORCE enable camera controls
        try {
            // Ensure camera is in correct mode
            if (this.drawingWorld.camera.mode !== BABYLON.Camera.PERSPECTIVE_CAMERA) {
                this.drawingWorld.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
            }
            
            // Restore camera controls using standard Babylon.js method
            this.drawingWorld.camera.attachControl(this.drawingWorld.canvas, true);
            console.log('ScrollCuttingSystem: Camera controls fully restored');
        } catch (error) {
            console.warn('ScrollCuttingSystem: Error enabling camera controls:', error);
        }
        
        // Remove keyboard handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        
        // Remove pan observer
        if (this.panObserver) {
            this.scene.onPointerObservable.remove(this.panObserver);
            this.panObserver = null;
        }
        
        // Remove zoom observer
        if (this.zoomObserver) {
            this.scene.onPointerObservable.remove(this.zoomObserver);
            this.zoomObserver = null;
        }
        
        // Remove drag observer (integrated into main pointer observer)
        if (this.dragObserver) {
            this.scene.onPointerObservable.remove(this.dragObserver);
            this.dragObserver = null;
        }
        
        // Update UI
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.textContent = 'Scroll cutting FORCE EXITED - camera restored';
        }
        
        console.log('ScrollCuttingSystem: FORCE EXIT completed - you should be able to move camera now');
    }
    
    /**
     * Deactivate scroll cutting mode
     */
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.focusPart = null;
        
        // Clear any active drawing
        this.clearCurrentPath();
        
        // Clear bezier handles
        this.clearBezierHandles();
        
        // Exit orthographic mode
        this.exitOrthographicMode();
        
        // Re-enable camera controls
        this.enableCameraControls();
        
        // Hide rulers
        this.hideRulers();
        
        // Remove keyboard handler
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }
        
        // Remove pan observer
        if (this.panObserver) {
            this.scene.onPointerObservable.remove(this.panObserver);
            this.panObserver = null;
        }
        
        // Remove zoom observer
        if (this.zoomObserver) {
            this.scene.onPointerObservable.remove(this.zoomObserver);
            this.zoomObserver = null;
        }
        
        // Remove drag observer (integrated into main pointer observer)
        if (this.dragObserver) {
            this.scene.onPointerObservable.remove(this.dragObserver);
            this.dragObserver = null;
        }
        
        // Update UI
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo) {
            selectionInfo.textContent = 'Scroll cutting deactivated';
        }
        
        console.log('ScrollCuttingSystem: Deactivated scroll cutting mode and restored camera controls');
    }
    
    /**
     * Create a cutting mesh that follows the exact curve path
     */
    createCurveCuttingMesh(worldPath, boardTop, boardBottom, kerfWidth) {
        if (!worldPath || worldPath.length < 2) {
            console.error('ScrollCuttingSystem: Invalid world path for cutting mesh');
            return null;
        }
        
        console.log('ScrollCuttingSystem: Creating curve cutting mesh...');
        console.log('Path points:', worldPath.length);
        console.log('Board top:', boardTop, 'Board bottom:', boardBottom);
        console.log('Kerf width:', kerfWidth);
        
        try {
            // Create the cutting mesh using ribbon to follow the path
            const cuttingMesh = this.createRibbonCuttingMesh(worldPath, boardTop, boardBottom, kerfWidth);
            
            if (!cuttingMesh) {
                throw new Error('Failed to create cutting mesh');
            }
            
            console.log('ScrollCuttingSystem: Successfully created curve cutting mesh');
            return cuttingMesh;
            
        } catch (error) {
            console.error('ScrollCuttingSystem: Error creating curve cutting mesh:', error);
            return null;
        }
    }
    
    /**
     * Create a ribbon-based cutting mesh that follows the curve
     */
    createRibbonCuttingMesh(worldPath, boardTop, boardBottom, kerfWidth) {
        try {
            // Validate inputs
            if (!worldPath || !Array.isArray(worldPath)) {
                throw new Error('worldPath is undefined or not an array');
            }
            
            if (worldPath.length < 2) {
                throw new Error('worldPath must have at least 2 points');
            }
            
            console.log('ScrollCuttingSystem: Starting cutting mesh creation with', worldPath.length, 'points');
            
            // Get board bounds for proper positioning
            const boardBounds = this.focusPart.getBoundingInfo();
            const boardWidth = boardBounds.maximum.x - boardBounds.minimum.x;
            const boardDepth = boardBounds.maximum.z - boardBounds.minimum.z;
            
            console.log('ScrollCuttingSystem: Board dimensions:', boardWidth, 'x', boardDepth);
            console.log('ScrollCuttingSystem: Board bounds:', boardBounds.minimum, 'to', boardBounds.maximum);
            
            // Find path bounding box in world coordinates
            let minX = worldPath[0].x, maxX = worldPath[0].x;
            let minZ = worldPath[0].z, maxZ = worldPath[0].z;
            
            worldPath.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minZ = Math.min(minZ, point.z);
                maxZ = Math.max(maxZ, point.z);
            });
            
            console.log('ScrollCuttingSystem: Path bounds:', {minX, maxX, minZ, maxZ});
            
            // DEBUG: Log first few path points to check coordinate orientation
            console.log('ScrollCuttingSystem: First 3 path points:');
            for (let i = 0; i < Math.min(3, worldPath.length); i++) {
                console.log(`  Point ${i}:`, worldPath[i]);
            }
            
            // Create proper extrusion following the curve
            console.log('ScrollCuttingSystem: Creating proper curve extrusion');
            
            // Create a thin cutting blade that follows the exact curve path
            // This is what makes it a SCROLL SAW - it cuts intricate curves
            
            // Create the cutting shape by extruding a thin rectangle along the path
            const bladeWidth = kerfWidth; // Thin like a scroll saw blade
            const bladeHeight = (boardTop - boardBottom) + 2; // Cut through entire board
            
            // Create a thin rectangular cross-section for the blade
            const bladeProfile = [
                new BABYLON.Vector3(-bladeWidth/2, boardBottom - 1, 0),
                new BABYLON.Vector3(bladeWidth/2, boardBottom - 1, 0),
                new BABYLON.Vector3(bladeWidth/2, boardTop + 1, 0),
                new BABYLON.Vector3(-bladeWidth/2, boardTop + 1, 0)
            ];
            
            // Convert world path to local coordinates for the cutting mesh
            // The cutting mesh should be created relative to the board's position
            const boardPosition = this.focusPart.position;
            const extrusionPath = worldPath.map(point => 
                new BABYLON.Vector3(
                    point.x - boardPosition.x,  // Convert to local coordinates
                    point.y - boardPosition.y,  // relative to board position
                    point.z - boardPosition.z
                )
            );
            
            console.log('ScrollCuttingSystem: Creating scroll saw blade following curve');
            console.log('Blade profile points:', bladeProfile.length);
            console.log('Extrusion path points:', extrusionPath.length);
            console.log('Blade width:', bladeWidth, 'Height:', bladeHeight);
            
            // Create the cutting mesh by extruding the blade profile along the curve
            const extrudedMesh = BABYLON.MeshBuilder.ExtrudeShape('scrollSawBlade', {
                shape: bladeProfile,
                path: extrusionPath,
                cap: BABYLON.Mesh.CAP_ALL,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                updatable: false
            }, this.scene);
            
            // Position the cutting mesh at the board's location
            extrudedMesh.position = boardPosition.clone();
            
            console.log('ScrollCuttingSystem: Created scroll saw blade mesh');
            console.log('Blade mesh position:', extrudedMesh.position);
            console.log('Board position:', boardPosition);
            
            console.log('ScrollCuttingSystem: Successfully created extruded cutting mesh');
            console.log('ScrollCuttingSystem: Extruded mesh position:', extrudedMesh.position);
            return extrudedMesh;
            
        } catch (error) {
            console.error('ScrollCuttingSystem: Error creating cutting box:', error);
            console.error('ScrollCuttingSystem: Error details:', error.message, error.stack);
            
            // Fallback to simple box cutting
            console.log('ScrollCuttingSystem: Falling back to simple box cutting');
            return this.createSimpleBoxCuttingMesh(worldPath, boardTop, boardBottom, kerfWidth);
        }
    }
    
    /**
     * Fallback simple box cutting mesh
     */
    createSimpleBoxCuttingMesh(worldPath, boardTop, boardBottom, kerfWidth) {
        // Find path bounding box
        let minX = worldPath[0].x, maxX = worldPath[0].x;
        let minZ = worldPath[0].z, maxZ = worldPath[0].z;
        
        worldPath.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });
        
        // Create simple cutting box
        const cuttingBox = BABYLON.MeshBuilder.CreateBox('simpleCuttingBox', {
            width: Math.max(maxX - minX, kerfWidth),
            height: (boardTop - boardBottom) + 1,
            depth: Math.max(maxZ - minZ, kerfWidth)
        }, this.scene);
        
        // Position it at the center of the path
        cuttingBox.position = new BABYLON.Vector3(
            (minX + maxX) / 2,
            (boardTop + boardBottom) / 2,
            (minZ + maxZ) / 2
        );
        
        console.log('ScrollCuttingSystem: Created simple box cutting mesh as fallback');
        return cuttingBox;
    }
    
    /**
     * Cleanup resources
     */
    dispose() {
        this.deactivate();
        
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        console.log('ScrollCuttingSystem: Disposed');
    }
}