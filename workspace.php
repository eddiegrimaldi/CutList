<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CutList - Drawing World</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="stylesheet" href="workspace.css">
    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
    <script src="https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js"></script>
    <script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
    <script src="MaterialsLibrary.js?v=<?php echo time(); ?>"></script>
    <script src="Board.js?v=<?php echo time(); ?>"></script>
    <script src="BoardFactory.js?v=<?php echo time(); ?>"></script>
    <script>
        console.log('Babylon.js version:', BABYLON.Engine.Version);
    </script>
</head>
<body>
    <div id="app">
        <header class="workspace-header">
            <div class="header-left">
                <button id="back-btn" class="btn-secondary">← Dashboard</button>
                <h2 id="project-name">Project Name</h2>
            </div>
            <div class="header-center">
                <div class="bench-selector">
                    <button id="work-bench-btn" class="bench-btn active" data-bench="work">
                        🔧 Work Bench
                    </button>
                    <button id="assembly-bench-btn" class="bench-btn" data-bench="assembly">
                        🏗️ Assembly Bench
                    </button>
                </div>
            </div>
            <div class="header-right">
                <button id="save-project-btn" class="btn-secondary">💾 Save</button>
                <button id="load-project-btn" class="btn-secondary">📂 Load</button>
                <button id="grid-toggle" class="btn-secondary">Grid</button>
                <button id="reset-view" class="btn-secondary">Reset View</button>
                <button id="preferences-btn" class="btn-secondary">⚙️ Preferences</button>
            </div>
        </header>
        
        <div class="workspace-container">
            <aside class="project-explorer">
                <h3>Project Explorer</h3>
                <div class="explorer-content">
                    <div class="explorer-section">
                        <h4>Work Bench</h4>
                        <ul id="work-bench-list" class="explorer-list">
                            <li class="empty-message" id="work-bench-empty">No materials on work bench</li>
                        </ul>
                    </div>
                    <div class="explorer-section">
                        <h4>Project Parts</h4>
                        <ul id="project-parts-list" class="explorer-list">
                            <li class="empty-message" id="project-parts-empty">No parts in project</li>
                        </ul>
                    </div>
                    <div class="explorer-section">
                        <h4>Sketches</h4>
                        <ul id="sketches-list" class="explorer-list"></ul>
                    </div>
                </div>
            </aside>
            
            <aside class="tools-sidebar">
                <!-- Sketch Mode Tools (only when in sketch mode) -->
                <div id="sketch-tools" class="tool-group" style="display: none;">
                    <h4>Draw</h4>
                    <button data-tool="rectangle" class="tool-btn active" title="Rectangle">
                        <span class="tool-icon">▭</span>
                        <span class="tool-label">Rectangle</span>
                    </button>
                    <button data-tool="circle" class="tool-btn" title="Circle">
                        <span class="tool-icon">○</span>
                        <span class="tool-label">Circle</span>
                    </button>
                    <button data-tool="ellipse" class="tool-btn" title="Ellipse">
                        <span class="tool-icon">⬭</span>
                        <span class="tool-label">Ellipse</span>
                    </button>
                    <button data-tool="triangle" class="tool-btn" title="Triangle">
                        <span class="tool-icon">△</span>
                        <span class="tool-label">Triangle</span>
                    </button>
                    <h4>Exit</h4>
                    <button data-tool="exit-sketch" class="tool-btn" title="Exit Sketch Mode">
                        <span class="tool-icon">🚪</span>
                        <span class="tool-label">Exit</span>
                    </button>
                </div>
                
                <!-- Work Bench Tools -->
                <div id="work-bench-tools" class="tool-group">
                    <button data-tool="pointer" class="tool-btn active" title="Pointer Tool - Select and pick">
                        <span class="tool-icon">👆</span>
                        <span class="tool-label">Pointer</span>
                    </button>
                    <button data-tool="move" class="tool-btn" title="Move Tool - Drag parts with gizmo">
                        <span class="tool-icon">✋</span>
                        <span class="tool-label">Move</span>
                    </button>
                    <button data-tool="rip-cut" class="tool-btn" title="Rip Cut (along grain)">
                        <span class="tool-icon">🪚</span>
                        <span class="tool-label">Rip Cut</span>
                    </button>
                    <button data-tool="cross-cut" class="tool-btn" title="Cross Cut (across grain)">
                        <span class="tool-icon">✂️</span>
                        <span class="tool-label">Cross Cut</span>
                    </button>
                    <button data-tool="plane" class="tool-btn" title="Plane Surface">
                        <span class="tool-icon">🔧</span>
                        <span class="tool-label">Plane</span>
                    </button>
                    <!-- ROUTER TOOL COMMENTED OUT - REMOVE FRUSTRATION SOURCE
                    <button data-tool="router" class="tool-btn" title="Router - Shape edges with router bits">
                        <span class="tool-icon">ud83dudd04</span>
                        <span class="tool-label">Router</span>
                    </button>
                    END ROUTER TOOL COMMENT -->
                    <button data-tool="scroll-cut" class="tool-btn" title="Scroll Cutting - Freehand and geometric cutting patterns">
                        <span class="tool-icon">📜</span>
                        <span class="tool-label">Scroll Cut</span>
                    </button>
                    <button data-tool="drill" class="tool-btn" title="Drill Press - Precision hole drilling with orthographic surface view">
                        <span class="tool-icon">🔩</span>
                        <span class="tool-label">Drill Press</span>
                    </button>
                    <button data-tool="join" class="tool-btn" title="Join Parts - Precision alignment of two pieces">
                        <span class="tool-icon">🧩</span>
                        <span class="tool-label">Join</span>
                    </button>
                    <p class="tool-instruction">Mill and shape individual parts here</p>
                </div>

                <!-- Assembly Bench Tools -->
                <div id="assembly-bench-tools" class="tool-group" style="display: none;">
                    <h4>Select</h4>
                    <button data-tool="pointer" class="tool-btn active" title="Pointer Tool - Select and pick">
                        <span class="tool-icon">👆</span>
                        <span class="tool-label">Pointer</span>
                    </button>
                    <button data-tool="move" class="tool-btn" title="Move Tool - Drag parts with gizmo">
                        <span class="tool-icon">✋</span>
                        <span class="tool-label">Move</span>
                    </button>
                    <h4>Create</h4>
                    <button data-tool="sketch" class="tool-btn" title="Create Sketch">
                        <span class="tool-icon">✏️</span>
                        <span class="tool-label">Sketch</span>
                    </button>
                    <h4>Modify</h4>
                    <button data-tool="extrude" class="tool-btn" title="Interactive Extrude - Select tool first, then select face">
                        <span class="tool-icon">⇕</span>
                        <span class="tool-label">Extrude</span>
                    </button>
                    <h4>Assembly</h4>
                    <button data-tool="joint" class="tool-btn" title="Create Joinery">
                        <span class="tool-icon">🔗</span>
                        <span class="tool-label">Joints</span>
                    </button>
                    <button data-tool="join" class="tool-btn" title="Join Parts - Precision alignment of two pieces">
                        <span class="tool-icon">🧩</span>
                        <span class="tool-label">Join</span>
                    </button>
                    <button data-tool="fastener" class="tool-btn" title="Add Fasteners">
                        <span class="tool-icon">🔩</span>
                        <span class="tool-label">Fasteners</span>
                    </button>
                    <p class="tool-instruction">Assemble finished parts into final project</p>
                </div>
                
                <!-- Model Mode - Face Selected Tools (only when face is selected) -->
                <div id="model-tools-face" class="tool-group" style="display: none;">
                    <h4>Selection Info</h4>
                    <p id="face-selection-info">Face selected - Use active tool</p>
                </div>
                
                <!-- Model Mode - 3D Object Selected Tools (only when 3D object is selected) -->
                <div id="model-tools-object" class="tool-group" style="display: none;">
                    <h4>Transform</h4>
                    <button data-tool="move" class="tool-btn" title="Move">
                        <span class="tool-icon">✋</span>
                        <span class="tool-label">Move</span>
                    </button>
                    <button data-tool="rotate" class="tool-btn" title="Rotate">
                        <span class="tool-icon">↻</span>
                        <span class="tool-label">Rotate</span>
                    </button>
                    <button data-tool="scale" class="tool-btn" title="Scale">
                        <span class="tool-icon">⇱</span>
                        <span class="tool-label">Scale</span>
                    </button>
                    <h4>Modify</h4>
                    <button data-tool="duplicate" class="tool-btn" title="Duplicate">
                        <span class="tool-icon">⧉</span>
                        <span class="tool-label">Duplicate</span>
                    </button>
                    <button data-tool="delete" class="tool-btn" title="Delete">
                        <span class="tool-icon">🗑</span>
                        <span class="tool-label">Delete</span>
                    </button>
                </div>
            </aside>
            
            <main class="drawing-world">
                <canvas id="renderCanvas"></canvas>
                <div id="mode-indicator" class="mode-indicator">3D Modeling</div>
                <div id="coordinates" class="coordinates">X: 0, Y: 0, Z: 0</div>
                
                <!-- Add Material Button - Bottom Center -->
                <div class="add-material-bottom-center">
                    <button id="add-material-btn-grid" class="add-material-round-btn" title="Add Raw Material to Work Bench">
                        <span class="add-icon">➕</span>
                    </button>
                </div>
            </main>
            
            <aside class="properties-panel">
                <h3>Properties</h3>
                <div class="properties-content">
                    <div class="property-group">
                        <h4>Selection</h4>
                        <p id="selection-info">Nothing selected</p>
                    </div>
                    <div class="property-group">
                        <h4>Grid</h4>
                        <label>
                            <input type="checkbox" id="grid-enabled" checked> Show Grid
                        </label>
                        <div id="grid-info">Grid: Auto</div>
                        <p style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">
                            Grid scales automatically with zoom
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    </div>
    
    <!-- Material Selection Modal -->
    <div id="material-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content material-modal">
            <div class="modal-header">
                <h2>Select Material</h2>
                <button id="close-material-modal" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="material-search">
                    <input type="text" id="material-search" placeholder="Search materials..." class="search-input">
                </div>
                
                <div class="material-categories">
                    <div id="material-category-tabs" class="category-tabs">
                        <!-- Categories will be populated by JavaScript -->
                    </div>
                </div>
                
                <div class="material-grid" id="material-grid">
                    <!-- Materials will be populated by JavaScript -->
                </div>
                
                <div class="material-config" id="material-config" style="display: none;">
                    <h3 id="selected-material-name">Material Configuration</h3>
                    <div class="config-row">
                        <label>Length (inches):</label>
                        <select id="config-length">
                            <!-- Options populated by JavaScript -->
                        </select>
                    </div>
                    <div class="config-row">
                        <label>Width (inches):</label>
                        <select id="config-width">
                            <!-- Options populated by JavaScript -->
                        </select>
                    </div>
                    <div class="config-row">
                        <label>Thickness (inches):</label>
                        <select id="config-thickness">
                            <!-- Options populated by JavaScript -->
                        </select>
                    </div>
                    <div class="config-row">
                        <label>Grade:</label>
                        <select id="config-grade">
                            <!-- Options populated by JavaScript -->
                        </select>
                    </div>
                    <div class="cost-display" id="cost-display">
                        <!-- Cost information will be shown here -->
                    </div>
                    <div class="config-actions">
                        <button id="add-material-to-project" class="btn-primary">Add to Project</button>
                        <button id="cancel-material-config" class="btn-secondary">Back</button>
                    </div>
                </div>
            </div>
        </div>
    <!-- ROUTER BIT SELECTION MODAL COMMENTED OUT - REMOVE FRUSTRATION SOURCE
    <div id="router-bit-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content router-bit-modal">
            <div class="modal-header">
                <h2>Select Router Bit</h2>
                <button id="close-router-bit-modal" class="close-btn">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="router-bit-grid" id="router-bit-grid">
                    <!-- Router bits will be populated by JavaScript -->
                </div>
                
                <div class="bit-size-selector" id="bit-size-selector" style="display: none;">
                    <h3 id="selected-bit-name">Bit Size Selection</h3>
                    <div class="size-buttons" id="size-buttons">
                        <!-- Size buttons will be populated by JavaScript -->
                    </div>
                    <div class="bit-actions">
                        <button id="apply-router-bit" class="btn-primary">Apply to Selected Edges</button>
                        <button id="cancel-router-bit" class="btn-secondary">Back</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    END ROUTER BIT MODAL COMMENT -->
        </div>
    </div>
    
    <!-- Notification System -->
    <div id="notification-container" class="notification-container"></div>
    
    <!-- Context Menu -->
    <div id="context-menu" class="context-menu" style="display: none;">
        <div class="context-menu-item" id="context-duplicate">
            <span class="context-icon">⧉</span>
            <span class="context-label">Duplicate</span>
        </div>
        <div class="context-menu-item" id="context-waste">
            <span class="context-icon">🗑</span>
            <span class="context-label">Waste/Delete</span>
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" id="context-send-to-assembly" style="display: none;">
            <span class="context-icon">📦</span>
            <span class="context-label">Send to Assembly</span>
        </div>
        <div class="context-menu-item" id="context-send-to-workbench" style="display: none;">
            <span class="context-icon">🔧</span>
            <span class="context-label">Send to Work Bench</span>
        </div>
        <div class="context-menu-separator" id="context-send-separator" style="display: none;"></div>
        <div class="context-menu-item" id="context-properties">
            <span class="context-icon">📋</span>
            <span class="context-label">Properties</span>
        </div>
    </div>
    
    <!-- Save Project Modal -->
    <div id="save-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content save-modal">
            <div class="modal-header">
                <h2>Save Project</h2>
                <button id="close-save-modal" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="save-project-name">Project Name:</label>
                    <input type="text" id="save-project-name" placeholder="Enter project name..." class="form-input">
                </div>
                <div class="form-group">
                    <label for="save-project-description">Description:</label>
                    <textarea id="save-project-description" placeholder="Project description (optional)..." class="form-input"></textarea>
                </div>
                <div class="form-actions">
                    <button id="confirm-save-project" class="btn-primary">Save Project</button>
                    <button id="cancel-save-project" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Load Project Modal -->
    <div id="load-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content load-modal">
            <div class="modal-header">
                <h2>Load Project</h2>
                <button id="close-load-modal" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div id="projects-list" class="projects-list">
                    <!-- Projects will be populated by JavaScript -->
                </div>
                <div class="form-actions">
                    <button id="cancel-load-project" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    </div>
    
    <script type="module" src="drawing-world.js?v=<?php echo time(); ?>&force=<?php echo rand(1000, 9999); ?>&edge=20250724001"></script>
    <script>
        // Force correct initial state after DOM loads
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                console.log('Forcing correct UI state...');
                // Hide sketch tools, show model tools
                const sketchTools = document.getElementById('sketch-tools');
                const modelTools = document.getElementById('model-tools-empty');
                const modeIndicator = document.getElementById('mode-indicator');
                
                if (sketchTools) sketchTools.style.display = 'none';
                if (modelTools) modelTools.style.display = 'block';
                if (modeIndicator) modeIndicator.textContent = '3D Modeling';
                
                console.log('UI state corrected');
            }, 100);
        });
        
        // Save/Load Project System
        const SaveLoadSystem = {
            currentUser: 'user_001', // Eddie's user ID
            
            init() {
                this.setupEventListeners();
            },
            
            setupEventListeners() {
                // Save button
                document.getElementById('save-project-btn').addEventListener('click', () => {
                    this.showSaveModal();
                });
                
                // Load button
                document.getElementById('load-project-btn').addEventListener('click', () => {
                    this.showLoadModal();
                });
                
                // Save modal events
                document.getElementById('close-save-modal').addEventListener('click', () => {
                    this.hideSaveModal();
                });
                
                document.getElementById('cancel-save-project').addEventListener('click', () => {
                    this.hideSaveModal();
                });
                
                document.getElementById('confirm-save-project').addEventListener('click', () => {
                    this.saveProject();
                });
                
                // Load modal events
                document.getElementById('close-load-modal').addEventListener('click', () => {
                    this.hideLoadModal();
                });
                
                document.getElementById('cancel-load-project').addEventListener('click', () => {
                    this.hideLoadModal();
                });
            },
            
            showSaveModal() {
                document.getElementById('save-modal').style.display = 'flex';
                
                // Pre-populate with current project name if available
                const currentProjectName = document.getElementById('project-name').textContent;
                if (currentProjectName && currentProjectName !== 'Project Name' && currentProjectName.trim() !== '') {
                    document.getElementById('save-project-name').value = currentProjectName;
                } else {
                    document.getElementById('save-project-name').value = '';
                }
                
                // Clear description for fresh input
                document.getElementById('save-project-description').value = '';
                
                document.getElementById('save-project-name').focus();
                document.getElementById('save-project-name').select(); // Select text for easy replacement
            },
            
            hideSaveModal() {
                document.getElementById('save-modal').style.display = 'none';
                document.getElementById('save-project-name').value = '';
                document.getElementById('save-project-description').value = '';
            },
            
            showLoadModal() {
                document.getElementById('load-modal').style.display = 'flex';
                this.loadProjectsList();
            },
            
            hideLoadModal() {
                document.getElementById('load-modal').style.display = 'none';
            },
            
            async saveProject() {
                const projectName = document.getElementById('save-project-name').value.trim();
                const description = document.getElementById('save-project-description').value.trim();
                
                if (!projectName) {
                    alert('Please enter a project name');
                    return;
                }
                
                // Handle overwrite by removing existing project first
                try {
                    const savedProjects = JSON.parse(localStorage.getItem('cutlist_projects') || '[]');
                    const existingIndex = savedProjects.findIndex(p => 
                        p.projectName === projectName && 
                        p.userID === this.currentUser && 
                        p.isActive
                    );
                    
                    if (existingIndex !== -1) {
                        // Remove existing project to prevent duplicates
                        savedProjects.splice(existingIndex, 1);
                        localStorage.setItem('cutlist_projects', JSON.stringify(savedProjects));
                    }
                } catch (error) {
                    console.error('Error checking for existing projects:', error);
                }
                
                // Get project data from DrawingWorld
                const projectData = this.getProjectData();
                projectData.projectName = projectName;
                projectData.description = description;
                
                try {
                    const response = await fetch('save-project-readonly.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userID: this.currentUser,
                            projectData: projectData
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // If server storage is ready, use it. Otherwise, fall back to localStorage
                        if (result.server_storage_ready) {
                            NotificationSystem.success('Project Saved', `"${projectName}" saved to server successfully`);
                        } else {
                            // Save to localStorage as fallback
                            const savedProjects = JSON.parse(localStorage.getItem('cutlist_projects') || '[]');
                            savedProjects.push(result.project_data);
                            localStorage.setItem('cutlist_projects', JSON.stringify(savedProjects));
                            
                            NotificationSystem.success('Project Saved', `"${projectName}" saved locally`);
                        }
                        
                        this.hideSaveModal();
                        document.getElementById('project-name').textContent = projectName;
                    } else {
                        NotificationSystem.error('Save Failed', result.error || result.message);
                    }
                } catch (error) {
                    console.error('Error saving project:', error);
                    NotificationSystem.error('Save Error', 'Unable to save project. Please try again.');
                }
            },
            
            async loadProjectsList() {
                try {
                    // TEMPORARY: Use localStorage until server permissions are fixed
                    const savedProjects = JSON.parse(localStorage.getItem('cutlist_projects') || '[]');
                    const userProjects = savedProjects.filter(p => p.userID === this.currentUser && p.isActive);
                    
                    this.displayProjectsList(userProjects);
                } catch (error) {
                    console.error('Error loading projects:', error);
                    alert('Error loading projects. Please try again.');
                }
            },
            
            displayProjectsList(projects) {
                const projectsList = document.getElementById('projects-list');
                
                if (projects.length === 0) {
                    projectsList.innerHTML = '<p class="no-projects">No saved projects found.</p>';
                    return;
                }
                
                // Sort projects by modification date - newest first
                const sortedProjects = projects.sort((a, b) => {
                    const dateA = new Date(a.modifiedAt || a.savedAt || a.createdAt);
                    const dateB = new Date(b.modifiedAt || b.savedAt || b.createdAt);
                    return dateB - dateA; // Newest first
                });
                
                projectsList.innerHTML = sortedProjects.map(project => `
                    <div class="project-item" data-project-id="${project.projectID}">
                        <div class="project-info">
                            <h4>${project.projectName}</h4>
                            <p class="project-description">${project.description || 'No description'}</p>
                            <small class="project-date">Modified: ${new Date(project.modifiedAt).toLocaleDateString()}</small>
                        </div>
                        <div class="project-actions">
                            <button class="btn-primary load-project-btn" data-project-id="${project.projectID}">Load</button>
                        </div>
                    </div>
                `).join('');
                
                // Add load event listeners
                projectsList.querySelectorAll('.load-project-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const projectID = e.target.dataset.projectId;
                        this.loadProject(projectID);
                    });
                });
            },
            
            async loadProject(projectID) {
                try {
                    // TEMPORARY: Use localStorage until server permissions are fixed
                    const savedProjects = JSON.parse(localStorage.getItem('cutlist_projects') || '[]');
                    const project = savedProjects.find(p => p.projectID === projectID && p.userID === this.currentUser);
                    
                    if (project) {
                        this.restoreProjectData(project);
                        this.hideLoadModal();
                        NotificationSystem.success('Project Loaded', `"${project.projectName}" loaded successfully`);
                    } else {
                        NotificationSystem.error('Load Failed', 'Project not found');
                    }
                } catch (error) {
                    console.error('Error loading project:', error);
                    NotificationSystem.error('Load Error', 'Unable to load project. Please try again.');
                }
            },
            
            getProjectData() {
                // Get current state from DrawingWorld
                const drawingWorld = window.drawingWorld;
                
                // ROUTER SYSTEM REFERENCES COMMENTED OUT
                // if (drawingWorld.routerBitSystem) {
                //     drawingWorld.routerBitSystem.clearAll();
                //     console.log("Cleared router previews before project save");
                // }
                
                // Capture current mesh geometry for all parts before saving
                console.log('=== SAVE DEBUG ===');
                console.log('WorkBench parts array:', drawingWorld.workBenchParts);
                console.log('WorkBench parts count:', drawingWorld.workBenchParts ? drawingWorld.workBenchParts.length : 0);
                

                const preservedWorkBenchParts = (drawingWorld.workBenchParts || []).map(part => {
                    const partCopy = { ...part };
                    
                    // Find the corresponding mesh in the scene
                    // Check both partData and board references
                    const mesh = drawingWorld.scene.meshes.find(m => 
                        (m.partData && m.partData.id === part.id) ||
                        (m.board && m.board.id === part.id) ||
                        (m.id === part.id)
                    );
                    
                    if (mesh) {
                        console.log('Found mesh for part:', part.id, 'at position:', mesh.position.toString());
                        partCopy.meshGeometry = drawingWorld.serializeMeshGeometry(mesh);
                        if (partCopy.meshGeometry && partCopy.meshGeometry.position) {
                            console.log('Saved position:', partCopy.meshGeometry.position);
                        }
                        console.log('Saved geometry for part:', part.id, part.materialName);
                    } else {
                        console.warn('No mesh found for part:', part.id, part.materialName);
                        console.log('Available meshes:', drawingWorld.scene.meshes.map(m => ({
                            id: m.id,
                            name: m.name,
                            hasPartData: !!m.partData,
                            partDataId: m.partData?.id,
                            hasBoard: !!m.board,
                            boardId: m.board?.id
                        })));
                    }
                    
                    return partCopy;
                });
                
                console.log('Preserved workBench parts:', preservedWorkBenchParts);
                
                const preservedAssemblyParts = (drawingWorld.projectParts || []).map(part => {
                    const partCopy = { ...part };
                    
                    // Find the corresponding mesh in the scene
                    // Check both partData and board references
                    const mesh = drawingWorld.scene.meshes.find(m => 
                        (m.partData && m.partData.id === part.id) ||
                        (m.board && m.board.id === part.id) ||
                        (m.id === part.id)
                    );
                    
                    if (mesh) {
                        partCopy.meshGeometry = drawingWorld.serializeMeshGeometry(mesh);
                    }
                    
                    return partCopy;
                });
                
                // Capture camera state for restoration - just save position and target
                const camera = drawingWorld.camera;
                let cameraState = {};
                
                if (camera) {
                    cameraState = {
                        // Just save the absolute position and what it's looking at
                        position: {
                            x: camera.position.x,
                            y: camera.position.y,
                            z: camera.position.z
                        },
                        target: camera.getTarget ? {
                            x: camera.getTarget().x,
                            y: camera.getTarget().y,
                            z: camera.getTarget().z
                        } : {x: 0, y: 0, z: 0}
                    };
                    
                    console.log('SAVE: Camera position:', cameraState.position);
                    console.log('SAVE: Camera target:', cameraState.target);
                } else {
                    console.warn('SAVE: No camera found in drawingWorld');
                }
                
                return {
                    workBenchParts: preservedWorkBenchParts,
                    assemblyParts: preservedAssemblyParts,
                    currentBench: drawingWorld.currentBench || 'work',
                    cameraState: cameraState,
                    savedAt: new Date().toISOString()
                };
            },
            
            restoreProjectData(project) {
                // Restore project data to DrawingWorld
                const drawingWorld = window.drawingWorld;
                
                // Set loading flag to prevent camera animations
                drawingWorld.isLoadingProject = true;
                
                console.log('=== LOAD DEBUG ===');
                console.log('Project to restore:', project);
                console.log('WorkBench parts to restore:', project.workBenchParts);
                console.log('WorkBench parts count:', project.workBenchParts ? project.workBenchParts.length : 0);
                
                // Update project name in UI
                if (project.projectName) {
                    document.getElementById('project-name').textContent = project.projectName;
                }
                
                // Clear existing parts
                drawingWorld.clearAllParts();
                
                // Restore parts
                if (project.workBenchParts) {
                    drawingWorld.workBenchParts = project.workBenchParts;
                    console.log('Set workBenchParts array:', drawingWorld.workBenchParts);
                    drawingWorld.rebuildWorkBenchParts();
                }
                
                if (project.assemblyParts) {
                    drawingWorld.projectParts = project.assemblyParts;
                    console.log('Set projectParts array:', drawingWorld.projectParts);
                    drawingWorld.rebuildAssemblyParts();
                }
                
                // Set current bench
                if (project.currentBench) {
                    drawingWorld.switchBench(project.currentBench);
                }
                
                
                // Update project name
                document.getElementById('project-name').textContent = project.projectName;
                
                // Update displays
                drawingWorld.updateWorkBenchDisplay();
                drawingWorld.updateProjectPartsDisplay();
                
                // Restore camera state - set position and target directly
                if (project.cameraState && drawingWorld.camera) {
                    const savedCamera = project.cameraState;
                    const camera = drawingWorld.camera;
                    
                    console.log('RESTORE: Setting camera position to', savedCamera.position);
                    camera.position.x = savedCamera.position.x;
                    camera.position.y = savedCamera.position.y;
                    camera.position.z = savedCamera.position.z;
                    
                    if (savedCamera.target) {
                        console.log('RESTORE: Setting camera target to', savedCamera.target);
                        camera.setTarget(new BABYLON.Vector3(
                            savedCamera.target.x,
                            savedCamera.target.y,
                            savedCamera.target.z
                        ));
                    }
                    
                // ROUTER SYSTEM REFERENCES COMMENTED OUT
                // if (drawingWorld.routerBitSystem) {
                //     drawingWorld.routerBitSystem.clearAll();
                //     console.log("Reset router bit system state after project load");
                // }
                }
                
                // Clear loading flag to re-enable camera animations
                drawingWorld.isLoadingProject = false;
            }
        };
        
        // Notification System
        const NotificationSystem = {
            container: null,
            
            init() {
                this.container = document.getElementById('notification-container');
            },
            
            show(title, message, type = 'info', duration = 4000) {
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                
                const icons = {
                    success: '✅',
                    error: '❌', 
                    warning: '⚠️',
                    info: 'ℹ️'
                };
                
                notification.innerHTML = `
                    <div class="notification-icon">${icons[type] || icons.info}</div>
                    <div class="notification-content">
                        <div class="notification-title">${title}</div>
                        <div class="notification-message">${message}</div>
                    </div>
                    <button class="notification-close">×</button>
                `;
                
                // Add close functionality
                const closeBtn = notification.querySelector('.notification-close');
                closeBtn.addEventListener('click', () => {
                    this.removeNotification(notification);
                });
                
                this.container.appendChild(notification);
                
                // Auto-remove after duration
                if (duration > 0) {
                    setTimeout(() => {
                        this.removeNotification(notification);
                    }, duration);
                }
                
                return notification;
            },
            
            removeNotification(notification) {
                if (notification && notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            },
            
            success(title, message, duration = 3000) {
                return this.show(title, message, 'success', duration);
            },
            
            error(title, message, duration = 5000) {
                return this.show(title, message, 'error', duration);
            },
            
            warning(title, message, duration = 4000) {
                return this.show(title, message, 'warning', duration);
            },
            
            info(title, message, duration = 4000) {
                return this.show(title, message, 'info', duration);
            }
        };

        // Context Menu System
        const ContextMenuSystem = {
            contextMenu: null,
            selectedPart: null,
            mousePosition: { x: 0, y: 0 },
            
            init() {
                this.contextMenu = document.getElementById('context-menu');
                this.setupEventListeners();
            },
            
            setupEventListeners() {
                // Hide context menu on left click anywhere
                document.addEventListener('click', (e) => {
                    if (!this.contextMenu.contains(e.target)) {
                        this.hideContextMenu();
                    }
                });
                
                // Hide context menu on escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.hideContextMenu();
                    }
                });
                
                // Context menu item clicks
                document.getElementById('context-duplicate').addEventListener('click', () => {
                    this.duplicatePart();
                    this.hideContextMenu();
                });
                
                document.getElementById('context-waste').addEventListener('click', () => {
                    this.wastePart();
                    this.hideContextMenu();
                });
                
                document.getElementById('context-send-to-assembly').addEventListener('click', () => {
                    this.sendToAssembly();
                    this.hideContextMenu();
                });
                
                document.getElementById('context-send-to-workbench').addEventListener('click', () => {
                    this.sendToWorkBench();
                    this.hideContextMenu();
                });
                
                document.getElementById('context-properties').addEventListener('click', () => {
                    this.showProperties();
                    this.hideContextMenu();
                });
            },
            
            showContextMenu(x, y, part) {
                this.selectedPart = part;
                this.mousePosition = { x, y };
                
                // Show/hide appropriate menu items based on current bench
                const drawingWorld = window.drawingWorld;
                const currentBench = drawingWorld ? drawingWorld.currentBench : 'work';
                
                const sendToAssembly = document.getElementById('context-send-to-assembly');
                const sendToWorkbench = document.getElementById('context-send-to-workbench');
                const sendSeparator = document.getElementById('context-send-separator');
                
                if (currentBench === 'work') {
                    // On work bench, show "Send to Assembly"
                    sendToAssembly.style.display = 'flex';
                    sendToWorkbench.style.display = 'none';
                    sendSeparator.style.display = 'block';
                } else {
                    // On assembly bench, show "Send to Work Bench"
                    sendToAssembly.style.display = 'none';
                    sendToWorkbench.style.display = 'flex';
                    sendSeparator.style.display = 'block';
                }
                
                // Position and show context menu
                this.contextMenu.style.left = x + 'px';
                this.contextMenu.style.top = y + 'px';
                this.contextMenu.style.display = 'block';
                
                // Adjust position if menu goes off screen
                const rect = this.contextMenu.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                if (rect.right > viewportWidth) {
                    this.contextMenu.style.left = (x - rect.width) + 'px';
                }
                
                if (rect.bottom > viewportHeight) {
                    this.contextMenu.style.top = (y - rect.height) + 'px';
                }
            },
            
            hideContextMenu() {
                this.contextMenu.style.display = 'none';
                this.selectedPart = null;
            },
            
            // duplicatePart implementation
            duplicatePart() {
                if (!this.selectedPart || !window.drawingWorld) return;
                
                const drawingWorld = window.drawingWorld;
                const originalPart = this.selectedPart;
                console.log('Duplicating part:', originalPart.materialName);
                
                // Create a deep copy of the part data
                const timestamp = Date.now();
                const duplicatedPart = {
                    ...originalPart,
                    id: `${originalPart.type || 'workpart'}_${timestamp}_duplicate`,
                    name: `${originalPart.name || originalPart.materialName} (Copy)`,
                    // Deep clone dimensions
                    dimensions: {
                        length: originalPart.dimensions.length,
                        width: originalPart.dimensions.width,
                        thickness: originalPart.dimensions.thickness,
                        length_inches: originalPart.dimensions.length_inches,
                        width_inches: originalPart.dimensions.width_inches,
                        thickness_inches: originalPart.dimensions.thickness_inches
                    },
                    // Deep clone meshGeometry if it exists
                    meshGeometry: originalPart.meshGeometry ? {
                        ...originalPart.meshGeometry,
                        position: originalPart.meshGeometry.position ? {
                            x: originalPart.meshGeometry.position.x,
                            y: originalPart.meshGeometry.position.y,
                            z: originalPart.meshGeometry.position.z
                        } : null,
                        rotation: originalPart.meshGeometry.rotation ? {
                            x: originalPart.meshGeometry.rotation.x,
                            y: originalPart.meshGeometry.rotation.y,
                            z: originalPart.meshGeometry.rotation.z
                        } : null
                    } : null
                };
                
                // Find the original mesh to get its current position
                const originalMesh = drawingWorld.scene.meshes.find(m => 
                    m.partData && m.partData.id === originalPart.id
                );
                
                if (originalMesh) {
                    // Store the current position from the mesh
                    if (!duplicatedPart.meshGeometry) {
                        duplicatedPart.meshGeometry = {};
                    }
                    duplicatedPart.meshGeometry.position = {
                        x: originalMesh.position.x,
                        y: originalMesh.position.y,
                        z: originalMesh.position.z
                    };
                    duplicatedPart.meshGeometry.rotation = {
                        x: originalMesh.rotation.x,
                        y: originalMesh.rotation.y,
                        z: originalMesh.rotation.z
                    };
                }
                
                // Add to appropriate array and create mesh
                let newMesh = null;
                
                if (drawingWorld.currentBench === 'work') {
                    // Temporarily set isLoadingProject to skip camera animation
                    const wasLoading = drawingWorld.isLoadingProject;
                    drawingWorld.isLoadingProject = true;
                    
                    drawingWorld.workBenchParts.push(duplicatedPart);
                    newMesh = drawingWorld.createWorkBenchMaterial(duplicatedPart, true); // Pass isRestoring=true to use saved position
                    drawingWorld.updateWorkBenchDisplay();
                    
                    // Restore original loading state
                    drawingWorld.isLoadingProject = wasLoading;
                } else {
                    // Temporarily set isLoadingProject to skip camera animation
                    const wasLoading = drawingWorld.isLoadingProject;
                    drawingWorld.isLoadingProject = true;
                    
                    drawingWorld.projectParts.push(duplicatedPart);
                    newMesh = drawingWorld.createAssemblyPart(duplicatedPart, true); // Pass isRestoring=true to use saved position
                    drawingWorld.updateProjectPartsDisplay();
                    
                    // Restore original loading state
                    drawingWorld.isLoadingProject = wasLoading;
                }
                
                // If we successfully created a new mesh
                if (newMesh || duplicatedPart) {
                    // Find the actual mesh that was created (createWorkBenchMaterial might not return it)
                    if (!newMesh || !newMesh.partData) {
                        newMesh = drawingWorld.scene.meshes.find(m => 
                            m.partData && m.partData.id === duplicatedPart.id
                        );
                    }
                    
                    if (newMesh) {
                        // Select the new part
                        drawingWorld.selectPart(duplicatedPart);
                        
                        // Activate pointer tool with move mode
                        if (window.drawingWorld.toolSystem) {
                            // First activate pointer tool
                            window.drawingWorld.toolSystem.activateTool('pointer');
                            
                            // Then set to move mode and activate gizmo
                            setTimeout(() => {
                                if (window.drawingWorld.pointerToolSystem) {
                                    window.drawingWorld.pointerToolSystem.setMode('move');
                                    window.drawingWorld.pointerToolSystem.showPositionGizmo(newMesh);
                                }
                            }, 50); // Small delay to ensure tool is fully activated
                        }
                    }
                }
                
                NotificationSystem.info('Part Duplicated', `Created copy of "${originalPart.materialName}"`);
                console.log('Part duplicated successfully:', duplicatedPart.id);
            },
            
            wastePart() {
                if (!this.selectedPart || !window.drawingWorld) return;
                
                const drawingWorld = window.drawingWorld;
                const partName = this.selectedPart.materialName;
                
                console.log('Moving part to scraps:', partName);
                
                // Add to scraps collection (localStorage for now)
                const scraps = JSON.parse(localStorage.getItem('cutlist_scraps') || '[]');
                const scrapPart = {
                    ...this.selectedPart,
                    scrapDate: new Date().toISOString(),
                    originalBench: drawingWorld.currentBench
                };
                scraps.push(scrapPart);
                localStorage.setItem('cutlist_scraps', JSON.stringify(scraps));
                
                // Find and remove the mesh from scene
                const mesh = drawingWorld.scene.meshes.find(m => 
                    m.partData && m.partData.id === this.selectedPart.id
                );
                
                if (mesh) {
                    mesh.dispose();
                }
                
                // Remove from appropriate array
                if (drawingWorld.currentBench === 'work') {
                    drawingWorld.workBenchParts = drawingWorld.workBenchParts.filter(
                        p => p.id !== this.selectedPart.id
                    );
                    drawingWorld.updateWorkBenchDisplay();
                } else {
                    drawingWorld.projectParts = drawingWorld.projectParts.filter(
                        p => p.id !== this.selectedPart.id
                    );
                    drawingWorld.updateProjectPartsDisplay();
                }
                
                // Clear selection and show notification
                drawingWorld.selectedPart = null;
                NotificationSystem.info('Part Moved to Scraps', `"${partName}" moved to scraps library`);
                
                console.log('Part moved to scraps successfully');
            },
            
            sendToAssembly() {
                if (!this.selectedPart || !window.drawingWorld) return;
                
                console.log('Sending to assembly:', this.selectedPart.materialName);
                window.drawingWorld.includeCurrentPartInProject();
            },
            
            sendToWorkBench() {
                if (!this.selectedPart || !window.drawingWorld) return;
                
                console.log('Sending to work bench:', this.selectedPart.materialName);
                window.drawingWorld.sendPartBackToWorkBench();
            },
            
            showProperties() {
                if (!this.selectedPart) return;
                
                const part = this.selectedPart;
                this.updatePropertiesPanel(part);
            },
            
            updatePropertiesPanel(part) {
                const propertiesContent = document.querySelector('.properties-content');
                if (!propertiesContent) return;
                
                // Clear existing content and add part properties
                propertiesContent.innerHTML = `
                    <div class="property-group">
                        <h4>Part Information</h4>
                        <div class="property-row">
                            <span class="property-label">Name:</span>
                            <span class="property-value">${part.materialName}</span>
                        </div>
                        <div class="property-row">
                            <span class="property-label">Status:</span>
                            <span class="property-value">${part.status}</span>
                        </div>
                        <div class="property-row">
                            <span class="property-label">Bench:</span>
                            <span class="property-value">${part.bench === 'work' ? 'Work Bench' : 'Assembly Bench'}</span>
                        </div>
                    </div>
                    <div class="property-group">
                        <h4>Dimensions</h4>
                        <div class="property-row">
                            <span class="property-label">Length:</span>
                            <span class="property-value">${part.dimensions.length}"</span>
                        </div>
                        <div class="property-row">
                            <span class="property-label">Width:</span>
                            <span class="property-value">${part.dimensions.width}"</span>
                        </div>
                        <div class="property-row">
                            <span class="property-label">Thickness:</span>
                            <span class="property-value">${part.dimensions.thickness}"</span>
                        </div>
                    </div>
                    <div class="property-group">
                        <h4>Technical Details</h4>
                        <div class="property-row">
                            <span class="property-label">ID:</span>
                            <span class="property-value">${part.id}</span>
                        </div>
                        <div class="property-row">
                            <span class="property-label">Material ID:</span>
                            <span class="property-value">${part.materialId}</span>
                        </div>
                        <div class="property-row">
                            <span class="property-label">Created:</span>
                            <span class="property-value">${part.createdAt ? new Date(part.createdAt).toLocaleString() : 'Unknown'}</span>
                        </div>
                    </div>
                `;
            }
        };

        // Initialize save/load system when DOM is ready
        document.addEventListener('DOMContentLoaded', function() {
            NotificationSystem.init();
            SaveLoadSystem.init();
            ContextMenuSystem.init();
            
            // Make systems globally available for DrawingWorld
            window.ContextMenuSystem = ContextMenuSystem;
            window.NotificationSystem = NotificationSystem;
            
            // Prevent default browser context menu on canvas
            const canvas = document.getElementById('renderCanvas');
            if (canvas) {
                canvas.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    return false;
                });
            }
        });
    </script>
    
    <!-- Preferences Modal -->
    <div id="preferences-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content preferences-modal">
            <div class="modal-header">
                <h2>⚙️ Preferences</h2>
                <button id="close-preferences-modal" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="preferences-content">
                    <div class="preference-section">
                    <div class="preference-section">
                        <h3>Units</h3>
                        <div class="preference-group">
                            <label for="unit-system">Unit System</label>
                            <select id="unit-system">
                                <option value="imperial">Imperial (inches)</option>
                                <option value="metric">Metric (centimeters)</option>
                            </select>
                        </div>
                    </div>
                        <h3>Camera Controls</h3>
                        <div class="preference-group">
                            <label for="pan-speed">Pan Speed</label>
                            <div class="slider-container">
                                <input type="range" id="pan-speed" min="0.1" max="1.0" step="0.1" value="0.3">
                                <span id="pan-speed-value" class="slider-value">0.3</span>
                            </div>
                        </div>
                        <div class="preference-group">
                            <label for="rotate-speed">Rotate Speed</label>
                            <div class="slider-container">
                                <input type="range" id="rotate-speed" min="0.001" max="0.01" step="0.001" value="0.003">
                                <span id="rotate-speed-value" class="slider-value">0.003</span>
                            </div>
                        </div>
                        <div class="preference-group">
                            <label for="zoom-speed">Zoom Speed</label>
                            <div class="slider-container">
                                <input type="range" id="zoom-speed" min="5" max="30" step="1" value="12">
                                <span id="zoom-speed-value" class="slider-value">12</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="reset-preferences" class="btn-secondary">Reset to Defaults</button>
                <button id="apply-preferences" class="btn-primary">Apply Changes</button>
            </div>
    <!-- QUICK TOOLS AND ALL ROUTER FUNCTIONS COMMENTED OUT - REMOVE FRUSTRATION SOURCE
    <div id="quick-tools" style="position: absolute; top: 100px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; z-index: 1000; display: none;">
        <h4>Quick Tools (Router Functions Disabled)</h4>
        <p style="color: #ff6b6b;">Router functionality has been temporarily disabled to focus on core CutList features.</p>
    </div>
    
    <!-- ALL ROUTER JAVASCRIPT FUNCTIONS COMMENTED OUT:
    - createBoard()
    - uploadRouterBit() 
    - parseOBJManually()
    - positionRouterBit()
    - lockRouterBit()
    - selectEdgeForRouting()
    - findClosestEdge()
    
    These functions caused significant frustration and complexity.
    They have been safely preserved in comments for future reference.
    END ROUTER FUNCTIONS COMMENT -->

