// Grid Renderer - Handles grid drawing and visualization

export class GridRenderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        
        // Grid settings in world coordinates
        this.majorSpacing = 100;   // Major grid lines every 100 world units
                
                // Try different engine creation approaches
                let engine;
                
                try {
                    // Try the most basic engine creation first
                    engine = new BABYLON.Engine(canvas, false);
                } catch (basicError) {
                    
                    try {
                        // Try with null context options
                        engine = new BABYLON.Engine(canvas, false, null);
                    } catch (nullError) {
                        
                        try {
                            // Try with minimal options
                            engine = new BABYLON.Engine(canvas, false, {});
                        } catch (emptyError) {
                            throw emptyError;
                        }
                    }
                }rSpacing = 20;    // Minor grid lines every 20 world units
        this.subdivisions = 4;     // Subdivisions for 5 unit precision
        
        // Colors
        this.majorColor = '#9ca3af';      // Gray-400 (major lines)
        this.minorColor = '#d1d5db';      // Gray-300 (minor lines)  
        this.subdivisionColor = '#f3f4f6'; // Gray-100 (subdivisions)
        
        // Line widths
        this.majorWidth = 1.5;        this.minorWidth = 1;
        this.subdivisionWidth = 0.5;
    }

    render() {
        if (!this.ctx || !this.camera) return;

          // Use the app's current mode instead of camera mode
        if (this.currentMode === 'modeling') {
            
            try {
                this.renderPerspectiveGrid();
            } catch (error) {
            }
            this.renderOrthographicGrid();
        }
    }

    renderPerspectiveGrid() {
        // Set a flag to prove this method is executing
        this.debugFlag = 'renderPerspectiveGrid_executed_' + Date.now();
        
        // alert('🔴 renderPerspectiveGrid is executing!');
        
        
        if (!this.scene) {
            const canvas = document.getElementById('drawingCanvas');
            if (!canvas) {
                return;
            }

            if (typeof BABYLON === 'undefined') {
                return;
            }

            // Clear any existing 2D context
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }            try {
                
                // Try to get WebGL context directly to see what happens
                const webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (webglContext) {
                }
                
                // Try WebGL2 as well
                const webgl2Context = canvas.getContext('webgl2');
                
                const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
                this.engine = engine;
                
                this.scene = new BABYLON.Scene(engine);

                // Dark background for contrast
                this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.2);// Position camera for good view of grid
            const camera = new BABYLON.ArcRotateCamera("camera", 0, Math.PI/4, 30, BABYLON.Vector3.Zero(), this.scene);
            camera.attachControls(canvas, true);
            
            // Better camera limits
            camera.lowerRadiusLimit = 5;
            camera.upperRadiusLimit = 100;

            // Bright lighting
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
            light.intensity = 2;

            // Create visible grid material
            const gridMaterial = new BABYLON.GridMaterial("grid", this.scene);
            gridMaterial.gridRatio = 2;
            gridMaterial.majorUnitFrequency = 5;
            gridMaterial.minorUnitVisibility = 0.6;
            gridMaterial.lineColor = new BABYLON.Color3(0.8, 0.8, 1); // Light blue lines
            gridMaterial.backFaceCulling = false;

            // Large ground plane
            const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
            ground.material = gridMaterial;

            // Bright reference box
            const box = BABYLON.MeshBuilder.CreateBox("reference", { size: 4 }, this.scene);
            box.position.y = 2;
            const boxMaterial = new BABYLON.StandardMaterial("boxMat", this.scene);
            boxMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Bright red
            boxMaterial.emissiveColor = new BABYLON.Color3(0.2, 0, 0); // Make it glow
            box.material = boxMaterial;            // Start render loop
            engine.runRenderLoop(() => {
                this.scene.render();
            });            window.addEventListener('resize', () => {
                engine.resize();
            });
              } catch (error) {
                return;
            }
        }
    }

    renderOrthographicGrid() {
        // Get visible bounds from camera
        const bounds = this.camera ? this.camera.getVisibleBounds() : {
            left: -200, right: 200, top: -200, bottom: 200
        };

        // Add padding to bounds to ensure smooth scrolling
        const padding = Math.max(this.majorSpacing, 100);
        const left = Math.floor((bounds.left - padding) / this.minorSpacing) * this.minorSpacing;
        const right = Math.ceil((bounds.right + padding) / this.minorSpacing) * this.minorSpacing;
        const top = Math.floor((bounds.top - padding) / this.minorSpacing) * this.minorSpacing;
        const bottom = Math.ceil((bounds.bottom + padding) / this.minorSpacing) * this.minorSpacing;

        // Minor grid lines
        this.ctx.strokeStyle = this.minorColor;
        this.ctx.lineWidth = this.minorWidth;
        this.ctx.beginPath();

        // Vertical lines
        for (let x = left; x <= right; x += this.minorSpacing) {
            this.ctx.moveTo(x, top);
            this.ctx.lineTo(x, bottom);
        }

        // Horizontal lines  
        for (let y = top; y <= bottom; y += this.minorSpacing) {
            this.ctx.moveTo(left, y);
            this.ctx.lineTo(right, y);
        }

        this.ctx.stroke();

        // Major grid lines
        this.ctx.strokeStyle = this.majorColor;
        this.ctx.lineWidth = this.majorWidth;
        this.ctx.beginPath();

        // Major vertical lines
        const majorLeft = Math.floor((bounds.left - padding) / this.majorSpacing) * this.majorSpacing;
        const majorRight = Math.ceil((bounds.right + padding) / this.majorSpacing) * this.majorSpacing;
        const majorTop = Math.floor((bounds.top - padding) / this.majorSpacing) * this.majorSpacing;
        const majorBottom = Math.ceil((bounds.bottom + padding) / this.majorSpacing) * this.majorSpacing;

        for (let x = majorLeft; x <= majorRight; x += this.majorSpacing) {
            this.ctx.moveTo(x, majorTop);
            this.ctx.lineTo(x, majorBottom);
        }

        for (let y = majorTop; y <= majorBottom; y += this.majorSpacing) {
            this.ctx.moveTo(majorLeft, y);
            this.ctx.lineTo(majorRight, y);
        }        this.ctx.stroke();
    }

    drawGridLines(bounds, spacing, color, width) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.setLineDash([]);
        
        // Calculate grid bounds with extra margin
        const margin = spacing * 2;
        const minX = Math.floor((bounds.left - margin) / spacing) * spacing;
        const maxX = Math.ceil((bounds.right + margin) / spacing) * spacing;
        const minY = Math.floor((bounds.top - margin) / spacing) * spacing;
        const maxY = Math.ceil((bounds.bottom + margin) / spacing) * spacing;
        
        this.ctx.beginPath();
        
        // Draw vertical lines
        for (let x = minX; x <= maxX; x += spacing) {
            const screenX = this.camera.worldToScreenX(x);
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.camera.height);
        }
        
        // Draw horizontal lines  
        for (let y = minY; y <= maxY; y += spacing) {
            const screenY = this.camera.worldToScreenY(y);
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.camera.width, screenY);
        }
        
        this.ctx.stroke();
    }

    // Snap point to grid
    snapToGrid(worldX, worldY, snapEnabled = true) {
        if (!snapEnabled) {
            return { x: worldX, y: worldY };
        }
        
        // Determine appropriate snap spacing based on zoom level
        let snapSpacing;
        if (this.camera.zoom > 2) {
            snapSpacing = this.minorSpacing / this.subdivisions; // 5 units
        } else if (this.camera.zoom > 0.5) {
            snapSpacing = this.minorSpacing; // 20 units
        } else {
            snapSpacing = this.majorSpacing; // 100 units
        }
        
        return {
            x: Math.round(worldX / snapSpacing) * snapSpacing,
            y: Math.round(worldY / snapSpacing) * snapSpacing
        };
    }

    // Get grid info for display
    getGridInfo() {
        let spacing, unit;
        if (this.camera.zoom > 2) {
            spacing = 5;
            unit = 'units';
        } else if (this.camera.zoom > 0.5) {
            spacing = 20;
            unit = 'units';
        } else {
            spacing = 100;
            unit = 'units';
        }
        
        return {
            spacing: spacing,
            unit: unit,
            visible: true
        };
    }

    // Method to render rulers
    renderRulers() {
        if (!this.ctx || !this.camera) return;

        this.ctx.save();

        // Top ruler
        this.ctx.fillStyle = '#f3f4f6';
        this.ctx.fillRect(0, 0, this.camera.width, 20);
        this.ctx.strokeStyle = '#9ca3af';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let x = 0; x < this.camera.width; x += 50) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 20);
            this.ctx.fillText((x / 50).toFixed(2) + ' in', x + 2, 15);
        }

        this.ctx.stroke();

        // Left ruler
        this.ctx.fillStyle = '#f3f4f6';
        this.ctx.fillRect(0, 0, 20, this.camera.height);
        this.ctx.beginPath();

        for (let y = 0; y < this.camera.height; y += 50) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(20, y);
            this.ctx.fillText((y / 50).toFixed(2) + ' in', 2, y + 15);
        }

        this.ctx.stroke();

        this.ctx.restore();
    }

    switchToModelingMode() {
        if (!this.camera) return;

        // Replace the current camera with a perspective camera
        this.camera = new PerspectiveCamera();
        this.camera.setPosition({ x: 0, y: 100, z: 200 });
        this.camera.lookAt({ x: 0, y: 0, z: 0 });

        // Adjust grid rendering for perspective view
        this.renderPerspectiveGrid();
    }    renderPerspectiveGrid() {
        
        if (!this.scene) {
            const canvas = document.getElementById('drawingCanvas');
            if (!canvas) {
                return;
            }

            if (typeof BABYLON === 'undefined') {
                return;
            }

            // Enhanced WebGL detection and debugging
            const testCanvas = document.createElement('canvas');
            
            // Try multiple WebGL contexts
            let gl = testCanvas.getContext('webgl2') || 
                     testCanvas.getContext('webgl') || 
                     testCanvas.getContext('experimental-webgl') ||
                     testCanvas.getContext('webkit-3d') ||
                     testCanvas.getContext('moz-webgl');
            
            
            if (!gl) {
                
                // Check if WebGL is disabled
                try {
                    const webglCanvas = document.createElement('canvas');
                    const debugInfo = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl');
                    if (debugInfo) {
                        const debugExtension = debugInfo.getExtension('WEBGL_debug_renderer_info');
                        if (debugExtension) {
                        }
                    }
                } catch (e) {
                }
                
                this.render2DPerspectiveFallback();
                return;
            }

            // Clear any existing 2D context
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            try {
                
                // Try different engine options for better compatibility
                const engineOptions = {
                    antialias: true,
                    stencil: true,
                    preserveDrawingBuffer: false,
                    powerPreference: "default",
                    doNotHandleContextLost: false,
                    audioEngine: false
                };
                
                const engine = new BABYLON.Engine(canvas, true, engineOptions);
                
                this.engine = engine;
                this.scene = new BABYLON.Scene(engine);

                    webGLVersion: engine.webGLVersion,
                    isWebGPU: engine.isWebGPU,
                    caps: engine.getCaps()
                });

                // Dark background for contrast
                this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.2);

                // Position camera for good view of grid
                const camera = new BABYLON.ArcRotateCamera("camera", 0, Math.PI/4, 30, BABYLON.Vector3.Zero(), this.scene);
                camera.attachControls(canvas, true);
                
                // Camera limits
                camera.lowerRadiusLimit = 5;
                camera.upperRadiusLimit = 100;

                // Lighting
                const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
                light.intensity = 2;

                // Create visible grid material
                if (BABYLON.GridMaterial) {
                    const gridMaterial = new BABYLON.GridMaterial("grid", this.scene);
                    gridMaterial.gridRatio = 2;
                    gridMaterial.majorUnitFrequency = 5;
                    gridMaterial.minorUnitVisibility = 0.6;
                    gridMaterial.lineColor = new BABYLON.Color3(0.8, 0.8, 1);
                    gridMaterial.backFaceCulling = false;

                    // Ground plane
                    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
                    ground.material = gridMaterial;
                } else {
                    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
                    const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
                    groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.4);
                    ground.material = groundMaterial;
                }

                // Reference box
                const box = BABYLON.MeshBuilder.CreateBox("reference", { size: 4 }, this.scene);
                box.position.y = 2;
                const boxMaterial = new BABYLON.StandardMaterial("boxMat", this.scene);
                boxMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
                boxMaterial.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
                box.material = boxMaterial;

                // Start render loop
                engine.runRenderLoop(() => {
                    this.scene.render();
                });

                window.addEventListener('resize', () => {
                    engine.resize();
                });


            } catch (error) {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                this.render2DPerspectiveFallback();
                return;
            }
        }
    }render2DPerspectiveFallback() {
        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        
        // Initialize perspective state if not exists
        if (!this.perspectiveState) {
            this.perspectiveState = {
                rotationY: 0,
                rotationX: 0.5, // Slight downward angle
                zoom: 1,
                isDragging: false,
                lastMouseX: 0,
                lastMouseY: 0
            };
            
            // Add mouse controls for 2D perspective
            this.setupPerspectiveControls(canvas);
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dark background to simulate 3D
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2);
        gradient.addColorStop(0, '#2a2a44');
        gradient.addColorStop(1, '#1a1a33');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Setup perspective transformation
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Apply zoom
        ctx.scale(this.perspectiveState.zoom, this.perspectiveState.zoom);
        
        // Draw perspective grid
        this.drawPerspectiveGrid(ctx);
        
        // Draw reference objects
        this.drawReferenceObjects(ctx);
        
        ctx.restore();
        
        // Add UI text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('3D Mode (WebGL Fallback)', 10, 30);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Drag to rotate • Scroll to zoom', 10, 50);
        ctx.fillText('Your system does not support WebGL', 10, 70);
    }
      drawPerspectiveGrid(ctx) {
        const gridSize = 50;
        const gridCount = 15;
        const rotY = this.perspectiveState.rotationY;
        const rotX = this.perspectiveState.rotationX;
        
        // Collect all grid lines with their depths for proper z-ordering
        let gridLines = [];
        
        // Generate grid lines
        for (let i = -gridCount; i <= gridCount; i++) {
            // Vertical lines (going into distance)
            let linePoints = [];
            let avgDepth = 0;
            
            for (let j = -gridCount; j <= gridCount; j++) {
                let x = i * gridSize;
                let z = j * gridSize;
                
                // Apply Y rotation
                let rotatedX = x * Math.cos(rotY) - z * Math.sin(rotY);
                let rotatedZ = x * Math.sin(rotY) + z * Math.cos(rotY);
                
                // Skip lines that are too far away
                if (rotatedZ > 500) continue;
                
                // Apply perspective projection
                let perspectiveScale = Math.max(0.1, 1 / (1 + rotatedZ * 0.003));
                let screenX = rotatedX * perspectiveScale;
                let screenY = (-rotatedZ * 0.2 + rotX * 80) * perspectiveScale;
                
                linePoints.push([screenX, screenY]);
                avgDepth += rotatedZ;
            }
            
            if (linePoints.length > 1) {
                avgDepth /= linePoints.length;
                gridLines.push({
                    points: linePoints,
                    depth: avgDepth,
                    type: 'vertical'
                });
            }
            
            // Horizontal lines
            linePoints = [];
            avgDepth = 0;
            
            for (let j = -gridCount; j <= gridCount; j++) {
                let x = j * gridSize;
                let z = i * gridSize;
                
                // Apply Y rotation
                let rotatedX = x * Math.cos(rotY) - z * Math.sin(rotY);
                let rotatedZ = x * Math.sin(rotY) + z * Math.cos(rotY);
                
                // Skip lines that are too far away
                if (rotatedZ > 500) continue;
                
                // Apply perspective projection
                let perspectiveScale = Math.max(0.1, 1 / (1 + rotatedZ * 0.003));
                let screenX = rotatedX * perspectiveScale;
                let screenY = (-rotatedZ * 0.2 + rotX * 80) * perspectiveScale;
                
                linePoints.push([screenX, screenY]);
                avgDepth += rotatedZ;
            }
            
            if (linePoints.length > 1) {
                avgDepth /= linePoints.length;
                gridLines.push({
                    points: linePoints,
                    depth: avgDepth,
                    type: 'horizontal'
                });
            }
        }
        
        // Sort lines by depth (back to front)
        gridLines.sort((a, b) => b.depth - a.depth);
        
        // Draw grid lines with depth-based alpha
        gridLines.forEach(line => {
            let alpha = Math.max(0.1, Math.min(1, 1 - line.depth * 0.002));
            let brightness = Math.max(0.3, Math.min(1, 1 - line.depth * 0.001));
            
            ctx.strokeStyle = `rgba(${Math.floor(74 * brightness)}, ${Math.floor(74 * brightness)}, ${Math.floor(136 * brightness)}, ${alpha})`;
            ctx.lineWidth = line.depth < 100 ? 1.5 : 1;
            
            ctx.beginPath();
            line.points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point[0], point[1]);
                } else {
                    ctx.lineTo(point[0], point[1]);
                }
            });
            ctx.stroke();
        });
        
        // Draw main axes more prominently
        this.drawAxes(ctx, rotY, rotX);
    }
    
    drawAxes(ctx, rotY, rotX) {
        // X-axis (red)
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        let xAxisEnd = 100 * Math.cos(rotY);
        let xAxisEndZ = 100 * Math.sin(rotY);
        let perspectiveScale = 1 / (1 + xAxisEndZ * 0.003);
        
        ctx.moveTo(0, 0);
        ctx.lineTo(xAxisEnd * perspectiveScale, 0);
        ctx.stroke();
        
        // Y-axis (green) - vertical
        ctx.strokeStyle = '#66ff66';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -80);
        ctx.stroke();
        
        // Z-axis (blue) - going into distance
        ctx.strokeStyle = '#6666ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        let zAxisEndX = -100 * Math.sin(rotY);
        let zAxisEndZ = 100 * Math.cos(rotY);
        perspectiveScale = 1 / (1 + zAxisEndZ * 0.003);
        
        ctx.moveTo(0, 0);
        ctx.lineTo(zAxisEndX * perspectiveScale, (-zAxisEndZ * 0.2 + rotX * 80) * perspectiveScale);
        ctx.stroke();
    }
      drawReferenceObjects(ctx) {
        // Draw a reference cube with proper depth sorting
        const cubeSize = 25;
        const rotY = this.perspectiveState.rotationY;
        const rotX = this.perspectiveState.rotationX;
        
        // Define cube vertices
        let vertices = [
            [-cubeSize, -cubeSize, 40],  // Bottom front left
            [cubeSize, -cubeSize, 40],   // Bottom front right
            [cubeSize, cubeSize, 40],    // Bottom back right
            [-cubeSize, cubeSize, 40],   // Bottom back left
            [-cubeSize, -cubeSize, 40 + cubeSize], // Top front left
            [cubeSize, -cubeSize, 40 + cubeSize],  // Top front right
            [cubeSize, cubeSize, 40 + cubeSize],   // Top back right
            [-cubeSize, cubeSize, 40 + cubeSize]   // Top back left
        ];
        
        // Transform and project vertices
        let projected = vertices.map(([x, y, z]) => {
            let rotatedX = x * Math.cos(rotY) - z * Math.sin(rotY);
            let rotatedZ = x * Math.sin(rotY) + z * Math.cos(rotY);
            let perspectiveScale = Math.max(0.1, 1 / (1 + rotatedZ * 0.003));
            return {
                x: rotatedX * perspectiveScale,
                y: (y - rotatedZ * 0.2 + rotX * 80) * perspectiveScale,
                z: rotatedZ,
                scale: perspectiveScale
            };
        });
        
        // Define faces with their vertex indices
        let faces = [
            { indices: [0, 1, 2, 3], color: '#ff4444' }, // Bottom
            { indices: [4, 7, 6, 5], color: '#ff6666' }, // Top
            { indices: [0, 4, 5, 1], color: '#ff3333' }, // Front
            { indices: [2, 6, 7, 3], color: '#cc2222' }, // Back
            { indices: [1, 5, 6, 2], color: '#dd3333' }, // Right
            { indices: [0, 3, 7, 4], color: '#bb2222' }  // Left
        ];
        
        // Calculate face depths and sort
        faces.forEach(face => {
            face.avgZ = face.indices.reduce((sum, i) => sum + projected[i].z, 0) / face.indices.length;
        });
        faces.sort((a, b) => b.avgZ - a.avgZ); // Back to front
        
        // Draw faces
        faces.forEach(face => {
            if (face.avgZ < 300) { // Don't draw if too far
                let alpha = Math.max(0.3, Math.min(0.8, 1 - face.avgZ * 0.002));
                
                ctx.fillStyle = face.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.strokeStyle = '#ffffff44';
                ctx.lineWidth = 1;
                
                ctx.beginPath();
                face.indices.forEach((vertexIndex, i) => {
                    let vertex = projected[vertexIndex];
                    if (i === 0) {
                        ctx.moveTo(vertex.x, vertex.y);
                    } else {
                        ctx.lineTo(vertex.x, vertex.y);
                    }
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        });
    }
    
    setupPerspectiveControls(canvas) {
        // Mouse controls for 2D perspective
        canvas.addEventListener('mousedown', (e) => {
            this.perspectiveState.isDragging = true;
            this.perspectiveState.lastMouseX = e.clientX;
            this.perspectiveState.lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (this.perspectiveState.isDragging) {
                const deltaX = e.clientX - this.perspectiveState.lastMouseX;
                const deltaY = e.clientY - this.perspectiveState.lastMouseY;
                
                this.perspectiveState.rotationY += deltaX * 0.01;
                this.perspectiveState.rotationX += deltaY * 0.01;
                
                // Clamp rotation X
                this.perspectiveState.rotationX = Math.max(0.1, Math.min(2, this.perspectiveState.rotationX));
                
                this.perspectiveState.lastMouseX = e.clientX;
                this.perspectiveState.lastMouseY = e.clientY;
                
                // Re-render
                this.render2DPerspectiveFallback();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            this.perspectiveState.isDragging = false;
            canvas.style.cursor = 'grab';
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.perspectiveState.zoom *= zoomFactor;
            this.perspectiveState.zoom = Math.max(0.3, Math.min(3, this.perspectiveState.zoom));
            this.render2DPerspectiveFallback();
        });
    }renderOrthographicGrid() {
        // Get visible bounds from camera
        const bounds = this.camera ? this.camera.getVisibleBounds() : {
            left: -200, right: 200, top: -200, bottom: 200
        };

        // Add padding to bounds to ensure smooth scrolling
        const padding = Math.max(this.majorSpacing, 100);
        const left = Math.floor((bounds.left - padding) / this.minorSpacing) * this.minorSpacing;
        const right = Math.ceil((bounds.right + padding) / this.minorSpacing) * this.minorSpacing;
        const top = Math.floor((bounds.top - padding) / this.minorSpacing) * this.minorSpacing;
        const bottom = Math.ceil((bounds.bottom + padding) / this.minorSpacing) * this.minorSpacing;

        // Minor grid lines
        this.ctx.strokeStyle = this.minorColor;
        this.ctx.lineWidth = this.minorWidth;
        this.ctx.beginPath();

        // Vertical lines
        for (let x = left; x <= right; x += this.minorSpacing) {
            this.ctx.moveTo(x, top);
            this.ctx.lineTo(x, bottom);
        }

        // Horizontal lines  
        for (let y = top; y <= bottom; y += this.minorSpacing) {
            this.ctx.moveTo(left, y);
            this.ctx.lineTo(right, y);
        }

        this.ctx.stroke();

        // Major grid lines
        this.ctx.strokeStyle = this.majorColor;
        this.ctx.lineWidth = this.majorWidth;
        this.ctx.beginPath();

        // Major vertical lines
        const majorLeft = Math.floor((bounds.left - padding) / this.majorSpacing) * this.majorSpacing;
        const majorRight = Math.ceil((bounds.right + padding) / this.majorSpacing) * this.majorSpacing;
        const majorTop = Math.floor((bounds.top - padding) / this.majorSpacing) * this.majorSpacing;
        const majorBottom = Math.ceil((bounds.bottom + padding) / this.majorSpacing) * this.majorSpacing;

        for (let x = majorLeft; x <= majorRight; x += this.majorSpacing) {
            this.ctx.moveTo(x, majorTop);
            this.ctx.lineTo(x, majorBottom);
        }

        for (let y = majorTop; y <= majorBottom; y += this.majorSpacing) {
            this.ctx.moveTo(majorLeft, y);
            this.ctx.lineTo(majorRight, y);
        }

        this.ctx.stroke();
    }

    dispose() {
        if (this.scene) {
            this.scene.dispose();
            this.scene = null;
        }
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }
    }
}
