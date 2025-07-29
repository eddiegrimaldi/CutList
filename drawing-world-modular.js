// Drawing World with Babylon.js - Modular Version
// Main application file that orchestrates all modules

import { GridSystem } from './grid/GridSystem.js';
import { Shape2D } from './modules/Shape2D.js';
import { ExtrusionGizmo } from './modules/ExtrusionGizmo.js';
import { SelectionSystem } from './modules/SelectionSystem.js';
import { SketchMode } from './modules/SketchMode.js';

class DrawingWorld {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.currentMode = 'sketch'; // 'sketch' or 'model'
        
        // Module instances
        this.gridSystem = null;
        this.shape2D = null;
        this.extrusionGizmo = null;
        this.selectionSystem = null;
        this.sketchMode = null;
        
        // State management
        this.closedShapes = [];
        this.selectedObject = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize Babylon.js
            this.engine = new BABYLON.Engine(this.canvas, true);
            this.scene = new BABYLON.Scene(this.engine);
            
            // Set light background color
            this.scene.clearColor = new BABYLON.Color3(0.95, 0.95, 0.95);
            
            // Set up camera
            this.setupCamera();
            
            // Set up lighting
            this.setupLighting();
            
            // Initialize modules
            await this.initializeModules();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start render loop
            this.engine.runRenderLoop(() => {
                // Update gizmo scaling based on camera distance
                if (this.extrusionGizmo) {
                    this.extrusionGizmo.updateScale();
                }
                
                this.scene.render();
            });
            
