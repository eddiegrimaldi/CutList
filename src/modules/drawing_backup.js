// Drawing Engine - Handles rendering of shapes and objects

export class DrawingEngine {
    constructor(ctx, camera, app) { // Added app argument
        this.ctx = ctx;
        this.camera = camera;
        this.app = app; // Store app instance
        
        // Drawing styles
        this.strokeColor = '#1e293b';      // Slate-800
        this.fillColor = '#f8fafc';        // Slate-50
        this.selectedColor = '#3b82f6';    // Blue-500
        this.selectedFillColor = 'rgba(59, 130, 246, 0.4)'; // Blue-500 with 0.4 opacity
        this.highlightColor = '#60a5fa';   // Blue-400
        this.previewColor = '#fb923c';     // Orange-400 for preview
        
        this.lineWidth = 3; 
        this.dashPattern = [10, 5]; 
        this.previewDashPattern = [8, 4]; 

        // Dimension line styles
        this.dimensionLineColor = '#4b5563'; // Gray-600
        this.dimensionTextColor = '#1f2937'; // Gray-800
        this.dimensionTextBackgroundColor = 'rgba(255, 255, 255, 0.85)'; // White with slight transparency
        this.dimensionExtensionLineLength = 8; // pixels
        this.dimensionOffset = 15; // pixels, distance from shape to dimension line
        this.dimensionTextOffset = -5; // pixels, text offset from dimension line (negative for above)
        this.dimensionFontSize = 10; // pixels
    }
    
    renderObjects(objects) {
        if (!objects) {
            return;
        }
        if (objects.length === 0) {
            return;
        }

        this.ctx.save();
        
        objects.forEach(obj => {
            this.renderObject(obj);
        });
        
        this.ctx.restore();
    }
    
    renderObject(obj) {
        if (!obj || !obj.type) {
            return;
        }

        this.applyObjectStyle(obj);
        
        let screenCoords = {}; // To store calculated screen coordinates for logging

        switch (obj.type) {
            case 'line':
                screenCoords.start = this.camera.worldToScreen(obj.start.x, obj.start.y);
                screenCoords.end = this.camera.worldToScreen(obj.end.x, obj.end.y);
                this.renderLine(obj, screenCoords); // Pass screenCoords
                break;
            case 'rectangle':
                screenCoords.topLeft = this.camera.worldToScreen(obj.x, obj.y);
                screenCoords.width = obj.width * this.camera.zoom;
                screenCoords.height = obj.height * this.camera.zoom;
                this.renderRectangle(obj, screenCoords); // Pass screenCoords
                break;
            case 'circle':
                screenCoords.center = this.camera.worldToScreen(obj.center.x, obj.center.y);
                screenCoords.radius = obj.radius * this.camera.zoom;
                this.renderCircle(obj, screenCoords); // Pass screenCoords
                break;
            default:
                break;
        }
    }
    
    applyObjectStyle(obj) {
        // Base styles
        this.ctx.strokeStyle = obj.selected ? this.selectedColor : this.strokeColor;
        // this.ctx.fillStyle = obj.filled ? this.fillColor : \'transparent\'; // Old fill logic
        
        if (obj.selected) {
            this.ctx.fillStyle = this.selectedFillColor;
        } else {
            this.ctx.fillStyle = obj.filled ? this.fillColor : 'transparent';
        }
        
        // Line width is now zoom-agnostic (screen pixels)
        this.ctx.lineWidth = this.lineWidth;
        // Dash pattern is also zoom-agnostic
        this.ctx.setLineDash(obj.dashed ? this.dashPattern : []);
        
        // Highlight if hovered (and not a preview)
        if (obj.highlighted && !obj.isPreview) {
            this.ctx.strokeStyle = this.highlightColor;
            this.ctx.lineWidth = this.lineWidth + 1; // Highlighted lines are slightly thicker
        }

        // Preview style override
        if (obj.isPreview) {
            this.ctx.strokeStyle = this.previewColor;
            this.ctx.lineWidth = this.lineWidth; 
            this.ctx.setLineDash(this.previewDashPattern);
            this.ctx.fillStyle = 'transparent'; 
        }
    }
    
