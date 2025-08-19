/**
 * PartManager - Manages the collection of all parts and database persistence
 * 
 * This is the central authority for:
 * - Creating new parts
 * - Managing part lifecycle
 * - Database persistence (JSON file for now)
 * - Part lookup and queries
 */

import { Part } from './Part.js';

export class PartManager {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.parts = new Map(); // Map of id -> Part instance
        this.databasePath = 'project-data.json'; // Default project file
        
        console.log('🏗️ PartManager initialized');
    }
    
    // Create a new part and add it to the collection
    createPart(partData) {
        console.log('🆕 PartManager: Creating new part', partData);
        
        const part = new Part(partData);
        this.parts.set(part.id, part);
        
        // Immediate database save
        this.saveToDatabase();
        
        console.log(`✅ PartManager: Part ${part.id} created and saved`);
        return part;
    }
    
    // Get part by ID
    getPart(id) {
        return this.parts.get(id);
    }
    
    // Get all parts
    getAllParts() {
        return Array.from(this.parts.values());
    }
    
    // Get parts by type
    getPartsByType(type) {
        return this.getAllParts().filter(part => part.type === type);
    }
    
    // Get all board parts (most common query)
    getBoards() {
        return this.getPartsByType('board');
    }
    
    // Update a part in the database (called by Part.saveToDatabase())
    updatePart(part) {
        console.log(`💾 PartManager: Updating part ${part.id} in database`);
        
        if (!this.parts.has(part.id)) {
            console.error(`❌ PartManager: Part ${part.id} not found in collection`);
            return;
        }
        
        // Update the timestamp
        part.modified = Date.now();
        
        // Immediate database save
        this.saveToDatabase();
        
        console.log(`✅ PartManager: Part ${part.id} updated in database`);
    }
    
    // Remove a part from collection and database
    removePart(id) {
        console.log(`🗑️ PartManager: Removing part ${id}`);
        
        const part = this.parts.get(id);
        if (part) {
            // Dispose mesh if it exists
            if (part.mesh) {
                part.mesh.dispose();
            }
            
            // Remove from collection
            this.parts.delete(id);
            
            // Update database
            this.saveToDatabase();
            
            console.log(`✅ PartManager: Part ${id} removed`);
        } else {
            console.warn(`⚠️ PartManager: Part ${id} not found for removal`);
        }
    }
    
    // Save entire parts collection to database
    saveToDatabase() {
        try {
            const projectData = {
                projectId: this.getProjectId(),
                lastModified: Date.now(),
                parts: this.getAllParts().map(part => part.toJSON())
            };
            
            // For now, save to localStorage (later will be server-side)
            const dataString = JSON.stringify(projectData, null, 2);
            localStorage.setItem('cutlist_project_data', dataString);
            
            console.log(`💾 PartManager: Saved ${this.parts.size} parts to database`);
            
            // Also save to file system if possible (for debugging)
            this.saveToFileSystem(dataString);
            
        } catch (error) {
            console.error('❌ PartManager: Failed to save to database:', error);
        }
    }
    
    // Load parts from database
    loadFromDatabase() {
        try {
            console.log('📖 PartManager: Loading from database');
            
            // Load from localStorage first
            const dataString = localStorage.getItem('cutlist_project_data');
            if (!dataString) {
                console.log('📖 PartManager: No existing project data found');
                return;
            }
            
            const projectData = JSON.parse(dataString);
            
            // Clear existing parts
            this.clearAllParts();
            
            // Load each part
            if (projectData.parts && Array.isArray(projectData.parts)) {
                projectData.parts.forEach(partData => {
                    const part = new Part(partData);
                    this.parts.set(part.id, part);
                    console.log(`📖 PartManager: Loaded part ${part.id}`);
                });
            }
            
            console.log(`✅ PartManager: Loaded ${this.parts.size} parts from database`);
            
        } catch (error) {
            console.error('❌ PartManager: Failed to load from database:', error);
        }
    }
    
    // Create meshes for all loaded parts
    createAllMeshes(scene) {
        console.log('🎨 PartManager: Creating meshes for all parts');
        
        const meshes = [];
        this.getAllParts().forEach(part => {
            const mesh = part.createMesh(scene);
            meshes.push(mesh);
        });
        
        console.log(`✅ PartManager: Created ${meshes.length} meshes`);
        return meshes;
    }
    
    // Clear all parts (for loading new project)
    clearAllParts() {
        console.log('🧹 PartManager: Clearing all parts');
        
        // Dispose all meshes
        this.getAllParts().forEach(part => {
            if (part.mesh) {
                part.mesh.dispose();
            }
        });
        
        // Clear collection
        this.parts.clear();
        
        console.log('✅ PartManager: All parts cleared');
    }
    
    // Get project ID (for now, just a default)
    getProjectId() {
        return localStorage.getItem('cutlist_project_id') || 'default_project';
    }
    
    // Set project ID
    setProjectId(id) {
        localStorage.setItem('cutlist_project_id', id);
    }
    
    // Save to file system for debugging (will work in development)
    saveToFileSystem(dataString) {
        try {
            // This will only work in local development
            if (typeof window !== 'undefined' && window.drawingWorld && window.drawingWorld.saveProjectToFile) {
                window.drawingWorld.saveProjectToFile(dataString);
            }
        } catch (error) {
            // Silently fail - this is just for debugging
        }
    }
    
    // Cut a part into two new parts
    cutPart(partId, cutData) {
        console.log(`✂️ PartManager: Cutting part ${partId}`, cutData);
        
        const originalPart = this.getPart(partId);
        if (!originalPart) {
            console.error(`❌ PartManager: Part ${partId} not found for cutting`);
            return null;
        }
        
        // Calculate new dimensions based on cut
        const { piece1Dimensions, piece2Dimensions, piece1Position, piece2Position } = this.calculateCutPieces(originalPart, cutData);
        
        // Create first piece
        const piece1 = this.createPart({
            type: originalPart.type,
            dimensions: piece1Dimensions,
            position: piece1Position,
            rotation: { ...originalPart.rotation }, // Inherit rotation
            material: { ...originalPart.material }, // Inherit material
            parentId: originalPart.id,
            grain: originalPart.grain,
            grade: originalPart.grade
        });
        
        // Create second piece
        const piece2 = this.createPart({
            type: originalPart.type,
            dimensions: piece2Dimensions,
            position: piece2Position,
            rotation: { ...originalPart.rotation }, // Inherit rotation
            material: { ...originalPart.material }, // Inherit material
            parentId: originalPart.id,
            grain: originalPart.grain,
            grade: originalPart.grade
        });
        
        // Add children to original part's record
        originalPart.childIds.push(piece1.id, piece2.id);
        originalPart.cutHistory.push({
            timestamp: Date.now(),
            cutType: cutData.type,
            cutPosition: cutData.position,
            resultingParts: [piece1.id, piece2.id]
        });
        
        // Remove original part
        this.removePart(partId);
        
        console.log(`✅ PartManager: Part ${partId} cut into ${piece1.id} and ${piece2.id}`);
        
        return { piece1, piece2 };
    }
    
    // Calculate the dimensions and positions of cut pieces
    calculateCutPieces(originalPart, cutData) {
        const { type: cutType, position: cutPos, kerfWidth } = cutData;
        const dims = originalPart.dimensions;
        const pos = originalPart.position;
        
        let piece1Dimensions, piece2Dimensions, piece1Position, piece2Position;
        
        if (cutType === 'cross') {
            // Cross cut (across width/grain)
            const cutPositionInches = cutPos * dims.width;
            const kerfInches = kerfWidth || 0.125; // Default 1/8" kerf
            
            piece1Dimensions = {
                length: dims.length,
                width: cutPositionInches - (kerfInches / 2),
                thickness: dims.thickness
            };
            
            piece2Dimensions = {
                length: dims.length,
                width: dims.width - cutPositionInches - (kerfInches / 2),
                thickness: dims.thickness
            };
            
            // Position pieces with kerf gap
            const offsetCm = ((cutPositionInches - dims.width / 2) * 2.54);
            const kerfOffsetCm = (kerfInches * 2.54) / 2;
            
            piece1Position = {
                x: pos.x - kerfOffsetCm + (piece1Dimensions.width * 2.54) / 2 - (dims.width * 2.54) / 2,
                y: pos.y,
                z: pos.z
            };
            
            piece2Position = {
                x: pos.x + kerfOffsetCm - (piece2Dimensions.width * 2.54) / 2 + (dims.width * 2.54) / 2,
                y: pos.y,
                z: pos.z
            };
            
        } else { // rip cut
            // Rip cut (along length/grain)
            const cutPositionInches = cutPos * dims.length;
            const kerfInches = kerfWidth || 0.125;
            
            piece1Dimensions = {
                length: cutPositionInches - (kerfInches / 2),
                width: dims.width,
                thickness: dims.thickness
            };
            
            piece2Dimensions = {
                length: dims.length - cutPositionInches - (kerfInches / 2),
                width: dims.width,
                thickness: dims.thickness
            };
            
            // Position pieces with kerf gap
            const offsetCm = ((cutPositionInches - dims.length / 2) * 2.54);
            const kerfOffsetCm = (kerfInches * 2.54) / 2;
            
            piece1Position = {
                x: pos.x,
                y: pos.y,
                z: pos.z - kerfOffsetCm + (piece1Dimensions.length * 2.54) / 2 - (dims.length * 2.54) / 2
            };
            
            piece2Position = {
                x: pos.x,
                y: pos.y,
                z: pos.z + kerfOffsetCm - (piece2Dimensions.length * 2.54) / 2 + (dims.length * 2.54) / 2
            };
        }
        
        return { piece1Dimensions, piece2Dimensions, piece1Position, piece2Position };
    }
    
    // Get debug info
    getDebugInfo() {
        return {
            totalParts: this.parts.size,
            boards: this.getBoards().length,
            parts: this.getAllParts().map(part => ({
                id: part.id,
                type: part.type,
                position: part.position,
                rotation: part.rotation,
                dimensions: part.dimensions,
                modified: new Date(part.modified).toISOString()
            }))
        };
    }
}