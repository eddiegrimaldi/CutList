// ViewCube Navigation - Professional CAD-style navigation cube
// Provides smooth camera transitions to orthographic views

export class ViewCube {
    constructor(scene, mainCamera, canvas) {
        this.scene = scene;
        this.mainCamera = mainCamera;
        this.canvas = canvas;
          // ViewCube properties
        this.cubeSize = 1.0;
        this.position = new BABYLON.Vector3(0, 0, 0);
        this.cube = null;
        this.faceMaterials = [];
        this.viewCubeCamera = null;
        
        // Animation properties
        this.isAnimating = false;
        this.animationDuration = 1000; // 1 second smooth transitions
        
        // Face definitions with labels and camera positions
        this.faces = {
            front: {
                label: 'FRONT',
                normal: new BABYLON.Vector3(0, 0, 1),
                cameraPos: new BABYLON.Vector3(0, 0, 50),
                upVector: new BABYLON.Vector3(0, 1, 0)
            },
            back: {
                label: 'BACK',
                normal: new BABYLON.Vector3(0, 0, -1),
                cameraPos: new BABYLON.Vector3(0, 0, -50),
                upVector: new BABYLON.Vector3(0, 1, 0)
            },
            left: {
                label: 'LEFT',
                normal: new BABYLON.Vector3(-1, 0, 0),
                cameraPos: new BABYLON.Vector3(-50, 0, 0),
                upVector: new BABYLON.Vector3(0, 1, 0)
            },
            right: {
                label: 'RIGHT',
                normal: new BABYLON.Vector3(1, 0, 0),
                cameraPos: new BABYLON.Vector3(50, 0, 0),
                upVector: new BABYLON.Vector3(0, 1, 0)
            },
            top: {
                label: 'TOP',
                normal: new BABYLON.Vector3(0, 1, 0),
                cameraPos: new BABYLON.Vector3(0, 50, 0),
                upVector: new BABYLON.Vector3(0, 0, -1)
            },
            bottom: {
                label: 'BOTTOM',
                normal: new BABYLON.Vector3(0, -1, 0),
                cameraPos: new BABYLON.Vector3(0, -50, 0),
                upVector: new BABYLON.Vector3(0, 0, 1)
            }
        };
        
    }    // Create the ViewCube mesh with labeled faces
    createViewCube() {
        
        // Create cube geometry with larger size for visibility
        this.cube = BABYLON.MeshBuilder.CreateBox("viewCube", {
            size: this.cubeSize * 3, // Make it even larger for testing
            updatable: false
        }, this.scene);
        
        // Position the cube in a visible location - right at origin for testing
        this.cube.position = new BABYLON.Vector3(0, 8, 0); // Above origin
        
        // Create bright, emissive material for maximum visibility
        const material = new BABYLON.StandardMaterial("viewCubeMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 0); // Bright yellow
        material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0); // Yellow glow
        material.specularColor = new BABYLON.Color3(0, 0, 0); // No specular
        this.cube.material = material;
        
        // Make cube pickable for face detection
        this.cube.isPickable = true;
        
        // Store reference in metadata
        this.cube.metadata = {
            isViewCube: true,
            viewCubeInstance: this
        };
        
        
        return this.cube;
    }