            // Handle window resize
            window.addEventListener('resize', () => {
                this.engine.resize();
            });
            
            
        } catch (error) {
        }
    }

    setupCamera() {
        // Arc rotate camera (perfect for CAD applications)
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            -Math.PI / 2,
            Math.PI / 2.5,
            10,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        
        // Attach camera controls to canvas
        this.camera.attachControl(this.canvas, true);
        
        // Set camera limits - allow full rotation
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.lowerBetaLimit = 0.01; // Allow almost vertical looking down
        this.camera.upperBetaLimit = Math.PI - 0.01; // Allow almost vertical looking up
        this.camera.lowerRadiusLimit = 2;
        this.camera.upperRadiusLimit = 100;
        
        // Set near/far planes to reduce clipping issues
        this.camera.minZ = 0.01;
        this.camera.maxZ = 1000;
        
        // Smooth camera movement
        this.camera.inertia = 0.8;
    }

    setupLighting() {
        // Create ambient light
        const ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, 1, 0), this.scene);
        ambientLight.intensity = 0.6;
        ambientLight.diffuse = new BABYLON.Color3(1, 1, 1);
        ambientLight.specular = new BABYLON.Color3(0, 0, 0);
        
        // Create directional light
        const directionalLight = new BABYLON.DirectionalLight('directionalLight', new BABYLON.Vector3(-1, -1, -1), this.scene);
        directionalLight.intensity = 0.8;
        directionalLight.diffuse = new BABYLON.Color3(1, 1, 1);
        directionalLight.specular = new BABYLON.Color3(0.2, 0.2, 0.2);
        
        // Set up shadows if needed
        directionalLight.position = new BABYLON.Vector3(10, 10, 10);
    }

    async initializeModules() {
        try {
            // Initialize grid system
            this.gridSystem = new GridSystem(this.scene, this.camera);
            
            // Initialize shape2D system
            this.shape2D = new Shape2D(this.scene, null); // Will be updated by sketch mode
            
            // Initialize selection system
            this.selectionSystem = new SelectionSystem(this.scene, this.camera);
            this.selectionSystem.setShapeList(this.closedShapes);
            
            // Initialize sketch mode
            this.sketchMode = new SketchMode(this.scene, this.camera, this.shape2D);
            
            // Initialize extrusion gizmo (will be created on demand)
            this.extrusionGizmo = new ExtrusionGizmo(this.scene, this.camera, this);
            
            // Set up callbacks between modules
            this.setupModuleCallbacks();
            
            
        } catch (error) {
            throw error;
        }
    }

    setupModuleCallbacks() {
        // Selection system callbacks
        this.selectionSystem.setFaceSelectionCallback(
            (face) => this.onFaceSelected(face),
            (face) => this.onFaceDeselected(face)
        );
        
        this.selectionSystem.setObjectSelectionCallback(
            (object) => this.onObjectSelected(object),
            (object) => this.onObjectDeselected(object)
        );
    }

    // ==================== MODE MANAGEMENT ====================

    setMode(mode) {
        if (this.currentMode === mode) return;
        
        this.currentMode = mode;
        
        // Update UI
        const modeIndicator = document.getElementById('mode-indicator');
        if (modeIndicator) {
            modeIndicator.textContent = mode === 'sketch' ? 'Sketch Mode' : 'Model Mode';
        }
        
        // Update toolbar
        const sketchBtn = document.getElementById('sketch-btn');
        const modelBtn = document.getElementById('model-btn');
        
        if (sketchBtn && modelBtn) {
            if (mode === 'sketch') {
                sketchBtn.classList.add('active');
                modelBtn.classList.remove('active');
            } else {
                modelBtn.classList.add('active');
                sketchBtn.classList.remove('active');
            }
        }
        
        // Handle mode-specific logic
        if (mode === 'sketch') {
            this.enterSketchMode();
        } else {
            this.enterModelMode();
        }
    }

    enterSketchMode() {
        if (this.sketchMode) {
            this.sketchMode.enterSketchMode();
        }
        
        // Hide selection highlights
        if (this.selectionSystem) {
            this.selectionSystem.clearSelection();
        }
        
        // Hide extrusion gizmo
        if (this.extrusionGizmo) {
            this.extrusionGizmo.hideGizmo();
        }
    }

    enterModelMode() {
        if (this.sketchMode) {
            this.sketchMode.exitSketchMode();
        }
        
        // Add closed shapes to selection system
        const sketchElements = this.sketchMode ? this.sketchMode.getSketchElements() : [];
        this.closedShapes.push(...sketchElements);
        
        if (this.selectionSystem) {
            this.selectionSystem.setShapeList(this.closedShapes);
        }
    }

    // ==================== SELECTION CALLBACKS ====================

    onFaceSelected(face) {
        
        // Show extrusion gizmo
        if (this.extrusionGizmo && this.currentMode === 'model') {
            this.extrusionGizmo.showGizmo(face);
        }
    }

    onFaceDeselected(face) {
        
        // Hide extrusion gizmo
        if (this.extrusionGizmo) {
            this.extrusionGizmo.hideGizmo();
        }
    }

    onObjectSelected(object) {
        this.selectedObject = object;
    }

    onObjectDeselected(object) {
        this.selectedObject = null;
    }

    // ==================== EXTRUSION SYSTEM ====================

    extrudeFace(face, height, isPositive) {
        
        // Get shape data
        const shapeData = this.selectionSystem.getShapeData(face);
        if (!shapeData) {
            return;
        }
        
        // Create extruded shape based on type
        this.performShapeExtrusion(shapeData, height, isPositive);
    }

    performShapeExtrusion(shapeData, height, isPositive) {
        // Create materials
        const solidMaterial = this.createSolidMaterial();
        const holeMaterial = this.createHoleMaterial();
        
        let extrudedMesh = null;
        
        try {
            switch (shapeData.type) {
                case 'rectangle':
                    extrudedMesh = this.extrudeRectangle(shapeData, height, isPositive);
                    break;
                case 'circle':
                    extrudedMesh = this.extrudeCircle(shapeData, height, isPositive);
                    break;
                case 'ellipse':
                    extrudedMesh = this.extrudeEllipse(shapeData, height, isPositive);
                    break;
                case 'polygon':
                    extrudedMesh = this.extrudePolygon(shapeData, height, isPositive);
                    break;
                case 'triangle':
                    extrudedMesh = this.extrudeTriangle(shapeData, height, isPositive);
                    break;
                default:
                    return;
            }
            
            if (extrudedMesh) {
                // Apply appropriate material
                extrudedMesh.material = isPositive ? solidMaterial : holeMaterial;
                
                // Add to scene
                extrudedMesh.isPickable = true;
                extrudedMesh.renderingGroupId = 1;
                
            }
            
        } catch (error) {
        }
    }

    // ==================== EXTRUSION METHODS ====================

    extrudeRectangle(shapeData, height, isPositive) {
        const points = shapeData.points;
        if (!points || points.length < 4) return null;
        
        // Calculate dimensions
        const bounds = this.calculateBounds(points);
        const width = bounds.maxX - bounds.minX;
        const rectHeight = bounds.maxZ - bounds.minZ;
        
        // Create box
        const box = BABYLON.MeshBuilder.CreateBox(isPositive ? 'extrudedRectangle' : 'extrudedHole', {
            width: width,
            height: rectHeight,
            depth: height
        }, this.scene);
        
        // Position box
        const direction = isPositive ? 1 : -1;
        box.position.x = bounds.centerX;
        box.position.y = bounds.centerY + (height / 2 * direction);
        box.position.z = bounds.centerZ;
        
        return box;
    }

    extrudeCircle(shapeData, height, isPositive) {
        const radius = shapeData.radius || 1;
        const center = shapeData.center || BABYLON.Vector3.Zero();
        
        const cylinder = BABYLON.MeshBuilder.CreateCylinder(isPositive ? 'extrudedCircle' : 'extrudedCircleHole', {
            diameter: radius * 2,
            height: height
        }, this.scene);
        
        // Position cylinder
        const direction = isPositive ? 1 : -1;
        cylinder.position = center.clone();
        cylinder.position.y += height / 2 * direction;
        
        return cylinder;
    }

    extrudeEllipse(shapeData, height, isPositive) {
        const radiusX = shapeData.radiusX || 1;
        const radiusY = shapeData.radiusY || 1;
        const center = shapeData.center || BABYLON.Vector3.Zero();
        
        const cylinder = BABYLON.MeshBuilder.CreateCylinder(isPositive ? 'extrudedEllipse' : 'extrudedEllipseHole', {
            diameterTop: radiusX * 2,
            diameterBottom: radiusX * 2,
            height: height
        }, this.scene);
        
        // Scale to create ellipse
        cylinder.scaling.x = radiusX / radiusY;
        
        // Position cylinder
        const direction = isPositive ? 1 : -1;
        cylinder.position = center.clone();
        cylinder.position.y += height / 2 * direction;
        
        return cylinder;
    }

    extrudePolygon(shapeData, height, isPositive) {
        const points = shapeData.points || [];
        if (points.length < 3) return null;
        
        // Convert to 2D points for extrusion
        const shape2D = points.map(p => new BABYLON.Vector2(p.x, p.z));
        
        const extruded = BABYLON.MeshBuilder.ExtrudePolygon(isPositive ? 'extrudedPolygon' : 'extrudedPolygonHole', {
            shape: shape2D,
            depth: height
        }, this.scene);
        
        // Position based on direction
        if (!isPositive) {
            extruded.position.y -= height;
        }
        
        return extruded;
    }

    extrudeTriangle(shapeData, height, isPositive) {
        // Same as polygon extrusion
        return this.extrudePolygon(shapeData, height, isPositive);
    }

    // ==================== HELPER METHODS ====================

    calculateBounds(points) {
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        const minZ = Math.min(...points.map(p => p.z));
        const maxZ = Math.max(...points.map(p => p.z));
        
        return {
            minX, maxX, minY, maxY, minZ, maxZ,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            centerZ: (minZ + maxZ) / 2
        };
    }

    createSolidMaterial() {
        const material = new BABYLON.StandardMaterial("solidMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.9); // Light blue
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.15);
        return material;
    }

    createHoleMaterial() {
        const material = new BABYLON.StandardMaterial("holeMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3); // Red
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.emissiveColor = new BABYLON.Color3(0.3, 0.1, 0.1);
        material.alpha = 0.7; // Semi-transparent to indicate it's a hole
        return material;
    }

    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        // Mode switching buttons
        const sketchBtn = document.getElementById('sketch-btn');
        const modelBtn = document.getElementById('model-btn');
        
        if (sketchBtn) {
            sketchBtn.addEventListener('click', () => this.setMode('sketch'));
        }
        
        if (modelBtn) {
            modelBtn.addEventListener('click', () => this.setMode('model'));
        }
        
        // Grid toggle
        const gridToggle = document.getElementById('grid-toggle');
        if (gridToggle) {
            gridToggle.addEventListener('click', () => {
                if (this.gridSystem) {
                    const isVisible = this.gridSystem.isVisible;
                    this.gridSystem.setVisible(!isVisible);
                    gridToggle.textContent = isVisible ? 'Show Grid' : 'Hide Grid';
                }
            });
        }
        
        // Reset view
        const resetView = document.getElementById('reset-view');
        if (resetView) {
            resetView.addEventListener('click', () => {
                if (this.camera) {
                    this.camera.setTarget(BABYLON.Vector3.Zero());
                    this.camera.alpha = -Math.PI / 2;
                    this.camera.beta = Math.PI / 2.5;
                    this.camera.radius = 10;
                }
            });
        }
        
        // Tool selection (if in sketch mode)
        const toolButtons = document.querySelectorAll('[data-tool]');
        toolButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tool = button.dataset.tool;
                if (this.sketchMode) {
                    this.sketchMode.setTool(tool);
                }
                
                // Update active tool button
                toolButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    // ==================== DISPOSAL ====================

    dispose() {
        // Dispose modules
        if (this.gridSystem) {
            this.gridSystem.dispose();
            this.gridSystem = null;
        }
        
        if (this.shape2D) {
            this.shape2D.dispose();
            this.shape2D = null;
        }
        
        if (this.extrusionGizmo) {
            this.extrusionGizmo.dispose();
            this.extrusionGizmo = null;
        }
        
        if (this.selectionSystem) {
            this.selectionSystem.dispose();
            this.selectionSystem = null;
        }
        
        if (this.sketchMode) {
            this.sketchMode.dispose();
            this.sketchMode = null;
        }
        
        // Dispose Babylon.js
        if (this.scene) {
            this.scene.dispose();
            this.scene = null;
        }
        
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }
    }
}

// Initialize the application
const drawingWorld = new DrawingWorld();

// Export for global access if needed
window.drawingWorld = drawingWorld;

export default DrawingWorld;