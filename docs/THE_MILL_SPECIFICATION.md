# **The Mill Interface - Design Specification**

## **Vision Statement**
The Mill is a dedicated workspace that transforms complex 3D operations into intuitive 2D workflows, simulating a real workshop environment where materials are properly supported and operations are predictable and precise.

---

## **Core Philosophy**
Just as a real mill provides a stable, flat reference surface for all operations, The Mill interface ensures that every modification happens in a controlled, gravity-bound environment where the workpiece rests naturally on the work surface.

## **Workflow Architecture**

### **1. Entry Point - Accessing The Mill**
- **Right-click** any board/part in the main 3D scene
- Context menu displays: **"Send to Mill"** or **"Modify"**
- Submenu options:
  - **Cut** - Straight cuts through material
  - **Route** - Edge profiles and grooves
  - **Drill** - Holes and boring operations
  - **Plane** - Surface finishing
  - **Sand** - Fine finishing
  - *More operations added as developed*

### **2. The Mill Environment**

#### **Workspace Design**
- **Clean, professional workshop aesthetic**
  - Subtle grid overlay on work surface (XZ plane)
  - Muted workshop colors (grays, subtle blues)
  - Professional measurement markings along edges
  - Ambient workshop lighting from above

#### **Interface Layout**
```
┌─────────────────────────────────────────┐
│  [Back to Workbench]  THE MILL  [Help]  │
├─────────────────────────────────────────┤
│ ┌─────┐                                 │
│ │Tools│     Main Workspace              │
│ │     │     (Orthographic View)         │
│ │ Cut │                                 │
│ │Route│     [Board positioned here]     │
│ │Drill│                                 │
│ │     │                                 │
│ └─────┘                                 │
├─────────────────────────────────────────┤
│ Measurements: X: [    ] Z: [    ]       │
│ [Execute Operation] [Cancel]            │
└─────────────────────────────────────────┘
```

### **3. Material Handling in The Mill**

#### **Physical Constraints**
- **Gravity Always On**: Materials naturally rest on the mill bed (XZ plane)
- **No Floating**: Pieces cannot hover or float
- **Stable Positioning**: Material stays where placed unless deliberately moved

#### **Manipulation Tools**
- **Slide** (G): Move material across the mill bed
- **Rotate** (R): Spin around Y-axis (perpendicular to bed)
- **Flip** (F): Turn material over to access opposite face
- **Align** (A): Snap to edges, center, or grid points
- **Measure** (M): Quick dimension checking

### **4. Operation Modes**

#### **CUT Mode**
- **Visual Indicators**:
  - Bright red cutting line across the mill bed
  - Real-time dimension display showing resulting piece sizes
  - Kerf width indicator (material loss from blade)
  
- **Controls**:
  - Drag cutting line to position
  - Numerical input for precise placement
  - Quick presets (halve, thirds, quarters)
  
- **Execution**:
  - Large "EXECUTE CUT" button when properly aligned
  - Preview of resulting pieces before confirming

#### **ROUTE Mode** *(Future)*
- Edge selection highlighting
- Profile preview
- Depth control
- Corner treatment options

#### **DRILL Mode** *(Future)*
- Point-and-click hole placement
- Depth specification
- Hole size selection
- Pattern tools (evenly spaced, grid, etc.)

### **5. View Management**

#### **Primary View - Orthographic (Operations Enabled)**
- **Locked top-down perspective** for precision work
- All measurement tools visible
- Operation guides active
- Clear visual feedback
- **Status**: "READY TO OPERATE"

#### **Inspection View - 3D Free Camera (Operations Paused)**
- **Activated by**: Right-mouse drag or ViewCube
- **Purpose**: Examine work from any angle
- **Visual Changes**:
  - Operation lines become semi-transparent
  - Execute buttons disabled/hidden
  - **Status**: "INSPECTION MODE - Return to top view to continue"
- **Return Method**: Click ViewCube top face or press 'T' key

### **6. The Cutting System (First Implementation)**

#### **Cutting Line Behavior**
```
Material Position:     Cutting Line:
┌──────────┐          │ (Adjustable)
│          │          │
│  Board   │          │
│          │          │
└──────────┘          │
                      ↕ Drag to position
```

- **Smart Snapping**:
  - Center of board
  - Common fractions (1/2, 1/3, 1/4)
  - Round measurements
  - User-defined increments

#### **Visual Feedback**
- **Before Cut**: Ghosted preview of resulting pieces
- **Measurements**: Live display of piece dimensions
- **Kerf Visualization**: Thin gap showing material loss
- **Invalid Cuts**: Red warning if cut doesn't intersect material

### **7. Operation Execution**

#### **Pre-Operation Checklist**
✓ Material properly positioned  
✓ Operation line/point defined  
✓ Valid intersection detected  
✓ Orthographic view active  

#### **Execution Flow**
1. **Validate** - System checks all parameters
2. **Preview** - Show expected result
3. **Confirm** - User clicks "EXECUTE"
4. **Animate** - Smooth operation animation
5. **Complete** - Display results

### **8. Post-Operation Workflow**

#### **Options Menu**
After successful operation:
- **"Continue in Mill"** - Keep pieces for more operations
- **"Return to Workbench"** - Send all pieces back
- **"Select & Continue"** - Choose specific pieces to keep
- **"Undo Operation"** - Revert to pre-operation state

#### **Piece Management**
- New pieces automatically named (e.g., "Board_A", "Board_B")
- Maintain material properties from parent
- Preserve grain direction metadata
- Track operation history

### **9. Returning to Main Workspace**

#### **Exit Strategies**
- **"Done" Button** - Commits all operations, returns pieces
- **"Cancel" Button** - Discards changes, restores original
- **"Save as Template"** - Store operation sequence for reuse

#### **Re-integration**
- Pieces positioned where original material was located
- Automatic spacing if multiple pieces
- Selection maintained for easy manipulation
- Operation history preserved for reference

---

## **Technical Architecture**

### **State Management**
```javascript
MillState = {
  active: boolean,
  currentOperation: 'cut' | 'route' | 'drill',
  material: Part,
  operationLine: Vector3,
  viewMode: 'orthographic' | 'free',
  canExecute: boolean
}
```

### **Key Advantages**
1. **Simplified Calculations**: 2D operations on XZ plane only
2. **Predictable Behavior**: Gravity constraint eliminates edge cases  
3. **Intuitive Interface**: Matches real-world workshop experience
4. **Modular Design**: Easy to add new operations
5. **Reduced Complexity**: No rotation matrices or coordinate transforms

---

## **Implementation Phases**

### **Phase 1: Core Mill + Cutting**
- Basic Mill interface
- Material import/export
- Cutting operation
- View management

### **Phase 2: Enhanced Cutting**
- Fence system
- Multiple cuts
- Angle cuts
- Cut templates

### **Phase 3: Additional Operations**
- Routing
- Drilling  
- Basic combinations

### **Phase 4: Advanced Features**
- Operation sequences
- Parametric operations
- Material optimization
- Waste tracking

---

## **Success Metrics**
- 90% reduction in cutting-related bugs
- 75% faster operation completion vs. 3D manipulation
- Zero rotation-related issues
- Intuitive enough for new users to cut within 30 seconds

---

*The Mill transforms CutList from a 3D modeling challenge into a practical workshop tool, where operations happen exactly as a woodworker expects them to.*