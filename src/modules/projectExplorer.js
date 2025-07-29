// Project Explorer - Manages projects, sketch planes, and workspace hierarchy
// Master's Step 1 & 2 requirement: Left sidebar project management

export class ProjectExplorer {
    constructor(containerElement, app) {
        this.container = containerElement;
        this.app = app;
        
        // Use the content area instead of the whole container to preserve styling
        this.contentArea = this.container.querySelector('#project-explorer-content') || this.container;
        
        // Project management
        this.currentProject = null;
        this.projects = [];
        
        // Sketch planes in current project
        this.sketchPlanes = [];
        this.sketchCounter = 1; // For naming: Sketch 1, Sketch 2, etc.
        
        this.render();
    }

    // Create a new project with default "Untitled" name
    createNewProject() {
        const projectId = 'project_' + Date.now();
        const project = {
            id: projectId,
            name: 'Untitled',
            created: new Date(),
            sketches: [],
            objects: []
        };
        
        this.projects.push(project);
        this.setCurrentProject(project);
        
        this.render();
        
        return project;
    }

    // Set the current active project
    setCurrentProject(project) {
        this.currentProject = project;
        this.sketchPlanes = project.sketches || [];
        
        // Notify app of project change
        if (this.app && this.app.onProjectChanged) {
            this.app.onProjectChanged(project);
        }
    }

    // Rename the current project
    renameProject(newName) {
        if (!this.currentProject) return;
        
        this.currentProject.name = newName;
        this.render();
        
        // Notify app
        if (this.app && this.app.onProjectRenamed) {
            this.app.onProjectRenamed(this.currentProject);        }
    }

    // Add a new sketch plane to current project
    addSketchPlane(persistentPlane) {
        if (!this.currentProject) {
            return null;
        }
        
        // Create sketch object that links to the persistent plane
        const sketch = {
            id: persistentPlane.id, // Use the persistent plane's ID for consistency
            name: persistentPlane.name,
            persistentPlane: persistentPlane, // Store reference to actual persistent plane
            objects: persistentPlane.children2D || [],
            created: new Date()
        };
        
        this.currentProject.sketches.push(sketch);
        this.sketchPlanes.push(sketch);
        
        this.render();
        
        return sketch;
    }

    // Rename a sketch plane
    renameSketch(sketchId, newName) {
        const sketch = this.sketchPlanes.find(s => s.id === sketchId);
        if (sketch) {
            sketch.name = newName;
            this.render();
        }
    }

    // Handle double-click on sketch (Master's requirement: enters orthographic mode)
    onSketchDoubleClick(sketchId) {
        const sketch = this.sketchPlanes.find(s => s.id === sketchId);
        if (!sketch) return;
        
        // Notify app to switch to sketch mode with this plane
        if (this.app && this.app.onSketchDoubleClick) {
            this.app.onSketchDoubleClick(sketch);
        }
    }

    // Render the project explorer UI
    render() {
        if (!this.contentArea) {
            return;
        }
        
        const html = `
            <div class="project-explorer">
                <div class="explorer-header">
                    <h3>Project Explorer</h3>
                </div>
                
                ${this.renderCurrentProject()}
                ${this.renderSketchPlanes()}
                ${this.renderActions()}
            </div>
        `;
        
        this.contentArea.innerHTML = html;
        
        this.attachEventListeners();
    }

    // Render current project section
    renderCurrentProject() {
        if (!this.currentProject) {
            return `
                <div class="project-section">
                    <div class="no-project">
                        <p>No project open</p>
                        <button class="btn-new-project">New Project</button>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="project-section">
                <div class="project-item">
                    <div class="project-icon">📁</div>
                    <div class="project-info">
                        <input type="text" class="project-name" value="${this.currentProject.name}" />
                        <div class="project-meta">${this.currentProject.sketches.length} sketches</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render sketch planes list
    renderSketchPlanes() {
        if (!this.currentProject || this.sketchPlanes.length === 0) {
            return `
                <div class="sketches-section">
                    <h4>Sketches</h4>
                    <div class="no-sketches">
                        <p>No sketches yet. Select a sketch plane to start.</p>
                    </div>
                </div>
            `;
        }
        
        const sketchItems = this.sketchPlanes.map(sketch => `
            <div class="sketch-item" data-sketch-id="${sketch.id}">
                <div class="sketch-icon">📐</div>
                <div class="sketch-info">
                    <input type="text" class="sketch-name" value="${sketch.name}" data-sketch-id="${sketch.id}" />
                    <div class="sketch-meta">${sketch.objects.length} objects</div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="sketches-section">
                <h4>Sketches</h4>
                <div class="sketches-list">
                    ${sketchItems}
                </div>
            </div>
        `;
    }

    // Render action buttons
    renderActions() {
        return `
            <div class="explorer-actions">
                <button class="btn-action" id="btn-new-project">📁 New Project</button>
            </div>
        `;
    }

    // Attach event listeners to the rendered elements
    attachEventListeners() {
        // New project button
        const newProjectBtn = this.container.querySelector('.btn-new-project, #btn-new-project');
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => this.createNewProject());
        }
        
        // Project name editing
        const projectNameInput = this.container.querySelector('.project-name');
        if (projectNameInput) {
            projectNameInput.addEventListener('blur', (e) => {
                this.renameProject(e.target.value.trim());
            });
            projectNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        }
        
        // Sketch name editing
        const sketchNameInputs = this.container.querySelectorAll('.sketch-name');
        sketchNameInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                const sketchId = e.target.getAttribute('data-sketch-id');
                this.renameSketch(sketchId, e.target.value.trim());
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        });
          // Sketch double-click to enter orthographic mode
        const sketchItems = this.container.querySelectorAll('.sketch-item');
        sketchItems.forEach(item => {
            item.addEventListener('dblclick', (e) => {
                const sketchId = item.getAttribute('data-sketch-id');
                this.onSketchDoubleClick(sketchId);
            });
            
            // SPANKY V36: Add single click handler for sketch plane selection
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on the input field
                if (e.target.classList.contains('sketch-name')) return;
                
                const sketchId = item.getAttribute('data-sketch-id');
                
                // Call the sketch plane selection handler
                if (this.onSketchPlaneSelected) {
                    this.onSketchPlaneSelected(sketchId);
                }
            });
        });
    }

    // Get current project
    getCurrentProject() {
        return this.currentProject;
    }

    // Get current sketch planes
    getSketchPlanes() {
        return this.sketchPlanes;
    }
}
