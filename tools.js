// Tool Manager - Handles different drawing tools and their behaviors

// Report version to the global version reporter (wait for it to be available)
const reportVersion = () => {
    if (window.VersionReporter) {
        window.VersionReporter.report('tools.js', 'v20250627_017', 'success');
        return true;
    }
    return false;
};

// Try to report immediately, or wait for VersionReporter to be ready
if (!reportVersion()) {
    // If VersionReporter isn't ready, wait for it
    const checkInterval = setInterval(() => {
        if (reportVersion()) {
            clearInterval(checkInterval);
        }
    }, 50); // Check every 50ms
    
    // Give up after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
}

import { CameraController } from './camera.js'; // Corrected import

export class ToolManager {
    constructor(app) {
        this.app = app;
        this.activeTool = 'select'; // Default tool
        this.isDrawing = false;
        this.startPoint = null;
        this.tempObject = null;
        this.activeHandle = null; // To store info about the active handle being dragged
        this.dragStartPoint = null; // To store mouse position when dragging starts
        this.originalObjectState = null; // To store object state at the start of a drag operation
        
        // Tool-specific settings
        this.snapToGrid = true;
        this.tolerance = 10; // pixels - INCREASED FROM 5
        // SPANKY: Added log to confirm ToolManager constructor is called
    }
    
    setActiveTool(tool) {
        // SPANKY: Added log to confirm this method is called and what tool is being set
        this.activeTool = tool;
        // SPANKY: Added log to show activeTool after change
        this.cancelCurrentOperation(); // Reset drawing state when changing tools
    }
    
    cancelCurrentOperation() {
        this.isDrawing = false;
        this.startPoint = null;
        this.tempObject = null;
        this.activeHandle = null; 
        this.dragStartPoint = null; 
        this.originalObjectState = null; // Reset original state
        
        // SPANKY: No need to reset these here, they are instance properties
        // this.snapToGrid = true; 
        // this.tolerance = 10;
    }
      handleMouseDown(e, worldPos) {
        switch (this.activeTool) {
            case 'select':
                this.handleSelectDown(worldPos);
                break;
            case 'line':
                this.handleLineDown(worldPos);
                break;
            case 'rectangle':
                this.handleRectangleDown(worldPos);
                break;
            case 'circle':
                this.handleCircleDown(worldPos);
                break;
            case 'extrude':
                this.handleExtrudeDown(worldPos);
                break;
            case 'rotate':
                this.handleRotateDown(worldPos);
                break;
        }
    }
    
