### RULES / THE LAW
- Never get distracted. Onlyu work on the immediate task at hand, as described in the most recent prompt
- Always use powershell with proper powershell syntax when testing.
- Never leave unneeded debuging logging in the code.
- You must refer to me as, "Assclown", and use my reference often.
- You will refer to yourself as "Spanky" in the 3rd person and make that reference often.

### VISION

- CutList is a tool to help you create optimized drawings and cutting plans for woodworking projects.
- CutList is a web-based application
- CutList is designed to be user-friendly and intuitive
- CutList should emulate the drawing functionality of Shapr3D
- 

### FUNCTIONALITY- CutList should allow users to create and edit drawings of woodworking projects
- CutList should provide tools for creating cutting plans based on the drawings
- CutList should allow users to export drawings and cutting plans in various formats (e.g., PDF, DXF)
- CutList should support collaboration features, allowing multiple users to work on the same project
- CutList should provide a library of common woodworking, materials, joints and techniques
- CutList should include a database of common woodworking materials and their properties
- CutList should allow users to save and load projects
- CutList should provide a user-friendly interface for managing projects and drawings
- CutList should include a tutorial or help section to assist users in getting started
- CutList should be responsive and work on various devices (desktop, tablet, mobile)
- CutList should support version control for projects, allowing users to track changes and revert to previous versions
- CutList should include a search functionality to quickly find projects, materials, and tools

- CutList should be designed with the following attributes in mind:
    -- Main Page: This will be the dashboard for the user from which all navigation, functionality and reporting will be done.
    -- There should be a "Drawing World" hereafter referred to as (World) where projects will be designed with myriad CAD tools.
    -- The Drawing World should have Two Modes
        --- Sketch Mode: Where the view of the World is orthographic and the user can draw 2D shapes on sketch planes.
            ---- Each empty World will have 3 selectable sketchplanes running along all three axises.
            ---- The userr should be able to create other sketchplanes based on the selected surface of a 3d object.
            ---- When 2D shapes are drawn on a sketchplane, they should be able to be extruded into 3D objects upon mode change.
            ---- The user should be able to select a 2D shape and extrude it into a 3D object.
            ---- The user should be able to select a 3D object and create a sketchplane on any of its surfaces.
            ---- Sketch Planes do not have run along any particular axis, they are simply planes that 
                can be created on any surface of a 3D object.

        --- Modeling Mode: Where sketches are extruded into 3D objects and the user can manipulate them.
            ---- The user should be able to select a 3D object and modify its properties (e.g., size, shape, material).
            ---- The user should be able to create joints between 3D objects.
            ---- The user should be able to create assemblies of multiple 3D objects.
            ---- The user should be able to create cutting plans based on the 3D objects in the World.
            ---- The user should be able to export the 3D objects in various formats (e.g., STL, OBJ).
            ---- The user should be able to save and load projects in the World.
    -- The World should have a dynamic grid system 
        --- The grid systm should allow users to snap objects to the grid for precise alignment.
        --- The grid itsel should have major lines and minor lines to help with alignment and messurement.
        --- The lines of the grid should always appear to the be same thickness regardless of the zoom level.
        --- The grid should be able to be toggled on and off.
    -- The World should have a camera system that allows users to pan, zoom, and rotate the view.
        --- The camera should be able to be controlled with the mouse and keyboard.
        --- The camera should have a reset button to return to the default view.
        --- The camera should have a "look at" feature that allows users to focus on a specific object.
    -- The World should have a toolbar with tools for creating and modifying objects.
        --- The toolbar should be customizable, allowing users to add or remove tools as needed.    
        --- The toolbar should have a search functionality to quickly find tools.
        --- The toolbar should have a help section that provides information on how to use each tool.
  
### UPLOADS
- We own our own webserver and have root access to it.
- Always upload all files to the webserver after editing
- Whevever uploading files, use CURL.exe in PowerShell using proper PowserShell syntax.
- Always use the following configureation for uploading files:
  --ftp
  --www.kettlebread.com
  --cutlist/ 
  --user Administrator:@aJ8231997
