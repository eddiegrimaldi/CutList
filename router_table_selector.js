/**
 * Router Bit Selector for TheRouterTable
 * Integrates with the existing router table workflow
 */

// Add this to TheRouterTable.js after the class definition
// Or include as a separate script

(function() {
    // Wait for TheRouterTable to be available
    const originalOpenRouterTable = TheRouterTable.prototype.openRouterTable;
    
    TheRouterTable.prototype.openRouterTable = function(boardMesh, boardPartData) {
        // Call original method
        originalOpenRouterTable.call(this, boardMesh, boardPartData);
        
        // Add bit selector UI
        this.addBitSelector();
    };
    
    TheRouterTable.prototype.addBitSelector = function() {
        // Check if selector already exists
        if (document.getElementById('router-bit-selector-table')) {
            return;
        }
        
        // Create bit selector panel for the router table
        const selectorHTML = `
            <div id="router-bit-selector-table" style="
                position: absolute;
                top: 120px;
                right: 20px;
                width: 280px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                padding: 0;
                font-family: 'Segoe UI', sans-serif;
            ">
                <div style="
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 8px 8px 0 0;
                    font-size: 14px;
                    font-weight: 600;
                ">
                    Select Router Bit Profile
                </div>
                
                <div style="padding: 12px;">
                    <!-- Chamfer Bits -->
                    <div style="margin-bottom: 8px;">
                        <button class="router-bit-btn" data-bit="chamfer_quarter_inch_precise" style="
                            width: 60px;
                            height: 60px;
                            margin: 4px;
                            border: 2px solid #e0e0e0;
                            border-radius: 6px;
                            background: white;
                            cursor: pointer;
                            position: relative;
                        " title="1/4 inch Chamfer">
                            <svg viewBox="0 0 40 40" style="width: 100%; height: 70%;">
                                <rect x="0" y="0" width="40" height="10" fill="#f0f0f0"/>
                                <polygon points="30,10 30,30 10,30" fill="#333"/>
                                <rect x="0" y="30" width="40" height="10" fill="#f0f0f0"/>
                            </svg>
                            <span style="font-size: 9px;">1/4" Chamfer</span>
                        </button>
                        
                        <button class="router-bit-btn" data-bit="chamfer_half_inch_precise" style="
                            width: 60px;
                            height: 60px;
                            margin: 4px;
                            border: 2px solid #e0e0e0;
                            border-radius: 6px;
                            background: white;
                            cursor: pointer;
                            position: relative;
                        " title="1/2 inch Chamfer">
                            <svg viewBox="0 0 40 40" style="width: 100%; height: 70%;">
                                <rect x="0" y="0" width="40" height="10" fill="#f0f0f0"/>
                                <polygon points="35,10 35,35 5,35" fill="#333"/>
                                <rect x="0" y="35" width="40" height="5" fill="#f0f0f0"/>
                            </svg>
                            <span style="font-size: 9px;">1/2" Chamfer</span>
                        </button>
                    </div>
                    
                    <!-- Roundover Bits -->
                    <div style="margin-bottom: 8px;">
                        <button class="router-bit-btn" data-bit="roundover_quarter_inch_precise" style="
                            width: 60px;
                            height: 60px;
                            margin: 4px;
                            border: 2px solid #e0e0e0;
                            border-radius: 6px;
                            background: white;
                            cursor: pointer;
                            position: relative;
                        " title="1/4 inch Roundover">
                            <svg viewBox="0 0 40 40" style="width: 100%; height: 70%;">
                                <rect x="0" y="0" width="40" height="10" fill="#f0f0f0"/>
                                <path d="M 30 10 Q 30 30 10 30" fill="none" stroke="#333" stroke-width="8"/>
                                <rect x="0" y="30" width="40" height="10" fill="#f0f0f0"/>
                            </svg>
                            <span style="font-size: 9px;">1/4" Round</span>
                        </button>
                        
                        <button class="router-bit-btn" data-bit="roundover_half_inch_precise" style="
                            width: 60px;
                            height: 60px;
                            margin: 4px;
                            border: 2px solid #e0e0e0;
                            border-radius: 6px;
                            background: white;
                            cursor: pointer;
                            position: relative;
                        " title="1/2 inch Roundover">
                            <svg viewBox="0 0 40 40" style="width: 100%; height: 70%;">
                                <rect x="0" y="0" width="40" height="5" fill="#f0f0f0"/>
                                <path d="M 35 5 Q 35 35 5 35" fill="none" stroke="#333" stroke-width="6"/>
                                <rect x="0" y="35" width="40" height="5" fill="#f0f0f0"/>
                            </svg>
                            <span style="font-size: 9px;">1/2" Round</span>
                        </button>
                    </div>
                    
                    <!-- Other Bits -->
                    <div>
                        <button class="router-bit-btn" data-bit="cove_quarter" style="
                            width: 60px;
                            height: 60px;
                            margin: 4px;
                            border: 2px solid #e0e0e0;
                            border-radius: 6px;
                            background: white;
                            cursor: pointer;
                            position: relative;
                        " title="1/4 inch Cove">
                            <svg viewBox="0 0 40 40" style="width: 100%; height: 70%;">
                                <rect x="0" y="0" width="40" height="10" fill="#f0f0f0"/>
                                <path d="M 10 10 Q 10 30 30 30" fill="#333"/>
                                <rect x="0" y="30" width="40" height="10" fill="#f0f0f0"/>
                            </svg>
                            <span style="font-size: 9px;">1/4" Cove</span>
                        </button>
                        
                        <button class="router-bit-btn" data-bit="ogee_classic" style="
                            width: 60px;
                            height: 60px;
                            margin: 4px;
                            border: 2px solid #e0e0e0;
                            border-radius: 6px;
                            background: white;
                            cursor: pointer;
                            position: relative;
                        " title="Classical Ogee">
                            <svg viewBox="0 0 40 40" style="width: 100%; height: 70%;">
                                <rect x="0" y="0" width="40" height="10" fill="#f0f0f0"/>
                                <path d="M 30 10 Q 25 20 30 25 Q 35 30 25 35 L 10 35 L 10 10 Z" fill="#333"/>
                                <rect x="0" y="35" width="40" height="5" fill="#f0f0f0"/>
                            </svg>
                            <span style="font-size: 9px;">Ogee</span>
                        </button>
                    </div>
                </div>
                
                <div id="selected-bit-display" style="
                    padding: 8px 12px;
                    background: #f8f9fa;
                    border-top: 1px solid #e0e0e0;
                    border-radius: 0 0 8px 8px;
                    font-size: 12px;
                    color: #666;
                ">
                    Selected: <strong id="current-bit-name">1/4" Roundover</strong>
                </div>
            </div>
        `;
        
        // Add to router container
        if (this.routerContainer) {
            this.routerContainer.insertAdjacentHTML('beforeend', selectorHTML);
            
            // Set up event listeners
            const buttons = document.querySelectorAll('.router-bit-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Remove previous selection
                    buttons.forEach(b => {
                        b.style.borderColor = '#e0e0e0';
                        b.style.background = 'white';
                    });
                    
                    // Highlight selected
                    btn.style.borderColor = '#667eea';
                    btn.style.background = '#f0f4ff';
                    
                    // Update the router bit
                    const bitKey = btn.dataset.bit;
                    this.setRouterBit(bitKey);
                    
                    // Update display
                    const bitName = btn.getAttribute('title');
                    document.getElementById('current-bit-name').textContent = bitName;
                });
            });
            
            // Select default bit
            const defaultBtn = document.querySelector('[data-bit="roundover_quarter_inch_precise"]');
            if (defaultBtn) {
                defaultBtn.click();
            }
        }
    };
    
    TheRouterTable.prototype.setRouterBit = function(bitKey) {
        // Get bit data from library
        if (window.RouterBitLibrary && window.RouterBitLibrary.bits[bitKey]) {
            const bitData = window.RouterBitLibrary.bits[bitKey];
            this.routerBit = bitData.name;
            this.routerBitProfile = bitData.profilePoints;
            this.currentBitKey = bitKey;
            
            console.log('Router bit set to:', bitData.name);
            console.log('Profile points:', bitData.profilePoints);
            
            // Update any status displays
            const instruction = document.getElementById('edgeInstruction');
            if (instruction) {
                instruction.textContent = `Using ${bitData.name} - Click edges to apply router profile`;
            }
        }
    };
    
    // Override the applyRouterBit method to use our profiles
    const originalApplyRouterBit = TheRouterTable.prototype.applyRouterBit;
    
    TheRouterTable.prototype.applyRouterBit = function(edge) {
        // If we have a custom profile, use it
        if (this.routerBitProfile && this.currentBitKey) {
            console.log('Applying custom router bit profile:', this.currentBitKey);
            
            // Create CSG operation using the profile
            // This would need to be implemented based on the profile points
            // For now, fall back to original method
        }
        
        // Call original method
        return originalApplyRouterBit.call(this, edge);
    };
})();