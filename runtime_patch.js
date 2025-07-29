// Runtime patch to fix scaling issue

// Wait for RouterBitSystem to be available
const interval = setInterval(() => {
    if (window.routerBitSystem && window.routerBitSystem.createUniversalCuttingTool) {
        
        // Store original method
        const original = window.routerBitSystem.createUniversalCuttingTool.bind(window.routerBitSystem);
        
        // Replace with patched version
        window.routerBitSystem.createUniversalCuttingTool = function(edge, routerBitMesh, scale, isImported) {
            
            // Call original but force isImported = true for imported bits
            const result = original(edge, routerBitMesh, scale, true);
            
            return result;
        };
        
        clearInterval(interval);
    }
}, 100);

// Timeout after 10 seconds
setTimeout(() => {
    clearInterval(interval);
}, 10000);