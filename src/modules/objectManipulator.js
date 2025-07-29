// src/modules/objectManipulator.js - Revolutionary Object Manipulator System
// Master's Vision: Context-Aware UI Panel for 3D CAD Operations


export default class ObjectManipulator {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.currentMode = null;
        this.selectedObject = null;
        this.selectedFace = null;
        this.selectedEdge = null;
        
        // UI Panel elements
        this.panel = null;
        this.titleBar = null;
        this.contentArea = null;
        this.modes = {};
        
        // Panel state
        this.isVisible = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.position = { x: 20, y: 20 }; // Default position
        this.size = { width: 350, height: 500 }; // LARGER SIZE - was 300x400
        
        this._createPanel();
        this._setupEventListeners();
        
    }
    
    /**
     * Creates the main UI panel structure
     */
    _createPanel() {
        // Create main panel container
        this.panel = document.createElement('div');
        this.panel.id = 'object-manipulator-panel';
        this.panel.className = 'object-manipulator-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: ${this.position.y}px;
            left: ${this.position.x}px;
            width: ${this.size.width}px;
            height: ${this.size.height}px;
            background: #ffffff;
            border: 2px solid #3498db;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            z-index: 9999;
            display: none;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            overflow: hidden;
            pointer-events: auto;
        `;
        
        // Create title bar
        this.titleBar = document.createElement('div');
        this.titleBar.className = 'manipulator-title-bar';
        this.titleBar.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            cursor: move;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        this.titleBar.innerHTML = `
            <span class="title-text">Object Manipulator</span>
            <span class="close-btn" style="cursor: pointer; font-size: 16px;">&times;</span>
        `;
        
        // Create content area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'manipulator-content';
        this.contentArea.style.cssText = `
            padding: 15px;
            height: calc(100% - 50px);
            overflow-y: auto;
        `;
        
        // Assemble panel
        this.panel.appendChild(this.titleBar);
        this.panel.appendChild(this.contentArea);
        
        // Add to document
        document.body.appendChild(this.panel);
        
    }
    
    /**
     * Sets up event listeners for panel interactions
     */
    _setupEventListeners() {
        // Title bar dragging
        this.titleBar.addEventListener('mousedown', (e) => {
            if (e.target.className === 'close-btn') {
                this.hide();
                return;
            }
            
            this.isDragging = true;
            this.dragOffset = {
                x: e.clientX - this.position.x,
                y: e.clientY - this.position.y
            };
            
            document.addEventListener('mousemove', this._onDrag);
            document.addEventListener('mouseup', this._onDragEnd);
            e.preventDefault();
        });
        
        // Bind drag methods to maintain 'this' context
        this._onDrag = this._onDrag.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);
        
    }
    
    /**
     * Handles panel dragging
     */
    _onDrag(e) {
        if (!this.isDragging) return;
        
        this.position.x = e.clientX - this.dragOffset.x;
        this.position.y = e.clientY - this.dragOffset.y;
        
        // Keep panel within viewport
        this.position.x = Math.max(0, Math.min(this.position.x, window.innerWidth - this.size.width));
        this.position.y = Math.max(0, Math.min(this.position.y, window.innerHeight - this.size.height));
        
        this.panel.style.left = `${this.position.x}px`;
        this.panel.style.top = `${this.position.y}px`;
    }
    
    /**
     * Ends panel dragging
     */
    _onDragEnd() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);
    }
    
    /**
     * Shows the manipulator panel
     */
    show() {
        this.isVisible = true;
        this.panel.style.display = 'block';
        
        // Force panel to foreground
        this.panel.style.zIndex = '9999';
        
        // Debug positioning
        
        // Force a style update
        this.panel.offsetHeight; // Trigger reflow
    }
    
    /**
     * Hides the manipulator panel
     */
    hide() {
        this.isVisible = false;
        this.panel.style.display = 'none';
        this.currentMode = null;
        
        // Clean up preview mesh
        this._cleanupPreview();
        
        // Restore original emissive color
        if (this.originalEmissive && this.selectedObject && this.selectedObject.material) {
            this.selectedObject.material.emissiveColor = this.originalEmissive.clone();
            this.originalEmissive = null;
        }
        
        this.selectedObject = null;
        this.selectedFace = null;
        this.selectedEdge = null;
    }
    
    /**
     * Updates the manipulator based on current selection
     */
    updateSelection(selectionInfo) {
        
        if (!selectionInfo) {
            this.hide();
            return;
        }
        
        // Handle different selection types
        if (selectionInfo.type === 'face') {
            // Face was selected - enter Face Extrusion Mode
            this.selectedObject = selectionInfo.object;
            this.selectedFace = selectionInfo.face;
            this.selectedEdge = null;
            this._enterFaceMode(selectionInfo);
        } else if (selectionInfo.type === 'object') {
            // Object was selected - enter Object Transform Mode
            this.selectedObject = selectionInfo.object;
            this.selectedFace = null;
            this.selectedEdge = null;
            this._enterObjectMode(selectionInfo);
        } else {
            // Legacy compatibility - check for hit info
            if (!selectionInfo.hit) {
                this.hide();
                return;
            }
            
            // Determine what was selected and set appropriate mode
            const mesh = selectionInfo.pickedMesh;
            const faceId = selectionInfo.faceId;
            
            
            if (mesh && faceId !== undefined) {
                // Face was selected - enter Face Extrusion Mode
                this.selectedObject = mesh;
                this.selectedFace = faceId;
                this.selectedEdge = null;
                this._enterFaceMode(selectionInfo);
            } else if (mesh) {
                // Object was selected - enter Object Transform Mode
                this.selectedObject = mesh;
                this.selectedFace = null;
                this.selectedEdge = null;
                this._enterObjectMode(selectionInfo);
            } else {
                this.hide();
            }
        }
    }
    
    /**
     * Enters Face Extrusion Mode
     */
    _enterFaceMode(selectionInfo) {
        
        this.currentMode = 'face';
        this.titleBar.querySelector('.title-text').textContent = 'Face Extrusion';
        
        // Store original state for preview/cancel functionality
        if (this.selectedObject) {
            this.originalScaling = this.selectedObject.scaling.clone();
            if (this.selectedObject.material) {
                this.originalEmissive = this.selectedObject.material.emissiveColor.clone();
            }
        }
        
        // Get the object name and face ID safely
        const objectName = selectionInfo.object?.name || 
                          selectionInfo.pickedMesh?.name || 
                          'Unknown Object';
        const faceId = selectionInfo.face !== undefined ? selectionInfo.face : 
                       selectionInfo.faceId !== undefined ? selectionInfo.faceId : 
                       'Unknown';
        
        
        this.contentArea.innerHTML = `
            <div class="mode-header">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Face Extrusion Mode</h3>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 12px;">
                    Selected: ${objectName} (Face ${faceId})
                </p>
            </div>
            
            <div class="control-group">
                <label for="extrusion-amount" style="display: block; margin-bottom: 5px; font-weight: bold;">
                    Extrusion Amount:
                </label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="range" id="extrusion-slider" min="0" max="10" step="0.1" value="1" 
                           style="flex: 1;" />
                    <input type="number" id="extrusion-input" min="0" max="100" step="0.1" value="1.0" 
                           style="width: 70px;" />
                </div>
            </div>
            
            <div class="control-group" style="margin-top: 15px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Direction:</label>
                <div style="display: flex; gap: 10px;">
                    <button id="extrude-outward" class="direction-btn active" 
                            style="flex: 1; padding: 8px; border: 1px solid #3498db; background: #3498db; color: white; border-radius: 4px; cursor: pointer;">
                        Outward
                    </button>
                    <button id="extrude-inward" class="direction-btn" 
                            style="flex: 1; padding: 8px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer;">
                        Inward
                    </button>
                </div>
            </div>
            
            <div class="control-group" style="margin-top: 15px;">
                <button id="apply-extrusion" 
                        style="width: 100%; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">
                    âœ“ Apply Extrusion
                </button>
            </div>
            
            <div class="control-group" style="margin-top: 8px;">
                <button id="cancel-extrusion" 
                        style="width: 100%; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    âœ— Cancel
                </button>
            </div>
        `;
        
        this._setupFaceModeEvents();
        this.show();
        
    }
    
    /**
     * Enters Object Transform Mode
     */
    _enterObjectMode(selectionInfo) {
        this.currentMode = 'object';
        this.titleBar.querySelector('.title-text').textContent = 'Object Transform';
        
        // Get the object name safely
        const objectName = selectionInfo.object?.name || 
                          selectionInfo.pickedMesh?.name || 
                          'Unknown Object';
        
        this.contentArea.innerHTML = `
            <div class="mode-header">
                <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Object Transform Mode</h3>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 12px;">
                    Selected: ${objectName}
                </p>
            </div>
            
            <div class="control-group">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Position:</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">X:</label>
                        <input type="number" id="pos-x" step="0.1" style="width: 100%; padding: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Y:</label>
                        <input type="number" id="pos-y" step="0.1" style="width: 100%; padding: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Z:</label>
                        <input type="number" id="pos-z" step="0.1" style="width: 100%; padding: 4px;" />
                    </div>
                </div>
            </div>
            
            <div class="control-group" style="margin-top: 15px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Rotation:</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">X:</label>
                        <input type="number" id="rot-x" step="1" style="width: 100%; padding: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Y:</label>
                        <input type="number" id="rot-y" step="1" style="width: 100%; padding: 4px;" />
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Z:</label>
                        <input type="number" id="rot-z" step="1" style="width: 100%; padding: 4px;" />
                    </div>
                </div>
            </div>
            
            <div class="control-group" style="margin-top: 15px;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Quick Rotations:</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;">
                    <button onclick="this.rotateObject('x', 90)" style="padding: 6px; font-size: 12px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer;">90Â° X</button>
                    <button onclick="this.rotateObject('y', 90)" style="padding: 6px; font-size: 12px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer;">90Â° Y</button>
                    <button onclick="this.rotateObject('z', 90)" style="padding: 6px; font-size: 12px; border: 1px solid #3498db; background: white; color: #3498db; border-radius: 4px; cursor: pointer;">90Â° Z</button>
                </div>
            </div>
            
            <div class="control-group" style="margin-top: 20px;">
                <button id="apply-transform" 
                        style="width: 100%; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Apply Transform
                </button>
            </div>
        `;
        
        this._setupObjectModeEvents();
        this.show();
        
    }
    
    /**
     * Sets up event listeners for Face Mode
     */
    _setupFaceModeEvents() {
        const slider = document.getElementById('extrusion-slider');
        const input = document.getElementById('extrusion-input');
        const outwardBtn = document.getElementById('extrude-outward');
        const inwardBtn = document.getElementById('extrude-inward');
        const applyBtn = document.getElementById('apply-extrusion');
        const cancelBtn = document.getElementById('cancel-extrusion');
        
        // Sync slider and input
        slider.addEventListener('input', () => {
            input.value = slider.value;
            this._previewExtrusion();
        });
        
        input.addEventListener('input', () => {
            slider.value = input.value;
            this._previewExtrusion();
        });
        
        // Direction buttons
        outwardBtn.addEventListener('click', () => {
            outwardBtn.classList.add('active');
            inwardBtn.classList.remove('active');
            outwardBtn.style.background = '#3498db';
            outwardBtn.style.color = 'white';
            inwardBtn.style.background = 'white';
            inwardBtn.style.color = '#3498db';
            this._previewExtrusion();
        });
        
        inwardBtn.addEventListener('click', () => {
            inwardBtn.classList.add('active');
            outwardBtn.classList.remove('active');
            inwardBtn.style.background = '#3498db';
            inwardBtn.style.color = 'white';
            outwardBtn.style.background = 'white';
            outwardBtn.style.color = '#3498db';
            this._previewExtrusion();
        });
        
        // Apply and Cancel
        applyBtn.addEventListener('click', () => {
            this._applyExtrusion();
        });
        
        cancelBtn.addEventListener('click', () => {
            this._cancelExtrusion();
        });
    }
    
    /**
     * Sets up event listeners for Object Mode
     */
    _setupObjectModeEvents() {
        const applyBtn = document.getElementById('apply-transform');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this._applyTransform();
            });
        }
        
        // Populate current values
        if (this.selectedObject) {
            const pos = this.selectedObject.position;
            const rot = this.selectedObject.rotation;
            
            document.getElementById('pos-x').value = pos.x.toFixed(2);
            document.getElementById('pos-y').value = pos.y.toFixed(2);
            document.getElementById('pos-z').value = pos.z.toFixed(2);
            
            document.getElementById('rot-x').value = (rot.x * 180 / Math.PI).toFixed(0);
            document.getElementById('rot-y').value = (rot.y * 180 / Math.PI).toFixed(0);
            document.getElementById('rot-z').value = (rot.z * 180 / Math.PI).toFixed(0);
        }
    }
    
    /**
     * Previews extrusion operation
     */
    _previewExtrusion() {
        const amount = parseFloat(document.getElementById('extrusion-input').value);
        const isOutward = document.getElementById('extrude-outward').classList.contains('active');
        
        
        if (!this.selectedObject || this.selectedFace === undefined) {
            return;
        }
        
        // OPUS FIX: Simplified preview using face center and world normal
        try {
            const faceCenter = this._getFaceCenter(this.selectedObject, this.selectedFace);
            const worldFaceNormal = this._getFaceNormal(this.selectedObject, this.selectedFace);
            
            const direction = isOutward ? 1 : -1;
            const extrusionAmount = amount * direction;
            
            if (extrusionAmount === 0) {
                // No extrusion, clean up any existing preview
                this._cleanupPreview();
                return;
            }
            
            // Clean up any existing preview
            if (this.previewMesh) {
                this.previewMesh.dispose();
            }
            
            // OPUS FIX: Create preview mesh with proper scaling
            this.previewMesh = BABYLON.MeshBuilder.CreateBox("previewMesh", {
                size: 1
            }, this.scene);
            
            // Create wireframe material for the extrusion preview
            const previewMaterial = new BABYLON.StandardMaterial("previewMaterial", this.scene);
            previewMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green wireframe
            previewMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1); // Slight glow to make it more visible
            previewMaterial.wireframe = true;
            previewMaterial.alpha = 1.0; // Full opacity
            previewMaterial.backFaceCulling = false; // Show both sides
            this.previewMesh.material = previewMaterial;
            
            // Make sure the preview mesh doesn't get culled
            this.previewMesh.alwaysSelectAsActiveMesh = true;
            
            // SPANKY FIX: Position preview mesh directly on the selected face
            // The preview should start AT the face, not offset from it
            const previewPosition = faceCenter.clone();
            
            // Only add a small offset in the extrusion direction to position the preview
            // so it grows FROM the face, not centered on some offset point
            const smallOffset = worldFaceNormal.scale(Math.abs(extrusionAmount) / 2);
            if (isOutward) {
                previewPosition.addInPlace(smallOffset);
            } else {
                previewPosition.subtractInPlace(smallOffset);
            }
            
            this.previewMesh.position = previewPosition;
            
            // SPANKY FIX: Get actual object dimensions for proper preview sizing
            const boundingInfo = this.selectedObject.getBoundingInfo();
            const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
            
            // Determine which dimension is the extrusion direction based on face normal
            const absX = Math.abs(worldFaceNormal.x);
            const absY = Math.abs(worldFaceNormal.y);
            const absZ = Math.abs(worldFaceNormal.z);
            
            let previewWidth, previewHeight, previewDepth;
            
            // SPANKY FIX: Ensure minimum visible thickness for preview
            const minPreviewThickness = 0.5; // Half inch minimum for visibility
            const actualExtrusionThickness = Math.max(minPreviewThickness, Math.abs(extrusionAmount));
            
            if (absX > absY && absX > absZ) {
                // Extruding along X axis
                previewWidth = actualExtrusionThickness;
                previewHeight = size.y;
                previewDepth = size.z;
            } else if (absY > absX && absY > absZ) {
                // Extruding along Y axis
                previewWidth = size.x;
                previewHeight = actualExtrusionThickness;
                previewDepth = size.z;
            } else {
                // Extruding along Z axis
                previewWidth = size.x;
                previewHeight = size.y;
                previewDepth = actualExtrusionThickness;
            }
            
            // Apply the calculated scaling to the unit cube
            this.previewMesh.scaling = new BABYLON.Vector3(previewWidth, previewHeight, previewDepth);
            
            // SPANKY FIX: Make preview mesh persistent and visible
            this.previewMesh.renderingGroupId = 1; // Render on top
            this.previewMesh.isPickable = false; // Don't interfere with picking
            this.previewMesh.alwaysSelectAsActiveMesh = true; // Don't get culled
            
            // OPUS FIX: Align preview mesh rotation with the selected object
            this.previewMesh.rotation = this.selectedObject.rotation.clone();
            
            
            // Keep original object fully visible (no transparency)
            this.selectedObject.visibility = 1.0;
            
        } catch (error) {
        }
    }
    
    /**
     * Applies extrusion operation
     */
    _applyExtrusion() {
        const amount = parseFloat(document.getElementById('extrusion-input').value);
        const isOutward = document.getElementById('extrude-outward').classList.contains('active');
        
        
        if (!this.selectedObject || this.selectedFace === undefined) {
            return;
        }
        
        // REVOLUTIONARY EXTRUSION: Create final object by combining original + extrusion!
        try {
            // Get the face normal direction in WORLD coordinates (already transformed)
            const worldFaceNormal = this._getFaceNormal(this.selectedObject, this.selectedFace);
            if (!worldFaceNormal) {
                return;
            }
            
            // Calculate extrusion direction and amount in REAL UNITS (inches)
            const direction = isOutward ? 1 : -1;
            const extrusionAmount = amount * direction; // Direct unit measurement (inches)
            
            
            // Get current object dimensions
            const metadata = this.selectedObject.metadata;
            const originalObject = metadata?.originalObject;
            
            let currentDimensions;
            if (originalObject) {
                currentDimensions = {
                    width: originalObject.width || 2,
                    height: originalObject.height || 2,
                    depth: originalObject.depth || 0.1
                };
            } else {
                // Fallback to bounding box
                const boundingInfo = this.selectedObject.getBoundingInfo();
                const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
                currentDimensions = {
                    width: size.x,
                    height: size.y,
                    depth: size.z
                };
            }
            
            
            // Calculate NEW FINAL dimensions (original + extrusion)
            const finalDimensions = { ...currentDimensions };
            
            // Use WORLD normal to determine which dimension to change
            // Convert world normal back to local space for dimension calculation
            const worldMatrix = this.selectedObject.getWorldMatrix();
            const inverseWorldMatrix = worldMatrix.clone().invert();
            const localNormal = BABYLON.Vector3.TransformNormal(worldFaceNormal, inverseWorldMatrix);
            
            const absX = Math.abs(localNormal.x);
            const absY = Math.abs(localNormal.y);
            const absZ = Math.abs(localNormal.z);
            
            // Find the dominant axis and add extrusion amount
            if (absX > absY && absX > absZ) {
                // X-axis dominant - increase width
                finalDimensions.width = currentDimensions.width + Math.abs(extrusionAmount);
            } else if (absY > absX && absY > absZ) {
                // Y-axis dominant - increase height
                finalDimensions.height = currentDimensions.height + Math.abs(extrusionAmount);
            } else {
                // Z-axis dominant - increase depth
                finalDimensions.depth = currentDimensions.depth + Math.abs(extrusionAmount);
            }
            
            // Prevent negative dimensions (minimum 0.1 units)
            finalDimensions.width = Math.max(0.1, finalDimensions.width);
            finalDimensions.height = Math.max(0.1, finalDimensions.height);
            finalDimensions.depth = Math.max(0.1, finalDimensions.depth);
            
            
            // Store original mesh properties BEFORE disposing
            const meshName = this.selectedObject.name;
            const originalPosition = this.selectedObject.position.clone();
            const meshRotation = this.selectedObject.rotation.clone();
            const meshMaterial = this.selectedObject.material;
            const existingMetadata = this.selectedObject.metadata;
            const originalWorldMatrix = this.selectedObject.getWorldMatrix();
            
            // Dispose of old mesh
            this.selectedObject.dispose();
            
            // Create final combined mesh with new dimensions
            const finalMesh = BABYLON.MeshBuilder.CreateBox(meshName, {
                width: finalDimensions.width,
                height: finalDimensions.height,
                depth: finalDimensions.depth,
                updatable: true,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.scene);
            
            // Position the final mesh: center needs to shift to account for extrusion
            // The new mesh should be positioned so the original face stays in place
            const localOffset = localNormal.scale(extrusionAmount / 2);
            const worldOffset = BABYLON.Vector3.TransformNormal(localOffset, originalWorldMatrix);
            const finalPosition = originalPosition.add(worldOffset);
            
            
            // Restore properties with corrected position
            finalMesh.position = finalPosition;
            finalMesh.rotation = meshRotation;
            finalMesh.material = meshMaterial;
            finalMesh.metadata = existingMetadata;
            
            // Update reference
            this.selectedObject = finalMesh;
            
            // Update the active3DMeshes reference in main app
            if (existingMetadata && existingMetadata.originalObjectId && window.cutListApp) {
                window.cutListApp.active3DMeshes[existingMetadata.originalObjectId] = finalMesh;
            }
            
            // Update the original object dimensions in metadata if available
            if (existingMetadata && existingMetadata.originalObject) {
                existingMetadata.originalObject.width = finalDimensions.width;
                existingMetadata.originalObject.height = finalDimensions.height;
                existingMetadata.originalObject.depth = finalDimensions.depth;
            }
            
            // Clean up preview mesh
            if (this.previewMesh) {
                this.previewMesh.dispose();
                this.previewMesh = null;
            }
            
            // Restore original object visibility
            this.selectedObject.visibility = 1.0;
            
            // VISUAL FEEDBACK: Change material color briefly to show the operation worked
            if (this.selectedObject.material) {
                const originalColor = this.selectedObject.material.diffuseColor.clone();
                this.selectedObject.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green flash
                
                // Restore original color after 500ms
                setTimeout(() => {
                    if (this.selectedObject && this.selectedObject.material) {
                        this.selectedObject.material.diffuseColor = originalColor;
                    }
                }, 500);
            }
            
            
            // Notify main application about the extrusion
            if (window.cutListApp && typeof window.cutListApp.handleExtrusionUpdate === 'function') {
                window.cutListApp.handleExtrusionUpdate({
                    object: this.selectedObject,
                    amount: amount,
                    direction: isOutward ? 'outward' : 'inward',
                    dimensions: finalDimensions
                });
            }
            
            // Reset the extrusion input to 0 after successful application
            document.getElementById('extrusion-input').value = '0';
            document.getElementById('extrusion-slider').value = '0';
            
        } catch (error) {
        }
        
        // Keep the manipulator open for more operations
    }
    
    /**
     * Cancels extrusion and restores original state
     */
    _cancelExtrusion() {
        
        // Restore original scaling if it was stored
        if (this.originalScaling && this.selectedObject) {
            this.selectedObject.scaling = this.originalScaling.clone();
            this.originalScaling = null;
        }
        
        // Restore original emissive color
        if (this.originalEmissive && this.selectedObject && this.selectedObject.material) {
            this.selectedObject.material.emissiveColor = this.originalEmissive.clone();
            this.originalEmissive = null;
        }
        
        this.hide();
    }
    
    /**
     * Cleans up preview mesh and restores original state
     */
    _cleanupPreview() {
        if (this.previewMesh) {
            this.previewMesh.dispose();
            this.previewMesh = null;
        }
        
        if (this.selectedObject) {
            this.selectedObject.visibility = 1.0;
        }
        
        // Clean up stored dimensions
        this.originalDimensions = null;
    }
    
    /**
     * Resets the manipulator state
     */
    _resetState() {
        this.selectedObject = null;
        this.selectedFace = null;
        this.selectedEdge = null;
        this.currentMode = null;
        this.originalDimensions = null;
        this._cleanupPreview();
    }
    
    /**
     * Gets the normal vector for a face in WORLD coordinates (with rotation applied)
     */
    _getFaceNormal(mesh, faceId) {
        if (!mesh || faceId === undefined) return null;
        
        // Define local normals for a box (in local object space)
        const localNormals = [
            new BABYLON.Vector3(0, 0, 1),  // Front face
            new BABYLON.Vector3(0, 0, -1), // Back face
            new BABYLON.Vector3(1, 0, 0),  // Right face
            new BABYLON.Vector3(-1, 0, 0), // Left face
            new BABYLON.Vector3(0, 1, 0),  // Top face
            new BABYLON.Vector3(0, -1, 0)  // Bottom face
        ];
        
        const localNormal = localNormals[faceId % localNormals.length] || new BABYLON.Vector3(0, 0, 1);
        
        // OPUS FIX: Transform local normal to world space using TransformNormal
        const worldMatrix = mesh.getWorldMatrix();
        const worldFaceNormal = BABYLON.Vector3.TransformNormal(localNormal, worldMatrix);
        
        
        return worldFaceNormal;
    }
    
    /**
     * Gets the center position of a face in world coordinates
     */
    _getFaceCenter(mesh, faceId) {
        if (!mesh || faceId === undefined) return mesh.position.clone();
        
        // Get mesh dimensions in LOCAL space
        const boundingInfo = mesh.getBoundingInfo();
        const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
        
        // Calculate face center offset in LOCAL coordinates
        // Face IDs: 0=front, 1=back, 2=right, 3=left, 4=top, 5=bottom
        let faceOffset = new BABYLON.Vector3(0, 0, 0);
        
        switch (faceId % 6) {
            case 0: // Front face (+Z)
                faceOffset = new BABYLON.Vector3(0, 0, size.z / 2);
                break;
            case 1: // Back face (-Z)
                faceOffset = new BABYLON.Vector3(0, 0, -size.z / 2);
                break;
            case 2: // Right face (+X)
                faceOffset = new BABYLON.Vector3(size.x / 2, 0, 0);
                break;
            case 3: // Left face (-X)
                faceOffset = new BABYLON.Vector3(-size.x / 2, 0, 0);
                break;
            case 4: // Top face (+Y)
                faceOffset = new BABYLON.Vector3(0, size.y / 2, 0);
                break;
            case 5: // Bottom face (-Y)
                faceOffset = new BABYLON.Vector3(0, -size.y / 2, 0);
                break;
        }
        
        // REVOLUTIONARY FIX: Transform local face offset to world coordinates using TransformCoordinates
        const worldMatrix = mesh.computeWorldMatrix(true);
        const worldFaceCenter = BABYLON.Vector3.TransformCoordinates(faceOffset, worldMatrix);
        
        
        return worldFaceCenter;
    }
    
    /**
     * Gets the size of a face (width and height of the face)
     */
    _getFaceSize(mesh, faceId) {
        if (!mesh || faceId === undefined) return { width: 1, height: 1, depth: 0.01 };
        
        // Get mesh dimensions
        const boundingInfo = mesh.getBoundingInfo();
        const size = boundingInfo.boundingBox.maximum.subtract(boundingInfo.boundingBox.minimum);
        
        // Return face dimensions based on face ID
        // Face IDs: 0=front, 1=back, 2=right, 3=left, 4=top, 5=bottom
        switch (faceId % 6) {
            case 0: // Front face (+Z) - width x height
            case 1: // Back face (-Z) - width x height
                return { width: size.x, height: size.y, depth: 0.01 };
            case 2: // Right face (+X) - depth x height
            case 3: // Left face (-X) - depth x height
                return { width: size.z, height: size.y, depth: 0.01 };
            case 4: // Top face (+Y) - width x depth
            case 5: // Bottom face (-Y) - width x depth
                return { width: size.x, height: size.z, depth: 0.01 };
            default:
                return { width: size.x, height: size.y, depth: 0.01 };
        }
    }
    
    /**
     * Applies transform operation
     */
    _applyTransform() {
        if (!this.selectedObject) return;
        
        const posX = parseFloat(document.getElementById('pos-x').value);
        const posY = parseFloat(document.getElementById('pos-y').value);
        const posZ = parseFloat(document.getElementById('pos-z').value);
        
        const rotX = parseFloat(document.getElementById('rot-x').value) * Math.PI / 180;
        const rotY = parseFloat(document.getElementById('rot-y').value) * Math.PI / 180;
        const rotZ = parseFloat(document.getElementById('rot-z').value) * Math.PI / 180;
        
        // Apply position
        this.selectedObject.position.set(posX, posY, posZ);
        
        // Apply rotation - handle both Euler and Quaternion rotation
        if (this.selectedObject.rotationQuaternion) {
            // Convert Euler to Quaternion
            this.selectedObject.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(rotX, rotY, rotZ);
        } else {
            // Use Euler rotation directly
            this.selectedObject.rotation.set(rotX, rotY, rotZ);
        }
        
        this.hide();
    }
    
    /**
     * Disposes of the manipulator
     */
    dispose() {
        if (this.panel) {
            document.body.removeChild(this.panel);
            this.panel = null;
        }
        
        document.removeEventListener('mousemove', this._onDrag);
        document.removeEventListener('mouseup', this._onDragEnd);
        
    }
}
