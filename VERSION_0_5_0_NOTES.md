# CutList v0.5.0 Development Notes

## Version 0.5.0 Goals
- Resolve mouse control issues with Babylon.js ArcRotateCamera
- Wire up dashboard feature buttons one by one
- Implement basic drawing tools (line, rectangle, circle)
- Add selection functionality for left mouse
- Implement sketch plane switching
- Add project save/load functionality

## Current State
- ✅ Migrated from Three.js to Babylon.js
- ✅ Created modular architecture with separated files
- ✅ Added dashboard with feature buttons
- ✅ Implemented grid with Babylon.js GridMaterial
- ✅ Centralized appearance variables
- ⚠️ Mouse controls need fixing (right mouse rotate, middle mouse pan, left mouse select)

## Architecture
- `src/main.js` - Main application logic
- `src/js/camera.js` - Camera controls (needs mouse fixes)
- `src/js/grid.js` - Grid rendering
- `src/js/toolbar.js` - Toolbar functionality
- `src/js/world.js` - 3D world management
- `src/js/utils.js` - Utility functions
- `src/appearance.js` - Centralized styling variables
- `src/styles/main.css` - All CSS styles

## Next Steps for Assclown
1. Fix mouse controls for natural CAD workflow
2. Wire up "New Project" button functionality
3. Implement basic drawing tools
4. Add selection system for left mouse
5. Create sketch mode vs modeling mode switching

## Mouse Control Requirements
- Right mouse: Rotate/orbit camera
- Middle mouse: Pan camera
- Left mouse: Select objects (no camera movement)
- Mouse wheel: Zoom
