# CSG Bevel Cutting Breakthrough - CRITICAL LEARNING

## The Problem We Solved
For hours, we couldn't get Babylon.js CSG operations to create beveled cuts. The blade would appear tilted visually, but cuts were always straight (90 degrees).

## Why It Wasn't Working
1. **CSG ignores transformation matrices** - Setting mesh.rotation.x doesn't affect CSG operations
2. **Cloning preserves transforms but CSG ignores them** - Even with rotation copied, CSG uses base geometry
3. **bakeCurrentTransformIntoVertices() caused mirroring** - This method inverted the rotation unexpectedly

## THE SOLUTION THAT WORKS

Create a fresh mesh for each CSG operation with the rotation baked in.

DO NOT clone existing blade - create fresh mesh
MUST bake rotation into geometry for CSG to recognize it
Clear the baked rotation axis after baking

## Key Code Pattern

1. Create fresh blade mesh (not clone)
2. Apply bevel rotation to mesh
3. Bake rotation with bakeCurrentTransformIntoVertices()
4. Clear the rotation.x since it's now in geometry
5. Apply miter rotation without baking

## Application to Other Tools

This learning applies to ALL CSG-based cutting tools:
- Router Bits: Create fresh bit mesh with profile angle baked in
- Drill Press: Create fresh drill bit with point angle baked
- Compound Miter Saw: Bake bevel angle first, apply miter after
- Dado Blades: Create fresh stacked blade set, bake each blade individually

## Testing Checklist
- Create fresh mesh (don't clone)
- Apply rotation to fresh mesh
- Bake rotation with bakeCurrentTransformIntoVertices()
- Clear the baked rotation axis
- Apply non-baked rotations after
- Keep CSG mesh visible for debugging
- Use thicker geometry for CSG reliability (3 inches not 1/128)

## The Golden Rule
If you need angled cuts in CSG: Create fresh, bake the angle, then cut.

Discovered: August 23, 2025
After 3+ hours of debugging why bevels wouldn't work
This is the way.
