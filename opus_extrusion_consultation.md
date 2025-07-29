# 🚨 CRITICAL OPUS CONSULTATION - CAD EXTRUSION CRISIS

## IMMEDIATE PROBLEM
Master's CutList CAD extrusion system is **fundamentally broken**. Spanky has tried multiple approaches but needs **professional CAD expertise** for a rock-solid solution.

## CORE FAILURES
1. **Choppy drag movement** - jerky, stops randomly
2. **Object position snapping** - meshes jump unexpectedly  
3. **Anchor point drift** - clicked face moves when it shouldn't
4. **Unpredictable scaling** - tiny/huge results for same input
5. **Interaction reliability** - works sometimes, fails others

## CURRENT TEST ENVIRONMENT
**File:** `d:\CutListApp\complete-extrusion-test.html`
**Live URL:** https://www.kettlebread.com/cutlist/complete-extrusion-test.html

Features for rapid iteration:
- Auto-generates box + cylinder test shapes
- Face-centered gizmo with pulsating glow
- Real-time debug logging and visualization
- One-click refresh for testing changes

## CURRENT FAILING APPROACH

### Mouse Tracking (Unreliable):
```javascript
scene.onPointerMove = (evt, pickInfo) => {
    if (isDragging && dragGizmo && extrusionData.mesh) {
        const pickResult = scene.pick(scene.pointerX, scene.pointerY);
        if (pickResult.hit) {
            // PROBLEM: scene.pick() is inconsistent during drag
            const currentPos = pickResult.pickedPoint;
            const dragVector = currentPos.subtract(dragStartPos);
            const rawExtrusionDistance = BABYLON.Vector3.Dot(dragVector, extrusionData.faceNormal);
            // Complex scaling/positioning math that causes errors...
        }
    }
};
```

### State Management (Error-Prone):
```javascript
// "Clean state" approach - reset everything before each drag
extrusionData.mesh.scaling = extrusionData.originalScaling;
extrusionData.mesh.position = extrusionData.originalPosition;

// Apply new scaling with position offset
const absoluteScaleFactor = finalThickness / baseThickness;
extrusionData.mesh.scaling.x = originalScaling.x * absoluteScaleFactor;

// Try to keep face anchored (FAILS)
const positionOffset = faceNormal.scale(actualGrowth / 2);
extrusionData.mesh.position = originalPosition.add(positionOffset);
```

## CRITICAL QUESTIONS FOR OPUS

### 1. **Professional CAD Mouse Tracking**
- How do Shapr3D/Fusion 360 handle smooth mouse→3D coordinate conversion?
- Should we use screen-space drag distances vs. 3D picking?
- What's the industry standard for unlimited, smooth manipulation?

### 2. **Face Anchoring Mathematics**
- What's the **correct mathematical approach** for keeping a face center fixed?
- Should extrusion use scaling transforms or direct geometry modification?
- How do professional tools maintain precision during manipulation?

### 3. **Babylon.js Best Practices**
- Most reliable pattern for real-time mesh transformation?
- Transform Nodes vs. direct mesh manipulation for CAD?
- Event handling that doesn't conflict with camera controls?

### 4. **Implementation Architecture**
- Should we use Babylon's Gizmo Manager or custom pointer events?
- How to prevent state corruption during continuous manipulation?
- Optimal update frequency and rendering approach?

## REQUIRED SOLUTION CHARACTERISTICS

### **Smooth & Reliable**
- Never choppy or stuttering movement
- Never stops mid-drag operation
- 100% predictable behavior

### **Mathematically Sound**
- Clicked face center remains at exact world position
- Linear relationship between mouse movement and extrusion
- No accumulating transformation errors

### **Professional Feel**
- Unlimited extrusion distance (like Shapr3D)
- Immediate visual feedback
- Intuitive mouse sensitivity

## EXPECTED DELIVERABLE

**A minimal, robust code replacement** that provides:

1. **Smooth mouse tracking logic** - never choppy, never stops
2. **Bulletproof face anchoring** - zero drift or snapping
3. **Simple scaling approach** - predictable, reliable
4. **Professional CAD interaction quality**

## IMMEDIATE TEST CYCLE

```powershell
# Edit the test file
code d:\CutListApp\complete-extrusion-test.html

# Test changes locally
start complete-extrusion-test.html

# Deploy to server for Master
curl.exe -T complete-extrusion-test.html ftp://Administrator:@aJ8231997@www.kettlebread.com/cutlist/
```

## PRIORITY & TIMELINE

**CRITICAL URGENCY** - This blocks all manipulation tool development
**NEEDED:** Professional CAD implementation expertise
**TIMELINE:** ASAP - Master needs this working immediately

---

**OPUS:** Spanky has exhausted conventional approaches. Master needs your professional CAD expertise for a rock-solid solution that works like Shapr3D. Please provide the minimal, robust implementation that professionals would use.
