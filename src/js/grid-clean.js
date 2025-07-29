// grid-clean.js
// Dynamic Grid System for CutList - Clean version without debug logging

class DynamicGrid {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Grid state
        this.visible = true;
        this.grids = [];
        
        // Grid scale levels (in inches) - Proper LOD sequence for woodworking
        this.scales = [
            // Fine detail grids (zoomed in)
            { size: 8, divisions: 256, name: '1/32"', color: 0xeeeeee, opacity: 0.3 },
            { size: 16, divisions: 256, name: '1/16"', color: 0xdddddd, opacity: 0.4 },
            { size: 32, divisions: 256, name: '1/8"', color: 0xcccccc, opacity: 0.5 },
            { size: 48, divisions: 192, name: '1/4"', color: 0xbbbbbb, opacity: 0.6 },
            
            // Medium scale grids
            { size: 96, divisions: 192, name: '1/2"', color: 0xaaaaaa, opacity: 0.7 },
            { size: 144, divisions: 144, name: '1"', color: 0x999999, opacity: 0.8 },
            { size: 240, divisions: 120, name: '2"', color: 0x888888, opacity: 0.85 },
            
            // Coarse grids (zoomed out)
            { size: 360, divisions: 120, name: '3"', color: 0x777777, opacity: 0.9 }
        ];
        
        // Current active scales based on zoom
        this.activeScales = [];
        this.lastCameraDistance = 0;
        this.updateThreshold = 2;
        
