// Drawing Engine - Simplified working version

export class DrawingEngine {
    constructor(ctx, camera, app) {
        this.ctx = ctx;
        this.camera = camera;
        this.app = app;
        
        // Drawing styles
        this.strokeColor = '#1e293b';
        this.fillColor = '#f8fafc';
        this.selectedColor = '#3b82f6';
        this.selectedFillColor = 'rgba(59, 130, 246, 0.4)';
        this.highlightColor = '#60a5fa';
        this.previewColor = '#fb923c';
        
        this.lineWidth = 3; 
        this.dashPattern = [10, 5]; 
        this.previewDashPattern = [8, 4]; 

        // Dimension line styles
        this.dimensionLineColor = '#ff0000';  // Bright red for visibility
        this.dimensionTextColor = '#000000';  // Black text
        this.dimensionOffset = 15;
        this.dimensionFontSize = 12;
    }
    
    renderObjects(objects) {
        if (!objects || objects.length === 0) return;
        
        this.ctx.save();
        objects.forEach(obj => {
            this.renderObject(obj);
        });
        this.ctx.restore();
    }
    
    renderObject(obj) {
        if (!obj) return;
        
        this.ctx.save();
        
        if (obj.isPreview) {
            this.ctx.strokeStyle = this.previewColor;
            this.ctx.setLineDash(this.previewDashPattern);
        } else if (obj.selected) {
            this.ctx.strokeStyle = this.selectedColor;
            this.ctx.fillStyle = this.selectedFillColor;
        } else {
            this.ctx.strokeStyle = this.strokeColor;
            this.ctx.fillStyle = this.fillColor;
        }
        
        this.ctx.lineWidth = this.lineWidth;
        
        switch (obj.type) {
            case 'rectangle':
                this.renderRectangle(obj);
                break;
            case 'line':
                this.renderLine(obj);
                break;
            case 'circle':
                this.renderCircle(obj);
                break;
        }
        
        this.ctx.restore();
    }
    
    renderRectangle(obj) {
        // Transform world coordinates to screen coordinates
        const worldP1 = { x: obj.x, y: obj.y };
        const worldP2 = { x: obj.x + obj.width, y: obj.y };
        const worldP3 = { x: obj.x + obj.width, y: obj.y + obj.height };
        const worldP4 = { x: obj.x, y: obj.y + obj.height };

        const p1 = this.camera.worldToScreen(worldP1.x, worldP1.y);
        const p2 = this.camera.worldToScreen(worldP2.x, worldP2.y);
        const p3 = this.camera.worldToScreen(worldP3.x, worldP3.y);
        const p4 = this.camera.worldToScreen(worldP4.x, worldP4.y);

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.lineTo(p4.x, p4.y);
        this.ctx.closePath();
        
        if ((obj.selected || obj.filled) && !obj.isPreview) {
            this.ctx.fill();
        }
        this.ctx.stroke();
    }
    
    renderLine(obj) {
        const screenStart = this.camera.worldToScreen(obj.start.x, obj.start.y);
        const screenEnd = this.camera.worldToScreen(obj.end.x, obj.end.y);
        
        this.ctx.beginPath();
        this.ctx.moveTo(screenStart.x, screenStart.y);
        this.ctx.lineTo(screenEnd.x, screenEnd.y);
        this.ctx.stroke();
    }
    
    renderCircle(obj) {
        const screenCenter = this.camera.worldToScreen(obj.center.x, obj.center.y);
        const screenRadius = obj.radius * this.camera.zoom;
        
        this.ctx.beginPath();
        this.ctx.arc(screenCenter.x, screenCenter.y, screenRadius, 0, 2 * Math.PI);
        
        if ((obj.selected || obj.filled) && !obj.isPreview) {
            this.ctx.fill();
        }
        this.ctx.stroke();
    }
    
    renderTemporaryObject(tempObject) {
        if (!tempObject) return;
        
        
        this.ctx.save();
        
        // Render the object itself
        this.renderObject(tempObject);
        
        // Render dimensions for the temporary object
        this.renderTemporaryDimensions(tempObject);
        
        this.ctx.restore();
    }

    renderTemporaryDimensions(tempObject) {
        if (!tempObject) return;
        
        
        switch (tempObject.type) {
            case 'rectangle':
                if (tempObject.width > 0 && tempObject.height > 0) {
                    const worldP1 = { x: tempObject.x, y: tempObject.y };
                    const worldP2 = { x: tempObject.x + tempObject.width, y: tempObject.y };
                    const worldP3 = { x: tempObject.x + tempObject.width, y: tempObject.y + tempObject.height };
                    
                    const screenP1 = this.camera.worldToScreen(worldP1.x, worldP1.y);
                    const screenP2 = this.camera.worldToScreen(worldP2.x, worldP2.y);
                    const screenP3 = this.camera.worldToScreen(worldP3.x, worldP3.y);
                    
                    const displayWidth = Math.abs(tempObject.width);
                    const displayHeight = Math.abs(tempObject.height);
                    
                    // Draw width dimension (horizontal line above rectangle)
                    const dimLineYWidth = screenP1.y - this.dimensionOffset;
                    this.drawSimpleDimensionLine(
                        { x: screenP1.x, y: dimLineYWidth },
                        { x: screenP2.x, y: dimLineYWidth },
                        this.formatDimensionValue(displayWidth)
                    );
                    
                    // Draw height dimension (vertical line to the right of rectangle)
                    const dimLineXHeight = screenP2.x + this.dimensionOffset;
                    this.drawSimpleDimensionLine(
                        { x: dimLineXHeight, y: screenP2.y },
                        { x: dimLineXHeight, y: screenP3.y },
                        this.formatDimensionValue(displayHeight)
                    );
                }
                break;
        }
    }

    drawSimpleDimensionLine(p1, p2, label) {
        
        this.ctx.save();
        
        // Set bright red color for visibility
        this.ctx.strokeStyle = this.dimensionLineColor;
        this.ctx.fillStyle = this.dimensionTextColor;
        this.ctx.font = `${this.dimensionFontSize}px Arial`;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        
        // Draw the dimension line
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        
        // Draw the label at midpoint
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        this.ctx.fillText(label, midX, midY - 5);
        
        this.ctx.restore();
        
    }

    formatDimensionValue(value) {
        return value.toFixed(2) + '"';
    }

    hitTest(worldX, worldY, objects, worldTolerance) {
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            if (this.isPointInObject(worldX, worldY, obj, worldTolerance)) {
                return obj;
            }
        }
        return null;
    }

    isPointInObject(worldX, worldY, obj, tolerance) {
        switch (obj.type) {
            case 'rectangle':
                return worldX >= obj.x - tolerance && 
                       worldX <= obj.x + obj.width + tolerance &&
                       worldY >= obj.y - tolerance && 
                       worldY <= obj.y + obj.height + tolerance;
            case 'line':
                // Simplified line hit test
                return false;
            case 'circle':
                const dx = worldX - obj.center.x;
                const dy = worldY - obj.center.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= obj.radius + tolerance;
            default:
                return false;
        }
    }
}
