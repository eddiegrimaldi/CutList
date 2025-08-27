# Part Architecture - Single Source of Truth

## Core Principle
Every part exists as a persistent data object in the database. The 3D mesh is merely a visual representation of that data. When ANYTHING changes, the database is updated IMMEDIATELY.

## 1. Part Class Structure

```javascript
class Part {
    constructor(data) {
        // Unique identifier
        this.id = data.id || generateUniqueId();
        
        // Part type (board, fastener, hardware, etc.)
        this.type = data.type || 'board';
        
        // Physical dimensions (always in database units)
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
        
        // Material properties
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
    }
    
    // ANY change goes through here and updates database
    updateProperty(property, value) {
        this[property] = value;
        this.modified = Date.now();
        this.saveToDatabase(); // IMMEDIATE persistence
    }
    
    // Update position (called by ANY system that moves the part)
    setPosition(x, y, z) {
        this.position = { x, y, z };
        this.modified = Date.now();
        this.saveToDatabase();
    }
    
    // Update rotation (called by ANY system that rotates the part)
    setRotation(x, y, z) {
        this.rotation = { x, y, z };
        this.modified = Date.now();
        this.saveToDatabase();
    }
    
    // Save to database immediately
    saveToDatabase() {
        // For now, this updates the JSON file
        // Later, this will be a real database call
        window.drawingWorld.updatePartInDatabase(this);
    }
    
    // Create mesh from part data (visual representation only)
    createMesh(scene) {
        const mesh = BABYLON.MeshBuilder.CreateBox(this.id, {
            width: this.dimensions.width * 2.54,  // Convert to cm for Babylon
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
        
        return mesh;
    }
}
```

## 2. Data Flow Architecture

### Creating a Part
```javascript
// User selects a board from library
const partData = {
    type: 'board',
    dimensions: { length: 96, width: 6, thickness: 0.75 },
    material: { id: 'walnut_001', name: 'Black Walnut' },
    position: { x: 0, y: 0, z: 0 }
};

// Create part instance (automatically saves to database)
const part = new Part(partData);

// Create visual representation
const mesh = part.createMesh(scene);
```

### Moving a Part (via gizmo, mouse, or any method)
```javascript
// Gizmo drag event
gizmo.onDragEndObservable.add(() => {
    // Get the part instance from the mesh
    const part = mesh.partInstance;
    
    // Update the PART data (which saves to database)
    part.setPosition(mesh.position.x, mesh.position.y, mesh.position.z);
    
    // The mesh position is just following the part data
});
```

### Cutting a Part
```javascript
function cutPart(part, cutPosition) {
    // Calculate new dimensions
    const piece1Dimensions = calculatePiece1(part.dimensions, cutPosition);
    const piece2Dimensions = calculatePiece2(part.dimensions, cutPosition);
    
    // Create NEW parts in database
    const piece1 = new Part({
        type: 'board',
        dimensions: piece1Dimensions,
        position: calculatePiece1Position(part.position, cutPosition),
        rotation: { ...part.rotation },  // Inherit rotation
        material: { ...part.material },  // Inherit material
        parentId: part.id
    });
    
    const piece2 = new Part({
        type: 'board',
        dimensions: piece2Dimensions,
        position: calculatePiece2Position(part.position, cutPosition),
        rotation: { ...part.rotation },  // Inherit rotation
        material: { ...part.material },  // Inherit material
        parentId: part.id
    });
    
    // Remove original part from database
    part.delete();
    
    // Create meshes for new parts
    const mesh1 = piece1.createMesh(scene);
    const mesh2 = piece2.createMesh(scene);
}
```

### Loading a Project
```javascript
// Load parts from database
const partsData = loadFromDatabase();

// Create Part instances
const parts = partsData.map(data => new Part(data));

// Create meshes from parts
parts.forEach(part => {
    const mesh = part.createMesh(scene);
    // Mesh is positioned from part data, no calculations needed
});
```

## 3. Database Structure (JSON for now)

```json
{
    "projectId": "project_123",
    "parts": [
        {
            "id": "part_001",
            "type": "board",
            "dimensions": {
                "length": 96,
                "width": 6,
                "thickness": 0.75
            },
            "position": {
                "x": -30.94,
                "y": 0.95,
                "z": -46.41
            },
            "rotation": {
                "x": 0,
                "y": 0.785,
                "z": 0
            },
            "material": {
                "id": "walnut_001",
                "name": "Black Walnut",
                "texture": "textures/walnut.jpg"
            },
            "created": 1755005917463,
            "modified": 1755006123456
        }
    ]
}
```

## 4. Key Implementation Rules

1. **NEVER** read position/rotation from mesh - always from Part instance
2. **ALWAYS** update Part instance when mesh changes (gizmo, cut, move, etc.)
3. **IMMEDIATE** database saves on every change (no batching, no delays)
4. **Part class is the ONLY** way to create, modify, or delete parts
5. **Meshes are disposable** - can be recreated anytime from Part data
6. **No cached positions** - always read from Part instance
7. **No phantom data** - if it's not in the Part instance, it doesn't exist

## 5. Benefits

- **Single Source of Truth**: Part instance in database is THE truth
- **Perfect Persistence**: Every change is saved immediately
- **No Sync Issues**: Mesh always reflects Part data
- **Simple Debugging**: Check Part instance to know exact state
- **Reliable Loading**: Parts load exactly as they were saved
- **No Phantom Boards**: Rotation updates Part, so cut tool sees correct position

## 6. Migration Path

1. Create Part class
2. Convert existing workBenchParts array to Part instances
3. Update all mesh creation to use Part.createMesh()
4. Update all gizmo/movement code to update Part instance
5. Update cutting system to work with Part instances
6. Update save/load to work with Part instances
7. Remove all direct mesh position/rotation modifications

This architecture ensures "A Board Is A Board" - one source of truth, always accurate, always persistent.