    renderLine(obj, screenCoords) { // Modified to accept screenCoords
        const { start, end } = screenCoords;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        
        if (obj.selected && !obj.isPreview) { // Don't draw control points for previews
            this.drawControlPoint(start.x, start.y);
            this.drawControlPoint(end.x, end.y);
        }
    }
    
    renderRectangle(obj, screenCoords) { // screenCoords argument is largely unused now for direct rendering

        // Always transform from world coordinates to handle camera rotation for main rendering path.
        const worldP1 = { x: obj.x, y: obj.y };                            // Top-left
        const worldP2 = { x: obj.x + obj.width, y: obj.y };                // Top-right
        const worldP3 = { x: obj.x + obj.width, y: obj.y + obj.height };   // Bottom-right
        const worldP4 = { x: obj.x, y: obj.y + obj.height };               // Bottom-left

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
        
        if (obj.selected && !obj.isPreview) {
            this.drawControlPoint(p1.x, p1.y);
            this.drawControlPoint(p2.x, p2.y);
            this.drawControlPoint(p3.x, p3.y);
            this.drawControlPoint(p4.x, p4.y);
            this.drawControlPoint((p1.x + p2.x) / 2, (p1.y + p2.y) / 2); 
            this.drawControlPoint((p3.x + p4.x) / 2, (p3.y + p4.y) / 2); 
            this.drawControlPoint((p4.x + p1.x) / 2, (p4.y + p1.y) / 2); 
            this.drawControlPoint((p2.x + p3.x) / 2, (p2.y + p3.y) / 2); 
            this.drawControlPoint((p1.x + p3.x) / 2, (p1.y + p3.y) / 2); 
        }
    }
    
    renderCircle(obj, screenCoords) { // Modified to accept screenCoords
        const { center, radius } = screenCoords; // center is already transformed by worldToScreen

        if (radius < 0) { 
            return;
        }
        
        // Circles are rotationally symmetrical, so no explicit rotation of the drawing context is needed here.
        // The worldToScreen transformation of its center point already accounts for camera rotation.
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        
        if ((obj.selected || obj.filled) && !obj.isPreview) { 
            this.ctx.fill();
        }
        this.ctx.stroke();
        
        if (obj.selected && !obj.isPreview) {
            this.drawControlPoint(center.x, center.y); 
            
            // For control points on a rotated circle, we need to calculate their world positions
            // then transform them to screen space.

            // World cardinal points around the circle center
            const worldNorth = { x: obj.center.x, y: obj.center.y - obj.radius };
            const worldSouth = { x: obj.center.x, y: obj.center.y + obj.radius };
            const worldEast  = { x: obj.center.x + obj.radius, y: obj.center.y };
            const worldWest  = { x: obj.center.x - obj.radius, y: obj.center.y };

            const screenNorth = this.camera.worldToScreen(worldNorth.x, worldNorth.y);
            const screenSouth = this.camera.worldToScreen(worldSouth.x, worldSouth.y);
            const screenEast  = this.camera.worldToScreen(worldEast.x, worldEast.y);
            const screenWest  = this.camera.worldToScreen(worldWest.x, worldWest.y);

            this.drawControlPoint(screenEast.x, screenEast.y);   // East
            this.drawControlPoint(screenWest.x, screenWest.y);   // West
            this.drawControlPoint(screenSouth.x, screenSouth.y); // South
            this.drawControlPoint(screenNorth.x, screenNorth.y); // North
            
            // Radius line: from screen center to one of the transformed cardinal points (e.g., screenEast)
            this.ctx.save();
            this.ctx.setLineDash([5, 3]); 
            this.ctx.strokeStyle = this.selectedColor;
            this.ctx.lineWidth = 1; 
            this.ctx.beginPath();
            this.ctx.moveTo(center.x, center.y);
            this.ctx.lineTo(screenEast.x, screenEast.y); // Draw to the transformed East point
            this.ctx.stroke();
            this.ctx.restore();
        }
    }
    