    handleMouseMove(e, worldPos) {
        let cursor = this.app.canvas.style.cursor || 'default'; // Get current cursor

        switch (this.activeTool) {
            case 'select':
                this.handleSelectMove(worldPos); // This method already handles its own cursor updates
                cursor = this.app.canvas.style.cursor; // Update cursor based on select tool's logic
                break;
            case 'line':
                if (this.isDrawing) {
                    this.handleLineMove(worldPos);
                    cursor = 'crosshair';
                } else {
                    // Not drawing, check for hover over existing objects
                    const hitObject = this.app.drawing.hitTest(
                        worldPos.x, worldPos.y,
                        this.app.objects,
                        this.tolerance / this.app.camera.zoom
                    );
                    cursor = hitObject ? 'pointer' : 'crosshair';
                    if (hitObject) {
                        this.clearHighlights();
                        hitObject.highlighted = true;
                    } else {
                        this.clearHighlights();
                    }
                    this.app.render2D(); // To show/clear highlights
                }
                break;
            case 'rectangle':
                if (this.isDrawing) {
                    this.handleRectangleMove(worldPos);
                    cursor = 'crosshair';
                } else {
                    const hitObject = this.app.drawing.hitTest(
                        worldPos.x, worldPos.y,
                        this.app.objects,
                        this.tolerance / this.app.camera.zoom
                    );
                    cursor = hitObject ? 'pointer' : 'crosshair';
                    if (hitObject) {
                        this.clearHighlights();
                        hitObject.highlighted = true;
                    } else {
                        this.clearHighlights();
                    }
                    this.app.render2D();
                }
                break;
            case 'circle':
                if (this.isDrawing) {
                    this.handleCircleMove(worldPos);
                    cursor = 'crosshair';
                } else {
                    const hitObject = this.app.drawing.hitTest(
                        worldPos.x, worldPos.y,
                        this.app.objects,
                        this.tolerance / this.app.camera.zoom
                    );
                    cursor = hitObject ? 'pointer' : 'crosshair';
                    if (hitObject) {
                        this.clearHighlights();
                        hitObject.highlighted = true;
                    } else {
                        this.clearHighlights();
                    }                    this.app.render2D();
                }
                break;
            case 'extrude':
                this.handleExtrudeMove(worldPos);
                cursor = 'pointer';
                break;
            case 'rotate':
                this.handleRotateMove(worldPos);
                cursor = 'pointer';
                break;
            default:
                cursor = 'default'; // Fallback for unknown tools
        }
        
        this.app.canvas.style.cursor = cursor;

        // Update mouse coordinates in status bar
        document.getElementById('mouse-coords').textContent = 
            `${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`;
    }
      handleMouseUp(e, worldPos) {
        switch (this.activeTool) {
            case 'select':
                this.handleSelectUp(worldPos);
                break;
            case 'line':
                this.handleLineUp(worldPos);
                break;
            case 'rectangle':
                this.handleRectangleUp(worldPos);
                break;
            case 'circle':
                this.handleCircleUp(worldPos);
                break;
            case 'extrude':
                this.handleExtrudeUp(worldPos);
                break;
            case 'rotate':
                this.handleRotateUp(worldPos);
                break;
        }
    }
    
    // Select Tool
    handleSelectDown(worldPos) {
        
        if (this.app.selectedObjects.length === 1) {
            const selectedObject = this.app.selectedObjects[0];
            this.activeHandle = this.getHandleAtPosition(worldPos, selectedObject);
            if (this.activeHandle) {
                this.isDrawing = true; 
                this.dragStartPoint = { ...worldPos }; 
                this.originalObjectState = JSON.parse(JSON.stringify(selectedObject)); // Store original state
                this.app.canvas.style.cursor = this.getCursorForHandle(this.activeHandle.type); 
                return;
            }
        }

        // If no handle was hit (or no object was selected), proceed with object selection logic
        const hitObject = this.app.drawing.hitTest(
            worldPos.x, worldPos.y, 
            this.app.objects, 
            this.tolerance / this.app.camera.zoom // World space tolerance for hit testing
        );
        
        if (hitObject) {
            // If the clicked object is already selected, do nothing (to allow for drag/resize later)
            // For now, just re-select it.
            // if (this.app.selectedObjects.includes(hitObject)) return;            this.app.clearSelection(); // Clear previous selection
            hitObject.selected = true;
            this.app.selectedObjects = [hitObject];
            this.app.updateExtrudeButtonState(); // Update extrude button when selection changes
        } else {
            // Clicked on empty space, clear selection
            this.app.clearSelection();
        }
        
        this.app.render2D(); // Changed from this.app.render() to ensure UI updates correctly
    }
    
