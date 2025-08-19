/**
 * PlaneToolSystem Module - Simple 2D Planing Interface
 * 
 * Creates a clean modal dialog with 2D visual representation of board thickness
 * and an adjustable cutting line with 1/32" precision snapping.
 * 
 * Features:
 * - Clean 2D modal interface
 * - Visual thickness representation
 * - Draggable cutting line with 1/32" snapping
 * - Real-time measurements
 * - Apply/Cancel buttons
 */

export class PlaneToolSystem {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        this.scene = drawingWorld.scene;
        this.canvas = drawingWorld.canvas;
        
        // Planing tool state
        this.planeToolActive = false;
        this.selectedPart = null;
        this.originalThickness = 0;
        this.cuttingPosition = 0; // Position from bottom in inches
        this.snapIncrement = 1/32; // 1/32" increments
        
        // Modal elements
        this.modal = null;
        this.isDragging = false;
        
        this.init();
    }
    
    /**
     * Initialize the planing tool system
     */
    init() {
        this.createModal();
    }
    
    /**
     * Create the planing modal HTML
     */
    createModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="planing-modal" class="modal-overlay" style="display: none;">
                <div class="modal-content planing-modal">
                    <div class="modal-header">
                        <h3>Thickness Planer</h3>
                        <button id="close-planing-modal" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="planing-interface">
                            <div class="thickness-display">
                                <div class="thickness-ruler">
                                    <div class="ruler-line top-line"></div>
                                    <div class="ruler-line bottom-line"></div>
                                    <div class="cutting-line" id="cutting-line">
                                        <div class="cutting-head">✂</div>
                                    </div>
                                    <div class="thickness-labels">
                                        <span class="thickness-label top-label">Top</span>
                                        <span class="thickness-label bottom-label">Bottom</span>
                                    </div>
                                </div>
                                <div class="measurements">
                                    <div class="measurement">
                                        <label>Original Thickness:</label>
                                        <span id="original-thickness">0.000"</span>
                                    </div>
                                    <div class="measurement">
                                        <label>Final Thickness:</label>
                                        <span id="final-thickness">0.000"</span>
                                    </div>
                                    <div class="measurement remove">
                                        <label>Remove:</label>
                                        <span id="remove-amount">0.000"</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-planing" class="btn-secondary">Cancel</button>
                        <button id="apply-planing" class="btn-primary">Apply Planing</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        this.modal = document.getElementById('planing-modal');
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for the modal
     */
    setupEventListeners() {
        // Close button
        document.getElementById('close-planing-modal').addEventListener('click', () => {
            this.cancelPlaning();
        });
        
        // Cancel button
        document.getElementById('cancel-planing').addEventListener('click', () => {
            this.cancelPlaning();
        });
        
        // Apply button
        document.getElementById('apply-planing').addEventListener('click', () => {
            this.commitPlaning();
        });
        
        // Cutting line dragging
        const cuttingLine = document.getElementById('cutting-line');
        cuttingLine.addEventListener('mousedown', (e) => {
            this.startDragging(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            this.onDrag(e);
        });
        
        document.addEventListener('mouseup', () => {
            this.stopDragging();
        });
        
        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.cancelPlaning();
            }
        });
    }
    
    /**
     * Activate planing tool and show modal
     */
    activate() {
        this.planeToolActive = true;
        
        // Find selected part
        this.selectedPart = this.drawingWorld.selectedPart;
        if (!this.selectedPart) {
            // Find first work bench part
            const workBenchParts = this.scene.meshes.filter(m => m.isWorkBenchPart);
            if (workBenchParts.length > 0) {
                this.selectedPart = workBenchParts[0].partData;
                this.drawingWorld.selectPart(this.selectedPart);
            }
        }
        
        if (!this.selectedPart) {
            return;
        }
        
        this.originalThickness = this.selectedPart.dimensions.thickness;
        this.cuttingPosition = this.originalThickness; // Start at top
        
        this.showModal();
    }
    
    /**
     * Show the planing modal
     */
    showModal() {
        this.modal.style.display = 'flex';
        this.updateInterface();
        this.updateCuttingLinePosition();
    }
    
    /**
     * Hide the planing modal
     */
    hideModal() {
        this.modal.style.display = 'none';
    }
    
    /**
     * Update the interface with current values
     */
    updateInterface() {
        document.getElementById('original-thickness').textContent = `${this.originalThickness.toFixed(3)}"`;
        this.updateMeasurements();
    }
    
    /**
     * Update measurements display
     */
    updateMeasurements() {
        const finalThickness = this.cuttingPosition;
        const removeAmount = this.originalThickness - this.cuttingPosition;
        
        document.getElementById('final-thickness').textContent = `${finalThickness.toFixed(3)}"`;
        document.getElementById('remove-amount').textContent = `${removeAmount.toFixed(3)}"`;
    }
    
    /**
     * Update cutting line visual position
     */
    updateCuttingLinePosition() {
        const cuttingLine = document.getElementById('cutting-line');
        const ruler = document.querySelector('.thickness-ruler');
        
        // Calculate position as percentage from bottom
        const percentage = (this.cuttingPosition / this.originalThickness) * 100;
        cuttingLine.style.bottom = `${percentage}%`;
        
        this.updateMeasurements();
    }
    
    /**
     * Start dragging the cutting line
     */
    startDragging(e) {
        this.isDragging = true;
        e.preventDefault();
        document.body.style.cursor = 'grabbing';
    }
    
    /**
     * Handle dragging the cutting line
     */
    onDrag(e) {
        if (!this.isDragging) return;
        
        const ruler = document.querySelector('.thickness-ruler');
        const rect = ruler.getBoundingClientRect();
        
        // Calculate position relative to ruler (inverted - top of ruler = top of board)
        const relativeY = e.clientY - rect.top;
        const rulerHeight = rect.height;
        
        // Convert to thickness position (0 = bottom, originalThickness = top)
        let newPosition = this.originalThickness * (1 - (relativeY / rulerHeight));
        
        // Snap to 1/32" increments
        newPosition = Math.round(newPosition / this.snapIncrement) * this.snapIncrement;
        
        // Clamp to valid range (minimum 1/8" thickness)
        newPosition = Math.max(0.125, Math.min(this.originalThickness - 0.03125, newPosition));
        
        this.cuttingPosition = newPosition;
        this.updateCuttingLinePosition();
    }
    
    /**
     * Stop dragging the cutting line
     */
    stopDragging() {
        this.isDragging = false;
        document.body.style.cursor = 'default';
    }
    
    /**
     * Commit the planing operation - show edit measurements step
     */
    commitPlaning() {
        if (!this.selectedPart) return;
        
        const newThickness = this.cuttingPosition;
        const removeAmount = this.originalThickness - newThickness;
        
        if (removeAmount <= 0) {
            return;
        }
        
        this.showEditMeasurementsStep();
    }
    
    /**
     * Show the edit measurements step for fine-tuning
     */
    showEditMeasurementsStep() {
        const modalBody = document.querySelector('#planing-modal .modal-body');
        const newThickness = this.cuttingPosition;
        const removeAmount = this.originalThickness - newThickness;
        
        modalBody.innerHTML = `
            <div class="edit-measurements-interface">
                <h3>Fine-Tune Measurements</h3>
                <p>Adjust the measurements below for precision:</p>
                
                <div class="measurement-edit-row">
                    <label>Final Thickness:</label>
                    <input type="text" id="final-thickness-input" value="${this.formatMeasurement(newThickness)}">
                    <span class="unit">inches</span>
                </div>
                
                <div class="measurement-edit-row">
                    <label>Remove Amount:</label>
                    <input type="text" id="remove-amount-input" value="${this.formatMeasurement(removeAmount)}">
                    <span class="unit">inches</span>
                </div>
                
                <div class="measurement-edit-row">
                    <label>Original Thickness:</label>
                    <span class="readonly-value">${this.formatMeasurement(this.originalThickness)}"</span>
                </div>
                
                <div class="measurement-notes">
                    <p><strong>Tip:</strong> You can enter fractions like "2 15/16" or decimals like "2.9375"</p>
                </div>
            </div>
        `;
        
        // Update modal footer
        const modalFooter = document.querySelector('#planing-modal .modal-footer');
        modalFooter.innerHTML = `
            <button id="back-to-visual" class="btn-secondary">← Back to Visual</button>
            <button id="apply-precise-cut" class="btn-primary">Apply Precise Cut</button>
        `;
        
        // Setup event listeners
        this.setupEditMeasurementsListeners();
    }
    
    /**
     * Setup event listeners for edit measurements
     */
    setupEditMeasurementsListeners() {
        const finalThicknessInput = document.getElementById('final-thickness-input');
        const removeAmountInput = document.getElementById('remove-amount-input');
        const backBtn = document.getElementById('back-to-visual');
        const applyBtn = document.getElementById('apply-precise-cut');
        
        // Auto-calculate other measurement when one changes
        finalThicknessInput.addEventListener('input', (e) => {
            const finalThickness = this.parseMeasurement(e.target.value);
            if (finalThickness !== null && finalThickness > 0 && finalThickness < this.originalThickness) {
                const removeAmount = this.originalThickness - finalThickness;
                removeAmountInput.value = this.formatMeasurement(removeAmount);
            }
        });
        
        removeAmountInput.addEventListener('input', (e) => {
            const removeAmount = this.parseMeasurement(e.target.value);
            if (removeAmount !== null && removeAmount > 0 && removeAmount < this.originalThickness) {
                const finalThickness = this.originalThickness - removeAmount;
                finalThicknessInput.value = this.formatMeasurement(finalThickness);
            }
        });
        
        // Back to visual interface
        backBtn.addEventListener('click', () => {
            this.showModal(); // Recreate the visual interface
        });
        
        // Apply precise cut
        applyBtn.addEventListener('click', () => {
            this.applyPreciseCut();
        });
    }
    
    /**
     * Apply the precise cut with edited measurements
     */
    applyPreciseCut() {
        const finalThicknessInput = document.getElementById('final-thickness-input');
        const newThickness = this.parseMeasurement(finalThicknessInput.value);
        
        if (newThickness === null || newThickness <= 0 || newThickness >= this.originalThickness) {
            // alert('Please enter a valid thickness between 0 and ' + this.formatMeasurement(this.originalThickness) + ' inches');
            return;
        }
        
        const removeAmount = this.originalThickness - newThickness;
        
        
        // Find and update the actual mesh
        const targetMesh = this.scene.meshes.find(m => m.partData && m.partData.id === this.selectedPart.id);
        if (targetMesh) {
            // Update mesh scaling
            const scaleFactor = newThickness / this.originalThickness;
            targetMesh.scaling.y *= scaleFactor;
            
            // Move part down by half the removed amount (removing from top)
            targetMesh.position.y -= removeAmount / 2;
        }
        
        // Update part data
        this.selectedPart.dimensions.thickness = newThickness;
        this.selectedPart.dimensions.thickness_inches = newThickness / 2.54; // Update inches too
        this.selectedPart.status = 'planed';
        
        // CRITICAL: Update meshGeometry to preserve the planed state
        // This ensures duplicates and saves reflect the actual board state
        if (targetMesh) {
            // Preserve the modified geometry
            const meshData = this.drawingWorld.serializeMeshGeometry(targetMesh);
            this.selectedPart.meshGeometry = meshData;
            this.selectedPart.meshGeometry.hasCustomGeometry = true;
            
            // Update the stored position too
            this.selectedPart.meshGeometry.position = {
                x: targetMesh.position.x,
                y: targetMesh.position.y,
                z: targetMesh.position.z
            };
            this.selectedPart.meshGeometry.rotation = {
                x: targetMesh.rotation.x,
                y: targetMesh.rotation.y,
                z: targetMesh.rotation.z
            };
            
            console.log('PlaneToolSystem: Updated meshGeometry for planed board', this.selectedPart.id);
        }
        
        // Add to processing history
        if (!this.selectedPart.processingHistory) this.selectedPart.processingHistory = [];
        this.selectedPart.processingHistory.push({
            operation: 'plane',
            timestamp: new Date().toISOString(),
            details: `Planed ${removeAmount.toFixed(3)}" from top, new thickness: ${newThickness.toFixed(3)}" (precision edited)`
        });
        
        // Update part name
        if (!this.selectedPart.materialName.includes('Planed')) {
            this.selectedPart.materialName += ' (Planed)';
        }
        
        // Update displays
        this.drawingWorld.updateWorkBenchDisplay();
        
        // Close modal and deactivate
        this.hideModal();
        this.deactivate();
        this.drawingWorld.activeTool = 'pointer';
        this.drawingWorld.updateToolButtonStates();
        
    }
    
    /**
     * Parse measurement input (handles fractions and decimals)
     */
    parseMeasurement(input) {
        if (!input || input.trim() === '') return null;
        
        const trimmed = input.trim();
        
        // Handle fractions like "2 15/16" or "15/16"
        const fractionMatch = trimmed.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
        if (fractionMatch) {
            const whole = parseInt(fractionMatch[1]) || 0;
            const numerator = parseInt(fractionMatch[2]);
            const denominator = parseInt(fractionMatch[3]);
            return whole + (numerator / denominator);
        }
        
        // Handle whole numbers with fractions like "2 15/16"
        const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
            const whole = parseInt(mixedMatch[1]);
            const numerator = parseInt(mixedMatch[2]);
            const denominator = parseInt(mixedMatch[3]);
            return whole + (numerator / denominator);
        }
        
        // Handle decimals
        const decimal = parseFloat(trimmed);
        if (!isNaN(decimal)) {
            return decimal;
        }
        
        return null;
    }
    
    /**
     * Format measurement for display (convert to fractions when appropriate)
     */
    formatMeasurement(decimal) {
        if (decimal === null || decimal === undefined) return '0.000';
        
        const whole = Math.floor(decimal);
        const remainder = decimal - whole;
        
        // Common fractions (in 32nds for woodworking)
        const fractions = [
            { decimal: 1/32, display: '1/32' },
            { decimal: 1/16, display: '1/16' },
            { decimal: 3/32, display: '3/32' },
            { decimal: 1/8, display: '1/8' },
            { decimal: 5/32, display: '5/32' },
            { decimal: 3/16, display: '3/16' },
            { decimal: 7/32, display: '7/32' },
            { decimal: 1/4, display: '1/4' },
            { decimal: 9/32, display: '9/32' },
            { decimal: 5/16, display: '5/16' },
            { decimal: 11/32, display: '11/32' },
            { decimal: 3/8, display: '3/8' },
            { decimal: 13/32, display: '13/32' },
            { decimal: 7/16, display: '7/16' },
            { decimal: 15/32, display: '15/32' },
            { decimal: 1/2, display: '1/2' },
            { decimal: 17/32, display: '17/32' },
            { decimal: 9/16, display: '9/16' },
            { decimal: 19/32, display: '19/32' },
            { decimal: 5/8, display: '5/8' },
            { decimal: 21/32, display: '21/32' },
            { decimal: 11/16, display: '11/16' },
            { decimal: 23/32, display: '23/32' },
            { decimal: 3/4, display: '3/4' },
            { decimal: 25/32, display: '25/32' },
            { decimal: 13/16, display: '13/16' },
            { decimal: 27/32, display: '27/32' },
            { decimal: 7/8, display: '7/8' },
            { decimal: 29/32, display: '29/32' },
            { decimal: 15/16, display: '15/16' },
            { decimal: 31/32, display: '31/32' }
        ];
        
        // Find closest fraction (within 0.005 tolerance)
        for (const fraction of fractions) {
            if (Math.abs(remainder - fraction.decimal) < 0.005) {
                return whole > 0 ? `${whole} ${fraction.display}` : fraction.display;
            }
        }
        
        // Fall back to decimal
        return decimal.toFixed(3);
    }
    
    /**
     * Cancel the planing operation
     */
    cancelPlaning() {
        this.hideModal();
        this.deactivate();
        this.drawingWorld.activeTool = 'pointer';
        this.drawingWorld.updateToolButtonStates();
    }
    
    /**
     * Deactivate planing tool
     */
    deactivate() {
        this.planeToolActive = false;
        this.isDragging = false;
        document.body.style.cursor = 'default';
    }
    
    /**
     * Cleanup when tool system is destroyed
     */
    destroy() {
        if (this.modal) {
            this.modal.remove();
        }
    }
}