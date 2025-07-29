# OPUS 4 - CRITICAL 3D DEPTH BUFFER RENDERING EMERGENCY

## PROBLEM SUMMARY
**CRITICAL ISSUE**: 3D objects (extruded meshes, debug cubes) ALWAYS render in front of the grid, regardless of their actual 3D position. This breaks fundamental CAD functionality where the grid should be the background plane that objects can be positioned behind, in front of, or intersecting with proper depth sorting.

## CURRENT BROKEN BEHAVIOR
1. Switch to 2D sketch mode → draw 2D shapes → works fine
2. Switch to 3D modeling mode → 2D shapes extrude to 3D → **ALL 3D objects appear in front of grid**
3. Debug cubes placed at various Z positions → **ALL appear in front of grid**
4. Grid appears to be "floating" above everything instead of being the background reference plane

## EXPECTED BEHAVIOR (Professional CAD Standard)
- Grid should be the background reference plane (like graph paper)
- 3D objects should render with proper depth sorting relative to grid
- Objects behind the grid plane should be partially occluded
- Objects in front of the grid should render normally
- Objects intersecting the grid should show proper depth relationships

## TECHNICAL ANALYSIS COMPLETED
- **NOT a 2D z-index issue** - this is a 3D depth buffer problem
- **NOT a camera positioning issue** - camera and scene setup are correct
- **NOT a material transparency issue** - both grid and objects have proper materials
- **CONFIRMED**: Grid custom shader, scene setup, and Babylon.js integration are working
- **CONFIRMED**: Objects are being created with correct positions and materials

## BABYLON.JS DEPTH BUFFER CONFIGURATION ATTEMPTED
- Grid: `renderingGroupId = 0`, `disableDepthWrite = false`, `depthFunction = LEQUAL`
- Objects: `renderingGroupId = 1`, standard depth testing
- Scene: Attempted `setRenderingAutoClearDepthStencil(1, false)` and `setDepthFunction(LEQUAL)`
- Grid positioned at `y = -0.01` to ensure it's behind everything

## CRITICAL FILES TO EXAMINE

### PRIMARY FILES (MUST REVIEW)
1. **`d:\CutListApp\src\modules\grid.js`** - Grid rendering, custom shader, 3D scene setup
2. **`d:\CutListApp\src\main.js`** - 3D mesh creation, extrusion logic, object positioning
3. **`d:\CutListApp\src\modules\objectManipulator.js`** - Object manipulation and material assignment

### SECONDARY FILES (CONTEXT)
4. **`d:\CutListApp\src\modules\extrusionGizmo.js`** - Extrusion workflow
5. **`d:\CutListApp\babylon.html`** - Babylon.js integration and loading

## SPECIFIC TECHNICAL QUESTIONS FOR OPUS 4

### 1. BABYLON.JS DEPTH BUFFER ARCHITECTURE
- Is there a fundamental issue with how custom ShaderMaterial interacts with StandardMaterial depth testing?
- Are rendering groups 0 and 1 being processed correctly for depth buffer operations?
- Could the custom grid shader be interfering with scene-wide depth buffer state?

### 2. MESH CREATION AND POSITIONING
- Are the extruded meshes being created with correct world coordinates?
- Is there a matrix transformation issue in the extrusion process?
- Could the sketch plane to 3D conversion be causing positioning errors?

### 3. MATERIAL AND RENDERING ORDER
- Should the grid use a different material type for guaranteed background rendering?
- Are there Babylon.js best practices for grid/background plane rendering being violated?
- Is the shader material depth testing configuration correct?

### 4. SCENE RENDERING PIPELINE
- Could there be a fundamental issue with the render loop or scene setup?
- Are there engine-level settings that need to be configured for proper depth sorting?
- Is the canvas/engine initialization causing depth buffer issues?

## DEBUGGING EVIDENCE PROVIDED
- Multiple attempts to fix depth buffer settings in grid.js
- Debug cubes added for visual depth testing
- Diagnostic material swaps (StandardMaterial vs custom shader)
- Console logging confirms correct object positions and materials
- Scene setup follows Babylon.js documentation patterns

## WHAT NEEDS TO BE SOLVED
1. **IMMEDIATE FIX**: Proper depth sorting between grid and 3D objects
2. **ROOT CAUSE**: Identify why depth buffer is not working correctly
3. **ARCHITECTURE**: Ensure solution works for complex CAD scenarios
4. **VALIDATION**: Confirm objects can be positioned behind, in front of, and intersecting grid

## CONSTRAINTS
- Must maintain existing custom grid shader (professional CAD appearance)
- Must maintain existing object creation and extrusion workflow
- Must work with current Babylon.js version and scene setup
- Must upload final fixes to server using PowerShell curl.exe

## FAILURE MODES TO AVOID
- Do not change grid to transparent/wireframe (needs to be solid background)
- Do not disable depth testing entirely (breaks 3D object interactions)
- Do not change rendering to 2D overlay (must be true 3D depth sorting)
- Do not break existing 2D sketch mode functionality

## SUCCESS CRITERIA
- Grid renders as background plane with proper depth buffer participation
- 3D objects render with correct depth sorting relative to grid
- Objects at different Z positions show proper depth relationships
- Professional CAD appearance maintained
- No visual artifacts or rendering glitches

## PLEASE PROVIDE
1. **ROOT CAUSE ANALYSIS**: What is fundamentally wrong with the depth buffer setup?
2. **SPECIFIC CODE FIXES**: Exact changes needed in the identified files
3. **BABYLON.JS EXPERTISE**: Best practices for grid/background plane rendering
4. **VALIDATION STRATEGY**: How to test and confirm the fix works correctly

This is a critical blocker for the entire CAD application. The depth buffer issue makes the 3D modeling mode unusable for professional CAD work.