    drawControlPoint(x, y) {
        const size = 5; // Control point size in screen pixels - Increased slightly for better visibility
        
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = this.selectedColor;
        this.ctx.lineWidth = 1; // Control point border in screen pixels
        this.ctx.setLineDash([]);
        
        this.ctx.beginPath();
        this.ctx.rect(x - size, y - size, size * 2, size * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    // Temporary drawing for active tool
    renderTemporary(tempObject) {
        if (!tempObject) {
            return;
        }

        this.ctx.save(); // Outer save for the entire temporary rendering + dimensions
        tempObject.isPreview = true;
        this.renderObject(tempObject); 
        delete tempObject.isPreview;

        // Render dimensions for the temporary object
        this.renderTemporaryDimensions(tempObject);

        this.ctx.restore(); // Outer restore for the entire temporary rendering + dimensions
    }    renderTemporaryDimensions(tempObject) {
        if (!tempObject) {
            return;
        }
        
        this.ctx.save(); 

        const originalLineWidth = this.ctx.lineWidth;
        this.ctx.lineWidth = 1; 
        this.ctx.strokeStyle = this.dimensionLineColor;
        this.ctx.fillStyle = this.dimensionTextColor;
        this.ctx.font = `${this.dimensionFontSize}px Arial`;
        this.ctx.setLineDash([]); 


        switch (tempObject.type) {
            case 'rectangle': // Corrected: Use single quotes for the string literal
                if (tempObject.width === undefined || tempObject.height === undefined || tempObject.width === 0 || tempObject.height === 0) {
                } else {
                    const worldP1 = { x: tempObject.x, y: tempObject.y };
                    const worldP2 = { x: tempObject.x + tempObject.width, y: tempObject.y };
                    const worldP3 = { x: tempObject.x + tempObject.width, y: tempObject.y + tempObject.height };
                    // const worldP4 = { x: tempObject.x, y: tempObject.y + tempObject.height }; // Not used for these two dimensions                    const screenP1 = this.camera.worldToScreen(worldP1.x, worldP1.y);
                    const screenP2 = this.camera.worldToScreen(worldP2.x, worldP2.y);
                    const screenP3 = this.camera.worldToScreen(worldP3.x, worldP3.y);
                    
                    const displayWidth = Math.abs(tempObject.width);
                    const displayHeight = Math.abs(tempObject.height);


                    // Horizontal dimension for width (along top edge P1-P2)
                    // P1 is top-left, P2 is top-right of the rectangle in screen coordinates.
                    // The dimension line is offset "above" the top edge.
                    const dimLineYWidth = screenP1.y - this.dimensionOffset;
                    this.drawDimensionLineWithLabel(
                        { x: screenP1.x, y: dimLineYWidth }, // Start point of the dimension line
                        { x: screenP2.x, y: dimLineYWidth }, // End point of the dimension line
                        this.formatDimensionValue(displayWidth), // Text label for the dimension
                        'horizontal',                           // Orientation of the dimension
                        { x1: screenP1.x, y1: screenP1.y, x2: screenP2.x, y2: screenP2.y } // Actual object points
                    );

                    // Vertical dimension for height (along right edge P2-P3)
                    // P2 is top-right, P3 is bottom-right of the rectangle in screen coordinates.
                    // The dimension line is offset to the "right" of the right edge.
                    const dimLineXHeight = screenP2.x + this.dimensionOffset;
                    this.drawDimensionLineWithLabel(
                        { x: dimLineXHeight, y: screenP2.y }, // Start point of the dimension line
                        { x: dimLineXHeight, y: screenP3.y }, // End point of the dimension line
                        this.formatDimensionValue(displayHeight), // Text label for the dimension
                        'vertical',                             // Orientation of the dimension
                        { x1: screenP2.x, y1: screenP2.y, x2: screenP3.x, y2: screenP3.y } // Actual object points
                    );
                }
                break;
            
            case 'line':
                if (!tempObject.start || !tempObject.end) {
                } else {
                    const length = Math.sqrt(
                        Math.pow(tempObject.end.x - tempObject.start.x, 2) +
                        Math.pow(tempObject.end.y - tempObject.start.y, 2)
                    );
                    if (length < 0.01) {
                    } else {
                        const screenLineStart = this.camera.worldToScreen(tempObject.start.x, tempObject.start.y);
                        const screenLineEnd = this.camera.worldToScreen(tempObject.end.x, tempObject.end.y);
                        
                        // Calculate offset for dimension line based on its angle
                        const angle = Math.atan2(screenLineEnd.y - screenLineStart.y, screenLineEnd.x - screenLineStart.x);
                        const offsetX = Math.sin(angle) * this.dimensionOffset; // Perpendicular offset X
                        const offsetY = -Math.cos(angle) * this.dimensionOffset; // Perpendicular offset Y

                        this.drawDimensionLineWithLabel(
                            { x: screenLineStart.x + offsetX, y: screenLineStart.y + offsetY },
                            { x: screenLineEnd.x + offsetX, y: screenLineEnd.y + offsetY },
                            this.formatDimensionValue(length),
                            'aligned',
                            { x1: screenLineStart.x, y1: screenLineStart.y, x2: screenLineEnd.x, y2: screenLineEnd.y }
                        );
                    } // End else for length check
                } // End else for start/end undefined check
                break;

            case 'circle':
                if (tempObject.center === undefined || tempObject.radius === undefined || tempObject.radius <= 0) {
                } else {
                    const screenCenter = this.camera.worldToScreen(tempObject.center.x, tempObject.center.y);
                    const screenRadius = tempObject.radius * this.camera.zoom;
                    
                    if (screenRadius < 1) {
                    } else {
                        const diameter = tempObject.radius * 2;
                        const labelText = this.formatDimensionValue(diameter) + " Ø"; // Diameter symbol

                        // Horizontal dimension line for diameter
                        this.drawDimensionLineWithLabel(
                            { x: screenCenter.x - screenRadius, y: screenCenter.y - this.dimensionOffset }, 
                            { x: screenCenter.x + screenRadius, y: screenCenter.y - this.dimensionOffset },
                            labelText,
                            'horizontal',
                            // objectPoints for extension lines, from the circle's actual diameter edges
                            { 
                                x1: screenCenter.x - screenRadius, y1: screenCenter.y, // Left edge of circle
                                x2: screenCenter.x + screenRadius, y2: screenCenter.y  // Right edge of circle
                            }
                        );
                    } // End else for screenRadius check
                } // End else for center/radius undefined check
                break;
        } // End switch
        this.ctx.lineWidth = originalLineWidth;        this.ctx.restore(); // Restore context after all dimension drawing is done for this function call
    }

    drawDimensionLineWithLabel(p1Dim, p2Dim, label, orientation, objectPoints) {
        // Validate inputs
        if (!p1Dim || !p2Dim || !label || !orientation || !objectPoints) {
            return;
        }
        
        
        this.ctx.save();
        
        // Force dimension line colors to be highly visible
        this.ctx.strokeStyle = '#ff0000';  // Bright red for debugging
        this.ctx.fillStyle = '#000000';    // Black text
        this.ctx.font = `${this.dimensionFontSize}px Arial`;
        this.ctx.lineWidth = 2;            // Thicker lines for visibility
        this.ctx.setLineDash([]);          // Solid lines
        

        // Draw main dimension line - make it highly visible
        this.ctx.beginPath();
        this.ctx.moveTo(p1Dim.x, p1Dim.y);
        this.ctx.lineTo(p2Dim.x, p2Dim.y);
        this.ctx.stroke();
        
        
        // Draw label at midpoint
        const midX = (p1Dim.x + p2Dim.x) / 2;
        const midY = (p1Dim.y + p2Dim.y) / 2;
        
        this.ctx.fillText(label, midX, midY - 5);
        
        this.ctx.restore();
    }
        const extOffsetFromObject = 2; // Small gap between object and start of extension line
        const arrowSize = 5;
        const textPadding = 2;

        // 1. Draw Extension Lines
        if (orientation === 'horizontal') {
            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.x1, objectPoints.y1 - Math.sign(p1Dim.y - objectPoints.y1) * extOffsetFromObject);
            this.ctx.lineTo(objectPoints.x1, p1Dim.y + Math.sign(p1Dim.y - objectPoints.y1) * extLengthPastDimLine);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.x2, objectPoints.y2 - Math.sign(p2Dim.y - objectPoints.y2) * extOffsetFromObject);
            this.ctx.lineTo(objectPoints.x2, p2Dim.y + Math.sign(p2Dim.y - objectPoints.y2) * extLengthPastDimLine);
            this.ctx.stroke();
        } else if (orientation === 'vertical') {
            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.x1 - Math.sign(p1Dim.x - objectPoints.x1) * extOffsetFromObject, objectPoints.y1);
            this.ctx.lineTo(p1Dim.x + Math.sign(p1Dim.x - objectPoints.x1) * extLengthPastDimLine, objectPoints.y1);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.x2 - Math.sign(p2Dim.x - objectPoints.x2) * extOffsetFromObject, objectPoints.y2);
            this.ctx.lineTo(p2Dim.x + Math.sign(p2Dim.x - objectPoints.x2) * extLengthPastDimLine, objectPoints.y2);
            this.ctx.stroke();
        } else if (orientation === 'aligned' && objectPoints.type !== 'radius') {
            const angle = Math.atan2(objectPoints.y2 - objectPoints.y1, objectPoints.x2 - objectPoints.x1);
            const perpAngle = angle + Math.PI / 2;

            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.x1 - Math.cos(perpAngle) * extOffsetFromObject, objectPoints.y1 - Math.sin(perpAngle) * extOffsetFromObject);
            this.ctx.lineTo(p1Dim.x - Math.cos(perpAngle) * extLengthPastDimLine, p1Dim.y - Math.sin(perpAngle) * extLengthPastDimLine);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.x2 - Math.cos(perpAngle) * extOffsetFromObject, objectPoints.y2 - Math.sin(perpAngle) * extOffsetFromObject);
            this.ctx.lineTo(p2Dim.x - Math.cos(perpAngle) * extLengthPastDimLine, p2Dim.y - Math.sin(perpAngle) * extLengthPastDimLine);
            this.ctx.stroke();
        } else if (objectPoints.type === 'radius') {
            // Extension for radius: line from center to dimension line start if needed, or specific radius appearance
            // For a typical radius dimension, one extension line might go from the center outwards.
            // The main dimension line itself often acts as the other "extension".
            // This part can be enhanced for specific radius dimension appearance.
            // Example: Draw a line from center to the start of the dimension text/line
            this.ctx.beginPath();
            this.ctx.moveTo(objectPoints.cx, objectPoints.cy);
            this.ctx.lineTo(p1Dim.x, p1Dim.y); // Assuming p1Dim is where the dimension line/text starts near the center
            this.ctx.stroke();
        }

        // 2. Draw Main Dimension Line
        this.ctx.beginPath();
        this.ctx.moveTo(p1Dim.x, p1Dim.y);
        this.ctx.lineTo(p2Dim.x, p2Dim.y);
        this.ctx.stroke();

        // 3. Draw Arrowheads
        const dimLineAngle = Math.atan2(p2Dim.y - p1Dim.y, p2Dim.x - p1Dim.x);
        const arrowAngleOffset = Math.PI / 6; // 30 degrees for arrowhead spread

        // Arrow at p1Dim
        this.ctx.beginPath();
        this.ctx.moveTo(p1Dim.x, p1Dim.y);
        this.ctx.lineTo(p1Dim.x + arrowSize * Math.cos(dimLineAngle + Math.PI - arrowAngleOffset), p1Dim.y + arrowSize * Math.sin(dimLineAngle + Math.PI - arrowAngleOffset));
        this.ctx.moveTo(p1Dim.x, p1Dim.y);
        this.ctx.lineTo(p1Dim.x + arrowSize * Math.cos(dimLineAngle + Math.PI + arrowAngleOffset), p1Dim.y + arrowSize * Math.sin(dimLineAngle + Math.PI + arrowAngleOffset));
        this.ctx.stroke();

        // Arrow at p2Dim
        this.ctx.beginPath();
        this.ctx.moveTo(p2Dim.x, p2Dim.y);
        this.ctx.lineTo(p2Dim.x + arrowSize * Math.cos(dimLineAngle - arrowAngleOffset), p2Dim.y + arrowSize * Math.sin(dimLineAngle - arrowAngleOffset));
        this.ctx.moveTo(p2Dim.x, p2Dim.y);
        this.ctx.lineTo(p2Dim.x + arrowSize * Math.cos(dimLineAngle + arrowAngleOffset), p2Dim.y + arrowSize * Math.sin(dimLineAngle + arrowAngleOffset));
        this.ctx.stroke();


        // 4. Draw Text Label
        const textMetrics = this.ctx.measureText(label);
        let tx, ty, rotAngle = 0;
        this.ctx.textAlign = 'center'; 
        this.ctx.textBaseline = 'middle'; 

        if (orientation === 'horizontal') {
            tx = (p1Dim.x + p2Dim.x) / 2;
            ty = p1Dim.y + this.dimensionTextOffset; 
            this.ctx.textBaseline = this.dimensionTextOffset < 0 ? 'bottom' : 'top'; 
            // rotAngle remains 0
        } else if (orientation === 'vertical') {
            tx = (p1Dim.x + p2Dim.x) / 2; // Center X of the vertical line
            ty = (p1Dim.y + p2Dim.y) / 2; // Center Y of the vertical line
            rotAngle = 0; // Horizontal text
            // this.ctx.textAlign is already 'center'
            // this.ctx.textBaseline is already 'middle'
        } else if (orientation === 'aligned' && (!objectPoints || objectPoints.type !== 'radius')) { 
            const midX = (p1Dim.x + p2Dim.x) / 2;
            const midY = (p1Dim.y + p2Dim.y) / 2;
            rotAngle = Math.atan2(p2Dim.y - p1Dim.y, p2Dim.x - p1Dim.x);

            const perpOffsetX = Math.sin(rotAngle) * this.dimensionTextOffset; 
            const perpOffsetY = -Math.cos(rotAngle) * this.dimensionTextOffset;

            tx = midX + perpOffsetX;
            ty = midY + perpOffsetY;
            
            this.ctx.textAlign = 'center';
            if (this.dimensionTextOffset < 0) { 
                 this.ctx.textBaseline = 'bottom'; 
            } else { 
                 this.ctx.textBaseline = 'top';
            }

            if (rotAngle > Math.PI / 2 || rotAngle < -Math.PI / 2) {
                rotAngle += Math.PI; 
            }
        }
        
        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.rotate(rotAngle);

        this.ctx.fillStyle = this.dimensionTextBackgroundColor;
        this.ctx.fillRect(
            -textMetrics.width / 2 - textPadding,
            -this.dimensionFontSize / 2 - textPadding, // Center vertically
            textMetrics.width + 2 * textPadding,
            this.dimensionFontSize + 2 * textPadding
        );
        this.ctx.fillStyle = this.dimensionTextColor;
        this.ctx.fillText(label, 0, 0);
        this.ctx.restore();

        this.ctx.restore();
    }

    // Add this new method to the DrawingEngine class
    formatDimensionValue(value) {
        if (this.app.unitSystem === 'imperial') {
            const inches = value;
            const feet = Math.floor(inches / 12);
            const remainingInches = inches % 12;
            
            const wholeInches = Math.floor(remainingInches);
            const fraction = remainingInches - wholeInches;
            
            let fractionString = '';
            if (fraction > 0) {
                // Common fractions (1/16, 1/8, 3/16, 1/4, 5/16, 3/8, 7/16, 1/2, etc.)
                // This can be made more robust with a lookup or a more complex algorithm
                // For simplicity, we'll handle a few common ones or round to nearest 1/16
                const sixteenths = Math.round(fraction * 16);
                if (sixteenths > 0 && sixteenths < 16) {
                    // Simplify fraction (e.g., 8/16 to 1/2)
                    let num = sixteenths;
                    let den = 16;
                    for (let i = Math.max(num, den); i > 1; i--) {
                        if ((num % i === 0) && (den % i === 0)) {
                            num /= i;
                            den /= i;
                        }
                    }
                    fractionString = ` ${num}/${den}`;
                }
            }
            
            let result = '';
            if (feet > 0) {
                result += `${feet}'`;
            }
            if (wholeInches > 0 || fractionString !== '' || (feet === 0 && inches === 0)) {
                 if (feet > 0 && (wholeInches > 0 || fractionString !== '')) result += ' '; // Add space if feet and inches are both present
                result += `${wholeInches}${fractionString}"`;
            } else if (feet === 0 && wholeInches === 0 && fractionString === '' && inches !== 0) {
                // If it's less than 1/16" but not zero, show decimal for precision
                result = `${inches.toFixed(3)}"`; 
            } else if (result === '') {
                 result = '0"'; // Handle case where value is exactly 0
            }
            return result.trim();

        } else { // metric
            // For metric, show mm, or m if large enough
            if (value >= 1000) { // Assuming world units are mm
                return `${(value / 1000).toFixed(2)} m`;
            } else {
                return `${value.toFixed(1)} mm`;
            }
        }
    }

    hitTest(worldX, worldY, objects, worldTolerance) {
        // Iterate in reverse order so objects drawn on top are checked first
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i];
            let hit = false;

            switch (obj.type) {
                case 'rectangle':
                    // Check if the point is within the rectangle's bounds (plus tolerance)
                    if (worldX >= obj.x - worldTolerance &&
                        worldX <= obj.x + obj.width + worldTolerance &&
                        worldY >= obj.y - worldTolerance &&
                        worldY <= obj.y + obj.height + worldTolerance) {
                        hit = true;
                    }
                    break;
                case 'circle':
                    // Check if the point is within the circle's radius (plus tolerance)
                    const dx = worldX - obj.center.x;
                    const dy = worldY - obj.center.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= obj.radius + worldTolerance) {
                        hit = true;
                    }
                    break;
                case 'line':
                    // Check distance from point to line segment
                    const p = { x: worldX, y: worldY };
                    const p1 = obj.start;
                    const p2 = obj.end;
                    const l2 = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
                    if (l2 === 0) { // Line is a point
                        const distToPoint = Math.sqrt((p.x - p1.x) * (p.x - p1.x) + (p.y - p1.y) * (p.y - p1.y));
                        if (distToPoint <= worldTolerance) {
                            hit = true;
                        }
                    } else {
                        let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
                        t = Math.max(0, Math.min(1, t)); // Clamp t to the segment
                        const closestX = p1.x + t * (p2.x - p1.x);
                        const closestY = p1.y + t * (p2.y - p1.y);
                        const distToSegment = Math.sqrt((p.x - closestX) * (p.x - closestX) + (p.y - closestY) * (p.y - closestY));
                        if (distToSegment <= worldTolerance) {
                            hit = true;
                        }
                    }
                    break;
            }

            if (hit) {
                return obj; // Return the first hit object
            }
        }
        return null; // No object hit
    }

    // Fix pixel alignment for crisp lines
    alignToPixel(coord) {
        return Math.round(coord) + 0.5;
    }

    // Debug coordinate alignment
    debugCoordinateAlignment(worldPos, screenPos, label = '') {
    }
}
