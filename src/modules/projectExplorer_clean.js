// Project Explorer - Clean HTML-based approach
// Master's wisdom: "It seems like it would be easier to make subtle design time changes 
// if the components of the UI were html files that were included when needed"

export class ProjectExplorer {
    constructor(containerElement, app) {
        this.container = containerElement;
        this.app = app;
        
        // Project management
        this.currentProject = null;
        this.projects = [];
        this.sketchPlanes = [];
        this.sketchCounter = 1;
        
        this.loadComponent();
    }    async loadComponent() {
        try {
            
            // Load the HTML component
            const response = await fetch('./src/components/project-explorer.html');
            const html = await response.text();
            
            this.container.innerHTML = html;
            
            // Attach event handlers to the loaded HTML
            this.attachEventHandlers();
            
            
        } catch (error) {
            // Fallback to basic HTML
            this.container.innerHTML = `
                <div class="project-explorer">
                    <div class="explorer-header">
                        <h3>Project Explorer - FALLBACK</h3>
                    </div>
                    <div class="project-section">
                        <div class="no-project">
                            <p>Failed to load component - using fallback</p>
                            <button id="btn-new-project">New Project</button>
                        </div>
                    </div>
                </div>
            `;
            this.attachEventHandlers();
        }
    }
    
    attachEventHandlers() {
        // New project button
        const newProjectBtn = this.container.querySelector('#btn-new-project');
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => this.createNewProject());
        }
        
        // Project name editing
        const projectNameInput = this.container.querySelector('#project-name');
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
        
    }
    
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
        this.updateDisplay();
        
        // Notify the app via callback
        if (this.onProjectCreated) {
            this.onProjectCreated(project.name);
        }
        
        return project;
    }
    
    setCurrentProject(project) {
        this.currentProject = project;
        this.sketchPlanes = project.sketches || [];
        this.updateDisplay();
    }
    
    renameProject(newName) {
        if (this.currentProject && newName && newName !== this.currentProject.name) {
            const oldName = this.currentProject.name;
            
            // Notify the app via callback
            if (this.onProjectRenamed) {
                this.onProjectRenamed(oldName, newName);
            }
        }
    }
    
    updateDisplay() {
        const noProjectSection = this.container.querySelector('#no-project-section');
        const currentProjectSection = this.container.querySelector('#current-project-section');
        const projectNameInput = this.container.querySelector('#project-name');
        const projectMeta = this.container.querySelector('#project-meta');
        
        if (this.currentProject) {
            // Show current project, hide no-project message
            if (noProjectSection) noProjectSection.style.display = 'none';
            if (currentProjectSection) currentProjectSection.style.display = 'flex';
            
            // Update project details
            if (projectNameInput) projectNameInput.value = this.currentProject.name;
            if (projectMeta) projectMeta.textContent = `${this.sketchPlanes.length} sketches`;
            
        } else {
            // Show no-project message, hide current project
            if (noProjectSection) noProjectSection.style.display = 'block';
            if (currentProjectSection) currentProjectSection.style.display = 'none';
        }
        
        this.updateSketchesDisplay();
    }
    
    updateSketchesDisplay() {
        const noSketchesSection = this.container.querySelector('#no-sketches-section');
        const sketchesList = this.container.querySelector('#sketches-list');
        
        if (this.sketchPlanes.length === 0) {
            if (noSketchesSection) noSketchesSection.style.display = 'block';
            if (sketchesList) sketchesList.style.display = 'none';
        } else {
            if (noSketchesSection) noSketchesSection.style.display = 'none';
            if (sketchesList) {
                sketchesList.style.display = 'block';
                // Update sketches list content
                sketchesList.innerHTML = this.sketchPlanes.map(sketch => `
                    <div class="sketch-item" data-sketch-id="${sketch.id}">
                        <div class="sketch-icon">📐</div>
                        <div class="sketch-info">
                            <span class="sketch-name">${sketch.name}</span>
                            <div class="sketch-meta">${sketch.objects?.length || 0} objects</div>
                        </div>
                    </div>
                `).join('');
                
                // Add click handlers for sketches
                sketchesList.querySelectorAll('.sketch-item').forEach(item => {
                    item.addEventListener('dblclick', () => {
                        const sketchId = item.dataset.sketchId;
                        const sketch = this.sketchPlanes.find(s => s.id === sketchId);
                        if (sketch && this.app && this.app.handleSketchDoubleClick) {
                            this.app.handleSketchDoubleClick(sketch.name);
                        }
                    });
                });
            }
        }
    }
    
    addSketchPlane(sketch) {
        this.sketchPlanes.push(sketch);
        if (this.currentProject) {
            this.currentProject.sketches = this.sketchPlanes;
        }
        this.updateDisplay();
    }
    
    getCurrentProject() {
        return this.currentProject;
    }
    
    getSketchPlanes() {
        return this.sketchPlanes;
    }
}