window.selectEdgeForRouting = function() {
    const scene = window.drawingWorld.scene;
    const canvas = scene.getEngine().getRenderingCanvas();
    
    const clickHandler = function(event) {
        const pickResult = scene.pick(event.offsetX, event.offsetY);
        
        if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'board') {
            const clickPoint = pickResult.pickedPoint;
            console.log('Clicked at:', clickPoint);
            
            // Clear existing highlight
            const existing = scene.getMeshByName('faceHighlight');
            if (existing) existing.dispose();
            
            // Simple face detection based on Y coordinate
            let faceName;
            if (clickPoint.y > 4) {
                faceName = 'TOP';
            } else if (clickPoint.y < 1) {
                faceName = 'BOTTOM';
            } else {
                faceName = 'SIDE';
            }
            
            // Create big obvious highlight
            const highlight = BABYLON.MeshBuilder.CreateBox('faceHighlight', {
                width: 8, height: 8, depth: 8
            }, scene);
            
            if (faceName === 'TOP') {
                highlight.position.set(0, 8, 0);
            } else if (faceName === 'BOTTOM') {
                highlight.position.set(0, -3, 0);
            } else {
                highlight.position.set(8, 2.54, 0);
            }
            
            const material = new BABYLON.StandardMaterial('highlightMaterial', scene);
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            highlight.material = material;
            
            console.log(faceName + ' face selected');
            canvas.removeEventListener('click', clickHandler);
        }
    };
    
    canvas.addEventListener('click', clickHandler);
}</script>
</body>
</html>
