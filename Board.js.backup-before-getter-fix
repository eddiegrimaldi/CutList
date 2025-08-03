/**
 * Board Class - A board is a board is a board
 * X is X, Y is Y, Z is Z - forever
 * 
 * Grain direction is permanent and tied to the original coordinate system
 */

class Board {
    constructor(data = {}) {
        // === IDENTITY ===
        this.id = data.id || `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = data.name || 'Unnamed Board';
        
        // === MATERIAL (from material library) ===
        this.material = {
            id: data.material?.id || null,
            species: data.material?.species || '',
            grade: data.material?.grade || 'select',
            moisture: data.material?.moisture || 8,  // % moisture content
            density: data.material?.density || 45,   // lbs/ft³
            texture: data.material?.texture || null,
            color: data.material?.color || null,
            grain_pattern: data.material?.grain_pattern || 'straight'
        };
        
        // === ABSOLUTE DIMENSIONS ===
        // These are the board's measurements along its permanent axes
        this.dimensions = {
            x: data.dimensions?.x || 0,  // Dimension along X axis
            y: data.dimensions?.y || 0,  // Dimension along Y axis  
            z: data.dimensions?.z || 0,  // Dimension along Z axis
            grain_axis: data.dimensions?.grain_axis || 'x'  // Which axis has the grain
        };
        
        // === POSITION IN PARENT SPACE ===
        // When cut from a parent, where did this piece come from?
        this.parent_space = {
            parent_id: data.parent_space?.parent_id || null,
            origin: {
                x: data.parent_space?.origin?.x || 0,
                y: data.parent_space?.origin?.y || 0,
                z: data.parent_space?.origin?.z || 0
            }
        };
        
        // === WORLD TRANSFORM ===
        // Current position and rotation in the 3D world
        this.transform = {
            position: {
                x: data.transform?.position?.x || 0,
                y: data.transform?.position?.y || 0,
                z: data.transform?.position?.z || 0
            },
            rotation: {
                x: data.transform?.rotation?.x || 0,
                y: data.transform?.rotation?.y || 0,
                z: data.transform?.rotation?.z || 0
            },
            scaling: {
                x: data.transform?.scaling?.x || 1,
                y: data.transform?.scaling?.y || 1,
                z: data.transform?.scaling?.z || 1
            }
        };
        
        // === ECONOMICS ===
        this.economics = {
            cost_per_bf: data.economics?.cost_per_bf || 0,
            get board_feet() {
                return (this.dimensions.x * this.dimensions.y * this.dimensions.z) / 144;
            },
            get total_cost() {
                return this.board_feet * this.cost_per_bf;
            },
            get weight() {
                const volume_ft3 = (this.dimensions.x * this.dimensions.y * this.dimensions.z) / 1728;
                return volume_ft3 * this.material.density;
            }
        };
        
        // === OPERATIONS HISTORY ===
        this.operations = data.operations || [];
        
        // === PROJECT STATE ===
        this.project = {
            bench: data.project?.bench || 'work',  // 'work' or 'assembly'
            purpose: data.project?.purpose || '',
            joinery: data.project?.joinery || [],
            finish: data.project?.finish || ''
        };
        
        // === MESH REFERENCE ===
        this.mesh_id = data.mesh_id || null;
        
        // === GEOMETRY DATA (if custom) ===
        this.custom_geometry = data.custom_geometry || null;
    }
    
    /**
     * Get conventional dimensions (largest to smallest)
     * This is for display only - internally we always use x, y, z
     */
    getConventionalDimensions() {
        const dims = [this.dimensions.x, this.dimensions.y, this.dimensions.z];
        dims.sort((a, b) => b - a);
        return {
            length: dims[0],
            width: dims[1],
            thickness: dims[2]
        };
    }
    
    /**
     * Get grain direction relative to conventional dimensions
     */
    getGrainOrientation() {
        const conv = this.getConventionalDimensions();
        const grain_dimension = this.dimensions[this.dimensions.grain_axis];
        
        if (grain_dimension === conv.length) return 'along_length';
        if (grain_dimension === conv.width) return 'along_width';
        if (grain_dimension === conv.thickness) return 'along_thickness';
        return 'unknown';
    }
    
    /**
     * Cut this board into two pieces
     * @param {number} position - Where to cut (in inches along the axis)
     * @param {string} axis - Which axis to cut along ('x', 'y', or 'z')
     * @returns {[Board, Board]} Two new boards
     */
    cut(position, axis) {
        // Validate the cut
        if (position <= 0 || position >= this.dimensions[axis]) {
            throw new Error(`Invalid cut position: ${position} on ${axis} axis (board is ${this.dimensions[axis]}" on that axis)`);
        }
        
        // Create piece 1 (from origin to cut position)
        const piece1_dims = { ...this.dimensions };
        piece1_dims[axis] = position;
        
        const piece1 = new Board({
            name: `${this.name} (A)`,
            material: { ...this.material },
            dimensions: piece1_dims,
            parent_space: {
                parent_id: this.id,
                origin: { ...this.parent_space.origin }
            },
            transform: { ...this.transform },
            economics: { cost_per_bf: this.economics.cost_per_bf },
            project: { ...this.project }
        });
        
        // Create piece 2 (from cut position to end)
        const piece2_dims = { ...this.dimensions };
        piece2_dims[axis] = this.dimensions[axis] - position;
        
        const piece2_origin = { ...this.parent_space.origin };
        piece2_origin[axis] += position;
        
        const piece2 = new Board({
            name: `${this.name} (B)`,
            material: { ...this.material },
            dimensions: piece2_dims,
            parent_space: {
                parent_id: this.id,
                origin: piece2_origin
            },
            transform: { ...this.transform },
            economics: { cost_per_bf: this.economics.cost_per_bf },
            project: { ...this.project }
        });
        
        // Record the operation on both pieces
        const operation = {
            timestamp: new Date().toISOString(),
            type: axis === this.dimensions.grain_axis ? 'rip_cut' : 'cross_cut',
            machine: 'table_saw',
            parameters: {
                position: position,
                axis: axis,
                kerf: 0.125  // 1/8" blade
            }
        };
        
        piece1.operations = [...this.operations, operation];
        piece2.operations = [...this.operations, operation];
        
        return [piece1, piece2];
    }
    
