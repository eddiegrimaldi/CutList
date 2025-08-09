/**
 * ViewCube - 3D navigation widget for camera control
 * Provides orthographic views and free rotation
 */
class ViewCube {
    constructor(scene, camera, canvas) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        
        // ViewCube settings
        this.size = 50; // Size in pixels
        this.position = { x: 0.92, y: 0.92 }; // Relative position (0-1)
        this.cubeSize = 1.5;
        
        // Create separate scene for ViewCube
        this.viewCubeScene = new BABYLON.Scene(scene.getEngine());
        this.viewCubeScene.autoClear = false;
        this.viewCubeScene.clearColor = new BABYLON.Color4(0.9, 0.9, 0.9, 1);  // Light gray background
        
        // Create ViewCube camera
        this.viewCubeCamera = new BABYLON.ArcRotateCamera(
            "viewCubeCamera",
            0, 0, 5,
            BABYLON.Vector3.Zero(),
            this.viewCubeScene
        );
        this.viewCubeCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        this.viewCubeCamera.orthoLeft = -2;
        this.viewCubeCamera.orthoRight = 2;
        this.viewCubeCamera.orthoBottom = -2;
        this.viewCubeCamera.orthoTop = 2;
        
        // Create the cube mesh
        this.createViewCube();
        
        // Setup viewport
        this.setupViewport();
        
        // Setup interaction
        this.setupInteraction();
        
        // Sync with main camera
        this.syncWithMainCamera();
        