    handleSelectMove(worldPos) {
        if (this.isDrawing && this.activeHandle && this.dragStartPoint && this.originalObjectState) {
            const selectedObject = this.activeHandle.object;
            if (!selectedObject) {
                this.isDrawing = false; 
                this.activeHandle = null;
                this.dragStartPoint = null;
                this.originalObjectState = null;
                this.app.canvas.style.cursor = 'default';
                return;
            }

            const totalDeltaX = worldPos.x - this.dragStartPoint.x;
            const totalDeltaY = worldPos.y - this.dragStartPoint.y;
            const o = this.originalObjectState; // Original state
            const s = selectedObject;         // Current state (to be modified)

            if (this.activeHandle.type === 'move') {
                switch (s.type) {
                    case 'rectangle':
                        s.x = o.x + totalDeltaX;
                        s.y = o.y + totalDeltaY;
                        break;
                    case 'circle':
                        s.center.x = o.center.x + totalDeltaX;
                        s.center.y = o.center.y + totalDeltaY;
                        break;
                    case 'line':
                        s.start.x = o.start.x + totalDeltaX;
                        s.start.y = o.start.y + totalDeltaY;
                        s.end.x = o.end.x + totalDeltaX;
                        s.end.y = o.end.y + totalDeltaY;
                        break;
                }
            } else if (this.activeHandle.type.startsWith('resize')) {
                const MIN_DIMENSION = 0.1; // Minimum size for width, height, radius

                switch (s.type) {
                    case 'rectangle':
                        // Apply deltas based on original state
                        s.x = o.x; s.y = o.y; s.width = o.width; s.height = o.height;

                        switch (this.activeHandle.type) {
                            case 'resize-tl':
                                s.x = o.x + totalDeltaX;
                                s.y = o.y + totalDeltaY;
                                s.width = o.width - totalDeltaX;
                                s.height = o.height - totalDeltaY;
                                break;
                            case 'resize-tr':
                                s.y = o.y + totalDeltaY;
                                s.width = o.width + totalDeltaX;
                                s.height = o.height - totalDeltaY;
                                // s.x remains o.x
                                break;
                            case 'resize-br':
                                s.width = o.width + totalDeltaX;
                                s.height = o.height + totalDeltaY;
                                // s.x, s.y remain o.x, o.y
                                break;
                            case 'resize-bl':
                                s.x = o.x + totalDeltaX;
                                s.width = o.width - totalDeltaX;
                                s.height = o.height + totalDeltaY;
                                // s.y remains o.y
                                break;
                            case 'resize-t':
                                s.y = o.y + totalDeltaY;
                                s.height = o.height - totalDeltaY;
                                break;
                            case 'resize-b':
                                s.height = o.height + totalDeltaY;
                                break;
                            case 'resize-l':
                                s.x = o.x + totalDeltaX;
                                s.width = o.width - totalDeltaX;
                                break;
                            case 'resize-r':
                                s.width = o.width + totalDeltaX;
                                break;
                        }

                        // Ensure positive dimensions and adjust x,y if necessary to keep opposite edge fixed
                        if (s.width < MIN_DIMENSION) {
                            if (this.activeHandle.type.includes('l') || this.activeHandle.type === 'resize-tl' || this.activeHandle.type === 'resize-bl') { // Resizing from left
                                s.x = (o.x + o.width) - MIN_DIMENSION;
                            }
                            s.width = MIN_DIMENSION;
                        }
                        if (s.height < MIN_DIMENSION) {
                            if (this.activeHandle.type.includes('t') || this.activeHandle.type === 'resize-tl' || this.activeHandle.type === 'resize-tr') { // Resizing from top
                                s.y = (o.y + o.height) - MIN_DIMENSION;
                            }
                            s.height = MIN_DIMENSION;
                        }
                        break;

                    case 'line':
                        s.start = {...o.start}; // Keep original points unless modified
                        s.end = {...o.end};
                        switch (this.activeHandle.type) {
                            case 'resize-start':
                                s.start.x = o.start.x + totalDeltaX;
                                s.start.y = o.start.y + totalDeltaY;
                                break;
                            case 'resize-end':
                                s.end.x = o.end.x + totalDeltaX;
                                s.end.y = o.end.y + totalDeltaY;
                                break;
                        }
                        // Optional: Add min length check for line (can be complex during drag)
                        const ldx = s.end.x - s.start.x;
                        const ldy = s.end.y - s.start.y;
                        if (Math.sqrt(ldx*ldx + ldy*ldy) < MIN_DIMENSION && o.id === s.id ) { // o.id check is a bit redundant here but safe
                            if(this.activeHandle.type === 'resize-start') {
                                const angle = Math.atan2(o.end.y - o.start.y, o.end.x - o.start.x);
                                s.start.x = s.end.x - MIN_DIMENSION * Math.cos(angle);
                                s.start.y = s.end.y - MIN_DIMENSION * Math.sin(angle);
                            } else { // resize-end
                                const angle = Math.atan2(o.start.y - o.end.y, o.start.x - o.end.x); // Reversed for consistency
                                s.end.x = s.start.x - MIN_DIMENSION * Math.cos(angle);
                                s.end.y = s.start.y - MIN_DIMENSION * Math.sin(angle);
                            }
                        }
                        break;

                    case 'circle':
                        s.center = {...o.center}; // Center doesn't change on resize
                        let newRadius;
                        const currentMouseWorldX = worldPos.x; // Use current worldPos for radius calc
                        const currentMouseWorldY = worldPos.y;

                        switch (this.activeHandle.type) {
                            case 'resize-e': // East
                                newRadius = currentMouseWorldX - s.center.x;
                                break;
                            case 'resize-w': // West
                                newRadius = s.center.x - currentMouseWorldX;
                                break;
                            case 'resize-s': // South
                                newRadius = currentMouseWorldY - s.center.y;
                                break;
                            case 'resize-n': // North
                                newRadius = s.center.y - currentMouseWorldY;
                                break;
                            default:
                                newRadius = o.radius; 
                        }
                        s.radius = Math.max(MIN_DIMENSION / 2, newRadius);
                        break;
                }
            }
            this.app.render2D(); 
            return; 
        }

        // Highlight objects or handles under cursor if not dragging
        // This part is crucial for the select tool's hover behavior.
        // We let this function manage its own cursor updates.
        this.clearHighlights();
        let newCursor = 'default';

        if (this.app.selectedObjects.length === 1) {
            const handle = this.getHandleAtPosition(worldPos, this.app.selectedObjects[0]);
            if (handle) {
                newCursor = this.getCursorForHandle(handle.type);
            }
        }

        if (newCursor === 'default') { // Only do object hit testing if not over a handle
            const hitObject = this.app.drawing.hitTest(
                worldPos.x, worldPos.y, 
                this.app.objects, 
                this.tolerance / this.app.camera.zoom
            );
            
            if (hitObject) {
                hitObject.highlighted = true;
                newCursor = 'pointer';
            }
        }
        
        this.app.canvas.style.cursor = newCursor; // Set cursor based on select tool logic
        this.app.render2D(); // Render to show highlights
    }
    
