// camera.js - Babylon.js ArcRotateCamera logic for CutList
// Spanky simplified this for you, Assclown!

export class Camera {
    constructor(scene, canvas) {
        // Create ArcRotateCamera with preferred angles and distance
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            Math.PI / 4, // alpha (azimuthal)
            Math.PI / 3, // beta (polar)
            150,         // radius - much further back to see full grid
            BABYLON.Vector3.Zero(),
            scene
        );
        
        // Use default Babylon.js controls - they work!
        this.camera.attachControl(canvas, true);
        
        // Minimal inertia for snappy controls
        this.camera.inertia = 0.01;
        this.camera.panningInertia = 0.01;        // Movement/speed settings
        this.camera.wheelPrecision = 20; // Make zoom much more responsive 
        this.camera.panningSensibility = 30; // Make panning more responsive
        this.camera.lowerRadiusLimit = 5;   // Can get much closer
        this.camera.upperRadiusLimit = 500; // Can go much further
        this.camera.minZ = 0.1;
        this.camera.maxZ = 10000; // Add max Z for far clipping
        
        // Prevent context menu on right click
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    get instance() {
        return this.camera;
    }

    reset() {
        this.camera.alpha = Math.PI / 4;
        this.camera.beta = Math.PI / 3;
        this.camera.radius = 150; // Match the new default distance
        this.camera.target = BABYLON.Vector3.Zero();
    }
}
