// Grid Renderer - Handles grid drawing and visualization

export class GridRenderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        
        // Grid settings in world coordinates
        this.majorSpacing = 100;   // Major grid lines every 100 world units
        this.minorSpacing = 20;    // Minor grid lines every 20 world units
        this.subdivisions = 4;     // Subdivisions for 5 unit precision
        
        // Colors
        this.majorColor = '#9ca3af';      // Gray-400 (major lines)
        this.minorColor = '#d1d5db';      // Gray-300 (minor lines)  
        this.subdivisionColor = '#f3f4f6'; // Gray-100 (subdivisions)
        
        // Line widths
        this.majorWidth = 1.5;        this.minorWidth = 1;
        this.subdivisionWidth = 0.5;
        
    }render() {
        if (!this.ctx || !this.camera) return;

        // Use the app's current mode instead of camera mode
        if (this.currentMode === 'modeling') {
            this.renderPerspectiveGrid();
        } else {
            this.renderOrthographicGrid();
        }
    }    renderPerspectiveGrid() {
        
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
            }

            try {
                const engine = new BABYLON.Engine(canvas, true);
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
    }

    renderPerspectiveGrid() {
        if (!this.ctx || !this.camera) return;

        this.ctx.save();

        // Get visible bounds from camera
        const bounds = this.camera.getVisibleBounds();

        // Draw grid lines in perspective
        this.ctx.strokeStyle = this.minorColor;
        this.ctx.lineWidth = this.minorWidth;
        this.ctx.beginPath();

        for (let x = bounds.left; x <= bounds.right; x += this.minorSpacing) {
            for (let y = bounds.top; y <= bounds.bottom; y += this.minorSpacing) {
                const screenPos = this.camera.worldToScreen({ x, y, z: 0 });
                this.ctx.moveTo(screenPos.x, screenPos.y);
                this.ctx.lineTo(screenPos.x, screenPos.y);
            }
        }

        this.ctx.stroke();
        this.ctx.restore();
    }    renderOrthographicGrid() {
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