    handleSelectUp(worldPos) {
        if (this.isDrawing && this.activeHandle) {
        }
        this.isDrawing = false;
        this.activeHandle = null;
        this.dragStartPoint = null;
        this.originalObjectState = null; // Clear original state

        const currentHoverHandle = this.app.selectedObjects.length === 1 ? this.getHandleAtPosition(worldPos, this.app.selectedObjects[0]) : null;
        if (currentHoverHandle) {
            this.app.canvas.style.cursor = this.getCursorForHandle(currentHoverHandle.type);
        } else {
            const hitObject = this.app.drawing.hitTest(worldPos.x, worldPos.y, this.app.objects, this.tolerance / this.app.camera.zoom);
            this.app.canvas.style.cursor = hitObject ? 'pointer' : 'default';
        }
        
        this.app.render2D(); // Re-render to finalize state and update handle positions if needed
    }
    
    // Line Tool
    handleLineDown(worldPos) {
        const hitObject = this.app.drawing.hitTest(
            worldPos.x, worldPos.y,
            this.app.objects,
            this.tolerance / this.app.camera.zoom
        );        if (hitObject) {
            this.app.clearSelection();
            hitObject.selected = true;
            this.app.selectedObjects = [hitObject];
            this.app.updateExtrudeButtonState(); // Update extrude button when selection changes
            this.app.selectTool('select'); // Switch tool to select, this will also call toolManager.setActiveTool
            // this.app.render2D(); // selectTool should trigger a render if needed via its chain.
            return; 
        }

        if (this.snapToGrid && this.app.grid) {
            worldPos = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }
        
        this.isDrawing = true;
        this.startPoint = worldPos;
        
        this.tempObject = {
            type: 'line',
            start: { ...worldPos },
            end: { ...worldPos }
        };
        // No immediate render here, mouseMove will handle temp object rendering
    }
    
