/**
 * RouterBitSystem Module - Professional Router Bit Edge Treatment System
 * 
 * Handles edge selection, router bit profile application, and real-time preview
 * for professional woodworking edge treatments including roundovers, chamfers,
 * ogees, and other common router bit profiles.
 * 
 * Features:
 * - Edge detection and selection system
 * - Real-time router bit profile preview
 * - Professional router bit library (roundover, chamfer, ogee, etc.)
 * - Visual feedback with color-coded edge highlighting
 * - Parametric profile generation for different bit sizes
 * - Material-aware feed rate calculations
 */

export class RouterBitSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        
        // Router system state
        this.isActive = false;
        this.selectedBitProfile = null;
        this.hoveredEdge = null;
        this.selectedEdges = [];
        this.previewActive = false;
        
        // Router bit library
        this.routerBitLibrary = null;
        this.currentBitSize = 0.25; // Default 1/4" radius
        
        // Custom imported router bits
        this.customRouterBits = new Map(); // Store imported 3D models
        this.importedBitCounter = 0;
        
        // Visual elements
        this.edgePreviewMaterial = null;
        this.selectedEdgeMaterial = null;
        this.profilePreviewMeshes = [];
        
        // Mouse tracking
        this.pointerObserver = null;
        this.lastMousePosition = null;
        
        // Edge detection
        this.edgeDetectionTolerance = 0.1; // 1mm tolerance for edge detection
        this.detectedEdges = [];
        this.focusPart = null; // Currently focused part for edge detection
        
        this.init();
    }
    
    init() {
        this.createRouterBitLibrary();
        this.setupEdgePreviewMaterials();
        
        // DEBUG: Create cutting tool components at origin for inspection
        // Debug objects removed - clean workspace
        
        // Test ogee bit removed - clean workspace
        
        // Setup 3D router bit importer
        this.setupRouterBitImporter();
        
        this.setupMouseTracking();
        this.setupRouterBitModal();
        
        // Load router bits from server
        try {
            this.loadRouterBitsFromServer();
        } catch (error) {
        }
    }
    
    /**
     * DEBUG: Create cutting tool components at origin for inspection
     */
    createDebugCuttingToolPreview() {
        
        const sizeInCm = 2.54; // 1 inch for visibility
        
        // Create cube - make it big, CSG will cut away what we don't need
        const cubeSize = sizeInCm; // Nice big cube
        const debugCube = BABYLON.BoxBuilder.CreateBox('debug_cube_origin', {
            width: cubeSize, height: cubeSize, depth: cubeSize
        }, this.scene);
        debugCube.position.set(0, 5, 0); // 5 units above origin
        
        const cubeMat = new BABYLON.StandardMaterial('debug_cube_mat', this.scene);
        cubeMat.diffuseColor = new BABYLON.Color3(1, 0, 0); // Red
        cubeMat.alpha = 0.7;
        debugCube.material = cubeMat;
        
        // Create cylinder with EXACT router bit radius (1/4" = 0.635cm radius)
        const bitRadiusInCm = 0.25 * 2.54; // 1/4" router bit radius in cm
        const debugCylinder = BABYLON.CylinderBuilder.CreateCylinder('debug_cylinder_origin', {
            height: sizeInCm * 3,        // Make it long
            diameter: bitRadiusInCm * 2, // Diameter = radius * 2, matches router bit exactly  
            tessellation: 32
        }, this.scene);
        // Position cylinder INSIDE cube, jammed into corner (restore correct position)
        const cylinderRadius = bitRadiusInCm;
        debugCylinder.position.set(
            cubeSize/2 - cylinderRadius,   // Cylinder edge touches right face from inside
            5 + cubeSize/2 - cylinderRadius, // Cylinder edge touches top face from inside
            cubeSize/2 - cylinderRadius    // Cylinder edge touches front face from inside
        );
        debugCylinder.rotation.x = Math.PI / 2; // Lay horizontal along Z axis
        
        const cylinderMat = new BABYLON.StandardMaterial('debug_cylinder_mat', this.scene);
        cylinderMat.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue
        cylinderMat.alpha = 0.7;
        debugCylinder.material = cylinderMat;
        
        // Create small marker at exact origin
        const originMarker = BABYLON.SphereBuilder.CreateSphere('origin_marker', {
            diameter: 0.5
        }, this.scene);
        originMarker.position.set(0, 0, 0);
        
        const markerMat = new BABYLON.StandardMaterial('origin_marker_mat', this.scene);
        markerMat.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        markerMat.emissiveColor = new BABYLON.Color3(0, 0.3, 0); // Green glow
        originMarker.material = markerMat;
        
        // Create the proper quarter-circle cutting tool - tiny corner piece only
        try {
            // Create a small corner cube, just a tiny bit bigger than cylinder radius
            const cornerSize = cylinderRadius * 1.1; // Just slightly bigger for proper 1/4 circle
            const cornerCube = BABYLON.BoxBuilder.CreateBox('corner_cube', {
                width: cornerSize, height: cornerSize, depth: cornerSize
            }, this.scene);
            
            // Position corner cube at the actual corner
            cornerCube.position.set(
                cubeSize/2 - cornerSize/2,     // At corner
                5 + cubeSize/2 - cornerSize/2, // At corner
                cubeSize/2 - cornerSize/2      // At corner
            );
            
            // CSG: Take the corner cube and subtract the cylinder from it
            const cornerCSG = BABYLON.CSG.FromMesh(cornerCube);
            const cylinderCSG = BABYLON.CSG.FromMesh(debugCylinder);
            const resultCSG = cornerCSG.subtract(cylinderCSG);
            
            const csgResult = resultCSG.toMesh('quarter_circle_tool', cornerCube.material, this.scene);
            csgResult.position.set(10, 5, 0); // Offset to the side
            
            const csgMat = new BABYLON.StandardMaterial('csg_result_mat', this.scene);
            csgMat.diffuseColor = new BABYLON.Color3(1, 0, 1); // Magenta
            csgMat.alpha = 0.9;
            csgResult.material = csgMat;
            
            // Clean up the temporary corner cube
            cornerCube.dispose();
            
        } catch (error) {
        }
        
    }
    
    /**
     * Create a test ogee bit with code
     */
    createTestOgeeBit() {
        
        // Create ogee profile using CSG (S-curve shape)
        const bitRadius = 0.635; // 1/4" bit radius in cm
        
        // Create base rectangular block
        const baseBlock = BABYLON.BoxBuilder.CreateBox('ogee_base', {
            width: bitRadius * 2,
            height: bitRadius * 2, 
            depth: bitRadius * 2
        }, this.scene);
        baseBlock.position.set(-10, 15, 0); // Position for visibility
        
        // Create upper convex curve (top part of S)
        const upperCyl = BABYLON.CylinderBuilder.CreateCylinder('upper_curve', {
            height: bitRadius * 3,
            diameter: bitRadius * 1.5,
            tessellation: 24
        }, this.scene);
        upperCyl.position.set(
            -10 + bitRadius/2,
            15 + bitRadius/4,
            0
        );
        upperCyl.rotation.x = Math.PI / 2;
        
        // Create lower concave curve (bottom part of S) 
        const lowerCyl = BABYLON.CylinderBuilder.CreateCylinder('lower_curve', {
            height: bitRadius * 3,
            diameter: bitRadius * 1.2,
            tessellation: 24
        }, this.scene);
        lowerCyl.position.set(
            -10 + bitRadius/2,
            15 - bitRadius/4,
            0
        );
        lowerCyl.rotation.x = Math.PI / 2;
        
        try {
            // CSG operations to create ogee profile
            const baseCSG = BABYLON.CSG.FromMesh(baseBlock);
            const upperCSG = BABYLON.CSG.FromMesh(upperCyl);
            const lowerCSG = BABYLON.CSG.FromMesh(lowerCyl);
            
            // Subtract upper curve, add lower curve to create S-profile
            let ogeeCSG = baseCSG.subtract(upperCSG);
            ogeeCSG = ogeeCSG.subtract(lowerCSG);
            
            const ogeeBit = ogeeCSG.toMesh('test_ogee_bit', baseBlock.material, this.scene);
            
            // Make it distinctive
            const ogeeMat = new BABYLON.StandardMaterial('ogee_material', this.scene);
            ogeeMat.diffuseColor = new BABYLON.Color3(0.8, 0.4, 0.1); // Orange
            ogeeMat.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.02);
            ogeeBit.material = ogeeMat;
            
            // Store as custom router bit
            this.customRouterBits.set('test_ogee', {
                id: 'test_ogee',
                name: 'Test Ogee (Code Generated)',
                fileName: 'generated_ogee.mesh',
                mesh: ogeeBit,
                imported: false,
                scale: ogeeBit.scaling.clone(),
                position: ogeeBit.position.clone(),
                rotation: ogeeBit.rotation.clone()
            });
            
            
        } catch (error) {
        }
        
        // Clean up temporary meshes
        baseBlock.dispose();
        upperCyl.dispose();
        lowerCyl.dispose();
    }
    
    /**
     * 3D Router Bit Import System
     */
    setupRouterBitImporter() {
        
        // Check available loaders (safely)
        const registeredPlugins = BABYLON.SceneLoader._registeredPlugins || {};
        
        // Force registration of loader plugins from babylonjs.loaders.min.js
        try {
            // Skip problematic loader registration for now - we use manual OBJ parsing anyway
        } catch (error) {
        }
        
        // Create file input for importing 3D models
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.glb,.gltf,.obj,.stl,.babylon,.step,.stp';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.id = 'router-bit-importer';
        
        fileInput.addEventListener('change', (event) => {
            this.handleRouterBitImport(event.target.files);
        });
        
        document.body.appendChild(fileInput);
        
        // Create drag-and-drop zone
        this.setupDragAndDrop();
        
        // Make debug function globally accessible
        window.debugRouterBits = () => this.debugFindImportedBits();
        
    }
    
    /**
     * Setup drag-and-drop for router bit files
     */
    setupDragAndDrop() {
        // Add drag-and-drop to the entire canvas
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.name.toLowerCase().match(/\.(glb|gltf|obj|stl|babylon)$/)
            );
            
            if (files.length > 0) {
                this.handleRouterBitImport(files);
            } else {
            }
        });
    }
    
    /**
     * Handle router bit file import
     */
    async handleRouterBitImport(files) {
        
        // Show loading indicator for ALL imports (they can be slow)
        const showProgress = true; // Always show progress for imports
        let progressNotification = null;
        
        if (showProgress) {
            progressNotification = this.showImportProgress(files.length);
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (showProgress) {
                this.updateImportProgress(progressNotification, i + 1, files.length, file.name);
            }
            
            try {
                await this.importRouterBit(file);
                successCount++;
                
                if (!showProgress) {
                    // Show individual success notification for single small files
                    this.showNotification('success', 'Router Bit Imported', `"${file.name}" imported successfully`);
                }
                
            } catch (error) {
                failCount++;
                
                if (!showProgress) {
                    // Show individual error for single files
                    this.showNotification('error', 'Import Failed', `Failed to import "${file.name}": ${error.message}`);
                }
            }
        }
        
        // Hide progress and show final summary
        if (showProgress) {
            this.hideImportProgress(progressNotification);
            
            if (successCount > 0 && failCount === 0) {
                this.showNotification('success', 'Import Complete', `Successfully imported ${successCount} router bit${successCount > 1 ? 's' : ''}`);
            } else if (successCount > 0 && failCount > 0) {
                this.showNotification('warning', 'Import Completed', `${successCount} imported, ${failCount} failed`);
            } else if (failCount > 0) {
                this.showNotification('error', 'Import Failed', `Failed to import ${failCount} router bit${failCount > 1 ? 's' : ''}`);
            }
        }
    }
    
    /**
     * Debug function to find and report all imported router bits
     */
    debugFindImportedBits() {
        
        // Check custom router bits collection
        this.customRouterBits.forEach((bit, id) => {
            if (bit.mesh) {
            }
        });
        
        // Search all meshes in scene for imported objects
        const importedMeshes = this.scene.meshes.filter(mesh => 
            mesh.name.includes('imported_') || 
            mesh.name.includes('debug_marker_')
        );
        
        importedMeshes.forEach(mesh => {
                position: mesh.position,
                scaling: mesh.scaling,
                visible: mesh.isVisible,
                material: mesh.material?.name
            });
        });
        
        // Force camera to look at import area
        if (this.scene.activeCamera) {
            this.scene.activeCamera.setTarget(new BABYLON.Vector3(0, 15, 0));
            
            // If it's an arc rotate camera, set proper position
            if (this.scene.activeCamera.setPosition) {
                this.scene.activeCamera.setPosition(new BABYLON.Vector3(30, 25, 30));
            }
        }
    }
    
    /**
     * Generate 2D profile icon from 3D router bit mesh
     */
    generateProfileIcon(routerBitMesh) {
        try {
            // Create a small canvas for the icon
            const iconCanvas = document.createElement('canvas');
            iconCanvas.width = 32;
            iconCanvas.height = 32;
            const ctx = iconCanvas.getContext('2d');
            
            // Create temporary engine and scene for icon rendering
            const iconEngine = new BABYLON.Engine(iconCanvas, true, { preserveDrawingBuffer: true });
            const iconScene = new BABYLON.Scene(iconEngine);
            iconScene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparent background
            
            // Clone the router bit mesh for icon rendering
            const iconMesh = routerBitMesh.clone('icon_mesh');
            iconMesh.parent = null;
            iconMesh.position.set(0, 0, 0);
            iconMesh.scaling.setAll(1); // Reset scaling for consistent icon size
            
            // Create camera positioned for side profile view
            const iconCamera = new BABYLON.ArcRotateCamera('iconCamera', Math.PI/2, Math.PI/2, 10, BABYLON.Vector3.Zero(), iconScene);
            iconCamera.setTarget(BABYLON.Vector3.Zero());
            
            // Create simple material for clean silhouette
            const iconMaterial = new BABYLON.StandardMaterial('iconMat', iconScene);
            iconMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Black silhouette
            iconMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Slight glow for visibility
            iconMesh.material = iconMaterial;
            
            // Add light
            const iconLight = new BABYLON.HemisphericLight('iconLight', new BABYLON.Vector3(0, 1, 0), iconScene);
            iconLight.intensity = 1;
            
            // Auto-fit the mesh in view
            const bounds = iconMesh.getBoundingInfo();
            const size = bounds.maximum.subtract(bounds.minimum);
            const maxDimension = Math.max(size.x, size.y, size.z);
            iconCamera.radius = maxDimension * 2;
            
            // Render the icon
            iconEngine.runRenderLoop(() => {
                iconScene.render();
            });
            
            // Wait a frame then capture the image
            setTimeout(() => {
                const imageData = iconCanvas.toDataURL('image/png');
                
                // Clean up temporary objects
                iconMesh.dispose();
                iconScene.dispose();
                iconEngine.dispose();
                
            }, 100);
            
            // Return a temporary icon while the real one generates
            return `<img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='20' height='20' fill='%23666'/></svg>" style="width: 20px; height: 20px;">`;
            
        } catch (error) {
            // Fallback to generic icon
            return '🔧';
        }
    }
    
    /**
     * Save imported router bits to localStorage for persistence
     */
    saveRouterBitsToStorage() {
        try {
            const routerBitsData = [];
            this.customRouterBits.forEach((bit, id) => {
                // We can't store the mesh directly, so we'll store metadata
                routerBitsData.push({
                    id: id,
                    name: bit.name,
                    fileName: bit.fileName,
                    // Note: Mesh will need to be re-imported on load
                });
            });
            
            localStorage.setItem('cutlist_router_bits', JSON.stringify(routerBitsData));
        } catch (error) {
        }
    }
    
    /**
     * Load persisted router bits from localStorage
     */
    loadPersistedRouterBits() {
        try {
            const savedData = localStorage.getItem('cutlist_router_bits');
            if (savedData) {
                const routerBitsData = JSON.parse(savedData);
                
                // Note: We can only restore metadata - user will need to re-import actual files
                // This serves as a reminder of what router bits they had
                if (routerBitsData.length > 0) {
                    routerBitsData.forEach(bit => {
                    });
                }
            }
        } catch (error) {
        }
    }
    
    /**
     * Save router bit mesh as JSON to server
     */
    async saveRouterBitMeshToServer(bitName, bitId, fileName, mesh) {
        try {
            
            // Serialize mesh to JSON
            const meshData = {
                id: bitId,
                name: bitName,
                fileName: fileName,
                positions: Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)),
                indices: Array.from(mesh.getIndices()),
                normals: Array.from(mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)),
                timestamp: Date.now()
            };
            
            // Save to localStorage instead of server
            const existingBits = localStorage.getItem('cutlist_router_bits');
            const routerBits = existingBits ? JSON.parse(existingBits) : {};
            
            // Add new router bit
            routerBits[bitName] = {
                name: bitName,
                id: bitId,
                fileName: fileName,
                meshData: meshData,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            // Save back to localStorage
            localStorage.setItem('cutlist_router_bits', JSON.stringify(routerBits));
            
        } catch (error) {
            this.showNotification('warning', 'Save Failed', 'Router bit not saved (will need re-import)');
        }
    }
    
    /**
     * Load all router bits from server JSON on startup
     */
    async loadRouterBitsFromServer() {
        try {
            
            // Use localStorage instead of server requests
            const storedBits = localStorage.getItem('cutlist_router_bits');
            if (!storedBits) {
                return;
            }
            
            const routerBitsData = JSON.parse(storedBits);
            
            // Recreate each mesh from JSON data
            let loadedCount = 0;
            for (const [bitName, bitData] of Object.entries(routerBitsData)) {
                if (this.recreateMeshFromJSON(bitData)) {
                    loadedCount++;
                }
            }
            
            // Refresh UI to show loaded bits
            this.refreshRouterBitUI();
            
            if (loadedCount > 0) {
            }
            
        } catch (error) {
        }
    }
    
    /**
     * Recreate mesh from JSON data
     */
    recreateMeshFromJSON(bitData) {
        try {
            
            // Create new mesh
            const mesh = new BABYLON.Mesh(bitData.id, this.scene);
            const vertexData = new BABYLON.VertexData();
            
            // Get mesh data from the correct nested structure
            const meshData = bitData.meshData || bitData;
            
            // Restore geometry data
            vertexData.positions = meshData.positions;
            vertexData.indices = meshData.indices;
            vertexData.normals = meshData.normals;
            
            // Apply to mesh
            vertexData.applyToMesh(mesh);
            
            if (mesh.getTotalVertices() === 0) {
                return false;
            }
            
            // Position and style
            mesh.position.set(0, 15, 0);
            mesh.scaling.setAll(5000); // Display scaling (was 2540)
            
            // Create material
            const material = new BABYLON.StandardMaterial(`imported_bit_${bitData.id}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.8);
            material.specularColor = new BABYLON.Color3(0.9, 0.9, 1.0);
            material.roughness = 0.3;
            mesh.material = material;
            
            // Store in collection
            this.customRouterBits.set(bitData.id, {
                id: bitData.id,
                name: bitData.name,
                fileName: bitData.fileName,
                mesh: mesh,
                imported: true,
                serverLoaded: true
            });
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Show size selector for imported router bits
     */
    showImportedBitSizeSelector(importedBit) {
        const sizeSelector = document.getElementById('router-bit-size');
        if (sizeSelector) {
            // For imported bits, offer scaling options instead of fixed sizes
            sizeSelector.innerHTML = `
                <option value="0.5">50% Scale</option>
                <option value="1" selected>Original Scale (100%)</option>
                <option value="1.5">150% Scale</option>
                <option value="2">200% Scale</option>
                <option value="3">300% Scale</option>
            `;
        }
    }
    
    /**
     * Refresh router bit UI to include imported bits
     */
    refreshRouterBitUI() {
        // Update any existing router bit selection panels
        this.showRouterBitsInPropertiesPanel();
        
        // Update any modal dialogs
        const routerOptionsContainer = document.getElementById('router-options-container');
        if (routerOptionsContainer) {
            routerOptionsContainer.innerHTML = this.generateRouterBitOptions();
        }
    }
    
    /**
     * Show notification using the global notification system
     */
    showNotification(type, title, message) {
        if (typeof NotificationSystem !== 'undefined') {
            NotificationSystem[type](title, message);
        } else if (typeof window.NotificationSystem !== 'undefined') {
            window.NotificationSystem[type](title, message);
        } else {
            // Fallback to console
        }
    }
    
    /**
     * Show import progress indicator
     */
    showImportProgress(totalFiles) {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'import-progress-backdrop';
        backdrop.id = 'router-bit-import-backdrop';
        
        // Create progress container
        const progressContainer = document.createElement('div');
        progressContainer.id = 'router-bit-import-progress';
        progressContainer.className = 'import-progress-container';
        progressContainer.innerHTML = `
            <div class="import-progress-content">
                <div class="import-progress-icon">🔧</div>
                <div class="import-progress-text">
                    <div class="import-progress-title">Importing Router Bits...</div>
                    <div class="import-progress-status">Processing 0 of ${totalFiles} files</div>
                    <div class="import-progress-file">Preparing...</div>
                </div>
                <div class="import-progress-spinner"></div>
            </div>
            <div class="import-progress-bar">
                <div class="import-progress-fill" style="width: 0%"></div>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        document.body.appendChild(progressContainer);
        
        // Add minimal CSS if not already present
        if (!document.getElementById('import-progress-styles')) {
            const style = document.createElement('style');
            style.id = 'import-progress-styles';
            style.textContent = `
                .import-progress-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.6);
                    z-index: 19999;
                }
                .import-progress-container {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    background: white;
                    border: 2px solid #007bff;
                    border-radius: 8px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    z-index: 20000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .import-progress-content {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                }
                .import-progress-icon {
                    font-size: 24px;
                    margin-right: 12px;
                }
                .import-progress-text {
                    flex: 1;
                }
                .import-progress-title {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 4px;
                }
                .import-progress-status {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 2px;
                }
                .import-progress-file {
                    font-size: 12px;
                    color: #888;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .import-progress-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #f3f3f3;
                    border-top: 2px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .import-progress-bar {
                    height: 3px;
                    background: #f3f3f3;
                    border-bottom-left-radius: 4px;
                    border-bottom-right-radius: 4px;
                    overflow: hidden;
                }
                .import-progress-fill {
                    height: 100%;
                    background: #007bff;
                    transition: width 0.3s ease;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return { container: progressContainer, backdrop: backdrop };
    }
    
    /**
     * Update import progress
     */
    updateImportProgress(progressData, current, total, fileName) {
        if (!progressData || !progressData.container) return;
        
        const percentage = Math.round((current / total) * 100);
        const statusEl = progressData.container.querySelector('.import-progress-status');
        const fileEl = progressData.container.querySelector('.import-progress-file');
        const fillEl = progressData.container.querySelector('.import-progress-fill');
        
        if (statusEl) statusEl.textContent = `Processing ${current} of ${total} files`;
        if (fileEl) fileEl.textContent = fileName;
        if (fillEl) fillEl.style.width = `${percentage}%`;
    }
    
    /**
     * Hide import progress indicator
     */
    hideImportProgress(progressData) {
        if (progressData) {
            // Remove backdrop
            if (progressData.backdrop && progressData.backdrop.parentNode) {
                progressData.backdrop.parentNode.removeChild(progressData.backdrop);
            }
            
            // Remove container
            if (progressData.container && progressData.container.parentNode) {
                progressData.container.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (progressData.container.parentNode) {
                        progressData.container.parentNode.removeChild(progressData.container);
                    }
                }, 300);
            }
        }
    }
    
    /**
     * Analyze file header to determine format characteristics
     */
    async readFileHeader(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const bytes = new Uint8Array(arrayBuffer.slice(0, 100)); // Read first 100 bytes
                const header = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                
                const analysis = {
                    size: file.size,
                    headerText: header.substring(0, 50),
                    isBinary: this.detectBinaryContent(bytes),
                    possibleFormat: this.detectFormatFromHeader(header, bytes)
                };
                
                resolve(analysis);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file.slice(0, 100));
        });
    }
    
    /**
     * Detect if file content is binary
     */
    detectBinaryContent(bytes) {
        // Check for null bytes or high percentage of non-printable characters
        let nonPrintableCount = 0;
        for (let i = 0; i < Math.min(bytes.length, 100); i++) {
            if (bytes[i] === 0 || (bytes[i] < 32 && bytes[i] !== 9 && bytes[i] !== 10 && bytes[i] !== 13)) {
                nonPrintableCount++;
            }
        }
        return nonPrintableCount > bytes.length * 0.1; // More than 10% non-printable
    }
    
    /**
     * Read file as text content
     */
    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
    
    /**
     * Create mesh from OBJ content using manual parsing
     */
    async createMeshFromOBJ(objContent, fileName) {
        
        const lines = objContent.split('\n');
        const vertices = [];
        const faces = [];
        
        // Parse OBJ format
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            
            if (parts[0] === 'v' && parts.length >= 4) {
                // Vertex: v x y z [r g b]
                vertices.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                );
            } else if (parts[0] === 'f' && parts.length >= 4) {
                // Face: f v1 v2 v3 or f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
                // Handle triangular faces only for now
                if (parts.length >= 4) {
                    // Convert quad to triangles or handle triangle
                    const indices = [];
                    for (let i = 1; i < parts.length; i++) {
                        const vertexIndex = parseInt(parts[i].split('/')[0]) - 1; // OBJ uses 1-based indexing
                        if (!isNaN(vertexIndex) && vertexIndex >= 0) {
                            indices.push(vertexIndex);
                        }
                    }
                    
                    // Add triangle faces
                    if (indices.length >= 3) {
                        faces.push(indices[0], indices[1], indices[2]);
                        
                        // If quad, add second triangle
                        if (indices.length === 4) {
                            faces.push(indices[0], indices[2], indices[3]);
                        }
                    }
                }
            }
        }
        
        
        if (vertices.length === 0) {
            throw new Error('No vertices found in OBJ file');
        }
        
        // Create Babylon.js mesh
        const mesh = new BABYLON.Mesh(`imported_${fileName}`, this.scene);
        const vertexData = new BABYLON.VertexData();
        
        vertexData.positions = vertices;
        vertexData.indices = faces;
        
        // Initialize and calculate normals
        const normals = [];
        BABYLON.VertexData.ComputeNormals(vertices, faces, normals);
        vertexData.normals = normals;
        
        // Apply vertex data to mesh
        vertexData.applyToMesh(mesh);
        
        
        return { meshes: [mesh] };
    }
    
    /**
     * Try importing OBJ with AssetsManager (fallback method)
     */
    async importOBJWithAssetsManager(fileURL, fileName) {
        // This method could be implemented but for now just throw to move to next method
        throw new Error('AssetsManager approach not implemented yet');
    }
    
    /**
     * Try to detect format from file header
     */
    detectFormatFromHeader(headerText, bytes) {
        const text = headerText.toLowerCase();
        
        // GLB binary format starts with 'glTF' magic number
        if (bytes[0] === 0x67 && bytes[1] === 0x6C && bytes[2] === 0x54 && bytes[3] === 0x46) {
            return 'GLB (binary GLTF)';
        }
        
        // GLTF text format starts with JSON
        if (text.trim().startsWith('{') && text.includes('"asset"')) {
            return 'GLTF (JSON)';
        }
        
        // OBJ format characteristics
        if (text.includes('# ') || text.includes('v ') || text.includes('f ') || text.includes('vn ')) {
            return 'OBJ (text)';
        }
        
        // STL ASCII format
        if (text.includes('solid ') && text.includes('facet normal')) {
            return 'STL (ASCII)';
        }
        
        // STL binary format (80-byte header + 4-byte triangle count)
        if (bytes.length >= 84 && !text.includes('solid ')) {
            return 'STL (binary)';
        }
        
        return 'Unknown';
    }
    
    /**
     * Import individual router bit 3D model
     */
    async importRouterBit(file) {
        const fileName = file.name;
        const fileExtension = fileName.toLowerCase().split('.').pop();
        
        
        // Check if we support this format
        const supportedFormats = ['glb', 'gltf', 'obj', 'stl', 'babylon', 'step', 'stp'];
        if (!supportedFormats.includes(fileExtension)) {
            throw new Error(`Unsupported file format: ${fileExtension}. Supported formats: ${supportedFormats.join(', ')}`);
        }
        
        // Create object URL for the file with proper extension handling
        const fileURL = URL.createObjectURL(file);
        
        // Create a fake URL with proper extension for Babylon.js to recognize the format
        const fakeBaseURL = `https://temp/${fileName}`;
        
        try {
            let importResult;
            
            // Check if file appears to be binary or text
            const fileHeader = await this.readFileHeader(file);
            
            // Import based on file type with enhanced error handling
            switch (fileExtension) {
                case 'glb':
                    importResult = await BABYLON.SceneLoader.ImportMeshAsync("", "", fileURL, this.scene);
                    break;
                    
                case 'gltf':
                    importResult = await BABYLON.SceneLoader.ImportMeshAsync("", "", fileURL, this.scene);
                    break;
                    
                case 'obj':
                    const registeredPlugins = BABYLON.SceneLoader._registeredPlugins || {};
                    
                    // Try multiple OBJ import approaches with proper URL handling
                    try {
                        // Method 1: Use fake base URL with proper extension
                        importResult = await BABYLON.SceneLoader.ImportMeshAsync("", fakeBaseURL, fileURL, this.scene);
                    } catch (method1Error) {
                        
                        try {
                            // Method 2: Use root path with filename
                            importResult = await BABYLON.SceneLoader.ImportMeshAsync("", "/", fileURL, this.scene, null, null, null, `.${fileExtension}`);
                        } catch (method2Error) {
                            
                            // Method 3: Use empty strings with explicit extension
                            try {
                                importResult = await BABYLON.SceneLoader.ImportMeshAsync(null, "", fileURL, this.scene, null, null, null, `.${fileExtension}`);
                            } catch (method3Error) {
                                
                                // Method 4: Use AssetsManager approach
                                try {
                                    importResult = await this.importOBJWithAssetsManager(fileURL, fileName);
                                } catch (method4Error) {
                                    
                                    // Method 5: Simple manual OBJ parsing
                                    try {
                                        const objContent = await this.readFileAsText(file);
                                        importResult = await this.createMeshFromOBJ(objContent, fileName);
                                    } catch (method5Error) {
                                        throw new Error('All OBJ import methods failed including manual parsing: ' + method5Error.message);
                                    }
                                }
                            }
                        }
                    }
                    break;
                    
                case 'stl':
                    const stlPlugins = BABYLON.SceneLoader._registeredPlugins || {};
                    
                    // Skip the check since we know STL loader is available from console logs  
                    // STL files can be ASCII or binary - let Babylon.js handle detection
                    importResult = await BABYLON.SceneLoader.ImportMeshAsync("", "", fileURL, this.scene);
                    break;
                    
                case 'babylon':
                    importResult = await BABYLON.SceneLoader.ImportMeshAsync("", "", fileURL, this.scene);
                    break;
                    
                case 'step':
                case 'stp':
                    throw new Error('STEP files are not yet supported by Babylon.js. Please export as GLTF, OBJ, or STL format.');
                    
                default:
                    throw new Error(`Unsupported file format: ${fileExtension}`);
            }
            
            
            // Process the imported mesh
            const meshes = importResult.meshes;
            if (meshes.length === 0) {
                throw new Error('No meshes found in file');
            }
            
            // Get the main mesh (combine if multiple)
            let routerBitMesh;
            if (meshes.length === 1) {
                routerBitMesh = meshes[0];
            } else {
                // Merge multiple meshes into one
                routerBitMesh = BABYLON.Mesh.MergeMeshes(meshes.filter(m => m instanceof BABYLON.Mesh));
                if (!routerBitMesh) {
                    routerBitMesh = meshes[0]; // Fallback to first mesh
                }
            }
            
            // Validate and process the router bit
            await this.validateAndProcessRouterBit(routerBitMesh, fileName);
            
            
        } finally {
            // Clean up object URL
            URL.revokeObjectURL(fileURL);
        }
    }
    
    /**
     * Validate and process imported router bit
     */
    async validateAndProcessRouterBit(mesh, fileName) {
        // Generate unique ID for this router bit
        this.importedBitCounter++;
        const bitId = `imported_${this.importedBitCounter}`;
        const bitName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
        
        // Position the router bit for inspection (visible but out of the way)
        mesh.position.set(0, 15, 0); // 15 units above origin
        
        // Scale appropriately for visibility while maintaining proportions
        const scaleMultiplier = 5000; // More reasonable scaling (1mm becomes 5m)
        mesh.scaling.setAll(scaleMultiplier);
        
        // Professional router bit material (steel-like)
        const importedMaterial = new BABYLON.StandardMaterial(`imported_bit_${bitId}`, this.scene);
        importedMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.8); // Steel gray
        importedMaterial.specularColor = new BABYLON.Color3(0.9, 0.9, 1.0); // Metallic shine
        importedMaterial.roughness = 0.3; // Somewhat polished
        importedMaterial.alpha = 1.0;
        mesh.material = importedMaterial;
        
        // Store in custom router bits collection
        this.customRouterBits.set(bitId, {
            id: bitId,
            name: bitName,
            fileName: fileName,
            mesh: mesh,
            imported: true,
            scale: mesh.scaling.clone(),
            position: mesh.position.clone(),
            rotation: mesh.rotation.clone()
        });
        
        // Log router bit info
        const boundingInfo = mesh.getBoundingInfo();
        const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
        
        
        // Show success message
        this.showImportSuccess(bitName, bitId);
        
        // Refresh UI to show the new imported router bit
        this.refreshRouterBitUI();
        
        // Save router bit mesh as JSON to server
        this.saveRouterBitMeshToServer(bitName, bitId, fileName, mesh);
    }
    
    /**
     * Show import success message
     */
    showImportSuccess(bitName, bitId) {
    }
    
    /**
     * List all imported router bits
     */
    listImportedRouterBits() {
        for (const [id, bit] of this.customRouterBits) {
        }
        return Array.from(this.customRouterBits.values());
    }
    
    /**
     * Create the router bit profile library
     */
    createRouterBitLibrary() {
        this.routerBitLibrary = {
            roundover: {
                name: 'Roundover',
                description: 'Creates a smooth rounded edge',
                icon: '⌒',
                generateProfile: (radius) => this.generateRoundoverProfile(radius),
                defaultSizes: [0.125, 0.25, 0.375, 0.5, 0.75]
            },
            chamfer: {
                name: 'Chamfer',
                description: 'Creates a 45-degree beveled edge',
                icon: '⟋',
                generateProfile: (size) => this.generateChamferProfile(size),
                defaultSizes: [0.125, 0.25, 0.375, 0.5, 0.75]
            },
            cove: {
                name: 'Cove',
                description: 'Creates a concave rounded edge',
                icon: '⌓',
                generateProfile: (radius) => this.generateCoveProfile(radius),
                defaultSizes: [0.125, 0.25, 0.375, 0.5, 0.75]
            },
            rabbeting: {
                name: 'Rabbeting',
                description: 'Creates a stepped edge for joinery',
                icon: '⅃',
                generateProfile: (depth, width) => this.generateRabbetProfile(depth, width),
                defaultSizes: [0.25, 0.375, 0.5, 0.75]
            },
            ogee: {
                name: 'Ogee',
                description: 'Classical S-shaped decorative profile',
                icon: '∼',
                generateProfile: (size) => this.generateOgeeProfile(size),
                defaultSizes: [0.25, 0.375, 0.5, 0.75, 1.0]
            },
            beading: {
                name: 'Beading',
                description: 'Creates a decorative bead profile',
                icon: '◉',
                generateProfile: (size) => this.generateBeadingProfile(size),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            roman_ogee: {
                name: 'Roman Ogee',
                description: 'Complex classical profile with cove and bead',
                icon: '⟡',
                generateProfile: (size) => this.generateRomanOgeeProfile(size),
                defaultSizes: [0.25, 0.375, 0.5, 0.75]
            },
            thumbnail: {
                name: 'Thumbnail',
                description: 'Small quarter-round with flat section',
                icon: '◗',
                generateProfile: (size) => this.generateThumbnailProfile(size),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            bullnose: {
                name: 'Bullnose',
                description: 'Half-round edge profile',
                icon: '◐',
                generateProfile: (radius) => this.generateBullnoseProfile(radius),
                defaultSizes: [0.25, 0.375, 0.5, 0.75, 1.0]
            },
            fillet: {
                name: 'Fillet',
                description: 'Quarter-round inside corner',
                icon: '◜',
                generateProfile: (radius) => this.generateFilletProfile(radius),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            v_groove: {
                name: 'V-Groove',
                description: 'Sharp V-shaped decorative groove',
                icon: '⋁',
                generateProfile: (size) => this.generateVGrooveProfile(size),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            edge_bead: {
                name: 'Edge Bead',
                description: 'Rounded bead on edge with fillets',
                icon: '◎',
                generateProfile: (size) => this.generateEdgeBeadProfile(size),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            table_edge: {
                name: 'Table Edge',
                description: 'Elegant table edge with multiple curves',
                icon: '⌐',
                generateProfile: (size) => this.generateTableEdgeProfile(size),
                defaultSizes: [0.375, 0.5, 0.75, 1.0]
            },
            classical: {
                name: 'Classical',
                description: 'Traditional architectural molding profile',
                icon: '⟐',
                generateProfile: (size) => this.generateClassicalProfile(size),
                defaultSizes: [0.5, 0.75, 1.0, 1.25]
            },
            triple_bead: {
                name: 'Triple Bead',
                description: 'Three parallel decorative beads',
                icon: '⚬',
                generateProfile: (size) => this.generateTripleBeadProfile(size),
                defaultSizes: [0.375, 0.5, 0.75]
            },
            wavy_edge: {
                name: 'Wavy Edge',
                description: 'Flowing wave pattern edge',
                icon: '〰',
                generateProfile: (size) => this.generateWavyEdgeProfile(size),
                defaultSizes: [0.25, 0.375, 0.5]
            },
            dovetail: {
                name: 'Dovetail',
                description: 'Angled profile for dovetail joints',
                icon: '⟣',
                generateProfile: (size, angle) => this.generateDovetailProfile(size, angle || 14),
                defaultSizes: [0.25, 0.375, 0.5, 0.75]
            },
            keyhole: {
                name: 'Keyhole',
                description: 'T-slot profile for hanging hardware',
                icon: '⊤',
                generateProfile: (size) => this.generateKeyholeProfile(size),
                defaultSizes: [0.25, 0.375, 0.5]
            },
            flush_trim: {
                name: 'Flush Trim',
                description: 'Pattern trimming with bearing guide',
                icon: '⫽',
                generateProfile: (diameter) => this.generateFlushTrimProfile(diameter),
                defaultSizes: [0.25, 0.375, 0.5, 0.75]
            },
            corner_round: {
                name: 'Corner Round',
                description: 'Inside corner rounding bit',
                icon: '◝',
                generateProfile: (radius) => this.generateCornerRoundProfile(radius),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            panel_pilot: {
                name: 'Panel Pilot',
                description: 'Raised panel cutting profile',
                icon: '⌊',
                generateProfile: (size) => this.generatePanelPilotProfile(size),
                defaultSizes: [0.5, 0.75, 1.0, 1.25]
            },
            stile_rail: {
                name: 'Stile & Rail',
                description: 'Door frame joinery profile',
                icon: '⫸',
                generateProfile: (size) => this.generateStileRailProfile(size),
                defaultSizes: [0.5, 0.75, 1.0]
            },
            finger_joint: {
                name: 'Finger Joint',
                description: 'Box joint cutting profile',
                icon: '⨅',
                generateProfile: (size) => this.generateFingerJointProfile(size),
                defaultSizes: [0.25, 0.375, 0.5]
            },
            slot_cutter: {
                name: 'Slot Cutter',
                description: 'Precise groove cutting',
                icon: '⫟',
                generateProfile: (width, depth) => this.generateSlotCutterProfile(width, depth),
                defaultSizes: [0.125, 0.25, 0.375, 0.5]
            },
            spiral_upcut: {
                name: 'Spiral Upcut',
                description: 'Chip evacuation spiral cutting',
                icon: '⟲',
                generateProfile: (diameter) => this.generateSpiralUpcutProfile(diameter),
                defaultSizes: [0.125, 0.25, 0.375, 0.5, 0.75]
            },
            spiral_downcut: {
                name: 'Spiral Downcut',
                description: 'Clean top edge spiral cutting',
                icon: '⟳',
                generateProfile: (diameter) => this.generateSpiralDowncutProfile(diameter),
                defaultSizes: [0.125, 0.25, 0.375, 0.5, 0.75]
            },
            compression: {
                name: 'Compression',
                description: 'Clean cut on both faces',
                icon: '⇈',
                generateProfile: (diameter) => this.generateCompressionProfile(diameter),
                defaultSizes: [0.25, 0.375, 0.5, 0.75]
            },
            bowl_bit: {
                name: 'Bowl Bit',
                description: 'Large radius bowl carving',
                icon: '⫸',
                generateProfile: (radius) => this.generateBowlBitProfile(radius),
                defaultSizes: [0.5, 0.75, 1.0, 1.5, 2.0]
            },
            mortise: {
                name: 'Mortise',
                description: 'Square hole mortise cutting',
                icon: '⬛',
                generateProfile: (width, depth) => this.generateMortiseProfile(width, depth),
                defaultSizes: [0.25, 0.375, 0.5, 0.75]
            },
            hinge_mortise: {
                name: 'Hinge Mortise',
                description: 'Precise hinge pocket cutting',
                icon: '⫯',
                generateProfile: (size) => this.generateHingeMortiseProfile(size),
                defaultSizes: [0.5, 0.75, 1.0]
            },
            lock_mortise: {
                name: 'Lock Mortise',
                description: 'Door lock hardware mortise',
                icon: '🔒',
                generateProfile: (size) => this.generateLockMortiseProfile(size),
                defaultSizes: [0.75, 1.0, 1.25]
            },
            inlay: {
                name: 'Inlay',
                description: 'Precision inlay groove cutting',
                icon: '⬜',
                generateProfile: (width, depth) => this.generateInlayProfile(width, depth),
                defaultSizes: [0.0625, 0.125, 0.1875, 0.25]
            },
            sign_making: {
                name: 'Sign Making',
                description: 'V-carving for lettering',
                icon: '∇',
                generateProfile: (angle) => this.generateSignMakingProfile(angle || 60),
                defaultSizes: [30, 45, 60, 90]
            },
            core_box: {
                name: 'Core Box',
                description: 'Semicircular groove cutting',
                icon: '⌒',
                generateProfile: (radius) => this.generateCoreBoxProfile(radius),
                defaultSizes: [0.125, 0.25, 0.375, 0.5, 0.75]
            },
            point_cut: {
                name: 'Point Cut',
                description: 'Sharp pointed profile cutting',
                icon: '▼',
                generateProfile: (angle) => this.generatePointCutProfile(angle || 90),
                defaultSizes: [60, 90, 120]
            }
        };
        
    }
    
    /**
     * Setup visual materials for edge preview
     */
    setupEdgePreviewMaterials() {
        // Hover edge material (bright cyan/turquoise tube)
        this.edgePreviewMaterial = new BABYLON.StandardMaterial('edgePreview', this.scene);
        this.edgePreviewMaterial.diffuseColor = new BABYLON.Color3(0, 1, 1); // Bright cyan
        this.edgePreviewMaterial.emissiveColor = new BABYLON.Color3(0, 0.8, 0.8); // Bright emissive cyan
        this.edgePreviewMaterial.specularColor = new BABYLON.Color3(0, 0, 0); // No specular
        this.edgePreviewMaterial.alpha = 0.9;
        this.edgePreviewMaterial.disableLighting = true;
        this.edgePreviewMaterial.backFaceCulling = false;
        
        // Selected edge material (bright green tube)
        this.selectedEdgeMaterial = new BABYLON.StandardMaterial('selectedEdge', this.scene);
        this.selectedEdgeMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0.2); // Bright green
        this.selectedEdgeMaterial.emissiveColor = new BABYLON.Color3(0, 0.8, 0.1); // Bright emissive green
        this.selectedEdgeMaterial.specularColor = new BABYLON.Color3(0, 0, 0); // No specular
        this.selectedEdgeMaterial.alpha = 1.0;
        this.selectedEdgeMaterial.disableLighting = true;
        this.selectedEdgeMaterial.backFaceCulling = false;
        
    }
    
    /**
     * Setup mouse tracking for edge detection
     */
    setupMouseTracking() {
        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isActive) return;
            
            if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.handleEdgeHover(pointerInfo);
            } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.event.button === 0) { // Left click
                    this.handleEdgeSelection(pointerInfo);
                }
            }
        });
        
    }
    
    /**
     * Handle edge hover detection
     */
    handleEdgeHover(pointerInfo) {
        const pickInfo = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY,
            (mesh) => this.isRoutablePart(mesh)
        );
        
        if (pickInfo.hit && pickInfo.pickedMesh) {
            const edge = this.detectEdgeFromPick(pickInfo);
            
            if (edge && edge !== this.hoveredEdge) {
                this.clearEdgeHover();
                this.hoveredEdge = edge;
                this.showEdgePreview(edge);
            }
        } else {
            this.clearEdgeHover();
        }
    }
    
    /**
     * Handle edge selection
     */
    handleEdgeSelection(pointerInfo) {
        if (this.hoveredEdge) {
            if (this.selectedEdges.includes(this.hoveredEdge)) {
                // Deselect edge
                this.deselectEdge(this.hoveredEdge);
            } else {
                // Select edge
                this.selectEdge(this.hoveredEdge);
            }
        } else {
            // If no edge is hovered but we clicked on a part, set it as focus part
            const pickInfo = this.scene.pick(
                this.scene.pointerX,
                this.scene.pointerY,
                (mesh) => mesh && (mesh.isWorkBenchPart || mesh.isProjectPart)
            );
            
            if (pickInfo.hit && pickInfo.pickedMesh && !this.focusPart) {
                this.setFocusPart(pickInfo.pickedMesh);
            }
        }
    }
    
    /**
     * Detect edge from pick information
     */
    detectEdgeFromPick(pickInfo) {
        const mesh = pickInfo.pickedMesh;
        const pickPoint = pickInfo.pickedPoint;
        
        // Get mesh bounds
        const bounds = mesh.getBoundingInfo();
        const size = bounds.maximum.subtract(bounds.minimum);
        const center = mesh.position;
        
        // Calculate distances to edges based on pick point relative to mesh center
        const relativePoint = pickPoint.subtract(center);
        const edgeTolerance = 3.0; // Tighter tolerance for precise edge detection
        
        
        // Calculate distances to each face
        const distToTop = Math.abs(relativePoint.y - size.y / 2);
        const distToBottom = Math.abs(relativePoint.y + size.y / 2);
        const distToRight = Math.abs(relativePoint.x - size.x / 2);
        const distToLeft = Math.abs(relativePoint.x + size.x / 2);
        const distToFront = Math.abs(relativePoint.z - size.z / 2);
        const distToBack = Math.abs(relativePoint.z + size.z / 2);
        
        // Find which face we're closest to
        const minDistance = Math.min(distToTop, distToBottom, distToRight, distToLeft, distToFront, distToBack);
        
        if (minDistance > edgeTolerance) {
            return null;
        }
        
        let edgeType = 'unknown';
        let edgeDirection = 'unknown';
        let specificSide = 'unknown';
        
        // Determine which specific edge based on the closest face and position
        if (minDistance === distToTop) {
            // Top face - determine which specific edge
            
            // Check if we're near the X edges (front/back edges of top face)
            if (Math.abs(relativePoint.z - size.z / 2) < edgeTolerance) {
                edgeType = 'top_front_edge';
                specificSide = 'front';
                edgeDirection = size.x > size.z ? 'long_edge' : 'short_edge';
            } else if (Math.abs(relativePoint.z + size.z / 2) < edgeTolerance) {
                edgeType = 'top_back_edge';
                specificSide = 'back';
                edgeDirection = size.x > size.z ? 'long_edge' : 'short_edge';
            }
            // Check if we're near the Z edges (left/right edges of top face)
            else if (Math.abs(relativePoint.x - size.x / 2) < edgeTolerance) {
                edgeType = 'top_right_edge';
                specificSide = 'right';
                edgeDirection = size.z > size.x ? 'long_edge' : 'short_edge';
            } else if (Math.abs(relativePoint.x + size.x / 2) < edgeTolerance) {
                edgeType = 'top_left_edge';
                specificSide = 'left';
                edgeDirection = size.z > size.x ? 'long_edge' : 'short_edge';
            }
        }
        else if (minDistance === distToRight) {
            edgeType = 'right_edge';
            specificSide = 'right';
            edgeDirection = size.z > size.x ? 'long_edge' : 'short_edge';
        }
        else if (minDistance === distToLeft) {
            edgeType = 'left_edge';
            specificSide = 'left';
            edgeDirection = size.z > size.x ? 'long_edge' : 'short_edge';
        }
        else if (minDistance === distToFront) {
            edgeType = 'front_edge';
            specificSide = 'front';
            edgeDirection = size.x > size.z ? 'long_edge' : 'short_edge';
        }
        else if (minDistance === distToBack) {
            edgeType = 'back_edge';
            specificSide = 'back';
            edgeDirection = size.x > size.z ? 'long_edge' : 'short_edge';
        }
        
        if (edgeType !== 'unknown') {
            const edge = {
                type: edgeType,
                direction: edgeDirection,
                specificSide: specificSide,
                mesh: mesh,
                pickPoint: pickPoint,
                center: center,
                size: size,
                relativePoint: relativePoint,
                id: `edge_${mesh.uniqueId}_${Date.now()}_${specificSide}`
            };
            
            return edge;
        }
        
        return null;
    }
    
    /**
     * Generate list of edges for a rectangular lumber piece
     */
    generateEdgeList(min, max, mesh) {
        const edges = [];
        
        // Top edges (Y = max.y)
        edges.push({
            type: 'top_front',
            start: new BABYLON.Vector3(min.x, max.y, max.z),
            end: new BABYLON.Vector3(max.x, max.y, max.z),
            normal: new BABYLON.Vector3(0, 1, 0),
            mesh: mesh
        });
        
        edges.push({
            type: 'top_back',
            start: new BABYLON.Vector3(min.x, max.y, min.z),
            end: new BABYLON.Vector3(max.x, max.y, min.z),
            normal: new BABYLON.Vector3(0, 1, 0),
            mesh: mesh
        });
        
        edges.push({
            type: 'top_left',
            start: new BABYLON.Vector3(min.x, max.y, min.z),
            end: new BABYLON.Vector3(min.x, max.y, max.z),
            normal: new BABYLON.Vector3(0, 1, 0),
            mesh: mesh
        });
        
        edges.push({
            type: 'top_right',
            start: new BABYLON.Vector3(max.x, max.y, min.z),
            end: new BABYLON.Vector3(max.x, max.y, max.z),
            normal: new BABYLON.Vector3(0, 1, 0),
            mesh: mesh
        });
        
        // Add bottom, front, back, left, right edges...
        // (Additional edges would be added here for complete edge detection)
        
        return edges;
    }
    
    /**
     * Calculate distance from point to edge
     */
    distanceToEdge(point, edge) {
        const edgeVector = edge.end.subtract(edge.start);
        const pointVector = point.subtract(edge.start);
        
        const edgeLength = edgeVector.length();
        const projection = BABYLON.Vector3.Dot(pointVector, edgeVector) / edgeLength;
        
        // Clamp projection to edge bounds
        const clampedProjection = Math.max(0, Math.min(edgeLength, projection));
        const closestPoint = edge.start.add(edgeVector.normalize().scale(clampedProjection));
        
        return BABYLON.Vector3.Distance(point, closestPoint);
    }
    
    /**
     * Show edge preview highlight
     */
    showEdgePreview(edge) {
        // Create a thin line to show the SPECIFIC edge being previewed
        const mesh = edge.mesh;
        const meshSize = edge.size;
        const meshCenter = edge.center;
        
        // Create edge line based on specific edge type
        let edgeLine = null;
        
        if (edge.type === 'top_front_edge') {
            // Front edge of top face (along X axis) - create thick tube
            const startPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const path = [startPoint, endPoint];
            edgeLine = BABYLON.MeshBuilder.CreateTube('edgePreview', {
                path: path,
                radius: 0.6,  // Double the width for better visibility
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else if (edge.type === 'top_back_edge') {
            // Back edge of top face (along X axis) - create thick tube
            const startPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const path = [startPoint, endPoint];
            edgeLine = BABYLON.MeshBuilder.CreateTube('edgePreview', {
                path: path,
                radius: 0.6,  // Double the width for better visibility
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else if (edge.type === 'top_left_edge') {
            // Left edge of top face (along Z axis) - create thick tube
            const startPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const path = [startPoint, endPoint];
            edgeLine = BABYLON.MeshBuilder.CreateTube('edgePreview', {
                path: path,
                radius: 0.6,  // Double the width for better visibility
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else if (edge.type === 'top_right_edge') {
            // Right edge of top face (along Z axis) - create thick tube
            const startPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const path = [startPoint, endPoint];
            edgeLine = BABYLON.MeshBuilder.CreateTube('edgePreview', {
                path: path,
                radius: 0.6,  // Double the width for better visibility
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else {
            return; // Don't show anything for unknown edge types
        }
        
        if (edgeLine) {
            edgeLine.material = this.edgePreviewMaterial; // Use yellow material
            edgeLine.isPickable = false;
            edgeLine.renderingGroupId = 1; // Render on top
            
            // Store reference for cleanup
            this.currentEdgePreview = edgeLine;
            
        }
    }
    
    /**
     * Clear edge hover preview
     */
    clearEdgeHover() {
        if (this.currentEdgePreview) {
            this.currentEdgePreview.dispose();
            this.currentEdgePreview = null;
        }
        this.hoveredEdge = null;
    }
    
    /**
     * Select an edge for router bit application
     */
    selectEdge(edge) {
        this.selectedEdges.push(edge);
        
        // Show persistent selection highlight
        this.showEdgeSelection(edge);
        
        // Update UI to show selection count
        this.updateSelectionUI();
        
        // Show router bit library in properties panel
        this.showRouterBitsInPropertiesPanel();
    }
    
    /**
     * Deselect an edge
     */
    deselectEdge(edge) {
        const index = this.selectedEdges.indexOf(edge);
        if (index > -1) {
            this.selectedEdges.splice(index, 1);
            
            // Remove selection highlight
            if (edge.selectionHighlight) {
                edge.selectionHighlight.dispose();
                edge.selectionHighlight = null;
            }
            
            // Update UI
            this.updateSelectionUI();
            
            // Update properties panel
            if (this.selectedEdges.length > 0) {
                this.showRouterBitsInPropertiesPanel();
            } else {
                // Clear router bit library from properties panel if no edges selected
                const selectionInfo = document.getElementById('selection-info');
                if (selectionInfo) {
                    selectionInfo.innerHTML = '<strong>Router Tool:</strong><br>Click edges to select them for routing';
                }
            }
        }
    }
    
    /**
     * Show persistent edge selection highlight
     */
    showEdgeSelection(edge) {
        // Create the SAME precise edge line as preview, but in orange
        const mesh = edge.mesh;
        const meshSize = edge.size;
        const meshCenter = edge.center;
        
        let selectionLine = null;
        
        if (edge.type === 'top_front_edge') {
            const startPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const path = [startPoint, endPoint];
            selectionLine = BABYLON.MeshBuilder.CreateTube('edgeSelection', {
                path: path,
                radius: 0.4, // Thicker than preview
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else if (edge.type === 'top_back_edge') {
            const startPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const path = [startPoint, endPoint];
            selectionLine = BABYLON.MeshBuilder.CreateTube('edgeSelection', {
                path: path,
                radius: 0.4,
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else if (edge.type === 'top_left_edge') {
            const startPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x - meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const path = [startPoint, endPoint];
            selectionLine = BABYLON.MeshBuilder.CreateTube('edgeSelection', {
                path: path,
                radius: 0.4,
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        else if (edge.type === 'top_right_edge') {
            const startPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z - meshSize.z/2);
            const endPoint = new BABYLON.Vector3(meshCenter.x + meshSize.x/2, meshCenter.y + meshSize.y/2, meshCenter.z + meshSize.z/2);
            const path = [startPoint, endPoint];
            selectionLine = BABYLON.MeshBuilder.CreateTube('edgeSelection', {
                path: path,
                radius: 0.4,
                tessellation: 8,
                cap: BABYLON.Mesh.CAP_ALL
            }, this.scene);
        }
        
        if (selectionLine) {
            selectionLine.material = this.selectedEdgeMaterial; // Use orange material
            selectionLine.isPickable = false;
            selectionLine.renderingGroupId = 1; // Render on top
            
            // Store for cleanup
            edge.selectionHighlight = selectionLine;
            
        }
    }
    
    /**
     * Update UI to show current selection
     */
    updateSelectionUI() {
        const selectionInfo = document.getElementById('selection-info');
        if (selectionInfo && this.isActive) {
            if (this.selectedEdges.length > 0) {
                // Show details about selected edges
                const edgeDetails = this.selectedEdges.map(edge => {
                    const edgeDesc = edge.direction === 'long_edge' ? 'long edge' : 'short edge';
                    return edgeDesc;
                }).join(', ');
                selectionInfo.textContent = `Router tool - ${this.selectedEdges.length} edge(s) selected (${edgeDetails}). Press R to choose router bit.`;
            } else if (this.focusPart) {
                const partName = this.focusPart.partData?.materialName || 'board';
                selectionInfo.textContent = `Router tool - Click edges of ${partName} to select them, then press R`;
            } else {
                selectionInfo.textContent = 'Router tool active - Select a board first, then click its edges';
            }
        }
    }
    
    /**
     * Set the focus part for edge detection
     */
    setFocusPart(mesh) {
        this.focusPart = mesh;
        
        // Update UI
        this.updateSelectionUI();
    }
    
    /**
     * Clear the focus part
     */
    clearFocusPart() {
        this.focusPart = null;
    }
    
    /**
     * Check if mesh is a routable part
     */
    isRoutablePart(mesh) {
        // If we have a focus part, only allow that part
        if (this.focusPart) {
            return mesh === this.focusPart;
        }
        
        // Otherwise, allow any work bench or project part
        return mesh && (mesh.isWorkBenchPart || mesh.isProjectPart);
    }
    
    // ==================== ROUTER BIT PROFILE GENERATORS ====================
    
    /**
     * Generate roundover profile points
     */
    generateRoundoverProfile(radius) {
        const points = [];
        const steps = 16;
        
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * (Math.PI / 2);
            const x = radius * (1 - Math.cos(angle));
            const y = radius * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate chamfer profile points
     */
    generateChamferProfile(size) {
        // 45-degree chamfer cut from corner
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(size, 0, 0),
            new BABYLON.Vector3(0, size, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate ogee profile points
     */
    generateOgeeProfile(size) {
        const points = [];
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // S-curve using sine wave
            const x = size * t;
            const y = size * 0.5 * (1 + Math.sin(Math.PI * (t - 0.5)));
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate cove profile points
     */
    generateCoveProfile(radius) {
        const points = [];
        const steps = 16;
        
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * (Math.PI / 2);
            const x = radius * Math.sin(angle);
            const y = radius * (1 - Math.cos(angle));
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate beading profile points
     */
    generateBeadingProfile(size) {
        const points = [];
        const steps = 24;
        
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI;
            const x = size * 0.5 * (1 - Math.cos(angle));
            const y = size * 0.5 * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate rabbet profile points
     */
    generateRabbetProfile(depth, width) {
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(width, 0, 0),
            new BABYLON.Vector3(width, depth, 0),
            new BABYLON.Vector3(0, depth, 0)
        ];
    }
    
    /**
     * Generate roman ogee profile points
     */
    generateRomanOgeeProfile(size) {
        const points = [];
        const steps = 24;
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Complex S-curve with cove and bead elements
            const x = size * t;
            const y = size * 0.6 * (Math.sin(Math.PI * t * 2) * 0.3 + Math.sin(Math.PI * t) * 0.7);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate thumbnail profile points
     */
    generateThumbnailProfile(size) {
        const points = [];
        const steps = 12;
        
        // Quarter round with flat section
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * (Math.PI / 4); // Quarter circle
            const x = size * 0.7 * Math.sin(angle);
            const y = size * 0.7 * (1 - Math.cos(angle));
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        // Add flat section
        points.push(new BABYLON.Vector3(size, size * 0.3, 0));
        
        return points;
    }
    
    /**
     * Generate bullnose profile points
     */
    generateBullnoseProfile(radius) {
        const points = [];
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI; // Half circle
            const x = radius * Math.sin(angle);
            const y = radius * (1 - Math.cos(angle));
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate fillet profile points
     */
    generateFilletProfile(radius) {
        const points = [];
        const steps = 12;
        
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * (Math.PI / 2);
            const x = radius * (1 - Math.cos(angle));
            const y = radius * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate V-groove profile points
     */
    generateVGrooveProfile(size) {
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(size, size * 0.5, 0),
            new BABYLON.Vector3(size * 2, 0, 0)
        ];
    }
    
    /**
     * Generate edge bead profile points
     */
    generateEdgeBeadProfile(size) {
        const points = [];
        const steps = 16;
        
        // Create bead with fillets
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI;
            const x = size * 0.3 + size * 0.4 * Math.sin(angle);
            const y = size * 0.5 * (1 + Math.cos(angle));
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate table edge profile points
     */
    generateTableEdgeProfile(size) {
        const points = [];
        const steps = 32;
        
        // Complex elegant curve for table edges
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = size * t;
            const y = size * 0.8 * (
                Math.sin(Math.PI * t * 0.5) * 0.4 +
                Math.sin(Math.PI * t * 2) * 0.2 +
                t * 0.4
            );
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate classical profile points
     */
    generateClassicalProfile(size) {
        const points = [];
        const steps = 16;
        
        // Classical edge molding - ogee-like with stepped detail
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = size * t;
            // S-curve with step detail
            const s_curve = 0.5 * (1 + Math.sin(Math.PI * (t - 0.5)));
            const y = size * 0.6 * s_curve;
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate triple bead profile points
     */
    generateTripleBeadProfile(size) {
        const points = [];
        const steps = 24;
        
        // Three small beads on the edge corner
        const beadRadius = size / 6; // Small beads
        
        // First bead (corner)
        for (let i = 0; i <= steps / 3; i++) {
            const angle = (i / (steps / 3)) * (Math.PI / 2);
            const x = beadRadius * (1 - Math.cos(angle));
            const y = beadRadius * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        // Small step
        points.push(new BABYLON.Vector3(size * 0.3, beadRadius, 0));
        
        // Second bead
        for (let i = 0; i <= steps / 3; i++) {
            const angle = Math.PI - (i / (steps / 3)) * (Math.PI / 2);
            const x = size * 0.3 + beadRadius * Math.cos(angle);
            const y = beadRadius + beadRadius * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate wavy edge profile points
     */
    generateWavyEdgeProfile(size) {
        const points = [];
        const steps = 20;
        
        // Simple wavy edge treatment from corner
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = size * t;
            const y = size * 0.3 * Math.sin(Math.PI * t * 3) * (1 - t * 0.5); // Waves that diminish
            points.push(new BABYLON.Vector3(x, Math.abs(y), 0));
        }
        
        return points;
    }
    
    /**
     * Generate dovetail profile points
     */
    generateDovetailProfile(size, angle = 14) {
        const angleRad = (angle * Math.PI) / 180;
        const slope = Math.tan(angleRad);
        
        // Simple angled edge treatment (like a chamfer with dovetail angle)
        const depth = size * 0.7;
        const width = depth * slope;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(width, 0, 0),
            new BABYLON.Vector3(0, depth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate keyhole profile points
     */
    generateKeyholeProfile(size) {
        // For edge treatment, create a small keyhole slot near the edge
        const slotDepth = size * 0.6;
        const slotWidth = size * 0.4;
        const headWidth = size * 0.8;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(slotWidth, 0, 0),
            new BABYLON.Vector3(slotWidth, slotDepth * 0.6, 0),
            new BABYLON.Vector3(headWidth, slotDepth * 0.6, 0),
            new BABYLON.Vector3(headWidth, slotDepth, 0),
            new BABYLON.Vector3(0, slotDepth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate flush trim profile points
     */
    generateFlushTrimProfile(diameter) {
        const points = [];
        const radius = diameter / 2;
        const steps = 16;
        
        // Simple straight cutting edge
        for (let i = 0; i <= steps; i++) {
            const y = (i / steps) * radius;
            points.push(new BABYLON.Vector3(0, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate corner round profile points
     */
    generateCornerRoundProfile(radius) {
        const points = [];
        const steps = 16;
        
        // Quarter circle for inside corners
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * (Math.PI / 2);
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate panel pilot profile points
     */
    generatePanelPilotProfile(size) {
        const points = [];
        const bevelHeight = size * 0.7;
        const flatWidth = size * 0.3;
        
        // Raised panel cutting profile
        points.push(new BABYLON.Vector3(0, 0, 0));
        points.push(new BABYLON.Vector3(flatWidth, 0, 0));
        points.push(new BABYLON.Vector3(size, bevelHeight, 0));
        
        return points;
    }
    
    /**
     * Generate stile and rail profile points
     */
    generateStileRailProfile(size) {
        const points = [];
        const stepHeight = size / 3;
        
        // Door frame joinery profile
        points.push(new BABYLON.Vector3(0, 0, 0));
        points.push(new BABYLON.Vector3(size * 0.3, 0, 0));
        points.push(new BABYLON.Vector3(size * 0.3, stepHeight, 0));
        points.push(new BABYLON.Vector3(size * 0.7, stepHeight, 0));
        points.push(new BABYLON.Vector3(size * 0.7, stepHeight * 2, 0));
        points.push(new BABYLON.Vector3(size, stepHeight * 2, 0));
        points.push(new BABYLON.Vector3(size, size, 0));
        
        return points;
    }
    
    /**
     * Generate finger joint profile points
     */
    generateFingerJointProfile(size) {
        const points = [];
        const fingerWidth = size;
        const fingerHeight = size;
        
        // Box joint cutting profile
        points.push(new BABYLON.Vector3(0, 0, 0));
        points.push(new BABYLON.Vector3(fingerWidth, 0, 0));
        points.push(new BABYLON.Vector3(fingerWidth, fingerHeight, 0));
        points.push(new BABYLON.Vector3(0, fingerHeight, 0));
        points.push(new BABYLON.Vector3(0, 0, 0));
        
        return points;
    }
    
    /**
     * Generate slot cutter profile points
     */
    generateSlotCutterProfile(width, depth) {
        // Edge slot - small groove along the edge
        const slotDepth = (depth || width) * 0.5;
        const slotWidth = width * 0.6;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(slotWidth, 0, 0),
            new BABYLON.Vector3(slotWidth, slotDepth, 0),
            new BABYLON.Vector3(0, slotDepth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate spiral upcut profile points
     */
    generateSpiralUpcutProfile(diameter) {
        // Spiral bits for edge work create clean straight cuts
        const depth = diameter * 0.8;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(diameter * 0.6, 0, 0),
            new BABYLON.Vector3(diameter * 0.6, depth, 0),
            new BABYLON.Vector3(0, depth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate spiral downcut profile points
     */
    generateSpiralDowncutProfile(diameter) {
        // Spiral downcut for clean edge cuts
        const depth = diameter * 0.8;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(diameter * 0.6, 0, 0),
            new BABYLON.Vector3(diameter * 0.6, depth, 0),
            new BABYLON.Vector3(0, depth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate compression profile points
     */
    generateCompressionProfile(diameter) {
        // Compression bit for clean edge cuts on both faces
        const depth = diameter * 0.8;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(diameter * 0.6, 0, 0),
            new BABYLON.Vector3(diameter * 0.6, depth, 0),
            new BABYLON.Vector3(0, depth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate bowl bit profile points
     */
    generateBowlBitProfile(radius) {
        const points = [];
        const steps = 20;
        
        // Large radius bowl carving profile
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI;
            const x = radius * Math.sin(angle);
            const y = radius * (1 - Math.cos(angle));
            points.push(new BABYLON.Vector3(x, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate mortise profile points
     */
    generateMortiseProfile(width, depth) {
        // Edge mortise - small rectangular pocket on edge
        const mortiseDepth = (depth || width) * 0.4;
        const mortiseWidth = width * 0.7;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(mortiseWidth, 0, 0),
            new BABYLON.Vector3(mortiseWidth, mortiseDepth, 0),
            new BABYLON.Vector3(0, mortiseDepth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate hinge mortise profile points
     */
    generateHingeMortiseProfile(size) {
        const points = [];
        const hingeWidth = size;
        const hingeDepth = size * 0.1; // Shallow depth for hinge
        const cornerRadius = size * 0.05;
        
        // Rounded corner rectangle for hinge pocket
        points.push(new BABYLON.Vector3(cornerRadius, 0, 0));
        points.push(new BABYLON.Vector3(hingeWidth - cornerRadius, 0, 0));
        points.push(new BABYLON.Vector3(hingeWidth, cornerRadius, 0));
        points.push(new BABYLON.Vector3(hingeWidth, hingeDepth - cornerRadius, 0));
        points.push(new BABYLON.Vector3(hingeWidth - cornerRadius, hingeDepth, 0));
        points.push(new BABYLON.Vector3(cornerRadius, hingeDepth, 0));
        points.push(new BABYLON.Vector3(0, hingeDepth - cornerRadius, 0));
        points.push(new BABYLON.Vector3(0, cornerRadius, 0));
        points.push(new BABYLON.Vector3(cornerRadius, 0, 0));
        
        return points;
    }
    
    /**
     * Generate lock mortise profile points
     */
    generateLockMortiseProfile(size) {
        const points = [];
        const lockWidth = size;
        const lockDepth = size * 0.75;
        
        // Deep rectangular mortise for lock hardware
        points.push(new BABYLON.Vector3(0, 0, 0));
        points.push(new BABYLON.Vector3(lockWidth, 0, 0));
        points.push(new BABYLON.Vector3(lockWidth, lockDepth, 0));
        points.push(new BABYLON.Vector3(0, lockDepth, 0));
        points.push(new BABYLON.Vector3(0, 0, 0));
        
        return points;
    }
    
    /**
     * Generate inlay profile points
     */
    generateInlayProfile(width, depth) {
        const inlayDepth = depth || width * 0.5;
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(width, 0, 0),
            new BABYLON.Vector3(width, inlayDepth, 0),
            new BABYLON.Vector3(0, inlayDepth, 0),
            new BABYLON.Vector3(0, 0, 0)
        ];
    }
    
    /**
     * Generate sign making profile points
     */
    generateSignMakingProfile(angle = 60) {
        const angleRad = (angle * Math.PI) / 180;
        const depth = 0.125; // 1/8" deep V-carving
        const width = depth * 2 * Math.tan(angleRad / 2);
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(width / 2, depth, 0),
            new BABYLON.Vector3(width, 0, 0)
        ];
    }
    
    /**
     * Generate core box profile points
     */
    generateCoreBoxProfile(radius) {
        const points = [];
        const steps = 16;
        
        // Semicircular groove
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * Math.PI;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            points.push(new BABYLON.Vector3(x + radius, y, 0));
        }
        
        return points;
    }
    
    /**
     * Generate point cut profile points
     */
    generatePointCutProfile(angle = 90) {
        const angleRad = (angle * Math.PI) / 180;
        const depth = 0.25;
        const width = depth * 2 * Math.tan(angleRad / 2);
        
        return [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(width / 2, depth, 0),
            new BABYLON.Vector3(width, 0, 0)
        ];
    }
    
    // ==================== ROUTER BIT MODAL ====================
    
    /**
     * Setup the router bit selection modal
     */
    setupRouterBitModal() {
        // Get modal elements
        this.routerBitModal = document.getElementById('router-bit-modal');
        this.routerBitGrid = document.getElementById('router-bit-grid');
        this.bitSizeSelector = document.getElementById('bit-size-selector');
        this.selectedBitName = document.getElementById('selected-bit-name');
        this.sizeButtons = document.getElementById('size-buttons');
        
        // Setup modal event listeners
        const closeButton = document.getElementById('close-router-bit-modal');
        const cancelButton = document.getElementById('cancel-router-bit');
        const applyButton = document.getElementById('apply-router-bit');
        
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hideRouterBitModal());
        }
        
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.showRouterBitGrid());
        }
        
        if (applyButton) {
            applyButton.addEventListener('click', () => this.applySelectedBit());
        }
        
        // Close modal when clicking outside
        this.routerBitModal?.addEventListener('click', (e) => {
            if (e.target === this.routerBitModal) {
                this.hideRouterBitModal();
            }
        });
        
        // Populate router bit grid
        this.populateRouterBitGrid();
        
    }

    /**
     * Show router bit library in properties panel
     */
    showRouterBitsInPropertiesPanel() {
        const selectionInfo = document.getElementById('selection-info');
        if (!selectionInfo) return;

        const edgeCount = this.selectedEdges.length;
        if (edgeCount === 0) return;

        // Create router bit selection UI in properties panel
        const routerBitHTML = `
            <strong>Router Tool:</strong><br>
            ${edgeCount} edge${edgeCount > 1 ? 's' : ''} selected<br>
            <br>
            <div style="background: rgba(52, 152, 219, 0.1); padding: 10px; border-radius: 5px; margin-top: 10px;">
                <strong>Router Bit Library:</strong><br>
                <div style="max-height: 200px; overflow-y: auto; margin: 8px 0;">
                    ${this.generateRouterBitOptions()}
                </div>
                <div style="margin-top: 10px;">
                    <strong>Bit Size:</strong><br>
                    <select id="router-bit-size" style="width: 100%; margin: 4px 0;">
                        <option value="0.125">1/8" (0.125")</option>
                        <option value="0.25" selected>1/4" (0.25")</option>
                        <option value="0.375">3/8" (0.375")</option>
                        <option value="0.5">1/2" (0.5")</option>
                        <option value="0.75">3/4" (0.75")</option>
                    </select>
                </div>
                <button onclick="window.drawingWorld.routerBitSystem.applySelectedBitFromPanel()" 
                        style="width: 100%; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 4px; margin-top: 8px;">
                    Apply Router Bit to ${edgeCount} Edge${edgeCount > 1 ? 's' : ''}
                </button>
            </div>
        `;

        selectionInfo.innerHTML = routerBitHTML;

        // Add event listener for bit size changes
        const sizeSelector = document.getElementById('router-bit-size');
        if (sizeSelector) {
            sizeSelector.addEventListener('change', (e) => {
                this.currentBitSize = parseFloat(e.target.value);
            });
        }
    }

    /**
     * Generate HTML for router bit options
     */
    generateRouterBitOptions() {
        // No more dependency on routerBitLibrary - all bits are imported now

        // All router bits are now imported - no built-in library
        const bitTypes = [];

        // Add imported router bits with auto-generated profile icons
        const importedBits = [];
        this.customRouterBits.forEach((bit, id) => {
            const profileIcon = this.generateProfileIcon(bit.mesh);
            importedBits.push({
                key: id,
                label: bit.name, // Remove "(Imported)" - all bits are imported now
                icon: profileIcon,
                imported: true
            });
        });
        

        // All bits are now imported with auto-generated profile icons
        const allBits = importedBits;

        return allBits.map(bit => {
            const isSelected = this.selectedBitProfile === bit.key;
            const selectedStyle = isSelected ? 'rgba(52,152,219,0.8)' : 'rgba(255,255,255,0.1)';  // Blue instead of green
            const selectedHover = isSelected ? 'rgba(52,152,219,0.9)' : 'rgba(52,152,219,0.3)';
            
            return `
            <div id="routerbit-${bit.key}" 
                 class="router-bit-button" 
                 style="display: flex; align-items: center; padding: 8px; margin: 2px 0; cursor: pointer; border-radius: 4px; background: ${selectedStyle}; ${isSelected ? 'border: 2px solid #3498db; box-shadow: 0 2px 8px rgba(52,152,219,0.3);' : 'border: 2px solid transparent;'} transition: all 0.2s ease;"
                 onclick="window.drawingWorld.routerBitSystem.selectRouterBitWithFeedback('${bit.key}')"
                 onmouseover="if(!this.classList.contains('selected')) this.style.background='${selectedHover}'"
                 onmouseout="if(!this.classList.contains('selected')) this.style.background='${isSelected ? selectedStyle : 'rgba(255,255,255,0.1)'}'"
                 data-bit-key="${bit.key}">
                <span style="font-size: 1.2em; margin-right: 8px;">${bit.icon}</span>
                <span style="color: ${isSelected ? '#fff' : '#000'}; font-weight: ${isSelected ? 'bold' : 'normal'};">${bit.label}</span>
                ${isSelected ? '<span style="margin-left: auto; color: #fff; font-weight: bold;">✓</span>' : ''}
            </div>`;
        }).join('');
    }

    /**
     * Update router bit UI to show selected bit
     */
    updateRouterBitUI() {
        // Find and update the router bit options container
        const routerOptionsContainer = document.querySelector('[data-router-options]');
        if (routerOptionsContainer) {
            routerOptionsContainer.innerHTML = this.generateRouterBitOptions();
        }
    }

    /**
     * Select router bit with immediate visual feedback (radio button behavior)
     */
    selectRouterBitWithFeedback(bitType) {
        
        // IMMEDIATE: Clear all button selections visually
        const allButtons = document.querySelectorAll('.router-bit-button');
        allButtons.forEach(button => {
            const bitKey = button.getAttribute('data-bit-key');
            const isNowSelected = bitKey === bitType;
            
            // Reset all buttons
            button.classList.remove('selected');
            button.style.background = 'rgba(255,255,255,0.1)';
            button.style.border = '2px solid transparent';
            button.style.boxShadow = 'none';
            
            // Update text color and weight for unselected
            const textSpan = button.querySelector('span:nth-child(2)');
            const checkmark = button.querySelector('span:last-child');
            if (textSpan) {
                textSpan.style.color = '#000';  // Black text - crisp and readable
                textSpan.style.fontWeight = 'normal';
            }
            if (checkmark && checkmark.textContent === '✓') {
                checkmark.remove();
            }
        });
        
        // IMMEDIATE: Highlight the selected button
        const selectedButton = document.getElementById(`routerbit-${bitType}`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
            selectedButton.style.background = 'rgba(52,152,219,0.8)';
            selectedButton.style.border = '2px solid #3498db';
            selectedButton.style.boxShadow = '0 2px 8px rgba(52,152,219,0.3)';
            
            // Update text styling
            const textSpan = selectedButton.querySelector('span:nth-child(2)');
            if (textSpan) {
                textSpan.style.color = '#fff';
                textSpan.style.fontWeight = 'bold';
                
                // Add checkmark
                const checkmark = document.createElement('span');
                checkmark.style.marginLeft = 'auto';
                checkmark.style.color = '#fff';
                checkmark.style.fontWeight = 'bold';
                checkmark.textContent = '✓';
                selectedButton.appendChild(checkmark);
            }
        }
        
        // Then handle the actual selection logic
        this.selectRouterBit(bitType);
    }

    /**
     * Select a router bit type (new method for properties panel)
     */
    selectRouterBit(bitType) {
        // All router bits are now imported - no more built-in vs imported distinction
        const routerBit = this.customRouterBits.get(bitType);
        
        if (routerBit) {
            this.selectedBitProfile = bitType;
            this.selectedBitInfo = {
                name: routerBit.name,
                description: `Router bit: ${routerBit.name}`,
                imported: true, // All bits are imported now
                mesh: routerBit.mesh
            };
            
            // Update UI to show selected bit
            this.updateRouterBitUI();
            
            // Show scaling options for all router bits (no more bitProfile - all are imported)
            this.showImportedBitSizeSelector(routerBit);
            
        } else {
        }
    }

    /**
     * Select a router bit type (original method for modal)
     */
    selectRouterBitOriginal(bitKey, bitProfile) {
        this.selectedBitProfile = bitKey;
        this.selectedBitInfo = bitProfile;
        this.showBitSizeSelector(bitProfile);
    }

    /**
     * Apply selected router bit from properties panel
     */
    applySelectedBitFromPanel() {
        if (!this.selectedBitProfile) {
            // alert('Please select a router bit type first');
            return;
        }

        if (this.selectedEdges.length === 0) {
            // alert('No edges selected');
            return;
        }

        // Apply the router bit to selected edges
        this.setBitSize(this.currentBitSize);
        this.applyProfileToSelectedEdges();
        
    }
    
    /**
     * Show the router bit selection modal
     */
    showRouterBitModal() {
        if (this.routerBitModal) {
            this.routerBitModal.style.display = 'flex';
            this.showRouterBitGrid();
            
            // Update apply button text with edge count
            const applyButton = document.getElementById('apply-router-bit');
            if (applyButton) {
                applyButton.textContent = `Apply to ${this.selectedEdges.length} Selected Edge(s)`;
            }
        }
    }
    
    /**
     * Hide the router bit selection modal
     */
    hideRouterBitModal() {
        if (this.routerBitModal) {
            this.routerBitModal.style.display = 'none';
        }
    }
    
    /**
     * Show the router bit grid (first step)
     */
    showRouterBitGrid() {
        if (this.routerBitGrid && this.bitSizeSelector) {
            this.routerBitGrid.style.display = 'grid';
            this.bitSizeSelector.style.display = 'none';
        }
    }
    
    /**
     * Show the bit size selector (second step)
     */
    showBitSizeSelector(bitProfile) {
        if (this.routerBitGrid && this.bitSizeSelector) {
            this.routerBitGrid.style.display = 'none';
            this.bitSizeSelector.style.display = 'block';
            
            // Update selected bit name
            if (this.selectedBitName) {
                this.selectedBitName.textContent = `${bitProfile.name} - Select Size`;
            }
            
            // Populate size buttons
            this.populateSizeButtons(bitProfile);
        }
    }
    
    /**
     * Populate the router bit grid with available bits
     */
    populateRouterBitGrid() {
        if (!this.routerBitGrid) return;
        
        this.routerBitGrid.innerHTML = '';
        
        Object.entries(this.routerBitLibrary).forEach(([key, bitProfile]) => {
            const bitCard = document.createElement('div');
            bitCard.className = 'router-bit-card';
            bitCard.dataset.bitKey = key;
            
            bitCard.innerHTML = `
                <span class="router-bit-icon">${bitProfile.icon}</span>
                <div class="router-bit-name">${bitProfile.name}</div>
                <div class="router-bit-description">${bitProfile.description}</div>
            `;
            
            bitCard.addEventListener('click', () => {
                this.selectRouterBit(key, bitProfile);
            });
            
            this.routerBitGrid.appendChild(bitCard);
        });
    }
    
    /**
     * Select a router bit and show size selector
     */
    selectRouterBit(bitKey, bitProfile) {
        this.selectedBitProfile = bitKey;
        this.selectedBitInfo = bitProfile;
        this.showBitSizeSelector(bitProfile);
    }
    
    /**
     * Populate size buttons for selected bit
     */
    populateSizeButtons(bitProfile) {
        if (!this.sizeButtons) return;
        
        this.sizeButtons.innerHTML = '';
        
        bitProfile.defaultSizes.forEach(size => {
            const sizeButton = document.createElement('button');
            sizeButton.className = 'size-button';
            sizeButton.textContent = `${size}"`;
            sizeButton.dataset.size = size;
            
            sizeButton.addEventListener('click', () => {
                // Clear previous selection
                this.sizeButtons.querySelectorAll('.size-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Select this size
                sizeButton.classList.add('selected');
                this.selectedBitSize = size;
            });
            
            this.sizeButtons.appendChild(sizeButton);
        });
        
        // Auto-select default size (0.25")
        const defaultButton = this.sizeButtons.querySelector('[data-size="0.25"]');
        if (defaultButton) {
            defaultButton.click();
        }
    }
    
    /**
     * Apply the selected router bit to selected edges
     */
    applySelectedBit() {
        if (!this.selectedBitProfile || !this.selectedBitSize) {
            return;
        }
        
        
        // Set the current bit profile and size
        this.setBitSize(this.selectedBitSize);
        
        // Apply to selected edges
        this.applyProfileToSelectedEdges();
        
        // Hide modal
        this.hideRouterBitModal();
    }

    // ==================== SYSTEM CONTROL ====================
    
    /**
     * Activate the router bit system
     */
    activate(bitProfile = 'roundover') {
        this.isActive = true;
        this.selectedBitProfile = bitProfile;
        this.clearAll();
    }
    
    /**
     * Deactivate the router bit system
     */
    deactivate() {
        this.isActive = false;
        this.selectedBitProfile = null;
        this.clearFocusPart();
        this.clearAll();
    }
    
    /**
     * Clear all selections and previews
     */
    clearAll() {
        this.clearEdgeHover();
        this.selectedEdges.forEach(edge => {
            if (edge.selectionHighlight) {
                edge.selectionHighlight.dispose();
            }
        });
        this.selectedEdges = [];
        this.clearProfilePreviews();
    }
    
    /**
     * Clear profile preview meshes
     */
    clearProfilePreviews() {
        this.profilePreviewMeshes.forEach(mesh => mesh.dispose());
        this.profilePreviewMeshes = [];
    }
    
    /**
     * Get available router bit profiles
     */
    getAvailableProfiles() {
        return Object.keys(this.routerBitLibrary);
    }
    
    /**
     * Get profile information
     */
    getProfileInfo(profileName) {
        return this.routerBitLibrary[profileName];
    }
    
    /**
     * Set current bit size
     */
    setBitSize(size) {
        this.currentBitSize = size;
    }
    
    /**
     * Apply router bit profile to selected edges
     */
    applyProfileToSelectedEdges() {
        if (this.selectedEdges.length === 0) {
            return;
        }
        
        if (!this.selectedBitProfile) {
            return;
        }
        
        
        // Apply profile to each selected edge
        const edgeCount = this.selectedEdges.length;
        this.selectedEdges.forEach(edge => {
            this.applyProfileToEdge(edge, this.selectedBitProfile, this.currentBitSize);
        });
        
        
        // Clear selections after application
        this.clearAll();
    }
    
    /**
     * Apply profile to a specific edge
     */
    applyProfileToEdge(edge, profileName, size) {
        
        // All router bits are now imported - check custom collection
        const routerBit = this.customRouterBits.get(profileName);
        if (!routerBit) {
            return;
        }
        
        
        // For imported bits, we use the 3D mesh directly with universal corner alignment
        
        // Apply actual geometry modification using the universal cutting system
        this.modifyMeshWithProfile(edge, [], profileName, size);
        
    }
    
    /**
     * Modify the mesh geometry with the router bit profile
     */
    modifyMeshWithProfile(edge, profilePoints, profileName, size) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        
        // Create the cutting tool geometry
        const cuttingTool = this.createCuttingToolGeometry(edge, profileName, size);
        
        if (!cuttingTool) {
            return;
        }
        
        // Perform CSG subtraction to actually modify the board geometry
        this.performCSGSubtraction(mesh, cuttingTool, profileName);
        
        // Update the work bench display to show the modification
        if (this.drawingWorld.updateWorkBenchDisplay) {
            this.drawingWorld.updateWorkBenchDisplay();
        }
    }
    
    /**
     * Create cutting tool from imported router bit
     */
    createCuttingToolFromImportedBit(edge, importedBit, scale) {
        
        // Clone the imported mesh for use as cutting tool
        const originalMesh = importedBit.mesh;
        const cuttingTool = originalMesh.clone(`cutting_tool_${importedBit.id}`);
        
        // Reset position and scaling for cutting operation
        cuttingTool.position.set(0, 0, 0);
        
        // Apply user-selected scale (50% to 300%)
        const finalScale = scale * 5000; // Base scaling (imported bits are tiny) * user scale
        cuttingTool.scaling.setAll(finalScale);
        
        // Position the cutting tool at the edge location
        const edgePosition = this.getEdgePosition(edge);
        const edgeOrientation = this.getEdgeOrientation(edge);
        
        // Position tool for cutting
        cuttingTool.position.copyFrom(edgePosition);
        
        // Orient tool for proper cutting direction
        if (edgeOrientation) {
            cuttingTool.rotation.copyFrom(edgeOrientation);
        }
        
        // Make sure the tool extends through the wood for clean cutting
        if (edge.type === 'horizontal' || edge.type === 'top' || edge.type === 'bottom') {
            cuttingTool.position.y += (edge.type === 'top' ? 0.5 : -0.5); // Offset for clean cut
        } else {
            cuttingTool.position.x += 0.5; // Offset for vertical edges
        }
        
        
        return cuttingTool;
    }
    
    /**
     * Get edge position for router bit placement
     */
    getEdgePosition(edge) {
        // This should return the 3D position where the router bit should cut
        const mesh = edge.mesh;
        const bounds = mesh.getBoundingInfo();
        
        // For now, place at edge center - you may need to adjust based on edge type
        switch (edge.type) {
            case 'top':
                return new BABYLON.Vector3(
                    mesh.position.x,
                    bounds.maximum.y,
                    mesh.position.z
                );
            case 'bottom':
                return new BABYLON.Vector3(
                    mesh.position.x,
                    bounds.minimum.y,
                    mesh.position.z
                );
            case 'left':
                return new BABYLON.Vector3(
                    bounds.minimum.x,
                    mesh.position.y,
                    mesh.position.z
                );
            case 'right':
                return new BABYLON.Vector3(
                    bounds.maximum.x,
                    mesh.position.y,
                    mesh.position.z
                );
            default:
                return mesh.position.clone();
        }
    }
    
    /**
     * Get edge orientation for router bit
     */
    getEdgeOrientation(edge) {
        // Return proper rotation based on edge type
        switch (edge.type) {
            case 'top':
            case 'bottom':
                return new BABYLON.Vector3(0, 0, 0); // No rotation needed
            case 'left':
            case 'right':
                return new BABYLON.Vector3(0, Math.PI/2, 0); // 90 degree rotation
            default:
                return new BABYLON.Vector3(0, 0, 0);
        }
    }
    
    /**
     * Create cutting tool geometry for CSG subtraction
     */
    createCuttingToolGeometry(edge, profileName, size) {
        
        // All router bits are now imported and use corner alignment
        const routerBit = this.customRouterBits.get(profileName);
        if (routerBit) {
            const cuttingTool = this.createUniversalCuttingTool(edge, routerBit.mesh, size, true);
            
            if (cuttingTool) {
                const toolBounds = cuttingTool.getBoundingInfo();
                const toolSize = toolBounds.maximum.subtract(toolBounds.minimum);
                return cuttingTool;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
    
    /**
     * Universal cutting tool creation with corner alignment
     */
    createUniversalCuttingTool(edge, routerBitMesh, scale, isImported) {
        
        // Clone the router bit mesh for cutting
        const cuttingTool = routerBitMesh.clone(`cutting_tool_${Date.now()}`);
        
        // Apply appropriate scaling based on bit type
        if (isImported) {
            // For imported bits: ignore display scale, use reasonable imperial scale for cutting
            // Original imported size is ~0.002 units, need to scale to reasonable router bit size
            const imperialScale = 25400; // 10x larger than standard imperial scale
            cuttingTool.scaling.setAll(imperialScale);
        } else {
            // For built-in bits: use imperial scale
            const finalScale = 2540;
            cuttingTool.scaling.setAll(finalScale);
        }
        
        // Get the board edge corner position
        const edgeCornerPosition = this.getEdgeCornerPosition(edge);
        
        // Position router bit corner at board edge corner
        cuttingTool.position.copyFrom(edgeCornerPosition);
        
        // Apply proper orientation for the edge type
        const edgeOrientation = this.getEdgeOrientation(edge);
        if (edgeOrientation) {
            cuttingTool.rotation.copyFrom(edgeOrientation);
        }
        
        
        // Validate cutting tool has geometry before returning
        if (cuttingTool.getTotalVertices() === 0) {
            return null;
        }
        
        const boundingInfo = cuttingTool.getBoundingInfo();
        const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
        
        if (size.x < 0.1 || size.y < 0.1 || size.z < 0.1) {
            return null;
        }
        
        return cuttingTool;
    }
    
    /**
     * Get the exact corner position for an edge
     */
    getEdgeCornerPosition(edge) {
        const mesh = edge.mesh;
        const bounds = mesh.getBoundingInfo();
        
        
        // Return the exact corner position for each edge type
        switch (edge.type) {
            case 'top_front_edge':
                return new BABYLON.Vector3(
                    bounds.minimum.x,  // Left corner of front edge
                    bounds.maximum.y,  // Top face
                    bounds.maximum.z   // Front face
                );
            case 'top_back_edge':
                return new BABYLON.Vector3(
                    bounds.minimum.x,  // Left corner of back edge
                    bounds.maximum.y,  // Top face  
                    bounds.minimum.z   // Back face
                );
            case 'top_left_edge':
                return new BABYLON.Vector3(
                    bounds.minimum.x,  // Left face
                    bounds.maximum.y,  // Top face
                    bounds.minimum.z   // Back corner of left edge
                );
            case 'top_right_edge':
                return new BABYLON.Vector3(
                    bounds.maximum.x,  // Right face
                    bounds.maximum.y,  // Top face
                    bounds.maximum.z   // Front corner of right edge (was wrong before)
                );
            default:
                // Fallback to mesh center if edge type not recognized
                return new BABYLON.Vector3(
                    (bounds.minimum.x + bounds.maximum.x) / 2,
                    (bounds.minimum.y + bounds.maximum.y) / 2,
                    (bounds.minimum.z + bounds.maximum.z) / 2
                );
        }
    }
    
    /**
     * Create built-in router bit meshes (roundover, ogee)
     */
    createBuiltInRouterBitMesh(profileName, size) {
        const sizeInCm = size * 2.54;
        
        if (profileName === 'roundover') {
            // Create the perfected quarter-circle roundover cutting tool
            try {
                const cylinderRadius = sizeInCm;
                const cornerSize = cylinderRadius * 1.1;
                
                const cornerCube = BABYLON.BoxBuilder.CreateBox('roundover_corner_cube', {
                    width: cornerSize, height: cornerSize, depth: cornerSize
                }, this.scene);
                
                const cuttingCylinder = BABYLON.CylinderBuilder.CreateCylinder('roundover_cylinder', {
                    height: cornerSize * 2,
                    diameter: cylinderRadius * 2,
                    tessellation: 32
                }, this.scene);
                
                // Position cylinder inside corner cube
                cuttingCylinder.position.set(
                    cornerSize/2 - cylinderRadius,
                    cornerSize/2 - cylinderRadius,  
                    cornerSize/2 - cylinderRadius
                );
                cuttingCylinder.rotation.x = Math.PI / 2;
                
                // CSG: corner cube minus cylinder = quarter-circle tool
                const cornerCSG = BABYLON.CSG.FromMesh(cornerCube);
                const cylinderCSG = BABYLON.CSG.FromMesh(cuttingCylinder);
                const resultCSG = cornerCSG.subtract(cylinderCSG);
                
                const roundoverTool = resultCSG.toMesh('roundover_built_in', null, this.scene);
                
                // Clean up temporary meshes
                cornerCube.dispose();
                cuttingCylinder.dispose();
                
                return roundoverTool;
                
            } catch (error) {
                return null;
            }
        }
        
        // Add other built-in profiles here (ogee, etc.)
        return null;
    }
    
    /**
     * Legacy cutting tool system for chamfer and other bits
     */
    createLegacyCuttingTool(edge, profileName, size) {
        
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = mesh.position;
        
        let cuttingTool = null;
        const sizeInCm = size * 2.54; // Convert inches to cm
        
        if (profileName === 'chamfer') {
            // Chamfer uses legacy system - create angled cutting plane
            cuttingTool = BABYLON.BoxBuilder.CreateBox('chamfer_cutter', {
                width: sizeInCm * 2,
                height: sizeInCm,
                depth: Math.max(meshSize.x, meshSize.z)
            }, this.scene);
            cuttingTool.rotation.z = Math.PI / 4; // 45 degree angle
            
        } else {
            // Generic fallback for other profiles
            cuttingTool = BABYLON.BoxBuilder.CreateBox('generic_cutter', {
                width: sizeInCm,
                height: sizeInCm,
                depth: sizeInCm
            }, this.scene);
        }
        
        // Position the cutting tool at the edge
        if (cuttingTool) {
            const edgePosition = this.getEdgePosition(edge);
            cuttingTool.position.copyFrom(edgePosition);
        }
        
        return cuttingTool;
    }
    
    /**
     * Create router bit visual effect (fallback when CSG fails)
     */
    createRouterBitEffect(edge, profilePoints, profileName, size) {
            // Cylinder has radius = sizeInCm (diameter = sizeInCm * 2)
            // To get quarter-circle: position cylinder center OUTSIDE the cube corner
            // so that only 1/4 of the cylinder intersects the cube corner
            const cylinderRadius = sizeInCm;
            cuttingCylinder.position.x = (sizeInCm / 2) + cylinderRadius;   // Outside right edge
            cuttingCylinder.position.z = (sizeInCm / 2) + cylinderRadius;   // Outside front edge  
            cuttingCylinder.position.y = 0;                                 // Centered vertically
            cuttingCylinder.rotation.x = Math.PI / 2;    // Lay cylinder horizontal along Z axis
            
            // Create proper quarter-circle cutting tool using perfected CSG geometry
            
            try {
                // Create small corner cube - just slightly bigger than cylinder radius for perfect 1/4 circle
                const cylinderRadius = sizeInCm; // Cylinder radius matches router bit
                const cornerSize = cylinderRadius * 1.1; // Trim close to corner for proper quarter-circle
                
                const cornerCube = BABYLON.BoxBuilder.CreateBox('corner_cube_tool', {
                    width: cornerSize, height: cornerSize, depth: cornerSize
                }, this.scene);
                
                // Position corner cube at corner
                cornerCube.position.set(0, 0, 0);
                
                // Position cylinder inside corner cube, jammed into corner
                cuttingCylinder.position.set(
                    cornerSize/2 - cylinderRadius,   // Cylinder edge touches right face from inside
                    cornerSize/2 - cylinderRadius,   // Cylinder edge touches top face from inside  
                    cornerSize/2 - cylinderRadius    // Cylinder edge touches front face from inside
                );
                
                // CSG: corner cube minus cylinder = perfect quarter-circle cutting tool
                const cornerCSG = BABYLON.CSG.FromMesh(cornerCube);
                const cylinderCSG = BABYLON.CSG.FromMesh(cuttingCylinder);
                const resultCSG = cornerCSG.subtract(cylinderCSG);
                
                cuttingTool = resultCSG.toMesh('roundover_quarter_circle_tool', cornerBlock.material, this.scene);
                
                // Clean up temporary meshes
                cornerCube.dispose();
                
            } catch (error) {
                cuttingTool = BABYLON.BoxBuilder.CreateBox('roundover_fallback', {
                    width: sizeInCm, height: sizeInCm, depth: sizeInCm
                }, this.scene);
            }
            
            // Make cutting tool highly visible with bright material
            const debugMat = new BABYLON.StandardMaterial('roundover_visible', this.scene);
            debugMat.diffuseColor = new BABYLON.Color3(1, 0, 1); // Bright magenta
            debugMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0.5); // Magenta glow
            debugMat.alpha = 1.0; // Fully opaque
            cuttingTool.material = debugMat;
            
            // Keep cutting tool visible - do not dispose immediately
            cuttingTool.isVisible = true;
            
            // Clean up intermediate meshes
            cornerBlock.dispose();
            cuttingCylinder.dispose();
            
            
        // Legacy code removed - all router bits now use universal corner alignment system
            
        return cuttingTool;
    }
    
    /**
     * Legacy method for chamfer (to be removed)
     */
    createLegacyChamferTool(edge, profileName, size) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const sizeInCm = size * 2.54;
        let cuttingTool = null;
        
        if (profileName === 'chamfer') {
            // Create edge-specific rectangular cutting tool
            if (edge.type === 'top_front_edge' || edge.type === 'top_back_edge') {
                // Long edges - box runs along X direction
                cuttingTool = BABYLON.BoxBuilder.CreateBox('chamfer_cutter', {
                    width: meshSize.x + 2,     // Full edge length
                    height: sizeInCm * 1.5,    // Bit size * 1.5 for clean cut
                    depth: sizeInCm * 1.5      // Bit size * 1.5 for clean cut
                }, this.scene);
            } else if (edge.type === 'top_left_edge' || edge.type === 'top_right_edge') {
                // Short edges - box runs along Z direction  
                cuttingTool = BABYLON.BoxBuilder.CreateBox('chamfer_cutter', {
                    width: sizeInCm * 1.5,     // Bit size * 1.5 for clean cut
                    height: sizeInCm * 1.5,    // Bit size * 1.5 for clean cut
                    depth: meshSize.z + 2      // Full edge length
                }, this.scene);
            }
            
        } else if (profileName === 'cove') {
            // Create a cylinder for cove cutting
            cuttingTool = BABYLON.CylinderBuilder.CreateCylinder('cove_cutter', {
                height: Math.max(meshSize.x, meshSize.z),
                diameter: sizeInCm * 2,
                tessellation: 16
            }, this.scene);
            cuttingTool.rotation.z = Math.PI / 2;
            
        } else if (profileName === 'rabbeting') {
            // Create a rectangular notch for rabbet cutting
            cuttingTool = BABYLON.BoxBuilder.CreateBox('rabbet_cutter', {
                width: Math.max(meshSize.x, meshSize.z),
                height: sizeInCm,
                depth: sizeInCm
            }, this.scene);
            
        } else {
            // Generic groove cutter
            cuttingTool = BABYLON.CylinderBuilder.CreateCylinder('groove_cutter', {
                height: Math.max(meshSize.x, meshSize.z),
                diameter: sizeInCm,
                tessellation: 12
            }, this.scene);
            cuttingTool.rotation.z = Math.PI / 2;
        }
        
        if (cuttingTool) {
            // Position the cutting tool at the edge
            this.positionCuttingTool(cuttingTool, edge, meshSize, sizeInCm);
        }
        
        return cuttingTool;
    }
    
    /**
     * Position the cutting tool at the correct edge location
     */
    positionCuttingTool(cuttingTool, edge, meshSize, sizeInCm) {
        const mesh = edge.mesh;
        const meshCenter = mesh.position;
        
        
        const toolName = cuttingTool.name;
        
        // Position cutting tool at selected edge location
        cuttingTool.position = meshCenter.clone();
        if (edge.type === 'top_front_edge') {
            // Front edge of top face (along X axis) 
            if (toolName.includes('roundover')) {
                // Position at edge for proper cutting intersection
                cuttingTool.position.y += (meshSize.y / 2); // At top surface level
                cuttingTool.position.z += (meshSize.z / 2); // At front surface level
                // Tool needs proper rotation so curved corner faces the board edge
            } else if (toolName.includes('chamfer')) {
                // Position rectangular box for 45-degree chamfer - intersect at corner
                cuttingTool.position.y += (meshSize.y / 2); // At top surface level
                cuttingTool.position.z += (meshSize.z / 2); // At front surface level
                cuttingTool.rotation.x = Math.PI / 4; // 45-degree rotation for chamfer
            }
            
            
        } else if (edge.type === 'top_back_edge') {
            // Back edge of top face (along X axis)
            if (toolName.includes('roundover')) {
                // Position roundover sliver OUTSIDE the board for visibility
                cuttingTool.position.y += (meshSize.y / 2) + sizeInCm; // Above top surface
                cuttingTool.position.z -= (meshSize.z / 2) + sizeInCm; // Outside back surface
                cuttingTool.rotation.x = Math.PI; // Flip 180 degrees so curved part faces outward
            } else if (toolName.includes('chamfer')) {
                // Position rectangular box for 45-degree chamfer - intersect at corner
                cuttingTool.position.y += (meshSize.y / 2); // At top surface level
                cuttingTool.position.z -= (meshSize.z / 2); // At back surface level
                cuttingTool.rotation.x = -Math.PI / 4; // -45-degree rotation for back edge
            }
            
            
        } else if (edge.type === 'top_left_edge') {
            // Left edge of top face (along Z axis)
            if (toolName.includes('roundover')) {
                // Position roundover sliver OUTSIDE the board for visibility
                cuttingTool.position.y += (meshSize.y / 2) + sizeInCm; // Above top surface
                cuttingTool.position.x -= (meshSize.x / 2) + sizeInCm; // Outside left surface
                cuttingTool.rotation.z = Math.PI; // Flip 180 degrees so curved part faces outward
            } else if (toolName.includes('chamfer')) {
                // Position rectangular box for 45-degree chamfer - intersect at corner
                cuttingTool.position.y += (meshSize.y / 2); // At top surface level
                cuttingTool.position.x -= (meshSize.x / 2); // At left surface level
                cuttingTool.rotation.z = Math.PI / 4; // 45-degree rotation for chamfer
            }
            
            
        } else if (edge.type === 'top_right_edge') {
            // Right edge of top face (along Z axis)
            if (toolName.includes('roundover')) {
                // Position roundover sliver OUTSIDE the board for visibility
                cuttingTool.position.y += (meshSize.y / 2) + sizeInCm; // Above top surface
                cuttingTool.position.x += (meshSize.x / 2) + sizeInCm; // Outside right surface
                cuttingTool.rotation.z = Math.PI; // Flip 180 degrees so curved part faces outward
            } else if (toolName.includes('chamfer')) {
                // Position rectangular box for 45-degree chamfer - intersect at corner
                cuttingTool.position.y += (meshSize.y / 2); // At top surface level
                cuttingTool.position.x += (meshSize.x / 2); // At right surface level
                cuttingTool.rotation.z = -Math.PI / 4; // -45-degree rotation for right edge
            } else {
                // For other tools (roundover), align along Z axis
                cuttingTool.rotation.y = Math.PI / 2; // Align along Z axis
            }
            
        } else if (edge.type === 'right_edge') {
            // Right side edge (vertical)
            cuttingTool.position.x = meshCenter.x + meshSize.x / 2;
            cuttingTool.rotation.z = Math.PI / 2; // Vertical orientation
            
        } else if (edge.type === 'left_edge') {
            // Left side edge (vertical)
            cuttingTool.position.x = meshCenter.x - meshSize.x / 2;
            cuttingTool.rotation.z = Math.PI / 2; // Vertical orientation
            
        } else if (edge.type === 'front_edge') {
            // Front side edge (vertical)
            cuttingTool.position.z = meshCenter.z + meshSize.z / 2;
            cuttingTool.rotation.x = Math.PI / 2; // Vertical orientation
            
        } else if (edge.type === 'back_edge') {
            // Back side edge (vertical)
            cuttingTool.position.z = meshCenter.z - meshSize.z / 2;
            cuttingTool.rotation.x = Math.PI / 2; // Vertical orientation
            
        } else {
        }
        
        // Cutting tool positioned at selected edge
        
        
        return cuttingTool;
    }
    
    /**
     * Perform CSG subtraction to actually modify the board geometry
     */
    performCSGSubtraction(boardMesh, cuttingTool, profileName) {
        
        try {
            
            // Clone the cutting tool before CSG to preserve the original for visibility
            const cuttingToolClone = cuttingTool.clone(cuttingTool.name + '_csg_clone');
            
            // Create CSG objects using the clone
            const boardCSG = BABYLON.CSG.FromMesh(boardMesh);
            const toolCSG = BABYLON.CSG.FromMesh(cuttingToolClone);
            
            // Subtract the cutting tool from the board
            const resultCSG = boardCSG.subtract(toolCSG);
            
            // Create new mesh from the result
            const newMesh = resultCSG.toMesh(boardMesh.name + '_routed', boardMesh.material, this.scene);
            
            // Copy properties from original mesh
            newMesh.position = boardMesh.position.clone();
            newMesh.rotation = boardMesh.rotation.clone();
            newMesh.scaling = boardMesh.scaling.clone();
            
            // Copy custom properties
            newMesh.isWorkBenchPart = boardMesh.isWorkBenchPart;
            newMesh.isProjectPart = boardMesh.isProjectPart;
            newMesh.partData = boardMesh.partData;
            
            // Chamfering doesn't change board dimensions - just adds routed geometry
            // The board is still the same size, just with chamfered edges
            
            // AGGRESSIVELY UPDATE ALL PART REFERENCES WITH ROUTED GEOMETRY
            if (boardMesh.isWorkBenchPart && this.drawingWorld.workBenchParts) {
                const partIndex = this.drawingWorld.workBenchParts.findIndex(part => part.mesh === boardMesh);
                if (partIndex !== -1) {
                    // Update mesh reference
                    this.drawingWorld.workBenchParts[partIndex].mesh = newMesh;
                    // CRITICAL: Update the partData dimensions in the array to match routed geometry
                    this.drawingWorld.workBenchParts[partIndex].dimensions = {
                        width: newMesh.partData.dimensions.width,
                        length: newMesh.partData.dimensions.length,
                        thickness: newMesh.partData.dimensions.thickness
                    };
                }
            }
            
            if (boardMesh.isProjectPart && this.drawingWorld.projectParts) {
                const partIndex = this.drawingWorld.projectParts.findIndex(part => part.mesh === boardMesh);
                if (partIndex !== -1) {
                    // Update mesh reference  
                    this.drawingWorld.projectParts[partIndex].mesh = newMesh;
                    // CRITICAL: Update the partData dimensions in the array to match routed geometry
                    this.drawingWorld.projectParts[partIndex].dimensions = {
                        width: newMesh.partData.dimensions.width,
                        length: newMesh.partData.dimensions.length,
                        thickness: newMesh.partData.dimensions.thickness
                    };
                }
            }
            
            // Replace the original mesh
            boardMesh.dispose();
            
            // Update the focus part reference
            this.focusPart = newMesh;
            
            // AGGRESSIVELY UPDATE selectedPart if it matches the routed part
            if (this.drawingWorld.selectedPart && this.drawingWorld.selectedPart.id === newMesh.partData.id) {
                // Replace selectedPart entirely with the new partData containing routed dimensions
                this.drawingWorld.selectedPart = newMesh.partData;
            }
            
            
            // CRITICAL: Serialize the routed geometry to preserve modifications permanently
            if (newMesh && this.drawingWorld.serializeMeshGeometry) {
                const meshGeometry = this.drawingWorld.serializeMeshGeometry(newMesh);
                // Add metadata about which edges were routed
                meshGeometry.routedEdges = this.selectedEdges.map(edge => edge.type);
                if (newMesh.partData) {
                    newMesh.partData.meshGeometry = meshGeometry;
                }
            }
            
            // Clean up cutting tools after CSG operation
            
            // Dispose of the cutting tool (it was just temporary for CSG)
            if (cuttingTool) {
                cuttingTool.dispose();
            }
            
            // Dispose of the clone used for CSG
            if (cuttingToolClone) {
                cuttingToolClone.dispose();
            }
            
        } catch (error) {
            
            // Fallback: Create a visual effect instead
            this.createRouterBitEffect({mesh: boardMesh, type: 'fallback'}, [], profileName, this.currentBitSize);
            
            // Clean up cutting tool
            // cuttingTool.dispose(); // Keep tool visible for debugging
        }
    }
    
    /**
     * Create a visual effect to show router bit modification
     */
    createRouterBitEffect(edge, profilePoints, profileName, size) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        const meshCenter = mesh.position;
        
        // Create a visual groove/chamfer effect based on the profile
        let effectMesh;
        
        if (profileName === 'roundover') {
            // Create a rounded edge effect
            effectMesh = this.createRoundoverEffect(edge, size);
        } else if (profileName === 'chamfer') {
            // Create a chamfered edge effect
            effectMesh = this.createChamferEffect(edge, size);
        } else if (profileName === 'cove') {
            // Create a cove effect
            effectMesh = this.createCoveEffect(edge, size);
        } else {
            // Generic groove for other profiles
            effectMesh = this.createGenericGrooveEffect(edge, size);
        }
        
        if (effectMesh) {
            // Position the effect on the edge
            effectMesh.position = meshCenter.clone();
            effectMesh.parent = mesh;
            
            // Make it slightly darker than the main material
            if (mesh.material) {
                const effectMaterial = mesh.material.clone(mesh.material.name + '_router_effect');
                if (effectMaterial.diffuseColor) {
                    effectMaterial.diffuseColor = effectMaterial.diffuseColor.scale(0.8); // Darker
                }
                effectMesh.material = effectMaterial;
            }
            
        }
    }
    
    /**
     * Create a roundover visual effect
     */
    createRoundoverEffect(edge, radius) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Create a small cylinder to represent the rounded edge
        const roundoverMesh = BABYLON.CylinderBuilder.CreateCylinder('roundover_effect', {
            height: Math.min(meshSize.x, meshSize.z),
            diameterTop: radius * 2 * 2.54, // Convert inches to cm
            diameterBottom: radius * 2 * 2.54,
            tessellation: 12
        }, this.scene);
        
        // Position along the top edge
        roundoverMesh.position.y = meshSize.y / 2 - radius * 2.54 / 2;
        
        return roundoverMesh;
    }
    
    /**
     * Create a chamfer visual effect
     */
    createChamferEffect(edge, size) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Create a thin box to represent the chamfer
        const chamferMesh = BABYLON.BoxBuilder.CreateBox('chamfer_effect', {
            width: Math.min(meshSize.x, meshSize.z),
            height: size * 2.54, // Convert inches to cm
            depth: size * 2.54
        }, this.scene);
        
        // Position at the corner
        chamferMesh.position.y = meshSize.y / 2 - size * 2.54 / 2;
        chamferMesh.rotation.z = Math.PI / 4; // 45 degree angle
        
        return chamferMesh;
    }
    
    /**
     * Create a cove visual effect
     */
    createCoveEffect(edge, radius) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Create a torus to represent the cove
        const coveMesh = BABYLON.TorusBuilder.CreateTorus('cove_effect', {
            diameter: radius * 2 * 2.54, // Convert inches to cm
            thickness: radius * 0.5 * 2.54,
            tessellation: 16
        }, this.scene);
        
        // Position along the edge
        coveMesh.position.y = meshSize.y / 2 - radius * 2.54 / 2;
        coveMesh.rotation.x = Math.PI / 2;
        
        return coveMesh;
    }
    
    /**
     * Create a generic groove effect for other profiles
     */
    createGenericGrooveEffect(edge, size) {
        const mesh = edge.mesh;
        const meshBounds = mesh.getBoundingInfo();
        const meshSize = meshBounds.maximum.subtract(meshBounds.minimum);
        
        // Create a small groove representation
        const grooveMesh = BABYLON.BoxBuilder.CreateBox('groove_effect', {
            width: Math.min(meshSize.x, meshSize.z) * 0.9,
            height: size * 2.54 * 0.5, // Convert inches to cm
            depth: size * 2.54 * 0.5
        }, this.scene);
        
        // Position slightly inset from the edge
        grooveMesh.position.y = meshSize.y / 2 - size * 2.54 / 4;
        
        return grooveMesh;
    }
    
    // ==================== DISPOSAL ====================
    
    /**
     * Dispose of the router bit system
     */
    dispose() {
        
        // Remove observer
        if (this.pointerObserver) {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        // Clean up materials
        if (this.edgePreviewMaterial) {
            this.edgePreviewMaterial.dispose();
            this.edgePreviewMaterial = null;
        }
        
        if (this.selectedEdgeMaterial) {
            this.selectedEdgeMaterial.dispose();
            this.selectedEdgeMaterial = null;
        }
        
        // Clear all selections and previews
        this.clearAll();
        
        // Clear state
        this.isActive = false;
        this.selectedBitProfile = null;
        this.routerBitLibrary = null;
    }

    /**
     * Recreate a cutting tool from stored edge metadata for geometry reconstruction
     */
    recreateCuttingToolFromMetadata(mesh, edgeInfo, partData) {
        
        try {
            // Extract stored parameters from edge metadata
            const { toolName, sizeInCm, edgeType, position, rotation } = edgeInfo;
            
            // Create cutting tool with same parameters as original
            const cuttingTool = this.createCuttingToolGeometry(toolName, sizeInCm);
            if (!cuttingTool) {
                return null;
            }
            
            // Apply stored position and rotation
            if (position) {
                cuttingTool.position = new BABYLON.Vector3(position.x, position.y, position.z);
            }
            if (rotation) {
                cuttingTool.rotation = new BABYLON.Vector3(rotation.x, rotation.y, rotation.z);
            }
            
            return { cuttingTool, toolName, sizeInCm };
            
        } catch (error) {
            return null;
        }
    }
}