/**
 * PartsManager - The Single Source of Truth
 * Just three operations: Add, Delete, Edit
 */

export class PartsManager {
    constructor() {
        this.parts = new Map();
        window.partsManager = this;
        this.createDebugDisplay();
        console.log('PartsManager initialized');
    }
    
    // ADD a part
    addPart(partData) {
        const id = partData.id || 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const part = {
            id: id,
            type: partData.type || 'board',
            location: partData.location || 'work',
            dimensions: {
                length: partData.dimensions?.length || 96,
                width: partData.dimensions?.width || 6,
                thickness: partData.dimensions?.thickness || 0.75
            },
            position: partData.position || { x: 0, y: 0, z: 0 },
            rotation: partData.rotation || { x: 0, y: 0, z: 0 },
            material: partData.material || { id: 'pine', name: 'Pine' }
        };
        
        this.parts.set(id, part);
        console.log('Added part:', id);
        this.updateDebugDisplay();
        return part;
    }
    
    // DELETE a part
    deletePart(id) {
        if (this.parts.delete(id)) {
            console.log('Deleted part:', id);
            this.updateDebugDisplay();
            return true;
        }
        return false;
    }
    
    // EDIT a part
    editPart(id, updates) {
}
    
    // Move part to different location (just edits the location property)
    movePart(id, newLocation) {
        return this.editPart(id, { location: newLocation });
        const part = this.parts.get(id);
        if (part) {
            Object.assign(part, updates);
            console.log('Edited part:', id);
            this.updateDebugDisplay();
            return part;
        }
        return null;
    }
    
    // Helper methods
    getPart(id) {
        return this.parts.get(id);
    }
    
    getAllParts() {
        return Array.from(this.parts.values());
    }
    
    getPartsAtLocation(location) {
        return this.getAllParts().filter(p => p.location === location);
    }
    
    // Debug display
    createDebugDisplay() {
        const existing = document.getElementById('parts-debug-monitor');
        if (existing) existing.remove();
        
        const monitor = document.createElement('div');
        monitor.id = 'parts-debug-monitor';
        monitor.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 12px; border: 1px solid #0f0; z-index: 10000; max-width: 400px;';
        document.body.appendChild(monitor);
        
        setInterval(() => this.updateDebugDisplay(), 500);
    }
    
    updateDebugDisplay() {
        const monitor = document.getElementById('parts-debug-monitor');
        if (!monitor) return;
        
        let html = '<div style="color: #0f0;">PARTS DATABASE</div>';
        html += '<div style="color: #888;">Total: ' + this.parts.size + '</div>';
        html += '<hr style="border-color: #0f0;">';
        
        const locations = ['work', 'mill', 'assembly', 'waste'];
        locations.forEach(loc => {
            const parts = this.getPartsAtLocation(loc);
            if (parts.length > 0) {
                html += '<div style="color: #0f0;">' + loc.toUpperCase() + ' (' + parts.length + ')</div>';
                parts.forEach(p => {
                    const d = p.dimensions;
                    html += '<div style="color: #fff; font-size: 10px;">' + p.id.substr(0, 15) + '... ' + d.length + 'x' + d.width + 'x' + d.thickness + '</div>';
                });
            }
        });
        
        monitor.innerHTML = html;
    }
}
