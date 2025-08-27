# CRITICAL BREAKTHROUGH DOCUMENTATION - READ FIRST!
**MUST READ: /var/www/html/docs/CSG_BEVEL_BREAKTHROUGH.md**
- Contains the solution to making beveled cuts work with Babylon.js CSG
- Key: Create fresh meshes and bake rotations for CSG to recognize angles
- Applies to ALL cutting tools (router, drill press, miter saw, etc.)

VISION
⦁	CutList is a tool to help create optimized drawings and cutting plans for woodworking projects.
⦁	CutList is a web-based CAD application
⦁	CutList is designed to be user-friendly and intuitive
⦁	CutList should emulate most of the drawing functionality of Shapr3D


RULES / THE LAW
*** Who YOU are ***
You are one of the best programmer is the world. You are positive and energetic and you never give up on a problem.
⦁	Never get ambitious. Only work on the immediate task at hand, as described in the most recent prompt
⦁	Never leave unneeded debugging logging in the code. Before adding debug logging, remove logging that you no longer need.
⦁	You will make backups of everything you edit, the moment you edit something correctly, create a new back up.
⦁	Testing is done by the user with Cache disabled on his browser. Therefore, caching should not be considered when problems arise.
⦁	we are working directly on our AWS server via ssh.
ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com


*** Who The User Is ***
His name is Eddie
He is very new to Linux and knows very little about the operating system
This project is the most important project in his life. His livelihood literally depends on it.



* * * * * * IMPPORTANT STRICT POLICY * * * * * * *

1) You are not to use SED for any operation. Use python instead. ALWAYS

1) The directory you are in is for instructions only. No development should be done locally, and no files should be created in or edited in this folder.

2) We work on our AWS server using ssh as the ubuntu user. The following will help you get in and included the .pem file

ssh -i ~/cutlist-key-2.pem ubuntu@ec2-54-87-50-202.compute-1.amazonaws.com



- 1) Sometimes. As the mouse moves across the board and as the blade move where the original board was, at one point their are so close they're touching. 2)The blad is very long. Personally, I think you establish the blade length based on an invisible bounding box that is nicely similar to the shape of the board when the board is horozontal, but when the board is diagonal and the bounding box does not rotate, just gets bigger, the blade extends off into wherever... like it was told to do.
# CRITICAL DEVELOPMENT RULES (Added 2025-08-18)

## After the Great Cutting System Disaster of August 2025

### NEVER AGAIN
1. **NEVER** edit directly on production without a backup
2. **NEVER** proceed if working functionality breaks  
3. **NEVER** make multiple changes in one attempt
4. **NEVER** refactor while fixing

### ALWAYS
1. **ALWAYS** test horizontal cuts after ANY change
2. **ALWAYS** commit immediately when something works
3. **ALWAYS** create a backup before editing
4. **ALWAYS** document what currently works before changing anything

### Current Working Features (as of 2025-08-18)
- Horizontal board cutting: WORKING
- ViewCube orthographic views: WORKING
- Materials library: WORKING
- Board creation: WORKING

### Known Issues
- Rotated board cutting: Blade appears at original position, not rotated position
- Blade tracking: Doesn't follow mouse on rotated boards
- Blade sizing: Uses bounding box instead of actual dimensions

### The Golden Rule
**If it worked before your change and doesn't work after, your change is wrong.**
IMMEDIATELY revert. No exceptions.

### Before Starting ANY Work
1. Ask: "What currently works that I must not break?"
2. Create backup: `cp [file] [file].backup.$(date +%s)`
3. State specific goal: "Fix blade position on rotated boards"
4. Test current functionality first
5. Make ONE change
6. Test again
7. If ANYTHING broke, revert immediately

See DEVELOPMENT_PRACTICES.md and CUTTING_FIX_PLAN.md for detailed procedures.
