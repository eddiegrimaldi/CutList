// SketchPlanes Manager - Handles infinite sketch plane system
// Supports default origin planes + dynamic surface-based planes

export class SketchPlanesManager {
    constructor(scene, app) {
        this.scene = scene;
        this.app = app;
        
        // Plane management
        this.defaultPlanes = []; // XZ, XY, YZ origin planes
        this.surfacePlanes = []; // Planes created from part surfaces
        this.activePlane = null; // Currently selected plane for sketching
        
        // Visual elements
        this.planeSelectors = []; // Visual plane selector rectangles
        this.planePromptVisible = false;
        
        // Plane selector properties
        this.selectorSize = 4; // Size of plane selector rectangles
        this.selectorOpacity = 0.3; // Semi-transparent
        
    }    // Initialize all three default orthographic planes
    initializeDefaultPlanes() {
        
        // Clear existing default planes
        this.disposeDefaultPlanes();
        
        // XY Plane (front view) - Z=0
        const xyPlane = {
            id: 'default_xy',
            name: 'Front View (XY Plane)',
            normal: new BABYLON.Vector3(0, 0, 1),
            origin: new BABYLON.Vector3(0, 0, 0),
            uAxis: new BABYLON.Vector3(1, 0, 0),
            vAxis: new BABYLON.Vector3(0, -1, 0), // Flip Y to match 2D coordinates
            type: 'default',
            color: new BABYLON.Color3(0.8, 0.2, 0.2), // Red tint for XY
            gridType: 'xy'
        };
        // YZ Plane (side view) - X=0 (change origin.x for offset)
        const yzPlane = {
            id: 'default_yz',
            name: 'Right View (YZ Plane)',
            normal: new BABYLON.Vector3(1, 0, 0),
            origin: new BABYLON.Vector3(0, 0, 0),
            uAxis: new BABYLON.Vector3(0, 0, 1), // Z-axis (horizontal in 2D view)
            vAxis: new BABYLON.Vector3(0, -1, 0), // Flip Y here too
            type: 'default',
            color: new BABYLON.Color3(0.2, 0.8, 0.2), // Green tint for YZ
            gridType: 'yz'
        };
        // XZ Plane (top view) - Y=0 (change origin.y for offset)
        const xzPlane = {
            id: 'default_xz',
            name: 'Top View (XZ Plane)',
            normal: new BABYLON.Vector3(0, 1, 0),
            origin: new BABYLON.Vector3(0, 0, 0),
            uAxis: new BABYLON.Vector3(1, 0, 0),
            vAxis: new BABYLON.Vector3(0, 0, -1), // Keep negative Z for top-down view consistency
            type: 'default',
            color: new BABYLON.Color3(0.2, 0.2, 0.8), // Blue tint for XZ
            gridType: 'xz'
        };
        
        this.defaultPlanes = [xyPlane, yzPlane, xzPlane];
        
        // Create visual selectors for all planes
        this.createPlaneSelectors();
        
    }

    // Create visual plane selector rectangles
    createPlaneSelectors() {
        
        // Dispose existing selectors
        this.disposePlaneSelectors();
        
        this.defaultPlanes.forEach(plane => {
            const selector = this.createPlaneSelectorMesh(plane);
            this.planeSelectors.push(selector);
        });
        
    }

    // Create individual plane selector mesh
    createPlaneSelectorMesh(plane) {
        const selectorName = `planeSelector_${plane.id}`;
        
        // Create plane mesh
        const selector = BABYLON.MeshBuilder.CreatePlane(selectorName, {
            size: this.selectorSize,
            updatable: false
        }, this.scene);
        
        // Position and orient the selector based on plane
        this.positionPlanSelector(selector, plane);
        
        // Create semi-transparent material
        const material = new BABYLON.StandardMaterial(`${selectorName}_mat`, this.scene);
        material.diffuseColor = plane.color;
        material.alpha = this.selectorOpacity;
        material.backFaceCulling = false; // Show both sides
        
        selector.material = material;
        
        // Store plane reference in metadata
        selector.metadata = {
            planeData: plane,
            isPlaneSelector: true
        };
          // Make it pickable for selection
        selector.isPickable = true;
        
        // Start with selectors disabled/hidden - they should only show after "New Project"
        selector.setEnabled(false);
        
        return selector;
    }    // Position plane selector based on plane orientation
    positionPlanSelector(selector, plane) {
        const offset = 8; // 8 units from origin for clear visibility
        const selectorCenter = this.selectorSize / 2;
        
        switch(plane.id) {            
            case 'default_xy':
                // XY plane - position in front (positive Z)
                selector.position = new BABYLON.Vector3(-(offset + selectorCenter), offset + selectorCenter, 0.1);
                // Already facing forward (default orientation)
                break;
                
            case 'default_yz':
                // YZ plane - position to the right (positive X)
                selector.position = new BABYLON.Vector3(0.1, offset + selectorCenter, -(offset + selectorCenter));
                selector.rotation.y = Math.PI / 2; // Rotate to face YZ plane
                break;
                
            case 'default_xz':
                // XZ plane - position above (positive Y)
                selector.position = new BABYLON.Vector3(offset + selectorCenter, 0.1, -(offset + selectorCenter));
                selector.rotation.x = Math.PI / 2; // Rotate to lie flat on XZ plane
                break;
                
            default:
                // Default positioning (same as XZ)
                selector.position = new BABYLON.Vector3(offset + selectorCenter, 0.1, -(offset + selectorCenter));
                selector.rotation.x = Math.PI / 2;
                break;
        }
        
    }