    handleLineMove(worldPos) {
        if (!this.isDrawing) return;

        if (this.snapToGrid && this.app.grid) {
            worldPos = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }

        this.tempObject.end = { ...worldPos };
        this.app.render2D(); // Changed from this.app.render()
    }
    
    handleLineUp(worldPos) {
        if (!this.isDrawing) return;

        let finalStartPoint = { ...this.startPoint };
        let finalEndPoint = { ...worldPos };

        if (this.snapToGrid && this.app.grid) {
            finalEndPoint = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }

        const dx = finalEndPoint.x - finalStartPoint.x;
        const dy = finalEndPoint.y - finalStartPoint.y;
        const MIN_LINE_LENGTH = 0.01; // world units

        this.cancelCurrentOperation();

        if (Math.sqrt(dx * dx + dy * dy) > MIN_LINE_LENGTH) {
            const line = {
                id: Date.now(),
                type: 'line',
                start: finalStartPoint, 
                end: finalEndPoint,     
                selected: false, 
                highlighted: false,
                partProperties: { // NEW: Add partProperties
                    name: this.app.getNextPartName('line'),
                    material: null,
                    species: null,
                    thickness: null,
                    pricePerUnit: null,
                    notes: ""
                }
            };
            this.app.addObject(line);
        } else {
        }
    }


    // Rectangle Tool
    handleRectangleDown(worldPos) {
        // SPANKY: worldPos is already logged in handleMouseDown, no need to repeat here unless specifically debugging this function's parameter passing
        this.isDrawing = true;
        this.startPoint = (this.snapToGrid && this.app.grid) ? this.app.grid.snapToGrid(worldPos.x, worldPos.y) : worldPos; // SPANKY: Corrected snap call
        // SPANKY: this.startPoint is logged by the call to snap() if snapToGrid is true. If not, it's worldPos, which is logged in handleMouseDown.
        
        this.tempObject = {
            type: 'rectangle',
            x: this.startPoint.x,
            y: this.startPoint.y,
            width: 0,
            height: 0,
            id: this.app.getNextPartId('rectangle'), 
            name: this.app.getNextPartName('rectangle'), 
            selected: true, 
            filled: true 
        };
        this.app.render2D();
    }

    handleRectangleMove(worldPos) {
        if (!this.isDrawing) return;

        if (this.snapToGrid && this.app.grid) {
            worldPos = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }

        const width = worldPos.x - this.startPoint.x;
        const height = worldPos.y - this.startPoint.y;

        this.tempObject.x = Math.min(this.startPoint.x, worldPos.x);
        this.tempObject.y = Math.min(this.startPoint.y, worldPos.y);
        this.tempObject.width = Math.abs(width);
        this.tempObject.height = Math.abs(height);
        this.app.render2D(); // Changed from this.app.render()
    }
    
    handleRectangleUp(worldPos) {
        if (!this.isDrawing) return;

        let finalStartPoint = { ...this.startPoint };
        let finalEndPoint = { ...worldPos };

        if (this.snapToGrid && this.app.grid) {
            finalEndPoint = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }

        const width = Math.abs(finalEndPoint.x - finalStartPoint.x);
        const height = Math.abs(finalEndPoint.y - finalStartPoint.y);
        const MIN_RECT_SIZE = 0.01;   // world units

        this.cancelCurrentOperation();

        if (width < MIN_RECT_SIZE || height < MIN_RECT_SIZE) {
            return;
        }

        const rectangle = {
            id: Date.now(),
            type: 'rectangle',
            x: Math.min(finalStartPoint.x, finalEndPoint.x),
            y: Math.min(finalStartPoint.y, finalEndPoint.y),
            width: width,
            height: height,
            filled: true, 
            selected: false, 
            highlighted: false,
            partProperties: { // NEW: Add partProperties
                name: this.app.getNextPartName('rectangle'),
                material: null,
                species: null,
                thickness: null,
                pricePerUnit: null,
                notes: ""
            }
        };
        this.app.addObject(rectangle);
    }

