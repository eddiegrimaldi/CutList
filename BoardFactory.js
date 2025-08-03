/**
 * BoardFactory - Single point of board creation
 * Ensures "a board is a board is a board"
 * All boards must go through this factory
 */

class BoardFactory {
    constructor(scene, materialsLibrary) {
        this.scene = scene;
        this.materialsLibrary = materialsLibrary;
        this.boards = new Map(); // Track all boards by ID
    }
    
    /**
     * Create a fresh board from material selection
     */
    createFromMaterial(materialId, length, width, thickness, grade) {
        const material = this.materialsLibrary.getMaterial(materialId);
        if (!material) {
            throw new Error(`Material ${materialId} not found in library`);
        }
        
        const boardMaterial = {
            id: materialId,
            species: material.name,
            grade: grade || 'select',
            moisture: material.properties?.moisture || 8,
            density: material.properties?.density || 45,
            texture: material.visual_assets?.texture_diffuse || null,
            grain_pattern: material.properties?.grain_pattern || 'straight'
        };
        
        const board = Board.fromConventionalDimensions(
            length, 
            width, 
            thickness, 
            boardMaterial, 
            true // Assume grain along length for fresh boards
        );
        
        // Calculate cost
        const costInfo = this.materialsLibrary.calculateCost(materialId, length, width, thickness, grade);
        board.economics.cost_per_bf = costInfo.costPerBF || 0;
        
        // Create the 3D mesh
        this.createMeshForBoard(board);
        
        // Track the board
        this.boards.set(board.id, board);
        
        console.log(`📦 Created fresh board: ${board.name} (${length}x${width}x${thickness})`);
        return board;
    }
    
    /**
     * Create board from saved data
     */
    createFromSavedData(data) {
        const board = Board.deserialize(data);
        
        // Create or restore the mesh
        if (data.custom_geometry) {
            this.restoreMeshFromGeometry(board, data.custom_geometry);
        } else {
            this.createMeshForBoard(board);
        }
        
        // Track the board
        this.boards.set(board.id, board);
        
        console.log(`📦 Restored board: ${board.name}`);
        return board;
    }
    
    /**
     * Create boards from cutting operation
     */
    createFromCut(parentBoard, position, axis) {
        const [board1, board2] = parentBoard.cut(position, axis);
        
        // Create meshes for both pieces
        this.createMeshForBoard(board1);
        this.createMeshForBoard(board2);
        
        // Position them slightly apart
        const separation = 2; // 2 inches apart
        if (axis === 'x') {
            board2.transform.position.x += separation;
        } else if (axis === 'y') {
            board2.transform.position.y += separation;
        } else {
            board2.transform.position.z += separation;
        }
        
        // Update mesh positions
        this.updateMeshTransform(board1);
        this.updateMeshTransform(board2);
        
        // Track the boards
        this.boards.set(board1.id, board1);
        this.boards.set(board2.id, board2);
        
        // Remove parent board
        this.disposeBoard(parentBoard);
        
        console.log(`✂️ Cut board ${parentBoard.name} into ${board1.name} and ${board2.name}`);
        return [board1, board2];
    }
    
    /**
     * Create Babylon mesh for board
     */
    createMeshForBoard(board) {
        // Convert dimensions to cm (Babylon units)
        const xCm = board.dimensions.x * 2.54;
        const yCm = board.dimensions.y * 2.54;
        const zCm = board.dimensions.z * 2.54;
        
        // Create box with correct dimensions
        const mesh = BABYLON.MeshBuilder.CreateBox(board.id, {
            width: xCm,   // X dimension
            depth: yCm,   // Y dimension  
            height: zCm   // Z dimension
        }, this.scene);
        
        // Store mesh reference
        board.mesh_id = mesh.id;
        mesh.board = board; // Back reference
        
        // Apply material
        this.applyMaterialToMesh(mesh, board);
        
        // Set transform
        this.updateMeshTransform(board);
        
        // Make pickable
        mesh.isPickable = true;
        
        return mesh;
    }
    
    /**
     * Apply material and texture to mesh
     */
    applyMaterialToMesh(mesh, board) {
        const material = new BABYLON.StandardMaterial(`${board.id}_material`, this.scene);
        
        // Apply texture if available
        if (board.material.texture) {
            try {
                const texture = new BABYLON.Texture(board.material.texture, this.scene);
                
                // UV mapping should align with grain direction
                // This ensures texture grain matches actual grain
                if (board.dimensions.grain_axis === 'x') {
                    texture.uScale = board.dimensions.x / 12; // Repeat every foot
                    texture.vScale = board.dimensions.y / 12;
                } else if (board.dimensions.grain_axis === 'y') {
                    texture.uScale = board.dimensions.y / 12;
                    texture.vScale = board.dimensions.x / 12;
                }
                
                material.diffuseTexture = texture;
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                
                console.log(`🎨 Applied texture to ${board.name}`);
            } catch (error) {
                console.warn(`Failed to load texture for ${board.name}:`, error);
                this.applyDefaultMaterial(material, board);
            }
        } else {
            this.applyDefaultMaterial(material, board);
        }
        
        mesh.material = material;
    }
    
    /**
     * Apply default material when no texture available
     */
    applyDefaultMaterial(material, board) {
        // Wood color based on species
        const woodColors = {
            'oak': new BABYLON.Color3(0.65, 0.5, 0.4),
            'pine': new BABYLON.Color3(0.85, 0.75, 0.6),
            'walnut': new BABYLON.Color3(0.4, 0.3, 0.2),
            'maple': new BABYLON.Color3(0.9, 0.85, 0.7),
            'cherry': new BABYLON.Color3(0.7, 0.4, 0.3)
        };
        
        const species = board.material.species.toLowerCase();
        let color = woodColors['oak']; // default
        
        for (const [wood, woodColor] of Object.entries(woodColors)) {
            if (species.includes(wood)) {
                color = woodColor;
                break;
            }
        }
        
        material.diffuseColor = color;
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    }
    
    /**
     * Update mesh position/rotation from board transform
     */
    updateMeshTransform(board) {
        const mesh = this.scene.getMeshById(board.mesh_id);
        if (!mesh) return;
        
        // Position (convert inches to cm)
        mesh.position.x = board.transform.position.x * 2.54;
        mesh.position.y = board.transform.position.y * 2.54;
        mesh.position.z = board.transform.position.z * 2.54;
        
        // Rotation
        mesh.rotation.x = board.transform.rotation.x;
        mesh.rotation.y = board.transform.rotation.y;
        mesh.rotation.z = board.transform.rotation.z;
        
        // Scaling (should always be 1,1,1)
        mesh.scaling.x = board.transform.scaling.x;
        mesh.scaling.y = board.transform.scaling.y;
        mesh.scaling.z = board.transform.scaling.z;
    }
    
    /**
     * Dispose of board and its mesh
     */
    disposeBoard(board) {
        const mesh = this.scene.getMeshById(board.mesh_id);
        if (mesh) {
            mesh.dispose();
        }
        this.boards.delete(board.id);
        console.log(`🗑️ Disposed board: ${board.name}`);
    }
    
    /**
     * Get board by mesh
     */
    getBoardByMesh(mesh) {
        return mesh?.board || null;
    }
    
    /**
     * Get board by ID
     */
    getBoardById(id) {
        return this.boards.get(id) || null;
    }
    
    /**
     * Get all boards
     */
    getAllBoards() {
        return Array.from(this.boards.values());
    }
    
    /**
     * Get boards by bench
     */
    getBoardsByBench(bench) {
        return this.getAllBoards().filter(board => board.project.bench === bench);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardFactory;
}