        // Delay render registration to ensure scene is ready
        setTimeout(() => {
            // Register render callback
            this.scene.registerAfterRender(() => this.render());
        }, 100);
    }
    
    createViewCube() {
        // Create cube
        this.cube = BABYLON.MeshBuilder.CreateBox("viewCube", {
            size: this.cubeSize
        }, this.viewCubeScene);
        
        // Create materials for each face
        const faceData = [
            { name: "Front", color: new BABYLON.Color3(0.9, 0.9, 0.9) },
            { name: "Back", color: new BABYLON.Color3(0.9, 0.9, 0.9) },
            { name: "Top", color: new BABYLON.Color3(0.85, 0.85, 0.85) },
            { name: "Bottom", color: new BABYLON.Color3(0.85, 0.85, 0.85) },
            { name: "Right", color: new BABYLON.Color3(0.8, 0.8, 0.8) },
            { name: "Left", color: new BABYLON.Color3(0.8, 0.8, 0.8) }
        ];
        
        // Create multi-material
        const multiMat = new BABYLON.MultiMaterial("viewCubeMulti", this.viewCubeScene);
        
        faceData.forEach((face, index) => {
            const mat = new BABYLON.StandardMaterial(face.name + "Mat", this.viewCubeScene);
            mat.diffuseColor = face.color;
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            multiMat.subMaterials.push(mat);
            
            // Create text for face label
            this.createFaceLabel(face.name, index);
        });
        
        this.cube.material = multiMat;
        this.cube.subMeshes = [];
        
        // Define submeshes for each face
        // Order: front, back, top, bottom, right, left
        const verticesPerFace = 4;
        const indicesPerFace = 6;
        
        for (let i = 0; i < 6; i++) {
            this.cube.subMeshes.push(new BABYLON.SubMesh(
                i, 0, verticesPerFace,
                i * indicesPerFace, indicesPerFace,
                this.cube
            ));
        }
        
        // Add edges
        this.cube.enableEdgesRendering();
        this.cube.edgesWidth = 2.0;
        this.cube.edgesColor = new BABYLON.Color4(0.3, 0.3, 0.3, 1);
        
        // Add lighting
        const light = new BABYLON.HemisphericLight("viewCubeLight", 
            new BABYLON.Vector3(0, 1, 0), this.viewCubeScene);
        light.intensity = 0.8;
    }
    
    createFaceLabel(text, faceIndex) {
        // Create dynamic texture for text
        const size = 256;
        const texture = new BABYLON.DynamicTexture("faceText" + faceIndex, 
            {width: size, height: size}, this.viewCubeScene);
        const ctx = texture.getContext();
        
        // Clear and draw text
        ctx.clearRect(0, 0, size, size);
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = "#333333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, size/2, size/2);
        texture.update();
        
        // Create plane for label
        const plane = BABYLON.MeshBuilder.CreatePlane("label" + faceIndex, {
            size: this.cubeSize * 0.6
        }, this.viewCubeScene);
        
        const labelMat = new BABYLON.StandardMaterial("labelMat" + faceIndex, this.viewCubeScene);
        labelMat.diffuseTexture = texture;
        labelMat.specularColor = new BABYLON.Color3(0, 0, 0);
        labelMat.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        labelMat.backFaceCulling = false;
        plane.material = labelMat;
        
        // Position plane on cube face
        const offset = this.cubeSize / 2 + 0.01;
        switch(faceIndex) {
            case 0: // Front
                plane.position.z = offset;
                break;
            case 1: // Back
                plane.position.z = -offset;
                plane.rotation.y = Math.PI;
                break;
            case 2: // Top
                plane.position.y = offset;
                plane.rotation.x = -Math.PI/2;
                break;
            case 3: // Bottom
                plane.position.y = -offset;
                plane.rotation.x = Math.PI/2;
                break;
            case 4: // Right
                plane.position.x = offset;
                plane.rotation.y = Math.PI/2;
                break;
            case 5: // Left
                plane.position.x = -offset;
                plane.rotation.y = -Math.PI/2;
                break;
        }
        
        plane.parent = this.cube;
    }
    
    setupViewport() {
        // Calculate viewport size and position
        const engine = this.scene.getEngine();
        if (!engine) return;
        
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        
        if (width <= 0 || height <= 0) return;
        
        const vpSize = this.size * 2; // Actual viewport size in pixels
        const vpX = width * this.position.x - vpSize/2;
        const vpY = height * (1 - this.position.y) - vpSize/2;  // Invert Y for screen coordinates
        
        // Set viewport for ViewCube camera
        this.viewCubeCamera.viewport = new BABYLON.Viewport(
            vpX / width,
            vpY / height,
            vpSize / width,
            vpSize / height
        );
    }
    
    setupInteraction() {
        // Track mouse state
        this.isDragging = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        
        // Store bound event handlers for removal
        this.onPointerDown = (evt) => {
            const pick = this.pickViewCube(evt);
            if (pick && pick.hit) {
                this.isDragging = true;
                this.lastPointerX = evt.clientX;
                this.lastPointerY = evt.clientY;
                
                // Check if clicked on a face
                const faceNormal = pick.getNormal(true);
                if (faceNormal) {
                    this.snapToFace(faceNormal);
                }
                
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
        };
        
        // Add click handler for face selection
        this.canvas.addEventListener("pointerdown", this.onPointerDown, true);
        
        // Add drag handler for rotation
        this.onPointerMove = (evt) => {
            if (this.isDragging) {
                const deltaX = evt.clientX - this.lastPointerX;
                const deltaY = evt.clientY - this.lastPointerY;
                
                // Rotate main camera
                this.camera.alpha -= deltaX * 0.01;
                this.camera.beta -= deltaY * 0.01;
                
                // Clamp beta to prevent flipping
                if (this.camera.beta < 0.01) this.camera.beta = 0.01;
                if (this.camera.beta > Math.PI - 0.01) this.camera.beta = Math.PI - 0.01;
                
                this.lastPointerX = evt.clientX;
                this.lastPointerY = evt.clientY;
                
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
        };
        this.canvas.addEventListener("pointermove", this.onPointerMove, true);
        
        // Release drag
        this.onPointerUp = (evt) => {
            if (this.isDragging) {
                this.isDragging = false;
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            }
        };
        this.canvas.addEventListener("pointerup", this.onPointerUp, true);
    }
    
    pickViewCube(evt) {
        // Check if pointer is in ViewCube viewport
        const engine = this.scene.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        
        const vpSize = this.size * 2;
        const vpX = width * this.position.x - vpSize/2;
        const vpY = height * this.position.y - vpSize/2;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        
        if (x >= vpX && x <= vpX + vpSize &&
            y >= vpY && y <= vpY + vpSize) {
            
            // Perform picking in ViewCube scene
            const pickX = ((x - vpX) / vpSize) * 2 - 1;
            const pickY = -((y - vpY) / vpSize) * 2 + 1;
            
            const ray = this.viewCubeScene.createPickingRay(
                pickX * width, pickY * height, 
                BABYLON.Matrix.Identity(), 
                this.viewCubeCamera
            );
            
            return this.viewCubeScene.pickWithRay(ray);
        }
        
        return null;
    }
    
    snapToFace(normal) {
        // Determine which face was clicked based on normal
        const threshold = 0.9;
        let targetAlpha = this.camera.alpha;
        let targetBeta = this.camera.beta;
        
        if (Math.abs(normal.z) > threshold) {
            // Front/Back
            targetAlpha = normal.z > 0 ? 0 : Math.PI;
            targetBeta = Math.PI / 2;
        } else if (Math.abs(normal.x) > threshold) {
            // Right/Left  
            targetAlpha = normal.x > 0 ? Math.PI / 2 : -Math.PI / 2;
            targetBeta = Math.PI / 2;
        } else if (Math.abs(normal.y) > threshold) {
            // Top/Bottom
            targetBeta = normal.y > 0 ? 0 : Math.PI;
        }
        
        // Animate camera to target position
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraSnapAlpha", this.camera, "alpha",
            30, 15, this.camera.alpha, targetAlpha,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraSnapBeta", this.camera, "beta",
            30, 15, this.camera.beta, targetBeta,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }
    
    syncWithMainCamera() {
        // Sync ViewCube orientation with main camera
        this.viewCubeCamera.alpha = this.camera.alpha;
        this.viewCubeCamera.beta = this.camera.beta;
    }
    
    render() {
        // Ensure engine and viewport are ready
        const engine = this.scene.getEngine();
        if (!engine || !engine.viewport) {
            return;
        }
        
        // Update viewport (in case window resized)
        this.setupViewport();
        
        // Sync camera orientation
        this.syncWithMainCamera();
        
        // Save current viewport
        const oldViewport = engine.viewport.clone ? engine.viewport.clone() : engine.viewport;
        
        // Set ViewCube viewport
        if (this.viewCubeCamera.viewport) {
            engine.setViewport(this.viewCubeCamera.viewport);
            
            // Clear and render ViewCube scene
            this.viewCubeScene.autoClear = true;
            this.viewCubeScene.render();
            this.viewCubeScene.autoClear = false;
            
            // Restore main viewport
            engine.setViewport(oldViewport);
        }
    }
    
    dispose() {
        // Remove event listeners
        if (this.onPointerDown) {
            this.canvas.removeEventListener("pointerdown", this.onPointerDown, true);
        }
        if (this.onPointerMove) {
            this.canvas.removeEventListener("pointermove", this.onPointerMove, true);
        }
        if (this.onPointerUp) {
            this.canvas.removeEventListener("pointerup", this.onPointerUp, true);
        }
        
        // Dispose scene
        this.viewCubeScene.dispose();
    }
}

// Export for use in drawing-world.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewCube;
}
