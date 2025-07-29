<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CutList - Woodworking CAD</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <header class="app-header">
            <h1>CutList</h1>
            <p>Woodworking CAD & Cutting Plans</p>
        </header>
        
        <main class="main-content">
            <section class="dashboard">
                <div class="project-actions">
                    <button id="new-project-btn" class="btn-primary">New Project</button>
                </div>
                
                <div class="project-grid">
                    <div class="project-card new-project" id="new-project-card">
                        <div class="card-icon">+</div>
                        <h3>New Project</h3>
                        <p>Start a new woodworking project</p>
                    </div>
                </div>
            </section>
        </main>
    </div>
    
    <script src="app.js?v=<?php echo time(); ?>"></script>
</body>
</html>