    // Create materials for each face with labels
    createFaceMaterials() {
        
        const faceNames = Object.keys(this.faces);
        
        faceNames.forEach((faceName, index) => {
            const face = this.faces[faceName];
            
            // Create material for this face
            const material = new BABYLON.StandardMaterial(`viewCube_${faceName}`, this.scene);
            
            // Set face color - different colors for easy identification
            switch(faceName) {
                case 'front': material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9); break; // Light blue
                case 'back': material.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.8); break;  // Light red
                case 'left': material.diffuseColor = new BABYLON.Color3(0.8, 0.9, 0.8); break;  // Light green
                case 'right': material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.8); break; // Light yellow
                case 'top': material.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.9); break;   // Light magenta
                case 'bottom': material.diffuseColor = new BABYLON.Color3(0.8, 0.9, 0.9); break; // Light cyan
            }
            
            // Add some specular for nice appearance
            material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            // Store material reference
            this.faceMaterials.push(material);
            
        });
    }    // Apply materials to cube faces
    applyFaceMaterials() {
        // Create multi-material for individual face control
        const multiMat = new BABYLON.MultiMaterial("viewCubeMultiMat", this.scene);
        
        // Add all face materials
        this.faceMaterials.forEach(material => {
            multiMat.subMaterials.push(material);
        });
        
        // Apply multi-material to cube
        this.cube.material = multiMat;
        
        // Set face material indices for each face
        // Babylon.js box faces: 0=front, 1=back, 2=right, 3=left, 4=top, 5=bottom
        const faceIndices = [0, 1, 2, 3, 4, 5]; // Maps to our face materials array
        this.cube.subMeshes = [];
        
        // Create submeshes for each face
        faceIndices.forEach((materialIndex, faceIndex) => {
            const verticesStart = faceIndex * 4;
            const indicesStart = faceIndex * 6;
            
            new BABYLON.SubMesh(
                materialIndex, 
                verticesStart, 4,     // vertex start, count
                indicesStart, 6,      // index start, count
                this.cube
            );
        });
        
    }    // Position ViewCube in upper right corner of screen
    positionInScreenCorner() {
        if (!this.cube) return;
        
        // Completely hide the ViewCube for now - Master doesn't want it cluttering the scene
        this.cube.dispose(); // Remove it entirely from the scene
        this.cube = null;
        
    }

    // Create a separate camera for ViewCube rendering
    createViewCubeCamera() {
        if (this.viewCubeCamera) return;
        
        // Create a small viewport camera for the ViewCube
        this.viewCubeCamera = new BABYLON.ArcRotateCamera(
            "viewCubeCamera",
            0, 0, 5,
            BABYLON.Vector3.Zero(),
            this.scene
        );
        
        // Set viewport to upper right corner (relative coordinates)
        const size = 120; // ViewCube area size in pixels
        const margin = 10; // Margin from edges
        
        this.viewCubeCamera.viewport = new BABYLON.Viewport(
            1 - (size + margin) / this.canvas.width,  // x position (right side)
            1 - (size + margin) / this.canvas.height, // y position (top)
            size / this.canvas.width,                 // width
            size / this.canvas.height                 // height
        );
        
        // Configure camera
        this.viewCubeCamera.setTarget(BABYLON.Vector3.Zero());
        this.viewCubeCamera.radius = 5;
        this.viewCubeCamera.alpha = Math.PI / 4;
        this.viewCubeCamera.beta = Math.PI / 3;
        
        // Add to scene's active cameras
        this.scene.activeCameras.push(this.viewCubeCamera);
        
    }

    // Handle ViewCube face click
    handleFaceClick(pickedMesh, pickInfo) {
        if (!pickedMesh || !pickedMesh.metadata || !pickedMesh.metadata.isViewCube) {
            return false;
        }
        
        
        // Determine which face was clicked based on pick normal
        const faceHit = this.determineFaceFromPick(pickInfo);
        
        if (faceHit) {
            this.animateToFaceView(faceHit);
        }
        
        return true;
    }

    // Determine which face was clicked based on pick information
    determineFaceFromPick(pickInfo) {
        if (!pickInfo || !pickInfo.getNormal) {
            return null;
        }
        
        const normal = pickInfo.getNormal(true, true);
        
        // Find closest face based on normal
        let closestFace = null;
        let closestDot = -1;
        
        Object.keys(this.faces).forEach(faceName => {
            const face = this.faces[faceName];
            const dot = BABYLON.Vector3.Dot(normal, face.normal);
            
            if (dot > closestDot) {
                closestDot = dot;
                closestFace = faceName;
            }
        });
        
        return closestFace;
    }

    // Animate camera to face view
    animateToFaceView(faceName) {
        if (this.isAnimating) {
            return;
        }
        
        const face = this.faces[faceName];
        if (!face) {
            return;
        }
        
        this.isAnimating = true;
        
        // Switch to orthographic mode
        this.switchToOrthographic();
        
        // Animate camera position and target
        this.animateCameraToPosition(face.cameraPos, face.upVector, () => {
            this.isAnimating = false;
        });
    }

    // Switch camera to orthographic projection
    switchToOrthographic() {
        if (this.mainCamera instanceof BABYLON.ArcRotateCamera) {
            // For ArcRotateCamera, we'll modify its behavior
            // TODO: Implement proper orthographic mode or camera switching
        }
    }    // Animate camera to specific position
    animateCameraToPosition(targetPos, upVector, onComplete) {
        if (!this.mainCamera || !(this.mainCamera instanceof BABYLON.ArcRotateCamera)) {
            return;
        }
        
        
        const camera = this.mainCamera;
        const targetRadius = 50; // Fixed distance for orthographic-style view
        
        // Calculate target angles based on position
        const targetAlpha = Math.atan2(targetPos.x, targetPos.z);
        const targetBeta = Math.acos(targetPos.y / targetRadius);
        
        // Animate alpha (horizontal rotation)
        const alphaAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "viewCubeAlpha",
            camera,
            "alpha",
            30, // 30 FPS
            30, // 30 frames = 1 second
            camera.alpha,
            targetAlpha,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Animate beta (vertical rotation)
        const betaAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "viewCubeBeta",
            camera,
            "beta",
            30, // 30 FPS
            30, // 30 frames = 1 second
            camera.beta,
            targetBeta,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Animate radius for consistent orthographic-style distance
        const radiusAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "viewCubeRadius",
            camera,
            "radius",
            30, // 30 FPS
            30, // 30 frames = 1 second
            camera.radius,
            targetRadius,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            null,
            () => {
                // Ensure target is at origin
                camera.setTarget(BABYLON.Vector3.Zero());
                if (onComplete) onComplete();
            }
        );
    }// Update ViewCube rotation to match main camera orientation
    updateCubeRotation() {
        if (!this.cube || !this.mainCamera || !this.viewCubeCamera) return;
        
        // Sync ViewCube camera with main camera orientation for visual feedback
        if (this.mainCamera instanceof BABYLON.ArcRotateCamera) {
            this.viewCubeCamera.alpha = this.mainCamera.alpha;
            this.viewCubeCamera.beta = this.mainCamera.beta;
        }
        
        // Rotate the cube opposite to camera to show current view orientation
        this.cube.rotation.y = -this.mainCamera.alpha;
        this.cube.rotation.x = -this.mainCamera.beta + Math.PI / 2;
    }

    // Update viewport when canvas resizes
    updateViewport() {
        if (!this.viewCubeCamera || !this.canvas) return;
        
        const size = 120; // ViewCube area size in pixels
        const margin = 10; // Margin from edges
        
        this.viewCubeCamera.viewport = new BABYLON.Viewport(
            1 - (size + margin) / this.canvas.width,  // x position (right side)
            1 - (size + margin) / this.canvas.height, // y position (top)
            size / this.canvas.width,                 // width
            size / this.canvas.height                 // height
        );
    }    // Dispose ViewCube resources
    dispose() {
        
        // Remove from scene's active cameras
        if (this.viewCubeCamera && this.scene.activeCameras) {
            const index = this.scene.activeCameras.indexOf(this.viewCubeCamera);
            if (index > -1) {
                this.scene.activeCameras.splice(index, 1);
            }
            this.viewCubeCamera.dispose();
            this.viewCubeCamera = null;
        }
        
        if (this.cube) {
            this.cube.dispose();
            this.cube = null;
        }
        
        this.faceMaterials.forEach(material => {
            if (material) material.dispose();
        });
        this.faceMaterials = [];
    }
}
