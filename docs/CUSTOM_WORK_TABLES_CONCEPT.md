# Custom Work Tables Feature Concept

## Executive Summary
Implement project-specific, named work tables that act as focused workspaces for different components of a woodworking build, with git-like merge capabilities into the main Assembly Table.

## Vision
Just like professional woodworkers have different benches and jigs for specific operations, CutList should allow users to create named, project-specific work tables that serve as focused workspaces for different components of their build.

## Core Architecture

### Default Tables
- **Assembly Table**: Main integration point where all components come together
- **The Mill**: Specialized table for cutting operations and compound miter practice
- **Drawing World**: Primary design and drafting workspace

### Custom User Tables
User-created, named workspaces for specific build components:

#### Examples
- Carcass - Cabinet box construction
- FaceFrame - Face frame assembly  
- Drawer_Box - Drawer construction
- Cabinet_Doors - Door panel work
- Crown_Molding - Trim and molding preparation
- Shelving - Adjustable shelf systems
- Hardware_Prep - Hardware installation planning

#### Each Table Maintains
- Component parts specific to that subsystem
- Local measurements and constraints
- Material assignments and cut lists
- Assembly state and join operations
- Table-specific notes and documentation
- Visual camera presets optimized for the work

## Workflow Benefits

### 1. Organization
- Keep complex projects organized by separating concerns
- Reduce visual clutter by isolating subsystems
- Maintain clear mental models of component relationships

### 2. Focus
- Work on one subsystem without distraction
- Zoom and camera settings optimized per table
- Table-specific tool selections

### 3. Collaboration
- Different team members work on different tables simultaneously
- Clear ownership and responsibility boundaries
- Async collaboration without conflicts

### 4. Version Control
- Track progress on each component independently
- Rollback changes to specific tables without affecting others
- Compare iterations side-by-side

### 5. Reusability
- Save table templates for common furniture components
- Build a library of standard assemblies
- Share table templates with the community

## Git-Like Integration Model

### Core Operations

#### Merge Into Assembly
- Move completed components from feature tables to main assembly
- Options for merge strategies:
  - **Add**: Simply add components to assembly
  - **Replace**: Replace existing components
  - **Update**: Update dimensions while maintaining relationships

#### Commit Points
- Save states of each table at key milestones
- Commit message describes what was accomplished
- Timestamp and author tracking
- Ability to tag important commits (e.g., v1_approved)

#### Branch/Fork Tables
- Duplicate a table to try alternative approaches
- A/B testing of design decisions
- Preserve original while experimenting
- Merge best solution back

#### Diff View
- Visual comparison of two table states
- Highlight dimensional changes
- Show added/removed components
- Material usage differences

#### Conflict Resolution
- Handle dimensional conflicts when merging
- Alert when merged components would overlap
- Suggest resolution strategies
- Manual override options

## Implementation Architecture

### Table Inheritance
BaseTable contains:
- Properties (grid, physics, lighting)
- Methods (add, remove, transform)
- State (parts, materials, dimensions)

CustomTable extends BaseTable:
- Override specific properties
- Custom constraints
- Table-specific tools

### State Management
- Tables persist in project file
- Lazy loading of inactive tables
- State synchronization across browser tabs
- Undo/redo stack per table

### Visual Indicators
- Dashboard showing all tables with status
- Uncommitted changes badges
- Last modified timestamps
- Active user indicators for collaboration

### Integration Features
- **Ghost Previews**: Assembly Table shows translucent previews of components from other tables
- **Drag-and-Drop**: Move parts between tables via UI
- **Table History**: Timeline showing evolution of each workspace
- **Quick Switch**: Keyboard shortcuts to jump between tables
- **Split View**: View multiple tables simultaneously

## User Interface Concepts

### Table Manager Panel
Project: Kitchen Cabinets
- Drawing World (main)
- The Mill (2 boards)
- Assembly Table (integration) - 3 pending
- Upper_Cabinets (custom) - complete
- Lower_Cabinets (custom) - in progress
- Doors_and_Drawers (custom)
- [Create New Table...]

### Merge Dialog
Merge Upper_Cabinets to Assembly Table
- Components to merge: 12 parts
- Conflicts detected: None
- Position: Auto-arrange or Manual place
- Materials: Preserve or Remap
- Actions: Preview, Cancel, Merge

## Use Cases

### Kitchen Cabinet Project
1. Create tables: Base_Cabinets, Upper_Cabinets, Island, Pantry
2. Design each subsystem independently
3. Verify fit and clearances in Assembly
4. Generate cut lists per table or combined

### Custom Furniture
1. Create tables: Carcass, Drawers, Doors, Hardware
2. Iterate designs on separate tables
3. Test different wood combinations
4. Merge final selections to Assembly

### Trim Carpentry
1. Create tables per room: Living_Room_Crown, Kitchen_Trim
2. Practice compound cuts in The Mill
3. Track material usage per room
4. Merge for total material order

## Future Enhancements

### Template Library
- Pre-built table templates for common projects
- Community sharing marketplace
- Parametric templates that adjust to dimensions

### Automation
- Auto-arrange when merging to Assembly
- Collision detection and resolution
- Optimize material usage across tables

### Analytics
- Time tracking per table
- Material waste analysis
- Cost rollup across tables
- Progress visualization

### Collaboration
- Real-time multi-user editing per table
- Comments and annotations
- Change requests and approvals
- Permission management per table

## Technical Considerations

### Performance
- Lazy loading of table contents
- Virtual viewport for large assemblies
- Level-of-detail (LOD) rendering
- Aggressive caching strategies

### Data Structure
project:
  id: uuid
  name: Kitchen Renovation
  tables:
    assembly: {...}
    mill: {...}
    custom:
      upper_cabinets:
        id: uuid
        name: Upper Cabinets
        created: 2024-01-15
        modified: 2024-01-20
        state: {...}
        history: [...]
        materials: {...}

### Migration Path
1. Phase 1: Implement table creation and switching
2. Phase 2: Add merge capabilities
3. Phase 3: Implement version control features
4. Phase 4: Add collaboration features

## Success Metrics
- Reduced time to complete complex projects
- Fewer errors in component integration
- Increased user satisfaction scores
- Higher project completion rates
- Community template adoption rates

## Conclusion
Custom Work Tables would transform CutList from a CAD tool into a complete workshop management system, mirroring how actual woodworkers organize their physical workspace and workflow. The mental model of git for woodworking provides version control for physical objects, making complex projects manageable and mistakes reversible.

---
Concept documented: 2025-01-23
Author: Eddie & Claude
Status: Proposal
