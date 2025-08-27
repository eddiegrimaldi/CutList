# Professional Software Development Practices for CutList

## The Current Problem
- Direct editing on production server
- No test environment
- No automated tests
- Git commits made AFTER changes, not before
- No code review process
- No rollback strategy
- Multiple assistants making conflicting changes
- No clear specification of what "working" means

## What Professional Development Looks Like

### 1. Environment Separation
```
Local Development → Testing Server → Staging Server → Production
```
- **NEVER** edit directly on production
- Test all changes locally first
- Deploy to staging for final verification
- Only then push to production

### 2. Version Control Best Practices
- **Branch for every feature**: `git checkout -b feature/fix-rotated-cuts`
- **Commit BEFORE changes**: Document what you're about to try
- **Small, atomic commits**: One change, one commit
- **Meaningful commit messages**: Describe WHY, not just what
- **Never commit broken code to main branch**

### 3. Testing Strategy
```javascript
// Before making ANY change to cutting system:
test('horizontal board cuts correctly', () => {
  const board = createBoard({rotation: 0});
  const result = executeCut(board, 0.5);
  expect(result.pieces).toHaveLength(2);
  expect(result.pieces[0].width).toBe(expectedWidth);
});

test('rotated board cuts correctly', () => {
  const board = createBoard({rotation: 45});
  const result = executeCut(board, 0.5);
  expect(result.pieces).toHaveLength(2);
  // Verify pieces maintain rotation
});
```

### 4. Development Workflow
1. **Define the problem clearly**
   - "Blade doesn't follow rotated boards" NOT "cutting is broken"
   
2. **Create a test that demonstrates the bug**
   ```javascript
   test('blade should track rotated board position', () => {
     // This test should FAIL initially
   });
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b fix/blade-rotation-tracking
   ```

4. **Make the minimal change to fix it**
   - Don't refactor everything
   - Don't "improve" unrelated code
   - Just fix the one thing

5. **Verify the test passes**
   
6. **Verify nothing else broke**
   ```bash
   npm test  # Run ALL tests
   ```

7. **Commit with clear message**
   ```bash
   git commit -m "Fix blade tracking on rotated boards
   
   Problem: Blade was using world bounds instead of local transform
   Solution: Parent blade to board and use local coordinates
   
   Fixes #123"
   ```

8. **Code review** (even if it's just yourself reviewing after a break)

9. **Merge only when confident**

### 5. Backup & Recovery Strategy
- **Automated backups**: Every successful build creates a backup
- **Database snapshots**: Before any data migration
- **Tagged releases**: `git tag v1.2.3` for known good states
- **Rollback procedure documented**:
  ```bash
  # If production breaks:
  git checkout v1.2.2  # Last known good
  ./deploy.sh
  ```

### 6. Documentation Requirements
For EVERY feature/fix:
- **What it does**
- **How to test it**
- **What could break**
- **How to revert if needed**

### 7. Progress Preservation
- **Daily commits**: Even WIP (work in progress)
- **Feature flags**: New code doesn't affect production until ready
  ```javascript
  if (FEATURES.improvedCutting) {
    // New cutting logic
  } else {
    // Old stable logic
  }
  ```
- **Progressive enhancement**: Add new, don't break old

### 8. Communication Protocol
When working with AI assistants:
1. **State current working features**: "Horizontal cuts work, ViewCube works"
2. **Define specific problem**: "Rotated boards show blade at wrong position"
3. **Specify constraints**: "Don't change working horizontal cuts"
4. **Request incremental changes**: "First, just make blade appear at correct position"
5. **Verify after each change**: "Test horizontal still works"

## Immediate Action Plan for CutList

### Step 1: Establish Baseline
```bash
# Create a "last-known-good" tag
git tag last-known-good-2025-08-18

# Document what works
echo "Horizontal cuts: WORKING" >> WORKING_FEATURES.md
echo "ViewCube ortho: WORKING" >> WORKING_FEATURES.md
echo "Rotated cuts: BROKEN" >> KNOWN_ISSUES.md
```

### Step 2: Create Test Environment
```bash
# Clone production to test environment
cp -r /var/www/html /var/www/test
# Work in test environment ONLY
```

### Step 3: Implement Change Tracking
Before ANY change:
```bash
# Create branch
git checkout -b fix/rotated-blade-tracking

# Create backup
cp CutToolSystem.js CutToolSystem.js.backup.$(date +%s)

# Document intent
echo "Attempting to fix blade tracking on rotated boards" >> CHANGELOG.md
```

### Step 4: Add Basic Testing
Even without a test framework, create simple verification:
```javascript
// test-cuts.js
function testHorizontalCut() {
  console.log("Testing horizontal cut...");
  // Create board, execute cut, verify result
  return success;
}

function testRotatedCut() {
  console.log("Testing rotated cut...");
  // Create rotated board, verify blade position
  return success;
}

// Run before committing ANY change
testHorizontalCut() && testRotatedCut() && console.log("All tests pass!");
```

## The Golden Rule
**If it worked before your change and doesn't work after, your change is wrong.**

No exceptions. No "but it's better architecture." No "it's cleaner code."

Working code > Clean code that doesn't work.

## Recovery From Current State
1. Tag current commit as attempt
2. Create fresh branch from last-known-good
3. Make ONE small fix at a time
4. Test after each change
5. Commit immediately when something works
6. Never proceed if previous functionality breaks

Remember: Every time you say "let me just fix this too while I'm here" - STOP. 
That's how we got into this mess.
