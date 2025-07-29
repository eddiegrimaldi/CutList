// drawing.js - 2D Drawing tools for sketch mode
export class Drawing {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.isDrawing = false;
        this.currentShape = null;
        this.shapes = [];
        this.currentTool = 'select';
        
        // Create a drawing plane at Y=0
        this.drawingPlane = BABYLON.MeshBuilder.CreateGround('drawingPlane', {
            width: 200, 
            height: 200
        }, this.scene);
        this.drawingPlane.position.y = 0.01; // Slightly above grid
        this.drawingPlane.material = new BABYLON.StandardMaterial('drawingPlaneMat', this.scene);
        this.drawingPlane.material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        this.drawingPlane.material.alpha = 0; // Invisible but pickable
        this.drawingPlane.isPickable = true;
        
        this.setupDrawingEvents();
    }
    
    setupDrawingEvents() {
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Mouse events for drawing
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    this.handlePointerMove(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    this.handlePointerUp(pointerInfo);
                    break;
            }
        });
    }
      handlePointerDown(pointerInfo) {
        if (this.currentTool === 'select') return;
        
        const pickInfo = this.scene.pick(pointerInfo.event.offsetX, pointerInfo.event.offsetY);
        if (pickInfo.hit && pickInfo.pickedMesh === this.drawingPlane) {
            this.isDrawing = true;
            // Disable camera controls while drawing
            this.camera.detachControl();
            this.startDrawing(pickInfo.pickedPoint);
            // Prevent event from propagating to camera
            pointerInfo.event.preventDefault();
            pointerInfo.event.stopPropagation();
        }
    }
    
    handlePointerMove(pointerInfo) {
        if (!this.isDrawing) return;
        
        const pickInfo = this.scene.pick(pointerInfo.event.offsetX, pointerInfo.event.offsetY);
        if (pickInfo.hit && pickInfo.pickedMesh === this.drawingPlane) {
            this.updateDrawing(pickInfo.pickedPoint);
        }
    }
      handlePointerUp(pointerInfo) {
        if (this.isDrawing) {
            this.finishDrawing();
            this.isDrawing = false;
            // Re-enable camera controls after drawing
            const canvas = document.getElementById('drawingCanvas');
            this.camera.attachControl(canvas, true);
        }
    }
    
    startDrawing(point) {
        this.startPoint = point;
        
        switch (this.currentTool) {
            case 'line':
                this.currentShape = this.createLine(point, point);
                break;
            case 'rectangle':
                this.currentShape = this.createRectangle(point, point);
                break;
            case 'circle':
                this.currentShape = this.createCircle(point, 0);
                break;
        }
    }
    
    updateDrawing(point) {
        if (!this.currentShape) return;
        
        switch (this.currentTool) {
            case 'line':
                this.updateLine(this.currentShape, this.startPoint, point);
                break;
            case 'rectangle':
                this.updateRectangle(this.currentShape, this.startPoint, point);
                break;
            case 'circle':
                this.updateCircle(this.currentShape, this.startPoint, point);
                break;
        }
    }
    
    finishDrawing() {
        if (this.currentShape) {
            this.shapes.push(this.currentShape);
            this.currentShape = null;
        }
    }    createLine(start, end) {
        const points = [start, end];
        const line = BABYLON.MeshBuilder.CreateLines('line', {points: points}, this.scene);
        line.color = new BABYLON.Color3(0, 0, 0); // Black lines
        line.position.y = 0.1; // Slightly above grid
        return line;
    }
    
    updateLine(line, start, end) {
        const points = [start, end];
        const newLine = BABYLON.MeshBuilder.CreateLines('line', {points: points}, this.scene);
        newLine.color = new BABYLON.Color3(0, 0, 0);
        newLine.position.y = 0.1;
        line.dispose();
        return newLine;
    }
    
    createRectangle(corner1, corner2) {
        const width = Math.abs(corner2.x - corner1.x);
        const height = Math.abs(corner2.z - corner1.z);
        const centerX = (corner1.x + corner2.x) / 2;
        const centerZ = (corner1.z + corner2.z) / 2;
        
        // Create rectangle outline with lines
        const points = [
            new BABYLON.Vector3(corner1.x, 0.1, corner1.z),
            new BABYLON.Vector3(corner2.x, 0.1, corner1.z),
            new BABYLON.Vector3(corner2.x, 0.1, corner2.z),
            new BABYLON.Vector3(corner1.x, 0.1, corner2.z),
            new BABYLON.Vector3(corner1.x, 0.1, corner1.z) // Close the rectangle
        ];
          const rect = BABYLON.MeshBuilder.CreateLines('rectangle', {points: points}, this.scene);
        rect.color = new BABYLON.Color3(0, 0, 0); // Black lines
        
        return rect;
    }
    
    updateRectangle(rect, corner1, corner2) {
        const points = [
            new BABYLON.Vector3(corner1.x, 0.1, corner1.z),
            new BABYLON.Vector3(corner2.x, 0.1, corner1.z),
            new BABYLON.Vector3(corner2.x, 0.1, corner2.z),
            new BABYLON.Vector3(corner1.x, 0.1, corner2.z),
            new BABYLON.Vector3(corner1.x, 0.1, corner1.z)
        ];
          const newRect = BABYLON.MeshBuilder.CreateLines('rectangle', {points: points}, this.scene);
        newRect.color = new BABYLON.Color3(0, 0, 0);
        rect.dispose();
        return newRect;
    }
      createCircle(center, radius) {
        // Create circle outline with lines
        const points = [];
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;
            points.push(new BABYLON.Vector3(x, 0.1, z));
        }
          const circle = BABYLON.MeshBuilder.CreateLines('circle', {points: points}, this.scene);
        circle.color = new BABYLON.Color3(0, 0, 0); // Black lines
        
        return circle;
    }
    
    updateCircle(circle, center, point) {
        const radius = BABYLON.Vector3.Distance(center, point);
        const points = [];
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;
            points.push(new BABYLON.Vector3(x, 0.1, z));
        }
          const newCircle = BABYLON.MeshBuilder.CreateLines('circle', {points: points}, this.scene);
        newCircle.color = new BABYLON.Color3(0, 0, 0);
        circle.dispose();
        return newCircle;
    }
    
    setTool(tool) {
        this.currentTool = tool;
    }
    
    clearAll() {
        this.shapes.forEach(shape => shape.dispose());
        this.shapes = [];
    }
}