    /**
     * Create a board from conventional dimensions
     * This is a helper for the UI where users think in length/width/thickness
     */
    static fromConventionalDimensions(length, width, thickness, material, grainAlongLength = true) {
        // Sort to ensure length >= width >= thickness
        const dims = [length, width, thickness].sort((a, b) => b - a);
        
        // Assign to x, y, z based on grain direction
        let x, y, z, grain_axis;
        
        if (grainAlongLength) {
            x = dims[0];  // Length (grain direction)
            y = dims[1];  // Width
            z = dims[2];  // Thickness
            grain_axis = 'x';
        } else {
            y = dims[0];  // Length
            x = dims[1];  // Width (grain direction) 
            z = dims[2];  // Thickness
            grain_axis = 'x';  // Could make this configurable
        }
        
        return new Board({
            material: material,
            dimensions: { x, y, z, grain_axis },
            operations: [{
                timestamp: new Date().toISOString(),
                type: 'created',
                machine: 'supplier',
                parameters: {
                    length: dims[0],
                    width: dims[1],
                    thickness: dims[2]
                }
            }]
        });
    }
    
    /**
     * Serialize for saving
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            material: this.material,
            dimensions: this.dimensions,
            parent_space: this.parent_space,
            transform: this.transform,
            economics: { cost_per_bf: this.economics.cost_per_bf },
            operations: this.operations,
            project: this.project,
            mesh_id: this.mesh_id,
            custom_geometry: this.custom_geometry
        };
    }
    
    /**
     * Create a Board from saved data
     */
    static deserialize(data) {
        return new Board(data);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Board;
}