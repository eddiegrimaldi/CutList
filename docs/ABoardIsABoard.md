# A Board Is A Board Is A Board

## Core Principle

A board must have ONE and ONLY ONE source of truth for its existence, position, orientation, and properties at any given moment. There cannot be multiple, conflicting representations of the same board within the system.

## The Problem This Solves

When a board has multiple representations (visible mesh, phantom previews, stored data, cutting system data), these representations can become desynchronized, leading to:
- Phantom boards appearing in impossible positions
- Cutting tools targeting ghost data instead of the actual board
- Previews showing boards in orientations they never had
- The system "remembering" old positions/rotations that no longer exist

## Policy Requirements

### 1. Single Source of Truth
- Each board has ONE authoritative data object that defines its complete state
- All systems (rendering, cutting, joining, saving) must reference this single object
- No system may maintain its own "copy" or "cache" of board data

### 2. Immediate Synchronization
- When a board moves, rotates, or changes in any way, the single data object is updated
- All systems reading from this object see the change immediately
- No deferred updates, no "sync later" patterns

### 3. No Phantom Data
- When a board is cut, the original board is destroyed, two new boards are created
- No lingering references to old positions or orientations
- Preview systems must read current position, not stored/cached positions

### 4. Uniform Creation Path
- Whether a board is created from material selection, cutting, or loading - same code path
- BoardFactory ensures uniform board creation
- No special cases, no alternative board representations

## Implementation Consequences

This policy means:
- NO storing mesh position separately from board data
- NO caching transformation matrices
- NO "preview state" that differs from actual state  
- NO parallel data structures for "workbench boards" vs "project boards"
- NO separate coordinate systems or transformation layers

## Verification

You can verify this policy is working when:
- Moving a board updates its position everywhere instantly
- Cutting preview appears exactly where the actual board is
- Saving and reloading produces identical board positions
- No phantom boards or ghost previews ever appear
- Rotating/joining boards maintains single source of truth

## The Test

The ultimate test: If you see a board on screen, that's where it is. Period. No exceptions, no phantom data, no conflicting positions. What you see is the single truth.