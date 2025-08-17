/**
 * Part Class - Single Source of Truth for All Parts
 * 
 * Every part exists as a persistent data object in the database.
 * The 3D mesh is merely a visual representation of that data.
 * When ANYTHING changes, the database is updated IMMEDIATELY.
 */

export class Part {
    // Static factory method to create Part from plain object
    static fromPlainObject(data, drawingWorld) {
        console.log('Creating Part from plain object:', data);
        return new Part(data);
    }
    constructor(data) {
        // Unique identifier
        this.id = data.id || this.generateUniqueId();
        
        // Part type (board, fastener, hardware, etc.)
        this.type = data.type || 'board';
        
        // Physical dimensions (always in database units - inches)
        this.dimensions = {
            length: data.dimensions.length,
            width: data.dimensions.width,
            thickness: data.dimensions.thickness
        };
        
        // Absolute world position (THIS is the truth, not mesh.position)
        this.position = {
            x: data.position?.x || 0,
            y: data.position?.y || 0,
            z: data.position?.z || 0
        };
        
        // Absolute world rotation (THIS is the truth, not mesh.rotation)
        this.rotation = {
            x: data.rotation?.x || 0,
            y: data.rotation?.y || 0,
            z: data.rotation?.z || 0
        };
        
        // Material properties - ensure they are always set
        this.materialId = data.materialId || (data.material ? data.material.id : "walnut");
        this.materialName = data.materialName || (data.material ? data.material.name : "Black Walnut");
        this.material = data.material || { id: this.materialId, name: this.materialName };

        this.material = {
            id: data.material?.id,
            name: data.material?.name,
            texture: data.material?.texture,
            color: data.material?.color
        };
        
        // Modification history
        this.modifications = data.modifications || [];
        
        // Relationships
        this.parentId = data.parentId || null;
        this.childIds = data.childIds || [];
        
        // Metadata
        this.created = data.created || Date.now();
        this.modified = data.modified || Date.now();
        
        // Board-specific properties (when type === 'board')
        if (this.type === 'board') {
            this.grain = data.grain || 'vertical';
            this.grade = data.grade || 'select';
            this.routedEdges = data.routedEdges || [];
            this.cutHistory = data.cutHistory || [];
        }
        
        // Reference to mesh (set when mesh is created)
        this.mesh = null;
        
        console.log(`✅ Part created: ${this.id}`, this);
    }
    
