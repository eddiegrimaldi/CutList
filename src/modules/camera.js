// Camera Controller - Handles viewport, zoom, and camera operations

// Report version to the global version reporter (wait for it to be available)
const reportVersion = () => {
    if (window.VersionReporter) {
        window.VersionReporter.report('camera.js', 'v20250627_017', 'success');
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

export class CameraController {
    constructor(canvas, renderCallback = null) {
        this.canvas = canvas;
        this.renderCallback = renderCallback;
        
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.mode = 'sketch';
        
        this.width = canvas.clientWidth || 800;
        this.height = canvas.clientHeight || 600;
        this.dpr = window.devicePixelRatio || 1;

        // LOD related properties
        this.lodSpacings = [1/32, 1/16, 1/8, 1/4, 1/2, 1, 2]; // inches
        this.finestLOD = this.lodSpacings[0]; 
        this.coarsestLOD = this.lodSpacings[this.lodSpacings.length - 1];

        // Screen pixel constraints for LODs
        this.MAX_PX_FOR_FINEST_LOD = 300; 
        this.MIN_PX_FOR_COARSEST_LOD = 50;  
        // this.INITIAL_TARGET_PX_FOR_FINEST_LOD = 50; // No longer used for initial zoom

        // New: Target visible world height for initial zoom
        this.INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES = 24; // e.g., start by showing 24 inches vertically

        this.calculateZoomLimits(); 
        
        // Set initial zoom based on target visible world height
        if (this.height > 0 && this.INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES > 0) {
            // The zoom factor is (screen pixels / world units).
            // We want 'INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES' world units to span 'this.height * this.dpr' screen pixels.
            // So, zoom = (this.height * this.dpr) / INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES.
            // However, camera.height is CSS pixels. The actual drawing buffer height is this.canvas.height (which is CSS height * DPR).
            // The visible world height should correspond to the CSS height of the canvas.
            this.zoom = this.height / this.INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES;
        } else {
            // Fallback if height isn't properly set yet, though resizeCanvas should fix it.
            this.zoom = 10; // A reasonable default zoom level
        }

        this.applyZoomConstraints(); 

        // Mouse interaction state
        this.isPanning = false;
        this.isRotating = false;
        this.rightMouseDown = false; // Track right mouse state
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.lastRotateAngle = 0;
        
        this.stored2DState = null;
        this.stored3DState = null;

        this.setupEventListeners();
    }
      setupEventListeners() {        // Mouse wheel for zooming
        this.canvas.addEventListener('wheel', (e) => {
            // Don't zoom if right mouse is down (might be trying to rotate)
            if (this.rightMouseDown || this.isRotating) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            this.handleZoom(e);
        });        // Mouse events for panning and rotating
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse or Ctrl+Left
                e.preventDefault();
                this.startPan(e);            } else if (e.button === 2) { // Right mouse button
                e.preventDefault();
                this.rightMouseDown = true;
                this.startRotate(e);
            }
        });
          this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                e.preventDefault();
                this.updatePan(e);
            } else if (this.isRotating) {
                e.preventDefault();
                this.updateRotate(e);
            }
        });        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1 || e.button === 0) {
                this.endPan();
            } else if (e.button === 2) {
                e.preventDefault();
                this.rightMouseDown = false;
                this.endRotate();
            }
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }    updateViewport(width, height) {
        this.width = width;
        this.height = height;
        // DPR and LOD-based zoom limits are independent of viewport CSS size,
        // but if they were dependent, they could be recalculated here.
        // Recalculate zoom limits if they depended on this.width/height
        // For now, they depend on DPR and fixed world/pixel sizes.
        // this.dpr = window.devicePixelRatio || 1; // Update DPR if it can change dynamically (rare)
        // this.maxZoom = this.targetScreenSizeAtMaxZoom / (this.finestLodWorldSpacing * this.dpr);
        // this.minZoom = this.minScreenSizeForCoarsestLod / (this.coarsestLodWorldSpacing * this.dpr);

        if (this.renderCallback) {
            this.renderCallback();
        }
    }setMode(mode) {
        this.mode = mode;
        
        if (mode === 'modeling') {
            // this.rotation = Math.PI / 4; // SPANKY: Commented out, sync3DCameraTo2DView handles initial 3D orientation
            // this.zoom = 0.5; // SPANKY: Commented out, sync3DCameraTo2DView handles initial 3D zoom/radius
            // this.x = 0; // SPANKY: Commented out, sync3DCameraTo2DView handles initial 3D target
            // this.y = 0; // SPANKY: Commented out, sync3DCameraTo2DView handles initial 3D target
            // SPANKY: REMOVED these lines as they incorrectly used DPR-scaled dimensions for CSS dimension properties
            // this.width = this.canvas.width; 
            // this.height = this.canvas.height;
            
            // The 3D camera sync logic in main.js now handles setting up the 3D view.
            // The 2D camera state (x, y, zoom, rotation) is preserved when switching to 3D
            // and used by sync3DCameraTo2DView.

            // Don't call renderCallback in 3D mode - let Babylon.js handle rendering
        } else { // Switching back to 'sketch'
            // The sync2DCameraTo3DView in main.js will adjust x,y,zoom, AND ROTATION.
            // The 2D camera's rotation should now be what sync2DCameraTo3DView set it to.
            // this.rotation = 0; // SPANKY: REMOVED THIS LINE to preserve synced rotation
            if (this.renderCallback) { // Ensure 2D view re-renders with correct parameters
                this.renderCallback();
            }
        }
    }handleZoom(e) {
        if (this.isRotating) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = this.screenToWorldX(mouseX);
        const worldY = this.screenToWorldY(mouseY);
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoomAttempt = this.zoom * zoomFactor;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoomAttempt));
        

        if (newZoom !== this.zoom) {            // Adjust camera position to zoom towards mouse
            const zoomRatio = newZoom / this.zoom;
            this.x = worldX - (worldX - this.x) * zoomRatio;
            this.y = worldY - (worldY - this.y) * zoomRatio;
            this.zoom = newZoom;
            
            // Trigger render
            if (this.renderCallback) {
                this.renderCallback();
            }
        }
    }
    
    startPan(e) {
        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    updatePan(e) {
        if (!this.isPanning) return;

        const screenDeltaX = e.clientX - this.lastPanX;
        const screenDeltaY = e.clientY - this.lastPanY;

        // Only update if there's actual movement
        if (screenDeltaX === 0 && screenDeltaY === 0) {
            return;
        }

        const worldDeltaX = screenDeltaX / this.zoom;
        const worldDeltaY = screenDeltaY / this.zoom;

        this.x -= worldDeltaX;
        this.y -= worldDeltaY;


        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;

        if (this.renderCallback) {
            this.renderCallback();
        }
    }

    endPan() {
        this.isPanning = false;
        this.canvas.style.cursor = '';    }

    startRotate(e) {
        this.isRotating = true;
        this.lastPanX = e.clientX; // Reuse lastPanX for rotation
        this.canvas.style.cursor = 'crosshair';
    }

    updateRotate(e) {
        if (!this.isRotating) return;
        
        // Simple horizontal rotation - mouse movement left/right rotates the view
        const deltaX = e.clientX - this.lastPanX;
        const rotationSpeed = 0.01; // Adjust this to control rotation sensitivity
        
        this.rotation += deltaX * rotationSpeed;
        
        this.lastPanX = e.clientX;
        
        // Trigger render
        if (this.renderCallback) {
            this.renderCallback();
        }
    }
    
    endRotate() {
        this.isRotating = false;
        this.canvas.style.cursor = '';
    }

    getVisibleBounds() {
        // Calculate the visible world coordinates based on camera position, zoom, and viewport
        // Ensure this.width and this.height are CSS pixels here
        const topLeftWorld = this.screenToWorld(0, 0); // 0,0 of CSS pixel viewport
        const bottomRightWorld = this.screenToWorld(this.width, this.height); // CSS width, CSS height

        return {
            left: topLeftWorld.x,
            top: topLeftWorld.y,
            right: bottomRightWorld.x,
            bottom: bottomRightWorld.y,
            width: bottomRightWorld.x - topLeftWorld.x,
            height: bottomRightWorld.y - topLeftWorld.y
        };
    }

    // Helper to convert screen to world for getVisibleBounds
    screenToWorld(screenX, screenY) {

        // Center screen coordinates (using CSS pixel dimensions of viewport)
        let centeredX = screenX - this.width / 2;
        let centeredY = screenY - this.height / 2;

        // Apply inverse zoom
        let viewX = centeredX / this.zoom;
        let viewY = centeredY / this.zoom;

        // Apply inverse rotation
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const rotatedX = viewX * cos - viewY * sin;
        const rotatedY = viewX * sin + viewY * cos;
        
        // Translate by camera position
        const worldX = rotatedX + this.x;
        const worldY = rotatedY + this.y;

        return { x: worldX, y: worldY };
    }

    // Ensure screenToWorldX and screenToWorldY use the full transformation
    screenToWorldX(screenX) {
        return this.screenToWorld(screenX, 0).x;
    }

    screenToWorldY(screenY) {
        return this.screenToWorld(0, screenY).y;
    }
    
    worldToScreen(worldX, worldY) {
        // Translate by inverse camera position
        let viewX = worldX - this.x;
        let viewY = worldY - this.y;

        // Apply rotation
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const rotatedX = viewX * cos - viewY * sin;
        const rotatedY = viewX * sin + viewY * cos;

        // Apply zoom
        const projectedX = rotatedX * this.zoom;
        const projectedY = rotatedY * this.zoom;

        // Convert to screen coordinates (relative to top-left of CSS pixel viewport)
        const screenX = projectedX + this.width / 2;
        const screenY = projectedY + this.height / 2;
        
        return { x: screenX, y: screenY };
    }

    worldToScreenX(worldX) {
        // Assumes y=0 for the world coordinate if only X is provided,
        // or that the y-component of the transformation is not relevant for this specific call.
        // Adjust if a specific worldY context is needed for an X-only transform.
        return this.worldToScreen(worldX, 0).x;
    }

    worldToScreenY(worldY) {
        // Assumes x=0 for the world coordinate if only Y is provided,
        // or that the x-component of the transformation is not relevant for this specific call.
        // Adjust if a specific worldX context is needed for a Y-only transform.
        return this.worldToScreen(0, worldY).y;
    }

    reset() {
        this.x = 0;
        this.y = 0;
        // Recalculate initial zoom on reset, similar to constructor logic
        if (this.height > 0 && this.INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES > 0) {
            this.zoom = this.height / this.INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES;
        } else {
            this.zoom = 10; // Fallback
        }
        this.applyZoomConstraints();
        this.rotation = 0;
        
        // Trigger render
        if (this.renderCallback) {
            this.renderCallback();
        }
    }
    
    zoomToFit() {
        // TODO: Implement zoom to fit based on objects
        this.reset();
    }
    
    // Get visible world bounds
    getVisibleBounds() {
        // This version of getVisibleBounds calculates based on CSS dimensions and zoom.
        // It's important that this.width and this.height are the CSS dimensions of the canvas.
        const worldWidth = this.width / this.zoom;
        const worldHeight = this.height / this.zoom;
        
        return {
            left: this.x - worldWidth / 2,
            right: this.x + worldWidth / 2,
            top: this.y - worldHeight / 2,
            bottom: this.y + worldHeight / 2,
            width: worldWidth,
            height: worldHeight
        };
    }

    // New method to get visible world height in inches
    getVisibleWorldHeight() {
        if (this.zoom === 0) return Infinity; // Avoid division by zero
        // this.height is the CSS height of the canvas.
        // zoom is screen pixels per world unit.
        // So, world units = screen pixels / zoom.
        // Here, screen pixels = this.height (CSS pixels).
        return this.height / this.zoom;
    }    // NEW: Method to synchronize the 3D Babylon.js camera to the current 2D view
    sync3DCameraTo2DView(babylonCameraInstance) {
        if (!babylonCameraInstance) {
            return;
        }
        if (this.stored3DState) {
            this.restore3DState(babylonCameraInstance);
            return;
        }

        // CAD Standard: X=side-to-side, Y=front/back(depth), Z=up/down(vertical)
        // Set target to origin (0, 0, 0) regardless of 2D camera position
        babylonCameraInstance.target.set(0, 0, 0);

        // SPANKY: Position camera at Master's specified coordinates using CAD standard
        // Master said X=30(side), Y=30(front/back), Z=-60(up/down)  
        // In proper CAD coords: X=30, Y=-60(back), Z=30(up)
        const camX = 30;  // side to side (left/right)
        const camY = -60; // front to back (depth) - negative means behind origin
        const camZ = 30;  // up/down (vertical) - positive means above origin

        // Calculate radius (distance from target to camera position)
        const radius = Math.sqrt(camX * camX + camY * camY + camZ * camZ);
        
        // Calculate alpha (horizontal rotation around Z axis in CAD coordinates)
        // alpha = 0 is along positive X axis, increases counter-clockwise when viewed from above
        const alpha = Math.atan2(camY, camX);
        
        // Calculate beta (vertical angle from positive Z axis)
        // beta = 0 is straight up, PI/2 is horizontal, PI is straight down
        const beta = Math.acos(camZ / radius);

        babylonCameraInstance.radius = radius;
        babylonCameraInstance.alpha = alpha;
        babylonCameraInstance.beta = beta;

        
        babylonCameraInstance.getViewMatrix(true);
    }

    // NEW: Method to synchronize the 2D camera to a top-down 3D Babylon.js camera view
    sync2DCameraTo3DView(babylonCameraInstance) {
        if (!babylonCameraInstance) {
            return;
        }
        if (this.stored2DState) {
            this.restore2DState();
            return;
        }

        // SPANKY: Corrected isTopDown check for beta around PI/2
        const isTopDown = Math.abs(babylonCameraInstance.beta - Math.PI / 2) < 0.1;

        if (!isTopDown) {

        // SPANKY: Using proper CAD coordinate mapping
        // 2D camera works in X/Y plane, 3D uses X/Y/Z
        // Map 3D X to 2D X (side to side)
        // Map 3D Y to 2D Y (front/back becomes forward/back in 2D)
        this.x = babylonCameraInstance.target.x;
        this.y = babylonCameraInstance.target.y;

        const fovY = babylonCameraInstance.fov;
        const radius = babylonCameraInstance.radius;
        let visibleWorldHeight3D;

        if (fovY <= 0 || radius <= 0) {
            visibleWorldHeight3D = this.INITIAL_TARGET_VISIBLE_WORLD_HEIGHT_INCHES; 
        } else {
            visibleWorldHeight3D = 2 * radius * Math.tan(fovY / 2);
        }
        
        if (this.height > 0 && visibleWorldHeight3D > 0) {
            this.zoom = this.height / visibleWorldHeight3D;
        } else {
            this.zoom = 10; 
        }
        
        this.applyZoomConstraints(); 
        
        this.rotation = babylonCameraInstance.alpha; // Keep direct mapping for now


        if (this.renderCallback) {
            this.renderCallback();
        }
    }

    saveCurrent2DState() {
        this.stored2DState = {
            x: this.x,
            y: this.y,
            zoom: this.zoom,
            rotation: this.rotation
        };
    }

    saveCurrent3DState(babylonCamera) {
        if (!babylonCamera) return;
        this.stored3DState = {
            alpha: babylonCamera.alpha,
            beta: babylonCamera.beta,
            radius: babylonCamera.radius,
            target: babylonCamera.target.clone()
        };
    }

    restore2DState() {
        if (this.stored2DState) {
            this.x = this.stored2DState.x;
            this.y = this.stored2DState.y;
            this.zoom = this.stored2DState.zoom;
            this.rotation = this.stored2DState.rotation;
            this.applyZoomConstraints();
            if (this.renderCallback) this.renderCallback();
        }
    }

    restore3DState(babylonCamera) {
        if (this.stored3DState && babylonCamera) {
            babylonCamera.alpha = this.stored3DState.alpha;
            babylonCamera.beta = this.stored3DState.beta;
            babylonCamera.radius = this.stored3DState.radius;
            babylonCamera.target.copyFrom(this.stored3DState.target);
            babylonCamera.getViewMatrix(true);
        }
    }

    // Check if there's a saved 3D camera state
    has3DSavedState() {
        return this.stored3DState && 
               this.stored3DState.alpha !== undefined &&
               this.stored3DState.beta !== undefined &&
               this.stored3DState.radius !== undefined;
    }

    calculateZoomLimits() {
        // Max zoom: finest LOD unit (e.g., 1/32") should not exceed MAX_PX_FOR_FINEST_LOD screen pixels.
        this.maxZoom = this.MAX_PX_FOR_FINEST_LOD / (this.finestLOD * this.dpr);

        // Min zoom: coarsest LOD unit (e.g., 2") should not be less than MIN_PX_FOR_COARSEST_LOD screen pixels.
        this.minZoom = this.MIN_PX_FOR_COARSEST_LOD / (this.coarsestLOD * this.dpr);
        

        if (this.minZoom > this.maxZoom) {
            [this.minZoom, this.maxZoom] = [this.maxZoom, this.minZoom];
        }
    }

    applyZoomConstraints() {
        const oldZoom = this.zoom;

        if (this.minZoom === undefined || this.maxZoom === undefined) {
            return;
        }

        if (this.zoom < this.minZoom) {
            this.zoom = this.minZoom;
        }
        if (this.zoom > this.maxZoom) {
            this.zoom = this.maxZoom;
        }


        if (this.zoom !== oldZoom && this.renderCallback) {
            this.renderCallback();
        }
    }
}

let currentCamera = null;

// Removed isTopDownView function as its logic is integrated or simplified

export function switchTo3D(scene, canvas, camera2D) {
    if (scene.activeCamera && scene.activeCamera.dispose) {
        scene.activeCamera.dispose();
    }

    // FORCED FOR TESTING THE ROTATION ISSUE & ENSURING TOP-DOWN
    const initialAlpha = 0;
    const initialBeta = Math.PI / 2 - 0.0001; 
    
    // Restore radius and target if possible, otherwise use defaults
    const initialRadius = camera2D && camera2D.radius3D !== undefined ? camera2D.radius3D : (camera2D.radius || 150);
    const initialTarget = camera2D && camera2D.target3D ? camera2D.target3D.clone() : (camera2D.target || BABYLON.Vector3.Zero());

    const camera3D = new BABYLON.ArcRotateCamera(
        "camera3D",
        initialAlpha,
        initialBeta,
        initialRadius,
        initialTarget,
        scene
    );
    // Use false for noPreventDefault to allow camera to prevent default actions.
    camera3D.attachControl(canvas, false); // CHANGED to false
    camera3D.wheelPrecision = 5;
    camera3D.lowerRadiusLimit = 10;
    camera3D.upperRadiusLimit = 500;
    camera3D.fov = 0.8;

    // Store 2D camera\'s orthographic zoom factor if available
    if (camera2D && camera2D.zoom !== undefined) {
        camera3D.zoom2D = camera2D.zoom;
    } else {
        camera3D.zoom2D = 1; // Default 2D zoom
    }
    
    currentCamera = camera3D; // Internal module reference
    scene.activeCamera = camera3D;
    return camera3D;
}

export function switchTo2D(scene, canvas, camera3D) {
    if (scene.activeCamera && scene.activeCamera.dispose) {
        scene.activeCamera.dispose();
    }

    // For 2D, always use a canonical top-down XY view
    const D2_ALPHA = 0;
    const D2_BETA = Math.PI / 2 - 0.0001;
    
    // Use radius and target from 3D camera if available, otherwise defaults
    const initialRadius = camera3D ? camera3D.radius : 150;
    const initialTarget = camera3D ? camera3D.target.clone() : BABYLON.Vector3.Zero();

    const camera2D = new BABYLON.ArcRotateCamera(
        "camera2D",
        D2_ALPHA,
        D2_BETA,
        initialRadius,
        initialTarget,
        scene
    );
    // Ensure 2D camera controls don't interfere if they were causing issues.
    // For 2D, custom drawing events are primary. Default ArcRotate controls might not be desired.
    // However, keeping attachControl(false) as it was, assuming it's managed or benign for 2D.
    camera2D.attachControl(canvas, false); 
    camera2D.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    
    const engine = scene.getEngine();
    const ratio = engine.getRenderWidth() / engine.getRenderHeight();
    // Retrieve stored 2D zoom from 3D camera, or use default
    const zoomFactor = camera3D && camera3D.zoom2D !== undefined ? camera3D.zoom2D : 1;
    const halfWidth = 100 * zoomFactor;
    
    camera2D.orthoTop = halfWidth / ratio;
    camera2D.orthoBottom = -halfWidth / ratio;
    camera2D.orthoLeft = -halfWidth;
    camera2D.orthoRight = halfWidth;

    camera2D.zoom = zoomFactor; // Store current zoom level on 2D camera
    camera2D.rotation = 0; // 2D in-plane rotation, default to 0 (no rotation)

    // Store properties from the 3D camera (if provided) for potential restoration
    if (camera3D) {
        camera2D.alpha3D = camera3D.alpha;
        camera2D.beta3D = camera3D.beta;
        camera2D.radius3D = camera3D.radius;
        camera2D.target3D = camera3D.target.clone();
    } else {
        // If no 3D camera provided (e.g., initial call), set defaults for 3D restoration
        camera2D.alpha3D = 0; // Will be overridden by forced values in switchTo3D for now
        camera2D.beta3D = Math.PI / 2 - 0.0001; // Will be overridden
        camera2D.radius3D = 150;
        camera2D.target3D = BABYLON.Vector3.Zero();
    }

    currentCamera = camera2D; // Internal module reference
    scene.activeCamera = camera2D;
    return camera2D;
}

export function getCurrentCamera() {
    return currentCamera;
}
