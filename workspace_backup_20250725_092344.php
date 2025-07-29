<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CutList - Drawing World</title>
    <link rel="stylesheet" href="workspace.css">
    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
    <script src="https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js"></script>
    <script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
    <script src="MaterialsLibrary.js?v=<?php echo time(); ?>"></script>
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
                    <button data-tool="router" class="tool-btn" title="Router - Shape edges with router bits">
                        <span class="tool-icon">🔄</span>
                        <span class="tool-label">Router</span>
                    </button>
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
                        <div id="grid-info">Grid: 1/32"</div>
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
    </div>
    
    <!-- Router Bit Selection Modal -->
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
                
                // CLEANUP: Clear router previews before serialization to prevent them from being saved
                if (drawingWorld.routerBitSystem) {
                    drawingWorld.routerBitSystem.clearAll();
                    console.log('Cleared router previews before project save');
                }
                
                // Capture current mesh geometry for all parts before saving
                console.log('=== SAVE DEBUG ===');
                console.log('WorkBench parts array:', drawingWorld.workBenchParts);
                console.log('WorkBench parts count:', drawingWorld.workBenchParts ? drawingWorld.workBenchParts.length : 0);
                
                const preservedWorkBenchParts = (drawingWorld.workBenchParts || []).map(part => {
                    const partCopy = { ...part };
                    
                    // Find the corresponding mesh in the scene
                    const mesh = drawingWorld.scene.meshes.find(m => 
                        m.partData && m.partData.id === part.id
                    );
                    
                    if (mesh) {
                        partCopy.meshGeometry = drawingWorld.serializeMeshGeometry(mesh);
                        console.log('Saved geometry for part:', part.id, part.materialName);
                    } else {
                        console.warn('No mesh found for part:', part.id, part.materialName);
                    }
                    
                    return partCopy;
                });
                
                console.log('Preserved workBench parts:', preservedWorkBenchParts);
                
                const preservedAssemblyParts = (drawingWorld.projectParts || []).map(part => {
                    const partCopy = { ...part };
                    
                    // Find the corresponding mesh in the scene
                    const mesh = drawingWorld.scene.meshes.find(m => 
                        m.partData && m.partData.id === part.id
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
                    
                    console.log('RESTORE: Camera restored directly');
                }
                
                // Reset router bit system to clean state after project load
                if (drawingWorld.routerBitSystem) {
                    drawingWorld.routerBitSystem.clearAll();
                    console.log('Reset router bit system state after project load');
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
            
            duplicatePart() {
                if (!this.selectedPart || !window.drawingWorld) return;
                
                console.log('Duplicating part:', this.selectedPart.materialName);
                // TODO: Implement duplication functionality
                NotificationSystem.info('Feature Coming Soon', 'Part duplication functionality will be available in a future update');
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
        </div>
    </div>
    
    <!-- Quick Tools -->
    <div id="quick-tools" style="position: absolute; top: 100px; left: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; z-index: 1000;">
        <h4>Quick Tools</h4>
        <button onclick="createBoard()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer;">Create Board</button>
        <input type="file" id="routerFileInput" accept=".obj" style="margin: 5px 0;" />
        <button onclick="uploadRouterBit()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">Upload Router Bit</button>
        <button onclick="positionRouterBit()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">Position Router Bit</button>
        <button onclick="lockRouterBit()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #f39c12; color: white; border: none; border-radius: 3px; cursor: pointer;">🔒 Lock Position</button>
        <button onclick="selectEdgeForRouting()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #2ecc71; color: white; border: none; border-radius: 3px; cursor: pointer;">🎯 Select Edge to Route</button>
    </div>
    
    <script>
        function createBoard() {
            if (window.drawingWorld && window.drawingWorld.scene) {
                // Create a standard 6"x96"x1" board
                const board = BABYLON.MeshBuilder.CreateBox('board', {
                    width: 15.24, // 6" = 15.24 cm
                    height: 2.54,  // 1" = 2.54 cm  
                    depth: 243.84  // 96" = 243.84 cm
                }, window.drawingWorld.scene);
                
                board.position.set(0, 0.9525, 0); // Half height above grid
                
                // Wood material
                const woodMaterial = new BABYLON.StandardMaterial('wood', window.drawingWorld.scene);
                woodMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.7, 0.5);
                board.material = woodMaterial;
                
                console.log('Board created');
            } else {
                alert('Scene not ready');
            }
        }
        
        async function uploadRouterBit() {
            console.log('Upload button clicked');
            const file = document.getElementById('routerFileInput').files[0];
            if (!file) {
                alert('Please select an OBJ file');
                return;
            }
            
            console.log('File selected:', file.name, file.size, 'bytes');
            
            if (!window.drawingWorld || !window.drawingWorld.scene) {
                alert('Scene not ready');
                return;
            }
            
            console.log('Starting file parsing...');
            try {
                // Use manual OBJ parser (Babylon.js OBJ loader is broken)
                const result = await parseOBJManually(file, window.drawingWorld.scene);
                
                if (result.meshes.length > 0) {
                    const routerBit = result.meshes[0];
                    routerBit.name = 'imported_router_bit';
                    
                    // Position at origin and scale to visible size
                    routerBit.position.set(0, 5, 0);
                    routerBit.scaling.setAll(500); // Good visible scale for router bit
                    
                    // Router bit material - make it very visible
                    const bitMaterial = new BABYLON.StandardMaterial('bit', window.drawingWorld.scene);
                    bitMaterial.diffuseColor = new BABYLON.Color3(1.0, 0.5, 0.0); // Bright orange
                    bitMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.0); // Slight glow
                    bitMaterial.alpha = 1.0; // Fully opaque
                    bitMaterial.backFaceCulling = false; // Show both sides
                    routerBit.material = bitMaterial;
                    
                    // Force visibility
                    routerBit.isVisible = true;
                    routerBit.setEnabled(true);
                    
                    console.log('Router bit imported:', file.name, 'Vertices:', routerBit.getTotalVertices());
                    console.log('Router bit position:', routerBit.position);
                    console.log('Router bit scaling:', routerBit.scaling);
                    console.log('Router bit bounds:', routerBit.getBoundingInfo());
                    console.log('Router bit visible:', routerBit.isVisible);
                    console.log('Router bit enabled:', routerBit.isEnabled());
                    
                } else {
                    alert('No meshes found in file');
                }
            } catch (error) {
                console.error('Import failed:', error);
                alert('Failed to import router bit: ' + error.message);
            }
        }
        
        // Manual OBJ parser
        async function parseOBJManually(file, scene) {
            console.log('parseOBJManually called with file:', file.name);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    console.log('File read complete, content length:', e.target.result.length);
                    try {
                        const objContent = e.target.result;
                        const lines = objContent.split('\n');
                        
                        const vertices = [];
                        const faces = [];
                        
                        // Parse OBJ content
                        for (const line of lines) {
                            const parts = line.trim().split(/\s+/);
                            
                            if (parts[0] === 'v') {
                                // Vertex: v x y z
                                vertices.push(
                                    parseFloat(parts[1]),
                                    parseFloat(parts[2]), 
                                    parseFloat(parts[3])
                                );
                            } else if (parts[0] === 'f') {
                                // Face: f v1 v2 v3 (1-indexed)
                                const face = parts.slice(1).map(vertex => {
                                    const vertexIndex = vertex.split('/')[0];
                                    return parseInt(vertexIndex) - 1; // Convert to 0-indexed
                                });
                                
                                if (face.length >= 3) {
                                    faces.push(face[0], face[1], face[2]);
                                    
                                    // Handle quads by adding second triangle
                                    if (face.length === 4) {
                                        faces.push(face[0], face[2], face[3]);
                                    }
                                }
                            }
                        }
                        
                        console.log(`Parsed ${vertices.length/3} vertices and ${faces.length/3} faces`);
                        
                        if (vertices.length === 0 || faces.length === 0) {
                            throw new Error('No geometry data found in OBJ file');
                        }
                        
                        // Create Babylon.js mesh
                        const mesh = new BABYLON.Mesh('parsed_obj', scene);
                        const vertexData = new BABYLON.VertexData();
                        
                        vertexData.positions = vertices;
                        vertexData.indices = faces;
                        
                        // Generate normals
                        const normals = [];
                        BABYLON.VertexData.ComputeNormals(vertices, faces, normals);
                        vertexData.normals = normals;
                        
                        // Apply to mesh
                        vertexData.applyToMesh(mesh);
                        
                        // Force mesh to be visible by flipping normals if needed
                        mesh.forceSharedVertices();
                        mesh.createNormals(true);
                        
                        // Make sure it renders
                        mesh.refreshBoundingInfo();
                        
                        resolve({ meshes: [mesh] });
                        
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });
        }
        
        function positionRouterBit() {
            if (window.drawingWorld && window.drawingWorld.scene) {
                // Find the router bit mesh - look for our specific name
                let routerBit = window.drawingWorld.scene.getMeshByName('imported_router_bit');
                
                if (!routerBit) {
                    // Fallback - find any mesh with router/bit in name
                    const allMeshes = window.drawingWorld.scene.meshes;
                    for (const mesh of allMeshes) {
                        if (mesh.name.includes('router') || mesh.name.includes('bit') || 
                            mesh.name.includes('imported')) {
                            routerBit = mesh;
                            break;
                        }
                    }
                }
                
                if (routerBit) {
                    // Create gizmo manager if not exists
                    if (!window.drawingWorld.gizmoManager) {
                        window.drawingWorld.gizmoManager = new BABYLON.GizmoManager(window.drawingWorld.scene);
                        window.drawingWorld.gizmoManager.usePointerToAttachGizmos = false;
                    }
                    
                    // Clear any existing gizmo attachments
                    window.drawingWorld.gizmoManager.attachToMesh(null);
                    
                    // Enable gizmos and attach to router bit
                    window.drawingWorld.gizmoManager.positionGizmoEnabled = true;
                    window.drawingWorld.gizmoManager.rotationGizmoEnabled = true;
                    window.drawingWorld.gizmoManager.scaleGizmoEnabled = false;
                    window.drawingWorld.gizmoManager.attachToMesh(routerBit);
                    
                    console.log('Gizmos attached to router bit:', routerBit.name);
                    console.log('Gizmos enabled - drag the arrows to move the router bit');
                } else {
                    console.log('All meshes:', window.drawingWorld.scene.meshes.map(m => m.name));
                    alert('No router bit found - upload one first');
                }
            } else {
                alert('Scene not ready');
            }
        }
        
        function lockRouterBit() {
            if (window.drawingWorld && window.drawingWorld.gizmoManager) {
                // Get the router bit mesh
                const routerBit = window.drawingWorld.scene.getMeshByName('imported_router_bit');
                
                if (routerBit) {
                    // Save position data to router bit system
                    if (window.drawingWorld.routerBitSystem) {
                        const positionData = {
                            position: {
                                x: routerBit.position.x,
                                y: routerBit.position.y,
                                z: routerBit.position.z
                            },
                            rotation: {
                                x: routerBit.rotation.x,
                                y: routerBit.rotation.y,
                                z: routerBit.rotation.z
                            },
                            scaling: {
                                x: routerBit.scaling.x,
                                y: routerBit.scaling.y,
                                z: routerBit.scaling.z
                            }
                        };
                        
                        // Store in the router bit system
                        window.drawingWorld.routerBitSystem.setManualPosition(positionData);
                        
                        console.log('Router bit position saved:', positionData);
                    }
                    
                    // Detach gizmos
                    window.drawingWorld.gizmoManager.attachToMesh(null);
                    window.drawingWorld.gizmoManager.positionGizmoEnabled = false;
                    window.drawingWorld.gizmoManager.rotationGizmoEnabled = false;
                    
                    console.log('Router bit position locked and saved');
                    alert('Router bit locked and position saved to system!');
                } else {
                    alert('No router bit found to lock');
                }
            } else {
                alert('No gizmos to lock');
            }
        }
        
        function selectEdgeForRouting() {
            if (window.drawingWorld && window.drawingWorld.scene) {
                console.log('Edge selection mode enabled - move mouse near edges to see preview');
                
                // Simple preview system - shows actual router bit at position  
                let previewBit = null;
                let previewEdge = null;
                let previewFace = null;
                
                function showSimplePreview(mesh, clickPoint) {
                    hidePreview(); // Clear old preview
                    
                    const previewData = simpleEdgeDetection(mesh, clickPoint);
                    if (!previewData) return;
                    
                    // Get or create test router bit
                    let routerBitMesh = window.drawingWorld.scene.getMeshByName('imported_router_bit');
                    if (!routerBitMesh) {
                        // Create test router bit: 3mm x 3mm x 1mm (cutting edge is 1mm)
                        routerBitMesh = BABYLON.MeshBuilder.CreateBox('test_router_bit', {
                            width: 0.3,   // 3mm = 0.3 cm
                            height: 0.3,  // 3mm = 0.3 cm  
                            depth: 0.1    // 1mm = 0.1 cm (cutting edge)
                        }, window.drawingWorld.scene);
                        
                        // Position it off to the side so it's visible
                        routerBitMesh.position = new BABYLON.Vector3(20, 2, 0);
                        
                        // Steel-colored material
                        const testBitMaterial = new BABYLON.StandardMaterial('testBit', window.drawingWorld.scene);
                        testBitMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.8); // Steel
                        testBitMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Slight metallic glow
                        routerBitMesh.material = testBitMaterial;
                        
                        console.log('Created test router bit: 3mm x 3mm x 1mm (cutting edge)');
                    }
                    
                    // Calculate correct position at left-top corner of selected face
                    const bounds = mesh.getBoundingInfo();
                    const min = bounds.minimum;
                    const max = bounds.maximum;
                    
                    let routerBitPosition;
                    switch(previewData.face) {
                        case 'top':
                            routerBitPosition = new BABYLON.Vector3(min.x, max.y, max.z); // Left-top corner of top face
                            break;
                        case 'bottom':
                            routerBitPosition = new BABYLON.Vector3(min.x, min.y, max.z); // Left-top corner of bottom face
                            break;
                        case 'front':
                            routerBitPosition = new BABYLON.Vector3(min.x, max.y, max.z); // Left-top corner of front face
                            break;
                        case 'back':
                            routerBitPosition = new BABYLON.Vector3(min.x, max.y, min.z); // Left-top corner of back face
                            break;
                        case 'left':
                            routerBitPosition = new BABYLON.Vector3(min.x, max.y, max.z); // Left-top corner of left face
                            break;
                        case 'right':
                            routerBitPosition = new BABYLON.Vector3(max.x, max.y, max.z); // Left-top corner of right face
                            break;
                        default:
                            routerBitPosition = new BABYLON.Vector3(min.x, max.y, max.z);
                    }
                    
                    console.log("🎯 Router bit positioned at corner:", routerBitPosition, "for face:", previewData.face);
                    
                    previewBit = routerBitMesh.clone("previewBit");
                    previewBit.position = routerBitPosition;
                    
                    // Rotate router bit based on selected face (CRITICAL for asymmetrical bits)
                    const faceNormal = getFaceNormal(previewData.face);
                    if (faceNormal) {
                        // Align router bit to face the selected face
                        const targetDirection = faceNormal.scale(-1); // Router bit faces INTO the selected face
                        
                        // Calculate rotation to align router bit with face
                        const defaultDirection = new BABYLON.Vector3(0, 0, 1); // Default router bit direction
                        const rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
                            defaultDirection, 
                            targetDirection, 
                            new BABYLON.Quaternion()
                        );
                        previewBit.rotationQuaternion = rotationQuaternion;
                        
                        console.log("🔄 Router bit rotated for face:", previewData.face, "normal:", faceNormal, "target:", targetDirection);
                    }
                    
                    // Semi-transparent red material for preview
                    const previewMaterial = new BABYLON.StandardMaterial("previewBit", window.drawingWorld.scene);
                    previewMaterial.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3); // Light red
                    previewMaterial.alpha = 0.7; // Semi-transparent
                    previewMaterial.emissiveColor = new BABYLON.Color3(0.3, 0, 0); // Slight glow
                    previewBit.material = previewMaterial;
                    previewBit.renderingGroupId = 3; // Always on top
                    
                    // Show orange edge highlight
                    const direction = previewData.edge.end.subtract(previewData.edge.start);
                    const distance = direction.length();
                    
                    previewEdge = BABYLON.MeshBuilder.CreateCylinder("previewEdge", {
                        height: distance,
                        diameter: 0.3,
                        tessellation: 8
                    }, window.drawingWorld.scene);
                    
                    const center = previewData.edge.start.add(previewData.edge.end).scale(0.5);
                    previewEdge.position = center;
                    
                    // Rotate to align with edge
                    const up = new BABYLON.Vector3(0, 1, 0);
                    const angle = Math.acos(BABYLON.Vector3.Dot(up, direction.normalize()));
                    const axis = BABYLON.Vector3.Cross(up, direction.normalize());
                    if (axis.length() > 0.001) {
                        previewEdge.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis.normalize(), angle);
                    }
                    
                    // Orange edge material
                    const edgeMaterial = new BABYLON.StandardMaterial("previewEdge", window.drawingWorld.scene);
                    edgeMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
                    edgeMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.25, 0); // Glowing orange
                    previewEdge.material = edgeMaterial;
                    previewEdge.renderingGroupId = 2;
                    
                    // Highlight the selected face with semi-transparent overlay
                    // (reuse bounds from above)
                    
                    // Create face highlight based on detected face
                    let faceSize, facePosition;
                    switch(previewData.face) {
                        case 'top':
                            faceSize = { width: max.x - min.x, height: 0.1, depth: max.z - min.z };
                            facePosition = new BABYLON.Vector3((min.x + max.x)/2, max.y + 0.05, (min.z + max.z)/2);
                            break;
                        case 'bottom':
                            faceSize = { width: max.x - min.x, height: 0.1, depth: max.z - min.z };
                            facePosition = new BABYLON.Vector3((min.x + max.x)/2, min.y - 0.05, (min.z + max.z)/2);
                            break;
                        case 'front':
                            faceSize = { width: max.x - min.x, height: max.y - min.y, depth: 0.1 };
                            facePosition = new BABYLON.Vector3((min.x + max.x)/2, (min.y + max.y)/2, max.z + 0.05);
                            break;
                        case 'back':
                            faceSize = { width: max.x - min.x, height: max.y - min.y, depth: 0.1 };
                            facePosition = new BABYLON.Vector3((min.x + max.x)/2, (min.y + max.y)/2, min.z - 0.05);
                            break;
                        case 'left':
                            faceSize = { width: 0.1, height: max.y - min.y, depth: max.z - min.z };
                            facePosition = new BABYLON.Vector3(min.x - 0.05, (min.y + max.y)/2, (min.z + max.z)/2);
                            break;
                        case 'right':
                            faceSize = { width: 0.1, height: max.y - min.y, depth: max.z - min.z };
                            facePosition = new BABYLON.Vector3(max.x + 0.05, (min.y + max.y)/2, (min.z + max.z)/2);
                            break;
                    }
                    
                    if (faceSize && facePosition) {
                        previewFace = BABYLON.MeshBuilder.CreateBox("previewFace", faceSize, window.drawingWorld.scene);
                        previewFace.position = facePosition;
                        
                        // Bright yellow semi-transparent material for face highlight
                        const faceMaterial = new BABYLON.StandardMaterial("previewFace", window.drawingWorld.scene);
                        faceMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0); // Bright yellow
                        faceMaterial.alpha = 0.3; // Semi-transparent
                        faceMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0); // Slight glow
                        previewFace.material = faceMaterial;
                        previewFace.renderingGroupId = 1; // Behind other elements
                    }
                    
                    console.log("🎯 Preview: face=" + previewData.face + " edge=" + previewData.edge.name + " router_bit_at=" + routerBitPosition);
                }
                
                function hidePreview() {
                    if (previewBit) {
                        previewBit.dispose();
                        previewBit = null;
                    }
                    if (previewEdge) {
                        previewEdge.dispose();
                        previewEdge = null;
                    }
                    if (previewFace) {
                        previewFace.dispose();
                        previewFace = null;
                    }
                }
                
                // Get face normal vector for router bit orientation
                function getFaceNormal(faceName) {
                    switch(faceName) {
                        case 'top': return new BABYLON.Vector3(0, 1, 0);
                        case 'bottom': return new BABYLON.Vector3(0, -1, 0);
                        case 'front': return new BABYLON.Vector3(0, 0, 1);
                        case 'back': return new BABYLON.Vector3(0, 0, -1);
                        case 'left': return new BABYLON.Vector3(-1, 0, 0);
                        case 'right': return new BABYLON.Vector3(1, 0, 0);
                        default: return new BABYLON.Vector3(0, 1, 0); // Default to top
                    }
                }
                
                // PROPER edge detection: find actual edge, then determine favored face
                function simpleEdgeDetection(mesh, clickPoint) {
                    const bounds = mesh.getBoundingInfo();
                    const min = bounds.minimum;
                    const max = bounds.maximum;
                    
                    // Define all 12 edges with their adjacent faces
                    const edges = [
                        { name: "top-front", start: new BABYLON.Vector3(min.x, max.y, max.z), end: new BABYLON.Vector3(max.x, max.y, max.z), faces: ["top", "front"] },
                        { name: "top-back", start: new BABYLON.Vector3(min.x, max.y, min.z), end: new BABYLON.Vector3(max.x, max.y, min.z), faces: ["top", "back"] },
                        { name: "top-left", start: new BABYLON.Vector3(min.x, max.y, min.z), end: new BABYLON.Vector3(min.x, max.y, max.z), faces: ["top", "left"] },
                        { name: "top-right", start: new BABYLON.Vector3(max.x, max.y, min.z), end: new BABYLON.Vector3(max.x, max.y, max.z), faces: ["top", "right"] },
                        
                        { name: "bottom-front", start: new BABYLON.Vector3(min.x, min.y, max.z), end: new BABYLON.Vector3(max.x, min.y, max.z), faces: ["bottom", "front"] },
                        { name: "bottom-back", start: new BABYLON.Vector3(min.x, min.y, min.z), end: new BABYLON.Vector3(max.x, min.y, min.z), faces: ["bottom", "back"] },
                        { name: "bottom-left", start: new BABYLON.Vector3(min.x, min.y, min.z), end: new BABYLON.Vector3(min.x, min.y, max.z), faces: ["bottom", "left"] },
                        { name: "bottom-right", start: new BABYLON.Vector3(max.x, min.y, min.z), end: new BABYLON.Vector3(max.x, min.y, max.z), faces: ["bottom", "right"] },
                        
                        { name: "front-left", start: new BABYLON.Vector3(min.x, min.y, max.z), end: new BABYLON.Vector3(min.x, max.y, max.z), faces: ["front", "left"] },
                        { name: "front-right", start: new BABYLON.Vector3(max.x, min.y, max.z), end: new BABYLON.Vector3(max.x, max.y, max.z), faces: ["front", "right"] },
                        { name: "back-left", start: new BABYLON.Vector3(min.x, min.y, min.z), end: new BABYLON.Vector3(min.x, max.y, min.z), faces: ["back", "left"] },
                        { name: "back-right", start: new BABYLON.Vector3(max.x, min.y, min.z), end: new BABYLON.Vector3(max.x, max.y, min.z), faces: ["back", "right"] }
                    ];
                    
                    // Find closest edge
                    let closestEdge = null;
                    let minDistance = Infinity;
                    
                    for (const edge of edges) {
                        // Distance from point to line segment
                        const edgeVector = edge.end.subtract(edge.start);
                        const pointVector = clickPoint.subtract(edge.start);
                        const edgeLength = edgeVector.length();
                        const projection = BABYLON.Vector3.Dot(pointVector, edgeVector) / edgeLength;
                        const clampedProjection = Math.max(0, Math.min(edgeLength, projection));
                        const closestPoint = edge.start.add(edgeVector.normalize().scale(clampedProjection));
                        const distance = BABYLON.Vector3.Distance(clickPoint, closestPoint);
                        
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestEdge = edge;
                        }
                    }
                    
                    if (!closestEdge) return null;
                    
                    // Determine which of the two adjacent faces the mouse favors
                    const face1 = closestEdge.faces[0];
                    const face2 = closestEdge.faces[1];
                    
                    // Calculate distance to each face center
                    const face1Center = getFaceCenter(bounds, face1);
                    const face2Center = getFaceCenter(bounds, face2);
                    
                    const distToFace1 = BABYLON.Vector3.Distance(clickPoint, face1Center);
                    const distToFace2 = BABYLON.Vector3.Distance(clickPoint, face2Center);
                    
                    const selectedFace = distToFace1 < distToFace2 ? face1 : face2;
                    
                    console.log("🎯 Edge:", closestEdge.name, "Mouse favors:", selectedFace, "over", distToFace1 < distToFace2 ? face2 : face1);
                    
                    return {
                        edge: { name: closestEdge.name, start: closestEdge.start, end: closestEdge.end },
                        face: selectedFace,
                        point: clickPoint
                    };
                }
                
                // Get face center for distance calculation
                function getFaceCenter(bounds, faceName) {
                    const min = bounds.minimum;
                    const max = bounds.maximum;
                    switch(faceName) {
                        case 'top': return new BABYLON.Vector3((min.x + max.x)/2, max.y, (min.z + max.z)/2);
                        case 'bottom': return new BABYLON.Vector3((min.x + max.x)/2, min.y, (min.z + max.z)/2);
                        case 'front': return new BABYLON.Vector3((min.x + max.x)/2, (min.y + max.y)/2, max.z);
                        case 'back': return new BABYLON.Vector3((min.x + max.x)/2, (min.y + max.y)/2, min.z);
                        case 'left': return new BABYLON.Vector3(min.x, (min.y + max.y)/2, (min.z + max.z)/2);
                        case 'right': return new BABYLON.Vector3(max.x, (min.y + max.y)/2, (min.z + max.z)/2);
                        default: return new BABYLON.Vector3(0, 0, 0);
                    }
                }
                
                // Add mouse move listener for edge preview
                console.log('🎯 Adding mouse move observer for edge preview');
                const mouseMoveObserver = window.drawingWorld.scene.onPointerObservable.add((pointerInfo) => {
                    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                        // Get mouse position in world space
                        const camera = window.drawingWorld.scene.activeCamera;
                        const engine = window.drawingWorld.scene.getEngine();
                        
                        // Convert screen coordinates to world ray
                        const ray = window.drawingWorld.scene.createPickingRay(
                            window.drawingWorld.scene.pointerX, 
                            window.drawingWorld.scene.pointerY, 
                            BABYLON.Matrix.Identity(), 
                            camera
                        );
                        
                        // Find board mesh
                        const boardMesh = window.drawingWorld.scene.getMeshByName('board');
                        if (boardMesh) {
                            // Simple preview - only when mouse hits board
                            const pickInfo = window.drawingWorld.scene.pick(window.drawingWorld.scene.pointerX, window.drawingWorld.scene.pointerY);
                            if (pickInfo.hit && pickInfo.pickedMesh && pickInfo.pickedMesh.name === "board" && true) {
                                console.log("🐛 Board hit detected, calling showSimplePreview");
                                showSimplePreview(pickInfo.pickedMesh, pickInfo.pickedPoint);
                            } else if (!pickInfo.hit || !pickInfo.pickedMesh || pickInfo.pickedMesh.name !== "board") {
                                hidePreview();
                            }
                        }
                    }
                });
                
                // Enable edge selection mode
                const observer = window.drawingWorld.scene.onPointerObservable.add((pointerInfo) => {
                    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
                        const pickInfo = pointerInfo.pickInfo;
                        
                        if (pickInfo.hit && pickInfo.pickedMesh) {
                            const mesh = pickInfo.pickedMesh;
                            
                            // Only process board meshes
                            if (mesh.name === 'board') {
                                console.log('Board clicked at:', pickInfo.pickedPoint);
                                
                                // Use ray to find closest edge and face (same as hover)
                                const camera = window.drawingWorld.scene.activeCamera;
                                const ray = window.drawingWorld.scene.createPickingRay(
                                    window.drawingWorld.scene.pointerX, 
                                    window.drawingWorld.scene.pointerY, 
                                    BABYLON.Matrix.Identity(), 
                                    camera
                                );
                                
                                const bounds = mesh.getBoundingInfo();
                                const edges = getAllBoardEdges(bounds);
            console.log("🎯 Ray origin:", ray.origin, "direction:", ray.direction);
            console.log("🎯 First edge:", edges[0]);
            console.log("🎯 Board bounds:", bounds.minimum, "to", bounds.maximum);
                                const tolerance = 1000.0; // Very large for now
                                
                                let closestEdge = null;
                                let closestDistance = tolerance;
                                let closestPoint = null;
                                
                                // Find closest edge to click ray
                                for (const edge of edges) {
                                    const result = getDistanceFromRayToEdge(ray, edge.start, edge.end);
                                    if (result.distance < closestDistance) {
                                        closestDistance = result.distance;
                                        closestEdge = edge;
                                        closestPoint = result.pointOnEdge;
                                    }
                                }
                                
                                if (closestEdge && closestPoint) {
                                    const selectedFace = determineFaceFromMousePosition(closestEdge, closestPoint, ray);
                                    console.log('🎯 Clicked edge:', closestEdge.name, 'face:', selectedFace);
                                    
                                    const edgeData = { 
                                        edge: closestEdge, 
                                        face: selectedFace, 
                                        point: closestPoint 
                                    };
                                    
                                    positionRouterBitOnEdgeAndFace(edgeData, mesh);
                                } else {
                                    console.log("🎯 Using simple click detection instead");                                    const simpleData = simpleEdgeDetection(mesh, pickInfo.pickedPoint);                                    if (simpleData) {                                        positionRouterBitOnEdgeAndFace(simpleData, mesh);                                    }
                                }
                                
                                // Remove this observer after first click
                                window.drawingWorld.scene.onPointerObservable.remove(observer);
                            }
                        }
                    }
                });
            } else {
                alert('Scene not ready');
            }
        }
        
        // Global variables for edge preview
        let edgeHighlight = null;
        let faceHighlight = null;
        let routerBitPreview = null;
        
        // Check if mouse is near any board edge and determine face selection
        function checkEdgeProximity(mesh, ray) {
            const bounds = mesh.getBoundingInfo();
            const tolerance = 1000.0; // Very large for now // 5cm detection tolerance
            
            // Get all edges of the board
            const edges = getAllBoardEdges(bounds);
            console.log("🎯 Ray origin:", ray.origin, "direction:", ray.direction);
            console.log("🎯 First edge:", edges[0]);
            console.log("🎯 Board bounds:", bounds.minimum, "to", bounds.maximum);
            console.log("🎯 Found", edges.length, "edges, checking distances...");
            
            let closestEdge = null;
            let closestDistance = tolerance;
            let closestPoint = null;
            
            // Find closest edge to mouse ray
            for (const edge of edges) {
                const result = getDistanceFromRayToEdge(ray, edge.start, edge.end);
                console.log("🎯 Edge", edge.name, "distance:", result.distance.toFixed(2));
                if (result.distance < closestDistance) {
                    closestDistance = result.distance;
                    closestEdge = edge;
                    closestPoint = result.pointOnEdge;
                }
            }
            
            if (closestEdge && closestPoint) {
                console.log('🎯 Found closest edge:', closestEdge.name, 'distance:', closestDistance.toFixed(2));
                
                // Determine which face based on mouse position relative to edge
                const selectedFace = determineFaceFromMousePosition(closestEdge, closestPoint, ray);
                console.log('🎯 Selected face:', selectedFace);
                
                // Show preview
                showEdgeAndFacePreview(closestEdge, selectedFace, closestPoint);
            } else {
                hideEdgePreview();
            }
        }
        
        // Get all edges of a rectangular board
        function getAllBoardEdges(bounds) {
            const min = bounds.minimum;
            const max = bounds.maximum;
            
            return [
                // Top face edges (Y = max.y)
                { name: 'top-front', start: new BABYLON.Vector3(min.x, max.y, max.z), end: new BABYLON.Vector3(max.x, max.y, max.z), faces: ['top', 'front'] },
                { name: 'top-back', start: new BABYLON.Vector3(min.x, max.y, min.z), end: new BABYLON.Vector3(max.x, max.y, min.z), faces: ['top', 'back'] },
                { name: 'top-left', start: new BABYLON.Vector3(min.x, max.y, min.z), end: new BABYLON.Vector3(min.x, max.y, max.z), faces: ['top', 'left'] },
                { name: 'top-right', start: new BABYLON.Vector3(max.x, max.y, min.z), end: new BABYLON.Vector3(max.x, max.y, max.z), faces: ['top', 'right'] },
                
                // Bottom face edges (Y = min.y)
                { name: 'bottom-front', start: new BABYLON.Vector3(min.x, min.y, max.z), end: new BABYLON.Vector3(max.x, min.y, max.z), faces: ['bottom', 'front'] },
                { name: 'bottom-back', start: new BABYLON.Vector3(min.x, min.y, min.z), end: new BABYLON.Vector3(max.x, min.y, min.z), faces: ['bottom', 'back'] },
                { name: 'bottom-left', start: new BABYLON.Vector3(min.x, min.y, min.z), end: new BABYLON.Vector3(min.x, min.y, max.z), faces: ['bottom', 'left'] },
                { name: 'bottom-right', start: new BABYLON.Vector3(max.x, min.y, min.z), end: new BABYLON.Vector3(max.x, min.y, max.z), faces: ['bottom', 'right'] },
                
                // Vertical edges
                { name: 'front-left', start: new BABYLON.Vector3(min.x, min.y, max.z), end: new BABYLON.Vector3(min.x, max.y, max.z), faces: ['front', 'left'] },
                { name: 'front-right', start: new BABYLON.Vector3(max.x, min.y, max.z), end: new BABYLON.Vector3(max.x, max.y, max.z), faces: ['front', 'right'] },
                { name: 'back-left', start: new BABYLON.Vector3(min.x, min.y, min.z), end: new BABYLON.Vector3(min.x, max.y, min.z), faces: ['back', 'left'] },
                { name: 'back-right', start: new BABYLON.Vector3(max.x, min.y, min.z), end: new BABYLON.Vector3(max.x, max.y, min.z), faces: ['back', 'right'] }
            ];
        }
        
        // Calculate distance from ray to edge
        function getDistanceFromRayToEdge(ray, edgeStart, edgeEnd) {
            // Find closest point on ray to the edge
            const edgeDir = edgeEnd.subtract(edgeStart).normalize();
            const rayToStart = edgeStart.subtract(ray.origin);
            
            // Project ray onto edge plane
            const rayDirDotEdge = BABYLON.Vector3.Dot(ray.direction, edgeDir);
            const rayToStartDotEdge = BABYLON.Vector3.Dot(rayToStart, edgeDir);
            const rayToStartDotRay = BABYLON.Vector3.Dot(rayToStart, ray.direction);
            
            const denominator = 1 - rayDirDotEdge * rayDirDotEdge;
            
            if (Math.abs(denominator) < 0.001) {
                // Ray parallel to edge
                const pointOnEdge = edgeStart.add(edgeDir.scale(rayToStartDotEdge));
                return {
                    distance: ray.origin.add(ray.direction.scale(rayToStartDotRay)).subtract(pointOnEdge).length(),
                    pointOnEdge: pointOnEdge
                };
            }
            
            const t = (rayDirDotEdge * rayToStartDotEdge - rayToStartDotRay) / denominator;
            const s = (rayToStartDotEdge - rayDirDotEdge * rayToStartDotRay) / denominator;
            
            // Clamp s to edge bounds
            const clampedS = Math.max(0, Math.min(1, s));
            const pointOnEdge = edgeStart.add(edgeDir.scale(clampedS * edgeEnd.subtract(edgeStart).length()));
            const pointOnRay = ray.origin.add(ray.direction.scale(t));
            
            return {
                distance: pointOnRay.subtract(pointOnEdge).length(),
                pointOnEdge: pointOnEdge
            };
        }
        
        // Determine which face based on mouse position relative to edge
        function determineFaceFromMousePosition(edge, pointOnEdge, ray) {
            // Get a point on the ray (far from origin to get good direction)
            const rayPoint = ray.origin.add(ray.direction.scale(100));
            
            // Calculate which face the ray point is closer to
            const face1Center = getFaceCenter(edge.faces[0], pointOnEdge);
            const face2Center = getFaceCenter(edge.faces[1], pointOnEdge);
            
            const distToFace1 = rayPoint.subtract(face1Center).length();
            const distToFace2 = rayPoint.subtract(face2Center).length();
            
            return distToFace1 < distToFace2 ? edge.faces[0] : edge.faces[1];
        }
        
        // Get center point of a face relative to an edge point
        function getFaceCenter(faceName, edgePoint) {
            // Offset from edge point toward face center
            const offset = 5.0; // 5cm offset
            
            switch (faceName) {
                case 'top': return edgePoint.add(new BABYLON.Vector3(0, offset, 0));
                case 'bottom': return edgePoint.add(new BABYLON.Vector3(0, -offset, 0));
                case 'front': return edgePoint.add(new BABYLON.Vector3(0, 0, offset));
                case 'back': return edgePoint.add(new BABYLON.Vector3(0, 0, -offset));
                case 'left': return edgePoint.add(new BABYLON.Vector3(-offset, 0, 0));
                case 'right': return edgePoint.add(new BABYLON.Vector3(offset, 0, 0));
                default: return edgePoint;
            }
        }
        
        // Show both edge highlight and face highlight
        function showEdgeAndFacePreview(edge, selectedFace, pointOnEdge) {
            // Highlight the edge
            highlightEdge(edge.start, edge.end);
            
            // Highlight the selected face
            highlightFace(selectedFace, pointOnEdge);
            
            // Show router bit preview
            const previewPos = calculateRouterBitPreviewPosition(edge, selectedFace, pointOnEdge);
            showRouterBitPreview(previewPos);
        }
        
        // Hide edge preview
        function hideEdgePreview() {
            if (edgeHighlight) {
                edgeHighlight.dispose();
                edgeHighlight = null;
            }
            if (faceHighlight) {
                faceHighlight.dispose();
                faceHighlight = null;
            }
            if (routerBitPreview) {
                routerBitPreview.dispose();
                routerBitPreview = null;
            }
        }
        
        // Highlight a face with semi-transparent overlay
        function highlightFace(faceName, pointOnEdge) {
            if (faceHighlight) {
                faceHighlight.dispose();
            }
            
            const boardMesh = window.drawingWorld.scene.getMeshByName('board');
            if (!boardMesh) return;
            
            const bounds = boardMesh.getBoundingInfo();
            const min = bounds.minimum;
            const max = bounds.maximum;
            
            let faceVertices = [];
            
            // Create face highlight based on face name
            switch (faceName) {
                case 'top':
                    faceVertices = [
                        new BABYLON.Vector3(min.x, max.y, min.z),
                        new BABYLON.Vector3(max.x, max.y, min.z),
                        new BABYLON.Vector3(max.x, max.y, max.z),
                        new BABYLON.Vector3(min.x, max.y, max.z)
                    ];
                    break;
                case 'bottom':
                    faceVertices = [
                        new BABYLON.Vector3(min.x, min.y, min.z),
                        new BABYLON.Vector3(min.x, min.y, max.z),
                        new BABYLON.Vector3(max.x, min.y, max.z),
                        new BABYLON.Vector3(max.x, min.y, min.z)
                    ];
                    break;
                case 'front':
                    faceVertices = [
                        new BABYLON.Vector3(min.x, min.y, max.z),
                        new BABYLON.Vector3(min.x, max.y, max.z),
                        new BABYLON.Vector3(max.x, max.y, max.z),
                        new BABYLON.Vector3(max.x, min.y, max.z)
                    ];
                    break;
                case 'back':
                    faceVertices = [
                        new BABYLON.Vector3(min.x, min.y, min.z),
                        new BABYLON.Vector3(max.x, min.y, min.z),
                        new BABYLON.Vector3(max.x, max.y, min.z),
                        new BABYLON.Vector3(min.x, max.y, min.z)
                    ];
                    break;
                case 'left':
                    faceVertices = [
                        new BABYLON.Vector3(min.x, min.y, min.z),
                        new BABYLON.Vector3(min.x, max.y, min.z),
                        new BABYLON.Vector3(min.x, max.y, max.z),
                        new BABYLON.Vector3(min.x, min.y, max.z)
                    ];
                    break;
                case 'right':
                    faceVertices = [
                        new BABYLON.Vector3(max.x, min.y, min.z),
                        new BABYLON.Vector3(max.x, min.y, max.z),
                        new BABYLON.Vector3(max.x, max.y, max.z),
                        new BABYLON.Vector3(max.x, max.y, min.z)
                    ];
                    break;
            }
            
            if (faceVertices.length === 4) {
                // Create face highlight mesh
                const positions = [];
                const indices = [];
                
                faceVertices.forEach(v => {
                    positions.push(v.x, v.y, v.z);
                });
                
                // Two triangles for the quad
                indices.push(0, 1, 2, 0, 2, 3);
                
                faceHighlight = new BABYLON.Mesh('faceHighlight', window.drawingWorld.scene);
                const vertexData = new BABYLON.VertexData();
                vertexData.positions = positions;
                vertexData.indices = indices;
                vertexData.applyToMesh(faceHighlight);
                
                // Face highlight material
                const faceMaterial = new BABYLON.StandardMaterial('faceHighlight', window.drawingWorld.scene);
                faceMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
                faceMaterial.alpha = 0.3; // Semi-transparent
                faceMaterial.backFaceCulling = false;
                faceMaterial.renderingGroupId = 1; // Render behind router bit
                
                faceHighlight.material = faceMaterial;
                
                console.log('🎯 Face highlighted:', faceName);
            }
        }
        
        // Calculate router bit preview position based on edge and face
        function calculateRouterBitPreviewPosition(edge, selectedFace, pointOnEdge) {
            // Position router bit slightly off the selected face
            const offset = 2.0; // 2cm from face
            const faceCenter = getFaceCenter(selectedFace, pointOnEdge);
            return faceCenter;
        }
        
        // Position router bit based on edge and face selection
        function positionRouterBitOnEdgeAndFace(edgeData, mesh) {
            console.log('🎯 Positioning router bit on edge:', edgeData.edge.name, 'face:', edgeData.face);
            
            // Get the router bit mesh
            const routerBit = window.drawingWorld.scene.getMeshByName('imported_router_bit');
            if (!routerBit) {
                alert('No router bit found - upload one first');
                return;
            }
            
            // Calculate position based on edge and face
            const bounds = mesh.getBoundingInfo();
            let routerBitPosition;
            
            // Position at the "upper-left corner" of the selected face at the edge
            const edge = edgeData.edge;
            const face = edgeData.face;
            
            // Find the corner where the edge meets the selected face
            if (face === 'top') {
                // For top face, use the edge start point (which should be top-left of the edge)
                routerBitPosition = edge.start.clone();
            } else if (face === 'front') {
                // For front face, find the top-left corner
                if (edge.name.includes('top')) {
                    routerBitPosition = new BABYLON.Vector3(bounds.minimum.x, bounds.maximum.y, bounds.maximum.z);
                } else if (edge.name.includes('bottom')) {
                    routerBitPosition = new BABYLON.Vector3(bounds.minimum.x, bounds.minimum.y, bounds.maximum.z);
                } else {
                    routerBitPosition = edge.start.clone();
                }
            } else if (face === 'right') {
                // For right face, find the top-left corner (from face perspective)
                if (edge.name.includes('top')) {
                    routerBitPosition = new BABYLON.Vector3(bounds.maximum.x, bounds.maximum.y, bounds.minimum.z);
                } else {
                    routerBitPosition = edge.start.clone();
                }
            } else if (face === 'left') {
                // For left face, find the top-left corner (from face perspective)  
                if (edge.name.includes('top')) {
                    routerBitPosition = new BABYLON.Vector3(bounds.minimum.x, bounds.maximum.y, bounds.maximum.z);
                } else {
                    routerBitPosition = edge.start.clone();
                }
            } else if (face === 'back') {
                // For back face, find the top-left corner (from face perspective)
                if (edge.name.includes('top')) {
                    routerBitPosition = new BABYLON.Vector3(bounds.maximum.x, bounds.maximum.y, bounds.minimum.z);
                } else {
                    routerBitPosition = edge.start.clone();
                }
            } else if (face === 'bottom') {
                // For bottom face, use edge start
                routerBitPosition = edge.start.clone();
            } else {
                // Fallback to edge point
                routerBitPosition = edgeData.point.clone();
            }
            
            // Apply position to router bit
            routerBit.position = routerBitPosition;
            
            // Focus camera on router bit
            const camera = window.drawingWorld.scene.activeCamera;
            if (camera) {
                camera.setTarget(routerBit.position);
            }
            
            console.log('🎯 Router bit positioned at:', routerBitPosition);
            console.log('🎯 Edge:', edge.name, 'Face:', face);
            
            // Hide previews
            hideEdgePreview();
        }
        
        // Find closest edge to mouse with wider tolerance
        function findClosestEdgeToMouse(bounds, mousePos) {
            const tolerance = 1000.0; // Very large for now // 5cm detection area
            
            // Check distance to each edge of the box
            const edges = [
                // Front face edges
                { name: 'front-top', start: new BABYLON.Vector3(bounds.minimum.x, bounds.maximum.y, bounds.maximum.z), 
                  end: new BABYLON.Vector3(bounds.maximum.x, bounds.maximum.y, bounds.maximum.z) },
                { name: 'front-bottom', start: new BABYLON.Vector3(bounds.minimum.x, bounds.minimum.y, bounds.maximum.z), 
                  end: new BABYLON.Vector3(bounds.maximum.x, bounds.minimum.y, bounds.maximum.z) },
                { name: 'front-left', start: new BABYLON.Vector3(bounds.minimum.x, bounds.minimum.y, bounds.maximum.z), 
                  end: new BABYLON.Vector3(bounds.minimum.x, bounds.maximum.y, bounds.maximum.z) },
                { name: 'front-right', start: new BABYLON.Vector3(bounds.maximum.x, bounds.minimum.y, bounds.maximum.z), 
                  end: new BABYLON.Vector3(bounds.maximum.x, bounds.maximum.y, bounds.maximum.z) },
                  
                // Back face edges  
                { name: 'back-top', start: new BABYLON.Vector3(bounds.minimum.x, bounds.maximum.y, bounds.minimum.z), 
                  end: new BABYLON.Vector3(bounds.maximum.x, bounds.maximum.y, bounds.minimum.z) },
                { name: 'back-bottom', start: new BABYLON.Vector3(bounds.minimum.x, bounds.minimum.y, bounds.minimum.z), 
                  end: new BABYLON.Vector3(bounds.maximum.x, bounds.minimum.y, bounds.minimum.z) }
            ];
            
            let closestEdge = null;
            let closestDistance = tolerance;
            
            for (const edge of edges) {
                const distance = distanceFromPointToLineSegment(mousePos, edge.start, edge.end);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEdge = { ...edge, distance };
                }
            }
            
            return closestEdge ? { edgeStart: closestEdge.start, edgeEnd: closestEdge.end, name: closestEdge.name } : null;
        }
        
        // Calculate distance from point to line segment
        function distanceFromPointToLineSegment(point, lineStart, lineEnd) {
            const lineVec = lineEnd.subtract(lineStart);
            const pointVec = point.subtract(lineStart);
            const lineLen = lineVec.length();
            
            if (lineLen === 0) return point.subtract(lineStart).length();
            
            const t = Math.max(0, Math.min(1, BABYLON.Vector3.Dot(pointVec, lineVec) / (lineLen * lineLen)));
            const projection = lineStart.add(lineVec.scale(t));
            return point.subtract(projection).length();
        }
        
        // Highlight an edge with bright line
        function highlightEdge(edgeStart, edgeEnd) {
            if (edgeHighlight) {
                edgeHighlight.dispose();
            }
            
            const points = [edgeStart, edgeEnd];
            edgeHighlight = BABYLON.LinesBuilder.CreateLines('edgeHighlight', { points }, window.drawingWorld.scene);
            edgeHighlight.color = new BABYLON.Color3(0, 1, 0); // Bright green
            edgeHighlight.alpha = 1.0;
            edgeHighlight.renderingGroupId = 2; // Render on top
            
            // Make line thicker and more visible
            const highlightMaterial = new BABYLON.StandardMaterial('highlight', window.drawingWorld.scene);
            highlightMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0);
            highlightMaterial.disableLighting = true;
        }
        
        // Calculate preview position based on mouse side
        function calculatePreviewPosition(edgeInfo, mousePos) {
            const edgeCenter = edgeInfo.edgeStart.add(edgeInfo.edgeEnd).scale(0.5);
            const edgeDir = edgeInfo.edgeEnd.subtract(edgeInfo.edgeStart).normalize();
            
            // Find perpendicular direction from edge to mouse
            const toMouse = mousePos.subtract(edgeCenter);
            const perpendicular = toMouse.subtract(edgeDir.scale(BABYLON.Vector3.Dot(toMouse, edgeDir))).normalize();
            
            // Position preview on mouse side of edge
            return edgeCenter.add(perpendicular.scale(2.0)); // 2cm from edge toward mouse
        }
        
        // Show router bit preview at position
        function showRouterBitPreview(position) {
            if (routerBitPreview) {
                routerBitPreview.dispose();
            }
            
            // Create simple preview sphere
            routerBitPreview = BABYLON.MeshBuilder.CreateSphere('routerPreview', { diameter: 1 }, window.drawingWorld.scene);
            routerBitPreview.position = position;
            routerBitPreview.renderingGroupId = 2; // Render on top
            
            // Bright preview material
            const previewMaterial = new BABYLON.StandardMaterial('preview', window.drawingWorld.scene);
            previewMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0); // Bright yellow
            previewMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0);
            previewMaterial.alpha = 0.8;
            routerBitPreview.material = previewMaterial;
        }

        // Helper function to find closest edge to clicked point
        function findClosestEdge(mesh, clickPoint) {
            // Simplified edge detection - for a box, we can calculate edges from geometry
            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            const indices = mesh.getIndices();
            
            // For now, return a mock edge structure
            // In a full implementation, this would analyze the mesh geometry
            return {
                vertices: [
                    new BABYLON.Vector3(-7.62, 0.9525, 121.92), // Top-left of front edge
                    new BABYLON.Vector3(7.62, 0.9525, 121.92)   // Top-right of front edge
                ],
                faces: [
                    { face: { getFacetNormal: () => new BABYLON.Vector3(0, 0, 1) } }, // Front face
                    { face: { getFacetNormal: () => new BABYLON.Vector3(0, 1, 0) } }  // Top face
                ]
            };
        }
    </script>
