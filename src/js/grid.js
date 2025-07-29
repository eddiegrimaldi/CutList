// grid.js - Grid rendering and logic for CutList
// Spanky modularized this for Assclown!
import { Appearance } from '../appearance.js';

export class Grid {
    constructor(scene, size = 200, divisions = 100) {
        this.scene = scene;
        this.size = size;
        this.divisions = divisions;
        this.gridMesh = null;
        
    }

    create() {
        // Remove old grid if it exists
        if (this.gridMesh) {
            this.gridMesh.dispose();
        }
        // Create Babylon.js grid material and mesh
        const gridMaterial = new BABYLON.GridMaterial('gridMaterial', this.scene);
        gridMaterial.majorUnitFrequency = 10; // Major lines every 10 divisions
        gridMaterial.minorUnitVisibility = 0.6; // Make minor lines more visible
        gridMaterial.gridRatio = this.size / this.divisions;
        gridMaterial.backFaceCulling = false;
        gridMaterial.mainColor = BABYLON.Color3.FromHexString(Appearance.gridMajor);
        gridMaterial.lineColor = BABYLON.Color3.FromHexString(Appearance.gridMinor);
        gridMaterial.opacity = 0.8; // More opaque
        // Create a large ground plane for the grid
        this.gridMesh = BABYLON.MeshBuilder.CreateGround('grid', {width: this.size, height: this.size, subdivisions: this.divisions}, this.scene);
        this.gridMesh.material = gridMaterial;
        this.gridMesh.receiveShadows = false;
        this.gridMesh.isPickable = false;
        
    }

    setVisible(visible) {
        if (this.gridMesh) {
            this.gridMesh.setEnabled(visible);
        }
    }

    updateSize(size, divisions) {
        this.size = size;
        this.divisions = divisions;
        this.create();
    }
}
