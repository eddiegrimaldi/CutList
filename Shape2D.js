// Shape2D.js - 2D shape creation and management
// Handles all 2D shape creation, filling, and border rendering

export class Shape2D {
    constructor(scene, sketchSystem) {
        this.scene = scene;
        this.sketchSystem = sketchSystem;
        this.thickLineMaterial = null;
        this.setupMaterials();
    }
    
    setupMaterials() {
        // Create thick line material for borders
        this.thickLineMaterial = new BABYLON.StandardMaterial('thickLineMaterial', this.scene);
        this.thickLineMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.8); // Dark blue
        this.thickLineMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.8);
        this.thickLineMaterial.disableLighting = true;
        this.thickLineMaterial.backFaceCulling = false;
    }
    
    // ==================== FILLED SHAPE CREATION ====================
    
    createFilledRectangle(points, name, borderMaterial = null) {
        
        const material = borderMaterial || this.thickLineMaterial.clone(name + '_borderMaterial');
        
        // Create the thick border
        const borderMesh = this.createThickLineLoop(points, name + '_border', material);
        
        // Create fill material
        const fillMaterial = this.createFillMaterial(name + '_fillMaterial');
        
        // Calculate rectangle dimensions based on the sketch coordinate system
        let width, height, centerPos, fillMesh;
        
        if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp) {
            // Calculate dimensions using the sketch coordinate system
            const bounds = this.calculateBounds(points);
            
            // Calculate the spans in the sketch coordinate system
            const corner1 = points[0];
            const corner2 = points[1];
            const corner3 = points[2];
            
            const side1 = corner2.subtract(corner1);
            const side2 = corner3.subtract(corner2);
            
            width = side1.length();
            height = side2.length();
            
            // Create plane fill that matches the rectangle dimensions
            fillMesh = BABYLON.MeshBuilder.CreatePlane(name + '_fill', {
                width: Math.max(width, 0.1),
                height: Math.max(height, 0.1),
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.scene);
            
            // Position the fill at the rectangle center
            centerPos = new BABYLON.Vector3(bounds.centerX, bounds.centerY, bounds.centerZ);
            fillMesh.position = centerPos;
            
            // Orient the fill plane to match the sketch coordinate system
            const rightDir = side1.normalize();
            const upDir = side2.normalize();
            const normalDir = BABYLON.Vector3.Cross(rightDir, upDir).normalize();
            
            // Create rotation matrix from the coordinate system
            const rotationMatrix = BABYLON.Matrix.FromValues(
                rightDir.x, rightDir.y, rightDir.z, 0,
                upDir.x, upDir.y, upDir.z, 0,
                normalDir.x, normalDir.y, normalDir.z, 0,
                0, 0, 0, 1
            );
            
            fillMesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
            
        } else {
            // Fallback to simple XZ plane calculation
            const bounds = this.calculateBounds(points);
            width = bounds.maxX - bounds.minX;
            height = bounds.maxZ - bounds.minZ;
            
            // Create plane fill that matches the rectangle dimensions
            fillMesh = BABYLON.MeshBuilder.CreatePlane(name + '_fill', {
                width: Math.max(width, 0.1),
                height: Math.max(height, 0.1),
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.scene);
            
            // Position the fill at the rectangle center
            fillMesh.position.x = bounds.centerX;
            fillMesh.position.y = bounds.centerY - 0.001; // Slightly behind to avoid z-fighting
            fillMesh.position.z = bounds.centerZ;
        }
        fillMesh.material = fillMaterial;
        fillMesh.renderingGroupId = 0; // Behind border
        fillMesh.isPickable = true;
        
        // Create parent to hold both
        const parentMesh = new BABYLON.Mesh(name, this.scene);
        if (borderMesh) borderMesh.parent = parentMesh;
        if (fillMesh) fillMesh.parent = parentMesh;
        
        return parentMesh;
    }
    
    createFilledCircle(center, radius, name, borderMaterial = null) {
        
        const material = borderMaterial || this.thickLineMaterial.clone(name + '_borderMaterial');
        
        // Create the thick border
        const points = this.getCirclePoints(center, radius);
        const borderMesh = this.createThickLineLoop(points, name + '_border', material);
        
        // Create fill material
        const fillMaterial = this.createFillMaterial(name + '_fillMaterial');
        
        // Create disc fill
        const fillMesh = BABYLON.MeshBuilder.CreateDisc(name + '_fill', {
            radius: radius,
            tessellation: 32,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        
        // Position the fill at the circle center
        fillMesh.position = center.clone();
        
        // Orient the disc to match the sketch coordinate system
        if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp && this.sketchSystem.sketchForward) {
            const rightDir = this.sketchSystem.sketchRight;
            const upDir = this.sketchSystem.sketchUp;
            const normalDir = this.sketchSystem.sketchForward;
            
            // Create rotation matrix from the coordinate system
            const rotationMatrix = BABYLON.Matrix.FromValues(
                rightDir.x, rightDir.y, rightDir.z, 0,
                upDir.x, upDir.y, upDir.z, 0,
                normalDir.x, normalDir.y, normalDir.z, 0,
                0, 0, 0, 1
            );
            
            fillMesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
        } else {
            // Fallback - offset slightly behind for z-fighting
            fillMesh.position.y -= 0.001;
        }
        fillMesh.material = fillMaterial;
        fillMesh.renderingGroupId = 0; // Behind border
        fillMesh.isPickable = true;
        
        // Create parent to hold both
        const parentMesh = new BABYLON.Mesh(name, this.scene);
        if (borderMesh) borderMesh.parent = parentMesh;
        if (fillMesh) fillMesh.parent = parentMesh;
        
        return parentMesh;
    }
    
    createFilledEllipse(center, radiusX, radiusY, name, borderMaterial = null) {
        
        const material = borderMaterial || this.thickLineMaterial.clone(name + '_borderMaterial');
        
        // Create the thick border
        const points = this.getEllipsePoints(center, radiusX, radiusY);
        const borderMesh = this.createThickLineLoop(points, name + '_border', material);
        
        // Create fill material
        const fillMaterial = this.createFillMaterial(name + '_fillMaterial');
        
        // Create disc fill and scale it to create an ellipse
        const fillMesh = BABYLON.MeshBuilder.CreateDisc(name + '_fill', {
            radius: Math.max(radiusX, radiusY),
            tessellation: 32,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        
        // Scale the disc to create an ellipse
        const scaleX = radiusX / Math.max(radiusX, radiusY);
        const scaleY = radiusY / Math.max(radiusX, radiusY);
        fillMesh.scaling = new BABYLON.Vector3(scaleX, scaleY, 1);
        
        // Position the fill at the ellipse center
        fillMesh.position = center.clone();
        
        // Orient the ellipse to match the sketch coordinate system
        if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp && this.sketchSystem.sketchForward) {
            const rightDir = this.sketchSystem.sketchRight;
            const upDir = this.sketchSystem.sketchUp;
            const normalDir = this.sketchSystem.sketchForward;
            
            // Create rotation matrix from the coordinate system
            const rotationMatrix = BABYLON.Matrix.FromValues(
                rightDir.x, rightDir.y, rightDir.z, 0,
                upDir.x, upDir.y, upDir.z, 0,
                normalDir.x, normalDir.y, normalDir.z, 0,
                0, 0, 0, 1
            );
            
            fillMesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
        } else {
            // Fallback - offset slightly behind for z-fighting
            fillMesh.position.y -= 0.001;
        }
        fillMesh.material = fillMaterial;
        fillMesh.renderingGroupId = 0; // Behind border
        fillMesh.isPickable = true;
        
        // Create parent to hold both
        const parentMesh = new BABYLON.Mesh(name, this.scene);
        if (borderMesh) borderMesh.parent = parentMesh;
        if (fillMesh) fillMesh.parent = parentMesh;
        
        return parentMesh;
    }
    
    createFilledPolygon(points, name, borderMaterial = null) {
        
        const material = borderMaterial || this.thickLineMaterial.clone(name + '_borderMaterial');
        
        // Create the thick border
        const borderMesh = this.createThickLineLoop(points, name + '_border', material);
        
        // Create fill using ExtrudePolygon
        const fillMaterial = this.createFillMaterial(name + '_fillMaterial');
        
        // Convert to 2D points for extrusion based on the sketch coordinate system
        let shape2D, fillMesh;
        
        if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp && this.sketchSystem.sketchOrigin) {
            // Project points onto the sketch plane using the coordinate system
            shape2D = points.map(p => {
                const fromOrigin = p.subtract(this.sketchSystem.sketchOrigin);
                const xCoord = BABYLON.Vector3.Dot(fromOrigin, this.sketchSystem.sketchRight);
                const yCoord = BABYLON.Vector3.Dot(fromOrigin, this.sketchSystem.sketchUp);
                return new BABYLON.Vector2(xCoord, yCoord);
            });
        } else {
            // Fallback to XZ plane projection
            shape2D = points.map(p => new BABYLON.Vector2(p.x, p.z));
        }
        
        try {
            fillMesh = BABYLON.MeshBuilder.ExtrudePolygon(name + '_fill', {
                shape: shape2D,
                depth: 0.001 // Ultra-thin extrusion
            }, this.scene);
            
            // Position and orient the extruded polygon if using sketch coordinate system
            if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp && this.sketchSystem.sketchOrigin) {
                fillMesh.position = this.sketchSystem.sketchOrigin.clone();
                
                // Orient the polygon to match the sketch coordinate system
                const rightDir = this.sketchSystem.sketchRight;
                const upDir = this.sketchSystem.sketchUp;
                const normalDir = this.sketchSystem.sketchForward;
                
                // Create rotation matrix from the coordinate system
                const rotationMatrix = BABYLON.Matrix.FromValues(
                    rightDir.x, rightDir.y, rightDir.z, 0,
                    upDir.x, upDir.y, upDir.z, 0,
                    normalDir.x, normalDir.y, normalDir.z, 0,
                    0, 0, 0, 1
                );
                
                fillMesh.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix(rotationMatrix);
            }
            
            fillMesh.material = fillMaterial;
            fillMesh.renderingGroupId = 0; // Behind border
            fillMesh.isPickable = true;
            
            // Create parent to hold both
            const parentMesh = new BABYLON.Mesh(name, this.scene);
            if (borderMesh) borderMesh.parent = parentMesh;
            if (fillMesh) fillMesh.parent = parentMesh;
            
            return parentMesh;
        } catch (error) {
            return borderMesh;
        }
    }
    
    // ==================== BORDER CREATION ====================
    
    createThickLineLoop(points, name, material) {
        if (!points || points.length < 2) return null;
        
        const ribbons = [];
        const borderWidth = 0.05;
        const halfWidth = borderWidth / 2;
        
        // Create ribbon for each edge with mitered corners
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            
            const direction = end.subtract(start).normalize();
            const perpendicular = this.calculatePerpendicular(direction);
            
            // Extend lines by half the border width for proper mitered corners
            const extension = halfWidth;
            const extendedStart = start.subtract(direction.scale(extension));
            const extendedEnd = end.add(direction.scale(extension));
            
            const path1 = [
                extendedStart.add(perpendicular.scale(halfWidth)),
                extendedEnd.add(perpendicular.scale(halfWidth))
            ];
            const path2 = [
                extendedStart.subtract(perpendicular.scale(halfWidth)),
                extendedEnd.subtract(perpendicular.scale(halfWidth))
            ];
            
            const ribbon = BABYLON.MeshBuilder.CreateRibbon(name + '_edge_' + i, {
                pathArray: [path1, path2],
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, this.scene);
            
            ribbon.material = material;
            ribbon.renderingGroupId = 1;
            ribbon.isPickable = true;
            ribbons.push(ribbon);
        }
        
        // Merge ribbons into single mesh
        if (ribbons.length > 1) {
            const mergedMesh = BABYLON.Mesh.MergeMeshes(ribbons, true, true, undefined, false, true);
            if (mergedMesh) {
                mergedMesh.name = name;
                return mergedMesh;
            }
        }
        
        return ribbons[0] || null;
    }
    
    // ==================== HELPER METHODS ====================
    
    createFillMaterial(name) {
        const fillMaterial = new BABYLON.StandardMaterial(name, this.scene);
        fillMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.7, 1.0); // Light blue fill
        fillMaterial.emissiveColor = new BABYLON.Color3(0.6, 0.7, 1.0);
        fillMaterial.backFaceCulling = false;
        fillMaterial.disableLighting = true;
        fillMaterial.alpha = 0.5; // Semi-transparent fill
        return fillMaterial;
    }
    
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
    
    calculatePerpendicular(direction) {
        // Calculate perpendicular vector in the sketch plane
        if (this.sketchSystem && this.sketchSystem.sketchForward) {
            return BABYLON.Vector3.Cross(direction, this.sketchSystem.sketchForward).normalize();
        }
        // Fallback to Y-up perpendicular
        return BABYLON.Vector3.Cross(direction, new BABYLON.Vector3(0, 1, 0)).normalize();
    }
    
    getCirclePoints(center, radius, segments = 32) {
        const points = [];
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Generate circle points in the surface coordinate system
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            
            // Convert to world coordinates using surface vectors
            if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp) {
                const worldPoint = center
                    .add(this.sketchSystem.sketchRight.scale(x))
                    .add(this.sketchSystem.sketchUp.scale(y));
                points.push(worldPoint);
            } else {
                // Fallback to XZ plane
                points.push(new BABYLON.Vector3(center.x + x, center.y, center.z + y));
            }
        }
        
        return points;
    }
    
    getEllipsePoints(center, radiusX, radiusY, segments = 32) {
        const points = [];
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Generate ellipse points in the surface coordinate system
            const x = radiusX * Math.cos(angle);
            const y = radiusY * Math.sin(angle);
            
            // Convert to world coordinates using surface vectors
            if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp) {
                const worldPoint = center
                    .add(this.sketchSystem.sketchRight.scale(x))
                    .add(this.sketchSystem.sketchUp.scale(y));
                points.push(worldPoint);
            } else {
                // Fallback to XZ plane
                points.push(new BABYLON.Vector3(center.x + x, center.y, center.z + y));
            }
        }
        
        return points;
    }
    
    getRectangleCorners(start, end) {
        // alert('Shape2D getRectangleCorners called!');
        
        // Create rectangle corners based on the sketch coordinate system
        if (this.sketchSystem && this.sketchSystem.sketchRight && this.sketchSystem.sketchUp) {
            // Calculate dimensions in the sketch coordinate system
            const startToEnd = end.subtract(start);
            
            const rightComponent = BABYLON.Vector3.Dot(startToEnd, this.sketchSystem.sketchRight);
            const upComponent = BABYLON.Vector3.Dot(startToEnd, this.sketchSystem.sketchUp);
            
            // Create proper rectangle corners using the sketch coordinate system
            const corners = [
                start.clone(),                                                     // Corner 1 (start)
                start.add(this.sketchSystem.sketchRight.scale(rightComponent)),   // Corner 2 (start + right)
                start.add(this.sketchSystem.sketchRight.scale(rightComponent))    // Corner 3 (start + right + up)
                     .add(this.sketchSystem.sketchUp.scale(upComponent)),
                start.add(this.sketchSystem.sketchUp.scale(upComponent))          // Corner 4 (start + up)
            ];
            
            return corners;
        } else {
            // Fallback to XZ plane (original behavior)
            const corners = [
                start.clone(),                                // Corner 1 (start)
                new BABYLON.Vector3(end.x, start.y, start.z), // Corner 2 (end.x, start.y)
                end.clone(),                                  // Corner 3 (end)
                new BABYLON.Vector3(start.x, start.y, end.z)  // Corner 4 (start.x, end.z)
            ];
            
            return corners;
        }
    }
    
    // ==================== PREVIEW METHODS ====================
    
    createPreviewMaterial(name) {
        const material = this.thickLineMaterial.clone(name);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green preview
        material.emissiveColor = new BABYLON.Color3(0, 1, 0);
        return material;
    }
    
    // Disposal method
    dispose() {
        if (this.thickLineMaterial) {
            this.thickLineMaterial.dispose();
            this.thickLineMaterial = null;
        }
    }
}