    // Circle Tool
    handleCircleDown(worldPos) {
        const hitObject = this.app.drawing.hitTest(
            worldPos.x, worldPos.y,
            this.app.objects,
            this.tolerance / this.app.camera.zoom
        );

        if (hitObject) {
            hitObject.selected = true;
            this.app.selectedObjects = [hitObject];
            this.app.updateExtrudeButtonState(); // Update extrude button when selection changes
            this.app.selectTool('select');
            return;
        }

        if (this.snapToGrid && this.app.grid) {
            worldPos = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }
        
        this.isDrawing = true;
        this.startPoint = worldPos; // Center of the circle
        
        this.tempObject = {
            type: 'circle',
            center: { ...worldPos },
            radius: 0
        };
        // No immediate render here
    }
    
    handleCircleMove(worldPos) {
        if (!this.isDrawing) return;

        if (this.snapToGrid && this.app.grid) {
            worldPos = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }

        const dx = worldPos.x - this.startPoint.x;
        const dy = worldPos.y - this.startPoint.y;
        this.tempObject.radius = Math.sqrt(dx * dx + dy * dy);
        this.app.render2D(); // Changed from this.app.render()
    }
    
    handleCircleUp(worldPos) {
        if (!this.isDrawing) return;

        let finalCenterPoint = { ...this.startPoint }; // Start point is the center
        let finalEdgePoint = { ...worldPos };

        if (this.snapToGrid && this.app.grid) {
            // Snapping the edge point might be desired, or snapping the radius directly.
            // For now, let's snap the edge point which indirectly snaps the radius.
            finalEdgePoint = this.app.grid.snapToGrid(worldPos.x, worldPos.y);
        }

        const dx = finalEdgePoint.x - finalCenterPoint.x;
        const dy = finalEdgePoint.y - finalCenterPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const MIN_RADIUS = 0.005; // world units (half of MIN_RECT_SIZE for example)

        this.cancelCurrentOperation();

        if (radius < MIN_RADIUS) {
            return;
        }

        const circle = {
            id: Date.now(),
            type: 'circle',
            center: finalCenterPoint,
            radius: radius,
            filled: true, 
            selected: false, 
            highlighted: false,
            partProperties: { // NEW: Add partProperties
                name: this.app.getNextPartName('circle'),
                material: null,
                species: null,
                thickness: null,
                pricePerUnit: null,
                notes: ""
            }
        };
        this.app.addObject(circle);    }
      // Extrude Tool - Master's direct click-to-extrude workflow (like the working prototype)
    handleExtrudeDown(worldPos) {
        
        // Check if we're in 3D mode - extrusion only works in 3D mode
        if (this.app.currentMode !== 'modeling') {
            return;
        }
        
        // Pass the click to main.js for 3D face picking - just like the prototype
        // No need for 2D hit testing, we want direct 3D mesh face clicks
        
        // The actual face picking and gizmo creation will be handled by main.js
        // scene.onPointerDown, just like in the working prototype
    }
      handleExtrudeMove(worldPos) {
        // Show hover feedback for extrudable objects when extrude tool is active
        if (this.app.currentMode !== 'modeling') {
            return;
        }
        
        // Clear existing highlights
        this.clearHighlights();
        
        // Check for hover over extrudable objects
        const hitObject = this.app.drawing.hitTest(
            worldPos.x, worldPos.y,
            this.app.objects,
            this.tolerance / this.app.camera.zoom
        );
        
        if (hitObject && ['rectangle', 'circle'].includes(hitObject.type)) {
            hitObject.highlighted = true;
            this.app.render2D(); // Show highlight
        } else {
            this.app.render2D(); // Clear highlights
        }
    }
    
