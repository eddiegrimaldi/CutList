/**
 * DrillPressSystem Module - Professional Drill Press Interface
 * 
 * Provides orthographic surface-parallel view for precision hole drilling including:
 * - Automatic camera positioning for selected surface
 * - Standard drill bit library with visual representations
 * - Interactive hole markers with smart snapping/alignment
 * - Configurable hole depth (partial or through)
 * - Real-time edge distance measurements
 * - Batch hole drilling with actual geometry cutting
 */

export class DrillPressSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        this.camera = drawingWorld.camera;
        
        // Drill press state
        this.isActive = false;
        this.selectedSurface = null;
        this.selectedBoard = null;
        this.surfaceNormal = null;
        this.originalCameraState = null;
        
        // Hole markers and settings
        this.holeMarkers = [];
        this.selectedMarker = null;
        this.currentDrillSize = 0.25; // Default 1/4" bit
        this.currentDepth = 'through'; // 'through' or depth in inches
        this.snapDistance = 0.03125; // 1/32" snap tolerance
        this.shiftPressed = false;
        
        // Drag state
        this.isDragging = false;
        this.dragStartPos = null;
        
        // Standard drill bit sizes (inches)
        this.standardBits = [
            { size: 1/16, label: '1/16"', decimal: 0.0625 },
            { size: 3/32, label: '3/32"', decimal: 0.09375 },
            { size: 1/8, label: '1/8"', decimal: 0.125 },
            { size: 5/32, label: '5/32"', decimal: 0.15625 },
            { size: 3/16, label: '3/16"', decimal: 0.1875 },
            { size: 7/32, label: '7/32"', decimal: 0.21875 },
            { size: 1/4, label: '1/4"', decimal: 0.25 },
            { size: 9/32, label: '9/32"', decimal: 0.28125 },
            { size: 5/16, label: '5/16"', decimal: 0.3125 },
            { size: 11/32, label: '11/32"', decimal: 0.34375 },
            { size: 3/8, label: '3/8"', decimal: 0.375 },
            { size: 13/32, label: '13/32"', decimal: 0.40625 },
            { size: 7/16, label: '7/16"', decimal: 0.4375 },
            { size: 15/32, label: '15/32"', decimal: 0.46875 },
            { size: 1/2, label: '1/2"', decimal: 0.5 }
        ];
        
        // Visual elements
        this.crosshair = null;
        this.edgeLabels = [];
        this.drillBitUI = null;
        this.surfaceQuad = null;
        this.previewCircle = null;
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.createDrillBitLibrary();
        this.createCrosshair();
    }
    
    /**
     * Setup keyboard and mouse event listeners
     */
    setupEventListeners() {
        // Keyboard events for shift detection
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Shift') {
                this.shiftPressed = true;
            }
        });
        
        window.addEventListener('keyup', (event) => {
            if (event.key === 'Shift') {
                this.shiftPressed = false;
            }
        });
        
        // Delete key handler for removing selected markers
        window.addEventListener('keydown', (event) => {
            if (this.isActive && event.key === 'Delete' && this.selectedMarker) {
                this.deleteSelectedMarker();
                event.preventDefault();
            }
        });
        
        // Mouse events for hole placement and marker dragging
        this.canvas.addEventListener('mousedown', (event) => {
            if (this.isActive && event.button === 0) { // Left click only
                this.handleMouseDown(event);
            }
        });
        
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isActive) {
                if (this.isDragging) {
                    this.handleDrag(event);
                } else {
                    this.updateCrosshair(event);
                }
            }
        });
        
        this.canvas.addEventListener('mouseup', (event) => {
            if (this.isActive && event.button === 0) { // Left click only
                this.handleMouseUp(event);
            }
        });
        
        this.canvas.addEventListener('click', (event) => {
            if (this.isActive && !this.isDragging && !this.dragStartPos) {
                this.handleSurfaceClick(event);
            }
        });
        
        // Right-click context menu for marker deletion
        this.canvas.addEventListener('contextmenu', (event) => {
            if (this.isActive) {
                this.handleRightClick(event);
                event.preventDefault(); // Prevent browser context menu
            }
        });
    }
    
    /**
     * Activate drill press tool on selected board
     */
    activate() {
        this.isActive = true;
        
        // Save current camera state
        this.originalCameraState = {
            position: this.camera.position.clone(),
            target: this.camera.target.clone(),
            mode: this.camera.mode
        };
        
        this.showInstructions('Click on a board to select it for drilling.');
        this.canvas.style.cursor = 'crosshair';
        
        return true;
    }
    
    /**
     * Deactivate drill press tool
     */
    deactivate() {
        this.isActive = false;
        this.selectedBoard = null;
        this.selectedSurface = null;
        this.surfaceNormal = null;
        this.selectedMarker = null;
        this.isDragging = false;
        this.dragStartPos = null;
        
        // Restore cursor
        this.canvas.style.cursor = 'default';
        
        // Clear markers
        this.clearAllMarkers();
        
        // Remove drill bit UI if it exists
        if (this.drillBitUI) {
            this.drillBitUI.remove();
            this.drillBitUI = null;
        }
        
        // Clear visual elements
        if (this.crosshair) {
            this.crosshair.isVisible = false;
        }
        
        // Dispose preview circle
        if (this.previewCircle) {
            this.previewCircle.dispose();
            this.previewCircle = null;
        }
        
    }
    
    /**
     * Handle surface click to set up orthographic view
     */
    handleSurfaceClick(event) {
        // Use the same coordinate system as drawing-world.js
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // If no board selected yet, first click selects board and surface in one action
        if (!this.selectedBoard) {
            const boardPick = this.scene.pick(x, y, (mesh) => mesh.isWorkBenchPart);
            
            if (boardPick.hit && boardPick.pickedMesh.partData) {
                this.selectedBoard = boardPick.pickedMesh;
                
                // Immediately setup the surface view with this click
                this.setupSurfaceView(boardPick);
                return;
            } else {
                this.showInstructions('Please click on a workbench board to select it for drilling.');
                return;
            }
        }
        
        // First check if we're clicking on an existing marker
        const markerPick = this.scene.pick(x, y, (mesh) => {
            return this.holeMarkers.some(marker => 
                marker.getChildMeshes().includes(mesh)
            );
        });
        
        if (markerPick.hit && this.selectedSurface) {
            // Clicking on existing marker - select it
            this.selectMarker(markerPick.pickedMesh);
            return;
        }
        
        // Pick using the same approach as drawing-world.js
        const pickInfo = this.scene.pick(x, y, (mesh) => mesh === this.selectedBoard);
        
        if (!pickInfo.hit) {
            return;
        }
        
        // If we have a selected surface, place hole markers
        if (this.selectedSurface) {
            this.deselectMarker(); // Clear any selected marker
            this.placeHoleMarker(pickInfo);
        }
    }
    
    /**
     * Handle mouse down for drag detection
     */
    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if clicking on a marker
        const markerPick = this.scene.pick(x, y, (mesh) => {
            return this.holeMarkers.some(marker => 
                marker.getChildMeshes().includes(mesh)
            );
        });
        
        if (markerPick.hit && this.selectedSurface) {
            // Start dragging the marker
            this.selectMarker(markerPick.pickedMesh);
            this.isDragging = false; // Will be set to true on first movement
            this.dragStartPos = { x: event.clientX, y: event.clientY };
            event.preventDefault();
        }
    }
    
    /**
     * Handle mouse up to end dragging
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
        }
        // Always reset drag start position on mouse up
        this.dragStartPos = null;
    }
    
    /**
     * Handle marker dragging
     */
    handleDrag(event) {
        if (!this.selectedMarker || !this.dragStartPos) return;
        
        // Start dragging if we've moved enough (prevents accidental drags)
        if (!this.isDragging) {
            const dragDistance = Math.sqrt(
                Math.pow(event.clientX - this.dragStartPos.x, 2) + 
                Math.pow(event.clientY - this.dragStartPos.y, 2)
            );
            
            if (dragDistance > 5) { // 5 pixel threshold
                this.isDragging = true;
            } else {
                return;
            }
        }
        
        // Get new position from mouse
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Pick the board surface at the new mouse position
        const pickInfo = this.scene.pick(x, y, (mesh) => mesh === this.selectedBoard);
        
        if (pickInfo.hit) {
            let newPosition = pickInfo.pickedPoint;
            
            // Apply snapping unless shift is pressed
            if (!this.shiftPressed) {
                newPosition = this.getSnappedPosition(newPosition, this.selectedMarker);
            }
            
            // Move the marker
            this.selectedMarker.position = newPosition;
        }
    }
    
    /**
     * Handle right-click for context menu
     */
    handleRightClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check if right-clicking on a marker
        const markerPick = this.scene.pick(x, y, (mesh) => {
            return this.holeMarkers.some(marker => 
                marker.getChildMeshes().includes(mesh)
            );
        });
        
        if (markerPick.hit && this.selectedSurface) {
            // Right-clicked on a marker - delete it directly
            const marker = this.holeMarkers.find(m => 
                m.getChildMeshes().includes(markerPick.pickedMesh) || m === markerPick.pickedMesh.parent
            );
            
            if (marker) {
                // Remove from markers array
                const index = this.holeMarkers.indexOf(marker);
                if (index > -1) {
                    this.holeMarkers.splice(index, 1);
                }
                
                // If this was the selected marker, clear selection
                if (this.selectedMarker === marker) {
                    this.selectedMarker = null;
                }
                
                // Dispose the marker
                marker.dispose();
                
                // Update drill button
                this.updateDrillButton();
                
            }
        }
    }
    
    /**
     * Setup orthographic camera view parallel to selected surface
     */
    setupSurfaceView(pickInfo) {
        // Store surface info for reference
        this.surfaceNormal = pickInfo.getNormal(true, true);
        this.selectedSurface = pickInfo.faceId;
        
        
        // Position camera directly above board (same as saw tool)
        this.animateToSurfaceView();
        
        // Create surface visualization
        this.createSurfaceOverlay(pickInfo.pickedPoint);
        
        // Show drill bit library
        this.showDrillBitLibrary();
        
        this.showInstructions('Surface selected. Choose drill bit size and click to place holes. SHIFT disables snapping.');
    }
    
    /**
     * Position camera directly above selected board (same as saw tool)
     */
    animateToSurfaceView() {
        
        // Stop any existing camera animations
        this.scene.stopAnimation(this.camera);
        
        // Get board bounds
        const boardBounds = this.selectedBoard.getBoundingInfo();
        const boardPosition = this.selectedBoard.position;
        const min = boardBounds.minimum;
        const max = boardBounds.maximum;
        
        // Calculate board center and dimensions
        const centerX = boardPosition.x + (min.x + max.x) / 2;
        const centerZ = boardPosition.z + (min.z + max.z) / 2;
        const centerY = boardPosition.y + max.y; // Top of the board
        
        const boardWidth = max.x - min.x;   // X dimension
        const boardDepth = max.z - min.z;   // Z dimension
        
        // Calculate camera distance - same logic as saw tool
        const maxDimension = Math.max(boardWidth, boardDepth);
        const cameraDistance = Math.max(maxDimension * 1.1, 120);
        
        // Target position (center of board)
        const targetPosition = new BABYLON.Vector3(centerX, centerY, centerZ);
        
        // Camera position directly above board
        const cameraPosition = new BABYLON.Vector3(centerX, centerY + cameraDistance, centerZ);
        
        
        // Animate camera to top-down position (same as saw tool)
        const animationDuration = 60; // 1 second at 60fps
        
        BABYLON.Animation.CreateAndStartAnimation(
            "drillCameraPosition",
            this.camera,
            "position",
            60,
            animationDuration,
            this.camera.position,
            cameraPosition,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase(),
            () => {
            }
        );
        
        BABYLON.Animation.CreateAndStartAnimation(
            "drillCameraTarget",
            this.camera,
            "target",
            60,
            animationDuration,
            this.camera.target,
            targetPosition,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }
    
    /**
     * Create visual drill bit library UI
     */
    createDrillBitLibrary() {
        // This will create a floating UI panel with drill bit options
        // For now, we'll use a simple text-based selection
        // TODO: Create visual drill bit representations
    }
    
    /**
     * Show drill bit library interface
     */
    showDrillBitLibrary() {
        const bitSelector = document.createElement('div');
        bitSelector.id = 'drill-bit-selector';
        bitSelector.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,1.0);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            z-index: 100;
            min-width: 200px;
            max-height: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        bitSelector.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4CAF50;">🔩 Drill Bits</h3>
            <div id="bit-options" style="max-height: 300px; overflow-y: auto;">
                ${this.standardBits.map(bit => `
                    <div class="bit-option" data-size="${bit.size}" style="
                        padding: 8px;
                        margin: 2px 0;
                        cursor: pointer;
                        border-radius: 4px;
                        border: 2px solid ${bit.size === this.currentDrillSize ? '#4CAF50' : 'transparent'};
                        background: ${bit.size === this.currentDrillSize ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.1)'};
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <span style="font-weight: bold;">${bit.label}</span>
                        <span style="font-size: 0.9em; opacity: 0.8;">${bit.decimal}"</span>
                    </div>
                `).join('')}
                <div style="
                    padding: 8px;
                    margin: 2px 0;
                    border-radius: 4px;
                    border: 2px solid #555;
                    background: rgba(255,255,255,0.1);
                ">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">Custom Size:</label>
                    <input type="number" id="custom-drill-size" 
                           step="0.001" 
                           min="0.001" 
                           placeholder="Enter size in inches"
                           style="
                               width: 100%;
                               padding: 4px;
                               border: 1px solid #666;
                               border-radius: 3px;
                               background: rgba(255,255,255,0.9);
                               color: black;
                           ">
                    <button id="use-custom-size" style="
                        width: 100%;
                        margin-top: 4px;
                        padding: 6px;
                        background: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.9em;
                    ">Use Custom Size</button>
                </div>
            </div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #555;">
                <div style="margin-bottom: 8px;">
                    <label style="display: block; margin-bottom: 4px;">Depth:</label>
                    <select id="depth-selector" style="width: 100%; padding: 4px;">
                        <option value="through">Through Hole</option>
                        <option value="0.125">1/8" deep</option>
                        <option value="0.25">1/4" deep</option>
                        <option value="0.375">3/8" deep</option>
                        <option value="0.5">1/2" deep</option>
                        <option value="0.75">3/4" deep</option>
                        <option value="1.0">1" deep</option>
                        <option value="custom">Custom...</option>
                    </select>
                </div>
                <button id="drill-holes-btn" style="
                    width: 100%;
                    padding: 10px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                ">🔨 Drill ${this.holeMarkers.length} Holes</button>
            </div>
        `;
        
        document.body.appendChild(bitSelector);
        this.drillBitUI = bitSelector;
        
        // Add click handlers for bit selection
        bitSelector.querySelectorAll('.bit-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectDrillBit(parseFloat(option.dataset.size));
            });
        });
        
        // Add drill holes button handler
        bitSelector.querySelector('#drill-holes-btn').addEventListener('click', () => {
            this.drillAllHoles();
        });
        
        // Add depth selector handler
        bitSelector.querySelector('#depth-selector').addEventListener('change', (e) => {
            this.currentDepth = e.target.value;
        });
        
        // Add custom drill size handler
        bitSelector.querySelector('#use-custom-size').addEventListener('click', () => {
            const customInput = bitSelector.querySelector('#custom-drill-size');
            const customSize = parseFloat(customInput.value);
            
            if (customSize && customSize > 0) {
                this.selectDrillBit(customSize);
                customInput.style.border = '1px solid #666'; // Reset border
            } else {
                customInput.style.border = '2px solid red'; // Show error
                customInput.focus();
            }
        });
        
        // Add enter key handler for custom input
        bitSelector.querySelector('#custom-drill-size').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                bitSelector.querySelector('#use-custom-size').click();
            }
        });
    }
    
    /**
     * Select a drill bit size
     */
    selectDrillBit(size) {
        this.currentDrillSize = size;
        
        // Update UI to show selection for standard bits
        this.drillBitUI.querySelectorAll('.bit-option').forEach(option => {
            const isSelected = parseFloat(option.dataset.size) === size;
            option.style.border = `2px solid ${isSelected ? '#4CAF50' : 'transparent'}`;
            option.style.background = isSelected ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.1)';
        });
        
        // Check if this is a custom size (not in standard bits)
        const isCustomSize = !this.standardBits.find(bit => bit.size === size);
        if (isCustomSize) {
            // Clear standard bit selections for custom size
            this.drillBitUI.querySelectorAll('.bit-option').forEach(option => {
                option.style.border = '2px solid transparent';
                option.style.background = 'rgba(255,255,255,0.1)';
            });
            
        } else {
        }
        
        // Update existing markers to new size if any selected
        if (this.selectedMarker) {
            this.updateMarkerSize(this.selectedMarker, size);
        }
        
        // Force preview circle update on next mouse move
        if (this.previewCircle) {
            this.previewCircle.currentSize = null; // Force recreation
        }
    }
    
    /**
     * Create crosshair for precise positioning
     */
    createCrosshair() {
        // Crosshair will be created when surface is selected
        // as it needs to be positioned relative to the surface
    }
    
    /**
     * Update crosshair position and edge distance display
     */
    updateCrosshair(event) {
        if (!this.selectedSurface) return;
        
        // Get mouse position and project it onto the board surface
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Pick the board surface at mouse position
        const pickInfo = this.scene.pick(x, y, (mesh) => mesh === this.selectedBoard);
        
        if (pickInfo.hit) {
            // Create or update preview circle
            if (!this.previewCircle) {
                this.previewCircle = this.createDottedCircle(this.currentDrillSize, this.scene);
                this.previewCircle.name = 'drillPreviewCircle';
                // Make it slightly transparent and different color
                this.previewCircle.color = new BABYLON.Color3(1.0, 1.0, 0.0); // Yellow
                this.previewCircle.alpha = 0.7;
            }
            
            // Update preview circle size if drill size changed
            if (this.previewCircle.currentSize !== this.currentDrillSize) {
                this.previewCircle.dispose();
                this.previewCircle = this.createDottedCircle(this.currentDrillSize, this.scene);
                this.previewCircle.name = 'drillPreviewCircle';
                this.previewCircle.color = new BABYLON.Color3(1.0, 1.0, 0.0); // Yellow
                this.previewCircle.alpha = 0.7;
                this.previewCircle.currentSize = this.currentDrillSize;
            }
            
            // Position preview circle at mouse position
            this.previewCircle.position = pickInfo.pickedPoint.clone();
            this.previewCircle.isVisible = true;
            
            // Apply snapping to preview position
            if (!this.shiftPressed) {
                const snappedPosition = this.getSnappedPosition(pickInfo.pickedPoint.clone());
                this.previewCircle.position = snappedPosition;
            }
        } else {
            // Hide preview circle when not over board
            if (this.previewCircle) {
                this.previewCircle.isVisible = false;
            }
        }
    }
    
    /**
     * Place a hole marker at the specified location
     */
    placeHoleMarker(pickInfo) {
        const position = pickInfo.pickedPoint;
        
        // Check for snapping to existing markers (unless shift is pressed)
        let finalPosition = position;
        if (!this.shiftPressed) {
            finalPosition = this.getSnappedPosition(position);
        }
        
        // Create hole marker
        const marker = this.createHoleMarker(finalPosition, this.currentDrillSize, this.currentDepth);
        this.holeMarkers.push(marker);
        
        // Update drill holes button
        this.updateDrillButton();
        
    }
    
    /**
     * Create a dotted circle to preview hole size
     */
    createDottedCircle(diameter, scene) {
        const radius = diameter / 2; // Convert diameter to radius
        const segments = 32;
        const points = [];
        
        // Create dotted circle by making segments with gaps
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 0.7) / segments) * Math.PI * 2; // 0.7 creates the dashed effect
            
            // Add line segment
            points.push([
                new BABYLON.Vector3(Math.cos(angle1) * radius, 0, Math.sin(angle1) * radius),
                new BABYLON.Vector3(Math.cos(angle2) * radius, 0, Math.sin(angle2) * radius)
            ]);
        }
        
        // Create line system for dotted effect
        const dottedCircle = BABYLON.MeshBuilder.CreateLineSystem('dottedCircle', {
            lines: points
        }, scene);
        
        // Set color to white/light gray for visibility
        dottedCircle.color = new BABYLON.Color3(0.9, 0.9, 0.9);
        
        return dottedCircle;
    }
    
    /**
     * Create a visual hole marker
     */
    createHoleMarker(position, size, depth) {
        // Create "cool" looking drill bit marker
        const marker = new BABYLON.TransformNode('drillMarker_' + Date.now(), this.scene);
        marker.position = position;
        
        // Create dotted circle preview showing actual hole size
        const holeCircle = this.createDottedCircle(size, this.scene);
        holeCircle.parent = marker;
        
        // Center dot
        const centerDot = BABYLON.MeshBuilder.CreateSphere('centerDot', {
            diameter: 0.2
        }, this.scene);
        
        // Create material for center dot
        const dotMaterial = new BABYLON.StandardMaterial('dotMaterial', this.scene);
        dotMaterial.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.0); // Red center
        dotMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.0, 0.0);
        centerDot.material = dotMaterial;
        centerDot.parent = marker;
        
        // Drill bit representation (spiral lines)
        this.createDrillBitVisualization(marker, size);
        
        // Store marker properties
        marker.drillSize = size;
        marker.drillDepth = depth;
        marker.holeCircle = holeCircle;
        marker.centerDot = centerDot;
        
        return marker;
    }
    
    /**
     * Create cool drill bit visualization
     */
    createDrillBitVisualization(parent, size) {
        // Create spiral lines to represent drill bit flutes
        const radius = (size * 2.54) / 2; // Radius in cm
        const points = [];
        const spiralTurns = 3;
        const pointCount = 64;
        
        for (let i = 0; i <= pointCount; i++) {
            const t = i / pointCount;
            const angle = t * Math.PI * 2 * spiralTurns;
            const r = radius * (1 - t * 0.8); // Spiral inward
            
            points.push(new BABYLON.Vector3(
                Math.cos(angle) * r,
                -t * 0.5, // Downward spiral
                Math.sin(angle) * r
            ));
        }
        
        // Create lines for drill bit flutes
        const lines = BABYLON.MeshBuilder.CreateLines('drillFlutes', {
            points: points,
            updatable: false
        }, this.scene);
        
        lines.color = new BABYLON.Color3(0.8, 0.8, 0.2); // Gold color
        lines.parent = parent;
        
        // Create second flute (opposite spiral)
        const points2 = points.map(p => new BABYLON.Vector3(-p.x, p.y, -p.z));
        const lines2 = BABYLON.MeshBuilder.CreateLines('drillFlutes2', {
            points: points2,
            updatable: false
        }, this.scene);
        
        lines2.color = new BABYLON.Color3(0.8, 0.8, 0.2);
        lines2.parent = parent;
    }
    
    /**
     * Select a marker for editing/deletion
     */
    selectMarker(pickedMesh) {
        // Find which marker this mesh belongs to
        const marker = this.holeMarkers.find(m => 
            m.getChildMeshes().includes(pickedMesh) || m === pickedMesh.parent
        );
        
        if (!marker) return;
        
        // Deselect previous marker
        this.deselectMarker();
        
        // Select new marker
        this.selectedMarker = marker;
        
        // Visual indication of selection (brighten the marker)
        marker.getChildMeshes().forEach(mesh => {
            if (mesh.material) {
                mesh.material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.8); // Blue glow
            }
        });
        
    }
    
    /**
     * Deselect current marker
     */
    deselectMarker() {
        if (this.selectedMarker) {
            // Remove visual selection indication
            this.selectedMarker.getChildMeshes().forEach(mesh => {
                if (mesh.material) {
                    mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 0); // No glow
                }
            });
            this.selectedMarker = null;
        }
    }
    
    /**
     * Delete the currently selected marker
     */
    deleteSelectedMarker() {
        if (!this.selectedMarker) return;
        
        // Remove from markers array
        const index = this.holeMarkers.indexOf(this.selectedMarker);
        if (index > -1) {
            this.holeMarkers.splice(index, 1);
        }
        
        // Dispose the marker and its children
        this.selectedMarker.dispose();
        this.selectedMarker = null;
        
        // Update drill button
        this.updateDrillButton();
        
    }
    
    /**
     * Get snapped position if close to existing markers
     */
    getSnappedPosition(position, excludeMarker = null) {
        for (const marker of this.holeMarkers) {
            // Skip the marker being dragged
            if (marker === excludeMarker) continue;
            
            const distance = BABYLON.Vector3.Distance(position, marker.position);
            if (distance < this.snapDistance) {
                // Snap to existing marker's X or Z coordinate
                const deltaX = Math.abs(position.x - marker.position.x);
                const deltaZ = Math.abs(position.z - marker.position.z);
                
                if (deltaX < this.snapDistance) {
                    position.x = marker.position.x; // Snap to same X
                }
                if (deltaZ < this.snapDistance) {
                    position.z = marker.position.z; // Snap to same Z
                }
                break;
            }
        }
        return position;
    }
    
    /**
     * Update marker size
     */
    updateMarkerSize(marker, newSize) {
        marker.drillSize = newSize;
        
        // Update hole circle size
        const newDiameter = newSize * 2.54 * 2;
        marker.holeCircle.dispose();
        
        marker.holeCircle = BABYLON.MeshBuilder.CreateTorus('holeCircle', {
            diameter: newDiameter,
            thickness: 0.1,
            tessellation: 32
        }, this.scene);
        
        marker.holeCircle.material = marker.centerDot.material;
        marker.holeCircle.parent = marker;
    }
    
    /**
     * Update drill holes button text
     */
    updateDrillButton() {
        if (this.drillBitUI) {
            const btn = this.drillBitUI.querySelector('#drill-holes-btn');
            btn.textContent = `🔨 Drill ${this.holeMarkers.length} Holes`;
        }
    }
    
    /**
     * Create a cylinder for drilling holes
     */
    createHoleCylinder(position, diameter, depth) {
        // Get board dimensions to determine proper cylinder height
        const boardBounds = this.selectedBoard.getBoundingInfo();
        const boardHeight = boardBounds.maximum.y - boardBounds.minimum.y;
        
        let cylinderHeight;
        if (depth === 'through') {
            // Through hole - make cylinder taller than board
            cylinderHeight = boardHeight + 2;
        } else {
            // Partial depth hole
            cylinderHeight = parseFloat(depth);
        }
        
        // Create cylinder with proper radius (diameter / 2)
        const cylinder = BABYLON.MeshBuilder.CreateCylinder('drillHole', {
            diameter: diameter,
            height: cylinderHeight,
            tessellation: 32
        }, this.scene);
        
        // Position cylinder at marker location
        cylinder.position = position.clone();
        
        // For partial depth holes, adjust position so cylinder starts at surface
        if (depth !== 'through') {
            // Assuming Y is up - adjust based on surface normal
            cylinder.position.y = position.y - cylinderHeight / 2;
        }
        
        
        return cylinder;
    }
    
    /**
     * Drill all placed holes into the geometry
     */
    drillAllHoles() {
        if (this.holeMarkers.length === 0) {
            this.showInstructions('No holes to drill. Place some markers first.');
            return;
        }
        
        
        try {
            // Get the original board mesh
            const originalMesh = this.selectedBoard;
            if (!originalMesh || !originalMesh.partData) {
                throw new Error('No valid board selected for drilling');
            }
            
            // Clone the original mesh for CSG operations
            let currentMesh = originalMesh.clone(originalMesh.name + '_drilled');
            currentMesh.partData = { ...originalMesh.partData };
            currentMesh.isWorkBenchPart = true;
            
            // Drill each hole using CSG subtraction
            for (const marker of this.holeMarkers) {
                const holeSize = marker.drillSize || this.currentDrillSize;
                const holeDepth = marker.drillDepth || this.currentDepth;
                
                // Create cylinder for hole
                const holeCylinder = this.createHoleCylinder(marker.position, holeSize, holeDepth);
                
                // Perform CSG subtraction
                const newMesh = BABYLON.CSG.FromMesh(currentMesh).subtract(BABYLON.CSG.FromMesh(holeCylinder)).toMesh(
                    currentMesh.name,
                    currentMesh.material,
                    this.scene
                );
                
                // Copy properties
                newMesh.partData = currentMesh.partData;
                newMesh.isWorkBenchPart = true;
                newMesh.position = currentMesh.position.clone();
                
                // Clean up previous mesh
                if (currentMesh !== originalMesh) {
                    currentMesh.dispose();
                }
                holeCylinder.dispose();
                
                currentMesh = newMesh;
                
            }
            
            // Replace original mesh with drilled version
            originalMesh.dispose();
            
            // Update part data to reflect holes were drilled
            const drillSummary = this.holeMarkers.map(m => 
                `${m.drillSize || this.currentDrillSize}" ${m.drillDepth || this.currentDepth === 'through' ? 'through' : m.drillDepth + '" deep'}`
            ).join(', ');
            
            this.showInstructions(`Successfully drilled ${this.holeMarkers.length} holes: ${drillSummary}`);
            
            // Clear markers after drilling
            this.clearAllMarkers();
            
        } catch (error) {
            this.showInstructions('Error drilling holes. Please try again.');
        }
    }
    
    /**
     * Clear all hole markers
     */
    clearAllMarkers() {
        this.holeMarkers.forEach(marker => {
            marker.dispose();
        });
        this.holeMarkers = [];
        this.updateDrillButton();
    }
    
    /**
     * Create surface overlay for better visualization
     */
    createSurfaceOverlay(centerPoint) {
        // Create a subtle surface highlight
        const boardBounds = this.selectedBoard.getBoundingInfo();
        const boardSize = boardBounds.maximum.subtract(boardBounds.minimum);
        
        this.surfaceQuad = BABYLON.MeshBuilder.CreateGround('surfaceOverlay', {
            width: Math.max(boardSize.x, boardSize.z) * 1.1,
            height: Math.max(boardSize.x, boardSize.z) * 1.1
        }, this.scene);
        
        const overlayMaterial = new BABYLON.StandardMaterial('surfaceOverlay', this.scene);
        overlayMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1.0);
        overlayMaterial.alpha = 0.1;
        overlayMaterial.backFaceCulling = false;
        
        this.surfaceQuad.material = overlayMaterial;
        this.surfaceQuad.position = centerPoint;
        
        // Orient quad to match surface normal
        const up = new BABYLON.Vector3(0, 1, 0);
        const angle = Math.acos(BABYLON.Vector3.Dot(up, this.surfaceNormal));
        const axis = BABYLON.Vector3.Cross(up, this.surfaceNormal).normalize();
        this.surfaceQuad.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis, angle);
    }
    
    /**
     * Deactivate drill press tool
     */
    deactivate() {
        this.isActive = false;
        this.canvas.style.cursor = 'default';
        
        // Restore original camera state
        if (this.originalCameraState) {
            BABYLON.Animation.CreateAndStartAnimation('restoreCameraPosition', this.camera, 'position',
                60, 60, this.camera.position, this.originalCameraState.position, 
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                
            BABYLON.Animation.CreateAndStartAnimation('restoreCameraTarget', this.camera, 'target',
                60, 60, this.camera.target, this.originalCameraState.target,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        }
        
        // Clear visual elements
        this.clearAllMarkers();
        
        if (this.surfaceQuad) {
            this.surfaceQuad.dispose();
            this.surfaceQuad = null;
        }
        
        if (this.drillBitUI) {
            this.drillBitUI.remove();
            this.drillBitUI = null;
        }
        
        // Reset state
        this.selectedSurface = null;
        this.selectedBoard = null;
        this.surfaceNormal = null;
        this.originalCameraState = null;
        
    }
    
    /**
     * Show instruction message to user
     */
    showInstructions(message) {
        // Use the same instruction system as other tools
        if (this.drawingWorld.showInstructions) {
            this.drawingWorld.showInstructions(message);
        } else {
        }
    }
}