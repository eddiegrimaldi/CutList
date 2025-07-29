// CutList Application
class CutListApp {
    constructor() {
        this.projects = this.loadProjects();
        this.currentProject = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderProjects();
    }

    setupEventListeners() {
        // New project button
        document.getElementById('new-project-btn').addEventListener('click', () => {
            this.createNewProject();
        });

        // New project card
        document.getElementById('new-project-card').addEventListener('click', () => {
            this.createNewProject();
        });
    }

    createNewProject() {
        const projectName = prompt('Enter project name:', 'Untitled Project');
        if (projectName) {
            const project = {
                id: Date.now().toString(),
                name: projectName,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                sketches: [],
                models: []
            };
            
            this.projects.push(project);
            this.saveProjects();
            this.renderProjects();
            
            // Navigate to project workspace
            this.openProject(project);
        }
    }

    openProject(project) {
        this.currentProject = project;
        // Navigate to workspace
        window.location.href = `workspace.php?id=${project.id}`;
    }

    renderProjects() {
        const projectGrid = document.querySelector('.project-grid');
        const newProjectCard = document.getElementById('new-project-card');
        
        // Clear existing project cards (except new project card)
        const existingCards = projectGrid.querySelectorAll('.project-card:not(.new-project)');
        existingCards.forEach(card => card.remove());

        // Render project cards
        this.projects.forEach(project => {
            const card = this.createProjectCard(project);
            projectGrid.insertBefore(card, newProjectCard);
        });
    }

    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="card-icon">📐</div>
            <h3>${project.name}</h3>
            <p>Created: ${new Date(project.created).toLocaleDateString()}</p>
            <p>Last modified: ${new Date(project.lastModified).toLocaleDateString()}</p>
        `;
        
        card.addEventListener('click', () => {
            this.openProject(project);
        });
        
        return card;
    }

    loadProjects() {
        const saved = localStorage.getItem('cutlist-projects');
        return saved ? JSON.parse(saved) : [];
    }

    saveProjects() {
        localStorage.setItem('cutlist-projects', JSON.stringify(this.projects));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new CutListApp();
});