        this.init();
    }

    init() {
        this.createAllGrids();
        this.updateGridVisibility();
    }

    /**
     * Create all grid levels
     */
    createAllGrids() {
        // Clear existing grids
        this.grids.forEach(grid => {
            if (grid.object) {
                this.scene.remove(grid.object);
            }
            if (grid.majorLines) {
                this.scene.remove(grid.majorLines);
            }
        });
        this.grids = [];

        // Create each scale level
        this.scales.forEach(scale => {
            // Create main grid
            const gridHelper = new THREE.GridHelper(
                scale.size, 
                scale.divisions, 
                scale.color,
                scale.color
            );
            
            // Make lines thin and crisp
            gridHelper.material.transparent = true;
            gridHelper.material.opacity = scale.opacity;
            gridHelper.material.linewidth = 1;
            
            // Keep on XZ plane
            gridHelper.rotation.x = 0;
            gridHelper.position.set(0, 0, 0);
            
            // Create major lines every 12 divisions
            let majorLines = null;
            if (scale.divisions >= 12) {
                const majorDivisions = Math.floor(scale.divisions / 12);
                if (majorDivisions > 1) {
                    majorLines = new THREE.GridHelper(
                        scale.size,
                        majorDivisions,
                        0x333333,
                        0x333333
                    );
                    majorLines.material.transparent = true;
                    majorLines.material.opacity = Math.min(scale.opacity + 0.3, 1.0);
                    majorLines.material.linewidth = 2;
                    majorLines.rotation.x = 0;
                    majorLines.position.set(0, 0.01, 0);
                }
            }
            
            const gridData = {
                object: gridHelper,
                majorLines: majorLines,
                scale: scale,
                visible: false
            };
            
            this.grids.push(gridData);
            this.scene.add(gridHelper);
            if (majorLines) {
                this.scene.add(majorLines);
            }
            gridHelper.visible = false;
            if (majorLines) majorLines.visible = false;
        });
    }

    /**
     * Update grid visibility based on camera distance/zoom
     */
    updateGridVisibility() {
        if (!this.visible) {
            this.grids.forEach(grid => {
                grid.object.visible = false;
                if (grid.majorLines) grid.majorLines.visible = false;
            });
            return;
        }

        // For orthographic camera, use zoom level
        let zoomFactor;
        if (this.camera.isOrthographicCamera) {
            zoomFactor = this.camera.zoom;
        } else {
            const cameraDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
            zoomFactor = 30 / cameraDistance;
        }

        // Only update if zoom changed significantly
        if (Math.abs(zoomFactor - this.lastCameraDistance) < 0.01) {
            return;
        }
        this.lastCameraDistance = zoomFactor;

        // Determine which grids should be visible based on zoom level
        this.grids.forEach(grid => {
            let shouldShow = false;
            const scale = grid.scale;

            // Zoom-based LOD: higher zoom = more detail
            if (scale.name === '1/32"') {
                shouldShow = zoomFactor >= 8.0;
            } else if (scale.name === '1/16"') {
                shouldShow = zoomFactor >= 4.0 && zoomFactor < 8.0;
            } else if (scale.name === '1/8"') {
                shouldShow = zoomFactor >= 2.0 && zoomFactor < 4.0;
            } else if (scale.name === '1/4"') {
                shouldShow = zoomFactor >= 1.0 && zoomFactor < 2.0;
            } else if (scale.name === '1/2"') {
                shouldShow = zoomFactor >= 0.5 && zoomFactor < 1.0;
            } else if (scale.name === '1"') {
                shouldShow = zoomFactor >= 0.25 && zoomFactor < 0.5;
            } else if (scale.name === '2"') {
                shouldShow = zoomFactor >= 0.1 && zoomFactor < 0.25;
            } else if (scale.name === '3"') {
                shouldShow = zoomFactor < 0.1;
            }
            
            grid.object.visible = shouldShow && this.visible;
            if (grid.majorLines) {
                grid.majorLines.visible = shouldShow && this.visible;
            }
            grid.visible = shouldShow;
        });

        // Update UI
        if (typeof window !== 'undefined' && window.cutListApp && window.cutListApp.updateGridStatusDisplay) {
            window.cutListApp.updateGridStatusDisplay();
        }
    }

    /**
     * Update grid for camera changes
     */
    update() {
        this.updateGridVisibility();
    }

    /**
     * Toggle grid visibility
     */
    toggle() {
        this.visible = !this.visible;
        this.updateGridVisibility();
    }

    /**
     * Show grid
     */
    show() {
        this.visible = true;
        this.updateGridVisibility();
    }

    /**
     * Hide grid
     */
    hide() {
        this.visible = false;
        this.updateGridVisibility();
    }

    /**
     * Get current snap size based on active grids
     */
    getCurrentSnapSize() {
        for (let i = 0; i < this.grids.length; i++) {
            if (this.grids[i].visible) {
                const scale = this.grids[i].scale;
                const snapSize = scale.size / scale.divisions;
                
                if (snapSize === 1/32) return '1/32';
                else if (snapSize === 1/16) return '1/16';
                else if (snapSize === 1/8) return '1/8';
                else if (snapSize === 1/4) return '1/4';
                else if (snapSize === 1/2) return '1/2';
                else return snapSize.toString();
            }
        }
        return '1/4';
    }

    /**
     * Snap coordinates to the current active grid
     */
    snapToGrid(x, z) {
        let snapSize = 0.25;
        for (let i = 0; i < this.grids.length; i++) {
            if (this.grids[i].visible) {
                const scale = this.grids[i].scale;
                snapSize = scale.size / scale.divisions;
                break;
            }
        }
        
        return {
            x: Math.round(x / snapSize) * snapSize,
            y: Math.round(z / snapSize) * snapSize
        };
    }

    /**
     * Get grid information for UI display
     */
    getGridInfo() {
        const activeGrids = this.grids.filter(g => g.visible);
        if (activeGrids.length === 0) return 'Grid: Off';
        
        const finestGrid = activeGrids[0];
        return `Grid: ${finestGrid.scale.name}`;
    }

    /**
     * Force update grid visibility
     */
    forceUpdate() {
        this.lastCameraDistance = -999;
        this.updateGridVisibility();
    }

    /**
     * Dispose of all grid objects
     */
    dispose() {
        this.grids.forEach(grid => {
            if (grid.object) {
                this.scene.remove(grid.object);
                if (grid.object.geometry) grid.object.geometry.dispose();
                if (grid.object.material) grid.object.material.dispose();
            }
            if (grid.majorLines) {
                this.scene.remove(grid.majorLines);
                if (grid.majorLines.geometry) grid.majorLines.geometry.dispose();
                if (grid.majorLines.material) grid.majorLines.material.dispose();
            }
        });
        this.grids = [];
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicGrid;
} else {
    window.DynamicGrid = DynamicGrid;
}
