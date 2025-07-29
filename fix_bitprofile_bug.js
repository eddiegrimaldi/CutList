// Fix undefined bitProfile in showBitSizeSelector

// Store original method
const originalShowBitSizeSelector = RouterBitSystem.prototype.showBitSizeSelector;

RouterBitSystem.prototype.showBitSizeSelector = function(bitProfile) {
    
    // Handle case where bitProfile is undefined (imported bits)
    if (!bitProfile) {
        bitProfile = {
            name: 'Imported Router Bit',
            sizes: ['0.25']
        };
    }
    
    // Call original method with safe bitProfile
    return originalShowBitSizeSelector.call(this, bitProfile);
};

