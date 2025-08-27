# Plan to Fix Rotated Board Cutting

## Current State (2025-08-18)
- ✅ Horizontal board cutting: WORKING
- ✅ ViewCube orthographic views: WORKING  
- ❌ Rotated board cutting: BROKEN
- ❌ Blade tracking on rotated boards: BROKEN

## The Specific Problem
When a board is rotated:
1. The blade appears at the board's ORIGINAL position (before rotation)
2. The blade doesn't track the mouse along the rotated board
3. The blade is too long (using bounding box instead of actual dimensions)

## The Root Cause
The cutting system is using world-aligned bounding boxes and cached positions instead of:
- The board's actual current transform
- The board's local coordinate system
- The board's actual dimensions (not the expanded bounding box)

## The Professional Fix Approach

### Step 1: Create Test File
Create `test-rotated-cut.html` that:
- Loads a single board
- Rotates it 45 degrees
- Activates cutting tool
- Verifies blade appears at mouse position

### Step 2: Understand Current Code
Document EXACTLY what these functions do:
- `calculateCutLine()` - Where blade position is calculated
- `createCutPreview()` - Where blade mesh is created
- `updateCutPosition()` - Where blade follows mouse

### Step 3: Fix Incrementally
#### Fix 1: Blade Position (not size, not tracking, just position)
- Make blade appear ON the rotated board, not at original position
- Commit immediately when this works

#### Fix 2: Blade Tracking  
- Make blade follow mouse along the board
- Commit immediately when this works

#### Fix 3: Blade Size
- Use actual board dimensions, not bounding box
- Commit immediately when this works

### Step 4: Verification After Each Fix
```javascript
// After EVERY change:
if (!testHorizontalCut()) {
  git checkout -- .  // Revert immediately
  console.error("Broke horizontal cutting! Reverting...");
}
```

## What NOT to Do
- ❌ Don't refactor the entire cutting system
- ❌ Don't add Part architecture while fixing the blade
- ❌ Don't optimize or clean up unrelated code
- ❌ Don't make multiple fixes in one commit
- ❌ Don't proceed if something that worked stops working

## Success Criteria
A rotated board can be cut when:
1. Blade appears where mouse points on the board
2. Blade moves along board as mouse moves
3. Blade is correct size (width of board, not bounding box)
4. Cut executes at blade position
5. **AND** horizontal cuts still work

## Rollback Plan
If at any point things get worse:
```bash
git checkout 19807d1  # Current commit where horizontal works
```

## The Mantra
"One thing at a time. Test after each change. Commit when it works."