</body>
</html>
        // Simple edge detection - just finds which face is closest
        function simpleEdgeDetection(mesh, clickPoint) {
            const bounds = mesh.getBoundingInfo();
            const min = bounds.minimum;
            const max = bounds.maximum;
            
            console.log("🎯 Simple detection - click point:", clickPoint);
            console.log("🎯 Board bounds:", min, "to", max);
            
            // Find closest face
            const distToTop = Math.abs(clickPoint.y - max.y);
            const distToFront = Math.abs(clickPoint.z - max.z);
            const distToBack = Math.abs(clickPoint.z - min.z);
            const distToLeft = Math.abs(clickPoint.x - min.x);
            const distToRight = Math.abs(clickPoint.x - max.x);
            const distToBottom = Math.abs(clickPoint.y - min.y);
            
            const minDist = Math.min(distToTop, distToFront, distToBack, distToLeft, distToRight, distToBottom);
            let face, edgeName, edgeStart, edgeEnd;
            
            if (minDist === distToTop) {
                face = "top";
                edgeName = "top-front";
                edgeStart = new BABYLON.Vector3(min.x, max.y, max.z);
                edgeEnd = new BABYLON.Vector3(max.x, max.y, max.z);
            } else if (minDist === distToFront) {
                face = "front"; 
                edgeName = "front-top";
                edgeStart = new BABYLON.Vector3(min.x, max.y, max.z);
                edgeEnd = new BABYLON.Vector3(max.x, max.y, max.z);
            } else if (minDist === distToBack) {
                face = "back";
                edgeName = "back-top";
                edgeStart = new BABYLON.Vector3(min.x, max.y, min.z);
                edgeEnd = new BABYLON.Vector3(max.x, max.y, min.z);
            } else if (minDist === distToLeft) {
                face = "left";
                edgeName = "left-top";
                edgeStart = new BABYLON.Vector3(min.x, max.y, min.z);
                edgeEnd = new BABYLON.Vector3(min.x, max.y, max.z);
            } else if (minDist === distToRight) {
                face = "right";
                edgeName = "right-top";
                edgeStart = new BABYLON.Vector3(max.x, max.y, min.z);
                edgeEnd = new BABYLON.Vector3(max.x, max.y, max.z);
            } else {
                face = "bottom";
                edgeName = "bottom-front";
                edgeStart = new BABYLON.Vector3(min.x, min.y, max.z);
                edgeEnd = new BABYLON.Vector3(max.x, min.y, max.z);
            }
            
            console.log("🎯 Closest face:", face, "edge:", edgeName);
            
            return {
                edge: { name: edgeName, start: edgeStart, end: edgeEnd },
                face: face,
                point: clickPoint
            };
        }

        // Simple preview system - shows exactly where router bit will go
        let previewBit = null;
        let previewEdge = null;
        
        function showSimplePreview(mesh, clickPoint) {
            hidePreview(); // Clear old preview
            
            const previewData = simpleEdgeDetection(mesh, clickPoint);
            if (!previewData) return;
            
            // Get the actual router bit from the system
            const routerBitSystem = window.routerBitSystem;
            if (!routerBitSystem || !routerBitSystem.currentBit) {
                console.log('No router bit loaded for preview');
                return;
            }
            
            // Clone the actual router bit for preview
            const routerBitPosition = previewData.edge.start; // Always position at edge start (top-left corner)
            
            previewBit = routerBitSystem.currentBit.clone("previewBit");
            previewBit.position = routerBitPosition;
            
            // Semi-transparent red material for preview
            const previewMaterial = new BABYLON.StandardMaterial("previewBit", window.drawingWorld.scene);
            previewMaterial.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3); // Light red
            previewMaterial.alpha = 0.7; // Semi-transparent
            previewMaterial.emissiveColor = new BABYLON.Color3(0.3, 0, 0); // Slight glow
            previewBit.material = previewMaterial;
            previewBit.renderingGroupId = 3; // Always on top
            
            // Show orange edge highlight
            const direction = previewData.edge.end.subtract(previewData.edge.start);
            const distance = direction.length();
            
            previewEdge = BABYLON.MeshBuilder.CreateCylinder("previewEdge", {
                height: distance,
                diameter: 0.3,
                tessellation: 8
            }, window.drawingWorld.scene);
            
            const center = previewData.edge.start.add(previewData.edge.end).scale(0.5);
            previewEdge.position = center;
            
            // Rotate to align with edge
            const up = new BABYLON.Vector3(0, 1, 0);
            const angle = Math.acos(BABYLON.Vector3.Dot(up, direction.normalize()));
            const axis = BABYLON.Vector3.Cross(up, direction.normalize());
            if (axis.length() > 0.001) {
                previewEdge.rotationQuaternion = BABYLON.Quaternion.RotationAxis(axis.normalize(), angle);
            }
            
            // Orange edge material
            const edgeMaterial = new BABYLON.StandardMaterial("previewEdge", window.drawingWorld.scene);
            edgeMaterial.diffuseColor = new BABYLON.Color3(1, 0.5, 0); // Orange
            edgeMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.25, 0); // Glowing orange
            previewEdge.material = edgeMaterial;
            previewEdge.renderingGroupId = 2;
            
            console.log("🎯 Preview: face=" + previewData.face + " edge=" + previewData.edge.name + " router_bit_at=" + routerBitPosition);
        }
        
        function hidePreview() {
            if (previewBit) {
                previewBit.dispose();
                previewBit = null;
            }
            if (previewEdge) {
                previewEdge.dispose();
                previewEdge = null;
            }
        }