    generateUniqueId() {
        return 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // ANY change goes through here and updates database
    updateProperty(property, value) {
        console.log(`📝 Part ${this.id}: Updating ${property} to`, value);
        this[property] = value;
        this.modified = Date.now();
        this.saveToDatabase(); // IMMEDIATE persistence
    }
    
    // Update position (called by ANY system that moves the part)
    setPosition(x, y, z) {
        console.log(`📍 Part ${this.id}: Setting position to`, { x, y, z });
        this.position = { x, y, z };
        this.modified = Date.now();
        
        // Update mesh if it exists
        if (this.mesh) {
            this.mesh.position = new BABYLON.Vector3(x, y, z);
        }
        
        this.saveToDatabase();
    }
    
    // Update rotation (called by ANY system that rotates the part)
    setRotation(x, y, z) {
        console.log(`🔄 Part ${this.id}: Setting rotation to`, { x, y, z });
        this.rotation = { x, y, z };
        this.modified = Date.now();
        
        // Update mesh if it exists
        if (this.mesh) {
            this.mesh.rotation = new BABYLON.Vector3(x, y, z);
        }
        
        this.saveToDatabase();
    }
    
    // Update dimensions (for cutting operations)
    setDimensions(length, width, thickness) {
        console.log(`📏 Part ${this.id}: Setting dimensions to`, { length, width, thickness });
        this.dimensions = { length, width, thickness };
        this.modified = Date.now();
        
        // Update mesh if it exists
        if (this.mesh) {
            this.updateMeshGeometry();
        }
        
        this.saveToDatabase();
    }
    
    // Save to database immediately
    saveToDatabase() {
        // TODO: Implement actual database persistence
        // For now, just log the save
        console.log('Part data updated:', this.id, 'position:', this.position, 'rotation:', this.rotation);
    }
    
    // Create mesh from part data (visual representation only)
    createMesh(scene) {
        console.log(`🎨 Part ${this.id}: Creating mesh`);
        
        const mesh = BABYLON.MeshBuilder.CreateBox(this.id, {
            width: this.dimensions.width * 2.54,  // Convert inches to cm for Babylon
            height: this.dimensions.thickness * 2.54,
            depth: this.dimensions.length * 2.54
        }, scene);
        
        // Position mesh from OUR data
        mesh.position = new BABYLON.Vector3(
            this.position.x,
            this.position.y,
            this.position.z
        );
        
        // Rotate mesh from OUR data
        mesh.rotation = new BABYLON.Vector3(
            this.rotation.x,
            this.rotation.y,
            this.rotation.z
        );
        
        // Link mesh back to this part
        mesh.partInstance = this;
        this.mesh = mesh;
        
        // Add part data for backward compatibility during transition
        mesh.partData = {
            id: this.id,
            dimensions: { ...this.dimensions },
            position: { ...this.position },
            rotation: { ...this.rotation },
            material: { ...this.material },
            type: this.type
        };
        
        console.log(`✅ Part ${this.id}: Mesh created and linked`);
        return mesh;
    }
    
    // Update mesh geometry when dimensions change
    updateMeshGeometry() {
        if (!this.mesh) return;
        
        console.log(`🔧 Part ${this.id}: Updating mesh geometry`);
        
        // Dispose old mesh
        this.mesh.dispose();
        
        // Create new mesh with updated dimensions
        this.mesh = BABYLON.MeshBuilder.CreateBox(this.id, {
            width: this.dimensions.width * 2.54,
            height: this.dimensions.thickness * 2.54,
            depth: this.dimensions.length * 2.54
        }, this.mesh.getScene());
        
        // Restore position and rotation
        this.mesh.position = new BABYLON.Vector3(
            this.position.x,
            this.position.y,
            this.position.z
        );
        
        this.mesh.rotation = new BABYLON.Vector3(
            this.rotation.x,
            this.rotation.y,
            this.rotation.z
        );
        
        // Restore links
        this.mesh.partInstance = this;
        this.updatePartDataCompatibility();
    }
    
    // Update backward compatibility partData when Part changes
    updatePartDataCompatibility() {
        if (this.mesh && this.mesh.partData) {
            this.mesh.partData.dimensions = { ...this.dimensions };
            this.mesh.partData.position = { ...this.position };
            this.mesh.partData.rotation = { ...this.rotation };
            this.mesh.partData.material = { ...this.material };
        }
    }
    
    // Get data for database storage
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            dimensions: { ...this.dimensions },
            position: { ...this.position },
            rotation: { ...this.rotation },
            material: { ...this.material },
            modifications: [...this.modifications],
            parentId: this.parentId,
            childIds: [...this.childIds],
            created: this.created,
            modified: this.modified,
            // Board-specific properties
            ...(this.type === 'board' && {
                grain: this.grain,
                grade: this.grade,
                routedEdges: [...this.routedEdges],
                cutHistory: [...this.cutHistory]
            })
        };
    }
    
    // Delete this part from database and dispose mesh
    delete() {
        console.log(`🗑️ Part ${this.id}: Deleting`);
        
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        
        if (window.drawingWorld) {
            window.drawingWorld.removePartFromDatabase(this.id);
        }
    }
    
    // Get world bounding box for cutting calculations
    getWorldBoundingBox() {
        if (this.mesh) {
            return this.mesh.getBoundingInfo().boundingBox;
        }
        
        // Calculate from Part data if no mesh
        const halfWidth = (this.dimensions.width * 2.54) / 2;
        const halfHeight = (this.dimensions.thickness * 2.54) / 2;
        const halfDepth = (this.dimensions.length * 2.54) / 2;
        
        return {
            minimumWorld: new BABYLON.Vector3(
                this.position.x - halfWidth,
                this.position.y - halfHeight,
                this.position.z - halfDepth
            ),
            maximumWorld: new BABYLON.Vector3(
                this.position.x + halfWidth,
                this.position.y + halfHeight,
                this.position.z + halfDepth
            )
        };
    }
}