    handleExtrudeUp(worldPos) {
        // Extrusion completion is handled by the custom gizmo
        // This method can be used for cleanup or additional processing
    }
    
    getHandleAtPosition(worldPos, object) {
        if (!object || !object.selected) return null;

        const screenPos = this.app.camera.worldToScreen(worldPos.x, worldPos.y);
        const handleScreenTolerance = 8; // Screen pixels tolerance for hitting a handle

        let handles = [];
        const screenCoords = {}; // To store object's screen coordinates

        switch (object.type) {
            case 'rectangle':
                screenCoords.topLeft = this.app.camera.worldToScreen(object.x, object.y);
                screenCoords.width = object.width * this.app.camera.zoom;
                screenCoords.height = object.height * this.app.camera.zoom;
                handles = [
                    // Corners
                    { type: 'resize-tl', x: screenCoords.topLeft.x, y: screenCoords.topLeft.y },
                    { type: 'resize-tr', x: screenCoords.topLeft.x + screenCoords.width, y: screenCoords.topLeft.y },
                    { type: 'resize-br', x: screenCoords.topLeft.x + screenCoords.width, y: screenCoords.topLeft.y + screenCoords.height },
                    { type: 'resize-bl', x: screenCoords.topLeft.x, y: screenCoords.topLeft.y + screenCoords.height },
                    // Mid-sides
                    { type: 'resize-t', x: screenCoords.topLeft.x + screenCoords.width / 2, y: screenCoords.topLeft.y },
                    { type: 'resize-b', x: screenCoords.topLeft.x + screenCoords.width / 2, y: screenCoords.topLeft.y + screenCoords.height },
                    { type: 'resize-l', x: screenCoords.topLeft.x, y: screenCoords.topLeft.y + screenCoords.height / 2 },
                    { type: 'resize-r', x: screenCoords.topLeft.x + screenCoords.width, y: screenCoords.topLeft.y + screenCoords.height / 2 },
                    // Center
                    { type: 'move', x: screenCoords.topLeft.x + screenCoords.width / 2, y: screenCoords.topLeft.y + screenCoords.height / 2 }
                ];
                break;
            case 'line':
                screenCoords.start = this.app.camera.worldToScreen(object.start.x, object.start.y);
                screenCoords.end = this.app.camera.worldToScreen(object.end.x, object.end.y);
                handles = [
                    { type: 'resize-start', x: screenCoords.start.x, y: screenCoords.start.y },
                    { type: 'resize-end', x: screenCoords.end.x, y: screenCoords.end.y },
                    { type: 'move', x: (screenCoords.start.x + screenCoords.end.x) / 2, y: (screenCoords.start.y + screenCoords.end.y) / 2 }
                ];
                break;
            case 'circle':
                screenCoords.center = this.app.camera.worldToScreen(object.center.x, object.center.y);
                screenCoords.radius = object.radius * this.app.camera.zoom;
                handles = [
                    { type: 'move', x: screenCoords.center.x, y: screenCoords.center.y }, // Center for move
                    { type: 'resize-e', x: screenCoords.center.x + screenCoords.radius, y: screenCoords.center.y },
                    { type: 'resize-w', x: screenCoords.center.x - screenCoords.radius, y: screenCoords.center.y },
                    { type: 'resize-s', x: screenCoords.center.x, y: screenCoords.center.y + screenCoords.radius },
                    { type: 'resize-n', x: screenCoords.center.x, y: screenCoords.center.y - screenCoords.radius }
                ];
                break;
        }

        for (const handle of handles) {
            const dist = Math.sqrt(Math.pow(screenPos.x - handle.x, 2) + Math.pow(screenPos.y - handle.y, 2));
            if (dist <= handleScreenTolerance) {
                return { ...handle, object: object }; // Return handle info and the object it belongs to
            }
        }
        return null;
    }