    // Show plane selection prompt
    showPlaneSelectionPrompt() {
        if (this.planePromptVisible) return;
        
        this.planePromptVisible = true;
        
        // TODO: Create UI prompt "Select a plane to sketch on"
        // For now, just show selectors
        this.showPlaneSelectors();
    }

    // Hide plane selection prompt
    hidePlaneSelectionPrompt() {
        if (!this.planePromptVisible) return;
        
        this.planePromptVisible = false;
        
        this.hidePlaneSelectors();
    }

    // Show plane selectors
    showPlaneSelectors() {
        this.planeSelectors.forEach(selector => {
            selector.setEnabled(true);
        });
    }

    // Hide plane selectors
    hidePlaneSelectors() {
        this.planeSelectors.forEach(selector => {
            selector.setEnabled(false);
        });
    }

    // Select a plane for sketching
    selectPlane(plane) {
        
        this.activePlane = plane;
        this.hidePlaneSelectionPrompt();
        
        // Notify app that plane is selected
        if (this.app && this.app.onPlaneSelected) {
            this.app.onPlaneSelected(plane);
        }
        
        return plane;
    }

    // Handle plane selector click
    handlePlaneClick(pickedMesh) {
        if (!pickedMesh || !pickedMesh.metadata || !pickedMesh.metadata.isPlaneSelector) {
            return false;
        }
        
        const plane = pickedMesh.metadata.planeData;
        this.selectPlane(plane);
        return true;
    }

    // Get all available planes (default + surface planes)
    getAllAvailablePlanes() {
        return [...this.defaultPlanes, ...this.surfacePlanes];
    }

    // Dispose default planes
    disposeDefaultPlanes() {
        this.defaultPlanes = [];
    }

    // Dispose plane selectors
    disposePlaneSelectors() {
        this.planeSelectors.forEach(selector => {
            if (selector) selector.dispose();
        });
        this.planeSelectors = [];
    }

    // Remove all plane selector meshes from the scene
    removeAllPlaneSelectors() {
        this.planeSelectors.forEach(selector => {
            if (selector && !selector.isDisposed()) {
                selector.dispose();
            }
        });
        this.planeSelectors = [];
        this.planePromptVisible = false;
    }

    // Dispose all resources
    dispose() {
        this.disposePlaneSelectors();
        this.disposeDefaultPlanes();
        this.surfacePlanes = [];
        this.activePlane = null;
    }
    
    // For XZ plane specifically, add a localTo3D helper
    localTo3D_XZ(localPoint) {
        // Negate Y because vAxis is flipped
        return new BABYLON.Vector3(localPoint.x, 0, -localPoint.y);
    }

    // For YZ plane specifically, add a localTo3D helper
    localTo3D_YZ(localPoint) {
        // On YZ plane: 2D X maps to Y, 2D Y maps to Z, X is always 0
        return new BABYLON.Vector3(0, localPoint.x, localPoint.y);
    }
    
    // General 2D-to-3D mapping for any plane orientation
    localTo3D_general(localPoint, plane) {
        // worldPoint = origin + u * uAxis + v * vAxis
        const u = localPoint.x;
        const v = localPoint.y;
        const origin = plane.origin;
        const uAxis = plane.uAxis;
        const vAxis = plane.vAxis;
        return origin.clone()
            .add(uAxis.clone().scale(u))
            .add(vAxis.clone().scale(v));
    }
}