    getCursorForHandle(handleType) {
        if (handleType.startsWith('resize')) {
            // More specific cursors can be added based on handle direction (e.g., 'resize-tl' -> 'nwse-resize')
            if (handleType.includes('t') && handleType.includes('l')) return 'nwse-resize';
            if (handleType.includes('b') && handleType.includes('r')) return 'nwse-resize';
            if (handleType.includes('t') && handleType.includes('r')) return 'nesw-resize';
            if (handleType.includes('b') && handleType.includes('l')) return 'nesw-resize';
            if (handleType.includes('-t') || handleType.includes('-b') || handleType.includes('-n') || handleType.includes('-s')) return 'ns-resize';
            if (handleType.includes('-l') || handleType.includes('-r') || handleType.includes('-e') || handleType.includes('-w')) return 'ew-resize';
            return 'crosshair'; // Default resize cursor
        } else if (handleType === 'move') {
            return 'move';
        }
        return 'default';
    }

    // Helper methods
    clearSelection() {
        this.app.selectedObjects.forEach(obj => {
            obj.selected = false;
        });
        this.app.selectedObjects = [];
        // No render call here, let the calling context decide when to render
    }
    
    clearHighlights() {
        this.app.objects.forEach(obj => {
            obj.highlighted = false;
        });
    }
    
    
    // Rotate Tool - Local coordinate system rotation for 3D objects
    handleRotateDown(worldPos) {

        // Rotation tool only works in 3D modeling mode
        if (this.app.currentMode !== 'modeling') {
            return;
        }

        // Check if we have the required 3D scene
        if (!this.app.grid || !this.app.grid.scene) {
            return;
        }

        // Find 3D object under cursor using Babylon.js picking
        const scene = this.app.grid.scene;
        const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
            // Only pick our 3D objects, not gizmos or other scene elements
            return mesh.isPickable && this.app.active3DMeshes[mesh.metadata?.originalObjectId] === mesh;
        });

        if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
            const pickedMesh = pickInfo.pickedMesh;

            // Start rotation for the picked mesh
            this.app.startRotation(pickedMesh);
        } else {
        }
        
        // Update rotate button state based on selection
        this.app.updateRotateButtonState();
    }
    
    handleRotateMove(worldPos) {
        // Show hover feedback for rotatable 3D objects when rotate tool is active
        if (this.app.currentMode !== 'modeling') return;
        
        // Clear existing highlights
        if (this.app.grid && this.app.grid.scene) {
            // Highlight rotatable 3D meshes on hover
            const pickInfo = this.app.grid.scene.pick(
                this.app.lastPointerX || 0, 
                this.app.lastPointerY || 0
            );
            
            if (pickInfo.hit && pickInfo.pickedMesh && this.app.active3DMeshes) {
                const meshId = pickInfo.pickedMesh.metadata?.originalObjectId;
                if (meshId && this.app.active3DMeshes[meshId]) {
                    // Add subtle highlight for rotatable object
                    if (pickInfo.pickedMesh.material && pickInfo.pickedMesh.material.emissiveColor) {
                        pickInfo.pickedMesh.material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
                    }
                }
            }
        }
    }
    
    handleRotateUp(worldPos) {
        // Rotation completion is handled by the rotation gizmo
        // This method can be used for cleanup or additional processing
    }

    deleteSelected() {
        if (this.app.selectedObjects.length === 0) return;
        
        this.app.selectedObjects.forEach(selectedObj => {
            const index = this.app.objects.indexOf(selectedObj);
            if (index > -1) {
                this.app.objects.splice(index, 1);
            }
        });
        
        this.app.selectedObjects = [];
        this.app.updateObjectCount();
        this.app.render();
    }
}
